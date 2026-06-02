# SECURITY LAUNCH AUDIT — Polaris / LifeFlow

**Auditor:** Team 1 — Offensive & Defensive Security
**Scope:** Expo React Native app + TypeScript + Supabase (Postgres + RLS) + Edge Functions (Deno) + Vercel web/PWA
**Date:** 2026-06-02
**Method:** Static analysis of source, SQL migrations, Edge Functions, build output (`dist/`), and client invocation paths. Every finding cites `file:line`, table, policy, or endpoint. Findings that cannot be confirmed from code alone are marked **[NEEDS LIVE VERIFICATION]**.

> **Important deployment caveat:** Several findings depend on the live Supabase project state (which migrations were actually applied, whether Edge Functions were deployed with the default `verify_jwt=true`, and whether Anonymous sign-in is enabled). The repo contains **no `supabase/config.toml`**, so Edge Function JWT verification is whatever the dashboard/CLI default was at deploy time. I have flagged each spot where live confirmation is required. The RLS findings are derived directly from the migration SQL and are exploitable as written.

---

## VERDICT

**DO NOT LAUNCH.** There are **5 P0** issues that are individually launch-blocking, the most severe being a **one-query privilege escalation to admin** (any logged-in user can set `is_admin=true` on their own profile) and an **unauthenticated cross-user PII exfiltration** path through the `generate-embeddings` Edge Function. Multiple paywall-bypass paths exist (self-grant premium membership / tier). Together these compromise confidentiality of all user health/PII data and the entire monetization model.

| Severity | Count |
|----------|-------|
| **P0 (blocks launch)** | 5 |
| **P1 (mitigate before launch)** | 8 |
| **P2** | 6 |
| **P3 / informational** | 5 |

---

## SURFACE 1 — Hardcoded secrets / keys

### 1.1 — No service_role key or private keys in client code or git ✅ (GOOD)
- `grep` for `service_role` / `SUPABASE_SERVICE_ROLE_KEY` across `app/ components/ lib/ hooks/ store/ services/ context/` → **0 matches**. Service role is only referenced server-side in `supabase/functions/_shared/supabase.ts:10` via `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`. Correct.
- No hardcoded `sk-`, `nvapi-`, `gsk_`, `sk-ant-`, AWS keys, or `-----BEGIN` private keys in source. Correct.
- `.env` and `.env.local` are **not** git-tracked (`git ls-files` confirms only `.env.example` is tracked). `.gitignore:53-56` covers all `.env` variants. Correct.

### 1.2 — Hardcoded access/invite codes committed to git — **P2**
- **Evidence:** `supabase/migrations/20260429000000_access_codes.sql:71-82` seeds plaintext codes into the repo: `POLARIS-ADMIN` (`max_uses = -1`, i.e. **unlimited**), `POLARIS-2026-A1..A5`, `POLARIS-2026-B1..B4`.
- **Risk:** Anyone with repo access (or who guesses the obvious pattern) can bypass the invite gate and self-register. `POLARIS-ADMIN` never exhausts. Note: redeeming this code does **not** grant the `is_admin` flag (see 1.3), so the name is misleading — but it is still an unlimited free-registration key.
- **Fix:** Remove seed codes from migrations. Generate codes out-of-band (admin panel) and never commit real codes. Rotate/disable `POLARIS-ADMIN` and all `POLARIS-2026-*` before launch.

### 1.3 — Admin account UUIDs + emails hardcoded in client bundle — **P2**
- **Evidence:** `app/admin/_layout.tsx:133-136` hardcodes owner UUIDs `43d011f5-631f-4dcf-a1eb-d0e68005bff7` and `2ecdb025-0bbd-4291-8f3f-404f36f87d19` as an admin fallback. Admin emails are in migrations: `supabase/migrations/20260504200000_cmi_corrective.sql:25-27` (`ncapuozzo@polarisgrowthinstitute.com`, `jacodelvalle@gmail.com`).
- **Risk:** These UUIDs ship in the web JS bundle. They become useful inputs for any attack that needs a "known admin id" (e.g. the `admin_*` RPC flaw in 4.7). The fallback grants admin UI if the `is_admin` query errors with `42703`/`PGRST116` — `PGRST116` ("no rows") can occur for a freshly-created profile, weakening the guard.
- **Fix:** Remove the hardcoded UUID fallback entirely. Admin status must come only from a server-authoritative check. Do not seed admin emails in committed SQL (use a one-off manual statement run privately).

---

## SURFACE 2 — `EXPO_PUBLIC_*` variables

### 2.1 — Paid LLM API keys shipped client-side via `EXPO_PUBLIC_*` — **P0** (financial DoS) / treat as P1 if you accept the model
- **Evidence:** `app/config/env.ts:10-19` exposes `EXPO_PUBLIC_NVIDIA_API_KEY`, `EXPO_PUBLIC_GROQ_API_KEY`, `EXPO_PUBLIC_OPENAI_API_KEY`, `EXPO_PUBLIC_REVENUECAT_KEY`. `lib/mentor.ts` calls Groq/OpenAI/NVIDIA **directly from the client** (`streamGroq`/`streamOpenAI`/`streamNvidia`, called at `lib/mentor.ts:664,672,682`) sending `Authorization: Bearer <key>` to `api.openai.com` / `api.groq.com` from the browser/device. `.env.example:18-25` documents this as intended ("al menos una clave requerida en el cliente").
- **Risk:** `EXPO_PUBLIC_*` values are inlined into the JS bundle at build time and are trivially extractable from the web bundle or device traffic. Any third party can lift the OpenAI/Groq/NVIDIA keys and spend the org's paid quota without limit → uncapped billing / quota exhaustion / model abuse under your account. These are **secret-grade values behind a public prefix.** This is the textbook definition of a leaked API key.
- **Confirmation:** The current `dist/` build does **not** contain real keys (built with placeholders) — but the production Vercel build will inline whatever is set in Vercel env. **[NEEDS LIVE VERIFICATION]** of the deployed bundle. Regardless, the architecture is wrong.
- **Fix:** Proxy ALL LLM calls through a Supabase Edge Function (server-side) that holds the keys in `Deno.env` and enforces per-user auth + rate limiting + spend caps. Remove `EXPO_PUBLIC_NVIDIA/GROQ/OPENAI` entirely. (NVIDIA is already server-only-by-CORS at `lib/mentor.ts:662`; do the same for all.) RevenueCat public SDK keys (`appl_`/`goog_`) ARE designed to be client-side — that one is acceptable.

### 2.2 — `EXPO_PUBLIC_SUPABASE_ANON_KEY` is public by design ✅ (GOOD, conditional)
- **Evidence:** `lib/supabase.ts:7-8`, present in `dist/_expo/static/js/web/*.js` (URL `bizbbtiyftfjufxinwsu.supabase.co` + anon JWT confirmed in build).
- **Note:** The anon key is meant to be public; security depends entirely on RLS. Given the RLS defects below (Surface 4), the public anon key becomes the master key an attacker uses. The anon key's safety is **contingent on fixing all RLS findings.**

### 2.3 — `EXPO_PUBLIC_DEV_MODE=true` present in `.env` — **P3**
- **Evidence:** `.env:16`. Not git-tracked. Not referenced by name in `app/`, `lib/`, etc. (grep for `DEV_MODE` in source → 0 functional matches). The only "dev bypass" (`hooks/use-lifeflow.tsx:310-365`) keys off the Supabase URL being a placeholder, not this var.
- **Risk:** Low (dead variable), but a `EXPO_PUBLIC_DEV_MODE` that ever gets wired to an auth bypass would ship to clients. Ensure no future code reads it client-side.
- **Fix:** Delete the variable; if dev behavior is needed, gate strictly on `__DEV__`.

---

## SURFACE 3 — Dev bypasses / debug residue

### 3.1 — Anonymous sign-in "dev bypass" — **P3** (gated, but verify project setting)
- **Evidence:** `hooks/use-lifeflow.tsx:311-312, 361-365`. If `EXPO_PUBLIC_SUPABASE_URL` contains `your-project` or is empty (`IS_PLACEHOLDER_URL`), the app calls `supabase.auth.signInAnonymously()`.
- **Risk:** In production the URL is real, so this path does **not** trigger. Safe as written. BUT it requires Anonymous sign-ins to be **disabled** in the Supabase Auth settings for production; if enabled, anonymous accounts can be created against the real project by any caller. **[NEEDS LIVE VERIFICATION: confirm Anonymous provider is OFF in production.]**
- **Fix:** Confirm Anonymous auth is disabled in prod. Optionally wrap this block in `if (__DEV__)`.

### 3.2 — Mentor dev simulation — **P3** (acceptable)
- **Evidence:** `lib/mentor.ts:598-624` (`streamDevSimulation`), invoked only when `ENV.isDev && !anyApiKey` (`lib/mentor.ts:644`) or as a last-resort fallback if all APIs fail (`:688`). `ENV.isDev = __DEV__` (`app/config/env.ts:7`) → `false` in production builds.
- **Risk:** Minimal. Worst case in prod: if all 3 LLM providers fail, users get canned coaching text. Not a security issue.

### 3.3 — No sensitive data logged ✅ (GOOD)
- grep for `console.*` containing token/password/secret/jwt/session → no leaks of secret values (`hooks/use-lifeflow.tsx:785` logs only an error object label). Edge Functions log user IDs and error messages (`delete-account/index.ts:618`, `sync-wearables` etc.) — acceptable, though see 5.6 re: error detail leakage to clients.

---

## SURFACE 4 — Supabase Row Level Security (the core of the audit)

> **Policy stacking note:** Postgres combines multiple PERMISSIVE policies for the same command with **OR**. Several migrations add *additional* permissive policies under *different names* without dropping the old ones, so the most permissive policy wins. This is the root cause of the worst findings.

### 4.1 — **P0 — Privilege escalation: any user can make themselves admin**
- **Evidence:**
  - Base policy: `supabase/schema.sql:127-128` — `CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);` (no `WITH CHECK`, no column restriction).
  - Stacked policy: `supabase/migrations/20260509120000_membership_activation_fix.sql:170-175` — `user_update_own_profile_tier ... FOR UPDATE USING (auth.uid()=id) WITH CHECK (auth.uid()=id)`.
  - The `is_admin` and `role` columns live on this exact `profiles` table (`supabase/migrations/20260504200000_cmi_corrective.sql:16-17` adds `is_admin`; `supabase/schema.sql:20` defines `role`).
  - **No** column-level `GRANT`/`REVOKE` and **no** BEFORE UPDATE trigger guards `is_admin`/`role` anywhere (grep across `supabase/migrations/` → none).
- **Exploit:** Any authenticated user runs:
  ```js
  await supabase.from('profiles').update({ is_admin: true }).eq('id', MY_OWN_UID)
  ```
  RLS only checks the row predicate (`id = auth.uid()`, still true) — Postgres RLS **cannot** restrict which columns are written, and `authenticated` has default UPDATE on all columns. The update succeeds → attacker is now admin.
- **Impact:** Becoming admin unlocks the `is_admin`-gated RLS on `daily_checkins`, `user_intelligence`, `user_events`, `mentor_conversations`, `wearable_daily`, `wearable_connections`, `user_memberships`, `user_course_access`, `access_code_uses`, `admin_audit_log` (see 4.5) → **full read of every user's health + behavioral PII**, plus the admin web panel.
- **Fix:** Restrict updatable columns. Either (a) `REVOKE UPDATE (is_admin, role, subscription_tier, subscription_expires_at) ON public.profiles FROM authenticated;` and grant UPDATE only on the safe columns, **or** (b) add a `BEFORE UPDATE` trigger that raises if `NEW.is_admin <> OLD.is_admin OR NEW.role <> OLD.role` for non-service-role callers. Move tier changes to a SECURITY DEFINER RPC keyed on `auth.uid()`.

### 4.2 — **P0 — Paywall bypass: self-grant premium membership**
- **Evidence:** `supabase/migrations/20260509120000_membership_activation_fix.sql:124-128` — `user_insert_own_memberships ON user_memberships FOR INSERT WITH CHECK (auth.uid() = user_id)`.
- **Exploit:** Any authenticated user runs:
  ```js
  await supabase.from('user_memberships').insert({ user_id: MY_UID, product: 'polaris', status: 'active', activated_by: 'access_code' })
  ```
  No validation that a code was redeemed or payment made. The app derives entitlement from `user_memberships` / `subscription_tier`.
- **Impact:** Free users unlock all premium products (`polaris`, `growthplayers`, `lifeflow_premium_plus`). Direct revenue loss.
- **Fix:** Drop `user_insert_own_memberships`. Memberships must only be written by a SECURITY DEFINER RPC (after verified code redemption or a RevenueCat webhook) or by admins. Client gets read-only on its own memberships.

### 4.3 — **P0 — Paywall bypass: self-set `subscription_tier`**
- **Evidence:** Same `user_update_own_profile_tier` policy as 4.1 (`...20260509120000...:170-175`) allows a user to update any column on their own `profiles` row, including `subscription_tier`.
- **Exploit:** `await supabase.from('profiles').update({ subscription_tier: 'premium_plus' }).eq('id', MY_UID)`. The app reads `subscription_tier` for gating (`lib/admin/actions.ts:41-47, 61`). Realtime publication on `profiles` (`...20260506100000_subscription_tier.sql:50`) means it takes effect instantly.
- **Impact:** Instant premium unlock with one query. (Same root policy as 4.1; fixing column-level write restriction fixes both.)
- **Fix:** As 4.1 — restrict updatable columns; tier only via RPC/webhook.

### 4.4 — **P0 — `access_codes` fully writable by any authenticated user**
- **Evidence:** `supabase/migrations/20260509120000_membership_activation_fix.sql:63-68` — `authenticated_update_access_codes_uses ON access_codes FOR UPDATE TO authenticated USING (true) WITH CHECK (true)`. Plus `:56-60` `authenticated_select_access_codes USING (true)` lets any authed user read every code.
- **Exploit:** Any authenticated user can `UPDATE access_codes SET uses_count = 0, max_uses = 999999, is_active = true WHERE ...` — reset/resurrect any code, including disabled ones, and read all codes (including `POLARIS-ADMIN`). Completely defeats the invite/quota system.
- **Impact:** Invite gate is meaningless; single-use codes become infinite; an attacker can mint unlimited registrations and harvest all codes.
- **Fix:** Drop both permissive policies. All redemption must go through the existing `redeem_access_code(p_code)` SECURITY DEFINER RPC (`...20260509100000_access_code_rpcs.sql:19-66`) which is atomic and does not expose the table. Client should have **no** direct SELECT/UPDATE on `access_codes`.

### 4.5 — Admin-read RLS is correct but inherits the escalation risk — **P1**
- **Evidence (these are correctly scoped per-user OR admin):** `daily_checkins` admin read `...20260504200000...:213-218`; `user_intelligence` `...20260504000000_cmi_admin.sql:131-139`; `user_events` `:117-127`; `mentor_conversations` `:141-151`; `wearable_daily`/`wearable_connections` `...20260506000000...:109-123`; `user_memberships`/`user_course_access`/`access_code_uses` correctly admin-gated.
- **Risk:** The `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)` predicate is sound **only if `is_admin` cannot be self-set**. Finding 4.1 breaks that assumption, turning every "admin can read all" policy into "anyone can read all PII." These policies are fine once 4.1 is fixed.
- **Fix:** Fix 4.1; then re-verify these read paths.

### 4.6 — Per-user base RLS is correct ✅ (GOOD)
- `user_profiles`, `daily_checkins`, `lesson_tasks`, `completed_lessons`, `mentor_messages` (`...20260428155503...:99-115`); `journal_entries` (`...20260501000000...:35-40`); `user_events`/`user_intelligence`/`mentor_conversations`/`mentor_memories`/`smart_notifications` (`...20260502000000...`); wearable tables (`...20260506000000...`); additive tables `habits/habit_logs/fasting_sessions/body_measurements/nutrition_profiles/supplement_stacks/weekly_sessions/mentor_threads` (`...20260513000000...:149-164`). All scope to `auth.uid() = user_id`. Correct.
- Minor: `completed_lessons` and `mentor_messages` (intelligence schema) lack UPDATE/DELETE policies — append-only by design, acceptable.

### 4.7 — Admin RPCs trust a client-supplied `p_admin_id` — **P1**
- **Evidence:** `admin_activate_membership(p_admin_id uuid, ...)` and `admin_create_access_code(p_admin_id uuid, ...)` are SECURITY DEFINER, `GRANT EXECUTE ... TO authenticated`, and check `IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true)` — where **`p_admin_id` is passed by the caller**, not `auth.uid()`. See `...20260504200000_cmi_corrective.sql:139-172` and `:175-208`, duplicated in `...20260504000000_cmi_admin.sql:154-207` and `...20260509100000_access_code_rpcs.sql:69-108`.
- **Exploit:** Any authenticated user calls `rpc('admin_activate_membership', { p_admin_id: '<known-admin-uuid from app/admin/_layout.tsx:134>', p_user_id: MY_UID, p_product: 'polaris' })`. The function checks the *admin's* flag (true) and grants the membership to the attacker.
- **Note:** The app does not use these RPCs (admin panel does direct table writes, `lib/admin/actions.ts`), but they are deployed and callable. With 4.2 also open, this is a redundant bypass — but it must be removed independently.
- **Fix:** Remove `p_admin_id` params; derive caller from `auth.uid()` inside the function: `IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin) THEN RAISE EXCEPTION ...`.

### 4.8 — Views bypass RLS (SECURITY DEFINER semantics) — **P1**
- **Evidence:** `wearable_baseline` view `...20260506000000_biometrics_engine.sql:126-138` aggregates `wearable_daily` across **all** users and is `GRANT SELECT ... TO authenticated` (`:138`). `user_progress` view `...20260428155503...:159-179`. **No** view in the repo sets `security_invoker = true` (grep → 0). In Postgres, views run with the **view owner's** privileges and bypass the underlying tables' RLS by default.
- **Exploit:** `await supabase.from('wearable_baseline').select('*')` → returns every user's 7-day HRV / resting-HR / recovery baselines (health data) regardless of ownership. `user_progress` similarly leaks other users' names, scores, streaks.
- **Fix:** Recreate both views `WITH (security_invoker = true)` (Postgres ≥15 — Supabase supports it), or replace with RLS-scoped RPCs, or revoke `authenticated` SELECT and query the base tables directly.

### 4.9 — `b2b_organizations` / `org_members` have **no RLS** — **P1**
- **Evidence:** `...20260501000000_auraos_extensions.sql:45-61` creates both with the comment "no RLS needed on org — admin only" but **never** runs `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` (grep confirms no policy/enable for these tables).
- **Risk:** Supabase exposes all `public` tables through PostgREST. A table with RLS **disabled** returns rows to any role that holds table privileges; Supabase grants `anon`/`authenticated` access broadly. So `await supabase.from('b2b_organizations').select('*')` likely returns all org rows (names, admin user ids, seats) to any caller, and may allow writes. **[NEEDS LIVE VERIFICATION of the table grants, but the missing RLS is unambiguous in code.]**
- **Fix:** `ALTER TABLE b2b_organizations, org_members ENABLE ROW LEVEL SECURITY;` and add membership/admin-scoped policies. If B2B isn't shipping, drop the tables or revoke all grants.

### 4.10 — `community_posts` / `community_reactions` are world-readable — **P2**
- **Evidence:** `...20260513000000_additive_features.sql:170,174` — `community_read_all ... USING (true)` and `community_comments_read ... USING (true)`, **no `TO authenticated`** restriction.
- **Risk:** Community posts contain free-text user "reflections" (`content text`). `USING(true)` with no role clause means even the `anon` role can read all posts if anon has SELECT grant (Supabase default for public tables). Personal reflections may be exposed publicly. Also the `own_community_posts FOR ALL` policy stacks, but read is wide-open.
- **Fix:** Change to `... FOR SELECT TO authenticated USING (true)` at minimum. Consider whether community content should be public at all; if posts can be personal, scope to opt-in.

### 4.11 — `handle_new_user` copies `role` from client-controlled metadata — **P2**
- **Evidence:** `...20260504200000_cmi_corrective.sql:253-264` — `INSERT INTO profiles (..., role, ...) VALUES (..., COALESCE(NEW.raw_user_meta_data->>'role', 'member'), ...)`. `raw_user_meta_data` is attacker-controllable at signup (`supabase.auth.signUp({ options: { data: { role: 'admin' } } })`).
- **Risk:** A user can set `profiles.role = 'admin'` at signup. `is_admin` is hardcoded `false` here (`:262`), and the audited admin checks use `is_admin` not `role`, so this alone is **not** escalation today. But `role` is displayed (`app/perfil/index.tsx:215-216`) and any future code that trusts `role` (the admin seed sets `role='admin'`, `...:230`) would be exploitable.
- **Fix:** Do not read `role` from `raw_user_meta_data`; default to `'member'` and set elevated roles only server-side.

### 4.12 — `redeem_access_code` / `search_mentor_memories` SECURITY DEFINER grants — **P2 / verify**
- **Evidence:** `search_mentor_memories(p_user_id, ...)` (`...20260502000000...:194-223`) is SECURITY DEFINER and filters on the **caller-supplied** `p_user_id`, with **no explicit `REVOKE`/`GRANT`** in the migration (defaults to `EXECUTE` for `PUBLIC`). It is only *called* server-side (`generate-embeddings/index.ts:107`) — but if directly callable via PostgREST `rpc()`, any user could pass another user's id and read their memories.
- **Risk:** Potential PII read of another user's mentor memories via `rpc('search_mentor_memories', { p_user_id: VICTIM, p_embedding: '[...]', p_limit: 20 })`. **[NEEDS LIVE VERIFICATION: is EXECUTE on this function granted to `authenticated`/`anon`? If so it's P0; default PUBLIC EXECUTE on a SECURITY DEFINER function makes it P0.]**
- **Fix:** `REVOKE EXECUTE ON FUNCTION search_mentor_memories FROM PUBLIC, anon, authenticated;` (only the service role / Edge Function should call it). Or rewrite to derive the user from `auth.uid()` and ignore `p_user_id`.

---

## SURFACE 5 — Edge Functions

| Function | Auth in code | Verdict |
|----------|-------------|---------|
| `calculate-intelligence` | JWT verified; batch requires service-role; user can only recalc self | ✅ Good (5.1) |
| `delete-account` | JWT verified; deletes self only | ✅ Good (5.2) |
| `ml-dashboard` | service-role OR JWT+`is_admin` | ✅ Good (5.3) |
| `generate-embeddings` | **NONE** | ❌ **P0 (5.4)** |
| `smart-notifications` | **NONE** | ❌ **P1 (5.5)** |
| `sync-wearables` | partial (connect path only) | ❌ **P1 (5.6)** |

### 5.1 — `calculate-intelligence` — ✅ GOOD
- `verifyRequest` (`calculate-intelligence/index.ts:493-506`) validates the JWT via `auth.getUser`; accepts service-role token for internal calls. Batch (`batch:'all'`/`all_users`) requires `callerUid === null` (service role) else 403 (`:523-525`). Single-user requires `callerUid === user_id` else 403 (`:550-552`). Respects `ml_consent` (`:144`). Solid.

### 5.2 — `delete-account` — ✅ GOOD (account deletion DOES purge PII + embeddings)
- Auth: validates JWT (`delete-account/index.ts:583-590`), identifies user from token, no client-supplied id. Deletes from 16 tables including `mentor_memories` (embeddings live in `mentor_memories.embedding` → purged), `mentor_conversations`, `user_intelligence`, `user_events`, all wearable tables, `profiles`, `user_profiles` (`:594-612`), then `auth.admin.deleteUser` (`:615`).
- **Gap (P2):** It does **not** explicitly delete the additive-feature tables (`habits`, `habit_logs`, `fasting_sessions`, `community_posts`, `community_reactions`, `body_measurements`, `nutrition_profiles`, `supplement_stacks`, `weekly_sessions`, `mentor_threads`) or `user_memberships`/`user_course_access`/`access_code_uses`. These all have `ON DELETE CASCADE` on `auth.users(id)`, so the final `deleteUser` cascade-removes them — **deletion is complete in practice**, but it relies on cascade rather than explicit deletes. If any FK is ever changed to `SET NULL`/`NO ACTION`, PII (body measurements, nutrition, community posts) would orphan.
- **Fix:** Add explicit deletes for the additive tables for defense-in-depth, and add an automated test asserting zero rows for the user across all tables post-deletion. Confirm `mentor_memories` row deletion also removes embeddings (it does — same row).

### 5.3 — `ml-dashboard` — ✅ GOOD
- `isAdmin` guard (`ml-dashboard/index.ts:814-836`) accepts service-role or validates JWT + checks `profiles.is_admin`. All actions gated (`:1083-1087`). Returns aggregate + per-user PII (names, emails, memories) — correctly admin-only. (Inherits 4.1 risk: fix escalation first.)

### 5.4 — `generate-embeddings` has **NO auth guard** — **P0 (cross-user PII exfiltration)**
- **Evidence:** `generate-embeddings/index.ts:679-792`. The handler reads `user_id` from the request **body** (`:698, 706`) and uses the **service-role** `adminSupabase` client. There is **no** `auth.getUser`, no JWT check, no `user_id === auth.uid()` check anywhere. MODE B (search) calls `rpc('search_mentor_memories', { p_user_id: user_id, ... })` (`:733-738`) and returns that user's memories. The client passes its own id (`hooks/useMentorMemory.ts:109-110`) but nothing stops a different value.
- **Exploit:** `POST /functions/v1/generate-embeddings` with header `Authorization: Bearer <ANON_KEY>` (the anon key is public, in the web bundle) and body `{ "search_query": "money fear struggle", "user_id": "<VICTIM_UUID>" }` → returns the victim's private mentor memories (insights, struggles, goals — highly sensitive). With default `verify_jwt=true`, the anon key satisfies the gateway; with `verify_jwt=false`, no token is needed at all.
- **Impact:** Confidentiality breach of the most sensitive user data (psychological reflections), addressable per-user-id. Enumerable if UUIDs are obtained (and admin UUIDs are already public).
- **Fix:** Add `const { data:{user} } = await adminSupabase.auth.getUser(token)` at the top; reject if missing; **force `user_id = user.id`** (ignore the body value) for both search and store. Also `REVOKE EXECUTE` on `search_mentor_memories` from public (4.12). Add a `config.toml` with explicit `verify_jwt = true` for this function.

### 5.5 — `smart-notifications` has **NO auth guard** — **P1**
- **Evidence:** `smart-notifications/index.ts:1436-1551`. Accepts `{ scheduled: true }` (sweep all users) or `{ user_id, trigger }` with **no** JWT/service-role verification. Uses service-role client; reads `expo_push_token` and sends Expo push.
- **Exploit:** Anyone with the anon key calls it with `{ scheduled: true }` to force a full notification sweep, or `{ user_id: VICTIM, trigger: 'churn' }` to push spam to a specific user. Abuse / push-spam / Expo quota burn. (It only triggers DB-driven templates, so not arbitrary content, but still unauthenticated side-effects.)
- **Fix:** Require service-role for `scheduled`/sweep, and JWT-with-`user===user_id` (or service-role) for single-user. Mirror the `calculate-intelligence` `verifyRequest` pattern.

### 5.6 — `sync-wearables` — partial auth, unauthenticated trigger paths — **P1**
- **Evidence:** `sync-wearables/index.ts:2080-2153`. Only the `action === 'connect'` branch validates the JWT (`:2094-2098`). The `batch === 'all'` branch (`:2114`) and the single-user `if (user_id)` branch (`:2142-2145`) run with **no auth**, using the service-role client. `lib/wearables.ts:115-128 (triggerWearableSync)` passes a client-supplied `userId`.
- **Exploit:** `POST` with `{ "user_id": "<any uuid>" }` (anon key) triggers a sync that uses that user's stored OAuth tokens to hit Oura/WHOOP and write their rows — unauthenticated side-effect + 3rd-party quota burn / DoS. `{ "batch": "all" }` triggers a full-fleet sync. Not direct data theft (writes go to the victim's own rows), but unauthenticated and abusable.
- **Fix:** Require service-role for `batch`, and JWT-with-`user===user_id` (or service-role) for single-user sync.

### 5.7 — CORS is wildcard `*` on Edge Functions — **P2**
- **Evidence:** `supabase/functions/_shared/supabase.ts:16-22` — `Access-Control-Allow-Origin: origin ?? '*'`, and functions echo the request `origin` (`generate-embeddings`, `smart-notifications`, `ml-dashboard`). Effectively any origin is allowed.
- **Risk:** Combined with the unauthenticated functions (5.4/5.5/5.6) and the public anon key, any website can invoke these from a victim's browser. Tightens the blast radius of the auth gaps.
- **Fix:** Restrict `Access-Control-Allow-Origin` to the known app origins (`https://growthplayers.vercel.app`, custom domain) once auth is fixed.

### 5.8 — Edge Functions return raw error messages to clients — **P3**
- **Evidence:** `calculate-intelligence:559-560`, `sync-wearables:2149-2151`, `generate-embeddings:742` return `err.message`/`error.detail` in the JSON response. May leak internal/Postgres detail.
- **Fix:** Log server-side; return generic error strings to clients.

### 5.9 — pg_cron uses service-role bearer from DB config — note (acceptable)
- **Evidence:** `...20260502000001_cron_jobs.sql:35,54,101` use `current_setting('app.service_role_key')`. The migration explicitly warns **not** to hardcode the key (`:123-124`). The key is stored as a DB setting (readable by the `postgres`/superuser role only). Acceptable; just ensure 5.4/5.5/5.6 require service-role so only cron (which holds it) can trigger sweeps.

---

## SURFACE 6 — Auth flows (session / refresh / logout / deletion)

### 6.1 — Session storage — **P2** (web localStorage + no CSP)
- **Evidence:** `lib/supabase.ts:17-39` — on web, session persists in `window.localStorage`; on native, `expo-secure-store`. `autoRefreshToken:true`, `persistSession:true`, `detectSessionInUrl:false` (`:43-50`).
- **Risk:** Native (SecureStore) is fine. On web, the Supabase session JWT in `localStorage` is readable by any injected script. With **no CSP** (Surface 10), an XSS would exfiltrate the session token → full account takeover. The two compound.
- **Fix:** Add a strict CSP (10.1). Consider Supabase's cookie-based session storage for web if feasible.

### 6.2 — Registration: client-side code validation, non-atomic consumption — **P1**
- **Evidence:** `app/(auth)/index.tsx:108-149`. Validates the code with a direct client `SELECT` then consumes it with a **separate** client `UPDATE` (`:145-148`), not the atomic `redeem_access_code` RPC. No `.eq('uses_count', ...)` guard → blind increment. Check-then-act TOCTOU.
- **Risk:** Concurrent registrations can redeem the same single-use code multiple times (race). Relies on the over-permissive `access_codes` policies (4.4) — which an attacker can also abuse to reset codes. The code is also consumed even though signup may require email confirmation, and the code is **not** bound to the created user here.
- **Fix:** Replace with `await supabase.rpc('redeem_access_code', { p_code })` after successful signup, inside the post-confirmation flow; record the `(code_id, user_id)` binding via the existing `access_code_uses` table. Remove direct client access to `access_codes`.

### 6.3 — Logout / deletion — mostly fine — **P3**
- **Evidence:** `deleteAccount` (`hooks/use-lifeflow.tsx:892-900`) requires a session and invokes `delete-account` (JWT auto-attached). After deletion it clears local state but does not call `supabase.auth.signOut()` — minor, since the auth user is destroyed server-side. `exportData` (`:902+`) provides GDPR data export. **[Could not locate an explicit `signOut()` logout path in this audit; verify a logout control exists and clears SecureStore/localStorage.]**
- **Fix:** Call `supabase.auth.signOut()` in `deleteAccount` and ensure a user-facing logout exists.

### 6.4 — Password policy weak — **P3**
- **Evidence:** `app/(auth)/index.tsx:101-102` enforces only `password.length >= 6`. Supabase default min is 6.
- **Fix:** Raise to ≥10–12 with basic strength checks; enable leaked-password protection in Supabase Auth.

---

## SURFACE 7 — OAuth (Oura / WHOOP)

### 7.1 — `state` parameter is never stored or validated (no CSRF protection) — **P2**
- **Evidence:** State is generated with `Math.random()` (weak, non-crypto) in `app/perfil/wearables.tsx:46-48`, placed in the authorize URL (`:420-421`, `lib/wearables.ts:27-48`), but **never persisted** (no localStorage/DB write) and the callback `app/oauth/oura/callback.tsx:37-69` and `app/oauth/whoop/callback.tsx` destructure `state` (`callback.tsx:25`) yet **never read/compare it** — they immediately exchange `code`.
- **Risk:** OAuth CSRF / authorization-code injection. On **web** (full-page redirect, `wearables.tsx:424-428`) there is no binding between the initiating session and the callback, so a crafted callback URL with an attacker's `code` could link the attacker's wearable to a victim's session, or a victim's `code` could be replayed. Native uses `WebBrowser.openAuthSessionAsync` which binds the result to the session (`:434`), reducing native risk.
- **Fix:** Generate `state` with `crypto.getRandomValues`, store it (sessionStorage/SecureStore) before redirect, and in the callback reject if `params.state` ≠ stored value. Pass it through to the Edge Function for an additional server-side check if desired.

### 7.2 — Wearable OAuth tokens stored in plaintext — **P1**
- **Evidence:** `...20260506000000_biometrics_engine.sql:17-18` — `access_token text`, `refresh_token text`. The comment says "encrypted at rest (Supabase Vault ideally)" but no encryption is applied. Tokens written plaintext by `sync-wearables` (`connectOura`/`connectWhoop`, `index.ts:2033-2042, 2067-2076`).
- **Risk:** Long-lived Oura/WHOOP `refresh_token`s sit in plaintext in `wearable_connections`. Exposed to: (a) anyone who escalates to admin (4.1) — though the admin policy is SELECT-only and doesn't include `wearable_connections` token columns for admin... actually `admin_wearable_connections` is SELECT on the whole row (`...:117-123`) → admin can read tokens; (b) any DB compromise / backup leak. Stolen refresh tokens grant ongoing access to victims' health data directly from Oura/WHOOP.
- **Fix:** Encrypt tokens with Supabase Vault / `pgsodium`, or store only in a restricted schema not exposed via PostgREST and never selectable by the admin policy. Exclude token columns from any admin read.

### 7.3 — Disconnect / revocation — **P2** **[NEEDS VERIFICATION]**
- The disconnect path (`app/perfil/wearables.tsx`) was not fully traced. Confirm that "disconnect" (a) deletes/deactivates the `wearable_connections` row AND (b) calls the provider's token-revocation endpoint. If it only flips `is_active=false`, the stored tokens remain valid and usable.
- **Fix:** On disconnect, call Oura/WHOOP revoke endpoints and delete the stored tokens.

### 7.4 — Native redirect scheme mismatch — **P3** (functional)
- `app.json:8` scheme is `polaris`, but native OAuth uses `growthplayers://oauth` (`wearables.tsx:434`) and `REDIRECT_BASE` uses `exp://localhost:8081` in dev (`lib/wearables.ts:23-25`). Likely breaks native OAuth callback; not a security issue but will fail QA.

---

## SURFACE 8 — Admin panel

### 8.1 — Admin authorization is **client-side only** — **P1** (data saved by RLS, UI is not)
- **Evidence:** `app/admin/_layout.tsx:114-162` gates rendering on a client `SELECT is_admin` (`:125-128`) and `router.replace` for non-admins (`:141`). There is **no** server-side route protection (the SPA is fully served — see 10.2). All admin data access goes through the anon-key client subject to RLS (`lib/admin/actions.ts`, `lib/admin/queries.ts`), and the admin-scoped RLS policies (4.5) are the only real enforcement.
- **Risk:** The admin **UI bundle and routes are reachable by anyone** (`/admin/*` serves JS). Data is protected only if (a) admin RLS holds and (b) `is_admin` cannot be self-set. Finding 4.1 defeats (b) → anyone can become a real admin and use the panel legitimately. Even without 4.1, exposing the admin UI broadens attack surface and leaks internal structure.
- **Fix:** Fix 4.1 first. Keep all admin reads/writes behind admin-scoped RLS and SECURITY DEFINER RPCs that check `auth.uid()`. The client guard is fine as UX, but never the security boundary. Consider serving admin from a separate, access-controlled deployment.

### 8.2 — Admin actions write directly to tables (no server authz) — **P1** (depends on RLS)
- **Evidence:** `lib/admin/actions.ts` — `activateMembership` direct-inserts `user_memberships` (`:104-119`), `createAccessCode` direct-inserts `access_codes` (`:313-327`), `changeTier`/`syncTier` direct-update `profiles`/`user_profiles` (`:49-65`), `sendMessageAsNorman` inserts into `mentor_conversations` (`:443-448`). These succeed for a non-admin **only** because of the over-permissive policies (4.2/4.4) — i.e., a non-admin can perform several "admin" writes today.
- **Fix:** Remove permissive policies (4.2/4.4); route admin mutations through `auth.uid()`-checked SECURITY DEFINER RPCs; ensure `admin_*` tables are admin-only for INSERT/UPDATE.

---

## SURFACE 9 — AI mentor (prompt injection / PII exfiltration)

### 9.1 — Mentor memory exfiltration via `generate-embeddings` — **P0** (cross-reference 5.4)
- The mentor's long-term memory (`mentor_memories`, psychological PII) is retrievable cross-user through the unauthenticated `generate-embeddings` search endpoint. This is the highest-impact PII path. See **5.4** for the full exploit + fix.

### 9.2 — Prompt injection surface — **P2**
- **Evidence:** `lib/mentor.ts:648-657` builds messages as `[system(buildSystemPrompt(ctx)), ...history, user(message)]` and sends to the LLM **from the client**. `MentorContext` (per CLAUDE.md) embeds the user's own northStar, check-ins, biometrics, ML scores into the system prompt.
- **Risk:** Standard LLM jailbreak/prompt-injection applies (user can try to override the system prompt). Because the context is **only the user's own data**, a successful injection leaks only the user's own data back to themselves — **no cross-user leak** through the prompt itself. The real exfil risk is the memory-retrieval endpoint (9.1/5.4), not the prompt. Lower priority, but: since LLM calls are client-side (2.1), a user can also bypass the system prompt entirely by calling the LLM API directly with the leaked key.
- **Fix:** Move mentor inference server-side (fixes 2.1 + lets you sanitize/relevance-filter retrieved memories and clamp the system prompt). Add output filtering if memories of other entities could ever enter context.

### 9.3 — Memory retrieval has no relevance/PII gate beyond similarity — **P3**
- `search_mentor_memories` returns top-N by cosine similarity scoped to the user. Fine for a single user. When inference moves server-side, ensure only the authenticated user's memories are ever injected.

---

## SURFACE 10 — Web / Vercel

### 10.1 — No security headers / no CSP — **P1**
- **Evidence:** `vercel.json:6-65` sets only `Cache-Control`/`Service-Worker-Allowed`. **Missing:** `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- **Risk:** No CSP → an XSS can run freely and exfiltrate the Supabase session JWT from `localStorage` (6.1) → account takeover, including admin if escalated. No `X-Frame-Options`/`frame-ancestors` → clickjacking. No HSTS → SSL-strip risk. For a health/PII PWA this is below baseline.
- **Fix:** Add a strict CSP (`default-src 'self'`; allow only `https://*.supabase.co`, the LLM/wearable origins as needed, `'wasm-unsafe-eval'` for Hermes if required; `frame-ancestors 'none'`), plus `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` to disable unused features. Apply via `vercel.json` `headers` on `/(.*)`.

### 10.2 — Admin routes served to everyone (SPA catch-all) — **P2** (compounds 8.1)
- **Evidence:** `vercel.json:66-68` rewrites `/(.*)` → `/index.html`. The SPA includes `/admin/*`. Anyone can load the admin bundle; protection is the client guard (8.1) + RLS.
- **Fix:** As 8.1 — ideally host admin separately behind auth (Vercel password protection / separate project), or at least accept that RLS is the only boundary and harden it.

### 10.3 — `dist2/` stale build artifact in repo — **P3**
- A second `dist2/` directory exists (not gitignored like `dist/`). Verify it is not deployed and contains no stale secrets. Remove it.

---

## Appendix A — Exploit quick-reference (for P0 verification)

All assume the attacker has registered a normal account (a single-use `POLARIS-2026-*` code or `POLARIS-ADMIN` from `...20260429000000_access_codes.sql:71-82`) and holds a valid user JWT + the public anon key.

1. **Become admin (4.1):**
   `supabase.from('profiles').update({ is_admin: true }).eq('id', MY_UID)` → then read all PII.
2. **Free premium via membership (4.2):**
   `supabase.from('user_memberships').insert({ user_id: MY_UID, product: 'polaris', status: 'active' })`.
3. **Free premium via tier (4.3):**
   `supabase.from('profiles').update({ subscription_tier: 'premium_plus' }).eq('id', MY_UID)`.
4. **Reset/own all invite codes (4.4):**
   `supabase.from('access_codes').select('*')` and `...update({ uses_count: 0, max_uses: 999999 }).eq('id', ANY)`.
5. **Read any user's mentor memories (5.4 / 9.1):**
   `POST /functions/v1/generate-embeddings` `{ search_query:'...', user_id: VICTIM }` with `Authorization: Bearer <anon key>`.
6. **Read all users' biometric baselines (4.8):**
   `supabase.from('wearable_baseline').select('*')`.

---

## Appendix B — What is correct (do not regress)

- Service-role key is server-only; no secrets hardcoded in source or git.
- Per-user base RLS on the core tables is correct (4.6).
- `calculate-intelligence`, `delete-account`, `ml-dashboard` Edge Functions have proper auth (5.1–5.3).
- Account deletion purges PII including embeddings (5.2), GDPR export exists.
- Native session storage uses SecureStore; `detectSessionInUrl:false` is appropriate.
- `ml_consent` is respected by the ML pipeline.
