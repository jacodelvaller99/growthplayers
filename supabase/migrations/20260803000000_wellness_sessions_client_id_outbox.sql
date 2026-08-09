-- Outbox idempotente para wellness_sessions — mismo patrón que mentor_messages
-- (20260618100000 + el fix de 20260702000100).
--
-- `saveWellnessSession` (hooks/use-lifeflow.tsx) hace un `insert` NO idempotente
-- envuelto en try/catch silencioso: si falla (sin red, token expirado), la
-- práctica completada en la UI nunca llega al servidor y no hay reintento — el
-- mismo bug que ya se cerró para los mensajes de Norman, sin cerrar aquí.
--
-- Índice FULL, no parcial: la migración original de mentor_messages usaba
-- `WHERE client_id IS NOT NULL` y PostgREST no la aceptaba como árbitro de
-- `ON CONFLICT` (ver 20260702000100). Postgres ya trata cada NULL como distinto
-- en un índice único normal, así que un índice completo cubre ambos casos
-- (filas históricas sin client_id + outbox nuevo) sin repetir ese error.
--
-- Idempotente. Aplicar en el SQL Editor del dashboard (sin CLI service-role).

alter table public.wellness_sessions
  add column if not exists client_id text;

create unique index if not exists wellness_sessions_user_client_id
  on public.wellness_sessions (user_id, client_id);
