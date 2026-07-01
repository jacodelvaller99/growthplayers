-- ─────────────────────────────────────────────────────────────────────────────
-- Fix (mismo root cause que 20260625000000): el flujo de Membresías tampoco podía
-- reflejar el tier en el perfil del usuario.
--
-- Causa: activateMembership/cancelMembership/changeTier (vía syncTier) y
-- extendMembership hacen UPDATE directo con el cliente anon a profiles Y
-- user_profiles de OTRO usuario. profiles/user_profiles tienen RLS de UPDATE
-- self-only (+ admin-READ), y el trigger prevent_tier_escalation bloquea
-- subscription_tier desde 'authenticated'. Para otro usuario → 0 filas, sin error
-- → la MEMBRESÍA se graba en user_memberships (source of truth, sí tiene RLS
-- admin), pero el MIRROR del tier/expiración al perfil falla en silencio →
-- el usuario podía tener membresía activa y su app seguir viéndose 'free'.
--
-- Fix: RPC SECURITY DEFINER admin_sync_tier — mismo patrón que admin_set_user_role
-- (20260624) y admin_update_user_profile (20260625): verifica al admin llamante y
-- espeja subscription_tier + subscription_expires_at a AMBAS tablas. Al correr como
-- rol dueño (no 'authenticated'), el trigger anti-escalada la permite por diseño;
-- el gate real es el check de is_admin en la función.
--
-- Idempotente. Aplicar en el SQL Editor del dashboard.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_sync_tier(
  target_user  uuid,
  new_tier     text    DEFAULT NULL,   -- NULL = no cambiar tier (solo expiración)
  set_expires  boolean DEFAULT false,  -- true = escribir subscription_expires_at (incluso a NULL)
  new_expires_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller uuid := auth.uid();
  caller_admin boolean;
BEGIN
  SELECT COALESCE(is_admin, false) INTO caller_admin
    FROM public.profiles WHERE id = caller;

  IF NOT COALESCE(caller_admin, false) THEN
    RAISE EXCEPTION 'Requiere acceso de administrador';
  END IF;

  -- profiles (id = auth.uid() en el modelo base)
  UPDATE public.profiles SET
    subscription_tier       = COALESCE(new_tier, subscription_tier),
    subscription_expires_at = CASE WHEN set_expires THEN new_expires_at ELSE subscription_expires_at END,
    updated_at              = now()
  WHERE id = target_user;

  -- user_profiles (mirror para lecturas rápidas del app)
  UPDATE public.user_profiles SET
    subscription_tier       = COALESCE(new_tier, subscription_tier),
    subscription_expires_at = CASE WHEN set_expires THEN new_expires_at ELSE subscription_expires_at END,
    updated_at              = now()
  WHERE user_id = target_user;

  -- No exigimos FOUND: puede existir solo una de las dos filas en instalaciones
  -- antiguas; el objetivo es dejar ambas consistentes cuando existan.
END;
$$;

REVOKE ALL ON FUNCTION public.admin_sync_tier(uuid, text, boolean, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_sync_tier(uuid, text, boolean, timestamptz) TO authenticated;
