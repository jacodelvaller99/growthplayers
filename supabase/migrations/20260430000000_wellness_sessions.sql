-- Wellness sessions — meditation, breathing, binaural
CREATE TABLE IF NOT EXISTS wellness_sessions (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            text         NOT NULL CHECK (type IN ('meditation', 'breathing', 'binaural')),
  session_name    text         NOT NULL,
  duration_seconds integer     NOT NULL DEFAULT 0,
  completed_at    timestamptz  NOT NULL DEFAULT now(),
  metadata        jsonb,
  created_at      timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE wellness_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own wellness_sessions"
  ON wellness_sessions FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX wellness_sessions_user_id_idx ON wellness_sessions(user_id);
CREATE INDEX wellness_sessions_completed_at_idx ON wellness_sessions(user_id, completed_at DESC);
