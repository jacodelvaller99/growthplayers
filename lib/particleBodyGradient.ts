/**
 * particleBodyGradient — el gradiente oro/plata anclado a la altura LOCAL
 * del cuerpo, no a color horneado en el GLB. El siguiente asset que genere
 * el dueño (prompt: "Anatomically neutral... no clothing or accessories")
 * viene limpio, sin color por vértice — el gradiente es responsabilidad de
 * este módulo, no del artista 3D. Estable al rotar: depende solo de Y, no
 * del ángulo de cámara.
 *
 * Pico dorado en pecho/plexo (~74% de la altura, donde cae el esternón en
 * una figura de 1.80m — mismo criterio anatómico que el paquete anterior
 * documentaba a mano). Puro y testeado — nada de THREE aquí.
 */
export const SILVER: readonly [number, number, number] = [0xb4 / 255, 0xb4 / 255, 0xb8 / 255];
export const GOLD: readonly [number, number, number] = [0xff / 255, 0xc8 / 255, 0x04 / 255];

const CHEST_Y = 0.72; // fracción de la altura total, 0 = pies, 1 = cabeza.
/** Ancho de la campana. 0.10 y no 0.14: medido por píxel, a 0.14 la cabeza
 *  quedaba con ~32% de tinte dorado y en la referencia es plata fría. */
const SIGMA = 0.1;

/** Intensidad del dorado en [0,1] para una altura normalizada `normY`. */
export function goldIntensity(normY: number): number {
  const clamped = Math.min(1, Math.max(0, normY));
  const d = clamped - CHEST_Y;
  return Math.exp(-(d * d) / (2 * SIGMA * SIGMA));
}

/** Color RGB (0-1) interpolado plata→oro para una altura normalizada. */
export function heightGradientColor(normY: number): [number, number, number] {
  const t = goldIntensity(normY);
  return [
    SILVER[0] + (GOLD[0] - SILVER[0]) * t,
    SILVER[1] + (GOLD[1] - SILVER[1]) * t,
    SILVER[2] + (GOLD[2] - SILVER[2]) * t,
  ];
}
