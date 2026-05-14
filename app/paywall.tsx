import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader, PremiumCard, PrimaryButton, SecondaryButton, screen, useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import {
  checkSubscription,
  getOfferings,
  purchasePackage,
  restorePurchases,
} from '@/services/revenuecat';

type PurchasesPackage = {
  packageType: string;
  product: { priceString: string; title: string };
};

export default function PaywallScreen() {
  const sc = useScreen();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [packages, setPackages]     = useState<PurchasesPackage[]>([]);
  const [selected, setSelected]     = useState<PurchasesPackage | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring]   = useState(false);

  // Load RevenueCat offerings on mount
  useEffect(() => {
    getOfferings().then((offerings) => {
      const pkgs = offerings?.current?.availablePackages ?? [];
      setPackages(pkgs);
      // Pre-select annual (or first available) package
      const annual = pkgs.find((p) => p.packageType === 'ANNUAL') ?? pkgs[0] ?? null;
      setSelected(annual);
    });
  }, []);

  async function handlePurchase() {
    if (!selected) return;

    // On web, RevenueCat is not supported — show info
    if (Platform.OS === 'web') {
      Alert.alert(
        'Acceso Premium',
        'Para suscribirte descarga la app en iOS o Android.',
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPurchasing(true);
    try {
      const info = await purchasePackage(selected);
      if (info && Object.keys(info.entitlements.active).length > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          '¡Bienvenido a Premium!',
          'Tu acceso completo al Protocolo Soberano está activado.',
          [{ text: 'Continuar', onPress: () => router.back() }],
        );
      }
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Error en la compra',
        err?.message ?? 'Inténtalo de nuevo o contacta soporte.',
      );
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRestoring(true);
    try {
      const info = await restorePurchases();
      const isActive = info && Object.keys(info.entitlements.active).length > 0;
      if (isActive) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Suscripción restaurada',
          'Tu acceso premium ha sido restaurado.',
          [{ text: 'Continuar', onPress: () => router.back() }],
        );
      } else {
        Alert.alert(
          'Sin suscripción activa',
          'No encontramos ninguna compra anterior asociada a esta cuenta.',
        );
      }
    } catch {
      Alert.alert('Error', 'No se pudo restaurar la compra. Inténtalo de nuevo.');
    } finally {
      setRestoring(false);
    }
  }

  const isLoading = purchasing || restoring;

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={[sc.content, { paddingTop: insets.top + 16 }]}
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
          '9 módulos del Protocolo Soberano',
          'Análisis biométrico con wearables',
          'Score soberano y engine de inteligencia',
        ].map((feat) => (
          <View key={feat} style={styles.featureRow}>
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>{feat}</Text>
          </View>
        ))}
      </View>

      {/* Package selector — only shown when RC offerings loaded */}
      {packages.length > 1 && (
        <View style={styles.packagesRow}>
          {packages.map((pkg) => {
            const isSelected = selected?.packageType === pkg.packageType;
            return (
              <Pressable
                key={pkg.packageType}
                style={[styles.packageCard, isSelected && styles.packageCardSelected]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelected(pkg);
                }}>
                <Text style={[styles.packageType, isSelected && styles.packageTypeSelected]}>
                  {pkg.packageType === 'ANNUAL' ? 'ANUAL' : 'MENSUAL'}
                </Text>
                <Text style={[styles.packagePrice, isSelected && styles.packagePriceSelected]}>
                  {pkg.product.priceString}
                </Text>
                {pkg.packageType === 'ANNUAL' && (
                  <View style={styles.bestValueBadge}>
                    <Text style={styles.bestValueText}>MEJOR VALOR</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Price display when single package or none loaded */}
      {packages.length <= 1 && selected && (
        <PremiumCard style={styles.priceCard}>
          <Text style={styles.priceLabel}>PRECIO</Text>
          <Text style={styles.priceValue}>{selected.product.priceString}</Text>
        </PremiumCard>
      )}

      <PrimaryButton
        label={
          purchasing
            ? 'PROCESANDO...'
            : packages.length === 0
            ? 'OBTENER ACCESO PREMIUM'
            : `COMENZAR — ${selected?.product.priceString ?? ''}`
        }
        icon={purchasing ? undefined : 'workspace-premium'}
        onPress={handlePurchase}
        disabled={isLoading || packages.length === 0}
      />

      {/* Restore — required by Apple App Store guidelines */}
      <Pressable
        style={[styles.restoreBtn, isLoading && { opacity: 0.5 }]}
        onPress={handleRestore}
        disabled={isLoading}>
        {restoring ? (
          <ActivityIndicator size="small" color={palette.smoke} />
        ) : (
          <Text style={styles.restoreText}>Restaurar compras anteriores</Text>
        )}
      </Pressable>

      <SecondaryButton label="VOLVER" icon="close" onPress={() => router.back()} />

      <Text style={styles.legal}>
        Al continuar aceptas los Términos de Uso y la Política de Privacidad de Polaris Growth Institute.
        {Platform.OS === 'ios'
          ? ' El pago se realizará a través de tu cuenta de Apple ID. La suscripción se renueva automáticamente.'
          : ' El pago se realizará a través de Google Play.'}
      </Text>
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

  packagesRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  packageCard: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.sm,
    padding: spacing.md,
    gap: spacing.xs,
    position: 'relative',
  },
  packageCardSelected: {
    borderColor: palette.gold,
    backgroundColor: 'rgba(255,200,4,0.06)',
  },
  packageType: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 9,
    letterSpacing: 1.5,
  },
  packageTypeSelected: {
    color: palette.gold,
  },
  packagePrice: {
    fontFamily: Fonts.display,
    color: palette.ash,
    fontSize: 18,
  },
  packagePriceSelected: {
    color: palette.ivory,
  },
  bestValueBadge: {
    backgroundColor: palette.gold,
    borderRadius: radii.none,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  bestValueText: {
    ...typography.label,
    color: palette.black,
    fontSize: 7,
    letterSpacing: 1,
  },

  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  priceLabel: {
    ...typography.label,
    color: palette.smoke,
  },
  priceValue: {
    fontFamily: Fonts.display,
    color: palette.ivory,
    fontSize: 22,
  },

  restoreBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  restoreText: {
    ...typography.caption,
    color: palette.smoke,
    textDecorationLine: 'underline',
  },

  legal: {
    ...typography.caption,
    color: palette.smoke,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    opacity: 0.7,
  },
});
