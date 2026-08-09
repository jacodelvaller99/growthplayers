import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { HomeSkeleton } from '@/components/HomeSkeleton';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { localDateKey } from '@/lib/jornadaLogic';
import { needsRitual, RITUAL_LOG_KEY, type RitualLog } from '@/lib/ritualLogic';
import { readLocal } from '@/storage/local';

export default function Index() {
  const { isLoaded, isAuthenticated, state } = useLifeFlow();
  const readyForRitual = isLoaded && isAuthenticated && state.onboardingCompleted;
  const [mustRitual, setMustRitual] = useState<boolean | null>(null);

  // Umbral diario: primera apertura del día → /ritual antes del dashboard.
  // Solo se consulta una vez que sabemos que va a haber sesión + onboarding
  // completo (los otros dos destinos no lo necesitan).
  useEffect(() => {
    if (!readyForRitual) return;
    let cancelled = false;
    readLocal<RitualLog>(RITUAL_LOG_KEY)
      .then((log) => { if (!cancelled) setMustRitual(needsRitual(localDateKey(new Date()), log)); })
      .catch(() => { if (!cancelled) setMustRitual(false); });
    return () => { cancelled = true; };
  }, [readyForRitual]);

  // Show skeleton while auth resolves (getSession from localStorage — typically < 100ms).
  // With two-phase init, returning users hit isLoaded=true almost instantly.
  if (!isLoaded || (readyForRitual && mustRitual === null)) {
    return <HomeSkeleton />;
  }

  if (!isAuthenticated) {
    // Welcome screen first — cinematic brand entry before login/register form.
    return <Redirect href={'/(auth)/welcome' as never} />;
  }

  if (!state.onboardingCompleted) {
    return <Redirect href={'/(onboarding)' as never} />;
  }

  return <Redirect href={(mustRitual ? '/ritual' : '/(tabs)/comando') as never} />;
}
