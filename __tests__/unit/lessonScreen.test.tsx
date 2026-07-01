/**
 * Render smoke test del reproductor de Lección (loop de pulido, iteración 37).
 * Video + tarea (form/checkbox) + ritual de enfoque + notas + completar + modales.
 * Usa un id de lección real de POLARIS_MODULES. Monta sin throw.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ back: jest.fn(), replace: jest.fn() }),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useLocalSearchParams: () => ({ id: require('@/data/modules').POLARIS_MODULES[0].lessons[0].id }),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(), notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'l', Medium: 'm' }, NotificationFeedbackType: { Success: 's' },
}));
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  return {
    __esModule: true,
    default: { View: RN.View, createAnimatedComponent: (c: unknown) => c },
    interpolateColor: () => '#000000',
    useAnimatedStyle: () => ({}),
    useSharedValue: (v: unknown) => ({ value: v }),
    withTiming: (v: unknown) => v,
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/components/SkoolVideo', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return { SkoolVideo: () => R.createElement(RN.View) };
});
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const Btn = ({ label, onPress }: { label?: string; onPress?: () => void }) =>
    R.createElement(RN.Text, { onPress }, label);
  return {
    GoldDivider: () => R.createElement(RN.View),
    PrimaryButton: Btn, SecondaryButton: Btn,
    useScreen: () => ({ root: {}, content: {} }),
  };
});
jest.mock('@/hooks/use-lifeflow', () => ({
  useLifeFlow: () => ({
    state: { completedTasks: {}, completedLessons: [] },
    saveLessonTask: jest.fn().mockResolvedValue(undefined),
    markLessonComplete: jest.fn().mockResolvedValue(undefined),
  }),
}));
jest.mock('@/lib/analytics', () => ({
  analytics: { lessonStart: jest.fn(), lessonComplete: jest.fn(), lessonAbandon: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const LessonScreen = require('@/app/lesson/[id]').default;

describe('LessonScreen — render smoke', () => {
  it('video + tarea + ritual + notas + completar renderiza sin throw', () => {
    expect(() => render(<LessonScreen />)).not.toThrow();
  });
});
