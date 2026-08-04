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

describe('isModuleUnlocked — el catalogo esta ABIERTO', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { isModuleUnlocked } = require('@/app/(tabs)/programas');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { POLARIS_MODULES } = require('@/data/modules');

  // POR QUE CAMBIO: la cadena exigia completar TODAS las lecciones del modulo
  // anterior. Un cliente que paga y entra hoy veia solo Onboarding; para llegar
  // al Modulo 1 tenia que marcar sus 7 lecciones, para el 2 las 7 del 1, y asi
  // hasta 41. Encima el comentario de la funcion prometia que un modulo con
  // `status: 'active'` estaba abierto y el codigo NUNCA leia ese campo — los
  // modulos 5 a 10 estan marcados 'active' en data/modules.ts y seguian
  // cerrados igual.
  const mods = [
    { id: 'a', status: 'active',      lessons: [{ id: 'a1' }] },
    { id: 'b', status: 'active',      lessons: [] },
    { id: 'c', status: 'locked',      lessons: [{ id: 'c1' }] },
    { id: 'd', status: 'coming_soon', lessons: [] },
  ] as unknown as Parameters<typeof isModuleUnlocked>[0];

  it('TODOS los modulos del catalogo real estan abiertos, sin completar nada', () => {
    // El invariante que importa: un cliente sin una sola leccion hecha entra
    // donde quiera. Se corre sobre los modulos REALES, no sobre un fixture:
    // si alguien vuelve a poner un gate, este test lo ve.
    const cerrados = (POLARIS_MODULES as { id: string }[])
      .map((m, idx) => ({ id: m.id, abierto: isModuleUnlocked(POLARIS_MODULES, idx, []) }))
      .filter((m) => !m.abierto)
      .map((m) => m.id);
    expect(cerrados).toEqual([]);
  });

  it('no depende de lo completado: mismo resultado con y sin progreso', () => {
    for (let i = 0; i < mods.length; i++) {
      expect(isModuleUnlocked(mods, i, [])).toBe(isModuleUnlocked(mods, i, ['a1', 'c1']));
    }
  });

  it('el modulo anterior ya no bloquea al siguiente', () => {
    expect(isModuleUnlocked(mods, 2, [])).toBe(true);
  });

  it('`coming_soon` SI sigue cerrado — no tiene contenido detras', () => {
    // No es una excepcion al principio: abrirlo seria prometer una pantalla
    // vacia, que es peor que un candado honesto.
    expect(isModuleUnlocked(mods, 3, ['a1', 'c1'])).toBe(false);
  });
});
