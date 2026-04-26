import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Typography, Spacing } from '../design/tokens';

interface SectionHeaderProps {
  title: string;
  tag?: string;
  rightElement?: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  tag,
  rightElement,
  delay = 0,
  style,
}) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(300)}
      style={[
        {
          marginBottom: Spacing.lg,
        },
        style,
      ]}
    >
      {tag && (
        <Text style={[Typography.tag, { marginBottom: Spacing.sm }]}>
          {tag}
        </Text>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 }}>
          {/* Decorative left line */}
          <View
            style={{
              width: 2,
              height: 20,
              backgroundColor: Colors.mint,
              borderRadius: 1,
            }}
          />
          <Text
            style={[
              Typography.subheading,
              {
                flex: 1,
              },
            ]}
          >
            {title}
          </Text>
        </View>

        {rightElement && <View>{rightElement}</View>}
      </View>
    </Animated.View>
  );
};
