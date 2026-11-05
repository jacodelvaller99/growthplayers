/**
 * Render smoke test de «Tu calma» (antes Escala de Consciencia / Hawkins).
 * Grilla de emociones (3 columnas) + guardar la semana (calibración local). Sin "Hz".
 * Monta sin throw. Platform=web para saltar haptics nativo.
 */
import { render } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';

// Fuerza web para saltar el path nativo de expo-haptics (antes del require de la pantalla).
(Platform as { OS: string }).OS = 'web';

// Estas suites fuerzan Platform.OS='web' antes del import: reanimated tomaría
// su camino web (matchMedia/document) en un entorno Node sin DOM. Mock estándar.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return {
    GoldDivider: () => R.createElement(RN.View),
    useScreen: () => ({ root: {}, content: {} }),
  };
});
jest.mock('@/components/SafetyWarning', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return { __esModule: true, default: () => R.createElement(RN.View) };
});
jest.mock('@/hooks/use-breakpoint', () => ({
  useBreakpoint: () => ({ isDesktop: false, isMobile: true, isTablet: false }),
}));
jest.mock('@/storage/local', () => ({
  readLocal: jest.fn().mockResolvedValue(null),
  writeLocal: jest.fn().mockResolvedValue(undefined),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { default: ConscienciaScreen, migrateMarked } = require('@/app/bienestar/consciencia');

describe('ConscienciaScreen — render smoke', () => {
  it('grilla + guardar semana renderiza sin throw, sin "Hz" ni escala numérica', () => {
    const { toJSON } = render(<ConscienciaScreen />);
    const out = JSON.stringify(toJSON());
    expect(out).not.toMatch(/Hz/);
    expect(out).toContain('Tu calma');
    expect(out).toContain('Triste');
    expect(out).toContain('Tranquilo');
    // Ya no es la escalera de Hawkins disfrazada.
    for (const viejo of ['Vergüenza', 'Neutralidad', 'Razón', 'Plenitud', 'Aflicción']) {
      expect(out).not.toContain(viejo);
    }
  });

  it('una semana guardada con ids viejos se traduce sin perderse', () => {
    // 75 Pena→Triste (se queda), 20 Vergüenza→Triste (dedup), 350 Aceptación→Tranquilo (600).
    expect(migrateMarked([20, 75, 350, 600])).toEqual([75, 600]);
    expect(migrateMarked([400, 9999])).toEqual([400]);
  });
});
