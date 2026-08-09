/**
 * BodyMap3D (nativo) — stub inalcanzable.
 *
 * En nativo el mapa corporal sigue siendo el SVG 2D de `body-map.tsx`
 * (`components/body-map.tsx` solo monta BodyMap3D en la rama
 * `Platform.OS === 'web'`), así que este módulo jamás se renderiza — existe
 * para que Metro resuelva la extensión nativa sin romper el bundle.
 *
 * Handoff futuro: la versión web ya NO usa three.js/expo-gl — es la
 * proyección pura `projectPoint` (lib/humanFigure3DLogic.ts) dibujada en un
 * canvas 2D. El camino nativo es esa MISMA proyección sobre el canvas de
 * Skia (`@shopify/react-native-skia`, ya instalado; el split nativo/web de
 * `components/polaris.tsx` es el patrón a seguir). No requiere build EAS ni
 * dependencias nuevas.
 */
import type { BodyZone } from '@/lib/bodyMapLogic';

export interface BodyMap3DProps {
  selected: BodyZone[];
  onToggleZone?: (zone: BodyZone) => void;
}

export function BodyMap3D(_props: BodyMap3DProps) {
  return null;
}
