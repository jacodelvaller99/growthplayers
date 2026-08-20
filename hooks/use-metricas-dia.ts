/**
 * use-metricas-dia — el hook único que alimenta las 4 fichas de métrica
 * (HRV · Sueño · Carga · Estrés) en cualquier pantalla.
 *
 * Cadena: fetchDailySeries (lib/biometric.ts) → computeBaseline (lib/biometricLogic.ts)
 * → composeDayTiles (lib/metricTileLogic.ts, puro). Fallback honesto:
 * wearable → check-ins del usuario → 'SIN DATO'. La ausencia es información;
 * no se inventa un dato para rellenar una ficha.
 */
import { useEffect, useState } from 'react';

import { fetchDailySeries } from '@/lib/biometric';
import { computeBaseline } from '@/lib/biometricLogic';
import { composeDayTiles, type DayTile, type DayTilesSource } from '@/lib/metricTileLogic';
import { useLifeFlow } from '@/hooks/use-lifeflow';

export interface MetricasDia {
  tiles: DayTile[];
  source: DayTilesSource;
  loading: boolean;
}

const EMPTY_TILES: DayTile[] = ['HRV', 'SUEÑO', 'CARGA', 'ESTRÉS'].map((label) => ({
  label, value: '—', stateLabel: 'SIN DATO', state: 'none' as const, series: [],
}));

export function useMetricasDia(): MetricasDia {
  const { userId, averages, state } = useLifeFlow();
  const [tiles, setTiles] = useState<DayTile[]>(EMPTY_TILES);
  const [source, setSource] = useState<DayTilesSource>('none');
  const [loading, setLoading] = useState(true);

  const hasCheckins = state.checkIns.length > 0;

  useEffect(() => {
    let alive = true;
    if (!userId) {
      setTiles(EMPTY_TILES);
      setSource('none');
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchDailySeries(userId, 14).then((series) => {
      if (!alive) return;
      const latest = series.length > 0 ? series[series.length - 1] : null;
      const baseline = computeBaseline(series.slice(0, -1));
      const checkinAvgs = hasCheckins ? averages : null;
      const result = composeDayTiles(latest, series, baseline, checkinAvgs);
      setTiles(result.tiles);
      setSource(result.source);
      setLoading(false);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, hasCheckins]);

  return { tiles, source, loading };
}
