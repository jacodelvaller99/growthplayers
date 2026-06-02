# APP STORE PRIVACY EVIDENCE — Polaris / LifeFlow

Evidence base for the Apple **App Privacy ("nutrition label")** and Google Play **Data safety** forms.
Each row cites the table/column (Supabase) or code path where the data is collected/stored. Maps to Apple data categories.

> **Health data caveat (Apple):** This app collects **sensitive health & fitness data** (HRV, resting heart rate, sleep stages, SpO2, body temperature, weight/BMI, mood/energy/stress, fasting). Under Apple guidelines, health data must not be used for advertising/marketing or sold, and must be handled per the Health data requirements. The app currently uses this data for in-app personalization and an internal ML/notification engine (not advertising) — but see the **disclosure risks** at the bottom: the current backend defects mean some of this data is **exposed cross-user**, which is materially relevant to the "Data is encrypted in transit / protected" attestations and to a truthful privacy submission.

---

## 1. Identity & account data

| Data | Table.column / source | Linked to user? | Purpose | Apple category |
|------|-----------------------|-----------------|---------|----------------|
| Email address | `user_profiles.email`, `profiles.email`, `auth.users` | Yes | Account, auth, comms | Contact Info → Email Address |
| Name | `user_profiles.name`, `profiles.name` (`schema.sql:19`) | Yes | Personalization, mentor greeting | Contact Info → Name |
| Password | `auth.users` (Supabase Auth, hashed) | Yes | Auth | (not collected as data type; auth credential) |
| Avatar URL | `user_profiles.avatar_url` | Yes | Profile UI | User Content → Photos (if user-uploaded) |
| User ID (UUID) | `auth.users.id` / all `user_id` FKs | Yes | Primary key across all data | Identifiers → User ID |
| Role / tier | `profiles.role`, `profiles.subscription_tier`, `user_memberships` | Yes | Access control, entitlements | Identifiers / Purchases |
| Timezone, notification hour | `profiles.timezone`, `profiles.notification_hour` (`...20260502000000...:186-187`) | Yes | Notification scheduling | Usage Data (diagnostics) / Other |

## 2. Health & fitness data (SENSITIVE)

| Data | Table.column | Source | Purpose | Apple category |
|------|--------------|--------|---------|----------------|
| Self-reported energy / clarity / stress / sleep (1–10) | `daily_checkins.{energy,clarity,stress,sleep}` (`...20260428155503...:37-40`), `check_ins` (`schema.sql:50-53`) | User check-in | Wellness tracking, ML scoring | Health & Fitness → Health |
| Mood score | `journal_entries.mood_score` (`...20260501000000...:29`) | User | Reflection tracking | Health & Fitness → Health |
| Sleep score, duration, REM/deep/light/awake, efficiency | `wearable_daily.{sleep_score,sleep_duration_min,rem_min,deep_min,light_min,awake_min,sleep_efficiency}` (`...20260506000000...:35-42`) | Oura/WHOOP API | Recovery insights | Health & Fitness → Fitness |
| HRV (RMSSD ms) | `wearable_daily.hrv_ms`, `wearable_timeseries` (metric='hrv') | Oura/WHOOP | Readiness/anomaly ML | Health & Fitness → Health |
| Resting heart rate | `wearable_daily.resting_hr`, `wearable_timeseries` (metric='heart_rate') | Oura/WHOOP | Anomaly detection | Health & Fitness → Health |
| Recovery / readiness / strain | `wearable_daily.{recovery_score,activity_score,strain_score}` | Oura/WHOOP | Coaching recommendations | Health & Fitness → Fitness |
| SpO2 (blood oxygen) | `wearable_daily.spo2_avg` | Oura/WHOOP | Biometric profile | Health & Fitness → Health |
| Body temperature deviation | `wearable_daily.body_temp_delta` | Oura | Biometric profile | Health & Fitness → Health |
| Steps, active minutes, active calories | `wearable_daily.{steps,active_min,calories_active}` | Oura/WHOOP | Activity tracking | Health & Fitness → Fitness |
| Weight, height, BMI | `body_measurements.{weight_kg,height_cm,bmi}` (`...20260513000000...:84-93`) | User | Body tracking | Health & Fitness → Health |
| Fasting sessions (type, hours, food) | `fasting_sessions.*` (`...20260513000000...:32-44`) | User | Intermittent fasting tracking | Health & Fitness → Health |
| Diet, dietary restrictions, allergies, calorie goal | `nutrition_profiles.{diet_type,restrictions,allergies,daily_cal_goal}` (`...20260513000000...:96-105`) | User | Nutrition guidance | Health & Fitness → Health (allergies = sensitive) |
| Supplement stacks | `supplement_stacks.supplements` | User | Supplement tracking | Health & Fitness → Health |
| Derived biometric ML (readiness, anomalies) | `user_intelligence.{biometric_readiness,biometric_hrv_ms,biometric_resting_hr,biometric_anomaly}` (`...20260506000000...:141-146`) | Derived | ML coaching | Health & Fitness (derived) |

## 3. Sensitive free-text / psychological content

| Data | Table.column | Purpose | Apple category |
|------|--------------|---------|----------------|
| Purpose, identity, non-negotiables, daily reminder ("North Star") | `north_stars.*` (`schema.sql:32-41`), `user_profiles.{purpose,identity,non_negotiables}` | Goal setting | Sensitive Info / User Content |
| Journal entries (reflection / gratitude / intention) | `journal_entries.content` (`...20260501000000...:25-33`) | Private journaling | User Content → Other; Sensitive Info |
| Mentor chat messages (user + AI) | `mentor_messages.text` (`schema.sql:65`), `mentor_conversations.content` | AI coaching history | User Content; Sensitive Info |
| Mentor long-term memories (insights, struggles, goals, breakthroughs) | `mentor_memories.content` + `embedding` vector (`...20260502000000...:133-144`) | AI memory / personalization | Sensitive Info → (psychological) |
| Community posts (public reflections) | `community_posts.content` (`...20260513000000...:47-55`) | Social feed | User Content (shared/public) |
| Lesson task responses | `lesson_tasks.responses` (jsonb) (`...20260428155503...:56`) | Course progress | User Content |

## 4. Usage / behavioral / diagnostic data

| Data | Table.column | Purpose | Apple category |
|------|--------------|---------|----------------|
| Behavioral events (screen views, lesson start/complete/abandon, tool use, chat_sent, app_open/background, session duration) | `user_events.{event_type,screen,metadata,session_id}` (`...20260502000000...:12-26`) | Product analytics, ML | Usage Data → Product Interaction |
| Engagement score, churn risk, cohort, affinities, next-best-action, preferred time | `user_intelligence.*` | Retention ML, notifications | Usage Data (derived behavioral profile) |
| Notifications sent/opened/acted + effectiveness | `smart_notifications.*` (`...20260502000000...:160-173`) | Notification optimization | Usage Data |
| Completed lessons / progress / streak / sovereign score | `completed_lessons`, `user_profiles.{streak,sovereign_score,total_days}` | Progress tracking | Usage Data |
| Local cached state | `localStorage`/SecureStore `lifeflow:v2` | Offline UX | (on-device) |

## 5. Financial / subscription data

| Data | Source | Purpose | Apple category |
|------|--------|---------|----------------|
| Subscription tier / product / status / price / expiry | `user_memberships.*`, `profiles.subscription_tier` | Entitlement | Purchases → Purchase History |
| Purchase processing | RevenueCat SDK (`services/revenuecat.ts`); App Store / Play billing | Subscriptions | Purchases (handled by store + RevenueCat) |

## 6. Third parties data is shared with / sent to

| Recipient | Data sent | Code path | Notes |
|-----------|-----------|-----------|-------|
| **Supabase** (processor) | All of the above | `lib/supabase.ts` | Primary backend/database |
| **OpenAI** | Mentor chat text + memory text (for completions & embeddings) | `lib/mentor.ts:682` (client, chat); `generate-embeddings/index.ts:650` (server, embeddings) | User reflections/conversations sent to OpenAI. **Must be disclosed** as data sharing with a third-party AI provider. |
| **Groq** | Mentor chat text | `lib/mentor.ts:672` (client) | AI inference (fallback chain) |
| **NVIDIA NIM** | Mentor chat text | `lib/mentor.ts:664` (native) | AI inference (primary, native) |
| **Oura / WHOOP** | OAuth token exchange; reads user's biometric data | `sync-wearables/index.ts` (Oura/WHOOP APIs) | Data flows provider → app (not app → provider, except OAuth) |
| **Expo Push (exp.host)** | Push token + notification title/body | `smart-notifications/index.ts:1299` | Notification delivery |
| **RevenueCat** | Purchase/entitlement data, app user ID | `services/revenuecat.ts` | Subscription management |
| **Vercel** | Web hosting (serves app, sees request metadata/IP) | `vercel.json` | CDN/host |

**Tracking / advertising:** No advertising SDKs or cross-app tracking identifiers (IDFA) found in source. The behavioral profiling in `user_intelligence` is **first-party** for retention/personalization, not advertising. → Declare **"Data Not Used to Track You"** is plausible, but the behavioral profiling + AI-provider sharing **must** be declared under "Data Linked to You."

**Data retention:** `user_events` purged after 90 days (cron `...20260502000001_cron_jobs.sql:69-71`); `smart_notifications` after 30 days (`:81-84`). Other PII retained until account deletion.

**Deletion:** Account deletion endpoint exists and purges PII + AI embeddings (`delete-account/index.ts`; see `SECURITY_LAUNCH_AUDIT.md` 5.2). Supports Apple's account-deletion requirement and GDPR erasure. GDPR data **export** also implemented (`hooks/use-lifeflow.tsx:902` `exportData`).

---

## 7. Disclosure RISKS that affect a truthful privacy submission

These backend security defects (full detail in `SECURITY_LAUNCH_AUDIT.md`) are **directly relevant** to the privacy attestations and should be fixed **before** submitting privacy forms / going live:

1. **"Data is protected" is currently false for several stores.** Health/psychological data is exposed cross-user:
   - Mentor memories readable by any caller (P0-2, `generate-embeddings`).
   - All users' biometric baselines readable via `wearable_baseline` view (P1-5).
   - Any user can self-escalate to admin and read everyone's check-ins/intelligence/conversations (P0-1).
   - Community reflections world-readable incl. anonymous (P2-4.10).
   Submitting "data is encrypted/protected" while these hold is a misrepresentation and an Apple/Play review + legal risk for health data.
2. **Wearable OAuth tokens stored in plaintext** (P1-7) — weakens "data protected at rest."
3. **No CSP / web security headers** (P1-8) — session token theft via XSS undermines account protection claims.
4. **AI provider data sharing must be explicitly disclosed** — user journal/chat content leaves to OpenAI/Groq/NVIDIA. Ensure the privacy policy (`https://polarisgrowthinstitute.com/privacidad`, `app.json:61`) names these processors and the health-data handling.
5. **Health data + advertising:** confirm none of the health-derived `user_intelligence` fields are ever used for marketing/ads (Apple prohibits). Currently used only for in-app NBA/notifications — keep it that way and document it.

**Recommendation:** Treat the privacy nutrition label as blocked on the P0/P1 confidentiality fixes. Once fixed, the declared categories above are accurate and submittable.
