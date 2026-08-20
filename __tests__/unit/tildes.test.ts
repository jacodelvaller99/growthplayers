/**
 * Las mayúsculas llevan tilde. En español y según la RAE, siempre.
 *
 * POR QUE ESTE FICHERO: la app rotula secciones en versalitas, y ahí es donde
 * la tilde se cae sin que nadie la eche de menos. Encontrado mirando una
 * captura de Mentor: «CONSULTAS RAPIDAS» y «CONVERSACION», tres veces, en la
 * pantalla que más se usa después de Comando.
 *
 * No lo pilla ningún linter ni ningún corrector: para una herramienta es una
 * cadena válida. Y a ojo tampoco, porque en versalitas la tilde ausente no
 * "suena" mal — solo se ve mal cuando alguien se para a mirarla.
 *
 * La lista es de palabras concretas que aparecen en esta app, no un
 * diccionario. Cuando entre una palabra nueva con tilde, se añade aquí y el
 * test la cubre desde ese momento.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { sync as glob } from 'glob';

const ROOT = join(__dirname, '../..');

/** forma sin tilde → forma correcta. Solo palabras que la app usa. */
const CON_TILDE: Record<string, string> = {
  RAPIDA: 'RÁPIDA', RAPIDAS: 'RÁPIDAS', RAPIDO: 'RÁPIDO', RAPIDOS: 'RÁPIDOS',
  CONVERSACION: 'CONVERSACIÓN', CONVERSACIONES: 'CONVERSACIONES',
  SESION: 'SESIÓN', SESIONES: 'SESIONES',
  ACCION: 'ACCIÓN', ATENCION: 'ATENCIÓN', GESTION: 'GESTIÓN',
  MEDICION: 'MEDICIÓN', SELECCION: 'SELECCIÓN', DECISION: 'DECISIÓN',
  ANALISIS: 'ANÁLISIS', PRACTICA: 'PRÁCTICA', PRACTICAS: 'PRÁCTICAS',
  ULTIMO: 'ÚLTIMO', ULTIMA: 'ÚLTIMA', ULTIMOS: 'ÚLTIMOS', ULTIMAS: 'ÚLTIMAS',
  MODULO: 'MÓDULO', MODULOS: 'MÓDULOS',
  PROXIMO: 'PRÓXIMO', PROXIMOS: 'PRÓXIMOS',
};

/**
 * Plurales que NO llevan tilde aunque el singular sí — la sílaba tónica se
 * desplaza. Sin esta excepción el test pediría «SESIÓNES», que es falta.
 */
const SIN_TILDE_EN_PLURAL = new Set(['CONVERSACIONES', 'SESIONES']);

describe('las mayúsculas llevan tilde', () => {
  const ficheros = glob('{app,components,data}/**/*.{ts,tsx}', { cwd: ROOT })
    .filter((f) => !f.includes('__tests__'));

  it('hay ficheros que revisar', () => {
    expect(ficheros.length).toBeGreaterThan(50);
  });

  it('ningún rótulo en versalitas se come una tilde', () => {
    const infractores: string[] = [];
    // Cadenas entre comillas formadas SOLO por mayúsculas, espacios y signos:
    // eso es un rótulo, no prosa ni un identificador.
    const ROTULO = /(['"`])([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9 ·:()×/+-]{2,})\1/g;

    for (const f of ficheros) {
      const src = readFileSync(join(ROOT, f), 'utf8');
      ROTULO.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = ROTULO.exec(src)) !== null) {
        for (const palabra of m[2].split(/[^A-ZÁÉÍÓÚÑ]+/)) {
          if (!palabra || SIN_TILDE_EN_PLURAL.has(palabra)) continue;
          const correcta = CON_TILDE[palabra];
          if (correcta && correcta !== palabra) {
            infractores.push(`${f}: "${m[2].slice(0, 34)}" → ${palabra} debe ser ${correcta}`);
          }
        }
      }
    }

    expect([...new Set(infractores)]).toEqual([]);
  });
});
