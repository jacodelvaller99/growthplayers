-- ─────────────────────────────────────────────────────────────────────────────
-- ClickUp Onboarding — creación automática de perfil al firmar el acuerdo
--
-- Disparador: una Automatización de ClickUp (lista "Polaris", Servicio →
-- CLIENTES POLARIS, list_id 901111940968) que, cuando el campo custom "Status
-- del contrato" pasa a "Firmado", hace POST a
-- supabase/functions/clickup-onboarding.
--
-- 1) clickup_webhook_events — dedup de REENTREGA (mismo patrón que
--    wearable_webhook_events, 20260621000000_wearable_aggregator.sql):
--    UNIQUE(event_id) donde event_id = sha256(raw body). Dos entregas
--    IDÉNTICAS (reintento por timeout de ClickUp) → la segunda no reprocesa.
--    Distinto del punto 2: event_id captura "misma entrega", no "mismo
--    task_id disparado otra vez en un día distinto" (body distinto → hash
--    distinto, esta tabla no lo atrapa a propósito).
--
-- 2) profiles.clickup_task_id — idempotencia de NEGOCIO: si el mismo task_id
--    de ClickUp dispara el webhook otra vez días después (p.ej. alguien edita
--    el campo por error y lo vuelve a poner en "Firmado"), UNIQUE bloquea un
--    segundo usuario duplicado — la function la chequea ANTES de llamar a
--    auth.admin.createUser().
--
-- 3) user_profiles.phone — ClickUp manda "Celular"/"telefono del cliente" y
--    hoy no hay dónde guardarlo (sin columna en ningún lado del schema).
--    Se agrega para no perder el dato; sin UI todavía que lo muestre/edite.
--
-- Idempotente. Aplicar en el SQL Editor del dashboard (no hay service-role
-- local — ver CLAUDE.md).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. clickup_webhook_events ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clickup_webhook_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      text NOT NULL,                 -- sha256(raw body) — clave de dedup de reentrega
  task_id       text,                           -- ClickUp task id (trazabilidad, NO único aquí)
  payload       jsonb,                          -- raw body para auditoría/reproceso
  processed     boolean NOT NULL DEFAULT false,
  process_error text,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  received_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS clickup_webhook_events_event_id_key
  ON public.clickup_webhook_events (event_id);
CREATE INDEX IF NOT EXISTS clickup_webhook_events_task_idx
  ON public.clickup_webhook_events (task_id);

ALTER TABLE public.clickup_webhook_events ENABLE ROW LEVEL SECURITY;
-- Sin policies para `authenticated` = sin acceso de usuario por defecto — solo
-- el service-role (la edge function) toca esta tabla. Mismo patrón que
-- wearable_webhook_events.

-- ── 2. profiles.clickup_task_id — idempotencia de negocio ─────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS clickup_task_id text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_clickup_task_id_key
  ON public.profiles (clickup_task_id) WHERE clickup_task_id IS NOT NULL;

-- ── 3. user_profiles.phone ─────────────────────────────────────────────────────
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS phone text;
