-- ═══════════════════════════════════════════════════════════════════════════
-- APLICAR EN PRODUCCIÓN — PARTE 2 (bizbbtiyftfjufxinwsu) — 2026-10-05
-- ═══════════════════════════════════════════════════════════════════════════
-- Correr DESPUÉS de APLICAR_EN_PROD_2026-10-05.sql. Una transacción, idempotente.
-- Sale de VERIFICAR_ESQUEMA_PROD.sql: objetos que faltaban en prod y que NINGUNA
-- migración posterior elimina a propósito. Solo esos objetos, copiados de su
-- definición vigente — NO las migraciones completas: db_hardening_p1 y cmi_admin
-- redefinen políticas que migraciones posteriores ya cambiaron, y re-correrlas
-- completas las revertiría.
--
-- NO incluido a propósito:
--   · "own journal" / "users can manage own wellness_sessions" → ya cubiertas por
--     je_owner_or_admin y users_own_wellness_sessions (más nuevas).
--   · "No direct client access" → USING(false) permisiva: no aporta nada.
--   · cron plaud-sync-hourly → necesita la cuenta de Plaud del dueño (plaud_tokens);
--     sin eso fallaría cada hora.
--   · auth_select_active_codes, authenticated_select/update_access_codes*,
--     user_insert_own_memberships, user_update_own_profile_tier, cron
--     calculate-intelligence-all → eliminadas A PROPÓSITO por el endurecimiento de
--     seguridad (0602 / 0604 / 0731). Que falten es lo correcto.
-- ═══════════════════════════════════════════════════════════════════════════


-- ┌─────────────────────────────────────────────────────────────────────────
-- │ 20260804010000_access_code_activation.sql — CRÍTICO
-- │ El registro valida con check_access_code y la activación de membresía usa
-- │ redeem_access_code_for_user. Ninguna existía en prod → quien se registraba
-- │ con código quedaba sin membresía.
-- └─────────────────────────────────────────────────────────────────────────
create or replace function public.check_access_code(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.access_codes%rowtype;
begin
  select * into v_row
  from public.access_codes
  where upper(code) = upper(trim(p_code))
  limit 1;
  if not found then return 'invalid'; end if;
  if not v_row.is_active then return 'inactive'; end if;
  if v_row.expires_at is not null and v_row.expires_at < now() then return 'expired'; end if;
  if v_row.uses_count >= v_row.max_uses then return 'exhausted'; end if;
  return 'ok';
end;
$$;

grant execute on function public.check_access_code(text) to anon, authenticated;

comment on function public.check_access_code(text) is
  'Valida un código SIN consumirlo. Lo usa el registro: quemar el código antes de que exista el usuario dejaba al cliente sin membresía y sin segunda oportunidad.';

create or replace function public.redeem_access_code_for_user(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row     public.access_codes%rowtype;
  v_uid     uuid := auth.uid();
  v_product text;
  v_updated int;
begin
  if v_uid is null then return 'invalid'; end if;

  select * into v_row
  from public.access_codes
  where upper(code) = upper(trim(p_code))
  limit 1;

  if not found then return 'invalid'; end if;
  if not v_row.is_active then return 'inactive'; end if;
  if v_row.expires_at is not null and v_row.expires_at < now() then return 'expired'; end if;

  if exists (
    select 1 from public.access_code_uses
    where code_id = v_row.id and user_id = v_uid
  ) then
    return 'ok';
  end if;

  if v_row.uses_count >= v_row.max_uses then return 'exhausted'; end if;

  update public.access_codes
  set    uses_count = uses_count + 1
  where  id         = v_row.id
    and  uses_count = v_row.uses_count;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then return 'exhausted'; end if;

  v_product := case v_row.type
    when 'polaris'        then 'polaris'
    when 'growthplayers'  then 'growthplayers'
    when 'premium_plus'   then 'premium_plus'
    when 'premium'        then 'premium'
    else 'lifeflow_free'
  end;

  insert into public.access_code_uses (code_id, user_id)
  values (v_row.id, v_uid)
  on conflict do nothing;

  insert into public.user_memberships (user_id, product, status, activated_by, activated_at)
  values (v_uid, v_product, 'active', 'access_code', now());

  update public.profiles
  set    subscription_tier = v_product
  where  id = v_uid;

  return 'ok';
end;
$$;

grant execute on function public.redeem_access_code_for_user(text) to authenticated;

comment on function public.redeem_access_code_for_user(text) is
  'Valida, consume Y activa la membresía en una transacción, con auth.uid(). SECURITY DEFINER a propósito: el cliente no puede leer access_codes (RLS del endurecimiento P0), y ese SELECT bloqueado era el segundo motivo de que la activación no ocurriera nunca.';


-- ┌─────────────────────────────────────────────────────────────────────────
-- │ 20260803010000_smart_notifications_update_policy.sql
-- │ El cliente no podía marcar sus notificaciones como entregadas.
-- └─────────────────────────────────────────────────────────────────────────
drop policy if exists "own_notifications_update" on public.smart_notifications;
create policy "own_notifications_update" on public.smart_notifications
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ┌─────────────────────────────────────────────────────────────────────────
-- │ cmi_admin (0504) — lectura admin de inteligencia y conversaciones de otros
-- │ usuarios (paneles Inteligencia ML / Memoria quedaban vacíos para el admin).
-- └─────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_intelligence') THEN
    DROP POLICY IF EXISTS "admin_read_all_intelligence" ON public.user_intelligence;
    CREATE POLICY "admin_read_all_intelligence" ON public.user_intelligence
      FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mentor_conversations') THEN
    DROP POLICY IF EXISTS "admin_read_all_conversations" ON public.mentor_conversations;
    CREATE POLICY "admin_read_all_conversations" ON public.mentor_conversations
      FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;
END $$;


-- ┌─────────────────────────────────────────────────────────────────────────
-- │ db_hardening_p1 (0619) — admin_read_all_events (versión vigente) + índices
-- └─────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_read_all_events" ON public.user_events;
CREATE POLICY "admin_read_all_events" ON public.user_events
  FOR SELECT TO authenticated USING (
    (SELECT auth.uid()) = user_id OR
    (SELECT is_admin FROM public.profiles WHERE id = (SELECT auth.uid()) LIMIT 1)
  );

CREATE INDEX IF NOT EXISTS idx_habits_user_fk ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_user_fk ON public.community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_reactions_user_fk ON public.community_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_access_codes_expires_at
  ON public.access_codes(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_user_created
  ON public.user_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wearable_ts_query
  ON public.wearable_timeseries(user_id, metric, recorded_at DESC);


-- ┌─────────────────────────────────────────────────────────────────────────
-- │ security_hardening_p0 (0602) — políticas de las tablas B2B (creadas en la
-- │ parte 1; el bloque original estaba condicionado a que existieran).
-- └─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.b2b_organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "b2b_admin_read" ON public.b2b_organizations;
CREATE POLICY "b2b_admin_read" ON public.b2b_organizations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_members_own" ON public.org_members;
CREATE POLICY "org_members_own" ON public.org_members FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));


-- ┌─────────────────────────────────────────────────────────────────────────
-- │ Índices faltantes de journal_entries (0501) y wellness_sessions (0430)
-- └─────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS journal_entries_user_created ON public.journal_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wellness_sessions_user_id_idx ON public.wellness_sessions(user_id);
CREATE INDEX IF NOT EXISTS wellness_sessions_completed_at_idx ON public.wellness_sessions(user_id, completed_at DESC);
