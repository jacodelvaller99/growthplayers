/**
 * El titular nunca parte una palabra.
 *
 * POR QUE: GrandisExtended mide ~21% más que Arial al mismo cuerpo. Mientras la
 * fuente de marca NO cargaba en web (bug de `+html.tsx`, ver `injectBrandFont`),
 * los titulares se dimensionaron contra el sustituto estrecho. Al arreglar la
 * carga, el hero de bienvenida pasó a romperse: "SISTEM / A / INTERN / O.".
 *
 * Aquí se fija que el cuerpo elegido CABE, con la métrica real medida en el
 * navegador (0.74 em/carácter en mayúsculas) como criterio de verdad.
 */
import { fitDisplaySize } from '@/constants/theme';

/** Ancho real de N caracteres en GrandisExtended Bold mayúsculas, medido. */
const anchoReal = (chars: number, size: number) => chars * size * 0.74;

describe('fitDisplaySize', () => {
  const CASOS: [string, number][] = [
    ['iPhone SE / Android pequeño', 320],
    ['iPhone 13 mini', 375],
    ['iPhone 14', 390],
    ['iPhone 14 Pro Max', 430],
    ['tablet', 768],
  ];

  for (const [nombre, ancho] of CASOS) {
    it(`${nombre} (${ancho}px) — "INTERNO." cabe`, () => {
      const disponible = ancho - 24 * 2; // spacing.xl a cada lado
      const size = fitDisplaySize(disponible, 8, 62);
      expect(anchoReal(8, size)).toBeLessThanOrEqual(disponible);
    });
  }

  it('nunca supera el cuerpo de diseño, por ancha que sea la pantalla', () => {
    expect(fitDisplaySize(4000, 8, 62)).toBe(62);
  });

  it('no colapsa a ilegible en un ancho absurdo', () => {
    // Preferimos que desborde a que el titular quede en 6px: si alguien mete
    // este componente en una columna de 40px, el bug es el contenedor.
    expect(fitDisplaySize(40, 8, 62)).toBe(20);
  });

  it('una palabra más larga obliga a un cuerpo menor', () => {
    const corta = fitDisplaySize(326, 6, 62);
    const larga = fitDisplaySize(326, 12, 62);
    expect(larga).toBeLessThan(corta);
  });
});
