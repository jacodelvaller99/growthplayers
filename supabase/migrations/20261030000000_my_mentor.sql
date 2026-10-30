-- ════════════════════════════════════════════════════════════════════════════
-- my_mentor() — el cliente sabe quién es su mentor
-- ════════════════════════════════════════════════════════════════════════════
-- mentor_assignments es admin-only (+ el mentor lee las suyas): el cliente no
-- podía saber a quién tiene asignado. En vez de abrirle la tabla y el perfil
-- del mentor, una función SECURITY DEFINER que devuelve SOLO lo que la tarjeta
-- "Tu mentor" necesita (id, nombre, avatar, desde cuándo) y SOLO la fila del
-- propio llamante. Un mentor revocado (ya no is_admin ni is_mentor) no sale —
-- mismo criterio que buildDesk (lib/admin/deskLogic.ts).
--
-- Idempotente. Aplicar en el SQL Editor del dashboard (no hay service-role
-- local — ver CLAUDE.md).

CREATE OR REPLACE FUNCTION public.my_mentor()
RETURNS TABLE (mentor_id uuid, name text, avatar_url text, assigned_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.mentor_id, up.name, up.avatar_url, a.assigned_at
  FROM public.mentor_assignments a
  JOIN public.profiles p ON p.id = a.mentor_id AND (p.is_admin = true OR p.is_mentor = true)
  LEFT JOIN public.user_profiles up ON up.user_id = a.mentor_id
  WHERE a.user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.my_mentor() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_mentor() TO authenticated;
