-- ============================================================================
-- MEETING FEATURES — walkthrough de producto 2026-06-04
-- Aditivo + idempotente (IF NOT EXISTS / IF EXISTS). Aplicar vía dashboard SQL.
-- Habilita: hábitos enriquecidos, medidas corporales, planes de nutrición,
-- suplementos estructurados, consentimiento de onboarding, mentoría persistida
-- + grabación, comunidad con moderación + mensajería interna (DM).
-- ============================================================================

-- ── Hábitos: rutina matutina/nocturna, puntos, guía/video, opciones ─────────
ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS time_of_day     text DEFAULT 'anytime',   -- 'morning'|'evening'|'anytime'
  ADD COLUMN IF NOT EXISTS sequence_order  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points          integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS importance_text text,
  ADD COLUMN IF NOT EXISTS video_url       text,
  ADD COLUMN IF NOT EXISTS guide_url       text,
  ADD COLUMN IF NOT EXISTS options         jsonb DEFAULT '[]'::jsonb;

-- ── Cuerpo: medidas corporales además de peso/altura/IMC ────────────────────
ALTER TABLE public.body_measurements
  ADD COLUMN IF NOT EXISTS waist_cm          numeric,
  ADD COLUMN IF NOT EXISTS chest_cm          numeric,
  ADD COLUMN IF NOT EXISTS hip_cm            numeric,
  ADD COLUMN IF NOT EXISTS thigh_cm          numeric,
  ADD COLUMN IF NOT EXISTS arm_cm            numeric,
  ADD COLUMN IF NOT EXISTS body_fat_percent  numeric,
  ADD COLUMN IF NOT EXISTS muscle_mass_kg    numeric;

-- ── Nutrición: plan subido por el nutriólogo ────────────────────────────────
ALTER TABLE public.nutrition_profiles
  ADD COLUMN IF NOT EXISTS plan_url          text,
  ADD COLUMN IF NOT EXISTS nutritionist_name text,
  ADD COLUMN IF NOT EXISTS custom_plan       jsonb;

-- (supplement_stacks.supplements ya es jsonb; el cliente migra la FORMA a
--  {name, dose, timing, category} — no requiere DDL.)

-- ── profiles: consentimiento de onboarding (términos/privacidad/salud) ──────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS consents          jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

-- ── Mentoría persistida (sesiones + tareas) — habilita admin + grabación ────
CREATE TABLE IF NOT EXISTS public.mentorship_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week         integer,
  session_date date,
  audio_url    text,
  transcript   text,
  notes        text,
  action_plan  jsonb DEFAULT '[]'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mentorship_sessions_user ON public.mentorship_sessions(user_id, session_date DESC);

CREATE TABLE IF NOT EXISTS public.mentorship_tasks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week         integer,
  title        text NOT NULL,
  completed    boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mentorship_tasks_user ON public.mentorship_tasks(user_id, week);

ALTER TABLE public.mentorship_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_tasks    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ms_own" ON public.mentorship_sessions;
CREATE POLICY "ms_own" ON public.mentorship_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "mt_own" ON public.mentorship_tasks;
CREATE POLICY "mt_own" ON public.mentorship_tasks FOR ALL TO authenticated
  USING (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (user_id = auth.uid());

-- ── Comunidad: moderación (reportes + bloqueos) + mensajería interna (DM) ────
CREATE TABLE IF NOT EXISTS public.community_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id     uuid,
  reason      text,
  status      text NOT NULL DEFAULT 'open',  -- 'open'|'reviewed'|'actioned'|'dismissed'
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body         text NOT NULL,
  read_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dm_pair ON public.direct_messages(sender_id, recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dm_recipient ON public.direct_messages(recipient_id, created_at DESC);

ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_insert_own" ON public.community_reports;
CREATE POLICY "reports_insert_own" ON public.community_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());
DROP POLICY IF EXISTS "reports_admin_read" ON public.community_reports;
CREATE POLICY "reports_admin_read" ON public.community_reports FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "blocks_own" ON public.user_blocks;
CREATE POLICY "blocks_own" ON public.user_blocks FOR ALL TO authenticated
  USING (blocker_id = auth.uid()) WITH CHECK (blocker_id = auth.uid());

DROP POLICY IF EXISTS "dm_participant_select" ON public.direct_messages;
CREATE POLICY "dm_participant_select" ON public.direct_messages FOR SELECT TO authenticated
  USING (auth.uid() IN (sender_id, recipient_id));
DROP POLICY IF EXISTS "dm_send" ON public.direct_messages;
CREATE POLICY "dm_send" ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());
DROP POLICY IF EXISTS "dm_mark_read" ON public.direct_messages;
CREATE POLICY "dm_mark_read" ON public.direct_messages FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid());

-- ── Cierre del backlog #19: quitar el read directo sobrante de access_codes ─
-- (el cliente nuevo ya usa la RPC redeem_access_code; cf. fix(auth) 4fb8388)
DROP POLICY IF EXISTS "auth_select_active_codes" ON public.access_codes;

-- ── NOTA: crear los Storage buckets manualmente en el dashboard ─────────────
--   • mentorship-audio (privado)  • nutrition-plans (privado)
--   Política por bucket: el dueño accede a su carpeta {user_id}/...
