import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';
import { usePolarisStore } from '../../store';
import { supabase } from '../../lib/supabase';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { profile } = usePolarisStore();
  // Extract profile info for display
  const [profileSummary, setProfileSummary] = useState('');

  useEffect(() => {
    setMounted(true);
    if (profile) {
      const summary = `Tu perfil Polaris está listo. Eres un agente con patrón de ${profile.patron}.`;
      setProfileSummary(summary);
    }
  }, [profile]);

  const handleRegister = async () => {
    setIsLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        if (error.message?.toLowerCase().includes('fetch') || error.message?.toLowerCase().includes('network')) {
          setError('Sin conexión. Configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en .env');
          return;
        }
        setError(error.message);
        return;
      }

      if (data.user) {
        // DB trigger auto-creates profile row; go straight to onboarding
        router.replace('/(onboarding)');
      }
    } catch (err: any) {
      setError('Error al registrarse. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.richBlack }}>
      {/* Subtle background glow */}
      <Animated.View
        style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: 200,
          backgroundColor: Colors.mint,
          opacity: 0.03,
        }}
      />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'space-between',
          paddingHorizontal: 24,
          paddingVertical: 48,
        }}
      >
        {/* Profile Summary Card */}
        {profileSummary && (
          <Animated.View
            entering={FadeIn.duration(500)}
            style={{
              backgroundColor: Colors.mintLight,
              borderWidth: 1,
              borderColor: Colors.mintBorder,
              borderRadius: 12,
              padding: 18,
              marginBottom: 32,
            }}
          >
            <Text
              style={[
                Typography.tag,
                {
                  color: Colors.mint,
                  marginBottom: 8,
                },
              ]}
            >
              TU PERFIL POLARIS
            </Text>
            <Text
              style={[
                Typography.body,
                {
                  color: Colors.text,
                  lineHeight: 20,
                },
              ]}
            >
              {profileSummary}
            </Text>
          </Animated.View>
        )}

        {/* Header with chevron */}
        <Animated.View
          entering={FadeInUp.delay(100).duration(600)}
          style={{ alignItems: 'center', marginBottom: 48 }}
        >
          <View style={{ marginBottom: 24 }}>
            <MaterialCommunityIcons
              name="chevron-right"
              size={40}
              color={Colors.mint}
              style={{ transform: [{ rotate: '90deg' }] }}
            />
          </View>
          <Text
            style={[
              Typography.h1,
              {
                color: Colors.mint,
                letterSpacing: 1,
                marginBottom: 8,
              },
            ]}
          >
            LIFEFLOW
          </Text>
          <Text
            style={[
              Typography.meta,
              {
                color: Colors.textMuted,
              },
            ]}
          >
            Crea Tu Protocolo
          </Text>
        </Animated.View>

        {/* Register Card */}
        <Animated.View
          entering={FadeIn.delay(300).duration(600)}
          style={{
            borderWidth: 1,
            borderColor: Colors.mintBorder,
            borderRadius: 12,
            padding: 32,
            backgroundColor: 'rgba(1, 25, 29, 0.6)',
            marginBottom: 32,
          }}
        >
          <Text
            style={[
              Typography.h2,
              {
                color: Colors.mint,
                marginBottom: 28,
                letterSpacing: 0.5,
              },
            ]}
          >
            Crea tu Cuenta
          </Text>

          {/* Email Input */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={[
                Typography.tag,
                {
                  color: Colors.textMuted,
                  marginBottom: 8,
                },
              ]}
            >
              Email
            </Text>
            <TextInput
              placeholder="tu@email.com"
              placeholderTextColor={Colors.textFaint}
              value={email}
              onChangeText={setEmail}
              editable={!isLoading}
              style={{
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: Colors.mintBorder,
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 14,
                color: Colors.text,
                fontFamily: 'SpaceGrotesk_400Regular',
                fontSize: 16,
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password Input */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={[
                Typography.tag,
                {
                  color: Colors.textMuted,
                  marginBottom: 8,
                },
              ]}
            >
              Contraseña
            </Text>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor={Colors.textFaint}
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
              secureTextEntry
              style={{
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: Colors.mintBorder,
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 14,
                color: Colors.text,
                fontFamily: 'SpaceGrotesk_400Regular',
                fontSize: 16,
              }}
            />
          </View>

          {/* Confirm Password Input */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={[
                Typography.tag,
                {
                  color: Colors.textMuted,
                  marginBottom: 8,
                },
              ]}
            >
              Confirmar Contraseña
            </Text>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor={Colors.textFaint}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!isLoading}
              secureTextEntry
              style={{
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: Colors.mintBorder,
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 14,
                color: Colors.text,
                fontFamily: 'SpaceGrotesk_400Regular',
                fontSize: 16,
              }}
            />
          </View>

          {/* Error Message */}
          {error && (
            <Animated.View entering={FadeIn.duration(300)} style={{ marginBottom: 16 }}>
              <Text
                style={[
                  Typography.bodySmall,
                  {
                    color: Colors.error,
                  },
                ]}
              >
                ✕ {error}
              </Text>
            </Animated.View>
          )}

          {/* Register Button */}
          <Pressable
            onPress={handleRegister}
            disabled={isLoading || !email || !password || !confirmPassword}
            style={({ pressed }) => ({
              backgroundColor:
                isLoading || !email || !password || !confirmPassword
                  ? 'rgba(174, 254, 240, 0.15)'
                  : pressed
                    ? 'rgba(174, 254, 240, 0.25)'
                    : Colors.mint,
              borderRadius: 8,
              paddingVertical: 14,
              paddingHorizontal: 24,
              opacity: isLoading || !email || !password || !confirmPassword ? 0.5 : 1,
            })}
          >
            <Text
              style={[
                Typography.button,
                {
                  color: Colors.richBlack,
                  textAlign: 'center',
                },
              ]}
            >
              {isLoading ? 'CREANDO CUENTA...' : 'REGISTRARSE'}
            </Text>
          </Pressable>
        </Animated.View>

        {/* Login Link */}
        <Animated.View
          entering={FadeIn.delay(500).duration(600)}
          style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}
        >
          <Text style={[Typography.body, { color: Colors.textSecondary }]}>
            ¿Ya tienes cuenta?{' '}
          </Text>
          <Pressable onPress={() => router.push('/(auth)/login')}>
            <Text
              style={[
                Typography.button,
                {
                  color: Colors.mint,
                  textDecorationLine: 'underline',
                },
              ]}
            >
              Inicia Sesión
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
