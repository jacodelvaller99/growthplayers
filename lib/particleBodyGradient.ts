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

/** Fracción de la altura total, 0 = pies, 1 = cabeza. Exportada: la usa el
 *  overlay 2D del pulso del pecho para saber a qué altura de pantalla dibujar. */
export const CHEST_Y = 0.72;
/** Ancho de la campana. 0.10 y no 0.14: medido por píxel, a 0.14 la cabeza
 *  quedaba con ~32% de tinte dorado y en la referencia es plata fría. */
const SIGMA = 0.1;

/** Intensidad del dorado en [0,1] para una altura normalizada `normY`. */
export function goldIntensity(normY: number): number {
  const clamped = Math.min(1, Math.max(0, normY));
  const d = clamped - CHEST_Y;
  return Math.exp(-(d * d) / (2 * SIGMA * SIGMA));
}

function mixSilverGold(t: number): [number, number, number] {
  return [
    SILVER[0] + (GOLD[0] - SILVER[0]) * t,
    SILVER[1] + (GOLD[1] - SILVER[1]) * t,
    SILVER[2] + (GOLD[2] - SILVER[2]) * t,
  ];
}

/** Color RGB (0-1) interpolado plata→oro para una altura normalizada. */
export function heightGradientColor(normY: number): [number, number, number] {
  return mixSilverGold(goldIntensity(normY));
}

/** Sesgo de "cara frontal": concentra el brillo en la superficie que mira a
 *  la cámara, no en toda la circunferencia del torso a esa altura. `nz` es
 *  la componente Z de la normal de la partícula (`samplePoint` ya la
 *  calcula) — cercana a 1 en el pecho, a -1 en la espalda, a 0 en los
 *  costados. Sin esto, `goldIntensity(normY)` sola pinta una BANDA completa
 *  alrededor del torso a la altura del pecho (verificado en las 6 vistas:
 *  el "oro" aparecía igual de fuerte de perfil que de frente); con esto se
 *  lee como un cúmulo localizado en el pecho — más "corazón ardiendo" que
 *  "cinturón". */
export function frontFacingBias(nz: number): number {
  return Math.max(0, nz);
}

/** Intensidad combinada altura × frontalidad, en [0,1]. Lo que reemplaza a
 *  `goldIntensity` como fuente de verdad para el color Y para el gating de
 *  las fibras internas (solo nacen donde este cúmulo ya arde). */
export function heartClusterIntensity(normY: number, nz: number): number {
  return goldIntensity(normY) * frontFacingBias(nz);
}

/** Color RGB (0-1) plata→oro usando la intensidad de cúmulo frontal. */
export function heartClusterColor(normY: number, nz: number): [number, number, number] {
  return mixSilverGold(heartClusterIntensity(normY, nz));
}
