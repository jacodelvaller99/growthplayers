/**
 * useSubscription — derived subscription state.
 *
 * Reads subscriptionTier from LifeFlowState (Supabase Realtime-synced).
 * Use this anywhere you need to gate features by tier.
 */
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from '@/constants/subscriptions';
import { useLifeFlow } from '@/hooks/use-lifeflow';

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  tierInfo: typeof SUBSCRIPTION_TIERS[SubscriptionTier];
  expiresAt: string | null;
  /** Any paid tier (not free) */
  isPremium: boolean;
  /** Has access to Polaris course content */
  isPolarisUser: boolean;
  /** Has access to GrowthPlayers program */
  isGrowthPlayers: boolean;
  /** Expires within 7 days (show warning badge) */
  isExpiringSoon: boolean;
  /** All users can access the mentor; free tier is rate-limited */
  canAccessMentor: true;
}

export function useSubscription(): SubscriptionInfo {
  const { state } = useLifeFlow();
  const rawTier  = state.subscriptionTier ?? 'free';
  const tier     = (rawTier in SUBSCRIPTION_TIERS ? rawTier : 'free') as SubscriptionTier;
  const tierInfo = SUBSCRIPTION_TIERS[tier];
  const expiresAt = state.subscriptionExpiresAt ?? null;

  const isExpiringSoon = (() => {
    if (!expiresAt) return false;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  })();

  return {
    tier,
    tierInfo,
    expiresAt,
    isPremium:       tier !== 'free',
    isPolarisUser:   ['polaris', 'premium_plus'].includes(tier),
    isGrowthPlayers: tier === 'growthplayers',
    isExpiringSoon,
    canAccessMentor: true,
  };
}
