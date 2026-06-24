// ─── Notifications Service ────────────────────────────────────────────────────
// Recordatorio diario a las 7:00 AM — mensaje rotativo según día del protocolo.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ─── Mensajes rotativos — 14 mensajes para 2 semanas de variedad ─────────────
const DAILY_MESSAGES = [
  'El guerrero no espera sentirse bien para actuar. Lee tu sistema ahora.',
  '2 minutos de honestidad hoy valen más que 2 horas de reactividad. Check-in.',
  'Tu energía de ayer ya es historia. ¿Cómo estás hoy, de verdad?',
  'El protocolo opera con datos, no con suposiciones. Lee el sistema.',
  'Antes de hablar con el mundo, habla contigo. Check-in primero.',
  'Quien no mide, no puede mejorar. 2 minutos — ahora.',
  'El norte que declaraste sigue ahí. ¿Tu estado de hoy lo apoya?',
  'Sin lectura del sistema, el mentor opera a ciegas. Haz check-in.',
  'Los que más logran no son los más motivados — son los más consistentes.',
  'Este momento define el día. Abre el protocolo.',
  'Estrés, energía, sueño — esos números hablan. ¿Estás escuchando?',
  'El check-in no es rutina. Es el momento de verte sin excusas.',
  'Un operador soberano conoce su estado antes de ejecutar. ¿Sabes el tuyo?',
  'La consistencia no se siente heroica. Se ve en el historial. Check-in.',
];

// ─── Config del handler ───────────────────────────────────────────────────────
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// ─── Pedir permisos ───────────────────────────────────────────────────────────
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// ─── Programar recordatorio diario ───────────────────────────────────────────
// protocolDay — día del protocolo (1–90) para elegir el mensaje rotativo.
export async function scheduleCheckinReminder(protocolDay = 1): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const msgIndex = (protocolDay - 1) % DAILY_MESSAGES.length;
    const body = DAILY_MESSAGES[msgIndex];

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'PROTOCOLO SOBERANO',
        body,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 7,
        minute: 0,
      },
    });

    return id;
  } catch (err) {
    console.warn('[Notifications] scheduleCheckinReminder error:', err);
    return null;
  }
}

// ─── Cancelar todos los recordatorios ────────────────────────────────────────
export async function cancelReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}

// ─── Recordatorio diario por hora con deep-link a una pantalla ────────────────
// Agenda una notificación local que se repite cada día a `hour:minute`. El tap
// la abre directo en `route` (lo lee el listener de app/_layout.tsx → WS-7).
// Reusa el mismo patrón scheduleNotificationAsync del recordatorio de check-in.
//
// Ej.: meditación matutina 6:30am →
//   scheduleDailyRoutineReminder({ title:'MEDITACIÓN MATUTINA', body:'Agradece y crea tu día.', hour:6, minute:30, route:'/bienestar/meditacion' })
export interface DailyRoutineReminder {
  title:   string;
  body:    string;
  hour:    number;          // 0–23
  minute?: number;          // 0–59 (default 0)
  route:   string;          // deep-link interno (ej. '/bienestar/meditacion')
  /** datos extra opcionales que viajan en la notificación */
  data?:   Record<string, unknown>;
}

export async function scheduleDailyRoutineReminder(
  reminder: DailyRoutineReminder,
): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body:  reminder.body,
        sound: true,
        // `route` lo consume addNotificationResponseReceivedListener (WS-7).
        data:  { route: reminder.route, ...(reminder.data ?? {}) },
      },
      trigger: {
        type:   Notifications.SchedulableTriggerInputTypes.DAILY,
        hour:   reminder.hour,
        minute: reminder.minute ?? 0,
      },
    });
    return id;
  } catch (err) {
    console.warn('[Notifications] scheduleDailyRoutineReminder error:', err);
    return null;
  }
}

// ─── Followup de accountability (24h) ─────────────────────────────────────────
// Agenda UNA notificación local (no se repite) a `delaySeconds` (default 24h) con
// deep-link a `route`. Para el loop de accountability: tras comprometerse a un plan,
// al día siguiente Polaris pregunta si lo ejecutó. Reusa el mismo shape de
// content.data que scheduleDailyRoutineReminder → lo consume el listener de _layout.
//
// Ej.: tras confirmar el plan de acción →
//   scheduleAccountabilityFollowup({ title:'ACCOUNTABILITY', body:'Ayer te comprometiste. ¿Lo ejecutaste hoy?', route:'/perfil/cliente' })
export interface AccountabilityFollowup {
  title:         string;
  body:          string;
  route:         string;          // deep-link interno (ej. '/perfil/cliente')
  delaySeconds?: number;          // default 86400 (24h)
  /** datos extra opcionales que viajan en la notificación */
  data?:         Record<string, unknown>;
}

export async function scheduleAccountabilityFollowup(
  followup: AccountabilityFollowup,
): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const seconds = Math.max(1, Math.round(followup.delaySeconds ?? 86_400));
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: followup.title,
        body:  followup.body,
        sound: true,
        // `route` lo consume addNotificationResponseReceivedListener (WS-7).
        data:  { route: followup.route, ...(followup.data ?? {}) },
      },
      trigger: {
        type:    Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
      },
    });
    return id;
  } catch (err) {
    console.warn('[Notifications] scheduleAccountabilityFollowup error:', err);
    return null;
  }
}

// ─── Recordatorios agendados por hábito (reconstrucción de estado) ────────────
// Las notificaciones agendadas PERSISTEN en el SO entre reinicios de la app, pero
// el estado en memoria de la pantalla no. Esto lee el SO (fuente de verdad) y
// devuelve un mapa habitId → notificationId para rehidratar los toggles al cargar.
export async function getScheduledRemindersByHabit(): Promise<Record<string, string>> {
  if (Platform.OS === 'web') return {};
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const map: Record<string, string> = {};
    for (const n of scheduled) {
      const habitId = (n.content?.data as { habitId?: string } | undefined)?.habitId;
      if (habitId) map[habitId] = n.identifier;
    }
    return map;
  } catch {
    return {};
  }
}

// ─── Cancelar un recordatorio puntual por id ──────────────────────────────────
export async function cancelScheduledNotification(id: string): Promise<void> {
  if (Platform.OS === 'web' || !id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // ignore
  }
}

// ─── Última respuesta de notificación ────────────────────────────────────────
// Usa Notifications.useLastNotificationResponse() en el componente que lo necesite.
// Al tap en la notificación de check-in → router.push('/checkin')
export { Notifications };
