/**
 * CMI LifeFlow — Pricing / Planes
 *
 * Shows all available plans with features.
 * Free and premium tiers displayed with access code CTA.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, PremiumCard, PressableScale, SecondaryButton, useScreen } from '@/components/polaris';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@/constants/subscriptions';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { ENV } from '@/app/config/env';
import { redeemAccessCode } from '@/lib/admin/actions';
import { purchasesAvailable } from '@/lib/subscription';
import { getOfferings } from '@/services/revenuecat';

// iOS v1 (regla 3.1.1): sin planes con precio ni CTA de compra/asesor comercial.
// La pantalla queda en "tu acceso" = canje del código del Navegador.
const IOS_CODE_ONLY = Platform.OS === 'ios' && !purchasesAvailable(Platform.OS, ENV);

// Contacto de asesor — mismo correo ya usado en app/paywall.tsx para soporte.
const ADVISOR_EMAIL = 'info@polarisgrowthinstitute.com';

// Tiers shown on pricing page
const PRICING_TIERS: SubscriptionTier[] = ['free', 'premium', 'premium_plus'];

/** Orden de profundidad: el orden de declaración de SUBSCRIPTION_TIERS. */
const tierRank = (t: string) => Object.keys(SUBSCRIPTION_TIERS).indexOf(t);

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({
  tier,
  isActive,
  primary,
  price,
  priceIsNote,
  ctaLabel,
  onPressCta,
}: {
  tier: SubscriptionTier;
  isActive: boolean;
  /** La única acción amarilla de la pantalla. Las demás van en contorno gris. */
  primary?: boolean;
  price: string;
  /** El "precio" es una indicación (p. ej. dónde se activa), no un número. */
  priceIsNote?: boolean;
  ctaLabel?: string;
  onPressCta?: () => void;
}) {
  const info = SUBSCRIPTION_TIERS[tier];
  // El amarillo se gana: los planes van en neutro (el tuyo en ivory, los demás
  // en gris). Antes cada plan llevaba su color de tier y el más brillante era
  // un plan que el usuario no necesitaba.
  const tone = isActive ? palette.ivory : palette.ash;

  return (
    <PremiumCard
      style={[
        s.planCard,
        isActive && { backgroundColor: palette.graphiteLight },
      ]}>
      <View style={s.planHeader}>
        <Text style={[s.planName, { color: tone }]}>{info.name.toUpperCase()}</Text>
        {isActive && (
          <View style={s.activePill}>
            <Text style={s.activePillText}>TU PLAN</Text>
          </View>
        )}
      </View>
      <Text style={priceIsNote ? s.planPriceNote : [s.planPrice, { color: tone }]}>{price}</Text>
      <Text style={s.planDesc}>{info.description}</Text>
      <View style={s.featureList}>
        {info.features.map((feat, i) => (
          <View key={i} style={s.featureRow}>
            <MaterialIcons name="check" size={14} color={palette.smoke} />
            <Text style={s.featureText}>{feat}</Text>
          </View>
        ))}
      </View>
      {/* Sin esto la única vía de conversión de la pantalla era un código que el
          usuario ya debía poseer. free no lleva CTA: se activa solo al crear la
          cuenta, no hay acción real que ofrecer ahí. */}
      {!isActive && ctaLabel && onPressCta && (
        <PressableScale
          haptic
          style={[s.planCta, primary ? s.planCtaPrimary : s.planCtaSecondary]}
          onPress={onPressCta}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}>
          {/* ink (constante) sobre el relleno gold; en contorno, ivory del tema. */}
          <Text style={[s.planCtaText, { color: primary ? palette.ink : palette.ivory }]}>
            {ctaLabel}
          </Text>
        </PressableScale>
      )}
    </PremiumCard>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PricingScreen() {
  const sc = useScreen();
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { state, userId, refreshTier } = useLifeFlow();

  const currentTier = state.subscriptionTier ?? 'free';

  const [code,    setCode]    = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<string | null>(null);
  const [resultOk, setResultOk] = useState(false);

  // Precio real de RevenueCat cuando está disponible (nativo). Sin esto premium
  // no mostraba ningún precio — la única vía de conversión era un código que el
  // usuario ya debía poseer. En vez de inventar un número, se pide el mismo dato
  // que usa app/paywall.tsx; si no hay oferta (web u offerings vacíos) se cae al
  // "consulta el precio en la app" y el CTA lleva ahí a verlo/suscribirse.
  const [premiumPrice, setPremiumPrice] = useState<string | null>(null);
  useEffect(() => {
    if (IOS_CODE_ONLY) return;
    getOfferings().then((offerings) => {
      const pkgs = offerings?.current?.availablePackages ?? [];
      const pick = pkgs.find((p) => p.packageType === 'ANNUAL') ?? pkgs[0];
      if (pick) setPremiumPrice(pick.product.priceString);
    });
  }, []);

  const handleRedeem = async () => {
    if (!code.trim() || loading) return;
    setLoading(true);
    setResult(null);

    const res = await redeemAccessCode({ code: code.trim(), userId: userId ?? '' });

    setLoading(false);
    setResultOk(res.status === 'ok');

    const msgs: Record<string, string> = {
      ok:        '✓ Código activado con éxito. Tu plan ha sido actualizado.',
      invalid:   'Código no válido. Revisa que lo hayas escrito correctamente.',
      exhausted: 'Este código ya ha alcanzado el límite de usos.',
      expired:   'Este código está vencido.',
      inactive:  'Este código ha sido desactivado.',
    };
    setResult(msgs[res.status] ?? 'Error desconocido.');

    if (res.status === 'ok') {
      // Refresh local state from DB so the new tier shows immediately on return
      await refreshTier();
      setTimeout(() => router.back(), 2500);
    }
  };

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={[sc.content, { paddingTop: insets.top + spacing.lg }]}
      showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Volver">
          <MaterialIcons name="arrow-back" size={22} color={palette.ivory} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{IOS_CODE_ONLY ? 'TU ACCESO' : 'PLANES Y ACCESO'}</Text>
        </View>
      </View>

      {IOS_CODE_ONLY ? (
        <PremiumCard style={s.heroCard}>
          <Text style={s.heroEyebrow}>ACCESO</Text>
          <Text style={s.heroTitle}>Tu acceso llega{'\n'}con tu código.</Text>
          <Text style={s.heroBody}>
            El Protocolo completo se abre con el código que te entrega tu Navegador al
            inscribirte. Ingrésalo abajo y se activa al momento.
          </Text>
        </PremiumCard>
      ) : (
        <>
      {/* Hero */}
      <PremiumCard style={s.heroCard}>
        {currentTier !== 'free' ? (
          <>
            <Text style={s.heroTitle}>Tu plan:{'\n'}{SUBSCRIPTION_TIERS[currentTier as SubscriptionTier]?.name ?? currentTier}.</Text>
            <Text style={s.heroBody}>
              Está activo. Si quieres más acompañamiento, escribe a tu asesor.
            </Text>
            <Pressable
              onPress={() => Linking.openURL(`mailto:${ADVISOR_EMAIL}?subject=${encodeURIComponent('Sobre mi plan Polaris')}`)}
              accessibilityRole="link"
              style={s.advisorLink}>
              <Text style={s.advisorLinkText}>Escribir a mi asesor →</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={s.heroTitle}>Elige la profundidad{'\n'}que te sirve hoy.</Text>
            <Text style={s.heroBody}>
              {Platform.OS === 'web'
                ? 'La suscripción se activa desde la app de iOS o Android. Si tienes un código de acceso, canjéalo aquí abajo.'
                : 'Cada plan abre una capa del Método Polaris. El acceso se activa al momento y puedes cambiar de plan cuando lo necesites.'}
            </Text>
          </>
        )}
      </PremiumCard>

      {/* Plans */}
      <GoldDivider label="PLANES DISPONIBLES" />
      <View style={s.planList}>
        {/* Quien ya paga ve su plan primero; el resto, de menor a mayor.
            Nunca se le recomienda uno inferior. */}
        {(() => { let primaryTaken = false; return [...PRICING_TIERS]
          .sort((a, b) => Number(b === currentTier) - Number(a === currentTier))
          .map((tier) => {
          const isLower = tierRank(tier) < tierRank(currentTier);
          // free no tiene precio de tienda — es un hecho fijo.
          // premium: el precio real solo existe en la tienda (RevenueCat, nativo).
          //   En web no se puede comprar: se dice cómo, sin botón amarillo.
          // premium_plus es a medida — se coordina con un asesor.
          const pricing =
            tier === 'premium'
              ? Platform.OS === 'web'
                ? { price: 'Se activa desde la app de iOS o Android', priceIsNote: true }
                : {
                    price: premiumPrice
                      ? `Desde ${premiumPrice}`
                      : `El precio de tu país aparece en ${Platform.OS === 'ios' ? 'la App Store' : 'Google Play'} al suscribirte`,
                    ctaLabel: 'SUSCRIBIRME',
                    onPressCta: () => router.push('/paywall' as never),
                  }
              : tier === 'premium_plus'
              ? {
                  price: 'A medida, con un asesor',
                  ctaLabel: 'HABLAR CON UN ASESOR',
                  onPressCta: () =>
                    Linking.openURL(`mailto:${ADVISOR_EMAIL}?subject=${encodeURIComponent('Quiero saber más de Premium Plus')}`),
                }
              : { price: 'Gratis' };
          const props = isLower ? { price: pricing.price, priceIsNote: pricing.priceIsNote } : pricing;
          const hasCta = currentTier !== tier && 'ctaLabel' in props && !!props.ctaLabel;
          const primary = hasCta && !primaryTaken;
          if (primary) primaryTaken = true;
          return (
            <PlanCard
              key={tier}
              tier={tier}
              isActive={currentTier === tier}
              primary={primary}
              {...props}
            />
          );
        }); })()}
      </View>
        </>
      )}

      {/* Access code */}
      <GoldDivider label="TENGO UN CÓDIGO DE ACCESO" />
      <PremiumCard style={s.codeCard}>
        <Text style={s.codeTitle}>Canjear código</Text>
        <Text style={s.codeBody}>
          Si recibiste un código de acceso de Polaris Growth Institute,
          ingrésalo aquí para activar tu plan.
        </Text>
        <View style={s.codeInputRow}>
          <TextInput
            style={s.codeInput}
            placeholder="XXXX-XXXX"
            placeholderTextColor={palette.smoke}
            value={code}
            onChangeText={t => { setCode(t.toUpperCase()); setResult(null); }}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleRedeem}
            maxLength={20}
            accessibilityLabel="Código de acceso"
          />
          <PressableScale
            style={[s.codeBtn, (loading || !code.trim()) && { opacity: 0.4 }]}
            onPress={handleRedeem}
            disabled={loading || !code.trim()}
            accessibilityRole="button"
            accessibilityState={{ disabled: loading || !code.trim() }}
            accessibilityLabel="Canjear código">
            <Text style={s.codeBtnText}>{loading ? '...' : 'CANJEAR'}</Text>
          </PressableScale>
        </View>
        {result ? (
          <View
            style={[s.resultBanner, { backgroundColor: resultOk ? palette.successMuted : palette.dangerMuted }]}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive">
            <Text style={[s.resultText, { color: resultOk ? palette.success : palette.danger }]}>
              {result}
            </Text>
          </View>
        ) : null}
      </PremiumCard>

      {/* Contact */}
      <View style={s.contact}>
        <Text style={s.contactText}>
          ¿Necesitas ayuda con tu acceso? Contacta a tu asesor de Polaris Growth Institute.
        </Text>
      </View>

      <SecondaryButton label="VOLVER" onPress={() => router.back()} />
      {/* Holgura sobre el FAB del tour (48 + 16 de margen): sin ella tapaba VOLVER. */}
      <View style={{ height: insets.bottom + spacing.xxxl + spacing.xl }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  backBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
    padding: spacing.sm,
    backgroundColor: palette.graphite,
    borderColor: palette.lineSoft,
    borderWidth: 1,
    borderRadius: radii.sm,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: '700',
    color: palette.ivory,
    letterSpacing: 2,
  },

  heroCard: { gap: spacing.md },
  heroEyebrow: { ...typography.label, color: palette.ash },
  heroTitle: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: palette.ivory,
    letterSpacing: 1.5,
    lineHeight: 34,
  },
  heroBody: {
    ...typography.body,
    color: palette.ash,
    lineHeight: 22,
  },
  advisorLink: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  advisorLinkText: { ...typography.body, color: palette.ivory },

  planList: { gap: spacing.md },
  planCard: { gap: spacing.md, overflow: 'visible' },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  planName: {
    fontFamily: Fonts.display,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    flex: 1,
  },
  activePill: {
    backgroundColor: palette.successMuted,
    borderColor: palette.success,
    borderWidth: 1,
    borderRadius: radii.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  activePillText: {
    fontFamily: Fonts.sansBold,
    fontSize: 11,
    color: palette.success,
    fontWeight: '700',
  },
  planPrice: {
    fontFamily: Fonts.display,
    fontSize: 22,
    fontWeight: '700',
  },
  planPriceNote: { ...typography.body, fontSize: 13, color: palette.smoke },
  planDesc: { ...typography.body, color: palette.ash },
  featureList: { gap: spacing.sm },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    ...typography.body,
    color: palette.ivory,
    fontSize: 13,
    flex: 1,
  },
  planCta: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    height: 44,
    marginTop: spacing.xs,
  },
  planCtaPrimary: { backgroundColor: palette.gold },
  planCtaSecondary: { borderWidth: 1, borderColor: palette.line },
  planCtaText: {
    ...typography.label,
    fontSize: 11,
  },

  codeCard: { gap: spacing.md },
  codeTitle: { ...typography.section, color: palette.ivory },
  codeBody: { ...typography.body, color: palette.ash, lineHeight: 20 },
  codeInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  codeInput: {
    flex: 1,
    // Sin esto el input NO encoge: el minimo implicito de un item flex es su
    // contenido, asi que la fila pedia 334px en un ancho de 316 y el boton
    // CANJEAR se salia de la tarjeta.
    minWidth: 0,
    backgroundColor: palette.graphite,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radii.sm,
    color: palette.ivory,
    fontFamily: Fonts.mono,
    fontSize: 16,
    letterSpacing: 3,
    paddingHorizontal: spacing.lg,
    height: 52,
  },
  codeBtn: {
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
  },
  codeBtnText: {
    fontFamily: Fonts.display,
    fontSize: 11,
    fontWeight: '700',
    color: palette.ink,
    letterSpacing: 2,
  },
  resultBanner: {
    borderRadius: radii.sm,
    padding: spacing.md,
  },
  resultText: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 18,
  },

  contact: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  contactText: {
    ...typography.body,
    color: palette.smoke,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 12,
  },
});
