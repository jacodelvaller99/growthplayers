import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable,
  KeyboardAvoidingView, Platform, StyleSheet, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  FadeIn, FadeInDown, FadeInUp,
  useSharedValue, useAnimatedStyle, withTiming, withRepeat,
  withSequence, Easing,
} from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';
import { getProfile } from '../../lib/database';
import { useAuthStore } from '../../store';

const { width: W, height: H } = Dimensions.get('window');

// ─── Design Tokens ──────────────────────────────────────────────────────────
const T = {
  bg:          '#080808',
  surface:     '#111111',
  surface2:    '#181818',
  gold:        '#EDBA01',
  goldMid:     'rgba(237,186,1,0.16)',
  goldBorder:  'rgba(237,186,1,0.24)',
  goldDim:     'rgba(237,186,1,0.45)',
  goldFaint:   'rgba(237,186,1,0.07)',
  text:        '#FFFFFF',
  textMid:     '#888888',
  textDim:     'rgba(237,186,1,0.38)',
  error:       '#EF4444',
  errorBg:     'rgba(239,68,68,0.08)',
};

// ─── Polaris Star SVG-like shape (drawn with Views) ─────────────────────────
const PolarisIcon = () => (
  <View style={star.wrap}>
    {/* outer ring */}
    <View style={star.ring} />
    {/* cross arms */}
    <View style={[star.arm, star.armV]} />
    <View style={[star.arm, star.armH]} />
    {/* center dot */}
    <View style={star.center} />
  </View>
);

const star = StyleSheet.create({
  wrap: {
    width: 52, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5, borderColor: 'rgba(237,186,1,0.30)',
  },
  arm: {
    position: 'absolute',
    backgroundColor: '#EDBA01',
    borderRadius: 2,
  },
  armV: { width: 2, height: 40 },
  armH: { width: 40, height: 2 },
  center: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#EDBA01',
  },
});

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setSession } = useAuthStore();

  // ambient glow pulse
  const glowOpacity = useSharedValue(0.06);
  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.12, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.06, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, false
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setIsLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

      if (authError) {
        const isNetworkError = authError.message?.toLowerCase().includes('fetch')
          || authError.message?.toLowerCase().includes('network');
        const isPlaceholder = process.env.EXPO_PUBLIC_SUPABASE_URL?.includes('your-project');

        if (isNetworkError && isPlaceholder) {
          setSession({ user: { id: `dev-${Date.now()}`, email, user_metadata: {} }, access_token: 'dev-token' } as any);
          router.replace('/(tabs)/comando');
          return;
        }
        if (isNetworkError) {
          setError('Sin conexión. Verifica tu internet.');
        } else if (authError.message === 'Invalid login credentials') {
          setError('Correo o contraseña incorrectos.');
        } else {
          setError(authError.message);
        }
        return;
      }

      if (data.session) {
        setSession(data.session);
        const profile = await getProfile(data.session.user.id);
        if (!profile?.program_type || !profile?.archetype_id || !profile?.norte) {
          router.replace('/(onboarding)');
        } else {
          router.replace('/(tabs)/comando');
        }
      }
    } catch {
      setError('Error al iniciar sesión. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isLoading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      {/* Ambient gold glow — top right */}
      <Animated.View
        pointerEvents="none"
        style={[styles.glowBall, glowStyle]}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── LOGO BLOCK ─────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(700)} style={styles.logoBlock}>
          <PolarisIcon />
          <Text style={styles.logoWord}>LIFEFLOW</Text>
          <View style={styles.logoDivider} />
          <Text style={styles.logoTagline}>LIDERA TU DÍA. DOMINA TU VIDA.</Text>
        </Animated.View>

        {/* ── FORM CARD ──────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.card}>

          {/* Title */}
          <Text style={styles.formTitle}>ACCESO AL{'\n'}PROTOCOLO</Text>
          <View style={styles.formTitleLine} />

          {/* Email */}
          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, emailFocused && { color: T.gold }]}>
              CORREO ELECTRÓNICO
            </Text>
            <TextInput
              style={[styles.input, emailFocused && styles.inputFocused]}
              placeholder="tu@email.com"
              placeholderTextColor={T.textMid}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              editable={!isLoading}
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, passFocused && { color: T.gold }]}>CONTRASEÑA</Text>
            <View style={styles.passRow}>
              <TextInput
                style={[styles.input, styles.inputPass, passFocused && styles.inputFocused]}
                placeholder="••••••••"
                placeholderTextColor={T.textMid}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
                secureTextEntry={!showPass}
                autoComplete="password"
                textContentType="password"
                editable={!isLoading}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <Pressable
                onPress={() => setShowPass(v => !v)}
                style={styles.passToggle}
                accessibilityLabel={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <MaterialCommunityIcons
                  name={showPass ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={T.textMid}
                />
              </Pressable>
            </View>
          </View>

          {/* Error */}
          {!!error && (
            <Animated.View entering={FadeIn.duration(250)} style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={15} color={T.error} />
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          )}

          {/* Primary CTA */}
          <Pressable
            onPress={handleLogin}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.ctaBtn,
              !canSubmit && styles.ctaBtnDisabled,
              pressed && canSubmit && styles.ctaBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Ingresar al protocolo"
          >
            {isLoading ? (
              <Text style={styles.ctaText}>INGRESANDO…</Text>
            ) : (
              <>
                <Text style={styles.ctaText}>COMENZAR MI PROTOCOLO</Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color={T.bg} />
              </>
            )}
          </Pressable>

          {/* OR divider */}
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>O</Text>
            <View style={styles.orLine} />
          </View>

          {/* OAuth buttons */}
          <View style={{ gap: 10 }}>
            <Pressable
              onPress={() => console.log('Apple Sign In')}
              style={({ pressed }) => [styles.oauthBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={{ fontSize: 17, lineHeight: 20 }}>🍎</Text>
              <Text style={styles.oauthText}>Continuar con Apple</Text>
            </Pressable>

            <Pressable
              onPress={() => console.log('Google Sign In')}
              style={({ pressed }) => [styles.oauthBtn, pressed && { opacity: 0.7 }]}
            >
              <AntDesign name="google" size={16} color={T.goldDim} />
              <Text style={styles.oauthText}>Continuar con Google</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* ── REGISTER LINK ──────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.registerRow}>
          <Text style={styles.registerMuted}>¿Sin cuenta?</Text>
          <Pressable onPress={() => router.push('/(auth)/register')} hitSlop={10}>
            <Text style={styles.registerLink}>REGÍSTRATE</Text>
          </Pressable>
        </Animated.View>

        {/* ── BOTTOM WORDMARK ────────────────────────────────────── */}
        <Animated.View entering={FadeIn.delay(600).duration(800)} style={styles.bottomMark}>
          <Text style={styles.bottomMarkText}>POLARIS GROWTH INSTITUTE™</Text>
        </Animated.View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },

  glowBall: {
    position: 'absolute',
    top: -H * 0.15,
    right: -W * 0.3,
    width: W * 0.9,
    height: W * 0.9,
    borderRadius: W * 0.45,
    backgroundColor: T.gold,
    pointerEvents: 'none',
  },

  scroll: {
    paddingHorizontal: 24,
    alignItems: 'stretch',
    gap: 28,
  },

  // Logo
  logoBlock: { alignItems: 'center', gap: 14 },
  logoWord: {
    fontSize: 38, fontFamily: 'SpaceGrotesk_700Bold',
    color: T.gold, letterSpacing: 8,
  },
  logoDivider: { width: 32, height: 1.5, backgroundColor: T.gold, opacity: 0.5 },
  logoTagline: {
    fontSize: 10, fontFamily: 'SpaceGrotesk_600SemiBold',
    color: T.goldDim, letterSpacing: 3, textAlign: 'center',
  },

  // Card
  card: {
    backgroundColor: T.surface,
    borderWidth: 1, borderColor: 'rgba(237,186,1,0.10)',
    borderRadius: 20, padding: 26,
    gap: 18,
    shadowColor: T.gold, shadowOpacity: 0.05, shadowRadius: 24, shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  formTitle: {
    fontSize: 28, fontFamily: 'SpaceGrotesk_700Bold',
    color: T.text, lineHeight: 34, letterSpacing: 0.5,
  },
  formTitleLine: { width: 28, height: 2, backgroundColor: T.gold },

  // Fields
  fieldWrap: { gap: 8 },
  fieldLabel: {
    fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold',
    color: T.textMid, letterSpacing: 2.5, textTransform: 'uppercase',
  },
  input: {
    backgroundColor: T.surface2,
    borderWidth: 1.5, borderColor: 'rgba(237,186,1,0.10)',
    borderRadius: 12, height: 54,
    paddingHorizontal: 16,
    fontFamily: 'SpaceGrotesk_400Regular', fontSize: 15,
    color: T.text,
  },
  inputFocused: { borderColor: T.goldBorder },
  inputPass: { flex: 1, borderRightWidth: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  passRow: { flexDirection: 'row', alignItems: 'center' },
  passToggle: {
    height: 54, width: 48, justifyContent: 'center', alignItems: 'center',
    backgroundColor: T.surface2, borderWidth: 1.5, borderLeftWidth: 0,
    borderColor: 'rgba(237,186,1,0.10)', borderTopRightRadius: 12, borderBottomRightRadius: 12,
  },

  // Error
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.errorBg, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  errorText: {
    fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: T.error, flex: 1,
  },

  // CTA
  ctaBtn: {
    height: 56, borderRadius: 14,
    backgroundColor: T.gold,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  ctaBtnDisabled: { opacity: 0.35 },
  ctaBtnPressed: { opacity: 0.80 },
  ctaText: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14,
    color: T.bg, letterSpacing: 2,
  },

  // OR
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  orText: {
    fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, color: T.textMid,
  },

  // OAuth
  oauthBtn: {
    height: 52, borderRadius: 12,
    borderWidth: 1.5, borderColor: 'rgba(237,186,1,0.12)',
    backgroundColor: T.surface2,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  oauthText: {
    fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13, color: T.goldDim,
  },

  // Register
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  registerMuted: {
    fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: T.textMid,
  },
  registerLink: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: T.gold, letterSpacing: 1,
  },

  // Bottom wordmark
  bottomMark: { alignItems: 'center' },
  bottomMarkText: {
    fontSize: 9, fontFamily: 'SpaceGrotesk_600SemiBold',
    color: 'rgba(237,186,1,0.20)', letterSpacing: 3,
  },
});
