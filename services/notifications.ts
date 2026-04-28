// ─── Notifications Service ────────────────────────────────────────────────────
// Recordatorio diario a las 7:00 AM — mensaje rotativo según día del protocolo.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ─── Mensajes rotativos (1 por día de la semana) ──────────────────────────────
const DAILY_MESSAGES = [
  'Tu sistema espera lectura. El check-in de hoy define tu ejecución.',
  'El mercader no negocia con el ruido. Check-in primero.',
  'Antes de decidir, mide tu estado. 2 minutos de check-in valen más que 2 horas de caos.',
  'Energía, claridad, estrés, sueño — los cuatro indicadores que rigen tu día.',
  'El guerrero conoce su estado antes de entrar a batalla. Haz check-in.',
  'Día nuevo, lectura nueva. Tu norte te espera adentro.',
  'El protocolo no es motivación. Es sistema. Check-in ahora.',
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

// ─── Última respuesta de notificación ────────────────────────────────────────
// Usa Notifications.useLastNotificationResponse() en el componente que lo necesite.
// Al tap en la notificación de check-in → router.push('/checkin')
export { Notifications };
