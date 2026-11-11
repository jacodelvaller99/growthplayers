// ─── Restablecer contraseña (web) ─────────────────────────────────────────────
// El enlace de recuperación de Supabase abre esta pantalla con el token en la URL.
// Con detectSessionInUrl:true (web) Supabase establece la sesión y emite el evento
// PASSWORD_RECOVERY. Aquí el usuario fija una nueva contraseña con updateUser.
// Antes este flujo no existía → un usuario web bloqueado no podía recuperar su cuenta.

import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { AccessField, AccessFrame, AccessLink, AccessNotice } from '@/components/auth/AccessFrame';
import { PrimaryButton } from '@/components/polaris';
import { parseRecoveryTokens } from '@/lib/authRecovery';
import { logSilentError } from '@/lib/observability';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const router = useRouter();

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
    // Enlace vencido o ya usado: Supabase lo dice en la URL (otp_expired…).
    if (Platform.OS === 'web' && typeof window !== 'undefined'
      && /error_code|error_description/.test(window.location.hash + window.location.search)) {
      setError('Este enlace ya venció o ya se usó. Cada enlace sirve una sola vez y dura 1 hora: pide uno nuevo.');
    }
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) setReady(true);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  // ── Nativo: el deep link trae los tokens crudos ─────────────────────────────
  // En web `detectSessionInUrl` parsea la URL solo; en iOS/Android está apagado
  // (no hay URL de navegador), así que el enlace `polaris://reset-password#...`
  // llegaba sin que nadie lo leyera y la pantalla se quedaba en "abre el enlace
  // del correo" para siempre. Aquí se canjea a mano por una sesión.
  const deepLink = Linking.useURL();
  useEffect(() => {
    if (Platform.OS === 'web' || ready) return;
    const tokens = parseRecoveryTokens(deepLink);
    if (!tokens) return;
    let active = true;
    supabase.auth.setSession(tokens).then(({ error: err }) => {
      if (!active) return;
      if (err) {
        logSilentError('auth.resetPassword.setSession', err);
        setError('Este enlace ya venció o fue usado. Solicita uno nuevo desde el login.');
        return;
      }
      setReady(true);
    });
    return () => { active = false; };
  }, [deepLink, ready]);

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

  const goLogin = () => router.replace('/(auth)');

  if (done) {
    return (
      <AccessFrame
        meta="NUEVA CONTRASEÑA"
        star
        title={'Listo.'}
        sub="Tu contraseña quedó guardada. Te llevamos a entrar…"
        bottom={<AccessLink label="Entrar ahora" onPress={goLogin} />}
      />
    );
  }

  // Sin sesión de recuperación. Si el canje del enlace falló hay un motivo
  // concreto (vencido, ya usado) y se dice; si no, es que se llegó de frente.
  if (!ready) {
    return (
      <AccessFrame
        meta="NUEVA CONTRASEÑA"
        title={error ? 'Este enlace\nya no sirve.' : 'Abre el enlace\ndel correo.'}
        sub={error ?? 'Esta pantalla se abre desde el enlace que te enviamos. Si llegaste por error, pide uno nuevo.'}
        bottom={<PrimaryButton label="PEDIR UN ENLACE NUEVO" icon="arrow-forward" onPress={goLogin} />}
      />
    );
  }

  return (
    <AccessFrame
      meta="NUEVA CONTRASEÑA"
      title={'Elige una\ncontraseña\nnueva.'}
      bottom={
        <>
          <PrimaryButton
            label={loading ? 'GUARDANDO…' : 'GUARDAR'}
            icon="arrow-forward"
            onPress={submit}
            disabled={loading}
          />
          <AccessLink label="Cancelar" onPress={goLogin} />
        </>
      }>
      <AccessField
        label="NUEVA · 8 O MÁS"
        secret
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        textContentType="newPassword"
        autoComplete="password-new"
        accessibilityLabel="Nueva contraseña"
      />
      <AccessField
        label="REPÍTELA"
        secret
        value={confirm}
        onChangeText={setConfirm}
        autoCapitalize="none"
        returnKeyType="send"
        onSubmitEditing={submit}
        textContentType="newPassword"
        autoComplete="password-new"
        accessibilityLabel="Confirmar contraseña"
      />
      {!!error && <AccessNotice tone="error">{error}</AccessNotice>}
    </AccessFrame>
  );
}
