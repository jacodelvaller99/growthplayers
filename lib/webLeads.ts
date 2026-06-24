// ─── Web lead capture — visitante del paywall web ────────────────────────────
// En web, el paywall hace un descope honesto (la suscripción se gestiona en
// iOS/Android). En vez de un dead-end, capturamos un email para avisarle.
//
// Web-first: en nativo la compra es vía RevenueCat, así que esta captura no se
// usa. Degrada con logSilentError si falla — nunca lanza (no rompe el paywall).

import { supabase } from '@/lib/supabase';
import { logSilentError } from '@/lib/observability';

// Validación básica de formato (no exhaustiva — el objetivo es descartar typos
// obvios, no validar entregabilidad).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export async function captureWebLead(
  email: string,
  source = 'paywall_web',
): Promise<boolean> {
  const clean = email.trim().toLowerCase();
  if (!isValidEmail(clean)) return false;
  try {
    // web_leads aún no está en types/supabase.ts (tabla nueva) → cliente sin tipar.
    const { error } = await (supabase as any)
      .from('web_leads')
      .insert({ email: clean, source });
    // 23505 = unique_violation → el lead ya existe; para el visitante es éxito.
    if (error && (error as { code?: string }).code !== '23505') throw error;
    return true;
  } catch (err) {
    logSilentError('webLeads.capture', err, { source });
    return false;
  }
}
