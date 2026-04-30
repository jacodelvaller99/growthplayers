-- ═══════════════════════════════════════════════════════════════════════════════
-- LIFEFLOW INTELLIGENCE ENGINE v1
-- Tablas de ML, analytics, memoria vectorial del mentor y notificaciones smart
-- ═══════════════════════════════════════════════════════════════════════════════

-- Habilitar pgvector (si no está habilitado)
CREATE EXTENSION IF NOT EXISTS vector;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. BEHAVIORAL EVENTS (raw tracking)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_events (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type    text NOT NULL,
  -- screen_view | lesson_start | lesson_complete | lesson_abandon
  -- binaural_start | binaural_complete | breathing_complete
  -- meditation_complete | chat_sent | checkin_submit
  -- app_open | app_background | button_tap | journal_write
  screen        text,
  metadata      jsonb DEFAULT '{}',
  -- {lesson_id, module_id, duration_ms, scroll_pct, frequency_hz,
  --  technique, cycles, mood_before, mood_after, word_count}
  session_id    uuid,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_user_time  ON user_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type_time  ON user_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_session    ON user_events(session_id) WHERE session_id IS NOT NULL;

ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_events" ON user_events
  FOR ALL USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. USER INTELLIGENCE (ML scores calculated by edge functions)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_intelligence (
  user_id               uuid REFERENCES auth.users(id) PRIMARY KEY,

  -- Engagement & Churn
  engagement_score      numeric(5,2) DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
  churn_risk            numeric(4,3) DEFAULT 0 CHECK (churn_risk >= 0 AND churn_risk <= 1),
  churn_risk_label      text DEFAULT 'low' CHECK (churn_risk_label IN ('low','medium','high','critical')),
  days_since_last_act   integer DEFAULT 0,
  predicted_churn_date  date,

  -- Behavioral DNA
  preferred_time        text CHECK (preferred_time IN ('morning','afternoon','evening','night')),
  preferred_duration    integer,           -- avg session minutes
  dominant_module       text,
  dominant_tool         text,

  -- Content Affinity (0–1)
  affinity_binaural     numeric(4,3) DEFAULT 0,
  affinity_breathing    numeric(4,3) DEFAULT 0,
  affinity_meditation   numeric(4,3) DEFAULT 0,
  affinity_journaling   numeric(4,3) DEFAULT 0,
  affinity_lessons      numeric(4,3) DEFAULT 0,
  affinity_mentor       numeric(4,3) DEFAULT 0,

  -- Next Best Action
  next_action           text,
  next_action_reason    text,
  next_action_urgency   text DEFAULT 'normal' CHECK (next_action_urgency IN ('low','normal','high','urgent')),

  -- Anomaly Detection
  anomaly_detected      boolean DEFAULT false,
  anomaly_type          text CHECK (anomaly_type IN ('mood_drop','streak_break','biometric_spike','isolation','performance_drop') OR anomaly_type IS NULL),
  anomaly_detected_at   timestamptz,

  -- Cohort Clustering
  cohort_id             integer,
  cohort_label          text CHECK (cohort_label IN ('high_performer','achiever','wellness_seeker','passive_learner','explorer','at_risk') OR cohort_label IS NULL),

  -- Raw feature cache (for quick re-computation)
  feature_cache         jsonb DEFAULT '{}',
  -- {days_active_14d, lessons_7d, wellness_7d, checkins_7d, abandon_rate,
  --  avg_session_ms, mentor_msgs_7d, streak, score_delta}

  last_calculated_at    timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intelligence_churn      ON user_intelligence(churn_risk_label);
CREATE INDEX IF NOT EXISTS idx_intelligence_engagement ON user_intelligence(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_intelligence_cohort     ON user_intelligence(cohort_label);
CREATE INDEX IF NOT EXISTS idx_intelligence_anomaly    ON user_intelligence(anomaly_detected) WHERE anomaly_detected = true;

ALTER TABLE user_intelligence ENABLE ROW LEVEL SECURITY;
-- Users can only read their own intelligence
CREATE POLICY "own_intelligence_select" ON user_intelligence
  FOR SELECT USING (auth.uid() = user_id);
-- Service role (edge functions) can do everything — no policy needed (bypasses RLS)

-- Auto-upsert trigger: set updated_at
CREATE OR REPLACE FUNCTION update_intelligence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_intelligence_updated
  BEFORE UPDATE ON user_intelligence
  FOR EACH ROW EXECUTE FUNCTION update_intelligence_timestamp();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. MENTOR CONVERSATIONS (structured history)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS mentor_conversations (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role        text NOT NULL CHECK (role IN ('user','assistant')),
  content     text NOT NULL,
  metadata    jsonb DEFAULT '{}',
  -- {module_referenced, tool_used, mood_detected, topics:[], tokens_used}
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conv_user_time  ON mentor_conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_role       ON mentor_conversations(user_id, role);

ALTER TABLE mentor_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_conversations" ON mentor_conversations
  FOR ALL USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. MENTOR MEMORIES (pgvector episodic memory)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS mentor_memories (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content      text NOT NULL,
  memory_type  text DEFAULT 'conversation'
    CHECK (memory_type IN ('conversation','insight','breakthrough','struggle','goal','reflection')),
  importance   integer DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
  embedding    vector(1536),   -- OpenAI text-embedding-3-small
  metadata     jsonb DEFAULT '{}',
  -- {lesson_id, energy, clarity, stress, topic, keywords:[]}
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memories_user     ON mentor_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_type     ON mentor_memories(user_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_memories_import   ON mentor_memories(importance DESC);
-- IVFFlat index for cosine similarity search (requires data to train — add after 1000+ rows)
-- CREATE INDEX idx_memories_vec ON mentor_memories
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

ALTER TABLE mentor_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_memories_select" ON mentor_memories
  FOR SELECT USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. SMART NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS smart_notifications (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type          text NOT NULL
    CHECK (type IN ('churn_intervention','streak_rescue','next_action','anomaly_alert','milestone','optimal_checkin')),
  title         text,
  body          text,
  action_url    text,
  sent_at       timestamptz,
  opened_at     timestamptz,
  acted_at      timestamptz,
  effectiveness numeric(4,3),   -- 0–1, calculated post-hoc
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_user      ON smart_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_type      ON smart_notifications(type);
CREATE INDEX IF NOT EXISTS idx_notif_unsent    ON smart_notifications(sent_at) WHERE sent_at IS NULL;

ALTER TABLE smart_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_notifications" ON smart_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. EXTEND PROFILES
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone           text DEFAULT 'America/Bogota';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_hour  integer DEFAULT 8;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ml_consent         boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin           boolean DEFAULT false;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. HELPER FUNCTION: cosine similarity search for memories
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION search_mentor_memories(
  p_user_id    uuid,
  p_embedding  vector(1536),
  p_limit      integer DEFAULT 5
)
RETURNS TABLE (
  id           uuid,
  content      text,
  memory_type  text,
  importance   integer,
  created_at   timestamptz,
  similarity   float
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.memory_type,
    m.importance,
    m.created_at,
    1 - (m.embedding <=> p_embedding) AS similarity
  FROM mentor_memories m
  WHERE m.user_id = p_user_id
    AND m.embedding IS NOT NULL
  ORDER BY m.embedding <=> p_embedding
  LIMIT p_limit;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. HELPER FUNCTION: auto-initialize user_intelligence on signup
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION initialize_user_intelligence()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_intelligence (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: when a new profile is created, initialize intelligence row
DROP TRIGGER IF EXISTS trg_init_intelligence ON profiles;
CREATE TRIGGER trg_init_intelligence
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION initialize_user_intelligence();

-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE
-- ═══════════════════════════════════════════════════════════════════════════════
-- Run in Supabase SQL Editor to apply.
-- Also enable pg_cron extension in Supabase dashboard: Database → Extensions → pg_cron
