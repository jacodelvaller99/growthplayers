import { useRouter } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader, PremiumCard, PrimaryButton, SecondaryButton, screen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ScrollView
      style={screen.root}
      contentContainerStyle={[screen.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
      bounces
      overScrollMode={Platform.OS === 'android' ? 'never' : undefined}>
      <AppHeader title="POLARIS PREMIUM" />

      <PremiumCard style={styles.hero}>
        <Text style={styles.eyebrow}>ACCESO COMPLETO</Text>
        <Text style={styles.title}>DESBLOQUEA TODO EL SISTEMA</Text>
        <Text style={styles.body}>
          Mentor con IA ilimitado, todos los módulos del Protocolo Soberano y análisis de biometría avanzada.
        </Text>
      </PremiumCard>

      <View style={styles.featuresCard}>
        {[
          'Mentor Polaris sin límites',
          '7 módulos del Protocolo Soberano',
          'Análisis de coherencia diario',
          'Score soberano y logros',
        ].map((feat) => (
          <View key={feat} style={styles.featureRow}>
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>{feat}</Text>
          </View>
        ))}
      </View>

      <PrimaryButton label="OBTENER ACCESO PREMIUM" icon="workspace-premium" />
      <SecondaryButton label="VOLVER" icon="close" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.lg,
  },
  eyebrow: {
    ...typography.label,
    color: palette.gold,
  },
  title: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 24,
    fontWeight: '400',
    letterSpacing: 2,
    lineHeight: 30,
    textTransform: 'uppercase',
  },
  body: {
    ...typography.body,
    color: palette.ash,
    lineHeight: 22,
  },
  featuresCard: {
    borderColor: palette.line,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  featureRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  featureDot: {
    backgroundColor: palette.gold,
    borderRadius: radii.none,
    height: 6,
    width: 6,
  },
  featureText: {
    ...typography.body,
    color: palette.ivory,
  },
});
