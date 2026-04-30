/**
 * useUserIntelligence — reads user_intelligence with Realtime subscription.
 * Returns live ML scores: engagement, churn, next action, anomaly, affinities.
 */
import { useEffect, useState, useCallback } from 'react';
import { supabase, intel } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserIntelligence {
  // Engagement & Churn
  engagement_score:     number;
  churn_risk:           number;
  churn_risk_label:     'low' | 'medium' | 'high' | 'critical';
  days_since_last_act:  number;
  predicted_churn_date: string | null;

  // Behavioral DNA
  preferred_time:       'morning' | 'afternoon' | 'evening' | 'night' | null;
  preferred_duration:   number | null;
  dominant_module:      string | null;
  dominant_tool:        string | null;

  // Content Affinity (0–1)
  affinity_binaural:    number;
  affinity_breathing:   number;
  affinity_meditation:  number;
  affinity_journaling:  number;
  affinity_lessons:     number;
  affinity_mentor:      number;

  // Next Best Action
  next_action:          string | null;
  next_action_reason:   string | null;
  next_action_urgency:  'low' | 'normal' | 'high' | 'urgent';

  // Anomaly
  anomaly_detected:     boolean;
  anomaly_type:         string | null;
  anomaly_detected_at:  string | null;

  // Cohort
  cohort_id:            number | null;
  cohort_label:         string | null;

  last_calculated_at:   string;
}

const DEFAULT_INTELLIGENCE: UserIntelligence = {
  engagement_score:     0,
  churn_risk:           0,
  churn_risk_label:     'low',
  days_since_last_act:  0,
  predicted_churn_date: null,
  preferred_time:       null,
  preferred_duration:   null,
  dominant_module:      null,
  dominant_tool:        null,
  affinity_binaural:    0,
  affinity_breathing:   0,
  affinity_meditation:  0,
  affinity_journaling:  0,
  affinity_lessons:     0,
  affinity_mentor:      0,
  next_action:          null,
  next_action_reason:   null,
  next_action_urgency:  'normal',
  anomaly_detected:     false,
  anomaly_type:         null,
  anomaly_detected_at:  null,
  cohort_id:            null,
  cohort_label:         null,
  last_calculated_at:   new Date().toISOString(),
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useUserIntelligence(userId: string | null) {
  const [intelligence, setIntelligence] = useState<UserIntelligence>(DEFAULT_INTELLIGENCE);
  const [isLoading, setIsLoading]       = useState(true);

  const fetch = useCallback(async (uid: string) => {
    setIsLoading(true);
    const { data, error } = await intel.intelligence()
      .select('*')
      .eq('user_id', uid)
      .single();

    if (data && !error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setIntelligence(data as unknown as UserIntelligence);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!userId) { setIsLoading(false); return; }

    fetch(userId);

    // Realtime subscription: update UI whenever the engine recalculates
    const channel = supabase
      .channel(`intelligence:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_intelligence',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setIntelligence(payload.new as unknown as UserIntelligence);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, fetch]);

  // ── Derived helpers ──────────────────────────────────────────────────────────

  const topAffinity = (() => {
    const affinities = {
      binaural:   intelligence.affinity_binaural,
      breathing:  intelligence.affinity_breathing,
      meditation: intelligence.affinity_meditation,
      journaling: intelligence.affinity_journaling,
      lessons:    intelligence.affinity_lessons,
      mentor:     intelligence.affinity_mentor,
    };
    return Object.entries(affinities).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'lessons';
  })();

  const engagementTier = (() => {
    const s = intelligence.engagement_score;
    if (s >= 75) return 'excellent';
    if (s >= 50) return 'good';
    if (s >= 25) return 'fair';
    return 'low';
  })();

  return {
    intelligence,
    isLoading,
    topAffinity,
    engagementTier,
    refetch: () => userId && fetch(userId),
  };
}
