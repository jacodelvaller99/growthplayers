-- ─────────────────────────────────────────────────────────────────────────────
-- Panel de roles: SuperAdmin / Admin / Cliente Premium / Cliente Inicial.
--
-- Un control ÚNICO de acceso por usuario (modelo de 4 niveles). Solo un SuperAdmin
-- puede asignar Admin/SuperAdmin; un Admin puede mover clientes (premium/inicial).
--
-- SEGURIDAD: el cambio de privilegio NO se hace desde el cliente (el trigger
-- prevent_privilege_escalation_profiles bloquea is_admin/subscription_tier cuando
-- current_user='authenticated'). Esta RPC es SECURITY DEFINER → corre como el rol
-- dueño (no 'authenticated'), así el trigger la PERMITE (diseño explícito de
-- 20260602000000), pero la propia RPC verifica los privilegios del LLAMANTE vía
-- auth.uid() antes de tocar nada. No se modifica el trigger.
--
-- Idempotente. Aplicar en el SQL Editor del dashboard.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Columna de superadmin.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_superadmin boolean NOT NULL DEFAULT false;

-- 2. Bootstrap: los admins actuales quedan como SuperAdmin (son full-access de
--    confianza). El dueño puede luego degradar a otros desde el panel. Sin esto
--    nadie sería superadmin y nadie podría asignar roles de admin.
UPDATE public.profiles SET is_superadmin = true WHERE is_admin = true;

-- 3. RPC: asignar rol. Verifica al llamante, aplica flags + tier + membresía.
CREATE OR REPLACE FUNCTION public.admin_set_user_role(target_user uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller uuid := auth.uid();
  caller_super boolean;
  caller_admin boolean;
BEGIN
  SELECT COALESCE(is_superadmin, false), COALESCE(is_admin, false)
    INTO caller_super, caller_admin
    FROM public.profiles WHERE id = caller;

  -- No puedes cambiar TU PROPIO rol (evita auto-escalada y auto-lockout).
  IF target_user = caller THEN
    RAISE EXCEPTION 'No puedes cambiar tu propio rol';
  END IF;

  -- Gating por privilegio del llamante.
  IF new_role IN ('admin', 'superadmin') THEN
    IF NOT COALESCE(caller_super, false) THEN
      RAISE EXCEPTION 'Solo un SuperAdmin puede asignar roles de administrador';
    END IF;
  ELSIF new_role IN ('premium', 'inicial') THEN
    IF NOT COALESCE(caller_admin, false) THEN
      RAISE EXCEPTION 'Requiere acceso de administrador';
    END IF;
  ELSE
    RAISE EXCEPTION 'Rol inválido: %', new_role;
  END IF;

  -- Aplicar.
  IF new_role = 'superadmin' THEN
    UPDATE public.profiles SET is_admin = true, is_superadmin = true WHERE id = target_user;

  ELSIF new_role = 'admin' THEN
    UPDATE public.profiles SET is_admin = true, is_superadmin = false WHERE id = target_user;

  ELSIF new_role = 'premium' THEN
    UPDATE public.profiles
      SET is_admin = false, is_superadmin = false, subscription_tier = 'premium', updated_at = now()
      WHERE id = target_user;
    UPDATE public.user_profiles
      SET subscription_tier = 'premium', updated_at = now()
      WHERE user_id = target_user;
    -- Membresía activa premium (fuente de verdad del tier en admin/dossier).
    UPDATE public.user_memberships SET status = 'superseded'
      WHERE user_id = target_user AND status = 'active';
    INSERT INTO public.user_memberships (user_id, product, status, activated_by, activated_at, created_by)
      VALUES (target_user, 'premium', 'active', 'role_panel', now(), caller);

  ELSIF new_role = 'inicial' THEN
    UPDATE public.profiles
      SET is_admin = false, is_superadmin = false, subscription_tier = 'free', updated_at = now()
      WHERE id = target_user;
    UPDATE public.user_profiles
      SET subscription_tier = 'free', updated_at = now()
      WHERE user_id = target_user;
    UPDATE public.user_memberships SET status = 'cancelled'
      WHERE user_id = target_user AND status = 'active';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, text) TO authenticated;

-- ── Nota ──────────────────────────────────────────────────────────────────────
-- El nivel de un usuario se DERIVA: is_superadmin → SuperAdmin; is_admin → Admin;
-- si tiene membresía activa de pago → Cliente Premium; si no → Cliente Inicial.
-- delete-account no necesita cambios (is_superadmin vive en profiles, ya cubierta).
