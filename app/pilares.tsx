import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { TacticalGrid } from '../components/ui/TacticalGrid';
import { TacticalCard } from '../components/ui/TacticalCard';
import { Colors } from '../constants/Colors';
import { Layout } from '../constants/Layout';
import { Typography } from '../constants/Typography';
import { useAuthStore } from '../store';

const PILARES = [
  {
    id: 'endo',
    titulo: 'ENDOTECNOLOGÍA',
    icono: '🧠',
    descripcion: 'Tu cuerpo y mente interior. Respiración, meditación, neuroplasticidad.',
    completitud: 65,
  },
  {
    id: 'bio',
    titulo: 'BIOTECNOLOGÍA',
    icono: '💪',
    descripcion: 'Tu cuerpo físico. Sueño, ejercicio, nutrición, biometría.',
    completitud: 72,
  },
  {
    id: 'ciber',
    titulo: 'CIBERTECNOLOGÍA',
    icono: '⚙️',
    descripcion: 'Tus herramientas externas. Sistemas, comunidad, recursos.',
    completitud: 58,
  },
];

export default function PilaresScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isPremium = user?.tier === 'soberano' || user?.tier === 'maestro';

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
            Los 3 Pilares
          </Text>
          <Text style={[Typography.body, { color: Colors.textSecondary }]}>
            Tu arquitectura de éxito
          </Text>
        </View>

        {PILARES.map(pilar => (
          <TacticalCard
            key={pilar.id}
            style={{
              marginBottom: Layout.spacing.lg,
              backgroundColor: Colors.surfaceElevated,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Layout.spacing.lg, marginBottom: Layout.spacing.lg }}>
              <Text style={{ fontSize: 40 }}>{pilar.icono}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.h3, { color: Colors.text, marginBottom: Layout.spacing.xs }]}>
                  {pilar.titulo}
                </Text>
                <Text style={[Typography.body, { color: Colors.textSecondary }]}>
                  {pilar.descripcion}
                </Text>
              </View>
            </View>

            {/* Progreso */}
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Layout.spacing.sm }}>
                <Text style={[Typography.tag, { color: Colors.mint }]}>
                  SOBERANÍA
                </Text>
                <Text style={[Typography.monoBold, { color: Colors.mint }]}>
                  {pilar.completitud}%
                </Text>
              </View>
              <View style={{ height: 6, backgroundColor: Colors.mintBorder, borderRadius: 3, overflow: 'hidden' }}>
                <View
                  style={{
                    height: '100%',
                    width: `${pilar.completitud}%`,
                    backgroundColor: Colors.mint,
                  }}
                />
              </View>
            </View>
          </TacticalCard>
        ))}

        {/* Módulo 0 - Detox */}
        {isPremium ? (
          <TacticalCard
            style={{
              backgroundColor: Colors.mintLight,
              borderColor: Colors.mint,
              borderWidth: 1.5,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Layout.spacing.lg }}>
              <Text style={{ fontSize: 40 }}>🔧</Text>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.h3, { color: Colors.text, marginBottom: Layout.spacing.xs }]}>
                  MÓDULO 0: Detox Digital
                </Text>
                <Text style={[Typography.body, { color: Colors.textSecondary, marginBottom: Layout.spacing.lg }]}>
                  Preparación de 7 días para máxima claridad mental.
                </Text>

                <View style={{ gap: Layout.spacing.sm }}>
                  <Text style={[Typography.bodySmall, { color: Colors.text }]}>
                    ✓ Día 1: Reset de notificaciones
                  </Text>
                  <Text style={[Typography.bodySmall, { color: Colors.text }]}>
                    ✓ Día 2: Eliminar apps innecesarias
                  </Text>
                  <Text style={[Typography.bodySmall, { color: Colors.text }]}>
                    ✓ Días 3-7: Protocolo de reconexión
                  </Text>
                </View>
              </View>
            </View>
          </TacticalCard>
        ) : (
          <TacticalCard
            style={{
              backgroundColor: Colors.surfaceAlt,
              borderColor: Colors.textMuted,
              borderWidth: 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.lg }}>
              <MaterialCommunityIcons name="lock" size={40} color={Colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={[Typography.h3, { color: Colors.textSecondary }]}>
                  MÓDULO 0: Detox Digital
                </Text>
                <Text style={[Typography.bodySmall, { color: Colors.textMuted }]}>
                  Disponible en Plan Soberano
                </Text>
              </View>
            </View>
          </TacticalCard>
        )}
      </ScrollView>
    </TacticalGrid>
  );
}
