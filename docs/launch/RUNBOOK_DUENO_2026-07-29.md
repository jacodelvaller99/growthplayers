# Runbook del dueño — 2026-07-29

Todo el código de las sesiones S1–S6 está en `launch-hardening-p0`, con el gate
verde (`tsc 0 · lint 0 errores · 502 tests / 89 suites · expo export web OK`).

Lo que queda **no es código**: son cinco acciones que dependen de tus cuentas o de
permisos de escritura que el agente no tiene. Están en orden de impacto.

---

## 1 · SQL — cerrar P1-7 (tokens OAuth legibles por cualquier admin)

**Por qué importa:** la política `admin_wearable_connections` permite `select *`,
así que cualquier admin —o quien comprometa una cuenta admin— puede leer los
`access_token` / `refresh_token` de **todos** los usuarios y suplantarlos contra
Oura y WHOOP. El admin necesita saber que la conexión existe, no la credencial.

Pegar en el SQL Editor y ejecutar. Es idempotente:

```sql
do $$ declare cols text; begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema='public' and table_name='wearable_connections'
    and column_name not in ('access_token','refresh_token');
  if cols is null then raise exception 'sin columnas'; end if;
  execute 'revoke select, insert, update on public.wearable_connections from authenticated';
  execute 'revoke select, insert, update on public.wearable_connections from anon';
  execute format('grant select (%s) on public.wearable_connections to authenticated', cols);
  execute format('grant insert (%s) on public.wearable_connections to authenticated', cols);
  execute format('grant update (%s) on public.wearable_connections to authenticated', cols);
end $$;
```

**Verificar** — debe devolver **0 filas**:

```sql
select grantee, privilege_type, column_name
  from information_schema.column_privileges
 where table_schema='public' and table_name='wearable_connections'
   and column_name in ('access_token','refresh_token')
   and grantee in ('authenticated','anon');
```

---

## 2 · SQL — evitar que el sync borre datos buenos

Aplicar `supabase/migrations/20260729010000_merge_wearable_daily_raw_payload.sql`
(pegar el archivo completo en el SQL Editor).

**Por qué:** el sync manda varios días en un array y PostgREST rellena con NULL
las claves que faltan en cada fila. Un fallo transitorio de un endpoint **borraba**
datos ya sincronizados. El código ya degrada si la RPC no está, así que esto no
bloquea el deploy — pero sin ella la pérdida de datos sigue viva.

---

## 3 · Desplegar la edge function de wearables

```
supabase functions deploy sync-wearables
```

**Por qué es lo más importante de esta lista:** `connectOura` y `connectWhoop`
construían el upsert con el shorthand `user_id,` cuando el parámetro se llama
`userId`. No existe ninguna variable `user_id` en ese ámbito → **ReferenceError en
cada conexión**. El usuario autorizaba en Oura/WHOOP, volvía "bien", y la fila
nunca se guardaba. Por eso no hay una sola conexión en producción, y por eso el
motor biométrico entero parecía muerto.

Está arreglado en el repo. Sigue roto en producción hasta que despliegues.

Después, para que el OAuth complete, hace falta en cada consola:

| Proveedor | Consola | Redirect URIs (carácter a carácter) |
|---|---|---|
| Oura | cloud.ouraring.com | `https://growthplayers.vercel.app/oauth/oura/callback` · `polaris://oauth/oura/callback` |
| WHOOP | developer.whoop.com | `https://growthplayers.vercel.app/oauth/whoop/callback` · `polaris://oauth/whoop/callback` |

Secrets en Supabase: `OURA_CLIENT_ID`, `OURA_CLIENT_SECRET`, `WHOOP_CLIENT_ID`,
`WHOOP_CLIENT_SECRET`. En Vercel: `EXPO_PUBLIC_OURA_CLIENT_ID`,
`EXPO_PUBLIC_WHOOP_CLIENT_ID`.

---

## 4 · El Círculo — está encendido en Preview, no en producción

Ya puse `EXPO_PUBLIC_SOCIAL_SPACES_ENABLED=true` **solo en Preview**, que es el
rollout que el propio código documenta (`app/config/env.ts:38`).

**No lo promoví a producción a propósito.** El dashboard de Supabase se colgó
antes de que pudiera verificar dos cosas que no se pueden asumir cuando vas a
exponer contenido generado por usuarios:

1. Que la RLS de las tablas `circle_*` está viva en producción, no solo en las
   migraciones.
2. Que reportar y bloquear funcionan de punta a punta — es el **requisito 1.2 de
   App Store**, no un nice-to-have.

**Secuencia segura:** abre el deploy de Preview de esta rama, recorre El Círculo
(espacios, eventos, conexiones), prueba reportar un post y bloquear a alguien. Si
todo responde, promuévelo:

```bash
echo "true" | npx vercel env add EXPO_PUBLIC_SOCIAL_SPACES_ENABLED production --force
```

Y vuelve a desplegar producción. Si algo falla, no hay nada que revertir: producción
nunca lo tuvo encendido.

---

## 5 · Bloqueos de tienda (siguen abiertos, son tuyos)

| Qué | Por qué está parado |
|---|---|
| `eas login` + `eas init` | `app.json:97` sigue con `projectId: "00000000-…"`. Sin esto no hay build nativo, y sin build nativo no hay Apple Salud / Health Connect — que es la vía por la que llegan Garmin, Coros, Samsung y Fitbit sin sus APIs cerradas |
| Ficha en App Store Connect | Hace falta el `ascAppId` para `eas.json` |
| Cuenta demo para el revisor | Pásame nombre y correo y la creo con datos reales + el código `APPLEREVIEW` |

---

## Lo que YA está cerrado (verificado, no asumido)

| Item | Cómo se verificó |
|---|---|
| P1-5 vistas evaden RLS | `wearable_baseline` y `user_progress` → `security_invoker=true` en `pg_class.reloptions` |
| P1-6 RLS en tablas B2B | Las tablas **no existen** en producción. Nunca se crearon |
| P1-8 CSP y cabeceras | Responden en vivo en `polarisgrowthinstitute.vercel.app` |
| `mentor_messages` (FIX-0) | Índice ya no es parcial; 3 políticas owner presentes |

Tres de los cuatro P1 que el registro daba por abiertos ya estaban cerrados: el
registro llevaba retraso, no el código. Detalle en
`docs/launch/P1_VERIFICACION_PROD_2026-07-29.md`.

---

## Nota sobre los dos dominios

`growthplayers.vercel.app` responde **307 → `polarisgrowthinstitute.vercel.app`**.
El OAuth sobrevive porque cliente y edge function usan la misma cadena literal,
pero OAuth compara `redirect_uri` como string exacto: si alguien "arregla" un lado
y no el otro, se rompe. Ahora sale de `EXPO_PUBLIC_APP_URL` — un solo sitio que
tocar. Decide cuál es el canónico antes de registrar las URIs en las consolas.
