-- smart_notifications: falta la política UPDATE — sin ella el toast in-app
-- entra en bucle.
--
-- `20260502000000_intelligence_engine.sql:179-181` habilita RLS y crea UNA sola
-- política, `FOR SELECT`. El cliente (hooks/use-smart-notifications.ts) marca
-- cada notificación como entregada con un UPDATE tras mostrarla — y ese UPDATE
-- se deniega en silencio (RLS no lanza error: simplemente no afecta filas).
--
-- Hasta hoy no se notaba porque la query de lectura filtraba por dos columnas
-- inexistentes (`sent`, `scheduled_for`) y nunca devolvía nada. Al corregir esa
-- query, el bug de RLS pasa a ser visible y peor: el mismo toast reaparecería
-- en cada poll (cada 60s) para siempre, porque nunca se logra marcar entregado.
--
-- Owner-only y acotada: el usuario solo puede tocar SUS filas. No se abre
-- INSERT ni DELETE — esas filas las escribe la edge function con service_role,
-- y el borrado lo hace el cron de limpieza (20260502000001_cron_jobs.sql:81).
--
-- Idempotente. Aplicar en el SQL Editor del dashboard (sin CLI service-role).

drop policy if exists "own_notifications_update" on public.smart_notifications;

create policy "own_notifications_update" on public.smart_notifications
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
