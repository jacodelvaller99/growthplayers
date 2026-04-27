-- ============================================================
--  LIFEFLOW · POLARIS GROWTH INSTITUTE
--  Supabase Schema — corre este archivo en el SQL Editor
--  de tu proyecto en supabase.com
-- ============================================================

-- ─── Habilitar extensiones ────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
--  TABLAS
-- ============================================================

-- ─── profiles ────────────────────────────────────────────────────────────────
-- Una fila por usuario (anónimo o autenticado).
-- Se crea automáticamente la primera vez que se hace onboarding.
CREATE TABLE IF NOT EXISTS profiles (
  id                    UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  TEXT        NOT NULL DEFAULT 'Juan Carlos',
  role                  TEXT        NOT NULL DEFAULT 'Empresario',
  onboarding_completed  BOOLEAN     NOT NULL DEFAULT FALSE,
  protocol_start_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active_program_id     TEXT        NOT NULL DEFAULT 'protocolo-soberano',
  active_module_id      TEXT        NOT NULL DEFAULT 'mercader-tiempo',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── north_stars ─────────────────────────────────────────────────────────────
-- Norte del operador: propósito, identidad, no negociables, recordatorio.
-- UNIQUE(user_id) → una sola fila por usuario, siempre upsert.
CREATE TABLE IF NOT EXISTS north_stars (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  purpose           TEXT        NOT NULL DEFAULT '',
  identity          TEXT        NOT NULL DEFAULT '',
  non_negotiables   TEXT[]      NOT NULL DEFAULT '{}',
  daily_reminder    TEXT        NOT NULL DEFAULT '',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ─── check_ins ───────────────────────────────────────────────────────────────
-- Un check-in por día por usuario.
-- UNIQUE(user_id, date) garantiza idempotencia (upsert seguro).
CREATE TABLE IF NOT EXISTS check_ins (
  id           UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID     NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date         DATE     NOT NULL,
  energy       SMALLINT NOT NULL CHECK (energy  BETWEEN 1 AND 10),
  clarity      SMALLINT NOT NULL CHECK (clarity BETWEEN 1 AND 10),
  stress       SMALLINT NOT NULL CHECK (stress  BETWEEN 1 AND 10),
  sleep        SMALLINT NOT NULL CHECK (sleep   BETWEEN 1 AND 10),
  system_need  TEXT     NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ─── mentor_messages ─────────────────────────────────────────────────────────
-- Historial completo de mensajes entre el operador y el Mentor Polaris IA.
CREATE TABLE IF NOT EXISTS mentor_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL CHECK (role IN ('mentor', 'user')),
  text        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_check_ins_user_date
  ON check_ins(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_mentor_messages_user_created
  ON mentor_messages(user_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_north_stars_user
  ON north_stars(user_id);

-- ============================================================
--  FUNCIÓN TRIGGER → updated_at automático
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS trg_profiles_updated_at   ON profiles;
DROP TRIGGER IF EXISTS trg_north_stars_updated_at ON north_stars;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_north_stars_updated_at
  BEFORE UPDATE ON north_stars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
--  ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE north_stars     ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins       ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_messages ENABLE ROW LEVEL SECURITY;

-- ─── profiles policies ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_delete_own" ON profiles
  FOR DELETE USING (auth.uid() = id);

-- ─── north_stars policies ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "north_stars_all_own" ON north_stars;

CREATE POLICY "north_stars_all_own" ON north_stars
  FOR ALL USING (auth.uid() = user_id);

-- ─── check_ins policies ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "check_ins_all_own" ON check_ins;

CREATE POLICY "check_ins_all_own" ON check_ins
  FOR ALL USING (auth.uid() = user_id);

-- ─── mentor_messages policies ────────────────────────────────────────────────
DROP POLICY IF EXISTS "mentor_messages_all_own" ON mentor_messages;

CREATE POLICY "mentor_messages_all_own" ON mentor_messages
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
--  VERIFICACIÓN FINAL
-- ============================================================
-- Ejecuta esto para confirmar que las tablas existen:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;
