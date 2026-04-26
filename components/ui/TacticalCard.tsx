import React, { useState } from 'react';
import { View, ViewStyle } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';

interface TacticalCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export const TacticalCard: React.FC<TacticalCardProps> = ({ children, style, onPress }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <View
      style={[
        {
          backgroundColor: Colors.surface,
          borderWidth: 1,
          borderColor: isHovered ? Colors.mintBorderActive : Colors.mintBorder,
          ...Layout.components.card,
          ...Layout.shadows.sm,
        },
        isHovered && {
          backgroundColor: Colors.mintLight,
        },
        style,
      ]}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      {children}
    </View>
  );
};
