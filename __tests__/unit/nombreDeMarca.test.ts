/**
 * El nombre interno del repositorio no puede aparecer en la interfaz.
 *
 * POR QUE ESTE FICHERO: el proyecto se llama `lifeflow` por dentro y **Polaris**
 * por fuera. Esa doble vida es normal y no molesta a nadie — mientras no se
 * cruce. Se cruzó: la barra lateral de escritorio rotulaba el hub de bienestar
 * como "LIFEFLOW" mientras la propia pantalla y la barra del móvil lo llamaban
 * "BIENESTAR". El mismo destino tenía dos nombres según el ancho de la ventana,
 * y uno de los dos era el nombre de la carpeta.
 *
 * Sobrevivió a la pasada que unificó la marca porque era el ÚNICO caso, en un
 * fichero que nadie mira a 390px. Un `grep` global lo habría encontrado; nadie
 * corrió ese grep. Ahora lo corre esto, en cada push.
 *
 * La regla no prohíbe la palabra: `useLifeFlow`, `use-lifeflow` y
 * `lifeflow:v2` son identificadores y siguen siendo correctos. Lo que prohíbe
 * es que aparezca como TEXTO que alguien lee.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { sync as glob } from 'glob';

const ROOT = join(__dirname, '../..');

/**
 * Cadenas visibles: literales entre comillas que van en `label`/`title`/`name`,
 * y texto suelto dentro de JSX. Deliberadamente tosco — un falso positivo aquí
 * cuesta un minuto de lectura; un falso negativo devuelve el bug.
 */
/**
 * Dos reglas, no una — y la diferencia importa.
 *
 * ROTULOS (`label:`, `title:`, …): el valor es copy POR DEFINICIÓN. Aquí no
 * caben excusas: "LIFEFLOW" es una sola palabra sin espacios y la primera
 * versión de este fichero lo dejaba pasar por parecer un identificador. El
 * test seguía en verde por accidente —lo cazaba el otro patrón, de rebote— y
 * al afinar ese otro patrón la detección desapareció entera. Un guardarraíl
 * que aprueba el fallo que lo motivó es peor que no tenerlo.
 *
 * TEXTO JSX: se busca entre `>` y `<`, y esos caracteres también viven en
 * `===` y `&&`, así que aquí SÍ hay que descartar código e identificadores.
 */
const ROTULOS = /\b(?:label|title|placeholder|heading|eyebrow|cta)\s*:\s*(['"`])([^'"`]*)\1/gi;
const TEXTO_JSX = />\s*([^<>{}]*?)\s*</g;

const INTERNO = /lifeflow/i;

/** Identificadores legítimos: no son texto que nadie lea. */
const ES_IDENTIFICADOR = (s: string) =>
  /^[\w.\-:/@]+$/.test(s.trim()) && !/\s/.test(s.trim());

/**
 * Descarta código capturado por error.
 *
 * El patrón de texto JSX busca entre `>` y `<`, y esos dos caracteres también
 * viven dentro de `===`, `&&` y `<=`. En la primera pasada eso capturó
 * `m.status === 'active' && !['free', 'lifeflow_free'` — donde `lifeflow_free`
 * es un valor de tier en base de datos, no algo que nadie lea.
 *
 * Nadie escribe copy con llaves, corchetes, punto y coma o `&&`. Filtrar por
 * ahí conserva el fallo real (una etiqueta limpia) y tira el ruido.
 */
const PARECE_CODIGO = (s: string) => /[=&|{}[\]();$]|\.\w+\(/.test(s);

describe('el nombre interno no se filtra a la interfaz', () => {
  const ficheros = glob('{app,components}/**/*.tsx', { cwd: ROOT })
    .filter((f) => !f.includes('__tests__'));

  it('hay ficheros que revisar (si no, esto no probaría nada)', () => {
    expect(ficheros.length).toBeGreaterThan(40);
  });

  it('ninguna cadena visible dice "LifeFlow"', () => {
    const infractores: string[] = [];

    for (const f of ficheros) {
      const src = readFileSync(join(ROOT, f), 'utf8');

      // Rótulos: sin exenciones. Lo que va en `label:` se lee.
      ROTULOS.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = ROTULOS.exec(src)) !== null) {
        const texto = m[2].trim();
        if (texto && INTERNO.test(texto)) infractores.push(`${f}: rótulo "${texto.slice(0, 50)}"`);
      }

      // Texto suelto en JSX: aquí sí hay que separar copy de código.
      TEXTO_JSX.lastIndex = 0;
      while ((m = TEXTO_JSX.exec(src)) !== null) {
        const texto = m[1].trim();
        if (!texto || !INTERNO.test(texto)) continue;
        if (ES_IDENTIFICADOR(texto) || PARECE_CODIGO(texto)) continue;
        infractores.push(`${f}: texto "${texto.slice(0, 50)}"`);
      }
    }

    expect(infractores).toEqual([]);
  });
});
