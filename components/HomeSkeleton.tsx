import { View } from 'react-native';

/**
 * HomeSkeleton — zero-latency loading state for the dashboard.
 *
 * Shown while isLoaded is false (auth + session check in progress).
 * Matches the visual structure of comando.tsx so the transition is seamless.
 * Dark background avoids any white flash. No animations to keep it lightweight.
 */
export function HomeSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: '#080808', paddingHorizontal: 16 }}>
      {/* Safe-area top spacer */}
      <View style={{ height: 56 }} />

      {/* Header: greeting + name */}
      <View style={{ height: 11, width: 140, backgroundColor: '#1A1A1A', borderRadius: 4, marginBottom: 10 }} />
      <View style={{ height: 28, width: 260, backgroundColor: '#1A1A1A', borderRadius: 4, marginBottom: 6 }} />
      <View style={{ height: 14, width: 90, backgroundColor: '#141414', borderRadius: 4, marginBottom: 24 }} />

      {/* Protocol day / time badge */}
      <View style={{ height: 22, width: 110, backgroundColor: '#1A1A1A', borderRadius: 4, marginBottom: 28 }} />

      {/* Primary CTA button (check-in) */}
      <View style={{ height: 52, backgroundColor: '#1A1A1A', borderRadius: 10, marginBottom: 20 }} />

      {/* Progress bar */}
      <View style={{ height: 4, backgroundColor: '#141414', borderRadius: 2, marginBottom: 28 }} />

      {/* Section divider */}
      <View style={{ height: 1, backgroundColor: '#1A1A1A', marginBottom: 20 }} />

      {/* Metric cards 2×2 */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <View style={{ flex: 1, height: 86, backgroundColor: '#111111', borderRadius: 10 }} />
        <View style={{ flex: 1, height: 86, backgroundColor: '#111111', borderRadius: 10 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
        <View style={{ flex: 1, height: 86, backgroundColor: '#111111', borderRadius: 10 }} />
        <View style={{ flex: 1, height: 86, backgroundColor: '#111111', borderRadius: 10 }} />
      </View>

      {/* Section divider */}
      <View style={{ height: 1, backgroundColor: '#1A1A1A', marginBottom: 20 }} />

      {/* Module card */}
      <View style={{ height: 96, backgroundColor: '#111111', borderRadius: 10 }} />
    </View>
  );
}
