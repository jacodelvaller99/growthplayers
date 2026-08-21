/**
 * Polyfills del entorno de test.
 *
 * `react-native-reanimated` (vía focus-deck → Dial) consulta
 * `window.matchMedia` al importarse en el proyecto web de jest-expo, y ese
 * entorno no lo trae. Sin esto, CUALQUIER suite que importe una pantalla que
 * use focus-deck revienta al cargar — no es un fallo de la pantalla, es del
 * entorno.
 */
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
