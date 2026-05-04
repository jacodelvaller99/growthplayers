-- ─── CMI LifeFlow — Admin Infrastructure Tables ─────────────────────────────
-- Migration: 20260504000000_cmi_admin.sql

-- ─── 0. Ensure is_admin exists on profiles ──────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Mark the owner admin account
UPDATE public.profiles
SET is_admin = true
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email = 'ncapuozzo@polarisgrowthinstitute.com'
);

-- ─── 1. Extend access_codes ─────────────────────────────────────────────────
-- Add type/product mapping and admin fields
ALTER TABLE public.access_codes
  ADD COLUMN IF NOT EXISTS type        text DEFAULT 'beta',
  ADD COLUMN IF NOT EXISTS notes       text,
  ADD COLUMN IF NOT EXISTS created_by  uuid REFERENCES auth.users(id);

-- ─── 2. access_code_uses — track who used what code ─────────────────────────
CREATE TABLE IF NOT EXISTS public.access_code_uses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id    uuid REFERENCES public.access_codes(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.access_code_uses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_code_uses" ON public.access_code_uses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admin_all_code_uses" ON public.access_code_uses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ─── 3. user_memberships ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_memberships (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product      text NOT NULL,
  -- 'lifeflow_free'|'lifeflow_premium'|'lifeflow_premium_plus'|'polaris'|'growthplayers'
  status       text NOT NULL DEFAULT 'active',
  -- 'active'|'expired'|'cancelled'|'paused'
  activated_by text NOT NULL DEFAULT 'admin',
  -- 'admin'|'access_code'|'payment'
  activated_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz,
  price_paid   numeric DEFAULT 0,
  currency     text DEFAULT 'USD',
  notes        text,
  created_by   uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_user_memberships_user ON public.user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_status ON public.user_memberships(status);

ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_memberships" ON public.user_memberships
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admin_all_memberships" ON public.user_memberships
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ─── 4. user_course_access ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_course_access (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id   text NOT NULL,
  -- 'polaris'|'growthplayers'|'lifeflow_bienestar'
  module_ids  text[],   -- null = all modules
  granted_by  uuid REFERENCES auth.users(id),
  granted_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz,
  is_active   boolean NOT NULL DEFAULT true,
  notes       text
);

CREATE INDEX IF NOT EXISTS idx_course_access_user ON public.user_course_access(user_id);
CREATE INDEX IF NOT EXISTS idx_course_access_course ON public.user_course_access(course_id);

ALTER TABLE public.user_course_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_course_access" ON public.user_course_access
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admin_all_course_access" ON public.user_course_access
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ─── 5. admin_audit_log ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid REFERENCES auth.users(id),
  action      text NOT NULL,
  target_type text,       -- 'user'|'membership'|'access_code'|'course'
  target_id   text,
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON public.admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.admin_audit_log(created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only_audit" ON public.admin_audit_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ─── 6. RLS on intelligence tables (admin reads all) ────────────────────────
-- user_events: admin can SELECT all rows (own RLS already via service_role)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_events') THEN
    DROP POLICY IF EXISTS "admin_read_all_events" ON public.user_events;
    CREATE POLICY "admin_read_all_events" ON public.user_events
      FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_intelligence') THEN
    DROP POLICY IF EXISTS "admin_read_all_intelligence" ON public.user_intelligence;
    CREATE POLICY "admin_read_all_intelligence" ON public.user_intelligence
      FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mentor_conversations') THEN
    DROP POLICY IF EXISTS "admin_read_all_conversations" ON public.mentor_conversations;
    CREATE POLICY "admin_read_all_conversations" ON public.mentor_conversations
      FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;
END $$;

-- ─── 7. Helper function: grant membership and update profile tier ────────────
CREATE OR REPLACE FUNCTION public.admin_activate_membership(
  p_admin_id    uuid,
  p_user_id     uuid,
  p_product     text,
  p_expires_at  timestamptz DEFAULT NULL,
  p_price_paid  numeric DEFAULT 0,
  p_currency    text DEFAULT 'USD',
  p_notes       text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membership_id uuid;
  v_tier text;
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Insert membership
  INSERT INTO user_memberships (user_id, product, status, activated_by, expires_at, price_paid, currency, notes, created_by)
  VALUES (p_user_id, p_product, 'active', 'admin', p_expires_at, p_price_paid, p_currency, p_notes, p_admin_id)
  RETURNING id INTO v_membership_id;

  -- Derive tier for profiles update
  v_tier := CASE p_product
    WHEN 'lifeflow_premium_plus' THEN 'premium_plus'
    WHEN 'lifeflow_premium'      THEN 'premium'
    WHEN 'polaris'               THEN 'premium_plus'
    WHEN 'growthplayers'         THEN 'premium'
    ELSE 'free'
  END;

  -- Update profiles.subscription_tier if column exists
  BEGIN
    EXECUTE format('UPDATE profiles SET subscription_tier = %L WHERE id = %L', v_tier, p_user_id);
  EXCEPTION WHEN undefined_column THEN
    NULL; -- column not yet in profiles, safe to ignore
  END;

  -- Audit log
  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, metadata)
  VALUES (p_admin_id, 'activate_membership', 'membership', v_membership_id::text,
    jsonb_build_object('user_id', p_user_id, 'product', p_product, 'price_paid', p_price_paid));

  RETURN v_membership_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_activate_membership TO authenticated;

-- ─── 8. Function: create access code ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_create_access_code(
  p_admin_id  uuid,
  p_code      text,
  p_type      text,
  p_max_uses  int DEFAULT 1,
  p_expires_at timestamptz DEFAULT NULL,
  p_notes     text DEFAULT NULL,
  p_label     text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO access_codes (code, type, label, max_uses, is_active, expires_at, notes, created_by)
  VALUES (upper(p_code), p_type, p_label, p_max_uses, true, p_expires_at, p_notes, p_admin_id)
  RETURNING id INTO v_code_id;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, metadata)
  VALUES (p_admin_id, 'create_access_code', 'access_code', v_code_id::text,
    jsonb_build_object('code', p_code, 'type', p_type, 'max_uses', p_max_uses));

  RETURN v_code_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_access_code TO authenticated;
