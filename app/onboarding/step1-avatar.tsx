import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../store';

const BRAND = {
  bg: '#01191D',
  surface: '#0D2B30',
  mint: '#AEFEF0',
  border: 'rgba(174, 254, 240, 0.15)',
  error: 'rgba(239, 68, 68, 0.3)',
  errorBorder: 'rgba(239, 68, 68, 0.6)',
  textPrimary: '#AEFEF0',
  textMuted: 'rgba(174, 254, 240, 0.5)',
  textLight: 'rgba(174, 254, 240, 0.3)',
};

export default function Step1Avatar() {
  const [nombre, setNombre] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [mounted, setMounted] = useState(false);
  const [nombrFocused, setNombreFocused] = useState(false);
  const [objetivoFocused, setObjetivoFocused] = useState(false);
  const [descripcionFocused, setDescripcionFocused] = useState(false);
  const [errors, setErrors] = useState({ nombre: false, objetivo: false, descripcion: false });
  const [isLoading, setIsLoading] = useState(false);
  const [step1StartTime] = useState(Date.now());
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  useEffect(() => {
    setMounted(true);
    if (user?.nombre) setNombre(user.nombre);
    if (user?.objetivo_90_dias) setObjetivo(user.objetivo_90_dias);
    if (user?.avatar_descripcion) setDescripcion(user.avatar_descripcion);
  }, [user]);

  const validateFields = () => {
    const newErrors = {
      nombre: !nombre.trim(),
      objetivo: !objetivo.trim(),
      descripcion: !descripcion.trim(),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const handleActivateAvatar = async () => {
    if (!validateFields()) return;
    if (!user) return;

    setIsLoading(true);

    const updatedUser = {
      ...user,
      nombre: nombre.trim(),
      objetivo_90_dias: objetivo.trim(),
      avatar_descripcion: descripcion.trim(),
    };

    setUser(updatedUser);

    // Save ML tracking data
    try {
      const step1Time = Date.now() - step1StartTime;
      const existingData = await AsyncStorage.getItem('onboarding_data');
      const onboardingData = existingData ? JSON.parse(existingData) : {
        timestamp_inicio: Date.now(),
        tiempo_por_step: {},
        version_app: '1.0.0',
      };

      onboardingData.tiempo_por_step.step1 = step1Time;
      onboardingData.avatar = {
        nombre: nombre.trim(),
        objetivo: objetivo.trim(),
        descripcion: descripcion.trim(),
      };

      await AsyncStorage.setItem('onboarding_data', JSON.stringify(onboardingData));
    } catch (e) {
      console.error('Error saving step1 data:', e);
    }

    router.push('/onboarding/step2-polaris');
  };

  if (!mounted) return null;

  return (
    <View style={{ flex: 1, backgroundColor: BRAND.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 40,
          paddingBottom: 40,
        }}
      >
        {/* Header with Chevrons */}
        <Animated.View entering={FadeIn.delay(100).duration(600)} style={{ marginBottom: 44 }}>
          {/* Double Chevrons */}
          <View style={{ marginBottom: 8, alignItems: 'flex-start' }}>
            <MaterialCommunityIcons
              name="chevron-up"
              size={28}
              color={BRAND.mint}
              style={{ marginTop: -4 }}
            />
            <MaterialCommunityIcons
              name="chevron-up"
              size={28}
              color={BRAND.mint}
              style={{ marginTop: -12 }}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontFamily: 'SpaceGrotesk_700Bold',
                fontSize: 10,
                letterSpacing: 2,
                color: BRAND.mint,
                fontWeight: '700',
                textTransform: 'uppercase',
              }}
            >
              Paso 1 de 4
            </Text>
            <View
              style={{
                flex: 1,
                height: 1,
                backgroundColor: BRAND.border,
                marginLeft: 12,
              }}
            />
          </View>

          <Text
            style={{
              fontFamily: 'SpaceGrotesk_700Bold',
              fontSize: 32,
              color: BRAND.mint,
              marginBottom: 8,
              fontWeight: '700',
              lineHeight: 40,
              letterSpacing: 1,
            }}
          >
            Tu Avatar de Éxito
          </Text>

          <Text
            style={{
              fontFamily: 'SpaceGrotesk_400Regular',
              fontSize: 14,
              color: BRAND.textMuted,
              fontWeight: '400',
              lineHeight: 20,
            }}
          >
            Define quién eres y quién serás cuando logres tu objetivo en 90 días.
          </Text>
        </Animated.View>

        {/* Form Card */}
        <Animated.View
          entering={FadeIn.delay(200).duration(600)}
          style={{
            borderWidth: 1,
            borderColor: BRAND.border,
            borderRadius: 16,
            padding: 28,
            backgroundColor: BRAND.surface,
            marginBottom: 32,
          }}
        >
          {/* Name Input */}
          <View style={{ marginBottom: 28 }}>
            <Text
              style={{
                fontFamily: 'SpaceGrotesk_600SemiBold',
                fontSize: 10,
                letterSpacing: 2,
                color: nombrFocused ? BRAND.mint : errors.nombre ? '#ef4444' : BRAND.textMuted,
                marginBottom: 12,
                fontWeight: '600',
                textTransform: 'uppercase',
              }}
            >
              Tu Nombre
            </Text>
            <TextInput
              placeholder="Ej: Alex"
              placeholderTextColor={BRAND.textLight}
              value={nombre}
              onChangeText={(text) => {
                setNombre(text);
                if (text.trim()) setErrors((prev) => ({ ...prev, nombre: false }));
              }}
              onFocus={() => setNombreFocused(true)}
              onBlur={() => setNombreFocused(false)}
              style={{
                backgroundColor: errors.nombre && !nombrFocused ? BRAND.error : BRAND.bg,
                borderWidth: 1.5,
                borderColor: errors.nombre && !nombrFocused ? BRAND.errorBorder : nombrFocused ? BRAND.mint : BRAND.border,
                borderRadius: 12,
                height: 54,
                paddingHorizontal: 18,
                paddingVertical: 16,
                color: BRAND.textPrimary,
                fontFamily: 'SpaceGrotesk_400Regular',
                fontSize: 15,
                fontWeight: '400',
              }}
              autoCapitalize="words"
              editable={!isLoading}
            />
          </View>

          {/* 90-Day Goal Input */}
          <View style={{ marginBottom: 28 }}>
            <Text
              style={{
                fontFamily: 'SpaceGrotesk_600SemiBold',
                fontSize: 10,
                letterSpacing: 2,
                color: objetivoFocused ? BRAND.mint : errors.objetivo ? '#ef4444' : BRAND.textMuted,
                marginBottom: 12,
                fontWeight: '600',
                textTransform: 'uppercase',
              }}
            >
              Tu Objetivo en 90 Días
            </Text>
            <TextInput
              placeholder="Ej: Lanzar mi negocio, Generar $50K, Bajar 10kg"
              placeholderTextColor={BRAND.textLight}
              value={objetivo}
              onChangeText={(text) => {
                setObjetivo(text);
                if (text.trim()) setErrors((prev) => ({ ...prev, objetivo: false }));
              }}
              onFocus={() => setObjetivoFocused(true)}
              onBlur={() => setObjetivoFocused(false)}
              style={{
                backgroundColor: errors.objetivo && !objetivoFocused ? BRAND.error : BRAND.bg,
                borderWidth: 1.5,
                borderColor: errors.objetivo && !objetivoFocused ? BRAND.errorBorder : objetivoFocused ? BRAND.mint : BRAND.border,
                borderRadius: 12,
                height: 54,
                paddingHorizontal: 18,
                paddingVertical: 16,
                color: BRAND.textPrimary,
                fontFamily: 'SpaceGrotesk_400Regular',
                fontSize: 15,
                fontWeight: '400',
              }}
              autoCapitalize="sentences"
              editable={!isLoading}
            />
          </View>

          {/* Avatar Description Input */}
          <View style={{ marginBottom: 0 }}>
            <Text
              style={{
                fontFamily: 'SpaceGrotesk_600SemiBold',
                fontSize: 10,
                letterSpacing: 2,
                color: descripcionFocused ? BRAND.mint : errors.descripcion ? '#ef4444' : BRAND.textMuted,
                marginBottom: 12,
                fontWeight: '600',
                textTransform: 'uppercase',
              }}
            >
              Quién Serás Cuando Lo Logres
            </Text>
            <TextInput
              placeholder="Sé específico. Ej: Seré un emprendedor exitoso, con buena salud, relaciones sólidas..."
              placeholderTextColor={BRAND.textLight}
              value={descripcion}
              onChangeText={(text) => {
                setDescripcion(text);
                if (text.trim()) setErrors((prev) => ({ ...prev, descripcion: false }));
              }}
              onFocus={() => setDescripcionFocused(true)}
              onBlur={() => setDescripcionFocused(false)}
              multiline
              numberOfLines={4}
              style={{
                backgroundColor: errors.descripcion && !descripcionFocused ? BRAND.error : BRAND.bg,
                borderWidth: 1.5,
                borderColor: errors.descripcion && !descripcionFocused ? BRAND.errorBorder : descripcionFocused ? BRAND.mint : BRAND.border,
                borderRadius: 12,
                minHeight: 120,
                paddingHorizontal: 18,
                paddingVertical: 16,
                color: BRAND.textPrimary,
                fontFamily: 'SpaceGrotesk_400Regular',
                fontSize: 15,
                fontWeight: '400',
                textAlignVertical: 'top',
              }}
              autoCapitalize="sentences"
              editable={!isLoading}
            />
          </View>
        </Animated.View>

        {/* Progress Indicator — 4 steps */}
        <Animated.View
          entering={FadeIn.delay(300).duration(600)}
          style={{
            marginBottom: 28,
            gap: 6,
            flexDirection: 'row',
          }}
        >
          <View style={{ flex: 1, height: 3, backgroundColor: BRAND.mint, borderRadius: 2 }} />
          <View style={{ flex: 1, height: 3, backgroundColor: BRAND.border, borderRadius: 2 }} />
          <View style={{ flex: 1, height: 3, backgroundColor: BRAND.border, borderRadius: 2 }} />
          <View style={{ flex: 1, height: 3, backgroundColor: BRAND.border, borderRadius: 2 }} />
        </Animated.View>

        {/* CTA Button */}
        <Animated.View entering={FadeIn.delay(400).duration(600)}>
          <Pressable
            onPress={handleActivateAvatar}
            disabled={isLoading}
            style={({ pressed }) => ({
              backgroundColor: BRAND.mint,
              borderRadius: 12,
              height: 56,
              justifyContent: 'center',
              opacity: isLoading ? 0.6 : pressed ? 0.85 : 1,
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
              {isLoading ? 'ACTIVANDO...' : 'ACTIVAR MI AVATAR →'}
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
