import { BlurView } from 'expo-blur';
import { Redirect, Tabs, useSegments } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { WellnessMiniPlayer } from '@/components/WellnessMiniPlayer';
import { CHROME_MAX_SCALE, Colors, Fonts, palette } from '@/constants/theme';
import { alpha } from '@/constants/themeColors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { analytics } from '@/lib/analytics';

/**
 * Barra de abajo del rediseño: solo texto, en la letra de marca. La pestaña
 * activa va en el color de acento con una línea corta encima. Cuatro destinos
 * (decisión del dueño, 2026-11-04): Hoy, Norman, Progreso y Yo. Norte y
 * Programa siguen siendo rutas — se abren desde Hoy y desde Yo.
 */
function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={tabStyles.wrap}>
      {focused && <View style={tabStyles.indicator} />}
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={CHROME_MAX_SCALE}
        style={[tabStyles.label, { color: focused ? palette.goldText : palette.smoke }]}>
        {label}
      </Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingHorizontal: 4 },
  indicator: { position: 'absolute', top: 0, width: 20, height: 2, backgroundColor: palette.gold, borderRadius: 1 },
  label: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
});

export function BottomNavigation() {
  const insets = useSafeAreaInsets();
  const { isDesktop } = useBreakpoint();
  const { mode } = useAppTheme();
  // 60 y no 56: el relleno (8 arriba + 6 abajo, sin contar el área segura) se
  // come 14px, así que con 56 cada pestaña quedaba en 41px de zona pulsable —
  // por debajo del mínimo de 44. Medido en el DOM a 390px, en las 25 apariciones
  // (5 pestañas × 5 pantallas). Es la navegación principal de la app: el
  // objetivo que más se pulsa era el que peor cumplía.
  // Y 70, no 60: react-navigation pone 5+5 de padding dentro de cada botón
  // (no se puede pisar) y reserva 28 al ícono; con 60 a la etiqueta le
  // quedaban 5px y "Inicio", "Norte"… salían cortadas en el celular.
  const tabBarHeight = 60 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Active tint passes to icon — overridden inside TabBarIcon
        tabBarActiveTintColor: palette.ivory,
        tabBarInactiveTintColor: palette.smoke,
        tabBarButton: HapticTab,
        // Sin mayúsculas forzadas ni tracking ancho: en versalitas con 1.5 de
        // tracking, GrandisExtended (una cara ancha) truncaba a 390pt
        // («PROGRA», «PERFI»). En caja normal caben las 5 a 375pt.
        // maxFontSizeMultiplier: la barra tiene alto fijo (60 + safe area);
        // Dynamic Type escala hasta 1.3× sin romperla.
        tabBarShowLabel: false,
        tabBarIconStyle: { width: '100%', height: 44 },
        // Chrome estructural con material (audit "Fluidez Polaris" §Fase 5):
        // antes backgroundColor opaco. El fondo semi-transparente + blur da
        // jerarquía de peso — el contenido que scrollea debajo se insinúa en
        // vez de cortar en seco. `borderTopWidth` se conserva pero más suave
        // (0.5 vs 1): el blur ya es la señal principal de separación.
        tabBarStyle: {
          backgroundColor: alpha(palette.blackDeep, '99'),
          borderTopColor: palette.lineSoft,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: isDesktop ? 0 : tabBarHeight,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
          // Hidden on desktop — navigation via DesktopSidebar
          display: isDesktop ? 'none' : 'flex',
          ...(Platform.OS === 'web' ? { boxShadow: '0 -2px 16px rgba(0,0,0,0.4)' } as any : {}),
        },
        tabBarBackground: () => (
          <BlurView
            intensity={80}
            tint={mode === 'light' ? 'light' : 'dark'}
            style={StyleSheet.absoluteFill}
          />
        ),
      }}>
      <Tabs.Screen
        name="comando"
        options={{ title: 'Hoy', tabBarIcon: ({ focused }) => <TabLabel label="HOY" focused={focused} /> }}
      />
      <Tabs.Screen
        name="mentor"
        options={{ title: 'Norman', tabBarIcon: ({ focused }) => <TabLabel label="NORMAN" focused={focused} /> }}
      />
      <Tabs.Screen
        name="progreso"
        options={{ title: 'Progreso', tabBarIcon: ({ focused }) => <TabLabel label="PROGRESO" focused={focused} /> }}
      />
      <Tabs.Screen
        name="yo"
        options={{ title: 'Yo', tabBarIcon: ({ focused }) => <TabLabel label="YO" focused={focused} /> }}
      />
      <Tabs.Screen name="norte" options={{ href: null, title: 'Norte' }} />
      <Tabs.Screen name="programas" options={{ href: null, title: 'Programa' }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}

export default function TabLayout() {
  const { isLoaded, isAuthenticated, state } = useLifeFlow();
  const segments = useSegments();
  const prevScreen = useRef<string | null>(null);

  // Track tab screen views
  useEffect(() => {
    const screenName = segments[segments.length - 1] ?? 'unknown';
    if (screenName !== prevScreen.current) {
      prevScreen.current = screenName;
      analytics.screenView(screenName);
    }
  }, [segments]);

  if (isLoaded && !isAuthenticated) {
    return <Redirect href={'/(auth)' as never} />;
  }

  if (isLoaded && !state.onboardingCompleted) {
    return <Redirect href="/(onboarding)" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <BottomNavigation />
      <WellnessMiniPlayer />
    </View>
  );
}
