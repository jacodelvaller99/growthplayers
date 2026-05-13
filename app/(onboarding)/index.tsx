import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { POLARIS_MODULES } from '@/data/modules';
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
} from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import type { NorthStar } from '@/types/lifeflow';

const programs = [
  {
    id: 'protocolo-soberano',
    label: 'PROTOCOLO SOBERANO',
    meta: '90 DIAS · EJECUCION INTEGRAL',
    description:
      'El sistema completo para operar tu vida con precision militar. Biometria, norte, modulos y mentor integrados.',
    icon: 'military-tech' as const,
  },
  {
    id: 'mercader',
    label: 'MERCADER',
    meta: 'TIEMPO · CAPITAL · FOCO',
    description:
      'Optimiza tus tres recursos fundamentales: atencion, energia y dinero. Para el operador de alto volumen.',
    icon: 'trending-up' as const,
  },
  {
    id: 'elite-os',
    label: 'ELITE OPERATING SYSTEM',
    meta: 'SISTEMA AVANZADO',
    description:
      'Para quienes dominan los fundamentos. Sistemas propios, leverage y delegacion de alta precision.',
    icon: 'precision-manufacturing' as const,
  },
];

const TOTAL_STEPS = 5;

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { completeOnboarding, state, userId } = useLifeFlow();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(state.profile.name);
  const [role, setRole] = useState(state.profile.role);
  const [program, setProgram] = useState(state.activeProgramId);
  const [north, setNorth] = useState<NorthStar>(state.northStar);
  const [accessCode, setAccessCode] = useState('');
  const [codeStatus, setCodeStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [codeMessage, setCodeMessage] = useState('');

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
      activeProgramId: program,
      northStar: north,
    });
    router.replace('/(tabs)/comando');
  };

  return (
    <KeyboardAvoidingView
      style={screen.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}>
    <ScrollView
      contentContainerStyle={[screen.content, { paddingTop: insets.top + 16 }]}
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
          <View style={styles.markWrap}>
            <PolarisMark size={60} />
          </View>
          <Text style={styles.eyebrow}>POLARIS GROWTH INSTITUTE</Text>
          <Text style={styles.welcomeTitle}>TU SALA{'\n'}DE MANDO{'\n'}PERSONAL.</Text>
          <Text style={styles.welcomeBody}>
            Esta app no busca calmarte. Busca convertir tu estado interno en ejecucion visible,
            medible y sostenida en el tiempo.
          </Text>
          <View style={styles.featureList}>
            {['Biometria diaria calibrada', 'Mentor IA contextualizado', 'Protocolo Soberano 90D', 'Score Soberano en tiempo real'].map(
              (item) => (
                <View key={item} style={styles.featureRow}>
                  <MaterialIcons name="check" size={14} color={palette.gold} />
                  <Text style={styles.featureText}>{item}</Text>
                </View>
              ),
            )}
          </View>
          <View style={styles.dividerLine} />
          <Text style={styles.legalNote}>
            Al continuar, aceptas que tus datos biométricos y de bienestar son usados exclusivamente
            para personalizar tu experiencia. No son consejo médico. Puedes exportar o eliminar
            tu cuenta en Perfil → Privacidad y Datos (RGPD/GDPR).
          </Text>
          <PrimaryButton label="COMENZAR ACTIVACION" icon="arrow-forward" onPress={() => setStep(1)} />
        </View>
      )}

      {/* ─────────────────────────────────────────── STEP 1 — IDENTIDAD ── */}
      {step === 1 && (
        <PremiumCard style={styles.formCard}>
          <StatusPill label="PASO 1 DE 4 · IDENTIDAD" />
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

      {/* ──────────────────────────────────────────── STEP 2 — PROGRAMA ── */}
      {step === 2 && (
        <View style={styles.stack}>
          <StatusPill label="PASO 2 DE 4 · PROGRAMA" />
          <Text style={styles.stepTitle}>SELECCIONA{'\n'}TU PROTOCOLO.</Text>
          <Text style={styles.stepBody}>
            El programa define los modulos, cadencia de check-ins y enfoque del mentor IA.
          </Text>
          {programs.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => setProgram(item.id)}
              style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
              <PremiumCard style={[styles.programCard, program === item.id && styles.programCardActive]}>
                <View style={styles.programTop}>
                  <View style={[styles.programIconWrap, program === item.id && styles.programIconWrapActive]}>
                    <MaterialIcons
                      name={item.icon}
                      size={20}
                      color={program === item.id ? palette.black : palette.gold}
                    />
                  </View>
                  <View style={styles.programTitleWrap}>
                    <Text style={[styles.programTitle, program === item.id && styles.programTitleActive]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.programMeta, program === item.id && styles.programMetaActive]}>
                      {item.meta}
                    </Text>
                  </View>
                  {program === item.id && (
                    <MaterialIcons name="check-circle" size={20} color={palette.black} />
                  )}
                </View>
                <Text style={[styles.programDesc, program === item.id && styles.programDescActive]}>
                  {item.description}
                </Text>
              </PremiumCard>
            </Pressable>
          ))}
          <View style={styles.actions}>
            <SecondaryButton label="ATRAS" onPress={() => setStep(1)} />
            <PrimaryButton label="CONTINUAR" icon="arrow-forward" onPress={() => setStep(3)} />
          </View>

        </View>
      )}

      {/* ──────────────────────────────── STEP 3 — CÓDIGO DE ACCESO (NUEVO) ── */}
      {step === 3 && (
        <PremiumCard style={styles.formCard}>
          <StatusPill label="PASO 3 DE 5 · CÓDIGO DE ACCESO" />
          <Text style={styles.stepTitle}>¿TIENES UN{'\n'}CÓDIGO?</Text>
          <Text style={styles.stepBody}>
            Si tienes un código de acceso de Polaris, ingrésalo aquí para activar tu membresía.
            Si no tienes uno, puedes continuar sin él.
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
          <StatusPill label={`PASO 4 DE 5 · MODULO ${POLARIS_MODULES[5].order}`} tone="gold" dot />
          <Text style={styles.stepTitle}>DEFINE TU{'\n'}NORTE.</Text>
          <Text style={styles.stepBody}>
            Estas declaraciones guian al mentor y anclan tu protocolo diario. Puedes editarlas en cualquier momento.
          </Text>
          <GoldDivider />
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PROPOSITO PRINCIPAL</Text>
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
            <Text style={styles.fieldLabel}>DECLARACION DE IDENTIDAD</Text>
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
            <PrimaryButton label="ACTIVAR POLARIS" icon="check" onPress={finish} />
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
    gap: spacing.sm,
  },
  featureText: {
    ...typography.mono,
    color: palette.ivoryDim,
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
  textArea: {
    minHeight: 88,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  // ── Program cards
  programCard: {
    gap: spacing.md,
  },
  programCardActive: {
    backgroundColor: palette.gold,
    borderColor: palette.gold,
  },
  programTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  programIconWrap: {
    alignItems: 'center',
    backgroundColor: palette.goldLight,
    borderRadius: radii.xs,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  programIconWrapActive: {
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  programTitleWrap: {
    flex: 1,
    gap: 3,
  },
  programTitle: {
    ...typography.section,
    color: palette.ivory,
  },
  programTitleActive: {
    color: palette.black,
  },
  programMeta: {
    ...typography.mono,
    color: palette.ash,
  },
  programMetaActive: {
    color: palette.graphite,
  },
  programDesc: {
    ...typography.body,
    color: palette.ash,
    fontSize: 13,
    lineHeight: 20,
  },
  programDescActive: {
    color: palette.graphite,
  },
});
