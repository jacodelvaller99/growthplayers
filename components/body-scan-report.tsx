/**
 * BodyScanReport (nativo) — stub inalcanzable. El reporte de 6 vistas usa
 * `<canvas>` real (misma decisión que `BodyMap3D`: sin three.js/Skia
 * todavía). `app/bienestar/escaneo.tsx` solo monta la versión web
 * (`Platform.OS === 'web'`) y muestra un aviso honesto en nativo — este
 * módulo existe solo para que Metro resuelva la extensión sin romper el
 * bundle nativo.
 */
import type { BodyZone } from '@/lib/bodyMapLogic';
import type { EnergyFocusId } from '@/lib/energyFocusLogic';

export interface BodyScanReportProps {
  primaryZone?: BodyZone;
  activeFocus?: EnergyFocusId;
  onFocusSelect?: (focus: EnergyFocusId) => void;
}

export function BodyScanReport(_props: BodyScanReportProps) {
  return null;
}
