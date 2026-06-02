# P0 / P1 SECURITY FIXLIST — Polaris / LifeFlow

Pre-launch blockers and must-mitigate items only. Full detail in `SECURITY_LAUNCH_AUDIT.md`.
Effort: **S** ≤ 2h, **M** ≤ 1 day, **L** > 1 day.

## P0 — BLOCKS LAUNCH (5)

| # | Severity | Title | Evidence (file:line / endpoint) | Fix | Effort | Blocks launch |
|---|----------|-------|----------------------------------|-----|--------|---------------|
| P0-1 | P0 | Privilege escalation: any user can set `is_admin=true` on own profile | RLS `profiles_update_own` `supabase/schema.sql:127-128` + `user_update_own_profile_tier` `supabase/migrations/20260509120000_membership_activation_fix.sql:170-175`; `is_admin` col `supabase/migrations/20260504200000_cmi_corrective.sql:16-17`; no column GRANT/trigger guard anywhere | `REVOKE UPDATE (is_admin, role, subscription_tier, subscription_expires_at) ON profiles FROM authenticated;` and re-grant only safe cols **or** BEFORE UPDATE trigger blocking changes to `is_admin`/`role` for non-service callers | M | YES |
| P0-2 | P0 | Unauthenticated cross-user PII exfiltration (mentor memories) | `supabase/functions/generate-embeddings/index.ts:679-746` — no `auth.getUser`, `user_id` taken from body, service-role client; callable with public anon key | Verify JWT at top; force `user_id = user.id`; ignore body `user_id`; add `config.toml` `verify_jwt=true`; `REVOKE EXECUTE ON search_mentor_memories FROM PUBLIC,anon,authenticated` | S | YES |
| P0-3 | P0 | Paywall bypass: self-insert active premium membership | RLS `user_insert_own_memberships` `supabase/migrations/20260509120000_membership_activation_fix.sql:124-128` | Drop policy; memberships only via SECURITY DEFINER RPC (post code-redeem) or RevenueCat webhook or admin; client read-only | S | YES |
| P0-4 | P0 | Paywall bypass: self-set `subscription_tier=premium_plus` | Same policy as P0-1 (`...20260509120000...:170-175`); tier read for gating `lib/admin/actions.ts:41-47,61`; realtime on profiles `...20260506100000_subscription_tier.sql:50` | Same column-write restriction as P0-1; tier only via RPC/webhook | S (with P0-1) | YES |
| P0-5 | P0 | `access_codes` readable+writable by any authenticated user | RLS `authenticated_select_access_codes` + `authenticated_update_access_codes_uses USING(true) WITH CHECK(true)` `supabase/migrations/20260509120000_membership_activation_fix.sql:56-68` | Drop both; redemption only via existing `redeem_access_code()` RPC `...20260509100000...:19-66`; remove client SELECT/UPDATE on `access_codes` | S | YES |

## P1 — MITIGATE BEFORE LAUNCH (8)

| # | Severity | Title | Evidence (file:line) | Fix | Effort | Blocks launch |
|---|----------|-------|----------------------|-----|--------|---------------|
| P1-1 | P1 | Paid LLM API keys shipped to clients (financial DoS) | `app/config/env.ts:10-16`; client LLM calls `lib/mentor.ts:664,672,682` | Proxy all LLM calls via Edge Function holding keys server-side + auth + rate/spend limits; remove `EXPO_PUBLIC_NVIDIA/GROQ/OPENAI` | L | Strongly recommended |
| P1-2 | P1 | `smart-notifications` Edge Function has no auth | `supabase/functions/smart-notifications/index.ts:1436-1551` | Require service-role for sweep; JWT+`user===user_id` (or service-role) for single user | S | YES (abuse vector) |
| P1-3 | P1 | `sync-wearables` batch + single-user paths have no auth | `supabase/functions/sync-wearables/index.ts:2114,2142-2145` (only `connect` checks JWT `:2094-2098`) | Require service-role for `batch`; JWT+`user===user_id` for single-user sync | S | YES (abuse vector) |
| P1-4 | P1 | Admin RPCs trust client-supplied `p_admin_id` | `supabase/migrations/20260504200000_cmi_corrective.sql:139-208`; dup `...20260504000000...:154-207`, `...20260509100000...:69-108` | Drop `p_admin_id`; check `auth.uid()` is_admin inside function | S | YES |
| P1-5 | P1 | Views bypass RLS → leak all users' data | `wearable_baseline` `supabase/migrations/20260506000000_biometrics_engine.sql:126-138`; `user_progress` `...20260428155503...:159-179`; no `security_invoker` in repo | Recreate views `WITH (security_invoker=true)` or revoke `authenticated` SELECT + use scoped RPCs | S | YES |
| P1-6 | P1 | `b2b_organizations` / `org_members` have RLS disabled | `supabase/migrations/20260501000000_auraos_extensions.sql:45-61` (no ENABLE RLS / no policy) | `ENABLE ROW LEVEL SECURITY` + scoped policies, or drop tables / revoke grants if B2B not shipping | S | YES |
| P1-7 | P1 | Wearable OAuth tokens stored in plaintext | `supabase/migrations/20260506000000_biometrics_engine.sql:17-18`; written `sync-wearables/index.ts:2033-2042,2067-2076`; admin can read whole row `...:117-123` | Encrypt with Vault/pgsodium or isolate in non-PostgREST schema; exclude token cols from admin read | M | Recommended |
| P1-8 | P1 | No web security headers / no CSP (XSS → session JWT theft) | `vercel.json:6-65` (only Cache-Control); session in localStorage `lib/supabase.ts:17-39` | Add strict CSP, HSTS, X-Frame-Options/frame-ancestors:none, X-Content-Type-Options, Referrer-Policy, Permissions-Policy in `vercel.json` | M | Recommended |

## P1 — Process/correctness adjacent (track with above)

| # | Severity | Title | Evidence | Fix | Effort |
|---|----------|-------|----------|-----|--------|
| P1-9 | P1 | Registration consumes code via non-atomic client UPDATE (race, relies on P0-5 policy) | `app/(auth)/index.tsx:108-149` | Use `redeem_access_code()` RPC after signup; bind `(code_id,user_id)` in `access_code_uses` | S |
| P1-10 | P1 | Admin authz is client-side only; admin writes succeed for non-admins due to P0-3/P0-5 | `app/admin/_layout.tsx:114-162`; `lib/admin/actions.ts:104-119,313-327` | Fix P0-1/3/5; route admin mutations through `auth.uid()`-checked RPCs | M |

## Required live verifications (cannot confirm from code alone)

| Item | Why it matters | Where |
|------|----------------|-------|
| Which migrations are actually applied to prod DB | Determines which permissive policies are live | Supabase SQL editor: `SELECT * FROM pg_policies WHERE schemaname='public';` |
| `verify_jwt` setting per Edge Function (no `config.toml` in repo) | If `false`, P0-2/P1-2/P1-3 are reachable with **no** token at all | Supabase Dashboard → Edge Functions |
| `EXECUTE` grants on `search_mentor_memories` | Default PUBLIC EXECUTE on this SECURITY DEFINER fn = direct P0 | `\df+ search_mentor_memories` |
| Anonymous auth provider enabled? | If on, `signInAnonymously` dev path + anon abuse possible | Dashboard → Auth → Providers |
| Production web bundle scanned for real LLM keys | Confirms P1-1 exposure in the shipped artifact | `curl` the deployed `*.js`, grep `sk-`/`gsk_`/`nvapi-` |
| Anon/authenticated table grants on `b2b_organizations`, `community_posts` | Confirms read/write exposure scope | `\dp public.b2b_organizations` |

## Suggested fix order (fastest risk reduction)

1. **P0-1 + P0-4** (one column-write fix kills both escalation + tier bypass).
2. **P0-5** then **P1-9** (lock down `access_codes`, fix registration).
3. **P0-3** (drop self-insert membership policy).
4. **P0-2** (+ P1-4, P1-5 — all server-authz / SECURITY DEFINER hygiene; do together).
5. **P1-2 + P1-3** (Edge Function auth — copy `calculate-intelligence` pattern).
6. **P1-6** (enable RLS on B2B), **P1-8** (headers/CSP), **P1-7** (encrypt tokens).
7. **P1-1** (move LLM server-side) — largest effort; start in parallel.
