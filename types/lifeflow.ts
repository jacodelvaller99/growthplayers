export type LessonStatus = 'completed' | 'active' | 'locked';
export type ModuleStatus = 'completed' | 'active' | 'locked';

export type Lesson = {
  id: string;
  title: string;
  duration: string;
  status: LessonStatus;
};

export type PolarisModule = {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  status: ModuleStatus;
  progress: number;
  lessons: Lesson[];
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

export type LifeFlowState = {
  onboardingCompleted: boolean;
  protocolStartDate: string;
  activeProgramId: string;
  activeModuleId: string;
  profile: UserProfile;
  northStar: NorthStar;
  checkIns: CheckIn[];
  mentorMessages: MentorMessage[];
};
