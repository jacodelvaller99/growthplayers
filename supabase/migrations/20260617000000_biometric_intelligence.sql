-- ─────────────────────────────────────────────────────────────────────────────
-- Biometric Intelligence Layer — scoring interpretable + datos sintéticos +
-- reflexiones de bienestar hacia el Memory OS.
--
-- EXTIENDE lo existente (wearable_daily/timeseries/connections, journal_entries,
-- memory_summaries) — no duplica. Añade SOLO la tabla nueva biometric_insights.
-- Idempotente. Aplicar vía SQL Editor del dashboard.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. wearable_daily — campos faltantes + proveedor 'synthetic' ─────────────────
ALTER TABLE public.wearable_daily
  ADD COLUMN IF NOT EXISTS respiratory_rate     numeric,
  ADD COLUMN IF NOT EXISTS signal_confidence    numeric,   -- 0-1
  ADD COLUMN IF NOT EXISTS data_freshness_hours numeric;

ALTER TABLE public.wearable_daily       DROP CONSTRAINT IF EXISTS wearable_daily_provider_check;
ALTER TABLE public.wearable_daily       ADD  CONSTRAINT wearable_daily_provider_check
  CHECK (provider IN ('oura','whoop','synthetic'));

ALTER TABLE public.wearable_timeseries  DROP CONSTRAINT IF EXISTS wearable_timeseries_provider_check;
ALTER TABLE public.wearable_timeseries  ADD  CONSTRAINT wearable_timeseries_provider_check
  CHECK (provider IN ('oura','whoop','synthetic'));

ALTER TABLE public.wearable_connections DROP CONSTRAINT IF EXISTS wearable_connections_provider_check;
ALTER TABLE public.wearable_connections ADD  CONSTRAINT wearable_connections_provider_check
  CHECK (provider IN ('oura','whoop','synthetic'));

-- ── 2. wearable_connections — sync status más rico ───────────────────────────────
ALTER TABLE public.wearable_connections
  ADD COLUMN IF NOT EXISTS last_success_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error      text,
  ADD COLUMN IF NOT EXISTS sync_mode       text DEFAULT 'live';  -- live|synthetic

-- ── 3. journal_entries — capa de reflexión enriquecida ───────────────────────────
-- La tabla puede no existir en algunos entornos (el diario degradaba en silencio);
-- la creamos con su esquema base esperado por la app antes de extenderla.
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     text NOT NULL DEFAULT '',
  entry_type  text DEFAULT 'reflection',
  mood_score  integer,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_user ON public.journal_entries(user_id, created_at DESC);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Dueño escribe lo suyo; admin lee (panel de contenido muestra diarios).
DROP POLICY IF EXISTS "je_owner_or_admin" ON public.journal_entries;
CREATE POLICY "je_owner_or_admin" ON public.journal_entries FOR ALL TO authenticated
  USING (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS title             text,
  ADD COLUMN IF NOT EXISTS energy_tag        text,
  ADD COLUMN IF NOT EXISTS stress_tag        text,
  ADD COLUMN IF NOT EXISTS linked_metric_date date,
  ADD COLUMN IF NOT EXISTS linked_session_id uuid;

-- Ampliar entry_type para los nuevos tipos de reflexión.
ALTER TABLE public.journal_entries DROP CONSTRAINT IF EXISTS journal_entries_entry_type_check;
ALTER TABLE public.journal_entries ADD  CONSTRAINT journal_entries_entry_type_check
  CHECK (entry_type IN ('reflection','gratitude','intention','wellness','recovery','sleep','post_session','freeform'));

-- ── 4. memory_summaries — permitir source_type 'wellness' ────────────────────────
ALTER TABLE public.memory_summaries DROP CONSTRAINT IF EXISTS memory_summaries_source_type_check;
ALTER TABLE public.memory_summaries ADD  CONSTRAINT memory_summaries_source_type_check
  CHECK (source_type IN ('chat','mentorship','plaud','manual','wellness','aggregate'));

-- ── 5. biometric_insights — salida de scoring (coach-safe + client-safe) ─────────
CREATE TABLE IF NOT EXISTS public.biometric_insights (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_date         date NOT NULL,
  sleep_state         text,   -- excellent|good|fragile|poor|critical
  recovery_state      text,   -- strong|adequate|compromised|weak|high_risk
  coherence_state     text,   -- stable|slightly_disturbed|unstable|highly_unstable
  fatigue_risk        text,   -- low|moderate|elevated|high
  trend_state         text,   -- improving|stable|volatile|worsening
  intervention_level  text,   -- low|medium|high|urgent
  summary             text,
  drivers             jsonb DEFAULT '[]'::jsonb,
  coach_safe_summary  text,
  client_safe_summary text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_biometric_insights_user ON public.biometric_insights(user_id, metric_date DESC);

ALTER TABLE public.biometric_insights ENABLE ROW LEVEL SECURITY;

-- Dueño ve lo suyo (la UI cliente solo muestra client_safe_summary); admin ve todo.
DROP POLICY IF EXISTS "bi_own_or_admin" ON public.biometric_insights;
CREATE POLICY "bi_own_or_admin" ON public.biometric_insights FOR ALL TO authenticated
  USING (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.biometric_insights TO authenticated;
