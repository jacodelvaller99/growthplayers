/**
 * Ningún token `cv()` puede entrar a un interpolador de Reanimated.
 *
 * POR QUE ESTE FICHERO: `interpolateColor(focused, [0,1], [palette.lineSoft,
 * palette.gold])` en `app/lesson/[id].tsx` tumbaba la pantalla ENTERA de
 * lección en web — el Protocolo, el producto central de 90 días, muerto en la
 * PWA. En web `cv()` devuelve la cadena `var(--c-border-soft)`, Reanimated no
 * sabe parsear una variable CSS, el rango de salida colapsa y lanza
 * "Interpolation input and output ranges should contain at least two values".
 * En nativo `cv()` devuelve el hex real, así que el bug era INVISIBLE fuera
 * del navegador: ni el typecheck ni un test de lógica pura lo habrían visto.
 *
 * Se lee el fuente (mismo patrón que `moduleLessons.test.ts`) porque lo que
 * hay que fijar es la FORMA de la llamada, no un valor de retorno: el fallo
 * ocurre en el hilo de Reanimated, en tiempo de render, solo en web.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

/** Tokens de `constants/theme.ts` construidos con `cv()` — en web son `var()`. */
function themeAwareTokens(): string[] {
  const theme = readFileSync(join(ROOT, 'constants/theme.ts'), 'utf8');
  const names: string[] = [];
  for (const line of theme.split('\n')) {
    const m = line.match(/^\s*([a-zA-Z][a-zA-Z0-9]*):\s*cv\(/);
    if (m) names.push(m[1]);
  }
  return names;
}

/** Ficheros que llaman a algún interpolador de color de Reanimated. */
const FILES_WITH_INTERPOLATE = ['app/lesson/[id].tsx'];

describe('interpolateColor nunca recibe un token cv()', () => {
  const tokens = themeAwareTokens();

  it('el listado de tokens cv() no está vacío (si lo estuviera, el test no probaría nada)', () => {
    expect(tokens.length).toBeGreaterThan(5);
    expect(tokens).toContain('lineSoft');
  });

  it('`gold` NO es cv() — puede seguir usándose en interpolaciones', () => {
    // Regla de color del proyecto: el oro de marca es hex constante.
    expect(tokens).not.toContain('gold');
  });

  for (const rel of FILES_WITH_INTERPOLATE) {
    it(`${rel} no pasa ningún token cv() a interpolateColor`, () => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      // Hasta el `;` de la sentencia, NO hasta el primer `))`: con `))` la
      // llamada de una sola línea (que termina en `]),`) no casaba y el test
      // daba verde sin mirar nada. Comprobado inyectando el código viejo.
      const calls = src.match(/interpolateColor\([^;]*/g) ?? [];
      expect(calls.length).toBeGreaterThan(0); // si desaparece la llamada, revisar este test.
      for (const call of calls) {
        for (const token of tokens) {
          expect(call).not.toMatch(new RegExp(`palette\\.${token}\\b`));
        }
      }
    });
  }
});
