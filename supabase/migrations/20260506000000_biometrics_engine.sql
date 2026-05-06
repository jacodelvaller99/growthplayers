-- ─────────────────────────────────────────────────────────────────────────────
-- CMI LifeFlow — Biometrics Engine
-- Migration: 20260506000000_biometrics_engine.sql
--
-- Tables:
--   wearable_connections  — OAuth tokens per user/provider
--   wearable_daily        — Daily summary (readiness, sleep, activity, HRV)
--   wearable_timeseries   — Intraday time series (HR, HRV, SpO2, etc.)
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Wearable connections (OAuth tokens) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wearable_connections (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider         text        NOT NULL CHECK (provider IN ('oura', 'whoop')),
  access_token     text,       -- encrypted at rest (Supabase Vault ideally)
  refresh_token    text,
  token_expires_at timestamptz,
  is_active        boolean     DEFAULT true,
  connected_at     timestamptz DEFAULT now(),
  last_synced_at   timestamptz,
  scope            text[],
  metadata         jsonb       DEFAULT '{}'::jsonb,
  UNIQUE (user_id, provider)
);

-- ─── 2. Daily wearable summary ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wearable_daily (
  id                   uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              uuid    REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider             text    NOT NULL CHECK (provider IN ('oura', 'whoop')),
  date                 date    NOT NULL,

  -- Sleep
  sleep_score          integer,          -- 0–100
  sleep_duration_min   integer,          -- total minutes
  sleep_efficiency     numeric(5,2),     -- % time asleep vs in bed
  rem_min              integer,
  deep_min             integer,
  light_min            integer,
  awake_min            integer,

  -- Recovery / Readiness
  recovery_score       integer,          -- 0–100 (Oura readiness / WHOOP recovery)
  hrv_ms               numeric(8,2),     -- RMSSD in ms
  resting_hr           integer,          -- BPM
  body_temp_delta      numeric(5,2),     -- °C deviation vs baseline (Oura)
  spo2_avg             numeric(5,2),     -- % blood oxygen saturation

  -- Activity / Strain
  activity_score       integer,          -- 0–100
  strain_score         numeric(5,2),     -- 0–21 (WHOOP specific)
  calories_active      integer,
  steps                integer,
  active_min           integer,

  -- Stress (if available)
  stress_score         integer,

  -- Raw payload for debugging/reprocessing
  raw_payload          jsonb,
  synced_at            timestamptz DEFAULT now(),

  UNIQUE (user_id, provider, date)
);

-- ─── 3. Intraday time series ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wearable_timeseries (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider    text        NOT NULL CHECK (provider IN ('oura', 'whoop')),
  metric      text        NOT NULL,
  -- 'heart_rate' | 'hrv' | 'spo2' | 'skin_temp' | 'activity'
  recorded_at timestamptz NOT NULL,
  value       numeric     NOT NULL,

  UNIQUE (user_id, provider, metric, recorded_at)
);

-- ─── 4. Indexes for ML queries ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wearable_daily_user_date
  ON public.wearable_daily (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_wearable_daily_provider_date
  ON public.wearable_daily (provider, date DESC);

CREATE INDEX IF NOT EXISTS idx_wearable_timeseries_user_metric
  ON public.wearable_timeseries (user_id, metric, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_wearable_connections_user_active
  ON public.wearable_connections (user_id, is_active);

-- ─── 5. Row Level Security ───────────────────────────────────────────────────
ALTER TABLE public.wearable_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_daily       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_timeseries  ENABLE ROW LEVEL SECURITY;

-- Users can only see/modify their own data
CREATE POLICY "own_wearable_connections" ON public.wearable_connections
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "own_daily_data" ON public.wearable_daily
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "own_timeseries" ON public.wearable_timeseries
  FOR ALL USING (auth.uid() = user_id);

-- Admins can read all wearable data (for CMI dashboard)
CREATE POLICY "admin_wearable_daily" ON public.wearable_daily
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "admin_wearable_connections" ON public.wearable_connections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ─── 6. Helper: wearable baseline view (7-day rolling avg per user) ──────────
CREATE OR REPLACE VIEW public.wearable_baseline AS
SELECT
  user_id,
  provider,
  AVG(hrv_ms)      FILTER (WHERE date >= CURRENT_DATE - 7) AS hrv_baseline_7d,
  AVG(resting_hr)  FILTER (WHERE date >= CURRENT_DATE - 7) AS hr_baseline_7d,
  AVG(recovery_score) FILTER (WHERE date >= CURRENT_DATE - 7) AS recovery_baseline_7d,
  COUNT(*)         FILTER (WHERE date >= CURRENT_DATE - 7) AS days_with_data
FROM public.wearable_daily
GROUP BY user_id, provider;

-- Grant select on view to authenticated
GRANT SELECT ON public.wearable_baseline TO authenticated;

-- ─── 7. Backfill: ensure user_intelligence has biometric columns ─────────────
ALTER TABLE public.user_intelligence
  ADD COLUMN IF NOT EXISTS biometric_readiness    integer,   -- 0–100
  ADD COLUMN IF NOT EXISTS biometric_provider     text,      -- 'oura' | 'whoop'
  ADD COLUMN IF NOT EXISTS biometric_hrv_ms       numeric,
  ADD COLUMN IF NOT EXISTS biometric_resting_hr   integer,
  ADD COLUMN IF NOT EXISTS biometric_anomaly      text;      -- 'biometric_stress' | 'elevated_resting_hr' | null

-- ─────────────────────────────────────────────────────────────────────────────
-- Verify
DO $$
BEGIN
  RAISE NOTICE 'Biometrics Engine tables created: wearable_connections, wearable_daily, wearable_timeseries';
END $$;
