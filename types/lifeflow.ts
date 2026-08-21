import type { BodyZone } from '@/lib/bodyMapLogic';
import type { BodyPoint } from '@/lib/bodyPointLogic';

export type LessonStatus = 'completed' | 'active' | 'locked' | 'available';
export type ModuleStatus = 'completed' | 'active' | 'locked' | 'coming_soon';

/** Documento/herramienta adjunto a una lección (guías prácticas de Skool). */
export type LessonResource = {
  title: string;
  url: string;
};

export type Lesson = {
  id: string;
  order: number;
  title: string;
  duration?: string;
  status: LessonStatus;
  skoolUrl?: string;
  vimeoId?: string;
  /** Guías/documentos de la lección — mismos recursos que en Skool. */
  resources?: LessonResource[];
};

export type PolarisModule = {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  arquetipo?: string | null;
  semana?: number | null;
  status: ModuleStatus;
  progress: number;
  lessons: Lesson[];
  skoolUrl?: string;
};

export type NorthStar = {
  purpose: string;
  identity: string;
  nonNegotiables: string[];
  dailyReminder: string;
};

export type UserProfile = {
  name: string;
  role: string;
  /** Whether the user has consented to ML behavioral tracking (default: true) */
  mlConsent?: boolean;
  /** Expo push notification token */
  expoPushToken?: string | null;
  /**
   * Lo que el usuario declaró que se interpone en su camino, en sus palabras.
   *
   * El onboarding lo pregunta y hasta ahora solo lo mandaba a `seedHeroOrigin`:
   * la respuesta más personal de todo el flujo no quedaba en ningún sitio que
   * la app pudiera volver a leer. El Umbral la necesita — es la única confesión
   * de las tres cosas que escribe.
   *
   * Solo local: no hay columna en `profiles`. El Umbral corre en la misma
   * sesión en que se escribió, así que alcanza. En una reinstalación se pierde,
   * y no importa: el Umbral no se vuelve a cruzar.
   */
  painPoint?: string;
};

export type CheckIn = {
  id: string;
  date: string;
  energy: number;
  clarity: number;
  stress: number;
  sleep: number;
  systemNeed: string;
  /** Dónde lo sintió, si lo señaló. Los números dan la magnitud; esto da el
   *  lugar, que es lo que permite a Norman decir "cuarta vez esta semana en la
   *  mandíbula" en vez de "tu tensión sigue alta". Opcional: nadie está
   *  obligado a señalar. */
  zones?: BodyZone[];
  /** Coordenadas exactas sobre la figura frontal. `zones` se mantiene como
   * resumen semántico compatible con registros y recomendaciones anteriores. */
  bodyPoints?: BodyPoint[];
};

export type MentorMessage = {
  id: string;
  role: 'mentor' | 'user';
  text: string;
  createdAt: string;
};

export interface TaskField {
  id: string;
  label: string;
  type: 'textarea' | 'text' | 'checkbox' | 'scale' | 'multiline';
  placeholder?: string;
  required: boolean;
}

export interface LessonTask {
  id: string;
  lessonId: string;
  title: string;
  description: string;
  type: 'reflection' | 'exercise' | 'checklist' | 'writing' | 'action';
  fields: TaskField[];
  completedAt?: string;
  responses?: Record<string, string>;
}

export type WellnessType = 'meditation' | 'breathing' | 'binaural' | 'asmr' | 'sleep' | 'movement';

export interface WellnessSession {
  id: string;
  type: WellnessType;
  sessionName: string;
  durationSeconds: number;
  completedAt: string;
  metadata?: Record<string, unknown>;
}

export type LifeFlowState = {
  onboardingCompleted: boolean;
  protocolStartDate: string;
  activeProgramId: string;
  activeModuleId: string;
  profile: UserProfile;
  northStar: NorthStar;
  checkIns: CheckIn[];
  mentorMessages: MentorMessage[];
  completedLessons: string[];
  completedTasks: Record<string, LessonTask>;
  wellnessSessions: WellnessSession[];
  /** Current subscription tier from profiles.subscription_tier (Supabase Realtime-synced) */
  subscriptionTier: string;
  /** ISO date of tier expiry, or null for indefinite */
  subscriptionExpiresAt: string | null;
};
