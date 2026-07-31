-- ─── Reconciliación de pg_cron: repo ⇄ producción ─────────────────────────────
--
-- POR QUÉ EXISTE: al auditar `cron.job` contra `20260502000001_cron_jobs.sql`
-- (2026-07-31) aparecieron TRES desajustes. Ninguno rompía nada de forma
-- visible, que es justo lo que los hacía peligrosos:
--
--   1. `retry-failed-embeddings` está definido en el repo y NO estaba programado
--      en producción. Debe reintentar cada 15 min los embeddings fallidos. Sin
--      él, un recuerdo cuyo embedding falla se queda sin embedding PARA SIEMPRE:
--      sigue en `mentor_memories`, pero `search_mentor_memories` no lo encuentra
--      nunca, así que Norman recuerda menos de lo que debería y nadie se entera.
--
--   2. `sync-all-wearables` y `calculate-intelligence-all` corren en producción
--      y no los define ningún archivo. Un rebuild desde migraciones los borraría
--      en silencio — y los wearables dejarían de sincronizarse solos.
--
--   3. `calculate-intelligence-all` (15 */6) e `intelligence-engine-calculate`
--      (0 */6) llaman a la MISMA función con el mismo body. El pipeline ML corre
--      dos veces cada seis horas: doble coste de edge function y doble carga de
--      base para un resultado idéntico.
--
-- ─── REQUISITO PREVIO (hacer ANTES de correr esto) ────────────────────────────
--
-- Los jobs que hoy funcionan llevan la service_role key ESCRITA EN CLARO dentro
-- de `cron.job.command`, legible por cualquiera con acceso al SQL Editor. Esta
-- migración no la reproduce: usa Supabase Vault, que es el camino soportado en
-- Supabase gestionado (`ALTER DATABASE ... SET` falla con permission denied
-- porque no hay superusuario).
--
-- Correr UNA VEZ, desde el SQL Editor, sustituyendo el valor:
--
--   select vault.create_secret(
--     'https://bizbbtiyftfjufxinwsu.supabase.co', 'project_url');
--   select vault.create_secret(
--     'PEGA_AQUI_TU_SERVICE_ROLE_KEY', 'service_role_key');
--
-- La clave va del dashboard de Supabase al SQL Editor DIRECTAMENTE. Nunca por
-- chat, correo ni ticket: es la que salta todas las RLS.
--
-- Comprobar antes de seguir:
--   select name from vault.decrypted_secrets
--   where name in ('project_url','service_role_key');   -- deben salir las dos

-- ─── 1. Quitar el duplicado ───────────────────────────────────────────────────
-- Se conserva `intelligence-engine-calculate` (jobid 1, el que define el repo)
-- y se retira el que se añadió a mano. Idempotente: no falla si ya no existe.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'calculate-intelligence-all') then
    perform cron.unschedule('calculate-intelligence-all');
  end if;
end $$;

-- ─── 2. Programar el reintento de embeddings que faltaba ──────────────────────
-- Cualquier memoria de más de 10 min sin embedding se reencola. Se conserva el
-- `limit 10` del job original: lo puso su autor para no saturar la función de
-- embeddings en un tick, y subirlo sin medir sería cambiar su criterio a ciegas.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'retry-failed-embeddings') then
    perform cron.unschedule('retry-failed-embeddings');
  end if;
end $$;

select cron.schedule(
  'retry-failed-embeddings',
  '*/15 * * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/generate-embeddings',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' ||
        (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := jsonb_build_object(
      'memory_id', m.id::text,
      'content',   m.content,
      'user_id',   m.user_id::text
    )
  )
  from mentor_memories m
  where m.embedding is null
    and m.created_at < now() - interval '10 minutes'
  limit 10;
  $job$
);

-- ─── 3. Los dos jobs huérfanos, para que sobrevivan a un rebuild ──────────────
--
-- NO se reprograman aquí a propósito: hoy funcionan, y volver a crearlos contra
-- Vault antes de que los secretos existan los DEJARÍA ROTOS. Se dejan escritos
-- para que un rebuild desde cero los recupere, y para que dejen de vivir solo
-- dentro de la base.
--
-- Al reconstruir de cero, o al migrar los jobs actuales fuera de la clave en
-- claro, descomentar este bloque (con los secretos de Vault ya creados):
--
--   select cron.schedule(
--     'sync-all-wearables',
--     '0 */2 * * *',
--     $job$
--     select net.http_post(
--       url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
--              || '/functions/v1/sync-wearables',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer ' ||
--           (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
--       ),
--       body := '{"action":"sync_all"}'::jsonb
--     );
--     $job$
--   );
--
-- Verificar el estado real en cualquier momento:
--   select jobname, schedule, active from cron.job order by jobname;
--   select j.jobname, r.status, r.start_time
--   from cron.job_run_details r join cron.job j on j.jobid = r.jobid
--   order by r.start_time desc limit 20;
