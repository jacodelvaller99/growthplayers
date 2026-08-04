/**
 * El Umbral — la pantalla del cruce hacia el protocolo.
 *
 * POR QUÉ ESTE TEST: dos fallos reales, ambos de la clase "la pantalla se
 * queda en blanco y nadie se entera".
 *
 *  1. Con movimiento reducido el usuario quedaba ATRAPADO. `useReducedMotion`
 *     arranca en false (lee la preferencia por promesa), así que la secuencia
 *     empezaba igual; al resolverse a true, el efecto salía por un `return` y
 *     el contador se congelaba en la primera frase — sin botón, sin salida.
 *  2. Las frases se APILABAN (`slice(0, shown)`) en un contenedor sin scroll,
 *     así que el texto se salía de pantalla, y lo que se salía eran las citas
 *     del usuario.
 *
 * Aquí se fija lo que ninguna de las dos versiones cumplía: una frase a la
 * vez, y siempre se llega al botón.
 */
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';

let mockReduced = false;
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: () => mockReduced }));
jest.mock('@/components/aura', () => ({ Aura: () => null }));
jest.mock('@/components/PolarisLogo', () => ({ PolarisLogo: () => null }));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return {
    PrimaryButton: ({ label, onPress }: { label?: string; onPress?: () => void }) =>
      R.createElement(RN.Text, { onPress }, label),
  };
});
const CON_PALABRAS = {
  profile: { name: 'Ana', painPoint: 'No logro parar de trabajar.' },
  northStar: { purpose: 'Construir sin quemarme', identity: 'Alguien que sostiene', nonNegotiables: [], dailyReminder: '' },
};
const SIN_PALABRAS = {
  profile: { name: 'Ana' },
  northStar: { purpose: '', identity: '', nonNegotiables: [], dailyReminder: '' },
};
let mockState: typeof CON_PALABRAS = CON_PALABRAS;

jest.mock('@/hooks/use-lifeflow', () => ({ useLifeFlow: () => ({ state: mockState }) }));

import UmbralScreen from '@/app/(onboarding)/umbral';

const CTA = 'CRUZAR EL UMBRAL';

/** Avanza la secuencia entera con temporizadores falsos. */
function correrSecuencia(n = 20) {
  for (let i = 0; i < n; i++) {
    act(() => { jest.advanceTimersByTime(3000); });
  }
}

beforeEach(() => {
  jest.useFakeTimers();
  mockReduced = false;
  mockState = CON_PALABRAS;
  mockReplace.mockClear();
});
afterEach(() => { jest.useRealTimers(); });

describe('El Umbral', () => {
  it('abre con las palabras del usuario, no con el manifiesto de la app', () => {
    const { getByText } = render(<UmbralScreen />);
    // Lo primero en pantalla es su obstáculo, citado. Si esto se rompe es que
    // alguien volvió a poner el discurso de la app delante del usuario.
    getByText(/No logro parar de trabajar/);
  });

  it('muestra UNA frase a la vez — no las apila', () => {
    const { queryByText } = render(<UmbralScreen />);
    expect(queryByText(/No logro parar de trabajar/)).not.toBeNull();
    act(() => { jest.advanceTimersByTime(2600); });
    // La primera se fue al entrar la segunda. Si ambas están, volvieron a
    // acumular y el texto acabará saliéndose de la pantalla.
    expect(queryByText(/No logro parar de trabajar/)).toBeNull();
    expect(queryByText(/Construir sin quemarme/)).not.toBeNull();
  });

  it('llega al botón de cruzar, y cruzar lleva a Comando', () => {
    const { getByText, queryByText } = render(<UmbralScreen />);
    expect(queryByText(CTA)).toBeNull(); // no aparece antes de tiempo
    correrSecuencia();
    getByText(CTA).props.onPress();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/comando');
  });

  it('con movimiento reducido se LEE el guion — no se salta ni se congela', () => {
    // Este test estaba mal escrito y certificaba el estado roto: solo miraba
    // que "TAMBIÉN llega al botón". Con eso verde pasaron DOS regresiones
    // opuestas — congelarse en la frase 1, y despachar las siete en ~20ms —
    // porque en ambas se llegaba al boton. El invariante que fijaba era "llega
    // al trámite", que es justo el diagnóstico que este loop persigue.
    //
    // Lo que importa es que las frases SE LEAN. Reducir movimiento significa
    // menos movimiento, jamás menos contenido.
    mockReduced = true;
    const { getByText, queryByText } = render(<UmbralScreen />);

    // A cero milisegundos: su primera frase en pantalla, y NINGÚN botón.
    getByText(/No logro parar de trabajar/);
    expect(queryByText(CTA)).toBeNull();

    // El reloj es el mismo para todos: un beat, una frase.
    act(() => { jest.advanceTimersByTime(2600); });
    getByText(/Construir sin quemarme/);
    expect(queryByText(CTA)).toBeNull();

    correrSecuencia();
    getByText(CTA);
  });

  it('tocar adelanta la frase, sin esperar el reloj', () => {
    const { getByLabelText, queryByText } = render(<UmbralScreen />);
    act(() => { fireEvent.press(getByLabelText('Siguiente frase')); });
    expect(queryByText(/No logro parar de trabajar/)).toBeNull();
    expect(queryByText(/Construir sin quemarme/)).not.toBeNull();
  });

  it('SALTAR va directo al final', () => {
    const { getByText, getByLabelText } = render(<UmbralScreen />);
    act(() => { fireEvent.press(getByLabelText('Saltar la introducción')); });
    getByText(CTA);
  });

  it('la última frase sigue en pantalla cuando aparece el botón', () => {
    const { getByText } = render(<UmbralScreen />);
    correrSecuencia();
    // El cierre entra DEBAJO del texto, no en su lugar: cambiar la frase por
    // el trámite es perder el remate del guion.
    getByText(/Vas a tener más capacidad/);
    getByText(CTA);
  });
});

describe('El Umbral sin nada escrito', () => {
  it('no finge tener palabras del usuario: usa su nombre', () => {
    // Los tres campos son opcionales. Sin este caso, el Umbral podría quedarse
    // sin una sola palabra del usuario y nadie se enteraría.
    mockState = SIN_PALABRAS;
    const { getByText } = render(<UmbralScreen />);
    getByText(/Ana empieza el día 0/);
  });
});
