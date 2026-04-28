-- ══════════════════════════════════════════════
-- LIFEFLOW — SCHEMA COMPLETO
-- ══════════════════════════════════════════════

-- ── EXTENSIONES ──────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ══════════════════════════════════════════════
-- TABLA 1: user_profiles
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  text,
  email                 text,
  avatar_url            text,
  protocol_start_date   date,
  purpose               text,
  identity              text,
  non_negotiables       text[] DEFAULT '{}',
  daily_reminder        text,
  sovereign_score       integer DEFAULT 0,
  streak                integer DEFAULT 0,
  tier                  text DEFAULT 'Aprendiz',
  total_days            integer DEFAULT 0,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLA 2: daily_checkins
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date            date NOT NULL,
  energy          integer CHECK (energy BETWEEN 1 AND 10),
  clarity         integer CHECK (clarity BETWEEN 1 AND 10),
  stress          integer CHECK (stress BETWEEN 1 AND 10),
  sleep           integer CHECK (sleep BETWEEN 1 AND 10),
  system_need     text,
  sovereign_score integer,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- ══════════════════════════════════════════════
-- TABLA 3: lesson_tasks
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.lesson_tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id     text NOT NULL,
  lesson_title  text,
  module_id     text,
  responses     jsonb DEFAULT '{}',
  completed_at  timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- ══════════════════════════════════════════════
-- TABLA 4: completed_lessons
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.completed_lessons (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id     text NOT NULL,
  module_id     text NOT NULL,
  completed_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- ══════════════════════════════════════════════
-- TABLA 5: mentor_messages
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.mentor_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user', 'assistant')),
  content         text NOT NULL,
  module_context  text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mentor_messages_user_created
  ON public.mentor_messages(user_id, created_at DESC);

-- ══════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════

ALTER TABLE public.user_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checkins    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_tasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completed_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_messages   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"   ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users read own checkins"   ON public.daily_checkins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own checkins" ON public.daily_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own checkins" ON public.daily_checkins FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users read own tasks"   ON public.lesson_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own tasks" ON public.lesson_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own tasks" ON public.lesson_tasks FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users read own completed"   ON public.completed_lessons FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own completed" ON public.completed_lessons FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own messages"   ON public.mentor_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own messages" ON public.mentor_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ══════════════════════════════════════════════
-- FUNCIÓN: updated_at automático
-- ══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_tasks
  BEFORE UPDATE ON public.lesson_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ══════════════════════════════════════════════
-- FUNCIÓN: crear perfil al registrarse
-- ══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ══════════════════════════════════════════════
-- VISTA: progreso del usuario
-- ══════════════════════════════════════════════
CREATE OR REPLACE VIEW public.user_progress AS
SELECT
  p.user_id,
  p.name,
  p.sovereign_score,
  p.streak,
  p.tier,
  p.total_days,
  p.protocol_start_date,
  COUNT(DISTINCT cl.lesson_id) AS total_lessons_done,
  COUNT(DISTINCT lt.lesson_id) AS total_tasks_done,
  (
    SELECT date FROM public.daily_checkins
    WHERE user_id = p.user_id
    ORDER BY date DESC LIMIT 1
  ) AS last_checkin_date
FROM public.user_profiles p
LEFT JOIN public.completed_lessons cl ON cl.user_id = p.user_id
LEFT JOIN public.lesson_tasks lt      ON lt.user_id = p.user_id
GROUP BY p.user_id, p.name, p.sovereign_score,
         p.streak, p.tier, p.total_days, p.protocol_start_date;
