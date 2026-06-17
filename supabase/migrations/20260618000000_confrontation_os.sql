-- ─────────────────────────────────────────────────────────────────────────────
-- Confrontation OS — motor "DIJO vs HIZO"
--
-- Norman confronta con datos reales del sistema (no solo lo que el cliente
-- dice). Detectores puros viven en lib/confrontationLogic.ts; aquí se añade:
--   1. consents jsonb en profiles (gate explícito de confrontación + biométrico)
--   2. pause_state jsonb en profiles (admin puede pausar fricciones 14d)
--   3. frictions jsonb en admin_briefings (briefing cita brechas pre-rankeadas)
--   4. confrontation_dismissals tabla (admin silencia un detector 7d)
--
-- Idempotente. Aplicar vía SQL Editor del dashboard.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. profiles.consents — gate explícito del cliente ───────────────────────────
-- Estructura esperada (no schema-enforced, jsonb libre):
--   { confrontation_with_data: { accepted: bool, at: iso },
--     biometric_confrontation: { accepted: bool, at: iso } }
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS consents jsonb DEFAULT '{}'::jsonb;

-- ── 2. profiles.pause_state — admin pausa fricciones temporalmente ─────────────
-- Estructura: { active: bool, until: iso, reason: text, set_by: uuid }
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pause_state jsonb DEFAULT '{}'::jsonb;

-- ── 3. admin_briefings.frictions — briefing cita brechas pre-rankeadas ──────────
ALTER TABLE public.admin_briefings
  ADD COLUMN IF NOT EXISTS frictions jsonb DEFAULT '[]'::jsonb;

-- ── 4. confrontation_dismissals — admin silencia un detector por 7d ─────────────
CREATE TABLE IF NOT EXISTS public.confrontation_dismissals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id         text NOT NULL,                  -- ej. 'sleep_self_report_vs_wearable'
  reason          text,
  dismissed_until timestamptz NOT NULL,
  dismissed_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_confrontation_dismissals_user
  ON public.confrontation_dismissals(user_id, dismissed_until DESC);

ALTER TABLE public.confrontation_dismissals ENABLE ROW LEVEL SECURITY;

-- Admin-only: solo administradores pueden insertar/leer dismissals.
DROP POLICY IF EXISTS "cd_admin_only" ON public.confrontation_dismissals;
CREATE POLICY "cd_admin_only" ON public.confrontation_dismissals FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.confrontation_dismissals TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTAS DE HANDOFF (P0 separado — NO se aplica aquí):
--   El campo profiles.ml_consent sigue con default true. El consejo asesor y
--   el adversarial review del motor de confrontación marcaron esto como brecha:
--   confrontation OS amplifica el tracking pasivo en confrontación activa.
--   Plan: migración separada flip ml_consent → default false (opt-in).
--   Hasta entonces, el motor REQUIERE además profiles.consents.confrontation_with_data
--   como gate adicional (verificado en lib/confrontationLogic.ts buildConfrontations).
-- ─────────────────────────────────────────────────────────────────────────────
