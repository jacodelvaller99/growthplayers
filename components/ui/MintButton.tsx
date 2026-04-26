import React, { useRef } from 'react';
import { Pressable, Text, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';

interface MintButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'ghost';
}

export const MintButton: React.FC<MintButtonProps> = ({
  label,
  onPress,
  disabled = false,
  style,
  size = 'medium',
  variant = 'primary',
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.95, { damping: 10, mass: 1 });
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, { damping: 10, mass: 1 });
    }
  };

  const buttonHeight =
    size === 'small' ? Layout.components.buttonSmall.height : Layout.components.button.height;

  const buttonPaddingHorizontal =
    size === 'small'
      ? Layout.components.buttonSmall.paddingHorizontal
      : Layout.components.button.paddingHorizontal;

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={{
          height: buttonHeight,
          paddingHorizontal: buttonPaddingHorizontal,
          borderRadius: Layout.borderRadius.md,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: variant === 'primary' ? Colors.mint : 'transparent',
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: variant === 'ghost' ? Colors.mint : 'transparent',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Text
          style={[
            Typography.button,
            {
              color: variant === 'primary' ? Colors.textInverse : Colors.mint,
              fontWeight: '700',
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
};
