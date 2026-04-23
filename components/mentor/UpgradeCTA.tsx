import React from 'react';
import { View, Text } from 'react-native';
import { TacticalCard } from '../ui/TacticalCard';
import { MintButton } from '../ui/MintButton';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';

interface UpgradeCTAProps {
  onUpgrade: () => void;
}

export const UpgradeCTA: React.FC<UpgradeCTAProps> = ({ onUpgrade }) => {
  return (
    <TacticalCard
      style={{
        backgroundColor: Colors.mintLight,
        borderColor: Colors.mint,
        borderWidth: 2,
        marginVertical: Layout.spacing.lg,
      }}
    >
      <Text
        style={[
          Typography.h3,
          { color: Colors.mint, marginBottom: Layout.spacing.md, textAlign: 'center' },
        ]}
      >
        Activa tu Protocolo Soberano
      </Text>

      <Text
        style={[
          Typography.monoLarge,
          { color: Colors.mint, marginBottom: Layout.spacing.md, textAlign: 'center' },
        ]}
      >
        $29
        <Text style={[Typography.body, { color: Colors.textSecondary }]}>
          /mes
        </Text>
      </Text>

      <View style={{ marginBottom: Layout.spacing.lg, gap: Layout.spacing.md }}>
        <View style={{ flexDirection: 'row', gap: Layout.spacing.sm }}>
          <Text style={[Typography.body, { color: Colors.mint }]}>✓</Text>
          <Text style={[Typography.body, { color: Colors.text, flex: 1 }]}>
            Acceso ilimitado al Mentor Polaris
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: Layout.spacing.sm }}>
          <Text style={[Typography.body, { color: Colors.mint }]}>✓</Text>
          <Text style={[Typography.body, { color: Colors.text, flex: 1 }]}>
            Análisis profundo de tu Rueda de la Vida
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: Layout.spacing.sm }}>
          <Text style={[Typography.body, { color: Colors.mint }]}>✓</Text>
          <Text style={[Typography.body, { color: Colors.text, flex: 1 }]}>
            Conexión con Whoop/Oura para biometría
          </Text>
        </View>
      </View>

      <MintButton
        label="ACTIVAR AHORA"
        onPress={onUpgrade}
        style={{ marginBottom: Layout.spacing.md }}
      />

      <MintButton
        label="Ver todos los planes"
        variant="ghost"
        onPress={() => console.log('View all plans')}
      />
    </TacticalCard>
  );
};
