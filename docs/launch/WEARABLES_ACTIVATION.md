# Activación del agregador universal de wearables (Terra)

> **Quién:** el dueño (Nicolás). **Cuándo:** antes de prometer "conecta tu reloj"
> a un usuario real. **Tiempo estimado:** 30–45 min + el tiempo de firma del BAA.
>
> El código del agregador ya está completo y testeado. Lo único que falta para
> que enrute datos reales son **credenciales server-side y un par de configuraciones
> en el dashboard del proveedor**. Nada de esto se toca desde el cliente: las claves
> son secrets de Supabase, **nunca** variables `EXPO_PUBLIC_*`.

## Qué hace este sistema (contexto de 30 segundos)

Una sola conexión cubre **cualquier reloj** (Garmin, Polar, Coros, Suunto, Fitbit,
Withings, Samsung, Apple, Oura, WHOOP, +500) y **funciona en web/PWA** — sin build
nativo. El usuario autoriza en un widget hosteado por Terra; Terra empuja los datos
por webhook a la edge function `wearable-aggregator`, que los normaliza a la tabla
`wearable_daily` (`provider='aggregator'`). El motor downstream (biometría, Norman,
dashboards) los consume sin enterarse de la fuente.

Mientras los secrets no estén puestos, la UI **no miente**: al pulsar "Conectar mi
dispositivo" muestra el estado honesto *"Integración en activación — disponible muy
pronto"* en vez de afirmar que ya funciona.

---

## Pasos exactos

### 1. Crear la cuenta de Terra

1. Ir a **https://tryterra.co** → *Sign up* (free tier ~500 usuarios activos).
2. En el dashboard de Terra, crear (o usar) tu **Dev environment**.
3. Anotar de la sección *Connections / API Keys*:
   - **Dev ID** → será `TERRA_DEV_ID`
   - **API Key** (X-API-Key) → será `TERRA_API_KEY`
   - **Signing Secret** (webhook secret) → será `TERRA_SIGNING_SECRET`

> El free tier alcanza para validar el flujo completo y para el lanzamiento inicial.

### 2. Poner los secrets en Supabase (NUNCA como `EXPO_PUBLIC_*`)

Dashboard de Supabase del proyecto → **Edge Functions → Secrets** (o
*Project Settings → Edge Functions → Secrets*). Agregar exactamente estas tres:

```
TERRA_DEV_ID         = <Dev ID de Terra>
TERRA_API_KEY        = <API Key de Terra>
TERRA_SIGNING_SECRET = <Signing Secret de Terra>
```

Alternativa por CLI (mismo efecto):

```bash
supabase secrets set TERRA_DEV_ID=xxxx TERRA_API_KEY=xxxx TERRA_SIGNING_SECRET=xxxx
```

- **No** se ponen en `.env.local` ni en Vercel. Son server-side puros.
- `AGGREGATOR_VENDOR` puede dejarse sin definir (default `terra`). Solo se cambia a
  `open_wearables` si algún día migras al self-host OSS.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `EXPO_PUBLIC_APP_URL` ya existen en el
  entorno de las edge functions (las usa el resto del stack). Verifica que
  `EXPO_PUBLIC_APP_URL` apunte al dominio de prod (`https://growthplayers.vercel.app`)
  porque de ahí salen las URLs de redirect post-autorización.

### 3. Registrar la webhook URL en Terra

En el dashboard de Terra → *Connections → Destinations / Webhooks*, poner como
**Webhook URL**:

```
https://<TU-REF-SUPABASE>.supabase.co/functions/v1/wearable-aggregator
```

(Reemplaza `<TU-REF-SUPABASE>` por el ref real del proyecto — el mismo que ya usan
las otras edge functions.)

- Asegúrate de habilitar al menos los tipos de payload `auth`, `daily`, `sleep`,
  `activity`, `body`. (`deauth` para revocaciones.)
- El **Signing Secret** que muestra esta sección debe ser el mismo que pusiste como
  `TERRA_SIGNING_SECRET`. La función **rechaza fail-closed** cualquier webhook sin
  firma válida — si no coincide, no entra ningún dato (esto es intencional).

### 4. Firmar el BAA **antes** de enrutar PHI

Los datos biométricos son PHI. **No** enrutes datos de un usuario real hasta firmar
el **Business Associate Agreement** con Terra:

1. En Terra (o vía su equipo de soporte/compliance) solicitar el **BAA (HIPAA)**.
2. Firmarlo desde la cuenta del proyecto.
3. Recién entonces conectar relojes de usuarios reales.

> Para QA puedes usar tu propio reloj o el simulador (ver "Demo sin credenciales"
> abajo) sin tocar PHI de terceros.

### 5. Desplegar la edge function

```bash
supabase functions deploy wearable-aggregator
```

Requiere la migración del agregador aplicada (provider `'aggregator'` en el CHECK,
columnas `source_device` / `aggregator_user_id`, tabla `wearable_webhook_events`) y la
**RPC `merge_wearable_daily`** (upsert atómico por columna con COALESCE bajo row-lock,
para que un webhook de "daily" no borre el `sleep_score` que llegó en el de "sleep"):

- `supabase/migrations/20260621000000_wearable_aggregator.sql`
- `supabase/migrations/20260625000000_*` (la que crea `merge_wearable_daily`)

Aplicar ambas en el **SQL Editor** del dashboard si aún no están (en este proyecto las
migraciones se aplican por dashboard, no por CLI). Sin la RPC el webhook lanza
`merge_wearable_daily failed` y no escribe.

### 6. Validar `terraToDaily` contra un payload REAL

El mapeo de `lib/wearableAggregatorLogic.ts` (`terraToDaily`) y su espejo inline en
la edge function (`normalizeTerra`) están **basados en la documentación de Terra**,
no en un payload real. Este es el único riesgo abierto del sistema.

1. Conecta **tu propio reloj** desde `Perfil → Dispositivos → Conectar mi dispositivo`.
2. Tras autorizar, en el dashboard de Terra abre *Logs / Webhook deliveries* y copia
   un payload real de cada tipo (`sleep`, `daily`, `activity`).
3. Compáralo contra los fixtures de `__tests__/unit/wearableAggregatorLogic.test.ts`.
   Si alguna clave difiere (p. ej. Terra manda `hrv_rmssd` donde el test asume
   `avg_hrv_rmssd`), el cliente **ya tolera varias alternas** (ver helpers
   `terraHrv` / `terraRestingHr` / `firstNum`), pero:
   - añade un fixture con la forma real al test y déjalo verde;
   - si aparece una clave nueva que ningún alterno cubre, agrégala en `terraToDaily`
     **y** en `normalizeTerra` de la edge function (deben quedar espejados).

> **Nota de paridad:** la edge function `normalizeTerra` es la copia que realmente
> escribe en DB. El endurecimiento de claves alternas que se hizo en el cliente
> (`terraToDaily`) **todavía no está replicado** en la edge function — replícalo ahí
> si la validación con payload real lo exige. La edge function es deploy del dueño.

---

## Cómo comprobar que quedó activo

Checklist de verificación, en orden:

1. **Connect responde con URL.** En `Perfil → Dispositivos`, pulsar "Conectar mi
   dispositivo". Si los secrets están bien, el navegador redirige al **widget de
   Terra** (en vez del banner "Integración en activación"). Si sigue saliendo el
   banner de activación → faltan `TERRA_DEV_ID` / `TERRA_API_KEY` o no se redeployó.
2. **El evento `auth` vincula la cuenta.** Tras autorizar, vuelves a la app con
   `?connected=aggregator`. En Supabase: `wearable_connections` debe tener una fila
   con `provider='aggregator'`, tu `user_id` y un `aggregator_user_id` no nulo.
3. **Los datos aterrizan.** En unas horas (cuando tu reloj sincronice con su nube),
   `wearable_daily` debe tener filas con `provider='aggregator'` y `source_device`
   = el reloj real (p. ej. `GARMIN`). La auditoría de webhooks vive en
   `wearable_webhook_events` (cada entrega, con `processed` / `process_error`).
4. **La firma rechaza basura.** Un POST a la URL del webhook sin header
   `terra-signature` válido debe devolver **401** (fail-closed). Si devuelve 200,
   el `TERRA_SIGNING_SECRET` no coincide — corrígelo.
5. **Norman lo ve.** Una vez hay días en `wearable_daily`, el insight biométrico se
   deriva en lectura (`lib/biometric.ts → computeInsight`) y entra al contexto de
   Norman. En el dossier admin del usuario (`Admin → Usuarios → [usuario] →
   K. BIOMÉTRICOS`) deben aparecer estados (recuperación, fatiga, tendencia).

---

## Demo sin credenciales (para vender/QA HOY)

No necesitas Terra para mostrar el flujo completo de biometría → Norman. El
**simulador sintético determinista** ya está cableado en el panel de admin:

1. `Admin → Usuarios → [usuario de prueba] → K. BIOMÉTRICOS → SIMULADOR DE DATOS (DEMO)`.
2. Elegir un escenario (`good_week`, `burnout_week`, `recovery_week`, `unstable_sleep`,
   `post_travel`, `high_strain`, `low_recovery`) y pulsar **GENERAR**.
3. Se escriben 14 días en `wearable_daily` con `provider='synthetic'`, se computan los
   insights por día y la tarjeta de biometría del dossier se refresca al instante.
4. **LIMPIAR** borra solo los datos sintéticos de ese usuario.

El simulador usa un PRNG sembrado (sin `Math.random`/`Date`): mismo seed → misma serie,
reproducible para una demo. **No** siembra datos en usuarios reales automáticamente —
es una acción manual del admin por usuario.

---

## Riesgos / decisiones abiertas

- **Mapeo doc-based (riesgo principal):** validar `terraToDaily` / `normalizeTerra`
  contra payloads reales (paso 6). Mitigación actual: fixtures doc-based + helpers que
  toleran claves alternas en el cliente.
- **Paridad cliente ↔ edge function:** el endurecimiento de claves alternas se hizo en
  `lib/wearableAggregatorLogic.ts`; replicarlo en `normalizeTerra` de la edge function
  si la validación real lo pide.
- **BAA antes de PHI:** bloqueante de cumplimiento, no técnico. No conectar usuarios
  reales sin él.
- **`delete-account`** ya purga `wearable_webhook_events` y los datos del agregador —
  no hay deuda de GDPR pendiente en este track.
