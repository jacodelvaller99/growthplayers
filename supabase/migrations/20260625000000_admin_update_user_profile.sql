-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: el admin no podía guardar nombre/etiqueta de OTRO usuario en el dossier.
--
-- Causa: `user_profiles` tenía RLS de UPDATE SOLO para el dueño
--   ("Users update own profile" USING auth.uid() = user_id) + admin-READ, pero
--   NINGUNA policy de admin-UPDATE. `updateUserProfile` hacía un UPDATE directo
--   con el cliente anon → matcheaba 0 filas para otro usuario → PostgREST NO
--   devuelve error (0 rows ≠ error) → guardado silencioso a la nada.
--
-- Fix (mismo patrón que admin_set_user_role, 20260624000000): RPC SECURITY
-- DEFINER que verifica que el LLAMANTE es admin vía auth.uid() y actualiza SOLO
-- los campos de presentación (name + tier badge). NO toca subscription_tier —
-- ese lo gobiernan Membresías / panel de roles. Al correr como rol dueño (no
-- 'authenticated'), el trigger prevent_tier_escalation_user_profiles no aplica,
-- pero como no tocamos subscription_tier tampoco habría conflicto.
--
-- No se añade policy de UPDATE amplia (superficie mínima). No se modifica el trigger.
-- Idempotente. Aplicar en el SQL Editor del dashboard.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
  target_user uuid,
  new_name text DEFAULT NULL,
  new_tier text DEFAULT NULL
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

  -- Solo campos de presentación. Vacío/NULL → conserva el valor actual
  -- (evita blanquear el perfil por accidente).
  UPDATE public.user_profiles
    SET name       = COALESCE(NULLIF(btrim(new_name), ''), name),
        tier       = COALESCE(NULLIF(btrim(new_tier), ''), tier),
        updated_at = now()
    WHERE user_id = target_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado: %', target_user;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_profile(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_user_profile(uuid, text, text) TO authenticated;
