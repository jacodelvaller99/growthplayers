/**
 * Render smoke test de Programas (loop de pulido, iteración 8).
 * Monta mobile + desktop con módulos reales (data/modules) y verifica
 * render sin throw (incluye lógica de desbloqueo/estados por módulo).
 */
import { render } from '@testing-library/react-native';
import React from 'react';

let mockIsDesktop = false;

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Warning: 'warning' },
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-breakpoint', () => ({
  useBreakpoint: () => ({ isDesktop: mockIsDesktop, isMobile: !mockIsDesktop, isTablet: false }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({
  useLifeFlow: () => ({ state: { completedLessons: [] } }),
}));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const Wrap = ({ children, style }: { children?: React.ReactNode; style?: object }) =>
    R.createElement(RN.View, { style }, children);
  return {
    AppHeader: Wrap,
    GoldDivider: () => R.createElement(RN.View),
    PremiumCard: Wrap,
    ProgressCard: () => R.createElement(RN.View),
    StatusPill: () => R.createElement(RN.View),
    useScreen: () => ({ root: {}, content: {} }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ProgramasScreen = require('@/app/(tabs)/programas').default;

describe('ProgramasScreen — render smoke', () => {
  it('móvil renderiza sin throw', () => {
    mockIsDesktop = false;
    expect(() => render(<ProgramasScreen />)).not.toThrow();
  });
  it('desktop renderiza sin throw', () => {
    mockIsDesktop = true;
    expect(() => render(<ProgramasScreen />)).not.toThrow();
  });
});

describe('isModuleUnlocked — un módulo sin lecciones no puede bloquear el resto', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { isModuleUnlocked } = require('@/app/(tabs)/programas');

  // Los módulos 8, 9 y Sesiones Semanales no tienen lecciones sueltas: su
  // contenido vive entero en el classroom de Skool. El guard anterior
  // (`prev.lessons.length === 0 → return false`) dejaba TODO lo que venía
  // después cerrado para siempre, porque nunca habría lecciones que completar.
  const mods = [
    { id: 'a', status: 'active',      lessons: [{ id: 'a1' }] },
    { id: 'b', status: 'active',      lessons: [] },            // solo classroom
    { id: 'c', status: 'active',      lessons: [{ id: 'c1' }] },
    { id: 'd', status: 'coming_soon', lessons: [] },
    { id: 'e', status: 'active',      lessons: [{ id: 'e1' }] },
  ] as unknown as Parameters<typeof isModuleUnlocked>[0];

  it('el primero siempre está abierto', () => {
    expect(isModuleUnlocked(mods, 0, [])).toBe(true);
  });

  it('bloquea mientras el anterior tenga lecciones pendientes', () => {
    expect(isModuleUnlocked(mods, 1, [])).toBe(false);
  });

  it('abre cuando el anterior está completo', () => {
    expect(isModuleUnlocked(mods, 1, ['a1'])).toBe(true);
  });

  it('un módulo sin lecciones deja pasar al siguiente (nada que completar)', () => {
    expect(isModuleUnlocked(mods, 2, ['a1'])).toBe(true);
  });

  it('coming_soon sí sigue bloqueando al siguiente', () => {
    expect(isModuleUnlocked(mods, 4, ['a1', 'c1'])).toBe(false);
  });
});
