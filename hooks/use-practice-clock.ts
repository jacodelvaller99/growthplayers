/**
 * Reloj de práctica en React: start/pause/resume/stop + `elapsed` (s activos).
 * Refresca 4 veces por segundo y al volver a la pestaña; el valor sale siempre
 * de la hora real (lib/practiceClock), así que nunca se atrasa.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  CLOCK_IDLE, clockPause, clockResume, clockSeconds, clockStart, type ClockState,
} from '@/lib/practiceClock';

export function usePracticeClock() {
  const ref = useRef<ClockState>(CLOCK_IDLE);
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState<'idle' | 'running' | 'paused'>('idle');

  const read = useCallback(() => clockSeconds(ref.current, Date.now()), []);

  useEffect(() => {
    if (status !== 'running') return;
    const tick = () => setElapsed(read());
    tick();
    const id = setInterval(tick, 250);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') tick(); });
    return () => { clearInterval(id); sub.remove(); };
  }, [status, read]);

  const start = useCallback(() => { ref.current = clockStart(Date.now()); setElapsed(0); setStatus('running'); }, []);
  const pause = useCallback(() => { ref.current = clockPause(ref.current, Date.now()); setElapsed(read()); setStatus('paused'); }, [read]);
  const resume = useCallback(() => { ref.current = clockResume(ref.current, Date.now()); setStatus('running'); }, []);
  /** Detiene y devuelve los segundos activos (enteros). */
  const stop = useCallback(() => {
    const secs = Math.round(read());
    ref.current = CLOCK_IDLE;
    setElapsed(0);
    setStatus('idle');
    return secs;
  }, [read]);

  return { elapsed, status, running: status === 'running', paused: status === 'paused', start, pause, resume, stop, read };
}
