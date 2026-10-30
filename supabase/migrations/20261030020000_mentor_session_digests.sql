-- ════════════════════════════════════════════════════════════════════════════
-- mentor_session_digests — lo que la IA reparte de las notas de cada sesión
-- ════════════════════════════════════════════════════════════════════════════
-- El mentor escribe o pega la sesión; la IA la reparte sola en "lo que se
-- habló", "qué puede mejorar" y compromisos (estos además van al Plan). Es
-- retroalimentación PARA EL MENTOR: admin + mentor asignado, nunca el cliente
-- (por eso no vive en memory_summaries, que el cliente puede leer).
-- Una fila por sesión; cada pasada de la IA la reemplaza.
--
-- delete-account la purga explícitamente (además del CASCADE).
-- Idempotente. Aplicar en el SQL Editor del dashboard.

CREATE TABLE IF NOT EXISTS public.mentor_session_digests (
  session_id  uuid PRIMARY KEY REFERENCES public.mentorship_sessions(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week        integer,
  summary     text NOT NULL DEFAULT '',
  talked      text[] NOT NULL DEFAULT '{}',
  improve     text[] NOT NULL DEFAULT '{}',
  commitments text[] NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentor_session_digests_user
  ON public.mentor_session_digests(user_id);

ALTER TABLE public.mentor_session_digests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "msd_admin_or_mentor" ON public.mentor_session_digests;
CREATE POLICY "msd_admin_or_mentor" ON public.mentor_session_digests FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
         OR public.is_mentor_of(user_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
         OR public.is_mentor_of(user_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_session_digests TO authenticated;
