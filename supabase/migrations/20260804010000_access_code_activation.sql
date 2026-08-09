-- El código de acceso se cobraba dos veces y no activaba nada.
--
-- EL FALLO, de punta a punta:
--   1. El registro (`app/(auth)/index.tsx`) EXIGE código y llama a
--      `redeem_access_code`, que solo hace `uses_count + 1`. No crea membresía.
--      Los códigos sembrados son `max_uses = 1`, así que ahí se agota.
--   2. Tres pantallas después, el paso 5 del onboarding pide el MISMO código y
--      llama a `redeemAccessCode` (lib/admin/actions.ts) — el ÚNICO camino que
--      inserta en `user_memberships`. Encuentra `uses_count = 1` y devuelve
--      'exhausted'.
--   3. Y aunque no estuviera agotado, tampoco funcionaría: esa función abre con
--      un SELECT de cliente sobre `access_codes`, y desde el endurecimiento de
--      seguridad P0 esa tabla no tiene política de SELECT para no-admin. El
--      SELECT devuelve cero filas → 'invalid'.
--
-- RESULTADO: todo cliente que pagó entra en tier `free`, ve "código ya usado"
-- en la última pantalla del onboarding, y al tercer mensaje a Norman choca con
-- un paywall que en la PWA —lo único desplegado— no tiene salida.
--
-- LA CAUSA RAÍZ es que el consumo y la activación viven en sitios distintos, y
-- el consumo ocurre ANTES de que exista el usuario al que activarle nada. Esta
-- migración los une en una sola operación atómica, del lado del servidor:
--
--   · `check_access_code`  → valida y NO consume. Es lo que necesita el
--     registro: saber si el código sirve antes de crear la cuenta.
--   · `redeem_access_code_for_user` → valida, consume Y activa la membresía en
--     una transacción, usando `auth.uid()`. SECURITY DEFINER, así que la RLS de
--     `access_codes` deja de ser el problema: el cliente nunca la lee.
--
-- Idempotente. Aplicar en el SQL Editor del dashboard (sin CLI service-role).

-- ─── 1. Validar sin consumir ────────────────────────────────────────────────
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

-- ─── 2. Consumir Y activar, en una sola transacción ─────────────────────────
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

  -- Reentrada: si este MISMO usuario ya canjeó este código, no se le cobra otra
  -- vez ni se le dice que está agotado. Reabrir el onboarding no puede costarle
  -- la membresía.
  if exists (
    select 1 from public.access_code_uses
    where code_id = v_row.id and user_id = v_uid
  ) then
    return 'ok';
  end if;

  if v_row.uses_count >= v_row.max_uses then return 'exhausted'; end if;

  -- Incremento atómico con guarda de concurrencia (mismo patrón que la RPC
  -- original): si otro canje ganó la carrera, este pierde y no activa nada.
  update public.access_codes
  set    uses_count = uses_count + 1
  where  id         = v_row.id
    and  uses_count = v_row.uses_count;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then return 'exhausted'; end if;

  -- Mapa tipo de código → producto. Mismo que `CODE_TYPE_PRODUCT` en
  -- lib/admin/types.ts; si divergen, manda este (es el que crea la fila).
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

  -- El tier que lee la app. Sin esto la membresía existe y el paywall sigue
  -- cerrado, que es medio arreglo.
  update public.profiles
  set    subscription_tier = v_product
  where  id = v_uid;

  return 'ok';
end;
$$;

grant execute on function public.redeem_access_code_for_user(text) to authenticated;

comment on function public.redeem_access_code_for_user(text) is
  'Valida, consume Y activa la membresía en una transacción, con auth.uid(). SECURITY DEFINER a propósito: el cliente no puede leer access_codes (RLS del endurecimiento P0), y ese SELECT bloqueado era el segundo motivo de que la activación no ocurriera nunca.';
