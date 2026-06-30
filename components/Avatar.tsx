import { Image, StyleSheet, Text, View } from 'react-native';

import { avatarSwatches, Fonts, palette } from '@/constants/theme';

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Deterministic color pair for a user id — exported for callers that tint
 *  surrounding chrome (e.g. a name to match its avatar). Quiet-luxury muted
 *  tones from the design tokens; the color is stable per member everywhere. */
export function swatchFor(id: string): { bg: string; fg: string } {
  return avatarSwatches[hashId(id || '?') % avatarSwatches.length];
}

export interface AvatarProps {
  /** Stable id (user_id) — drives the deterministic color. */
  id: string;
  /** Display name — first letter becomes the initial. */
  name?: string | null;
  /** Optional photo (user_profiles.avatar_url). Shown instead of the initial. */
  uri?: string | null;
  size?: number;
  /** Show the online ring + dot. */
  online?: boolean;
}

/** Reusable member avatar: photo if present, otherwise a colored initial.
 *  Used across feed, inbox and chat so identity reads consistently. */
export function Avatar({ id, name, uri, size = 44, online }: AvatarProps) {
  const sw = swatchFor(id);
  const initial = (name?.trim()?.charAt(0) || '·').toUpperCase();
  const dot = Math.max(8, Math.round(size * 0.26));
  const ring = Math.max(2, Math.round(size * 0.05));
  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.img, { width: size, height: size, borderRadius: size / 2 }]}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View
          style={[
            styles.circle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: sw.bg,
              borderColor: sw.fg + '44',
            },
          ]}>
          <Text style={[styles.initial, { color: sw.fg, fontSize: Math.round(size * 0.4) }]}>
            {initial}
          </Text>
        </View>
      )}
      {online && (
        <View
          style={[
            styles.dot,
            { width: dot, height: dot, borderRadius: dot / 2, borderWidth: ring },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle:  { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  img:     { backgroundColor: palette.graphite },
  initial: { fontFamily: Fonts.display },
  dot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: palette.success,
    borderColor: palette.black,
  },
});
