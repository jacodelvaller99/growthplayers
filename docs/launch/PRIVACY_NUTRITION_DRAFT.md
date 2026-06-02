# PRIVACY "NUTRITION LABEL" DRAFT — Polaris (LifeFlow)

**For:** App Store Connect "App Privacy" + Google Play "Data Safety" form.
**Date:** 2026-06-02 · **Auditor:** Team 3 (Compliance).
**Method:** Derived from actual data flows in the codebase. Each category cites where the collection happens. **This is a draft — Legal must confirm against the final Privacy Policy and the actual third-party SDK behavior before you submit the forms.** Misdeclaring here is itself a rejection/removal cause (Apple 5.1.1, Play Data Safety).

> Key framing decisions you must lock before filling the forms:
> - **Are these data "Linked to the user"?** Yes — almost everything is keyed by Supabase `user_id` / auth email. So declare **Linked to you** for most categories.
> - **Used for tracking (cross-app/3rd-party advertising)?** No evidence of IDFA / ad SDKs / cross-app tracking in the code. Declare **NOT used for tracking** — *but verify RevenueCat and any analytics SDK aren't pulling IDFA* before you certify this.
> - **Data sold?** No. The app explicitly states data is never sold (`progreso.tsx:1222`).

---

## A. Data the app COLLECTS (with evidence)

### 1. Contact Info
| Apple data type | Collected? | Linked | Purpose | Evidence |
|---|---|---|---|---|
| Email Address | ✅ Yes | Linked | App Functionality (auth, account) | Supabase email sign-up/login — `app/(auth)/index.tsx:74,137` |
| Name | ✅ Yes | Linked | App Functionality, Personalization | Profile name/role captured in onboarding — `app/(onboarding)/index.tsx`; stored in `user_profiles.full_name` (`comunidad.tsx:70`) |

### 2. Health & Fitness
| Apple data type | Collected? | Linked | Purpose | Evidence |
|---|---|---|---|---|
| Health (HRV, resting HR, recovery/readiness, sleep) | ✅ Yes | Linked | App Functionality, Personalization | WHOOP/Oura via OAuth → `wearable_daily`, `wearable_timeseries`; `supabase/functions/sync-wearables/index.ts`; surfaced in `app/perfil/wearables.tsx` and fed to AI (`lib/mentor.ts:268`) |
| Fitness (strain/activity) | ✅ Yes | Linked | App Functionality | WHOOP strain — `wearables.tsx:189` |
| **Note** | — | — | — | **NOT collected via Apple HealthKit** — it is third-party cloud data (WHOOP/Oura APIs). On the form, declare as Health & Fitness data collected, source = connected accounts, not HealthKit. |

### 3. User Content
| Apple data type | Collected? | Linked | Purpose | Evidence |
|---|---|---|---|---|
| Other User Content — journal entries | ✅ Yes | Linked | App Functionality | `journal_entries` — exported in `use-lifeflow.tsx:916`; `app/bienestar/diario.tsx` |
| Other User Content — AI chat messages | ✅ Yes | Linked | App Functionality | `mentor_messages` / `mentor_conversations`; sent to NVIDIA/Groq/OpenAI (`lib/mentor.ts:638`) — **see third-party processing below** |
| Other User Content — community posts | ✅ Yes | Linked | App Functionality | `community_posts` — `app/bienestar/comunidad.tsx:144` |
| Emotional/wellness self-reports (check-ins: energy, stress, clarity, sleep, "necesidad del sistema") | ✅ Yes | Linked | App Functionality, Personalization | `daily_checkins` — `app/checkin.tsx`; pattern analysis in `lib/mentor.ts:73` |
| Sensitive info (emotional state, free-text feelings) | ✅ Yes | Linked | Personalization | Check-in `systemNeed`, journal, tapping target ("ansiedad, rabia, miedo" — `tapping.tsx:220`) |

### 4. Identifiers
| Apple data type | Collected? | Linked | Purpose | Evidence |
|---|---|---|---|---|
| User ID | ✅ Yes | Linked | App Functionality, Analytics | Supabase auth `user_id` keys all tables |
| Device ID / IDFA | ❓ Verify | — | — | No IDFA usage found in code; confirm RevenueCat SDK behavior. If none → declare not collected. |

### 5. Usage Data
| Apple data type | Collected? | Linked | Purpose | Evidence |
|---|---|---|---|---|
| Product Interaction (screen views, taps, lesson/binaural/meditation events, paywall hits) | ✅ Yes | Linked | Analytics, Personalization (ML) | `lib/analytics.ts` `EventType` list (lines 13-31) → `user_events`; consent-gated by `ml_consent` |
| Derived ML scores (engagement, churn risk, cohort) | ✅ Yes | Linked | Analytics, Personalization | `user_intelligence` via `calculate-intelligence` edge fn; read in `hooks/useUserIntelligence.ts` |

### 6. Purchases
| Apple data type | Collected? | Linked | Purpose | Evidence |
|---|---|---|---|---|
| Purchase History / subscription tier | ✅ Yes | Linked | App Functionality | RevenueCat entitlements + `profiles.subscription_tier` (`use-lifeflow.tsx:922`) |

### 7. Diagnostics
| Apple data type | Collected? | Linked | Purpose | Evidence |
|---|---|---|---|---|
| Crash / Performance | ❓ Verify | — | — | No dedicated crash SDK (Sentry/Crashlytics) found. If added, declare. |

### NOT collected (based on code review)
- Location (no location APIs found) ➖
- Contacts / address book ➖
- Browsing history ➖
- Financial info beyond store purchase tokens ➖
- Photos / camera / microphone (no `NS*UsageDescription` and no media APIs found; the "grito" scream tool does **not** record audio — it's a timer/guide) ➖

---

## B. Third-party data sharing / processing (MUST disclose)

The AI mentor sends user content to external LLM providers. This is **data sharing with third parties** and must be reflected in both the form and the Privacy Policy:

| Recipient | Data sent | Evidence | Form implication |
|---|---|---|---|
| NVIDIA NIM | Chat messages + system prompt containing user's name, north-star, check-in stress/energy, biometric-derived state, completed-task text | `lib/mentor.ts:662` + `buildSystemPrompt` (name line 415, checkins 207, biometrics 268) | Declare User Content + Health-derived context shared for App Functionality |
| Groq | Same as above (secondary) | `lib/mentor.ts:670` | Same |
| OpenAI | Same as above (fallback) | `lib/mentor.ts:680` | Same |
| Supabase | All app data (DB + auth + edge functions) | `lib/supabase.ts` | Data processor |
| RevenueCat | Purchase / entitlement data + app user ID | `services/revenuecat.ts` | Declare purchases shared |
| WHOOP / Oura | OAuth tokens to pull biometrics (data flows IN; you store it) | `app/perfil/wearables.tsx`, `sync-wearables` | Health data source |

> **Important:** The system prompt embeds emotionally sensitive and biometric-derived context and ships it to whichever LLM responds. The Privacy Policy and the in-app AI disclosure (see `REJECTION_RISK_REPORT.md` M2) must state that chat content + wellness context is processed by third-party AI providers. Confirm each provider's data-retention/training terms (e.g. whether prompts are used for model training) and reflect that.

---

## C. Apple "App Privacy" — quick fill summary

- **Data Used to Track You:** *None* (pending IDFA verification).
- **Data Linked to You:** Email, Name, Health & Fitness, User Content (journal, chat, posts, check-ins, sensitive emotional data), User ID, Usage Data, Purchases.
- **Data Not Linked to You:** *(likely none — almost everything is keyed to the user)*. Possibly anonymous diagnostics if a crash SDK is added.

## D. Google Play "Data Safety" — quick fill summary

- **Data collected:** yes (categories above). **Data shared:** yes (LLM providers, RevenueCat).
- **Encryption in transit:** yes (HTTPS/Supabase). State it.
- **Data deletion:** users can request deletion in-app (`delete-account`) — declare **and** provide a **web URL** for deletion requests (Play wants a web-accessible path too).
- **Sensitive data (health, personal communications):** yes — health + journal/chat → declare and ensure the Privacy Policy covers it.

---

## E. Open items for Legal/Eng before filing the forms
1. Confirm IDFA / ATT status (RevenueCat + any analytics) → sets the "tracking" answer.
2. Confirm LLM providers' retention/training terms → sets sharing language.
3. Author the Privacy Policy to match every category above; host at `polarisgrowthinstitute.com/privacidad`.
4. Add a web account-deletion request URL for the Play listing.
5. Decide retention periods per data type (forms increasingly ask).
