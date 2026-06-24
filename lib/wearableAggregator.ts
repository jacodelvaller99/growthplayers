/**
 * wearableAggregator — capa IO fina del agregador universal (Cluster D).
 *
 * El agregador (Terra) conecta CUALQUIER reloj por una sola vía y funciona en
 * web/PWA. La conexión genera una "widget session" server-side (las claves del
 * agregador son secrets, nunca client-side) y devuelve una URL hosteada a la que
 * se redirige al usuario. Tras autorizar, el agregador empuja los datos por
 * webhook a la edge function `wearable-aggregator`, que los normaliza a
 * `wearable_daily` (provider='aggregator'). El resto de Polaris (biometric,
 * dashboards) los consume sin enterarse de la fuente.
 *
 * Reusa los hooks `useWearableConnections`/`useWearableDaily` de lib/wearables.ts
 * SIN cambios (ya leen provider-agnóstico).
 */

import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { logSilentError } from '@/lib/observability';

export interface ConnectAggregatorResult {
  ok: boolean;
  /** URL del widget hosteado (abrir en navegador / in-app browser). */
  url?: string;
  error?: string;
}

/**
 * Pide al backend la URL de conexión del agregador. La edge function valida el
 * JWT del usuario y llama al agregador con las claves server-side.
 *
 * `provider` solo aplica en modo self-host (Open Wearables), donde el connect es
 * OAuth por marca (ej. 'garmin', 'oura'). Con Terra se ignora (widget multi-marca).
 */
export async function requestAggregatorWidgetUrl(provider?: string): Promise<ConnectAggregatorResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { ok: false, error: 'Necesitas iniciar sesión.' };

    const { data, error } = await supabase.functions.invoke('wearable-aggregator', {
      body: { action: 'connect', provider },
    });
    if (error) {
      logSilentError('aggregator.widget', error);
      return { ok: false, error: 'No se pudo iniciar la conexión. Intenta de nuevo.' };
    }
    const url = (data as { url?: string } | null)?.url;
    if (!url) return { ok: false, error: 'El agregador no está configurado todavía.' };
    return { ok: true, url };
  } catch (e) {
    logSilentError('aggregator.widget', e);
    return { ok: false, error: 'Error de red al conectar el agregador.' };
  }
}

/**
 * Flujo completo de conexión. En web redirige la página; en nativo abre el
 * navegador in-app (mismo patrón que el OAuth de Oura/WHOOP). Devuelve la URL
 * para que el caller decida (la UI ya maneja loading/errores).
 */
export async function connectAggregator(provider?: string): Promise<ConnectAggregatorResult> {
  const result = await requestAggregatorWidgetUrl(provider);
  if (!result.ok || !result.url) return result;

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.location.href = result.url;
    return result;
  }

  // Nativo: in-app browser. El agregador redirige al scheme polaris://.
  try {
    const WebBrowser = await import('expo-web-browser');
    await WebBrowser.openAuthSessionAsync(result.url, 'polaris://oauth');
  } catch (e) {
    logSilentError('aggregator.browser', e);
  }
  return result;
}
