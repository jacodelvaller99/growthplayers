import React from 'react';
import { View, Text } from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../design/tokens';

type BadgeVariant = 'mint' | 'amber' | 'error' | 'success' | 'neutral';

const variantConfig: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  mint: {
    bg: Colors.mintFaint,
    text: Colors.mint,
    border: Colors.mintSubtle,
  },
  amber: {
    bg: Colors.amberFaint,
    text: Colors.amber,
    border: 'rgba(255,181,71,0.20)',
  },
  error: {
    bg: Colors.errorFaint,
    text: Colors.error,
    border: 'rgba(255,107,107,0.20)',
  },
  success: {
    bg: Colors.successFaint,
    text: Colors.success,
    border: 'rgba(16,185,129,0.20)',
  },
  neutral: {
    bg: Colors.surfaceBorder,
    text: Colors.mintMuted,
    border: Colors.surfaceBorder,
  },
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: string;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'mint', icon }) => {
  const config = variantConfig[variant];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: config.bg,
        borderWidth: 1,
        borderColor: config.border,
        borderRadius: Radius.sm,
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.md,
        alignSelf: 'flex-start',
      }}
    >
      {icon && (
        <Text style={{ fontSize: 12 }}>
          {icon}
        </Text>
      )}
      <Text
        style={[
          Typography.caption,
          {
            color: config.text,
            fontWeight: '600',
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};
