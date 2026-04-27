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

jest.mock('@/lib/mentor', () => ({
  streamMentorResponse: jest.fn().mockResolvedValue('Respuesta del mentor.'),
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
