/**
 * ArcHeader — que la cita del usuario llegue A LA PANTALLA.
 *
 * POR QUÉ ESTE ARCHIVO: `arcForDay` se reescribió para citar al usuario los 90
 * días, y en el MISMO commit los cuatro consumidores pasaron `compact` — que es
 * justo lo que oculta `arc.line`. Resultado: cero renders. La frase sobrevivía
 * solo dentro del `accessibilityLabel`, así que un lector de pantalla la oía y
 * un usuario vidente jamás la leía. Verde en CI, invisible en producto.
 *
 * El hueco que lo permitió: los tests de `narrativeLogic` comprueban el STRING
 * que devuelve la función, y ninguno comprobaba que ese string se pinte. Un
 * string correcto detrás de un `compact ? null :` pasa las dos cosas.
 *
 * Aquí se fija lo que faltaba: el texto, en el árbol renderizado.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

// `narrative.tsx` importa `PremiumCard` de polaris, que importa Skia — y Skia
// no arranca en jest. Mismo stub que `polarisButtons.test.tsx`.
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

import { ArcHeader } from '@/components/narrative';
import { arcForDay } from '@/lib/narrativeLogic';

const SUYAS = {
  painPoint: 'No logro parar de trabajar.',
  purpose: 'Construir sin quemarme',
  identity: 'Alguien que sostiene',
};

describe('ArcHeader — la cita se ve, no solo se anuncia', () => {
  it('pinta la frase del usuario en el árbol, no solo en el label', () => {
    const { getByText } = render(<ArcHeader arc={arcForDay(3, SUYAS)} />);
    // `getByText` busca en el texto RENDERIZADO. Con `compact` esto falla, que
    // es exactamente lo que ocurría en producción.
    getByText(/No logro parar de trabajar/);
  });

  it('la marca de cita viaja hasta el componente', () => {
    // Sin `quoted`, ArcHeader no puede distinguir una cita de copy de la app y
    // acaba pintando las dos igual — que es lo que hace que la continuidad
    // exista en el string y no se note en la pantalla.
    expect(arcForDay(3, SUYAS).quoted).toBe(true);
    expect(arcForDay(3, {}).quoted).toBe(false);
  });

  it('`compact` sigue existiendo y sigue ocultando la frase', () => {
    // No se borró: en Progreso hay tres párrafos de historia encima y ahí la
    // frase sí repetiría. Lo que estaba mal era usarlo en los CUATRO sitios.
    const { queryByText } = render(<ArcHeader arc={arcForDay(3, SUYAS)} compact />);
    expect(queryByText(/No logro parar de trabajar/)).toBeNull();
  });

  it('el día se ve SIEMPRE, aunque la frase se oculte', () => {
    // El móvil perdía la posición en los 90 días entera al pasar a `compact`:
    // dónde estás no puede depender de si la narrativa cabe.
    const { getByText } = render(<ArcHeader arc={arcForDay(12, SUYAS)} compact />);
    getByText(/DÍA 12 · 90/);
  });

  it('sin palabras del usuario se pinta la versión genérica, no un hueco', () => {
    const { getByText } = render(<ArcHeader arc={arcForDay(12, {})} />);
    getByText(/Superaste el punto donde la mayoría desaparece/);
  });
});
