# DATA FLOW & SECRET MAP — Polaris / LifeFlow

Where every secret lives, who can read it, and how data flows client → Supabase → Edge Functions → 3rd parties.

---

## 1. Secret inventory

| Secret | Where defined | Where used | Shipped to client? | Sensitivity | Verdict |
|--------|---------------|------------|--------------------|-------------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | `.env.local:1`, Vercel env | `lib/supabase.ts:7` | **Yes** (in `dist` bundle) | Public | OK by design |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env.local:2`, Vercel env | `lib/supabase.ts:8` | **Yes** (confirmed in `dist/_expo/static/js/web/*.js`) | Public, but is the master key if RLS is broken | OK **only if RLS fixed** |
| `EXPO_PUBLIC_NVIDIA_API_KEY` | `.env`/`.env.local`, Vercel | `app/config/env.ts:10` → `lib/mentor.ts` (NVIDIA, native only via CORS) | **Yes** | **Secret-grade (paid)** | ❌ P1-1 — must move server-side |
| `EXPO_PUBLIC_GROQ_API_KEY` | env, Vercel | `app/config/env.ts:13` → `lib/mentor.ts:672` (client, incl. web) | **Yes** | **Secret-grade (paid)** | ❌ P1-1 |
| `EXPO_PUBLIC_OPENAI_API_KEY` | env, Vercel | `app/config/env.ts:16` → `lib/mentor.ts:682` (client) | **Yes** | **Secret-grade (paid)** | ❌ P1-1 |
| `EXPO_PUBLIC_REVENUECAT_KEY` | env, Vercel | `app/config/env.ts:19`, `services/revenuecat.ts` | **Yes** | Public SDK key (`appl_`/`goog_`) | OK by design |
| `EXPO_PUBLIC_OURA_CLIENT_ID` / `WHOOP_CLIENT_ID` | env | `lib/wearables.ts:30,40` (authorize URL) | **Yes** | Public (OAuth client id) | OK by design |
| `OURA_CLIENT_SECRET` / `WHOOP_CLIENT_SECRET` | Edge Function env (Deno) | `sync-wearables/index.ts:1572,1574` (token exchange/refresh) | **No** (server-only) | Secret | OK (server-only) |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function env (Deno); DB setting `app.service_role_key` for cron | `_shared/supabase.ts:10`; cron `...20260502000001_cron_jobs.sql:35,54,101` | **No** | **Critical (bypasses RLS)** | OK (server-only; not in git) |
| `OPENAI_API_KEY` (embeddings) | Edge Function env (Deno) | `generate-embeddings/index.ts:645` | **No** | Secret | OK (server-only) |
| `EXPO_PUBLIC_DEV_MODE` | `.env:16` | (unused in source) | Yes if set | n/a | P3 — delete |
| Access codes (`POLARIS-ADMIN`, `POLARIS-2026-*`) | **committed** `...20260429000000_access_codes.sql:71-82` | registration | In git history | Invite secret | ❌ P2 — rotate, stop committing |
| Admin UUIDs / emails | `app/admin/_layout.tsx:133-136` (bundle); migrations `...20260504200000...:25-27` | admin fallback / seed | Yes (bundle) | Low | P2 — remove |

**Git hygiene:** `.env` and `.env.local` are NOT tracked (`.gitignore:53-56`; `git ls-files` confirms). No service_role/private keys in source. ✅
**Build artifact:** current `dist/` built with placeholders → no real LLM keys baked. Production Vercel build will inline real `EXPO_PUBLIC_*` values. **[Verify deployed bundle.]**

---

## 2. Trust boundaries

```
                 PUBLIC (untrusted)                          SERVER (trusted)
┌──────────────────────────────────────────┐   ┌──────────────────────────────────────────┐
│ Client app (iOS / Android / Web PWA)      │   │ Supabase Postgres (RLS = boundary)        │
│  - holds: anon key, LLM keys(!), RC key   │   │ Edge Functions (Deno, service_role)       │
│  - storage: SecureStore(native)/LS(web)   │   │  - holds: service_role, OpenAI, OAuth      │
└──────────────────────────────────────────┘   │            client secrets                  │
        │  anon key + user JWT                   └──────────────────────────────────────────┘
        ▼                                                     ▲   service_role (bypasses RLS)
   PostgREST (/rest/v1)  ── RLS enforced ──► tables           │
   Edge Functions (/functions/v1) ──► verify_jwt? ──► code-level authz (often MISSING)
```

**The ONLY real security boundary for client data is Postgres RLS.** Edge Functions that use the service-role client and skip in-code authz (`generate-embeddings`, `smart-notifications`, `sync-wearables` non-connect paths) punch straight through RLS for any caller who passes the gateway (the public anon key satisfies the default `verify_jwt=true`).

---

## 3. Data flows

### 3.1 Auth / registration
```
Client → supabase.auth.signUp(email,pw)            (app/(auth)/index.tsx:137)
Client → SELECT access_codes (validate)            (:111-115)  [relies on over-permissive RLS, P0-5]
Client → UPDATE access_codes uses_count (consume)  (:145-148)  [non-atomic, P1-9]
Trigger handle_new_user → INSERT profiles          (...20260504200000...:246-272)
   role := raw_user_meta_data->>'role'  [client-controlled, P2-4.11]; is_admin := false
Trigger trg_init_intelligence → INSERT user_intelligence
Session JWT stored: SecureStore(native) / localStorage(web)   (lib/supabase.ts:17-39)
```

### 3.2 Daily app data (check-ins, lessons, journal, habits, …)
```
Client (anon key + JWT) → PostgREST → tables
   RLS: auth.uid() = user_id  (per-user, correct — Surface 4.6)
Mirror/local cache: storage/local.ts namespace lifeflow:v2  (CLAUDE.md)
```

### 3.3 AI mentor chat
```
Client builds [system(user context), history, message]   (lib/mentor.ts:648-657)
Client → DIRECTLY → api.groq.com / api.openai.com  with Authorization: Bearer EXPO_PUBLIC_*KEY
   (lib/mentor.ts:664/672/682)   ❌ keys exposed (P1-1); ❌ no server rate-limit
Messages persisted → mentor_messages / mentor_conversations (RLS per-user)
Memory store:  Client → Edge generate-embeddings (MODE A store) → OpenAI embed → mentor_memories.embedding
Memory recall: Client → Edge generate-embeddings (MODE B search, {search_query,user_id})
   → OpenAI embed → rpc search_mentor_memories(p_user_id) → returns memories
   ❌ NO AUTH on the edge fn; user_id from body (P0-2 / 9.1) → cross-user memory theft
```

### 3.4 Intelligence / ML pipeline
```
Client → analytics → user_events (RLS per-user, lib/analytics.ts:129 triggers recalc)
pg_cron (service_role) → POST calculate-intelligence {all_users:true}  (...cron_jobs.sql:31-40)
calculate-intelligence (service_role) reads events/checkins/wellness/wearables
   → upsert user_intelligence → may invoke smart-notifications
   Auth: verify_jwt + service-role-only batch + self-only single (✅ Surface 5.1)
Admin → ml-dashboard {action} (service-role OR is_admin) → aggregate + per-user PII (✅ 5.3)
```

### 3.5 Wearables (Oura / WHOOP)
```
Client → authorize URL (OAuth)  → provider consent
Provider → /oauth/<p>/callback?code&state   (app/oauth/*/callback.tsx)
   ❌ state NOT validated (P2-7.1)
Callback → Edge sync-wearables {action:'connect', code}  (JWT validated here ✅)
   → provider token exchange (CLIENT_SECRET server-side) → store access/refresh token
     ❌ tokens stored PLAINTEXT in wearable_connections (P1-7)
Cron/manual → sync-wearables {user_id|batch}  ❌ NO AUTH on these paths (P1-3)
   → provider API (Bearer token) → wearable_daily / wearable_timeseries (RLS per-user)
   → trigger calculate-intelligence (service_role bearer)
Cross-user leak: wearable_baseline VIEW (security_invoker NOT set) → all users' baselines (P1-5/4.8)
```

### 3.6 Account deletion (GDPR)
```
Client → Edge delete-account  (JWT, no body — identity from token ✅ 5.2)
   → delete from 16 tables incl. mentor_memories(+embeddings), conversations, wearables, profiles
   → auth.admin.deleteUser(uid)  → cascades remaining ON DELETE CASCADE tables
   PII purge: complete (embeddings purged with mentor_memories rows). Cascade covers additive tables.
```

---

## 4. Who can read each PII store (current, exploitable state)

| Store | Intended readers | Actual readers (given defects) |
|-------|------------------|-------------------------------|
| `daily_checkins` / `check_ins` (mood, stress, sleep) | self + admin | self + admin + **anyone who self-escalates (P0-1)** |
| `user_intelligence` (churn, behavioral DNA, biometrics) | self + admin | self + admin + **self-escalator** |
| `mentor_memories` (psychological insights) | self (+ server) | self + **anyone via generate-embeddings (P0-2)** + self-escalator (admin SELECT) |
| `mentor_conversations` / `mentor_messages` | self + admin | self + admin + self-escalator |
| `wearable_daily` / `wearable_baseline` (HRV, HR, sleep) | self + admin | self + admin + **any authed user via `wearable_baseline` view (P1-5)** |
| `wearable_connections` (OAuth tokens, plaintext) | self + admin(SELECT) | self + admin + self-escalator; plaintext at rest (P1-7) |
| `body_measurements` / `nutrition_profiles` | self | self (RLS correct) |
| `community_posts` (reflections) | community | **everyone incl. anon (P2-4.10)** |
| `b2b_organizations` / `org_members` | admin | **likely everyone — RLS disabled (P1-6)** |
| `access_codes` | admin (via RPC) | **every authed user R/W (P0-5)** |

---

## 5. Recommended target architecture (post-fix)

- **LLM inference:** client → Edge `mentor-chat` (JWT, rate-limited) → LLM provider (keys in Deno env). No `EXPO_PUBLIC_*` LLM keys.
- **Memory recall/store:** Edge `generate-embeddings` requires JWT; `user_id := auth.uid()`. `search_mentor_memories` EXECUTE revoked from anon/authenticated.
- **Entitlements:** `user_memberships`/`subscription_tier` written only by SECURITY DEFINER RPC (post verified redemption) or RevenueCat webhook. Client read-only.
- **Profiles:** `is_admin`/`role`/`subscription_tier` not client-writable (column REVOKE or trigger).
- **Access codes:** no client table access; redemption via `redeem_access_code()` RPC only.
- **Views:** `security_invoker=true`.
- **Edge Functions:** explicit `config.toml` with `verify_jwt=true`; in-code authz on every function; CORS pinned to app origins.
- **Web:** strict CSP + security headers; consider cookie-based session storage.
- **Wearable tokens:** encrypted at rest (Vault/pgsodium); excluded from admin reads; revoked on disconnect.
