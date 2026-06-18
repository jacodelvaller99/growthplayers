/**
 * Admin — Copiloto de decisiones (Cluster A3).
 *
 * IA SOLO para el equipo admin (fraccionada del Norman del cliente). Ensambla
 * señales cross-client (at-risk + ranking + notas) y ayuda a decidir a quién
 * contactar y qué hacer. Cita el dato. Gateado a is_admin por el _layout.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, PremiumCard, useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { fetchAtRiskUsers } from '@/lib/admin/queries';
import { fetchNotesByUsers, type NoteSummary } from '@/lib/memory';
import { fetchUserRanking } from '@/lib/userRanking';
import { DIMENSION_LABEL } from '@/lib/userRankingLogic';
import { streamAdminCopilot, type AdminCopilotContext, type CopilotTurn } from '@/lib/adminCopilot';

const QUICK = ['¿A quién contacto hoy?', '¿Quién está en caída?', 'Resume el estado del equipo'];

export default function AdminCopilotScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useLifeFlow();

  const [ctx, setCtx] = useState<AdminCopilotContext>({});
  const [turns, setTurns] = useState<CopilotTurn[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  // Ensamblar el contexto cross-client una vez.
  useEffect(() => {
    (async () => {
      const [atRisk, ranked] = await Promise.all([
        fetchAtRiskUsers().catch(() => []),
        fetchUserRanking().catch(() => []),
      ]);
      const riskIds = atRisk.map((u) => u.user_id);
      const notesMap: Record<string, NoteSummary> = await fetchNotesByUsers(riskIds).catch(() => ({}));
      const notes = atRisk
        .filter((u) => notesMap[u.user_id]?.last)
        .map((u) => ({ name: u.name ?? 'Usuario', note: notesMap[u.user_id]!.last! }));
      setCtx({
        adminName: state.profile?.name,
        totalUsers: ranked.length,
        atRisk: atRisk.map((u) => ({ name: u.name ?? 'Usuario', churn: u.churn_risk_label, days: u.days_since_last_act })),
        topRanked: ranked.slice(0, 5).map((r) => ({ name: r.name, score: r.score, lead: r.topDriver ? DIMENSION_LABEL[r.topDriver.dimension] : '—' })),
        bottomRanked: ranked.slice(-5).reverse().map((r) => ({ name: r.name, score: r.score })),
        notes,
      });
    })();
  }, [state.profile?.name]);

  const scrollDown = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const send = useCallback(async (text = input) => {
    const clean = text.trim();
    if (!clean || streaming) return;
    setInput('');
    const userTurn: CopilotTurn = { role: 'user', text: clean };
    const history = [...turns, userTurn];
    setTurns(history);
    setStreaming(true);
    setStreamText('');
    scrollDown();

    const controller = new AbortController();
    abortRef.current = controller;
    let full = '';
    try {
      await streamAdminCopilot(ctx, clean, turns, (d) => { full += d; setStreamText(full); scrollDown(); }, controller.signal);
    } catch { /* abort o error: conservamos el parcial */ }
    setTurns((prev) => [...prev, { role: 'assistant', text: full || '…' }]);
    setStreaming(false);
    setStreamText('');
    abortRef.current = null;
    scrollDown();
  }, [input, streaming, turns, ctx, scrollDown]);

  return (
    <KeyboardAvoidingView
      style={sc.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.topRow, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <View>
          <Text style={s.title}>COPILOTO</Text>
          <Text style={s.subtitle}>Decisiones del equipo · solo admin</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}>
        {turns.length === 0 && !streaming && (
          <PremiumCard style={s.intro}>
            <Text style={s.introText}>
              Soy tu copiloto operativo. Veo el estado cross-client (riesgo, ranking, notas).
              Pregúntame a quién contactar, quién está en caída, o pídeme un resumen.
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
          {QUICK.map((q) => (
            <Pressable key={q} onPress={() => send(q)} style={s.quickChip}>
              <Text style={s.quickText}>{q}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <GoldDivider />
      <View style={[s.inputRow, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TextInput
          style={s.input}
          placeholder="Pregúntale al copiloto…"
          placeholderTextColor={palette.smoke}
          value={input}
          onChangeText={setInput}
          editable={!streaming}
          onSubmitEditing={() => send()}
          returnKeyType="send"
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
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title, color: palette.ivory, fontSize: 18, textAlign: 'center' },
  subtitle: { ...typography.caption, color: palette.smoke, fontSize: 10, textAlign: 'center' },
  intro: { marginBottom: spacing.md },
  introText: { ...typography.body, color: palette.ash, fontSize: 13, lineHeight: 20 },
  bubble: { maxWidth: '88%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md, marginBottom: spacing.sm },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: palette.goldLight, borderWidth: 1, borderColor: palette.lineGold },
  bubbleAI: { alignSelf: 'flex-start', backgroundColor: palette.graphite, borderWidth: 1, borderColor: palette.line },
  bubbleUserText: { ...typography.body, color: palette.ivory, fontSize: 13.5 },
  bubbleAIText: { ...typography.body, color: palette.ivory, fontSize: 13.5, lineHeight: 20 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  quickChip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: palette.charcoal },
  quickText: { ...typography.caption, color: palette.ash, fontSize: 11 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  input: { flex: 1, ...typography.body, color: palette.ivory, fontSize: 14, backgroundColor: palette.graphite, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: palette.line, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center' },
});
