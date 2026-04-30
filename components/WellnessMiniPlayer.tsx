/**
 * WellnessMiniPlayer — persistent mini-player that floats above the tab bar.
 * Visible whenever a wellness session is active, regardless of current screen.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useWellnessStore } from '@/store/wellnessStore';
import { stopBinauralGlobal } from '@/hooks/useBinauralEngine';

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

const TYPE_ICON: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = {
  binaural:  'graphic-eq',
  meditation:'self-improvement',
  breathing: 'air',
};

const TYPE_COLOR: Record<string, string> = {
  binaural:  '#b07d1a',
  meditation:'#7c5cbf',
  breathing: '#2e7d52',
};

export function WellnessMiniPlayer() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const player        = useWellnessStore((s) => s.player);
  const stopSession   = useWellnessStore((s) => s.stopSession);
  const resumeSession = useWellnessStore((s) => s.resumeSession);

  // Hide when no active session (show when playing OR paused)
  if ((!player.isPlaying && !player.isPaused) || !player.type) return null;

  const tabBarHeight = 56 + insets.bottom;
  const color = TYPE_COLOR[player.type] ?? palette.gold;
  const icon  = TYPE_ICON[player.type]  ?? 'music-note';

  const remaining = player.targetSeconds > 0
    ? Math.max(player.targetSeconds - player.elapsedSeconds, 0)
    : player.elapsedSeconds;

  const progress = player.targetSeconds > 0
    ? Math.min(player.elapsedSeconds / player.targetSeconds, 1)
    : 0;

  const handleStop = () => {
    stopBinauralGlobal();
    stopSession();
  };

  const handleTap = () => {
    // Navigate to the relevant player screen
    const routes: Record<string, string> = {
      binaural:  '/bienestar/binaurales',
      meditation:'/bienestar/meditacion',
      breathing: '/bienestar/respiracion',
    };
    const route = routes[player.type ?? ''];
    if (route) router.push(route as never);
  };

  return (
    <Pressable
      onPress={handleTap}
      style={[styles.container, { bottom: tabBarHeight + 8 }]}>

      {/* Progress bar */}
      {player.targetSeconds > 0 && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` as unknown as number, backgroundColor: color }]} />
        </View>
      )}

      <View style={styles.row}>
        {/* Icon */}
        <View style={[styles.iconBox, { backgroundColor: color + '22' }]}>
          <MaterialIcons name={icon} size={18} color={color} />
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{player.sessionName}</Text>
          <Text style={styles.meta}>
            {player.type?.toUpperCase()} · {
              player.targetSeconds > 0
                ? formatTime(remaining) + ' restante'
                : formatTime(player.elapsedSeconds) + ' transcurrido'
            }
          </Text>
        </View>

        {/* Pause indicator + stop */}
        {player.isPaused && (
          <Pressable onPress={resumeSession} style={styles.stopBtn} hitSlop={12}>
            <MaterialIcons name="play-arrow" size={18} color={color} />
          </Pressable>
        )}
        <Pressable onPress={handleStop} style={styles.stopBtn} hitSlop={12}>
          <MaterialIcons name="stop" size={18} color={palette.ash} />
        </Pressable>
      </View>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    backgroundColor: palette.graphite,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.md,
    overflow: 'hidden',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 999,
  },
  progressTrack: {
    height: 2,
    backgroundColor: palette.charcoal,
  },
  progressFill: {
    height: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: { flex: 1, gap: 2 },
  name: {
    ...typography.section,
    color: palette.ivory,
    fontSize: 12,
    letterSpacing: 1.5,
  },
  meta: { ...typography.mono, color: palette.smoke, fontSize: 10 },
  stopBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
