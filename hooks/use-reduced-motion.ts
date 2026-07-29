/**
 * useReducedMotion — ¿el usuario pidió reducir el movimiento?
 *
 * `welcome.tsx` ya consultaba `AccessibilityInfo.isReduceMotionEnabled()` a mano
 * para saltarse su intro cinemática, pero era el ÚNICO sitio: el resto de la app
 * animaba sin preguntar. Reducir movimiento no es una preferencia estética — para
 * quien tiene sensibilidad vestibular, una animación sostenida puede provocar
 * mareo o náusea. Es requisito de accesibilidad (Apple HIG · WCAG 2.3.3).
 *
 * React Native Web mapea esta API a `prefers-reduced-motion`, así que el mismo
 * hook sirve en web y en nativo.
 *
 * Uso:
 *   const reduced = useReducedMotion();
 *   // ...saltarse la animación, o dejar el valor final directamente
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (!cancelled) setReduced(v); })
      // Si la consulta falla, asumimos que NO se pidió reducir: animar de más es
      // preferible a romper la pantalla por una preferencia que no pudimos leer.
      .catch(() => { if (!cancelled) setReduced(false); });

    // El usuario puede cambiar la preferencia con la app abierta.
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      if (!cancelled) setReduced(v);
    });

    return () => { cancelled = true; sub?.remove?.(); };
  }, []);

  return reduced;
}
