// ─── Healthcheck de schema — detecta migraciones no aplicadas ─────────────────
// Las features de Memory/Execution/Biometric/Confrontation degradan a vacío si su
// tabla falta en prod. Antes, eso era INVISIBLE: el admin no sabía si una sección
// vacía era "sin datos" o "migración no aplicada". Esto consulta las tablas
// críticas una vez tras el login y reporta cuáles faltan, dejando rastro.
//
// No bloquea ni crashea: degradación visible, no silenciosa.

import { supabase } from './supabase';
import { logSilentError } from './observability';

/** Tablas que el código asume aplicadas (migraciones 20260615…20260618). */
const CRITICAL_TABLES = [
  'user_memory_profile',
  'memory_summaries',
  'mentor_tasks',
  'biometric_insights',
  'confrontation_dismissals',
] as const;

const anyClient = supabase as unknown as { from: (t: string) => any };

// Último resultado del check (para que el admin pueda mostrar el aviso).
let _lastMissing: string[] = [];
export function getSchemaWarnings(): string[] { return _lastMissing; }

/**
 * Verifica que las tablas críticas existan/sean accesibles. Devuelve la lista de
 * las que faltan o no responden (vacío = todo OK). Best-effort: nunca lanza.
 */
export async function checkCriticalSchema(): Promise<string[]> {
  const missing: string[] = [];
  await Promise.all(
    CRITICAL_TABLES.map(async (table) => {
      try {
        const { error } = await anyClient.from(table).select('*', { count: 'exact', head: true }).limit(1);
        // 42P01 = undefined_table → migración no aplicada.
        if (error && /does not exist|42p01|relation/i.test(error.message ?? '')) {
          missing.push(table);
        }
      } catch {
        // Un throw aquí no confirma ausencia de tabla (puede ser red) → no lo contamos.
      }
    }),
  );
  _lastMissing = missing;
  if (missing.length > 0) {
    logSilentError('schema.missing', new Error(`tablas faltantes: ${missing.join(', ')}`), { missing });
  }
  return missing;
}
