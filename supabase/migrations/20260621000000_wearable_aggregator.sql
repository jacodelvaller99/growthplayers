-- ─────────────────────────────────────────────────────────────────────────────
-- Wearables — agregador universal (Cluster D).
--
-- Una sola integración cloud que conecta CUALQUIER reloj (Garmin, Polar, Coros,
-- Suunto, Fitbit, Samsung, Withings, Apple, Google Fit, WHOOP, Oura, etc.) y
-- entrega datos normalizados por webhook. Funciona también en web/PWA (no exige
-- build nativo, a diferencia de HealthKit/Health Connect).
--
-- Provider canónico = 'aggregator' (un solo valor en el CHECK — el motor
-- downstream ya es provider-agnóstico). El reloj real subyacente se guarda en la
-- nueva columna `source_device` (display) sin explotar el constraint.
--
-- Idempotente. Aplicar vía SQL Editor del dashboard.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Extender el CHECK de provider para aceptar 'aggregator' ────────────────
ALTER TABLE public.wearable_daily       DROP CONSTRAINT IF EXISTS wearable_daily_provider_check;
ALTER TABLE public.wearable_daily       ADD  CONSTRAINT wearable_daily_provider_check
  CHECK (provider IN ('oura','whoop','synthetic','apple_health','health_connect','aggregator'));

ALTER TABLE public.wearable_timeseries  DROP CONSTRAINT IF EXISTS wearable_timeseries_provider_check;
ALTER TABLE public.wearable_timeseries  ADD  CONSTRAINT wearable_timeseries_provider_check
  CHECK (provider IN ('oura','whoop','synthetic','apple_health','health_connect','aggregator'));

ALTER TABLE public.wearable_connections DROP CONSTRAINT IF EXISTS wearable_connections_provider_check;
ALTER TABLE public.wearable_connections ADD  CONSTRAINT wearable_connections_provider_check
  CHECK (provider IN ('oura','whoop','synthetic','apple_health','health_connect','aggregator'));

-- ── 2. Columna source_device — el reloj real bajo el agregador (display) ──────
-- Ej. 'GARMIN', 'COROS', 'FITBIT', 'POLAR', 'SAMSUNG', 'WITHINGS'. Nullable: los
-- providers directos (oura/whoop) la dejan null.
ALTER TABLE public.wearable_daily       ADD COLUMN IF NOT EXISTS source_device TEXT;
ALTER TABLE public.wearable_connections ADD COLUMN IF NOT EXISTS source_device TEXT;

-- En connections, el id de usuario del agregador (Terra user_id / Vital user_id, etc.)
-- necesario para correlacionar el webhook con nuestro user_id.
ALTER TABLE public.wearable_connections ADD COLUMN IF NOT EXISTS aggregator_user_id TEXT;
CREATE INDEX IF NOT EXISTS wearable_connections_aggregator_user_idx
  ON public.wearable_connections (aggregator_user_id)
  WHERE aggregator_user_id IS NOT NULL;

-- ── 3. Tabla de eventos del webhook — idempotencia + auditoría ────────────────
-- El agregador empuja datos por webhook. Guardamos cada evento con su id único
-- para (a) deduplicar reentregas y (b) tener rastro auditable del raw payload.
CREATE TABLE IF NOT EXISTS public.wearable_webhook_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- id del evento según el agregador (clave de idempotencia). UNIQUE → reentrega
  -- = no-op vía ON CONFLICT DO NOTHING.
  event_id        TEXT NOT NULL,
  event_type      TEXT,                       -- 'daily' | 'sleep' | 'activity' | 'body' | 'auth' | ...
  aggregator_user_id TEXT,                     -- user del agregador (correlación)
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- nuestro user (si resuelto)
  payload         JSONB,                       -- raw para reproceso/auditoría
  processed       BOOLEAN NOT NULL DEFAULT false,
  process_error   TEXT,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS wearable_webhook_events_event_id_key
  ON public.wearable_webhook_events (event_id);
CREATE INDEX IF NOT EXISTS wearable_webhook_events_user_idx
  ON public.wearable_webhook_events (user_id, received_at DESC);

ALTER TABLE public.wearable_webhook_events ENABLE ROW LEVEL SECURITY;

-- Solo el service-role (edge function) escribe/lee esta tabla. Ningún cliente.
-- Sin políticas para `authenticated` = sin acceso de usuario (RLS deniega por defecto).
-- El owner puede ver SUS eventos (para debug en la app, opcional):
DROP POLICY IF EXISTS "wearable_webhook_events_owner_select" ON public.wearable_webhook_events;
CREATE POLICY "wearable_webhook_events_owner_select"
  ON public.wearable_webhook_events FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- ── Nota delete-account ───────────────────────────────────────────────────────
-- wearable_webhook_events.user_id CASCADE desde auth.users. La edge function
-- delete-account ya purga wearable_* — añadir wearable_webhook_events ahí también.
