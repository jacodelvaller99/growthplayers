import React from 'react';
import { View, ViewStyle, Pressable } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Colors, Radius, Spacing, Shadow } from '../design/tokens';

interface CardProps {
  children: React.ReactNode;
  accentColor?: string;
  glowMint?: boolean;
  pressable?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  delay?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  accentColor,
  glowMint = false,
  pressable = false,
  onPress,
  style,
  delay = 0,
}) => {
  const scaleValue = useSharedValue(1);

  const handlePressIn = () => {
    scaleValue.value = withSpring(0.97, { damping: 12 });
  };

  const handlePressOut = () => {
    scaleValue.value = withSpring(1, { damping: 12 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const cardStyle = [
    {
      backgroundColor: Colors.surface,
      borderWidth: 1,
      borderColor: Colors.surfaceBorder,
      borderRadius: Radius.lg,
      padding: Spacing.base,
      ...(accentColor && {
        borderTopWidth: 2,
        borderTopColor: accentColor,
      }),
      ...(glowMint && {
        ...Shadow.mint,
      }),
    },
    style,
  ];

  const content = <Animated.View style={animatedStyle}>{children}</Animated.View>;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(300)}>
      {pressable ? (
        <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}>
          <View style={cardStyle}>{content}</View>
        </Pressable>
      ) : (
        <View style={cardStyle}>{content}</View>
      )}
    </Animated.View>
  );
};
