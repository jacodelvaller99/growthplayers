import { useEffect } from 'react';
import { useLifeFlow } from './use-lifeflow';
import { intel } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import { logSilentError } from '@/lib/observability';

const POLL_INTERVAL = 60_000; // 1 minuto

export const useSmartNotifications = () => {
  const { userId } = useLifeFlow();
  const { showToast } = useToast();

  useEffect(() => {
    if (!userId) return;

    const processNotifications = async () => {
      try {
        // Las columnas son `delivered` (20260504201000_ml_fixes.sql) y `sent_at`
        // (20260502000000_intelligence_engine.sql). Antes se filtraba por `sent`
        // y `scheduled_for`, que NO EXISTEN en ninguna migración: PostgREST
        // devolvía 42703, `pending` quedaba null, y el `if (!pending?.length)`
        // se lo tragaba en silencio. Este hook nunca mostró una sola
        // notificación in-app desde que existe.
        //
        // No hay filtro de fecha porque no hay columna de programación: la edge
        // function inserta la fila SOLO cuando toca notificar (dedup por tipo y
        // día incluido allí), así que una fila sin entregar ya está vencida.
        const { data: pending, error } = await intel.notifications()
          .select('id, title, body, type')
          .eq('user_id', userId)
          .eq('delivered', false)
          .is('sent_at', null)
          .order('created_at', { ascending: true })
          .limit(3);

        if (error) { logSilentError('smartNotifications.fetch', error); return; }
        if (!pending?.length) return;

        for (const notif of pending) {
          // Marcar entregada ANTES del toast: si el update falla, no mostramos
          // nada. Preferimos perder una notificación a repetirla cada minuto
          // para siempre — sin política UPDATE en RLS esto se denegaba en
          // silencio y el mismo toast reaparecía en cada poll (ver migración
          // 20260803010000).
          const { error: markErr } = await intel.notifications()
            .update({ delivered: true, sent_at: new Date().toISOString() })
            .eq('id', notif.id);

          if (markErr) { logSilentError('smartNotifications.mark', markErr); return; }

          const message = notif.body ?? notif.title ?? 'Tienes una notificación';
          showToast(message, 'info');
        }
      } catch (e) {
        logSilentError('smartNotifications.process', e);
      }
    };

    processNotifications();
    const interval = setInterval(processNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [userId, showToast]);
};
