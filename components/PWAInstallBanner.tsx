/**
 * PWAInstallBanner — iOS Safari "Add to Home Screen" nudge.
 *
 * Shows once on iOS Safari when the app is NOT already installed as a PWA.
 * Persisted via localStorage so it only appears once per device.
 *
 * Detection:
 *   - Platform.OS === 'web'
 *   - navigator.userAgent includes 'iPhone' or 'iPad'
 *   - window.navigator.standalone === false  (not already installed)
 *   - localStorage 'pwa_banner_dismissed' not set
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/constants/theme';

const STORAGE_KEY = 'pwa_banner_dismissed';

function isIOSSafari(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  // Chrome on iOS identifies itself with 'CriOS', Firefox with 'FxiOS'
  // We only want to show this in Safari (no CriOS/FxiOS)
  const isSafari = !/CriOS|FxiOS|OPiOS/.test(ua);
  return isIOS && isSafari;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.navigator as Navigator & { standalone?: boolean }).standalone;
}

export default function PWAInstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIOSSafari()) return;
    if (isStandalone()) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    setVisible(true);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, '1');
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Icon */}
        <View style={styles.iconWrap}>
          <MaterialIcons name="install-mobile" size={20} color={palette.goldText} />
        </View>

        {/* Text */}
        <View style={styles.textWrap}>
          <Text style={styles.title}>Instala Polaris en tu iPhone</Text>
          <Text style={styles.body}>
            Toca{' '}
            <MaterialIcons name="ios-share" size={12} color={palette.ash} />
            {' '}luego “Agregar a inicio”
          </Text>
        </View>

        {/* Dismiss */}
        <Pressable
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel="Entendido"
          style={({ pressed }) => [styles.dismissBtn, pressed && { opacity: 0.6 }]}>
          <Text style={styles.dismissText}>Entendido</Text>
        </Pressable>
      </View>

      {/* Arrow pointing down toward tab bar */}
      <View style={styles.arrow} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.graphite,
    borderColor: palette.line,
    borderRadius: radii.md,
    borderWidth: 1,
    bottom: 90,
    left: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    zIndex: 9998,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: palette.goldLight,
    borderRadius: radii.sm,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.section,
    color: palette.ivory,
    fontSize: 11,
  },
  body: {
    ...typography.caption,
    color: palette.ash,
    fontSize: 10,
  },
  dismissBtn: {
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dismissText: {
    ...typography.label,
    color: palette.ink,
    fontSize: 9,
  },
  arrow: {
    alignSelf: 'center',
    borderLeftColor: 'transparent',
    borderLeftWidth: 8,
    borderRightColor: 'transparent',
    borderRightWidth: 8,
    borderTopColor: palette.graphiteLight,
    borderTopWidth: 8,
    bottom: -8,
    position: 'absolute',
  },
});
