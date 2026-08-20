/**
 * El botón de volver mide 44 en TODAS las pantallas.
 *
 * POR QUE ESTE FICHERO: el mismo botón, con el mismo nombre y el mismo trabajo,
 * estaba escrito de dos maneras. Trece pantallas lo declaraban `width: 44,
 * height: 44`; otras dieciséis lo dejaban en `padding: spacing.xs`, que son 28
 * píxeles. Mitad bien, mitad mal, sin que nada lo señalara — porque cada
 * pantalla trae su propio StyleSheet y nadie compara veintinueve ficheros a ojo.
 *
 * Volver es la salida de la pantalla: si el dedo falla, el usuario se queda
 * dentro. Y la única defensa que tenían los pequeños era `hitSlop`, que
 * react-native-web NO IMPLEMENTA — correcto en iOS y Android, inexistente en
 * la PWA (ver `hitBox` en constants/theme.ts).
 *
 * Este test no mide píxeles en un navegador: lee el fuente y exige que la
 * declaración diga 44. Es tosco a propósito. La alternativa —confiar en que
 * quien copie el patrón copie el bueno— ya falló dieciséis veces.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { sync as glob } from 'glob';

const ROOT = join(__dirname, '../..');

/** Captura el cuerpo de `backBtn: { … }`, en una línea o en varias. */
const BACK_BTN = /\bbackBtn:\s*\{([^}]*)\}/gs;

describe('el botón de volver nunca baja de 44', () => {
  const ficheros = glob('{app,components}/**/*.tsx', { cwd: ROOT })
    .filter((f) => !f.includes('__tests__'));

  it('hay pantallas con botón de volver (si no, esto no probaría nada)', () => {
    const conBoton = ficheros.filter((f) =>
      /\bbackBtn:\s*\{/.test(readFileSync(join(ROOT, f), 'utf8')));
    expect(conBoton.length).toBeGreaterThan(10);
  });

  it('todos declaran 44 de alto y de ancho', () => {
    const infractores: string[] = [];

    for (const f of ficheros) {
      const src = readFileSync(join(ROOT, f), 'utf8');
      BACK_BTN.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = BACK_BTN.exec(src)) !== null) {
        const cuerpo = m[1];
        const ancho = /\b(?:width|minWidth):\s*(\d+)/.exec(cuerpo);
        const alto = /\b(?:height|minHeight):\s*(\d+)/.exec(cuerpo);
        if (!ancho || !alto || Number(ancho[1]) < 44 || Number(alto[1]) < 44) {
          infractores.push(`${f}: ${cuerpo.replace(/\s+/g, ' ').trim().slice(0, 46)}`);
        }
      }
    }

    expect(infractores).toEqual([]);
  });
});
