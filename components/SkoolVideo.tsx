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
  url?: string;
  vimeoId?: string;
  height?: number;
}

export function SkoolVideo({ url, vimeoId, height = 220 }: SkoolVideoProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // speed=1 enables Vimeo's native playback-rate control (1×/1.5×/2× selector).
  // transparent=0 forces a solid black background instead of transparent overlay.
  const vimeoEmbedUrl = vimeoId
    ? `https://player.vimeo.com/video/${vimeoId}?title=0&byline=0&portrait=0&autopause=0&speed=1&transparent=0`
    : null;

  // ── WEB con Vimeo embed ──────────────────────────────────────────────────────
  if (Platform.OS === 'web' && vimeoEmbedUrl) {
    return (
      <View style={[styles.container, { height }]}>
        <iframe
          src={vimeoEmbedUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: radii.md,
            backgroundColor: '#000',
          }}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </View>
    );
  }

  // ── WEB sin Vimeo (fallback Skool link) ──────────────────────────────────────
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.fallback}>
          <Text style={styles.playIcon}>▶</Text>
          <Text style={styles.title}>Video del Método Polaris</Text>
          <Text style={styles.subtitle}>
            Los videos se reproducen en la app móvil o directamente en Skool.
          </Text>
          {url && (
            <Pressable
              onPress={() => Linking.openURL(url)}
              style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}>
              <Text style={styles.btnText}>Ver en Skool →</Text>
            </Pressable>
          )}
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
          {url && (
            <Pressable
              onPress={() => Linking.openURL(url)}
              style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}>
              <Text style={styles.btnText}>Abrir en Skool →</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // ── NATIVO WebView (usa Vimeo embed si disponible, sino Skool URL) ─────────────
  const nativeSource = vimeoEmbedUrl ?? url;
  if (!nativeSource) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.fallback}>
          <Text style={styles.playIcon}>⏳</Text>
          <Text style={styles.subtitle}>Video próximamente</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      {loading && (
        <View style={styles.skeleton}>
          <ActivityIndicator color={palette.goldText} size="large" />
          <Text style={styles.loadingText}>Cargando video...</Text>
        </View>
      )}
      <WebView
        source={{ uri: nativeSource }}
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
    // Letterbox de video: negro constante a propósito (el video se ve mejor sobre
    // negro en ambos temas, igual que YouTube/Vimeo). NO es un bug de modo claro.
    backgroundColor: '#000',
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  webview: {
    backgroundColor: '#000',   // letterbox de video (ver container)
    flex: 1,
  },
  skeleton: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: palette.graphite,   // placeholder de carga = superficie del tema
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
    backgroundColor: palette.graphite,
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  playIcon: {
    color: palette.goldText,
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
    color: palette.ink,
    fontFamily: Fonts.display,
    fontSize: 14,
    fontWeight: '700',
  },
});
