/**
 * Admin CMI — Perfil Completo de Usuario
 *
 * Secciones: Identidad · Membresías · Cursos · Intelligence ML ·
 *             Actividad · Conversaciones · Diario · Check-ins ·
 *             Score Soberano · Auditoría
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldAccentCard, GoldDivider, PremiumCard, StatusPill, useScreen } from '@/components/polaris';
import { getTierColor, getTierLabel } from '@/constants/subscriptions';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import {
  fetchMentorConversations,
  fetchUserActivityBundle,
  fetchUserAuditLog,
  fetchUserCheckIns,
  fetchUserDetail,
  fetchUserEvents,
  fetchUserMentorship,
  fetchUserMemory,
} from '@/lib/admin/queries';
import type { AdminMentorshipData, UserActivityBundle, UserMemoryBundle } from '@/lib/admin/queries';
import {
  BodyCard,
  CommunityCard,
  FastingCard,
  FriccionesCard,
  HabitsCard,
  JournalCard,
  NutritionCard,
  SupplementsCard,
  WellnessSessionsCard,
} from '@/components/admin-activity';
import { dismissConfrontation, fetchConfrontationItems } from '@/lib/confrontation';
import type { ConfrontationItem } from '@/lib/confrontationLogic';
import {
  AdminBriefingCard,
  AdminNotesCard,
  CommitmentsCard,
  ConversationTimeline,
  ProfileSynopsisCard,
  RepeatedThemesCard,
} from '@/components/memory';
import { addAdminNote } from '@/lib/memory';
import { PlaudImport } from '@/components/PlaudImport';
// generateAdminBriefing se importa dinámicamente en handleGenerateBriefing —
// el módulo memorySummarizer arrastra el orquestador IA y solo se usa al click.
import {
  ClientTaskList,
  ExecutionScoreCard,
  FailurePatternCard,
  InterventionQueueCard,
  MentorReviewDrawer,
  NextMentorshipAgendaCard,
} from '@/components/mentor-execution';
import { fetchUserExecution, submitReview, type ExecutionBundle, type MentorTask } from '@/lib/mentorExecution';
import { buildInterventions } from '@/lib/mentorExecutionLogic';
import {
  BiometricInsightCard,
  BiometricSparkline,
  ConnectionStatusCard,
  SeedSyntheticControls,
} from '@/components/biometric';
import {
  fetchBiometricSnapshot,
  type BiometricSnapshot,
} from '@/lib/biometric';
// seedSyntheticData / clearSyntheticData se cargan dinámicamente — solo
// activos en QA demos, no en el load inicial del dossier.
import type { Scenario } from '@/lib/biometricSimulator';
import type { AdminUserDetail, AuditLogEntry, LiveEvent, MentorConversation, UserMembership } from '@/lib/admin/types';
import {
  adminAddMentorshipNote,
  adminDeleteMentorshipSession,
  adminToggleMentorshipTask,
  adminUpdateActionPlan,
  deactivateMembership,
  recalculateUserMLAction,
  sendMessageAsNorman,
  setUserRole,
  updateUserProfile,
  APP_ROLE_LABEL,
  type AppRole,
} from '@/lib/admin/actions';
import { parseAIList, PLAN_PROMPT_TAIL } from '@/hooks/use-mentorship';
import { intel } from '@/lib/supabase';
import { generateWeeklySessionIfNeeded } from '@/lib/weekly-session-generator';
import { fetchCoachIntelligence } from '@/lib/coachIntelligence';
import type { CoachIntelligence } from '@/lib/coachIntelligenceLogic';
import { WellbeingAlarmCard, WellbeingDot } from '@/components/admin-decision';
import { wellbeingAlarm, wellbeingScore } from '@/lib/wellbeingLogic';
import {
  ChurnDriversCard,
  CoachNextActionCard,
  RelationalDepthCard,
  WeeklyMomentumCard,
} from '@/components/coach-intelligence';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Agrega los temas más recurrentes de los resúmenes (más frecuentes primero). */
function aggregateThemes(summaries: { key_topics?: string[] }[]): string[] {
  const counts = new Map<string, number>();
  for (const s of summaries) {
    for (const t of s.key_topics ?? []) {
      const k = t.trim();
      if (!k) continue;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t).slice(0, 10);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  if (mins < 1440) return `hace ${Math.floor(mins / 60)}h`;
  return `hace ${Math.floor(mins / 1440)}d`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// action_plan es jsonb heterogéneo (strings u objetos {title|task|text}) — normalizar
// a la forma que escribe el hook del usuario antes de cualquier edición admin.
type NormalizedPlanItem = { text: string; week?: number | null; source?: string; done?: boolean };

function planItemLabel(it: unknown): string {
  if (typeof it === 'string') return it;
  const o = it as { title?: string; task?: string; text?: string } | null;
  return o?.title ?? o?.task ?? o?.text ?? JSON.stringify(it);
}

function normalizePlan(arr: unknown[], week: number | null): NormalizedPlanItem[] {
  return arr.map((it) => {
    const o = (typeof it === 'object' && it ? it : {}) as { week?: number | null; source?: string; done?: boolean };
    return {
      text: planItemLabel(it),
      week: o.week ?? week,
      source: o.source ?? 'manual',
      done: Boolean(o.done),
    };
  });
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={h.row}>
      <Text style={h.title}>{title}</Text>
      {action && (
        <Pressable onPress={onAction} style={h.actionBtn} accessibilityRole="button" accessibilityLabel={action}>
          <Text style={h.actionText}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Section anchors para navegación rápida (chip strip) ────────────────────
const NAV_SECTIONS: { id: string; label: string }[] = [
  { id: 'identity',   label: 'IDENTIDAD' },
  { id: 'memberships',label: 'MEMBRESÍAS' },
  { id: 'ml',         label: 'ML' },
  { id: 'mentorship', label: 'MENTORÍA' },
  { id: 'execution',  label: 'EJECUCIÓN' },
  { id: 'frictions',  label: 'FRICCIONES' },
  { id: 'memory',     label: 'MEMORIA' },
  { id: 'biometrics', label: 'BIOMÉTRICOS' },
  { id: 'body',       label: 'CUERPO' },
  { id: 'reflections',label: 'REFLEXIONES' },
];

// ─── Engagement Gauge ────────────────────────────────────────────────────────

function EngagementGauge({ score }: { score: number }) {
  const pct = Math.min(Math.max(score, 0), 100);
  const col = pct >= 70 ? palette.success : pct >= 40 ? palette.warning : palette.danger;
  return (
    <View style={g.container}>
      <View style={g.track}>
        <View style={[g.fill, { width: `${pct}%` as unknown as number, backgroundColor: col }]} />
      </View>
      <Text style={[g.label, { color: col }]}>{pct}/100</Text>
    </View>
  );
}

// ─── Affinity Bar ─────────────────────────────────────────────────────────────

function AffinityBar({ label, value }: { label: string; value?: number }) {
  const pct = Math.round((value ?? 0) * 100);
  return (
    <View style={ab.row}>
      <Text style={ab.label}>{label}</Text>
      <View style={ab.track}>
        <View style={[ab.fill, { width: `${pct}%` as unknown as number }]} />
      </View>
      <Text style={ab.pct}>{pct}%</Text>
    </View>
  );
}

// ─── Norman message modal ─────────────────────────────────────────────────────

function NormanModal({
  visible,
  onClose,
  onSend,
}: {
  visible: boolean;
  onClose: () => void;
  onSend: (msg: string) => void;
}) {
  const [msg, setMsg] = useState('');
  return (
    <Modal visible={visible} transparent animationType="fade" accessibilityViewIsModal>
      <View style={mo.overlay}>
        <View style={mo.sheet} accessibilityLabel="Enviar mensaje como Norman">
          <Text style={mo.title} accessibilityRole="header">ENVIAR MENSAJE COMO NORMAN</Text>
          <Text style={mo.sub}>El usuario verá esto en su chat con el Mentor</Text>
          <TextInput
            style={mo.input}
            multiline
            numberOfLines={5}
            value={msg}
            onChangeText={setMsg}
            placeholder="Escribe el mensaje..."
            placeholderTextColor={palette.smoke}
          />
          <View style={mo.actions}>
            <Pressable style={mo.cancelBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cancelar">
              <Text style={mo.cancelText}>CANCELAR</Text>
            </Pressable>
            <Pressable
              style={[mo.sendBtn, !msg.trim() && mo.sendBtnDisabled]}
              onPress={() => { if (msg.trim()) { onSend(msg.trim()); setMsg(''); } }}
              accessibilityRole="button"
              accessibilityState={{ disabled: !msg.trim() }}
              accessibilityLabel="Enviar mensaje">
              <Text style={mo.sendText}>ENVIAR</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function UserDetailScreen() {
  const sc = useScreen();
  const { id: userId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId: adminId } = useLifeFlow();

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [viewerSuper, setViewerSuper] = useState(false); // ¿el admin que mira es SuperAdmin?
  const [roleBusy, setRoleBusy] = useState(false);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [conversations, setConversations] = useState<MentorConversation[]>([]);
  const [checkIns, setCheckIns] = useState<{ date: string; energy: number; clarity: number; stress: number; sleep: number }[]>([]);
  const [mentorship, setMentorship] = useState<AdminMentorshipData>({ sessions: [], tasks: [] });
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNorman, setShowNorman] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [expandedConv, setExpandedConv] = useState<string | null>(null);

  // Editar identidad (nombre + etiqueta/rol)
  const [editOpen, setEditOpen] = useState(false);
  const [eName, setEName] = useState('');
  const [eLabel, setELabel] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Weekly session state
  const [weeklySession, setWeeklySession] = useState<{ ai_message: string; week_number: number } | null>(null);
  const [generatingSession, setGeneratingSession] = useState(false);
  const [showWeeklySession, setShowWeeklySession] = useState(false);

  // Memory OS state
  const [memory, setMemory] = useState<UserMemoryBundle>({ profile: null, summaries: [], briefing: null, notes: [] });
  const [genBrief, setGenBrief] = useState(false);
  const [noteBusy, setNoteBusy] = useState(false);

  // Mentor Execution OS state
  const [execution, setExecution] = useState<ExecutionBundle>({ tasks: [], scores: null, reviews: [], prep: null });
  const [reviewTask, setReviewTask] = useState<MentorTask | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);

  // Mentoría operable desde admin (el mentor hace la mentoría POR el cliente)
  const [mentNoteText, setMentNoteText] = useState('');
  const [mentNoteWeek, setMentNoteWeek] = useState('1');
  const [mentNoteBusy, setMentNoteBusy] = useState(false);
  const [mentTaskBusy, setMentTaskBusy] = useState<string | null>(null);
  const [planBusy, setPlanBusy] = useState<string | null>(null);
  const [planItemText, setPlanItemText] = useState('');
  const [planDraftFor, setPlanDraftFor] = useState<string | null>(null);
  const [mentError, setMentError] = useState<string | null>(null);

  // Biometric Intelligence state
  const [bio, setBio] = useState<BiometricSnapshot>({ series: [], latestInsight: null, connections: [] });
  const [seeding, setSeeding] = useState(false);

  // Actividad completa del cliente (cierre del gap "historia completa")
  const [activity, setActivity] = useState<UserActivityBundle>({
    habits: [], habitLogs: [], fasting: [], body: [], nutrition: null, supplements: [],
    journal: [], wellness: [], posts: [], reactionsGiven: 0, dmsSent: 0, dmLastActivity: null,
  });

  // Confrontaciones detectadas (DIJO vs HIZO)
  const [frictions, setFrictions] = useState<ConfrontationItem[]>([]);

  // Coach Intelligence v2 (drivers explicables + momentum + NBA específica)
  const [coachCI, setCoachCI] = useState<CoachIntelligence | null>(null);

  // Section anchors (navegación por chips) — cada sección guarda su Y al onLayout.
  const scrollRef = useRef<ScrollView | null>(null);
  const sectionYs = useRef<Record<string, number>>({});
  const onSectionLayout = useCallback((id: string) => (e: { nativeEvent: { layout: { y: number } } }) => {
    sectionYs.current[id] = e.nativeEvent.layout.y;
  }, []);
  const scrollToSection = useCallback((id: string) => {
    const y = sectionYs.current[id];
    if (y == null) return;
    // -56: deja espacio para el strip sticky.
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 56), animated: true });
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    const [userDetail, evts, convs, cis, ment, audit, memo, exec, bioSnap, act, frix] = await Promise.all([
      fetchUserDetail(userId),
      fetchUserEvents(userId, 30),
      fetchMentorConversations(userId, 30),
      fetchUserCheckIns(userId),
      fetchUserMentorship(userId),
      fetchUserAuditLog(userId),
      fetchUserMemory(userId),
      fetchUserExecution(userId),
      fetchBiometricSnapshot(userId),
      fetchUserActivityBundle(userId),
      fetchConfrontationItems(userId).catch(() => [] as ConfrontationItem[]),
    ]);
    setUser(userDetail);
    setEvents(evts);
    setConversations(convs);
    setCheckIns(cis as typeof checkIns);
    setMentorship(ment);
    setAuditLog(audit);
    setMemory(memo);
    setExecution(exec);
    setBio(bioSnap);
    setActivity(act);
    setFrictions(frix);
    setLoading(false);

    // Coach Intelligence v2: corre DESPUÉS del paint para no bloquear la primera
    // pintura del dossier. Reusa las queries del bundle (degradable a vacío).
    fetchCoachIntelligence(userId)
      .then(({ ci }) => setCoachCI(ci))
      .catch(() => setCoachCI(null));
  }, [userId]);

  const handleDismissFriction = useCallback(async (itemId: string, reason: string) => {
    if (!userId) return;
    await dismissConfrontation({ userId, itemId, reason, adminId: adminId ?? undefined });
    const next = await fetchConfrontationItems(userId).catch(() => [] as ConfrontationItem[]);
    setFrictions(next);
  }, [userId, adminId]);

  const handleSeed = useCallback(async (scenario: Scenario) => {
    if (!userId) return;
    setSeeding(true);
    try {
      const { seedSyntheticData } = await import('@/lib/biometric');
      await seedSyntheticData(userId, scenario, 14);
      setBio(await fetchBiometricSnapshot(userId));
    } finally {
      setSeeding(false);
    }
  }, [userId]);

  const handleClearSynthetic = useCallback(async () => {
    if (!userId) return;
    setSeeding(true);
    try {
      const { clearSyntheticData } = await import('@/lib/biometric');
      await clearSyntheticData(userId);
      setBio(await fetchBiometricSnapshot(userId));
    } finally {
      setSeeding(false);
    }
  }, [userId]);

  const handleSubmitReview = useCallback(
    async (review: { review_status: string; quality: string; evidence_confidence: string; failure_type: string; mentor_action: string; notes: string }) => {
      if (!reviewTask?.id || !userId) return;
      setReviewBusy(true);
      try {
        await submitReview({ task_id: reviewTask.id, user_id: userId, reviewer_id: adminId ?? undefined, ...review });
        setExecution(await fetchUserExecution(userId));
        setReviewTask(null);
      } finally {
        setReviewBusy(false);
      }
    },
    [reviewTask, userId, adminId],
  );

  useEffect(() => { load(); }, [load]);

  const handleGenerateBriefing = useCallback(async () => {
    if (!userId) return;
    setGenBrief(true);
    try {
      const { generateAdminBriefing } = await import('@/lib/memorySummarizer');
      await generateAdminBriefing(userId, { userName: user?.name });
      setMemory(await fetchUserMemory(userId));
    } finally {
      setGenBrief(false);
    }
  }, [userId, user?.name]);

  const handleAddNote = useCallback(async (note: string) => {
    if (!userId || !adminId) return;
    setNoteBusy(true);
    try {
      await addAdminNote(userId, adminId, note);
      setMemory(await fetchUserMemory(userId));
    } finally {
      setNoteBusy(false);
    }
  }, [userId, adminId]);

  // ── Mentoría operable desde admin ──────────────────────────────────────────
  const reloadMentorship = useCallback(async () => {
    if (!userId) return;
    setMentorship(await fetchUserMentorship(userId));
  }, [userId]);

  const handleToggleMentTask = useCallback(async (taskId: string, completed: boolean) => {
    if (!userId || !adminId || mentTaskBusy) return;
    setMentTaskBusy(taskId);
    setMentError(null);
    try {
      const res = await adminToggleMentorshipTask({ adminId, userId, taskId, completed });
      if (!res.success) setMentError(res.error ?? 'No se pudo actualizar la tarea');
      await reloadMentorship();
    } finally {
      setMentTaskBusy(null);
    }
  }, [userId, adminId, mentTaskBusy, reloadMentorship]);

  const handleAddMentNote = useCallback(async () => {
    if (!userId || !adminId || mentNoteBusy) return;
    const week = Math.max(1, parseInt(mentNoteWeek, 10) || 1);
    setMentNoteBusy(true);
    setMentError(null);
    try {
      const res = await adminAddMentorshipNote({ adminId, userId, week, text: mentNoteText });
      if (!res.success) {
        setMentError(res.error ?? 'No se pudo guardar la nota');
      } else {
        setMentNoteText('');
        await reloadMentorship();
      }
    } finally {
      setMentNoteBusy(false);
    }
  }, [userId, adminId, mentNoteBusy, mentNoteWeek, mentNoteText, reloadMentorship]);

  const savePlan = useCallback(async (sessionId: string, actionPlan: NormalizedPlanItem[]) => {
    if (!userId || !adminId) return;
    setPlanBusy(sessionId);
    setMentError(null);
    try {
      const res = await adminUpdateActionPlan({ adminId, userId, sessionId, actionPlan });
      if (!res.success) setMentError(res.error ?? 'No se pudo guardar el plan');
      await reloadMentorship();
    } finally {
      setPlanBusy(null);
    }
  }, [userId, adminId, reloadMentorship]);

  const handleGenerateSessionPlan = useCallback(async (sess: { id: string; week: number | null; notes: string | null }) => {
    if (!userId || !adminId || planBusy) return;
    if (!sess.notes?.trim()) { setMentError('La sesión no tiene notas de las que derivar un plan.'); return; }
    setPlanBusy(sess.id);
    setMentError(null);
    try {
      const { streamMentorResponse } = await import('@/lib/mentor');
      const { makeMinimalContext } = await import('@/lib/memorySummarizer');
      const ctx = makeMinimalContext(user?.name ?? undefined);
      const prompt =
        'A partir de estas NOTAS de la sesión de mentoría del cliente, construye su PLAN DE ACCIÓN para la próxima semana. ' +
        PLAN_PROMPT_TAIL +
        '\n\nNOTAS:\n' + sess.notes;
      let out = '';
      await streamMentorResponse(ctx, prompt, [], (delta: string) => { out += delta; });
      const items = parseAIList(out).map((text) => ({ text, week: sess.week, source: 'ia', done: false }));
      if (!items.length) { setMentError('Norman no devolvió acciones — reintenta.'); return; }
      const res = await adminUpdateActionPlan({ adminId, userId, sessionId: sess.id, actionPlan: items });
      if (!res.success) setMentError(res.error ?? 'No se pudo guardar el plan');
      await reloadMentorship();
    } finally {
      setPlanBusy(null);
    }
  }, [userId, adminId, planBusy, user?.name, reloadMentorship]);

  const handleDeleteMentSession = useCallback(async (sessionId: string) => {
    if (!userId || !adminId) return;
    setMentError(null);
    const res = await adminDeleteMentorshipSession({ adminId, userId, sessionId });
    if (!res.success) setMentError(res.error ?? 'No se pudo borrar la sesión');
    await reloadMentorship();
  }, [userId, adminId, reloadMentorship]);

  const openEditIdentity = () => {
    setEName(user?.name ?? '');
    setELabel(user?.role ?? '');
    setEditOpen(true);
  };

  const handleSaveIdentity = useCallback(async () => {
    if (!userId || !adminId) return;
    setSavingEdit(true);
    try {
      const res = await updateUserProfile({ adminId, userId, name: eName, label: eLabel });
      if (!res.success) {
        // Antes se cerraba en silencio aunque fallara → "no me permite guardar".
        Alert.alert('No se pudo guardar', res.error ?? 'Intenta de nuevo en un momento.');
        return;
      }
      setEditOpen(false);
      await load();
    } finally {
      setSavingEdit(false);
    }
  }, [userId, adminId, eName, eLabel, load]);

  // ¿el admin que mira es SuperAdmin? (gate de UX; el servidor también lo impone)
  useEffect(() => {
    if (!adminId) return;
    intel.profiles().select('is_superadmin').eq('id', adminId).maybeSingle()
      .then(({ data }: { data: any }) => setViewerSuper(data?.is_superadmin === true))
      .catch(() => {});
  }, [adminId]);

  const handleSetRole = useCallback((role: AppRole) => {
    if (!userId || !adminId || roleBusy) return;
    Alert.alert(
      'Cambiar nivel de acceso',
      `¿Asignar "${APP_ROLE_LABEL[role]}" a este usuario?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setRoleBusy(true);
            const res = await setUserRole({ adminId, userId, role });
            setRoleBusy(false);
            if (!res.success) { Alert.alert('No se pudo', res.error ?? 'Error'); return; }
            await load();
          },
        },
      ],
    );
  }, [userId, adminId, roleBusy, load]);

  const handleDeactivateMembership = async (membership: UserMembership) => {
    if (!adminId) return;
    Alert.alert('Desactivar membresía', `¿Desactivar ${membership.product} de este usuario?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desactivar',
        style: 'destructive',
        onPress: async () => {
          await deactivateMembership({ adminId, membershipId: membership.id, userId: userId! });
          load();
        },
      },
    ]);
  };

  const handleRecalcML = async () => {
    if (!adminId || !userId) return;
    setRecalcLoading(true);
    // Recalcula ambos motores: el heurístico del servidor (edge function) +
    // Coach Intelligence v2 (cómputo cliente sobre datos frescos).
    await recalculateUserMLAction({ adminId, userId });
    await fetchCoachIntelligence(userId)
      .then(({ ci }) => setCoachCI(ci))
      .catch(() => { /* no-op: la sección degrada a vacío sola */ });
    setRecalcLoading(false);
    Alert.alert('✅ Recalculado', 'El ML de este usuario fue actualizado.');
    load();
  };

  const handleSendNorman = async (message: string) => {
    if (!adminId || !userId) return;
    await sendMessageAsNorman({ adminId, userId, message });
    setShowNorman(false);
    Alert.alert('✅ Enviado', 'El mensaje fue enviado al chat del usuario.');
  };

  const handleGenerateWeeklySession = async () => {
    if (!userId || !user) return;
    setGeneratingSession(true);
    try {
      const userAny = user as any;
      const session = await generateWeeklySessionIfNeeded(userId, userAny.protocol_day ?? 1, {
        full_name:       user.name,
        role:            user.role ?? 'Empresario',
        current_module:  'Módulo 1 - Guerrero Mentalidad',
        sovereign_score: userAny.sovereign_score ?? 0,
      });
      if (session) { setWeeklySession(session); setShowWeeklySession(true); }
      else Alert.alert('Sin cambios', 'Ya existe una sesión para esta semana.');
    } catch { Alert.alert('Error', 'No se pudo generar la sesión.'); }
    setGeneratingSession(false);
  };

  // Burnout risk from last 7 check-ins
  const burnoutRisk = (() => {
    if (!checkIns.length) return null;
    const last7 = checkIns.slice(0, 7);
    const avgStress = last7.reduce((s, c) => s + c.stress, 0) / last7.length;
    const avgEnergy = last7.reduce((s, c) => s + c.energy, 0) / last7.length;
    if (avgStress > 7 && avgEnergy < 4) return 'ALTO';
    if (avgStress > 6 && avgEnergy < 5) return 'MEDIO';
    return 'BAJO';
  })();

  if (loading || !user) {
    return (
      <View style={[sc.root, s.center]}>
        <ActivityIndicator color={palette.goldText} />
      </View>
    );
  }

  const initials = user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  return (
    <>
      <ScrollView
        ref={scrollRef}
        style={sc.root}
        contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 100 }}
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}>

        {/* ── Back + title ── */}
        <View style={s.header}>
          <Pressable
            onPress={() => router.back()}
            style={s.backBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Volver al listado de usuarios">
            <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>{user.name}</Text>
            <Text style={s.headerSub}>{user.role ?? 'Aprendiz'}</Text>
          </View>
        </View>

        {/* ── Chip strip sticky: navegación entre secciones ── */}
        <View style={s.navStrip}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.navStripInner}>
            {NAV_SECTIONS.map((sec) => (
              <Pressable
                key={sec.id}
                onPress={() => scrollToSection(sec.id)}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={`Ir a la sección ${sec.label}`}
                style={({ pressed }) => [s.navChip, pressed && { opacity: 0.6 }]}>
                <Text style={s.navChipTxt}>{sec.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ─────────────────────────────────────────────────── */}
        {/* A. IDENTIDAD */}
        {/* ─────────────────────────────────────────────────── */}
        <View onLayout={onSectionLayout('identity')}>
          <GoldDivider label="A. IDENTIDAD" />
        </View>
        <PremiumCard style={s.card}>
          <View style={s.identityRow}>
            <View style={s.bigAvatar}>
              <Text style={s.bigAvatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.userName}>{user.name}</Text>
              <Text style={s.userRole}>{user.role ?? '—'}</Text>
              {user.is_admin && <StatusPill label="ADMIN" tone="gold" dot />}
              <Text style={s.userMeta}>Registrado {formatDate(user.created_at)}</Text>
              {user.last_sign_in_at && (
                <Text style={s.userMeta}>Último acceso {timeAgo(user.last_sign_in_at)}</Text>
              )}
            </View>
            <Pressable
              onPress={openEditIdentity}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Editar identidad"
              style={mo.editIconBtn}>
              <MaterialIcons name="edit" size={18} color={palette.goldText} />
            </Pressable>
          </View>
          <Pressable
            style={s.normanBtn}
            onPress={() => setShowNorman(true)}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensaje a este usuario como Norman">
            <MaterialIcons name="send" size={16} color={palette.goldText} />
            <Text style={s.normanBtnText}>ENVIAR MENSAJE COMO NORMAN</Text>
          </Pressable>
        </PremiumCard>

        {/* ─────────────────────────────────────────────────── */}
        {/* B. MEMBRESÍAS */}
        {/* ─────────────────────────────────────────────────── */}
        <View onLayout={onSectionLayout('memberships')}>
          <GoldDivider label="B. MEMBRESÍAS Y ACCESO" />
        </View>
        <PremiumCard style={s.card}>
          {/* Current tier badge */}
          {(() => {
            const activeMembership = (user.memberships ?? []).find(m => m.status === 'active');
            const currentTier = activeMembership?.product ?? 'free';
            const tierColor = getTierColor(currentTier);
            // El tier premium es #FFC804 (gold brillante). Como TEXTO sobre la tarjeta
            // (theme-aware) es ilegible en tema claro → goldText. Fills/bordes usan tierColor.
            const tierText = tierColor === palette.gold ? palette.goldText : tierColor;
            return (
              <View style={[s.currentTierRow, { borderColor: tierColor + '55' }]}>
                <View style={[s.currentTierDot, { backgroundColor: tierColor }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.currentTierLabel}>TIER ACTUAL</Text>
                  <Text style={[s.currentTierName, { color: tierText }]}>{getTierLabel(currentTier).toUpperCase()}</Text>
                </View>
                <Pressable
                  style={[s.changeTierBtn, { borderColor: tierColor + '88' }]}
                  onPress={() => router.push(`/admin/membresias?userId=${userId}` as never)}
                  accessibilityRole="button"
                  accessibilityLabel="Cambiar tier de membresía">
                  <Text style={[s.changeTierText, { color: tierText }]}>CAMBIAR TIER →</Text>
                </Pressable>
              </View>
            );
          })()}

          {/* NIVEL DE ACCESO — control único de 4 roles (cambio seguro vía RPC) */}
          {(() => {
            const currentRole: AppRole = user.is_superadmin ? 'superadmin'
              : user.is_admin ? 'admin'
              : (user.memberships ?? []).some(m => m.status === 'active' && !['free', 'lifeflow_free'].includes(String(m.product))) ? 'premium'
              : 'inicial';
            const ROLE_DESC: Record<AppRole, string> = {
              superadmin: 'Control total, incluso sobre admins',
              admin:      'Acceso completo al panel admin',
              premium:    'Cliente con acceso completo',
              inicial:    'Cliente básico (free)',
            };
            return (
              <View style={s.rolePanel}>
                <Text style={s.rolePanelTitle}>NIVEL DE ACCESO</Text>
                {(['superadmin', 'admin', 'premium', 'inicial'] as AppRole[]).map((r) => {
                  const active = currentRole === r;
                  const locked = (r === 'admin' || r === 'superadmin') && !viewerSuper;
                  return (
                    <Pressable
                      key={r}
                      disabled={active || locked || roleBusy}
                      onPress={() => handleSetRole(r)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active, disabled: active || locked || roleBusy }}
                      accessibilityLabel={`Nivel de acceso ${APP_ROLE_LABEL[r]}${locked ? ', solo SuperAdmin' : ''}`}
                      style={({ pressed }) => [
                        s.roleOption,
                        active && s.roleOptionActive,
                        (locked || roleBusy) && { opacity: 0.45 },
                        pressed && { opacity: 0.7 },
                      ]}>
                      <MaterialIcons
                        name={active ? 'radio-button-checked' : 'radio-button-unchecked'}
                        size={18}
                        color={active ? palette.goldText : palette.smoke}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[s.roleOptionLabel, active && { color: palette.goldText }]}>{APP_ROLE_LABEL[r]}</Text>
                        <Text style={s.roleOptionDesc}>{ROLE_DESC[r]}{locked ? ' · solo SuperAdmin' : ''}</Text>
                      </View>
                      {active && <Text style={s.roleCurrentTag}>ACTUAL</Text>}
                    </Pressable>
                  );
                })}
              </View>
            );
          })()}

          {(user.memberships ?? []).length === 0 ? (
            <Text style={s.emptyText}>Sin membresías activas</Text>
          ) : (
            user.memberships!.map(m => {
              const mCol = getTierColor(m.product);
              // goldText (no gold) como TEXTO del producto en membresías activas premium.
              const mText = mCol === palette.gold ? palette.goldText : mCol;
              return (
              <View key={m.id} style={s.membershipRow}>
                <View style={[s.statusDot, { backgroundColor: m.status === 'active' ? mCol : palette.smoke }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.membershipProduct, m.status === 'active' && { color: mText }]}>
                    {getTierLabel(m.product).toUpperCase()}
                  </Text>
                  <Text style={s.membershipMeta}>
                    Activado {formatDate(m.activated_at)}
                    {m.expires_at ? ` · Expira ${formatDate(m.expires_at)}` : ' · Sin vencimiento'}
                  </Text>
                  {m.price_paid ? <Text style={s.membershipPrice}>${m.price_paid} {m.currency}</Text> : null}
                </View>
                <Pressable onPress={() => handleDeactivateMembership(m)} style={s.deactivateBtn} accessibilityRole="button" accessibilityLabel={`Desactivar membresía ${getTierLabel(m.product)}`}>
                  <Text style={s.deactivateText}>DESACTIVAR</Text>
                </Pressable>
              </View>
              );
            })
          )}
          <Pressable
            style={s.addBtn}
            onPress={() => router.push(`/admin/membresias?userId=${userId}` as never)}
            accessibilityRole="button"
            accessibilityLabel="Activar membresía">
            <MaterialIcons name="add" size={16} color={palette.goldText} />
            <Text style={s.addBtnText}>ACTIVAR MEMBRESÍA</Text>
          </Pressable>
        </PremiumCard>

        {/* ─────────────────────────────────────────────────── */}
        {/* C. CURSOS */}
        {/* ─────────────────────────────────────────────────── */}
        <GoldDivider label="C. ACCESO A CURSOS" />
        <PremiumCard style={s.card}>
          {(user.course_access ?? []).length === 0 ? (
            <Text style={s.emptyText}>Sin acceso a cursos activos</Text>
          ) : (
            user.course_access!.map(ca => (
              <View key={ca.id} style={s.courseRow}>
                <MaterialIcons name="school" size={16} color={palette.goldText} />
                <Text style={s.courseLabel}>{ca.course_id.replace(/_/g, ' ').toUpperCase()}</Text>
                {ca.expires_at && <Text style={s.courseMeta}>Expira {formatDate(ca.expires_at)}</Text>}
              </View>
            ))
          )}
        </PremiumCard>

        {/* ─────────────────────────────────────────────────── */}
        {/* D. INTELLIGENCE ML */}
        {/* ─────────────────────────────────────────────────── */}
        <View onLayout={onSectionLayout('ml')}>
          <GoldDivider label="D. INTELIGENCIA ML" />
        </View>

        {/* Coach Intelligence v2 — lo PRIMERO que ve el coach: por qué este score
            (drivers con evidencia), trayectoria semanal, salud relacional con
            Norman, y qué decirle esta semana. Si el bundle no carga aún, esta
            zona queda vacía sin romper la pantalla. */}
        {coachCI && (
          <>
            <CoachNextActionCard action={coachCI.next_action} />
            <ChurnDriversCard ci={coachCI} />
            <WeeklyMomentumCard momentum={coachCI.momentum} />
            <RelationalDepthCard depth={coachCI.relational} />
          </>
        )}

        <PremiumCard style={s.card}>
          <SectionHeader
            title=""
            action={recalcLoading ? '⏳ Recalculando...' : '↻ RECALCULAR'}
            onAction={handleRecalcML}
          />
          {user.engagement_score !== undefined && (
            <View style={s.mlRow}>
              <Text style={s.mlLabel}>ENGAGEMENT SCORE</Text>
              <EngagementGauge score={user.engagement_score} />
            </View>
          )}
          {user.churn_risk_label && (
            <View style={s.mlRow}>
              <Text style={s.mlLabel}>CHURN RISK</Text>
              <Text style={[s.mlValue, { color: user.churn_risk_label === 'critical' ? palette.danger : user.churn_risk_label === 'low' ? palette.success : palette.warning }]}>
                {user.churn_risk_label.toUpperCase()} · {Math.round((user.churn_risk ?? 0) * 100)}%
              </Text>
            </View>
          )}
          {user.cohort_label && (
            <View style={s.mlRow}>
              <Text style={s.mlLabel}>COHORT</Text>
              <Text style={s.mlValue}>{user.cohort_label}</Text>
            </View>
          )}
          {user.next_action && (
            <GoldAccentCard style={{ padding: spacing.md, marginTop: spacing.sm }}>
              <Text style={s.mlLabel}>PRÓXIMA MEJOR ACCIÓN</Text>
              <Text style={s.mlBody}>{user.next_action}</Text>
            </GoldAccentCard>
          )}
          <View style={{ marginTop: spacing.md }}>
            <Text style={s.mlLabel}>AFINIDADES DE CONTENIDO</Text>
            <AffinityBar label="Binaurales"  value={user.affinity_binaural} />
            <AffinityBar label="Respiración" value={user.affinity_breathing} />
            <AffinityBar label="Meditación"  value={user.affinity_meditation} />
            <AffinityBar label="Lecciones"   value={user.affinity_lessons} />
            <AffinityBar label="Mentor"      value={user.affinity_mentor} />
            <AffinityBar label="Journaling"  value={user.affinity_journaling} />
          </View>
          {user.anomaly_detected && (
            <View style={[s.anomalyAlert]}>
              <Text style={s.anomalyText}>⚠ ANOMALÍA: {user.anomaly_type ?? 'desconocido'}</Text>
            </View>
          )}
        </PremiumCard>

        {/* ─────────────────────────────────────────────────── */}
        {/* E. ACTIVIDAD RECIENTE */}
        {/* ─────────────────────────────────────────────────── */}
        <GoldDivider label={`E. ACTIVIDAD RECIENTE (${events.length})`} />
        <PremiumCard style={s.card}>
          {events.length === 0 ? (
            <Text style={s.emptyText}>Sin actividad registrada</Text>
          ) : (
            events.slice(0, 15).map(evt => (
              <View key={evt.id} style={s.evtRow}>
                <View style={s.evtDot} />
                <View style={{ flex: 1 }}>
                  <Text style={s.evtType}>{evt.event_type.replace(/_/g, ' ')}</Text>
                  {evt.screen && <Text style={s.evtScreen}>{evt.screen}</Text>}
                </View>
                <Text style={s.evtTime}>{timeAgo(evt.created_at)}</Text>
              </View>
            ))
          )}
        </PremiumCard>

        {/* ─────────────────────────────────────────────────── */}
        {/* F. CONVERSACIONES CON MENTOR */}
        {/* ─────────────────────────────────────────────────── */}
        <GoldDivider label={`F. CONVERSACIONES (${conversations.length})`} />
        <PremiumCard style={s.card}>
          {conversations.length === 0 ? (
            <Text style={s.emptyText}>Sin conversaciones</Text>
          ) : (
            conversations.slice(0, 10).map(conv => {
              const isExpanded = expandedConv === conv.id;
              return (
                <Pressable
                  key={conv.id}
                  onPress={() => setExpandedConv(isExpanded ? null : conv.id)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isExpanded }}
                  accessibilityLabel={`${conv.role === 'assistant' ? 'Mensaje del mentor' : 'Mensaje del usuario'}. ${isExpanded ? 'Contraer' : 'Expandir'}`}>
                  <View style={[s.convBubble, conv.role === 'assistant' ? s.bubbleLeft : s.bubbleRight]}>
                    <Text style={s.convRole}>{conv.role === 'assistant' ? 'MENTOR' : 'USUARIO'}</Text>
                    <Text style={s.convText} numberOfLines={isExpanded ? undefined : 2}>
                      {conv.content}
                    </Text>
                    <Text style={s.convTime}>{timeAgo(conv.created_at)}</Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </PremiumCard>

        {/* ─────────────────────────────────────────────────── */}
        {/* G. CHECK-INS HISTÓRICOS */}
        {/* ─────────────────────────────────────────────────── */}
        <GoldDivider label={`G. CHECK-INS (${checkIns.length})`} />
        {/* Alarma de bienestar — semáforo de "cómo se va sintiendo" (A1) */}
        {checkIns.length > 0 && <WellbeingAlarmCard alarm={wellbeingAlarm(checkIns)} />}
        <PremiumCard style={s.card}>
          {checkIns.length === 0 ? (
            <Text style={s.emptyText}>Sin check-ins</Text>
          ) : (
            <View>
              <View style={s.checkInHeader}>
                <View style={{ width: 14 }} />
                {['FECHA', 'E', 'C', 'S', 'D'].map(col => (
                  <Text key={col} style={s.checkInHeaderCell}>{col}</Text>
                ))}
              </View>
              {checkIns.slice(0, 14).map(ci => (
                <View key={ci.date} style={s.checkInRow}>
                  <View style={{ width: 14, alignItems: 'center' }}>
                    <WellbeingDot score={wellbeingScore(ci)} />
                  </View>
                  <Text style={[s.checkInCell, { flex: 2 }]}>{ci.date}</Text>
                  <Text style={s.checkInCell}>{ci.energy}</Text>
                  <Text style={s.checkInCell}>{ci.clarity}</Text>
                  <Text style={s.checkInCell}>{ci.stress}</Text>
                  <Text style={s.checkInCell}>{ci.sleep}</Text>
                </View>
              ))}
            </View>
          )}
        </PremiumCard>

        {/* ─────────────────────────────────────────────────── */}
        {/* M. MENTORÍA (sesiones + tareas) */}
        {/* ─────────────────────────────────────────────────── */}
        <View onLayout={onSectionLayout('mentorship')}>
          <GoldDivider label={`M. MENTORÍA (${mentorship.sessions.length} sesiones · ${mentorship.tasks.filter(t => t.completed).length}/${mentorship.tasks.length} tareas)`} />
        </View>
        <PremiumCard style={s.card}>
          {mentError && <Text style={s.mentError}>{mentError}</Text>}

          {/* Tareas — el mentor marca por el cliente */}
          <Text style={s.mlLabel}>TAREAS DE LA SEMANA</Text>
          {mentorship.tasks.length === 0 ? (
            <Text style={s.emptyText}>Sin tareas asignadas</Text>
          ) : (
            mentorship.tasks.slice(0, 12).map(t => (
              <Pressable
                key={t.id}
                style={s.taskRow}
                disabled={mentTaskBusy === t.id}
                onPress={() => handleToggleMentTask(t.id, !t.completed)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: t.completed }}
                accessibilityLabel={`Marcar tarea ${t.title}`}>
                {mentTaskBusy === t.id ? (
                  <ActivityIndicator size={16} color={palette.goldText} />
                ) : (
                  <MaterialIcons
                    name={t.completed ? 'check-circle' : 'radio-button-unchecked'}
                    size={16}
                    color={t.completed ? palette.success : palette.smoke}
                  />
                )}
                <Text style={[s.taskTitle, t.completed && s.taskTitleDone]} numberOfLines={2}>
                  {t.title}
                </Text>
                {t.week != null && <Text style={s.taskWeek}>S{t.week}</Text>}
              </Pressable>
            ))
          )}

          {/* Composer: el mentor registra la nota de sesión por el cliente */}
          <Text style={[s.mlLabel, { marginTop: spacing.md }]}>AÑADIR NOTA DE SESIÓN</Text>
          <View style={s.mentComposerRow}>
            <Text style={s.mentWeekLabel}>SEMANA</Text>
            <TextInput
              value={mentNoteWeek}
              onChangeText={setMentNoteWeek}
              keyboardType="number-pad"
              style={s.mentWeekInput}
              accessibilityLabel="Semana de la nota"
            />
          </View>
          <TextInput
            value={mentNoteText}
            onChangeText={setMentNoteText}
            placeholder="Qué se trabajó, insights, compromisos…"
            placeholderTextColor={palette.smoke}
            style={s.mentNoteInput}
            multiline
            textAlignVertical="top"
          />
          <Pressable
            onPress={handleAddMentNote}
            disabled={mentNoteBusy || !mentNoteText.trim()}
            style={[s.mentBtn, (mentNoteBusy || !mentNoteText.trim()) && { opacity: 0.4 }]}
            accessibilityRole="button"
            accessibilityLabel="Guardar nota de sesión">
            {mentNoteBusy
              ? <ActivityIndicator size="small" color={palette.ink} />
              : <Text style={s.mentBtnText}>GUARDAR NOTA</Text>}
          </Pressable>

          {/* Sesiones: notas + plan de acción editable */}
          <Text style={[s.mlLabel, { marginTop: spacing.md }]}>NOTAS Y PLAN DE ACCIÓN</Text>
          {mentorship.sessions.length === 0 ? (
            <Text style={s.emptyText}>Sin sesiones registradas</Text>
          ) : (
            mentorship.sessions.slice(0, 8).map(sess => {
              const plan = normalizePlan(sess.action_plan, sess.week);
              const busy = planBusy === sess.id;
              return (
                <View key={sess.id} style={s.sessionBox}>
                  <View style={s.sessionHeader}>
                    <Text style={s.sessionWeek}>
                      {sess.week != null ? `SEMANA ${sess.week}` : 'SESIÓN'}
                    </Text>
                    <View style={s.sessionHeaderRight}>
                      <Text style={s.sessionDate}>
                        {sess.session_date ? formatDate(sess.session_date) : formatDate(sess.created_at)}
                      </Text>
                      <Pressable
                        onPress={() => handleDeleteMentSession(sess.id)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Borrar sesión">
                        <MaterialIcons name="delete-outline" size={16} color={palette.smoke} />
                      </Pressable>
                    </View>
                  </View>
                  {sess.notes ? (
                    <Text style={s.sessionNotes}>{sess.notes}</Text>
                  ) : (
                    <Text style={s.sessionNotesEmpty}>Sin notas</Text>
                  )}
                  {plan.length > 0 && (
                    <View style={s.planList}>
                      {plan.map((item, i) => (
                        <View key={i} style={s.planRow}>
                          <Pressable
                            onPress={() => {
                              const next = plan.map((p, j) => (j === i ? { ...p, done: !p.done } : p));
                              void savePlan(sess.id, next);
                            }}
                            disabled={busy}
                            hitSlop={6}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: item.done }}
                            accessibilityLabel={`Marcar acción ${item.text}`}>
                            <MaterialIcons
                              name={item.done ? 'check-circle' : 'radio-button-unchecked'}
                              size={15}
                              color={item.done ? palette.success : palette.goldText}
                            />
                          </Pressable>
                          <Text style={[s.planText, item.done && s.taskTitleDone]}>{item.text}</Text>
                          <Pressable
                            onPress={() => {
                              const next = plan.filter((_, j) => j !== i);
                              void savePlan(sess.id, next);
                            }}
                            disabled={busy}
                            hitSlop={6}
                            accessibilityRole="button"
                            accessibilityLabel="Quitar acción">
                            <MaterialIcons name="close" size={14} color={palette.smoke} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                  {planDraftFor === sess.id ? (
                    <View style={s.planAddRow}>
                      <TextInput
                        value={planItemText}
                        onChangeText={setPlanItemText}
                        placeholder="Nueva acción…"
                        placeholderTextColor={palette.smoke}
                        style={s.planAddInput}
                        autoFocus
                        onSubmitEditing={() => {
                          if (!planItemText.trim()) return;
                          void savePlan(sess.id, [...plan, { text: planItemText.trim(), week: sess.week, source: 'manual', done: false }]);
                          setPlanItemText('');
                          setPlanDraftFor(null);
                        }}
                      />
                      <Pressable
                        onPress={() => {
                          if (!planItemText.trim()) { setPlanDraftFor(null); return; }
                          void savePlan(sess.id, [...plan, { text: planItemText.trim(), week: sess.week, source: 'manual', done: false }]);
                          setPlanItemText('');
                          setPlanDraftFor(null);
                        }}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel="Agregar acción">
                        <MaterialIcons name="check" size={18} color={palette.goldText} />
                      </Pressable>
                    </View>
                  ) : (
                    <View style={s.planActionsRow}>
                      <Pressable
                        onPress={() => { setPlanItemText(''); setPlanDraftFor(sess.id); }}
                        disabled={busy}
                        style={s.planActionBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Agregar acción al plan">
                        <MaterialIcons name="add" size={14} color={palette.goldText} />
                        <Text style={s.planActionText}>ACCIÓN</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleGenerateSessionPlan(sess)}
                        disabled={busy || !sess.notes?.trim()}
                        style={[s.planActionBtn, (!sess.notes?.trim()) && { opacity: 0.4 }]}
                        accessibilityRole="button"
                        accessibilityLabel="Generar plan con Norman">
                        {busy
                          ? <ActivityIndicator size={12} color={palette.goldText} />
                          : <MaterialIcons name="auto-awesome" size={14} color={palette.goldText} />}
                        <Text style={s.planActionText}>PLAN CON NORMAN</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </PremiumCard>

        {/* ─────────────────────────────────────────────────── */}
        {/* M3. EJECUCIÓN — tareas + scores + review + intervención */}
        {/* ─────────────────────────────────────────────────── */}
        <View onLayout={onSectionLayout('execution')}>
          <GoldDivider label="EJECUCIÓN" />
        </View>
        <ExecutionScoreCard scores={execution.scores} />
        <InterventionQueueCard items={execution.scores ? buildInterventions(execution.scores, execution.tasks) : []} />
        <NextMentorshipAgendaCard prep={execution.prep} />
        <ClientTaskList
          tasks={execution.tasks}
          onReview={setReviewTask}
          title="TAREAS DEL CLIENTE"
          emptyLabel="Sin tareas operativas todavía (se generan desde mentorías y Norman)."
        />
        <FailurePatternCard reviews={execution.reviews} />
        <MentorReviewDrawer
          task={reviewTask}
          visible={!!reviewTask}
          busy={reviewBusy}
          onClose={() => setReviewTask(null)}
          onSubmit={handleSubmitReview}
        />

        {/* ─────────────────────────────────────────────────── */}
        {/* FRICCIONES DETECTADAS — DIJO vs HIZO (Confrontation OS) */}
        {/* ─────────────────────────────────────────────────── */}
        <View onLayout={onSectionLayout('frictions')}>
          <GoldDivider label="FRICCIONES DETECTADAS" />
        </View>
        <FriccionesCard items={frictions} onDismiss={handleDismissFriction} />

        {/* ─────────────────────────────────────────────────── */}
        {/* M2. MEMORIA — perfil vivo + briefing operativo + notas */}
        {/* ─────────────────────────────────────────────────── */}
        <View onLayout={onSectionLayout('memory')}>
          <GoldDivider label="MEMORIA & BRIEFING" />
        </View>
        <PlaudImport
          userId={userId ?? null}
          userName={user?.name}
          variant="admin"
          onProcessed={handleGenerateBriefing}
        />
        <AdminBriefingCard briefing={memory.briefing} generating={genBrief} onGenerate={handleGenerateBriefing} />
        <ProfileSynopsisCard profile={memory.profile} variant="admin" />
        <CommitmentsCard
          open={memory.profile?.commitments_open}
          completed={memory.profile?.commitments_completed}
          variant="admin"
        />
        <RepeatedThemesCard themes={aggregateThemes(memory.summaries)} />
        <ConversationTimeline summaries={memory.summaries} variant="admin" />
        <AdminNotesCard notes={memory.notes} busy={noteBusy} onAdd={handleAddNote} />

        {/* ─────────────────────────────────────────────────── */}
        {/* I. PREDICCIÓN & SESIÓN SEMANAL */}
        {/* ─────────────────────────────────────────────────── */}
        <GoldDivider label="I. PREDICCIÓN & SESIÓN SEMANAL" />
        <PremiumCard style={s.card}>
          {burnoutRisk && (
            <View style={s.mlRow}>
              <Text style={s.mlLabel}>RIESGO DE BURNOUT (7 días)</Text>
              <Text style={[s.mlValue, {
                color: burnoutRisk === 'ALTO' ? palette.danger : burnoutRisk === 'MEDIO' ? palette.warning : palette.success,
              }]}>
                {burnoutRisk}
              </Text>
            </View>
          )}
          <Pressable
            style={[s.addBtn, generatingSession && { opacity: 0.6 }]}
            onPress={handleGenerateWeeklySession}
            disabled={generatingSession}
            accessibilityRole="button"
            accessibilityState={{ disabled: generatingSession }}
            accessibilityLabel="Generar sesión semanal con Norman">
            <MaterialIcons name="psychology" size={16} color={palette.goldText} />
            <Text style={s.addBtnText}>
              {generatingSession ? 'GENERANDO...' : 'GENERAR SESIÓN SEMANAL NORMAN'}
            </Text>
          </Pressable>
          {weeklySession && showWeeklySession && (
            <Pressable
              onPress={() => setShowWeeklySession(v => !v)}
              style={s.weeklySessionBox}
              accessibilityRole="button"
              accessibilityState={{ expanded: showWeeklySession }}
              accessibilityLabel="Contraer mensaje de la sesión semanal">
              <View style={s.weeklySessionHeader}>
                <Text style={s.mlLabel}>SEMANA {weeklySession.week_number} · MENSAJE</Text>
                <MaterialIcons name="expand-less" size={16} color={palette.goldText} />
              </View>
              <Text style={s.weeklySessionText}>{weeklySession.ai_message}</Text>
            </Pressable>
          )}
        </PremiumCard>

        {/* ─────────────────────────────────────────────────── */}
        {/* K. BIOMÉTRICOS */}
        {/* ─────────────────────────────────────────────────── */}
        <View onLayout={onSectionLayout('biometrics')}>
          <GoldDivider label="K. BIOMÉTRICOS" />
        </View>
        <BiometricInsightCard insight={bio.latestInsight} variant="admin" />
        <BiometricSparkline series={bio.series} />
        <ConnectionStatusCard connections={bio.connections} />
        <SeedSyntheticControls onSeed={handleSeed} onClear={handleClearSynthetic} busy={seeding} />
        <PremiumCard style={s.card}>
          {!user.biometric_provider ? (
            <Text style={s.emptyText}>Sin wearable conectado</Text>
          ) : (
            <>
              <View style={s.mlRow}>
                <Text style={s.mlLabel}>DISPOSITIVO</Text>
                <Text style={s.mlValue}>
                  {user.biometric_provider === 'oura' ? '⬡ Oura Ring' : '◈ WHOOP'}
                </Text>
              </View>
              {user.biometric_readiness != null && (
                <View style={s.mlRow}>
                  <Text style={s.mlLabel}>READINESS (3d avg)</Text>
                  <Text style={[s.mlValue, {
                    color: user.biometric_readiness >= 70 ? palette.success
                      : user.biometric_readiness >= 50 ? palette.warning
                      : palette.danger,
                  }]}>
                    {user.biometric_readiness}/100
                  </Text>
                </View>
              )}
              {user.biometric_hrv_ms != null && (
                <View style={s.mlRow}>
                  <Text style={s.mlLabel}>HRV HOY</Text>
                  <Text style={s.mlValue}>{Math.round(user.biometric_hrv_ms)} ms</Text>
                </View>
              )}
              {user.biometric_resting_hr != null && (
                <View style={s.mlRow}>
                  <Text style={s.mlLabel}>FC REPOSO</Text>
                  <Text style={s.mlValue}>{user.biometric_resting_hr} bpm</Text>
                </View>
              )}
              {user.biometric_anomaly && (
                <View style={[s.anomalyAlert, { marginTop: spacing.sm }]}>
                  <Text style={s.anomalyText}>
                    ⚠ {user.biometric_anomaly === 'biometric_stress'
                      ? 'HRV baja — sistema nervioso bajo tensión'
                      : 'FC reposo elevada sobre línea base'}
                  </Text>
                </View>
              )}
            </>
          )}
        </PremiumCard>

        {/* ─────────────────────────────────────────────────── */}
        {/* L. CUERPO & PROTOCOLO (lo que el cliente HACE) */}
        {/* ─────────────────────────────────────────────────── */}
        <View onLayout={onSectionLayout('body')}>
          <GoldDivider label="L. CUERPO & PROTOCOLO" />
        </View>
        <HabitsCard habits={activity.habits} logs={activity.habitLogs} />
        <WellnessSessionsCard sessions={activity.wellness} />
        <FastingCard sessions={activity.fasting} />
        <BodyCard measurements={activity.body} />
        <NutritionCard profile={activity.nutrition} />
        <SupplementsCard stacks={activity.supplements} />

        {/* ─────────────────────────────────────────────────── */}
        {/* N. REFLEXIONES & COMUNIDAD (lo que el cliente PIENSA y CONECTA) */}
        {/* ─────────────────────────────────────────────────── */}
        <View onLayout={onSectionLayout('reflections')}>
          <GoldDivider label="N. REFLEXIONES & COMUNIDAD" />
        </View>
        <JournalCard entries={activity.journal} />
        <CommunityCard
          posts={activity.posts}
          reactionsGiven={activity.reactionsGiven}
          dmsSent={activity.dmsSent}
          dmLastActivity={activity.dmLastActivity}
        />

        {/* ─────────────────────────────────────────────────── */}
        {/* H. AUDITORÍA DE ESTE USUARIO */}
        {/* ─────────────────────────────────────────────────── */}
        <GoldDivider label={`H. AUDITORÍA (${auditLog.length})`} />
        <PremiumCard style={s.card}>
          {auditLog.length === 0 ? (
            <Text style={s.emptyText}>Sin acciones admin sobre este usuario</Text>
          ) : (
            auditLog.map(entry => (
              <View key={entry.id} style={s.auditRow}>
                <Text style={s.auditAction}>{entry.action.replace(/_/g, ' ')}</Text>
                <Text style={s.auditTime}>{timeAgo(entry.created_at)}</Text>
              </View>
            ))
          )}
        </PremiumCard>
      </ScrollView>

      <NormanModal
        visible={showNorman}
        onClose={() => setShowNorman(false)}
        onSend={handleSendNorman}
      />

      {/* ── Modal: Editar identidad ── */}
      <Modal
        visible={editOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEditOpen(false)}
        accessibilityViewIsModal>
        <View style={mo.overlay}>
          <View style={mo.sheet} accessibilityLabel="Editar identidad del usuario">
            <Text style={mo.edTitle} accessibilityRole="header">EDITAR IDENTIDAD</Text>
            <Text style={mo.edLabel}>NOMBRE</Text>
            <TextInput
              style={mo.edInput}
              value={eName}
              onChangeText={setEName}
              placeholder="Nombre"
              placeholderTextColor={palette.smoke}
            />
            <Text style={[mo.edLabel, { marginTop: spacing.md }]}>ROL / ETIQUETA</Text>
            <TextInput
              style={mo.edInput}
              value={eLabel}
              onChangeText={setELabel}
              placeholder="Ej. Fundadora, Aprendiz…"
              placeholderTextColor={palette.smoke}
            />
            <Text style={mo.edHint}>El tier de suscripción se cambia en “B. Membresías y acceso”.</Text>
            <View style={mo.edFooter}>
              <Pressable style={mo.edCancel} onPress={() => setEditOpen(false)} accessibilityRole="button" accessibilityLabel="Cancelar">
                <Text style={mo.edCancelText}>CANCELAR</Text>
              </Pressable>
              <Pressable
                style={[mo.edSave, savingEdit && { opacity: 0.6 }]}
                onPress={handleSaveIdentity}
                disabled={savingEdit}
                accessibilityRole="button"
                accessibilityState={{ disabled: savingEdit }}
                accessibilityLabel="Guardar identidad">
                {savingEdit ? (
                  <ActivityIndicator color={palette.ink} size="small" />
                ) : (
                  <Text style={mo.edSaveText}>GUARDAR</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  backBtn: { padding: spacing.xs },
  headerTitle: { ...typography.title, color: palette.ivory, fontSize: 18, letterSpacing: 0.5 },
  headerSub: { ...typography.caption, color: palette.smoke, fontSize: 11, letterSpacing: 0.8, marginTop: 2 },

  // Chip strip de navegación (sticky)
  navStrip: {
    backgroundColor: palette.blackDeep,
    borderBottomColor: palette.line,
    borderBottomWidth: 1,
    marginBottom: spacing.sm,
    paddingVertical: 8,
  },
  navStripInner: { paddingHorizontal: spacing.lg, gap: 6 },
  navChip: {
    backgroundColor: palette.graphite,
    borderRadius: 999,
    borderColor: palette.line,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  navChipTxt: { ...typography.label, color: palette.ash, fontSize: 10, letterSpacing: 1 },

  card: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: spacing.md },
  emptyText: { ...typography.caption, color: palette.smoke, textAlign: 'center', paddingVertical: spacing.sm },

  identityRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  bigAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: palette.goldLight, borderWidth: 1, borderColor: palette.lineGold, alignItems: 'center', justifyContent: 'center' },
  bigAvatarText: { fontFamily: Fonts.display, fontSize: 20, color: palette.goldText },
  userName: { fontFamily: Fonts.sans, fontWeight: '700', fontSize: 16, color: palette.ivory },
  userRole: { ...typography.caption, color: palette.ash, marginTop: 2 },
  userMeta: { ...typography.mono, color: palette.smoke, marginTop: 2, fontSize: 10 },

  normanBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: palette.goldLight, borderRadius: radii.md, borderWidth: 1, borderColor: palette.lineGold, alignSelf: 'flex-start' },
  normanBtnText: { ...typography.label, color: palette.goldText, fontSize: 10 },

  currentTierRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, borderWidth: 1, marginBottom: spacing.sm, backgroundColor: palette.graphite },
  currentTierDot: { width: 10, height: 10, borderRadius: 5 },
  currentTierLabel: { ...typography.label, color: palette.ash, fontSize: 8, letterSpacing: 1.5 },
  currentTierName: { fontFamily: Fonts.display, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  changeTierBtn: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.xs, borderWidth: 1 },
  changeTierText: { ...typography.label, fontSize: 8, fontWeight: '700' },

  // Panel de NIVEL DE ACCESO (4 roles)
  rolePanel: { gap: 4, marginBottom: spacing.md },
  rolePanelTitle: { ...typography.label, color: palette.ash, fontSize: 9, letterSpacing: 1.5, marginBottom: 4 },
  roleOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radii.sm, borderWidth: 1, borderColor: palette.line },
  roleOptionActive: { borderColor: palette.lineGold, backgroundColor: palette.goldLight },
  roleOptionLabel: { ...typography.section, color: palette.ivory, fontSize: 13, letterSpacing: 0.3 },
  roleOptionDesc: { ...typography.caption, color: palette.smoke, fontSize: 10.5, marginTop: 1 },
  roleCurrentTag: { ...typography.label, color: palette.goldText, fontSize: 8, letterSpacing: 1 },

  membershipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.lineSoft },
  membershipProduct: { fontFamily: Fonts.display, fontSize: 11, color: palette.ivory, letterSpacing: 1 },
  membershipMeta: { ...typography.caption, color: palette.smoke, marginTop: 2, fontSize: 10 },
  membershipPrice: { ...typography.mono, color: palette.goldText, fontSize: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  deactivateBtn: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.xs, borderWidth: 1, borderColor: palette.danger },
  deactivateText: { ...typography.label, color: palette.danger, fontSize: 8 },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: spacing.sm, backgroundColor: palette.goldLight, borderRadius: radii.sm, borderWidth: 1, borderColor: palette.lineGold },
  addBtnText: { ...typography.label, color: palette.goldText, fontSize: 9 },

  courseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  courseLabel: { ...typography.section, color: palette.ivory, flex: 1, fontSize: 11 },
  courseMeta: { ...typography.mono, color: palette.smoke, fontSize: 10 },

  mlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.lineSoft },
  mlLabel: { ...typography.label, color: palette.smoke, fontSize: 9 },
  mlValue: { fontFamily: Fonts.mono, fontSize: 12, color: palette.ivory },
  mlBody: { ...typography.caption, color: palette.ivory, marginTop: spacing.xs },
  anomalyAlert: { marginTop: spacing.md, backgroundColor: 'rgba(192,57,43,0.12)', borderRadius: radii.sm, padding: spacing.md, borderWidth: 1, borderColor: palette.danger },
  anomalyText: { fontFamily: Fonts.sans, fontWeight: '700', fontSize: 13, color: palette.danger },

  evtRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  evtDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.gold },
  evtType: { fontFamily: Fonts.sans, fontSize: 12, color: palette.ivory, flex: 1, textTransform: 'capitalize' },
  evtScreen: { ...typography.mono, color: palette.smoke, fontSize: 10 },
  evtTime: { ...typography.mono, color: palette.smoke, fontSize: 10 },

  convBubble: { borderRadius: radii.sm, padding: spacing.sm, marginBottom: spacing.sm },
  bubbleLeft: { backgroundColor: palette.overlay, alignSelf: 'flex-start', maxWidth: '90%' },
  bubbleRight: { backgroundColor: palette.goldLight, borderColor: palette.lineGold, borderWidth: 1, alignSelf: 'flex-end', maxWidth: '90%' },
  convRole: { ...typography.label, color: palette.smoke, fontSize: 8, marginBottom: 2 },
  convText: { ...typography.caption, color: palette.ivory },
  convTime: { ...typography.mono, color: palette.smoke, fontSize: 9, marginTop: 2 },

  checkInHeader: { flexDirection: 'row', paddingBottom: spacing.xs, borderBottomWidth: 1, borderBottomColor: palette.line },
  checkInHeaderCell: { ...typography.label, color: palette.smoke, flex: 1, textAlign: 'center', fontSize: 8 },
  checkInRow: { flexDirection: 'row', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: palette.lineSoft },
  checkInCell: { ...typography.mono, color: palette.ivory, flex: 1, textAlign: 'center', fontSize: 11 },

  // Mentorship
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  taskTitle: { ...typography.caption, color: palette.ivory, flex: 1, fontSize: 12 },
  taskTitleDone: { color: palette.smoke, textDecorationLine: 'line-through' },
  taskWeek: { ...typography.mono, color: palette.smoke, fontSize: 9 },
  sessionBox: { marginTop: spacing.sm, backgroundColor: palette.graphite, borderRadius: radii.sm, padding: spacing.md, borderLeftWidth: 3, borderLeftColor: palette.gold },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  sessionWeek: { ...typography.label, color: palette.goldText, fontSize: 9, letterSpacing: 1 },
  sessionDate: { ...typography.mono, color: palette.smoke, fontSize: 10 },
  sessionNotes: { ...typography.caption, color: palette.ash, fontSize: 12, lineHeight: 18 },
  sessionNotesEmpty: { ...typography.caption, color: palette.smoke, fontSize: 11, fontStyle: 'italic' },
  planList: { marginTop: spacing.sm, gap: 4 },
  planRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  planText: { ...typography.caption, color: palette.ivory, flex: 1, fontSize: 11, lineHeight: 16 },

  // Mentoría operable desde admin
  mentError: { ...typography.caption, color: palette.danger, fontSize: 11, marginBottom: spacing.xs },
  mentComposerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  mentWeekLabel: { ...typography.label, color: palette.smoke, fontSize: 9, letterSpacing: 1 },
  mentWeekInput: {
    ...typography.mono, color: palette.ivory, fontSize: 12, backgroundColor: palette.charcoal,
    borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, minWidth: 52, textAlign: 'center',
  },
  mentNoteInput: {
    ...typography.body, color: palette.ivory, fontSize: 13, backgroundColor: palette.charcoal,
    borderRadius: radii.sm, padding: spacing.md, minHeight: 72, marginTop: spacing.xs,
  },
  mentBtn: {
    backgroundColor: palette.gold, borderRadius: radii.sm, paddingVertical: spacing.sm,
    alignItems: 'center', justifyContent: 'center', minHeight: 40, marginTop: spacing.sm,
  },
  mentBtnText: { ...typography.label, color: palette.ink, fontSize: 12, letterSpacing: 1 },
  sessionHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  planAddRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  planAddInput: {
    ...typography.caption, color: palette.ivory, fontSize: 12, backgroundColor: palette.charcoal,
    borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, flex: 1, minHeight: 36,
  },
  planActionsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  planActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, borderColor: palette.lineGold, borderWidth: 1,
    borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 6, minHeight: 30,
  },
  planActionText: { ...typography.label, color: palette.goldText, fontSize: 10, letterSpacing: 1 },

  auditRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.lineSoft },
  auditAction: { fontFamily: Fonts.sans, fontSize: 12, color: palette.ivory, textTransform: 'capitalize' },
  auditTime: { ...typography.mono, color: palette.smoke, fontSize: 10 },

  weeklySessionBox: { marginTop: spacing.md, backgroundColor: palette.graphite, borderRadius: radii.sm, padding: spacing.md, borderLeftWidth: 3, borderLeftColor: palette.gold },
  weeklySessionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  weeklySessionText: { ...typography.body, color: palette.ash, fontStyle: 'italic', lineHeight: 20 },
});

const h = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  title: { ...typography.label, color: palette.smoke, fontSize: 9 },
  actionBtn: { paddingHorizontal: spacing.sm, paddingVertical: 3, backgroundColor: palette.goldLight, borderRadius: radii.xs, borderWidth: 1, borderColor: palette.lineGold },
  actionText: { ...typography.label, color: palette.goldText, fontSize: 9 },
});

const g = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  track: { flex: 1, height: 6, backgroundColor: palette.charcoal, borderRadius: 3 },
  fill: { height: 6, borderRadius: 3 },
  label: { ...typography.mono, fontSize: 11, width: 50, textAlign: 'right' },
});

const ab = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  label: { ...typography.mono, color: palette.ash, fontSize: 10, width: 80 },
  track: { flex: 1, height: 4, backgroundColor: palette.charcoal, borderRadius: 2 },
  fill: { height: 4, borderRadius: 2, backgroundColor: palette.gold },
  pct: { ...typography.mono, color: palette.smoke, fontSize: 10, width: 32, textAlign: 'right' },
});

const mo = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  sheet: { backgroundColor: palette.graphiteLight, borderRadius: radii.lg, padding: spacing.xl, width: '100%', maxWidth: 480, gap: spacing.md },
  editIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm },
  edTitle: { ...typography.section, color: palette.ivory, fontSize: 15, marginBottom: spacing.sm },
  edLabel: { ...typography.label, color: palette.goldText, fontSize: 11, letterSpacing: 1.5, marginBottom: 6 },
  edInput: { ...typography.body, color: palette.ivory, fontSize: 14, backgroundColor: palette.charcoal, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  edHint: { ...typography.caption, color: palette.smoke, fontSize: 11, marginTop: spacing.sm },
  edFooter: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  edCancel: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.line, borderRadius: radii.sm, paddingVertical: spacing.md },
  edCancelText: { ...typography.label, color: palette.smoke, fontSize: 12, letterSpacing: 1 },
  edSave: { flex: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.gold, borderRadius: radii.sm, paddingVertical: spacing.md },
  edSaveText: { ...typography.label, color: palette.ink, fontSize: 12, letterSpacing: 1 },
  title: { ...typography.section, color: palette.goldText },
  sub: { ...typography.caption, color: palette.smoke },
  input: { backgroundColor: palette.graphite, borderColor: palette.line, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, fontFamily: Fonts.sans, fontSize: 14, color: palette.ivory, minHeight: 100, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  cancelBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.sm, borderWidth: 1, borderColor: palette.line },
  cancelText: { ...typography.label, color: palette.ash },
  sendBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.sm, backgroundColor: palette.gold },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { ...typography.label, color: palette.ink },
});
