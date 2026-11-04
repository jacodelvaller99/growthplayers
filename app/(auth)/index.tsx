import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { AccessField, AccessFrame, AccessLink, AccessNotice } from '@/components/auth/AccessFrame';
import { PrimaryButton } from '@/components/polaris';
import {
  RECOVERY_COOLDOWN_SEC,
  describeRecoveryError,
  recoverySentMessage,
} from '@/lib/authRecovery';
import { logSilentError } from '@/lib/observability';
import { supabase } from '@/lib/supabase';

type AuthMode = 'login' | 'register' | 'forgot';

export default function AuthScreen() {
  const router = useRouter();
  // Read optional mode param passed from the welcome screen
  const { mode: initialMode } = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<AuthMode>(
    initialMode === 'register' ? 'register' : 'login',
  );
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);
  // Segundos que falta esperar para volver a pedir un enlace de recuperación.
  const [cooldown, setCooldown] = useState(0);

  // Cuenta regresiva visible. Sin esto el cliente pulsa cinco veces, Supabase
  // corta por límite de correos y la pantalla seguía diciendo "enviado".
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

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
  // Los tres flujos de auth repetían el mismo envoltorio literal: setLoading,
  // limpiar error, try, catch de red con el mismo mensaje, finally. Solo el
  // cuerpo cambiaba. Ahora el envoltorio vive en un sitio — y de paso el error
  // real deja rastro en vez de morir en un `catch {}` pelado.
  const runAuthAction = async (context: string, action: () => Promise<void>) => {
    setLoading(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      logSilentError(context, e);
      setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Escribe tu correo y tu contraseña.');
      return;
    }
    await runAuthAction('auth.login', async () => {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (err) {
        const msg = err.message.toLowerCase();
        if (msg.includes('invalid') || msg.includes('credentials')) {
          setError('Correo o contraseña incorrectos.');
        } else if (msg.includes('not confirmed') || msg.includes('email')) {
          setError('Confirma tu correo antes de entrar: revisa tu bandeja de entrada.');
        } else {
          setError(err.message);
        }
      }
      // Si no hay error, el onAuthStateChange dispara SIGNED_IN y navega solo
    });
  };

  const handleRegister = async () => {
    // El código es opcional: sin él se entra en plan Free (lo que anuncia /pricing).
    if (!email.trim() || !password.trim()) {
      setError('Escribe tu correo y una contraseña.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    await runAuthAction('auth.register', async () => {
      // VALIDAR, no consumir. Aquí todavía no existe el usuario al que
      // activarle la membresía, así que quemar el código en este punto lo
      // dejaba agotado para el ÚNICO sitio que sí la activa (el paso 5 del
      // onboarding): el cliente pagaba, se registraba, y tres pantallas
      // después leía "este código ya fue usado" — el suyo, quemado por la app
      // misma treinta segundos antes. Entraba en tier free y al tercer mensaje
      // a Norman chocaba con un paywall que en la PWA no tiene salida.
      //
      // `check_access_code` (migración 20260804010000) valida sin tocar
      // `uses_count`. El consumo Y la activación ocurren juntos, después, con
      // `auth.uid()`.
      const code = accessCode.trim().toUpperCase();
      const { data: status, error: rpcErr } = code
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? await (supabase as any).rpc('check_access_code', { p_code: code })
        : { data: 'ok', error: null };

      if (rpcErr) {
        setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
        return;
      }
      if (status !== 'ok') {
        const msg: Record<string, string> = {
          invalid:   'Código de acceso inválido. Verifica que esté bien escrito.',
          inactive:  'Código inactivo. Contacta a tu coach.',
          expired:   'Este código ha vencido. Solicita uno nuevo a tu coach.',
          exhausted: 'Este código ya fue usado. Solicita uno nuevo a tu coach.',
        };
        setError(msg[String(status)] ?? 'Código de acceso inválido. Verifica que esté bien escrito.');
        return;
      }

      // Código válido (sin consumir) — crear cuenta. El código viaja en el
      // metadata para que el onboarding no obligue a reescribirlo: lo pedía
      // dos veces con el mismo copy, y el segundo era el que contaba.
      const { error: err } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: code ? { data: { access_code: code } } : undefined,
      });
      if (err) {
        setError(err.message);
        return;
      }
      setSuccess('Cuenta creada. Revisa tu correo para confirmarla.');
    });
  };

  const handleForgot = async () => {
    if (!email.trim()) {
      setError('Escribe tu correo.');
      return;
    }
    if (cooldown > 0) return;
    await runAuthAction('auth.forgotPassword', async () => {
      // El enlace debe volver a /reset-password. En web es la URL del sitio; en
      // nativo era `undefined`, así que el correo abría el navegador y dejaba al
      // cliente fuera de la app — ahora vuelve por el esquema `polaris://`.
      // Requiere que ambas URLs estén registradas en Supabase → Auth → Redirect URLs.
      const redirectTo = Platform.OS === 'web' && typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : Linking.createURL('/reset-password');
      const target = email.trim().toLowerCase();
      const { error: err } = await supabase.auth.resetPasswordForEmail(
        target,
        redirectTo ? { redirectTo } : undefined,
      );
      if (err) {
        // El envío falló de verdad: se dice, y se respeta la espera que pide
        // el servidor en vez de invitar a reintentar contra un muro.
        const failure = describeRecoveryError(err);
        logSilentError('auth.forgotPassword.rejected', err);
        setError(failure.message);
        setCooldown(failure.cooldownSec);
        return;
      }
      setSuccess(recoverySentMessage(target));
      setCooldown(RECOVERY_COOLDOWN_SEC);
    });
  };

  const submit =
    mode === 'login' ? handleLogin
    : mode === 'register' ? handleRegister
    : handleForgot;

  // Enviado: el correo de recuperación salió. Pantalla propia, no un aviso
  // escondido bajo el botón — es lo único que la persona tiene que hacer ahora.
  if (mode === 'forgot' && success) {
    return (
      <AccessFrame
        meta="RECUPERAR ACCESO"
        star
        title={'Revisa\ntu correo.'}
        sub={success}
        bottom={
          <>
            <PrimaryButton
              label={loading ? 'ENVIANDO…' : cooldown > 0 ? `REENVIAR EN ${cooldown} S` : 'REENVIAR ENLACE'}
              icon="arrow-forward"
              onPress={submit}
              disabled={loading || cooldown > 0}
            />
            <AccessLink label="Volver a entrar" onPress={() => reset('login')} />
          </>
        }>
        {!!error && <AccessNotice tone="error">{error}</AccessNotice>}
        <AccessNotice tone="ok">
          ¿No llega? Revisa spam. Si sigue sin llegar, escribe a hola@polarisgrowthinstitute.com.
        </AccessNotice>
      </AccessFrame>
    );
  }

  const copy = {
    login: { meta: 'POLARIS', right: undefined, title: 'Bienvenido\nde vuelta.', sub: undefined, cta: 'ENTRAR' },
    register: { meta: 'CREAR CUENTA', right: '1 MIN', title: 'Empieza\nhoy.', sub: undefined, cta: 'CREAR CUENTA' },
    forgot: {
      meta: 'RECUPERAR ACCESO', right: undefined, title: 'Recupera\ntu acceso.',
      sub: 'Te enviamos un enlace al correo.',
      cta: cooldown > 0 ? `REENVIAR EN ${cooldown} S` : 'ENVIAR ENLACE',
    },
  }[mode];

  return (
    <AccessFrame
      meta={copy.meta}
      metaRight={copy.right}
      brand={mode === 'login'}
      title={copy.title}
      sub={copy.sub}
      bottom={
        <>
          <PrimaryButton
            label={loading ? 'UN MOMENTO…' : copy.cta}
            icon="arrow-forward"
            onPress={submit}
            disabled={loading || (mode === 'forgot' && cooldown > 0)}
          />
          {mode === 'login' && <AccessLink lead="¿No tienes cuenta?" label="Créala" onPress={() => reset('register')} />}
          {mode === 'register' && <AccessLink lead="¿Ya tienes cuenta?" label="Entra" onPress={() => reset('login')} />}
          {mode === 'forgot' && <AccessLink label="Volver a entrar" onPress={() => reset('login')} />}
        </>
      }>
      <AccessField
        label="CORREO"
        value={email}
        onChangeText={setEmail}
        placeholder="tu@correo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="emailAddress"
        autoComplete="email"
        returnKeyType={mode === 'forgot' ? 'send' : 'next'}
        onSubmitEditing={mode === 'forgot' ? handleForgot : undefined}
      />
      {mode !== 'forgot' && (
        <AccessField
          label={mode === 'register' ? 'CONTRASEÑA · 6 O MÁS' : 'CONTRASEÑA'}
          secret
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          autoCapitalize="none"
          textContentType={mode === 'register' ? 'newPassword' : 'password'}
          autoComplete={mode === 'register' ? 'password-new' : 'password'}
          returnKeyType={mode === 'register' ? 'next' : 'done'}
          onSubmitEditing={mode === 'register' ? undefined : submit}
        />
      )}
      {mode === 'login' && (
        <AccessLink label="Olvidé mi contraseña" align="end" onPress={() => reset('forgot')} />
      )}
      {mode === 'register' && (
        <AccessField
          label="CÓDIGO DE TU COACH · OPCIONAL"
          value={accessCode}
          onChangeText={(t) => setAccessCode(t.toUpperCase())}
          placeholder="POLARIS-XXXX"
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          returnKeyType="done"
          onSubmitEditing={submit}
        />
      )}
      {!!error && <AccessNotice tone="error">{error}</AccessNotice>}
      {!!success && <AccessNotice tone="ok">{success}</AccessNotice>}
    </AccessFrame>
  );
}
