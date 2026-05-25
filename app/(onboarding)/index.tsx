import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { redeemAccessCode } from '@/lib/admin/actions';
import { PRODUCT_LABELS } from '@/lib/admin/types';
import {
  GoldDivider,
  PolarisMark,
  PremiumCard,
  PremiumInput,
  PrimaryButton,
  SecondaryButton,
  StatusPill,
  screen,
  useScreen,
} from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import type { NorthStar } from '@/types/lifeflow';

const TOTAL_STEPS = 5;

export default function OnboardingScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { completeOnboarding, state, userId } = useLifeFlow();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(state.profile.name);
  const [role, setRole] = useState(state.profile.role);
  const [painPoint, setPainPoint] = useState('');
  const [north, setNorth] = useState<NorthStar>(state.northStar);
  const [accessCode, setAccessCode] = useState('');
  const [codeStatus, setCodeStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [codeMessage, setCodeMessage] = useState('');

  const goToStep3 = () => {
    // Pre-populate purpose with pain point if user hasn't set it yet
    if (painPoint.trim() && !north.purpose.trim()) {
      setNorth((n) => ({ ...n, purpose: painPoint.trim() }));
    }
    setStep(3);
  };

  const handleApplyCode = async () => {
    if (!accessCode.trim()) return;
    if (!userId) {
      setCodeStatus('error');
      setCodeMessage('Sesión no encontrada. Vuelve a iniciar sesión.');
      return;
    }
    setCodeStatus('checking');
    const result = await redeemAccessCode({ code: accessCode.trim(), userId });
    if (result.status === 'ok') {
      setCodeStatus('ok');
      const prodLabel = result.product ? (PRODUCT_LABELS[result.product] ?? result.product) : 'acceso';
      setCodeMessage(`✅ ${prodLabel} activado`);
    } else {
      setCodeStatus('error');
      const errorMap: Record<string, string> = {
        invalid:   'Código no válido',
        exhausted: 'Código ya fue usado',
        expired:   'Código expirado',
        inactive:  'Código inactivo',
      };
      setCodeMessage(errorMap[result.status] ?? 'Código no válido o expirado');
    }
  };

  const finish = async () => {
    await completeOnboarding({
      profile: { name: name.trim() || 'Juan Carlos', role: role.trim() || 'Empresario' },
      activeProgramId: 'protocolo-soberano',
      northStar: north,
    });
    router.replace('/(tabs)/comando');
  };

  return (
    <KeyboardAvoidingView
      style={sc.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}>
    <ScrollView
      contentContainerStyle={[sc.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
      bounces
      overScrollMode="never"
      keyboardShouldPersistTaps="handled">
      {/* ── Step Progress ── */}
      <View style={styles.stepRow}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.stepSeg, i <= step && styles.stepSegActive]} />
        ))}
        <Text style={styles.stepCounter}>{step + 1}/{TOTAL_STEPS}</Text>
      </View>

      {/* ─────────────────────────────────────────── STEP 0 — BIENVENIDA ── */}
      {step === 0 && (
        <View style={styles.welcomeWrap}>
          {/* Brand mark + eyebrow */}
          <View style={styles.markWrap}>
            <PolarisMark size={72} />
          </View>
          <Text style={styles.eyebrow}>POLARIS GROWTH INSTITUTE</Text>

          {/* Gold accent bar */}
          <View style={styles.goldAccent} />

          <Text style={styles.welcomeTitle}>TU SALA{'\n'}DE MANDO{'\n'}PERSONAL.</Text>
          <Text style={styles.welcomeBody}>
            Esta app no es para todos. Es para quien ya sabe que la distancia entre donde está y
            donde quiere estar no es de estrategia — es de sistema interno.
          </Text>

          {/* Feature list — larger, clearer */}
          <View style={styles.featureList}>
            {[
              { icon: 'monitor-heart' as const, label: 'Biometría diaria calibrada' },
              { icon: 'psychology' as const, label: 'Mentor IA contextualizado' },
              { icon: 'military-tech' as const, label: 'Protocolo Soberano 90D' },
              { icon: 'insights' as const, label: 'Score Soberano en tiempo real' },
            ].map(({ icon, label }) => (
              <View key={label} style={styles.featureRow}>
                <MaterialIcons name={icon} size={16} color={palette.gold} />
                <Text style={styles.featureText}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.dividerLine} />
          <Text style={styles.legalNote}>
            Al continuar, aceptas que tus datos biométricos y de bienestar son usados exclusivamente
            para personalizar tu experiencia. No son consejo médico. Puedes exportar o eliminar
            tu cuenta en Perfil → Privacidad y Datos (RGPD/GDPR).
          </Text>
          <PrimaryButton label="COMENZAR ACTIVACIÓN" icon="arrow-forward" onPress={() => setStep(1)} />
        </View>
      )}

      {/* ─────────────────────────────────────────── STEP 1 — IDENTIDAD ── */}
      {step === 1 && (
        <PremiumCard style={styles.formCard}>
          <StatusPill label="PASO 1 · IDENTIDAD" />
          <Text style={styles.stepTitle}>OPERADOR{'\n'}SOBERANO.</Text>
          <Text style={styles.stepBody}>
            Define como opera el sistema. Tu nombre y rol aparecen en el perfil y contextualizan al mentor.
          </Text>
          <GoldDivider />
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>NOMBRE DEL OPERADOR</Text>
            <PremiumInput
              value={name}
              onChangeText={setName}
              placeholder="Tu nombre completo..."
              accessibilityLabel="Nombre del operador"
              returnKeyType="next"
              autoCapitalize="words"
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>ROL / IDENTIDAD</Text>
            <PremiumInput
              value={role}
              onChangeText={setRole}
              placeholder="Empresario, CEO, Fundador..."
              accessibilityLabel="Rol o identidad"
              returnKeyType="done"
              autoCapitalize="words"
            />
          </View>
          <View style={styles.actions}>
            <SecondaryButton label="ATRAS" onPress={() => setStep(0)} />
            <PrimaryButton label="CONTINUAR" icon="arrow-forward" onPress={() => setStep(2)} />
          </View>
        </PremiumCard>
      )}

      {/* ──────────────────────────────────────────── STEP 2 — OBSTÁCULO ── */}
      {step === 2 && (
        <PremiumCard style={styles.formCard}>
          <StatusPill label="PASO 2 · TU SITUACIÓN" />
          <Text style={styles.stepTitle}>DEFINE EL{'\n'}OBSTÁCULO.</Text>
          <Text style={styles.stepBody}>
            Una sola respuesta. Se especifico — la vaguedad protege el ego pero bloquea el cambio.
          </Text>
          <GoldDivider />
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>¿QUÉ CAMBIA TODO EN 90 DÍAS?</Text>
            <PremiumInput
              value={painPoint}
              onChangeText={setPainPoint}
              placeholder={"Ej: Mi empresa genera $50K/mes pero yo trabajo 80 horas. No delego porque siento que nadie lo hace como yo..."}
              multiline
              style={styles.textArea}
              accessibilityLabel="Tu mayor obstaculo"
            />
          </View>
          <Text style={styles.hintText}>
            Esta respuesta guia a Norman desde el primer mensaje. Sé más especifico de lo que crees necesario.
          </Text>
          <View style={styles.actions}>
            <SecondaryButton label="ATRAS" onPress={() => setStep(1)} />
            <PrimaryButton label="CONTINUAR" icon="arrow-forward" onPress={goToStep3} />
          </View>
          <Pressable onPress={goToStep3} style={{ alignItems: 'center', marginTop: -spacing.sm }}>
            <Text style={styles.skipText}>Completar después →</Text>
          </Pressable>
        </PremiumCard>
      )}

      {/* ──────────────────────────────── STEP 3 — CÓDIGO DE ACCESO ── */}
      {step === 3 && (
        <PremiumCard style={styles.formCard}>
          <StatusPill label="PASO 3 · MEMBRESÍA" />
          <Text style={styles.stepTitle}>ACTIVA TU{'\n'}MEMBRESÍA.</Text>
          <Text style={styles.stepBody}>
            Tu coach te entregó un código al inscribirte. Ingrésalo aquí para desbloquear el acceso
            completo al Protocolo Soberano. Si aún no lo tienes, continúa y actívalo después.
          </Text>
          <GoldDivider />
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>CÓDIGO DE ACCESO</Text>
            <View style={styles.codeRow}>
              <PremiumInput
                value={accessCode}
                onChangeText={v => { setAccessCode(v); setCodeStatus('idle'); setCodeMessage(''); }}
                placeholder="Ej: POLARIS-2026-A1"
                autoCapitalize="characters"
                accessibilityLabel="Código de acceso"
                returnKeyType="done"
                style={{ flex: 1 }}
              />
              <Pressable
                style={[styles.applyBtn, (!accessCode.trim() || codeStatus === 'checking') && { opacity: 0.5 }]}
                onPress={handleApplyCode}
                disabled={!accessCode.trim() || codeStatus === 'checking'}>
                {codeStatus === 'checking' ? (
                  <ActivityIndicator color={palette.black} size="small" />
                ) : (
                  <Text style={styles.applyBtnText}>APLICAR</Text>
                )}
              </Pressable>
            </View>
            {codeMessage ? (
              <Text style={[styles.codeMsg, { color: codeStatus === 'ok' ? palette.success : palette.danger }]}>
                {codeMessage}
              </Text>
            ) : null}
          </View>
          <View style={styles.actions}>
            <SecondaryButton label="ATRAS" onPress={() => setStep(2)} />
            <PrimaryButton label="CONTINUAR" icon="arrow-forward" onPress={() => setStep(4)} />
          </View>
          <Pressable onPress={() => setStep(4)} style={{ alignItems: 'center', marginTop: -spacing.sm }}>
            <Text style={styles.skipText}>Continuar sin código →</Text>
          </Pressable>
        </PremiumCard>
      )}

      {/* ──────────────────────────────────────────── STEP 4 — MI NORTE ── */}
      {step === 4 && (
        <PremiumCard style={styles.formCard}>
          <StatusPill label="PASO 4 · MI NORTE" tone="gold" dot />
          <Text style={styles.stepTitle}>ANCLA TU{'\n'}NORTE.</Text>
          <Text style={styles.stepBody}>
            Estas declaraciones guian cada decision del protocolo. El mentor las usa en cada sesion. Puedes editarlas después.
          </Text>
          <GoldDivider />
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PROPÓSITO PRINCIPAL</Text>
            <PremiumInput
              value={north.purpose}
              onChangeText={(purpose) => setNorth({ ...north, purpose })}
              placeholder="¿Por que operas a este nivel?"
              multiline
              style={styles.textArea}
              accessibilityLabel="Proposito principal"
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>DECLARACIÓN DE IDENTIDAD</Text>
            <PremiumInput
              value={north.identity}
              onChangeText={(identity) => setNorth({ ...north, identity })}
              placeholder="Soy alguien que..."
              multiline
              style={styles.textArea}
              accessibilityLabel="Declaracion de identidad"
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>RECORDATORIO DIARIO</Text>
            <PremiumInput
              value={north.dailyReminder}
              onChangeText={(dailyReminder) => setNorth({ ...north, dailyReminder })}
              placeholder="La frase que te ancla cada mañana..."
              multiline
              style={styles.textArea}
              accessibilityLabel="Recordatorio diario"
            />
          </View>
          <View style={styles.actions}>
            <SecondaryButton label="ATRAS" onPress={() => setStep(3)} />
            <PrimaryButton label="INICIAR EL PROTOCOLO" icon="military-tech" onPress={finish} />
          </View>
        </PremiumCard>
      )}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // ── Step indicator
  stepRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stepSeg: {
    backgroundColor: palette.charcoal,
    flex: 1,
    height: 2,
  },
  stepSegActive: {
    backgroundColor: palette.gold,
  },
  stepCounter: {
    ...typography.mono,
    color: palette.ash,
  },

  // ── Welcome
  welcomeWrap: {
    gap: spacing.xl,
  },
  markWrap: {
    alignItems: 'flex-start',
  },
  eyebrow: {
    ...typography.label,
    color: palette.gold,
    letterSpacing: 2,
  },
  goldAccent: {
    width: 40,
    height: 2,
    backgroundColor: palette.gold,
    borderRadius: 1,
  },
  welcomeTitle: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 52,
    textTransform: 'uppercase',
  },
  welcomeBody: {
    ...typography.body,
    color: palette.ash,
    lineHeight: 24,
  },
  featureList: {
    gap: spacing.sm,
  },
  featureRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  featureText: {
    ...typography.body,
    color: palette.ash,
    fontSize: 14,
  },
  dividerLine: {
    backgroundColor: palette.line,
    height: 1,
  },
  legalNote: {
    ...typography.caption,
    color: palette.smoke,
    fontSize: 10,
    lineHeight: 15,
    opacity: 0.7,
  },

  // ── Step cards
  formCard: {
    gap: spacing.lg,
  },
  stack: {
    gap: spacing.lg,
  },
  stepTitle: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.3,
    lineHeight: 40,
    textTransform: 'uppercase',
  },
  stepBody: {
    ...typography.body,
    color: palette.ash,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.label,
    color: palette.ash,
  },
  codeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  applyBtn: {
    backgroundColor: palette.gold,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    ...typography.section,
    color: palette.black,
    fontSize: 10,
  },
  codeMsg: {
    ...typography.caption,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  skipText: {
    ...typography.caption,
    color: palette.smoke,
    fontSize: 12,
  },
  hintText: {
    ...typography.caption,
    color: palette.smoke,
    fontSize: 11,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  textArea: {
    minHeight: 88,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
