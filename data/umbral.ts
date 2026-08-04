/**
 * El guion del Umbral — lo que se dice al cruzar hacia el protocolo.
 *
 * Vive en `data/` y no dentro de la pantalla porque es COPY, no interfaz: se
 * corrige sin tocar la animación ni el layout, igual que `data/mentorship.ts`
 * o `data/modules.ts`.
 *
 * Las frases están en el orden en que aparecen, una a una. Son cortas a
 * propósito: medidas en el navegador a 375px, cada una debe caber en DOS líneas
 * a 26px. GrandisExtended es una tipografía ancha — ahí entran unos 17
 * caracteres por línea, y a la tercera una declaración se convierte en párrafo.
 * (La frase sobre Norman iba junta y ocupaba cuatro; por eso son dos.)
 *
 * EL VIDEO: cuando el dueño grabe la pieza de bienvenida, va exactamente aquí
 * —a pantalla completa, en lugar de esta secuencia—, y `umbral.tsx` queda como
 * el respaldo tipográfico para quien lo salte o no pueda reproducirlo. No hay
 * constante vacía esperándolo: una URL a null que nadie lee es andamiaje, y el
 * día que exista el archivo el cambio son diez líneas en un sitio.
 */

export const UMBRAL_SCRIPT: string[] = [
  'Esto no es una app de hábitos.',
  'Es un protocolo de 90 días.',
  'Norman va a leerte con datos, no con intuiciones.',
  'Y va a confrontarte con lo que dijiste.',
];

/** El cierre — la promesa, después de que el usuario se ha leído a sí mismo. */
export const UMBRAL_CLOSING = 'No vas a tener más información. Vas a tener más capacidad.';

/**
 * Cuánto dura cada frase en pantalla antes de que entre la siguiente.
 * 2.6s es lo que tarda en leerse una línea corta sin sentir que la app espera
 * a que termines — y sin que se sienta un carrusel.
 */
export const UMBRAL_BEAT_MS = 2600;
