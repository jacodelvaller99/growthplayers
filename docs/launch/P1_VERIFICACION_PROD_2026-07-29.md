# P1 de seguridad — verificación contra producción (2026-07-29)

`P0_P1_SECURITY_FIXLIST.md` listaba P1-5 a P1-8 sin registro de cierre. Se
verificó cada uno **contra la base de datos y el dominio de producción reales**,
no contra las migraciones del repo. Tres de los cuatro ya estaban cerrados; el
registro solo llevaba retraso.

Un registro que exagera el riesgo abierto cuesta lo mismo que uno que lo esconde:
en ambos casos se deja de confiar en él. De ahí este documento.

---

## Resultado

| # | Qué decía | Estado real verificado | Evidencia |
|---|---|---|---|
| **P1-5** | Vistas evaden RLS | ✅ **CERRADO** | `wearable_baseline` y `user_progress` → `security_invoker=true` en `pg_class.reloptions` |
| **P1-6** | `b2b_organizations` / `org_members` sin RLS | ✅ **MOOT** | Ninguna de las dos tablas existe en producción. Nunca se crearon |
| **P1-7** | Tokens OAuth en texto plano | 🔴 **ABIERTO — arreglo listo** | Ver abajo |
| **P1-8** | Sin CSP ni cabeceras de seguridad | ✅ **CERRADO** | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy y Permissions-Policy responden en vivo |

### Consultas usadas (reproducibles)

```sql
-- P1-5 y P1-6
select c.relname,
       case when c.relkind = 'v'
            then array_to_string(c.reloptions, ',')
            else case when c.relrowsecurity then 'RLS ON' else 'RLS OFF' end
       end as estado
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relname in ('wearable_baseline','user_progress',
                     'b2b_organizations','org_members');
```

```bash
# P1-8 — ojo con el dominio (ver nota al final)
curl -sI https://polarisgrowthinstitute.vercel.app/
```

---

## P1-7 — el único realmente abierto

**El hueco no es el cifrado; es quién puede leer.** `wearable_connections` tiene
RLS activo con dos políticas:

| Política | Comando | Condición |
|---|---|---|
| `own_wearable_connections` | ALL | `auth.uid() = user_id` — correcta |
| `admin_wearable_connections` | SELECT | `profiles.is_admin = true` — **el problema** |

La segunda permite `select *`. Cualquier admin — o cualquiera que comprometa una
cuenta admin — puede leer `access_token` y `refresh_token` de **todos** los
usuarios y suplantarlos contra Oura o WHOOP. El admin necesita saber que la
conexión existe y cuándo sincronizó; nunca necesita la credencial.

### Por qué privilegios de columna y no cifrado

Cifrar con pgcrypto o Vault obliga a gestionar una clave y a que la edge function
descifre: infraestructura nueva, justo lo que se decidió no añadir. Quitar el
acceso de lectura **elimina la exposición por completo** y sin dependencias.

### Compatibilidad verificada antes de escribir la migración

Los tres caminos del cliente usan listas de columnas explícitas y ninguno toca
los tokens:

| Camino | Qué hace |
|---|---|
| `lib/wearables.ts:165` | `select id, user_id, provider, is_active, connected_at, last_synced_at, scope` |
| `lib/wearablesNative.ts:333` | `upsert` sin tokens (`return=minimal`) |
| `app/perfil/wearables.tsx:822` | `update is_active` |

`supabase/functions/sync-wearables` es el único que lee los tokens y corre con
`service_role`, que ignora RLS y grants. No se ve afectado.

### Aplicar

Migración: `supabase/migrations/20260729000000_p1_7_wearable_token_privs.sql`.
**Pendiente de correr en el SQL Editor** (el agente no tiene permiso de escritura
sobre la base de datos de producción). Es idempotente.

Verificación de cierre — debe devolver **0 filas**:

```sql
select grantee, privilege_type, column_name
  from information_schema.column_privileges
 where table_schema = 'public'
   and table_name   = 'wearable_connections'
   and column_name in ('access_token', 'refresh_token')
   and grantee in ('authenticated', 'anon');
```

---

## Hallazgo lateral: hay dos dominios

`growthplayers.vercel.app` responde **307 → `polarisgrowthinstitute.vercel.app`**.
El segundo es el canónico y el que sirve la app con todas las cabeceras; el
primero solo redirige (y por eso un `curl -I` contra él solo devuelve HSTS, lo
que hace parecer que faltan las cabeceras).

Importa porque `growthplayers.vercel.app` está **hardcodeado como base de los
redirect URIs de OAuth** en dos sitios:

- `lib/wearables.ts:43`
- `supabase/functions/sync-wearables/index.ts:459` y `:493` (por defecto, si no
  hay `EXPO_PUBLIC_APP_URL`)

El flujo sobrevive al 307 porque el intercambio de token reusa la misma cadena
literal, así que `redirect_uri` coincide de punta a punta. Pero es frágil: si
alguien "corrige" un lado y no el otro, OAuth se rompe con `redirect_uri
mismatch`. Decidir el dominio canónico y unificarlo entra en el trabajo de
wearables (S4).
