import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Colors, Fonts, palette } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';

type TabIcon = React.ComponentProps<typeof MaterialIcons>['name'];

function TabBarIcon({ color, name }: { color: string; name: TabIcon }) {
  return <MaterialIcons name={name} size={24} color={color} />;
}

export function BottomNavigation() {
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
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
        tabBarStyle: {
          backgroundColor: palette.blackDeep,
          borderTopColor: Colors.dark.border,
          borderTopWidth: 1,
          height: 76,
          paddingBottom: 14,
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
  const { isLoaded, state } = useLifeFlow();

  if (isLoaded && !state.onboardingCompleted) {
    return <Redirect href="/(onboarding)" />;
  }

  return <BottomNavigation />;
}
