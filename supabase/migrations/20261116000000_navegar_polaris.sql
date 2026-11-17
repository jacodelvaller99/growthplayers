-- Navegar Polaris — video-guías de la app (centro de ayuda), en el bucket PRIVADO `navegar`.
--
-- Rutas:  <rol>/catalogo.json   y   <rol>/<ID>/{video.mp4, paso-N.jpg}     con rol ∈ {cliente, admin}
-- Quién lee qué lo decide ESTA política, no la app:
--   · cliente/…  → cualquier usuario con sesión.
--   · admin/…    → solo profiles.is_admin o profiles.is_mentor.
-- Escribir: solo profiles.is_admin (publicar o reemplazar guías). scripts/subir-navegar.mjs usa la service role.
-- Idempotente: se puede correr dos veces en el SQL Editor.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('navegar', 'navegar', false, 52428800, ARRAY['video/mp4', 'image/jpeg', 'application/json'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "navegar_cliente_select" ON storage.objects;
CREATE POLICY "navegar_cliente_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'navegar'
    AND (storage.foldername(name))[1] = 'cliente'
  );

DROP POLICY IF EXISTS "navegar_admin_select" ON storage.objects;
CREATE POLICY "navegar_admin_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'navegar'
    AND (storage.foldername(name))[1] = 'admin'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND (p.is_admin = true OR p.is_mentor = true)
    )
  );

DROP POLICY IF EXISTS "navegar_admin_insert" ON storage.objects;
CREATE POLICY "navegar_admin_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'navegar'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "navegar_admin_update" ON storage.objects;
CREATE POLICY "navegar_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'navegar'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.is_admin = true)
  );
