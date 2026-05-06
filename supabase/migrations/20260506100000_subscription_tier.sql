-- ─── Subscription tier column on profiles ────────────────────────────────────
-- profiles.id = auth.uid() — this is the auth-linked table the admin actions use.
-- user_profiles.user_id = auth.uid() — this is the app data table.
-- We add subscription_tier to BOTH so reads from either table work.

-- profiles (auth-linked)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier  text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz;

UPDATE public.profiles
  SET subscription_tier = 'free'
  WHERE subscription_tier IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier
  ON public.profiles(subscription_tier);

-- user_profiles (app data — mirrors tier for fast app reads)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS subscription_tier  text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz;

UPDATE public.user_profiles
  SET subscription_tier = 'free'
  WHERE subscription_tier IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_tier
  ON public.user_profiles(subscription_tier);

-- RLS: users can read their own subscription_tier
-- (DROP first so this script is safely re-runnable)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'profiles'
      AND policyname = 'Users can read own subscription_tier'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Users can read own subscription_tier"
        ON public.profiles FOR SELECT
        USING (id = auth.uid())
    $pol$;
  END IF;
END
$$;

-- Enable realtime for profiles table so clients see tier changes instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
