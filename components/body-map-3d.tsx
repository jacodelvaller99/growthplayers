/**
 * BodyMap3D (nativo) — stub inalcanzable.
 *
 * `expo-gl` (el puente WebGL que necesita three.js en iOS/Android) solo
 * corre en un build nativo real, no en Expo Go ni en este sandbox — mismo
 * bloqueo ya documentado para HealthKit/Health Connect en
 * `lib/wearablesNative.ts`: hace falta `eas init` + `eas build` para
 * probarlo en dispositivo. `components/body-map.tsx` nunca importa este
 * módulo salvo en la rama `Platform.OS === 'web'`, así que este archivo
 * jamás se monta — solo existe para que Metro resuelva la extensión nativa
 * sin fallar el bundle.
 *
 * Handoff: una vez exista un build nativo, este archivo pasa a tener el
 * mismo `<Canvas>` de `body-map-3d.web.tsx` pero con `expo-gl`'s `<GLView>`
 * en vez de un `<canvas>` de DOM.
 */
import type { BodyZone } from '@/lib/bodyMapLogic';

export interface BodyMap3DProps {
  selected: BodyZone[];
}

export function BodyMap3D(_props: BodyMap3DProps) {
  return null;
}
