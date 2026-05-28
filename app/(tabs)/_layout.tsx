import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Redirect, Tabs, useSegments } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { WellnessMiniPlayer } from '@/components/WellnessMiniPlayer';
import { Colors, Fonts, palette } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { analytics } from '@/lib/analytics';

type TabIcon = React.ComponentProps<typeof MaterialIcons>['name'];

/**
 * Custom tab bar icon with:
 * - 20px icon (spec: 20px, stroke mono)
 * - 2px gold line indicator above the icon when active
 * - Active: ivory icon; Inactive: #555 (muted)
 */
function TabBarIcon({
  color,
  name,
  focused,
}: {
  color: string;
  name: TabIcon;
  focused: boolean;
}) {
  return (
    <View style={tabStyles.wrap}>
      {focused && <View style={tabStyles.indicator} />}
      <MaterialIcons name={name} size={20} color={focused ? palette.ivory : palette.smoke} />
    </View>
  );
}

const tabStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
    width: 52,
    minHeight: 44,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 20,
    height: 2,
    backgroundColor: palette.gold,
    borderRadius: 1,
  },
});

export function BottomNavigation() {
  const insets = useSafeAreaInsets();
  const { isDesktop } = useBreakpoint();
  const tabBarHeight = 56 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Active tint passes to icon — overridden inside TabBarIcon
        tabBarActiveTintColor: palette.ivory,
        tabBarInactiveTintColor: palette.smoke,
        tabBarButton: HapticTab,
        tabBarLabelStyle: {
          fontFamily: Fonts.display,
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: palette.blackDeep,
          borderTopColor: palette.lineSoft,
          borderTopWidth: 1,
          height: isDesktop ? 0 : tabBarHeight,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
          // Hidden on desktop — navigation via DesktopSidebar
          display: isDesktop ? 'none' : 'flex',
          ...(Platform.OS === 'web' ? { boxShadow: '0 -2px 16px rgba(0,0,0,0.4)' } as any : {}),
        },
      }}>
      <Tabs.Screen
        name="comando"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => <TabBarIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="norte"
        options={{
          title: 'Norte',
          tabBarIcon: ({ color, focused }) => <TabBarIcon name="explore" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="programas"
        options={{
          title: 'Programa',
          tabBarIcon: ({ color, focused }) => <TabBarIcon name="menu-book" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="mentor"
        options={{
          title: 'Mentor',
          tabBarIcon: ({ color, focused }) => <TabBarIcon name="chat-bubble-outline" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="progreso"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => <TabBarIcon name="person-outline" color={color} focused={focused} />,
        }}
      />
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
