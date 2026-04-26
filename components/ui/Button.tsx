import React from 'react';
import { Pressable, ActivityIndicator, ViewStyle } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Text } from 'react-native';
import { Colors, Spacing, Radius, Typography, Duration } from '../design/tokens';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'large',
  loading = false,
  disabled = false,
  style,
}) => {
  const scaleValue = useSharedValue(1);

  const sizeConfig = {
    small: {
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      minHeight: 40,
    },
    medium: {
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      minHeight: 44,
    },
    large: {
      paddingVertical: Spacing.base,
      paddingHorizontal: Spacing.xl,
      minHeight: 52,
    },
  };

  const variantConfig = {
    primary: {
      backgroundColor: Colors.mint,
      borderWidth: 0,
      borderColor: undefined,
      textColor: Colors.bg,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: Colors.mintSubtle,
      textColor: Colors.mint,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderColor: undefined,
      textColor: Colors.mint,
    },
  };

  const handlePressIn = () => {
    scaleValue.value = withSpring(0.96, { damping: 12 });
  };

  const handlePressOut = () => {
    scaleValue.value = withSpring(1, { damping: 12 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const config = variantConfig[variant];
  const sizeStyle = sizeConfig[size];

  return (
    <Animated.View
      entering={FadeIn.duration(Duration.fast)}
      style={[animatedStyle]}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        disabled={disabled || loading}
        style={[
          {
            backgroundColor: config.backgroundColor,
            borderWidth: config.borderWidth,
            ...(config.borderWidth > 0 && { borderColor: config.borderColor }),
            borderRadius: Radius.md,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: disabled ? 0.4 : 1,
          },
          sizeStyle,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={config.textColor} size="small" />
        ) : (
          <Text
            style={[
              Typography.buttonLarge,
              {
                color: config.textColor,
              },
            ]}
          >
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
};
