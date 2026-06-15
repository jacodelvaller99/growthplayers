-- ─────────────────────────────────────────────────────────────────────────────
-- Memory OS — capa narrativa de memoria de cliente + inteligencia de admin
--
-- Reutiliza lo existente (mentor_memories = memoria episódica/semántica con pgvector,
-- mentor_conversations/mentor_messages = chat, mentor_threads = hilos, mentorship_sessions
-- = notas+plan, user_intelligence = señales ML). Aquí se añade SOLO la capa que falta:
--   1) user_memory_profile — perfil vivo sintetizado (cliente-compartible)
--   2) memory_summaries    — resúmenes unificados (chat | mentoría | llamada Plaud | manual)
--   3) admin_briefings     — dossier operativo pre-mentoría (ADMIN-ONLY)
--   4) admin_notes         — notas privadas del coach (ADMIN-ONLY)
-- + ALTER mentor_memories: source_type / tags / event_date (riqueza para recall sin duplicar tabla).
--
-- Idempotente. RLS espejando el patrón de 20260604000000_meeting_features.sql.
-- Expresión admin: EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
-- Aplicar vía SQL Editor del dashboard (no hay service-role local).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. user_memory_profile — perfil vivo (1 fila por usuario) ────────────────────
CREATE TABLE IF NOT EXISTS public.user_memory_profile (
  user_id                 uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  identity_summary        text,
  current_goal            text,
  transformation_goal     text,
  business_context        text,
  recurring_blockers      jsonb DEFAULT '[]'::jsonb,
  emotional_patterns      jsonb DEFAULT '[]'::jsonb,
  decision_style          text,
  current_risks           jsonb DEFAULT '[]'::jsonb,
  recent_wins             jsonb DEFAULT '[]'::jsonb,
  commitments_open        jsonb DEFAULT '[]'::jsonb,
  commitments_completed   jsonb DEFAULT '[]'::jsonb,
  mentorship_focus        text,
  preferred_language_style text,
  relationship_context    jsonb DEFAULT '{}'::jsonb,
  health_energy_context   jsonb DEFAULT '{}'::jsonb,
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_memory_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ump_own_or_admin" ON public.user_memory_profile;
CREATE POLICY "ump_own_or_admin" ON public.user_memory_profile FOR ALL TO authenticated
  USING (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_memory_profile TO authenticated;

-- ── 2. memory_summaries — resúmenes unificados por fuente ────────────────────────
CREATE TABLE IF NOT EXISTS public.memory_summaries (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type          text NOT NULL DEFAULT 'chat'
    CHECK (source_type IN ('chat','mentorship','plaud','manual','aggregate')),
  source_id            text,
  summary              text,
  key_topics           jsonb DEFAULT '[]'::jsonb,
  commitments          jsonb DEFAULT '[]'::jsonb,
  unresolved_questions jsonb DEFAULT '[]'::jsonb,
  emotional_tone       text,
  suggested_next_focus text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memory_summaries_user
  ON public.memory_summaries(user_id, created_at DESC);

ALTER TABLE public.memory_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "msum_own_or_admin" ON public.memory_summaries;
CREATE POLICY "msum_own_or_admin" ON public.memory_summaries FOR ALL TO authenticated
  USING (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.memory_summaries TO authenticated;

-- ── 3. admin_briefings — dossier operativo pre-mentoría (ADMIN-ONLY) ─────────────
-- El cliente NUNCA lee su briefing (contiene challenge points / estrategia del coach).
CREATE TABLE IF NOT EXISTS public.admin_briefings (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generated_for_date       date NOT NULL DEFAULT (now())::date,
  summary                  text,
  what_they_asked_recently jsonb DEFAULT '[]'::jsonb,
  recurring_themes         jsonb DEFAULT '[]'::jsonb,
  open_loops               jsonb DEFAULT '[]'::jsonb,
  suggested_mentorship_topics jsonb DEFAULT '[]'::jsonb,
  challenge_points         jsonb DEFAULT '[]'::jsonb,
  recent_progress          jsonb DEFAULT '[]'::jsonb,
  risk_level               text DEFAULT 'low' CHECK (risk_level IN ('low','medium','high')),
  generated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_briefings_user
  ON public.admin_briefings(user_id, generated_at DESC);

ALTER TABLE public.admin_briefings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "abrief_admin_only" ON public.admin_briefings;
CREATE POLICY "abrief_admin_only" ON public.admin_briefings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_briefings TO authenticated;

-- ── 4. admin_notes — notas privadas del coach (ADMIN-ONLY) ───────────────────────
CREATE TABLE IF NOT EXISTS public.admin_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_notes_user
  ON public.admin_notes(user_id, created_at DESC);

ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anote_admin_only" ON public.admin_notes;
CREATE POLICY "anote_admin_only" ON public.admin_notes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
              AND author_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_notes TO authenticated;

-- ── 5. Reutilizar mentor_memories como capa episódica/semántica (sin tabla nueva) ─
-- Añade riqueza para recall (fuente, etiquetas, fecha del evento) sin tocar la RPC
-- search_mentor_memories ni el flujo de generate-embeddings.
ALTER TABLE public.mentor_memories
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'chat',
  ADD COLUMN IF NOT EXISTS tags        jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS event_date  timestamptz;
