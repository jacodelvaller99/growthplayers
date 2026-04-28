import { useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, palette, radii, spacing } from '@/constants/theme';

// Importación condicional — react-native-webview solo en nativo
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let WebView: any = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

interface SkoolVideoProps {
  url: string;
  height?: number;
}

export function SkoolVideo({ url, height = 220 }: SkoolVideoProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // ── WEB (Vercel) — iframe not allowed by Skool, show deep-link button ────────
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.fallback}>
          <Text style={styles.playIcon}>▶</Text>
          <Text style={styles.title}>Video del Método Polaris</Text>
          <Text style={styles.subtitle}>
            Los videos se reproducen en la app móvil o directamente en Skool.
          </Text>
          <Pressable
            onPress={() => Linking.openURL(url)}
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}>
            <Text style={styles.btnText}>Ver en Skool →</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── NATIVO error state ────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.fallback}>
          <Text style={styles.playIcon}>▶</Text>
          <Text style={styles.subtitle}>No se pudo cargar el video aquí.</Text>
          <Pressable
            onPress={() => Linking.openURL(url)}
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}>
            <Text style={styles.btnText}>Abrir en Skool →</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── NATIVO WebView ────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { height }]}>
      {loading && (
        <View style={styles.skeleton}>
          <ActivityIndicator color={palette.gold} size="large" />
          <Text style={styles.loadingText}>Cargando video...</Text>
        </View>
      )}
      <WebView
        source={{ uri: url }}
        style={[styles.webview, loading && { opacity: 0 }]}
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        allowsInlineMediaPlayback
        onLoad={() => setLoading(false)}
        onError={() => { setError(true); setLoading(false); }}
        onHttpError={() => { setError(true); setLoading(false); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  webview: {
    backgroundColor: '#000',
    flex: 1,
  },
  skeleton: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: '#111',
    gap: spacing.md,
    justifyContent: 'center',
  },
  loadingText: {
    color: palette.smoke,
    fontFamily: Fonts.sans,
    fontSize: 13,
  },
  fallback: {
    alignItems: 'center',
    backgroundColor: '#111',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  playIcon: {
    color: palette.gold,
    fontSize: 36,
  },
  title: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    color: palette.ash,
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 260,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    marginTop: spacing.sm,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  btnPressed: {
    backgroundColor: '#c9a000',
  },
  btnText: {
    color: palette.black,
    fontFamily: Fonts.display,
    fontSize: 14,
    fontWeight: '700',
  },
});
