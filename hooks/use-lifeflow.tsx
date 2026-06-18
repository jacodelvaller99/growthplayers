import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import { ACTIVE_MODULE } from '@/data/modules';
import { LESSON_TASKS } from '@/data/tasks';
import { supabase, db } from '@/lib/supabase';
import { ENV } from '@/app/config/env';
import { calcProtocolDay } from '@/lib/utils';
import { enqueueWrite, initOfflineFlush } from '@/lib/offlineQueue';
import { checkCriticalSchema } from '@/lib/schemaHealth';
import { resolveEntitlement } from '@/lib/subscription';
import { readLocal, removeLocal, writeLocal } from '@/storage/local';
import { initRevenueCat, checkSubscription } from '@/services/revenuecat';
import { useWellnessStore } from '@/store/wellnessStore';
import type { CheckIn, LessonTask, LifeFlowState, MentorMessage, NorthStar, UserProfile, WellnessSession } from '@/types/lifeflow';

// ─── Local cache key ──────────────────────────────────────────────────────────
const STATE_KEY = 'state';

// ─── Outbox de mensajes (insert no-idempotente → idempotente vía client_id) ───
// Se auto-ajusta: si la columna client_id aún no existe (migración pendiente),
// cae al insert simple actual sin romper. Post-migración usa upsert-on-client_id
// (entrega exactamente-una-vez); offline/fallo encola para replay idempotente.
let _clientIdColMissing = false;

function isMissingClientIdColumn(err: unknown): boolean {
  const msg = ((err as Error)?.message ?? '').toLowerCase();
  // 42703 undefined_column · 42P10 no unique/exclusion constraint matching ON CONFLICT
  return msg.includes('client_id') || msg.includes('on conflict') ||
    msg.includes('42703') || msg.includes('42p10');
}

async function persistMentorMessages(
  uid: string,
  userMsg: MentorMessage,
  mentorMsg: MentorMessage,
): Promise<void> {
  const base = [
    { user_id: uid, role: 'user' as const,      content: userMsg.text,   created_at: userMsg.createdAt },
    { user_id: uid, role: 'assistant' as const, content: mentorMsg.text, created_at: mentorMsg.createdAt },
  ];
  const withCid = [
    { ...base[0], client_id: userMsg.id },
    { ...base[1], client_id: mentorMsg.id },
  ];
  const msgs = () => (supabase as unknown as { from: (t: string) => any }).from('mentor_messages');
  const enqueueBoth = async () => {
    await enqueueWrite({ table: 'mentor_messages', payload: withCid[0], onConflict: 'user_id,client_id' });
    await enqueueWrite({ table: 'mentor_messages', payload: withCid[1], onConflict: 'user_id,client_id' });
  };

  if (!_clientIdColMissing) {
    try {
      const { error } = await msgs().upsert(withCid, { onConflict: 'user_id,client_id' });
      if (error) throw error;
      return; // exactamente-una-vez (columna client_id presente)
    } catch (e) {
      if (isMissingClientIdColumn(e)) {
        _clientIdColMissing = true; // pre-migración → insert simple desde ahora
      } else {
        await enqueueBoth(); // sin red u otro fallo → outbox idempotente
        return;
      }
    }
  }
  // Camino pre-migración: insert simple (comportamiento actual, sin client_id).
  try {
    const { error } = await msgs().insert(base);
    if (error) throw error;
  } catch (e) {
    console.warn('[Supabase] addMentorMessages (encolado para reintento):', e);
    await enqueueBoth();
  }
}

// ─── Default values ──────────────────────────────────────────────────────────
const defaultNorth: NorthStar = {
  purpose: 'Construir una vida soberana, rentable y fisicamente impecable.',
  identity: 'Soy un empresario que decide con calma, ejecuta con precision y protege su energia.',
  nonNegotiables: [
    'Entrenar o recuperar el cuerpo',
    'Un bloque profundo antes de mensajeria',
    'Cerrar una decision importante',
  ],
  dailyReminder: 'No negocio con el ruido. Hoy mando desde criterio, no desde urgencia.',
};

// Fixed epoch used in defaultState to ensure SSG output matches client hydration.
// Dynamic new Date() at module level differs between build time and runtime → React #418.
const DEFAULT_EPOCH = '2024-01-01T00:00:00.000Z';

const defaultState: LifeFlowState = {
  onboardingCompleted: false,
  protocolStartDate: DEFAULT_EPOCH,
  activeProgramId: 'protocolo-soberano',
  activeModuleId: ACTIVE_MODULE.id,
  profile: { name: 'Juan Carlos', role: 'Empresario' },
  northStar: defaultNorth,
  checkIns: [],
  mentorMessages: [
    {
      id: 'seed-mentor',
      role: 'mentor',
      text: 'Estoy leyendo tu protocolo. Haz check-in y te devuelvo una instruccion operativa para hoy.',
      createdAt: DEFAULT_EPOCH,
    },
  ],
  completedLessons: [],
  completedTasks: {},
  wellnessSessions: [],
  subscriptionTier: 'free',
  subscriptionExpiresAt: null,
};

// ─── Context type ─────────────────────────────────────────────────────────────
type LifeFlowContextValue = {
  state: LifeFlowState;
  isLoaded: boolean;
  isAuthenticated: boolean;
  isSubscribed: boolean;
  protocolDay: number;
  /** Authenticated Supabase user ID — null when anonymous or unauthenticated */
  userId: string | null;
  latestCheckIn: CheckIn | null;
  todayCheckIn: CheckIn | null;
  averages: { energy: number; clarity: number; stress: number; sleep: number };
  completeOnboarding: (payload: {
    profile: UserProfile;
    northStar: NorthStar;
    activeProgramId: string;
  }) => Promise<void>;
  updateProfile: (profile: UserProfile) => Promise<void>;
  updateNorthStar: (northStar: NorthStar) => Promise<void>;
  /** Resultado honesto del guardado: 'synced' (en Supabase), 'queued' (sin red,
   *  encolado para reintento) o 'local' (sin sesión — solo dispositivo). */
  saveCheckIn: (checkIn: Omit<CheckIn, 'id' | 'date'>) => Promise<'synced' | 'queued' | 'local'>;
  sendMentorMessage: (text: string) => Promise<void>;
  addMentorMessages: (userMsg: MentorMessage, mentorMsg: MentorMessage) => Promise<void>;
  saveLessonTask: (lessonId: string, responses: Record<string, string>) => Promise<void>;
  markLessonComplete: (lessonId: string) => Promise<void>;
  saveMentorMessage: (role: 'user' | 'assistant', content: string) => Promise<void>;
  saveWellnessSession: (session: Omit<WellnessSession, 'id'>) => Promise<void>;
  /** Load older mentor messages from Supabase (pagination). Returns true if more exist. */
  loadMoreMentorMessages: (currentCount: number) => Promise<boolean>;
  /** GDPR: permanently delete all user data and the auth account. */
  deleteAccount: () => Promise<void>;
  /** GDPR: export all user data as a JSON string. */
  exportData: () => Promise<string>;
  resetOnboarding: () => Promise<void>;
  clearData: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-reads subscription_tier from DB and syncs local state + localStorage. */
  refreshTier: () => Promise<void>;
};

const LifeFlowContext = createContext<LifeFlowContextValue | null>(null);

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function average(items: number[]) {
  if (!items.length) return 0;
  return Math.round(items.reduce((s, n) => s + n, 0) / items.length);
}

// Timezone-safe: compare local date strings directly.
// Handles both ISO ("2026-04-30T18:29Z") and bare DATE ("2026-04-30") from Supabase.
function isSameDay(a: string, b: Date) {
  const dateA = a.slice(0, 10); // "YYYY-MM-DD"
  const year  = b.getFullYear();
  const month = String(b.getMonth() + 1).padStart(2, '0');
  const day   = String(b.getDate()).padStart(2, '0');
  return dateA === `${year}-${month}-${day}`;
}

function todayDateStr() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

// ─── Mentor IA (keyword-based fallback) ──────────────────────────────────────
function mentorReply(text: string, state: LifeFlowState, latest: CheckIn | null): string {
  const lower = text.toLowerCase();
  const energy  = latest?.energy  ?? 6;
  const clarity = latest?.clarity ?? 6;
  const stress  = latest?.stress  ?? 5;

  if (lower.includes('norte'))
    return `Tu norte hoy: ${state.northStar.purpose} — Traducción operativa: una acción visible, una conversación pendiente y cero fuga de atención.`;
  if (lower.includes('practica'))
    return stress >= 7
      ? 'Práctica: 6 minutos de respiración nasal, luego escribe la decisión que estás evitando.'
      : 'Práctica: bloque de 45 minutos con una sola salida medible. Al terminar registra fricción, energía y siguiente movimiento.';
  if (lower.includes('ordena') || lower.includes('dia'))
    return `Orden del día: 1) Check-in completo. 2) Lección activa del módulo ${ACTIVE_MODULE.order}. 3) Bloque mercader profundo. 4) Cierre con evidencia.`;
  if (energy <= 5)
    return 'Tu sistema está bajo de energía. Reduce amplitud: una prioridad, recuperación activa y una decisión cerrada.';
  if (clarity <= 5)
    return 'La claridad está baja. Escribe tres opciones, elimina dos y ejecuta la que tenga mayor retorno con menor fricción.';
  return 'Estado útil para ejecución. Mantente en modo mercader: protege atención, convierte tiempo en avance visible.';
}

// ─── Migrate persisted state → ensure all fields exist ───────────────────────
function migrateState(loaded: Partial<LifeFlowState>): LifeFlowState {
  return {
    ...defaultState,
    ...loaded,
    completedLessons:      loaded.completedLessons      ?? [],
    completedTasks:        loaded.completedTasks        ?? {},
    checkIns:              loaded.checkIns              ?? [],
    mentorMessages:        loaded.mentorMessages        ?? defaultState.mentorMessages,
    wellnessSessions:      loaded.wellnessSessions      ?? [],
    subscriptionTier:      loaded.subscriptionTier      ?? 'free',
    subscriptionExpiresAt: loaded.subscriptionExpiresAt ?? null,
  };
}

// ─── Load all user data from Supabase ────────────────────────────────────────
async function loadUserData(uid: string): Promise<LifeFlowState | null> {
  const [
    { data: profile, error: profileError },
    { data: checkIns },
    { data: lessonTaskRows },
    { data: completedRows },
    { data: mentorRows },
    { data: wellnessRows },
  ] = await Promise.all([
    db.profiles().select('*').eq('user_id', uid).single(),
    db.checkins().select('*').eq('user_id', uid).order('date', { ascending: false }).limit(30),
    db.tasks().select('*').eq('user_id', uid),
    db.completed().select('*').eq('user_id', uid),
    db.messages().select('*').eq('user_id', uid).order('created_at', { ascending: true }).limit(50),
    db.wellness().select('*').eq('user_id', uid).order('completed_at', { ascending: false }).limit(100),
  ]);

  if (profileError || !profile) return null;

  const checkInsMapped: CheckIn[] = (checkIns ?? []).map((c) => ({
    id:         c.id,
    date:       c.date,
    energy:     c.energy    ?? 5,
    clarity:    c.clarity   ?? 5,
    stress:     c.stress    ?? 5,
    sleep:      c.sleep     ?? 5,
    systemNeed: c.system_need ?? '',
  }));

  // Rebuild completedTasks from DB rows
  const completedTasks: Record<string, LessonTask> = {};
  for (const row of (lessonTaskRows ?? [])) {
    const template = LESSON_TASKS[row.lesson_id];
    if (template) {
      completedTasks[row.lesson_id] = {
        ...template,
        completedAt: row.completed_at ?? undefined,
        responses:   (row.responses as Record<string, string>) ?? {},
      };
    }
  }

  const completedLessons = (completedRows ?? []).map((r) => r.lesson_id);

  const mentorMessages: MentorMessage[] =
    (mentorRows ?? []).length > 0
      ? (mentorRows ?? []).map((m) => ({
          id:        m.id,
          // Supabase stores 'assistant', local state uses 'mentor'
          role:      (m.role === 'assistant' ? 'mentor' : m.role) as 'mentor' | 'user',
          text:      m.content,
          createdAt: m.created_at ?? new Date().toISOString(),
        }))
      : defaultState.mentorMessages;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wellnessSessions: WellnessSession[] = (wellnessRows ?? []).map((w: any) => ({
    id:              w.id,
    type:            w.type as WellnessSession['type'],
    sessionName:     w.session_name,
    durationSeconds: w.duration_seconds,
    completedAt:     w.completed_at,
    metadata:        w.metadata ?? {},
  }));

  const result: LifeFlowState = {
    onboardingCompleted: true, // if profile exists, onboarding was completed
    protocolStartDate:   profile.protocol_start_date
      ? new Date(profile.protocol_start_date).toISOString()
      : new Date().toISOString(),
    activeProgramId: 'protocolo-soberano',
    activeModuleId:  ACTIVE_MODULE.id,
    profile: {
      name: profile.name ?? defaultState.profile.name,
      role: defaultState.profile.role, // role is not stored in new schema
    },
    northStar: {
      purpose:         profile.purpose        ?? defaultNorth.purpose,
      identity:        profile.identity       ?? defaultNorth.identity,
      nonNegotiables:  profile.non_negotiables ?? defaultNorth.nonNegotiables,
      dailyReminder:   profile.daily_reminder ?? defaultNorth.dailyReminder,
    },
    checkIns:              checkInsMapped,
    mentorMessages,
    completedLessons,
    completedTasks,
    wellnessSessions,
    subscriptionTier:      'free',
    subscriptionExpiresAt: null,
  };

  // Load subscription tier from profiles (auth-linked table)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: authProfile } = await (supabase as any)
      .from('profiles')
      .select('subscription_tier, subscription_expires_at')
      .eq('id', uid)
      .single();
    if (authProfile) {
      result.subscriptionTier      = authProfile.subscription_tier      ?? 'free';
      result.subscriptionExpiresAt = authProfile.subscription_expires_at ?? null;
    }
  } catch { /* profiles.subscription_tier not yet migrated — ignore */ }

  return result;
}

// ─── Migrate local storage → Supabase (first sync) ───────────────────────────
async function migrateLocalToSupabase(uid: string, s: LifeFlowState) {
  try {
    await db.profiles().upsert({
      user_id:             uid,
      name:                s.profile.name,
      protocol_start_date: s.protocolStartDate.split('T')[0],
      purpose:             s.northStar.purpose,
      identity:            s.northStar.identity,
      non_negotiables:     s.northStar.nonNegotiables,
      daily_reminder:      s.northStar.dailyReminder,
    }, { onConflict: 'user_id' });
  } catch (e) {
    console.warn('[Supabase migrate profile]', e);
  }

  for (const c of s.checkIns) {
    try {
      await db.checkins().upsert(
        {
          user_id:     uid,
          date:        c.date.split('T')[0],
          energy:      c.energy,
          clarity:     c.clarity,
          stress:      c.stress,
          sleep:       c.sleep,
          system_need: c.systemNeed,
        },
        { onConflict: 'user_id,date' },
      );
    } catch (e) {
      console.warn('[Supabase migrate checkin]', e);
    }
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
// Dev bypass: if SUPABASE_URL is placeholder, sign in anonymously
const SUPABASE_URL_VALUE = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const IS_PLACEHOLDER_URL = SUPABASE_URL_VALUE.includes('your-project') || !SUPABASE_URL_VALUE;

// ─── Sync init from localStorage (web only, SPA mode — no SSR) ───────────────
// With output:"spa" there is no server pre-render, so reading localStorage here
// is safe and gives instant state on mount (no hydration mismatch possible).
function getInitialState(): LifeFlowState {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem('lifeflow:v2:state');
      if (raw) return migrateState(JSON.parse(raw) as Partial<LifeFlowState>);
    } catch { /* ignore parse errors */ }
  }
  return defaultState;
}

export function LifeFlowProvider({ children }: { children: ReactNode }) {
  const [state, setState]                 = useState<LifeFlowState>(getInitialState);
  const [isLoaded, setIsLoaded]           = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // rcActive: recibo de RevenueCat. isSubscribed se DERIVA reconciliando el recibo
  // con el tier de la DB + expiración (un tier vencido no da acceso). Resuelve el
  // split-brain RC↔DB y exige expiresAt > now.
  const [rcActive, setRcActive]           = useState(false);
  // uidRef: lectura síncrona dentro de callbacks/async (evita closures stale).
  // userId (estado): lo que se expone por contexto → reactivo, fuerza re-render
  // en los consumidores cuando cambia el usuario (login/logout).
  const uidRef = useRef<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const applyUid = (uid: string | null) => { uidRef.current = uid; setUserId(uid); };

  // ── Outbox offline ───────────────────────────────────────────────────────────
  // Reintenta escrituras idempotentes del core-loop (check-in, lecciones) que
  // fallaron sin red: una vez al abrir la app y cada vez que vuelve la conexión.
  useEffect(() => initOfflineFlush(), []);

  // ── Init ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    let tierChannel: ReturnType<typeof supabase.channel> | null = null;

    // ── Background refresh: runs after UI is visible, never blocks render ──────
    async function backgroundRefresh(uid: string) {
      const [remote] = await Promise.all([
        loadUserData(uid),
        (async () => {
          try {
            await initRevenueCat();
            const subscribed = await checkSubscription();
            if (mounted) setRcActive(subscribed);
          } catch { /* ignore */ }
        })(),
      ]);
      if (remote && mounted) {
        setState(remote);
        writeLocal(STATE_KEY, remote);
      }
    }

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      let uid = session?.user?.id ?? null;

      // Dev bypass: sign in anonymously SOLO en desarrollo y solo si la URL de
      // Supabase es placeholder. El gate `__DEV__` garantiza que un build de
      // producción mal configurado (env faltante → IS_PLACEHOLDER_URL true) NUNCA
      // meta a un usuario con sesión anónima sin credenciales; fallaría visible.
      if (!uid && IS_PLACEHOLDER_URL && __DEV__) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (!error && data.user) uid = data.user.id;
      }

      if (uid) {
        applyUid(uid);
        if (mounted) setIsAuthenticated(true);

        // Healthcheck de schema (fire-and-forget): si falta una migración crítica,
        // deja rastro en vez de degradar en silencio. No bloquea el arranque.
        void checkCriticalSchema();

        // Realtime: reflect tier changes from DB instantly (must be set up after uid is known)
        tierChannel = supabase
          .channel(`profile-tier-${uid}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (payload: any) => {
              if (!mounted) return;
              const newTier    = payload.new?.subscription_tier;
              const newExpires = payload.new?.subscription_expires_at ?? null;
              if (newTier) {
                setState((prev) => {
                  const next = { ...prev, subscriptionTier: newTier, subscriptionExpiresAt: newExpires };
                  writeLocal(STATE_KEY, next);
                  return next;
                });
              }
            },
          )
          .subscribe();

        // ── PHASE 1: instant load when cached state exists ─────────────────
        // getInitialState() already read localStorage synchronously (SPA mode,
        // no SSR — safe to read localStorage in useState initializer).
        // If the user completed onboarding before, show the UI immediately
        // and refresh all data in the background.
        if (state.onboardingCompleted) {
          if (mounted) setIsLoaded(true);
          backgroundRefresh(uid).catch(() => {});
          return;
        }

        // ── PHASE 1 (no cache): run RevenueCat + data fetch in parallel ────
        const [remote] = await Promise.all([
          loadUserData(uid),
          (async () => {
            try {
              await initRevenueCat();
              const subscribed = await checkSubscription();
              if (mounted) setRcActive(subscribed);
            } catch { /* ignore */ }
          })(),
        ]);

        if (remote) {
          if (mounted) {
            setState(remote);
            writeLocal(STATE_KEY, remote);
          }
          if (mounted) setIsLoaded(true);
          return;
        }

        const local = await readLocal<LifeFlowState>(STATE_KEY);
        if (local) {
          const safe = migrateState(local);
          if (mounted) setState(safe);
          migrateLocalToSupabase(uid, safe).catch(console.error);
        }
      } else {
        // Not authenticated — load local data if available
        const local = await readLocal<LifeFlowState>(STATE_KEY);
        if (local && mounted) setState(migrateState(local));
        if (mounted) setIsAuthenticated(false);
      }

      if (mounted) setIsLoaded(true);
    }

    init().catch(async (err) => {
      console.error('[LifeFlow] init error:', err);
      const local = await readLocal<LifeFlowState>(STATE_KEY);
      if (local && mounted) setState(migrateState(local));
      if (mounted) setIsLoaded(true);
    });

    // Listen for auth state changes (sign in / sign out from auth screen)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        const uid = session?.user?.id ?? null;
        setIsAuthenticated(!!uid);

        if (uid && uid !== uidRef.current) {
          applyUid(uid);
          const remote = await loadUserData(uid);
          if (remote && mounted) {
            setState(remote);
            writeLocal(STATE_KEY, remote);
          }
        }
        if (!uid) {
          applyUid(null);
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      tierChannel?.unsubscribe();
    };
  }, []);

  // ── persist ──────────────────────────────────────────────────────────────────
  const persist = useCallback(async (next: LifeFlowState) => {
    setState(next);
    await writeLocal(STATE_KEY, next);
  }, []);

  // ── Computed values ──────────────────────────────────────────────────────────
  const latestCheckIn = useMemo(() => state.checkIns[0] ?? null, [state.checkIns]);

  const todayCheckIn = useMemo(
    () => state.checkIns.find((c) => isSameDay(c.date, new Date())) ?? null,
    [state.checkIns],
  );

  const protocolDay = useMemo(
    () => calcProtocolDay(state.protocolStartDate),
    [state.protocolStartDate],
  );

  const averages = useMemo(
    () => ({
      energy:  average(state.checkIns.map((c) => c.energy)),
      clarity: average(state.checkIns.map((c) => c.clarity)),
      stress:  average(state.checkIns.map((c) => c.stress)),
      sleep:   average(state.checkIns.map((c) => c.sleep)),
    }),
    [state.checkIns],
  );

  // ── Actions ──────────────────────────────────────────────────────────────────

  const completeOnboarding = useCallback(
    async (payload: { profile: UserProfile; northStar: NorthStar; activeProgramId: string }) => {
      const now = new Date().toISOString();
      const next: LifeFlowState = {
        ...state,
        onboardingCompleted: true,
        protocolStartDate:   now,
        profile:             payload.profile,
        northStar:           payload.northStar,
        activeProgramId:     payload.activeProgramId,
      };
      await persist(next);

      const uid = uidRef.current;
      if (!uid) return;

      try {
        await db.profiles().upsert({
          user_id:             uid,
          name:                payload.profile.name,
          protocol_start_date: now.split('T')[0],
          purpose:             payload.northStar.purpose,
          identity:            payload.northStar.identity,
          non_negotiables:     payload.northStar.nonNegotiables,
          daily_reminder:      payload.northStar.dailyReminder,
        }, { onConflict: 'user_id' });
      } catch (e) {
        console.warn('[Supabase] completeOnboarding:', e);
      }
    },
    [persist, state],
  );

  const updateProfile = useCallback(
    async (profile: UserProfile) => {
      await persist({ ...state, profile });
      const uid = uidRef.current;
      if (!uid) return;
      try {
        await db.profiles().update({ name: profile.name }).eq('user_id', uid);
      } catch (e) {
        console.warn('[Supabase] updateProfile:', e);
      }
    },
    [persist, state],
  );

  const updateNorthStar = useCallback(
    async (northStar: NorthStar) => {
      await persist({ ...state, northStar });
      const uid = uidRef.current;
      if (!uid) return;
      try {
        await db.profiles().upsert({
          user_id:         uid,
          purpose:         northStar.purpose,
          identity:        northStar.identity,
          non_negotiables: northStar.nonNegotiables,
          daily_reminder:  northStar.dailyReminder,
        }, { onConflict: 'user_id' });
      } catch (e) {
        console.warn('[Supabase] updateNorthStar:', e);
      }
    },
    [persist, state],
  );

  const saveCheckIn = useCallback(
    async (checkIn: Omit<CheckIn, 'id' | 'date'>): Promise<'synced' | 'queued' | 'local'> => {
      const now     = new Date();
      const dateStr = todayDateStr();
      const id      = `ci-${dateStr}`;

      const nextCheckIn: CheckIn = { ...checkIn, id, date: now.toISOString() };
      const next: LifeFlowState = {
        ...state,
        checkIns: [nextCheckIn, ...state.checkIns.filter((c) => !isSameDay(c.date, now))],
      };
      await persist(next);

      const uid = uidRef.current;
      if (!uid) return 'local';

      // Compute sovereign score for profile update
      const newScore = Math.round(
        (checkIn.energy + checkIn.clarity + (10 - checkIn.stress) + checkIn.sleep) / 4 * 100,
      );

      const checkInPayload = {
        user_id:         uid,
        date:            dateStr,
        energy:          checkIn.energy,
        clarity:         checkIn.clarity,
        stress:          checkIn.stress,
        sleep:           checkIn.sleep,
        system_need:     checkIn.systemNeed,
        sovereign_score: newScore,
      };
      let syncStatus: 'synced' | 'queued' = 'synced';
      try {
        await db.checkins().upsert(checkInPayload, { onConflict: 'user_id,date' });
      } catch (e) {
        console.warn('[Supabase] saveCheckIn (encolado para reintento):', e);
        await enqueueWrite({ table: 'daily_checkins', payload: checkInPayload, onConflict: 'user_id,date' });
        syncStatus = 'queued';
      }

      // Also update profile with latest score
      try {
        const streak = next.checkIns.length; // simplified; mentor.tsx computes accurate streak
        await db.profiles().upsert({
          user_id:         uid,
          sovereign_score: newScore,
          streak,
          total_days:      calcProtocolDay(state.protocolStartDate),
        }, { onConflict: 'user_id' });
      } catch (e) {
        console.warn('[Supabase] updateProfile score:', e);
      }

      return syncStatus;
    },
    [persist, state],
  );

  const sendMentorMessage = useCallback(
    async (text: string) => {
      const now = new Date().toISOString();
      const userMsg: MentorMessage = { id: `u-${Date.now()}`, role: 'user', text, createdAt: now };
      const replyText = mentorReply(text, state, latestCheckIn);
      const mentorMsg: MentorMessage = { id: `m-${Date.now()}`, role: 'mentor', text: replyText, createdAt: now };

      await persist({
        ...state,
        mentorMessages: [...state.mentorMessages, userMsg, mentorMsg],
      });

      const uid = uidRef.current;
      if (!uid) return;

      try {
        await db.messages().insert([
          { user_id: uid, role: 'user',      content: text,      created_at: now },
          { user_id: uid, role: 'assistant', content: replyText, created_at: now },
        ]);
      } catch (e) {
        console.warn('[Supabase] sendMentorMessage:', e);
      }
    },
    [latestCheckIn, persist, state],
  );

  const addMentorMessages = useCallback(
    async (userMsg: MentorMessage, mentorMsg: MentorMessage) => {
      const next: LifeFlowState = {
        ...state,
        mentorMessages: [...state.mentorMessages, userMsg, mentorMsg].slice(-20),
      };
      await persist(next);

      const uid = uidRef.current;
      if (!uid) return;

      // Outbox idempotente: nunca lanza; encola si falla la red (no se pierde).
      await persistMentorMessages(uid, userMsg, mentorMsg);
    },
    [persist, state],
  );

  const saveLessonTask = useCallback(
    async (lessonId: string, responses: Record<string, string>) => {
      const template = LESSON_TASKS[lessonId];
      if (!template) return;

      const completed: LessonTask = {
        ...template,
        completedAt: new Date().toISOString(),
        responses,
      };
      const next: LifeFlowState = {
        ...state,
        completedTasks: { ...state.completedTasks, [lessonId]: completed },
      };
      await persist(next);

      const uid = uidRef.current;
      if (!uid) return;

      const taskPayload = {
        user_id:      uid,
        lesson_id:    lessonId,
        lesson_title: template.title,
        module_id:    lessonId.split('-')[0],
        responses:    responses,
        completed_at: completed.completedAt,
      };
      try {
        await db.tasks().upsert(taskPayload, { onConflict: 'user_id,lesson_id' });
      } catch (e) {
        console.warn('[Supabase] saveLessonTask (encolado para reintento):', e);
        await enqueueWrite({ table: 'lesson_tasks', payload: taskPayload, onConflict: 'user_id,lesson_id' });
      }
    },
    [persist, state],
  );

  const markLessonComplete = useCallback(
    async (lessonId: string) => {
      if (state.completedLessons.includes(lessonId)) return;
      const next: LifeFlowState = {
        ...state,
        completedLessons: [...state.completedLessons, lessonId],
      };
      await persist(next);

      const uid = uidRef.current;
      if (!uid) return;

      const completedPayload = {
        user_id:      uid,
        lesson_id:    lessonId,
        module_id:    lessonId.split('-')[0],
        completed_at: new Date().toISOString(),
      };
      try {
        await db.completed().upsert(completedPayload, { onConflict: 'user_id,lesson_id' });
      } catch (e) {
        console.warn('[Supabase] markLessonComplete (encolado para reintento):', e);
        await enqueueWrite({ table: 'completed_lessons', payload: completedPayload, onConflict: 'user_id,lesson_id' });
      }
    },
    [persist, state],
  );

  const saveWellnessSession = useCallback(
    async (session: Omit<WellnessSession, 'id'>) => {
      const id = `ws-${Date.now()}`;
      const full: WellnessSession = { ...session, id };
      const allSessions = [full, ...state.wellnessSessions].slice(0, 200);
      const next: LifeFlowState = {
        ...state,
        wellnessSessions: allSessions,
      };
      await persist(next);

      // ── Update wellness store totals ──────────────────────────────────────────
      const addedMinutes = Math.round((session.durationSeconds ?? 0) / 60);
      const prevUser = useWellnessStore.getState().user;
      const newTotalMinutes = (prevUser.totalWellnessMinutes ?? 0) + addedMinutes;

      // Update weekly activity (0=Monday … 6=Sunday)
      const weeklyActivity = [...prevUser.weeklyActivity] as typeof prevUser.weeklyActivity;
      const dayIdx = (new Date().getDay() + 6) % 7; // convert Sun=0 → Mon=0
      weeklyActivity[dayIdx] = true;

      useWellnessStore.getState().setUserData({
        totalWellnessMinutes: newTotalMinutes,
        weeklyActivity,
      });

      const uid = uidRef.current;
      if (!uid) return;

      try {
        await db.wellness().insert({
          user_id:          uid,
          type:             session.type,
          session_name:     session.sessionName,
          duration_seconds: session.durationSeconds,
          completed_at:     session.completedAt,
          metadata:         (session.metadata ?? null) as import('@/types/supabase').Json | null,
        });
      } catch (e) {
        console.warn('[Supabase] saveWellnessSession:', e);
      }

      // ── Wellness bonus for Score Soberano ─────────────────────────────────────
      const bonusMap: Record<string, number> = {
        meditation: 5,
        breathing:  3,
        binaural:   2,
      };
      const bonus = bonusMap[session.type] ?? 0;
      if (bonus > 0 && uid) {
        try {
          // Fetch current score and add bonus (capped at 1000)
          const { data: profile } = await db.profiles().select('sovereign_score').eq('user_id', uid).single();
          const currentScore = (profile?.sovereign_score ?? 0) as number;
          const newScore = Math.min(1000, currentScore + bonus);
          await db.profiles().update({ sovereign_score: newScore }).eq('user_id', uid);
        } catch (e) {
          console.warn('[Supabase] wellness bonus:', e);
        }
      }
    },
    [persist, state],
  );

  const saveMentorMessage = useCallback(
    async (role: 'user' | 'assistant', content: string) => {
      if (ENV.isDev) return;
      const uid = uidRef.current;
      if (!uid) return;
      try {
        await db.messages().insert({
          user_id:        uid,
          role,
          content,
          module_context: ACTIVE_MODULE.title,
        });
      } catch (e) {
        console.warn('[Supabase] saveMentorMessage:', e);
      }
    },
    [],
  );

  const resetOnboarding = useCallback(async () => {
    await persist({ ...state, onboardingCompleted: false });
    const uid = uidRef.current;
    if (!uid) return;
    try {
      await db.profiles().update({ protocol_start_date: null }).eq('user_id', uid);
    } catch (e) {
      console.warn('[Supabase] resetOnboarding:', e);
    }
  }, [persist, state]);

  const clearData = useCallback(async () => {
    const uid = uidRef.current;
    if (uid) {
      try {
        await Promise.all([
          db.messages().delete().eq('user_id', uid),
          db.checkins().delete().eq('user_id', uid),
          db.completed().delete().eq('user_id', uid),
          db.tasks().delete().eq('user_id', uid),
          db.profiles().delete().eq('user_id', uid),
        ]);
      } catch (e) {
        console.warn('[Supabase] clearData:', e);
      }
      await supabase.auth.signOut();
      applyUid(null);
    }
    await removeLocal(STATE_KEY);
    setState(defaultState);
  }, []);

  const loadMoreMentorMessages = useCallback(async (currentCount: number): Promise<boolean> => {
    const uid = uidRef.current;
    if (!uid) return false;
    try {
      const { data: olderRows } = await db.messages()
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .range(currentCount, currentCount + 49);

      if (!olderRows || olderRows.length === 0) return false;

      const olderMessages: MentorMessage[] = (olderRows as Array<{
        id: string; role: string; content: string; created_at: string | null;
      }>).map((m) => ({
        id:        m.id,
        role:      (m.role === 'assistant' ? 'mentor' : m.role) as 'mentor' | 'user',
        text:      m.content,
        createdAt: m.created_at ?? new Date().toISOString(),
      })).reverse();

      setState((prev) => ({
        ...prev,
        mentorMessages: [...olderMessages, ...prev.mentorMessages],
      }));
      return olderRows.length === 50;
    } catch {
      return false;
    }
  }, []);

  const deleteAccount = useCallback(async (): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session');
    const { error } = await supabase.functions.invoke('delete-account');
    if (error) throw new Error(error.message);
    await removeLocal(STATE_KEY);
    setState(defaultState);
    applyUid(null);
  }, []);

  const exportData = useCallback(async (): Promise<string> => {
    const uid = uidRef.current;
    const payload: Record<string, unknown> = {
      exportedAt:        new Date().toISOString(),
      profile:           state.profile,
      northStar:         state.northStar,
      protocolStartDate: state.protocolStartDate,
      checkIns:          state.checkIns,
      mentorMessages:    state.mentorMessages.slice(-200),
      completedLessons:  state.completedLessons,
      completedTasks:    state.completedTasks,
      wellnessSessions:  state.wellnessSessions,
    };
    if (uid) {
      const { data: journal } = await db.journal().select('id,content,created_at').eq('user_id', uid);
      payload.journalEntries = journal ?? [];
    }
    return JSON.stringify(payload, null, 2);
  }, [state]);

  const refreshTier = useCallback(async () => {
    const uid = uidRef.current;
    if (!uid) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('profiles')
        .select('subscription_tier, subscription_expires_at')
        .eq('id', uid)
        .single();
      if (data?.subscription_tier) {
        setState((prev) => {
          const next: LifeFlowState = {
            ...prev,
            subscriptionTier:      data.subscription_tier,
            subscriptionExpiresAt: data.subscription_expires_at ?? null,
          };
          writeLocal(STATE_KEY, next);
          return next;
        });
      }
    } catch { /* ignore */ }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    applyUid(null);
    await removeLocal(STATE_KEY);
    setState(defaultState);
  }, []);

  // isSubscribed reconciliado: recibo RevenueCat + tier de la DB + expiración.
  // Resuelve el split-brain RC↔DB y exige expiresAt > now (tier vencido ≠ premium).
  const isSubscribed = useMemo(
    () => resolveEntitlement({
      dbTier: state.subscriptionTier,
      expiresAt: state.subscriptionExpiresAt,
      rcActive,
    }).isPremium,
    [state.subscriptionTier, state.subscriptionExpiresAt, rcActive],
  );

  // ── Provider ─────────────────────────────────────────────────────────────────
  return (
    <LifeFlowContext.Provider
      value={{
        state,
        isLoaded,
        isAuthenticated,
        isSubscribed,
        protocolDay,
        userId,
        latestCheckIn,
        todayCheckIn,
        averages,
        completeOnboarding,
        updateProfile,
        updateNorthStar,
        saveCheckIn,
        sendMentorMessage,
        addMentorMessages,
        saveLessonTask,
        markLessonComplete,
        saveMentorMessage,
        saveWellnessSession,
        loadMoreMentorMessages,
        deleteAccount,
        exportData,
        resetOnboarding,
        clearData,
        signOut,
        refreshTier,
      }}>
      {children}
    </LifeFlowContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useLifeFlow() {
  const context = useContext(LifeFlowContext);
  if (!context) throw new Error('useLifeFlow must be used inside LifeFlowProvider');
  return context;
}
