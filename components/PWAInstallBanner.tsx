/**
 * PWAInstallBanner — "Add to Home Screen" nudge, iOS Safari + Android Chrome.
 *
 * Shows once per device/platform when the app is NOT already installed as a PWA.
 * Persisted via localStorage (separate keys per platform) so it only appears once.
 *
 * iOS detection:
 *   - Platform.OS === 'web', UA includes 'iPhone'/'iPad'/'iPod', Safari (no CriOS/FxiOS)
 *   - window.navigator.standalone === false  (not already installed)
 *   - localStorage 'pwa_banner_dismissed' not set
 *
 * Android detection:
 *   - UA includes 'Android' + 'Chrome/' (excludes EdgA/OPR/SamsungBrowser)
 *   - `beforeinstallprompt` fired (stashed; browser only fires it once) and not
 *     already installed (matchMedia 'display-mode: standalone')
 *   - localStorage 'pwa_banner_dismissed_android' not set
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/constants/theme';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

const STORAGE_KEY = 'pwa_banner_dismissed';
const ANDROID_STORAGE_KEY = 'pwa_banner_dismissed_android';

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // private mode / storage disabled
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private mode / storage disabled — nothing to persist, banner just re-shows next visit
  }
}

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

function isAndroidChrome(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  return /Android/.test(ua) && /Chrome\/[\d.]+/.test(ua) && !/EdgA|OPR|SamsungBrowser/.test(ua);
}

function isAndroidStandalone(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(display-mode: standalone)').matches;
}

export default function PWAInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [androidVisible, setAndroidVisible] = useState(false);
  const [androidPrompt, setAndroidPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (!isIOSSafari()) return;
    if (isStandalone()) return;
    if (safeGetItem(STORAGE_KEY)) return;
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!isAndroidChrome()) return;
    if (isAndroidStandalone()) return;
    if (safeGetItem(ANDROID_STORAGE_KEY)) return;

    const onBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setAndroidPrompt(e);
      setAndroidVisible(true);
    };
    const onAppInstalled = () => {
      setAndroidVisible(false);
      safeSetItem(ANDROID_STORAGE_KEY, '1');
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    safeSetItem(STORAGE_KEY, '1');
  };

  const handleAndroidInstall = async () => {
    if (!androidPrompt) return;
    await androidPrompt.prompt();
    await androidPrompt.userChoice;
    setAndroidVisible(false);
    setAndroidPrompt(null);
    safeSetItem(ANDROID_STORAGE_KEY, '1');
  };

  if (visible) {
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

  if (androidVisible) {
    return (
      <View style={styles.container}>
        <View style={styles.row}>
          {/* Icon */}
          <View style={styles.iconWrap}>
            <MaterialIcons name="install-mobile" size={20} color={palette.goldText} />
          </View>

          {/* Text */}
          <View style={styles.textWrap}>
            <Text style={styles.title}>Instala Polaris en tu Android</Text>
            <Text style={styles.body}>Accede más rápido, incluso sin conexión</Text>
          </View>

          {/* Install */}
          <Pressable
            onPress={handleAndroidInstall}
            accessibilityRole="button"
            accessibilityLabel="Instalar"
            style={({ pressed }) => [styles.dismissBtn, pressed && { opacity: 0.6 }]}>
            <Text style={styles.dismissText}>Instalar</Text>
          </Pressable>
        </View>

        {/* Arrow pointing down toward tab bar */}
        <View style={styles.arrow} />
      </View>
    );
  }

  return null;
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
