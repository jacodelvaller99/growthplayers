/**
 * app/oauth/oura/callback.tsx
 *
 * Oura Ring OAuth 2.0 callback handler.
 * Oura redirects here after authorization:
 *   GET /oauth/oura/callback?code=...&state=...
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Fonts, palette, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type Status = 'loading' | 'success' | 'error';

export default function OuraCallbackScreen() {
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
    const timer = setTimeout(() => handleCallback(), 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.code, params.error]);

  async function handleCallback() {
    const { code, error, error_description } = params;

    if (error) {
      setErrorMsg(error_description ?? error ?? 'Autorización denegada');
      setStatus('error');
      setTimeout(() => router.replace('/perfil/wearables?error=denied' as never), 2500);
      return;
    }

    if (!code) {
      setErrorMsg('No se recibió código de autorización');
      setStatus('error');
      setTimeout(() => router.replace('/perfil/wearables?error=no_code' as never), 2500);
      return;
    }

    try {
      const { error: fnError } = await supabase.functions.invoke('sync-wearables', {
        body: { action: 'connect', provider: 'oura', code },
      });

      if (fnError) throw new Error(fnError.message);

      setStatus('success');
      setTimeout(() => router.replace('/perfil/wearables?connected=oura' as never), 1200);
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
        <View style={styles.logoWrap}>
          <MaterialIcons name="circle" size={40} color={palette.ash} />
          <Text style={styles.brand}>OURA</Text>
        </View>

        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={palette.goldText} style={styles.spinner} />
            <Text style={styles.headline}>CONECTANDO...</Text>
            <Text style={styles.sub}>Intercambiando tokens con Oura Ring</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <MaterialIcons name="check-circle" size={48} color={palette.success} style={styles.icon} />
            <Text style={[styles.headline, { color: palette.success }]}>CONECTADO</Text>
            <Text style={styles.sub}>Tu Oura Ring está vinculado. Redirigiendo...</Text>
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
    backgroundColor: palette.graphite,
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
  spinner: { marginVertical: spacing.lg },
  icon:    { marginVertical: spacing.md },
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
