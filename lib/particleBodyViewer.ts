/**
 * particleBodyViewer — el modelo 3D REAL del cuerpo de partículas (23.639
 * vértices en malla, LOD 7.412 usado aquí), no la nube sintética de
 * `bodyScanWorld`. Generado por el dueño con MakeHuman+numpy (CC0, ver
 * `public/models/cuerpo-particulas.glb`) con color por vértice ya resuelto:
 * gris `#B4B4B8` en cabeza/piernas, oro `#FFC804` en pecho/plexo — igual que
 * la referencia fotoreal.
 *
 * three.js PURO — sin @react-three/fiber, sin three-stdlib, sin expo-gl. Esa
 * combinación fue la causa raíz REAL de los 3 fallos previos (ver
 * `ec2d33c`/`0ac625d`): fiber no declara `exports` en su package.json, así
 * que Metro resolvía su build ESM y el CJS de three-stdlib por caminos
 * distintos y empaquetaba DOS árboles de clases `THREE.Object3D` a la vez.
 * Three.js 0.185 SÍ declara `exports` (`./examples/jsm/*` incluido) y aquí
 * es el ÚNICO importador de "three" en todo el proyecto — no hay ambigüedad
 * de resolución posible. Import dinámico: nunca se evalúa fuera de esta
 * pantalla, cero peso en el bundle principal.
 */

let geometryPromise: Promise<{
  THREE: typeof import('three');
  position: import('three').BufferAttribute;
  color: import('three').BufferAttribute;
}> | null = null;

const MODEL_URL = '/models/cuerpo-particulas.glb';
/** Del metadata.json del paquete: altura 1.80m, origen suelo-centro. El
 *  centro visual (para lookAt) es la mitad de esa altura. */
const MODEL_HEIGHT = 1.8;

async function loadGeometryData() {
  if (!geometryPromise) {
    geometryPromise = (async () => {
      const THREE = await import('three');
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(MODEL_URL);
      let mesh: import('three').Mesh | null = null;
      gltf.scene.traverse((obj) => {
        if (!mesh && (obj as import('three').Mesh).isMesh) mesh = obj as import('three').Mesh;
      });
      if (!mesh) throw new Error('cuerpo-particulas.glb: sin malla');
      const geo = (mesh as import('three').Mesh).geometry;
      const position = geo.attributes.position as import('three').BufferAttribute;
      const color = geo.attributes.color as import('three').BufferAttribute;
      if (!color) throw new Error('cuerpo-particulas.glb: sin COLOR_0');
      return { THREE, position, color };
    })();
  }
  return geometryPromise;
}

export interface ParticleViewOptions {
  yaw: number;
  pitch: number;
  zoom: number;
  w: number;
  h: number;
}

/** Renderiza UN frame estático del cuerpo en el canvas dado, con la cámara
 *  orbitando en el mismo yaw/pitch/zoom que ya usan las 6 vistas preset
 *  (`humanFigure3DLogic.VIEW_PRESETS`) — mismo lenguaje de cámara que el
 *  resto del escaneo, ahora sobre geometría real en vez de puntos
 *  sintéticos. Devuelve `dispose()`: cada canvas es un WebGLRenderer propio
 *  (el modelo es liviano — 7.412 vértices — así que 6 contextos GL en
 *  paralelo no pesan), hay que soltarlo al desmontar/re-render. */
export async function renderParticleView(canvas: HTMLCanvasElement, opts: ParticleViewOptions): Promise<() => void> {
  const { THREE, position, color } = await loadGeometryData();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(1); // el canvas ya viene dimensionado en píxeles reales.
  renderer.setSize(opts.w, opts.h, false);
  renderer.setClearColor(0x000000, 0);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', position);
  geometry.setAttribute('color', color);

  const material = new THREE.PointsMaterial({
    size: 0.0055,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);

  const scene = new THREE.Scene();
  scene.add(points);

  const camera = new THREE.PerspectiveCamera(30, opts.w / opts.h, 0.1, 10);
  const dist = 2.5 / opts.zoom;
  const centerY = MODEL_HEIGHT / 2;
  camera.position.set(
    Math.sin(opts.yaw) * Math.cos(opts.pitch) * dist,
    centerY + Math.sin(opts.pitch) * dist,
    Math.cos(opts.yaw) * Math.cos(opts.pitch) * dist,
  );
  camera.lookAt(0, centerY, 0);

  renderer.render(scene, camera);

  return () => {
    renderer.dispose();
    material.dispose();
    // La BufferGeometry NO libera `position`/`color` — son los atributos
    // cacheados y compartidos por las otras 5 vistas.
    geometry.deleteAttribute('position');
    geometry.deleteAttribute('color');
  };
}
