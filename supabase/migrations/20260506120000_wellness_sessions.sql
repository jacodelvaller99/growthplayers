-- ─── wellness_sessions ────────────────────────────────────────────────────────
-- App code references this table everywhere (binaural beats, meditation,
-- breathing sessions) but it was never created. This migration creates it.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.wellness_sessions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type              text        NOT NULL,          -- 'binaural' | 'meditation' | 'breathing' | 'sleep'
  session_name      text,
  duration_seconds  integer,
  frequency_hz      numeric,                       -- for binaural beats
  background_track  text,
  completed_at      timestamptz,
  metadata          jsonb,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wellness_sessions_user_id
  ON public.wellness_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_wellness_sessions_type
  ON public.wellness_sessions(type);

CREATE INDEX IF NOT EXISTS idx_wellness_sessions_created_at
  ON public.wellness_sessions(created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.wellness_sessions ENABLE ROW LEVEL SECURITY;

-- Users can CRUD their own sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'wellness_sessions'
      AND policyname = 'users_own_wellness_sessions'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "users_own_wellness_sessions"
        ON public.wellness_sessions
        FOR ALL
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid())
    $pol$;
  END IF;
END $$;

-- Admins: full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'wellness_sessions'
      AND policyname = 'admin_all_wellness_sessions'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "admin_all_wellness_sessions"
        ON public.wellness_sessions
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.is_admin = true
          )
        )
    $pol$;
  END IF;
END $$;
