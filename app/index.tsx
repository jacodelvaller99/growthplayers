import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { palette } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { readLocal } from '@/storage/local';
import type { LifeFlowState } from '@/types/lifeflow';

export default function Index() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Verificar si el usuario ya completó el onboarding (lectura local rápida)
        readLocal<LifeFlowState>('state')
          .then((local) => {
            if (local?.onboardingCompleted) {
              router.replace('/(tabs)/comando');
            } else {
              router.replace('/(onboarding)');
            }
          })
          .catch(() => {
            router.replace('/(tabs)/comando');
          })
          .finally(() => setChecking(false));
      } else {
        router.replace('/(auth)');
        setChecking(false);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!checking) return null;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.black,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
      }}>
      <Text
        style={{
          color: palette.gold,
          fontSize: 28,
          letterSpacing: 6,
          fontWeight: '700',
        }}>
        LIFEFLOW
      </Text>
      <ActivityIndicator color={palette.gold} size="large" />
    </View>
  );
}
