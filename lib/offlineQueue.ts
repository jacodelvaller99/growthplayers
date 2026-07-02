// ─── Cola de escritura offline (outbox) ──────────────────────────────────────
// Si una escritura del core-loop falla (sin red), la encolamos localmente y la
// reintentamos cuando vuelve la conexión o al abrir la app. Así un check-in /
// lección completada hechos offline NO se pierden en el servidor (el estado
// local ya se persiste aparte vía storage/local.ts).
//
// IMPORTANTE: solo encolamos operaciones IDEMPOTENTES (`upsert` con onConflict).
// Reproducir un upsert N veces produce el mismo resultado → replay seguro, sin
// duplicados. Los `insert` no idempotentes (mensajes, sesiones) NO se encolan aquí.

import { readLocal, writeLocal } from '@/storage/local';
import { supabase } from '@/lib/supabase';

const QUEUE_KEY = 'offline_queue_v1';

// La cola es genérica (tabla + payload dinámicos), así que usamos una vista sin
// tipar del cliente para el upsert de replay. El cliente tipado rechazaría
// from(string) + Record<string, unknown>.
type UntypedUpsert = {
  from: (table: string) => {
    upsert: (
      values: Record<string, unknown>,
      options?: { onConflict?: string },
    ) => Promise<{ error: { message?: string } | null }>;
    insert: (values: Record<string, unknown>) => Promise<{ error: unknown }>;
  };
};
const untyped = supabase as unknown as UntypedUpsert;

export interface QueuedWrite {
  /** Clave lógica para deduplicar (último valor gana, coherente con upsert). */
  id: string;
  table: string;
  payload: Record<string, unknown>;
  onConflict?: string;
  ts: number;
}

let flushing = false;

/**
 * Encola una escritura idempotente para reintento posterior.
 * Nunca lanza: si el storage falla, no debe romper el flujo del usuario.
 */
export async function enqueueWrite(entry: {
  table: string;
  payload: Record<string, unknown>;
  onConflict?: string;
  id?: string;
}): Promise<void> {
  try {
    const queue = (await readLocal<QueuedWrite[]>(QUEUE_KEY)) ?? [];
    const id = entry.id ?? `${entry.table}:${stableKey(entry.payload, entry.onConflict)}`;
    // Dedup: una sola op pendiente por clave lógica (la más reciente reemplaza).
    const deduped = queue.filter((q) => q.id !== id);
    deduped.push({
      id,
      table: entry.table,
      payload: entry.payload,
      onConflict: entry.onConflict,
      ts: Date.now(),
    });
    await writeLocal(QUEUE_KEY, deduped);
  } catch {
    /* noop — el estado local ya quedó persistido por el caller */
  }
}

/**
 * Reintenta todas las escrituras pendientes. Las que sigan fallando se conservan.
 * Reentrante-segura (un solo flush a la vez).
 */
export async function flushQueue(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const queue = (await readLocal<QueuedWrite[]>(QUEUE_KEY)) ?? [];
    if (queue.length === 0) return;

    const remaining: QueuedWrite[] = [];
    for (const item of queue) {
      try {
        const table = untyped.from(item.table);
        const { error } = item.onConflict
          ? await table.upsert(item.payload, { onConflict: item.onConflict })
          : await table.upsert(item.payload);
        if (!error) continue;
        // 42P10: la BD no tiene árbitro para ese ON CONFLICT (índice ausente o
        // parcial). Reintentar como insert simple — si el insert entra, el dato
        // se salvó; si no, el ítem se conserva para el próximo flush.
        const msg = (error?.message ?? '').toLowerCase();
        if (item.onConflict && (msg.includes('on conflict') || msg.includes('42p10'))) {
          const { error: insErr } = await untyped.from(item.table).insert(item.payload);
          if (!insErr) continue;
        }
        remaining.push(item); // sigue pendiente; reintentar luego
      } catch {
        remaining.push(item);
      }
    }
    await writeLocal(QUEUE_KEY, remaining);
  } finally {
    flushing = false;
  }
}

/**
 * Arranca el flush automático: una vez al inicio y cada vez que vuelve la
 * conexión (evento `online` en web/PWA). Devuelve un limpiador de listeners.
 */
export function initOfflineFlush(): () => void {
  // Intento inicial (cubre nativo, que no emite el evento `online`).
  void flushQueue();

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    const onOnline = () => { void flushQueue(); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }
  return () => {};
}

// Clave estable a partir del payload + columnas de conflicto (orden determinista).
function stableKey(payload: Record<string, unknown>, onConflict?: string): string {
  if (onConflict) {
    // Usa solo las columnas de conflicto → una entrada por fila lógica.
    const cols = onConflict.split(',').map((c) => c.trim());
    return cols.map((c) => `${c}=${String(payload[c])}`).join('&');
  }
  return JSON.stringify(payload);
}
