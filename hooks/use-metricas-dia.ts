/**
 * use-metricas-dia — el hook único que alimenta las 4 fichas de métrica
 * (HRV · Sueño · Carga · Estrés) en cualquier pantalla.
 *
 * Cadena: fetchDailySeries (lib/biometric.ts) → computeBaseline (lib/biometricLogic.ts)
 * → composeDayTiles (lib/metricTileLogic.ts, puro). Fallback honesto:
 * wearable → check-ins del usuario → 'SIN DATO'. La ausencia es información;
 * no se inventa un dato para rellenar una ficha.
 *
 * El fallback de check-in NO espera a la red: `averages`/`state.checkIns` ya
 * están en el contexto sin IO, así que se calcula con `useMemo` en el mismo
 * render. Solo la serie de wearable depende de `fetchDailySeries` (async) —
 * medido en el navegador: cuando ambos pasos compartían el mismo efecto, la
 * pantalla mostraba el StateMeter viejo varios segundos de más mientras
 * esperaba una llamada de red que ni siquiera hacía falta para el check-in.
 */
import { useEffect, useMemo, useState } from 'react';

import { fetchDailySeries } from '@/lib/biometric';
import { computeBaseline, type DailyMetrics } from '@/lib/biometricLogic';
import { composeDayTiles, type DayTile, type DayTilesSource } from '@/lib/metricTileLogic';
import { useLifeFlow } from '@/hooks/use-lifeflow';

export interface MetricasDia {
  tiles: DayTile[];
  source: DayTilesSource;
  loading: boolean;
}

export function useMetricasDia(): MetricasDia {
  const { userId, averages, state } = useLifeFlow();
  const [wearableSeries, setWearableSeries] = useState<DailyMetrics[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!userId) {
      setWearableSeries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchDailySeries(userId, 14).then((series) => {
      if (!alive) return;
      setWearableSeries(series);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [userId]);

  const hasCheckins = state.checkIns.length > 0;

  return useMemo(() => {
    const series = wearableSeries ?? [];
    const latest = series.length > 0 ? series[series.length - 1] : null;
    const baseline = computeBaseline(series.slice(0, -1));
    const checkinAvgs = hasCheckins ? averages : null;
    const { tiles, source } = composeDayTiles(latest, series, baseline, checkinAvgs);
    return { tiles, source, loading };
  }, [wearableSeries, hasCheckins, averages, loading]);
}
