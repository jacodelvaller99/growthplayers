/**
 * Espacio del Mentor — modo simple, un cliente a la vez.
 *
 * El mentor escribe: notas de sesión con autosave (nunca hay que acordarse de
 * guardar), el plan de acción de la semana, y un copiloto de IA que trae la
 * agenda + el briefing del cliente y responde en contexto. El dossier
 * completo (`/admin/usuarios/[id]`) queda a un toque, para todo lo demás.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ENV } from '@/app/config/env';
import { LensTabs, type Lens } from '@/components/focus-deck';
import { PremiumCard, StatusPill, useScreen } from '@/components/polaris';
import ErrorState from '@/components/ErrorState';
import { NextMentorshipAgendaCard } from '@/components/mentor-execution';
import { AdminBriefingCard, ConversationTimeline, ProfileSynopsisCard } from '@/components/memory';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { useAdminRole } from '@/hooks/use-admin-role';
import { parseAIList, PLAN_PROMPT_TAIL } from '@/hooks/use-mentorship';
import { TOTAL_WEEKS } from '@/data/mentorship';
import { logSilentError } from '@/lib/observability';
import { deskClientId, deskWeek, splitWeekSessions } from '@/lib/mentorDeskLogic';
import { streamClientDesk, type ClientDeskContext, type CopilotTurn } from '@/lib/adminCopilot';
import { adminUpdateActionPlan, adminUpsertSessionNote } from '@/lib/admin/actions';
import {
  fetchUserDetail, fetchUserMentorship, fetchUserMemory,
  type AdminMentorshipSession, type UserMemoryBundle,
} from '@/lib/admin/queries';
import type { AdminUserDetail } from '@/lib/admin/types';
import { fetchUserExecution, insertTask, stableId, updateTask, type ExecutionBundle, type MentorTask } from '@/lib/mentorExecution';
import { deriveStatus } from '@/lib/mentorExecutionLogic';
import { extractSection, splitList } from '@/lib/memoryLogic';

const MOMENTUM_LABEL: Record<string, string> = {
  rising: 'ASCENSO', stable: 'ESTABLE', fragile: 'FRÁGIL', declining: 'CAÍDA', critical: 'CRÍTICO',
};
const CHAT_QUICK = ['¿Qué confronto hoy?', 'Dame 3 preguntas para la sesión', 'Resume su semana'];
// Última vez que se INTENTÓ auto-regenerar el briefing de cada cliente, en este
// módulo (sobrevive a remounts de la pantalla, se resetea al recargar la app).
// Sin este guard, cada vez que el mentor abre/cierra el Espacio dispara una
// llamada a IA — el auto-briefing (Fase 2 del ecosistema) no debe quemar
// tokens en cada remount, solo cuando de verdad hay novedades y hace rato que
// no se regenera.
const BRIEFING_REGEN_COOLDOWN_MS = 60 * 60 * 1000; // 1h
const briefingRegenAttempts = new Map<string, number>();

// Mensaje honesto cuando falta EXPO_PUBLIC_AI_PROXY_URL — sin esto, el briefing
// y el plan con Norman caían a la simulación local (voz de Norman al cliente,
// sin estructura) y el usuario veía "reintenta" como si fuera un fallo
// transitorio, cuando en realidad es config faltante.
const AI_NOT_CONFIGURED = 'La IA no está configurada en este entorno (falta EXPO_PUBLIC_AI_PROXY_URL) — no es un fallo transitorio, no sirve reintentar.';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type NormalizedPlanItem = { text: string; week?: number | null; source?: string; done?: boolean };

// action_plan es jsonb heterogéneo (strings u objetos {title|task|text}) — mismo
// patrón de normalización que app/admin/usuarios/[id].tsx, duplicado aquí porque
// allá no está exportado (12 líneas — no vale la pena un módulo compartido por esto).
function planItemLabel(it: unknown): string {
  if (typeof it === 'string') return it;
  const o = it as { title?: string; task?: string; text?: string } | null;
  return o?.title ?? o?.task ?? o?.text ?? JSON.stringify(it);
}
function normalizePlan(arr: unknown[], week: number | null): NormalizedPlanItem[] {
  return arr.map((it) => {
    const o = (typeof it === 'object' && it ? it : {}) as { week?: number | null; source?: string; done?: boolean };
    return { text: planItemLabel(it), week: o.week ?? week, source: o.source ?? 'manual', done: Boolean(o.done) };
  });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}
// Copiloto de sesión (Fase 3 del plan — "reparte en los apartados"): si la
// respuesta trae un bloque ===ACCIONES=== (instrucción en buildClientDeskPrompt,
// lib/adminCopilot.ts), se parsea con los MISMOS extractSection/splitList que ya
// usa memorySummarizer — no se reinventa el parser. El texto mostrado en la
// burbuja se recorta antes del bloque: el mentor lee prosa, no la sintaxis del
// marcador.
function chatActions(fullText: string): string[] {
  return splitList(extractSection(fullText, 'ACCIONES'));
}
function chatDisplayText(fullText: string): string {
  return fullText.split(/===\s*ACCIONES\s*===/i)[0].trim();
}
/** Refleja localmente el resultado de un upsert exitoso — sin refetch. */
function mergeDeskSession(prev: AdminMentorshipSession[], week: number, text: string, id: string): AdminMentorshipSession[] {
  const cid = deskClientId(week);
  const idx = prev.findIndex((s) => s.client_id === cid);
  if (idx === -1) {
    return [{ id, week, session_date: new Date().toISOString().split('T')[0], notes: text, action_plan: [], created_at: new Date().toISOString(), client_id: cid }, ...prev];
  }
  const next = [...prev];
  next[idx] = { ...next[idx], notes: text, id };
  return next;
}

export default function MentorDeskScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: userId } = useLocalSearchParams<{ id: string }>();
  const { userId: adminId, state } = useLifeFlow();
  const role = useAdminRole();

  const [client, setClient] = useState<AdminUserDetail | null>(null);
  const [sessions, setSessions] = useState<AdminMentorshipSession[]>([]);
  const [execution, setExecution] = useState<ExecutionBundle>({ tasks: [], scores: null, reviews: [], prep: null });
  const [memory, setMemory] = useState<UserMemoryBundle>({ profile: null, summaries: [], briefing: null, notes: [] });
  const [loading, setLoading] = useState(true);
  const [genBrief, setGenBrief] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);

  const [week, setWeek] = useState(1);
  const [text, setText] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [expandedPrev, setExpandedPrev] = useState<Set<string>>(new Set());

  const [planBusy, setPlanBusy] = useState(false);
  const [planGenBusy, setPlanGenBusy] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planDraftOpen, setPlanDraftOpen] = useState(false);
  const [planItemText, setPlanItemText] = useState('');
  const [taskBusy, setTaskBusy] = useState<string | null>(null);

  const [chatTurns, setChatTurns] = useState<CopilotTurn[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatStreaming, setChatStreaming] = useState(false);
  const [chatStreamText, setChatStreamText] = useState('');
  // Índice de la burbuja cuyas ===ACCIONES=== se están aplicando — deshabilita
  // AMBOS botones de esa burbuja mientras dura, ninguna otra.
  const [applyingChat, setApplyingChat] = useState<number | null>(null);
  const [chatApplyError, setChatApplyError] = useState<string | null>(null);
  const chatAbortRef = useRef<AbortController | null>(null);
  const chatScrollRef = useRef<ScrollView | null>(null);

  // Semana visible en refs (no state) para que el autosave siempre lea la última
  // — un debounce/blur/unmount puede disparar después de que el usuario ya
  // cambió de semana o de pantalla.
  const weekRef = useRef(week);
  weekRef.current = week;
  const latestRef = useRef({ adminId, userId });
  latestRef.current = { adminId, userId };
  const draftsRef = useRef<Map<number, string>>(new Map());
  const savedRef = useRef<Map<number, string>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const pendingRef = useRef<{ week: number; text: string } | null>(null);

  // Ecosistema que se alimenta solo (Fase 2 del plan): el briefing YA NO
  // depende exclusivamente del clic manual en GENERAR. Si no existe, o si hay
  // un resumen del Memory OS más nuevo que el briefing guardado, se regenera
  // en segundo plano al abrir el Espacio — sin bloquear el paint, con cooldown
  // de 1h por cliente para no quemar tokens en cada remount. Declarado ANTES
  // de `load` (que lo llama) para poder listarlo en su dependency array.
  const maybeAutoRegenBriefing = useCallback(async (uid: string, mem: UserMemoryBundle, clientName?: string) => {
    if (!ENV.aiProxyUrl) return; // sin proxy, ni lo intenta — ver Fase 1 (fallback honesto)
    const latestSummaryAt = mem.summaries[0]?.created_at;
    const stale = !mem.briefing
      || (!mem.briefing.generated_at && !!latestSummaryAt)
      || (!!latestSummaryAt && !!mem.briefing.generated_at && new Date(latestSummaryAt) > new Date(mem.briefing.generated_at));
    if (!stale) return;
    const lastAttempt = briefingRegenAttempts.get(uid) ?? 0;
    if (Date.now() - lastAttempt < BRIEFING_REGEN_COOLDOWN_MS) return;
    briefingRegenAttempts.set(uid, Date.now());
    setGenBrief(true);
    try {
      const { generateAdminBriefing } = await import('@/lib/memorySummarizer');
      const result = await generateAdminBriefing(uid, { userName: clientName });
      if (result && latestRef.current.userId === uid) {
        setMemory(await fetchUserMemory(uid));
      }
    } catch (e) {
      logSilentError('mentorDesk.autoBriefing', e);
    } finally {
      if (latestRef.current.userId === uid) setGenBrief(false);
    }
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    const [detail, mentorship, exec, mem] = await Promise.all([
      fetchUserDetail(userId),
      fetchUserMentorship(userId),
      fetchUserExecution(userId),
      fetchUserMemory(userId),
    ]);
    setClient(detail);
    setSessions(mentorship.sessions);
    setExecution(exec);
    setMemory(mem);
    const w = deskWeek(detail?.created_at, mentorship.sessions);
    setWeek(w);
    weekRef.current = w;
    const { draft } = splitWeekSessions(mentorship.sessions, w);
    const loaded = draft?.notes ?? '';
    draftsRef.current.set(w, loaded);
    savedRef.current.set(w, loaded);
    setText(loaded);
    setLoading(false);
    void maybeAutoRegenBriefing(userId, mem, detail?.name);
  }, [userId, maybeAutoRegenBriefing]);

  useEffect(() => { load(); }, [load]);

  const persist = useCallback(async (w: number, t: string) => {
    const { adminId: aId, userId: uId } = latestRef.current;
    if (!aId || !uId) return;
    if (inFlightRef.current) { pendingRef.current = { week: w, text: t }; return; }
    inFlightRef.current = true;
    if (weekRef.current === w) setSaveState('saving');
    try {
      const res = await adminUpsertSessionNote({ adminId: aId, userId: uId, week: w, text: t });
      if (!res.success || !res.sessionId) throw new Error(res.error ?? 'No se pudo guardar');
      savedRef.current.set(w, t);
      setSessions((prev) => mergeDeskSession(prev, w, t, res.sessionId!));
      if (weekRef.current === w) setSaveState('saved');
    } catch (e) {
      logSilentError('mentorDesk.autosave', e);
      if (weekRef.current === w) setSaveState('error');
    } finally {
      inFlightRef.current = false;
      const pending = pendingRef.current;
      if (pending) { pendingRef.current = null; void persist(pending.week, pending.text); }
    }
  }, []);

  // Flush al desmontar: si queda un cambio sin guardar (usuario cerró la
  // pestaña o navegó fuera durante el debounce), lo mandamos igual.
  // ponytail: fire-and-forget best-effort — si la red también se cae en ese
  // instante el delta se pierde; el upgrade es lib/offlineQueue con el mismo
  // upsert idempotente por client_id.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const w = weekRef.current;
      // Se quiere el valor MÁS RECIENTE del Map al desmontar, no uno capturado
      // en el momento del efecto — por eso .current se lee dentro del cleanup.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const dirty = draftsRef.current.get(w) ?? '';
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (dirty !== (savedRef.current.get(w) ?? '')) {
        const { adminId: aId, userId: uId } = latestRef.current;
        if (aId && uId) void adminUpsertSessionNote({ adminId: aId, userId: uId, week: w, text: dirty }).catch(() => {});
      }
    };
  }, []);

  const deskContext: ClientDeskContext = useMemo(() => ({
    adminName: state.profile?.name,
    clientName: client?.name ?? 'el cliente',
    week,
    agenda: execution.prep ? [
      execution.prep.execution_state,
      ...execution.prep.said_would_do.map((x) => `Dijo que haría: ${x}`),
      ...execution.prep.actually_did.map((x) => `Hizo: ${x}`),
      ...(execution.prep.challenge ? [`Confrontar: ${execution.prep.challenge}`] : []),
      ...execution.prep.top_questions,
    ] : [],
    briefing: memory.briefing ? [
      ...(memory.briefing.summary ? [memory.briefing.summary] : []),
      ...(memory.briefing.suggested_mentorship_topics ?? []),
    ] : [],
    notesExcerpt: text.slice(0, 500),
  }), [state.profile?.name, client?.name, week, execution.prep, memory.briefing, text]);

  const openTasks = useMemo(
    () => execution.tasks.filter((t) => { const st = deriveStatus(t); return st !== 'completed' && st !== 'canceled'; }).slice(0, 8),
    [execution.tasks],
  );

  if (loading) {
    return (
      <View style={[sc.root, s.center]}>
        <ActivityIndicator color={palette.goldText} size="large" />
        <Text style={s.loadingText}>Cargando espacio del mentor...</Text>
      </View>
    );
  }

  // `client === null` tras terminar la carga (no durante) — pasa cuando
  // fetchUserDetail no encuentra fila en user_progress para este user_id.
  // Antes esto dejaba el spinner girando para siempre, sin mensaje.
  if (!client) {
    return (
      <View style={[sc.root, s.center]}>
        <ErrorState message="No pudimos cargar este cliente. Puede que ya no exista o que no tengas acceso." onRetry={load} />
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Volver" style={s.errorBack}>
          <Text style={s.errorBackText}>← VOLVER</Text>
        </Pressable>
      </View>
    );
  }

  // ── Editor: autosave ──────────────────────────────────────────────────────
  const applyText = (next: string) => {
    setText(next);
    draftsRef.current.set(week, next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void persist(week, next); }, 1500);
  };
  const flushIfDirty = (w: number) => {
    const dirty = draftsRef.current.get(w) ?? '';
    if (dirty !== (savedRef.current.get(w) ?? '')) void persist(w, dirty);
  };
  const onBlurEditor = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    flushIfDirty(week);
  };
  const selectWeek = (w: number) => {
    if (w === week) return;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    flushIfDirty(week);
    setWeek(w);
    weekRef.current = w;
    setSaveState('idle');
    const cached = draftsRef.current.get(w);
    if (cached !== undefined) {
      setText(cached);
    } else {
      const { draft } = splitWeekSessions(sessions, w);
      const loaded = draft?.notes ?? '';
      draftsRef.current.set(w, loaded);
      savedRef.current.set(w, loaded);
      setText(loaded);
    }
  };
  const retrySave = () => { void persist(week, draftsRef.current.get(week) ?? text); };

  // ── Plan de acción ────────────────────────────────────────────────────────
  const currentSessionId = splitWeekSessions(sessions, week).draft?.id ?? null;
  const currentPlan = normalizePlan(sessions.find((s) => s.id === currentSessionId)?.action_plan ?? [], week);

  const ensureSessionId = async (): Promise<string | null> => {
    if (currentSessionId) return currentSessionId;
    const { adminId: aId, userId: uId } = latestRef.current;
    if (!aId || !uId) return null;
    const t = draftsRef.current.get(week) ?? text;
    const res = await adminUpsertSessionNote({ adminId: aId, userId: uId, week, text: t });
    if (!res.success || !res.sessionId) return null;
    savedRef.current.set(week, t);
    setSessions((prev) => mergeDeskSession(prev, week, t, res.sessionId!));
    return res.sessionId;
  };
  const savePlanItems = async (sessionId: string, items: NormalizedPlanItem[]) => {
    const { adminId: aId, userId: uId } = latestRef.current;
    if (!aId || !uId) return;
    setPlanBusy(true);
    setPlanError(null);
    try {
      const res = await adminUpdateActionPlan({ adminId: aId, userId: uId, sessionId, actionPlan: items });
      if (!res.success) { setPlanError(res.error ?? 'No se pudo guardar el plan'); return; }
      setSessions((prev) => prev.map((sx) => (sx.id === sessionId ? { ...sx, action_plan: items } : sx)));
    } finally {
      setPlanBusy(false);
    }
  };
  const addPlanItem = async () => {
    const t = planItemText.trim();
    if (!t) { setPlanDraftOpen(false); return; }
    const sessionId = await ensureSessionId();
    if (!sessionId) { setPlanError('No se pudo preparar la sesión.'); return; }
    await savePlanItems(sessionId, [...currentPlan, { text: t, week, source: 'manual', done: false }]);
    setPlanItemText('');
    setPlanDraftOpen(false);
  };
  const togglePlanItem = (i: number) => {
    if (!currentSessionId) return;
    void savePlanItems(currentSessionId, currentPlan.map((p, j) => (j === i ? { ...p, done: !p.done } : p)));
  };
  const removePlanItem = (i: number) => {
    if (!currentSessionId) return;
    void savePlanItems(currentSessionId, currentPlan.filter((_, j) => j !== i));
  };
  const generatePlanWithNorman = async () => {
    const notes = (draftsRef.current.get(week) ?? text).trim();
    if (!notes || planGenBusy) return;
    setPlanGenBusy(true);
    setPlanError(null);
    if (!ENV.aiProxyUrl) {
      // Cortar ANTES de streamMentorResponse — sin esto caía a la simulación
      // local, parseAIList devolvía 0 ítems, y el mensaje decía "reintenta"
      // para un problema de config, no transitorio.
      setPlanError(AI_NOT_CONFIGURED);
      setPlanGenBusy(false);
      return;
    }
    try {
      const sessionId = await ensureSessionId();
      if (!sessionId) { setPlanError('No se pudo preparar la sesión.'); return; }
      const { streamMentorResponse } = await import('@/lib/mentor');
      const { makeMinimalContext } = await import('@/lib/memorySummarizer');
      const ctx = makeMinimalContext(client.name ?? undefined);
      const prompt =
        'A partir de estas NOTAS de la sesión de mentoría del cliente, construye su PLAN DE ACCIÓN para la próxima semana. ' +
        PLAN_PROMPT_TAIL + '\n\nNOTAS:\n' + notes;
      let out = '';
      await streamMentorResponse(ctx, prompt, [], (delta: string) => { out += delta; });
      const items = parseAIList(out).map((t) => ({ text: t, week, source: 'ia', done: false }));
      if (!items.length) { setPlanError('Norman no devolvió acciones — reintenta.'); return; }
      await savePlanItems(sessionId, [...currentPlan, ...items]);
    } catch (e) {
      logSilentError('mentorDesk.planGen', e);
      setPlanError('No se pudo generar el plan.');
    } finally {
      setPlanGenBusy(false);
    }
  };

  const toggleTask = async (task: MentorTask) => {
    if (!task.id || taskBusy) return;
    setTaskBusy(task.id);
    try {
      const ok = await updateTask(task.id, { status: 'completed', completed_at: new Date().toISOString() });
      if (ok) {
        setExecution((prev) => ({
          ...prev,
          tasks: prev.tasks.map((t) => (t.id === task.id ? { ...t, status: 'completed', completed_at: new Date().toISOString() } : t)),
        }));
      }
    } finally {
      setTaskBusy(null);
    }
  };

  const handleGenerateBriefing = async () => {
    if (!userId) return;
    setGenBrief(true);
    setBriefError(null);
    if (!ENV.aiProxyUrl) {
      setBriefError(AI_NOT_CONFIGURED);
      setGenBrief(false);
      return;
    }
    try {
      const { generateAdminBriefing } = await import('@/lib/memorySummarizer');
      const result = await generateAdminBriefing(userId, { userName: client.name });
      if (!result) { setBriefError('No se pudo generar el briefing — reintenta.'); return; }
      setMemory(await fetchUserMemory(userId));
    } finally {
      setGenBrief(false);
    }
  };

  // ── Copiloto de sesión ────────────────────────────────────────────────────
  const chatScrollDown = () => requestAnimationFrame(() => chatScrollRef.current?.scrollToEnd({ animated: true }));
  const sendChat = async (t = chatInput) => {
    const clean = t.trim();
    if (!clean || chatStreaming) return;
    setChatInput('');
    const history = [...chatTurns, { role: 'user' as const, text: clean }];
    setChatTurns(history);
    setChatStreaming(true);
    setChatStreamText('');
    chatScrollDown();
    const controller = new AbortController();
    chatAbortRef.current = controller;
    let full = '';
    try {
      await streamClientDesk(deskContext, clean, chatTurns, (d) => { full += d; setChatStreamText(full); chatScrollDown(); }, controller.signal);
    } catch { /* abort o error: conservamos el parcial */ }
    setChatTurns((prev) => [...prev, { role: 'assistant', text: full || '…' }]);
    setChatStreaming(false);
    setChatStreamText('');
    chatAbortRef.current = null;
    chatScrollDown();
  };

  // Distribución con un toque (Fase 3 del plan): la IA propone en el chat,
  // el mentor decide con el botón — nada se aplica solo. Mismo camino que ya
  // usa el plan manual (ensureSessionId + savePlanItems) y las tareas
  // (insertTask, mismo patrón que normalizeSources en mentorExecution.ts).
  const applyActionsToPlan = async (turnIndex: number, actions: string[]) => {
    if (applyingChat !== null) return;
    setApplyingChat(turnIndex);
    setChatApplyError(null);
    try {
      const sessionId = await ensureSessionId();
      if (!sessionId) { setChatApplyError('No se pudo preparar la sesión.'); return; }
      await savePlanItems(sessionId, [
        ...currentPlan,
        ...actions.map((a) => ({ text: a, week, source: 'copilot', done: false })),
      ]);
    } finally {
      setApplyingChat(null);
    }
  };
  const applyActionsToTasks = async (turnIndex: number, actions: string[]) => {
    if (applyingChat !== null) return;
    const { userId: uId } = latestRef.current;
    if (!uId) return;
    setApplyingChat(turnIndex);
    setChatApplyError(null);
    try {
      for (const a of actions) {
        await insertTask({
          user_id: uId,
          title: a,
          category: 'accountability',
          source_type: 'copilot',
          source_id: stableId('cop', a),
          priority: 'medium',
          status: 'not_started',
          // El mentor clicó CREAR TAREAS — ya es aprobación, a diferencia de
          // los ai_suggested silenciosos de normalizeSources.
          mentor_review_status: 'approved',
        });
      }
      setExecution(await fetchUserExecution(uId));
    } catch (e) {
      logSilentError('mentorDesk.applyActionsToTasks', e);
      setChatApplyError('No se pudieron crear las tareas.');
    } finally {
      setApplyingChat(null);
    }
  };

  const { previous } = splitWeekSessions(sessions, week);
  const weekChips = [week - 1, week, week + 1].filter((w) => w >= 1 && w <= TOTAL_WEEKS);
  const momentum = execution.scores?.weekly_momentum_state;

  const renderEditor = () => (
    <View>
      <View style={s.editorTopRow}>
        <View style={s.weekChips}>
          {weekChips.map((w) => (
            <Pressable
              key={w} onPress={() => selectWeek(w)}
              style={[s.weekChip, w === week && s.weekChipOn]}
              accessibilityRole="button" accessibilityState={{ selected: w === week }} accessibilityLabel={`Semana ${w}`}>
              <Text style={[s.weekChipText, w === week && s.weekChipTextOn]}>SEM {w}</Text>
            </Pressable>
          ))}
        </View>
        {saveState === 'saving' && <Text style={s.saveIndicator}>GUARDANDO…</Text>}
        {saveState === 'saved' && <Text style={[s.saveIndicator, { color: palette.success }]}>GUARDADO ✓</Text>}
        {saveState === 'error' && (
          <Pressable onPress={retrySave} hitSlop={6} accessibilityRole="button" accessibilityLabel="Reintentar guardado">
            <Text style={[s.saveIndicator, { color: palette.danger }]}>ERROR — REINTENTAR</Text>
          </Pressable>
        )}
      </View>
      <PremiumCard style={s.editorCard}>
        <TextInput
          value={text}
          onChangeText={applyText}
          onBlur={onBlurEditor}
          placeholder="Escribe lo de la sesión: qué se trabajó, mejoras, compromisos…"
          placeholderTextColor={palette.smoke}
          multiline
          textAlignVertical="top"
          style={[s.editorInput, { minHeight: sc.isDesktop ? 420 : 280 }]}
          accessibilityLabel="Notas de la sesión"
        />
      </PremiumCard>
      {previous.length > 0 && (
        <View style={{ marginTop: spacing.md, gap: 4 }}>
          <Text style={s.subLabel}>NOTAS ANTERIORES</Text>
          {previous.map((sess) => {
            const open = expandedPrev.has(sess.id);
            const firstLine = sess.notes?.split('\n')[0] || '(sin notas)';
            return (
              <Pressable
                key={sess.id}
                onPress={() => setExpandedPrev((prev) => {
                  const next = new Set(prev);
                  if (next.has(sess.id)) next.delete(sess.id); else next.add(sess.id);
                  return next;
                })}
                style={s.prevRow}
                accessibilityRole="button"
                accessibilityLabel={`Sesión semana ${sess.week ?? '—'}. ${open ? 'Contraer' : 'Expandir'}`}>
                <Text style={s.prevMeta}>
                  SEMANA {sess.week ?? '—'} · {sess.session_date ? formatDate(sess.session_date) : formatDate(sess.created_at)}
                </Text>
                <Text style={s.prevText} numberOfLines={open ? undefined : 1}>{open ? (sess.notes || '(sin notas)') : firstLine}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderPlan = () => (
    <PremiumCard style={s.sideCard}>
      <Text style={s.cardLabel}>PLAN DE ACCIÓN · SEMANA {week}</Text>
      {planError && <Text style={s.planError}>{planError}</Text>}
      {currentPlan.length === 0 ? (
        <Text style={s.emptyText}>Sin acciones todavía.</Text>
      ) : (
        <View style={{ gap: 6 }}>
          {currentPlan.map((item, i) => (
            <View key={i} style={s.planRow}>
              <Pressable
                onPress={() => togglePlanItem(i)} disabled={planBusy} hitSlop={6}
                accessibilityRole="checkbox" accessibilityState={{ checked: item.done }} accessibilityLabel={`Marcar acción ${item.text}`}>
                <MaterialIcons name={item.done ? 'check-circle' : 'radio-button-unchecked'} size={16} color={item.done ? palette.success : palette.goldText} />
              </Pressable>
              <Text style={[s.planText, item.done && s.planTextDone]}>{item.text}</Text>
              <Pressable onPress={() => removePlanItem(i)} disabled={planBusy} hitSlop={6} accessibilityRole="button" accessibilityLabel="Quitar acción">
                <MaterialIcons name="close" size={14} color={palette.smoke} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {planDraftOpen ? (
        <View style={s.planAddRow}>
          <TextInput
            value={planItemText}
            onChangeText={setPlanItemText}
            placeholder="Nueva acción…"
            placeholderTextColor={palette.smoke}
            style={s.planAddInput}
            autoFocus
            onSubmitEditing={addPlanItem}
          />
          <Pressable onPress={addPlanItem} hitSlop={6} accessibilityRole="button" accessibilityLabel="Agregar acción">
            <MaterialIcons name="check" size={18} color={palette.goldText} />
          </Pressable>
        </View>
      ) : (
        <View style={s.planActionsRow}>
          <Pressable
            onPress={() => { setPlanItemText(''); setPlanDraftOpen(true); }} disabled={planBusy}
            style={s.planActionBtn} accessibilityRole="button" accessibilityLabel="Agregar acción al plan">
            <MaterialIcons name="add" size={14} color={palette.goldText} />
            <Text style={s.planActionText}>ACCIÓN</Text>
          </Pressable>
          <Pressable
            onPress={generatePlanWithNorman} disabled={planGenBusy || !text.trim()}
            style={[s.planActionBtn, (planGenBusy || !text.trim()) && { opacity: 0.4 }]}
            accessibilityRole="button" accessibilityLabel="Generar plan con Norman">
            {planGenBusy ? <ActivityIndicator size={12} color={palette.goldText} /> : <MaterialIcons name="auto-awesome" size={14} color={palette.goldText} />}
            <Text style={s.planActionText}>PLAN CON NORMAN</Text>
          </Pressable>
        </View>
      )}

      <Text style={[s.cardLabel, { marginTop: spacing.lg }]}>TAREAS ABIERTAS</Text>
      {openTasks.length === 0 ? (
        <Text style={s.emptyText}>Sin tareas operativas abiertas.</Text>
      ) : (
        openTasks.map((t) => (
          <Pressable
            key={t.id} style={s.taskRow} disabled={taskBusy === t.id} onPress={() => toggleTask(t)}
            accessibilityRole="checkbox" accessibilityState={{ checked: false }} accessibilityLabel={`Marcar tarea completada: ${t.title}`}>
            {taskBusy === t.id
              ? <ActivityIndicator size={16} color={palette.goldText} />
              : <MaterialIcons name="radio-button-unchecked" size={16} color={palette.smoke} />}
            <Text style={s.taskTitle} numberOfLines={2}>{t.title}</Text>
          </Pressable>
        ))
      )}
    </PremiumCard>
  );

  const renderIA = () => (
    <View style={{ gap: spacing.md }}>
      {/* Un mentor restringido (no-admin) no tiene RLS sobre user_intelligence
          ni las tablas de Confrontation OS — a propósito, esa es la frontera
          de privacidad que fija la migración 20260822 (el dossier completo NO
          se toca desde el rango mentor). Antes esto degradaba en silencio
          (churn=0, fricciones=[]) y parecía que el cliente estaba perfecto.
          Ahora se dice explícito, en vez de fingir que no falta nada. */}
      {role === 'mentor' && (
        <Text style={s.mentorScopeNote}>
          Como mentor ves agenda y briefing calculados sin riesgo de abandono ni fricciones DIJO-vs-HIZO — esas dos señales requieren acceso de admin.
        </Text>
      )}
      <NextMentorshipAgendaCard prep={execution.prep} />
      <AdminBriefingCard briefing={memory.briefing} generating={genBrief} onGenerate={handleGenerateBriefing} />
      {briefError && <Text style={s.planError}>{briefError}</Text>}
      <ProfileSynopsisCard profile={memory.profile} variant="admin" />
      <ConversationTimeline summaries={memory.summaries} variant="admin" />

      <PremiumCard style={s.sideCard}>
        <Text style={s.cardLabel}>COPILOTO DE SESIÓN</Text>
        <ScrollView ref={chatScrollRef} style={s.chatScroll} showsVerticalScrollIndicator={false}>
          {chatTurns.length === 0 && !chatStreaming && (
            <Text style={s.emptyText}>Pregunta qué confrontar, qué preguntar, o pide un resumen de la semana.</Text>
          )}
          {chatTurns.map((t, i) => {
            const displayText = t.role === 'assistant' ? chatDisplayText(t.text) : t.text;
            const actions = t.role === 'assistant' ? chatActions(t.text) : [];
            const busy = applyingChat === i;
            return (
              <View key={i} style={[s.bubble, t.role === 'user' ? s.bubbleUser : s.bubbleAI]}>
                <Text style={t.role === 'user' ? s.bubbleUserText : s.bubbleAIText}>{displayText}</Text>
                {t.role === 'assistant' && (
                  <View style={s.bubbleActionsRow}>
                    <Pressable
                      onPress={() => applyText(text ? `${text}\n\n${displayText}` : displayText)}
                      hitSlop={6} style={s.useInNotes} accessibilityRole="button" accessibilityLabel="Usar en notas">
                      <MaterialIcons name="content-paste" size={12} color={palette.goldText} />
                      <Text style={s.useInNotesText}>USAR EN NOTAS</Text>
                    </Pressable>
                    {/* Distribución con un toque — solo aparece si el copiloto
                        propuso ===ACCIONES===. La IA propone, el mentor
                        decide: nada se aplica sin este clic. */}
                    {actions.length > 0 && (
                      <>
                        <Pressable
                          onPress={() => applyActionsToPlan(i, actions)}
                          disabled={busy}
                          hitSlop={6} style={[s.useInNotes, busy && { opacity: 0.5 }]}
                          accessibilityRole="button" accessibilityLabel={`Añadir ${actions.length} acciones al plan`}>
                          <MaterialIcons name="playlist-add" size={12} color={palette.goldText} />
                          <Text style={s.useInNotesText}>AÑADIR AL PLAN ({actions.length})</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => applyActionsToTasks(i, actions)}
                          disabled={busy}
                          hitSlop={6} style={[s.useInNotes, busy && { opacity: 0.5 }]}
                          accessibilityRole="button" accessibilityLabel={`Crear ${actions.length} tareas`}>
                          <MaterialIcons name="add-task" size={12} color={palette.goldText} />
                          <Text style={s.useInNotesText}>CREAR TAREAS ({actions.length})</Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                )}
              </View>
            );
          })}
          {chatApplyError && <Text style={s.planError}>{chatApplyError}</Text>}
          {chatStreaming && (
            <View style={[s.bubble, s.bubbleAI]} accessibilityLiveRegion="polite">
              <Text style={s.bubbleAIText}>{chatStreamText || '…'}</Text>
            </View>
          )}
        </ScrollView>
        {chatTurns.length === 0 && (
          <View style={s.quickRow}>
            {CHAT_QUICK.map((q) => (
              <Pressable key={q} onPress={() => sendChat(q)} style={s.quickChip} accessibilityRole="button" accessibilityLabel={`Preguntar: ${q}`}>
                <Text style={s.quickText}>{q}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <View style={s.chatInputRow}>
          <TextInput
            style={s.chatInput}
            placeholder="Pregúntale al copiloto…"
            placeholderTextColor={palette.smoke}
            value={chatInput}
            onChangeText={setChatInput}
            editable={!chatStreaming}
            onSubmitEditing={() => sendChat()}
            returnKeyType="send"
            accessibilityLabel="Pregúntale al copiloto de sesión"
          />
          <Pressable
            onPress={() => (chatStreaming ? chatAbortRef.current?.abort() : sendChat())}
            style={s.chatSendBtn} accessibilityRole="button" accessibilityLabel={chatStreaming ? 'Detener' : 'Enviar'}>
            {chatStreaming ? <MaterialIcons name="stop" size={18} color={palette.ink} /> : <MaterialIcons name="arrow-upward" size={18} color={palette.ink} />}
          </Pressable>
        </View>
      </PremiumCard>
    </View>
  );

  return (
    <KeyboardAvoidingView style={sc.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerName} numberOfLines={1}>{client.name}</Text>
          <View style={s.headerPills}>
            <StatusPill label={`SEMANA ${week}`} tone="gold" />
            {!!momentum && (
              <StatusPill label={MOMENTUM_LABEL[momentum] ?? momentum.toUpperCase()} tone={momentum === 'rising' ? 'success' : 'muted'} />
            )}
          </View>
        </View>
        {role === 'admin' && (
          <Pressable
            onPress={() => router.push(`/admin/usuarios/${userId}` as never)}
            style={s.dossierLink} accessibilityRole="button" accessibilityLabel="Abrir dossier completo del cliente">
            <Text style={s.dossierLinkText}>DOSSIER →</Text>
          </Pressable>
        )}
      </View>

      {sc.isDesktop ? (
        <ScrollView
          contentContainerStyle={[sc.content, { maxWidth: 960, paddingBottom: insets.bottom + spacing.xxxl }]}
          showsVerticalScrollIndicator={false}>
          <View style={s.desktopRow}>
            <View style={{ flex: 1.6 }}>{renderEditor()}</View>
            <View style={{ flex: 1, gap: spacing.md }}>{renderPlan()}{renderIA()}</View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xxxl }}
          showsVerticalScrollIndicator={false}>
          <LensTabs
            initial="notas"
            lenses={[
              { id: 'notas', label: 'NOTAS', render: renderEditor } as Lens,
              { id: 'plan', label: 'PLAN', render: renderPlan } as Lens,
              { id: 'ia', label: 'IA', render: renderIA } as Lens,
            ]}
          />
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { ...typography.caption, color: palette.ash },
  errorBack: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.lg },
  errorBackText: { ...typography.label, color: palette.goldText, fontSize: 11, letterSpacing: 1 },
  mentorScopeNote: { ...typography.caption, color: palette.smoke, fontSize: 11, fontStyle: 'italic', lineHeight: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerName: { ...typography.title, color: palette.ivory, fontSize: 18 },
  headerPills: { flexDirection: 'row', gap: spacing.xs, marginTop: 4 },
  dossierLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  dossierLinkText: { ...typography.label, color: palette.goldText, fontSize: 10 },

  desktopRow: { flexDirection: 'row', gap: spacing.xl },

  editorTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  weekChips: { flexDirection: 'row', gap: spacing.xs },
  weekChip: { minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radii.pill, justifyContent: 'center', backgroundColor: palette.charcoal, borderWidth: 1, borderColor: palette.line },
  weekChipOn: { backgroundColor: palette.goldLight, borderColor: palette.gold },
  weekChipText: { ...typography.label, color: palette.ash, fontSize: 10 },
  weekChipTextOn: { color: palette.goldText },
  saveIndicator: { ...typography.caption, color: palette.smoke, fontSize: 11 },

  editorCard: { padding: spacing.lg },
  editorInput: {
    fontFamily: Fonts.sans, fontSize: 16, lineHeight: 26, color: palette.ivory,
    padding: 0, borderWidth: 0,
  },

  subLabel: { ...typography.label, color: palette.smoke, fontSize: 9 },
  prevRow: { paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: palette.lineSoft },
  prevMeta: { ...typography.label, color: palette.smoke, fontSize: 9, marginBottom: 2 },
  prevText: { ...typography.body, color: palette.ash, fontSize: 12.5, lineHeight: 18 },

  sideCard: { padding: spacing.lg, gap: spacing.sm },
  cardLabel: { ...typography.label, color: palette.smoke, fontSize: 9 },
  emptyText: { ...typography.caption, color: palette.smoke, fontStyle: 'italic', fontSize: 12 },
  planError: { ...typography.caption, color: palette.danger, fontSize: 11 },

  planRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  planText: { flex: 1, ...typography.body, color: palette.ivory, fontSize: 13 },
  planTextDone: { color: palette.smoke, textDecorationLine: 'line-through' },
  planAddRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  planAddInput: { flex: 1, ...typography.body, color: palette.ivory, fontSize: 13, minHeight: 36, borderBottomWidth: 1, borderBottomColor: palette.lineGold },
  planActionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  planActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, paddingHorizontal: spacing.sm, borderRadius: radii.sm, borderWidth: 1, borderColor: palette.lineGold },
  planActionText: { ...typography.label, color: palette.goldText, fontSize: 9 },

  taskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: palette.lineSoft },
  taskTitle: { flex: 1, ...typography.body, color: palette.ivory, fontSize: 12.5 },

  chatScroll: { maxHeight: 260 },
  bubble: { maxWidth: '92%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md, marginBottom: spacing.sm },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: palette.goldLight, borderWidth: 1, borderColor: palette.lineGold },
  bubbleAI: { alignSelf: 'flex-start', backgroundColor: palette.graphite, borderWidth: 1, borderColor: palette.line },
  bubbleUserText: { ...typography.body, color: palette.ivory, fontSize: 13 },
  bubbleAIText: { ...typography.body, color: palette.ivory, fontSize: 13, lineHeight: 19 },
  bubbleActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  useInNotes: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  useInNotesText: { ...typography.label, color: palette.goldText, fontSize: 9 },

  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  quickChip: { minHeight: 36, paddingHorizontal: spacing.sm, justifyContent: 'center', borderRadius: radii.pill, backgroundColor: palette.charcoal },
  quickText: { ...typography.caption, color: palette.ash, fontSize: 10 },

  chatInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chatInput: { flex: 1, ...typography.body, color: palette.ivory, fontSize: 13, backgroundColor: palette.graphite, borderRadius: radii.md, paddingHorizontal: spacing.md, minHeight: 40, borderWidth: 1, borderColor: palette.line },
  chatSendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center' },
});
