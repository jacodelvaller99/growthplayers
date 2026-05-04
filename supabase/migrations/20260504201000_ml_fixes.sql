-- ─── CMI LifeFlow — ML Engine Corrective Fixes ───────────────────────────────
-- Migration: 20260504201000_ml_fixes.sql
--
-- FIXES:
--   1. smart_notifications.type CHECK constraint → drop (types are dynamic:
--      churn_critical, anomaly_mood_drop, nba_*, streak_rescue, milestone…)
--   2. smart_notifications.data  jsonb column (edge fn inserts data:{})
--   3. smart_notifications.delivered boolean (cron cleanup references it)
--   4. Backfill: init user_intelligence for all existing profiles with ml_consent

-- ─── 1. Drop old type constraint ─────────────────────────────────────────────
ALTER TABLE public.smart_notifications
  DROP CONSTRAINT IF EXISTS smart_notifications_type_check;

-- ─── 2. Add data jsonb (push notification payload) ───────────────────────────
ALTER TABLE public.smart_notifications
  ADD COLUMN IF NOT EXISTS data      jsonb    DEFAULT '{}';

-- ─── 3. Add delivered boolean (cron cleanup + tracking) ──────────────────────
ALTER TABLE public.smart_notifications
  ADD COLUMN IF NOT EXISTS delivered boolean  DEFAULT false;

-- ─── 4. Backfill user_intelligence for profiles that don't have a row ────────
-- The trigger trg_init_intelligence only fires on new profile inserts.
-- This INSERT handles existing profiles created before the trigger was added.
INSERT INTO public.user_intelligence (user_id)
SELECT p.id
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_intelligence ui WHERE ui.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;
