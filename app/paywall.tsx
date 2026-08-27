import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader, PremiumCard, PressableScale, PrimaryButton, SecondaryButton, SkeletonBar, useScreen } from '@/components/polaris';
import ErrorState from '@/components/ErrorState';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { alpha } from '@/constants/themeColors';
import { VERIFIED_TESTIMONIALS } from '@/data/testimonials';
import { captureWebLead, isValidEmail } from '@/lib/webLeads';
import {
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

  // 3 estados explícitos del CTA de compra — antes null/vacío dejaba el botón
  // deshabilitado sin explicación (cargando y roto se veían igual).
  const [offeringsState, setOfferingsState] = useState<'loading' | 'unavailable' | 'ready'>('loading');

  async function loadOfferings() {
    setOfferingsState('loading');
    const offerings = await getOfferings();
    const pkgs = offerings?.current?.availablePackages ?? [];
    if (pkgs.length === 0) {
      setOfferingsState('unavailable');
      return;
    }
    setPackages(pkgs);
    setSelected(pkgs.find((p) => p.packageType === 'ANNUAL') ?? pkgs[0]);
    setOfferingsState('ready');
  }

  // Web lead capture — el visitante web no puede comprar aquí (RevenueCat es
  // nativo); en vez de un dead-end capturamos su email para avisarle.
  const [leadEmail, setLeadEmail]   = useState('');
  const [leadStatus, setLeadStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  async function handleLeadSubmit() {
    const email = leadEmail.trim();
    if (!isValidEmail(email)) {
      setLeadStatus('error');
      return;
    }
    setLeadStatus('sending');
    const ok = await captureWebLead(email, 'paywall_web');
    setLeadStatus(ok ? 'done' : 'error');
  }

  // Load RevenueCat offerings on mount
  useEffect(() => {
    loadOfferings();
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
        err?.message ?? 'Inténtalo de nuevo o escribe a info@polarisgrowthinstitute.com.',
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
        <Text style={styles.eyebrow}>PROTOCOLO SOBERANO</Text>
        <Text style={styles.title}>¿ESTÁS LISTO{'\n'}PARA COMPROMETERTE?</Text>
        <Text style={styles.body}>
          No es solo una suscripción. Es la decisión de operar tu vida con la misma seriedad con que operarías una empresa de alto rendimiento.
        </Text>
      </PremiumCard>

      <View style={styles.featuresCard}>
        {[
          { feat: 'Norman sin límites — tu mentor IA personalizado', icon: 'psychology' },
          { feat: '9 semanas del Protocolo Soberano completo', icon: 'military-tech' },
          { feat: 'Biometría avanzada con WHOOP y Oura', icon: 'favorite' },
          { feat: 'Intelligence Engine — detecta tus patrones', icon: 'insights' },
        ].map(({ feat, icon }) => (
          <View key={feat} style={styles.featureRow}>
            <MaterialIcons name={icon as any} size={14} color={palette.goldText} />
            <Text style={styles.featureText}>{feat}</Text>
          </View>
        ))}
      </View>

      {/* Prueba de transformación — SOLO testimonios con consentimiento confirmado.
          Atribuir por rol un testimonio no verificado lo hacía leer como prueba
          real; eso es riesgo legal y de rechazo. Mientras no haya ninguno
          verificado, la sección no se renderiza: la estructura del protocolo
          (arriba) es prueba verificable; un testimonio sin consentimiento no. */}
      {VERIFIED_TESTIMONIALS.length > 0 && (
        <View style={styles.proofSection}>
          <Text style={styles.proofEyebrow}>PRUEBA DE TRANSFORMACIÓN</Text>
          {VERIFIED_TESTIMONIALS.slice(0, 3).map((t) => (
            <PremiumCard key={t.id} style={styles.socialProof}>
              {t.metric && (
                <View style={styles.metricRow}>
                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>ANTES</Text>
                    <Text style={styles.metricBefore}>{t.metric.before}</Text>
                  </View>
                  <MaterialIcons name="arrow-forward" size={16} color={palette.goldText} />
                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>DESPUÉS</Text>
                    <Text style={styles.metricAfter}>{t.metric.after}</Text>
                  </View>
                  {t.metric.context && (
                    <Text style={styles.metricContext}>{t.metric.context}</Text>
                  )}
                </View>
              )}
              <Text style={styles.socialProofText}>“{t.quote}”</Text>
              <Text style={styles.socialProofAttr}>
                — {t.name}{t.role ? ` · ${t.role}` : ''}
              </Text>
            </PremiumCard>
          ))}
        </View>
      )}

      {/* Guarantee emocional honesta — sin prometer un resultado garantizado. */}
      <Text style={styles.emotionalGuarantee}>
        No prometemos el resultado por ti. Prometemos no dejarte solo en el proceso.
      </Text>

      {/* Cancel anytime — store-compliant (no false refund promise) */}
      <View style={styles.guaranteeRow}>
        <MaterialIcons name="verified-user" size={18} color={palette.success} />
        <Text style={styles.guaranteeText}>
          Cancela cuando quieras desde tu cuenta de App Store / Google Play. Los reembolsos se gestionan según las políticas de la tienda.
        </Text>
      </View>

      {/* Web: la suscripción se gestiona en las tiendas (sin dead-end falso). */}
      {Platform.OS === 'web' && (
        <PremiumCard style={styles.webGateCard}>
          <MaterialIcons name="phone-iphone" size={26} color={palette.goldText} />
          <Text style={styles.webGateTitle}>SE ACTIVA EN LA APP MÓVIL</Text>
          <Text style={styles.webGateText}>
            Tu suscripción Polaris se gestiona desde la app de iOS o Android. Descarga Polaris
            en tu teléfono e inicia sesión con esta misma cuenta para desbloquear el Protocolo
            completo. En la web mantienes tu acceso gratuito.
          </Text>

          {/* Captura de lead — no perder al visitante web. Complementa (no reemplaza)
              la guía de descargar en iOS/Android. */}
          <View style={styles.leadDivider} />
          {leadStatus === 'done' ? (
            <View style={styles.leadDoneRow}>
              <MaterialIcons name="check-circle" size={18} color={palette.success} />
              <Text style={styles.leadDoneText}>Listo. Te avisamos.</Text>
            </View>
          ) : (
            <View style={styles.leadForm}>
              <TextInput
                style={styles.leadInput}
                value={leadEmail}
                onChangeText={(t) => {
                  setLeadEmail(t);
                  if (leadStatus === 'error') setLeadStatus('idle');
                }}
                placeholder="tu@email.com"
                placeholderTextColor={palette.smoke}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={leadStatus !== 'sending'}
                onSubmitEditing={handleLeadSubmit}
                accessibilityLabel="Tu correo electrónico"
              />
              <PressableScale
                style={[
                  styles.leadBtn,
                  (leadStatus === 'sending' || leadEmail.trim().length === 0) && { opacity: 0.5 },
                ]}
                onPress={handleLeadSubmit}
                disabled={leadStatus === 'sending' || leadEmail.trim().length === 0}
                accessibilityRole="button"
                accessibilityState={{ disabled: leadStatus === 'sending' || leadEmail.trim().length === 0 }}
                accessibilityLabel="Avísame cuando pueda suscribirme">
                {leadStatus === 'sending' ? (
                  <ActivityIndicator size="small" color={palette.ink} />
                ) : (
                  <Text style={styles.leadBtnText}>AVÍSAME</Text>
                )}
              </PressableScale>
            </View>
          )}
          {leadStatus === 'error' && (
            <Text style={styles.leadError}>
              Revisa el email e inténtalo de nuevo.
            </Text>
          )}
          {leadStatus !== 'done' && (
            <Text style={styles.leadConsent}>
              Te escribiremos solo sobre tu acceso. Sin spam.
            </Text>
          )}
        </PremiumCard>
      )}

      {/* Maquinaria de compra: solo en nativo (RevenueCat no opera en web). */}
      {Platform.OS !== 'web' && (
        <>
      {/* Estado 1/3: cargando ofertas de RevenueCat */}
      {offeringsState === 'loading' && (
        <View style={styles.offeringsLoading}>
          <SkeletonBar height={64} />
          <SkeletonBar height={52} />
        </View>
      )}

      {/* Estado 2/3: getOfferings() devolvió null o vacío — nunca un botón
          deshabilitado sin explicación */}
      {offeringsState === 'unavailable' && (
        <ErrorState
          message="No pudimos cargar los planes de suscripción. Revisa tu conexión e inténtalo de nuevo."
          onRetry={loadOfferings}
        />
      )}

      {/* Estado 3/3: ofertas cargadas */}
      {offeringsState === 'ready' && (
        <>
      {/* Package selector — only shown when RC offerings loaded */}
      {packages.length > 1 && (
        <View style={styles.packagesRow} accessibilityRole="radiogroup">
          {packages.map((pkg) => {
            const isSelected = selected?.packageType === pkg.packageType;
            return (
              <PressableScale
                key={pkg.packageType}
                haptic
                style={[styles.packageCard, isSelected && styles.packageCardSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${pkg.packageType === 'ANNUAL' ? 'Plan anual' : 'Plan mensual'}, ${pkg.product.priceString}`}
                onPress={() => setSelected(pkg)}>
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
              </PressableScale>
            );
          })}
        </View>
      )}

      {/* Price display when single package */}
      {packages.length <= 1 && selected && (
        <PremiumCard style={styles.priceCard}>
          <Text style={styles.priceLabel}>PRECIO</Text>
          <Text style={styles.priceValue}>{selected.product.priceString}</Text>
        </PremiumCard>
      )}

      <PrimaryButton
        label={purchasing ? 'PROCESANDO...' : `ME COMPROMETO — ${selected?.product.priceString ?? ''}`}
        icon={purchasing ? undefined : 'military-tech'}
        onPress={handlePurchase}
        disabled={isLoading}
      />

      {/* Auto-renew disclosure — required by App Store / Google Play */}
      <Text style={styles.autoRenew}>
        La suscripción se renueva automáticamente al precio indicado salvo que la canceles al menos 24 h antes del fin del período. Gestiónala en los ajustes de tu cuenta de la tienda.
      </Text>
        </>
      )}

      {/* Restore — required by Apple App Store guidelines. Independiente del
          estado de offerings: una compra previa puede restaurarse aunque la
          carga de ofertas actuales haya fallado. */}
      <PressableScale
        style={[styles.restoreBtn, isLoading && { opacity: 0.5 }]}
        onPress={handleRestore}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityState={{ disabled: isLoading }}
        accessibilityLabel="Restaurar compras anteriores">
        {restoring ? (
          <ActivityIndicator size="small" color={palette.smoke} />
        ) : (
          <Text style={styles.restoreText}>Restaurar compras anteriores</Text>
        )}
      </PressableScale>
        </>
      )}

      <SecondaryButton label="VOLVER" icon="close" onPress={() => router.back()} />

      <Text style={styles.legal}>
        Al continuar aceptas los{' '}
        <Text style={styles.legalLink} accessibilityRole="link" onPress={() => router.push('/legal/terminos' as never)}>
          Términos de Uso
        </Text>
        , la{' '}
        <Text style={styles.legalLink} accessibilityRole="link" onPress={() => router.push('/legal/privacidad' as never)}>
          Política de Privacidad
        </Text>{' '}
        y el{' '}
        <Text style={styles.legalLink} accessibilityRole="link" onPress={() => router.push('/legal/salud' as never)}>
          Descargo de Salud
        </Text>{' '}
        de Polaris Growth Institute.
        {Platform.OS === 'ios'
          ? ' El pago se realizará a través de tu cuenta de Apple ID.'
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
    color: palette.goldText,
  },
  title: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 24,
    fontWeight: '700',
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
    flex: 1,
  },

  proofSection: {
    gap: spacing.md,
  },
  proofEyebrow: {
    ...typography.label,
    color: palette.goldText,
  },
  socialProof: {
    gap: spacing.sm,
  },
  socialProofText: {
    ...typography.body,
    color: palette.ash,
    fontStyle: 'italic',
    fontSize: 13,
    lineHeight: 20,
  },
  socialProofAttr: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 10,
    letterSpacing: 1,
  },
  metricRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricCol: {
    gap: 2,
  },
  metricLabel: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 8,
    letterSpacing: 1.5,
  },
  metricBefore: {
    fontFamily: Fonts.display,
    color: palette.ash,
    fontSize: 16,
  },
  metricAfter: {
    fontFamily: Fonts.display,
    color: palette.ivory,
    fontSize: 16,
  },
  metricContext: {
    ...typography.caption,
    color: palette.smoke,
    fontSize: 11,
    flex: 1,
  },
  emotionalGuarantee: {
    ...typography.body,
    color: palette.ivory,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
    paddingHorizontal: spacing.sm,
    textAlign: 'center',
  },

  offeringsLoading: {
    gap: spacing.md,
    marginBottom: spacing.md,
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
    backgroundColor: alpha(palette.gold, '0F'),
  },
  packageType: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 9,
    letterSpacing: 1.5,
  },
  packageTypeSelected: {
    color: palette.goldText,
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
    borderRadius: radii.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  bestValueText: {
    ...typography.label,
    color: palette.ink,
    fontSize: 7,
    letterSpacing: 1,
  },

  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  webGateCard: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingVertical: spacing.lg,
  },
  webGateTitle: {
    fontFamily: Fonts.display,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1.2,
    color: palette.ivory,
  },
  webGateText: {
    ...typography.body,
    fontSize: 13,
    color: palette.ash,
    textAlign: 'center',
    lineHeight: 20,
  },
  leadDivider: {
    alignSelf: 'stretch',
    borderBottomColor: palette.line,
    borderBottomWidth: 1,
    marginVertical: spacing.xs,
  },
  leadForm: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  leadInput: {
    ...typography.body,
    backgroundColor: palette.black,
    borderColor: palette.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: palette.ivory,
    flex: 1,
    fontSize: 14,
    height: 44,
    paddingHorizontal: spacing.md,
  },
  leadBtn: {
    alignItems: 'center',
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  leadBtnText: {
    ...typography.label,
    color: palette.ink,
    fontSize: 11,
    letterSpacing: 1,
  },
  leadConsent: {
    ...typography.caption,
    color: palette.smoke,
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
  leadError: {
    ...typography.caption,
    color: palette.danger,
    fontSize: 11,
    textAlign: 'center',
  },
  leadDoneRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  leadDoneText: {
    ...typography.body,
    color: palette.success,
    fontSize: 14,
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

  guaranteeRow: {
    alignItems: 'center',
    backgroundColor: alpha(palette.success, '14'),
    borderColor: alpha(palette.success, '44'),
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  guaranteeText: {
    ...typography.body,
    color: palette.success,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },

  autoRenew: {
    ...typography.caption,
    color: palette.smoke,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
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
  legalLink: {
    color: palette.goldText,
    textDecorationLine: 'underline',
  },
});
