import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { TacticalGrid } from '../components/ui/TacticalGrid';
import { TacticalCard } from '../components/ui/TacticalCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Colors } from '../constants/Colors';
import { Layout } from '../constants/Layout';
import { Typography } from '../constants/Typography';

const LECTURAS = [
  { id: '1', titulo: 'El Protocolo Soberano', autor: 'Lifeflow', tipo: 'Guía' },
  { id: '2', titulo: 'Biohacking Avanzado', autor: 'Dr. Juan', tipo: 'Artículo' },
  { id: '3', titulo: 'La Rueda de la Vida', autor: 'Coach Alex', tipo: 'Video' },
];

export default function RecursosScreen() {
  const router = useRouter();

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
            Recursos
          </Text>
          <Text style={[Typography.body, { color: Colors.textSecondary }]}>
            Aprende y crece
          </Text>
        </View>

        {/* Lecturas */}
        <SectionHeader tag="HOY" title="Lecturas del Día" />
        {LECTURAS.map(lectura => (
          <TacticalCard key={lectura.id} style={{ marginBottom: Layout.spacing.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={[Typography.body, { color: Colors.text }]}>
                  {lectura.titulo}
                </Text>
                <Text style={[Typography.bodySmall, { color: Colors.textSecondary }]}>
                  {lectura.autor} • {lectura.tipo}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.mint} />
            </View>
          </TacticalCard>
        ))}

        {/* Protocolos */}
        <SectionHeader tag="HERRAMIENTAS" title="Protocolos Activos" />
        <TacticalCard
          style={{ marginBottom: Layout.spacing.lg }}
          onPress={() => router.push('/respiracion')}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.md }}>
              <Text style={{ fontSize: 28 }}>🧘</Text>
              <View>
                <Text style={[Typography.body, { color: Colors.text }]}>
                  Protocolo de Respiración
                </Text>
                <Text style={[Typography.bodySmall, { color: Colors.textSecondary }]}>
                  5 minutos
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="play-circle" size={24} color={Colors.mint} />
          </View>
        </TacticalCard>

        <TacticalCard onPress={() => router.push('/avatar')}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.md }}>
              <Text style={{ fontSize: 28 }}>🎯</Text>
              <View>
                <Text style={[Typography.body, { color: Colors.text }]}>
                  Rueda de la Vida
                </Text>
                <Text style={[Typography.bodySmall, { color: Colors.textSecondary }]}>
                  Evaluar pilares
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="open-in-new" size={24} color={Colors.mint} />
          </View>
        </TacticalCard>
      </ScrollView>
    </TacticalGrid>
  );
}
