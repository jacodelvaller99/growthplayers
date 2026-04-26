import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { palette } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';

export default function Index() {
  const { isLoaded, state } = useLifeFlow();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.black }}>
        <ActivityIndicator color={palette.gold} />
      </View>
    );
  }

  return <Redirect href={state.onboardingCompleted ? '/(tabs)/comando' : '/(onboarding)'} />;
}
