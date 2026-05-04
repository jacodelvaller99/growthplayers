-- ─── CMI LifeFlow — Corrective Migration ─────────────────────────────────────
-- Migration: 20260504200000_cmi_corrective.sql
--
-- ACTUAL DB STATE (verified 2026-05-04):
--   BASE TABLES: access_codes, check_ins, completed_lessons, daily_checkins,
--                lesson_tasks, mentor_messages, north_stars, profiles,
--                user_profiles
--   VIEWS:       user_progress  (computed from above — DO NOT ALTER)
--   MISSING:     user_memberships, user_course_access, admin_audit_log,
--                access_code_uses (+ all intelligence tables)
--
-- profiles.id = auth.uid() — this is the admin flag table.
-- All RLS policies check: EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)

-- ─── 0. Add is_admin to profiles (base table, id = auth.uid()) ──────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Set owner accounts as admin
UPDATE public.profiles
SET is_admin = true
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email IN (
    'ncapuozzo@polarisgrowthinstitute.com',
    'jacodelvalle@gmail.com'
  )
);

-- ─── 1. Extend access_codes with type/notes/created_by ──────────────────────
ALTER TABLE public.access_codes
  ADD COLUMN IF NOT EXISTS type        text NOT NULL DEFAULT 'beta',
  ADD COLUMN IF NOT EXISTS notes       text,
  ADD COLUMN IF NOT EXISTS created_by  uuid REFERENCES auth.users(id);

-- ─── 2. access_code_uses ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.access_code_uses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id    uuid REFERENCES public.access_codes(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.access_code_uses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own_code_uses"  ON public.access_code_uses;
DROP POLICY IF EXISTS "admin_all_code_uses" ON public.access_code_uses;

CREATE POLICY "user_own_code_uses" ON public.access_code_uses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "admin_all_code_uses" ON public.access_code_uses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ─── 3. user_memberships ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_memberships (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product      text NOT NULL,
  status       text NOT NULL DEFAULT 'active',
  activated_by text NOT NULL DEFAULT 'admin',
  activated_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz,
  price_paid   numeric DEFAULT 0,
  currency     text DEFAULT 'USD',
  notes        text,
  created_by   uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_user_memberships_user   ON public.user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_status ON public.user_memberships(status);

ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own_memberships"  ON public.user_memberships;
DROP POLICY IF EXISTS "admin_all_memberships" ON public.user_memberships;

CREATE POLICY "user_own_memberships" ON public.user_memberships
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "admin_all_memberships" ON public.user_memberships
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ─── 4. user_course_access ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_course_access (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id   text NOT NULL,
  module_ids  text[],
  granted_by  uuid REFERENCES auth.users(id),
  granted_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz,
  is_active   boolean NOT NULL DEFAULT true,
  notes       text
);

CREATE INDEX IF NOT EXISTS idx_course_access_user   ON public.user_course_access(user_id);
CREATE INDEX IF NOT EXISTS idx_course_access_course ON public.user_course_access(course_id);

ALTER TABLE public.user_course_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own_course_access"  ON public.user_course_access;
DROP POLICY IF EXISTS "admin_all_course_access" ON public.user_course_access;

CREATE POLICY "user_own_course_access" ON public.user_course_access
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "admin_all_course_access" ON public.user_course_access
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ─── 5. admin_audit_log ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid REFERENCES auth.users(id),
  action      text NOT NULL,
  target_type text,
  target_id   text,
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin   ON public.admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.admin_audit_log(created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_only_audit" ON public.admin_audit_log;

CREATE POLICY "admin_only_audit" ON public.admin_audit_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ─── 6. admin_activate_membership RPC ────────────────────────────────────────
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
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO user_memberships (user_id, product, status, activated_by, expires_at, price_paid, currency, notes, created_by)
  VALUES (p_user_id, p_product, 'active', 'admin', p_expires_at, p_price_paid, p_currency, p_notes, p_admin_id)
  RETURNING id INTO v_membership_id;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, metadata)
  VALUES (p_admin_id, 'activate_membership', 'membership', v_membership_id::text,
    jsonb_build_object('user_id', p_user_id, 'product', p_product, 'price_paid', p_price_paid));

  RETURN v_membership_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_activate_membership TO authenticated;

-- ─── 7. admin_create_access_code RPC ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_create_access_code(
  p_admin_id   uuid,
  p_code       text,
  p_type       text,
  p_max_uses   int DEFAULT 1,
  p_expires_at timestamptz DEFAULT NULL,
  p_notes      text DEFAULT NULL,
  p_label      text DEFAULT NULL
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

-- ─── 8. RLS: allow admin to read all daily_checkins ──────────────────────────
DO $$
BEGIN
  DROP POLICY IF EXISTS "admin_read_all_checkins" ON public.daily_checkins;
  CREATE POLICY "admin_read_all_checkins" ON public.daily_checkins
    FOR SELECT USING (
      auth.uid() = user_id OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );
EXCEPTION WHEN others THEN NULL;
END $$;

-- ─── 9. Seed admin profiles (idempotent) ─────────────────────────────────────
-- profiles.id = auth.uid() and has NOT NULL columns (name, onboarding_completed,
-- active_module_id, created_at), so we SELECT from auth.users to satisfy them.
INSERT INTO public.profiles (id, name, role, onboarding_completed, active_module_id, created_at, updated_at, is_admin)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', u.email, 'Admin') AS name,
  'admin',
  true,
  'guerrero-mentalidad',
  u.created_at,
  now(),
  true
FROM auth.users u
WHERE u.email IN (
  'ncapuozzo@polarisgrowthinstitute.com',
  'jacodelvalle@gmail.com'
)
ON CONFLICT (id) DO UPDATE SET
  is_admin    = true,
  role        = 'admin',
  updated_at  = now();

-- ─── 10. Trigger: auto-create profiles row on new user signup ─────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, onboarding_completed, active_module_id, created_at, updated_at, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member'),
    false,
    'guerrero-mentalidad',
    NOW(),
    NOW(),
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
