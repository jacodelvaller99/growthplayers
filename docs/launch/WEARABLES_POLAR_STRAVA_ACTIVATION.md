# Activación de Polar + Strava (OAuth directo, sin infraestructura externa)

> **Quién:** el dueño (Nicolás). **Cuándo:** antes de prometer "conecta tu Polar/Strava"
> a un usuario real. **Tiempo estimado:** 20–30 min por proveedor.
>
> Por qué existe esto en vez de usar Terra/Open Wearables para estas dos marcas:
> se pidió explícitamente que la alternativa a Terra corriera **enteramente en
> Supabase + Vercel, sin servidor propio ni vendor externo**. Open Wearables (la
> alternativa OSS a Terra) es un paquete self-host (FastAPI+Postgres+Redis+Celery)
> que no corre en Edge Functions ni en Vercel Functions — así que en vez de adoptar
> ese servidor, Polar y Strava se implementaron como **providers OAuth directos**,
> exactamente con el mismo patrón que ya usan Oura y WHOOP (`sync-wearables`).
> Cero infraestructura nueva: mismo edge function, misma tabla, mismo flujo.

## Qué hace este sistema (contexto de 30 segundos)

Cada proveedor tiene: un botón de conexión en `Perfil → Dispositivos` → OAuth en el
navegador del proveedor → callback (`/oauth/polar/callback` o `/oauth/strava/callback`)
→ intercambio de código por token dentro de `sync-wearables` (las claves nunca tocan
el cliente) → los datos se guardan en `wearable_daily`/`wearable_connections` con
`provider='polar'`/`'strava'`. El motor downstream (biometría, Norman, dashboards) los
consume igual que Oura/WHOOP, sin enterarse de la fuente.

**Diferencia de datos, dicha sin adornos:** Polar da sueño + recuperación nocturna
(comparable a Oura/WHOOP). Strava es actividad/ejercicio — no aporta sueño ni
recuperación, solo calorías activas y minutos activos. El código no inventa un
`recovery_score` de Strava ni un ans_charge-a-0-100 de Polar; lo que no es un dato
real y comparable se deja `null` (mismo principio de honestidad que el resto del
proyecto — ver `VERIFIED_TESTIMONIALS`).

---

## Pasos exactos

### 1. Polar AccessLink

1. Crear cuenta de desarrollador en **https://www.polar.com/accesslink-api/** →
   registrar una app.
2. Configurar el **Redirect URI** exacto (debe coincidir carácter a carácter):
   - Web: `https://growthplayers.vercel.app/oauth/polar/callback`
   - Nativo: `polaris://oauth/polar/callback`
3. Anotar **Client ID** y **Client Secret**.

### 2. Strava API

1. En **https://www.strava.com/settings/api**, crear una aplicación.
2. Configurar el **Authorization Callback Domain** (Strava solo pide el dominio,
   no la ruta completa): `growthplayers.vercel.app`.
3. Anotar **Client ID** y **Client Secret**.

### 3. Secrets en Supabase (nunca `EXPO_PUBLIC_*`)

Dashboard → **Edge Functions → Secrets** (o `supabase secrets set`):

```
POLAR_CLIENT_ID      = <Client ID de Polar>
POLAR_CLIENT_SECRET  = <Client Secret de Polar>
STRAVA_CLIENT_ID     = <Client ID de Strava>
STRAVA_CLIENT_SECRET = <Client Secret de Strava>
```

Los `EXPO_PUBLIC_POLAR_CLIENT_ID` / `EXPO_PUBLIC_STRAVA_CLIENT_ID` (client IDs, no
secrets — son públicos por diseño en OAuth) sí van en Vercel, igual que ya existen
`EXPO_PUBLIC_OURA_CLIENT_ID` / `EXPO_PUBLIC_WHOOP_CLIENT_ID`.

### 4. Aplicar la migración

`supabase/migrations/20260810000000_wearables_polar_strava.sql` extiende el CHECK
de `provider` a `'polar'`/`'strava'`. Aplicar en el **SQL Editor** del dashboard
(en este proyecto las migraciones se aplican por dashboard, no por CLI).

### 5. Desplegar la función actualizada

```bash
supabase functions deploy sync-wearables
```

---

## Riesgo abierto (dicho sin adornos)

El mapeo de Polar (`syncPolar` en `sync-wearables/index.ts`) está basado en la
documentación pública de AccessLink, **no validado contra un payload real** —
mismo riesgo que Terra documentó en `WEARABLES_ACTIVATION.md`. En particular: el
paso de registro de usuario (`POST /v3/users`) es obligatorio antes de que el
token sirva para leer datos, y no se ha probado con una cuenta Polar real. Antes
de prometerle esto a un cliente: conectar tu propio Polar, revisar los logs de
`sync-wearables` en el dashboard de Supabase, y comparar el payload real contra
lo que `syncPolar` espera.

Strava usa el shape de token estándar (igual a Oura/WHOOP) — menor riesgo, pero
tampoco probado contra credenciales reales todavía.
