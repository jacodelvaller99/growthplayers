import { useEffect } from 'react';
import { useLifeFlow } from './use-lifeflow';
import { intel } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';

const POLL_INTERVAL = 60_000; // 1 minuto

export const useSmartNotifications = () => {
  const { userId } = useLifeFlow();
  const { showToast } = useToast();

  useEffect(() => {
    if (!userId) return;

    const processNotifications = async () => {
      try {
        const { data: pending } = await intel.notifications()
          .select('id, title, body, type')
          .eq('user_id', userId)
          .eq('sent', false)
          .lte('scheduled_for', new Date().toISOString())
          .limit(3);

        if (!pending?.length) return;

        for (const notif of pending) {
          // Marcar como enviada primero (evitar duplicados si falla el toast)
          await intel.notifications()
            .update({ sent: true, sent_at: new Date().toISOString() })
            .eq('id', notif.id);

          // Mostrar via ToastContext existente
          const message = notif.body ?? notif.title ?? 'Tienes una notificación';
          showToast(message, 'info');
        }
      } catch {
        // Silencioso — no romper la app si falla
      }
    };

    processNotifications();
    const interval = setInterval(processNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [userId, showToast]);
};
