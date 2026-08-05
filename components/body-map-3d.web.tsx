/**
 * BodyMap3D (web) — la nube de partículas real, con volumen y órbita.
 *
 * Nace del mismo `generateFigure3D` (lib/humanFigure3DLogic.ts) que ya
 * reusa la anatomía testeada de `humanFigureLogic.ts` — mismos x/y, mismas
 * 7 zonas, misma semilla. Aquí solo se renderiza con three.js en vez de SVG.
 *
 * La interacción sigue el patrón del propio prototipo de diseño validado
 * (Design → "Polaris - Cuerpo de Partículas 3D"): el lienzo se orbita con el
 * mouse pero la zona se elige con los botones/legend — NO haciendo raycast
 * sobre cada partícula. Picking punto-por-punto en una nube dispersa
 * necesitaría un radio de impacto por punto y complica la interacción sin
 * mejorarla; los botones ya son el gesto de 2 segundos que pide el check-in.
 *
 * ponytail: sin raycasting de partículas. Si algún día se quiere "tocar
 * directo en el cuerpo 3D", el punto de entrada es un `Raycaster` con
 * `params.Points.threshold` sobre esta misma nube.
 */
/* eslint-disable react/no-unknown-property -- react-three-fiber traduce
   `attach`/`args`/`vertexColors`/`intensity` a propiedades reales de three.js,
   no son props de DOM; el linter de React no conoce el árbol de r3f. */
import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
// Import directo al archivo, no al barrel `@react-three/drei` — el barrel
// también re-exporta `KeyboardControls`, que importa `zustand/middleware`
// (el devtools middleware usa `import.meta.env`); Metro lo empaqueta igual
// como script clásico y la app entera revienta con "Cannot use 'import.meta'
// outside a module" antes de montar nada. El archivo suelto no arrastra eso.
import { OrbitControls } from '@react-three/drei/core/OrbitControls';
import * as THREE from 'three';

import { palette } from '@/constants/theme';
import type { BodyZone } from '@/lib/bodyMapLogic';
import { generateFigure3D } from '@/lib/humanFigure3DLogic';
import { VIEWBOX } from '@/lib/humanFigureLogic';

/** Semilla fija — el mismo activo de marca en cada sesión, como en la
 *  versión 2D. Se genera una sola vez a nivel de módulo. */
const FIGURE_3D = generateFigure3D({ seed: 90417 });

/** El viewBox 2D es 300×486 unidades; escalado a unidades de three.js
 *  razonables para la cámara (si no, la escena queda o absurdamente lejos
 *  o la cámara termina dentro del cuerpo). */
const SCALE = 1 / 40;

function toWorld(x: number, y: number, z: number): [number, number, number] {
  // La Y de pantalla crece hacia abajo; la Y de three.js crece hacia arriba.
  return [(x - VIEWBOX.w / 2) * SCALE, -(y - VIEWBOX.h / 2) * SCALE, z * SCALE];
}

function PointCloud({ selected }: { selected: BodyZone[] }) {
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(FIGURE_3D.length * 3);
    const colors = new Float32Array(FIGURE_3D.length * 3);
    const gold = new THREE.Color(palette.gold);
    const goldDim = new THREE.Color(palette.goldText);
    const silver = new THREE.Color(palette.silhouette);
    FIGURE_3D.forEach((dot, i) => {
      const [x, y, z] = toWorld(dot.x, dot.y, dot.z);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      // Misma prioridad que en 2D: la primera zona tocada manda (oro macizo),
      // el resto del recorrido queda tintado, lo no elegido queda en plata.
      const idx = dot.zone ? selected.indexOf(dot.zone) : -1;
      const c = idx === 0 ? gold : idx > 0 ? goldDim : silver;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    });
    return { positions, colors };
  }, [selected]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} vertexColors sizeAttenuation transparent opacity={0.9} />
    </points>
  );
}

export interface BodyMap3DProps {
  selected: BodyZone[];
}

export function BodyMap3D({ selected }: BodyMap3DProps) {
  // `height: '100%'`, NUNCA un `aspectRatio` propio: el `View` de RN que
  // envuelve esto (`s.canvas` en body-map.tsx) ya fija su propio aspect-ratio
  // (300×486, el VIEWBOX 2D). Dos aspect-ratio distintos anidados en la misma
  // cadena hacían que el ResizeObserver de react-three-fiber midiera este div
  // ANTES de que el `aspectRatio` del padre terminara de resolverse, y se
  // quedaba pegado en esa medición intermedia: el canvas WebGL montaba con
  // contexto válido pero a 300×150 en vez de 300×486 — la mitad de alto,
  // "no se ve el cuerpo" aunque técnicamente sí estaba ahí.
  return (
    <div style={{ width: '100%', height: '100%', background: palette.black }}>
      <Canvas camera={{ position: [0, 0, 9], fov: 40 }}>
        <ambientLight intensity={0.5} />
        <PointCloud selected={selected} />
        <OrbitControls enablePan={false} minDistance={5} maxDistance={16} />
      </Canvas>
    </div>
  );
}
