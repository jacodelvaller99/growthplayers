import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';
import { getProfile } from '../../lib/database';
import { useAuthStore } from '../../store';

const BRAND = {
  bg: '#0A0A0A',
  surface: '#141414',
  mint: '#EDBA01',
  border: 'rgba(237,186,1,0.12)',
  borderActive: 'rgba(237,186,1,0.30)',
  textPrimary: '#EDBA01',
  textSecondary: 'rgba(237,186,1,0.55)',
  textMuted: 'rgba(237,186,1,0.45)',
  textLight: 'rgba(237,186,1,0.30)',
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const router = useRouter();
  const { setSession } = useAuthStore();

  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    setMounted(true);
    glowOpacity.value = withTiming(1, { duration: 1500 });
  }, []);

  const glowAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: glowOpacity.value,
    };
  });

  const handleLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        const isNetworkError = authError.message?.toLowerCase().includes('fetch') || authError.message?.toLowerCase().includes('network');
        // DEV MODE: bypass when Supabase URL is still the placeholder (credentials not configured yet)
        const isPlaceholderConfig = process.env.EXPO_PUBLIC_SUPABASE_URL?.includes('your-project');
        if (isNetworkError && isPlaceholderConfig) {
          setSession({ user: { id: `dev-${Date.now()}`, email, user_metadata: {} }, access_token: 'dev-token' } as any);
          router.replace('/(tabs)/comando');
          return;
        }
        if (isNetworkError) {
          setError('Sin conexión. Verifica tu internet y las credenciales en .env');
        } else if (authError.message === 'Invalid login credentials') {
          setError('Correo o contraseña incorrectos');
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
    } catch (err: any) {
      setError('Error al iniciar sesión. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: BRAND.bg }}
    >
      {/* Background Glow */}
      <View
        style={{
          position: 'absolute',
          top: -300,
          right: -300,
          width: 700,
          height: 700,
          borderRadius: 350,
          backgroundColor: BRAND.mint,
          opacity: 0.08,
          zIndex: 0,
        }}
      />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 60,
          paddingBottom: 40,
          zIndex: 1,
          position: 'relative',
        }}
        scrollEnabled={false}
      >
        {/* Header */}
        <Animated.View
          entering={FadeIn.delay(150).duration(700)}
          style={{ alignItems: 'center', marginBottom: 56 }}
        >
          {/* Double Chevrons Icon */}
          <View style={{ marginBottom: 28 }}>
            <MaterialCommunityIcons
              name="chevron-up"
              size={44}
              color={BRAND.mint}
              style={{ marginTop: -8 }}
            />
            <MaterialCommunityIcons
              name="chevron-up"
              size={44}
              color={BRAND.mint}
              style={{ marginTop: -16 }}
            />
          </View>

          <Text
            style={{
              fontFamily: 'SpaceGrotesk_700Bold',
              fontSize: 32,
              color: BRAND.mint,
              marginBottom: 12,
              fontWeight: '700',
              letterSpacing: 2,
            }}
          >
            LIFEFLOW
          </Text>

          <View
            style={{
              height: 1.5,
              width: 40,
              backgroundColor: BRAND.mint,
              marginBottom: 16,
            }}
          />

          <Text
            style={{
              fontFamily: 'SpaceGrotesk_400Regular',
              fontSize: 10,
              letterSpacing: 3.5,
              color: BRAND.textMuted,
              fontWeight: '400',
            }}
          >
            PROTOCOLO DE CRECIMIENTO
          </Text>
        </Animated.View>

        {/* Form Card */}
        <Animated.View
          entering={FadeIn.delay(300).duration(700)}
          style={{
            borderWidth: 1,
            borderColor: BRAND.border,
            borderRadius: 16,
            padding: 28,
            backgroundColor: BRAND.surface,
            marginBottom: 32,
            shadowColor: BRAND.mint,
            shadowOpacity: 0.08,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 8 },
          }}
        >
          {/* Email Input */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontFamily: 'SpaceGrotesk_600SemiBold',
                fontSize: 10,
                letterSpacing: 2,
                color: emailFocused ? BRAND.mint : BRAND.textMuted,
                marginBottom: 12,
                fontWeight: '600',
                textTransform: 'uppercase',
              }}
            >
              Correo Electrónico
            </Text>
            <TextInput
              placeholder="tu@email.com"
              placeholderTextColor={BRAND.textLight}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              editable={!isLoading}
              style={{
                backgroundColor: BRAND.bg,
                borderWidth: 1.5,
                borderColor: emailFocused ? BRAND.mint : BRAND.border,
                borderRadius: 12,
                height: 54,
                paddingHorizontal: 18,
                paddingVertical: 16,
                color: BRAND.textPrimary,
                fontFamily: 'SpaceGrotesk_400Regular',
                fontSize: 15,
                fontWeight: '400',
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password Input */}
          <View style={{ marginBottom: 32 }}>
            <Text
              style={{
                fontFamily: 'SpaceGrotesk_600SemiBold',
                fontSize: 10,
                letterSpacing: 2,
                color: passwordFocused ? BRAND.mint : BRAND.textMuted,
                marginBottom: 12,
                fontWeight: '600',
                textTransform: 'uppercase',
              }}
            >
              Contraseña
            </Text>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor={BRAND.textLight}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              editable={!isLoading}
              secureTextEntry
              style={{
                backgroundColor: BRAND.bg,
                borderWidth: 1.5,
                borderColor: passwordFocused ? BRAND.mint : BRAND.border,
                borderRadius: 12,
                height: 54,
                paddingHorizontal: 18,
                paddingVertical: 16,
                color: BRAND.textPrimary,
                fontFamily: 'SpaceGrotesk_400Regular',
                fontSize: 15,
                fontWeight: '400',
              }}
            />
          </View>

          {/* Error Message */}
          {error && (
            <Animated.View
              entering={FadeIn.duration(300)}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderRadius: 8,
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 24,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Text style={{ fontSize: 16, color: '#ef4444' }}>⚠</Text>
              <Text
                style={{
                  fontFamily: 'SpaceGrotesk_400Regular',
                  fontSize: 13,
                  color: '#ef4444',
                  fontWeight: '400',
                  flex: 1,
                }}
              >
                {error}
              </Text>
            </Animated.View>
          )}

          {/* Main CTA Button */}
          <Pressable
            onPress={handleLogin}
            disabled={isLoading || !email || !password}
            style={({ pressed }) => ({
              backgroundColor: BRAND.mint,
              borderRadius: 12,
              height: 56,
              justifyContent: 'center',
              marginBottom: 24,
              opacity: isLoading || !email || !password ? 0.45 : pressed ? 0.85 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: 'SpaceGrotesk_700Bold',
                fontSize: 15,
                fontWeight: '700',
                color: BRAND.bg,
                textAlign: 'center',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              {isLoading ? 'INGRESANDO...' : 'INGRESAR AL PROTOCOLO'}
            </Text>
          </Pressable>

          {/* Divider */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <View style={{ flex: 1, height: 1, backgroundColor: BRAND.border }} />
            <Text
              style={{
                color: BRAND.textMuted,
                marginHorizontal: 14,
                fontSize: 11,
                fontFamily: 'SpaceGrotesk_400Regular',
                fontWeight: '400',
              }}
            >
              O
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: BRAND.border }} />
          </View>

          {/* OAuth Buttons */}
          <View style={{ gap: 12 }}>
            <Pressable
              onPress={() => console.log('Apple Sign In')}
              style={({ pressed }) => ({
                backgroundColor: BRAND.bg,
                borderWidth: 1.5,
                borderColor: BRAND.border,
                borderRadius: 12,
                height: 54,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 18, marginRight: 10 }}>🍎</Text>
              <Text
                style={{
                  fontFamily: 'SpaceGrotesk_600SemiBold',
                  fontSize: 13,
                  color: BRAND.textPrimary,
                  fontWeight: '600',
                  letterSpacing: 0.5,
                }}
              >
                Continuar con Apple
              </Text>
            </Pressable>

            <Pressable
              onPress={() => console.log('Google Sign In')}
              style={({ pressed }) => ({
                backgroundColor: BRAND.bg,
                borderWidth: 1.5,
                borderColor: BRAND.border,
                borderRadius: 12,
                height: 54,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <AntDesign name="google" size={18} color={BRAND.textPrimary} style={{ marginRight: 10 }} />
              <Text
                style={{
                  fontFamily: 'SpaceGrotesk_600SemiBold',
                  fontSize: 13,
                  color: BRAND.textPrimary,
                  fontWeight: '600',
                  letterSpacing: 0.5,
                }}
              >
                Continuar con Google
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Register Link */}
        <Animated.View
          entering={FadeIn.delay(450).duration(700)}
          style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}
        >
          <Text
            style={{
              fontFamily: 'SpaceGrotesk_400Regular',
              fontSize: 13,
              color: BRAND.textMuted,
              fontWeight: '400',
            }}
          >
            ¿No tienes cuenta?
          </Text>
          <Pressable onPress={() => router.push('/(auth)/register')}>
            <Text
              style={{
                fontFamily: 'SpaceGrotesk_700Bold',
                fontSize: 13,
                color: BRAND.mint,
                fontWeight: '700',
                letterSpacing: 0.5,
              }}
            >
              REGÍSTRATE
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
