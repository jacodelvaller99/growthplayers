/**
 * data/live-sessions.ts
 *
 * Configuración de Sesiones Semanales en Vivo del Protocolo Soberano.
 *
 * Para actualizar el link de Zoom o la hora, edita este archivo.
 * LIVE_SESSION_ZOOM_URL: URL de Zoom de la sesión activa.
 * LIVE_SESSION_SCHEDULE: configuración del día/hora recurrente.
 */

export interface LiveSession {
  /** Título de la sesión */
  title: string;
  /** Descripción corta */
  subtitle: string;
  /** URL de Zoom o Meet para unirse */
  joinUrl: string;
  /** Día de la semana: 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb */
  weekday: number;
  /** Hora en zona horaria America/Bogota — formato HH:MM (24h) */
  time: string;
  /** Duración estimada en minutos */
  durationMinutes: number;
}

/**
 * Configuración de la sesión semanal recurrente.
 * Actualiza joinUrl cuando cambie el link de Zoom.
 */
export const LIVE_SESSION: LiveSession = {
  title:           'SESIÓN SEMANAL EN VIVO',
  subtitle:        'Protocolo Soberano · Grupo de Operadores',
  joinUrl:         'https://zoom.us/j/growthplayers', // ← actualiza cuando cambie el link
  weekday:         2, // Martes (0=Dom … 6=Sáb)
  time:            '20:00', // 8 PM hora Colombia (COT = UTC-5)
  durationMinutes: 90,
};

/**
 * Calcula la fecha de la próxima sesión a partir de ahora.
 * Considera que la sesión ya puede estar en curso (dentro del bloque de durationMinutes).
 */
export function getNextSession(session: LiveSession): {
  date: Date;
  isToday: boolean;
  isOngoing: boolean;
  minutesUntil: number;
  daysUntil: number;
} {
  // Colombia is UTC-5 (no DST)
  const nowUtc   = Date.now();
  const nowCot   = new Date(nowUtc - 5 * 60 * 60 * 1000); // approximate COT

  const [hh, mm] = session.time.split(':').map(Number);
  const todayCot = new Date(nowCot);
  todayCot.setUTCHours(hh, mm, 0, 0);

  // Walk forward from today until we land on the target weekday
  // nowCot.getUTCDay() approximates local DOW in COT (no DST shift issue)
  const todayDow = nowCot.getUTCDay();
  let daysAhead  = (session.weekday - todayDow + 7) % 7;

  // If today is session day but we're past the start + duration → next week
  const sessionEndCot = new Date(todayCot.getTime() + session.durationMinutes * 60_000);
  if (daysAhead === 0 && nowCot > sessionEndCot) {
    daysAhead = 7;
  }

  const sessionDate = new Date(todayCot.getTime() + daysAhead * 24 * 60 * 60_000);

  const msUntil      = sessionDate.getTime() - nowCot.getTime();
  const minutesUntil = Math.floor(msUntil / 60_000);
  const isToday      = daysAhead === 0;
  const isOngoing    = isToday && minutesUntil <= 0 && nowCot < sessionEndCot;

  return {
    date:         sessionDate,
    isToday,
    isOngoing,
    minutesUntil: Math.max(0, minutesUntil),
    daysUntil:    daysAhead,
  };
}

/**
 * Formatea la fecha de la próxima sesión de forma legible en español.
 */
export function formatSessionDate(date: Date, isToday: boolean, daysUntil: number): string {
  if (isToday) return 'HOY';
  if (daysUntil === 1) return 'MAÑANA';
  return date.toLocaleDateString('es-CO', {
    weekday: 'long',
    day:     'numeric',
    month:   'short',
  }).toUpperCase();
}
