-- ═══════════════════════════════════════════════════════════════════════════
-- EL CÍRCULO — red social interna (espacios + eventos + conexiones + interacción)
--
-- Miembros crean, admin modera (App Store 1.2). Todo detrás del feature flag
-- EXPO_PUBLIC_SOCIAL_SPACES_ENABLED (cliente); esta migración es aditiva y
-- retrocompatible: el feed general y los DMs actuales no cambian de contrato.
--
-- Visibilidad v1: espacios/eventos públicos-DENTRO-de-la-app (cualquier miembro
-- autenticado ve y se une; nada es visible sin sesión). Espacios privados,
-- chat grupal, media y push: diferidos por diseño.
--
-- Reusa el helper public.is_current_user_admin() (SECURITY DEFINER, creado en
-- 20260622000000_admin_read_profiles_rls.sql).
--
-- Idempotente. Aplicar en el SQL Editor del dashboard.
-- Verificación post-aplicación: dar un like de prueba en el feed y confirmar
-- que likes_count sube (el trigger se redefine aquí para contar solo 'like').
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. ESPACIOS (círculos por tema) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.community_spaces (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL CHECK (char_length(name) BETWEEN 3 AND 60),
  description   text CHECK (char_length(description) <= 280),
  emoji         text CHECK (char_length(emoji) <= 8),
  members_count integer NOT NULL DEFAULT 0,
  is_archived   boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_spaces_active ON public.community_spaces(is_archived, created_at DESC);

ALTER TABLE public.community_spaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS spaces_select ON public.community_spaces;
CREATE POLICY spaces_select ON public.community_spaces
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (is_archived = false OR public.is_current_user_admin())
  );

DROP POLICY IF EXISTS spaces_insert ON public.community_spaces;
CREATE POLICY spaces_insert ON public.community_spaces
  FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS spaces_update ON public.community_spaces;
CREATE POLICY spaces_update ON public.community_spaces
  FOR UPDATE USING (created_by = auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS spaces_delete ON public.community_spaces;
CREATE POLICY spaces_delete ON public.community_spaces
  FOR DELETE USING (created_by = auth.uid() OR public.is_current_user_admin());

CREATE TABLE IF NOT EXISTS public.space_members (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id  uuid NOT NULL REFERENCES public.community_spaces(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role      text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (space_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_space_members_user ON public.space_members(user_id);

ALTER TABLE public.space_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS space_members_select ON public.space_members;
CREATE POLICY space_members_select ON public.space_members
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS space_members_insert ON public.space_members;
CREATE POLICY space_members_insert ON public.space_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS space_members_delete ON public.space_members;
CREATE POLICY space_members_delete ON public.space_members
  FOR DELETE USING (user_id = auth.uid() OR public.is_current_user_admin());

-- Trigger: members_count (mismo patrón que likes_count de 20260513)
CREATE OR REPLACE FUNCTION public.update_space_members_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_spaces SET members_count = members_count + 1 WHERE id = NEW.space_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_spaces SET members_count = GREATEST(members_count - 1, 0) WHERE id = OLD.space_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_space_members ON public.space_members;
CREATE TRIGGER trg_space_members
  AFTER INSERT OR DELETE ON public.space_members
  FOR EACH ROW EXECUTE FUNCTION public.update_space_members_count();

-- ─── 2. EVENTOS + RSVP ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.community_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id         uuid REFERENCES public.community_spaces(id) ON DELETE CASCADE, -- NULL = evento global
  created_by       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 80),
  description      text CHECK (char_length(description) <= 500),
  starts_at        timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 15 AND 480),
  timezone         text NOT NULL DEFAULT 'America/Bogota',
  location_type    text NOT NULL DEFAULT 'virtual' CHECK (location_type IN ('virtual', 'in_person')),
  location_text    text CHECK (char_length(location_text) <= 200),
  capacity         integer CHECK (capacity IS NULL OR capacity BETWEEN 2 AND 500),
  status           text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled')),
  going_count      integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_upcoming ON public.community_events(status, starts_at);
CREATE INDEX IF NOT EXISTS idx_events_space ON public.community_events(space_id);

ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS events_select ON public.community_events;
CREATE POLICY events_select ON public.community_events
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS events_insert ON public.community_events;
CREATE POLICY events_insert ON public.community_events
  FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS events_update ON public.community_events;
CREATE POLICY events_update ON public.community_events
  FOR UPDATE USING (created_by = auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS events_delete ON public.community_events;
CREATE POLICY events_delete ON public.community_events
  FOR DELETE USING (created_by = auth.uid() OR public.is_current_user_admin());

CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES public.community_events(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status     text NOT NULL CHECK (status IN ('going', 'maybe', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_rsvps_user ON public.event_rsvps(user_id);

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- La lista de asistentes es visible para miembros autenticados (se filtra por
-- bloqueos en cliente); cada quien escribe solo su propia fila.
DROP POLICY IF EXISTS rsvps_select ON public.event_rsvps;
CREATE POLICY rsvps_select ON public.event_rsvps
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS rsvps_insert ON public.event_rsvps;
CREATE POLICY rsvps_insert ON public.event_rsvps
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS rsvps_update ON public.event_rsvps;
CREATE POLICY rsvps_update ON public.event_rsvps
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS rsvps_delete ON public.event_rsvps;
CREATE POLICY rsvps_delete ON public.event_rsvps
  FOR DELETE USING (user_id = auth.uid());

-- Trigger: going_count cuenta SOLO status='going' (INSERT/UPDATE/DELETE)
CREATE OR REPLACE FUNCTION public.update_event_going_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'going' THEN
      UPDATE public.community_events SET going_count = going_count + 1 WHERE id = NEW.event_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'going' THEN
      UPDATE public.community_events SET going_count = GREATEST(going_count - 1, 0) WHERE id = OLD.event_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'going' AND NEW.status <> 'going' THEN
      UPDATE public.community_events SET going_count = GREATEST(going_count - 1, 0) WHERE id = NEW.event_id;
    ELSIF OLD.status <> 'going' AND NEW.status = 'going' THEN
      UPDATE public.community_events SET going_count = going_count + 1 WHERE id = NEW.event_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_event_going ON public.event_rsvps;
CREATE TRIGGER trg_event_going
  AFTER INSERT OR UPDATE OR DELETE ON public.event_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.update_event_going_count();

-- ─── 3. CONEXIONES (mutuas, anti-duplicado por par ordenado) ─────────────────

CREATE TABLE IF NOT EXISTS public.user_connections (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CHECK (requester_id <> addressee_id)
);
-- Un solo vínculo por par sin importar la dirección (A→B y B→A colisionan aquí).
CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_pair
  ON public.user_connections (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
CREATE INDEX IF NOT EXISTS idx_connections_addressee ON public.user_connections(addressee_id, status);

ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

-- Las conexiones NO son públicas: solo las ven sus dos participantes.
DROP POLICY IF EXISTS connections_select ON public.user_connections;
CREATE POLICY connections_select ON public.user_connections
  FOR SELECT USING (requester_id = auth.uid() OR addressee_id = auth.uid());

DROP POLICY IF EXISTS connections_insert ON public.user_connections;
CREATE POLICY connections_insert ON public.user_connections
  FOR INSERT WITH CHECK (requester_id = auth.uid() AND status = 'pending');

-- Solo el receptor puede aceptar.
DROP POLICY IF EXISTS connections_update ON public.user_connections;
CREATE POLICY connections_update ON public.user_connections
  FOR UPDATE USING (addressee_id = auth.uid()) WITH CHECK (status = 'accepted');

-- Rechazar/deshacer = DELETE por cualquiera de los dos (permite re-solicitar).
DROP POLICY IF EXISTS connections_delete ON public.user_connections;
CREATE POLICY connections_delete ON public.user_connections
  FOR DELETE USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- ─── 4. COMENTARIOS (flat) ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.post_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 300),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON public.post_comments(post_id, created_at);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comments_select ON public.post_comments;
CREATE POLICY comments_select ON public.post_comments
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS comments_insert ON public.post_comments;
CREATE POLICY comments_insert ON public.post_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS comments_delete ON public.post_comments;
CREATE POLICY comments_delete ON public.post_comments
  FOR DELETE USING (user_id = auth.uid() OR public.is_current_user_admin());

ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS comments_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_post_comments ON public.post_comments;
CREATE TRIGGER trg_post_comments
  AFTER INSERT OR DELETE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

-- ─── 5. REACCIONES EMOJI EN POSTS (extiende community_reactions) ─────────────
-- La tabla ya existe con UNIQUE(post_id, user_id) → UNA reacción por usuario
-- por post, semántica replace (igual que direct_message_reactions).

ALTER TABLE public.community_reactions DROP CONSTRAINT IF EXISTS community_reactions_type_check;
ALTER TABLE public.community_reactions ADD CONSTRAINT community_reactions_type_check
  CHECK (type IN ('like', '🔥', '💪', '🙏', '👏', '❤️'));

-- Garantiza el arbiter (post_id, user_id) para los upserts de reacción del
-- cliente, sin importar con qué UNIQUE exacto se creó la tabla en prod.
-- Seguro hoy: el único type existente es 'like' → no puede haber duplicados.
CREATE UNIQUE INDEX IF NOT EXISTS idx_reactions_post_user
  ON public.community_reactions(post_id, user_id);

-- Redefinir el trigger de likes_count para contar SOLO type='like' y cubrir
-- UPDATE (cambio like↔emoji). Para el único valor existente ('like'), el
-- comportamiento INSERT/DELETE es idéntico al anterior.
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'like' THEN
      UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.type = 'like' THEN
      UPDATE community_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.type = 'like' AND NEW.type <> 'like' THEN
      UPDATE community_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = NEW.post_id;
    ELSIF OLD.type <> 'like' AND NEW.type = 'like' THEN
      UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_post_likes ON community_reactions;
CREATE TRIGGER trg_post_likes
  AFTER INSERT OR UPDATE OR DELETE ON community_reactions
  FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- ─── 6. REPORTES POLIMÓRFICOS (extiende community_reports) ────────────────────
-- post_id se conserva → reportes viejos y código actual siguen funcionando.

ALTER TABLE public.community_reports ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'post';
ALTER TABLE public.community_reports DROP CONSTRAINT IF EXISTS community_reports_target_type_check;
ALTER TABLE public.community_reports ADD CONSTRAINT community_reports_target_type_check
  CHECK (target_type IN ('post', 'comment', 'event', 'space'));
ALTER TABLE public.community_reports ADD COLUMN IF NOT EXISTS target_id uuid;
UPDATE public.community_reports SET target_id = post_id WHERE target_id IS NULL AND post_id IS NOT NULL;

-- ─── 7. POSTS POR ESPACIO (extiende community_posts) ─────────────────────────
-- space_id NULL = plaza general (el feed actual queda intacto).

ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS space_id uuid
  REFERENCES public.community_spaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_posts_space ON public.community_posts(space_id, created_at DESC);
