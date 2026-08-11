/**
 * particleBodyViewer — el cuerpo de partículas al NIVEL DE LA REFERENCIA del
 * dueño: partículas multiescala sobre la malla real, una piel translúcida
 * translúcida, bloom real en el oro y textura nerviosa interna. No es la nube
 * sintética de `bodyScanWorld`.
 *
 * Pipeline (plan "NIVEL REFERENCIA" aprobado):
 *   1. MUESTREO baricéntrico área-ponderado sobre los triángulos de la malla
 *      — cualquier densidad sin depender de cuántos vértices trajo el
 *      artista. Cuatro capas: polvo fino (silueta sólida), chispas brillantes
 *      (textura granulada), fibras internas y una red anatómica ramificada.
 *   2. Color por GRADIENTE de altura local (`particleBodyGradient.ts`), NO
 *      color horneado en el GLB — el próximo asset limpio del dueño (prompt
 *      sin color) funciona sin tocar este archivo.
 *   3. Las 6 vistas desde la MISMA malla con UN solo renderer offscreen:
 *      renderiza en secuencia y devuelve ImageBitmaps — sin 6 contextos GL
 *      vivos, sin 6 composers. El bloom (UnrealBloomPass) hace arder el oro.
 *
 * three.js PURO — sin @react-three/fiber, sin three-stdlib, sin expo-gl. Esa
 * combinación fue la causa raíz REAL de los 3 fallos previos (ver
 * `ec2d33c`/`0ac625d`): fiber no declara `exports` y Metro empaquetaba DOS
 * árboles de clases THREE a la vez. three 0.185 SÍ declara `exports`
 * (`./examples/jsm/*` incluido) y este módulo es el ÚNICO importador de
 * "three" del repo. Imports dinámicos: cero peso en el bundle principal.
 */
import { GOLD, heartClusterColor, heartClusterIntensity } from './particleBodyGradient';
import { ENERGY_FOCI, type ProjectedEnergyFocus } from './energyFocusLogic';

const MODEL_URL = '/models/cuerpo-particulas.glb';
/** Del metadata.json del paquete actual: altura 1.80m, origen suelo-centro. */
const MODEL_HEIGHT = 1.8;

// ── Capas ────────────────────────────────────────────────────────────────────
//
// El plan pedía ~250k. Medido en el navegador real: a esa cifra el muestreo
// (búsqueda binaria + trigonometría por partícula, en el hilo principal)
// congelaba la pestaña más de 60s — la página dejaba de responder incluso a
// un `querySelectorAll`. 138k muestras de superficie + 18k de red procedural
// conservan detalle en cara/manos/pies sin volver al bloqueo de 250k; el hilo
// respira gracias al `yieldToBrowser` de abajo.
const DUST_COUNT = 105000; // polvo fino: la silueta sólida.
const SPARK_COUNT = 15000; // chispas: el granulado brillante.
const FIBER_COUNT = 18000; // fibras internas: solo banda dorada.
/** Red anatómica estructurada: columna, cuello, clavículas y ramificaciones
 *  del pecho. No hace búsqueda sobre triángulos, así que añade detalle sin
 *  repetir el coste que congeló el navegador al probar 250k muestras. */
const ANATOMY_COUNT = 18000;
/** Total real de partículas — lo muestra el HUD del reporte (dato real del
 *  propio pipeline, no una cifra inventada). */
export const PARTICLE_TOTAL = DUST_COUNT + SPARK_COUNT + FIBER_COUNT + ANATOMY_COUNT;
/** Cada cuántas partículas se le devuelve el hilo al navegador. Sin esto el
 *  muestreo es un bloque síncrono largo y la pestaña se congela. */
const YIELD_EVERY = 12000;

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
const FLOAT_LAYER_FRACTION = 0.12; // capa flotante sutil del polvo.
const FLOAT_LAYER_MAX = 0.018; // metros.
const SKIN_HUG_MAX = 0.003;
const FIBER_DEPTH = 0.02; // las fibras van hacia ADENTRO.
const GOLD_BAND_MIN = 0.35; // heartClusterIntensity mínima para aceptar una fibra.

interface Layer {
  positions: Float32Array;
  colors: Float32Array;
}

interface SurfaceMesh {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array | Uint16Array;
}

interface ParticleCloud {
  dust: Layer;
  sparks: Layer;
  fibers: Layer;
  anatomy: Layer;
  surface: SurfaceMesh;
}

let cloudPromise: Promise<ParticleCloud> | null = null;

/** PRNG determinístico: la verificación por píxel necesita que dos cargas
 *  del mismo GLB produzcan exactamente la misma nube. `Math.random()` hacía
 *  variar el granulado y el bloom entre capturas aun sin cambiar el código. */
let randomState = 0x50_4f_4c_41;
function randomUnit(): number {
  randomState = (randomState + 0x6d2b79f5) | 0;
  let value = randomState;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

/** CDF acumulada de áreas de triángulo — sin esto, triángulos grandes
 *  (torso) quedarían tan poblados como los diminutos (dedos): huecos en el
 *  cuerpo y grumos en las manos.
 *
 *  NO SELLES LOS AGUJEROS DE LA MALLA. Auditada en Blender 5.2: tiene 2.266
 *  bordes de contorno en 12 bucles — cráneo abierto por arriba, plantas de
 *  los pies, entrepierna. Parecen un defecto y no lo son: son aberturas que
 *  nunca se ven. `bmesh.ops.holes_fill` las cierra con tapones grandes y
 *  alabeados que, YA TRIANGULADOS (que es lo que se renderiza), suman +41%
 *  de área: 1,84 → 2,60 m², cuando 1,84 m² ya es la superficie correcta de
 *  un cuerpo de 1,80 m. Como este muestreo es proporcional al ÁREA, ~29% de
 *  las partículas acabarían sobre superficie inventada — el tapón mayor cae
 *  a altura relativa 0,90, un disco plano sobre la cabeza. Medido, no
 *  supuesto. Los agujeros no producen huecos visibles justamente porque el
 *  muestreo recorre los triángulos que existen. */
function buildTriangleCDF(
  pos: Float32Array,
  indices: Uint32Array | Uint16Array,
): { cdf: Float64Array; triCount: number } {
  const triCount = indices.length / 3;
  const cdf = new Float64Array(triCount);
  let acc = 0;
  for (let t = 0; t < triCount; t++) {
    const i0 = indices[t * 3] * 3;
    const i1 = indices[t * 3 + 1] * 3;
    const i2 = indices[t * 3 + 2] * 3;
    const ax = pos[i1] - pos[i0];
    const ay = pos[i1 + 1] - pos[i0 + 1];
    const az = pos[i1 + 2] - pos[i0 + 2];
    const bx = pos[i2] - pos[i0];
    const by = pos[i2 + 1] - pos[i0 + 1];
    const bz = pos[i2 + 2] - pos[i0 + 2];
    const cx = ay * bz - az * by;
    const cy = az * bx - ax * bz;
    const cz = ax * by - ay * bx;
    acc += 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
    cdf[t] = acc;
  }
  return { cdf, triCount };
}

/** Búsqueda binaria del primer índice cuya CDF ≥ target. */
function pickTriangle(cdf: Float64Array, target: number): number {
  let lo = 0;
  let hi = cdf.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (cdf[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

interface SampledPoint {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
}

/** Un punto uniforme sobre la superficie (baricéntricas + normal de cara). */
function samplePoint(
  pos: Float32Array,
  indices: Uint32Array | Uint16Array,
  cdf: Float64Array,
  totalArea: number,
  out: SampledPoint,
): void {
  const t = pickTriangle(cdf, randomUnit() * totalArea);
  const i0 = indices[t * 3] * 3;
  const i1 = indices[t * 3 + 1] * 3;
  const i2 = indices[t * 3 + 2] * 3;

  const r1 = Math.sqrt(randomUnit());
  const r2 = randomUnit();
  const w0 = 1 - r1;
  const w1 = r1 * (1 - r2);
  const w2 = r1 * r2;

  out.x = pos[i0] * w0 + pos[i1] * w1 + pos[i2] * w2;
  out.y = pos[i0 + 1] * w0 + pos[i1 + 1] * w1 + pos[i2 + 1] * w2;
  out.z = pos[i0 + 2] * w0 + pos[i1 + 2] * w1 + pos[i2 + 2] * w2;

  const ax = pos[i1] - pos[i0];
  const ay = pos[i1 + 1] - pos[i0 + 1];
  const az = pos[i1 + 2] - pos[i0 + 2];
  const bx = pos[i2] - pos[i0];
  const by = pos[i2 + 1] - pos[i0 + 1];
  const bz = pos[i2 + 2] - pos[i0 + 2];
  let nx = ay * bz - az * by;
  let ny = az * bx - ax * bz;
  let nz = ax * by - ay * bx;
  const nlen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  out.nx = nx / nlen;
  out.ny = ny / nlen;
  out.nz = nz / nlen;
}

/** Ruido determinista [0,1) por coordenada — mismo patrón shader-hash que
 *  `humanFigure3DLogic.hash`; da la estría fibrosa sin PRNG con estado. */
function fiberNoise(x: number, y: number, z: number): number {
  const s = Math.sin(x * 91.7 + y * 47.3 + z * 73.9) * 43758.5453;
  return s - Math.floor(s);
}

type CurvePoint = readonly [number, number, number];
interface AnatomyPath {
  p0: CurvePoint;
  p1: CurvePoint;
  p2: CurvePoint;
  p3: CurvePoint;
  width: number;
  weight: number;
}

/** Curvas dentro del torso, en metros. Son estructura, no datos clínicos:
 *  una columna central y ramificaciones bilaterales que dan la lectura
 *  nerviosa/vascular de la referencia sin depender de una textura horneada. */
function createAnatomyPaths(): readonly AnatomyPath[] {
  const paths: AnatomyPath[] = [
    // Troncos: cuello, esternón y columna posterior.
    { p0: [0, 1.62, 0.01], p1: [-0.015, 1.50, 0.055], p2: [0.012, 1.39, 0.085], p3: [0, 1.29, 0.085], width: 0.004, weight: 1.4 },
    { p0: [0, 1.31, 0.075], p1: [0.012, 1.18, 0.055], p2: [-0.01, 1.02, 0.025], p3: [0, 0.86, 0], width: 0.0035, weight: 1.2 },
    { p0: [0, 1.60, -0.065], p1: [0.012, 1.38, -0.075], p2: [-0.012, 1.08, -0.065], p3: [0, 0.82, -0.035], width: 0.003, weight: 1.25 },
  ];

  // Arcos costales finos. Muchos ramales delgados leen como red nerviosa,
  // no como el abanico geométrico de seis líneas de la primera iteración.
  for (let level = 0; level < 8; level++) {
    const y = 1.13 + level * 0.041;
    const reach = 0.155 + level * 0.008;
    for (const side of [-1, 1] as const) {
      paths.push({
        p0: [side * 0.008, y + 0.016, 0.075],
        p1: [side * (0.045 + level * 0.002), y + 0.045, 0.09 - level * 0.004],
        p2: [side * (reach * 0.76), y + 0.018 - level * 0.003, 0.055],
        p3: [side * reach, y - 0.03, 0.005 + (level % 2) * 0.012],
        width: 0.0018 + (level % 3) * 0.00035,
        weight: 0.38 + level * 0.025,
      });
    }
  }

  // Plexo del pecho: ramificaciones asimétricas y a distinta profundidad.
  for (let branch = 0; branch < 12; branch++) {
    const side = branch % 2 === 0 ? -1 : 1;
    const lane = Math.floor(branch / 2);
    const endY = 1.16 + lane * 0.055;
    const endX = side * (0.10 + (lane % 3) * 0.035);
    const endZ = 0.015 + (branch % 4) * 0.018;
    paths.push({
      p0: [side * 0.012, 1.305 + (branch % 3) * 0.009, 0.09],
      p1: [side * (0.025 + lane * 0.006), 1.34 - lane * 0.008, 0.105 - lane * 0.006],
      p2: [endX * 0.62, endY + (branch % 3 - 1) * 0.038, endZ + 0.028],
      p3: [endX, endY, endZ],
      width: 0.0016 + (branch % 3) * 0.0003,
      weight: 0.32 + (branch % 4) * 0.035,
    });
  }

  // Clavículas, cuello lateral y continuación corta hacia brazos.
  for (const side of [-1, 1] as const) {
    paths.push(
      { p0: [side * 0.015, 1.36, 0.075], p1: [side * 0.08, 1.43, 0.075], p2: [side * 0.16, 1.47, 0.035], p3: [side * 0.235, 1.43, 0], width: 0.0024, weight: 0.7 },
      { p0: [side * 0.03, 1.37, 0.065], p1: [side * 0.055, 1.45, 0.045], p2: [side * 0.06, 1.54, 0.02], p3: [side * 0.065, 1.62, -0.005], width: 0.002, weight: 0.48 },
      { p0: [side * 0.205, 1.43, 0.005], p1: [side * 0.245, 1.36, 0.012], p2: [side * 0.27, 1.28, 0.006], p3: [side * 0.285, 1.18, 0], width: 0.0018, weight: 0.42 },
      { p0: [side * 0.17, 1.38, 0.03], p1: [side * 0.215, 1.32, 0.055], p2: [side * 0.25, 1.24, 0.035], p3: [side * 0.27, 1.15, 0.005], width: 0.0015, weight: 0.34 },
    );
  }

  return paths;
}

const ANATOMY_PATHS = createAnatomyPaths();

function cubicBezier(path: AnatomyPath, t: number): [number, number, number] {
  const oneMinus = 1 - t;
  const a = oneMinus * oneMinus * oneMinus;
  const b = 3 * oneMinus * oneMinus * t;
  const c = 3 * oneMinus * t * t;
  const d = t * t * t;
  return [
    path.p0[0] * a + path.p1[0] * b + path.p2[0] * c + path.p3[0] * d,
    path.p0[1] * a + path.p1[1] * b + path.p2[1] * c + path.p3[1] * d,
    path.p0[2] * a + path.p1[2] * b + path.p2[2] * c + path.p3[2] * d,
  ];
}

function buildAnatomyLayer(): Layer {
  const anatomy: Layer = {
    positions: new Float32Array(ANATOMY_COUNT * 3),
    colors: new Float32Array(ANATOMY_COUNT * 3),
  };
  const totalWeight = ANATOMY_PATHS.reduce((sum, path) => sum + path.weight, 0);
  let cursor = 0;
  for (let pathIndex = 0; pathIndex < ANATOMY_PATHS.length; pathIndex++) {
    const path = ANATOMY_PATHS[pathIndex];
    const remaining = ANATOMY_COUNT - cursor;
    const count = pathIndex === ANATOMY_PATHS.length - 1
      ? remaining
      : Math.min(remaining, Math.round((ANATOMY_COUNT * path.weight) / totalWeight));
    for (let point = 0; point < count; point++) {
      const t = Math.min(1, Math.max(0, (point + randomUnit()) / Math.max(1, count - 1)));
      const [x, y, z] = cubicBezier(path, t);
      const angle = randomUnit() * Math.PI * 2;
      const radius = Math.sqrt(randomUnit()) * path.width;
      const idx = cursor * 3;
      anatomy.positions[idx] = x + Math.cos(angle) * radius;
      anatomy.positions[idx + 1] = y + (randomUnit() - 0.5) * path.width * 0.8;
      anatomy.positions[idx + 2] = z + Math.sin(angle) * radius;
      const heat = 0.78 + randomUnit() * 0.32;
      anatomy.colors[idx] = Math.min(1, GOLD[0] * heat);
      anatomy.colors[idx + 1] = Math.min(1, GOLD[1] * heat);
      anatomy.colors[idx + 2] = Math.min(1, GOLD[2] * heat);
      cursor++;
    }
  }
  return anatomy;
}

async function loadParticleCloud(): Promise<ParticleCloud> {
  if (!cloudPromise) {
    cloudPromise = (async () => {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(MODEL_URL);
      let mesh: import('three').Mesh | null = null;
      gltf.scene.traverse((obj) => {
        if (!mesh && (obj as import('three').Mesh).isMesh) mesh = obj as import('three').Mesh;
      });
      if (!mesh) throw new Error('cuerpo-particulas.glb: sin malla');

      const geo = (mesh as import('three').Mesh).geometry;
      const posAttr = geo.attributes.position as import('three').BufferAttribute;
      const pos = posAttr.array as Float32Array;
      if (!geo.attributes.normal) geo.computeVertexNormals();
      const normalAttr = geo.attributes.normal as import('three').BufferAttribute;
      const indices = geo.index
        ? (geo.index.array as Uint32Array | Uint16Array)
        : Uint32Array.from({ length: pos.length / 3 }, (_, i) => i);
      const surface: SurfaceMesh = {
        positions: pos.slice(),
        normals: (normalAttr.array as Float32Array).slice(),
        indices: indices.slice() as Uint32Array | Uint16Array,
      };

      const { cdf, triCount } = buildTriangleCDF(pos, indices);
      const totalArea = cdf[triCount - 1];

      let minY = Infinity;
      let maxY = -Infinity;
      for (let i = 1; i < pos.length; i += 3) {
        if (pos[i] < minY) minY = pos[i];
        if (pos[i] > maxY) maxY = pos[i];
      }
      const heightSpan = Math.max(1e-6, maxY - minY);
      const pt: SampledPoint = { x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0 };

      // ── Capa 1: polvo fino (pegado a la piel + fracción flotante) ──
      const dust: Layer = {
        positions: new Float32Array(DUST_COUNT * 3),
        colors: new Float32Array(DUST_COUNT * 3),
      };
      for (let p = 0; p < DUST_COUNT; p++) {
        if (p % YIELD_EVERY === 0) await yieldToBrowser();
        samplePoint(pos, indices, cdf, totalArea, pt);
        const isFloating = randomUnit() < FLOAT_LAYER_FRACTION;
        const off = isFloating ? randomUnit() * FLOAT_LAYER_MAX : randomUnit() * SKIN_HUG_MAX;
        const idx = p * 3;
        dust.positions[idx] = pt.x + pt.nx * off;
        dust.positions[idx + 1] = pt.y + pt.ny * off;
        dust.positions[idx + 2] = pt.z + pt.nz * off;
        // heartClusterColor (no heightGradientColor): además de la altura, pesa
        // la normal Z (pt.nz) para que el oro se concentre en la cara que mira
        // a la cámara -- un cúmulo en el pecho, no una banda alrededor de todo
        // el torso (verificado antes: el "oro" se veía igual de fuerte de
        // perfil que de frente).
        const [r, g, b] = heartClusterColor((dust.positions[idx + 1] - minY) / heightSpan, pt.nz);
        dust.colors[idx] = r;
        dust.colors[idx + 1] = g;
        dust.colors[idx + 2] = b;
      }

      // ── Capa 2: chispas brillantes (el granulado de la referencia) ──
      const sparks: Layer = {
        positions: new Float32Array(SPARK_COUNT * 3),
        colors: new Float32Array(SPARK_COUNT * 3),
      };
      for (let p = 0; p < SPARK_COUNT; p++) {
        if (p % YIELD_EVERY === 0) await yieldToBrowser();
        samplePoint(pos, indices, cdf, totalArea, pt);
        const off = randomUnit() * SKIN_HUG_MAX * 2;
        const idx = p * 3;
        sparks.positions[idx] = pt.x + pt.nx * off;
        sparks.positions[idx + 1] = pt.y + pt.ny * off;
        sparks.positions[idx + 2] = pt.z + pt.nz * off;
        const [r, g, b] = heartClusterColor((sparks.positions[idx + 1] - minY) / heightSpan, pt.nz);
        // Las chispas van un paso más brillantes — es lo que el bloom recoge.
        sparks.colors[idx] = Math.min(1, r * 1.35);
        sparks.colors[idx + 1] = Math.min(1, g * 1.35);
        sparks.colors[idx + 2] = Math.min(1, b * 1.35);
      }

      // ── Capa 3: fibras internas doradas (rejection sampling en la banda) ──
      const fibers: Layer = {
        positions: new Float32Array(FIBER_COUNT * 3),
        colors: new Float32Array(FIBER_COUNT * 3),
      };
      let placed = 0;
      let guard = FIBER_COUNT * 25; // tope de intentos — la banda es ~1/4 del cuerpo.
      while (placed < FIBER_COUNT && guard-- > 0) {
        if (guard % YIELD_EVERY === 0) await yieldToBrowser();
        samplePoint(pos, indices, cdf, totalArea, pt);
        const normY = (pt.y - minY) / heightSpan;
        if (heartClusterIntensity(normY, pt.nz) < GOLD_BAND_MIN) continue;
        // Adentro de la piel, con estría: el ruido agrupa las partículas en
        // vetas en vez de repartirlas parejo — se leen como fibras/venas.
        const vein = fiberNoise(pt.x * 30, pt.y * 30, pt.z * 30);
        if (vein > 0.45) continue; // solo ~45% del área interna → vetas.
        const depth = (0.3 + 0.7 * vein) * FIBER_DEPTH;
        const idx = placed * 3;
        fibers.positions[idx] = pt.x - pt.nx * depth;
        fibers.positions[idx + 1] = pt.y - pt.ny * depth;
        fibers.positions[idx + 2] = pt.z - pt.nz * depth;
        const heat = 0.75 + 0.5 * (1 - vein);
        fibers.colors[idx] = Math.min(1, GOLD[0] * heat);
        fibers.colors[idx + 1] = Math.min(1, GOLD[1] * heat);
        fibers.colors[idx + 2] = Math.min(1, GOLD[2] * heat);
        placed++;
      }

      const anatomy = buildAnatomyLayer();
      return { dust, sparks, fibers, anatomy, surface };
    })();
  }
  return cloudPromise;
}

export interface ViewAngle {
  yaw: number;
  pitch: number;
}

/** Sprite radial blanco: `PointsMaterial` sin mapa dibuja cuadrados. A esta
 *  escala se leían como ruido digital grueso; el borde suave circular deja
 *  ver dedos, rostro y fibras finas sin aumentar el conteo de la malla. */
function createParticleTexture(THREE: typeof import('three')): import('three').DataTexture {
  const size = 32;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = ((x + 0.5) / size) * 2 - 1;
      const ny = ((y + 0.5) / size) * 2 - 1;
      const distance = Math.sqrt(nx * nx + ny * ny);
      const edge = Math.min(1, Math.max(0, (distance - 0.2) / 0.8));
      const falloff = 1 - edge * edge * (3 - 2 * edge);
      const index = (y * size + x) * 4;
      data[index] = 255;
      data[index + 1] = 255;
      data[index + 2] = 255;
      data[index + 3] = Math.round(falloff * 255);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Renderiza las N vistas con UN solo renderer offscreen (secuencial) y
 * devuelve un ImageBitmap por vista. Libera composer/renderer/geometría al
 * terminar — el llamador solo pinta los bitmaps con drawImage y los cierra
 * al desmontar.
 */
export async function renderAllViews(
  views: readonly ViewAngle[],
  w: number,
  h: number,
  zoom: number,
): Promise<ImageBitmap[]> {
  const [THREE, cloud, { EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
    import('three'),
    loadParticleCloud(),
    import('three/examples/jsm/postprocessing/EffectComposer.js'),
    import('three/examples/jsm/postprocessing/RenderPass.js'),
    import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
    import('three/examples/jsm/postprocessing/OutputPass.js'),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  // preserveDrawingBuffer: createImageBitmap lee el buffer DESPUÉS del render
  // — sin esto el navegador puede haberlo descartado ya.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  renderer.setClearColor(0x000000, 1); // el reporte vive sobre negro — fondo opaco.

  const scene = new THREE.Scene();
  const particleTexture = createParticleTexture(THREE);
  // Una piel translúcida da continuidad a cara, dedos y pies; el wireframe
  // ultrafino añade microestructura sin colorear el GLB.
  const surfaceGeometry = new THREE.BufferGeometry();
  surfaceGeometry.setAttribute('position', new THREE.BufferAttribute(cloud.surface.positions, 3));
  surfaceGeometry.setAttribute('normal', new THREE.BufferAttribute(cloud.surface.normals, 3));
  surfaceGeometry.setIndex(new THREE.BufferAttribute(cloud.surface.indices, 1));
  const shellMaterial = new THREE.MeshBasicMaterial({
    color: 0xb4b4b8,
    transparent: true,
    opacity: 0.024,
    depthWrite: false,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
  });
  const wireMaterial = new THREE.MeshBasicMaterial({
    color: 0xb4b4b8,
    wireframe: true,
    transparent: true,
    opacity: 0.022,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  scene.add(new THREE.Mesh(surfaceGeometry, shellMaterial));
  scene.add(new THREE.Mesh(surfaceGeometry, wireMaterial));
  // Cuatro escalas visuales: superficie, destellos, fibra superficial y red
  // anatómica interna. La suma aditiva conserva negro puro fuera del cuerpo.
  const layerSpecs: { layer: Layer; size: number; opacity: number }[] = [
    { layer: cloud.dust, size: 0.0022, opacity: 0.22 },
    { layer: cloud.sparks, size: 0.0039, opacity: 0.44 },
    { layer: cloud.fibers, size: 0.002, opacity: 0.31 },
    { layer: cloud.anatomy, size: 0.0016, opacity: 0.46 },
  ];
  const disposables: { dispose(): void }[] = [particleTexture, surfaceGeometry, shellMaterial, wireMaterial];
  for (const spec of layerSpecs) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(spec.layer.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(spec.layer.colors, 3));
    const material = new THREE.PointsMaterial({
      size: spec.size,
      vertexColors: true,
      map: particleTexture,
      transparent: true,
      opacity: spec.opacity,
      alphaTest: 0.015,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    scene.add(new THREE.Points(geometry, material));
    disposables.push(geometry, material);
  }

  const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 10);
  const composer = new EffectComposer(renderer);
  composer.setSize(w, h);
  composer.addPass(new RenderPass(scene, camera));
  // Threshold alto (0.74): solo lo que ya está caliente — el oro del pecho —
  // florece; la plata queda fría, como en la referencia. Con threshold bajo
  // el cuerpo entero brillaba y el halo teñía el negro. Radio 0.24 mantiene
  // el resplandor ceñido al torso incluso en los perfiles.
  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.42, 0.24, 0.74);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const centerY = MODEL_HEIGHT / 2;
  // 3.9m: con fov 30° la altura visible es 2·d·tan(15°) ≈ 2.09m — el cuerpo
  // de 1.80m entra COMPLETO con aire arriba y abajo, como en la referencia.
  // A 2.5m la altura visible era 1.34m y la figura se salía del lienzo por
  // los cuatro lados (verificado: bbox [11,0,537,890] en un canvas 550×891).
  const dist = 3.9 / zoom;
  const bitmaps: ImageBitmap[] = [];
  // Se calienta una vez el composer y solo después se capturan las seis
  // vistas reales; evita devolver un buffer aún no inicializado en ciertos
  // drivers WebGL.
  if (views.length > 0) {
    const first = views[0];
    camera.position.set(
      Math.sin(first.yaw) * Math.cos(first.pitch) * dist,
      centerY + Math.sin(first.pitch) * dist,
      Math.cos(first.yaw) * Math.cos(first.pitch) * dist,
    );
    camera.lookAt(0, centerY, 0);
    await renderer.compileAsync(scene, camera);
    composer.render();
    await yieldToBrowser();
  }
  for (const view of views) {
    camera.position.set(
      Math.sin(view.yaw) * Math.cos(view.pitch) * dist,
      centerY + Math.sin(view.pitch) * dist,
      Math.cos(view.yaw) * Math.cos(view.pitch) * dist,
    );
    camera.lookAt(0, centerY, 0);
    composer.render();
    bitmaps.push(await createImageBitmap(canvas));
    await yieldToBrowser(); // 6 renders con bloom seguidos también congelan.
  }

  // Liberar TODO — el llamador se queda solo con los bitmaps.
  composer.dispose();
  bloom.dispose();
  for (const d of disposables) d.dispose();
  renderer.dispose();

  return bitmaps;
}

// ── Proyección de articulaciones — para la red de líneas del HUD ──────────
//
// Matemática de cámara PURA (sin `THREE`, sin WebGL): replica a mano la
// misma fórmula de posición/mirada que usa `renderAllViews` arriba, para que
// el overlay 2D (SVG) que dibuja `body-scan-report.web.tsx` caiga EXACTO
// sobre el cuerpo ya renderizado, sin depender de cargar three.js solo para
// proyectar 8 puntos. Testeable en Jest sin canvas/WebGL.

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}
function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
function normalize(a: Vec3): Vec3 {
  const len = Math.sqrt(dot(a, a)) || 1;
  return { x: a.x / len, y: a.y / len, z: a.z / len };
}

const VERTICAL_FOV_DEG = 30; // mismo campo de visión que `PerspectiveCamera(30, ...)` arriba.

/** Proyecta un punto del mundo a coordenadas de pantalla normalizadas [0,1]
 *  (x: 0=izquierda…1=derecha, y: 0=arriba…1=abajo) para la MISMA cámara que
 *  usa `renderAllViews` con ese `yaw`/`pitch`/`zoom`. `aspect` es w/h del
 *  lienzo (constante en `body-scan-report.web.tsx`: `ASPECT = 300/486`). */
export function projectPoint(
  point: Vec3,
  yaw: number,
  pitch: number,
  zoom: number,
  aspect: number,
): { x: number; y: number } {
  const dist = 3.9 / zoom;
  const centerY = MODEL_HEIGHT / 2;
  const eye: Vec3 = {
    x: Math.sin(yaw) * Math.cos(pitch) * dist,
    y: centerY + Math.sin(pitch) * dist,
    z: Math.cos(yaw) * Math.cos(pitch) * dist,
  };
  const target: Vec3 = { x: 0, y: centerY, z: 0 };

  // Misma convención que `Object3D.lookAt`: la cámara mira por su -Z local.
  const backward = normalize(sub(eye, target)); // eje +Z local de la cámara.
  const worldUp: Vec3 = { x: 0, y: 1, z: 0 };
  const right = normalize(cross(worldUp, backward));
  const up = cross(backward, right);

  const rel = sub(point, eye);
  const depth = -dot(rel, backward); // positivo = delante de la cámara.
  const safeDepth = Math.max(1e-4, depth);

  const halfV = Math.tan((VERTICAL_FOV_DEG * Math.PI) / 180 / 2);
  const viewHalfHeight = safeDepth * halfV;
  const viewHalfWidth = viewHalfHeight * aspect;

  const ndcX = dot(rel, right) / viewHalfWidth;
  const ndcY = dot(rel, up) / viewHalfHeight;

  return {
    x: (ndcX + 1) / 2,
    y: 1 - (ndcY + 1) / 2, // pantalla crece hacia abajo; NDC crece hacia arriba.
  };
}

/** Articulaciones aproximadas en fracción de `MODEL_HEIGHT` (proporciones
 *  humanas estándar: hombro ~0.82, codo ~0.63, cadera ~0.52, rodilla ~0.28).
 *  No hay picking real sobre la malla nueva todavía (ver comentario en
 *  `particleBodyGradient.ts`/CLAUDE.md) — esto es una aproximación visual
 *  para el overlay del HUD, no una lectura anatómica exacta del asset. */
const JOINTS: readonly { id: string; x: number; y: number; z: number }[] = [
  { id: 'shoulderL', x: -0.16, y: 0.82, z: 0.02 },
  { id: 'shoulderR', x: 0.16, y: 0.82, z: 0.02 },
  { id: 'elbowL', x: -0.19, y: 0.63, z: 0.01 },
  { id: 'elbowR', x: 0.19, y: 0.63, z: 0.01 },
  { id: 'hipL', x: -0.09, y: 0.52, z: 0 },
  { id: 'hipR', x: 0.09, y: 0.52, z: 0 },
  { id: 'kneeL', x: -0.06, y: 0.28, z: 0.02 },
  { id: 'kneeR', x: 0.06, y: 0.28, z: 0.02 },
];

export interface ProjectedJoint {
  id: string;
  x: number;
  y: number;
}

/** Las ~8 articulaciones proyectadas a [0,1] para una vista. Puro,
 *  determinístico — mismo `yaw`/`pitch` que `VIEW_PRESETS`. */
export function projectJointsForView(yaw: number, pitch: number, zoom: number, aspect: number): ProjectedJoint[] {
  return JOINTS.map((j) => ({
    id: j.id,
    ...projectPoint({ x: j.x * MODEL_HEIGHT, y: j.y * MODEL_HEIGHT, z: j.z * MODEL_HEIGHT }, yaw, pitch, zoom, aspect),
  }));
}

/** Proyecta los focos contemplativos sobre exactamente la misma cámara y
 * modelo que las seis vistas. Son anclas de interfaz, no mediciones internas
 * ni puntos anatómicos clínicos. */
export function projectEnergyFociForView(
  yaw: number,
  pitch: number,
  zoom: number,
  aspect: number,
): ProjectedEnergyFocus[] {
  return ENERGY_FOCI.map((focus) => ({
    id: focus.id,
    ...projectPoint({
      x: focus.model.x * MODEL_HEIGHT,
      y: focus.model.y * MODEL_HEIGHT,
      z: focus.model.z * MODEL_HEIGHT,
    }, yaw, pitch, zoom, aspect),
  }));
}

/** El punto del pecho donde "arde" el oro (mismo `CHEST_Y` que
 *  `particleBodyGradient.ts`), proyectado a pantalla — lo usa el overlay del
 *  pulso para saber dónde centrar el radial-gradient. */
export function projectChestCenter(yaw: number, pitch: number, zoom: number, aspect: number): { x: number; y: number } {
  const CHEST_Y_FRACTION = 0.72; // debe coincidir con CHEST_Y de particleBodyGradient.ts.
  const CHEST_DEPTH = 0.13; // metros hacia adelante desde el eje central — pecho real, no la espalda.
  return projectPoint({ x: 0, y: CHEST_Y_FRACTION * MODEL_HEIGHT, z: CHEST_DEPTH }, yaw, pitch, zoom, aspect);
}
