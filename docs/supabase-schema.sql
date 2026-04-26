-- Lifeflow Database Schema for Supabase
-- Growth Players × Polaris Protocol
-- ======================================

-- ✅ PROFILES (extend auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Avatar
  nombre TEXT NOT NULL,
  avatar_url TEXT,
  avatar_descripcion TEXT,
  objetivo_90_dias TEXT NOT NULL,

  -- Tracking
  streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'soberano', 'maestro')),
  pilar_mas_debil TEXT,

  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ✅ POLARIS PROFILES (Psychographic)
CREATE TABLE IF NOT EXISTS polaris_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Psychographic quadrant
  dolor TEXT NOT NULL,
  deseo TEXT NOT NULL,
  patron TEXT NOT NULL,
  objecion TEXT NOT NULL,

  -- Metadata
  version INTEGER DEFAULT 1,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, version)
);

-- ✅ SOVEREIGNTY WHEEL
CREATE TABLE IF NOT EXISTS sovereignty_wheel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- 8 Pillars (0-10 scale)
  fe NUMERIC(3,1) DEFAULT 5,
  finanzas NUMERIC(3,1) DEFAULT 5,
  salud NUMERIC(3,1) DEFAULT 5,
  familia NUMERIC(3,1) DEFAULT 5,
  mente NUMERIC(3,1) DEFAULT 5,
  negocio NUMERIC(3,1) DEFAULT 5,
  impacto NUMERIC(3,1) DEFAULT 5,
  legado NUMERIC(3,1) DEFAULT 5,

  -- Metadata
  actualizado_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ✅ JOURNAL ENTRIES (Daily Rituals)
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Date
  fecha DATE NOT NULL,

  -- Gratitude (3x)
  gratitud_1 TEXT,
  gratitud_2 TEXT,
  gratitud_3 TEXT,

  -- Victories & Challenges
  victorias TEXT[] DEFAULT ARRAY[]::TEXT[],
  retos TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Intention for tomorrow
  intencion TEXT,

  -- Status
  completado BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, fecha)
);

-- ✅ BIOMETRIC DATA (Whoop, Oura, Apple Health)
CREATE TABLE IF NOT EXISTS biometric_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Date
  fecha DATE NOT NULL,

  -- HRV & Recovery
  hrv NUMERIC(6,2),
  resting_hr INTEGER,
  sleep_score NUMERIC(3,1),
  recovery_score NUMERIC(3,1),

  -- Source
  source TEXT CHECK (source IN ('whoop', 'oura', 'apple_health')),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, fecha, source)
);

-- ✅ COMMUNITY SECTORS
CREATE TABLE IF NOT EXISTS community_sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  nombre TEXT NOT NULL,
  descripcion TEXT,
  slug TEXT UNIQUE,

  -- Visual
  icono TEXT,
  color HEX,

  -- Status
  activo BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ✅ SECTOR MEMBERS (M2M)
CREATE TABLE IF NOT EXISTS sector_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id UUID NOT NULL REFERENCES community_sectors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Role
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'leader')),

  -- Engagement
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_active TIMESTAMP WITH TIME ZONE,

  UNIQUE(sector_id, user_id)
);

-- ✅ SECTOR POSTS
CREATE TABLE IF NOT EXISTS sector_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id UUID NOT NULL REFERENCES community_sectors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Content
  titulo TEXT,
  contenido TEXT NOT NULL,
  media_urls TEXT[],

  -- Engagement
  likes INTEGER DEFAULT 0,
  comentarios INTEGER DEFAULT 0,

  -- Moderation
  pinned BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ✅ SECTOR MISSIONS (Challenges)
CREATE TABLE IF NOT EXISTS sector_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id UUID NOT NULL REFERENCES community_sectors(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,

  -- Content
  titulo TEXT NOT NULL,
  descripcion TEXT,
  objetivo TEXT,

  -- Timing
  fecha_inicio DATE,
  fecha_fin DATE,

  -- Engagement
  participantes INTEGER DEFAULT 0,
  completados INTEGER DEFAULT 0,

  -- Status
  activa BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ✅ AI SESSIONS (Mentor Polaris conversations)
CREATE TABLE IF NOT EXISTS ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Conversation
  messages JSONB[] DEFAULT ARRAY[]::JSONB[],

  -- Upgrade tracking
  mostrar_upgrade BOOLEAN DEFAULT FALSE,
  upgrade_shown_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- ✅ Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE polaris_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sovereignty_wheel ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_sessions ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- POLARIS PROFILES
CREATE POLICY "Users can read their polaris profile"
  ON polaris_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their polaris profile"
  ON polaris_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their polaris profile"
  ON polaris_profiles FOR UPDATE
  USING (user_id = auth.uid());

-- SOVEREIGNTY WHEEL
CREATE POLICY "Users can read their wheel"
  ON sovereignty_wheel FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their wheel"
  ON sovereignty_wheel FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their wheel"
  ON sovereignty_wheel FOR UPDATE
  USING (user_id = auth.uid());

-- JOURNAL ENTRIES
CREATE POLICY "Users can read their journal"
  ON journal_entries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert journal entries"
  ON journal_entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their journal"
  ON journal_entries FOR UPDATE
  USING (user_id = auth.uid());

-- BIOMETRIC DATA
CREATE POLICY "Users can read their biometrics"
  ON biometric_data FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert biometric data"
  ON biometric_data FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- COMMUNITY (public read, authenticated write)
CREATE POLICY "Anyone can read community sectors"
  ON community_sectors FOR SELECT
  USING (TRUE);

CREATE POLICY "Anyone can read posts"
  ON sector_posts FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can insert posts in their sectors"
  ON sector_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- SECTOR MEMBERS
CREATE POLICY "Users can read sector members"
  ON sector_members FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can join sectors"
  ON sector_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- AI SESSIONS
CREATE POLICY "Users can read their ai sessions"
  ON ai_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert ai sessions"
  ON ai_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their ai sessions"
  ON ai_sessions FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================
-- INDEXES (Performance)
-- ============================================

CREATE INDEX idx_journal_entries_user_fecha ON journal_entries(user_id, fecha DESC);
CREATE INDEX idx_biometric_data_user_fecha ON biometric_data(user_id, fecha DESC);
CREATE INDEX idx_sovereignty_wheel_user ON sovereignty_wheel(user_id);
CREATE INDEX idx_polaris_profiles_user ON polaris_profiles(user_id);
CREATE INDEX idx_sector_members_user ON sector_members(user_id);
CREATE INDEX idx_sector_posts_sector ON sector_posts(sector_id);
CREATE INDEX idx_sector_posts_user ON sector_posts(user_id);
CREATE INDEX idx_ai_sessions_user ON ai_sessions(user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_polaris_profiles_updated_at BEFORE UPDATE ON polaris_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_biometric_data_updated_at BEFORE UPDATE ON biometric_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_sessions_updated_at BEFORE UPDATE ON ai_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
