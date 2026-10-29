import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInRight,
  FadeOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
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
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { analytics } from '@/lib/analytics';
import { AI_PROVIDERS_LABEL, aiConsentEntry, markAiConsentLocal } from '@/lib/aiConsent';
import { ACTS } from '@/lib/narrativeLogic';
import { logSilentError } from '@/lib/observability';
import { purchasesAvailable } from '@/lib/subscription';
import { ENV } from '@/app/config/env';
import { intel, supabase } from '@/lib/supabase';
import type { NorthStar } from '@/types/lifeflow';

// 0 bienvenida · 1 nombre · 2 Mi Norte · 3 obstáculo · 4 acuerdos legales ·
// 5 datos y Norman IA · 6 código.
// Valor antes que papeleo: antes abría con DOS pantallas de casillas en frío.
// Ahora lo que el usuario escribe en 1-3 vive solo en el estado local; nada
// se guarda ni se envía a IA hasta aceptar los acuerdos (4-5) — se persiste
// en `acceptConsentAndContinue` y `finish`, ambos después del gate.
const TOTAL_STEPS = 7;

// iOS v1 sin compras (regla 3.1.1): la pantalla de canje se llama "Tu acceso"
// y se abre desde Progreso, no desde "Planes".
const CODE_LATER_WHERE =
  Platform.OS === 'ios' && !purchasesAvailable(Platform.OS, ENV) ? 'desde Progreso' : 'en Planes';

// La bienvenida cuenta la historia antes de pedir nada: los tres actos (los
// mismos de `ACTS`, que luego pinta el mapa de Comando) y el día a día.
// COPY AFINABLE POR EL DUEÑO.
const ACT_LINES: Record<1 | 2 | 3, string> = {
  1: 'Ves cómo entras cada día.',
  2: 'Lo que haces empieza a sostenerse.',
  3: 'Ya no lo haces: lo eres.',
};

// Consent gate — Términos, Privacidad y Descargo de Salud (compliance de lanzamiento)
type ConsentKey = 'terms' | 'privacy' | 'health' | 'confrontation' | 'softwareLearning' | 'aiSharing';

// Paso 1 — documentos legales: casilla + resumen en lenguaje simple + enlace
// propio (≥44pt, role=link). Antes el enlace era un <Text onPress> anidado en
// el checkbox: VoiceOver no lo enfocaba y el área táctil era una palabra.
const LEGAL_ITEMS: { key: ConsentKey; label: string; summary: string; link: string; route: '/legal/terminos' | '/legal/privacidad' | '/legal/salud' }[] = [
  { key: 'terms',   label: 'Acepto los Términos y Condiciones',      summary: 'Cómo funciona el servicio, tu membresía y qué puedes esperar de nosotros.', link: 'Leer términos',   route: '/legal/terminos' },
  { key: 'privacy', label: 'Acepto la Política de Privacidad (RGPD)', summary: 'Qué datos guardamos, para qué los usamos y cómo pedir que los borremos.',   link: 'Leer privacidad', route: '/legal/privacidad' },
  { key: 'health',  label: 'Acepto el Descargo de Salud y Bienestar', summary: 'Polaris acompaña tu bienestar; no es atención médica. Consulta cualquier práctica con tu médico.', link: 'Leer descargo', route: '/legal/salud' },
];

// Paso 2 — permisos de datos (obligatorios: sin ellos Norman IA no funciona).
const DATA_ITEMS: { key: ConsentKey; label: string }[] = [
  { key: 'confrontation',    label: 'Norman IA puede confrontarme con datos registrados del sistema cuando mis acciones no coincidan con lo que declaré' },
  { key: 'softwareLearning', label: 'Acepto el tratamiento de mis datos para el aprendizaje y mejora del software' },
  // Apple 5.1.2(i): permiso explícito, con nombre de los terceros, antes de enviar datos a IA externa.
  { key: 'aiSharing',        label: `Autorizo que mis mensajes y datos de uso se envíen a proveedores de IA de terceros (${AI_PROVIDERS_LABEL}) para que Norman IA funcione. Puedo retirarlo cuando quiera` },
];

function ConsentCheck({ checked, label, onPress, children }: { checked: boolean; label: string; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.consentRow, pressed && { opacity: 0.7 }]}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <MaterialIcons name="check" size={16} color={palette.ink} />}
      </View>
      <Text style={styles.consentText}>{children}</Text>
    </Pressable>
  );
}

// Segmento del indicador de paso. El "fill" es la opacidad de la capa dorada
// superpuesta (no un interpolateColor: palette.gold/charcoal son tokens
// cv() — var(--c-*) en web — y Reanimated no puede interpolar eso en un
// worklet, ver __tests__/unit/themeVarInAnimation.test.ts).
function StepSeg({ active, reduced }: { active: boolean; reduced: boolean }) {
  const fill = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    fill.value = reduced ? (active ? 1 : 0) : withTiming(active ? 1 : 0, { duration: 200 });
  }, [active, reduced, fill]);
  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.value }));
  return (
    <View style={styles.stepSeg}>
      <Animated.View style={[styles.stepSegActive, fillStyle]} />
    </View>
  );
}

export default function OnboardingScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const scrollRef = useRef<ScrollView>(null);
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
  const [finishError, setFinishError] = useState<string | null>(null);

  // ── Consent gate (Step 0) ──────────────────────────────────────────────────
  const [consents, setConsents] = useState<Record<ConsentKey, boolean>>({
    terms: false,
    privacy: false,
    health: false,
    confrontation: false,
    softwareLearning: false,
    aiSharing: false,
  });
  const legalConsented = consents.terms && consents.privacy && consents.health;
  const allConsented =
    legalConsented && consents.confrontation && consents.softwareLearning && consents.aiSharing;
  // ml_consent es OPT-IN explícito y OPCIONAL (RGPD): default false, no bloquea el gate.
  const [mlConsent, setMlConsent] = useState(false);

  const toggleConsent = (key: ConsentKey) => {
    setConsents((c) => ({ ...c, [key]: !c[key] }));
  };

  // Cada step puede montar a una altura de scroll distinta de la del anterior
  // (formularios más largos o más cortos) — sin esto, el siguiente step podía
  // aparecer a mitad de card en vez de arriba.
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [step]);

  const acceptConsentAndContinue = async () => {
    if (!allConsented) return;
    const now = new Date().toISOString();
    // Tracking de comportamiento: SOLO si el usuario activó el opt-in (RGPD opt-in explícito).
    analytics.setConsent(mlConsent);
    // Persiste el consentimiento en profiles (campos nuevos sin tipar → cliente intel/anyClient).
    if (userId) {
      // El permiso ya está dado: se abre el cerrojo aunque falle la escritura remota.
      await markAiConsentLocal(userId);
      try {
        await intel.profiles().update({
          consents: {
            terms:                   { accepted: true, at: now },
            privacy:                 { accepted: true, at: now },
            health:                  { accepted: true, at: now },
            confrontation_with_data: { accepted: true, at: now },
            software_learning:       { accepted: true, at: now },
            ai_third_party:          aiConsentEntry(now),
          },
          terms_accepted_at: now,
          ml_consent: mlConsent,
        }).eq('id', userId);
      } catch (e) {
        // No bloquear el onboarding si la escritura falla (se re-confirma al completar),
        // pero SÍ dejar rastro: esto es evidencia de consentimiento RGPD, no ruido.
        logSilentError('onboarding.persistConsents', e);
      }
    }
    setStep(6); // → membresía
  };

  // El obstáculo ya NO se disfraza de propósito. Antes se copiaba a
  // north.purpose "si el usuario no lo definió" — condición que era siempre
  // false porque el default venía relleno — y el dolor se descartaba SIEMPRE.
  // Ahora painPoint viaja por derecho propio en finish() y siembra la
  // historia de origen (transformation_goal + primera entrada de la línea
  // de tiempo). Un dolor no es un propósito; no se mezclan.
  const goFromObstacleToAgreements = () => setStep(4);

  // Chips de ejemplo para arrancar el obstáculo sin enfrentar un textarea en blanco.
  const obstacleChip = (text: string) => () => setPainPoint(text);

  // El registro valida el código y lo deja en user_metadata.access_code. Antes
  // nadie lo leía: el paso 7 lo volvía a pedir y "Iniciar sin código" dejaba
  // a un cliente que pagó en Free. Se rellena y se canjea solo al llegar.
  const signupCode = useRef<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const c = data.user?.user_metadata?.access_code;
      if (typeof c === 'string' && c.trim()) {
        signupCode.current = c.trim();
        setAccessCode(c.trim());
      }
    }).catch((e) => logSilentError('onboarding.readSignupCode', e));
  }, []);
  useEffect(() => {
    if (step === 6 && signupCode.current && accessCode === signupCode.current && codeStatus === 'idle') {
      signupCode.current = null; // un solo intento automático
      handleApplyCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, accessCode, codeStatus]);

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
    setFinishError(null);
    try {
      await completeOnboarding({
        profile: { name: name.trim(), role: role.trim() },
        activeProgramId: 'protocolo-soberano',
        northStar: north,
        // El punto de partida del héroe: siembra transformation_goal y la
        // historia de origen en la línea de tiempo del Memory OS.
        painPoint: painPoint.trim() || undefined,
      });
      // Al Umbral, no al tablero. Acaba de escribir qué se interpone en su
      // vida y quién decide ser; caer directo en una rejilla de métricas era
      // gastar el momento con más carga del producto en una transición de
      // router. El Umbral se lo lee de vuelta y de ahí entra a Comando.
      router.replace('/(onboarding)/umbral');
    } catch (e) {
      // Si falla el cierre, re-habilita para reintentar (no dejamos el botón muerto)
      // y lo decimos: es el último paso del onboarding, fallar en silencio aquí
      // deja al usuario atascado sin saber por qué.
      logSilentError('onboarding.finish', e);
      setFinishError('No se pudo iniciar el protocolo. Revisa tu conexión e inténtalo de nuevo.');
      setFinishing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={sc.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}>
    <ScrollView
      ref={scrollRef}
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
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <StepSeg key={i} active={i <= step} reduced={reducedMotion} />
        ))}
        {/* La barra es la ÚNICA que numera. Las píldoras de cada pantalla
            decían "PASO 1" sobre el paso 3 de 6 —contaban solo los pasos con
            formulario— y dejaban al usuario con dos cuentas distintas de dónde
            está. Ahora nombran la sección y no compiten con el contador. */}
        <Text style={styles.stepCounter}>{step + 1}/{TOTAL_STEPS}</Text>
      </View>

      {/* Un solo wrapper para el step activo (los 6 bloques son mutuamente
          excluyentes): key={step} lo remonta al cambiar de paso, disparando
          entering/exiting — sin esto el corte entre steps era seco. */}
      <Animated.View
        key={`step-${step}`}
        entering={reducedMotion ? undefined : FadeInRight.duration(220)}
        exiting={reducedMotion ? undefined : FadeOutLeft.duration(160)}>
      {/* ─────────────────────────────────────────── STEP 0 — BIENVENIDA ── */}
      {/* Qué es Polaris en un vistazo: la historia de 90 días en tres actos.
          Sin nada legal todavía — primero el porqué, después la firma. */}
      {step === 0 && (
        <View style={styles.welcomeWrap}>
          <View style={styles.markWrap}>
            <PolarisMark size={56} />
          </View>
          <Text style={styles.welcomeTitle}>90 DÍAS.{'\n'}TRES ACTOS.</Text>
          <Text style={styles.welcomeBody}>
            Busca el estado, no el resultado. Cada día: una lectura de cómo entras y un paso.
          </Text>

          <View style={styles.introList}>
            {ACTS.map((a) => (
              <View key={a.n} style={styles.introRow}>
                <Text style={styles.actNum}>{['I', 'II', 'III'][a.n - 1]}</Text>
                <View style={styles.introCopy}>
                  <Text style={styles.introBulletTitle}>{a.name}</Text>
                  <Text style={styles.introBulletBody}>
                    {`Días ${a.from}–${a.to} · ${ACT_LINES[a.n]}`}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <PrimaryButton label="EMPEZAR" icon="arrow-forward" onPress={() => setStep(1)} />
        </View>
      )}

      {/* ──────────────────────────────────────────────── STEP 1 — NOMBRE ── */}
      {step === 1 && (
        <PremiumCard style={styles.formCard}>
          <Text style={styles.stepTitle}>¿CÓMO TE{'\n'}LLAMAS?</Text>
          <Text style={styles.stepBody}>Así te habla Norman, tu mentor.</Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>NOMBRE</Text>
            <PremiumInput
              value={name}
              onChangeText={setName}
              placeholder="Tu nombre"
              accessibilityLabel="Tu nombre"
              returnKeyType="next"
              autoCapitalize="words"
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>A QUÉ TE DEDICAS · OPCIONAL</Text>
            <PremiumInput
              value={role}
              onChangeText={setRole}
              placeholder="Fundador, CEO, médica…"
              accessibilityLabel="A qué te dedicas, opcional"
              returnKeyType="done"
              autoCapitalize="words"
            />
          </View>
          <View style={styles.actions}>
            <SecondaryButton label="ATRÁS" onPress={() => setStep(0)} />
            <PrimaryButton
              label="CONTINUAR"
              icon="arrow-forward"
              disabled={!name.trim()}
              onPress={() => setStep(2)}
            />
          </View>
        </PremiumCard>
      )}

      {/* ──────────────────────────────────────────── STEP 2 — MI NORTE ── */}
      {/* Solo el propósito. Identidad y recordatorio se editan luego en la
          pestaña Norte: aquí eran dos campos opcionales más en la misma
          pantalla. */}
      {step === 2 && (
        <PremiumCard style={styles.formCard}>
          <Text style={styles.stepTitle}>TU NORTE.</Text>
          <Text style={styles.stepBody}>
            ¿Qué tiene que haber pasado en 90 días para que esto haya valido la pena?
          </Text>
          <PremiumInput
            value={north.purpose}
            onChangeText={(purpose) => setNorth({ ...north, purpose })}
            placeholder='Ej.: "Dormir 7 h, delegar la operación y entrenar 3 veces por semana."'
            multiline
            style={styles.textArea}
            accessibilityLabel="Tu propósito para los 90 días"
          />
          <View style={styles.actions}>
            <SecondaryButton label="ATRÁS" onPress={() => setStep(1)} />
            <PrimaryButton label="CONTINUAR" icon="arrow-forward" onPress={() => setStep(3)} />
          </View>
          <Pressable
            onPress={() => setStep(3)}
            accessibilityRole="button"
            accessibilityLabel="Definir mi Norte después"
            style={styles.skipBtn}>
            <Text style={styles.skipText}>Lo defino después →</Text>
          </Pressable>
        </PremiumCard>
      )}

      {/* ──────────────────────────────────────────── STEP 3 — OBSTÁCULO ── */}
      {step === 3 && (
        <PremiumCard style={styles.formCard}>
          <Text style={styles.stepTitle}>¿QUÉ SE{'\n'}INTERPONE?</Text>
          <Text style={styles.stepBody}>Opcional. Una línea basta.</Text>
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
            placeholder="O escríbelo con tus palabras."
            multiline
            style={styles.textArea}
            accessibilityLabel="Lo que se interpone, opcional"
          />
          <View style={styles.actions}>
            <SecondaryButton label="ATRÁS" onPress={() => setStep(2)} />
            <PrimaryButton label="CONTINUAR" icon="arrow-forward" onPress={goFromObstacleToAgreements} />
          </View>
        </PremiumCard>
      )}

      {/* ──────────────────────────────────── STEP 4 — ACUERDOS LEGALES ── */}
      {/* Los tres documentos siguen siendo obligatorios y uno por uno, con
          resumen y enlace al texto completo. Solo cambió el orden y el copy. */}
      {step === 4 && (
        <PremiumCard style={styles.formCard}>
          <StatusPill label="ACUERDOS · 1 DE 2" />
          <Text style={styles.stepTitle}>ANTES DE{'\n'}EMPEZAR.</Text>
          <Text style={styles.stepBody}>Tres acuerdos. Cada uno, en una línea.</Text>
          <GoldDivider />
          {LEGAL_ITEMS.map(({ key, label, summary, link, route }) => (
            <View key={key} style={styles.legalItem}>
              <ConsentCheck checked={consents[key]} label={label} onPress={() => toggleConsent(key)}>
                {label}
              </ConsentCheck>
              <Text style={styles.consentSummary}>{summary}</Text>
              <Pressable
                onPress={() => router.push(route as never)}
                accessibilityRole="link"
                accessibilityLabel={`${link} completo`}
                hitSlop={{ left: 8, right: 8 }}
                style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}>
                <Text style={styles.consentLink}>{link}</Text>
                <MaterialIcons name="chevron-right" size={18} color={palette.goldText} />
              </Pressable>
            </View>
          ))}
          <View style={styles.actions}>
            <SecondaryButton label="ATRÁS" onPress={() => setStep(3)} />
            <PrimaryButton
              label="CONTINUAR"
              icon="arrow-forward"
              onPress={() => setStep(5)}
              disabled={!legalConsented}
            />
          </View>
        </PremiumCard>
      )}

      {/* ─────────────────────────────────── STEP 5 — DATOS Y NORMAN IA ── */}
      {step === 5 && (
        <PremiumCard style={styles.formCard}>
          <StatusPill label="ACUERDOS · 2 DE 2" />
          <Text style={styles.stepTitle}>NORMAN{'\n'}Y TUS DATOS.</Text>
          <Text style={styles.stepBody}>
            Norman es una IA. Sin estos tres permisos no puede acompañarte.
          </Text>
          <GoldDivider />
          {DATA_ITEMS.map(({ key, label }) => (
            <ConsentCheck key={key} checked={consents[key]} label={label} onPress={() => toggleConsent(key)}>
              {label}
            </ConsentCheck>
          ))}
          <Pressable
            onPress={() => router.push('/legal/privacidad' as never)}
            accessibilityRole="link"
            accessibilityLabel="Leer la Política de Privacidad completa"
            style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}>
            <Text style={styles.consentLink}>Cómo tratamos tus datos</Text>
            <MaterialIcons name="chevron-right" size={18} color={palette.goldText} />
          </Pressable>

          {/* Opt-in OPCIONAL de análisis (RGPD): separado y no bloquea el gate. */}
          <View style={styles.optionalBlock}>
            <Text style={styles.fieldLabel}>OPCIONAL</Text>
            <ConsentCheck
              checked={mlConsent}
              label="Permitir análisis de mis datos para personalizar (opcional)"
              onPress={() => setMlConsent((v) => !v)}>
              Permito el análisis de mis datos de uso para personalizar mi experiencia y mejorar
              las recomendaciones. Puedo desactivarlo cuando quiera.
            </ConsentCheck>
          </View>

          <View style={styles.actions}>
            <SecondaryButton label="ATRÁS" onPress={() => setStep(4)} />
            <PrimaryButton
              label="ACEPTAR"
              icon="arrow-forward"
              onPress={acceptConsentAndContinue}
              disabled={!allConsented}
            />
          </View>
        </PremiumCard>
      )}

      {/* ──────────────────────────────── STEP 6 — CÓDIGO DE ACCESO ── */}
      {step === 6 && (
        <PremiumCard style={styles.formCard}>
          <Text style={styles.stepTitle}>TU{'\n'}ACCESO.</Text>
          <Text style={styles.stepBody}>
            Si tu coach te dio un código, va aquí. Si ya lo pusiste al registrarte, se aplica solo.
          </Text>
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
                disabled={!accessCode.trim() || codeStatus === 'checking'}
                accessibilityRole="button"
                accessibilityLabel="Aplicar código de acceso"
                accessibilityState={{ disabled: !accessCode.trim() || codeStatus === 'checking' }}>
                {codeStatus === 'checking' ? (
                  <ActivityIndicator color={palette.ink} size="small" />
                ) : (
                  <Text style={styles.applyBtnText}>APLICAR</Text>
                )}
              </Pressable>
            </View>
            {codeMessage ? (
              <Text
                style={[styles.codeMsg, { color: codeStatus === 'ok' ? palette.success : palette.danger }]}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite">
                {codeMessage}
              </Text>
            ) : null}
          </View>
          <View style={styles.actions}>
            <SecondaryButton label="ATRÁS" onPress={() => setStep(5)} />
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
            accessibilityLabel="Iniciar sin código"
            accessibilityHint={`Entras con el plan Free; puedes canjear el código después ${CODE_LATER_WHERE}`}
            style={styles.skipBtn}>
            <Text style={styles.skipText}>Iniciar sin código →</Text>
          </Pressable>
          <Text style={styles.skipNote}>
            Sin código entras con el plan Free: check-in diario, Norman IA y el Módulo 1; el resto
            de módulos queda cerrado. Puedes canjear tu código después {CODE_LATER_WHERE}.
          </Text>
          {finishError ? (
            <Text
              style={[styles.codeMsg, { color: palette.danger }]}
              accessibilityLiveRegion="polite"
              accessibilityRole="alert">
              {finishError}
            </Text>
          ) : null}
        </PremiumCard>
      )}
      </Animated.View>
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
    overflow: 'hidden',
  },
  stepSegActive: {
    ...StyleSheet.absoluteFillObject,
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
  welcomeTitle: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 44,
    textTransform: 'uppercase',
  },
  welcomeBody: {
    ...typography.body,
    color: palette.ash,
    lineHeight: 24,
  },

  introList: {
    gap: spacing.lg,
  },
  introRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  actNum: {
    color: palette.goldText,
    fontFamily: Fonts.display,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
    width: 32,
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
  legalItem: {
    gap: spacing.xs,
  },
  consentSummary: {
    ...typography.caption,
    color: palette.ash,
    fontSize: 13,
    lineHeight: 19,
    paddingLeft: 24 + spacing.md, // alinea con el texto, no con la casilla
  },
  linkRow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 44,
    paddingLeft: 24 + spacing.md,
  },
  optionalBlock: {
    borderTopColor: palette.line,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.lg,
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
    color: palette.ink,
    fontSize: 11,
  },
  codeMsg: {
    ...typography.caption,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  skipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -spacing.sm,
    minHeight: 44,
  },
  skipNote: {
    ...typography.caption,
    color: palette.smoke,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
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
    minHeight: 44,
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
