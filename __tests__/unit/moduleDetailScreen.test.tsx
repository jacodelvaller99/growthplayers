/**
 * Render smoke test del overview de Módulo (loop de pulido, iteración 36).
 * Hero + progreso + lista de lecciones (bloqueada/activa/completada) + CTA + teaser.
 * Usa el catálogo real POLARIS_MODULES. Monta sin throw.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

let mockModuleId: string | undefined;

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({ id: mockModuleId }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({ useLifeFlow: () => ({ state: { completedLessons: [] } }) }));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const V = ({ children }: { children?: unknown }) => R.createElement(RN.View, null, children);
  const Btn = ({ label, onPress }: { label?: string; onPress?: () => void }) =>
    R.createElement(RN.Text, { onPress }, label);
  return {
    AppHeader: () => R.createElement(RN.View),
    GoldDivider: () => R.createElement(RN.View),
    PremiumCard: V,
    PrimaryButton: Btn,
    SecondaryButton: Btn,
    ProgressCard: () => R.createElement(RN.View),
    // Antes ignoraba las props — hacía imposible verificar qué label renderiza
    // realmente la pantalla. Ahora expone `label` como texto plano.
    StatusPill: ({ label }: { label?: string }) => R.createElement(RN.Text, null, label),
    screen: {},
    useScreen: () => ({ root: {}, content: {} }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ModuleDetailScreen = require('@/app/module/[id]').default;

describe('ModuleDetailScreen — render smoke', () => {
  it('hero + lecciones + CTA renderiza sin throw', () => {
    mockModuleId = undefined; // → cae al primer módulo (fallback)
    expect(() => render(<ModuleDetailScreen />)).not.toThrow();
  });
});

describe('módulos sin lecciones sueltas (solo classroom)', () => {
  // POR QUÉ: `activeLesson` era `lessonsWithStatus.find(...) ?? lessonsWithStatus[0]`,
  // y para `lessons: []` (modulo-8, modulo-9, sesiones-semanales) ambos son
  // `undefined`. El CTA de abajo asumía que siempre existía uno y reventaba
  // con "Cannot read properties of undefined (reading 'title')" — antes del
  // desbloqueo total era difícil llegar hasta aquí (la cadena de lecciones
  // los dejaba cerrados); con isModuleUnlocked siempre abierto, cualquiera
  // entra directo.
  it.each(['modulo-8', 'modulo-9', 'sesiones-semanales'])('%s renderiza sin throw', (id) => {
    mockModuleId = id;
    expect(() => render(<ModuleDetailScreen />)).not.toThrow();
  });
});

describe('ModuleDetailScreen — desbloqueo total', () => {
  // POR QUÉ: data/modules.ts todavía marca varios módulos `status: 'locked'`
  // a mano (ej. 'modulo-2'). El pill leía ese campo estático directo, así que
  // mostraba "BLOQUEADO" en un módulo al que el usuario ya podía entrar y
  // completar lecciones sin ningún gate real — puro susto visual.
  it('un módulo con status estático "locked" muestra ACTIVO, no BLOQUEADO', () => {
    mockModuleId = 'modulo-2';
    const { getByText, queryByText } = render(<ModuleDetailScreen />);
    expect(getByText('ACTIVO')).toBeTruthy();
    expect(queryByText('BLOQUEADO')).toBeNull();
  });
});
