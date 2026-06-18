-- ─────────────────────────────────────────────────────────────────────────────
-- Wearables — providers nativos (Apple HealthKit + Android Health Connect).
--
-- Extiende el CHECK constraint de provider para aceptar lecturas on-device
-- desde HealthKit (iOS) y Health Connect (Android). No hay tokens server-side
-- para estos dos providers — la app inserta directamente vía el cliente
-- Supabase del usuario (RLS owner ya cubre).
--
-- Idempotente. Aplicar vía SQL Editor del dashboard.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.wearable_daily       DROP CONSTRAINT IF EXISTS wearable_daily_provider_check;
ALTER TABLE public.wearable_daily       ADD  CONSTRAINT wearable_daily_provider_check
  CHECK (provider IN ('oura','whoop','synthetic','apple_health','health_connect'));

ALTER TABLE public.wearable_timeseries  DROP CONSTRAINT IF EXISTS wearable_timeseries_provider_check;
ALTER TABLE public.wearable_timeseries  ADD  CONSTRAINT wearable_timeseries_provider_check
  CHECK (provider IN ('oura','whoop','synthetic','apple_health','health_connect'));

ALTER TABLE public.wearable_connections DROP CONSTRAINT IF EXISTS wearable_connections_provider_check;
ALTER TABLE public.wearable_connections ADD  CONSTRAINT wearable_connections_provider_check
  CHECK (provider IN ('oura','whoop','synthetic','apple_health','health_connect'));
