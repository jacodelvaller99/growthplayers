import { Inter_400Regular, Inter_700Bold, useFonts as useInterFonts } from '@expo-google-fonts/inter';
import { SpaceGrotesk_700Bold, useFonts as useSpaceGroteskFonts } from '@expo-google-fonts/space-grotesk';
import { SpaceMono_400Regular, useFonts as useSpaceMonoFonts } from '@expo-google-fonts/space-mono';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { LifeFlowProvider } from '@/hooks/use-lifeflow';
import { Colors } from '@/constants/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Override DarkTheme with Sovereign Protocol colors
const SovereignTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.tint,
    background: Colors.dark.background,
    card: Colors.dark.surface,
    text: Colors.dark.text,
    border: Colors.dark.border,
    notification: Colors.dark.tint,
  },
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [interLoaded] = useInterFonts({ Inter_400Regular, Inter_700Bold });
  const [spaceGroteskLoaded] = useSpaceGroteskFonts({ SpaceGrotesk_700Bold });
  const [spaceMonoLoaded] = useSpaceMonoFonts({ SpaceMono_400Regular });
  const fontsLoaded = interLoaded && spaceGroteskLoaded && spaceMonoLoaded;

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={SovereignTheme}>
      <LifeFlowProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen name="checkin" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="module/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'System Modal' }} />
        </Stack>
        <StatusBar style="light" />
      </LifeFlowProvider>
    </ThemeProvider>
  );
}
