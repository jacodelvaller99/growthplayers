/**
 * Contrato de accesibilidad de PrimaryButton y ScaleSelector (components/polaris.tsx).
 *
 * Por qué este archivo existe: las 56 pruebas de pantalla mockean
 * `@/components/polaris` entero, así que estos dos componentes se renderizaban
 * CERO veces en toda la suite. Cualquiera podía borrar el `disabled` del
 * Pressable o el `accessibilityState` del selector y los 204 tests seguirían en
 * verde. Aquí se montan DE VERDAD: solo se stubean las dependencias nativas que
 * jest no sabe cargar (Skia) o que tocan hardware (háptica).
 */
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

// Skia revienta en jest; polaris.tsx lo importa en el top level para los sparklines.
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
  ImpactFeedbackStyle: { Light: 'light' },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrimaryButton, ScaleSelector } = require('@/components/polaris');

describe('PrimaryButton — la prop disabled tiene que llegar al árbol', () => {
  it('deshabilitado no dispara onPress', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <PrimaryButton label="GUARDAR" onPress={onPress} disabled />,
    );
    fireEvent.press(getByLabelText('GUARDAR'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('deshabilitado se anuncia como deshabilitado (no como accionable)', () => {
    const { getByLabelText } = render(<PrimaryButton label="GUARDAR" disabled />);
    const btn = getByLabelText('GUARDAR');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('deshabilitado ni siquiera acepta el gesto (no basta el guard interno)', () => {
    const { getByLabelText } = render(<PrimaryButton label="GUARDAR" onPress={jest.fn()} disabled />);
    // Pressable NO reexpone `disabled` como prop del nodo host, así que mirarla
    // daría undefined y la aserción no probaría nada. Lo observable es que el
    // Pressable rechaza empezar a responder: eso solo pasa si `disabled` llegó
    // de verdad al componente. El `if (disabled) return` de handlePress tapaba
    // este agujero — con él, un onPress no llamado NO demuestra nada.
    expect(getByLabelText('GUARDAR').props.onStartShouldSetResponder()).toBe(false);
  });

  it('habilitado sí dispara y no se anuncia deshabilitado', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<PrimaryButton label="GUARDAR" onPress={onPress} />);
    const btn = getByLabelText('GUARDAR');
    expect(btn.props.accessibilityState?.disabled).toBeFalsy();
    fireEvent.press(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('ScaleSelector — 10 pasos, uno elegido', () => {
  const renderScale = (value: number, onChange = jest.fn()) =>
    render(<ScaleSelector label="Energía" value={value} onChange={onChange} />);

  it('marca como seleccionado solo el paso activo', () => {
    const { getByLabelText } = renderScale(7);
    expect(getByLabelText('Energía 7').props.accessibilityState?.selected).toBe(true);
    for (const other of [1, 6, 8, 10]) {
      expect(getByLabelText(`Energía ${other}`).props.accessibilityState?.selected).toBe(false);
    }
  });

  it('la selección sigue al valor', () => {
    const { getByLabelText } = renderScale(3);
    expect(getByLabelText('Energía 3').props.accessibilityState?.selected).toBe(true);
    expect(getByLabelText('Energía 7').props.accessibilityState?.selected).toBe(false);
  });

  it('cada paso reserva al menos 44px de ancho (regla 44×44pt del proyecto)', () => {
    const { getByLabelText } = renderScale(5);
    const style = StyleSheetFlatten(getByLabelText('Energía 5').props.style);
    expect(style.minWidth).toBeGreaterThanOrEqual(44);
    expect(style.height).toBeGreaterThanOrEqual(44);
  });

  it('tocar un paso reporta ese valor', () => {
    const onChange = jest.fn();
    const { getByLabelText } = renderScale(5, onChange);
    fireEvent.press(getByLabelText('Energía 9'));
    expect(onChange).toHaveBeenCalledWith(9);
  });
});

/** El style de un Pressable es una función (pressed) => style[]; hay que aplanarlo. */
function StyleSheetFlatten(style: unknown): Record<string, number> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { StyleSheet } = require('react-native');
  const resolved = typeof style === 'function' ? style({ pressed: false }) : style;
  return StyleSheet.flatten(resolved) ?? {};
}
