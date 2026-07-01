/**
 * CMI LifeFlow — Pricing / Planes
 *
 * Shows all available plans with features.
 * Free and premium tiers displayed with access code CTA.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, PremiumCard, SecondaryButton, useScreen } from '@/components/polaris';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@/constants/subscriptions';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { redeemAccessCode } from '@/lib/admin/actions';

// Tiers shown on pricing page
const PRICING_TIERS: SubscriptionTier[] = ['free', 'premium', 'premium_plus'];

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({
  tier,
  isActive,
  highlight,
}: {
  tier: SubscriptionTier;
  isActive: boolean;
  highlight?: boolean;
}) {
  const info = SUBSCRIPTION_TIERS[tier];
  const accentColor = info.color;                                   // fills (dot/badge/borde)
  // El tier premium usa #FFC804 (gold brillante). Como TEXTO/ícono sobre la tarjeta
  // (fondo graphite theme-aware) es ilegible en tema claro → goldText (theme-aware).
  const accentText  = accentColor === palette.gold ? palette.goldText : accentColor;

  return (
    <PremiumCard
      style={[
        s.planCard,
        highlight && { borderColor: accentColor, borderWidth: 1.5 },
        isActive && { backgroundColor: palette.graphiteLight },
      ]}>
      {highlight && (
        <View style={[s.planBadge, { backgroundColor: accentColor }]}>
          <Text style={s.planBadgeText}>MÁS POPULAR</Text>
        </View>
      )}
      <View style={s.planHeader}>
        <View style={[s.planDot, { backgroundColor: accentColor }]} />
        <Text style={[s.planName, { color: accentText }]}>{info.name.toUpperCase()}</Text>
        {isActive && (
          <View style={s.activePill}>
            <Text style={s.activePillText}>ACTIVO</Text>
          </View>
        )}
      </View>
      <Text style={s.planDesc}>{info.description}</Text>
      <View style={s.featureList}>
        {info.features.map((feat, i) => (
          <View key={i} style={s.featureRow}>
            <MaterialIcons name="check-circle" size={14} color={accentText} />
            <Text style={s.featureText}>{feat}</Text>
          </View>
        ))}
      </View>
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
          <Text style={s.eyebrow}>POLARIS GROWTH INSTITUTE</Text>
          <Text style={s.title}>PLANES Y ACCESO</Text>
        </View>
      </View>

      {/* Hero */}
      <PremiumCard style={s.heroCard}>
        <Text style={s.heroEyebrow}>SCORE SOBERANO</Text>
        <Text style={s.heroTitle}>Elige tu nivel{'\n'}de transformación.</Text>
        <Text style={s.heroBody}>
          Cada plan desbloquea un nivel de profundidad en el Método Polaris.
          Los accesos se activan de forma inmediata.
        </Text>
      </PremiumCard>

      {/* Plans */}
      <GoldDivider label="PLANES DISPONIBLES" />
      <View style={s.planList}>
        {PRICING_TIERS.map((tier) => (
          <PlanCard
            key={tier}
            tier={tier}
            isActive={currentTier === tier}
            highlight={tier === 'premium'}
          />
        ))}
      </View>

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
          <Pressable
            style={[s.codeBtn, (loading || !code.trim()) && { opacity: 0.4 }]}
            onPress={handleRedeem}
            disabled={loading || !code.trim()}
            accessibilityRole="button"
            accessibilityState={{ disabled: loading || !code.trim() }}
            accessibilityLabel="Canjear código">
            <Text style={s.codeBtnText}>{loading ? '...' : 'CANJEAR'}</Text>
          </Pressable>
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
      <View style={{ height: insets.bottom + spacing.xxxl }} />
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
    padding: spacing.sm,
    backgroundColor: palette.graphite,
    borderColor: palette.lineSoft,
    borderWidth: 1,
    borderRadius: radii.sm,
  },
  eyebrow: { ...typography.label, color: palette.goldText },
  title: {
    fontFamily: Fonts.display,
    fontSize: 20,
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

  planList: { gap: spacing.md },
  planCard: { gap: spacing.md, overflow: 'visible' },
  planBadge: {
    position: 'absolute',
    top: -10,
    right: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radii.xs,
  },
  planBadgeText: {
    fontFamily: Fonts.sansBold,
    fontSize: 9,
    color: palette.ink,
    fontWeight: '700',
    letterSpacing: 1,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  planDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  planName: {
    fontFamily: Fonts.display,
    fontSize: 14,
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
    fontSize: 8,
    color: palette.success,
    fontWeight: '700',
  },
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

  codeCard: { gap: spacing.md },
  codeTitle: { ...typography.section, color: palette.ivory },
  codeBody: { ...typography.body, color: palette.ash, lineHeight: 20 },
  codeInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  codeInput: {
    flex: 1,
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
