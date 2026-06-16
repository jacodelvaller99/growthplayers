-- ─────────────────────────────────────────────────────────────────────────────
-- Mentor Execution OS — motor de tareas + evaluación de mentor + scores + cola
--
-- Capa OPERATIVA sobre lo existente. `mentor_tasks` es el objeto unificado de tarea
-- (con evidencia, calidad, fricción, review, scores); se NORMALIZAN hacia él las
-- fuentes existentes (mentorship_sessions.action_plan, mentorship_tasks, commitments
-- del Memory OS, lesson_tasks, habits) — sin borrarlas. La evaluación autoritativa
-- del mentor vive en `mentor_task_reviews` (admin-only). Los scores y la cola de
-- intervención son admin-only; el cliente ve solo sus tareas + un progreso de apoyo
-- derivado client-side (no lee los scores crudos).
--
-- Idempotente. RLS espejando el patrón de las migraciones previas.
-- Aplicar vía SQL Editor del dashboard.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. mentor_tasks — objeto operativo de tarea ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mentor_tasks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title               text NOT NULL,
  description         text,
  category            text,            -- protocolo|bienestar|mentoría|identidad|negocio|relaciones|salud|energía|accountability|hábitos|decisiones
  source_type         text NOT NULL DEFAULT 'manual',  -- lesson|mentorship|norman|habit|admin|protocol|transcript
  source_id           text,
  assigned_by         uuid,
  assigned_at         timestamptz NOT NULL DEFAULT now(),
  due_date            timestamptz,
  priority            text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high','critical')),
  status              text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','in_progress','completed','blocked','avoided','overdue','canceled')),
  evidence_required   boolean NOT NULL DEFAULT false,
  evidence_type       text,            -- checkin|text|transcript|lesson|biometrics|upload|manual
  evidence_payload    jsonb DEFAULT '{}'::jsonb,
  self_report_score   integer,         -- 0-100 auto-reporte del cliente
  mentor_score        integer,         -- 0-100 (espejo del review; autoritativo en mentor_task_reviews)
  execution_quality   text CHECK (execution_quality IN ('low','medium','high')),
  friction_reason     text,
  mentor_review_status text NOT NULL DEFAULT 'pending'
    CHECK (mentor_review_status IN ('pending','ai_suggested','reviewed','approved','rejected','partial')),
  completed_at        timestamptz,
  reviewed_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentor_tasks_user      ON public.mentor_tasks(user_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_mentor_tasks_source    ON public.mentor_tasks(user_id, source_type, source_id);

ALTER TABLE public.mentor_tasks ENABLE ROW LEVEL SECURITY;

-- Cliente: ve y auto-reporta SUS tareas. Admin: todo. (La evaluación del mentor es
-- autoritativa en mentor_task_reviews — admin-only — así un cliente no la altera.)
DROP POLICY IF EXISTS "mtask_own_or_admin" ON public.mentor_tasks;
CREATE POLICY "mtask_own_or_admin" ON public.mentor_tasks FOR ALL TO authenticated
  USING (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_tasks TO authenticated;

-- ── 2. mentor_task_reviews — rúbrica de evaluación (ADMIN-ONLY) ──────────────────
CREATE TABLE IF NOT EXISTS public.mentor_task_reviews (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id            uuid NOT NULL REFERENCES public.mentor_tasks(id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_id        uuid,
  review_status      text CHECK (review_status IN ('not_started','partial','completed','blocked','avoided')),
  quality            text CHECK (quality IN ('low','acceptable','strong','exceptional')),
  evidence_confidence text CHECK (evidence_confidence IN ('none','weak','moderate','strong')),
  failure_type       text,  -- forgot|no_clarity|resistance|fear|perfectionism|time_chaos|identity_conflict|low_energy|external_dependency|false_compliance
  mentor_action      text,  -- reinforce|simplify|confront|redefine|follow_up|escalate
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentor_task_reviews_task ON public.mentor_task_reviews(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentor_task_reviews_user ON public.mentor_task_reviews(user_id, created_at DESC);

ALTER TABLE public.mentor_task_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mreview_admin_only" ON public.mentor_task_reviews;
CREATE POLICY "mreview_admin_only" ON public.mentor_task_reviews FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_task_reviews TO authenticated;

-- ── 3. mentor_client_scores — scores operativos (ADMIN-ONLY) ─────────────────────
-- Admin-only: incluye señales "duras" (atención/fricción) que NO se exponen al
-- cliente. El cliente ve un progreso de apoyo derivado client-side de sus tareas.
CREATE TABLE IF NOT EXISTS public.mentor_client_scores (
  user_id                 uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  adherence_score         integer,
  execution_quality_score integer,
  follow_through_score    integer,
  friction_score          integer,
  mentor_attention_score  integer,
  weekly_momentum_state   text CHECK (weekly_momentum_state IN ('rising','stable','fragile','declining','critical')),
  drivers                 jsonb DEFAULT '{}'::jsonb,  -- explicabilidad: qué mueve cada score
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mentor_client_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mscores_admin_only" ON public.mentor_client_scores;
CREATE POLICY "mscores_admin_only" ON public.mentor_client_scores FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_client_scores TO authenticated;

-- ── 4. mentor_intervention_queue — cola cross-client (ADMIN-ONLY) ────────────────
CREATE TABLE IF NOT EXISTS public.mentor_intervention_queue (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  queue_reason        text,
  severity            text CHECK (severity IN ('low','medium','high','critical')),
  summary             text,
  recommended_action  text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  resolved_at         timestamptz
);

CREATE INDEX IF NOT EXISTS idx_mentor_iq_open ON public.mentor_intervention_queue(severity, created_at DESC) WHERE resolved_at IS NULL;

ALTER TABLE public.mentor_intervention_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "miq_admin_only" ON public.mentor_intervention_queue;
CREATE POLICY "miq_admin_only" ON public.mentor_intervention_queue FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_intervention_queue TO authenticated;
