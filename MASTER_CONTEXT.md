# MASTER CONTEXT

> Documento vivo. Cada sesión lo deja mejor que como lo encontró.
> Para la guía completa de arquitectura ver `CLAUDE.md`. Este archivo registra el
> ESTADO REAL operativo + el trabajo ejecutado + lo que queda bloqueado y por qué.

---

## Estado actual del producto

Polaris Growth Institute — app React Native / Expo (iOS, Android, Web PWA) de coaching
de alto rendimiento. **Compila, typecheck 0, lint 0 errores, 314 tests verdes.** Conecta
a Supabase de PRODUCCIÓN vía `.env.local` (no hay entorno de staging separado).

**Wearables (foco de esta sesión):** la app soporta 3 caminos para datos de reloj:
1. **Nativo on-device** — Apple HealthKit (iOS) + Android Health Connect. Funciona en
   builds nativos; cubre ~60% de los relojes (Apple Watch, Garmin/Polar/Samsung que
   escriben al SO). Bloqueado a producción solo por `eas init` (projectId placeholder).
2. **OAuth web** — WHOOP + Oura (PWA y nativo). Requiere `EXPO_PUBLIC_*_CLIENT_ID` +
   registrar redirect URIs en las consolas de cada vendor (handoff abierto).
3. **Agregador universal (cualquier reloj)** — cambiable por vendor vía flag
   `AGGREGATOR_VENDOR`: **Terra** (comercial, default) o **Open Wearables** (OSS self-host,
   añadido esta sesión). Ninguno enruta datos reales todavía: faltan handoffs del dueño
   (ver "Tareas pendientes").

---

## Arquitectura vigente (wearables)

- **Cliente:** `lib/wearables.ts` (OAuth WHOOP/Oura + hooks `useWearableConnections`/
  `useWearableDaily`, provider-agnósticos), `lib/wearablesNative.ts` (HealthKit/HC),
  `lib/wearableAggregator.ts` (`connectAggregator(provider?)`).
- **Lógica pura (testeada):** `lib/wearableAggregatorLogic.ts` — modelo intermedio neutro
  `AggregatorDaily`; adapters por vendor (`terraToDaily`, `openWearablesToDaily`); `mergeDailies`;
  `toWearableDailyRow`. **Cambiar de vendor = reescribir 1 adapter, no el motor.**
- **Edge function:** `supabase/functions/wearable-aggregator/index.ts` — parametrizada por
  `AGGREGATOR_VENDOR`. Webhook (Terra HMAC `t.body` / Open Wearables Svix `id.ts.body`, ambos
  con compare constant-time) + connect (Terra widget session / Open Wearables OAuth por marca).
  Escritura vía RPC `merge_wearable_daily` (merge por-columna atómico, **race-free**). OW valida
  identidad resolviendo el user vía la conexión activa (no confía en el `user_id` crudo del webhook).
- **Tabla destino:** `wearable_daily` (provider `'aggregator'`, columna `source_device` =
  reloj real). Idempotencia/auditoría en `wearable_webhook_events`. Migración
  `20260621000000_wearable_aggregator.sql`.
- **Downstream provider-agnóstico:** `lib/biometric.ts` + `lib/biometricLogic.ts` derivan
  el estado (sleep/recovery/coherence) de HRV+RHR vs baseline; toleran campos nullable. Los
  scores nativos de sleep/recovery solo los traen WHOOP/Oura; el resto se deriva.

---

## Trabajo ejecutado en esta sesión

**Fecha:** 2026-06-24
**Objetivo:** que "cualquier reloj" se conecte vía un agregador **open-source self-host**
(no el vendor comercial), por decisión del dueño.

**Investigación (verificada vía web + GitHub):**
- Metriport **descontinuó** su producto de wearables (pivoteó a registros médicos). No sirve.
- Wearipedia (juguete de investigación, alpha), Shimmer (muerto 8 años), Vital/Rook
  (comerciales) — descartados.
- **Open Wearables** (`github.com/the-momentum/open-wearables`, MIT, v0.6.1 jun-2026, ~2k★,
  FastAPI+Postgres+Redis, SDK React Native, webhooks Svix + REST) = **única opción OSS
  self-host viable**. Cubre Garmin/Oura/Whoop/Polar/Suunto/Fitbit/Strava/Ultrahuman + nativos.

**Archivos tocados (capa de código del agregador OSS):**
- `lib/wearableAggregatorLogic.ts` — `+ openWearablesToDaily` (sesión sleep/activity +
  timeseries hrv/spo2/respiratory/steps/calories), `+ aggregatorToDaily` / `normalizeAggregatorPayloadFor`
  (switch por vendor). Reusa `AggregatorDaily`/`mergeDailies`/`toWearableDailyRow` sin tocar.
- `__tests__/unit/wearableAggregatorLogic.test.ts` — +12 tests (fixtures doc-based de Open Wearables).
- `supabase/functions/wearable-aggregator/index.ts` — `AGGREGATOR_VENDOR` flag; firma Svix
  (`verifyOpenWearablesSignature`); normalizador OW inline; connect OAuth por marca
  (`generateOpenWearablesAuthUrl`); `handleOpenWearablesWebhook` (connection.created/revoked +
  datos); **`upsertMergedDaily`** (coalesce non-null) aplicado a ambos vendors.
- `app/config/env.ts` — `ENV.aggregatorVendor` (`EXPO_PUBLIC_AGGREGATOR_VENDOR`, default 'terra').
- `lib/wearableAggregator.ts` — `connectAggregator(provider?)` pasa la marca a la edge function.
- `app/perfil/wearables.tsx` — en modo `open_wearables` la tarjeta "Cualquier reloj" abre un
  **selector de marca** (Modal con 8 proveedores OAuth); en modo `terra` no cambia.

**Por qué:** la arquitectura ya era vendor-swappable; integrar Open Wearables = 1 adapter +
parametrizar la edge function, reusando el modelo neutro. El dueño quiere evitar el vendor
comercial y mantener control/$0-por-usuario.

---

## Problemas encontrados

- **Pérdida de campos entre webhooks separados.** Open Wearables manda cada métrica
  (sleep, hrv, steps…) en su propio webhook; un upsert que reemplaza borraría campos de
  eventos anteriores del mismo día. **Causa raíz:** PostgREST upsert hace `SET col = excluded`.
  **Solución:** RPC `merge_wearable_daily` (migración `20260625000000`) — `INSERT … ON CONFLICT
  DO UPDATE` con COALESCE bajo row-lock: atómico y **race-free** (un read-modify-write en JS
  habría tenido race con eventos concurrentes del mismo día). Aplicado a ambos vendors.
- **Revisión adversarial (subagente) → 5 correcciones aplicadas:** (1) OW resuelve el user vía
  conexión, no confía en `data.user_id` crudo (evita cruce entre usuarios); (2) merge race-free
  vía RPC; (3) Terra sin regresión de comportamiento; (4) firma Svix con compare constant-time;
  (5) replay-guard rechaza timestamp no numérico. Mapeos inline (Deno) vs puro (TS): consistentes.
- **Adapter doc-based.** El modelo de Open Wearables es "first iteration"; algunos campos
  (recovery/readiness, resting HR) aún no están formalmente definidos en sus docs. El adapter
  mapea lo documentado y deja null el resto. **Riesgo residual:** validar contra un payload
  REAL (paso del runbook). Mitigado con fixtures+tests.
- **Escala de `sleep_efficiency_score`.** Se pasa tal cual (se asume 0-100). Validar con dato real.
- **Widget web de Open Wearables = roadmap.** El connect es OAuth por marca (funciona en web
  por redirect), pero no hay widget multi-marca hosteado todavía. La UI lo cubre con el selector.

---

## Tareas pendientes

### Handoffs del DUEÑO (sin esto el agregador OSS no enruta datos — yo no puedo ejecutarlos)
- [ ] **Levantar Open Wearables self-host** — `docker compose up` (FastAPI+Postgres+Redis).
      Prioridad: P0 para activar. Bloqueo: requiere infra/servidor del dueño.
- [ ] **Registrar OAuth por marca** — Garmin (aprobación de partner, multi-semana), WHOOP
      (app approval), Oura/Fitbit/Polar/Suunto/Strava (OAuth apps). **Lo exige cualquier
      agregador, no lo evita el self-host.** Prioridad: P0. Bloqueo: cuentas de developer del dueño.
- [ ] **Secrets en Supabase** (Edge Functions → Secrets): `AGGREGATOR_VENDOR=open_wearables`,
      `OPEN_WEARABLES_BASE_URL`, `OPEN_WEARABLES_API_KEY`, `OPEN_WEARABLES_WEBHOOK_SECRET (whsec_…)`.
      Prioridad: P0. Bloqueo: dashboard del dueño.
- [ ] **`EXPO_PUBLIC_AGGREGATOR_VENDOR=open_wearables`** en Vercel + `.env.local` (activa el
      selector de marca en la UI). Prioridad: P1.
- [ ] **Configurar webhook** en Open Wearables → `…/functions/v1/wearable-aggregator` (Svix).
      Prioridad: P0.
- [ ] **`supabase functions deploy wearable-aggregator`** (CLI). Prioridad: P0. Bloqueo: CLI del dueño.
- [ ] **Validar `openWearablesToDaily` contra un payload REAL** y ajustar campos dudosos
      (efficiency, recovery). Prioridad: P1.

### Migraciones (las puedo aplicar vía SQL Editor — la auditoría reportó la 1ª NO aplicada en prod)
- [ ] `20260621000000_wearable_aggregator.sql` (provider 'aggregator' + `source_device`
      + `wearable_webhook_events`). Sin ella el upsert del agregador falla por el CHECK constraint.
- [ ] `20260625000000_wearable_daily_merge.sql` (RPC `merge_wearable_daily`, merge race-free).
      Requerida por la edge function para escribir datos del agregador. Prioridad: P1.

---

## RUNBOOK — activar Open Wearables (self-host) end-to-end

1. **Desplegar el agregador:** clonar `github.com/the-momentum/open-wearables`; `docker compose up`
   en un host del dueño (Railway/Render/VPS). Verás la API en `…/api/v1` y Swagger en `/docs`.
2. **Registrar marcas:** en cada consola de vendor (Garmin/WHOOP/Oura/Fitbit/Polar/Suunto/Strava/
   Ultrahuman) crear la OAuth app y meter las credenciales en Open Wearables. Garmin requiere
   aprobación de partner (planificar semanas).
3. **Obtener la API key** de Open Wearables (header `X-Open-Wearables-API-Key`).
4. **Crear endpoint de webhook** en Open Wearables apuntando a
   `https://<ref>.supabase.co/functions/v1/wearable-aggregator`; copiar el **signing secret** (`whsec_…`).
5. **Secrets en Supabase** (dashboard): `AGGREGATOR_VENDOR=open_wearables`, `OPEN_WEARABLES_BASE_URL`,
   `OPEN_WEARABLES_API_KEY`, `OPEN_WEARABLES_WEBHOOK_SECRET`.
6. **Migraciones** (SQL Editor): aplicar `20260621000000_wearable_aggregator.sql` +
   `20260625000000_wearable_daily_merge.sql`.
7. **Deploy:** `supabase functions deploy wearable-aggregator`.
8. **App:** `EXPO_PUBLIC_AGGREGATOR_VENDOR=open_wearables` en Vercel + `.env.local`.
9. **Validar:** conectar una marca real desde `/perfil/wearables` → completar OAuth → confirmar
   que llegan webhooks (tabla `wearable_webhook_events`) y que `wearable_daily` se puebla. **Ajustar
   el adapter `openWearablesToDaily` si algún campo no calza con el payload real.**

---

## Validaciones ejecutadas (esta sesión)

- **Build (web export):** ✅ `npx expo export --platform web`
- **Typecheck:** ✅ `npx tsc --noEmit` → 0
- **Lint:** ✅ `npm run lint` → 0 errores (warnings preexistentes sin cambio)
- **Tests:** ✅ `npm test` → suite verde, incl. +12 tests nuevos del adapter Open Wearables
- **QA manual (preview):** la tarjeta "Cualquier reloj" renderiza; sin instancia configurada
  el connect falla con gracia (mensaje honesto, no loader colgado). Enrutamiento real NO
  verificable sin la instancia self-host (bloqueo del dueño, documentado).

---

## Riesgos / deuda viva

- **El agregador OSS NO está live** hasta completar el runbook (infra + OAuth del dueño). El
  código está completo y testeado; la funcionalidad real depende de handoffs que no puedo ejecutar.
- **Adapter doc-based** (Open Wearables "first iteration") — validar contra payload real.
- **Self-host = más ops** que el vendor comercial (hosting, refresh de tokens, HIPAA si se
  almacena PHI). Conviene reevaluar Terra-vs-OSS según escala (OSS gana > ~500 usuarios activos).
- **Camino Terra conservado** detrás del flag (no se borró código que sirve).
