// ─── Recuperación de contraseña — lógica pura ────────────────────────────────
// El flujo de "olvidé mi clave" decía SIEMPRE "te enviamos un enlace", incluso
// cuando Supabase rechazaba el envío por límite de correos. El cliente quedaba
// esperando un correo que nunca salió. Aquí vive la traducción honesta del
// error + el tiempo real de espera, separada de la pantalla para poder testearla.

/** Espera por defecto entre solicitudes, en segundos. */
export const RECOVERY_COOLDOWN_SEC = 60;

/** Vigencia del enlace de recuperación de Supabase (una hora por defecto). */
export const RECOVERY_LINK_TTL_MIN = 60;

export interface RecoveryFailure {
  /** Mensaje listo para mostrar, en voz Polaris. */
  message: string;
  /** Segundos que el botón debe quedar bloqueado. 0 = reintentable ya. */
  cooldownSec: number;
}

/**
 * Traduce el error de `resetPasswordForEmail` a mensaje + espera.
 * Supabase responde 429 con textos distintos según el motivo:
 *   - "For security purposes, you can only request this after 51 seconds."
 *   - "email rate limit exceeded"  (tope del proyecto, no del usuario)
 */
export function describeRecoveryError(
  err: { message?: string | null; status?: number | null } | null | undefined,
): RecoveryFailure {
  const raw = (err?.message ?? '').toLowerCase();
  const status = err?.status ?? 0;

  // Espera explícita que el propio servidor nos dicta — es la más precisa.
  const explicit = raw.match(/after (\d+) seconds?/);
  if (explicit) {
    const n = Number(explicit[1]);
    return {
      message: `Ya pediste un enlace hace poco. Espera ${n} segundos e intenta de nuevo.`,
      cooldownSec: n,
    };
  }

  // Tope de correos del proyecto: no es culpa del cliente y no se arregla
  // reintentando en un minuto. Se le da una salida humana.
  if (status === 429 || raw.includes('rate limit') || raw.includes('too many')) {
    return {
      message:
        'El envío de correos alcanzó su límite temporal. Espera unos minutos, ' +
        'o escribe a hola@polarisgrowthinstitute.com y te abrimos el acceso.',
      cooldownSec: 300,
    };
  }

  if (raw.includes('invalid') && raw.includes('email')) {
    return { message: 'Ese correo no tiene un formato válido.', cooldownSec: 0 };
  }

  return {
    message: err?.message?.trim() || 'No pudimos enviar el enlace. Intenta de nuevo.',
    cooldownSec: 0,
  };
}

/**
 * `nicolas@polaris.com` → `ni•••••s@polaris.com`.
 * Se muestra al confirmar el envío para que el cliente detecte un typo sin que
 * la pantalla revele si esa cuenta existe (Supabase responde igual en ambos casos).
 */
export function maskEmail(email: string): string {
  const clean = email.trim();
  const at = clean.lastIndexOf('@');
  if (at < 1) return clean;
  const user = clean.slice(0, at);
  const domain = clean.slice(at);
  if (user.length <= 2) return `${user[0]}•${domain}`;
  // El relleno conserva el largo real del usuario: así un typo de más o de
  // menos se nota a simple vista, que es justo para lo que sirve la máscara.
  const keep = user.length <= 4 ? 1 : 2;
  return `${user.slice(0, keep)}${'•'.repeat(Math.max(1, user.length - keep - 1))}${user.slice(-1)}${domain}`;
}

/** Confirmación honesta: no afirma que la cuenta exista ni que el correo llegó. */
export function recoverySentMessage(email: string): string {
  return (
    `Si ${maskEmail(email)} tiene cuenta en Polaris, el enlace llega en pocos minutos. ` +
    `Revisa también spam. El enlace caduca en ${RECOVERY_LINK_TTL_MIN} minutos.`
  );
}

/**
 * Extrae los tokens del enlace de recuperación en nativo.
 * En web `detectSessionInUrl` lo hace solo; en iOS/Android está apagado a
 * propósito (no hay URL del navegador), así que el deep link llega crudo:
 *   polaris://reset-password#access_token=...&refresh_token=...&type=recovery
 * Devuelve null si el enlace no trae una sesión de recuperación utilizable.
 */
export function parseRecoveryTokens(
  url: string | null | undefined,
): { access_token: string; refresh_token: string } | null {
  if (!url) return null;
  // Los tokens pueden venir tras '#' (flujo implícito) o '?' según el proveedor.
  const frag = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : '';
  const params = new URLSearchParams(`${frag}&${query}`);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token };
}
