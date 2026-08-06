/**
 * use-jornada — el IO fino de la misión diaria.
 *
 * La lógica vive en lib/jornadaLogic.ts (pura, testeada). Aquí solo se lee la
 * clave local, se derivan los booleans desde el estado global y — punto
 * crítico — se convierte el `completedAt` ISO (UTC) de las sesiones de
 * bienestar a DÍA LOCAL en un único sitio. En Colombia la medianoche UTC cae
 * a las 19:00: derivar el día en dos sitios con criterios distintos marcaría
 * pasos de la jornada equivocada.
 */
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { useLifeFlow } from '@/hooks/use-lifeflow';
import {
  deriveJornada,
  JORNADA_LOG_KEY,
  localDateKey,
  markStep,
  type Jornada,
  type JornadaLog,
  type JornadaStep,
} from '@/lib/jornadaLogic';
import { logSilentError } from '@/lib/observability';
import { readLocal, writeLocal } from '@/storage/local';

/**
 * La jornada de HOY, o `null` mientras el log local carga. El `null` inicial
 * es deliberado: `selectTurno` con `jornada: null` se comporta exactamente
 * como siempre, así que la pantalla arranca con el turno clásico y se refina
 * en cuanto el log llega — nunca un hueco, nunca un spinner.
 *
 * Se relee al ENFOCAR la pantalla (no solo al montar): el usuario completa
 * una lección, vuelve a Comando, y el tracker tiene que reflejarlo ya.
 */
export function useJornada(): Jornada | null {
  const { todayCheckIn, state } = useLifeFlow();
  const [log, setLog] = useState<JornadaLog | null | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      readLocal<JornadaLog>(JORNADA_LOG_KEY)
        .then((l) => { if (alive) setLog(l ?? null); })
        .catch((e) => {
          logSilentError('jornada.read', e);
          if (alive) setLog(null);
        });
      return () => { alive = false; };
    }, []),
  );

  const today = localDateKey(new Date());

  const wellnessToday = useMemo(
    () =>
      (state.wellnessSessions ?? []).some(
        (s) => s.completedAt && localDateKey(new Date(s.completedAt)) === today,
      ),
    [state.wellnessSessions, today],
  );

  return useMemo(() => {
    if (log === undefined) return null; // el log aún no llegó del storage
    return deriveJornada({
      today,
      log,
      hasCheckInToday: todayCheckIn !== null,
      wellnessToday,
    });
  }, [log, today, todayCheckIn, wellnessToday]);
}

/**
 * Marca un paso en el log local. Fire-and-forget desde el momento de
 * completar (lección, diario); perder esta escritura no puede costar la
 * acción que la disparó — la jornada guía, no bloquea.
 */
export async function logJornadaStep(step: JornadaStep): Promise<void> {
  try {
    const log = await readLocal<JornadaLog>(JORNADA_LOG_KEY);
    await writeLocal(JORNADA_LOG_KEY, markStep(log ?? null, localDateKey(new Date()), step));
  } catch (e) {
    logSilentError('jornada.logStep', e);
  }
}
