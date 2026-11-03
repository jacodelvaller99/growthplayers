/**
 * Polaris y LifeFlow comparten proyecto Supabase: mismas cuentas de auth y la
 * misma tabla `profiles`. Regla del dueño: un cliente de Polaris puede usar
 * LifeFlow, pero una cuenta SOLO de LifeFlow no entra a Polaris.
 *
 * Falla ABIERTO: cualquier rastro de Polaris gana, y sin rastro de LifeFlow
 * tampoco se bloquea (así un registro nuevo de Polaris, que aún no tiene nada,
 * sigue pudiendo hacer el onboarding).
 *
 * Una cuenta creada por LifeFlow lleva la marca `app: 'lifeflow'` en sus
 * metadatos (registro → user_metadata; alta desde el admin → app_metadata), así
 * que se reconoce aunque todavía no haya hecho nada allá.
 */
export type AccountSignals = {
  /** Fila en `user_profiles` — la escribe el onboarding de Polaris, create-user y clickup-onboarding. */
  hasPolarisProfile: boolean;
  isAdmin: boolean;
  isMentor: boolean;
  isSuperadmin: boolean;
  clickupTaskId: string | null;
  /** `profiles.subscription_tier` — LifeFlow no la escribe (usa subscription_type / lf_client_status). */
  subscriptionTier: string | null;
  lfOnboardedAt: string | null;
  lfTermsAcceptedAt: string | null;
  /** `profiles.role` — 'trainer'/'admin' son roles de LifeFlow (Polaris usa is_admin/is_mentor). */
  role: string | null;
  /** Tiene filas en lf_enrollments o es alumno en lf_coach_assignments. */
  hasLifeFlowData: boolean;
  /** Marca `app: 'lifeflow'` en app_metadata o user_metadata: la cuenta nació en LifeFlow. */
  createdByLifeFlow?: boolean;
};

export function isLifeFlowOnlyAccount(s: AccountSignals): boolean {
  const polaris =
    s.hasPolarisProfile || s.isAdmin || s.isMentor || s.isSuperadmin ||
    !!s.clickupTaskId || (!!s.subscriptionTier && s.subscriptionTier !== 'free');
  if (polaris) return false;
  return !!s.lfOnboardedAt || !!s.lfTermsAcceptedAt ||
    s.role === 'trainer' || s.role === 'admin' || s.hasLifeFlowData || !!s.createdByLifeFlow;
}
