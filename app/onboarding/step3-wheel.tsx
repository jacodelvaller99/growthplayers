import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useWheelOfLifeStore,
  useMotivacionStore,
  usePolarisStore,
  type AreaVida,
  type AreaScore,
  type WheelOfLife,
} from '../../store';
import {
  getAreaDominante,
  getAreaAncla,
  getPuntoCiego,
  calcularArquetipo,
} from '../../lib/motivacionEngine';

const BRAND = {
  bg: '#01191D',
  surface: '#0D2B30',
  mint: '#AEFEF0',
  border: 'rgba(174, 254, 240, 0.15)',
  gridColor: 'rgba(174, 254, 240, 0.1)',
  textPrimary: '#AEFEF0',
  textMuted: 'rgba(174, 254, 240, 0.5)',
  textLight: 'rgba(174, 254, 240, 0.3)',
};

const AREAS: {
  value: AreaVida;
  icon: string;
  label: string;
  color: string;
}[] = [
  { value: 'salud', icon: 'heart-pulse', label: 'Salud', color: '#ef4444' },
  { value: 'carrera', icon: 'briefcase', label: 'Carrera', color: '#f59e0b' },
  { value: 'finanzas', icon: 'cash', label: 'Finanzas', color: '#10b981' },
  {
    value: 'relaciones',
    icon: 'account-multiple',
    label: 'Relaciones',
    color: '#06b6d4',
  },
  { value: 'familia', icon: 'home-heart', label: 'Familia', color: '#ec4899' },
  { value: 'mente', icon: 'brain', label: 'Mente', color: '#8b5cf6' },
  {
    value: 'espiritualidad',
    icon: 'meditation',
    label: 'Espiritualidad',
    color: '#6366f1',
  },
  { value: 'diversion', icon: 'party-popper', label: 'Diversión', color: '#14b8a6' },
];

const { width } = Dimensions.get('window');

interface AreaUIState {
  area: AreaVida;
  satisfaccion: number;
  importancia: number;
  icon: string;
  label: string;
  color: string;
}

export default function Step3Wheel() {
  const [areas, setAreas] = useState<AreaUIState[]>([
    {
      area: 'salud',
      satisfaccion: 5,
      importancia: 8,
      icon: 'heart-pulse',
      label: 'Salud',
      color: '#ef4444',
    },
    {
      area: 'carrera',
      satisfaccion: 6,
      importancia: 9,
      icon: 'briefcase',
      label: 'Carrera',
      color: '#f59e0b',
    },
    {
      area: 'finanzas',
      satisfaccion: 4,
      importancia: 8,
      icon: 'cash',
      label: 'Finanzas',
      color: '#10b981',
    },
    {
      area: 'relaciones',
      satisfaccion: 7,
      importancia: 9,
      icon: 'account-multiple',
      label: 'Relaciones',
      color: '#06b6d4',
    },
    {
      area: 'familia',
      satisfaccion: 8,
      importancia: 10,
      icon: 'home-heart',
      label: 'Familia',
      color: '#ec4899',
    },
    {
      area: 'mente',
      satisfaccion: 5,
      importancia: 7,
      icon: 'brain',
      label: 'Mente',
      color: '#8b5cf6',
    },
    {
      area: 'espiritualidad',
      satisfaccion: 3,
      importancia: 6,
      icon: 'meditation',
      label: 'Espiritualidad',
      color: '#6366f1',
    },
    {
      area: 'diversion',
      satisfaccion: 6,
      importancia: 7,
      icon: 'party-popper',
      label: 'Diversión',
      color: '#14b8a6',
    },
  ]);

  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step3StartTime] = useState(Date.now());
  const router = useRouter();

  const { setWheel: setWheelData } = useWheelOfLifeStore();
  const { setMotivacion } = useMotivacionStore();
  const { polaris } = usePolarisStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSatisfaccionChange = (index: number, value: number) => {
    const newAreas = [...areas];
    newAreas[index].satisfaccion = Math.round(value);
    setAreas(newAreas);
  };

  const handleImportanciaChange = (index: number, value: number) => {
    const newAreas = [...areas];
    newAreas[index].importancia = Math.round(value);
    setAreas(newAreas);
  };

  const handleContinue = async () => {
    setIsLoading(true);

    // Construir WheelOfLife
    const wheelData: WheelOfLife = {
      salud: {
        satisfaccion: areas[0].satisfaccion,
        importancia: areas[0].importancia,
      },
      carrera: {
        satisfaccion: areas[1].satisfaccion,
        importancia: areas[1].importancia,
      },
      finanzas: {
        satisfaccion: areas[2].satisfaccion,
        importancia: areas[2].importancia,
      },
      relaciones: {
        satisfaccion: areas[3].satisfaccion,
        importancia: areas[3].importancia,
      },
      familia: {
        satisfaccion: areas[4].satisfaccion,
        importancia: areas[4].importancia,
      },
      mente: {
        satisfaccion: areas[5].satisfaccion,
        importancia: areas[5].importancia,
      },
      espiritualidad: {
        satisfaccion: areas[6].satisfaccion,
        importancia: areas[6].importancia,
      },
      diversion: {
        satisfaccion: areas[7].satisfaccion,
        importancia: areas[7].importancia,
      },
      evaluado_at: new Date().toISOString(),
    };

    // Calcular Perfil de Motivación
    const areaDominante = getAreaDominante(wheelData);
    const areaAncla = getAreaAncla(wheelData);
    const puntoCiego = getPuntoCiego(wheelData);
    const arquetipo = calcularArquetipo(wheelData, polaris?.deseo);

    const motivacionProfile = {
      arquetipo,
      area_dominante: areaDominante,
      area_ancla: areaAncla,
      punto_ciego: puntoCiego,
      motivador_personal: polaris?.deseo || 'Sin especificar',
      completado_at: new Date().toISOString(),
    };

    // Guardar en stores
    setWheelData(wheelData);
    setMotivacion(motivacionProfile);

    // Guardar en AsyncStorage
    try {
      const step3Time = Date.now() - step3StartTime;
      const existingData = await AsyncStorage.getItem('onboarding_data');
      const onboardingData = existingData ? JSON.parse(existingData) : {
        timestamp_inicio: Date.now(),
        tiempo_por_step: {},
        version_app: '1.0.0',
      };

      onboardingData.tiempo_por_step.step3 = step3Time;
      onboardingData.wheel = wheelData;
      onboardingData.motivacion = motivacionProfile;

      await AsyncStorage.setItem('onboarding_data', JSON.stringify(onboardingData));
    } catch (e) {
      console.error('Error saving step3 data:', e);
    }

    router.push('/onboarding/step4-profile');
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

          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 }}>
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
              Paso 3 de 4
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
            Tu Rueda de Vida
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
            Evalúa cada área: qué tan satisfecho estás VS qué tan importante es para ti.
          </Text>
        </Animated.View>

        {/* Areas con dos sliders cada una */}
        <Animated.View entering={FadeIn.delay(200).duration(600)} style={{ marginBottom: 32 }}>
          {areas.map((areaUI, index) => (
            <View
              key={areaUI.area}
              style={{
                marginBottom: 28,
                backgroundColor: BRAND.surface,
                borderWidth: 1,
                borderColor: BRAND.border,
                borderRadius: 12,
                padding: 16,
              }}
            >
              {/* Encabezado del área */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <MaterialCommunityIcons
                  name={areaUI.icon as any}
                  size={20}
                  color={areaUI.color}
                />
                <Text
                  style={{
                    fontFamily: 'SpaceGrotesk_600SemiBold',
                    fontSize: 14,
                    color: BRAND.textPrimary,
                    fontWeight: '600',
                  }}
                >
                  {areaUI.label}
                </Text>
              </View>

              {/* SLIDER 1: SATISFACCIÓN ACTUAL */}
              <View style={{ marginBottom: 16 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'SpaceGrotesk_600SemiBold',
                      fontSize: 11,
                      color: BRAND.textMuted,
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    Satisfacción actual
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'SpaceGrotesk_700Bold',
                      fontSize: 13,
                      color: areaUI.color,
                      fontWeight: '700',
                    }}
                  >
                    {areaUI.satisfaccion}/10
                  </Text>
                </View>

                <View
                  style={{
                    height: 6,
                    backgroundColor: BRAND.bg,
                    borderRadius: 3,
                    overflow: 'hidden',
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: `${(areaUI.satisfaccion / 10) * 100}%`,
                      backgroundColor: areaUI.color,
                      borderRadius: 3,
                    }}
                  />
                </View>

                <Slider
                  style={{ height: 30 }}
                  minimumValue={0}
                  maximumValue={10}
                  step={1}
                  value={areaUI.satisfaccion}
                  onValueChange={(value) => handleSatisfaccionChange(index, value)}
                  minimumTrackTintColor={areaUI.color}
                  maximumTrackTintColor={BRAND.border}
                  disabled={isLoading}
                />
              </View>

              {/* SLIDER 2: IMPORTANCIA */}
              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'SpaceGrotesk_600SemiBold',
                      fontSize: 11,
                      color: BRAND.textMuted,
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    Importancia para ti
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'SpaceGrotesk_700Bold',
                      fontSize: 13,
                      color: BRAND.mint,
                      fontWeight: '700',
                    }}
                  >
                    {areaUI.importancia}/10
                  </Text>
                </View>

                <View
                  style={{
                    height: 6,
                    backgroundColor: BRAND.bg,
                    borderRadius: 3,
                    overflow: 'hidden',
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: `${(areaUI.importancia / 10) * 100}%`,
                      backgroundColor: BRAND.mint,
                      borderRadius: 3,
                    }}
                  />
                </View>

                <Slider
                  style={{ height: 30 }}
                  minimumValue={0}
                  maximumValue={10}
                  step={1}
                  value={areaUI.importancia}
                  onValueChange={(value) => handleImportanciaChange(index, value)}
                  minimumTrackTintColor={BRAND.mint}
                  maximumTrackTintColor={BRAND.border}
                  disabled={isLoading}
                />
              </View>
            </View>
          ))}
        </Animated.View>

        {/* Progress Indicator */}
        <Animated.View
          entering={FadeIn.delay(300).duration(600)}
          style={{ marginBottom: 28, gap: 6, flexDirection: 'row' }}
        >
          <View style={{ flex: 1, height: 3, backgroundColor: BRAND.mint, borderRadius: 2 }} />
          <View style={{ flex: 1, height: 3, backgroundColor: BRAND.mint, borderRadius: 2 }} />
          <View style={{ flex: 1, height: 3, backgroundColor: BRAND.mint, borderRadius: 2 }} />
          <View style={{ flex: 1, height: 3, backgroundColor: BRAND.border, borderRadius: 2 }} />
        </Animated.View>

        {/* CTA Button */}
        <Animated.View entering={FadeIn.delay(400).duration(600)}>
          <Pressable
            onPress={handleContinue}
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
              {isLoading ? 'CALCULANDO PERFIL...' : 'VER MIS RESULTADOS →'}
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
