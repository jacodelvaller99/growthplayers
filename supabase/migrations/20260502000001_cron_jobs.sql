-- ─────────────────────────────────────────────────────────────────────────────
-- Intelligence Engine — pg_cron Scheduled Jobs
-- Migration: 20260502000001_cron_jobs.sql
--
-- REQUIRES: pg_cron extension (enabled in Supabase dashboard:
--   Database → Extensions → pg_cron)
--
-- Jobs:
--   1. calculate-intelligence   — every 6 hours (all users)
--   2. smart-notifications      — every hour (respects preferred_time)
--   3. cleanup-old-events       — weekly (keep last 90 days of user_events)
--   4. reindex-vectors          — weekly Sunday 2am (refresh IVFFlat if enabled)
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable pg_cron if not already enabled
-- (Safe to run multiple times — CREATE EXTENSION IF NOT EXISTS is idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ─── Helper: invoke an edge function from SQL ─────────────────────────────────
-- pg_cron can only run SQL, so we use net.http_post() via pg_net extension.
-- pg_net is enabled by default in Supabase.

-- ─── Job 1: Recalculate intelligence every 6 hours ───────────────────────────
-- Calls calculate-intelligence with { "all_users": true }
-- cron schedule: at minute 0, every 6 hours

SELECT cron.schedule(
  'intelligence-engine-calculate',           -- job name (unique)
  '0 */6 * * *',                             -- every 6 hours at :00
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/calculate-intelligence',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := '{"all_users":true}'::jsonb
  );
  $$
);

-- ─── Job 2: Send personalized notifications every hour ───────────────────────
-- Calls smart-notifications with { "scheduled": true }
-- smart-notifications internally checks preferred_time before sending

SELECT cron.schedule(
  'smart-notifications-hourly',              -- job name
  '5 * * * *',                               -- every hour at :05 (offset to avoid collision)
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/smart-notifications',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := '{"scheduled":true}'::jsonb
  );
  $$
);

-- ─── Job 3: Clean up old user_events (keep last 90 days) ─────────────────────
-- Runs every Sunday at 3:00 AM UTC
-- Keeps the events table lean; aggregated data already in user_intelligence

SELECT cron.schedule(
  'cleanup-old-user-events',                 -- job name
  '0 3 * * 0',                               -- Sunday 3am UTC
  $$
  DELETE FROM user_events
  WHERE created_at < NOW() - INTERVAL '90 days';
  $$
);

-- ─── Job 4: Clean up delivered notifications older than 30 days ──────────────
-- Runs every Sunday at 3:30 AM UTC

SELECT cron.schedule(
  'cleanup-old-notifications',               -- job name
  '30 3 * * 0',                              -- Sunday 3:30am UTC
  $$
  DELETE FROM smart_notifications
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND (delivered = true OR delivered IS NULL);
  $$
);

-- ─── Job 5: Clean up stale mentor_memories without embeddings ────────────────
-- Memories stuck without embeddings (generate-embeddings may have failed)
-- Retry logic: call generate-embeddings for memories older than 10 min with NULL embedding
-- Runs every 15 minutes

SELECT cron.schedule(
  'retry-failed-embeddings',                 -- job name
  '*/15 * * * *',                            -- every 15 minutes
  $$
  -- Mark for retry: any memory > 10 min old with null embedding gets re-queued
  -- via pg_net to generate-embeddings
  SELECT net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/generate-embeddings',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := jsonb_build_object(
      'memory_id', m.id::text,
      'content',   m.content,
      'user_id',   m.user_id::text
    )
  )
  FROM mentor_memories m
  WHERE m.embedding IS NULL
    AND m.created_at < NOW() - INTERVAL '10 minutes'
  LIMIT 10;  -- process up to 10 per tick to avoid overload
  $$
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Set runtime configuration for edge function URLs
-- These must be set in Supabase dashboard: Settings → Database → Config
-- or via: ALTER DATABASE postgres SET app.supabase_url = '...';
--         ALTER DATABASE postgres SET app.service_role_key = '...';
--
-- NOTE: Do NOT store the service_role_key in migration files for production.
-- Use Supabase Vault or database secrets instead.
-- The cron jobs above reference current_setting('app.supabase_url') and
-- current_setting('app.service_role_key') which must be pre-configured.
-- ─────────────────────────────────────────────────────────────────────────────

-- Verify jobs were created
DO $$
DECLARE
  job_count integer;
BEGIN
  SELECT COUNT(*) INTO job_count FROM cron.job
  WHERE jobname IN (
    'intelligence-engine-calculate',
    'smart-notifications-hourly',
    'cleanup-old-user-events',
    'cleanup-old-notifications',
    'retry-failed-embeddings'
  );

  IF job_count < 5 THEN
    RAISE WARNING 'Expected 5 cron jobs, found %. Check pg_cron setup.', job_count;
  ELSE
    RAISE NOTICE 'All % intelligence engine cron jobs registered successfully.', job_count;
  END IF;
END $$;
