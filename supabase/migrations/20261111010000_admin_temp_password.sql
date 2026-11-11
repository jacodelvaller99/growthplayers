-- Contraseña puesta por el equipo, visible en el admin HASTA que el cliente
-- ponga la suya. Solo la que eligió el admin: las que elige el cliente nunca se
-- guardan legibles (Supabase solo tiene su hash).
-- Cifrada en Vault (`tmp_pw:<user_id>`). Lectura/escritura solo service_role
-- (edge function admin-set-password, gate is_admin). El cliente solo puede
-- BORRAR la suya (al cambiar su contraseña). Idempotente.

create or replace function public.temp_pw_set(p_user uuid, p_value text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select id into v_id from vault.secrets where name = 'tmp_pw:' || p_user;
  if v_id is null then
    perform vault.create_secret(p_value, 'tmp_pw:' || p_user, 'Contraseña puesta por el admin');
  else
    perform vault.update_secret(v_id, p_value);
  end if;
end; $$;

create or replace function public.temp_pw_get(p_user uuid)
returns table (value text, set_at timestamptz)
language sql security definer set search_path = '' as $$
  select s.decrypted_secret, s.updated_at from vault.decrypted_secrets s where s.name = 'tmp_pw:' || p_user;
$$;

create or replace function public.temp_pw_clear(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  delete from vault.secrets where name = 'tmp_pw:' || p_user;
$$;

-- El cliente, al poner su propia contraseña, borra la que dejó el equipo.
create or replace function public.temp_pw_clear_self()
returns void language sql security definer set search_path = '' as $$
  delete from vault.secrets where name = 'tmp_pw:' || auth.uid();
$$;

revoke all on function public.temp_pw_set(uuid, text) from public, anon, authenticated;
revoke all on function public.temp_pw_get(uuid) from public, anon, authenticated;
revoke all on function public.temp_pw_clear(uuid) from public, anon, authenticated;
revoke all on function public.temp_pw_clear_self() from public, anon;
grant execute on function public.temp_pw_set(uuid, text) to service_role;
grant execute on function public.temp_pw_get(uuid) to service_role;
grant execute on function public.temp_pw_clear(uuid) to service_role;
grant execute on function public.temp_pw_clear_self() to authenticated;
