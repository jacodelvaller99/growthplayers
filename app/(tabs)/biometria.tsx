import React, { useState } from 'react';
import { View, Text, ScrollView, FlatList, Pressable, Modal, TextInput, Linking } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { TacticalGrid } from '../../components/ui/TacticalGrid';
import { TacticalCard } from '../../components/ui/TacticalCard';
import { MintButton } from '../../components/ui/MintButton';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { supabase } from '../../lib/supabase';
import { useBiometricsStore } from '../../store';

interface Supplement {
  id: string;
  nombre: string;
  dosis: string;
  unidad: string;
  horario: string;
}

const MOCK_HRV_DATA = [
  { x: 'Lun', y: 65 },
  { x: 'Mar', y: 72 },
  { x: 'Mié', y: 58 },
  { x: 'Jue', y: 68 },
  { x: 'Vie', y: 75 },
  { x: 'Sab', y: 82 },
  { x: 'Dom', y: 71 },
];

export default function BiometriaScreen() {
  const [connected, setConnected] = useState(false);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [showSupplementModal, setShowSupplementModal] = useState(false);
  const [supplementForm, setSupplementForm] = useState({ nombre: '', dosis: '', unidad: 'mg', horario: 'AM' });

  const { data } = useBiometricsStore();

  const handleConnectWhoop = async () => {
    try {
      await Linking.openURL(
        'https://api.whooped.com/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=exp://biometria'
      );
      // Simular conexión exitosa
      setConnected(true);
    } catch (error) {
      console.error('OAuth error:', error);
    }
  };

  const handleConnectOura = async () => {
    try {
      await Linking.openURL(
        'https://cloud.ouraring.com/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=exp://biometria'
      );
      // Simular conexión exitosa
      setConnected(true);
    } catch (error) {
      console.error('OAuth error:', error);
    }
  };

  const addSupplement = () => {
    if (!supplementForm.nombre || !supplementForm.dosis) return;

    const newSupplement: Supplement = {
      id: `supp_${Date.now()}`,
      ...supplementForm,
    };

    setSupplements([...supplements, newSupplement]);
    setSupplementForm({ nombre: '', dosis: '', unidad: 'mg', horario: 'AM' });
    setShowSupplementModal(false);
  };

  const removeSupplement = (id: string) => {
    setSupplements(supplements.filter(s => s.id !== id));
  };

  const getSleepScoreColor = (score: number) => {
    if (score >= 80) return Colors.success;
    if (score >= 60) return Colors.warning;
    return Colors.error;
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
          <Text style={[Typography.h2, { color: Colors.mint, marginBottom: Layout.spacing.sm }]}>
            Biometría
          </Text>
          <Text style={[Typography.body, { color: Colors.textSecondary }]}>
            {connected ? 'Tus datos en tiempo real' : 'Conecta tu dispositivo'}
          </Text>
        </View>

        {!connected ? (
          <>
            <SectionHeader tag="CONEXIÓN" title="Elige tu dispositivo" />

            <TacticalCard style={{ marginBottom: Layout.spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Layout.spacing.lg }}>
                <MaterialCommunityIcons name="heart-pulse" size={32} color={Colors.mint} />
                <Text style={[Typography.h3, { color: Colors.text, marginLeft: Layout.spacing.md }]}>
                  Whoop
                </Text>
              </View>
              <Text style={[Typography.body, { color: Colors.textSecondary, marginBottom: Layout.spacing.lg }]}>
                Seguimiento de HRV, sueño y recuperación
              </Text>
              <MintButton label="Conectar Whoop" onPress={handleConnectWhoop} />
            </TacticalCard>

            <TacticalCard>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Layout.spacing.lg }}>
                <MaterialCommunityIcons name="ring" size={32} color={Colors.mint} />
                <Text style={[Typography.h3, { color: Colors.text, marginLeft: Layout.spacing.md }]}>
                  Oura Ring
                </Text>
              </View>
              <Text style={[Typography.body, { color: Colors.textSecondary, marginBottom: Layout.spacing.lg }]}>
                Monitoreo completo de salud 24/7
              </Text>
              <MintButton label="Conectar Oura" onPress={handleConnectOura} />
            </TacticalCard>
          </>
        ) : (
          <>
            <SectionHeader tag="DATOS" title="Últimos 7 días" />

            {/* HRV */}
            <TacticalCard style={{ marginBottom: Layout.spacing.lg }}>
              <Text style={[Typography.h3, { color: Colors.text, marginBottom: Layout.spacing.lg }]}>
                HRV (Variabilidad Cardiaca)
              </Text>
              <View style={{ height: 120, marginBottom: Layout.spacing.lg, flexDirection: 'row', alignItems: 'flex-end', gap: Layout.spacing.sm }}>
                {MOCK_HRV_DATA.map((data, i) => (
                  <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                    <View
                      style={{
                        width: '100%',
                        height: (data.y / 100) * 100,
                        backgroundColor: Colors.mint,
                        borderRadius: 4,
                        marginBottom: Layout.spacing.sm,
                      }}
                    />
                    <Text style={[Typography.bodySmall, { color: Colors.textSecondary }]}>
                      {data.x}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[Typography.body, { color: Colors.textSecondary }]}>
                  Promedio: 68ms
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MaterialCommunityIcons name="trending-up" size={16} color={Colors.success} />
                  <Text style={[Typography.bodySmall, { color: Colors.success }]}>
                    +5% vs ayer
                  </Text>
                </View>
              </View>
            </TacticalCard>

            {/* Sleep */}
            <TacticalCard style={{ marginBottom: Layout.spacing.lg }}>
              <Text style={[Typography.h3, { color: Colors.text, marginBottom: Layout.spacing.lg }]}>
                Sueño
              </Text>
              <View style={{ marginBottom: Layout.spacing.lg }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Layout.spacing.sm }}>
                  <Text style={[Typography.body, { color: Colors.textSecondary }]}>
                    Anoche: 7.5 horas
                  </Text>
                  <Text style={[Typography.monoLarge, { color: getSleepScoreColor(78) }]}>
                    78
                  </Text>
                </View>
                <View style={{ height: 8, backgroundColor: Colors.surfaceAlt, borderRadius: 4, overflow: 'hidden' }}>
                  <View
                    style={{
                      height: '100%',
                      width: '78%',
                      backgroundColor: getSleepScoreColor(78),
                    }}
                  />
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialCommunityIcons name="trending-down" size={16} color={Colors.error} />
                <Text style={[Typography.bodySmall, { color: Colors.error }]}>
                  -8% vs ayer
                </Text>
              </View>
            </TacticalCard>

            {/* Recovery */}
            <TacticalCard style={{ marginBottom: Layout.spacing.lg }}>
              <Text style={[Typography.h3, { color: Colors.text, marginBottom: Layout.spacing.lg }]}>
                Recuperación
              </Text>
              <View
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  borderWidth: 8,
                  borderColor: Colors.mint,
                  justifyContent: 'center',
                  alignItems: 'center',
                  alignSelf: 'center',
                  marginBottom: Layout.spacing.lg,
                }}
              >
                <Text style={[Typography.monoLarge, { color: Colors.mint }]}>72%</Text>
              </View>
              <Text style={[Typography.body, { color: Colors.textSecondary, textAlign: 'center' }]}>
                Listo para entrenamiento
              </Text>
            </TacticalCard>

            {/* Cognitive Peak */}
            <TacticalCard style={{ marginBottom: Layout.spacing.xl }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.md, marginBottom: Layout.spacing.lg }}>
                <MaterialCommunityIcons name="brain" size={28} color={Colors.mint} />
                <View>
                  <Text style={[Typography.tag, { color: Colors.mint, marginBottom: Layout.spacing.xs }]}>
                    PICO COGNITIVO
                  </Text>
                  <Text style={[Typography.h3, { color: Colors.text }]}>
                    14:00 - 16:00
                  </Text>
                </View>
              </View>
              <Text style={[Typography.body, { color: Colors.textSecondary }]}>
                Tu máxima concentración hoy. Ideal para tareas complejas.
              </Text>
            </TacticalCard>

            {/* Supplements */}
            <SectionHeader tag="SUPLEMENTACIÓN" title="Mi stack de hoy" />
            <TacticalCard style={{ marginBottom: Layout.spacing.xl }}>
              <FlatList
                scrollEnabled={false}
                data={supplements}
                renderItem={({ item }) => (
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: Layout.spacing.md,
                      borderBottomWidth: 1,
                      borderBottomColor: Colors.mintBorder,
                    }}
                  >
                    <View>
                      <Text style={[Typography.body, { color: Colors.text }]}>
                        {item.nombre}
                      </Text>
                      <Text style={[Typography.bodySmall, { color: Colors.textSecondary }]}>
                        {item.dosis}{item.unidad} • {item.horario}
                      </Text>
                    </View>
                    <Pressable onPress={() => removeSupplement(item.id)}>
                      <MaterialCommunityIcons name="close" size={20} color={Colors.error} />
                    </Pressable>
                  </View>
                )}
                keyExtractor={item => item.id}
                ListEmptyComponent={
                  <Text style={[Typography.bodySmall, { color: Colors.textSecondary, paddingVertical: Layout.spacing.md }]}>
                    No hay suplementos agregados
                  </Text>
                }
              />
              <MintButton
                label="+ Agregar suplemento"
                variant="ghost"
                onPress={() => setShowSupplementModal(true)}
                style={{ marginTop: Layout.spacing.lg }}
              />
            </TacticalCard>

            {/* Supplement Modal */}
            <Modal visible={showSupplementModal} transparent animationType="fade">
              <View
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  justifyContent: 'flex-end',
                }}
              >
                <View
                  style={{
                    backgroundColor: Colors.surface,
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    paddingHorizontal: Layout.spacing.lg,
                    paddingVertical: Layout.spacing.xl,
                  }}
                >
                  <Text style={[Typography.h3, { color: Colors.text, marginBottom: Layout.spacing.lg }]}>
                    Nuevo suplemento
                  </Text>

                  <TextInput
                    placeholder="Nombre"
                    placeholderTextColor={Colors.textMuted}
                    value={supplementForm.nombre}
                    onChangeText={text => setSupplementForm({ ...supplementForm, nombre: text })}
                    style={{
                      backgroundColor: Colors.surfaceAlt,
                      color: Colors.text,
                      borderWidth: 1,
                      borderColor: Colors.mintBorder,
                      padding: Layout.spacing.md,
                      borderRadius: 8,
                      marginBottom: Layout.spacing.md,
                    }}
                  />

                  <TextInput
                    placeholder="Dosis"
                    placeholderTextColor={Colors.textMuted}
                    value={supplementForm.dosis}
                    onChangeText={text => setSupplementForm({ ...supplementForm, dosis: text })}
                    style={{
                      backgroundColor: Colors.surfaceAlt,
                      color: Colors.text,
                      borderWidth: 1,
                      borderColor: Colors.mintBorder,
                      padding: Layout.spacing.md,
                      borderRadius: 8,
                      marginBottom: Layout.spacing.md,
                    }}
                  />

                  <View style={{ flexDirection: 'row', gap: Layout.spacing.md, marginBottom: Layout.spacing.lg }}>
                    <MintButton
                      label="Cancelar"
                      variant="ghost"
                      onPress={() => setShowSupplementModal(false)}
                      style={{ flex: 1 }}
                    />
                    <MintButton
                      label="Guardar"
                      onPress={addSupplement}
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              </View>
            </Modal>
          </>
        )}
      </ScrollView>
    </TacticalGrid>
  );
}
