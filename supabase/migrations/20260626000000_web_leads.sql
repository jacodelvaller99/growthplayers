-- ─────────────────────────────────────────────────────────────────────────────
-- Web leads — captura del visitante web en el paywall (descope honesto).
--
-- En web, el paywall hace un descope honesto ("la suscripción se gestiona en
-- iOS/Android"): sin captura, ese visitante se pierde. Esta tabla guarda un
-- email de lead para avisarle cuando tenga acceso/novedades — sin spam.
--
-- RLS: INSERT público (anon) — es un lead form sin sesión; SELECT solo admin.
-- Reusa el helper public.is_current_user_admin() (SECURITY DEFINER, sin
-- recursión) de 20260622000000_admin_read_profiles_rls.sql.
--
-- HANDOFF: aplicar en el SQL Editor del dashboard (no hay service-role local).
-- Idempotente.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.web_leads (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  source     text DEFAULT 'paywall_web',
  created_at timestamptz DEFAULT now()
);

-- email único — evita duplicados / spam del mismo lead (upsert idempotente).
CREATE UNIQUE INDEX IF NOT EXISTS web_leads_email_key ON public.web_leads (lower(email));

ALTER TABLE public.web_leads ENABLE ROW LEVEL SECURITY;

-- ── INSERT público — el visitante web no tiene sesión (anon) ──────────────────
DROP POLICY IF EXISTS "web_leads_public_insert" ON public.web_leads;
CREATE POLICY "web_leads_public_insert"
  ON public.web_leads FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- ── SELECT solo admin — nadie más lee los leads ──────────────────────────────
DROP POLICY IF EXISTS "web_leads_admin_select" ON public.web_leads;
CREATE POLICY "web_leads_admin_select"
  ON public.web_leads FOR SELECT TO authenticated
  USING (public.is_current_user_admin());
