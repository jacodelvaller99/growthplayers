import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { palette } from '@/constants/theme';

/**
 * HomeSkeleton — zero-latency loading state for the dashboard.
 *
 * Shown while isLoaded is false (auth + session check in progress).
 * Matches the visual structure of comando.tsx so the transition is seamless.
 * Dark background avoids any white flash. Shimmer pulse via Reanimated.
 */
export function HomeSkeleton() {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.9, { duration: 700 }), -1, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shimmer = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={{ flex: 1, backgroundColor: palette.black, paddingHorizontal: 16 }}>
      {/* Safe-area top spacer */}
      <View style={{ height: 56 }} />

      <Animated.View style={shimmer}>
        {/* Header: greeting + name */}
        <View style={{ height: 11, width: 140, backgroundColor: palette.charcoal, borderRadius: 4, marginBottom: 10 }} />
        <View style={{ height: 28, width: 260, backgroundColor: palette.charcoal, borderRadius: 4, marginBottom: 6 }} />
        <View style={{ height: 14, width: 90, backgroundColor: palette.graphite, borderRadius: 4, marginBottom: 24 }} />

        {/* Protocol day / time badge */}
        <View style={{ height: 22, width: 110, backgroundColor: palette.charcoal, borderRadius: 4, marginBottom: 28 }} />

        {/* Primary CTA button (check-in) */}
        <View style={{ height: 52, backgroundColor: palette.charcoal, borderRadius: 10, marginBottom: 20 }} />

        {/* Progress bar */}
        <View style={{ height: 4, backgroundColor: palette.graphite, borderRadius: 2, marginBottom: 28 }} />

        {/* Section divider */}
        <View style={{ height: 1, backgroundColor: palette.charcoal, marginBottom: 20 }} />

        {/* Metric cards 2×2 */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <View style={{ flex: 1, height: 86, backgroundColor: palette.graphite, borderRadius: 10 }} />
          <View style={{ flex: 1, height: 86, backgroundColor: palette.graphite, borderRadius: 10 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          <View style={{ flex: 1, height: 86, backgroundColor: palette.graphite, borderRadius: 10 }} />
          <View style={{ flex: 1, height: 86, backgroundColor: palette.graphite, borderRadius: 10 }} />
        </View>

        {/* Section divider */}
        <View style={{ height: 1, backgroundColor: palette.charcoal, marginBottom: 20 }} />

        {/* Module card */}
        <View style={{ height: 96, backgroundColor: palette.graphite, borderRadius: 10 }} />
      </Animated.View>
    </View>
  );
}
