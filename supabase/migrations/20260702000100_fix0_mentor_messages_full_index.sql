-- ─── FIX-0 — el índice parcial de mentor_messages no sirve de árbitro ON CONFLICT ──
--
-- POR QUÉ EXISTE ESTE ARCHIVO: este fix corrió en producción el 2026-07-02 desde
-- `docs/launch/SQL_PENDIENTES_COMBINADAS.sql` — un doc de runbook, NUNCA una
-- migración versionada. Verificado en vivo el 2026-07-31 (índice completo existe,
-- parcial ausente, 3 políticas presentes) que sí se aplicó. Este archivo lo
-- codifica en `supabase/migrations/` para que un rebuild desde cero no vuelva a
-- dejar el chat de Norman sin persistir — el mismo patrón que ya nos costó caro
-- con el cron de wearables y el bucket de voz esta sesión: un fix real que solo
-- vivía en un doc, invisible para cualquier migración futura o rebuild.
--
-- CAUSA RAÍZ (dos capas):
--   (1) El índice único de 20260618100000_client_id_outbox.sql es PARCIAL
--       (`where client_id is not null`). Postgres NO acepta un índice parcial
--       como árbitro de `ON CONFLICT (user_id, client_id)` sin que PostgREST
--       emita el predicado — y no lo emite — así que el upsert del outbox
--       fallaba con 42P10 SIEMPRE. El reintento del outbox nunca drenaba.
--   (2) El insert simple de respaldo también podía fallar por política INSERT
--       incompleta o un 401 transitorio de refresh de token.
--
-- Este bloque reemplaza el índice parcial por uno COMPLETO (los client_id NULL
-- históricos no chocan entre sí — en Postgres los NULL son distintos entre sí —
-- y un índice completo SÍ sirve de árbitro para ON CONFLICT) y restaura las
-- políticas RLS de mentor_messages, incluida UPDATE, que el upsert necesita
-- para el merge-duplicates. Mismo arreglo para mentorship_sessions.
--
-- Idempotente: DROP INDEX/POLICY IF EXISTS antes de recrear.

alter table public.mentor_messages enable row level security;

alter table public.mentor_messages add column if not exists client_id text;
drop index if exists public.mentor_messages_user_client_id;   -- parcial (20260618100000), causa raíz
drop index if exists public.mentor_messages_user_client_uidx; -- por si se corrió una versión previa de este fix
create unique index if not exists mentor_messages_user_client_uidx
  on public.mentor_messages (user_id, client_id);

alter table public.mentorship_sessions add column if not exists client_id text;
drop index if exists public.mentorship_sessions_user_client_id; -- parcial (20260618100000)
create unique index if not exists mentorship_sessions_user_client_uidx
  on public.mentorship_sessions (user_id, client_id);

drop policy if exists "Users read own messages"   on public.mentor_messages;
drop policy if exists "Users insert own messages" on public.mentor_messages;
create policy "Users read own messages" on public.mentor_messages
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users insert own messages" on public.mentor_messages
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- El upsert del outbox necesita UPDATE sobre la fila propia (merge-duplicates).
drop policy if exists "Users update own messages" on public.mentor_messages;
create policy "Users update own messages" on public.mentor_messages
  for update to authenticated using ((select auth.uid()) = user_id)
                              with check ((select auth.uid()) = user_id);

-- Verificación (ya confirmada en prod 2026-07-31, debe seguir dando esto):
--   select exists(select 1 from pg_indexes where indexname='mentor_messages_user_client_uidx');  -- true
--   select exists(select 1 from pg_indexes where indexname='mentor_messages_user_client_id');     -- false
--   select count(*) from pg_policies where tablename='mentor_messages';                            -- 3
