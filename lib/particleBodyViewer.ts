/**
 * particleBodyViewer — el cuerpo de partículas al NIVEL DE LA REFERENCIA del
 * dueño: ~250k partículas en 3 capas sobre la malla real, bloom real en el
 * oro, textura fibrosa interna en la banda del pecho. No es la nube
 * sintética de `bodyScanWorld`.
 *
 * Pipeline (plan "NIVEL REFERENCIA" aprobado):
 *   1. MUESTREO baricéntrico área-ponderado sobre los triángulos de la malla
 *      — cualquier densidad sin depender de cuántos vértices trajo el
 *      artista. Tres capas: polvo fino (silueta sólida), chispas brillantes
 *      (la textura granulada), fibras internas (las "venas" doradas de la
 *      referencia, solo en la banda del pecho).
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

const MODEL_URL = '/models/cuerpo-particulas.glb';
/** Del metadata.json del paquete actual: altura 1.80m, origen suelo-centro. */
const MODEL_HEIGHT = 1.8;

// ── Capas ────────────────────────────────────────────────────────────────────
//
// El plan pedía ~250k. Medido en el navegador real: a esa cifra el muestreo
// (búsqueda binaria + trigonometría por partícula, en el hilo principal)
// congelaba la pestaña más de 60s — la página dejaba de responder incluso a
// un `querySelectorAll`. A ~110k la silueta ya se lee sólida (7× la densidad
// anterior) y el hilo respira gracias al `yieldToBrowser` de abajo.
const DUST_COUNT = 90000; // polvo fino: la silueta sólida.
const SPARK_COUNT = 12000; // chispas: el granulado brillante.
// 12k -> 22k (+83%) medido por píxel: cobertura 68-71% -> 90%, más
// partículas emisivas dentro de la banda dorada empujan MÁS área por
// encima del umbral de bloom, no solo donde ya ardía — demasiado.
// 12k -> 16k (+33%) medido: cobertura se mantiene en 70-71% (ruido de
// muestreo aleatorio entre recargas, no una subida real) — dentro del
// margen seguro.
const FIBER_COUNT = 16000; // fibras internas: solo banda dorada.
/** Total real de partículas — lo muestra el HUD del reporte (dato real del
 *  propio pipeline, no una cifra inventada). */
export const PARTICLE_TOTAL = DUST_COUNT + SPARK_COUNT + FIBER_COUNT;
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

interface ParticleCloud {
  dust: Layer;
  sparks: Layer;
  fibers: Layer;
}

let cloudPromise: Promise<ParticleCloud> | null = null;

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
  const t = pickTriangle(cdf, Math.random() * totalArea);
  const i0 = indices[t * 3] * 3;
  const i1 = indices[t * 3 + 1] * 3;
  const i2 = indices[t * 3 + 2] * 3;

  const r1 = Math.sqrt(Math.random());
  const r2 = Math.random();
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
      const indices = geo.index
        ? (geo.index.array as Uint32Array | Uint16Array)
        : Uint32Array.from({ length: pos.length / 3 }, (_, i) => i);

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
        const isFloating = Math.random() < FLOAT_LAYER_FRACTION;
        const off = isFloating ? Math.random() * FLOAT_LAYER_MAX : Math.random() * SKIN_HUG_MAX;
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
        const off = Math.random() * SKIN_HUG_MAX * 2;
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

      return { dust, sparks, fibers };
    })();
  }
  return cloudPromise;
}

export interface ViewAngle {
  yaw: number;
  pitch: number;
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
  // Opacidades BAJAS a propósito: con blending aditivo y 250k partículas, lo
  // que se ve es la SUMA — a 0.35 el cuerpo entero se quemaba a blanco y el
  // bloom bañaba hasta las esquinas (verificado por píxel: esquina 134,125,47
  // en vez de negro). El brillo aquí sale de la acumulación, no del alpha.
  // Probado dust 0.0016->0.0022 (+37%) y sparks 0.0042->0.0052 (+24%),
  // pensando que partículas más grandes cerrarían los huecos del polvo sin
  // depender del blur del bloom. Medido en las 6 vistas a la resolución
  // actual: cobertura 63.5-92% — dentro del ruido de muestreo aleatorio del
  // baseline (57.8-91.1%), sin cambio real. Combinado con RENDER_SCALE 3.2
  // (probado también): cobertura BAJÓ más aún (13-42%) — el tamaño de
  // partícula no es la variable que estaba faltando; algo en cómo
  // `sizeAttenuation` calcula el tamaño en pantalla al subir resolución no
  // se comporta como la teoría predice (debería mantener la fracción de
  // pantalla constante). Sin poder ver el render real esta sesión (el panel
  // del Browser no compone frames), no hay forma responsable de seguir
  // ajustando esto a ciegas — revertido a los valores ya verificados.
  const layerSpecs: { layer: Layer; size: number; opacity: number }[] = [
    { layer: cloud.dust, size: 0.0016, opacity: 0.13 },
    { layer: cloud.sparks, size: 0.0042, opacity: 0.5 },
    { layer: cloud.fibers, size: 0.0022, opacity: 0.3 },
  ];
  const disposables: { dispose(): void }[] = [];
  for (const spec of layerSpecs) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(spec.layer.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(spec.layer.colors, 3));
    const material = new THREE.PointsMaterial({
      size: spec.size,
      vertexColors: true,
      transparent: true,
      opacity: spec.opacity,
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
  // threshold ALTO (0.72): solo lo que ya está caliente — el oro del pecho —
  // florece; la plata queda fría, como en la referencia. Con threshold bajo
  // el cuerpo entero brillaba y el halo llegaba a las esquinas del lienzo.
  //
  // DIAGNÓSTICO CORREGIDO: los primeros intentos de subir `radius` (0.4,
  // 0.55) parecían tocar el borde del lienzo (cobertura 68%->91-100%), pero
  // esas mediciones estaban CONTAMINADAS — FIBER_COUNT estaba en 22000 (ya
  // descartado, ver arriba) al mismo tiempo. Aislado de verdad —
  // FIBER_COUNT en el valor seguro (16000), solo `radius` variando — el
  // halo crece GRADUAL, no de golpe: 0.30(base)->0.32->0.36->0.45->0.55,
  // cobertura sube suave (68-93% -> 86-96%) y las esquinas se quedan casi
  // negras en las seis vistas (máx. 20/255) en todo el barrido. 0.45 es el
  // punto elegido: halo visiblemente más ancho que el original sin acercarse
  // al techo real (probado hasta 0.55 sin quiebre).
  //
  // Referencia visual para elegir el objetivo: prototipo offline en Blender
  // (threshold+blur gaussiano+screen-blend sobre el render de Cycles ya
  // tuneado) — el halo bueno es ceñido al cuerpo, no una nube difusa; eso
  // fue lo que guió a subir radius con pasos chicos en vez de saltos grandes.
  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.5, 0.45, 0.72);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const centerY = MODEL_HEIGHT / 2;
  // 3.9m: con fov 30° la altura visible es 2·d·tan(15°) ≈ 2.09m — el cuerpo
  // de 1.80m entra COMPLETO con aire arriba y abajo, como en la referencia.
  // A 2.5m la altura visible era 1.34m y la figura se salía del lienzo por
  // los cuatro lados (verificado: bbox [11,0,537,890] en un canvas 550×891).
  const dist = 3.9 / zoom;
  const bitmaps: ImageBitmap[] = [];
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

/** El punto del pecho donde "arde" el oro (mismo `CHEST_Y` que
 *  `particleBodyGradient.ts`), proyectado a pantalla — lo usa el overlay del
 *  pulso para saber dónde centrar el radial-gradient. */
export function projectChestCenter(yaw: number, pitch: number, zoom: number, aspect: number): { x: number; y: number } {
  const CHEST_Y_FRACTION = 0.72; // debe coincidir con CHEST_Y de particleBodyGradient.ts.
  const CHEST_DEPTH = 0.13; // metros hacia adelante desde el eje central — pecho real, no la espalda.
  return projectPoint({ x: 0, y: CHEST_Y_FRACTION * MODEL_HEIGHT, z: CHEST_DEPTH }, yaw, pitch, zoom, aspect);
}
