// https://docs.expo.dev/guides/customizing-metro/
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// ── Tree-shaking: use package.json `exports` field (modern ESM packages) ──────
config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: true,
  unstable_conditionNames: ['browser', 'require', 'default'],
  // `three` (usado por el cuerpo 3D, `components/body-map-3d.web.tsx`) tiene
  // dos entradas de build (CJS/ESM) en su propio package.json `exports`. Sin
  // esto, distintos requirentes (mi import directo vs. el de `three-stdlib`
  // dentro de `@react-three/drei`) podían resolver a archivos DISTINTOS del
  // MISMO paquete según las `conditionNames` de arriba — three.js detecta eso
  // como "instancias múltiples" y pierde el registro global que usa
  // react-three-fiber para reconocer sus propios objetos: el <Canvas> monta,
  // el contexto WebGL es válido, pero el tamaño nunca se actualiza más allá
  // del 300×150 por defecto del <canvas> — "no se ve el cuerpo" aunque
  // técnicamente esté montado. `extraNodeModules` fuerza SIEMPRE el mismo
  // archivo físico sin importar qué condición se evalúe.
  extraNodeModules: {
    ...(config.resolver?.extraNodeModules ?? {}),
    three: path.resolve(__dirname, 'node_modules/three'),
  },
};

// `extraNodeModules` por sí solo no bastó: `@react-three/fiber` no tiene
// `exports` en su package.json (solo `main`/`module`), así que Metro cae a la
// resolución clásica y prefiere el campo `module` (el build ESM de fiber) —
// ese build hace `import * as THREE from 'three'`, y esa resolución YA NO
// pasa por `unstable_conditionNames` de la misma forma que un `require`
// directo. Resultado: `three.module.js` (ESM) Y `three.cjs` (CJS) terminaban
// EMPAQUETADOS LOS DOS a la vez — dos árboles de clases `THREE.Object3D`
// distintos en el mismo bundle. react-three-fiber cataloga sus intrínsecos
// JSX (`<points>`, `<bufferGeometry>`, …) contra UN solo árbol de clases; los
// objetos creados con el otro nunca se reconocen, así que el reconciliador no
// monta nada en la escena — el `<canvas>` queda con un contexto WebGL válido
// pero el buffer 100% vacío (verificado leyendo los píxeles con
// `getImageData`: 0 de 45000 píxeles no-negros). Interceptar la resolución a
// mano es la única forma de garantizar un único archivo físico sin importar
// qué campo prefiera cada paquete que lo requiera.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/three/build/three.cjs'),
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) return originalResolveRequest(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

// ── Minification: drop console.* in production, two-pass compress ─────────────
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    compress: {
      // Remove all console calls in production bundles
      drop_console: true,
      pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
      // Two-pass compression for better size reduction
      passes: 2,
      // Safe to reduce function boilerplate
      reduce_funcs: false,
    },
    mangle: {
      // Don't mangle top-level names (can break lazy requires)
      toplevel: false,
    },
  },
};

module.exports = config;
