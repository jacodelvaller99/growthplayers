// ─── Permiso explícito para enviar datos a IA de terceros ────────────────────
// Apple 5.1.2(i) (nov 2025): antes de compartir datos personales con una IA de
// terceros hay que decir a quién y pedir permiso. La política ya lo describía,
// pero no había ninguna acción del usuario que lo autorizara. Este módulo es esa
// acción y su cerrojo.
//
// El cerrojo vive en `lib/aiProxy.ts` (`assertAiConsent`): todas las llamadas a
// IA de la app (Norman, internista, resúmenes, copiloto, transcripción) pasan
// por ahí, así que un solo punto cubre todos los caminos, incluidos los futuros.
//
// Estado: bandera en memoria (rápida, síncrona) + copia local por usuario (la
// app arranca sin red) + `profiles.consents.ai_third_party` (evidencia con fecha
// y entre dispositivos). Por defecto CERRADO: sin permiso no sale ningún dato.

import { logSilentError } from '@/lib/observability';
import { supabase } from '@/lib/supabase';
import { readLocal, writeLocal } from '@/storage/local';

export const AI_CONSENT_VERSION = 1;
export const AI_PROVIDERS_LABEL = 'Anthropic, NVIDIA, Groq y OpenAI';

const localKey = (userId: string) => `polaris:ai-consent:v${AI_CONSENT_VERSION}:${userId}`;

/** Puro: ¿el JSON `profiles.consents` trae el permiso vigente? */
export function hasAiConsent(consents: unknown): boolean {
  const c = (consents as { ai_third_party?: { accepted?: unknown; version?: unknown } } | null | undefined)
    ?.ai_third_party;
  return c?.accepted === true && Number(c.version ?? AI_CONSENT_VERSION) >= AI_CONSENT_VERSION;
}

/** Puro: la entrada que se guarda en `profiles.consents`. */
export function aiConsentEntry(at: string) {
  return { accepted: true, version: AI_CONSENT_VERSION, at, providers: AI_PROVIDERS_LABEL };
}

// ── Bandera en memoria ───────────────────────────────────────────────────────
let granted = false;
const listeners = new Set<(g: boolean) => void>();

export function isAiConsentGranted(): boolean {
  return granted;
}

export function setAiConsentGranted(value: boolean): void {
  if (granted === value) return;
  granted = value;
  listeners.forEach((l) => l(value));
}

export function subscribeAiConsent(listener: (g: boolean) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Lo lanza el proxy cuando el usuario no ha dado el permiso. */
export class AiConsentRequiredError extends Error {
  constructor() {
    super('AI_CONSENT_REQUIRED');
    this.name = 'AiConsentRequiredError';
  }
}

export function assertAiConsent(): void {
  if (!granted) throw new AiConsentRequiredError();
}

// ── IO ───────────────────────────────────────────────────────────────────────
type ProfilesClient = {
  from: (t: string) => {
    select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { consents?: Record<string, unknown> } | null }> } };
    update: (p: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<{ error: unknown }> };
  };
};
const db = supabase as unknown as ProfilesClient;

/** Al iniciar sesión: copia local primero (sin red), servidor después. */
export async function loadAiConsent(userId: string): Promise<boolean> {
  try {
    if (await readLocal<string>(localKey(userId))) {
      setAiConsentGranted(true);
      return true;
    }
  } catch (e) {
    logSilentError('aiConsent.readLocal', e);
  }
  try {
    const { data } = await db.from('profiles').select('consents').eq('id', userId).maybeSingle();
    const ok = hasAiConsent(data?.consents);
    // Solo ABRE el cerrojo, nunca lo cierra: si esta lectura tardó y el usuario
    // ya aceptó mientras tanto (onboarding), no puede pisar ese permiso.
    // El cierre ocurre únicamente al cerrar sesión (`resetAiConsent`).
    if (ok) {
      await writeLocal(localKey(userId), new Date().toISOString());
      setAiConsentGranted(true);
    }
    return ok;
  } catch (e) {
    logSilentError('aiConsent.loadRemote', e);
    return false;
  }
}

/** Marca el permiso en este dispositivo. El onboarding ya lo escribe en el
 *  servidor junto con los demás consentimientos, así que aquí solo se abre el cerrojo. */
export async function markAiConsentLocal(userId: string): Promise<void> {
  try {
    await writeLocal(localKey(userId), new Date().toISOString());
  } catch (e) {
    logSilentError('aiConsent.writeLocal', e);
  }
  setAiConsentGranted(true);
}

/** Para quien ya tenía cuenta antes de que existiera el permiso. */
export async function acceptAiConsent(userId: string): Promise<void> {
  await markAiConsentLocal(userId);
  try {
    const { data } = await db.from('profiles').select('consents').eq('id', userId).maybeSingle();
    const consents = { ...(data?.consents ?? {}), ai_third_party: aiConsentEntry(new Date().toISOString()) };
    await db.from('profiles').update({ consents }).eq('id', userId);
  } catch (e) {
    // El permiso ya está activo en el dispositivo; se re-escribe al próximo intento.
    logSilentError('aiConsent.persistRemote', e);
  }
}

/** Al cerrar sesión: el siguiente usuario del dispositivo parte cerrado. */
export function resetAiConsent(): void {
  setAiConsentGranted(false);
}
