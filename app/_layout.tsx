import { Inter_400Regular, Inter_700Bold, useFonts as useInterFonts } from '@expo-google-fonts/inter';
import { Michroma_400Regular, useFonts as useMichromaFonts } from '@expo-google-fonts/michroma';
import { SpaceMono_400Regular, useFonts as useSpaceMonoFonts } from '@expo-google-fonts/space-mono';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { LifeFlowProvider, useLifeFlow } from '@/hooks/use-lifeflow';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Colors } from '@/constants/theme';
import OfflineBanner from '@/components/OfflineBanner';
import PWAInstallBanner from '@/components/PWAInstallBanner';
import { ToastProvider } from '@/context/ToastContext';

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

// ─── Analytics initializer (inside LifeFlowProvider tree) ────────────────────
function AnalyticsInitializer() {
  const { userId, state } = useLifeFlow();
  useAnalytics({ userId, mlConsent: state.profile.mlConsent !== false });
  return null;
}

export default function RootLayout() {
  const router = useRouter();

  // ── On web, fonts are loaded via Google Fonts <link> tags in +html.tsx.
  // The @expo-google-fonts useFonts() tries to load binary files from
  // /assets/node_modules/... which are NOT present in the Vercel static export,
  // causing a permanent black screen. Skip useFonts entirely on web.
  const isWeb = Platform.OS === 'web';

  const [interLoaded, interError]         = useInterFonts(isWeb ? {} : { Inter_400Regular, Inter_700Bold });
  const [michromaLoaded, michromaError]   = useMichromaFonts(isWeb ? {} : { Michroma_400Regular });
  const [spaceMonoLoaded, spaceMonoError] = useSpaceMonoFonts(isWeb ? {} : { SpaceMono_400Regular });

  // A font is "done" when loaded OR errored (fall back to system/CSS fonts).
  const fontsDone = isWeb
    ? true
    : (interLoaded    || !!interError)    &&
      (michromaLoaded || !!michromaError) &&
      (spaceMonoLoaded || !!spaceMonoError);

  // Hard timeout: render after 4 s regardless — no failure can permanently block the app.
  const [timedOut, setTimedOut] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (fontsDone) return; // already ready, no need for timeout
    timeoutRef.current = setTimeout(() => setTimedOut(true), 4000);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [fontsDone]);

  const ready = fontsDone || timedOut;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  // Register Service Worker for PWA (web only)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    });
  }, []);

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

  if (!ready) {
    return null;
  }

  return (
    <ThemeProvider value={SovereignTheme}>
      <LifeFlowProvider>
        <ToastProvider>
        <AnalyticsInitializer />
        <OfflineBanner />
        <PWAInstallBanner />
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
          <Stack.Screen name="module/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="lesson/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="bienestar" options={{ headerShown: false }} />
          <Stack.Screen name="admin" options={{ headerShown: false }} />
          <Stack.Screen name="admin/index" options={{ headerShown: false }} />
          <Stack.Screen name="admin/usuarios/index" options={{ headerShown: false }} />
          <Stack.Screen name="admin/usuarios/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="admin/membresias/index" options={{ headerShown: false }} />
          <Stack.Screen name="admin/cursos/index" options={{ headerShown: false }} />
          <Stack.Screen name="admin/codigos/index" options={{ headerShown: false }} />
          <Stack.Screen name="admin/inteligencia/index" options={{ headerShown: false }} />
          <Stack.Screen name="admin/contenido/index" options={{ headerShown: false }} />
          <Stack.Screen name="admin/auditoria/index" options={{ headerShown: false }} />
          <Stack.Screen name="pricing" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="light" />
        </ToastProvider>
      </LifeFlowProvider>
    </ThemeProvider>
  );
}
