/**
 * Render smoke test de Mentoría (loop de pulido, iteración 10).
 * Journey semanal + plan de acción + notas + grabación IA. Monta mobile +
 * desktop, con y sin borrador de Norman, sin throw.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

let mockIsDesktop = false;
let mockDraft: object | null = null;

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-breakpoint', () => ({
  useBreakpoint: () => ({ isDesktop: mockIsDesktop, isMobile: !mockIsDesktop, isTablet: false }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({
  useLifeFlow: () => ({
    state: { protocolStartDate: '2026-05-01', profile: { name: 'Juan Jacobo' } },
    protocolDay: 12,
    userId: 'u-test',
  }),
}));
jest.mock('@/hooks/use-mentorship', () => ({
  useMentorship: () => ({
    plan: [],
    notes: [],
    draft: mockDraft,
    generating: false,
    recordingPhase: 'idle',
    recordingError: null,
    audioAvailable: false,
    generatePlan: jest.fn(),
    toggleItem: jest.fn(),
    removeItem: jest.fn(),
    addManualItem: jest.fn(),
    addNote: jest.fn(),
    removeNote: jest.fn(),
    updateDraft: jest.fn(),
    confirmDraft: jest.fn(),
    discardDraft: jest.fn(),
    startRecording: jest.fn(),
    stopRecordingAndProcess: jest.fn(),
    cancelRecording: jest.fn(),
  }),
}));
jest.mock('@/components/PlaudImport', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return { PlaudImport: () => R.createElement(RN.View) };
});
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const Wrap = ({ children, style }: { children?: React.ReactNode; style?: object }) =>
    R.createElement(RN.View, { style }, children);
  return {
    AppHeader: Wrap,
    GoldAccentCard: Wrap,
    GoldDivider: () => R.createElement(RN.View),
    PremiumCard: Wrap,
    StatusPill: () => R.createElement(RN.View),
    useScreen: () => ({ root: {}, content: {} }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MentoriaScreen = require('@/app/mentoria/index').default;

describe('MentoriaScreen — render smoke', () => {
  it('móvil sin borrador renderiza sin throw', () => {
    mockIsDesktop = false; mockDraft = null;
    expect(() => render(<MentoriaScreen />)).not.toThrow();
  });
  it('desktop con borrador de Norman renderiza sin throw', () => {
    mockIsDesktop = true;
    mockDraft = { week: 2, notes: 'Notas', actions: ['Acción 1'], transcriptionFailed: false };
    expect(() => render(<MentoriaScreen />)).not.toThrow();
  });
});
