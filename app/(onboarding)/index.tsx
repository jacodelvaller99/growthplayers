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
import { analytics } from '@/lib/analytics';
import { intel } from '@/lib/supabase';
import type { NorthStar } from '@/types/lifeflow';

const TOTAL_STEPS = 6;

// Intro de valor (≈20s, skippable) — entre el consent gate y la identidad.
// COPY AFINABLE POR EL DUEÑO: 3 viñetas sobrias, voz Polaris, sin claims/métricas.
const VALUE_BULLETS: { icon: 'military-tech' | 'psychology' | 'insights'; title: string; body: string }[] = [
  {
    icon: 'military-tech',
    title: 'Un protocolo. 4 cuerpos. 90 días.',
    body: 'Físico, mental, emocional y energético en un solo sistema.',
  },
  {
    icon: 'psychology',
    title: 'Norman te acompaña con tus datos, no con frases.',
    body: 'Tu mentor lee tu biometría y tu historia antes de hablar.',
  },
  {
    icon: 'insights',
    title: 'Persigues el estado; el resultado es consecuencia.',
    body: 'El sistema interno se entrena; el rendimiento llega solo.',
  },
];

// Consent gate — Términos, Privacidad y Descargo de Salud (compliance de lanzamiento)
type ConsentKey = 'terms' | 'privacy' | 'health' | 'confrontation';

const CONSENT_ITEMS: { key: ConsentKey; label: string; route: '/legal/terminos' | '/legal/privacidad' | '/legal/salud' }[] = [
  { key: 'terms',         label: 'Términos y Condiciones',                                   route: '/legal/terminos' },
  { key: 'privacy',       label: 'Política de Privacidad (RGPD)',                            route: '/legal/privacidad' },
  { key: 'health',        label: 'Descargo de Salud y Bienestar',                            route: '/legal/salud' },
  { key: 'confrontation', label: 'Norman puede confrontarme con datos registrados del sistema cuando mis acciones no coincidan con lo que declaré', route: '/legal/privacidad' },
];

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
  // Guard anti-doble-tap del cierre (completeOnboarding es async → evita doble submit).
  const [finishing, setFinishing] = useState(false);

  // ── Consent gate (Step 0) ──────────────────────────────────────────────────
  const [consents, setConsents] = useState<Record<ConsentKey, boolean>>({
    terms: false,
    privacy: false,
    health: false,
    confrontation: false,
  });
  const allConsented = consents.terms && consents.privacy && consents.health && consents.confrontation;
  // ml_consent es OPT-IN explícito y OPCIONAL (RGPD): default false, no bloquea el gate.
  const [mlConsent, setMlConsent] = useState(false);

  const toggleConsent = (key: ConsentKey) => {
    setConsents((c) => ({ ...c, [key]: !c[key] }));
  };

  const acceptConsentAndContinue = async () => {
    if (!allConsented) return;
    const now = new Date().toISOString();
    // Tracking de comportamiento: SOLO si el usuario activó el opt-in (RGPD opt-in explícito).
    analytics.setConsent(mlConsent);
    // Persiste el consentimiento en profiles (campos nuevos sin tipar → cliente intel/anyClient).
    if (userId) {
      try {
        await intel.profiles().update({
          consents: {
            terms:                   { accepted: true, at: now },
            privacy:                 { accepted: true, at: now },
            health:                  { accepted: true, at: now },
            confrontation_with_data: { accepted: true, at: now },
          },
          terms_accepted_at: now,
          ml_consent: mlConsent,
        }).eq('id', userId);
      } catch (e) {
        // No bloquear el onboarding si la escritura falla (se re-confirma al completar).
        console.warn('[Onboarding] persist consents:', e);
      }
    }
    setStep(1); // → intro de valor (skippable)
  };

  // El obstáculo (painPoint) sigue pre-poblando north.purpose si el usuario no lo definió.
  // Ahora el obstáculo va DESPUÉS del Norte (paso 3) → al avanzar al código de acceso.
  const goFromObstacleToCode = () => {
    if (painPoint.trim() && !north.purpose.trim()) {
      setNorth((n) => ({ ...n, purpose: painPoint.trim() }));
    }
    setStep(5);
  };

  // Chips de ejemplo para arrancar el obstáculo sin enfrentar un textarea en blanco.
  const obstacleChip = (text: string) => () => setPainPoint(text);

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
    if (finishing) return;
    setFinishing(true);
    try {
      await completeOnboarding({
        profile: { name: name.trim(), role: role.trim() },
        activeProgramId: 'protocolo-soberano',
        northStar: north,
      });
      router.replace('/(tabs)/comando');
    } catch {
      // Si falla el cierre, re-habilita para reintentar (no dejamos el botón muerto).
      setFinishing(false);
    }
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
      <View
        style={styles.stepRow}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Paso ${step + 1} de ${TOTAL_STEPS}`}
        accessibilityValue={{ min: 1, max: TOTAL_STEPS, now: step + 1 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
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
                <MaterialIcons name={icon} size={16} color={palette.goldText} />
                <Text style={styles.featureText}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.dividerLine} />

          {/* ── Consentimiento legal (gate de compliance) ── */}
          <View style={styles.consentBlock}>
            <Text style={styles.consentIntro}>
              Esto es alto rendimiento y bienestar, no atención médica. Consulta cualquier práctica
              con tu médico antes de aplicarla. Para entrar al sistema, lee y acepta:
            </Text>
            {CONSENT_ITEMS.map(({ key, label, route }) => (
              <Pressable
                key={key}
                onPress={() => toggleConsent(key)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: consents[key] }}
                accessibilityLabel={`Aceptar ${label}`}
                style={({ pressed }) => [styles.consentRow, pressed && { opacity: 0.7 }]}>
                <View style={[styles.checkbox, consents[key] && styles.checkboxChecked]}>
                  {consents[key] && <MaterialIcons name="check" size={16} color={palette.ink} />}
                </View>
                <Text style={styles.consentText}>
                  He leído y acepto los{' '}
                  <Text
                    style={styles.consentLink}
                    onPress={() => router.push(route as never)}
                    accessibilityRole="link">
                    {label}
                  </Text>
                </Text>
              </Pressable>
            ))}

            {/* Opt-in OPCIONAL de análisis (RGPD): no bloquea el gate. */}
            <Pressable
              onPress={() => setMlConsent((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: mlConsent }}
              accessibilityLabel="Permitir análisis de mis datos para personalizar (opcional)"
              style={({ pressed }) => [styles.consentRow, pressed && { opacity: 0.7 }]}>
              <View style={[styles.checkbox, mlConsent && styles.checkboxChecked]}>
                {mlConsent && <MaterialIcons name="check" size={16} color={palette.ink} />}
              </View>
              <Text style={styles.consentText}>
                <Text style={{ color: palette.smoke }}>(Opcional) </Text>
                Permito el análisis de mis datos de uso para personalizar mi experiencia y mejorar
                las recomendaciones. Puedo desactivarlo cuando quiera.
              </Text>
            </Pressable>
          </View>

          <PrimaryButton
            label="COMENZAR ACTIVACIÓN"
            icon="arrow-forward"
            onPress={acceptConsentAndContinue}
            disabled={!allConsented}
          />
        </View>
      )}

      {/* ───────────────────────────────────── STEP 1 — INTRO DE VALOR ── */}
      {/* ≈20s, skippable. Activa antes de pedir datos. NO bloqueante. */}
      {step === 1 && (
        <View style={styles.introWrap}>
          <Text style={styles.eyebrow}>ANTES DE EMPEZAR</Text>
          <View style={styles.goldAccent} />
          <Text style={styles.introTitle}>QUÉ ES{'\n'}POLARIS.</Text>

          <View style={styles.introList}>
            {VALUE_BULLETS.map(({ icon, title, body }) => (
              <View key={title} style={styles.introRow}>
                <View style={styles.introIcon}>
                  <MaterialIcons name={icon} size={18} color={palette.goldText} />
                </View>
                <View style={styles.introCopy}>
                  <Text style={styles.introBulletTitle}>{title}</Text>
                  <Text style={styles.introBulletBody}>{body}</Text>
                </View>
              </View>
            ))}
          </View>

          <PrimaryButton label="EMPEZAR" icon="arrow-forward" onPress={() => setStep(2)} />
          <Pressable
            onPress={() => setStep(2)}
            accessibilityRole="button"
            accessibilityLabel="Saltar intro"
            style={{ alignItems: 'center', marginTop: -spacing.sm }}>
            <Text style={styles.skipText}>Saltar →</Text>
          </Pressable>
        </View>
      )}

      {/* ─────────────────────────────────────────── STEP 2 — IDENTIDAD ── */}
      {step === 2 && (
        <PremiumCard style={styles.formCard}>
          <StatusPill label="PASO 1 · IDENTIDAD" />
          <Text style={styles.stepSubtitle}>Cuéntame quién eres</Text>
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
            <SecondaryButton label="ATRAS" onPress={() => setStep(1)} />
            <PrimaryButton
              label="CONTINUAR"
              icon="arrow-forward"
              disabled={!name.trim()}
              onPress={() => setStep(3)}
            />
          </View>
        </PremiumCard>
      )}

      {/* ──────────────────────────────────────────── STEP 3 — MI NORTE ── */}
      {step === 3 && (
        <PremiumCard style={styles.formCard}>
          <StatusPill label="PASO 2 · MI NORTE" tone="gold" dot />
          <Text style={styles.stepSubtitle}>Tu propósito para los próximos 90 días</Text>
          <Text style={styles.stepTitle}>ANCLA TU{'\n'}NORTE.</Text>
          <Text style={styles.stepBody}>
            Antes de la táctica, la dirección. Estas declaraciones orientan cada decisión del
            protocolo y el mentor las usa en cada sesión. Persigue el estado, no el resultado. Puedes editarlas después.
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
            <SecondaryButton label="ATRAS" onPress={() => setStep(2)} />
            <PrimaryButton label="CONTINUAR" icon="arrow-forward" onPress={() => setStep(4)} />
          </View>
        </PremiumCard>
      )}

      {/* ──────────────────────────────────────────── STEP 4 — OBSTÁCULO ── */}
      {step === 4 && (
        <PremiumCard style={styles.formCard}>
          <StatusPill label="PASO 3 · TU SITUACIÓN" />
          <Text style={styles.stepSubtitle}>Qué cambia todo — opcional</Text>
          <Text style={styles.stepTitle}>NOMBRA EL{'\n'}OBSTÁCULO.</Text>
          <Text style={styles.stepBody}>
            Opcional, pero útil: una línea sobre lo que se interpone te da a tu mentor contexto desde
            el primer mensaje. Puedes dejarlo para después.
          </Text>
          <GoldDivider />
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>¿QUÉ SE INTERPONE HOY?</Text>
            <View style={styles.chipRow}>
              {[
                'Trabajo demasiado y no delego',
                'Mi energía no aguanta el día',
                'Avanzo sin dirección clara',
                'Empiezo y no sostengo',
              ].map((chip) => (
                <Pressable
                  key={chip}
                  onPress={obstacleChip(chip)}
                  accessibilityRole="button"
                  accessibilityLabel={`Usar ejemplo: ${chip}`}
                  style={({ pressed }) => [
                    styles.chip,
                    painPoint === chip && styles.chipActive,
                    pressed && { opacity: 0.7 },
                  ]}>
                  <Text style={[styles.chipText, painPoint === chip && styles.chipTextActive]}>
                    {chip}
                  </Text>
                </Pressable>
              ))}
            </View>
            <PremiumInput
              value={painPoint}
              onChangeText={setPainPoint}
              placeholder={"Toca un ejemplo o escribe el tuyo. Cuanto más concreto, mejor te lee el mentor."}
              multiline
              style={styles.textArea}
              accessibilityLabel="Tu mayor obstaculo"
            />
          </View>
          <View style={styles.actions}>
            <SecondaryButton label="ATRAS" onPress={() => setStep(3)} />
            <PrimaryButton label="CONTINUAR" icon="arrow-forward" onPress={goFromObstacleToCode} />
          </View>
          <Pressable
            onPress={goFromObstacleToCode}
            accessibilityRole="button"
            accessibilityLabel="Continuar sin definir el obstáculo"
            style={{ alignItems: 'center', marginTop: -spacing.sm }}>
            <Text style={styles.skipText}>Continuar sin definirlo →</Text>
          </Pressable>
        </PremiumCard>
      )}

      {/* ──────────────────────────────── STEP 5 — CÓDIGO DE ACCESO ── */}
      {step === 5 && (
        <PremiumCard style={styles.formCard}>
          <StatusPill label="PASO 4 · MEMBRESÍA" />
          <Text style={styles.stepSubtitle}>Tu código de acceso, si tienes</Text>
          <Text style={styles.stepTitle}>ACTIVA TU{'\n'}MEMBRESÍA.</Text>
          <Text style={styles.stepBody}>
            Tu coach te entregó un código al inscribirte. Ingrésalo aquí para desbloquear el acceso
            completo al Protocolo Soberano. Si aún no lo tienes, inicia y actívalo después.
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
                  <ActivityIndicator color={palette.ink} size="small" />
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
            <SecondaryButton label="ATRAS" onPress={() => setStep(4)} />
            <PrimaryButton
              label={finishing ? 'INICIANDO...' : 'INICIAR EL PROTOCOLO'}
              icon={finishing ? 'hourglass-empty' : 'military-tech'}
              onPress={finish}
              disabled={finishing}
            />
          </View>
          <Pressable
            onPress={finish}
            disabled={finishing}
            accessibilityRole="button"
            style={{ alignItems: 'center', marginTop: -spacing.sm }}>
            <Text style={styles.skipText}>Iniciar sin código →</Text>
          </Pressable>
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
    color: palette.goldText,
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

  // ── Intro de valor (≈20s, skippable)
  introWrap: {
    gap: spacing.xl,
  },
  introTitle: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 44,
    textTransform: 'uppercase',
  },
  introList: {
    gap: spacing.lg,
  },
  introRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  introIcon: {
    alignItems: 'center',
    backgroundColor: palette.goldLight,
    borderRadius: radii.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  introCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  introBulletTitle: {
    ...typography.body,
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  introBulletBody: {
    ...typography.body,
    color: palette.ash,
    fontSize: 13,
    lineHeight: 19,
  },

  // ── Consent gate
  consentBlock: {
    gap: spacing.md,
  },
  consentIntro: {
    ...typography.caption,
    color: palette.smoke,
    fontSize: 11,
    lineHeight: 16,
  },
  consentRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 44,
    paddingVertical: spacing.xs,
  },
  checkbox: {
    alignItems: 'center',
    backgroundColor: palette.graphite,
    borderColor: palette.line,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    height: 24,
    justifyContent: 'center',
    marginTop: 2,
    width: 24,
  },
  checkboxChecked: {
    backgroundColor: palette.gold,
    borderColor: palette.gold,
  },
  consentText: {
    ...typography.body,
    color: palette.ash,
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  consentLink: {
    color: palette.goldText,
    fontWeight: '700',
    textDecorationLine: 'underline',
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
  stepSubtitle: {
    ...typography.caption,
    color: palette.goldText,
    fontSize: 12,
    marginTop: -spacing.sm,
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
    color: palette.ink,
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
  // ── Obstacle example chips (lighter entry than a blank textarea)
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: palette.goldLight,
    borderColor: palette.line,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipActive: {
    backgroundColor: palette.gold,
    borderColor: palette.gold,
  },
  chipText: {
    ...typography.caption,
    color: palette.ash,
    fontSize: 12,
  },
  chipTextActive: {
    color: palette.ink,
    fontWeight: '700',
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
