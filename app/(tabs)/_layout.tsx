import React from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useProgramStore } from '../../store/programStore';

// 5 primary tabs only — clean, editorial
const TAB_ROUTES = [
  { name: 'comando',  label: 'DASHBOARD', icon: 'view-dashboard-outline' as const },
  { name: 'academia', label: 'PROTOCOLO', icon: 'layers-outline' as const },
  { name: 'mentor',   label: 'MENTOR',    icon: 'brain' as const },
  { name: 'bitacora', label: 'NORTE',     icon: 'compass-outline' as const },
  { name: 'avatar',   label: 'PERFIL',    icon: 'account-outline' as const },
];

// Hidden routes — still accessible via push navigation, just not in the tab bar
const HIDDEN_ROUTES = ['biometria', 'comunidad', 'roadmap'];

const GOLD = '#EDBA01';
const GOLD_DIM = 'rgba(237,186,1,0.28)';
const BG = '#0A0A0A';
const SURFACE = '#141414';
const BORDER = 'rgba(255,255,255,0.07)';

const TabButton = React.memo(function TabButton({
  label,
  icon,
  isFocused,
  onPress,
  onLongPress,
}: {
  label: string;
  icon: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    Haptics.selectionAsync();
    scale.value = withSequence(
      withTiming(0.88, { duration: 80 }),
      withSpring(1, { damping: 10, mass: 0.6 })
    );
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      style={styles.tabButton}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
    >
      <Animated.View style={[styles.tabContent, animatedStyle]}>
        {/* Gold active line at top */}
        <View style={[styles.activeBar, isFocused && styles.activeBarOn]} />

        <MaterialCommunityIcons
          name={icon as any}
          size={22}
          color={isFocused ? GOLD : GOLD_DIM}
        />
        <Text style={[styles.tabLabel, { color: isFocused ? GOLD : GOLD_DIM }]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();

  // Only render the 5 primary tabs
  const visibleRoutes = state.routes.filter(r => !HIDDEN_ROUTES.includes(r.name));

  return (
    <View
      style={[
        styles.tabBar,
        {
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          height: 52 + (insets.bottom > 0 ? insets.bottom : 8),
        },
      ]}
    >
      {visibleRoutes.map((route) => {
        const globalIndex = state.routes.findIndex(r => r.key === route.key);
        const isFocused = state.index === globalIndex;
        const tabInfo = TAB_ROUTES.find(t => t.name === route.name);
        if (!tabInfo) return null;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <TabButton
            key={route.key}
            label={tabInfo.label}
            icon={tabInfo.icon}
            isFocused={isFocused}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        );
      })}
    </View>
  );
};

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {/* Visible tabs */}
      {TAB_ROUTES.map(tab => (
        <Tabs.Screen key={tab.name} name={tab.name} />
      ))}
      {/* Hidden tabs — still navigable */}
      {HIDDEN_ROUTES.map(name => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{ href: null }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    alignItems: 'flex-start',
    paddingTop: 0,
    zIndex: 999,
    elevation: 8,
    // subtle gold shadow on iOS
    shadowColor: GOLD,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    minHeight: 48,
  },
  tabContent: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    gap: 3,
    width: '100%',
  },
  activeBar: {
    position: 'absolute',
    top: 0,
    left: '20%',
    right: '20%',
    height: 2,
    borderRadius: 1,
    backgroundColor: 'transparent',
  },
  activeBarOn: {
    backgroundColor: GOLD,
  },
  tabLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed',
  },
});
