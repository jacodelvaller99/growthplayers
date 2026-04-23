import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';

interface StreakDisplayProps {
  streak: number;
  isPulsing?: boolean;
}

export const StreakDisplay: React.FC<StreakDisplayProps> = ({ streak, isPulsing = false }) => {
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isPulsing) {
      pulseScale.value = withRepeat(
        withTiming(1.15, { duration: 600 }),
        -1,
        true
      );
    }
  }, [isPulsing]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          backgroundColor: Colors.mintLight,
          borderWidth: 1,
          borderColor: Colors.mintBorder,
          borderRadius: Layout.borderRadius.lg,
          paddingHorizontal: Layout.spacing.lg,
          paddingVertical: Layout.spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.md,
        },
        animatedStyle,
      ]}
    >
      {/* Fire Icon */}
      <Text style={{ fontSize: 24 }}>🔥</Text>

      {/* Streak Number */}
      <View>
        <Text style={[Typography.monoLarge, { color: Colors.mint }]}>
          {streak}
        </Text>
        <Text style={[Typography.bodySmall, { color: Colors.textSecondary }]}>
          día{streak !== 1 ? 's' : ''} seguido{streak !== 1 ? 's' : ''}
        </Text>
      </View>
    </Animated.View>
  );
};
