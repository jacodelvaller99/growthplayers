-- ─────────────────────────────────────────────────────────────────────────────
-- Mentor Assignments — asignación organizativa mentor↔cliente (Focus Desk)
--
-- Un cliente tiene A LO SUMO un mentor (PK user_id). Mentores = admins
-- actuales (profiles.is_admin) — sin rol nuevo. La asignación NO cambia
-- visibilidad: todos los admins siguen viendo todo; solo organiza las vistas
-- del escritorio (lente MIS CLIENTES / EQUIPO).
--
-- Tabla nueva y NO columna en profiles: el UPDATE de profiles es self-only por
-- RLS (un admin editando la fila de otro matchea 0 filas en silencio — el bug
-- que obligó a crear las RPC admin_sync_tier/admin_update_user_profile) y
-- profiles está bajo el trigger anti-escalación
-- (20260602000000_security_hardening_p0.sql). Ampliar ahí exigiría otra RPC
-- SECURITY DEFINER; aquí basta el patrón admin-only de
-- 20260616000000_mentor_execution.sql.
--
-- Des-asignar = DELETE de la fila (sin estado null). Borrar la cuenta de un
-- mentor deja a sus clientes "sin mentor" vía ON DELETE CASCADE.
--
-- Idempotente. Aplicar vía SQL Editor del dashboard (no hay service-role
-- local). Sin esta migración la app degrada: lecturas → lista vacía (todo
-- "SIN MENTOR"), escritura → mensaje explícito de RLS en la UI.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.mentor_assignments (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentor_assignments_mentor
  ON public.mentor_assignments(mentor_id);

ALTER TABLE public.mentor_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "massign_admin_only" ON public.mentor_assignments;
CREATE POLICY "massign_admin_only" ON public.mentor_assignments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_assignments TO authenticated;
