/**
 * La caja táctil crece a 44 sin mover el dibujo.
 *
 * POR QUE ESTE FICHERO: la app usaba `hitSlop` para cubrir los iconos pequeños,
 * y react-native-web NO LO IMPLEMENTA — comprobado en `node_modules`, la
 * propiedad no aparece. Cada `hitSlop` es correcto en iOS y Android e inerte en
 * la PWA. `hitBox` es el reemplazo que funciona en las tres.
 *
 * Las dos mitades del contrato tienen que cumplirse a la vez, y por eso se
 * fijan aquí: si solo crece, la fila se ensancha y el diseño se descuadra; si
 * solo compensa, no hay caja que tocar. La resta es la parte fácil de romper
 * en un refactor y la difícil de ver a ojo.
 */
import { hitBox } from '@/constants/theme';

describe('hitBox', () => {
  it('lleva cualquier tamaño pequeño hasta 44', () => {
    for (const visual of [16, 24, 28, 32, 38, 43]) {
      const b = hitBox(visual);
      expect(b.minWidth).toBe(44);
      expect(b.minHeight).toBe(44);
    }
  });

  it('el margen negativo devuelve exactamente lo que creció', () => {
    // 28 de dibujo dentro de 44 de caja = 16 de sobra, 8 por lado.
    expect(hitBox(28).margin).toBe(-8);
    expect(hitBox(38).margin).toBe(-3);
    expect(hitBox(16).margin).toBe(-14);
  });

  it('a partir de 44 no compensa nada — ya cumple', () => {
    expect(hitBox(44).margin).toBe(-0);
    expect(hitBox(60).margin).toBe(-0);
    // Y nunca encoge un elemento que ya era grande.
    expect(hitBox(60).minWidth).toBe(44);
  });

  it('centra el contenido: el dibujo queda donde estaba, no arriba a la izquierda', () => {
    expect(hitBox(28).alignItems).toBe('center');
    expect(hitBox(28).justifyContent).toBe('center');
  });
});
