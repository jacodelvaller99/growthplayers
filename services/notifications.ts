// ─── Notifications Service ────────────────────────────────────────────────────
// Recordatorio diario a las 7:00 AM para el check-in.
// Requiere expo-notifications ~0.32.x

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ─── Config del handler ───────────────────────────────────────────────────────
// Llamar en el root del app para que las notificaciones se muestren en primer plano.

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

export async function scheduleCheckinReminder(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    // Cancelar recordatorios previos antes de crear uno nuevo
    await Notifications.cancelAllScheduledNotificationsAsync();

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'PROTOCOLO SOBERANO',
        body: 'Tu sistema espera lectura. Haz check-in ahora.',
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
