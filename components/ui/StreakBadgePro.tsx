import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Colors, Spacing, Radius, Typography, Shadow } from '../design/tokens';

interface StreakBadgeProps {
  count: number;
  animate?: boolean;
}

export const StreakBadgePro: React.FC<StreakBadgeProps> = ({ count, animate = true }) => {
  const scaleValue = useSharedValue(1);
  const pulseValue = useSharedValue(1);

  useEffect(() => {
    if (animate && count >= 7) {
      // Pulse animation para streaks >= 7 días
      pulseValue.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 500, easing: Easing.ease }),
          withTiming(1, { duration: 500, easing: Easing.ease })
        ),
        -1,
        true
      );
    }
  }, [animate, count]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseValue.value }],
  }));

  const isBurning = count >= 7;

  return (
    <Animated.View style={animatedStyle}>
      <View
        style={{
          backgroundColor: Colors.surface,
          borderWidth: 1,
          borderColor: Colors.mintSubtle,
          borderRadius: Radius.lg,
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.base,
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.md,
          ...(isBurning && Shadow.mint),
        }}
      >
        <Text
          style={[
            Typography.metric,
            {
              fontSize: 28,
            },
          ]}
        >
          {count}
        </Text>

        <View>
          <Text
            style={[
              Typography.label,
              {
                color: Colors.mint,
              },
            ]}
          >
            DÍAS
          </Text>
          <Text
            style={[
              Typography.caption,
              {
                color: isBurning ? Colors.amber : Colors.mintDim,
              },
            ]}
          >
            {isBurning ? '🔥 On Fire!' : 'Streak active'}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};
