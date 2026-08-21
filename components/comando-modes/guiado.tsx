import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { ComandoModeProps } from '@/components/comando-modes/types';
import { palette, radii, spacing, Fonts } from '@/constants/theme';

export default function GuiadoMode(props: ComandoModeProps) {
  return (
    <View style={styles.container}>
      <View style={styles.dots}>
        {Array.from({ length: props.guidedTotalSteps }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === props.guidedStepIndex && styles.dotActive]}
          />
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>
          PASO {props.guidedStepIndex + 1} DE {props.guidedTotalSteps}
        </Text>
        <Text style={styles.question}>{props.guidedQuestion}</Text>
        <Pressable style={styles.button} onPress={props.onDirective}>
          <Text style={styles.buttonText}>SIGUIENTE →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.line,
  },
  dotActive: {
    width: 20,
    backgroundColor: palette.gold,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  label: {
    fontFamily: Fonts.displayMedium,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: palette.goldText,
  },
  question: {
    fontFamily: Fonts.display,
    fontSize: 19,
    fontWeight: '800',
    color: palette.ivory,
    lineHeight: 26,
  },
  button: {
    width: '100%',
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: palette.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: Fonts.display,
    fontWeight: '800',
    fontSize: 14,
    color: palette.ink,
    textTransform: 'uppercase',
  },
});
