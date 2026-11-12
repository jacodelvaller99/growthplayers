/**
 * Bienestar — Internista educativo (Cluster B).
 *
 * IA EDUCATIVA basada en evidencia. NO diagnostica. NO prescribe. Deriva al
 * médico ante red-flags. Disclaimer permanente, consent gate antes de activar.
 *
 * Patrón clonado de app/(tabs)/mentor.tsx + app/admin/copilot.tsx, con el system
 * prompt y las salvaguardas específicas del internista (lib/internist.ts).
 */
import { AiConsentGate } from '@/components/AiConsentGate';
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

import { Fila, Pantalla } from '@/components/pantalla';
import { MarkdownText, useScreen } from '@/components/polaris';
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
import { Fuentes } from '@/components/Fuentes';

const QUICK_PROMPTS = [
  '¿Qué significa mi HDL bajo?',
  '¿Qué evidencia hay del ayuno intermitente?',
  '¿Mi HRV en bajada es preocupante?',
  '¿Cómo me preparo para mi próximo análisis?',
];

const STORAGE_KEY = 'internist:consent:v1';

const CONSENT_POINTS = [
  'Te enseña en general; no dice qué tienes tú.',
  'Dice de dónde sale cada dato médico.',
  'Ante una señal de alarma, siempre te manda al médico.',
  'Tus datos son tuyos; puedes borrar todo cuando quieras.',
];

function InternistaScreenInner() {
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
    let forbidden: string[] | undefined;
    try {
      const out = await streamInternistResponse(
        patient,
        clean,
        turns,
        (d) => { full += d; setStreamText(full); scrollDown(); },
        controller.signal,
      );
      // Si el guardarraíl cortó, `out.text` es el correctivo y sustituye al
      // parcial que se alcanzó a pintar — por eso se asigna, no se concatena.
      full = out.text || full;
      lastRedFlags = out.redFlags;
      forbidden = out.forbidden;
    } catch {/* abort o error: conservamos el parcial */}
    setTurns((prev) => [...prev, { role: 'assistant', text: full || '…' }]);
    void persistInternistTurn(userId, 'assistant', full, lastRedFlags, forbidden);
    setStreaming(false);
    setStreamText('');
    abortRef.current = null;
    scrollDown();
  }, [input, streaming, userId, turns, patient, scrollDown]);

  // ── Cabecera con la gramática de `Pantalla` (meta → titular → sub), compacta:
  //    el chat necesita su propio scroll y el campo anclado abajo, así que no
  //    puede vivir dentro del ScrollView de `Pantalla`.
  const header = useMemo(() => (
    <View style={[s.head, { paddingTop: insets.top + 12 }]}>
      <Pressable
        onPress={() => router.back()}
        style={s.backBtn}
        accessibilityRole="button"
        accessibilityLabel="Volver"
        hitSlop={8}>
        <MaterialIcons name="arrow-back" size={22} color={palette.ivory} />
      </Pressable>
      <Text style={s.meta}>INTERNISTA</Text>
      <Text accessibilityRole="header" style={s.title}>Pregunta con calma.</Text>
      <Text style={s.subtitle}>Asistente con IA · no es un médico.</Text>
      <Text style={s.disclaimerText}>
        Educación general — no reemplaza a tu médico tratante.
      </Text>
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
      <Pantalla meta="INTERNISTA" title="Antes de empezar." sub="Asistente con IA · no es un médico.">
        <View style={s.consentBlock}>
          <Text style={s.consentBody}>
            Es una inteligencia artificial que te enseña. Te explica qué significan los
            resultados de tus exámenes y qué se sabe sobre hábitos de vida, citando
            guías médicas reconocidas (por ejemplo, Mayo Clinic).
          </Text>
          <Text style={s.consentBody}>
            <Text style={s.consentEmph}>No es tu médico tratante.</Text> No te diagnostica,
            no te receta, no cambia dosis ni reemplaza una consulta. Si ve una señal de
            alarma (dolor en el pecho, una crisis emocional, un resultado de examen muy
            fuera de lo normal, embarazo y medicamentos juntos, riesgo de un trastorno de
            la conducta alimentaria, entre otras), <Text style={s.consentEmph}>deja de explicar
            y te manda</Text> al médico o a urgencias.
          </Text>
          <Text style={s.consentBody}>
            Lo que escribas con el internista se guarda en tu cuenta para que puedas
            retomar la conversación. Tu equipo de coaches <Text style={s.consentEmph}>NO ve esta
            conversación</Text>. Tus exámenes médicos viven en almacenamiento privado y
            solo los compartes con el coach si lo activas explícitamente más adelante.
          </Text>
        </View>
        <View style={s.consentBullets}>
          {CONSENT_POINTS.map((b, i) => (
            <Text key={b} style={[s.consentBullet, i === CONSENT_POINTS.length - 1 && s.consentBulletLast]}>{b}</Text>
          ))}
        </View>
        <Text style={s.consentSources}>
          Guías que consulta: USPSTF, NIH/MedlinePlus, Mayo Clinic, ACLM, Cochrane, entre otras.
        </Text>
        <Pressable
          onPress={acceptConsent}
          style={s.consentBtn}
          accessibilityRole="button"
          accessibilityLabel="Entiendo y acepto, activar el internista educativo">
          <Text style={s.consentBtnText}>ENTIENDO Y ACEPTO</Text>
        </Pressable>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Ahora no, volver"
          style={s.consentSkipBtn}>
          <Text style={s.consentSkip}>Ahora no</Text>
        </Pressable>
      </Pantalla>
    );
  }

  // ── Chat ─────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={sc.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {header}

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={s.thread}
        showsVerticalScrollIndicator={false}>
        {turns.length === 0 && !streaming && (
          <Text style={s.introText}>
            Hola{patient.name ? `, ${patient.name}` : ''}. Soy el internista educativo
            de Polaris. Puedes preguntarme qué significan tus marcadores, qué dice la
            evidencia sobre un hábito o suplemento, o cómo entender tus métricas de
            wearable. Cito mis fuentes — y cuando algo necesita un médico, te lo digo.
          </Text>
        )}
        {turns.map((t, i) => (
          <View key={i} style={[s.bubble, t.role === 'user' ? s.bubbleUser : s.bubbleAI]}>
            {t.role === 'user'
              ? <Text style={s.bubbleUserText}>{t.text}</Text>
              : <MarkdownText text={t.text} style={s.bubbleAIText} />}
          </View>
        ))}
        {streaming && (
          <View style={[s.bubble, s.bubbleAI]}>
            <MarkdownText text={streamText || '…'} style={s.bubbleAIText} />
          </View>
        )}
        <Fuentes topics={['laboratorio', 'nutricion', 'sueno', 'movimiento', 'suplementos', 'crisis']} />
      </ScrollView>

      {turns.length === 0 && (
        <View style={s.quickRow}>
          {QUICK_PROMPTS.map((q) => (
            <Pressable key={q} onPress={() => send(q)} style={s.quickChip} accessibilityRole="button" accessibilityLabel={q}>
              <Text style={s.quickText}>{q}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={s.examsLink}>
        <Fila
          label="EXÁMENES"
          value="Tus exámenes médicos"
          onPress={() => router.push('/bienestar/examenes' as never)}
          last
        />
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
          accessibilityLabel="Pregunta al internista"
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
  head: {
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
    width: '100%', maxWidth: 720, alignSelf: 'center',
  },
  backBtn: { width: 44, height: 44, marginLeft: -10, alignItems: 'center', justifyContent: 'center' },
  meta: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.ash },
  title: {
    marginTop: spacing.sm, fontFamily: Fonts.displayRegular, fontWeight: '400',
    fontSize: 28, lineHeight: 31, letterSpacing: -0.3, color: palette.ivory,
  },
  subtitle: { marginTop: spacing.sm, fontFamily: Fonts.sans, fontSize: 15, lineHeight: 21, color: palette.ash },
  // Aviso en una línea, sin banda: el amarillo es del botón de enviar.
  disclaimerText: { marginTop: 2, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, color: palette.ash },

  introText: { fontFamily: Fonts.sans, color: palette.ash, fontSize: 15, lineHeight: 23, marginBottom: spacing.md },

  // Medida de lectura: ~68ch. En escritorio el hilo se centra en vez de
  // estirarse a líneas de 150 caracteres.
  thread: { padding: spacing.lg, paddingBottom: spacing.xl, width: '100%', maxWidth: 720, alignSelf: 'center' },
  bubble: {
    maxWidth: '88%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radii.md, marginBottom: spacing.sm,
  },
  bubbleUser: {
    alignSelf: 'flex-end', backgroundColor: palette.goldLight,
    borderWidth: 1, borderColor: palette.lineGold,
  },
  bubbleAI: {
    alignSelf: 'flex-start', width: '100%', maxWidth: 680, backgroundColor: palette.graphite,
    borderWidth: 1, borderColor: palette.line,
  },
  bubbleUserText: { ...typography.body, color: palette.ivory, fontSize: 15, lineHeight: 22 },
  bubbleAIText: { ...typography.body, color: palette.ivory, fontSize: 15, lineHeight: 23 },

  quickRow: {
    paddingHorizontal: spacing.lg, marginBottom: spacing.sm,
    width: '100%', maxWidth: 720, alignSelf: 'center',
  },
  quickChip: {
    minHeight: 44, justifyContent: 'center',
    borderTopWidth: 1, borderTopColor: palette.line,
  },
  quickText: { fontFamily: Fonts.sans, color: palette.ivory, fontSize: 15 },

  examsLink: {
    paddingHorizontal: spacing.lg,
    width: '100%', maxWidth: 720, alignSelf: 'center',
  },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm,
    width: '100%', maxWidth: 720, alignSelf: 'center',
  },
  // 16 px: por debajo, Safari en iOS hace zoom al enfocar el campo.
  input: {
    flex: 1, ...typography.body, color: palette.ivory, fontSize: 16, lineHeight: 22,
    backgroundColor: palette.graphite, borderRadius: radii.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: palette.line, maxHeight: 100, minHeight: 44,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center',
  },

  // ── Consent gate ───────────────────────────────────────────────────────────
  consentBlock: { gap: spacing.md, maxWidth: 640 },
  consentBody: { fontFamily: Fonts.sans, color: palette.ash, fontSize: 15, lineHeight: 23 },
  consentEmph: { color: palette.ivory, fontFamily: Fonts.sansBold },
  consentBullets: { marginTop: spacing.xl, maxWidth: 640 },
  consentBullet: {
    fontFamily: Fonts.sans, color: palette.ivory, fontSize: 16, lineHeight: 22,
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: palette.line,
  },
  consentBulletLast: { borderBottomWidth: 1, borderBottomColor: palette.line },
  consentSources: { marginTop: spacing.md, fontFamily: Fonts.sans, color: palette.smoke, fontSize: 13, lineHeight: 19, maxWidth: 640 },
  consentBtn: {
    marginTop: spacing.xl, backgroundColor: palette.gold, maxWidth: 640, width: '100%',
    paddingVertical: spacing.md, borderRadius: radii.sm,
    alignItems: 'center', justifyContent: 'center', minHeight: 52,
  },
  consentBtnText: {
    fontFamily: Fonts.display, fontWeight: '700', color: palette.ink,
    fontSize: 13, letterSpacing: 1.2,
  },
  consentSkipBtn: { minHeight: 44, maxWidth: 640, width: '100%', justifyContent: 'center', alignItems: 'center', marginTop: spacing.sm },
  consentSkip: { textAlign: 'center', fontFamily: Fonts.sans, color: palette.ash, fontSize: 15 },
});


export default function InternistaScreen() {
  return (
    <AiConsentGate>
      <InternistaScreenInner />
    </AiConsentGate>
  );
}
