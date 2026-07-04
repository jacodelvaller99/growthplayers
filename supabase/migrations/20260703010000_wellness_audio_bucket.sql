-- ═══════════════════════════════════════════════════════════════════════════
-- Bucket público "wellness-audio" — camas musicales instrumentales (Suno) para
-- las categorías de meditación. Contenido curado por el equipo, NO subido por
-- usuarios finales (a diferencia de medical-exams, que es PHI privado). Se
-- sirve por URL pública (CDN de Storage) — sin signed URLs, sin RLS de lectura.
--
-- Convención de paths: wellness-audio/meditation/<category>.mp3
--
-- Idempotente. Aplicar en el SQL Editor del dashboard.
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('wellness-audio', 'wellness-audio', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Solo admin gestiona el contenido (subir/reemplazar/borrar pistas). La
-- lectura pública no pasa por RLS (bucket public=true la sirve directo).
DROP POLICY IF EXISTS "wellness_audio_admin_write" ON storage.objects;
CREATE POLICY "wellness_audio_admin_write"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'wellness-audio'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "wellness_audio_admin_update" ON storage.objects;
CREATE POLICY "wellness_audio_admin_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'wellness-audio'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "wellness_audio_admin_delete" ON storage.objects;
CREATE POLICY "wellness_audio_admin_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'wellness-audio'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
