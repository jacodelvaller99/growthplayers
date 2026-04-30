import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  GoldDivider,
  PolarisMark,
  PremiumInput,
  PrimaryButton,
  SecondaryButton,
  screen,
} from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type AuthMode = 'login' | 'register' | 'forgot';

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mode, setMode]         = useState<AuthMode>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  // ── Navigate when Supabase confirms the session — no race condition ──────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          router.replace('/(tabs)/comando');
        }
      },
    );
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setSuccess(null);
    setAccessCode('');
  };

  // ── Login — NO navegación manual; el useEffect de arriba la maneja ──────────
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Ingresa tu email y contraseña.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (err) {
        const msg = err.message.toLowerCase();
        if (msg.includes('invalid') || msg.includes('credentials')) {
          setError('Email o contraseña incorrectos.');
        } else if (msg.includes('not confirmed') || msg.includes('email')) {
          setError('Confirma tu email antes de ingresar. Revisa tu bandeja de entrada.');
        } else {
          setError(err.message);
        }
      }
      // Si no hay error, el onAuthStateChange dispara SIGNED_IN y navega solo
    } catch {
      setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !accessCode.trim()) {
      setError('Completa todos los campos, incluyendo el código de acceso.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Validar código — SELECT directo (sin RPC)
      const code = accessCode.trim().toUpperCase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows, error: selectErr } = await (supabase as any)
        .from('access_codes')
        .select('id, max_uses, uses_count, is_active, expires_at')
        .ilike('code', code)
        .limit(1);

      if (selectErr || !rows || rows.length === 0) {
        setError('Código de acceso inválido. Verifica que esté bien escrito.');
        return;
      }

      const row = rows[0];
      if (!row.is_active) {
        setError('Código inactivo. Contacta a tu coach.');
        return;
      }
      if (row.expires_at && new Date(row.expires_at) < new Date()) {
        setError('Este código ha vencido. Solicita uno nuevo a tu coach.');
        return;
      }
      if (row.max_uses !== -1 && row.uses_count >= row.max_uses) {
        setError('Este código ya fue usado. Solicita uno nuevo a tu coach.');
        return;
      }

      // Código válido — crear cuenta
      const { error: err } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });

      // Consumir el código (incrementar uses_count)
      if (!err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('access_codes')
          .update({ uses_count: row.uses_count + 1 })
          .eq('id', row.id);
      }
      if (err) {
        setError(err.message);
        return;
      }
      setSuccess('¡Cuenta creada! Revisa tu email para confirmar tu acceso.');
    } catch {
      setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!email.trim()) {
      setError('Ingresa tu email.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
      );
      if (err) {
        setError(err.message);
        return;
      }
      setSuccess('Te enviamos un enlace para restablecer tu contraseña.');
    } catch {
      setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const submit =
    mode === 'login' ? handleLogin
    : mode === 'register' ? handleRegister
    : handleForgot;

  return (
    <KeyboardAvoidingView
      style={screen.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}>
      <ScrollView
        contentContainerStyle={[screen.content, { paddingTop: insets.top + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ── Brand header ── */}
        <View style={styles.header}>
          <PolarisMark size={52} />
          <Text style={styles.brand}>POLARIS GROWTH INSTITUTE</Text>
          <Text style={styles.title}>
            {mode === 'login'    ? 'BIENVENIDO\nDE VUELTA.'
             : mode === 'register' ? 'ACTIVA TU\nCUENTA.'
             : 'RECUPERA TU\nACCESO.'}
          </Text>
        </View>

        {/* ── Mode switcher ── */}
        {mode !== 'forgot' && (
          <View style={styles.modeSwitcher}>
            <Pressable
              onPress={() => reset('login')}
              style={[styles.modeTab, mode === 'login' && styles.modeTabActive]}>
              <Text style={[styles.modeTabText, mode === 'login' && styles.modeTabTextActive]}>
                INICIAR SESIÓN
              </Text>
            </Pressable>
            <Pressable
              onPress={() => reset('register')}
              style={[styles.modeTab, mode === 'register' && styles.modeTabActive]}>
              <Text style={[styles.modeTabText, mode === 'register' && styles.modeTabTextActive]}>
                REGISTRARSE
              </Text>
            </Pressable>
          </View>
        )}

        <GoldDivider />

        {/* ── Form fields ── */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <PremiumInput
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType={mode === 'forgot' ? 'send' : 'next'}
              onSubmitEditing={mode === 'forgot' ? handleForgot : undefined}
            />
          </View>
          {mode !== 'forgot' && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>CONTRASEÑA</Text>
              <PremiumInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                returnKeyType={mode === 'register' ? 'next' : 'done'}
                onSubmitEditing={mode === 'register' ? undefined : submit}
              />
            </View>
          )}
          {mode === 'register' && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>CÓDIGO DE ACCESO</Text>
              <PremiumInput
                value={accessCode}
                onChangeText={(t) => setAccessCode(t.toUpperCase())}
                placeholder="POLARIS-XXXX"
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={submit}
              />
              <Text style={styles.codeHint}>
                Tu coach te entregó este código al inscribirte.
              </Text>
            </View>
          )}
        </View>

        {/* ── Feedback ── */}
        {!!error && (
          <View style={styles.feedbackBox}>
            <MaterialIcons name="error-outline" size={16} color={palette.danger} />
            <Text style={[styles.feedbackText, { color: palette.danger }]}>{error}</Text>
          </View>
        )}
        {!!success && (
          <View style={styles.feedbackBox}>
            <MaterialIcons name="check-circle-outline" size={16} color={palette.success} />
            <Text style={[styles.feedbackText, { color: palette.success }]}>{success}</Text>
          </View>
        )}

        {/* ── Primary CTA ── */}
        <PrimaryButton
          label={
            loading       ? 'PROCESANDO...'
            : mode === 'login'    ? 'ENTRAR AL PROTOCOLO'
            : mode === 'register' ? 'CREAR CUENTA'
            : 'ENVIAR ENLACE'
          }
          icon={loading ? 'hourglass-empty' : mode === 'forgot' ? 'mail' : 'arrow-forward'}
          onPress={submit}
          disabled={loading}
        />

        {/* ── Secondary links ── */}
        {mode === 'login' && (
          <Pressable onPress={() => reset('forgot')} style={styles.linkWrap}>
            <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
          </Pressable>
        )}
        {mode === 'forgot' && (
          <SecondaryButton label="VOLVER AL LOGIN" onPress={() => reset('login')} />
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  brand: {
    ...typography.label,
    color: palette.gold,
    letterSpacing: 2,
  },
  title: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 46,
    textTransform: 'uppercase',
  },

  modeSwitcher: {
    borderColor: palette.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  modeTab: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: spacing.md,
  },
  modeTabActive: {
    backgroundColor: palette.gold,
  },
  modeTabText: {
    ...typography.label,
    color: palette.ash,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  modeTabTextActive: {
    color: palette.black,
  },

  form: {
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.label,
    color: palette.ash,
  },

  feedbackBox: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  feedbackText: {
    ...typography.body,
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },

  codeHint: {
    ...typography.mono,
    color: palette.smoke,
    fontSize: 11,
    marginTop: 4,
  },

  linkWrap: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  link: {
    ...typography.body,
    color: palette.smoke,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
