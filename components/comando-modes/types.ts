/**
 * Contrato compartido de los 5 modos de Comando.
 *
 * Cada modo (components/comando-modes/{id}.tsx) es puramente PRESENTACIONAL:
 * recibe estos datos ya calculados por comando.tsx (mismo Norman, mismo score,
 * misma biometría) y decide QUÉ mostrar y en qué densidad — nunca inventa
 * contenido ni recalcula nada. Así los 5 modos nunca pueden desincronizarse
 * entre sí ni con la pantalla "Específico" ya existente.
 */
import type { DayTile, DayTilesSource } from '@/lib/metricTileLogic';

export interface ComandoModeProps {
  isDesktop: boolean;

  // Héroe
  eyebrow: string;               // "PROTOCOLO SOBERANO · JUEVES · DÍA 90"
  statement: string;             // frase del héroe (puede incluir <em> conceptualmente — aquí texto plano)
  score: number;
  scoreMax: number;
  scoreTier: string;             // "SOBERANO", etc.
  sinLecturas: boolean;

  // Directiva única del día
  directiveTitle: string;        // "HOY: RETOMAR CHECK-IN"
  directiveReason: string;
  onDirective: () => void;

  // Fichas (ya calculadas por use-metricas-dia — nunca se recalculan aquí)
  tiles: DayTile[];
  tilesSource: DayTilesSource;

  // Estado del día (pares label/valor)
  rows: { label: string; value: string }[];

  // Recuperación / bienestar (para el modo Calma)
  recoveryLabel: string;         // "RECUPERACIÓN"
  recoveryValue: string;         // "68%" o "SIN DATO"
  recoveryState: 'good' | 'mid' | 'bad' | 'none';
  recoverySuggestion: string;    // "8 minutos de respiración antes de decidir cualquier otra cosa"
  onRecoveryAction: () => void;

  // Norman
  normanLine: string;
  onOpenNorman: () => void;

  // Próxima lección
  moduleLabel: string;           // "01 · GUERRERO"
  lessonTitle: string;
  lessonPct: number;
  onContinueLesson: () => void;

  // Guiado: el paso actual del wizard (energía/claridad/estrés → check-in)
  guidedStepLabel: string;       // "Paso 1 de 3"
  guidedQuestion: string;
  guidedTotalSteps: number;
  guidedStepIndex: number;       // 0-based
}
