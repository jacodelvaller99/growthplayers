// ─── Restablecer contraseña (web) ─────────────────────────────────────────────
// El enlace de recuperación de Supabase abre esta pantalla con el token en la URL.
// Con detectSessionInUrl:true (web) Supabase establece la sesión y emite el evento
// PASSWORD_RECOVERY. Aquí el usuario fija una nueva contraseña con updateUser.
// Antes este flujo no existía → un usuario web bloqueado no podía recuperar su cuenta.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  PolarisMark,
  PremiumInput,
  PrimaryButton,
  SecondaryButton,
  useScreen,
} from '@/components/polaris';
import { Fonts, palette, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [ready, setReady] = useState(false);       // hay sesión de recuperación válida
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Detecta la sesión de recuperación: por evento PASSWORD_RECOVERY o por sesión ya
  // establecida (detectSessionInUrl ya parseó el token al cargar).
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) setReady(true);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const submit = async () => {
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) { setError(err.message); return; }
      setDone(true);
      setTimeout(() => router.replace('/(auth)'), 1800);
    } catch {
      setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={sc.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[sc.content, { paddingTop: insets.top + 48, paddingBottom: 60 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <View style={styles.head}>
          <PolarisMark size={44} />
          <Text style={styles.title}>NUEVA CONTRASEÑA</Text>
          <Text style={styles.sub}>Define una contraseña nueva para tu cuenta Polaris.</Text>
        </View>

        {done ? (
          <View style={styles.doneBox}>
            <MaterialIcons name="check-circle" size={40} color={palette.success} />
            <Text style={styles.doneText}>Contraseña actualizada. Te llevamos al inicio…</Text>
          </View>
        ) : !ready ? (
          <View style={styles.doneBox}>
            <MaterialIcons name="link" size={36} color={palette.goldText} />
            <Text style={styles.waitText}>
              Abre esta pantalla desde el enlace que te enviamos por correo. Si llegaste por error,
              vuelve al inicio y solicita un nuevo enlace.
            </Text>
            <SecondaryButton label="VOLVER AL LOGIN" onPress={() => router.replace('/(auth)')} />
          </View>
        ) : (
          <>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>NUEVA CONTRASEÑA</Text>
              <PremiumInput
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 8 caracteres"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>CONFIRMAR CONTRASEÑA</Text>
              <PremiumInput
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Repite la contraseña"
                secureTextEntry
                autoCapitalize="none"
                returnKeyType="send"
                onSubmitEditing={submit}
              />
            </View>
            {error && <Text style={styles.error}>{error}</Text>}
            <PrimaryButton
              label={loading ? 'GUARDANDO…' : 'GUARDAR CONTRASEÑA'}
              icon={loading ? 'hourglass-empty' : 'lock'}
              onPress={submit}
              disabled={loading}
            />
            <SecondaryButton label="CANCELAR" onPress={() => router.replace('/(auth)')} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  field: { gap: spacing.xs, marginBottom: spacing.md },
  fieldLabel: { ...typography.label, color: palette.smoke, fontSize: 11, letterSpacing: 1 },
  title: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 20, color: palette.ivory, letterSpacing: 1.5, marginTop: spacing.sm },
  sub: { ...typography.body, color: palette.ash, textAlign: 'center', maxWidth: 320 },
  error: { ...typography.caption, color: palette.danger, fontSize: 13, marginVertical: spacing.xs },
  doneBox: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  doneText: { ...typography.body, color: palette.ivory, textAlign: 'center' },
  waitText: { ...typography.body, color: palette.ash, textAlign: 'center', lineHeight: 21 },
});
