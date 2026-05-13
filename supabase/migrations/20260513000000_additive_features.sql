-- ════════════════════════════════════════════════════════════════════════════
-- POLARIS GROWTH INSTITUTE — ADDITIVE FEATURES v4.1
-- Solo crea tablas que NO existen. IF NOT EXISTS en todo.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Hábitos ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habits (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  category     text NOT NULL,
  icon         text,
  color        text DEFAULT '#EDBA01',
  target_days  text[] DEFAULT ARRAY['mon','tue','wed','thu','fri','sat','sun'],
  streak       integer DEFAULT 0,
  best_streak  integer DEFAULT 0,
  is_active    boolean DEFAULT true,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id   uuid REFERENCES habits(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date       date NOT NULL DEFAULT CURRENT_DATE,
  completed  boolean DEFAULT true,
  notes      text,
  UNIQUE(habit_id, date)
);

-- ── Ayuno intermitente ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fasting_sessions (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type           text NOT NULL,
  target_hours   integer NOT NULL,
  started_at     timestamptz NOT NULL DEFAULT now(),
  ended_at       timestamptz,
  completed      boolean DEFAULT false,
  actual_hours   float,
  breaking_food  text,
  notes          text,
  created_at     timestamptz DEFAULT now()
);

-- ── Comunidad ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_posts (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content     text NOT NULL CHECK (length(content) > 2),
  type        text DEFAULT 'reflection',
  likes_count integer DEFAULT 0,
  is_pinned   boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_reactions (
  id      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type    text DEFAULT 'like',
  UNIQUE(post_id, user_id)
);

-- Trigger para actualizar likes_count automáticamente
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_post_likes ON community_reactions;
CREATE TRIGGER trg_post_likes
  AFTER INSERT OR DELETE ON community_reactions
  FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- ── Mediciones corporales ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS body_measurements (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg    float NOT NULL,
  height_cm    float,
  bmi          float,
  measured_at  date NOT NULL DEFAULT CURRENT_DATE,
  notes        text,
  created_at   timestamptz DEFAULT now()
);

-- ── Perfil nutricional ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nutrition_profiles (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  diet_type      text NOT NULL DEFAULT 'omnivore',
  restrictions   text[],
  allergies      text[],
  goals          text[],
  daily_cal_goal integer,
  updated_at     timestamptz DEFAULT now()
);

-- ── Suplementación ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplement_stacks (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  goal        text,
  supplements jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- ── Sesiones semanales Norman ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_sessions (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  week_number           integer NOT NULL,
  ai_message            text,
  focus_areas           text[],
  recommended_practices jsonb,
  completed             boolean DEFAULT false,
  generated_at          timestamptz DEFAULT now(),
  UNIQUE(user_id, week_number)
);

-- ── Mentor threads ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mentor_threads (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text NOT NULL DEFAULT 'Conversación',
  summary       text,
  message_count integer DEFAULT 0,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ── ALTER tablas existentes (solo si la columna no existe) ────────────────────
ALTER TABLE mentor_conversations ADD COLUMN IF NOT EXISTS thread_id uuid REFERENCES mentor_threads(id);
ALTER TABLE mentor_memories      ADD COLUMN IF NOT EXISTS memory_type text;
ALTER TABLE mentor_memories      ADD COLUMN IF NOT EXISTS relevance float DEFAULT 1.0;

-- ── RLS en todas las tablas nuevas ───────────────────────────────────────────
DO $$ DECLARE t text; BEGIN
  FOR t IN VALUES
    ('habits'), ('habit_logs'), ('fasting_sessions'),
    ('community_posts'), ('community_reactions'),
    ('body_measurements'), ('nutrition_profiles'),
    ('supplement_stacks'), ('weekly_sessions'), ('mentor_threads')
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    BEGIN
      EXECUTE format(
        'CREATE POLICY "own_%s" ON %I FOR ALL USING (auth.uid() = user_id)',
        t, t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- Comunidad: lectura pública, escritura propia
DO $$
BEGIN
  BEGIN
    CREATE POLICY "community_read_all" ON community_posts FOR SELECT USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    CREATE POLICY "community_comments_read" ON community_reactions FOR SELECT USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ── Índices ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_habits_user_active
  ON habits(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date
  ON habit_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_fasting_user
  ON fasting_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_date
  ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentor_threads_user
  ON mentor_threads(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_body_user_date
  ON body_measurements(user_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_sessions_user
  ON weekly_sessions(user_id, week_number DESC);
