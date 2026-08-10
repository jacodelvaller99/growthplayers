-- ─────────────────────────────────────────────────────────────────────────────
-- Wearables — Polar + Strava como providers OAuth directos.
--
-- Alternativa a Terra/Open Wearables que pidió el dueño explícitamente sin
-- infraestructura externa: ambos corren enteramente en Supabase Edge
-- Functions (sync-wearables), igual que Oura/WHOOP — sin servidor propio,
-- sin Docker, sin Railway. Extiende el CHECK constraint de provider.
--
-- Idempotente. Aplicar vía SQL Editor del dashboard.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.wearable_daily       DROP CONSTRAINT IF EXISTS wearable_daily_provider_check;
ALTER TABLE public.wearable_daily       ADD  CONSTRAINT wearable_daily_provider_check
  CHECK (provider IN ('oura','whoop','synthetic','apple_health','health_connect','aggregator','polar','strava'));

ALTER TABLE public.wearable_timeseries  DROP CONSTRAINT IF EXISTS wearable_timeseries_provider_check;
ALTER TABLE public.wearable_timeseries  ADD  CONSTRAINT wearable_timeseries_provider_check
  CHECK (provider IN ('oura','whoop','synthetic','apple_health','health_connect','aggregator','polar','strava'));

ALTER TABLE public.wearable_connections DROP CONSTRAINT IF EXISTS wearable_connections_provider_check;
ALTER TABLE public.wearable_connections ADD  CONSTRAINT wearable_connections_provider_check
  CHECK (provider IN ('oura','whoop','synthetic','apple_health','health_connect','aggregator','polar','strava'));
