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
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { Colors, palette } from '@/constants/theme';
import OfflineBanner from '@/components/OfflineBanner';
import PWAInstallBanner from '@/components/PWAInstallBanner';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { ToastProvider } from '@/context/ToastContext';
import { AppThemeProvider } from '@/hooks/use-app-theme';
import { AppModeProvider } from '@/hooks/use-app-mode';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { HeroMoments } from '@/components/hero-moments';
import { TourButton } from '@/components/tour/TourButton';
import { initCrashCapture } from '@/lib/crash';

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
  // Guard de auth para TODA ruta privada (deep links incluidos). `!isLoaded`
  // mantiene montado el destino durante la carga de sesión para no eyectar
  // deep links de notificaciones; al resolver sin sesión, Protected desmonta
  // → anchor (tabs) → su propio guard → /(auth). Sin loops: (auth),
  // (onboarding), legal, pricing y oauth callbacks quedan fuera del bloque.
  const { isLoaded, isAuthenticated, state } = useLifeFlow();
  const guard = !isLoaded || (isAuthenticated && state.onboardingCompleted);
  // La app "respira": transiciones sobrias entre pantallas en vez del corte
  // seco de siempre (WCAG 2.3.3 — 'none' con reduce-motion, cada pantalla
  // sigue pudiendo pedir la suya vía `options.animation`, como ya hacen
  // checkin/paywall con su slide_from_bottom de modal).
  const reducedMotion = useReducedMotion();

  return (
    <Stack screenOptions={{ animation: reducedMotion ? 'none' : 'fade_from_bottom' }}>
      {/* ── Públicas ── */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
      <Stack.Screen name="legal/privacidad" options={{ headerShown: false }} />
      <Stack.Screen name="legal/terminos" options={{ headerShown: false }} />
      <Stack.Screen name="legal/salud" options={{ headerShown: false }} />
      <Stack.Screen name="pricing" options={{ headerShown: false }} />
      <Stack.Screen name="oauth/whoop/callback" options={{ headerShown: false }} />
      <Stack.Screen name="oauth/oura/callback"  options={{ headerShown: false }} />

      {/* ── Privadas — requieren sesión + onboarding completo ── */}
      <Stack.Protected guard={guard}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="checkin" options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: true }} />
        <Stack.Screen name="ritual" options={{ headerShown: false }} />
        <Stack.Screen name="mentoria/index" options={{ headerShown: false }} />
        <Stack.Screen name="paywall" options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: true }} />
        <Stack.Screen name="module/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="lesson/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="bienestar/index" options={{ headerShown: false }} />
        <Stack.Screen name="bienestar/body-context" options={{ headerShown: false }} />
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
        <Stack.Screen name="comunidad/mensajes" options={{ headerShown: false }} />
        <Stack.Screen name="comunidad/chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="comunidad/index" options={{ headerShown: false }} />
        <Stack.Screen name="comunidad/conexiones" options={{ headerShown: false }} />
        <Stack.Screen name="comunidad/perfil/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="comunidad/espacios/index" options={{ headerShown: false }} />
        <Stack.Screen name="comunidad/espacios/crear" options={{ headerShown: false }} />
        <Stack.Screen name="comunidad/espacios/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="comunidad/eventos/index" options={{ headerShown: false }} />
        <Stack.Screen name="comunidad/eventos/crear" options={{ headerShown: false }} />
        <Stack.Screen name="comunidad/eventos/[id]" options={{ headerShown: false }} />
        {/* Cuatro que faltaban. `movimiento` es el destino de la práctica de
            espalda del mapa corporal, e `internista`/`examenes` tocan PHI —
            exámenes médicos subidos por el usuario. Estar fuera de este bloque
            significa que un deep link sin sesión las renderiza. */}
        <Stack.Screen name="bienestar/movimiento" options={{ headerShown: false }} />
        <Stack.Screen name="bienestar/escaneo" options={{ headerShown: false }} />
        <Stack.Screen name="bienestar/internista" options={{ headerShown: false }} />
        <Stack.Screen name="bienestar/examenes" options={{ headerShown: false }} />
        <Stack.Screen name="bienestar/grito" options={{ headerShown: false }} />
        <Stack.Screen name="bienestar/tapping" options={{ headerShown: false }} />
        <Stack.Screen name="bienestar/consciencia" options={{ headerShown: false }} />
        <Stack.Screen name="perfil/index" options={{ headerShown: false }} />
        <Stack.Screen name="perfil/cliente" options={{ headerShown: false }} />
        <Stack.Screen name="perfil/wearables" options={{ headerShown: false }} />
        {/* Ajustes de apariencia: es una pantalla del USUARIO. Se creó sin
            registrarla aquí y quedaba accesible sin sesión — no filtraba datos
            (solo lee localStorage) pero rompía la regla. */}
        <Stack.Screen name="perfil/apariencia" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="admin/index" options={{ headerShown: false }} />
        <Stack.Screen name="admin/usuarios/index" options={{ headerShown: false }} />
        <Stack.Screen name="admin/usuarios/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="admin/membresias/index" options={{ headerShown: false }} />
        <Stack.Screen name="admin/cursos/index" options={{ headerShown: false }} />
        <Stack.Screen name="admin/codigos/index" options={{ headerShown: false }} />
        <Stack.Screen name="admin/inteligencia/index" options={{ headerShown: false }} />
        <Stack.Screen name="admin/memoria" options={{ headerShown: false }} />
        <Stack.Screen name="admin/mentores/ejecucion" options={{ headerShown: false }} />
        <Stack.Screen name="admin/biometria" options={{ headerShown: false }} />
        <Stack.Screen name="admin/contenido/index" options={{ headerShown: false }} />
        <Stack.Screen name="admin/auditoria/index" options={{ headerShown: false }} />
        <Stack.Screen name="admin/comunidad/index" options={{ headerShown: false }} />
      </Stack.Protected>
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
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: palette.black }}>
        <DesktopSidebar />
        <View style={{ flex: 1, backgroundColor: palette.black }}>
          <MainStack />
          <StatusBar style="light" />
        </View>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: palette.black }}>
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

  // Captura global de crashes (no-render): web error/unhandledrejection,
  // nativo ErrorUtils. Complementa al ErrorBoundary (que solo ve crashes de render).
  useEffect(() => {
    initCrashCapture();
  }, []);

  // Register SW directly — useEffect already defers past page load,
  // so window.addEventListener('load',...) would be a no-op (event already fired)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  }, []);

  // Deep-link on notification tap: read the target route from the notification
  // payload (data.route / data.screen) and navigate there. Falls back to the
  // daily check-in. Enables habit reminders (WS-4) and smart-notifications to
  // open the exact practice. (WS-7)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let sub: { remove: () => void } | null = null;
    // `configureNotificationHandler` existía con CERO llamadores: sin él, una
    // notificación que llega con la app en primer plano no se muestra (expo
    // la entrega al handler, y sin handler configurado no hay banner). El
    // recordatorio de las 7:00 se perdía justo para quien ya tenía la app
    // abierta.
    import('@/services/notifications').then((N) => { N.configureNotificationHandler(); });
    import('expo-notifications').then((N) => {
      sub = N.addNotificationResponseReceivedListener((response) => {
        const data = response?.notification?.request?.content?.data as
          | { route?: unknown; screen?: unknown }
          | undefined;
        const target = data?.route ?? data?.screen;
        const route = typeof target === 'string' && target.startsWith('/') ? target : '/checkin';
        router.push(route as never);
      });
    });
    return () => { sub?.remove(); };
  }, [router]);

  if (!ready) {
    return null;
  }

  return (
    <ErrorBoundary>
      <AppThemeProvider>
        <AppModeProvider>
          <ThemeProvider value={SovereignTheme}>
            <LifeFlowProvider>
              <ToastProvider>
              <AnalyticsInitializer />
              <SmartNotificationsInitializer />
              <OfflineBanner />
              <PWAInstallBanner />
              <HeroMoments />
              <TourButton />
              {/* AppShell handles sidebar visibility based on route (hides on auth/onboarding) */}
              <AppShell />
              </ToastProvider>
            </LifeFlowProvider>
          </ThemeProvider>
        </AppModeProvider>
      </AppThemeProvider>
    </ErrorBoundary>
  );
}
