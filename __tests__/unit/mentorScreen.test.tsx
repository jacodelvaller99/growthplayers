/**
 * Render smoke test de Norman / Mentor (loop de pulido, iteración 7).
 * La pantalla más crítica (hermana del chat que crasheó en prod). Monta el
 * estado inicial (sin mensajes → burbujas de apertura) y con historial, y
 * verifica render sin throw. NO ejercita los guardrails de IA (viven en
 * lib/mentor.ts) — solo que la UI monta.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

let mockMessages: { id: string; role: string; text: string; createdAt: string }[] = [];

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Error: 'error', Success: 'success' },
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useLocalSearchParams: () => ({ initialPrompt: undefined }),
  useFocusEffect: () => {},
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/context/ToastContext', () => ({ useToast: () => ({ showToast: jest.fn() }) }));
jest.mock('@/lib/analytics', () => ({ analytics: { chatMessage: jest.fn() } }));
jest.mock('@/hooks/useMentorMemory', () => ({
  useMentorMemory: () => ({ addMemory: jest.fn().mockResolvedValue(undefined), searchMemories: jest.fn().mockResolvedValue([]) }),
}));
jest.mock('@/hooks/useUserIntelligence', () => ({
  useUserIntelligence: () => ({
    intelligence: {
      engagement_score: 0, churn_risk: 0, churn_risk_label: 'low',
      anomaly_type: null, next_action: null, cohort_label: null,
    },
  }),
}));
jest.mock('@/lib/mentor', () => ({ streamMentorResponse: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/confrontation', () => ({ getTopConfrontationsForMentor: jest.fn().mockResolvedValue(null) }));
jest.mock('@/lib/memory', () => ({ buildMentorMemoryContext: jest.fn().mockResolvedValue(null) }));
jest.mock('@/lib/memorySummarizer', () => ({
  makeMinimalContext: () => ({}),
  summarizeConversation: jest.fn().mockResolvedValue(null),
  updateProfileFromSummary: jest.fn(),
}));
jest.mock('@/lib/mentorExecution', () => ({ suggestTasksFromCommitments: jest.fn() }));
jest.mock('@/lib/supabase', () => ({
  db2: { mentorThreads: () => ({ select: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [] }) }) }) }) }) },
  intel: { conversations: () => ({ insert: () => Promise.resolve({ error: null }) }) },
}));
jest.mock('@/lib/wearables', () => ({
  useWearableConnections: () => ({ connections: [] }),
  useWearableDaily: () => ({ today: null }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({
  useLifeFlow: () => ({
    state: {
      profile: { name: 'Juan Jacobo', role: 'Fundador' },
      northStar: { purpose: '', identity: '', dailyReminder: '' },
      checkIns: [],
      mentorMessages: mockMessages,
      completedLessons: [],
      completedTasks: {},
    },
    todayCheckIn: null,
    protocolDay: 12,
    averages: { energy: 7, clarity: 7, stress: 4, sleep: 7 },
    isSubscribed: true,
    addMentorMessages: jest.fn().mockResolvedValue(undefined),
    loadMoreMentorMessages: jest.fn().mockResolvedValue(false),
    userId: 'u-test',
  }),
}));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const Wrap = ({ children }: { children?: React.ReactNode }) => R.createElement(RN.View, null, children);
  return {
    AppHeader: ({ right }: { right?: React.ReactNode }) => R.createElement(RN.View, null, right),
    ChatBubble: ({ children }: { children?: React.ReactNode }) => R.createElement(RN.Text, null, children),
    GoldDivider: () => R.createElement(RN.View),
    PolarisMark: () => R.createElement(RN.View),
    PremiumCard: Wrap,
    PremiumInput: (p: object) => R.createElement(RN.TextInput, p),
    StatusPill: () => R.createElement(RN.View),
    screen: {},
    useScreen: () => ({ root: {}, content: {}, isDesktop: false, isTablet: false }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MentorScreen = require('@/app/(tabs)/mentor').default;

describe('MentorScreen — render smoke', () => {
  it('estado inicial (apertura, sin mensajes) renderiza sin throw', () => {
    mockMessages = [];
    expect(() => render(<MentorScreen />)).not.toThrow();
  });
  it('con historial renderiza sin throw', () => {
    mockMessages = [
      { id: 'u1', role: 'user', text: 'hola', createdAt: '2026-07-01T00:00:00Z' },
      { id: 'm1', role: 'mentor', text: 'Hola, ¿en qué trabajamos?', createdAt: '2026-07-01T00:00:01Z' },
    ];
    expect(() => render(<MentorScreen />)).not.toThrow();
  });
});
