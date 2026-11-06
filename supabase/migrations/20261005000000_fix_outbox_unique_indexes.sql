-- ═══════════════════════════════════════════════════════════════════════════
-- Outbox: índices únicos NO parciales para que ON CONFLICT funcione
-- ═══════════════════════════════════════════════════════════════════════════
--
-- BUG (visto en prod 2026-10-05): cada POST
--   /rest/v1/mentor_messages?on_conflict=user_id,client_id  → 400
-- 20260618100000_client_id_outbox.sql creó índices únicos PARCIALES
-- (WHERE client_id IS NOT NULL). Postgres solo infiere un índice parcial para
-- ON CONFLICT si la sentencia repite el predicado, y PostgREST no puede
-- (on_conflict=user_id,client_id no lleva WHERE) → 42P10 "there is no unique or
-- exclusion constraint matching the ON CONFLICT specification".
-- persistMentorMessages (hooks/use-lifeflow.tsx) no lo reconoce como "columna
-- faltante", así que encola en el outbox, que reintenta el mismo upsert y vuelve
-- a fallar para siempre: los mensajes con Norman NO se guardan en el servidor.
--
-- FIX: índice único completo. Es equivalente para los datos — en un índice
-- único los NULL nunca chocan entre sí, así que las filas históricas con
-- client_id NULL siguen permitidas igual que con el parcial. Mismo patrón que
-- 20260803000000_wellness_sessions_client_id_outbox.sql, que ya lo hacía bien.
--
-- Seguro de crear: el índice parcial ya garantizaba unicidad en todas las
-- filas con client_id no nulo, y las NULL no cuentan → no hay duplicados que
-- hagan fallar el CREATE.
--
-- Idempotente. Se puede correr varias veces.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.mentor_messages     add column if not exists client_id text;
alter table public.mentorship_sessions add column if not exists client_id text;

drop index if exists public.mentor_messages_user_client_id;
create unique index mentor_messages_user_client_id
  on public.mentor_messages (user_id, client_id);

drop index if exists public.mentorship_sessions_user_client_id;
create unique index mentorship_sessions_user_client_id
  on public.mentorship_sessions (user_id, client_id);

-- ── Verificación ───────────────────────────────────────────────────────────
--   select indexname, indexdef from pg_indexes
--    where indexname in ('mentor_messages_user_client_id','mentorship_sessions_user_client_id');
--   -- 2 filas, ninguna con "WHERE".
