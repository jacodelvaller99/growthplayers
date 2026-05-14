import { useEffect, useState } from 'react';
import { Text, type TextStyle } from 'react-native';
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

interface Props {
  /** Target value to animate toward */
  value: number;
  /** Text appended after the number (e.g. "/10", "min") */
  suffix?: string;
  /** Text prepended before the number */
  prefix?: string;
  /** Delay in ms before the count-up starts (for stagger effects) */
  delay?: number;
  /** Total duration of the count-up animation in ms */
  duration?: number;
  /** Style forwarded to the inner <Text> — use the same style as the
   *  static value text you're replacing so fonts/colors match exactly */
  style?: TextStyle;
}

/**
 * AnimatedNumber — smooth count-up from 0 → value using Reanimated.
 *
 * Uses the runOnJS + useAnimatedReaction pattern (same approach as
 * SovereignScore in polaris.tsx) which is safe on both native and web.
 *
 * Usage:
 *   <AnimatedNumber value={checkIns} suffix=" días" style={styles.statNum} />
 */
export function AnimatedNumber({
  value,
  suffix = '',
  prefix = '',
  delay = 0,
  duration = 1200,
  style,
}: Props) {
  const sv = useSharedValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    sv.value = withDelay(
      delay,
      withTiming(value, { duration, easing: Easing.out(Easing.cubic) }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useAnimatedReaction(
    () => Math.round(sv.value),
    (val) => {
      runOnJS(setDisplay)(val);
    },
  );

  return (
    <Text style={style}>
      {prefix}{display}{suffix}
    </Text>
  );
}
