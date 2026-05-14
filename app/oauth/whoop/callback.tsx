/**
 * app/oauth/whoop/callback.tsx
 *
 * WHOOP OAuth 2.0 callback handler.
 * WHOOP redirects here after authorization:
 *   GET /oauth/whoop/callback?code=...&state=...
 *
 * Flow:
 *  1. Extract `code` from URL params
 *  2. Call sync-wearables edge function (action: 'connect')
 *  3. Redirect → /perfil/wearables?connected=whoop
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Fonts, palette, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type Status = 'loading' | 'success' | 'error';

export default function WhoopCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
    state?: string;
  }>();

  const [status, setStatus]     = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // params may arrive on next tick in web
    const timer = setTimeout(() => handleCallback(), 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.code, params.error]);

  async function handleCallback() {
    const { code, error, error_description } = params;

    // ── Authorization denied by user ───────────────────────────────────────
    if (error) {
      const msg = error_description ?? error ?? 'Autorización denegada';
      setErrorMsg(msg);
      setStatus('error');
      setTimeout(() => router.replace('/perfil/wearables?error=denied' as never), 2500);
      return;
    }

    // ── No code received ───────────────────────────────────────────────────
    if (!code) {
      setErrorMsg('No se recibió código de autorización');
      setStatus('error');
      setTimeout(() => router.replace('/perfil/wearables?error=no_code' as never), 2500);
      return;
    }

    // ── Exchange code → tokens via Edge Function ───────────────────────────
    try {
      const { error: fnError } = await supabase.functions.invoke('sync-wearables', {
        body: { action: 'connect', provider: 'whoop', code },
      });

      if (fnError) throw new Error(fnError.message);

      setStatus('success');
      // Small delay so the user sees the checkmark
      setTimeout(() => router.replace('/perfil/wearables?connected=whoop' as never), 1200);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error de conexión';
      setErrorMsg(msg);
      setStatus('error');
      setTimeout(() => router.replace('/perfil/wearables?error=exchange_failed' as never), 3000);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        {/* WHOOP logo placeholder */}
        <View style={styles.logoWrap}>
          <MaterialIcons name="watch" size={40} color={palette.ash} />
          <Text style={styles.brand}>WHOOP</Text>
        </View>

        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={palette.gold} style={styles.spinner} />
            <Text style={styles.headline}>CONECTANDO...</Text>
            <Text style={styles.sub}>Intercambiando tokens con WHOOP</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <MaterialIcons name="check-circle" size={48} color={palette.success} style={styles.icon} />
            <Text style={[styles.headline, { color: palette.success }]}>CONECTADO</Text>
            <Text style={styles.sub}>Tu WHOOP está vinculado. Redirigiendo...</Text>
          </>
        )}

        {status === 'error' && (
          <>
            <MaterialIcons name="error-outline" size={48} color={palette.danger} style={styles.icon} />
            <Text style={[styles.headline, { color: palette.danger }]}>ERROR</Text>
            <Text style={styles.sub}>{errorMsg}</Text>
            <Text style={styles.caption}>Redirigiendo de vuelta...</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.black,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: '#111111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    padding: 40,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    gap: spacing.md,
  },
  logoWrap: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  brand: {
    fontFamily: Fonts.display,
    fontSize: 22,
    fontWeight: '800',
    color: palette.ivory,
    letterSpacing: 4,
  },
  spinner: {
    marginVertical: spacing.lg,
  },
  icon: {
    marginVertical: spacing.md,
  },
  headline: {
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: '800',
    color: palette.ivory,
    letterSpacing: 2,
    textAlign: 'center',
  },
  sub: {
    ...typography.body,
    color: palette.smoke,
    textAlign: 'center',
    lineHeight: 22,
  },
  caption: {
    ...typography.mono,
    color: palette.ash,
    fontSize: 11,
    marginTop: spacing.sm,
  },
});
