-- ─────────────────────────────────────────────────────────────────────────────
-- Admin read-all RLS para profiles + user_profiles.
--
-- PROBLEMA (reproducido en prod): /admin/usuarios listaba SOLO 1 usuario (el
-- propio admin) y las membresías ajenas salían como "Usuario" anónimo, pese a
-- existir 9 membresías activas. Causa: `profiles` y `user_profiles` tienen RLS
-- solo-propia-fila (id = auth.uid()), sin policy admin-read; y la vista
-- `user_progress` es security_invoker=true → corre con los permisos del que
-- consulta → un admin solo veía su propia fila. El admin no podía dar
-- seguimiento a nadie más.
--
-- FIX: una función SECURITY DEFINER que lee profiles.is_admin SIN disparar RLS
-- (evita la recursión clásica de una policy SOBRE profiles que vuelve a consultar
-- profiles), + policies admin-read que se SUMAN (OR permisivo) a las de
-- propia-fila. Un no-admin sigue viendo solo lo suyo; un admin ve todo.
--
-- Por qué no recursa: la función es SECURITY DEFINER y, aplicada desde el SQL
-- Editor del dashboard, queda owned por un rol privilegiado (postgres) que
-- bypassa RLS al leer profiles dentro de la función → la policy no se re-evalúa.
--
-- Idempotente. Aplicar en el SQL Editor del dashboard (no hay service-role local).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Helper SECURITY DEFINER — ¿el usuario actual es admin? ──────────────────
-- STABLE: el valor es constante dentro de una misma query (depende solo de
-- auth.uid()), así el planner lo evalúa una vez, no por fila.
-- search_path fijo: evita secuestro de resolución de nombres.
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

-- Solo usuarios autenticados pueden invocarla (no el rol anon/public).
REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

-- ── 2. Policy admin-read en profiles (se SUMA a la de "read own") ─────────────
DROP POLICY IF EXISTS "admin_read_all_profiles" ON public.profiles;
CREATE POLICY "admin_read_all_profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_current_user_admin());

-- ── 3. Policy admin-read en user_profiles (drives la lista + user_progress) ───
-- user_progress = FROM user_profiles LEFT JOIN … → al abrir la lectura de
-- user_profiles a admins, la vista (security_invoker) devuelve TODAS las filas.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "admin_read_all_user_profiles" ON public.user_profiles';
    EXECUTE 'CREATE POLICY "admin_read_all_user_profiles"
               ON public.user_profiles FOR SELECT TO authenticated
               USING (public.is_current_user_admin())';
  END IF;
END
$$;

-- ── Nota de seguimiento ───────────────────────────────────────────────────────
-- Esto desbloquea la LISTA de usuarios + resolución de nombres. El DOSSIER por
-- cliente (app/admin/usuarios/[id]) lee tablas de datos (check_ins, mentor_*,
-- daily_checkins, wearable_*, etc.) que también son solo-propia-fila: para que el
-- admin vea los DATOS de otros clientes, esas tablas necesitan la misma policy
-- admin-read usando public.is_current_user_admin(). Se hará en una migración
-- aparte (superficie grande, revisión cuidadosa) una vez validado este paso.
