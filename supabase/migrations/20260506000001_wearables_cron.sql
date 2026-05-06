-- ─── Wearable Sync Cron ───────────────────────────────────────────────────────
-- Runs every 2 hours to sync all active wearable connections.
-- Requires pg_cron and pg_net extensions (enabled in Supabase by default).
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for HTTP calls from cron
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing job if re-running migration
SELECT cron.unschedule('sync-all-wearables') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-all-wearables'
);

-- Schedule: every 2 hours, POST to sync-wearables edge function with batch mode
SELECT cron.schedule(
  'sync-all-wearables',
  '0 */2 * * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/sync-wearables',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := '{"batch":"all"}'::jsonb
  );
  $$
);

-- Also schedule calculate-intelligence refresh for all users every 6 hours
-- (offset by 15 min so it runs after wearable sync has propagated)
SELECT cron.unschedule('calculate-intelligence-all') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'calculate-intelligence-all'
);

SELECT cron.schedule(
  'calculate-intelligence-all',
  '15 */6 * * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/calculate-intelligence',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := '{"batch":"all"}'::jsonb
  );
  $$
);
