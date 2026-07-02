-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIONES PENDIENTES COMBINADAS (demo 48h) — pegar TODO en el SQL Editor y Run.
-- Todas son idempotentes (CREATE OR REPLACE / IF NOT EXISTS / DROP POLICY IF EXISTS).
-- La 1 del runbook (admin_update_user_profile) YA fue aplicada el 2026-07-01.
-- Orden: FIX-0 mentor_messages → wearable_daily_merge → admin_sync_tier → web_leads → dm_reactions.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX-0 (P0 · URGENTE) — mentor_messages no acepta INSERTs del cliente.
--
-- Evidencia (2026-07-02, sesión real de Juan Jacobo en local contra prod):
--   · daily_checkins guarda bien (INSERT owner OK) — la red y la sesión sirven.
--   · mentor_messages: 0 filas para el usuario; los 4 mensajes del chat de hoy
--     quedaron atascados en el outbox local (lifeflow:v2:offline_queue_v1).
--   · Consecuencia UX: el chat con Norman se ve VACÍO tras cada recarga (la
--     memoria de Norman sobrevive vía mentor_conversations, pero el historial
--     literal se pierde). Afecta a TODOS los clientes.
--
-- Causa más probable: la política de INSERT owner sobre mentor_messages quedó
-- ausente o rota tras el hardening (deny-by-default). Este bloque restaura las
-- políticas owner y el índice único del outbox — todo idempotente e inocuo si
-- ya existieran.
-- ─────────────────────────────────────────────────────────────────────────────

-- Diagnóstico (opcional, correr primero si quieres ver el estado actual):
-- select policyname, cmd, roles from pg_policies where tablename = 'mentor_messages';

alter table public.mentor_messages enable row level security;

-- Columna client_id + índice único del outbox idempotente (por si faltaran).
alter table public.mentor_messages add column if not exists client_id text;
create unique index if not exists mentor_messages_user_client_uidx
  on public.mentor_messages (user_id, client_id) where client_id is not null;

drop policy if exists "Users read own messages"   on public.mentor_messages;
drop policy if exists "Users insert own messages" on public.mentor_messages;
create policy "Users read own messages" on public.mentor_messages
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users insert own messages" on public.mentor_messages
  for insert to authenticated with check ((select auth.uid()) = user_id);
-- El upsert del outbox necesita UPDATE sobre la fila propia (merge-duplicates).
drop policy if exists "Users update own messages" on public.mentor_messages;
create policy "Users update own messages" on public.mentor_messages
  for update to authenticated using ((select auth.uid()) = user_id)
                              with check ((select auth.uid()) = user_id);

-- Verificación post-fix: repetir el select de pg_policies (deben salir 3 filas)
-- y en la app mandar un mensaje a Norman + recargar: el hilo debe sobrevivir.

-- ─────────────────────────────────────────────────────────────────────────────
-- merge_wearable_daily — upsert por-columna race-free para el agregador.
--
-- Un agregador (Open Wearables, Terra) puede mandar CADA métrica del día en su
-- propio webhook (sueño, HRV, pasos…). Un upsert que reemplaza la fila borraría
-- las métricas llegadas en eventos anteriores. Un read-modify-write en la edge
-- function tendría una race condition (dos eventos concurrentes del mismo día
-- leen la misma base y el segundo pisa al primero).
--
-- Esta función lo resuelve en UNA sola sentencia atómica: INSERT … ON CONFLICT
-- DO UPDATE con COALESCE(excluded.col, wd.col). El UPDATE toma un row-lock, así
-- que eventos concurrentes del mismo (user, provider, date) se serializan y cada
-- uno conserva los campos non-null del otro. Race-free por diseño.
--
-- SECURITY DEFINER + grant solo a service_role: la llaman las edge functions con
-- la service-role key; nunca el cliente.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.merge_wearable_daily(p_rows jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.wearable_daily as wd (
    user_id, provider, source_device, date,
    sleep_score, sleep_duration_min, sleep_efficiency, rem_min, deep_min, light_min, awake_min,
    recovery_score, hrv_ms, resting_hr, respiratory_rate, spo2_avg, body_temp_delta,
    activity_score, strain_score, calories_active, steps, active_min, stress_score
  )
  select
    x.user_id, x.provider, x.source_device, x.date,
    x.sleep_score, x.sleep_duration_min, x.sleep_efficiency, x.rem_min, x.deep_min, x.light_min, x.awake_min,
    x.recovery_score, x.hrv_ms, x.resting_hr, x.respiratory_rate, x.spo2_avg, x.body_temp_delta,
    x.activity_score, x.strain_score, x.calories_active, x.steps, x.active_min, x.stress_score
  from jsonb_to_recordset(p_rows) as x(
    user_id uuid, provider text, source_device text, date date,
    sleep_score int, sleep_duration_min int, sleep_efficiency numeric, rem_min int, deep_min int, light_min int, awake_min int,
    recovery_score int, hrv_ms numeric, resting_hr int, respiratory_rate numeric, spo2_avg numeric, body_temp_delta numeric,
    activity_score int, strain_score numeric, calories_active int, steps int, active_min int, stress_score int
  )
  on conflict (user_id, provider, date) do update set
    source_device      = coalesce(excluded.source_device, wd.source_device),
    sleep_score        = coalesce(excluded.sleep_score, wd.sleep_score),
    sleep_duration_min = coalesce(excluded.sleep_duration_min, wd.sleep_duration_min),
    sleep_efficiency   = coalesce(excluded.sleep_efficiency, wd.sleep_efficiency),
    rem_min            = coalesce(excluded.rem_min, wd.rem_min),
    deep_min           = coalesce(excluded.deep_min, wd.deep_min),
    light_min          = coalesce(excluded.light_min, wd.light_min),
    awake_min          = coalesce(excluded.awake_min, wd.awake_min),
    recovery_score     = coalesce(excluded.recovery_score, wd.recovery_score),
    hrv_ms             = coalesce(excluded.hrv_ms, wd.hrv_ms),
    resting_hr         = coalesce(excluded.resting_hr, wd.resting_hr),
    respiratory_rate   = coalesce(excluded.respiratory_rate, wd.respiratory_rate),
    spo2_avg           = coalesce(excluded.spo2_avg, wd.spo2_avg),
    body_temp_delta    = coalesce(excluded.body_temp_delta, wd.body_temp_delta),
    activity_score     = coalesce(excluded.activity_score, wd.activity_score),
    strain_score       = coalesce(excluded.strain_score, wd.strain_score),
    calories_active    = coalesce(excluded.calories_active, wd.calories_active),
    steps              = coalesce(excluded.steps, wd.steps),
    active_min         = coalesce(excluded.active_min, wd.active_min),
    stress_score       = coalesce(excluded.stress_score, wd.stress_score),
    synced_at          = now();
$$;

revoke all on function public.merge_wearable_daily(jsonb) from public;
grant execute on function public.merge_wearable_daily(jsonb) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Fix (mismo root cause que 20260625000000): el flujo de Membresías tampoco podía
-- reflejar el tier en el perfil del usuario.
--
-- Causa: activateMembership/cancelMembership/changeTier (vía syncTier) y
-- extendMembership hacen UPDATE directo con el cliente anon a profiles Y
-- user_profiles de OTRO usuario. profiles/user_profiles tienen RLS de UPDATE
-- self-only (+ admin-READ), y el trigger prevent_tier_escalation bloquea
-- subscription_tier desde 'authenticated'. Para otro usuario → 0 filas, sin error
-- → la MEMBRESÍA se graba en user_memberships (source of truth, sí tiene RLS
-- admin), pero el MIRROR del tier/expiración al perfil falla en silencio →
-- el usuario podía tener membresía activa y su app seguir viéndose 'free'.
--
-- Fix: RPC SECURITY DEFINER admin_sync_tier — mismo patrón que admin_set_user_role
-- (20260624) y admin_update_user_profile (20260625): verifica al admin llamante y
-- espeja subscription_tier + subscription_expires_at a AMBAS tablas. Al correr como
-- rol dueño (no 'authenticated'), el trigger anti-escalada la permite por diseño;
-- el gate real es el check de is_admin en la función.
--
-- Idempotente. Aplicar en el SQL Editor del dashboard.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_sync_tier(
  target_user  uuid,
  new_tier     text    DEFAULT NULL,   -- NULL = no cambiar tier (solo expiración)
  set_expires  boolean DEFAULT false,  -- true = escribir subscription_expires_at (incluso a NULL)
  new_expires_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller uuid := auth.uid();
  caller_admin boolean;
BEGIN
  SELECT COALESCE(is_admin, false) INTO caller_admin
    FROM public.profiles WHERE id = caller;

  IF NOT COALESCE(caller_admin, false) THEN
    RAISE EXCEPTION 'Requiere acceso de administrador';
  END IF;

  -- profiles (id = auth.uid() en el modelo base)
  UPDATE public.profiles SET
    subscription_tier       = COALESCE(new_tier, subscription_tier),
    subscription_expires_at = CASE WHEN set_expires THEN new_expires_at ELSE subscription_expires_at END,
    updated_at              = now()
  WHERE id = target_user;

  -- user_profiles (mirror para lecturas rápidas del app)
  UPDATE public.user_profiles SET
    subscription_tier       = COALESCE(new_tier, subscription_tier),
    subscription_expires_at = CASE WHEN set_expires THEN new_expires_at ELSE subscription_expires_at END,
    updated_at              = now()
  WHERE user_id = target_user;

  -- No exigimos FOUND: puede existir solo una de las dos filas en instalaciones
  -- antiguas; el objetivo es dejar ambas consistentes cuando existan.
END;
$$;

REVOKE ALL ON FUNCTION public.admin_sync_tier(uuid, text, boolean, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_sync_tier(uuid, text, boolean, timestamptz) TO authenticated;

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

-- ─── Direct-message reactions ────────────────────────────────────────────────
-- Lightweight emoji reaction on a 1-to-1 message. One reaction per user per
-- message (toggling/replacing). Visible only to the two participants of the
-- thread (RLS joins direct_messages). Cascades on message OR user deletion, so
-- GDPR delete is covered; delete-account also purges it as defense-in-depth.

CREATE TABLE IF NOT EXISTS public.direct_message_reactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji      text NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 8),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dmr_message ON public.direct_message_reactions(message_id);

ALTER TABLE public.direct_message_reactions ENABLE ROW LEVEL SECURITY;

-- A participant of the message's thread can READ reactions on it.
DROP POLICY IF EXISTS dmr_select ON public.direct_message_reactions;
CREATE POLICY dmr_select ON public.direct_message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.direct_messages dm
      WHERE dm.id = message_id
        AND (dm.sender_id = auth.uid() OR dm.recipient_id = auth.uid())
    )
  );

-- A user can only WRITE their own reaction, and only on a thread they belong to.
DROP POLICY IF EXISTS dmr_insert ON public.direct_message_reactions;
CREATE POLICY dmr_insert ON public.direct_message_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.direct_messages dm
      WHERE dm.id = message_id
        AND (dm.sender_id = auth.uid() OR dm.recipient_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS dmr_update ON public.direct_message_reactions;
CREATE POLICY dmr_update ON public.direct_message_reactions
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS dmr_delete ON public.direct_message_reactions;
CREATE POLICY dmr_delete ON public.direct_message_reactions
  FOR DELETE USING (user_id = auth.uid());
