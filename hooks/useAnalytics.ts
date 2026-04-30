/**
 * useAnalytics — wraps the analytics singleton with user identity.
 * Call this once at app root to inject the authenticated userId.
 */
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { analytics } from '@/lib/analytics';

interface UseAnalyticsOptions {
  userId: string | null;
  mlConsent?: boolean;
}

export function useAnalytics({ userId, mlConsent = true }: UseAnalyticsOptions) {
  const appOpenMs = useRef<number>(Date.now());
  const appStateRef = useRef<AppStateStatus>('active');

  useEffect(() => {
    if (userId) {
      analytics.setUser(userId, mlConsent);
      analytics.appOpen('direct');
      appOpenMs.current = Date.now();
    }
  }, [userId, mlConsent]);

  useEffect(() => {
    analytics.setConsent(mlConsent);
  }, [mlConsent]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState === 'background' || nextState === 'inactive') {
        if (prev === 'active') {
          const durationMs = Date.now() - appOpenMs.current;
          analytics.appBackground(durationMs);
        }
      } else if (nextState === 'active' && prev !== 'active') {
        appOpenMs.current = Date.now();
        analytics.appOpen('direct');
      }
    });
    return () => sub.remove();
  }, []);

  return analytics;
}
