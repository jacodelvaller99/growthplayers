/**
 * Render smoke test de Exámenes médicos (loop de pulido, iteración 19).
 * PHI: subida/lista/borrado + toggle compartir-con-coach + panel recomendado.
 * Monta sin throw. Guardrails (bucket privado, RLS, consent) viven en
 * lib/medicalExams.ts + SQL — este test solo verifica la UI.
 */
import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';
import React from 'react';

(Platform as { OS: string }).OS = 'web';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({ useLifeFlow: () => ({ userId: 'u-test' }) }));
jest.mock('@/lib/observability', () => ({ logSilentError: jest.fn() }));
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { consents: {} } }) }) }),
      update: () => ({ eq: () => Promise.resolve({}) }),
    }),
  },
}));
jest.mock('@/lib/medicalExams', () => ({
  listMyExams: jest.fn().mockResolvedValue([]),
  uploadExam: jest.fn(),
  deleteExam: jest.fn().mockResolvedValue(true),
  getExamSignedUrl: jest.fn().mockResolvedValue(null),
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
    useScreen: () => ({ root: {}, content: {} }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ExamenesScreen = require('@/app/bienestar/examenes').default;

describe('ExamenesScreen — render smoke', () => {
  it('renderiza (lista vacía + panel + toggle) sin throw', () => {
    expect(() => render(<ExamenesScreen />)).not.toThrow();
  });
});
