-- ─── access_codes: habilitar RLS ─────────────────────────────────────────────
-- SECURITY FIX: access_codes era pública (cualquier anon podía leer todos los
-- códigos y usarlos para activar membresías gratis).
--
-- Después de esta migración:
--   anon         → 0 rows (bloqueado)
--   authenticated → puede leer códigos activos (necesario para redimir desde cliente)
--   admin        → acceso total (CRUD)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Admins: acceso total
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'access_codes'
      AND policyname = 'admin_all_access_codes'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "admin_all_access_codes"
        ON public.access_codes
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.is_admin = true
          )
        )
    $pol$;
  END IF;
END $$;

-- Usuarios autenticados: pueden leer códigos activos (para redimir)
-- Nota: esto permite a usuarios autenticados listar códigos activos.
-- Una mejora futura sería usar un RPC SECURITY DEFINER para el lookup
-- en vez de leer la tabla directamente.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'access_codes'
      AND policyname = 'auth_select_active_codes'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "auth_select_active_codes"
        ON public.access_codes
        FOR SELECT
        TO authenticated
        USING (is_active = true)
    $pol$;
  END IF;
END $$;

-- Verificación post-migración:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND tablename = 'access_codes';
-- → rowsecurity debe ser true
