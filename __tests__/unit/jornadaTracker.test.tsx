/**
 * JornadaTracker — que la misión del día LLEGUE a la pantalla.
 *
 * Mismo criterio que arcHeader.test.tsx: los tests de jornadaLogic verifican
 * los strings/estados que devuelven las funciones; aquí se fija que esos
 * estados se PINTEN — el paso actual, los checks y el único CTA.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

// polaris importa Skia, que no arranca en jest. Mismo stub que arcHeader.
jest.mock('@shopify/react-native-skia', () => ({
  Canvas: () => null,
  LinearGradient: () => null,
  Path: () => null,
  Skia: { Path: { Make: () => ({ moveTo: () => {}, lineTo: () => {}, close: () => {} }) } },
  usePathInterpolation: () => null,
  vec: () => ({ x: 0, y: 0 }),
}));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

import { JornadaCierre, JornadaTracker } from '@/components/jornada';
import { deriveJornada } from '@/lib/jornadaLogic';
import type { Turno } from '@/lib/turnoLogic';

const HOY = '2026-08-06';

const TURNO_EJECUTA: Turno = {
  source: 'checkin',
  delta: 'Paso 2 de 4 de tu jornada.',
  headline: 'La lectura está. Ahora el protocolo.',
  why: 'Una lección hoy — no el módulo entero.',
  verb: 'EJECUTAR LA LECCIÓN',
  route: '/lesson/l1',
};

const TURNO_COMPLETA: Turno = {
  source: 'checkin',
  delta: '4 de 4 pasos hechos hoy.',
  headline: 'Jornada completa.',
  why: 'Los cuatro pasos del día están hechos.',
  verb: 'VER TU PROGRESO',
  route: '/(tabs)/progreso',
};

describe('JornadaTracker — la misión se ve', () => {
  it('jornada parcial: pinta los 4 pasos, el turno y el verbo', () => {
    const jornada = deriveJornada({
      today: HOY, log: null, hasCheckInToday: true, wellnessToday: false,
    });
    const { getByText, getByLabelText } = render(
      <JornadaTracker jornada={jornada} turno={TURNO_EJECUTA} onPressCta={() => {}} />,
    );
    getByText('TU JORNADA');
    getByText('LÉETE');
    getByText('EJECUTA');
    getByText('REGULA');
    getByText('CIERRA');
    getByText('La lectura está. Ahora el protocolo.');
    getByText('EJECUTAR LA LECCIÓN');
    // El estado de cada paso viaja a accesibilidad — un lector de pantalla
    // tiene que poder recorrer la misión igual que un vidente.
    getByLabelText('LÉETE: hecho');
    getByLabelText('EJECUTA: paso actual');
    getByLabelText('REGULA: pendiente');
  });

  it('mientras el log carga (jornada null) el turno clásico se pinta igual', () => {
    const { getByText, queryByText } = render(
      <JornadaTracker jornada={null} turno={TURNO_EJECUTA} onPressCta={() => {}} />,
    );
    getByText('La lectura está. Ahora el protocolo.');
    expect(queryByText('LÉETE')).toBeNull(); // sin jornada no se inventa fila
  });

  it('jornada completa: cuatro checks, la frase del arco y salida serena', () => {
    const jornada = deriveJornada({
      today: HOY,
      log: { date: HOY, done: ['ejecuta', 'cierra'] },
      hasCheckInToday: true,
      wellnessToday: true,
    });
    const { getByText, getByLabelText } = render(
      <JornadaTracker
        jornada={jornada}
        turno={TURNO_COMPLETA}
        onPressCta={() => {}}
        arcPhrase="Cada check-in es una declaración de quién eres."
      />,
    );
    getByText('Jornada completa.');
    getByText('Cada check-in es una declaración de quién eres.');
    getByText('VER TU PROGRESO');
    getByLabelText('CIERRA: hecho');
  });
});

describe('JornadaCierre — el fin de jornada devuelve algo', () => {
  it('pinta lo hecho, el delta y la frase del arco, con una sola salida', () => {
    const jornada = deriveJornada({
      today: HOY,
      log: { date: HOY, done: ['ejecuta', 'cierra'] },
      hasCheckInToday: true,
      wellnessToday: true,
    });
    const { getByText } = render(
      <JornadaCierre
        jornada={jornada}
        delta="Energía +2 contra tu última lectura."
        arcPhrase="Superaste el punto donde la mayoría desaparece."
        onVolver={() => {}}
      />,
    );
    getByText('JORNADA CERRADA');
    getByText('Energía +2 contra tu última lectura.');
    getByText('Superaste el punto donde la mayoría desaparece.');
    getByText('VOLVER AL COMANDO');
  });
});
