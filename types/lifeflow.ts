export type LessonStatus = 'completed' | 'active' | 'locked' | 'available';
export type ModuleStatus = 'completed' | 'active' | 'locked' | 'coming_soon';

export type Lesson = {
  id: string;
  order: number;
  title: string;
  duration?: string;
  status: LessonStatus;
  skoolUrl?: string;
  vimeoId?: string;
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
};

export type CheckIn = {
  id: string;
  date: string;
  energy: number;
  clarity: number;
  stress: number;
  sleep: number;
  systemNeed: string;
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
};
