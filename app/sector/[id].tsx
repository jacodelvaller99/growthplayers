import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, FlatList, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TacticalGrid } from '../../components/ui/TacticalGrid';
import { TacticalCard } from '../../components/ui/TacticalCard';
import { MintButton } from '../../components/ui/MintButton';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { supabase } from '../../lib/supabase';

interface Post {
  id: string;
  nombre: string;
  contenido: string;
  timestamp: string;
}

interface Mision {
  id: string;
  titulo: string;
  descripcion: string;
  participantes: number;
  meta: number;
}

interface Agente {
  id: string;
  nombre: string;
  streak: number;
  pillar: string;
  ultimoRitual: string;
}

export default function SectorScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'intel' | 'misiones' | 'agentes'>('intel');
  const [sectorName, setSectorName] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [misiones, setMisiones] = useState<Mision[]>([]);
  const [agentes, setAgentes] = useState<Agente[]>([]);

  useEffect(() => {
    loadSectorData();
  }, [id]);

  const loadSectorData = async () => {
    if (!id) return;

    try {
      // Cargar sector
      const { data: sector } = await supabase
        .from('community_sectors')
        .select('*')
        .eq('id', id)
        .single();

      if (sector) setSectorName(sector.nombre);

      // Mock data for posts, misiones, agentes
      setPosts([
        { id: '1', nombre: 'Alex', contenido: 'Hoy completé 90 min de concentración profunda', timestamp: 'hace 2h' },
        { id: '2', nombre: 'María', contenido: 'Nueva PR en resistencia. +5 puntos en Salud', timestamp: 'hace 4h' },
      ]);

      setMisiones([
        { id: '1', titulo: 'Meditación 10 min', descripcion: 'Sesión diaria de respiración', participantes: 143, meta: 200 },
        { id: '2', titulo: 'Lectura 30 min', descripcion: 'Un capítulo del protocolo', participantes: 87, meta: 200 },
      ]);

      setAgentes([
        { id: '1', nombre: 'Coach Juan', streak: 45, pillar: 'Negocio', ultimoRitual: 'hace 1h' },
        { id: '2', nombre: 'Dra. María', streak: 78, pillar: 'Salud', ultimoRitual: 'hace 2h' },
      ]);
    } catch (error) {
      console.error('Error loading sector:', error);
    }
  };

  return (
    <TacticalGrid>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: Layout.spacing.lg,
          paddingVertical: Layout.spacing.lg,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Layout.spacing.xl }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ fontSize: 24, color: Colors.mint }}>←</Text>
          </Pressable>
          <Text style={[Typography.h2, { color: Colors.text, marginLeft: Layout.spacing.lg }]}>
            {sectorName}
          </Text>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', gap: Layout.spacing.md, marginBottom: Layout.spacing.xl }}>
          {['intel', 'misiones', 'agentes'].map(tab => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab as any)}
              style={{
                paddingHorizontal: Layout.spacing.md,
                paddingVertical: Layout.spacing.sm,
                borderBottomWidth: 2,
                borderBottomColor: activeTab === tab ? Colors.mint : Colors.transparent,
              }}
            >
              <Text
                style={[
                  Typography.button,
                  { color: activeTab === tab ? Colors.mint : Colors.textSecondary },
                ]}
              >
                {tab === 'intel' ? 'Intel' : tab === 'misiones' ? 'Misiones' : 'Agentes'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Intel Tab */}
        {activeTab === 'intel' && (
          <View>
            <FlatList
              scrollEnabled={false}
              data={posts}
              renderItem={({ item }) => (
                <TacticalCard style={{ marginBottom: Layout.spacing.lg }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Layout.spacing.md }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: Colors.surfaceAlt,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 18 }}>👤</Text>
                    </View>
                    <View style={{ marginLeft: Layout.spacing.md, flex: 1 }}>
                      <Text style={[Typography.body, { color: Colors.text }]}>
                        {item.nombre}
                      </Text>
                      <Text style={[Typography.bodySmall, { color: Colors.textSecondary }]}>
                        {item.timestamp}
                      </Text>
                    </View>
                  </View>
                  <Text style={[Typography.body, { color: Colors.text }]}>
                    {item.contenido}
                  </Text>
                </TacticalCard>
              )}
              keyExtractor={item => item.id}
            />
            <MintButton label="Compartir Intel" onPress={() => {}} />
          </View>
        )}

        {/* Misiones Tab */}
        {activeTab === 'misiones' && (
          <View>
            <FlatList
              scrollEnabled={false}
              data={misiones}
              renderItem={({ item }) => (
                <TacticalCard style={{ marginBottom: Layout.spacing.lg }}>
                  <Text style={[Typography.h3, { color: Colors.text, marginBottom: Layout.spacing.md }]}>
                    {item.titulo}
                  </Text>
                  <Text style={[Typography.body, { color: Colors.textSecondary, marginBottom: Layout.spacing.lg }]}>
                    {item.descripcion}
                  </Text>
                  <View style={{ marginBottom: Layout.spacing.lg }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Layout.spacing.sm }}>
                      <Text style={[Typography.bodySmall, { color: Colors.textSecondary }]}>
                        {item.participantes}/{item.meta} participantes
                      </Text>
                      <Text style={[Typography.monoLarge, { color: Colors.mint }]}>
                        {Math.round((item.participantes / item.meta) * 100)}%
                      </Text>
                    </View>
                    <View style={{ height: 8, backgroundColor: Colors.surfaceAlt, borderRadius: 4, overflow: 'hidden' }}>
                      <View
                        style={{
                          height: '100%',
                          width: `${(item.participantes / item.meta) * 100}%`,
                          backgroundColor: Colors.mint,
                        }}
                      />
                    </View>
                  </View>
                  <MintButton label="UNIRME" onPress={() => {}} />
                </TacticalCard>
              )}
              keyExtractor={item => item.id}
            />
          </View>
        )}

        {/* Agentes Tab */}
        {activeTab === 'agentes' && (
          <View>
            <FlatList
              scrollEnabled={false}
              data={agentes}
              renderItem={({ item }) => (
                <TacticalCard
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: Layout.spacing.md,
                    marginBottom: Layout.spacing.lg,
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: Colors.surfaceAlt,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>👨‍💼</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.body, { color: Colors.text }]}>
                      {item.nombre}
                    </Text>
                    <Text style={[Typography.bodySmall, { color: Colors.textSecondary }]}>
                      {item.streak} días • {item.pillar}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: Colors.success,
                    }}
                  />
                </TacticalCard>
              )}
              keyExtractor={item => item.id}
            />
          </View>
        )}
      </ScrollView>
    </TacticalGrid>
  );
}
