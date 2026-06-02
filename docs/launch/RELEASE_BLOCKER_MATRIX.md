# RELEASE BLOCKER MATRIX — Polaris / LifeFlow

**Only the flows/tests whose failure BLOCKS launch are listed here.** Each row cites the concrete risk found in code (`file:line`). If any blocker below is unresolved or unverified, **do not ship**.

Legend — **Status**: 🔴 confirmed defect in code · 🟠 high-risk, needs runtime verification · ⚪ depends on infra/config not visible in repo (must be checked manually).

---

## BLOCKER-01 — AI mentor can hang forever (no timeout / no cancel)

- **Flow:** M3, MT5, R5, R10 — every chat send and every "Generar con Norman".
- **Status:** 🔴 confirmed.
- **Evidence:**
  - No `AbortController`/`setTimeout`/`signal` anywhere in `lib/nvidia.ts`, `lib/groq.ts`, `lib/openai.ts`, `lib/mentor.ts` (grep returned zero matches).
  - `app/(tabs)/mentor.tsx:344` sets `setIsStreaming(true)`; input is `editable={!isStreaming}` (`mentor.tsx:694`) and send button `disabled={isStreaming}` (`mentor.tsx:705`). There is no cancel control.
  - `lib/groq.ts:29` `fetch` has no `signal`; `parseSSEStream` reads the body until the server closes it.
- **Failure mode:** On a *stalled* (not dropped) connection — common on mobile networks — the stream never resolves or rejects. The chat is permanently frozen: user cannot type, cannot send, cannot cancel. Only force-quitting the app recovers. Same root cause freezes the mentoría plan generator (`use-mentorship.tsx:150`, spinner via `generating`).
- **Fix before launch:** wrap each provider `fetch` in an `AbortController` with a hard timeout (e.g. 30 s) and an idle-chunk watchdog; add a "Detener" button that aborts and restores input; on abort/timeout, surface a retry.

---

## BLOCKER-02 — AI provider API keys shipped in the web bundle

- **Flow:** M17 (security).
- **Status:** 🔴 confirmed.
- **Evidence:** `app/config/env.ts:10-16` reads `EXPO_PUBLIC_NVIDIA_API_KEY`, `EXPO_PUBLIC_GROQ_API_KEY`, `EXPO_PUBLIC_OPENAI_API_KEY`. `EXPO_PUBLIC_*` vars are inlined at build time. They are used directly in client fetches (`lib/groq.ts:33` `Authorization: Bearer ${ENV.groqApiKey}`).
- **Failure mode:** Anyone who opens DevTools on the deployed web app (Vercel) can read the raw Groq/OpenAI keys from the JS bundle and drain your quota / run up cost. This is a credential-exposure incident waiting to happen at launch.
- **Fix before launch:** proxy AI calls through a Supabase Edge Function (server-side key), as is already done for `sync-wearables`/`delete-account`. At minimum, restrict keys by referrer/usage caps and rotate immediately after any public deploy.

---

## BLOCKER-03 — Wearable daily query is not user-scoped (RLS-dependent data leak)

- **Flow:** B12.
- **Status:** 🟠 high-risk (depends on whether RLS is correctly enforced on the table).
- **Evidence:** `lib/wearables.ts:174-178` — `supa.from('wearable_daily').select('*').gte('date', startDate).order('date',...)`. No `.eq('user_id', ...)` filter. Same pattern in `useWearableTimeseries` (`wearables.ts:209-213`) and `useWearableConnections` (`wearables.ts:138-142`, filters only `is_active`).
- **Failure mode:** If Row-Level Security on `wearable_daily` / `wearable_timeseries` / `wearable_connections` is missing or misconfigured, every user receives **all users'** biometric rows (HRV, resting HR, sleep). The client provides zero defense. This is a GDPR/health-data breach.
- **Fix before launch:** add explicit `.eq('user_id', session.user.id)` to all wearable queries **and** verify RLS policies exist and deny cross-user reads. Run the manual RLS test (query as user A while authed as user B → expect 0 rows).

---

## BLOCKER-04 — Password reset is likely dead on web

- **Flow:** A10.
- **Status:** 🟠 high-risk (needs runtime confirmation).
- **Evidence:**
  - `lib/supabase.ts:49` `detectSessionInUrl: false` — Supabase will NOT parse the recovery token that arrives in the URL hash after the user clicks the reset email link.
  - `app/(auth)/index.tsx:162-183` only *sends* the reset email (`resetPasswordForEmail`). There is **no screen** that consumes a `type=recovery` session and lets the user set a new password (grep for a reset/update-password handler finds none in `app/`).
- **Failure mode:** A web user who forgets their password requests the email, clicks the link, lands back in the app, and nothing happens — no "set new password" UI, token unconsumed. They are locked out with no self-service recovery. On a password-gated product this generates immediate support load and churn at launch.
- **Fix before launch:** either set `detectSessionInUrl: true` on web + add an update-password screen that runs on the `PASSWORD_RECOVERY` auth event, or implement a dedicated recovery route.

---

## BLOCKER-05 — `userId` is a ref read; consumers can see a stale `null`

- **Flow:** AD3, N6, and any `useEffect([userId])` consumer (intelligence, weekly-session, smart-notifications, admin guard).
- **Status:** 🔴 confirmed (architectural).
- **Evidence:** `hooks/use-lifeflow.tsx:962` exposes `userId: uidRef.current` inside the context value. `uidRef` is a `useRef` (`use-lifeflow.tsx:332`); mutating `uidRef.current` does **not** trigger a re-render. The context value only updates when the provider re-renders for another reason (e.g. `setIsAuthenticated`). Auth restoration sets the ref in `init()` and `onAuthStateChange` (`use-lifeflow.tsx:368,455`).
- **Failure mode:** On cold start / deep link, a consumer's first effect run can read `userId === null` and make a terminal decision. Worst case is the **admin guard**: `admin/_layout.tsx:122-123` does `if (!userId) { setIsAdmin(false); return; }` and only re-runs when `userId` changes — but a ref change may not propagate, so a legitimate admin can be locked out of `/admin` until a manual reload. Same staleness silently delays smart-notifications polling (`use-smart-notifications.ts:13`) and weekly-session generation (`comando.tsx:61-67`).
- **Fix before launch:** store `userId` in React state (`useState`) and `setUserId` alongside the ref, so context consumers re-render on auth changes. Then re-verify AD3/N6.

---

## BLOCKER-06 — Account deletion partial-failure / verification

- **Flow:** A15, A16.
- **Status:** 🟠 needs verification (GDPR-critical).
- **Evidence:** `hooks/use-lifeflow.tsx:892-900` invokes `delete-account` edge fn; on error it throws and the UI shows an alert (`progreso.tsx:536-541`) but the user stays logged in. The edge fn exists (`supabase/functions/delete-account/index.ts`) but its atomicity (auth user + all tables + storage) is not verifiable from the client.
- **Failure mode:** A GDPR "delete my account" that half-completes (e.g. auth user deleted but rows remain, or vice-versa) is both a compliance failure and a corrupt-state bug. If the local cache is cleared but the server delete failed, the next login rehydrates "deleted" data.
- **Fix before launch:** verify the edge function deletes auth user + every user-scoped table + wearable tokens transactionally, returns a clear success contract, and that the client only clears local state on confirmed success. Add an end-to-end deletion test.

---

## BLOCKER-07 — Core loop offline writes are silently lost

- **Flow:** C3, P8, R6 — daily check-in, lesson completion, north-star edits.
- **Status:** 🔴 confirmed (data-integrity).
- **Evidence:** Every Supabase write in the provider is `try { ... } catch (e) { console.warn(...) }` with the local state already updated optimistically: `saveCheckIn` (`use-lifeflow.tsx:595-611`), `markLessonComplete` (`use-lifeflow.tsx:729-741`), `saveLessonTask` (`698-712`), `updateNorthStar` (`559-569`), `addMentorMessages` (`667-674`). There is no write queue and no "failed to sync" signal to the UI.
- **Failure mode:** A user does their daily check-in offline (or while the token is silently expired). The UI confirms success and navigates away. The row never reaches Supabase. On reinstall or a second device, the data is gone — and the streak (a core retention mechanic) is silently broken. The `OfflineBanner` warns about connectivity but the writes themselves give no feedback.
- **Fix before launch:** queue failed mutations for retry (or block submit when offline with a clear message), and surface a per-item "not synced" state. At minimum, do not navigate away on a write that failed.

---

## BLOCKER-08 — Web subscription is impossible (revenue + UX)

- **Flow:** S7.
- **Status:** 🟠 confirm intended.
- **Evidence:** `app/paywall.tsx:55-61` — on web, purchase shows an alert "Para suscribirte descarga la app en iOS o Android." RevenueCat is a no-op on web by design (`services/revenuecat.ts:28,40`).
- **Failure mode:** Web/PWA is a first-class platform in this app (desktop sidebar, full theming), but a web user can **never** upgrade. They hit the mentor gate at message 3 (`mentor.tsx:296`) and the paywall is a dead end. If web is a launch channel, this is a hard revenue blocker and a confusing UX (CTA that can't complete).
- **Fix before launch:** decide explicitly — either add a web checkout (Stripe) path, or clearly message web users to use mobile *before* they hit the gate, and remove the non-functional purchase CTA on web.

---

## BLOCKER-09 — Admin Mission Control can spin forever on any query failure

- **Flow:** AD5.
- **Status:** 🔴 confirmed.
- **Evidence:** `app/admin/index.tsx:127-140` — `loadData` does `Promise.all([fetchDashboardKPIs(), fetchLiveEvents(10), fetchTierCounts()])` with **no** `.catch`. If any of the three rejects (missing view, RLS, network), the promise rejects, `setLoading(false)` never runs, and the screen is stuck on the spinner (`admin/index.tsx:164-171`). It is also an unhandled promise rejection.
- **Failure mode:** A single missing admin DB view/migration bricks the entire admin dashboard with an infinite loader and no error. Admins cannot operate the product on launch day.
- **Fix before launch:** wrap `loadData` in try/catch, render an error state, and ensure `loading` is always cleared in a `finally`.

---

## BLOCKER-10 — Anonymous dev-bypass must not be reachable in production

- **Flow:** A18.
- **Status:** ⚪ config-dependent (verify the prod build).
- **Evidence:** `hooks/use-lifeflow.tsx:311-312,362-365` — when `IS_PLACEHOLDER_URL` (Supabase URL contains `your-project` or is empty), the app calls `supabase.auth.signInAnonymously()` and treats the user as authenticated, bypassing login entirely.
- **Failure mode:** If a production build ships with a missing/placeholder `EXPO_PUBLIC_SUPABASE_URL` (or the var fails to inline on Vercel), every visitor is silently signed in as an anonymous user with full app access and writes — no auth at all. Given that `lib/mentor.ts:644` and `saveMentorMessage` also branch on `ENV.isDev`, an env misconfig at build time has outsized blast radius.
- **Fix before launch:** assert at boot that the Supabase URL is real in production (fail fast / show a config error), and confirm the deployed bundle does not include the placeholder branch path. Verify on the actual Vercel deploy.

---

## Secondary blockers to confirm (S1 — ship only with a hotfix plan)

These are not in the top-10 but must be triaged before sign-off:

| ID | Flow | Risk (file:line) | Why it may block |
|----|------|------------------|------------------|
| SB-1 | A3 | Access-code redemption is read-then-write, non-atomic (`app/(auth)/index.tsx:111-149`) | Limited codes over-redeem under concurrency; paid-access integrity |
| SB-2 | B3 | Native OAuth redirect scheme mismatch (`lib/wearables.ts:23`, `app/perfil/wearables.tsx:434`) | Wearable connect may never succeed on device |
| SB-3 | B7 | OAuth `state` generated but never validated (`wearables.tsx:46`; callbacks ignore it) | CSRF on token exchange |
| SB-4 | S9/S10 | `isSubscribed` (RC) vs `subscriptionTier` (DB) divergence; no client expiry check (`mentor.tsx:296`, `use-lifeflow.tsx:266`) | Wrong gating: paying users blocked or expired users retained |
| SB-5 | M6 | On stream error the pending user message is dropped with no retry (`mentor.tsx:458-466`) | User's typed message silently vanishes |
| SB-6 | AD2 | Admin fallback hardcodes owner UUIDs in client (`admin/_layout.tsx:132-138`) | Brittle privilege grant; UUIDs leak in bundle |
| SB-7 | T5/boot | Fonts skipped entirely on web; 4 s blind timeout (`app/_layout.tsx:141-170`) | If anything else throws during boot, white screen risk |

---

## Go / No-Go rule

**No-Go** if any of BLOCKER-01, -02, -03, -05, -07, -09, -10 remains unfixed (these are confirmed code defects with launch-day blast radius). BLOCKER-04, -06, -08 require an explicit product decision + verification before Go.
