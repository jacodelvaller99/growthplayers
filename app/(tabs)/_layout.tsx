import React from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
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
  FadeInDown
} from 'react-native-reanimated';
import { useProgramStore } from '../../store/programStore';

const TAB_ROUTES = [
  { name: 'comando',   label: 'COMANDO',   icon: 'home' },
  { name: 'academia',  label: 'ACADEMIA',  icon: 'school-outline' },
  { name: 'mentor',    label: 'MENTOR',    icon: 'brain' },
  { name: 'bitacora',  label: 'BITÁCORA',  icon: 'book-open-variant' },
  { name: 'avatar',    label: 'AVATAR',    icon: 'account-circle' },
  { name: 'biometria', label: 'BIOMETRÍA', icon: 'heart-pulse' },
  { name: 'comunidad', label: 'COMUNIDAD', icon: 'account-group' },
];

const TabButton = ({
  options,
  label,
  icon,
  isFocused,
  onPress,
  onLongPress,
  activeColor = '#EDBA01',
  inactiveColor = 'rgba(237,186,1,0.35)',
}: any) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={(e) => {
        Haptics.selectionAsync();
        scale.value = withSequence(
          withTiming(0.92, { duration: 100 }),
          withSpring(1, { damping: 8, mass: 0.8 })
        );
        onPress(e);
      }}
      onLongPress={onLongPress}
      onPressIn={() => {
        scale.value = withSpring(0.92, {
          damping: 8,
          mass: 0.8,
          overshootClamping: false,
        });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, {
          damping: 8,
          mass: 0.8,
          overshootClamping: false,
        });
      }}
      style={styles.tabButton}
    >
      <Animated.View style={[styles.tabContent, animatedStyle]}>
        <MaterialCommunityIcons
          name={icon as any}
          size={24}
          color={isFocused ? activeColor : inactiveColor}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: isFocused ? activeColor : inactiveColor }
          ]}
        >
          {label}
        </Text>
      </Animated.View>

      {isFocused && (
        <Animated.View
          entering={FadeInDown.delay(50).duration(300).springify()}
          style={[styles.activeIndicator, { backgroundColor: activeColor }]}
        />
      )}
    </Pressable>
  );
};

const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { programType } = useProgramStore();
  const isPolaris = programType === 'polaris';
  const tabColors = {
    bg:       isPolaris ? '#141414' : '#141414',
    active:   isPolaris ? '#EDBA01' : '#EDBA01',
    inactive: isPolaris ? 'rgba(237,186,1,0.35)' : 'rgba(237,186,1,0.35)',
    border:   isPolaris ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.08)',
  };

  return (
    <View style={[styles.tabBar, { backgroundColor: tabColors.bg, borderTopColor: tabColors.border }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const tabInfo = TAB_ROUTES.find(t => t.name === route.name) || {
          name: route.name,
          label: route.name.toUpperCase(),
          icon: 'circle',
        };

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
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TabButton
            key={route.key}
            options={options}
            label={tabInfo.label}
            icon={tabInfo.icon}
            isFocused={isFocused}
            onPress={onPress}
            onLongPress={onLongPress}
            activeColor={tabColors.active}
            inactiveColor={tabColors.inactive}
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
      screenOptions={{
        headerShown: false,
      }}
    >
      {TAB_ROUTES.map(tab => (
        <Tabs.Screen key={tab.name} name={tab.name} />
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
    backgroundColor: '#141414',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    height: Platform.OS === 'ios' ? 70 : 60,
    paddingBottom: Platform.OS === 'ios' ? 16 : 6,
    justifyContent: 'space-around',
    zIndex: 999,
    elevation: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minHeight: 44,
    position: 'relative',
  },
  tabContent: {
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 9,
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  activeIndicator: {
    position: 'absolute',
    top: -1,
    height: 2,
    width: '70%',
    backgroundColor: '#EDBA01',
    borderRadius: 1,
  },
});
