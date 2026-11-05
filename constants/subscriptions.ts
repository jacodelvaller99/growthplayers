/**
 * Subscription tiers — single source of truth for the entire app.
 * Used by: admin screens, useSubscription hook, paywall, profile badge.
 */

export const SUBSCRIPTION_TIERS = {
  free: {
    id: 'free',
    name: 'Gratis',
    description: 'Lo esencial de Polaris',
    color: '#888888',
    features: [
      'Registro diario de cómo estás',
      'Norman, tu mentor con IA',
      'Módulo 1 completo',
      '3 sonidos para concentrarte o descansar',
    ],
    limits: {
      // Sin tope real en el código (nadie lo lee — ver useSubscription.canAccessMentor,
      // siempre true). El "5 mensajes/día" que decía este bullet era fricción
      // publicitada: le prometía al usuario free un límite que nunca se aplicó.
      mentor_messages_per_day: -1,
      modules_unlocked: ['module_1'],
      binaural_presets: 3,
    },
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    description: 'Polaris completo, a tu ritmo',
    color: '#FFC804',
    features: [
      'Todo lo del plan Gratis',
      'Norman sin límite',
      'Todos los módulos de Polaris',
      'Todos los sonidos',
      'Respiración y meditación completas',
      'Puntaje y racha',
      'Tus números',
    ],
    limits: {
      mentor_messages_per_day: -1,
      modules_unlocked: 'all',
      binaural_presets: -1,
    },
  },
  premium_plus: {
    id: 'premium_plus',
    name: 'Premium Plus',
    description: 'Todo Polaris, con acompañamiento',
    color: '#C0A060',
    features: [
      'Todo lo de Premium',
      'Curso Polaris completo (9 módulos)',
      'Acompañamiento 1 a 1 con tu asesor',
      'Lo nuevo antes que nadie',
      'Te respondemos primero',
    ],
    limits: {
      mentor_messages_per_day: -1,
      modules_unlocked: 'all',
      binaural_presets: -1,
      polaris_access: true,
    },
  },
  polaris: {
    id: 'polaris',
    name: 'Polaris',
    description: 'Curso Polaris completo',
    color: '#4A90D9',
    features: [
      'Curso Polaris 9 módulos',
      'Norman conoce tu curso',
      'Comunidad Polaris',
    ],
    limits: {
      polaris_access: true,
      growthplayers_access: false,
    },
  },
  growthplayers: {
    id: 'growthplayers',
    name: 'GrowthPlayers',
    description: 'Programa GrowthPlayers completo',
    color: '#27AE60',
    features: [
      'Programa GrowthPlayers completo',
      'Norman conoce tu programa',
    ],
    limits: {
      growthplayers_access: true,
    },
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

/** Ordered list from lowest to highest privilege */
export const TIER_ORDER: SubscriptionTier[] = [
  'free',
  'premium',
  'premium_plus',
  'polaris',
  'growthplayers',
];

export function getTierLabel(tier: SubscriptionTier | string | null | undefined): string {
  if (!tier) return 'Gratis';
  return (SUBSCRIPTION_TIERS as Record<string, { name: string }>)[tier]?.name ?? 'Gratis';
}

export function getTierColor(tier: SubscriptionTier | string | null | undefined): string {
  if (!tier) return '#888888';
  return (SUBSCRIPTION_TIERS as Record<string, { color: string }>)[tier]?.color ?? '#888888';
}

export function getTiersAbove(tier: SubscriptionTier | string): SubscriptionTier[] {
  const idx = TIER_ORDER.indexOf(tier as SubscriptionTier);
  if (idx < 0) return TIER_ORDER.filter((t) => t !== 'free');
  return TIER_ORDER.slice(idx + 1);
}

export function getTiersBelow(tier: SubscriptionTier | string): SubscriptionTier[] {
  const idx = TIER_ORDER.indexOf(tier as SubscriptionTier);
  if (idx <= 0) return [];
  return TIER_ORDER.slice(0, idx);
}

export function canAccessFeature(
  tier: SubscriptionTier | string | null | undefined,
  feature: string,
): boolean {
  if (!tier || tier === 'free') {
    return ['checkin', 'binaural_basic', 'module_1'].includes(feature);
  }
  return true; // premium+ has access to everything
}
