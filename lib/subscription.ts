// ─── Reconciliación de suscripción (single gating helper) ────────────────────
// Antes había split-brain: el chat gateaba con RevenueCat (recibo) mientras el
// resto de la app leía el tier de la DB — y NADIE exigía `expiresAt > now`. Un
// tier de pago vencido seguía dando acceso premium.
//
// Regla: la DB define el NIVEL (qué features), RevenueCat valida el RECIBO
// (suscripción activa), y se exige expiración futura salvo que el recibo la avale.
// Pura y testeable (sin Date.now implícito si se pasa nowMs).

import { SUBSCRIPTION_TIERS, type SubscriptionTier } from '@/constants/subscriptions';

export interface EntitlementInput {
  /** Tier de la DB (source-of-truth del nivel). */
  dbTier?: string | null;
  /** Expiración ISO (null = sin expiración / vitalicio). */
  expiresAt?: string | null;
  /** RevenueCat reporta suscripción activa (validador de recibo). undefined = sin dato. */
  rcActive?: boolean;
  /** Inyectable para tests; default Date.now(). */
  nowMs?: number;
}

export interface Entitlement {
  /** Nivel nominal de la DB (para mostrar, aunque esté vencido). */
  tier: SubscriptionTier;
  /** Acceso de pago efectivo (expiry + recibo reconciliados). */
  isPremium: boolean;
  /** Tier de pago pero vencido y sin recibo que lo avale. */
  expired: boolean;
}

export function resolveEntitlement(input: EntitlementInput): Entitlement {
  const { dbTier, expiresAt, rcActive, nowMs } = input;
  const now = nowMs ?? Date.now();
  const tier = (dbTier && dbTier in SUBSCRIPTION_TIERS ? dbTier : 'free') as SubscriptionTier;
  const paid = tier !== 'free';
  // Sin fecha de expiración → activo (vitalicio). Con fecha → debe ser futura.
  const dbActive = expiresAt == null ? true : new Date(expiresAt).getTime() > now;
  // DB define el nivel; el recibo de RC puede avalar aunque la DB esté vencida
  // (lag de webhook). Si DB es free pero RC dice activo, también cuenta (pago aún no sincronizado).
  const active = paid ? (dbActive || rcActive === true) : rcActive === true;
  const expired = paid && !dbActive && rcActive !== true;
  return { tier, isPremium: active, expired };
}
