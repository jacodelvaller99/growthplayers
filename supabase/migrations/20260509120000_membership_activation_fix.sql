-- ─────────────────────────────────────────────────────────────────────────────
-- Membership activation fix
-- Fixes RLS policies for access code redemption and membership activation.
-- Creates initial test access codes.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Ensure access_codes table exists with correct schema ──────────────────
CREATE TABLE IF NOT EXISTS access_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,
  type        text NOT NULL DEFAULT 'premium',
  label       text,
  max_uses    integer NOT NULL DEFAULT 1,
  uses_count  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  expires_at  timestamptz,
  notes       text,
  created_by  uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 2. Ensure access_code_uses table exists ──────────────────────────────────
CREATE TABLE IF NOT EXISTS access_code_uses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id     uuid NOT NULL REFERENCES access_codes(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  used_at     timestamptz NOT NULL DEFAULT now(),
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(code_id, user_id)
);

-- ── 3. Ensure user_memberships table exists ──────────────────────────────────
CREATE TABLE IF NOT EXISTS user_memberships (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  product       text NOT NULL,
  status        text NOT NULL DEFAULT 'active',
  activated_by  text,
  activated_at  timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz,
  price_paid    numeric DEFAULT 0,
  currency      text DEFAULT 'USD',
  notes         text,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── 4. Enable RLS on all tables ──────────────────────────────────────────────
ALTER TABLE access_codes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_code_uses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memberships  ENABLE ROW LEVEL SECURITY;

-- ── 5. RLS policies: access_codes ────────────────────────────────────────────

-- Any authenticated user can read access codes (needed for redemption lookup)
DROP POLICY IF EXISTS "authenticated_select_access_codes" ON access_codes;
CREATE POLICY "authenticated_select_access_codes"
  ON access_codes FOR SELECT
  TO authenticated
  USING (true);

-- Any authenticated user can UPDATE uses_count (for atomic increment on redemption)
DROP POLICY IF EXISTS "authenticated_update_access_codes_uses" ON access_codes;
CREATE POLICY "authenticated_update_access_codes_uses"
  ON access_codes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Admins can INSERT new codes
DROP POLICY IF EXISTS "admin_insert_access_codes" ON access_codes;
CREATE POLICY "admin_insert_access_codes"
  ON access_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admins can deactivate codes
DROP POLICY IF EXISTS "admin_delete_access_codes" ON access_codes;
CREATE POLICY "admin_delete_access_codes"
  ON access_codes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ── 6. RLS policies: access_code_uses ────────────────────────────────────────

-- Users can record their own redemptions
DROP POLICY IF EXISTS "user_insert_own_code_uses" ON access_code_uses;
CREATE POLICY "user_insert_own_code_uses"
  ON access_code_uses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can see their own uses; admins see all
DROP POLICY IF EXISTS "user_select_own_code_uses" ON access_code_uses;
CREATE POLICY "user_select_own_code_uses"
  ON access_code_uses FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ── 7. RLS policies: user_memberships ────────────────────────────────────────

-- Users can see their own memberships
DROP POLICY IF EXISTS "user_select_own_memberships" ON user_memberships;
CREATE POLICY "user_select_own_memberships"
  ON user_memberships FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Users can insert their own memberships (via code redemption)
DROP POLICY IF EXISTS "user_insert_own_memberships" ON user_memberships;
CREATE POLICY "user_insert_own_memberships"
  ON user_memberships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can insert memberships for any user
DROP POLICY IF EXISTS "admin_insert_memberships" ON user_memberships;
CREATE POLICY "admin_insert_memberships"
  ON user_memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Admins can update any membership (cancel, extend)
DROP POLICY IF EXISTS "admin_update_memberships" ON user_memberships;
CREATE POLICY "admin_update_memberships"
  ON user_memberships FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ── 8. Ensure profiles.subscription_tier column exists ───────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_tier text NOT NULL DEFAULT 'free';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_expires_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_expires_at timestamptz;
  END IF;
END $$;

-- ── 9. RLS on profiles — allow users to update their own tier ─────────────────
DROP POLICY IF EXISTS "user_update_own_profile_tier" ON profiles;
CREATE POLICY "user_update_own_profile_tier"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── 10. Indexes for performance ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_access_codes_code       ON access_codes(code);
CREATE INDEX IF NOT EXISTS idx_access_codes_active     ON access_codes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_memberships_user   ON user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_status ON user_memberships(status);
CREATE INDEX IF NOT EXISTS idx_access_code_uses_user   ON access_code_uses(user_id);
