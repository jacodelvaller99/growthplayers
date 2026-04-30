import { Redirect } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { palette } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';

export default function Index() {
  const { isLoaded, isAuthenticated, state } = useLifeFlow();

  // Show LIFEFLOW splash while the hook initialises (getSession + loadUserData)
  if (!isLoaded) {
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

  if (!isAuthenticated) {
    return <Redirect href={'/(auth)' as never} />;
  }

  return (
    <Redirect href={state.onboardingCompleted ? '/(tabs)/comando' : '/(onboarding)'} />
  );
}
