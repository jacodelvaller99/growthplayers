-- ─────────────────────────────────────────────────────────────────────────────
-- Admin read-all — tablas del DOSSIER por cliente (completa "ver todos los perfiles").
--
-- La migración 20260622000000 abrió la LISTA (profiles + user_profiles). Esta abre
-- los DATOS: 13 tablas por-usuario que seguían solo-propia-fila y bloqueaban al
-- admin, así el dossier (app/admin/usuarios/[id]) muestra la información completa
-- de CUALQUIER cliente, no solo la del propio admin.
--
-- Auditoría previa: 14 tablas (bienestar, biométricos, memoria, ejecución, intel,
-- membresías) YA tenían admin-read → no se tocan. `direct_messages` se EXCLUYE a
-- propósito (privacidad de pares: el coach ve metadata, nunca el contenido de DMs).
--
-- Patrón: una policy admin-read PERMISIVA que se SUMA (OR) a la de propia-fila, vía
-- la función SECURITY DEFINER `is_current_user_admin()` (sin recursión). Un no-admin
-- sigue viendo solo lo suyo; un admin ve todo. La autorización real la imponen RLS
-- (servidor) + el guard de app/admin/_layout.tsx.
--
-- Idempotente y autosuficiente (re-declara la función por si se aplica sola).
-- Aplicar en el SQL Editor del dashboard.
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper (idempotente — igual a 20260622000000; aquí por autosuficiencia).
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
REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

-- Añade admin-read SELECT a cada tabla del dossier que exista (solo si está presente).
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'daily_checkins',
    'lesson_tasks',
    'completed_lessons',
    'mentor_messages',
    'mentor_memories',
    'mentor_threads',
    'wearable_timeseries',
    'habits',
    'habit_logs',
    'fasting_sessions',
    'body_measurements',
    'nutrition_profiles',
    'supplement_stacks'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'admin_read_all_' || t, t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_current_user_admin())',
        'admin_read_all_' || t, t
      );
    END IF;
  END LOOP;
END
$$;

-- ── Nota ──────────────────────────────────────────────────────────────────────
-- Tras aplicar 20260622000000 (lista) + esta (datos), un admin ve la información
-- completa de todos los perfiles. `direct_messages` queda privado por diseño.
