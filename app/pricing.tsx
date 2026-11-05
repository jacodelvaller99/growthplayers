/**
 * Tu plan / acceso — gramática `Pantalla`: el plan que tienes primero, una fila
 * para escribir al asesor, los otros planes plegados y el canje de código.
 * Una sola acción amarilla como máximo.
 */

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Fila, Pantalla } from '@/components/pantalla';
import { PressableScale } from '@/components/polaris';
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

// ─── Plan (fila plegable) ─────────────────────────────────────────────────────

/** Un plan que no es el tuyo: nombre → precio; al tocarlo, lo que incluye. */
function PlanRow({
  tier,
  primary,
  price,
  ctaLabel,
  onPressCta,
}: {
  tier: SubscriptionTier;
  /** La única acción amarilla de la pantalla. Las demás van en contorno gris. */
  primary?: boolean;
  price: string;
  ctaLabel?: string;
  onPressCta?: () => void;
}) {
  const info = SUBSCRIPTION_TIERS[tier];
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Fila label={info.name.toUpperCase()} value={open ? 'Cerrar' : price} onPress={() => setOpen((o) => !o)} />
      {open && (
        <View style={s.planBody}>
          <Text style={s.planDesc}>{info.description}.</Text>
          {info.features.map((feat) => (
            <Text key={feat} style={s.featureText}>{feat}</Text>
          ))}
          <Text style={s.planPriceNote}>{price}</Text>
          {/* free no lleva CTA: se activa solo al crear la cuenta. */}
          {ctaLabel && onPressCta && (
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
        </View>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PricingScreen() {
  const router   = useRouter();
  const { state, userId, refreshTier } = useLifeFlow();

  const currentTier = (state.subscriptionTier ?? 'free') as SubscriptionTier;
  const currentInfo = SUBSCRIPTION_TIERS[currentTier] ?? SUBSCRIPTION_TIERS.free;

  const [code,    setCode]    = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<string | null>(null);
  const [resultOk, setResultOk] = useState(false);
  // Quien ya paga no necesita ver los planes de abajo desplegados.
  const [showOthers, setShowOthers] = useState(currentTier === 'free');

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

  // Los demás planes, de menor a mayor. Nunca se le recomienda uno inferior.
  let primaryTaken = false;
  const others = IOS_CODE_ONLY ? [] : PRICING_TIERS.filter((t) => t !== currentTier).map((tier) => {
    const isLower = tierRank(tier) < tierRank(currentTier);
    // free no tiene precio de tienda — es un hecho fijo.
    // premium: el precio real solo existe en la tienda (RevenueCat, nativo).
    //   En web no se puede comprar: se dice cómo, sin botón amarillo.
    // premium_plus es a medida — se coordina con un asesor.
    const pricing: { price: string; ctaLabel?: string; onPressCta?: () => void } =
      tier === 'premium'
        ? Platform.OS === 'web'
          ? { price: 'Se activa desde la app de iOS o Android' }
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
    const props = isLower ? { price: pricing.price } : pricing;
    const primary = !!props.ctaLabel && !primaryTaken;
    if (primary) primaryTaken = true;
    return <PlanRow key={tier} tier={tier} primary={primary} {...props} />;
  });
  // El canje solo va en amarillo si no hay otra acción amarilla en pantalla.
  const codePrimary = !primaryTaken;

  const title = IOS_CODE_ONLY
    ? 'Tu acceso llega con tu código.'
    : currentTier === 'free'
    ? 'Tienes el plan Gratis.'
    : `Tienes ${currentInfo.name}.`;
  const sub = IOS_CODE_ONLY
    ? 'El Protocolo completo se abre con el código que te entrega tu Navegador al inscribirte. Ingrésalo abajo y se activa al momento.'
    : currentTier === 'free'
    ? Platform.OS === 'web'
      ? 'La suscripción se activa desde la app de iOS o Android. Si tienes un código de acceso, canjéalo aquí abajo.'
      : 'Cada plan abre una capa del Método Polaris. Se activa al momento y puedes cambiar cuando lo necesites.'
    : 'Está activo. Si quieres más acompañamiento, escribe a tu asesor.';

  return (
    <Pantalla meta={IOS_CODE_ONLY ? 'TU ACCESO' : 'TU PLAN'} title={title} sub={sub}>
      <View style={s.col}>
        {!IOS_CODE_ONLY && (
          <>
            <View style={s.current}>
              {currentInfo.features.map((feat) => (
                <Text key={feat} style={s.currentFeature}>{feat}</Text>
              ))}
            </View>
            <Fila
              label="ESCRIBIR A MI ASESOR"
              value="Correo"
              onPress={() => Linking.openURL(`mailto:${ADVISOR_EMAIL}?subject=${encodeURIComponent('Sobre mi plan Polaris')}`)}
            />
            {others.length > 0 && (
              <Fila
                label="OTROS PLANES"
                value={showOthers ? 'Ocultar' : `Ver ${others.length}`}
                onPress={() => setShowOthers((v) => !v)}
                last={!showOthers}
              />
            )}
            {showOthers && <View style={s.others}>{others}</View>}
          </>
        )}

        {/* Access code */}
        <View style={s.codeBlock}>
          <Text style={s.codeLabel}>¿TIENES UN CÓDIGO DE ACCESO?</Text>
          <Text style={s.codeBody}>
            Si recibiste un código de Polaris Growth Institute, ingrésalo aquí para activar tu plan.
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
              style={[s.codeBtn, codePrimary ? s.planCtaPrimary : s.planCtaSecondary, (loading || !code.trim()) && { opacity: 0.4 }]}
              onPress={handleRedeem}
              disabled={loading || !code.trim()}
              accessibilityRole="button"
              accessibilityState={{ disabled: loading || !code.trim() }}
              accessibilityLabel="Canjear código">
              <Text style={[s.codeBtnText, { color: codePrimary ? palette.ink : palette.ivory }]}>{loading ? '...' : 'CANJEAR'}</Text>
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
        </View>

        {IOS_CODE_ONLY && (
          <Text style={s.contactText}>
            ¿Necesitas ayuda con tu acceso? Contacta a tu asesor de Polaris Growth Institute.
          </Text>
        )}
      </View>
    </Pantalla>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  col: { maxWidth: 640, width: '100%' },

  current: { gap: spacing.sm, marginBottom: spacing.xl },
  currentFeature: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 22, color: palette.ivory },

  others: { borderBottomWidth: 1, borderBottomColor: palette.line },
  planBody: { gap: spacing.sm, paddingBottom: spacing.lg },
  planDesc: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, color: palette.ash },
  featureText: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, color: palette.ivory },
  planPriceNote: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, color: palette.smoke },
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

  codeBlock: { gap: spacing.md, marginTop: spacing.xxl },
  codeLabel: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.smoke },
  codeBody: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, color: palette.ash },
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

  contactText: {
    marginTop: spacing.xl,
    fontFamily: Fonts.sans,
    color: palette.smoke,
    lineHeight: 20,
    fontSize: 14,
  },
});
