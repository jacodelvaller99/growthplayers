import React from 'react';
import { View, Text } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';

interface SectionHeaderProps {
  tag: string;
  title: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ tag, title }) => {
  return (
    <View style={{ marginBottom: Layout.spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Layout.spacing.md }}>
        {/* Línea decorativa izquierda */}
        <View
          style={{
            width: 4,
            height: 16,
            backgroundColor: Colors.mint,
            borderRadius: 2,
            marginRight: Layout.spacing.sm,
          }}
        />

        {/* Tag */}
        <View
          style={{
            backgroundColor: Colors.mintLight,
            paddingHorizontal: Layout.spacing.md,
            paddingVertical: Layout.spacing.xs,
            borderRadius: Layout.borderRadius.sm,
            borderWidth: 1,
            borderColor: Colors.mintBorder,
          }}
        >
          <Text
            style={[
              Typography.tag,
              {
                color: Colors.mint,
              },
            ]}
          >
            {tag}
          </Text>
        </View>
      </View>

      {/* Título */}
      <Text
        style={[
          Typography.h3,
          {
            color: Colors.text,
          },
        ]}
      >
        {title}
      </Text>
    </View>
  );
};
