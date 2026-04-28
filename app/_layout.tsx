import { Inter_400Regular, Inter_700Bold, useFonts as useInterFonts } from '@expo-google-fonts/inter';
import { Michroma_400Regular, useFonts as useMichromaFonts } from '@expo-google-fonts/michroma';
import { SpaceMono_400Regular, useFonts as useSpaceMonoFonts } from '@expo-google-fonts/space-mono';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
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
  const router = useRouter();
  const [interLoaded] = useInterFonts({ Inter_400Regular, Inter_700Bold });
  const [michromaLoaded] = useMichromaFonts({ Michroma_400Regular }); // brand font: Grandis Extended → Michroma
  const [spaceMonoLoaded] = useSpaceMonoFonts({ SpaceMono_400Regular });
  const fontsLoaded = interLoaded && michromaLoaded && spaceMonoLoaded;

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Navigate to check-in when user taps the daily reminder notification
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let sub: { remove: () => void } | null = null;
    import('expo-notifications').then((N) => {
      sub = N.addNotificationResponseReceivedListener(() => {
        router.push('/checkin' as never);
      });
    });
    return () => { sub?.remove(); };
  }, [router]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={SovereignTheme}>
      <LifeFlowProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen
            name="checkin"
            options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: true }}
          />
          <Stack.Screen
            name="paywall"
            options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: true }}
          />
          <Stack.Screen
            name="respiracion"
            options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: true }}
          />
          <Stack.Screen name="module/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="lesson/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'System Modal' }} />
        </Stack>
        <StatusBar style="light" />
      </LifeFlowProvider>
    </ThemeProvider>
  );
}
