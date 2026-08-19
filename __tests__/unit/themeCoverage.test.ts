/**
 * Ninguna pantalla puede pintar un color fuera del sistema de tema.
 *
 * POR QUE ESTE FICHERO: los ejes de color solo son reales si TODA la app los
 * obedece. Un solo `color: '#fff'` perdido convierte una pantalla en la única
 * que no cambia — y peor, lo hace de forma invisible en oscuro, que es donde se
 * desarrolla. El caso que motivó el barrido: el botón de sesión en vivo de
 * Comando pintaba su texto con `palette.black`, que es `--c-bg`; sobre el
 * relleno dorado, en tema claro, eso era gris claro sobre oro.
 *
 * La regla NO es "prohibido el hex". Hay colores que deben ser constantes, y
 * están abajo con su razón. La regla es que todo hex nuevo pase por aquí y
 * alguien explique por qué no es un token.
 *
 * Nota sobre por qué a veces la respuesta TIENE que ser un token: un color
 * constante no puede cumplir AA en los dos temas. Sobre `#111111` hace falta
 * luminancia ≥ 0.201; sobre blanco, ≤ 0.183. No existe intersección. Cualquier
 * color que lleve texto en ambos temas es forzosamente tematizable.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { sync as glob } from 'glob';

const ROOT = join(__dirname, '../..');

/**
 * Hex permitidos, con su motivo. Clave = `ruta:hex`.
 *
 * Cada entrada es una decisión, no una excepción de conveniencia: o el color no
 * es de UI (una escala de datos, una emisión de luz), o su fondo es constante
 * (letterbox de vídeo, lienzo de escaneo), o es una sombra.
 */
const ALLOWED: Record<string, string> = {
  // Sombras: siempre negras, en los dos temas.
  'components/tour/TourButton.tsx:#000': 'shadowColor',
  'components/PWAInstallBanner.tsx:#000': 'shadowColor',
  'app/(tabs)/programas.tsx:#000': 'shadowColor',
  'components/WellnessMiniPlayer.tsx:#000': 'shadowColor',
  'components/SkoolVideo.tsx:#000': 'letterbox de vídeo + sombras — negro a propósito, como YouTube',

  // Lienzos de render: la silueta y el escaneo corporal se leen sobre negro en
  // ambos temas; el fondo no es "la superficie de la app", es el visor.
  'components/body-map.tsx:#000000': 'lienzo del mapa corporal',
  'components/body-front-scan.tsx:#000000': 'lienzo del escaneo',
  'components/body-front-scan.tsx:#FFF4B0': 'núcleo de partícula (emisión de luz sobre el lienzo negro)',
  'components/body-front-scan.tsx:#FFC804': 'partícula/resplandor sobre el lienzo negro',
  'components/body-map-3d.web.tsx:#5F5F5F': 'fallback de cssColor() cuando var() no resuelve',

  // Escalas de DATOS: el matiz codifica una categoría, no un estado de UI, y se
  // usan como relleno sobre superficie oscura constante.
  'app/bienestar/ayuno.tsx:#EDBA01': 'escala de fases de ayuno',
  'app/bienestar/ayuno.tsx:#E8A000': 'escala de fases de ayuno',
  'app/bienestar/ayuno.tsx:#D4AF37': 'escala de fases de ayuno',
  'app/bienestar/ayuno.tsx:#C8A020': 'escala de fases de ayuno',
  'app/bienestar/ayuno.tsx:#B8901C': 'escala de fases de ayuno',
  'app/bienestar/suplementacion.tsx:#E8A000': 'escala por categoría de suplemento',
  'app/bienestar/suplementacion.tsx:#EDBA01': 'escala por categoría de suplemento',
  'app/bienestar/suplementacion.tsx:#D4AF37': 'escala por categoría de suplemento',
  'app/bienestar/suplementacion.tsx:#C8A020': 'escala por categoría de suplemento',
  'app/bienestar/suplementacion.tsx:#A08020': 'escala por categoría de suplemento',
  'app/bienestar/suplementacion.tsx:#8B9DFF': 'escala por categoría de suplemento',
  'app/bienestar/suplementacion.tsx:#7B8DFF': 'escala por categoría de suplemento',
  'app/bienestar/suplementacion.tsx:#6B7DFF': 'escala por categoría de suplemento',
  'app/bienestar/suplementacion.tsx:#5B6DFF': 'escala por categoría de suplemento',
  'app/bienestar/suplementacion.tsx:#4B5DFF': 'escala por categoría de suplemento',
  'app/bienestar/suplementacion.tsx:#4CAF50': 'escala por categoría de suplemento',
  'app/bienestar/suplementacion.tsx:#45A045': 'escala por categoría de suplemento',
  'app/bienestar/suplementacion.tsx:#3A9035': 'escala por categoría de suplemento',
  'app/bienestar/suplementacion.tsx:#2F8030': 'escala por categoría de suplemento',
  'app/bienestar/suplementacion.tsx:#247025': 'escala por categoría de suplemento',
};

describe('cobertura del tema en toda la app', () => {
  const files = glob('{app,components}/**/*.{ts,tsx}', { cwd: ROOT, posix: true });

  it('el barrido encuentra ficheros (si no, el test no probaría nada)', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('ningún hex fuera del sistema sin justificar en la lista de arriba', () => {
    const offenders: string[] = [];

    for (const rel of files) {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      for (const m of src.matchAll(/'(#[0-9A-Fa-f]{3,8})'/g)) {
        const key = `${rel}:${m[1]}`;
        if (!(key in ALLOWED)) offenders.push(key);
      }
    }

    expect([...new Set(offenders)].sort()).toEqual([]);
  });

  it('`ink` y `paper` son las ÚNICAS constantes de texto sobre relleno', () => {
    // Existen porque `--c-text` se invierte con el tema: sobre un relleno
    // dorado o rojo, que NO se invierte, el texto acabaría del color del fondo.
    const theme = readFileSync(join(ROOT, 'constants/theme.ts'), 'utf8');
    expect(theme).toMatch(/ink:\s*'#0A0A0A'/);
    expect(theme).toMatch(/paper:\s*'#FFFFFF'/);
  });

  it('`palette.black` no se usa como color de TEXTO', () => {
    // `black` es `--c-bg`: como `color:` pinta del color del fondo. En oscuro
    // pasa desapercibido sobre relleno dorado; en claro es gris sobre oro.
    const offenders: string[] = [];
    for (const rel of files) {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      for (const m of src.matchAll(/color:\s*palette\.black\b/g)) {
        offenders.push(`${rel} (…${src.slice(Math.max(0, m.index - 40), m.index).split('\n').pop()})`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
