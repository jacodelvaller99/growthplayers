/**
 * Render smoke test de "Mi Memoria" cliente (loop de pulido, iteración 34).
 * Perfil client-safe + biométrico + reflexión + tareas activas + accountability
 * + avances + timeline. Monta la rama vacía sin throw (libs IO/lógica mockeadas).
 */
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({ useLifeFlow: () => ({ userId: 'u-test', isSubscribed: true }) }));

const viewMock = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return () => R.createElement(RN.View);
};
jest.mock('@/components/memory', () => ({
  CommitmentsCard: viewMock(), ConversationTimeline: viewMock(), ProfileSynopsisCard: viewMock(),
}));
jest.mock('@/components/biometric', () => ({
  BiometricInsightCard: viewMock(), ReflectionComposer: viewMock(),
}));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const V = ({ children }: { children?: unknown }) => R.createElement(RN.View, null, children);
  return { GoldAccentCard: V, PremiumCard: V, useScreen: () => ({ root: {}, content: {} }) };
});
jest.mock('@/lib/memory', () => ({
  fetchLatestSummaries: jest.fn().mockResolvedValue([]),
  fetchMemoryProfile: jest.fn().mockResolvedValue(null),
}));
jest.mock('@/lib/memoryLogic', () => ({ clientSafeProfile: (p: unknown) => p }));
jest.mock('@/lib/mentorExecution', () => ({
  fetchTasks: jest.fn().mockResolvedValue([]),
  updateTask: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/lib/mentorExecutionLogic', () => ({
  clientProgress: () => ({ done: 0, total: 0 }),
  clientSafeTasks: () => [],
  pendingAccountability: () => [],
}));
jest.mock('@/lib/biometric', () => ({
  fetchLatestInsight: jest.fn().mockResolvedValue(null),
  saveReflection: jest.fn().mockResolvedValue(undefined),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ClienteMemoriaScreen = require('@/app/perfil/cliente').default;

describe('ClienteMemoriaScreen (Mi Memoria) — render smoke', () => {
  it('renderiza (loading / vacío) sin throw', () => {
    expect(() => render(<ClienteMemoriaScreen />)).not.toThrow();
  });
});
