/**
 * humanFigureLogic — la silueta como cuerpo real, no como siete cajas.
 *
 * El dueño pidió la figura de la referencia (How We Feel): un cuerpo humano
 * reconocible —cabeza, cuello, hombros, brazos, piernas— renderizado como
 * textura de puntos sobre negro. Esto reemplaza `ZONE_BOX` en
 * `components/body-map.tsx`, que dibujaba siete rectángulos con borde.
 *
 * Es lógica pura y determinista, descrita con primitivas geométricas
 * (elipses y cápsulas) — NO con un trazado a mano calcado del PNG de
 * referencia. Copiar un asset ajeno bezier a bezier sería falsificar una
 * precisión que no existe (nadie clona un archivo que no tiene) y sería
 * imposible de testear. Las primitivas sí: "todo punto cae dentro del
 * lienzo", "cada zona tiene puntos", "las 7 zonas no se solapan", "la misma
 * semilla da la misma figura, siempre".
 *
 * `generateFigure()` corre UNA vez por sesión (`useMemo` con semilla fija en
 * el componente) — ni el PRNG ni la cuadrícula se recalculan en cada render.
 */
import type { BodyZone } from './bodyMapLogic';

export interface FigureDot {
  x: number;
  y: number;
  r: number;
  zone: BodyZone | null;
  /** `true` = punto del halo del borde: más disperso, más tenue. Es lo que
   *  da la textura deshilachada de la referencia en vez de un corte limpio. */
  edge: boolean;
}

export interface FigureBounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** El lienzo, en unidades propias. Con el canvas real a ~300pt de ancho
 *  (`maxWidth: 300` en el componente), 1 unidad ≈ 1pt — la misma convención
 *  que ya usaba `ZONE_BOX` con sus porcentajes. */
export const VIEWBOX = { w: 300, h: 486 };

// ── PRNG determinista (mulberry32) — mismo patrón que `biometricSimulator.ts`:
// nunca `Math.random`, misma semilla da siempre la misma figura. ──────────────
function mulberry32(seed: number) {
  let a = seed;
  return function rand(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Primitivas ────────────────────────────────────────────────────────────────
function ellipseContains(px: number, py: number, cx: number, cy: number, rx: number, ry: number): boolean {
  const dx = (px - cx) / rx;
  const dy = (py - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

/** Cápsula: segmento (x0,y0)-(x1,y1) con radio que interpola entre r0 y r1
 *  a lo largo del segmento. Es cómo se dibujan brazos y piernas: rectos,
 *  con un ancho que afina hacia la mano o el pie. */
function capsuleContains(
  px: number, py: number,
  x0: number, y0: number, x1: number, y1: number,
  r0: number, r1: number,
): boolean {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / lenSq));
  const cx = x0 + t * dx;
  const cy = y0 + t * dy;
  const r = r0 + (r1 - r0) * t;
  const ddx = px - cx;
  const ddy = py - cy;
  return ddx * ddx + ddy * ddy <= r * r;
}

function lerpKeyframes(y: number, points: Array<[number, number]>): number {
  if (y <= points[0][0]) return points[0][1];
  const last = points[points.length - 1];
  if (y >= last[0]) return last[1];
  for (let i = 0; i < points.length - 1; i++) {
    const [y0, v0] = points[i];
    const [y1, v1] = points[i + 1];
    if (y >= y0 && y <= y1) return v0 + (v1 - v0) * ((y - y0) / (y1 - y0));
  }
  return last[1];
}

// ── La figura ──────────────────────────────────────────────────────────────────
//
// Los límites de cada tramo se eligieron para que las cinco bandas del eje
// central (cabeza/mandíbula/garganta/pecho/estómago) midan ≥44 unidades de
// alto EN SÍ MISMAS, no por relleno: cabeza y mandíbula se tocan sin hueco
// porque son la MISMA elipse de cabeza vista por dentro, así que su frontera
// nunca se nota en el dibujo — solo decide qué se ilumina al tocar.
//
// Cada banda se autoriza con 4 unidades de margen sobre el mínimo de 44: la
// cuadrícula con jitter no cae exactamente en la frontera, así que el punto
// real más cercano a un límite autorizado en 44 quedaba 1-2 unidades corto.
const HEAD = { cx: 150, cy: 56, rx: 32, ry: 50 };
/** Bajo esto, dentro de la cabeza, es mandíbula. Deja ≥44 arriba y ≥44 abajo. */
const HEAD_JAW_Y = HEAD.cy + HEAD.ry - 48; // = 58
const NECK = { x0: 150, y0: HEAD.cy + HEAD.ry, x1: 150, y1: HEAD.cy + HEAD.ry + 50, r0: 15, r1: 16 };
const TORSO_TOP = NECK.y1;
const TORSO_BOTTOM = 352;
/** Ancho a cada lado del centro, por altura. Hombros anchos, cintura que
 *  entra, cadera que vuelve a salir un poco antes de angostarse a las piernas. */
const TORSO_TAPER: Array<[number, number]> = [
  [TORSO_TOP, 74], [216, 66], [248, 44], [306, 56], [TORSO_BOTTOM, 44],
];
/** Límite pecho/estómago dentro del torso. */
const PECHO_ESTOMAGO_Y = 248;
const ARM = {
  l: { sx: 76, sy: TORSO_TOP, hx: 30, hy: 326, r0: 16, r1: 9 },
  r: { sx: 224, sy: TORSO_TOP, hx: 270, hy: 326, r0: 16, r1: 9 },
};
const LEG = {
  l: { hx: 128, hy: TORSO_BOTTOM, fx: 119, fy: 458, r0: 27, r1: 15 },
  r: { hx: 172, hy: TORSO_BOTTOM, fx: 181, fy: 458, r0: 27, r1: 15 },
};
const FOOT = {
  l: { cx: 114, cy: 470, rx: 19, ry: 10 },
  r: { cx: 186, cy: 470, rx: 19, ry: 10 },
};

function torsoHalfWidth(y: number, scale: number): number {
  return lerpKeyframes(y, TORSO_TAPER) * scale;
}

function inTorso(x: number, y: number, scale: number): boolean {
  if (y < TORSO_TOP || y > TORSO_BOTTOM) return false;
  return Math.abs(x - 150) <= torsoHalfWidth(y, scale);
}

function inArms(x: number, y: number, scale: number): boolean {
  const a = ARM.l;
  const b = ARM.r;
  return (
    capsuleContains(x, y, a.sx, a.sy, a.hx, a.hy, a.r0 * scale, a.r1 * scale) ||
    capsuleContains(x, y, b.sx, b.sy, b.hx, b.hy, b.r0 * scale, b.r1 * scale)
  );
}

function inLegsOrFeet(x: number, y: number, scale: number): boolean {
  const legHit = (l: typeof LEG.l) => capsuleContains(x, y, l.hx, l.hy, l.fx, l.fy, l.r0 * scale, l.r1 * scale);
  const footHit = (f: typeof FOOT.l) => ellipseContains(x, y, f.cx, f.cy, f.rx * scale, f.ry * scale);
  return legHit(LEG.l) || legHit(LEG.r) || footHit(FOOT.l) || footHit(FOOT.r);
}

/** `scale` > 1 ensancha cada primitiva (halo del borde); 1 = contorno real. */
function inSilhouette(x: number, y: number, scale: number): boolean {
  if (ellipseContains(x, y, HEAD.cx, HEAD.cy, HEAD.rx * scale, HEAD.ry * scale)) return true;
  if (capsuleContains(x, y, NECK.x0, NECK.y0, NECK.x1, NECK.y1, NECK.r0 * scale, NECK.r1 * scale)) return true;
  if (inTorso(x, y, scale)) return true;
  if (inArms(x, y, scale)) return true;
  return inLegsOrFeet(x, y, scale);
}

/**
 * Dónde termina "espalda" y empieza "pecho"/"estómago" dentro del torso — una
 * línea VERTICAL FIJA, no una fracción del ancho del torso en cada altura.
 *
 * Con una fracción del ancho, el límite se movía con el contorno (el torso
 * se angosta hacia la cintura), así que a una altura la frontera caía en
 * x=124 y a otra en x=150 — una línea diagonal, no vertical. La caja que
 * cubre TODOS los puntos de "espalda" a lo largo de esa diagonal se estira
 * hasta donde la frontera llegó más lejos, y la de "pecho" hasta donde llegó
 * más cerca: dos cajas rectas envolviendo una frontera en diagonal acaban
 * solapándose, aunque ningún punto individual esté en las dos zonas a la
 * vez. Con una línea vertical fija la frontera es la misma columna para
 * cualquier altura, así que las dos cajas nunca se estiran una sobre la otra.
 */
const ESPALDA_LIMITE_X = 130;

/**
 * Qué zona tocable representa un punto — o `null` si es decorativo (piernas,
 * pies: no son ninguna de las 7 zonas, igual que en la versión anterior).
 *
 * Decide por BANDA DE ALTURA, no por qué primitiva geométrica lo contiene.
 * La cápsula del cuello tiene tapas redondas —así se dibuja una cápsula—, y
 * su tapa superior se mete unas unidades dentro de la altura de la cabeza;
 * decidir "cabeza si la elipse lo contiene, cuello si la cápsula lo
 * contiene" dejaba una franja donde AMBAS formas dicen que sí y el punto
 * cambiaba de zona según el orden de los `if`. Con un corte de altura fijo
 * —cada tramo del cuerpo ocupa una franja y solo una— la frontera entre dos
 * zonas es la misma línea para las dos, así que nunca se solapan.
 *
 * Los brazos son la única excepción real: se comprueban primero porque, a la
 * altura del hombro, un punto del brazo también cae dentro de la franja del
 * torso.
 */
export function zoneAt(x: number, y: number): BodyZone | null {
  if (inArms(x, y, 1)) return 'manos';
  if (y < HEAD_JAW_Y) return 'cabeza';
  if (y < NECK.y0) return 'mandibula';
  if (y < TORSO_TOP) return 'garganta';
  if (inTorso(x, y, 1)) {
    if (x < ESPALDA_LIMITE_X) return 'espalda';
    return y < PECHO_ESTOMAGO_Y ? 'pecho' : 'estomago';
  }
  return null;
}

export interface GenerateFigureOptions {
  seed?: number;
  /** Tamaño de celda de la cuadrícula, en unidades del viewBox. Más pequeño
   *  = más puntos = más denso. */
  cell?: number;
}

/**
 * Cuadrícula con jitter, no puntos puramente al azar: uno por celda, en una
 * posición aleatoria dentro de ella. Da una textura pareja como la de la
 * referencia; el muestreo aleatorio uniforme deja grumos y huecos.
 */
export function generateFigure({ seed = 90417, cell = 8 }: GenerateFigureOptions = {}): FigureDot[] {
  const rand = mulberry32(seed);
  const dots: FigureDot[] = [];
  for (let gy = 0; gy < VIEWBOX.h; gy += cell) {
    for (let gx = 0; gx < VIEWBOX.w; gx += cell) {
      const x = gx + cell * 0.5 + (rand() - 0.5) * cell * 0.8;
      const y = gy + cell * 0.5 + (rand() - 0.5) * cell * 0.8;
      if (inSilhouette(x, y, 1)) {
        dots.push({ x, y, r: 1.05 + rand() * 0.65, zone: zoneAt(x, y), edge: false });
        continue;
      }
      // Halo: solo en el anillo entre el contorno real y uno un 15% más
      // ancho, y con menos de un tercio de probabilidad — el borde se
      // deshilacha en vez de cortar en seco, la textura de la referencia.
      if (inSilhouette(x, y, 1.15) && rand() < 0.32) {
        dots.push({ x, y, r: 0.55 + rand() * 0.45, zone: zoneAt(x, y), edge: true });
      }
    }
  }
  return dots;
}

/** Un rectángulo tocable. Casi siempre uno por zona — `manos` da DOS: el
 *  brazo izquierdo y el derecho son formas separadas, y una sola caja que
 *  las envolviera a ambas cruzaría todo el centro del cuerpo por en medio. */
export interface TouchRegion {
  zone: BodyZone;
  bounds: FigureBounds;
}

function boundsOf(pts: FigureDot[]): FigureBounds {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const d of pts) {
    x0 = Math.min(x0, d.x); x1 = Math.max(x1, d.x);
    y0 = Math.min(y0, d.y); y1 = Math.max(y1, d.y);
  }
  return { x0, y0, x1, y1 };
}

/**
 * Una región tocable por zona, salvo `manos`, que da dos: el brazo izquierdo
 * y el derecho por separado. Solo cuenta el núcleo (`edge: false`) — los
 * puntos del halo caen fuera del contorno real y en la costura entre dos
 * zonas —cuello/torso, torso/pierna— un puñado cruza al lado contrario; la
 * caja calculada se comía entonces unas unidades de la zona vecina y
 * disparaba un "solapa" falso entre bandas que en el contorno real se tocan
 * limpio, cero unidades de más.
 */
export function computeTouchRegions(dots: FigureDot[]): TouchRegion[] {
  const core = dots.filter((d) => d.zone && !d.edge) as Array<FigureDot & { zone: BodyZone }>;
  const byZone = new Map<BodyZone, FigureDot[]>();
  for (const d of core) {
    if (!byZone.has(d.zone)) byZone.set(d.zone, []);
    byZone.get(d.zone)!.push(d);
  }
  const regions: TouchRegion[] = [];
  for (const [zone, pts] of byZone) {
    if (zone !== 'manos') {
      regions.push({ zone, bounds: boundsOf(pts) });
      continue;
    }
    // `manos` es dos brazos: repartir por lado del eje central antes de
    // acotar, o el brazo izquierdo y el derecho comparten una sola caja que
    // atraviesa el torso.
    //
    // Y se descarta el tramo pegado al hombro (`< TORSO_TOP + 24`) SOLO para
    // esta caja invisible — el brazo entero se sigue dibujando y tiñendo por
    // completo. Ahí el brazo y el flanco del torso ocupan el mismo rincón
    // (el hombro es literalmente donde uno se convierte en el otro), así
    // que dos cajas rectas que cubrieran cada una su forma completa se
    // solapaban justo ahí. Tocar el hombro para decir "espalda" o "brazo" es
    // ambiguo de todos modos; la caja se retira al antebrazo y la mano, que
    // es donde el gesto es inequívoco.
    const points = pts.filter((d) => d.y >= TORSO_TOP + 24);
    const left = points.filter((d) => d.x < 150);
    const right = points.filter((d) => d.x >= 150);
    if (left.length) regions.push({ zone, bounds: boundsOf(left) });
    if (right.length) regions.push({ zone, bounds: boundsOf(right) });
  }
  return regions;
}

/**
 * Expande cada región hasta el piso táctil (44 por defecto — las mismas
 * unidades que el viewBox, así que 44 unidades ≈ 44pt) sin invadir a la
 * región vecina más cercana en esa dirección: cada lado solo toma hasta la
 * mitad del hueco libre hacia esa vecina. Da la misma garantía que las
 * rondas anteriores fijaron a mano zona por zona (`STACKED`, `FLANCO` en la
 * versión de cajas), pero derivada de la geometría real en vez de una tabla
 * aparte — así un test que compara contra lo que se pinta no puede
 * desalinearse de ello, que es justo el hueco que dejó pasar la caja
 * estrecha de `espalda`/`manos` hasta la ronda 9 de la versión anterior.
 */
export function expandToTouchTarget(regions: TouchRegion[], min = 44): TouchRegion[] {
  const out = regions.map((r) => ({ zone: r.zone, bounds: { ...r.bounds } }));

  const grow = (axis: 'x' | 'y') => {
    for (let i = 0; i < out.length; i++) {
      const b = out[i].bounds;
      const size = axis === 'x' ? b.x1 - b.x0 : b.y1 - b.y0;
      const need = Math.max(0, min - size) / 2;
      if (need === 0) continue;
      let padLo = need;
      let padHi = need;
      for (let j = 0; j < regions.length; j++) {
        if (j === i) continue;
        const o = regions[j].bounds;
        // Solo cuenta como vecina si se solapan en el eje perpendicular —
        // si no, están en esquinas distintas del cuerpo y no compiten.
        const overlapsPerp =
          axis === 'x'
            ? !(b.y1 <= o.y0 || o.y1 <= b.y0)
            : !(b.x1 <= o.x0 || o.x1 <= b.x0);
        if (!overlapsPerp) continue;
        if (axis === 'x') {
          if (o.x1 <= b.x0) padLo = Math.min(padLo, Math.max(0, (b.x0 - o.x1) / 2));
          if (o.x0 >= b.x1) padHi = Math.min(padHi, Math.max(0, (o.x0 - b.x1) / 2));
        } else {
          if (o.y1 <= b.y0) padLo = Math.min(padLo, Math.max(0, (b.y0 - o.y1) / 2));
          if (o.y0 >= b.y1) padHi = Math.min(padHi, Math.max(0, (o.y0 - b.y1) / 2));
        }
      }
      if (axis === 'x') {
        b.x0 -= padLo;
        b.x1 += padHi;
      } else {
        b.y0 -= padLo;
        b.y1 += padHi;
      }
    }
  };
  grow('x');
  grow('y');
  return out;
}
