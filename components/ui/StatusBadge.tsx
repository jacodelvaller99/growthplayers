import React from 'react';
import { View, Text } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';

type BadgeVariant = 'free' | 'paid' | 'ai' | 'key';

interface StatusBadgeProps {
  variant: BadgeVariant;
  label?: string;
}

const badgeConfig: Record<BadgeVariant, { backgroundColor: string; textColor: string; icon: string }> = {
  free: { backgroundColor: Colors.mintLight, textColor: Colors.mint, icon: '○' },
  paid: { backgroundColor: 'rgba(16, 185, 129, 0.12)', textColor: Colors.success, icon: '●' },
  ai: { backgroundColor: 'rgba(139, 92, 246, 0.12)', textColor: '#a78bfa', icon: '◆' },
  key: { backgroundColor: 'rgba(245, 158, 11, 0.12)', textColor: Colors.warning, icon: '★' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ variant, label }) => {
  const config = badgeConfig[variant];
  const defaultLabel = {
    free: 'FREE',
    paid: 'PREMIUM',
    ai: 'AI UNLOCKED',
    key: 'PRIORITY',
  }[variant];

  return (
    <View
      style={{
        backgroundColor: config.backgroundColor,
        paddingHorizontal: Layout.spacing.md,
        paddingVertical: Layout.spacing.xs,
        borderRadius: Layout.borderRadius.round,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <Text
        style={[
          Typography.tag,
          {
            color: config.textColor,
            fontSize: 10,
          },
        ]}
      >
        {config.icon}
      </Text>
      <Text
        style={[
          Typography.tag,
          {
            color: config.textColor,
            fontSize: 10,
          },
        ]}
      >
        {label || defaultLabel}
      </Text>
    </View>
  );
};
