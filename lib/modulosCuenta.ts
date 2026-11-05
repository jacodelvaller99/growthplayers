/**
 * Una sola cuenta de módulos para toda la app. Progreso decía «0 de 6» (solo
 * los que tienen arquetipo) y Programa «Módulo 1 de 9»: dos números del mismo
 * camino. Ambos leen de aquí.
 *
 * Numerados = sin Bienvenida (orden 0) ni las sesiones en vivo.
 */
import { POLARIS_MODULES } from '@/data/modules';

type Modulo = (typeof POLARIS_MODULES)[number];

export const modulosNumerados = (mods: readonly Modulo[] = POLARIS_MODULES) =>
  mods.filter((m) => m.order > 0 && !m.id.includes('sesiones'));

/** Terminado = tiene lecciones y todas están hechas. */
export function modulosTerminados(completed: readonly string[], mods: readonly Modulo[] = POLARIS_MODULES) {
  return modulosNumerados(mods).filter(
    (m) => m.lessons.length > 0 && m.lessons.every((l) => completed.includes(l.id)),
  ).length;
}
