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

import { ACTIVE_MODULE } from '@/data/modules';
import { LESSON_TASKS } from '@/data/tasks';
import { supabase, db } from '@/lib/supabase';
import { ENV } from '@/app/config/env';
import { calcProtocolDay } from '@/lib/utils';
import { readLocal, removeLocal, writeLocal } from '@/storage/local';
import { initRevenueCat, checkSubscription } from '@/services/revenuecat';
import type { CheckIn, LessonTask, LifeFlowState, MentorMessage, NorthStar, UserProfile } from '@/types/lifeflow';

// ─── Local cache key ──────────────────────────────────────────────────────────
const STATE_KEY = 'state';

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

const defaultState: LifeFlowState = {
  onboardingCompleted: false,
  protocolStartDate: new Date().toISOString(),
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
      createdAt: new Date().toISOString(),
    },
  ],
  completedLessons: [],
  completedTasks: {},
};

// ─── Context type ─────────────────────────────────────────────────────────────
type LifeFlowContextValue = {
  state: LifeFlowState;
  isLoaded: boolean;
  isAuthenticated: boolean;
  isSubscribed: boolean;
  protocolDay: number;
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
  saveCheckIn: (checkIn: Omit<CheckIn, 'id' | 'date'>) => Promise<void>;
  sendMentorMessage: (text: string) => Promise<void>;
  addMentorMessages: (userMsg: MentorMessage, mentorMsg: MentorMessage) => Promise<void>;
  saveLessonTask: (lessonId: string, responses: Record<string, string>) => Promise<void>;
  markLessonComplete: (lessonId: string) => Promise<void>;
  saveMentorMessage: (role: 'user' | 'assistant', content: string) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  clearData: () => Promise<void>;
  signOut: () => Promise<void>;
};

const LifeFlowContext = createContext<LifeFlowContextValue | null>(null);

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function average(items: number[]) {
  if (!items.length) return 0;
  return Math.round(items.reduce((s, n) => s + n, 0) / items.length);
}

function isSameDay(a: string, b: Date) {
  return new Date(a).toDateString() === b.toDateString();
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
    return `Tu norte hoy: ${state.northStar.purpose} — Traduccion operativa: una accion visible, una conversacion pendiente y cero fuga de atencion.`;
  if (lower.includes('practica'))
    return stress >= 7
      ? 'Practica: 6 minutos de respiracion nasal, luego escribe la decision que estas evitando.'
      : 'Practica: bloque de 45 minutos con una sola salida medible. Al terminar registra friccion, energia y siguiente movimiento.';
  if (lower.includes('ordena') || lower.includes('dia'))
    return `Orden del dia: 1) Check-in completo. 2) Leccion activa del modulo ${ACTIVE_MODULE.order}. 3) Bloque mercader profundo. 4) Cierre con evidencia.`;
  if (energy <= 5)
    return 'Tu sistema esta bajo de energia. Reduce amplitud: una prioridad, recuperacion activa y una decision cerrada.';
  if (clarity <= 5)
    return 'La claridad esta baja. Escribe tres opciones, elimina dos y ejecuta la que tenga mayor retorno con menor friccion.';
  return 'Estado util para ejecucion. Mantente en modo mercader: protege atencion, convierte tiempo en avance visible.';
}

// ─── Migrate persisted state → ensure all fields exist ───────────────────────
function migrateState(loaded: Partial<LifeFlowState>): LifeFlowState {
  return {
    ...defaultState,
    ...loaded,
    completedLessons: loaded.completedLessons ?? [],
    completedTasks:   loaded.completedTasks   ?? {},
    checkIns:         loaded.checkIns         ?? [],
    mentorMessages:   loaded.mentorMessages   ?? defaultState.mentorMessages,
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
  ] = await Promise.all([
    db.profiles().select('*').eq('user_id', uid).single(),
    db.checkins().select('*').eq('user_id', uid).order('date', { ascending: false }).limit(30),
    db.tasks().select('*').eq('user_id', uid),
    db.completed().select('*').eq('user_id', uid),
    db.messages().select('*').eq('user_id', uid).order('created_at', { ascending: true }).limit(50),
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

  return {
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
    checkIns:         checkInsMapped,
    mentorMessages,
    completedLessons,
    completedTasks,
  };
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

export function LifeFlowProvider({ children }: { children: ReactNode }) {
  const [state, setState]                 = useState<LifeFlowState>(defaultState);
  const [isLoaded, setIsLoaded]           = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSubscribed, setIsSubscribed]   = useState(false);
  const uidRef = useRef<string | null>(null);

  // ── Init ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      let uid = session?.user?.id ?? null;

      // Dev bypass: sign in anonymously when Supabase URL is placeholder
      if (!uid && IS_PLACEHOLDER_URL) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (!error && data.user) uid = data.user.id;
      }

      if (uid) {
        uidRef.current = uid;
        if (mounted) setIsAuthenticated(true);

        try {
          await initRevenueCat();
          const subscribed = await checkSubscription();
          if (mounted) setIsSubscribed(subscribed);
        } catch { /* ignore */ }

        const remote = await loadUserData(uid);

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
          uidRef.current = uid;
          const remote = await loadUserData(uid);
          if (remote && mounted) {
            setState(remote);
            writeLocal(STATE_KEY, remote);
          }
        }
        if (!uid) {
          uidRef.current = null;
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
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
    async (checkIn: Omit<CheckIn, 'id' | 'date'>) => {
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
      if (!uid) return;

      // Compute sovereign score for profile update
      const newScore = Math.round(
        (checkIn.energy + checkIn.clarity + (10 - checkIn.stress) + checkIn.sleep) / 4 * 100,
      );

      try {
        await db.checkins().upsert(
          {
            user_id:         uid,
            date:            dateStr,
            energy:          checkIn.energy,
            clarity:         checkIn.clarity,
            stress:          checkIn.stress,
            sleep:           checkIn.sleep,
            system_need:     checkIn.systemNeed,
            sovereign_score: newScore,
          },
          { onConflict: 'user_id,date' },
        );
      } catch (e) {
        console.warn('[Supabase] saveCheckIn:', e);
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

      try {
        await db.messages().insert([
          { user_id: uid, role: 'user',      content: userMsg.text,   created_at: userMsg.createdAt },
          { user_id: uid, role: 'assistant', content: mentorMsg.text, created_at: mentorMsg.createdAt },
        ]);
      } catch (e) {
        console.warn('[Supabase] addMentorMessages:', e);
      }
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

      try {
        await db.tasks().upsert(
          {
            user_id:      uid,
            lesson_id:    lessonId,
            lesson_title: template.title,
            module_id:    lessonId.split('-')[0],
            responses:    responses,
            completed_at: completed.completedAt,
          },
          { onConflict: 'user_id,lesson_id' },
        );
      } catch (e) {
        console.warn('[Supabase] saveLessonTask:', e);
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

      try {
        await db.completed().upsert(
          {
            user_id:      uid,
            lesson_id:    lessonId,
            module_id:    lessonId.split('-')[0],
            completed_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,lesson_id' },
        );
      } catch (e) {
        console.warn('[Supabase] markLessonComplete:', e);
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
      uidRef.current = null;
    }
    await removeLocal(STATE_KEY);
    setState(defaultState);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    uidRef.current = null;
    await removeLocal(STATE_KEY);
    setState(defaultState);
  }, []);

  // ── Provider ─────────────────────────────────────────────────────────────────
  return (
    <LifeFlowContext.Provider
      value={{
        state,
        isLoaded,
        isAuthenticated,
        isSubscribed,
        protocolDay,
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
        resetOnboarding,
        clearData,
        signOut,
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
