/**
 * Render smoke test de Hábitos (loop de pulido, iteración 20).
 * Monta el dashboard de rutinas (progreso + rutinas + catálogo) sin throw.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({ useLifeFlow: () => ({ userId: 'u-test' }) }));
jest.mock('@/lib/supabase', () => ({
  db2: {
    habits: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [] }) }) }) }),
      insert: () => Promise.resolve({}),
      update: () => ({ eq: () => Promise.resolve({}) }),
    }),
    habitLogs: () => ({
      upsert: () => Promise.resolve({}),
      delete: () => ({ eq: () => ({ eq: () => ({ eq: () => Promise.resolve({}) }) }) }),
    }),
  },
}));
jest.mock('@/services/notifications', () => ({
  requestNotificationPermissions: jest.fn().mockResolvedValue(true),
  scheduleDailyRoutineReminder: jest.fn(),
  cancelScheduledNotification: jest.fn(),
  getScheduledRemindersByHabit: jest.fn().mockResolvedValue({}),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const HabitosScreen = require('@/app/bienestar/habitos').default;

describe('HabitosScreen — render smoke', () => {
  it('renderiza (progreso + catálogo) sin throw', () => {
    expect(() => render(<HabitosScreen />)).not.toThrow();
  });
});
