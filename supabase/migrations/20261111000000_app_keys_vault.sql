-- Claves de la app editables desde el admin (Ajustes → Claves).
-- Se guardan CIFRADAS en Supabase Vault con el prefijo `app:`; las edge
-- functions las leen con service-role y tienen prioridad sobre los secrets de
-- Supabase. Ningún cliente (anon/authenticated) puede leerlas ni escribirlas:
-- solo service_role, a través de la edge function `admin-keys` (gate is_admin).
-- Idempotente.

create or replace function public.app_keys_read(p_names text[])
returns table (name text, value text, updated_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  select substr(s.name, 5), s.decrypted_secret, s.updated_at
  from vault.decrypted_secrets s
  where s.name = any (select 'app:' || n from unnest(p_names) n);
$$;

create or replace function public.app_keys_write(p_name text, p_value text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_name !~ '^[A-Z][A-Z0-9_]{1,63}$' then
    raise exception 'nombre de clave inválido';
  end if;
  select id into v_id from vault.secrets where name = 'app:' || p_name;
  if v_id is null then
    perform vault.create_secret(p_value, 'app:' || p_name, 'Clave de la app (admin)');
  else
    perform vault.update_secret(v_id, p_value);
  end if;
end;
$$;

revoke all on function public.app_keys_read(text[]) from public, anon, authenticated;
revoke all on function public.app_keys_write(text, text) from public, anon, authenticated;
grant execute on function public.app_keys_read(text[]) to service_role;
grant execute on function public.app_keys_write(text, text) to service_role;
