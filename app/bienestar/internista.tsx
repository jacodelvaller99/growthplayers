/**
 * Bienestar — Internista educativo (Cluster B).
 *
 * IA EDUCATIVA basada en evidencia. NO diagnostica. NO prescribe. Deriva al
 * médico ante red-flags. Disclaimer permanente, consent gate antes de activar.
 *
 * Patrón clonado de app/(tabs)/mentor.tsx + app/admin/copilot.tsx, con el system
 * prompt y las salvaguardas específicas del internista (lib/internist.ts).
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, PremiumCard, useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import {
  fetchInternistHistory,
  fetchPatientContext,
  persistInternistTurn,
  streamInternistResponse,
  type InternistTurn,
  type PatientContext,
} from '@/lib/internist';

const QUICK_PROMPTS = [
  '¿Qué significa mi HDL bajo?',
  '¿Qué evidencia hay del ayuno intermitente?',
  '¿Mi HRV en bajada es preocupante?',
  '¿Cómo me preparo para mi próximo análisis?',
];

const STORAGE_KEY = 'internist:consent:v1';

export default function InternistaScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLifeFlow();

  const [consent, setConsent] = useState<boolean | null>(null);
  const [patient, setPatient] = useState<PatientContext>({});
  const [turns, setTurns] = useState<InternistTurn[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  // ── Lee el consent persistido (storage local). El consent también vive en
  //    profiles.consents.internist_educational — pero la app puede arrancar sin red.
  useEffect(() => {
    let alive = true;
    (async () => {
      let granted = false;
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          granted = window.localStorage.getItem(STORAGE_KEY) === 'true';
        } else {
          const SecureStore = await import('expo-secure-store');
          granted = (await SecureStore.getItemAsync(STORAGE_KEY)) === 'true';
        }
      } catch {/* default false */}
      if (alive) setConsent(granted);
    })();
    return () => { alive = false; };
  }, []);

  // ── Ensambla contexto + historial cuando hay consent + userId.
  useEffect(() => {
    if (!consent || !userId) return;
    (async () => {
      const [ctx, history] = await Promise.all([
        fetchPatientContext(userId).catch(() => ({}) as PatientContext),
        fetchInternistHistory(userId).catch(() => [] as InternistTurn[]),
      ]);
      setPatient(ctx);
      setTurns(history);
    })();
  }, [consent, userId]);

  const acceptConsent = useCallback(async () => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, 'true');
      } else {
        const SecureStore = await import('expo-secure-store');
        await SecureStore.setItemAsync(STORAGE_KEY, 'true');
      }
    } catch {/* persistencia best-effort */}
    setConsent(true);
  }, []);

  const scrollDown = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const send = useCallback(async (text = input) => {
    const clean = text.trim();
    if (!clean || streaming) return;
    if (!userId) return;
    setInput('');
    const userTurn: InternistTurn = { role: 'user', text: clean };
    const history = [...turns, userTurn];
    setTurns(history);
    setStreaming(true);
    setStreamText('');
    scrollDown();
    void persistInternistTurn(userId, 'user', clean);

    const controller = new AbortController();
    abortRef.current = controller;
    let full = '';
    let lastRedFlags: Awaited<ReturnType<typeof streamInternistResponse>>['redFlags'] = [];
    try {
      const out = await streamInternistResponse(
        patient,
        clean,
        turns,
        (d) => { full += d; setStreamText(full); scrollDown(); },
        controller.signal,
      );
      full = out.text || full;
      lastRedFlags = out.redFlags;
    } catch {/* abort o error: conservamos el parcial */}
    setTurns((prev) => [...prev, { role: 'assistant', text: full || '…' }]);
    void persistInternistTurn(userId, 'assistant', full, lastRedFlags);
    setStreaming(false);
    setStreamText('');
    abortRef.current = null;
    scrollDown();
  }, [input, streaming, userId, turns, patient, scrollDown]);

  // ── Header común ─────────────────────────────────────────────────────────────
  const header = useMemo(() => (
    <View style={[s.topRow, { paddingTop: insets.top + 12 }]}>
      <Pressable
        onPress={() => router.back()}
        style={s.backBtn}
        accessibilityRole="button"
        accessibilityLabel="Volver"
        hitSlop={8}>
        <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
      </Pressable>
      <View>
        <Text style={s.title}>INTERNISTA</Text>
        <Text style={s.subtitle}>Educación clínica basada en evidencia</Text>
      </View>
      <View style={{ width: 36 }} />
    </View>
  ), [insets.top, router]);

  // ── Pantalla de consent gate ─────────────────────────────────────────────────
  if (consent === null) {
    return (
      <View style={[sc.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={palette.gold} />
      </View>
    );
  }

  if (!consent) {
    return (
      <ScrollView
        style={sc.root}
        contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}
        showsVerticalScrollIndicator={false}>
        {header}
        <GoldDivider label="ANTES DE EMPEZAR" />
        <PremiumCard style={{ gap: spacing.md }}>
          <Text style={s.consentTitle}>Cómo es este internista</Text>
          <Text style={s.consentBody}>
            Es una IA EDUCATIVA. Te explica qué significan tus marcadores y qué dice
            la evidencia sobre estilo de vida — citando guías clínicas reales (USPSTF,
            NIH, Mayo Clinic, ACLM, Cochrane, entre otras).
          </Text>
          <Text style={s.consentBody}>
            <Text style={s.consentEmph}>No es tu médico tratante.</Text> No te diagnostica,
            no te receta, no ajusta dosis ni reemplaza una consulta. Cuando detecta una
            señal seria (dolor torácico, salud mental en crisis, valores críticos de lab,
            embarazo + medicación, riesgo de TCA, etc.), <Text style={s.consentEmph}>detiene la
            educación y te deriva</Text> al médico o a urgencias.
          </Text>
          <Text style={s.consentBody}>
            Lo que escribas con el internista se guarda en tu cuenta para que puedas
            retomar la conversación. Tu equipo de coaches <Text style={s.consentEmph}>NO ve esta
            conversación</Text>. Tus exámenes médicos viven en almacenamiento privado y
            solo los compartes con el coach si lo activas explícitamente más adelante.
          </Text>
          <View style={s.consentBullets}>
            <Text style={s.consentBullet}>• Educación general, no diagnóstico personal.</Text>
            <Text style={s.consentBullet}>• Cita la fuente de cada afirmación clínica.</Text>
            <Text style={s.consentBullet}>• Deriva ante red-flags sin negociar.</Text>
            <Text style={s.consentBullet}>• Tus datos son tuyos; puedes borrar todo cuando quieras.</Text>
          </View>
          <Pressable onPress={acceptConsent} style={s.consentBtn}>
            <Text style={s.consentBtnText}>ENTIENDO Y ACEPTO</Text>
          </Pressable>
          <Pressable onPress={() => router.back()}>
            <Text style={s.consentSkip}>Ahora no</Text>
          </Pressable>
        </PremiumCard>
      </ScrollView>
    );
  }

  // ── Chat ─────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={sc.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {header}

      <View style={s.disclaimerBar}>
        <MaterialIcons name="info-outline" size={14} color={palette.goldText} />
        <Text style={s.disclaimerText} numberOfLines={2}>
          Educación general — no reemplaza a tu médico tratante.
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}>
        {turns.length === 0 && !streaming && (
          <PremiumCard style={s.intro}>
            <Text style={s.introText}>
              Hola{patient.name ? `, ${patient.name}` : ''}. Soy el internista educativo
              de Polaris. Puedes preguntarme qué significan tus marcadores, qué dice la
              evidencia sobre un hábito o suplemento, o cómo entender tus métricas de
              wearable. Cito mis fuentes — y cuando algo necesita un médico, te lo digo.
            </Text>
          </PremiumCard>
        )}
        {turns.map((t, i) => (
          <View key={i} style={[s.bubble, t.role === 'user' ? s.bubbleUser : s.bubbleAI]}>
            <Text style={t.role === 'user' ? s.bubbleUserText : s.bubbleAIText}>{t.text}</Text>
          </View>
        ))}
        {streaming && (
          <View style={[s.bubble, s.bubbleAI]}>
            <Text style={s.bubbleAIText}>{streamText || '…'}</Text>
          </View>
        )}
      </ScrollView>

      {turns.length === 0 && (
        <View style={s.quickRow}>
          {QUICK_PROMPTS.map((q) => (
            <Pressable key={q} onPress={() => send(q)} style={s.quickChip}>
              <Text style={s.quickText}>{q}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={s.examsLink}>
        <Pressable
          onPress={() => router.push('/bienestar/examenes' as never)}
          style={s.examsLinkBtn}
          accessibilityRole="button"
          accessibilityLabel="Subir o ver tus exámenes médicos">
          <MaterialIcons name="folder" size={16} color={palette.goldText} />
          <Text style={s.examsLinkText}>Tus exámenes médicos</Text>
          <MaterialIcons name="chevron-right" size={16} color={palette.smoke} />
        </Pressable>
      </View>

      <View style={[s.inputRow, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TextInput
          style={s.input}
          placeholder="Pregunta al internista…"
          placeholderTextColor={palette.smoke}
          value={input}
          onChangeText={setInput}
          editable={!streaming}
          onSubmitEditing={() => send()}
          returnKeyType="send"
          multiline
        />
        <Pressable
          onPress={() => (streaming ? abortRef.current?.abort() : send())}
          style={s.sendBtn}
          accessibilityRole="button"
          accessibilityLabel={streaming ? 'Detener' : 'Enviar'}>
          {streaming
            ? <MaterialIcons name="stop" size={20} color={palette.ink} />
            : <MaterialIcons name="arrow-upward" size={20} color={palette.ink} />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  topRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title, color: palette.ivory, fontSize: 18, textAlign: 'center' },
  subtitle: { ...typography.caption, color: palette.smoke, fontSize: 10, textAlign: 'center' },

  disclaimerBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.xs,
    backgroundColor: palette.goldGlow,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: palette.lineGoldSubtle,
  },
  disclaimerText: {
    flex: 1, ...typography.caption, color: palette.goldText,
    fontSize: 10, letterSpacing: 0.4,
  },

  intro: { marginBottom: spacing.md },
  introText: { ...typography.body, color: palette.ash, fontSize: 13, lineHeight: 20 },

  bubble: {
    maxWidth: '88%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radii.md, marginBottom: spacing.sm,
  },
  bubbleUser: {
    alignSelf: 'flex-end', backgroundColor: palette.goldLight,
    borderWidth: 1, borderColor: palette.lineGold,
  },
  bubbleAI: {
    alignSelf: 'flex-start', backgroundColor: palette.graphite,
    borderWidth: 1, borderColor: palette.line,
  },
  bubbleUserText: { ...typography.body, color: palette.ivory, fontSize: 13.5 },
  bubbleAIText: { ...typography.body, color: palette.ivory, fontSize: 13.5, lineHeight: 20 },

  quickRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs,
    paddingHorizontal: spacing.lg, marginBottom: spacing.sm,
  },
  quickChip: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radii.pill, backgroundColor: palette.charcoal,
  },
  quickText: { ...typography.caption, color: palette.ash, fontSize: 11 },

  examsLink: {
    paddingHorizontal: spacing.lg, paddingBottom: spacing.xs,
  },
  examsLinkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    backgroundColor: palette.graphite, borderRadius: radii.sm,
    borderWidth: 1, borderColor: palette.line,
  },
  examsLinkText: {
    flex: 1, ...typography.label,
    color: palette.ivory, fontSize: 11, letterSpacing: 0.8,
  },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: palette.line,
  },
  input: {
    flex: 1, ...typography.body, color: palette.ivory, fontSize: 14,
    backgroundColor: palette.graphite, borderRadius: radii.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: palette.line, maxHeight: 100, minHeight: 44,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center',
  },

  // ── Consent gate ───────────────────────────────────────────────────────────
  consentTitle: {
    fontFamily: Fonts.display, color: palette.ivory,
    fontSize: 18, letterSpacing: 0.5, marginBottom: spacing.xs,
  },
  consentBody: { ...typography.body, color: palette.ash, fontSize: 13, lineHeight: 21 },
  consentEmph: { color: palette.goldText, fontFamily: Fonts.sansBold },
  consentBullets: { gap: spacing.xs, marginTop: spacing.xs },
  consentBullet: { ...typography.caption, color: palette.ash, fontSize: 12 },
  consentBtn: {
    marginTop: spacing.md, backgroundColor: palette.gold,
    paddingVertical: spacing.md, borderRadius: radii.sm,
    alignItems: 'center', justifyContent: 'center', minHeight: 48,
  },
  consentBtnText: {
    fontFamily: Fonts.display, color: palette.ink,
    fontSize: 13, letterSpacing: 1.2,
  },
  consentSkip: {
    textAlign: 'center', ...typography.caption,
    color: palette.smoke, fontSize: 12, paddingTop: spacing.sm,
  },
});
