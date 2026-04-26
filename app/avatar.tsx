import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { TacticalGrid } from '../components/ui/TacticalGrid';
import { TacticalCard } from '../components/ui/TacticalCard';
import { MintButton } from '../components/ui/MintButton';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Colors } from '../constants/Colors';
import { Layout } from '../constants/Layout';
import { Typography } from '../constants/Typography';
import { supabase } from '../lib/supabase';
import { useAuthStore, useWheelStore } from '../store';

const PILLAR_LABELS = ['Fe', 'Finanzas', 'Salud', 'Familia', 'Mente', 'Negocio', 'Impacto', 'Legado'];
const PILLAR_COLORS = Object.values({
  fe: '#7c3aed',
  finanzas: '#059669',
  salud: '#dc2626',
  familia: '#f97316',
  mente: '#06b6d4',
  negocio: '#8b5cf6',
  impacto: '#0ea5e9',
  legado: '#64748b',
});

export default function AvatarScreen() {
  const [pillars, setPillars] = useState({
    fe: 7,
    finanzas: 6,
    salud: 8,
    familia: 9,
    mente: 5,
    negocio: 6,
    impacto: 5,
    legado: 4,
  });

  const [previousPillars, setPreviousPillars] = useState(pillars);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuthStore();

  const pillarKeys = Object.keys(pillars);

  const soberaniaScore = useMemo(() => {
    const values = Object.values(pillars);
    return (values.reduce((a, b) => a + b, 0) / (values.length * 10)) * 10;
  }, [pillars]);

  const weakestPillar = useMemo(() => {
    return Object.entries(pillars).reduce((min, [key, value]) =>
      value < min[1] ? [key, value] : min
    )[0];
  }, [pillars]);

  const radarData = pillarKeys.map((key, i) => ({
    x: PILLAR_LABELS[i],
    y: pillars[key as keyof typeof pillars],
  }));

  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      await supabase.from('sovereignty_wheel').upsert({
        user_id: user.id,
        ...pillars,
        actualizado_at: new Date().toISOString(),
      });

      setPreviousPillars(pillars);
    } catch (error) {
      console.error('Error saving wheel:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePillarChange = (pillar: string, value: number) => {
    setPillars(prev => ({
      ...prev,
      [pillar]: Math.round(value),
    }));
  };

  return (
    <TacticalGrid>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: Layout.spacing.lg,
          paddingVertical: Layout.spacing.lg,
        }}
      >
        <View style={{ marginBottom: Layout.spacing.xl }}>
          <Text style={[Typography.h2, { color: Colors.mint }]}>
            Tu Rueda de la Vida
          </Text>
          <Text style={[Typography.body, { color: Colors.textSecondary }]}>
            Visualiza tu soberanía
          </Text>
        </View>

        {/* Radar Chart - Simplified */}
        <TacticalCard style={{ marginBottom: Layout.spacing.xl }}>
          <View style={{ height: 280, justifyContent: 'center', alignItems: 'center' }}>
            {/* Círculos concéntricos como grid */}
            {[10, 7.5, 5, 2.5].map((radius, i) => (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  width: radius * 20,
                  height: radius * 20,
                  borderRadius: radius * 10,
                  borderWidth: 1,
                  borderColor: Colors.mintBorder,
                }}
              />
            ))}

            {/* Pilares distribuidos en círculo */}
            {pillarKeys.map((key, index) => {
              const angle = (index / pillarKeys.length) * Math.PI * 2;
              const x = Math.cos(angle) * 80;
              const y = Math.sin(angle) * 80;
              const value = pillars[key as keyof typeof pillars];

              return (
                <View
                  key={key}
                  style={{
                    position: 'absolute',
                    left: 140 + x - 20,
                    top: 140 + y - 20,
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: Colors.mintLight,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: Colors.mint,
                  }}
                >
                  <Text style={[Typography.monoLarge, { color: Colors.mint, fontSize: 16 }]}>
                    {value}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Soberanía Score */}
          <View
            style={{
              alignItems: 'center',
              marginTop: Layout.spacing.lg,
              paddingTop: Layout.spacing.lg,
              borderTopWidth: 1,
              borderTopColor: Colors.mintBorder,
            }}
          >
            <Text style={[Typography.tag, { color: Colors.mint, marginBottom: Layout.spacing.sm }]}>
              ÍNDICE DE SOBERANÍA
            </Text>
            <Text style={[Typography.monoLarge, { color: Colors.mint }]}>
              {soberaniaScore.toFixed(1)}/10
            </Text>
          </View>
        </TacticalCard>

        {/* Weakest Pillar Alert */}
        <TacticalCard
          style={{
            marginBottom: Layout.spacing.xl,
            backgroundColor: Colors.warning + '15',
            borderColor: Colors.warning,
            borderWidth: 1.5,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.md }}>
            <Text style={{ fontSize: 24 }}>⚠️</Text>
            <View>
              <Text style={[Typography.tag, { color: Colors.warning, marginBottom: Layout.spacing.xs }]}>
                ENFOQUE PRIORITARIO
              </Text>
              <Text style={[Typography.body, { color: Colors.text }]}>
                {PILLAR_LABELS[pillarKeys.indexOf(weakestPillar)]}
              </Text>
            </View>
          </View>
        </TacticalCard>

        {/* Sliders */}
        <SectionHeader tag="CALIBRACIÓN" title="Ajusta tu evaluación" />
        <TacticalCard style={{ marginBottom: Layout.spacing.xl }}>
          {pillarKeys.map((key, index) => (
            <View key={key} style={{ marginBottom: Layout.spacing.lg }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Layout.spacing.sm }}>
                <Text style={[Typography.body, { color: Colors.text }]}>
                  {PILLAR_LABELS[index]}
                </Text>
                <Text style={[Typography.monoBold, { color: Colors.pillar[key as keyof typeof Colors.pillar], fontSize: 16 }]}>
                  {pillars[key as keyof typeof pillars]}/10
                </Text>
              </View>

              {/* Manual Slider */}
              <View
                style={{
                  height: 6,
                  backgroundColor: Colors.surfaceAlt,
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <Animated.View
                  style={{
                    height: '100%',
                    width: `${(pillars[key as keyof typeof pillars] / 10) * 100}%`,
                    backgroundColor: PILLAR_COLORS[index],
                  }}
                />
              </View>

              {/* Buttons to increase/decrease */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: Layout.spacing.sm,
                  marginTop: Layout.spacing.sm,
                  justifyContent: 'space-between',
                }}
              >
                <Pressable
                  onPress={() =>
                    handlePillarChange(
                      key,
                      Math.max(0, pillars[key as keyof typeof pillars] - 1)
                    )
                  }
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    backgroundColor: Colors.surfaceAlt,
                    borderRadius: 4,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={[Typography.button, { color: Colors.mint, fontSize: 14 }]}>−</Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    handlePillarChange(
                      key,
                      Math.min(10, pillars[key as keyof typeof pillars] + 1)
                    )
                  }
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    backgroundColor: Colors.surfaceAlt,
                    borderRadius: 4,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={[Typography.button, { color: Colors.mint, fontSize: 14 }]}>+</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </TacticalCard>

        <MintButton
          label={isLoading ? 'Guardando...' : 'GUARDAR EVALUACIÓN'}
          onPress={handleSave}
          disabled={isLoading}
          style={{ marginBottom: Layout.spacing.lg }}
        />

        <MintButton
          label="Volver"
          variant="ghost"
          onPress={() => router.back()}
        />
      </ScrollView>
    </TacticalGrid>
  );
}
