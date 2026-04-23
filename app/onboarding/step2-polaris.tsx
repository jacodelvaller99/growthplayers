import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePolarisStore } from '../../store';

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

interface PolarisOption {
  id: string;
  label: string;
  description: string;
}

const DOLOR_OPTIONS: PolarisOption[] = [
  { id: 'procrastinacion', label: 'Procrastinación', description: 'Dejo las cosas para después constantemente' },
  { id: 'perfeccionismo', label: 'Perfeccionismo', description: 'Busco la perfección y me bloqueo' },
  { id: 'opinion', label: 'Opinión Ajena', description: 'Me paraliza la opinión de otros' },
  { id: 'disciplina', label: 'Falta de Disciplina', description: 'No logro mantener consistencia' },
];

const DESEO_OPTIONS: PolarisOption[] = [
  { id: 'libertad', label: 'Libertad Financiera', description: 'Quiero generar ingresos pasivos' },
  { id: 'impacto', label: 'Impacto Social', description: 'Quiero cambiar vidas' },
  { id: 'dominio', label: 'Dominio de Habilidades', description: 'Quiero ser experto en mi área' },
  { id: 'legado', label: 'Legado Duradero', description: 'Quiero dejar un impacto permanente' },
];

export default function Step2Polaris() {
  const [dolor, setDolor] = useState<string | null>(null);
  const [deseo, setDeseo] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step2StartTime] = useState(Date.now());
  const router = useRouter();
  const { polaris, setPolaris } = usePolarisStore();

  useEffect(() => {
    setMounted(true);
    if (polaris?.dolor) setDolor(polaris.dolor);
    if (polaris?.deseo) setDeseo(polaris.deseo);
  }, [polaris]);

  const handleContinue = async () => {
    if (!dolor || !deseo) return;

    setIsLoading(true);

    const updatedPolaris = {
      ...polaris,
      dolor,
      deseo,
      patron: 'default', // Will be updated in step4
      objecion: 'default', // Will be updated in step4
    };

    setPolaris(updatedPolaris);

    // Save ML tracking data
    try {
      const step2Time = Date.now() - step2StartTime;
      const existingData = await AsyncStorage.getItem('onboarding_data');
      const onboardingData = existingData ? JSON.parse(existingData) : {
        timestamp_inicio: Date.now(),
        tiempo_por_step: {},
        version_app: '1.0.0',
      };

      onboardingData.tiempo_por_step.step2 = step2Time;
      onboardingData.polaris = updatedPolaris;

      await AsyncStorage.setItem('onboarding_data', JSON.stringify(onboardingData));
    } catch (e) {
      console.error('Error saving step2 data:', e);
    }

    router.push('/onboarding/step3-wheel');
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
        {/* Header */}
        <Animated.View entering={FadeIn.delay(100).duration(600)} style={{ marginBottom: 44 }}>
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
              Paso 2 de 4
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
            Tu Perfil Polaris
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
            Identifica tu patrón de bloqueo y lo que realmente deseas lograr.
          </Text>
        </Animated.View>

        {/* Dolor Section */}
        <Animated.View entering={FadeIn.delay(200).duration(600)} style={{ marginBottom: 32 }}>
          <Text
            style={{
              fontFamily: 'SpaceGrotesk_600SemiBold',
              fontSize: 12,
              letterSpacing: 1.5,
              color: BRAND.mint,
              marginBottom: 16,
              fontWeight: '600',
              textTransform: 'uppercase',
            }}
          >
            Tu Punto de Dolor
          </Text>

          {DOLOR_OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => setDolor(option.id)}
              disabled={isLoading}
              style={{
                marginBottom: 12,
                borderWidth: 1.5,
                borderColor: dolor === option.id ? BRAND.mint : BRAND.border,
                borderRadius: 12,
                padding: 16,
                backgroundColor: dolor === option.id ? 'rgba(174, 254, 240, 0.05)' : BRAND.surface,
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: dolor === option.id ? BRAND.mint : BRAND.textMuted,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: dolor === option.id ? BRAND.mint : 'transparent',
                  }}
                >
                  {dolor === option.id && (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: BRAND.bg,
                      }}
                    />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: 'SpaceGrotesk_600SemiBold',
                      fontSize: 15,
                      color: BRAND.textPrimary,
                      fontWeight: '600',
                      marginBottom: 4,
                    }}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'SpaceGrotesk_400Regular',
                      fontSize: 13,
                      color: BRAND.textMuted,
                      fontWeight: '400',
                    }}
                  >
                    {option.description}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </Animated.View>

        {/* Deseo Section */}
        <Animated.View entering={FadeIn.delay(300).duration(600)} style={{ marginBottom: 32 }}>
          <Text
            style={{
              fontFamily: 'SpaceGrotesk_600SemiBold',
              fontSize: 12,
              letterSpacing: 1.5,
              color: BRAND.mint,
              marginBottom: 16,
              fontWeight: '600',
              textTransform: 'uppercase',
            }}
          >
            Lo Que Realmente Deseas
          </Text>

          {DESEO_OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => setDeseo(option.id)}
              disabled={isLoading}
              style={{
                marginBottom: 12,
                borderWidth: 1.5,
                borderColor: deseo === option.id ? BRAND.mint : BRAND.border,
                borderRadius: 12,
                padding: 16,
                backgroundColor: deseo === option.id ? 'rgba(174, 254, 240, 0.05)' : BRAND.surface,
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: deseo === option.id ? BRAND.mint : BRAND.textMuted,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: deseo === option.id ? BRAND.mint : 'transparent',
                  }}
                >
                  {deseo === option.id && (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: BRAND.bg,
                      }}
                    />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: 'SpaceGrotesk_600SemiBold',
                      fontSize: 15,
                      color: BRAND.textPrimary,
                      fontWeight: '600',
                      marginBottom: 4,
                    }}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'SpaceGrotesk_400Regular',
                      fontSize: 13,
                      color: BRAND.textMuted,
                      fontWeight: '400',
                    }}
                  >
                    {option.description}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </Animated.View>

        {/* Progress Indicator — 4 steps */}
        <Animated.View
          entering={FadeIn.delay(400).duration(600)}
          style={{
            marginBottom: 28,
            gap: 6,
            flexDirection: 'row',
          }}
        >
          <View style={{ flex: 1, height: 3, backgroundColor: BRAND.mint, borderRadius: 2 }} />
          <View style={{ flex: 1, height: 3, backgroundColor: BRAND.mint, borderRadius: 2 }} />
          <View style={{ flex: 1, height: 3, backgroundColor: BRAND.border, borderRadius: 2 }} />
          <View style={{ flex: 1, height: 3, backgroundColor: BRAND.border, borderRadius: 2 }} />
        </Animated.View>

        {/* CTA Button */}
        <Animated.View entering={FadeIn.delay(500).duration(600)}>
          <Pressable
            onPress={handleContinue}
            disabled={isLoading || !dolor || !deseo}
            style={({ pressed }) => ({
              backgroundColor: !dolor || !deseo ? 'rgba(174, 254, 240, 0.15)' : BRAND.mint,
              borderRadius: 12,
              height: 56,
              justifyContent: 'center',
              opacity: isLoading || !dolor || !deseo ? 0.6 : pressed ? 0.85 : 1,
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
              {isLoading ? 'ANALIZANDO...' : 'CONTINUAR →'}
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
