/**
 * Degradación de `daily_checkins.zones` — el check-in NO puede perderse por un
 * campo nuevo.
 *
 * POR QUÉ ESTE TEST: se envió `zones` al upsert contra una base sin la
 * migración 20260804000000. supabase-js v2 **no lanza** en error de servidor —
 * resuelve con `{ error }` — así que el `try/catch` no se disparaba, nada se
 * encolaba, y `syncStatus` quedaba en 'synced'. El usuario veía un check verde
 * mientras PGRST204 rechazaba LA FILA ENTERA: racha, score soberano y los datos
 * que lee Norman se quedaban en los de ayer. Un check-in perdido en silencio en
 * el loop central de la app.
 *
 * Aquí se fija el contrato de `isMissingZonesColumn`, que es el árbitro de esa
 * degradación. Lo que se prueba es la DETECCIÓN: si deja de reconocer el error,
 * el reintento-sin-zones nunca ocurre y el bug vuelve.
 */

// Réplica exacta del predicado de hooks/use-lifeflow.tsx. Vive aquí porque el
// hook arrastra todo el árbol de React/Supabase y este repo no testea wrappers
// de IO (misma convención que lib/memory.ts ↔ lib/memoryLogic.ts).
function isMissingZonesColumn(err: unknown): boolean {
  const e = err as { message?: string; code?: string } | null;
  const msg = (e?.message ?? '').toLowerCase();
  return e?.code === 'PGRST204' || msg.includes('pgrst204') ||
    (msg.includes('zones') && (msg.includes('column') || msg.includes('columna')));
}

describe('isMissingZonesColumn — el árbitro de que no se pierda el check-in', () => {
  it('reconoce el PGRST204 real de PostgREST por código', () => {
    // La forma exacta en que llega desde supabase-js cuando la migración no se
    // aplicó: el esquema cacheado no tiene la columna.
    expect(isMissingZonesColumn({
      code: 'PGRST204',
      message: "Could not find the 'zones' column of 'daily_checkins' in the schema cache",
    })).toBe(true);
  });

  it('lo reconoce también por el mensaje, sin código', () => {
    expect(isMissingZonesColumn({
      message: "Could not find the 'zones' column of 'daily_checkins' in the schema cache",
    })).toBe(true);
  });

  it('reconoce el 42703 de Postgres nombrando la columna', () => {
    expect(isMissingZonesColumn({ message: 'column "zones" does not exist' })).toBe(true);
  });

  it('NO se traga un fallo de red — ese debe ir al outbox, no reintentarse sin zones', () => {
    // Si esto devolviera true, un usuario sin red perdería sus zonas para
    // siempre en vez de encolarlas.
    expect(isMissingZonesColumn(new Error('Network request failed'))).toBe(false);
  });

  it('NO se traga un fallo de RLS ni un conflicto de constraint', () => {
    expect(isMissingZonesColumn({ code: '42501', message: 'permission denied for table daily_checkins' })).toBe(false);
    expect(isMissingZonesColumn({ code: '23505', message: 'duplicate key value' })).toBe(false);
  });

  it('no revienta con null/undefined ni con formas raras', () => {
    expect(isMissingZonesColumn(null)).toBe(false);
    expect(isMissingZonesColumn(undefined)).toBe(false);
    expect(isMissingZonesColumn({})).toBe(false);
    expect(isMissingZonesColumn('zones')).toBe(false);
  });
});

describe('el payload degradado conserva TODO lo demás', () => {
  it('quitar zones no toca ningún otro campo del check-in', () => {
    // La razón de ser del reintento: perder la ubicación corporal es aceptable
    // (es opcional); perder la racha y el score soberano no lo es.
    const payload = {
      user_id: 'u1', date: '2026-08-04', energy: 7, clarity: 6,
      stress: 8, sleep: 5, system_need: 'foco', sovereign_score: 625,
      zones: ['mandibula'],
    };
    const { zones: _drop, ...sinZonas } = payload;
    expect(sinZonas).toEqual({
      user_id: 'u1', date: '2026-08-04', energy: 7, clarity: 6,
      stress: 8, sleep: 5, system_need: 'foco', sovereign_score: 625,
    });
    expect('zones' in sinZonas).toBe(false);
  });
});
