-- ═══════════════════════════════════════════════════════════════════════════
-- Circuit breaker de wearables + provider_user_id (desconexión real)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- PROBLEMA 1 (bucle infinito de reintentos): un token revocado upstream se
--   reintentaba cada 2h por el cron para siempre — cada fallo era solo un
--   console.error. La conexión nunca se marcaba muerta ni el usuario se
--   enteraba. Nuevas columnas:
--     · consecutive_failures — contador; a las 5 la conexión se desactiva.
--     · last_error           — el motivo, visible en la UI ("CONEXIÓN
--                              CADUCADA — vuelve a conectar").
--   Un refresh con invalid_grant/400/401 mata la conexión de inmediato
--   (token revocado = no hay reintento que lo arregle).
--
-- PROBLEMA 2 (Polar no se podía deregistrar): el DELETE de AccessLink exige
--   el id NUMÉRICO de Polar (x_user_id del token exchange), que no se
--   guardaba. provider_user_id lo almacena en el connect para que la
--   desconexión pueda deregistrar upstream.
--
-- GRANTS: P1-7 (20260729000000) revocó el privilegio de tabla y re-otorgó
--   columna a columna, así que las columnas NUEVAS nacen sin grant para
--   `authenticated`. Solo last_error se expone al cliente (la UI lo lee);
--   provider_user_id y consecutive_failures quedan server-side como los
--   tokens.
--
-- Idempotente. Se puede correr varias veces.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.wearable_connections
  add column if not exists provider_user_id     text,
  add column if not exists last_error           text,
  add column if not exists consecutive_failures integer not null default 0;

-- Solo lectura de last_error para el cliente (patrón P1-7: grant por columna).
grant select (last_error) on public.wearable_connections to authenticated;

-- ── Verificación ───────────────────────────────────────────────────────────
--   select column_name from information_schema.columns
--    where table_name = 'wearable_connections'
--      and column_name in ('provider_user_id','last_error','consecutive_failures');
--   -- debe devolver 3 filas.
