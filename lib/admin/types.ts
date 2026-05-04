/**
 * CMI LifeFlow — Admin TypeScript Types
 */

// ─── Users ───────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role?: string;
  created_at: string;
  last_sign_in_at?: string;
  is_admin?: boolean;
  subscription_tier?: string;
  sovereign_score?: number;
}

export interface AdminUserDetail extends AdminUser {
  // Intelligence
  engagement_score?: number;
  churn_risk?: number;
  churn_risk_label?: string;
  anomaly_detected?: boolean;
  anomaly_type?: string | null;
  next_action?: string | null;
  cohort_id?: string | null;
  cohort_label?: string | null;
  affinity_binaural?: number;
  affinity_breathing?: number;
  affinity_meditation?: number;
  affinity_journaling?: number;
  affinity_lessons?: number;
  affinity_mentor?: number;
  days_since_last_act?: number;
  // Memberships
  memberships?: UserMembership[];
  // Course access
  course_access?: UserCourseAccess[];
}

// ─── Memberships ─────────────────────────────────────────────────────────────

export interface UserMembership {
  id: string;
  user_id: string;
  product: MembershipProduct;
  status: MembershipStatus;
  activated_by: string;
  activated_at: string;
  expires_at?: string | null;
  price_paid?: number;
  currency?: string;
  notes?: string | null;
  created_by?: string | null;
  // Joined
  user_name?: string;
  user_email?: string;
}

export type MembershipProduct =
  | 'lifeflow_free'
  | 'lifeflow_premium'
  | 'lifeflow_premium_plus'
  | 'polaris'
  | 'growthplayers';

export type MembershipStatus = 'active' | 'expired' | 'cancelled' | 'paused';

export const PRODUCT_LABELS: Record<MembershipProduct, string> = {
  lifeflow_free:         'LifeFlow Free',
  lifeflow_premium:      'LifeFlow Premium',
  lifeflow_premium_plus: 'LifeFlow Premium Plus',
  polaris:               'Polaris (Curso Completo)',
  growthplayers:         'Growth Players (Curso Completo)',
};

// ─── Course Access ────────────────────────────────────────────────────────────

export interface UserCourseAccess {
  id: string;
  user_id: string;
  course_id: CourseId;
  module_ids?: string[] | null;
  granted_by?: string | null;
  granted_at: string;
  expires_at?: string | null;
  is_active: boolean;
  notes?: string | null;
  // Joined
  user_name?: string;
  user_email?: string;
}

export type CourseId = 'polaris' | 'growthplayers' | 'lifeflow_bienestar';

export const COURSE_LABELS: Record<CourseId, string> = {
  polaris:           'Polaris',
  growthplayers:     'Growth Players',
  lifeflow_bienestar:'LifeFlow Bienestar',
};

// ─── Access Codes ─────────────────────────────────────────────────────────────

export interface AccessCode {
  id: string;
  code: string;
  type: AccessCodeType;
  label?: string | null;
  max_uses: number;
  uses_count: number;
  is_active: boolean;
  expires_at?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
}

export type AccessCodeType =
  | 'beta'
  | 'premium'
  | 'premium_plus'
  | 'polaris'
  | 'growthplayers'
  | 'full_access';

export const CODE_TYPE_LABELS: Record<AccessCodeType, string> = {
  beta:         'Beta (LifeFlow Free)',
  premium:      'Premium',
  premium_plus: 'Premium Plus',
  polaris:      'Polaris (Curso)',
  growthplayers:'Growth Players (Curso)',
  full_access:  'Full Access (Todo)',
};

export const CODE_TYPE_PRODUCT: Record<AccessCodeType, MembershipProduct> = {
  beta:         'lifeflow_free',
  premium:      'lifeflow_premium',
  premium_plus: 'lifeflow_premium_plus',
  polaris:      'polaris',
  growthplayers:'growthplayers',
  full_access:  'lifeflow_premium_plus',
};

export interface AccessCodeUse {
  id: string;
  code_id: string;
  user_id: string;
  used_at: string;
  user_name?: string;
  user_email?: string;
  code?: string;
  product?: string;
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  admin_id?: string | null;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  admin_name?: string;
  admin_email?: string;
}

// ─── ML / Intelligence ───────────────────────────────────────────────────────

export interface MlOverview {
  total: number;
  averages: { engagement_score: number; churn_risk: number };
  cohort_distribution: Record<string, number>;
  churn_distribution: Record<string, number>;
  active_anomalies: number;
  avg_affinities: Record<string, number>;
}

export interface AtRiskUser {
  user_id: string;
  name?: string;
  email?: string;
  churn_risk: number;
  churn_risk_label: string;
  days_since_last_act: number;
  engagement_score: number;
  anomaly_detected: boolean;
}

// ─── Content ──────────────────────────────────────────────────────────────────

export interface JournalEntry {
  id: string;
  user_id: string;
  content: string;
  mood?: number | null;
  entry_type?: string | null;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export interface MentorConversation {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  user_name?: string;
}

export interface LessonTaskResponse {
  id: string;
  user_id: string;
  lesson_id: string;
  responses: Record<string, string>;
  completed_at: string;
  user_name?: string;
  lesson_title?: string;
}

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────

export interface DashboardKPIs {
  total_users: number;
  active_today: number;
  active_7d: number;
  avg_engagement: number;
  critical_churn: number;
  total_memberships: number;
  active_codes: number;
}

export interface LiveEvent {
  id: string;
  user_id: string;
  event_type: string;
  screen?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  user_name?: string;
}
