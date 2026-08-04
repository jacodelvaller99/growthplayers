/**
 * El guion del Umbral — lo que se dice al cruzar hacia el protocolo.
 *
 * Vive en `data/` y no dentro de la pantalla porque es COPY, no interfaz: se
 * corrige sin tocar la animación ni el layout, igual que `data/mentorship.ts`
 * o `data/modules.ts`.
 *
 * ORDEN: primero lo que dijo el usuario, después lo que dice la app.
 *
 * La primera versión invertía esto — cuatro frases de manifiesto (10 segundos
 * diciendo qué NO es la app, cuánto dura y qué hace Norman) y solo entonces
 * las palabras del usuario, en quinto lugar. Pero el manifiesto ya se lo
 * habían dicho tres pasos antes, y aquí sonaba a anuncio. Lo único que la app
 * no puede fabricar es lo que él acaba de escribir: eso abre.
 *
 * LARGO: medidas en el navegador a 375px, cada frase debe caber en DOS líneas
 * a 26px. GrandisExtended es una tipografía ancha — 11.3px por carácter, o sea
 * 28 caracteres por línea aquí — y a la tercera línea una declaración se
 * convierte en párrafo. Por eso las frases del manifiesto son cortas y las
 * citas del usuario van truncadas en la pantalla.
 *
 * EL VIDEO: cuando el dueño grabe la pieza de bienvenida, va exactamente aquí
 * —a pantalla completa, en lugar de esta secuencia—, y `umbral.tsx` queda como
 * el respaldo tipográfico para quien lo salte o no pueda reproducirlo. No hay
 * constante vacía esperándolo: una URL a null que nadie lee es andamiaje, y el
 * día que exista el archivo el cambio son diez líneas en un sitio.
 */

/**
 * El contrato, después de que se haya leído a sí mismo. Tres frases, no cinco:
 * lo que sobra del manifiesto es lo que ya sabe.
 */
export const UMBRAL_SCRIPT: string[] = [
  'Esto no es una app de hábitos.',
  'Norman va a leerte con datos.',
  'Y va a confrontarte con lo que acabas de escribir.',
];

/** El cierre — la promesa. Es la última frase y se queda en pantalla. */
export const UMBRAL_CLOSING = 'No vas a tener más información. Vas a tener más capacidad.';

/**
 * Cuánto dura cada frase en pantalla antes de que entre la siguiente.
 * 2.6s es lo que tarda en leerse una línea corta sin sentir que la app espera
 * a que termines — y sin que se sienta un carrusel.
 */
export const UMBRAL_BEAT_MS = 2600;

/**
 * Las citas se cortan si son largas y se les quita el punto final: el usuario
 * escribe con puntuación y la frase que las envuelve ya cierra con la suya, así
 * que sin esto sale «...impecable.».» — un detalle pequeño que delata que nadie
 * miró la pantalla.
 */
export function citar(texto: string, max = 90): string {
  const limpio = texto.trim().replace(/[.!?…\s]+$/, '');
  return limpio.length > max ? `${limpio.slice(0, max).trimEnd()}…` : limpio;
}
