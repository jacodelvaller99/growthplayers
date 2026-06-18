-- =============================================================================
-- Internist PHI — almacenamiento seguro de exámenes médicos
-- =============================================================================
-- Cluster B (asesor internista educativo). Permite al usuario subir exámenes
-- médicos (PDF/imagen) y registrar marcadores parseados (opcional) para que
-- el internista educativo pueda razonar sobre ellos.
--
-- LÍNEAS ROJAS — codificadas en RLS:
--   1. PHI es del USUARIO. Solo él puede leer/escribir sus propios exámenes y
--      lab values por defecto.
--   2. El admin solo ve metadatos del archivo (no su contenido) Y SOLO SI el
--      usuario consintió explícitamente `share_exams_with_coach` en
--      `profiles.consents`. Sin consent → cero acceso admin.
--   3. El archivo NUNCA se sirve por URL pública: el bucket es privado y se
--      accede únicamente con signed URLs emitidas tras pasar RLS.
--   4. `ON DELETE CASCADE` desde profiles y delete-account purga este PHI.
-- =============================================================================

-- ─── Tabla: medical_exams ────────────────────────────────────────────────────
-- Metadatos del examen (no el contenido). El archivo vive en Storage.

CREATE TABLE IF NOT EXISTS medical_exams (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,           -- ruta en el bucket privado
  file_name    TEXT NOT NULL,           -- nombre original (lo ve el usuario)
  file_size    INTEGER,                 -- bytes (para UX, no validación)
  mime_type    TEXT,                    -- application/pdf, image/jpeg, image/png
  exam_type    TEXT,                    -- 'blood_panel' | 'imaging' | 'other' (libre)
  exam_date    DATE,                    -- fecha del examen (no de subida)
  notes        TEXT,                    -- nota personal del usuario
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS medical_exams_user_id_idx
  ON medical_exams (user_id);
CREATE INDEX IF NOT EXISTS medical_exams_user_date_idx
  ON medical_exams (user_id, exam_date DESC);

ALTER TABLE medical_exams ENABLE ROW LEVEL SECURITY;

-- Owner: lectura/escritura completas.
DROP POLICY IF EXISTS "medical_exams_owner_select" ON medical_exams;
CREATE POLICY "medical_exams_owner_select"
  ON medical_exams FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "medical_exams_owner_insert" ON medical_exams;
CREATE POLICY "medical_exams_owner_insert"
  ON medical_exams FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "medical_exams_owner_update" ON medical_exams;
CREATE POLICY "medical_exams_owner_update"
  ON medical_exams FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "medical_exams_owner_delete" ON medical_exams;
CREATE POLICY "medical_exams_owner_delete"
  ON medical_exams FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- Admin: SOLO METADATOS y SOLO SI el usuario consintió compartir.
-- Lee `profiles.consents->>'share_exams_with_coach'`. Sin la clave o = 'false' = no acceso.
DROP POLICY IF EXISTS "medical_exams_admin_metadata_consented" ON medical_exams;
CREATE POLICY "medical_exams_admin_metadata_consented"
  ON medical_exams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.is_admin = true
    )
    AND EXISTS (
      SELECT 1 FROM profiles po
      WHERE po.id = medical_exams.user_id
        AND COALESCE(po.consents->>'share_exams_with_coach', 'false') = 'true'
    )
  );

-- ─── Tabla: medical_lab_values ───────────────────────────────────────────────
-- Marcadores parseados de un examen (opcional — el usuario puede subir solo el
-- archivo). Cada fila = un marcador con valor en su unidad. La clasificación
-- educativa (low/normal/high) se computa SIEMPRE client-side desde
-- `data/internistKnowledge.ts` para mantener la base de conocimiento como única
-- fuente de verdad y permitir que evolucione sin migración.

CREATE TABLE IF NOT EXISTS medical_lab_values (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id      UUID REFERENCES medical_exams(id) ON DELETE SET NULL,
  marker_key   TEXT NOT NULL,           -- key estable de data/internistKnowledge.ts
  value        NUMERIC NOT NULL,
  unit         TEXT NOT NULL,
  measured_at  DATE,                    -- fecha de la medición
  source       TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'parsed' | 'wearable'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS medical_lab_values_user_marker_date_idx
  ON medical_lab_values (user_id, marker_key, measured_at DESC);

ALTER TABLE medical_lab_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "medical_lab_values_owner_all" ON medical_lab_values;
CREATE POLICY "medical_lab_values_owner_all"
  ON medical_lab_values FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Admin: mismo gate de consentimiento que medical_exams.
DROP POLICY IF EXISTS "medical_lab_values_admin_consented" ON medical_lab_values;
CREATE POLICY "medical_lab_values_admin_consented"
  ON medical_lab_values FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.is_admin = true
    )
    AND EXISTS (
      SELECT 1 FROM profiles po
      WHERE po.id = medical_lab_values.user_id
        AND COALESCE(po.consents->>'share_exams_with_coach', 'false') = 'true'
    )
  );

-- ─── Tabla: internist_sessions ────────────────────────────────────────────────
-- Cada turno de conversación con el internista educativo. Útil para que el
-- usuario reabra una sesión y para auditoría. NO se inyecta a otros sistemas.
-- Owner-only por diseño (admin NO ve estas conversaciones — son sensibles).

CREATE TABLE IF NOT EXISTS internist_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content      TEXT NOT NULL,
  red_flags    JSONB,                   -- snapshot de red-flags detectados (auditoría)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS internist_sessions_user_created_idx
  ON internist_sessions (user_id, created_at DESC);

ALTER TABLE internist_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "internist_sessions_owner_all" ON internist_sessions;
CREATE POLICY "internist_sessions_owner_all"
  ON internist_sessions FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ─── Storage: bucket privado "medical-exams" ─────────────────────────────────
-- Bucket público=false. Se accede solo con signed URLs cortas tras pasar RLS.
-- Si ya existe (idempotente), no falla.

INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-exams', 'medical-exams', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Policy: el usuario puede leer/subir/borrar SOLO objetos cuya primera carpeta
-- del path coincida con su user_id. Convención del cliente:
--   medical-exams/<user_id>/<exam_id>.<ext>
-- Así RLS de Storage refuerza el aislamiento por usuario.

DROP POLICY IF EXISTS "medical_exams_storage_owner_select" ON storage.objects;
CREATE POLICY "medical_exams_storage_owner_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'medical-exams'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "medical_exams_storage_owner_insert" ON storage.objects;
CREATE POLICY "medical_exams_storage_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'medical-exams'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "medical_exams_storage_owner_delete" ON storage.objects;
CREATE POLICY "medical_exams_storage_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'medical-exams'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- Admin Storage: gate consent — SOLO si el usuario aceptó share_exams_with_coach.
-- Acceso de lectura para review, NUNCA INSERT/DELETE en archivos del usuario.
DROP POLICY IF EXISTS "medical_exams_storage_admin_consented" ON storage.objects;
CREATE POLICY "medical_exams_storage_admin_consented"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'medical-exams'
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.is_admin = true
    )
    AND EXISTS (
      SELECT 1 FROM profiles po
      WHERE po.id::text = (storage.foldername(storage.objects.name))[1]
        AND COALESCE(po.consents->>'share_exams_with_coach', 'false') = 'true'
    )
  );

-- =============================================================================
-- Notas para delete-account (defensa en profundidad — ON DELETE CASCADE ya cubre,
-- pero la edge function purga explícitamente):
--   - medical_exams (CASCADE desde auth.users)
--   - medical_lab_values (CASCADE)
--   - internist_sessions (CASCADE)
--   - storage.objects WHERE bucket_id='medical-exams' AND name LIKE '<user_id>/%'
--     (storage NO cascadea automáticamente — la edge function lo borra a mano)
-- =============================================================================
