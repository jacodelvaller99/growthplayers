-- ═══════════════════════════════════════════════════════════════════════════
-- P1-7 — Los tokens OAuth de wearables eran legibles por cualquier admin
-- ═══════════════════════════════════════════════════════════════════════════
--
-- HALLAZGO (verificado en prod 2026-07-29):
--   `wearable_connections` tiene RLS activo con dos políticas:
--     · own_wearable_connections   ALL    → auth.uid() = user_id      (correcta)
--     · admin_wearable_connections SELECT → profiles.is_admin = true  (el hueco)
--
--   La política de admin permite `select *`, así que cualquier admin — o
--   cualquiera que comprometa una cuenta admin — puede leer `access_token` y
--   `refresh_token` en texto plano de TODOS los usuarios, y con ellos
--   suplantarlos contra Oura / WHOOP. El admin necesita saber que la conexión
--   existe y cuándo sincronizó; nunca necesita la credencial.
--
-- POR QUÉ ESTE ARREGLO Y NO CIFRADO:
--   Cifrar con pgcrypto/Vault exige gestionar una clave y que la edge function
--   descifre — infraestructura nueva, que es justo lo que no vamos a añadir.
--   Quitar el acceso de lectura elimina la exposición por completo y sin
--   dependencias: nadie salvo `service_role` puede volver a leer esos campos.
--
-- POR QUÉ REVOKE + RE-GRANT Y NO "REVOKE POR COLUMNA":
--   En Postgres un GRANT a nivel de TABLA cubre todas las columnas y NO se
--   puede restar con un REVOKE por columna. Hay que revocar el privilegio de
--   tabla y re-otorgarlo columna a columna.
--
-- COMPATIBILIDAD (verificada en el código antes de escribir esto):
--   Los tres caminos del cliente usan listas de columnas explícitas sin tokens:
--     · lib/wearables.ts:165          select id, user_id, provider, is_active,
--                                            connected_at, last_synced_at, scope
--     · lib/wearablesNative.ts:333    upsert sin tokens (return=minimal)
--     · app/perfil/wearables.tsx:822  update is_active
--   `supabase/functions/sync-wearables` es el único que lee los tokens y corre
--   con `service_role`, que ignora RLS y grants. No se toca.
--
-- Idempotente. Se puede correr varias veces.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  cols text;
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'wearable_connections'
  ) then
    raise notice 'wearable_connections no existe — nada que hacer';
    return;
  end if;

  -- Todas las columnas MENOS las dos credenciales. Se calcula en vivo para no
  -- hardcodear un esquema que ya creció (source_device, aggregator_user_id…).
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name   = 'wearable_connections'
    and column_name not in ('access_token', 'refresh_token');

  if cols is null then
    raise exception 'No se pudo calcular la lista de columnas — abortando por seguridad';
  end if;

  -- 1. Quitar el privilegio de tabla (que cubre todas las columnas).
  execute 'revoke select, insert, update on public.wearable_connections from authenticated';
  execute 'revoke select, insert, update on public.wearable_connections from anon';

  -- 2. Devolverlo solo sobre las columnas no secretas.
  execute format('grant select (%s) on public.wearable_connections to authenticated', cols);
  execute format('grant insert (%s) on public.wearable_connections to authenticated', cols);
  execute format('grant update (%s) on public.wearable_connections to authenticated', cols);

  raise notice 'P1-7 cerrado: access_token/refresh_token ya no son legibles por authenticated ni anon';
end $$;

-- ── Verificación ───────────────────────────────────────────────────────────
-- Debe devolver 0 filas. Si devuelve alguna, el revoke no se aplicó.
--
--   select grantee, privilege_type, column_name
--     from information_schema.column_privileges
--    where table_schema = 'public'
--      and table_name   = 'wearable_connections'
--      and column_name in ('access_token', 'refresh_token')
--      and grantee in ('authenticated', 'anon');
