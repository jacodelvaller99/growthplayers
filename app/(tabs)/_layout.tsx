import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { WellnessMiniPlayer } from '@/components/WellnessMiniPlayer';
import { Colors, Fonts, palette } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';

type TabIcon = React.ComponentProps<typeof MaterialIcons>['name'];

function TabBarIcon({ color, name }: { color: string; name: TabIcon }) {
  return <MaterialIcons name={name} size={24} color={color} />;
}

export function BottomNavigation() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.dark.tabIconSelected,
        tabBarInactiveTintColor: Colors.dark.tabIconDefault,
        tabBarButton: HapticTab,
        tabBarLabelStyle: {
          fontFamily: Fonts.display,
          fontSize: 9,
          letterSpacing: 2,           // Michroma brand spacing
          textTransform: 'uppercase',
        },
        tabBarStyle: {
          backgroundColor: palette.blackDeep,
          borderTopColor: Colors.dark.border,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: insets.bottom + 8,
          paddingTop: 10,
        },
      }}>
      <Tabs.Screen
        name="comando"
        options={{
          title: 'Comando',
          tabBarIcon: ({ color }) => <TabBarIcon name="dashboard" color={color} />,
        }}
      />
      <Tabs.Screen
        name="norte"
        options={{
          title: 'Norte',
          tabBarIcon: ({ color }) => <TabBarIcon name="explore" color={color} />,
        }}
      />
      <Tabs.Screen
        name="programas"
        options={{
          title: 'Programa',
          tabBarIcon: ({ color }) => <TabBarIcon name="view-module" color={color} />,
        }}
      />
      <Tabs.Screen
        name="mentor"
        options={{
          title: 'Mentor',
          tabBarIcon: ({ color }) => <TabBarIcon name="forum" color={color} />,
        }}
      />
      <Tabs.Screen
        name="progreso"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <TabBarIcon name="show-chart" color={color} />,
        }}
      />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}

export default function TabLayout() {
  const { isLoaded, isAuthenticated, state } = useLifeFlow();

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
