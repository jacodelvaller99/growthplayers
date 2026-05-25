import { Redirect } from 'expo-router';

import { HomeSkeleton } from '@/components/HomeSkeleton';
import { useLifeFlow } from '@/hooks/use-lifeflow';

export default function Index() {
  const { isLoaded, isAuthenticated, state } = useLifeFlow();

  // Show skeleton while auth resolves (getSession from localStorage — typically < 100ms).
  // With two-phase init, returning users hit isLoaded=true almost instantly.
  if (!isLoaded) {
    return <HomeSkeleton />;
  }

  if (!isAuthenticated) {
    // Welcome screen first — cinematic brand entry before login/register form.
    return <Redirect href={'/(auth)/welcome' as never} />;
  }

  return (
    <Redirect href={state.onboardingCompleted ? '/(tabs)/comando' : '/(onboarding)'} />
  );
}
