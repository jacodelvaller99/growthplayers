/**
 * Integration tests — RevenueCat premium gate (MentorScreen)
 *
 * Gate logic in app/(tabs)/mentor.tsx:
 *   const userMsgCount = state.mentorMessages.filter(m => m.role === 'user').length
 *   const isGated = !isSubscribed && userMsgCount >= 3
 *
 * Contract:
 *   - FREE user with < 3 user messages → no paywall banner shown
 *   - FREE user with >= 3 user messages → paywall banner rendered
 *   - PREMIUM user with >= 3 user messages → no paywall banner
 *   - Tapping submit when gated → router.push('/paywall') called
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ── Shared mocks ─────────────────────────────────────────────────────────────

const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockRouterPush, back: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: any) => children,
}));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

// jest auto-discovers __mocks__/@shopify/react-native-skia.ts for node_modules
jest.mock('@shopify/react-native-skia');

jest.mock('@/data/modules', () => ({
  ACTIVE_MODULE: { id: 'mod-01', number: 1, title: 'Identidad Soberana' },
}));

// Prevent lib/supabase.ts from actually calling createClient (needs env vars)
jest.mock('@/lib/supabase', () => {
  const mockFrom = jest.fn().mockReturnValue({
    select:  jest.fn().mockReturnThis(),
    insert:  jest.fn().mockReturnThis(),
    update:  jest.fn().mockReturnThis(),
    delete:  jest.fn().mockReturnThis(),
    eq:      jest.fn().mockReturnThis(),
    single:  jest.fn().mockResolvedValue({ data: null, error: null }),
    order:   jest.fn().mockReturnThis(),
    limit:   jest.fn().mockReturnThis(),
    in:      jest.fn().mockReturnThis(),
    gte:     jest.fn().mockReturnThis(),
    then:    jest.fn().mockResolvedValue({ data: null, error: null }),
  });
  const mockFunctions = { invoke: jest.fn().mockResolvedValue({ data: null, error: null }) };
  const mockChannel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
  };
  const mockSupabase = {
    from:           mockFrom,
    functions:      mockFunctions,
    channel:        jest.fn().mockReturnValue(mockChannel),
    removeChannel:  jest.fn(),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  };
  return {
    supabase: mockSupabase,
    db: {
      profiles:  () => mockFrom('user_profiles'),
      checkins:  () => mockFrom('daily_checkins'),
      tasks:     () => mockFrom('lesson_tasks'),
      completed: () => mockFrom('completed_lessons'),
      messages:  () => mockFrom('mentor_messages'),
      wellness:  () => mockFrom('wellness_sessions'),
      journal:   () => mockFrom('journal_entries'),
    },
    intel: {
      events:        () => mockFrom('user_events'),
      intelligence:  () => mockFrom('user_intelligence'),
      memories:      () => mockFrom('mentor_memories'),
      conversations: () => mockFrom('mentor_conversations'),
      notifications: () => mockFrom('smart_notifications'),
      profiles:      () => mockFrom('profiles'),
    },
  };
});

jest.mock('@/lib/mentor', () => ({
  streamMentorResponse: jest.fn().mockResolvedValue('Respuesta del mentor.'),
}));

jest.mock('@/hooks/useUserIntelligence', () => ({
  useUserIntelligence: () => ({
    intelligence: {
      engagement_score: 0, churn_risk: 0, churn_risk_label: 'low',
      days_since_last_act: 0, predicted_churn_date: null,
      preferred_time: null, preferred_duration: null, dominant_module: null, dominant_tool: null,
      affinity_binaural: 0, affinity_breathing: 0, affinity_meditation: 0,
      affinity_journaling: 0, affinity_lessons: 0, affinity_mentor: 0,
      next_action: null, next_action_reason: null, next_action_urgency: 'normal',
      anomaly_detected: false, anomaly_type: null, anomaly_detected_at: null,
      cohort_id: null, cohort_label: null, last_calculated_at: new Date().toISOString(),
    },
    isLoading: false,
    topAffinity: 'lessons',
    engagementTier: 'low',
    refetch: jest.fn(),
  }),
}));

jest.mock('@/hooks/useMentorMemory', () => ({
  useMentorMemory: () => ({
    addMemory:         jest.fn().mockResolvedValue(null),
    searchMemories:    jest.fn().mockResolvedValue([]),
    getRecentMemories: jest.fn().mockResolvedValue([]),
  }),
}));

// ── Controllable hook mock ────────────────────────────────────────────────────

const mockAddMentorMessages = jest.fn().mockResolvedValue(undefined);

type MockHookConfig = {
  isSubscribed: boolean;
  userMessages: number;
};

function buildMockHook({ isSubscribed, userMessages }: MockHookConfig) {
  const messages = [
    // Always include the seed mentor message
    { id: 'seed', role: 'mentor' as const, text: 'Haz check-in.', createdAt: new Date().toISOString() },
    // Add the requested number of user messages
    ...Array.from({ length: userMessages }, (_, i) => ({
      id: `u-${i}`,
      role: 'user' as const,
      text: `Mensaje ${i + 1}`,
      createdAt: new Date().toISOString(),
    })),
  ];

  return {
    state: {
      mentorMessages: messages,
      northStar: {
        purpose: 'Vida soberana',
        identity: 'Empresario',
        nonNegotiables: [],
        dailyReminder: 'No negocio con el ruido.',
      },
      profile: { name: 'Juan Carlos', role: 'Empresario' },
    },
    isSubscribed,
    protocolDay: 7,
    todayCheckIn: null,
    addMentorMessages: mockAddMentorMessages,
    userId: null,
    averages: { energy: 7, clarity: 7, stress: 4, sleep: 7 },
  };
}

const mockUseLifeFlow = jest.fn();
jest.mock('@/hooks/use-lifeflow', () => ({
  useLifeFlow: (...args: any[]) => mockUseLifeFlow(...args),
}));

// ── Import after mocks are registered ────────────────────────────────────────

import MentorScreen from '@/app/(tabs)/mentor';

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockRouterPush.mockClear();
  mockAddMentorMessages.mockClear();
});

describe('Paywall gate — FREE user', () => {
  it('does NOT show paywall banner with < 3 user messages', () => {
    mockUseLifeFlow.mockReturnValue(buildMockHook({ isSubscribed: false, userMessages: 2 }));
    const { queryByLabelText } = render(<MentorScreen />);
    // The paywall banner has no accessibilityLabel — query by text content instead
    // It renders "DESBLOQUEAR MENTOR PREMIUM" text only when isGated=true
    expect(queryByLabelText('DESBLOQUEAR MENTOR PREMIUM')).toBeNull();
  });

  it('shows paywall banner when userMsgCount >= 3 and not subscribed', () => {
    mockUseLifeFlow.mockReturnValue(buildMockHook({ isSubscribed: false, userMessages: 3 }));
    const { getByText } = render(<MentorScreen />);
    expect(getByText('DESBLOQUEAR MENTOR PREMIUM')).toBeTruthy();
  });

  it('navigates to /paywall when submit is pressed while gated', () => {
    mockUseLifeFlow.mockReturnValue(buildMockHook({ isSubscribed: false, userMessages: 3 }));
    const { getByPlaceholderText, getByLabelText } = render(<MentorScreen />);

    // Type a message (submit returns early if input is empty)
    fireEvent.changeText(getByPlaceholderText('CONSULTA AL MENTOR...'), 'Hola mentor');

    // Press send — the gate intercepts before streaming and calls router.push('/paywall')
    fireEvent.press(getByLabelText('Enviar mensaje'));

    expect(mockRouterPush).toHaveBeenCalledWith('/paywall');
  });
});

describe('Paywall gate — PREMIUM user', () => {
  it('does NOT show paywall banner even with >= 3 user messages', () => {
    mockUseLifeFlow.mockReturnValue(buildMockHook({ isSubscribed: true, userMessages: 10 }));
    const { queryByText } = render(<MentorScreen />);
    expect(queryByText('DESBLOQUEAR MENTOR PREMIUM')).toBeNull();
  });
});
