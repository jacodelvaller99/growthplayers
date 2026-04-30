-- ══════════════════════════════════════════════
-- AURAOS EXTENSIONS — LIFEFLOW
-- ══════════════════════════════════════════════

-- ── 1. Extend wellness_sessions type CHECK ────
-- Drop old constraint (name varies by Postgres version)
DO $$
BEGIN
  ALTER TABLE wellness_sessions DROP CONSTRAINT IF EXISTS wellness_sessions_type_check;
EXCEPTION WHEN others THEN NULL;
END $$;

ALTER TABLE wellness_sessions ADD CONSTRAINT wellness_sessions_type_check
  CHECK (type IN ('meditation','breathing','binaural','asmr','sleep'));

-- ── 2. Add frequency & background_track columns ─
ALTER TABLE wellness_sessions ADD COLUMN IF NOT EXISTS frequency_hz numeric;
ALTER TABLE wellness_sessions ADD COLUMN IF NOT EXISTS background_track text;

-- ── 3. user_profiles extensions ───────────────
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_wellness_minutes integer DEFAULT 0;

-- ── 4. journal_entries ─────────────────────────
CREATE TABLE IF NOT EXISTS journal_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     text NOT NULL,
  mood_score  integer CHECK (mood_score BETWEEN 1 AND 10),
  entry_type  text DEFAULT 'reflection'
              CHECK (entry_type IN ('reflection','gratitude','intention')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own journal"
  ON journal_entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS journal_entries_user_created
  ON journal_entries(user_id, created_at DESC);

-- ── 5. B2B tables (no RLS needed on org — admin only) ─
CREATE TABLE IF NOT EXISTS b2b_organizations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  admin_user_id uuid REFERENCES auth.users(id),
  plan          text DEFAULT 'enterprise',
  seats         integer DEFAULT 10,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_members (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id  uuid NOT NULL REFERENCES b2b_organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role    text DEFAULT 'member',
  UNIQUE(org_id, user_id)
);
