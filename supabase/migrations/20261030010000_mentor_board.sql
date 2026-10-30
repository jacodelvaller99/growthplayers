-- ════════════════════════════════════════════════════════════════════════════
-- Tablero del mentor (patrón LifeFlow) + panel completo solo para quien lo pide
-- ════════════════════════════════════════════════════════════════════════════
-- 1. profiles.full_admin_panel — decide QUÉ PANEL se pinta, no qué datos se
--    pueden leer (eso sigue siendo is_admin/is_mentor + RLS). Sin el flag, un
--    admin ve la misma vista simple de mentorías que un mentor. Decisión del
--    dueño 2026-10-30: solo Juan Jacobo conserva el panel completo.
-- 2. mentor_board() — una fila por cliente con lo justo para ubicarlo en su
--    etapa (nuevo · sin check-in · por revisar · en plan). SECURITY DEFINER
--    para no abrirle daily_checkins (dato de salud) a los mentores: devuelve
--    solo la FECHA del último check-in, nunca su contenido. Admin → todos los
--    clientes; mentor → solo los asignados a él.
--
-- Idempotente. Aplicar en el SQL Editor del dashboard.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_admin_panel boolean NOT NULL DEFAULT false;

-- El flag es de interfaz, pero igual nadie se lo pone solo: solo un superadmin
-- lo cambia (mismo criterio que admin_set_user_role).
CREATE OR REPLACE FUNCTION public.guard_full_admin_panel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.full_admin_panel IS DISTINCT FROM OLD.full_admin_panel
     AND auth.uid() IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_superadmin = true) THEN
    NEW.full_admin_panel := OLD.full_admin_panel;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_full_admin_panel ON public.profiles;
CREATE TRIGGER trg_guard_full_admin_panel
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_full_admin_panel();

UPDATE public.profiles p SET full_admin_panel = true
FROM public.user_profiles up
WHERE up.user_id = p.id AND up.name = 'Juan Jacobo' AND p.is_superadmin = true;

CREATE OR REPLACE FUNCTION public.mentor_board()
RETURNS TABLE (
  user_id uuid,
  name text,
  mentor_id uuid,
  joined_at timestamptz,
  assigned_at timestamptz,
  last_checkin_date date,
  sessions_count integer,
  last_session_date date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT COALESCE(is_admin, false) AS is_admin, COALESCE(is_mentor, false) AS is_mentor
    FROM public.profiles WHERE id = auth.uid()
  )
  SELECT
    up.user_id,
    up.name,
    a.mentor_id,
    up.created_at,
    a.assigned_at,
    (SELECT max(dc.date) FROM public.daily_checkins dc WHERE dc.user_id = up.user_id),
    (SELECT count(*)::int FROM public.mentorship_sessions ms WHERE ms.user_id = up.user_id),
    (SELECT max(ms.session_date) FROM public.mentorship_sessions ms WHERE ms.user_id = up.user_id)
  FROM public.user_profiles up
  -- LEFT: hay clientes sin fila en profiles (altas viejas); igual son clientes.
  LEFT JOIN public.profiles p ON p.id = up.user_id
  LEFT JOIN public.mentor_assignments a ON a.user_id = up.user_id
  CROSS JOIN me
  WHERE NOT COALESCE(p.is_admin, false)
    AND NOT COALESCE(p.is_mentor, false)
    AND (me.is_admin OR (me.is_mentor AND a.mentor_id = auth.uid()));
$$;

REVOKE ALL ON FUNCTION public.mentor_board() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mentor_board() TO authenticated;
