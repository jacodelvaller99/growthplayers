/**
 * Claves editables desde el admin (Vault, prefijo `app:`). Tienen prioridad
 * sobre los secrets de Supabase: `applyAppKeys` las vuelca en Deno.env, así el
 * código existente que lee Deno.env.get() las ve sin más cambios.
 * Caché de 30 s por instancia: un cambio en el panel se aplica en ≤30 s.
 * Si Vault falla o la migración no está, se siguen usando los secrets de siempre.
 */
import { adminSupabase } from './supabase.ts';

const TTL_MS = 30_000;
let loadedAt = 0;

export async function applyAppKeys(names: string[]): Promise<void> {
  if (Date.now() - loadedAt < TTL_MS) return;
  loadedAt = Date.now();
  try {
    const { data, error } = await adminSupabase.rpc('app_keys_read', { p_names: names });
    if (error) throw error;
    for (const row of (data ?? []) as { name: string; value: string }[]) {
      if (row.value) Deno.env.set(row.name, row.value);
    }
  } catch (e) {
    console.warn('[appKeys] Vault no disponible, uso los secrets de Supabase:', e instanceof Error ? e.message : e);
  }
}
