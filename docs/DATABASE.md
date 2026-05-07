# Database — CMI LifeFlow (Supabase PostgreSQL)

## Connection

- **Provider**: Supabase (PostgreSQL 15)
- **Client**: `lib/supabase.ts` — `createClient(url, anonKey)`
- **Auth**: Row Level Security (RLS) enforced on all tables
- **Admin access**: `profiles.is_admin = true` unlocks admin policies

---

## Tables

### `profiles`
Auth-linked user profile (id = auth.uid()).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | = auth.users.id |
| email | text | |
| full_name | text | |
| is_admin | boolean | default false |
| subscription_tier | text | free / premium / premium_plus / polaris / growthplayers |
| subscription_expires_at | timestamptz | null = lifetime |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `user_profiles`
Extended app data (user_id = auth.uid()).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → auth.users | |
| name | text | display name |
| role | text | e.g. "Emprendedor" |
| photo_url | text | |
| onboarding_complete | boolean | |
| north_star_purpose | text | |
| north_star_identity | text | |
| north_star_non_negotiables | text[] | |
| north_star_daily_reminder | text | |
| subscription_tier | text | mirror of profiles.subscription_tier |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `check_ins`
Daily biometric check-ins.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → auth.users | |
| energy | integer | 1–10 |
| clarity | integer | 1–10 |
| stress | integer | 1–10 |
| sleep | integer | 1–10 |
| mood | text | optional free-text |
| notes | text | optional |
| created_at | timestamptz | |

### `conversations`
AI Mentor chat history.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → auth.users | |
| role | text | 'user' or 'assistant' |
| content | text | message body |
| created_at | timestamptz | |

### `lesson_tasks`
Completed lesson task responses.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → auth.users | |
| lesson_id | text | e.g. "m6-1" |
| task_id | text | from data/tasks.ts |
| responses | jsonb | Record<fieldId, value> |
| completed_at | timestamptz | |
| created_at | timestamptz | |

### `wellness_sessions`
Binaural beat, meditation, breathing, and sleep sessions.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → auth.users | |
| type | text | 'binaural' / 'meditation' / 'breathing' / 'sleep' |
| session_name | text | |
| duration_seconds | integer | |
| frequency_hz | numeric | for binaural beats only |
| background_track | text | |
| completed_at | timestamptz | null if abandoned |
| metadata | jsonb | extra session data |
| created_at | timestamptz | |

### `user_memberships`
Subscription and membership records.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → auth.users | |
| product | text | tier ID (free / premium / etc.) |
| status | text | active / cancelled / superseded |
| activated_by | text | 'admin' / 'access_code' / 'admin_direct' |
| activated_at | timestamptz | |
| expires_at | timestamptz | null = lifetime |
| price_paid | numeric | |
| currency | text | default 'USD' |
| notes | text | |
| created_by | uuid | admin user ID |
| created_at | timestamptz | |

### `access_codes`
One-time redemption codes for membership activation.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| code | text UNIQUE | 8-char code (e.g. ABCD-1234) |
| type | text | AccessCodeType enum |
| max_uses | integer | default 1 |
| uses_count | integer | incremented by RPC |
| is_active | boolean | false = deactivated |
| expires_at | timestamptz | |
| notes | text | |
| label | text | admin display label |
| created_by | uuid | admin user ID |
| created_at | timestamptz | |

### `access_code_uses`
Log of who redeemed which code.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| code_id | uuid FK → access_codes | |
| user_id | uuid FK → auth.users | |
| redeemed_at | timestamptz | default now() |

### `user_course_access`
Manual course access grants (admin only).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → auth.users | |
| course_id | text | CourseId enum |
| module_ids | text[] | null = full course |
| granted_by | uuid | admin user ID |
| expires_at | timestamptz | |
| is_active | boolean | |
| notes | text | |
| created_at | timestamptz | |

### `admin_audit_log`
Log of all admin actions.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| admin_id | uuid FK → auth.users | |
| action | text | e.g. 'activate_membership' |
| target_type | text | 'user' / 'course' / 'access_code' |
| target_id | text | |
| metadata | jsonb | action-specific data |
| created_at | timestamptz | |

---

## RLS Policy Pattern

Every table follows this pattern:

```sql
-- Enable RLS
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

-- Users own their rows
CREATE POLICY "users_own_table_name"
  ON public.table_name FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins have full access
CREATE POLICY "admin_all_table_name"
  ON public.table_name FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );
```

---

## Key RPCs (Stored Procedures)

### `redeem_access_code(p_code text) → text`
Atomically validates and increments use count. Returns:
- `'ok'` — code valid and use recorded
- `'invalid'` — code not found
- `'exhausted'` — max_uses reached
- `'expired'` — past expires_at
- `'inactive'` — is_active = false

### `admin_create_access_code(p_admin_id, p_code, p_type, p_max_uses, p_expires_at, p_notes, p_label) → uuid`
Creates access code, returns new code ID.

### `calculate-intelligence` (Edge Function)
Recalculates user ML intelligence score. Called after check-ins and membership changes.

---

## Migrations

All schema changes go in `supabase/migrations/` with format:
```
YYYYMMDDHHMMSS_description.sql
```

Apply locally: `supabase db push`
Apply to production: run SQL directly in Supabase SQL editor
