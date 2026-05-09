-- ============================================================
-- Migration: access_code_rpcs
-- Date: 2026-05-09
-- Description:
--   1. Ensure access_codes.uses_count column exists
--   2. Create redeem_access_code() RPC (atomic validation + increment)
--   3. Create admin_create_access_code() RPC (admin-only insert)
--   4. Ensure admin_audit_log table exists
--   5. Ensure access_code_uses.redeemed_at column name is consistent
-- ============================================================

-- 1. Add uses_count if missing (idempotent)
ALTER TABLE public.access_codes
  ADD COLUMN IF NOT EXISTS uses_count integer NOT NULL DEFAULT 0;

-- 2. redeem_access_code RPC
-- Returns: 'ok' | 'invalid' | 'exhausted' | 'expired' | 'inactive'
-- Atomic: uses UPDATE with equality guard to prevent concurrent double-spend
CREATE OR REPLACE FUNCTION public.redeem_access_code(p_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row public.access_codes%ROWTYPE;
  v_updated integer;
BEGIN
  -- Fetch code
  SELECT * INTO v_row
  FROM public.access_codes
  WHERE code = upper(trim(p_code));

  IF NOT FOUND THEN
    RETURN 'invalid';
  END IF;

  -- Validate state
  IF NOT v_row.is_active THEN
    RETURN 'inactive';
  END IF;

  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN
    RETURN 'expired';
  END IF;

  IF v_row.uses_count >= v_row.max_uses THEN
    RETURN 'exhausted';
  END IF;

  -- Atomic increment with concurrency guard
  UPDATE public.access_codes
  SET    uses_count = uses_count + 1
  WHERE  id         = v_row.id
    AND  uses_count = v_row.uses_count;   -- prevents double-spend

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RETURN 'exhausted';  -- lost the race
  END IF;

  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_access_code(text) TO anon, authenticated;

-- 3. admin_create_access_code RPC
CREATE OR REPLACE FUNCTION public.admin_create_access_code(
  p_admin_id   uuid,
  p_code       text,
  p_type       text,
  p_max_uses   integer DEFAULT 1,
  p_expires_at timestamptz DEFAULT NULL,
  p_notes      text DEFAULT NULL,
  p_label      text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_new_id   uuid;
BEGIN
  -- Verify caller is admin
  SELECT is_admin INTO v_is_admin
  FROM public.profiles
  WHERE id = p_admin_id;

  IF NOT FOUND OR NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Access denied: caller is not an admin';
  END IF;

  INSERT INTO public.access_codes (
    code, type, max_uses, uses_count, is_active,
    expires_at, notes, label, created_by
  ) VALUES (
    upper(trim(p_code)), p_type, p_max_uses, 0, true,
    p_expires_at, p_notes, p_label, p_admin_id
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_access_code(uuid, text, text, integer, timestamptz, text, text) TO authenticated;

-- 4. admin_audit_log table (idempotent)
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text NOT NULL,
  target_type text,
  target_id   text,
  metadata    jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_audit" ON public.admin_audit_log;
CREATE POLICY "admin_all_audit"
  ON public.admin_audit_log FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- 5. Normalize access_code_uses timestamp column (support both names)
ALTER TABLE public.access_code_uses
  ADD COLUMN IF NOT EXISTS redeemed_at timestamptz NOT NULL DEFAULT now();

-- Back-fill used_at → redeemed_at if old column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'access_code_uses' AND column_name = 'used_at'
  ) THEN
    UPDATE public.access_code_uses
    SET redeemed_at = used_at
    WHERE redeemed_at = now() AND used_at IS NOT NULL;
  END IF;
END $$;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_access_code_uses_code_id ON public.access_code_uses(code_id);
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON public.access_codes(code);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON public.admin_audit_log(created_at DESC);
