/**
 * OfflineBanner — persistent top banner shown when device has no network.
 *
 * Strategy (no extra package needed):
 * - Web: listens to window `online` / `offline` events + navigator.onLine
 * - Native: polls a lightweight HEAD request every 10 s via AppState-aware interval
 *
 * The banner slides in/out with a 300 ms opacity animation and sits at z-index 9999
 * above the Stack navigator so it appears on every screen.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from 'react';
import { Animated, AppState, AppStateStatus, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, spacing, typography } from '@/constants/theme';

// Lightweight HEAD ping — Cloudflare always returns quickly
const PING_URL = 'https://1.1.1.1/';
const POLL_INTERVAL_MS = 10_000;

async function checkConnection(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return navigator.onLine;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    const res = await fetch(PING_URL, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeout);
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

export default function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [isOffline, setIsOffline] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const update = (online: boolean) => {
    setIsOffline(!online);
    Animated.timing(opacity, {
      toValue: online ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const startPolling = () => {
    if (intervalRef.current) return;
    checkConnection().then(update);
    intervalRef.current = setInterval(() => {
      checkConnection().then(update);
    }, POLL_INTERVAL_MS);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Web: use browser events for instant response
      const onOnline  = () => update(true);
      const onOffline = () => update(false);
      window.addEventListener('online',  onOnline);
      window.addEventListener('offline', onOffline);
      update(navigator.onLine);
      return () => {
        window.removeEventListener('online',  onOnline);
        window.removeEventListener('offline', onOffline);
      };
    }

    // Native: poll while app is active, pause when backgrounded
    startPolling();

    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        startPolling();
      } else {
        stopPolling();
      }
    });

    return () => {
      stopPolling();
      appStateSub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isOffline) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { paddingTop: Platform.OS === 'android' ? insets.top + 4 : 4 },
        { opacity },
      ]}
      accessibilityRole="alert"
      accessibilityLabel="Sin conexión a internet">
      <View style={styles.inner}>
        <MaterialIcons name="wifi-off" size={14} color={palette.ivory} />
        <Text style={styles.text}>SIN CONEXIÓN — MODO OFFLINE</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#B03030',
    left: 0,
    paddingBottom: spacing.sm,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 9999,
  },
  inner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  text: {
    ...typography.label,
    color: palette.ivory,
    fontSize: 9,
  },
});
