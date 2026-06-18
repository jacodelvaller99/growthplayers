-- ─────────────────────────────────────────────────────────────────────────────
-- Outbox idempotente — columna client_id para inserts no-idempotentes.
--
-- Permite reintentar escrituras de chat/sesiones tras un fallo de red SIN
-- duplicar filas: el cliente asigna un client_id determinista y el replay usa
-- upsert(onConflict='user_id,client_id'). El índice único es PARCIAL (solo filas
-- con client_id no nulo) para no afectar las filas históricas (client_id NULL).
--
-- Idempotente. Aplicar vía SQL Editor del dashboard.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── mentor_messages ──────────────────────────────────────────────────────────
ALTER TABLE public.mentor_messages
  ADD COLUMN IF NOT EXISTS client_id text;

CREATE UNIQUE INDEX IF NOT EXISTS mentor_messages_user_client_id
  ON public.mentor_messages(user_id, client_id)
  WHERE client_id IS NOT NULL;

-- ── mentorship_sessions ──────────────────────────────────────────────────────
ALTER TABLE public.mentorship_sessions
  ADD COLUMN IF NOT EXISTS client_id text;

CREATE UNIQUE INDEX IF NOT EXISTS mentorship_sessions_user_client_id
  ON public.mentorship_sessions(user_id, client_id)
  WHERE client_id IS NOT NULL;
