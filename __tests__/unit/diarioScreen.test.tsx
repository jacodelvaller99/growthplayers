/**
 * Diario (loop de pulido, iteración 16 + PB-4).
 * Smoke test original + el flujo nuevo: tras guardar, "Reflexionar con
 * Norman" arma un MentorContext en modo 'reflection' y persiste entrada +
 * respuesta a memory_summaries — el diario dejó de ser invisible para la
 * memoria de Norman, que era el punto real de esta fase.
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockStreamMentorResponse = jest.fn();
const mockInsertSummary = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    from: () => ({ insert: () => Promise.resolve({ error: null }) }),
  },
}));
jest.mock('@/hooks/use-lifeflow', () => ({
  useLifeFlow: () => ({
    state: {
      profile: { name: 'Ada', role: 'Fundadora' },
      northStar: { purpose: '', identity: '', nonNegotiables: [], dailyReminder: '' },
      checkIns: [],
      completedLessons: [],
    },
    userId: 'user-1',
    todayCheckIn: null,
    protocolDay: 1,
    averages: { energy: 5, clarity: 5, stress: 5, sleep: 5 },
  }),
}));
jest.mock('@/lib/mentor', () => ({
  streamMentorResponse: (...args: unknown[]) => mockStreamMentorResponse(...args),
}));
jest.mock('@/lib/memory', () => ({
  insertSummary: (...args: unknown[]) => mockInsertSummary(...args),
}));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const Wrap = ({ children, style }: { children?: React.ReactNode; style?: object }) =>
    R.createElement(RN.View, { style }, children);
  return {
    GoldDivider: () => R.createElement(RN.View),
    PremiumCard: Wrap,
    screen: {},
    useScreen: () => ({ root: {}, content: {} }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const DiarioScreen = require('@/app/bienestar/diario').default;

beforeEach(() => {
  mockStreamMentorResponse.mockReset();
  mockInsertSummary.mockReset();
});

describe('DiarioScreen — render smoke', () => {
  it('renderiza sin throw', () => {
    expect(() => render(<DiarioScreen />)).not.toThrow();
  });
});

describe('DiarioScreen — Reflexionar con Norman', () => {
  it('tras guardar, llama a streamMentorResponse en modo reflection y persiste a memoria', async () => {
    mockStreamMentorResponse.mockImplementation(
      async (_ctx: unknown, _prompt: unknown, _history: unknown, onDelta: (d: string) => void) => {
        onDelta('Norman responde con calma.');
      },
    );
    mockInsertSummary.mockResolvedValue(true);

    const { getByLabelText, findByLabelText } = render(<DiarioScreen />);

    fireEvent.changeText(getByLabelText('Entrada de reflexión'), 'Hoy me sentí en paz.');
    fireEvent.press(getByLabelText('Guardar entrada'));

    const reflectBtn = await findByLabelText('Reflexionar con Norman');
    fireEvent.press(reflectBtn);

    await waitFor(() => expect(mockStreamMentorResponse).toHaveBeenCalledTimes(1));

    const [ctx, prompt, history] = mockStreamMentorResponse.mock.calls[0];
    expect(ctx.mode).toBe('reflection');
    expect(prompt).toContain('Hoy me sentí en paz.');
    expect(history).toEqual([]);

    await waitFor(() => expect(mockInsertSummary).toHaveBeenCalledTimes(1));
    const summary = mockInsertSummary.mock.calls[0][0];
    expect(summary.source_type).toBe('wellness');
    expect(summary.user_id).toBe('user-1');
    expect(summary.summary).toContain('Hoy me sentí en paz.');
    expect(summary.summary).toContain('Norman responde con calma.');
  });

  it('sin respuesta de Norman (abort/error), no persiste nada a memoria', async () => {
    mockStreamMentorResponse.mockResolvedValue(undefined); // nunca llama a onDelta

    const { getByLabelText, findByLabelText } = render(<DiarioScreen />);
    fireEvent.changeText(getByLabelText('Entrada de reflexión'), 'Otra entrada.');
    fireEvent.press(getByLabelText('Guardar entrada'));

    const reflectBtn = await findByLabelText('Reflexionar con Norman');
    fireEvent.press(reflectBtn);

    await waitFor(() => expect(mockStreamMentorResponse).toHaveBeenCalledTimes(1));
    expect(mockInsertSummary).not.toHaveBeenCalled();
  });
});
