/**
 * milestoneCheck — la evaluación de hitos, fuera del check-in.
 *
 * `milestoneCrossed` (lib/narrativeLogic.ts, pura) solo dispara en el CRUCE
 * contra lo guardado en disco — pero la lectura/escritura de ese disco vivía
 * inline en app/checkin.tsx, así que un hito de calendario (día 30, día 90)
 * se PERDÍA si ese día no había check-in: el cruce ocurre a medianoche, no
 * por una acción, y nadie más lo evaluaba. Este helper centraliza el
 * read→cross→write para que Comando (al montar) y el cierre de jornada
 * también lo evalúen. La clave compartida (`milestone:v1`) hace la
 * evaluación idempotente entre los tres sitios: el primero que evalúa
 * dispara, los demás ya no cruzan nada.
 */
import { milestoneCrossed, type Milestone } from './narrativeLogic';
import { logSilentError } from './observability';
import { readLocal, writeLocal } from '@/storage/local';

export const MILESTONE_KEY = 'milestone:v1';

export interface MilestoneSnapshot {
  streak: number;
  protocolDay: number;
}

/**
 * Evalúa el cruce contra el snapshot en disco y persiste el nuevo. Devuelve
 * el hito cruzado o null. Nunca lanza: perder un hito no puede costar la
 * acción que lo evaluaba.
 */
export async function checkMilestone(
  next: MilestoneSnapshot,
  suyas?: { painPoint?: string; purpose?: string },
): Promise<Milestone | null> {
  try {
    const prev = await readLocal<MilestoneSnapshot>(MILESTONE_KEY);
    const milestone = milestoneCrossed(prev ?? null, next, suyas);
    await writeLocal(MILESTONE_KEY, next);
    return milestone;
  } catch (e) {
    logSilentError('milestone.check', e);
    return null;
  }
}
