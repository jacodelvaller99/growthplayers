import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePolarisStore } from '../../store';

const BRAND = {
  bg: '#0A0A0A',
  surface: '#141414',
  mint: '#EDBA01',
  mintLight: 'rgba(237,186,1,0.06)',
  mintBorder: 'rgba(237,186,1,0.12)',
  border: 'rgba(237,186,1,0.12)',
  textPrimary: '#EDBA01',
  textMuted: 'rgba(237,186,1,0.45)',
  textLight: 'rgba(237,186,1,0.30)',
};

interface ArchetypeInfo {
  name: string;
  icon: string;
  description: string;
  frictionPoint: string;
  visionScore: number;
  executionScore: number;
  resilienceScore: number;
}

const ARCHETYPES: { [key: string]: ArchetypeInfo } = {
  procrastinacion: {
    name: 'EL VISIONARIO',
    icon: 'telescope',
    description: 'Tienes grandes sueños pero te cuesta ejecutar. Tu superpoder es imaginar el futuro.',
    frictionPoint:
      'Postergas porque esperas el momento perfecto. Necesitas empezar pequeño y construir momentum.',
    visionScore: 85,
    executionScore: 35,
    resilienceScore: 50,
  },
  perfeccionismo: {
    name: 'EL ESTRATEGA',
    icon: 'chess-queen',
    description: 'Planificas meticulosamente pero te paralizas buscando perfección. Tu fortaleza es la precisión.',
    frictionPoint:
      'Buscas hacerlo perfecto en el primer intento. Aprende que el progreso supera a la perfección.',
    visionScore: 80,
    executionScore: 65,
    resilienceScore: 75,
  },
  opinion: {
    name: 'EL CONECTOR',
    icon: 'account-group',
    description: 'Te importa demasiado lo que otros piensan. Tu don es conectar con las personas.',
    frictionPoint:
      'Sacrificas tus metas por agradar a otros. Necesitas priorizar tu visión personal.',
    visionScore: 70,
    executionScore: 60,
    resilienceScore: 55,
  },
  disciplina: {
    name: 'EL EJECUTOR',
    icon: 'lightning-bolt',
    description: 'Tienes energía pero te falta dirección consistente. Tu potencial es transformar visiones en realidad.',
    frictionPoint:
      'Cambias de dirección constantemente sin completar nada. Necesitas comprometerte con una visión.',
    visionScore: 75,
    executionScore: 40,
    resilienceScore: 82,
  },
};

export default function Step4Profile() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step4StartTime] = useState(Date.now());
  const router = useRouter();
  const { polaris, setPolaris } = usePolarisStore();

  const archetype = ARCHETYPES[polaris?.dolor || 'procrastinacion'] || ARCHETYPES.procrastinacion;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCreateAccount = async () => {
    setIsLoading(true);

    // Update polaris with archetype
    const updatedPolaris = {
      ...polaris,
      patron: archetype.name,
    };

    setPolaris(updatedPolaris);

    // Save ML tracking data
    try {
      const step4Time = Date.now() - step4StartTime;
      const existingData = await AsyncStorage.getItem('onboarding_data');
      const onboardingData = existingData ? JSON.parse(existingData) : {
        timestamp_inicio: Date.now(),
        tiempo_por_step: {},
        version_app: '1.0.0',
      };

      onboardingData.tiempo_por_step.step4 = step4Time;
      onboardingData.arquetipo_asignado = archetype.name;
      onboardingData.timestamp_completado = Date.now();

      await AsyncStorage.setItem('onboarding_data', JSON.stringify(onboardingData));
    } catch (e) {
      console.error('Error saving step4 data:', e);
    }

    router.push('/(auth)/register');
  };

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  if (!mounted) return null;

  return (
    <View style={{ flex: 1, backgroundColor: BRAND.bg }}>
      {/* Subtle background glow */}
      <Animated.View
        style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: 200,
          backgroundColor: BRAND.mint,
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
        {/* Header */}
        <Animated.View entering={FadeIn.delay(100).duration(600)} style={{ marginBottom: 32 }}>
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
              Paso 4 de 4
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
            Este es tu arquetipo. Úsalo para entenderte mejor.
          </Text>
        </Animated.View>

        {/* Agent Badge */}
        <Animated.View
          entering={FadeIn.delay(200).duration(600)}
          style={{
            marginBottom: 32,
          }}
        >
          <View
            style={{
              backgroundColor: BRAND.surface,
              borderWidth: 1,
              borderColor: BRAND.mintBorder,
              borderRadius: 16,
              padding: 20,
              alignItems: 'center',
            }}
          >
            {/* Shield badge with tactical stripes */}
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 12,
                backgroundColor: BRAND.mint,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Tactical stripes background */}
              {Array.from({ length: 8 }, (_, i) => (
                <View
                  key={`stripe-${i}`}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: 10,
                    backgroundColor: i % 2 === 0 ? BRAND.mint : 'rgba(10, 10, 10, 0.5)',
                  }}
                />
              ))}
              <MaterialCommunityIcons
                name="shield-account"
                size={40}
                color={BRAND.bg}
                style={{ zIndex: 1 }}
              />
            </View>

            <Text
              style={{
                fontFamily: 'SpaceGrotesk_600SemiBold',
                fontSize: 12,
                letterSpacing: 1.5,
                color: BRAND.mint,
                marginBottom: 8,
                fontWeight: '600',
                textTransform: 'uppercase',
              }}
            >
              Agente de Cambio
            </Text>

            <Text
              style={{
                fontFamily: 'SpaceGrotesk_400Regular',
                fontSize: 13,
                color: BRAND.textMuted,
                textAlign: 'center',
                lineHeight: 19,
                fontWeight: '400',
              }}
            >
              Estás en el camino hacia tu transformación personal. Tu perfil guiará cada paso.
            </Text>
          </View>
        </Animated.View>

        {/* Archetype Card */}
        <Animated.View
          entering={FadeIn.delay(300).duration(600)}
          style={{
            marginBottom: 32,
          }}
        >
          <View
            style={{
              backgroundColor: BRAND.surface,
              borderWidth: 1,
              borderColor: BRAND.mintBorder,
              borderRadius: 16,
              padding: 20,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 12,
                  backgroundColor: BRAND.mintLight,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <MaterialCommunityIcons name={archetype.icon as any} size={28} color={BRAND.mint} />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: 'SpaceGrotesk_700Bold',
                    fontSize: 16,
                    color: BRAND.mint,
                    fontWeight: '700',
                    marginBottom: 4,
                    letterSpacing: 0.5,
                  }}
                >
                  {archetype.name}
                </Text>
                <Text
                  style={{
                    fontFamily: 'SpaceGrotesk_400Regular',
                    fontSize: 12,
                    color: BRAND.textMuted,
                    fontWeight: '400',
                  }}
                >
                  Tu arquetipo Polaris
                </Text>
              </View>
            </View>

            <Text
              style={{
                fontFamily: 'SpaceGrotesk_400Regular',
                fontSize: 13,
                color: BRAND.textPrimary,
                lineHeight: 19,
                fontWeight: '400',
              }}
            >
              {archetype.description}
            </Text>
          </View>
        </Animated.View>

        {/* Friction Point Card */}
        <Animated.View
          entering={FadeIn.delay(400).duration(600)}
          style={{
            marginBottom: 32,
          }}
        >
          <View
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              borderLeftWidth: 4,
              borderLeftColor: '#ef4444',
              borderTopRightRadius: 12,
              borderBottomRightRadius: 12,
              padding: 16,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <MaterialCommunityIcons
                name="alert-circle"
                size={20}
                color="#ef4444"
                style={{ marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: 'SpaceGrotesk_600SemiBold',
                    fontSize: 12,
                    color: '#ef4444',
                    fontWeight: '600',
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Tu Punto de Fricción
                </Text>
                <Text
                  style={{
                    fontFamily: 'SpaceGrotesk_400Regular',
                    fontSize: 13,
                    color: BRAND.textPrimary,
                    lineHeight: 19,
                    fontWeight: '400',
                  }}
                >
                  {archetype.frictionPoint}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Alignment Bars */}
        <Animated.View
          entering={FadeIn.delay(500).duration(600)}
          style={{
            marginBottom: 32,
          }}
        >
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
            Tu Perfil de Alineación
          </Text>

          {/* Visión */}
          <View style={{ marginBottom: 20 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontFamily: 'SpaceGrotesk_600SemiBold',
                  fontSize: 12,
                  color: BRAND.textMuted,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                }}
              >
                VISIÓN
              </Text>
              <Text
                style={{
                  fontFamily: 'SpaceGrotesk_700Bold',
                  fontSize: 13,
                  color: BRAND.mint,
                  fontWeight: '700',
                }}
              >
                {archetype.visionScore}%
              </Text>
            </View>
            <View
              style={{
                height: 6,
                backgroundColor: BRAND.surface,
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${archetype.visionScore}%`,
                  backgroundColor: BRAND.mint,
                  borderRadius: 3,
                }}
              />
            </View>
          </View>

          {/* Ejecución */}
          <View style={{ marginBottom: 20 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontFamily: 'SpaceGrotesk_600SemiBold',
                  fontSize: 12,
                  color: BRAND.textMuted,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                }}
              >
                EJECUCIÓN
              </Text>
              <Text
                style={{
                  fontFamily: 'SpaceGrotesk_700Bold',
                  fontSize: 13,
                  color: BRAND.mint,
                  fontWeight: '700',
                }}
              >
                {archetype.executionScore}%
              </Text>
            </View>
            <View
              style={{
                height: 6,
                backgroundColor: BRAND.surface,
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${archetype.executionScore}%`,
                  backgroundColor: BRAND.mint,
                  borderRadius: 3,
                }}
              />
            </View>
          </View>

          {/* Resiliencia */}
          <View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontFamily: 'SpaceGrotesk_600SemiBold',
                  fontSize: 12,
                  color: BRAND.textMuted,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                }}
              >
                RESILIENCIA
              </Text>
              <Text
                style={{
                  fontFamily: 'SpaceGrotesk_700Bold',
                  fontSize: 13,
                  color: BRAND.mint,
                  fontWeight: '700',
                }}
              >
                {archetype.resilienceScore}%
              </Text>
            </View>
            <View
              style={{
                height: 6,
                backgroundColor: BRAND.surface,
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${archetype.resilienceScore}%`,
                  backgroundColor: BRAND.mint,
                  borderRadius: 3,
                }}
              />
            </View>
          </View>
        </Animated.View>

        {/* Progress Indicator - All Complete */}
        <Animated.View
          entering={FadeIn.delay(600).duration(600)}
          style={{
            marginBottom: 28,
            gap: 6,
            flexDirection: 'row',
          }}
        >
          <View style={{ flex: 1, height: 3, backgroundColor: BRAND.mint, borderRadius: 2 }} />
          <View style={{ flex: 1, height: 3, backgroundColor: BRAND.mint, borderRadius: 2 }} />
          <View style={{ flex: 1, height: 3, backgroundColor: BRAND.mint, borderRadius: 2 }} />
          <View style={{ flex: 1, height: 3, backgroundColor: BRAND.mint, borderRadius: 2 }} />
        </Animated.View>

        {/* CTA Buttons */}
        <Animated.View
          entering={FadeIn.delay(700).duration(600)}
          style={{ gap: 12 }}
        >
          <Pressable
            onPress={handleCreateAccount}
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
              {isLoading ? 'CREANDO CUENTA...' : 'CREAR MI CUENTA →'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleLogin}
            disabled={isLoading}
            style={({ pressed }) => ({
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: BRAND.mint,
              borderRadius: 12,
              height: 56,
              justifyContent: 'center',
              opacity: isLoading ? 0.6 : pressed ? 0.85 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: 'SpaceGrotesk_600SemiBold',
                fontSize: 14,
                fontWeight: '600',
                color: BRAND.mint,
                textAlign: 'center',
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              ¿Ya tienes cuenta?
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
