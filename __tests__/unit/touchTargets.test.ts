/**
 * Ningún botón de navegación por debajo de 44×44.
 *
 * POR QUE: 44pt es el mínimo de la HIG de Apple y del propio CLAUDE.md de este
 * proyecto ("Touch targets minimum 44×44pt everywhere"). La regla estaba
 * escrita y **26 pantallas la incumplían**: los botones de volver iban a 36×36,
 * copiados de pantalla en pantalla. Lo detectó midiendo el DOM real a 390px
 * (`scripts/audit-ui.mjs`), no leyendo el código — en el editor un 36 no llama
 * la atención.
 *
 * Se comprueba sobre el fuente porque lo que hay que fijar es la DECLARACIÓN:
 * medir en el navegador exige levantar el servidor y no corre en CI.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { sync as glob } from 'glob';

const ROOT = join(__dirname, '../..');
const MINIMO = 44;

/** Estilos que son, por nombre, un control de navegación pulsable. */
const CONTROLES = /(backBtn|backButton|backBtnSmall|headerBack|navBack|closeBtn|closeButton)\s*:\s*\{/g;

/** Extrae el cuerpo `{...}` que empieza en `desde` (no anidado). */
function bloque(src: string, desde: number): string {
  let prof = 0;
  for (let i = desde; i < Math.min(src.length, desde + 900); i++) {
    if (src[i] === '{') prof++;
    else if (src[i] === '}') {
      prof--;
      if (prof === 0) return src.slice(desde, i + 1);
    }
  }
  return '';
}

describe('objetivos táctiles', () => {
  const files = glob('{app,components}/**/*.tsx', { cwd: ROOT, posix: true });

  it('el barrido encuentra ficheros', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('encuentra controles de navegación (si no, el test no probaría nada)', () => {
    const total = files.reduce(
      (n, f) => n + [...readFileSync(join(ROOT, f), 'utf8').matchAll(CONTROLES)].length,
      0,
    );
    expect(total).toBeGreaterThan(20);
  });

  it(`ningún control de navegación por debajo de ${MINIMO}px`, () => {
    const infractores: string[] = [];

    for (const rel of files) {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      for (const m of src.matchAll(CONTROLES)) {
        const cuerpo = bloque(src, m.index! + m[0].length - 1);
        for (const dim of cuerpo.matchAll(/\b(width|height):\s*(\d+)\b/g)) {
          if (Number(dim[2]) < MINIMO) {
            infractores.push(`${rel} — ${m[1]}.${dim[1]} = ${dim[2]}`);
          }
        }
      }
    }

    expect(infractores).toEqual([]);
  });
});
