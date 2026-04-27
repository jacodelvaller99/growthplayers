import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PolarisMark } from '@/components/polaris';
import { ENV } from '@/app/config/env';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { getOfferings, purchasePackage, restorePurchases } from '@/services/revenuecat';

// ─── Feature bullets ──────────────────────────────────────────────────────────
const FEATURES = [
  { icon: 'psychology', label: 'Mentor Polaris IA', desc: 'Conversaciones ilimitadas con IA real' },
  { icon: 'bolt', label: 'Análisis de Estado', desc: 'Diagnóstico operativo personalizado' },
  { icon: 'auto-awesome', label: 'Prácticas Soberanas', desc: 'Protocolos adaptativos al sistema' },
  { icon: 'timeline', label: 'Historial Completo', desc: 'Acceso al historial de 20 mensajes' },
  { icon: 'workspace-premium', label: 'Módulos Avanzados', desc: 'Módulos 7-10 desbloqueados' },
  { icon: 'notifications-active', label: 'Recordatorios', desc: 'Check-in diario automatizado' },
] as const;

// ─── Mock plans (dev) ─────────────────────────────────────────────────────────
const DEV_PLANS = [
  {
    id: 'monthly',
    label: 'MENSUAL',
    price: '$29,900',
    period: '/mes',
    badge: '',
  },
  {
    id: 'annual',
    label: 'ANUAL',
    price: '$199,900',
    period: '/año',
    badge: 'MEJOR VALOR',
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<string>('annual');
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleSelectPlan = (id: string) => {
    Haptics.selectionAsync();
    setSelectedPlan(id);
  };

  const handleSubscribe = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      if (ENV.isDev && !ENV.revenueCatApiKey) {
        // Simulación en desarrollo
        await new Promise((r) => setTimeout(r, 1000));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
        return;
      }

      const offerings = await getOfferings();
      if (!offerings?.current) {
        throw new Error('No hay planes disponibles');
      }

      const pkg = offerings.current.availablePackages.find(
        (p) => p.packageType.toLowerCase().includes(selectedPlan),
      ) ?? offerings.current.availablePackages[0];

      if (!pkg) throw new Error('Plan no encontrado');

      const info = await purchasePackage(pkg);
      if (info) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      }
    } catch (err: any) {
      console.error('[Paywall] purchase error:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRestoring(true);
    try {
      const info = await restorePurchases();
      if (info && Object.keys(info.entitlements.active).length > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      }
    } catch {
      // ignore
    } finally {
      setRestoring(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        bounces
        overScrollMode="never"
        keyboardShouldPersistTaps="handled">

        {/* ── Close ── */}
        <Pressable
          style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }]}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <MaterialIcons name="close" size={22} color={palette.ash} />
        </Pressable>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <PolarisMark size={52} />
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>POLARIS GROWTH INSTITUTE</Text>
            <Text style={styles.heroTitle}>MENTOR{'\n'}POLARIS IA</Text>
            <Text style={styles.heroSub}>
              Tu coach ejecutivo de élite, disponible 24/7.
            </Text>
          </View>
        </View>

        {/* ── Features ── */}
        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <MaterialIcons name={f.icon as any} size={18} color={palette.gold} />
              </View>
              <View style={styles.featureCopy}>
                <Text style={styles.featureLabel}>{f.label}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Plans ── */}
        <View style={styles.plans}>
          {DEV_PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            return (
              <Pressable
                key={plan.id}
                onPress={() => handleSelectPlan(plan.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                style={({ pressed }) => [
                  styles.planCard,
                  isSelected && styles.planCardSelected,
                  pressed && { opacity: 0.88 },
                ]}>
                {plan.badge ? (
                  <View style={styles.planBadge}>
                    <Text style={styles.planBadgeText}>{plan.badge}</Text>
                  </View>
                ) : null}
                <View style={styles.planCheck}>
                  <MaterialIcons
                    name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={20}
                    color={isSelected ? palette.gold : palette.smoke}
                  />
                </View>
                <View style={styles.planInfo}>
                  <Text style={[styles.planLabel, isSelected && styles.planLabelSelected]}>
                    {plan.label}
                  </Text>
                  <View style={styles.planPriceRow}>
                    <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>
                      {plan.price}
                    </Text>
                    <Text style={styles.planPeriod}>{plan.period}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* ── CTA ── */}
        <Pressable
          onPress={handleSubscribe}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Suscribirse"
          style={({ pressed }) => [
            styles.ctaButton,
            loading && styles.ctaButtonLoading,
            pressed && !loading && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}>
          {loading ? (
            <ActivityIndicator color={palette.black} />
          ) : (
            <>
              <Text style={styles.ctaText}>INICIAR PROTOCOLO PREMIUM</Text>
              <MaterialIcons name="arrow-forward" size={18} color={palette.black} />
            </>
          )}
        </Pressable>

        {/* ── Restore ── */}
        <Pressable
          onPress={handleRestore}
          disabled={restoring}
          style={styles.restoreButton}>
          {restoring ? (
            <ActivityIndicator color={palette.smoke} size="small" />
          ) : (
            <Text style={styles.restoreText}>RESTAURAR COMPRAS</Text>
          )}
        </Pressable>

        {/* ── Legal ── */}
        <Text style={styles.legal}>
          {Platform.OS === 'ios'
            ? 'Pago gestionado por App Store. Se renueva automáticamente. Cancela cuando quieras.'
            : 'Pago gestionado por Google Play. Se renueva automáticamente.'}
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.black,
  },
  scroll: {
    alignSelf: 'center',
    maxWidth: 430,
    paddingHorizontal: spacing.xl,
    paddingBottom: 48,
    width: '100%',
    gap: spacing.xl,
  },

  // Close
  closeButton: {
    alignSelf: 'flex-end',
    backgroundColor: palette.graphite,
    borderColor: palette.lineSoft,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero
  hero: {
    alignItems: 'center',
    gap: spacing.xl,
  },
  heroCopy: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroEyebrow: {
    ...typography.label,
    color: palette.gold,
  },
  heroTitle: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 46,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 50,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  heroSub: {
    ...typography.body,
    color: palette.ash,
    textAlign: 'center',
  },

  // Features
  features: {
    gap: spacing.md,
  },
  featureRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  featureIcon: {
    alignItems: 'center',
    backgroundColor: palette.goldLight,
    borderColor: palette.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  featureCopy: {
    flex: 1,
    gap: 2,
    paddingTop: 2,
  },
  featureLabel: {
    ...typography.section,
    color: palette.ivory,
    fontSize: 11,
  },
  featureDesc: {
    ...typography.body,
    color: palette.ash,
    fontSize: 13,
  },

  // Plans
  plans: {
    gap: spacing.md,
  },
  planCard: {
    alignItems: 'center',
    backgroundColor: palette.graphite,
    borderColor: palette.lineSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 72,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    position: 'relative',
  },
  planCardSelected: {
    backgroundColor: palette.goldLight,
    borderColor: palette.gold,
  },
  planBadge: {
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    position: 'absolute',
    right: spacing.md,
    top: spacing.sm,
  },
  planBadgeText: {
    ...typography.label,
    color: palette.black,
    fontSize: 8,
  },
  planCheck: {
    width: 24,
  },
  planInfo: {
    flex: 1,
    gap: 2,
  },
  planLabel: {
    ...typography.section,
    color: palette.ash,
  },
  planLabelSelected: {
    color: palette.ivory,
  },
  planPriceRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
  },
  planPrice: {
    color: palette.smoke,
    fontFamily: Fonts.display,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0,
  },
  planPriceSelected: {
    color: palette.gold,
  },
  planPeriod: {
    ...typography.mono,
    color: palette.smoke,
    marginBottom: 3,
  },

  // CTA
  ctaButton: {
    alignItems: 'center',
    backgroundColor: palette.gold,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 60,
    paddingHorizontal: spacing.xl,
  },
  ctaButtonLoading: {
    opacity: 0.7,
  },
  ctaText: {
    ...typography.section,
    color: palette.black,
  },

  // Restore
  restoreButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  restoreText: {
    ...typography.label,
    color: palette.smoke,
  },

  // Legal
  legal: {
    ...typography.mono,
    color: palette.smoke,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },
});
