-- ============================================================================
-- SECURITY HARDENING — P0/P1 del War Room de Lanzamiento (2026-06-02)
-- Cierra: escalación a admin, auto-grant de tier/membresía, access_codes abierto,
-- vistas que evaden RLS, y tablas B2B sin RLS.
--
-- Aplicar en prod: `supabase db push` (o vía dashboard SQL).
-- Idempotente y defensivo (IF EXISTS / DROP IF EXISTS).
-- ============================================================================

-- ── SEC-P0-1 & P0-4 — Bloquear self-set de is_admin / subscription_tier ──────
-- Un trigger BEFORE UPDATE impide que una sesión `authenticated` (cliente)
-- cambie columnas de privilegio. service_role (Edge Functions) y funciones
-- SECURITY DEFINER (RPC admin / webhook RevenueCat) NO son 'authenticated' → permitidas.

CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user = 'authenticated' THEN
    IF (NEW.is_admin IS DISTINCT FROM OLD.is_admin) THEN
      RAISE EXCEPTION 'No autorizado: is_admin no puede modificarse desde el cliente';
    END IF;
    IF (to_jsonb(NEW) ? 'subscription_tier')
       AND (NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier) THEN
      RAISE EXCEPTION 'No autorizado: subscription_tier no puede modificarse desde el cliente';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_priv_escalation_profiles ON public.profiles;
CREATE TRIGGER trg_prevent_priv_escalation_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_privilege_escalation_profiles();

-- user_profiles tiene subscription_tier (no is_admin) — proteger el tier ahí también.
CREATE OR REPLACE FUNCTION public.prevent_tier_escalation_user_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user = 'authenticated'
     AND (NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier) THEN
    RAISE EXCEPTION 'No autorizado: subscription_tier no puede modificarse desde el cliente';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    DROP TRIGGER IF EXISTS trg_prevent_tier_escalation_user_profiles ON public.user_profiles;
    CREATE TRIGGER trg_prevent_tier_escalation_user_profiles
      BEFORE UPDATE ON public.user_profiles
      FOR EACH ROW EXECUTE FUNCTION public.prevent_tier_escalation_user_profiles();
  END IF;
END $$;

-- La política que existía SOLO para permitir self-set de tier ya no aplica.
DROP POLICY IF EXISTS "user_update_own_profile_tier" ON public.profiles;
-- (La política base profiles_update_own se mantiene: permite editar nombre/avatar;
--  el trigger protege las columnas de privilegio.)

-- ── SEC-P0-3 — No auto-grant de membresía ────────────────────────────────────
DROP POLICY IF EXISTS "user_insert_own_memberships" ON public.user_memberships;
-- Las membresías se otorgan solo vía RPC SECURITY DEFINER / webhook (service_role).

-- ── SEC-P0-5 — access_codes: cerrar R/W abierto ──────────────────────────────
DROP POLICY IF EXISTS "authenticated_select_access_codes" ON public.access_codes;
DROP POLICY IF EXISTS "authenticated_update_access_codes_uses" ON public.access_codes;
-- La redención usa la RPC atómica public.redeem_access_code(text) (SECURITY DEFINER,
-- ya concedida a anon/authenticated) → no requiere acceso directo a la tabla.

-- Solo admins pueden leer códigos (para el panel admin).
DROP POLICY IF EXISTS "admin_select_access_codes" ON public.access_codes;
CREATE POLICY "admin_select_access_codes"
  ON public.access_codes FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ── P1 — Vistas que evaden RLS → security_invoker ────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views
             WHERE table_schema='public' AND table_name='wearable_baseline') THEN
    EXECUTE 'ALTER VIEW public.wearable_baseline SET (security_invoker = true)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.views
             WHERE table_schema='public' AND table_name='user_progress') THEN
    EXECUTE 'ALTER VIEW public.user_progress SET (security_invoker = true)';
  END IF;
END $$;

-- ── P1 — Tablas B2B sin RLS → habilitar y bloquear por defecto ───────────────
-- Features B2B aún no expuestas al usuario; default deny (solo service_role/admin).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='b2b_organizations') THEN
    EXECUTE 'ALTER TABLE public.b2b_organizations ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "b2b_admin_read" ON public.b2b_organizations';
    EXECUTE 'CREATE POLICY "b2b_admin_read" ON public.b2b_organizations FOR SELECT TO authenticated
             USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='org_members') THEN
    EXECUTE 'ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "org_members_own" ON public.org_members';
    -- user_id si existe; si no, admin-only.
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='org_members' AND column_name='user_id') THEN
      EXECUTE 'CREATE POLICY "org_members_own" ON public.org_members FOR SELECT TO authenticated
               USING (user_id = auth.uid()
                      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))';
    ELSE
      EXECUTE 'CREATE POLICY "org_members_own" ON public.org_members FOR SELECT TO authenticated
               USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))';
    END IF;
  END IF;
END $$;

-- ── P1 — search_mentor_memories: quitar EXECUTE público ──────────────────────
-- (defensa para SEC-P0-2; la función de búsqueda no debe ser invocable por anon)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'search_mentor_memories') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.search_mentor_memories FROM PUBLIC, anon';
  END IF;
END $$;
