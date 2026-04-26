import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TacticalGrid } from '../components/ui/TacticalGrid';
import { TacticalCard } from '../components/ui/TacticalCard';
import { MintButton } from '../components/ui/MintButton';
import { Colors } from '../constants/Colors';
import { Layout } from '../constants/Layout';
import { Typography } from '../constants/Typography';
import { useSubscription } from '../hooks/useSubscription';

const PLANES = [
  {
    id: 'free',
    nombre: 'Explorador',
    precio: '$0',
    ciclo: 'para siempre',
    features: [
      { name: 'Ritual diario (Bitácora)', included: true },
      { name: 'Rueda de la Vida', included: true },
      { name: 'Mentor IA limitado', included: true },
      { name: 'Protocolo de Respiración', included: false },
      { name: 'Biometría (Whoop/Oura)', included: false },
      { name: 'Comunidades premium', included: false },
      { name: 'Módulo 0 - Detox', included: false },
    ],
  },
  {
    id: 'monthly',
    nombre: 'Soberano',
    precio: '$29',
    ciclo: '/mes',
    recommended: true,
    features: [
      { name: 'Ritual diario (Bitácora)', included: true },
      { name: 'Rueda de la Vida', included: true },
      { name: 'Mentor IA ilimitado', included: true },
      { name: 'Protocolo de Respiración', included: true },
      { name: 'Biometría (Whoop/Oura)', included: true },
      { name: 'Comunidades premium', included: true },
      { name: 'Módulo 0 - Detox', included: false },
    ],
  },
  {
    id: 'lifetime',
    nombre: 'Maestro',
    precio: '$497',
    ciclo: 'único',
    features: [
      { name: 'Ritual diario (Bitácora)', included: true },
      { name: 'Rueda de la Vida', included: true },
      { name: 'Mentor IA ilimitado', included: true },
      { name: 'Protocolo de Respiración', included: true },
      { name: 'Biometría (Whoop/Oura)', included: true },
      { name: 'Comunidades premium', included: true },
      { name: 'Módulo 0 - Detox', included: true },
    ],
  },
];

export default function PlanesScreen() {
  const { purchaseMonthly, purchaseAnnual, purchaseLifetime, isLoading } = useSubscription();

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
            Planes
          </Text>
          <Text style={[Typography.body, { color: Colors.textSecondary }]}>
            Elige tu nivel de soberanía
          </Text>
        </View>

        {PLANES.map((plan, index) => (
          <Animated.View
            key={plan.id}
            entering={FadeInDown.delay(index * 100)}
            style={{ marginBottom: Layout.spacing.xl }}
          >
            <TacticalCard
              style={{
                backgroundColor: plan.recommended ? Colors.mintLight : Colors.surface,
                borderColor: plan.recommended ? Colors.mint : Colors.mintBorder,
                borderWidth: plan.recommended ? 2 : 1,
                position: 'relative',
              }}
            >
              {/* Badge Recomendado */}
              {plan.recommended && (
                <View
                  style={{
                    position: 'absolute',
                    top: -12,
                    right: 20,
                    backgroundColor: Colors.mint,
                    paddingHorizontal: Layout.spacing.md,
                    paddingVertical: 4,
                    borderRadius: 12,
                    transform: [{ rotate: '-5deg' }],
                  }}
                >
                  <Text style={[Typography.tag, { color: Colors.textInverse }]}>
                    RECOMENDADO
                  </Text>
                </View>
              )}

              {/* Header */}
              <View style={{ marginBottom: Layout.spacing.lg }}>
                <Text style={[Typography.h2, { color: plan.recommended ? Colors.textInverse : Colors.text }]}>
                  {plan.nombre}
                </Text>
                <Text
                  style={[
                    Typography.monoLarge,
                    { color: plan.recommended ? Colors.textInverse : Colors.mint, marginVertical: Layout.spacing.sm },
                  ]}
                >
                  {plan.precio}
                  <Text style={[Typography.body, { color: Colors.textSecondary }]}>
                    {' '}
                    {plan.ciclo}
                  </Text>
                </Text>
              </View>

              {/* Features */}
              <View style={{ marginBottom: Layout.spacing.lg, gap: Layout.spacing.md }}>
                {plan.features.map((feature, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.sm }}>
                    <MaterialCommunityIcons
                      name={feature.included ? 'check-circle' : 'close-circle'}
                      size={20}
                      color={feature.included ? Colors.mint : Colors.textMuted}
                    />
                    <Text
                      style={[
                        Typography.body,
                        {
                          color: feature.included ? Colors.text : Colors.textMuted,
                          opacity: feature.included ? 1 : 0.5,
                        },
                      ]}
                    >
                      {feature.name}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Button */}
              {plan.id === 'free' ? (
                <View
                  style={{
                    paddingHorizontal: Layout.spacing.lg,
                    paddingVertical: Layout.spacing.md,
                    backgroundColor: Colors.surfaceAlt,
                    borderRadius: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={[Typography.body, { color: Colors.textSecondary }]}>
                    Tu plan actual
                  </Text>
                </View>
              ) : plan.id === 'monthly' ? (
                <MintButton
                  label={isLoading ? 'Procesando...' : 'ACTIVAR SOBERANO'}
                  onPress={purchaseMonthly}
                  disabled={isLoading}
                />
              ) : (
                <MintButton
                  label={isLoading ? 'Procesando...' : 'ACTIVAR MAESTRO'}
                  onPress={purchaseLifetime}
                  disabled={isLoading}
                />
              )}
            </TacticalCard>
          </Animated.View>
        ))}

        {/* Footer */}
        <View
          style={{
            paddingVertical: Layout.spacing.xl,
            alignItems: 'center',
            gap: Layout.spacing.md,
          }}
        >
          <Text style={[Typography.bodySmall, { color: Colors.textSecondary, textAlign: 'center' }]}>
            ✓ Garantía de 30 días de reembolso{'\n'}
            ✓ Cancela cuando quieras{'\n'}
            ✓ Soporte 24/7
          </Text>
        </View>
      </ScrollView>
    </TacticalGrid>
  );
}
