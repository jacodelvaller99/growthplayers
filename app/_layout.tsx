import { Inter_400Regular, Inter_700Bold, useFonts as useInterFonts } from '@expo-google-fonts/inter';
import { Michroma_400Regular, useFonts as useMichromaFonts } from '@expo-google-fonts/michroma';
import { SpaceMono_400Regular, useFonts as useSpaceMonoFonts } from '@expo-google-fonts/space-mono';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import 'react-native-reanimated';

import { LifeFlowProvider, useLifeFlow } from '@/hooks/use-lifeflow';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useSmartNotifications } from '@/hooks/use-smart-notifications';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { Colors } from '@/constants/theme';
import OfflineBanner from '@/components/OfflineBanner';
import PWAInstallBanner from '@/components/PWAInstallBanner';
import { DesktopSidebar } from '@/components/DesktopSidebar';
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

// ─── Smart notifications initializer ─────────────────────────────────────────
function SmartNotificationsInitializer() {
  useSmartNotifications();
  return null;
}

function MainStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
      <Stack.Screen name="checkin" options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: true }} />
      <Stack.Screen name="paywall" options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: true }} />
      <Stack.Screen name="module/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="lesson/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="bienestar" options={{ headerShown: false }} />
      <Stack.Screen name="bienestar/binaurales" options={{ headerShown: false }} />
      <Stack.Screen name="bienestar/meditacion" options={{ headerShown: false }} />
      <Stack.Screen name="bienestar/respiracion" options={{ headerShown: false }} />
      <Stack.Screen name="bienestar/sueno" options={{ headerShown: false }} />
      <Stack.Screen name="bienestar/diario" options={{ headerShown: false }} />
      <Stack.Screen name="bienestar/biblioteca" options={{ headerShown: false }} />
      <Stack.Screen name="bienestar/biometrics" options={{ headerShown: false }} />
      <Stack.Screen name="bienestar/habitos" options={{ headerShown: false }} />
      <Stack.Screen name="bienestar/ayuno" options={{ headerShown: false }} />
      <Stack.Screen name="bienestar/nutricion" options={{ headerShown: false }} />
      <Stack.Screen name="bienestar/cuerpo" options={{ headerShown: false }} />
      <Stack.Screen name="bienestar/suplementacion" options={{ headerShown: false }} />
      <Stack.Screen name="bienestar/comunidad" options={{ headerShown: false }} />
      <Stack.Screen name="perfil/wearables" options={{ headerShown: false }} />
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
  );
}

export default function RootLayout() {
  const router = useRouter();
  const { isDesktop } = useBreakpoint();

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

  // Register SW directly — useEffect already defers past page load,
  // so window.addEventListener('load',...) would be a no-op (event already fired)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
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
        <SmartNotificationsInitializer />
        <OfflineBanner />
        <PWAInstallBanner />
        {Platform.OS === 'web' && isDesktop ? (
          /* ── Desktop: sidebar fijo + contenido full-width ── */
          <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#080808' }}>
            <DesktopSidebar />
            <View style={{ flex: 1, backgroundColor: '#080808' }}>
              <MainStack />
              <StatusBar style="light" />
            </View>
          </View>
        ) : (
          /* ── Mobile / nativo: sin cambios ── */
          <View style={{ flex: 1 }}>
            <MainStack />
            <StatusBar style="light" />
          </View>
        )}
        </ToastProvider>
      </LifeFlowProvider>
    </ThemeProvider>
  );
}
