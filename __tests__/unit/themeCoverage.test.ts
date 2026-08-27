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
  // `+html.tsx` NO llega al build (Expo genera su propia plantilla; ver
  // injectBrandFont). Se deja el color por si algún día vuelve a aplicarse.
  'app/+html.tsx:#080808': 'theme-color del navegador — plantilla que hoy no se aplica',

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

// PENDIENTE A PROPÓSITO — no por descuido: este archivo detecta hex con
// comillas (`'#...'`) pero NO `rgba(...)` crudo. Se investigó antes de tocar
// este test: hay 89 apariciones de `rgba(` en 37 ficheros de app/components,
// y una fracción real es legítima y NO debe fallar — `shadowColor` es negro
// en los dos temas, `palette.purple*`/`avatarSwatches` son CONSTANTES
// documentadas a propósito (ver theme.ts), y hay más casos sin auditar caso
// por caso. Construir el `ALLOWED` equivalente para 89 sitios sin revisar
// cada uno a mano es el tipo de salto de fe que puede tapar justo el bug que
// este archivo existe para atrapar — así que se deja sin aserción. Si alguien
// tiene tiempo para auditar los 89 uno a uno, se añade con el mismo mecanismo
// de `ALLOWED` de arriba.
describe('cobertura del tema en toda la app', () => {
  const files = glob('{app,components}/**/*.{ts,tsx}', { cwd: ROOT, posix: true });

  it('el barrido encuentra ficheros (si no, el test no probaría nada)', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('ningún hex fuera del sistema sin justificar en la lista de arriba', () => {
    const offenders: string[] = [];

    for (const rel of files) {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      // Comillas simples Y dobles: en JSX el color va como `color="#e63946"`,
      // y la versión anterior solo miraba comillas simples — por ahí se colaron.
      for (const m of src.matchAll(/['"](#[0-9A-Fa-f]{3,8})['"]/g)) {
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

  it('nadie concatena opacidad a un token de color (`palette.x + "NN"`)', () => {
    // El bug real, documentado en theme.ts:41: `palette.gold + '44'` compila
    // porque JS no distingue tipos, pero en web el token es `var(--c-gold)` y
    // `var(--c-gold)44` no es CSS válido — el color se pierde en silencio. El
    // fix es `alpha(token, 'NN')`. A diferencia del hueco de `rgba(...)` de
    // arriba, aquí no hay falsos positivos posibles: cualquier match de este
    // patrón exacto (acceso a `palette.*`/`Colors.*` + concatenación de 2
    // dígitos hex) ES el bug, nunca una excepción legítima.
    const offenders: string[] = [];
    const pattern = /(?:palette|Colors\.\w+)\.\w+\s*\+\s*['"][0-9A-Fa-f]{2}['"]/g;
    for (const rel of files) {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      for (const m of src.matchAll(pattern)) {
        offenders.push(`${rel}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
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
