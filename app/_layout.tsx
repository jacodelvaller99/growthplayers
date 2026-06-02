import { Inter_400Regular, Inter_700Bold, useFonts as useInterFonts } from '@expo-google-fonts/inter';
import { SpaceMono_400Regular, useFonts as useSpaceMonoFonts } from '@expo-google-fonts/space-mono';
import { useFonts as useLocalFonts } from 'expo-font';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { Stack, useRouter, useSegments } from 'expo-router';
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
import { AppThemeProvider } from '@/hooks/use-app-theme';

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
      <Stack.Screen name="bienestar/index" options={{ headerShown: false }} />
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
      <Stack.Screen name="bienestar/grito" options={{ headerShown: false }} />
      <Stack.Screen name="bienestar/tapping" options={{ headerShown: false }} />
      <Stack.Screen name="bienestar/consciencia" options={{ headerShown: false }} />
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
      <Stack.Screen name="oauth/whoop/callback" options={{ headerShown: false }} />
      <Stack.Screen name="oauth/oura/callback"  options={{ headerShown: false }} />
    </Stack>
  );
}

// ─── AppShell — sidebar visibility based on current route ────────────────────
// Must be a child component so useSegments() runs inside the navigation tree.
function AppShell() {
  const { isDesktop } = useBreakpoint();
  const segments = useSegments();

  // Hide sidebar during auth and onboarding flows for full-focus immersion.
  const isImmersive =
    (segments as string[])[0] === '(auth)' ||
    (segments as string[])[0] === '(onboarding)';
  const showSidebar = Platform.OS === 'web' && isDesktop && !isImmersive;

  if (showSidebar) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#080808' }}>
        <DesktopSidebar />
        <View style={{ flex: 1, backgroundColor: '#080808' }}>
          <MainStack />
          <StatusBar style="light" />
        </View>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: '#080808' }}>
      <MainStack />
      <StatusBar style="light" />
    </View>
  );
}

export default function RootLayout() {
  const router = useRouter();

  // ── On web, fonts are loaded via Google Fonts <link> tags in +html.tsx.
  // The @expo-google-fonts useFonts() tries to load binary files from
  // /assets/node_modules/... which are NOT present in the Vercel static export,
  // causing a permanent black screen. Skip useFonts entirely on web.
  const isWeb = Platform.OS === 'web';

  const [interLoaded, interError]         = useInterFonts(isWeb ? {} : { Inter_400Regular, Inter_700Bold });
  const [spaceMonoLoaded, spaceMonoError] = useSpaceMonoFonts(isWeb ? {} : { SpaceMono_400Regular });
  // GrandisExtended — brand font from Manual de Marca Polaris (Orgánico Studio 2024)
  const [grandisLoaded, grandisError]     = useLocalFonts(isWeb ? {} : {
    'GrandisExtended-Black':   require('../assets/fonts/GrandisExtended-Black.ttf'),
    'GrandisExtended-Bold':    require('../assets/fonts/GrandisExtended-Bold.ttf'),
    'GrandisExtended-Medium':  require('../assets/fonts/GrandisExtended-Medium.ttf'),
    'GrandisExtended-Regular': require('../assets/fonts/GrandisExtended-Regular.ttf'),
    'GrandisExtended-Light':   require('../assets/fonts/GrandisExtended-Light.ttf'),
  });

  // A font is "done" when loaded OR errored (fall back to system/CSS fonts).
  const fontsDone = isWeb
    ? true
    : (interLoaded    || !!interError)    &&
      (grandisLoaded  || !!grandisError)  &&
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
    <AppThemeProvider>
      <ThemeProvider value={SovereignTheme}>
        <LifeFlowProvider>
          <ToastProvider>
          <AnalyticsInitializer />
          <SmartNotificationsInitializer />
          <OfflineBanner />
          <PWAInstallBanner />
          {/* AppShell handles sidebar visibility based on route (hides on auth/onboarding) */}
          <AppShell />
          </ToastProvider>
        </LifeFlowProvider>
      </ThemeProvider>
    </AppThemeProvider>
  );
}
