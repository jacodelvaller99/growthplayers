# RELEASE RUNBOOK — Polaris / LifeFlow

> Owner: Release Operations (Team 6). Last updated: 2026-06-02.
> Repo: `github.com/jacodelvaller99/growthplayers` · Expo SDK 54 (RN 0.81.5) · Supabase ref `bizbbtiyftfjufxinwsu` · Vercel (web) · EAS (native).
>
> **Status of this runbook vs. reality:** This describes the *target* release discipline. Several controls it assumes (CI gate, staging project, Sentry, release tags) **do not yet exist** in the repo — they are flagged inline as `⚠ GAP`. Read the "Pre-flight: what is missing" section before the first real release.

---

## 0. Pre-flight: what is missing today (read first)

Evidence pulled from the repo, not aspiration:

| Control | Expected | Actual in repo | Impact on release |
|---|---|---|---|
| CI / CD | `.github/workflows/*` | **Absent** — no `.github/` dir | Every build, test, lint, deploy is manual on a laptop. No automated gate before `main` → Vercel. |
| Crash monitoring | Sentry/Bugsnag in app + Edge | **None** (grep: zero matches) | A production crash is invisible unless a user reports it. No stack traces, no release health. |
| JS ErrorBoundary | Root boundary in `app/_layout.tsx` | **None** | An uncaught render error white-screens the whole app with no recovery. |
| Staging environment | Separate Supabase project / Vercel preview env | **None** — one Supabase project, prod-only | No safe place to rehearse migrations or smoke a build against real infra. |
| Release versioning | Git tags / changelog | **No tags** (`git tag` empty), single `main` | Cannot identify "what shipped" or roll back to a known-good commit by tag. |
| EAS projectId | Real UUID in `app.json` `extra.eas.projectId` | **Placeholder** `00000000-…-000000000000` | `eas build` will fail / not associate with a project until this is set via `eas init`. |
| Edge Function alerting | Aggregated logs + alerts | `console.log/error` only → Supabase dashboard | 500s are only findable by manually scrolling function logs. |
| Vercel env vars | `EXPO_PUBLIC_*` configured in Vercel project | **Cannot verify from repo** — must be checked in Vercel dashboard (see ENV_AND_SECRET_MATRIX.md) | If web build inlines empty AI keys, mentor silently runs in demo/simulation mode in production. |

**Verdict:** The product is feature-rich and visually mature, but the *release machinery* is at an early/manual stage. The procedures below are written to be runnable **manually and safely** in that state, and to be upgraded to automation later.

---

## 1. Branch & version strategy

Current reality: trunk-style on `main`, plus ad-hoc feature branches (`feature/lifeflow-admin-cierre`, `claude/*`). No tags.

**Adopt for launch:**

- `main` = always-releasable. Protected (enable branch protection in GitHub: require PR, no direct pushes).
- Feature work on `feature/*` or `claude/*`, merged via PR.
- **Release freeze:** create a release branch at cut time:
  ```bash
  git checkout main && git pull
  git checkout -b release/v1.0.0
  ```
  Only cherry-pick blocker fixes onto `release/*` during freeze. New features keep landing on `main` for the *next* release.
- **Tag every shipped build** (this is new — start now):
  ```bash
  git tag -a v1.0.0 -m "Launch build — web + iOS + Android"
  git push origin v1.0.0
  ```
  The tag is the rollback anchor. Web rollback = redeploy this tag; native rollback = phased-release halt + resubmit prior tag.

**Version bumping:**
- `app.json` `expo.version` is the user-facing marketing version (currently `1.0.0`).
- iOS/Android native build numbers: EAS `production` profile has `"autoIncrement": true` — EAS manages the build/version code. Do **not** hand-edit build numbers for production.
- Bump `expo.version` manually on each user-facing release and keep it equal to the git tag.

---

## 2. Freeze checklist (T-minus, before cutting the release branch)

Run from the worktree root. All must pass.

```bash
# 1. Clean tree, correct branch
git status            # must be clean
git checkout main && git pull

# 2. Dependencies (peer-dep conflict requires the flag — see CLAUDE.md / vercel.json)
npm install --legacy-peer-deps

# 3. Static quality gates
npx tsc --noEmit      # TypeScript — zero errors required
npm run lint          # expo lint — zero errors required
npm test              # Jest unit+integration (testMatch: __tests__/(unit|integration))

# 4. Web build must succeed locally (this is exactly what Vercel runs)
npx expo export --platform web   # outputs dist/ — must complete without error
```

> ⚠ GAP: there is no CI running these on PR. Until that exists, **this step is the gate** and a human must run and eyeball all four. Do not cut a release if any fails.

**Config freeze verification (manual, high-value — these have bitten this project's config):**
- [ ] `app.json` → `extra.eas.projectId` is a **real UUID**, not the `0000…` placeholder. If still placeholder, run `eas init` first.
- [ ] `.env.local` (local) and **Vercel env vars** (web) point to the **production** Supabase URL `https://bizbbtiyftfjufxinwsu.supabase.co` — not `your-project.supabase.co`. (If URL is a placeholder, the app silently `signInAnonymously()` as a dev bypass — see `hooks/use-lifeflow.tsx:362`. That must NOT happen in prod.)
- [ ] At least one AI key (`EXPO_PUBLIC_GROQ_API_KEY` / `NVIDIA` / `OPENAI`) is set in the web (Vercel) and EAS build env. With none, mentor falls back to canned dev simulation (`lib/mentor.ts:645` / `:688`) — functional but not real AI.
- [ ] Supabase Edge secrets are set in the **Supabase** project (not in client env): `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY` (embeddings), Oura/WHOOP client id+secret if wearables are in scope. Verify: `supabase secrets list`.
- [ ] All migrations applied to prod (`supabase db push` is current). pg_cron + pg_net extensions enabled, and `app.supabase_url` / `app.service_role_key` DB settings configured (cron jobs read them — `20260502000001_cron_jobs.sql`).

---

## 3. Build

### 3a. Web (primary launch surface — fastest to ship and roll back)

Web ships via Vercel on push to `main`/release tag. To build/inspect locally first:
```bash
npx expo export --platform web      # → dist/
```
Vercel config (`vercel.json`): `buildCommand = npx expo export --platform web`, `outputDirectory = dist`, `installCommand = npm install --legacy-peer-deps`, SPA rewrite `/(.*) → /index.html`. Long-cache on hashed `_expo/static` & `/assets`; `must-revalidate` on HTML/manifest/service-worker.

> Housekeeping: a stale `dist2/` exists in the repo root — ignore it; the live output is `dist/`. Both are gitignored.

### 3b. Native (iOS + Android via EAS)

Profiles in `eas.json`:
- `development` — dev client, internal, Android APK.
- `preview` — **internal distribution**, Android release APK, iOS internal (non-simulator). Use for TestFlight-style internal QA.
- `production` — Android **app-bundle (.aab)**, iOS **store** distribution, `autoIncrement: true`.

```bash
# Internal QA build (hand to testers before store submission)
eas build --profile preview --platform all

# Production store builds
eas build --profile production --platform all
# (or per-platform: --platform ios / --platform android)
```

Prereqs the first time: `eas login`, `eas init` (sets the real projectId in app.json), and EAS credentials configured (iOS signing, Android keystore). EAS-managed credentials are recommended so secrets never touch the repo.

---

## 4. Submit (native stores)

`eas.json` → `submit.production`:
- **iOS:** `appleId = ncapuozzo@polarisgrowthinstitute.com`. App Store Connect app must already exist with bundle id `com.polarisgrowthinstitute.lifeflow`. An app-specific password / API key is required at submit time.
- **Android:** `serviceAccountKeyPath = ./google-service-account.json`. ⚠ This file is **not in the repo** (correctly gitignored as a secret) — it must be present locally at submit time, downloaded from the Google Play Console service account. Confirm it exists before submitting.

```bash
eas submit --profile production --platform ios       # → TestFlight / App Store review
eas submit --profile production --platform android    # → Play internal/closed/production track
```

**Phased release (mandatory for native):**
- iOS: enable **Phased Release** in App Store Connect (7-day automatic ramp). This is the native kill-switch — pause the rollout if crashes spike.
- Android: use **staged rollout** (start 10–20%) on the production track.

Store metadata pre-checks: privacy policy URL (`https://polarisgrowthinstitute.com/privacidad`, declared in `app.json` `extra.privacyPolicyUrl`), data-safety / App Privacy forms (declare analytics + health/wearable data + AI processing), age rating, screenshots, and account-deletion disclosure (the `delete-account` Edge Function backs the in-app GDPR delete — Apple & Google both require this to be reachable).

---

## 5. Deploy (web via Vercel)

1. Merge the release branch / fast-forward `main` to the frozen, tagged commit.
2. Push `main` → Vercel auto-builds and deploys (no manual step).
3. **Promote to production** only after the smoke gate (§6) passes on the **Vercel Preview URL** for that deployment. Vercel gives every deployment a unique preview URL — smoke that first, then promote to the production domain. This is the closest thing to a staging gate that exists today.
4. Record the deployment: tag, commit SHA, Vercel deployment ID, timestamp, who promoted.

---

## 6. Smoke gate (GO/NO-GO test pass)

Run on the deployed Preview URL (web) and on the `preview`-profile build (native) **before** promoting / submitting. Manual — there is no automated smoke suite.

Critical path (a NO on any line = **NO-GO**):
- [ ] App loads (no white screen). Web: open the Preview URL cold + hard-refresh.
- [ ] **Auth:** register a brand-new account, log out, log back in. (Confirms prod Supabase URL/keys are wired and the dev anon-bypass is NOT active.)
- [ ] **Onboarding** wizard completes and persists (`onboardingCompleted` flips; relaunch keeps you in the app).
- [ ] **Daily check-in** submits and shows the Sovereign Score.
- [ ] **Mentor (Norman):** send a message → streamed response arrives. Confirm it is **real AI**, not the canned dev simulation (ask something specific; canned mode is generic). If canned → AI keys missing in build env (NO-GO for a real launch).
- [ ] **Programs/Lessons:** open a module, complete a lesson task, verify it persists.
- [ ] **Paywall:** trigger it (free-tier message limit / locked module). On native, confirm RevenueCat offerings load and a sandbox purchase unlocks.
- [ ] **Account deletion** (GDPR): the delete flow calls `delete-account` and returns ok (test on a throwaway account).
- [ ] No console errors of severity error on load (web devtools).

Edge/back-end smoke:
- [ ] `calculate-intelligence` returns 200 for a real user (analytics batch triggers it; check Supabase function logs for 2xx).
- [ ] `generate-embeddings` succeeds (mentor memory). If `OPENAI_API_KEY` Edge secret is missing → embeddings 500 and the `retry-failed-embeddings` cron will hammer it.
- [ ] If wearables are in scope: Oura/WHOOP OAuth round-trips and `sync-wearables` returns 200. If those OAuth secrets are pending, **descope wearables from the launch** rather than ship a broken connect button.

---

## 7. Rollback plan

No tags/CI today, so rollback is manual but fast on web.

**Web (Vercel) — fastest, do this first if web is the problem:**
- Vercel Dashboard → Deployments → select the last known-good deployment → **Promote to Production** (instant rollback, no rebuild).
- Or `git revert` the bad commit on `main` and push (triggers clean redeploy).
- Service worker caveat: clients may hold a cached SW. `vercel.json` already sets `service-worker.js` and HTML to `must-revalidate`, so a redeploy propagates on next load — but warn users to refresh if a bad SW shipped.

**Native (EAS / stores) — slow, cannot truly "roll back" a live binary:**
- iOS Phased Release / Android staged rollout: **halt the rollout** in the console immediately (this is the kill-switch). Users who haven't updated stay on the prior good version.
- To recover forward: fix → bump version → new `production` build → resubmit (expedited review for iOS if critical). There is no instant native rollback; the staged rollout halt is the only fast lever.

**Back-end / data:**
- **Edge Function:** redeploy the previous version: `supabase functions deploy <name>` from the prior tagged commit.
- **Database migration:** ⚠ there are **no down-migrations** in `supabase/migrations/`. A bad migration is not auto-reversible. Before any migration that touches prod, take a **Supabase PITR / manual backup** (Supabase Dashboard → Database → Backups) and write the reverse SQL by hand into a new forward migration. Treat schema changes as one-way and high-risk.
- **Kill-switch for runaway crons:** `SELECT cron.unschedule('<jobname>');` in the SQL editor to stop a misbehaving scheduled job (e.g. `retry-failed-embeddings` spamming a failing function). Job names are in `20260502000001_cron_jobs.sql` and `20260506000001_wearables_cron.sql`.
- **AI provider outage:** the mentor auto-degrades NVIDIA→Groq→OpenAI→canned simulation (`lib/mentor.ts`). No action needed; users still get responses (lower quality). If a *specific* provider key is leaked/abused, rotate it (client `EXPO_PUBLIC_*` keys require a rebuild+redeploy to remove — see ENV matrix).

---

## 8. GO / NO-GO decision

Convene Release Ops + product owner before promoting web / submitting native.

**GO requires ALL:**
- §2 freeze gates green (tsc, lint, test, web export).
- §6 smoke gate fully passing on the actual deployed artifact.
- Config freeze verified: real Supabase prod URL, real AI key(s) in build env, Edge secrets set, migrations applied, EAS projectId real.
- Rollback rehearsed at least mentally: who can promote a prior Vercel deploy / halt the store rollout, and how fast.
- An owner is on call for the launch window (see LAUNCH_DAY_COMMAND_CENTER.md).

**NO-GO triggers:**
- Mentor runs in canned simulation in prod (AI keys missing).
- Auth/register fails or the anonymous dev-bypass is active in prod.
- Any unreverted migration with no backup taken.
- Crash/white-screen on cold load.
- Wearable connect button present but OAuth secrets pending (descope instead).

**Strong recommendation before GO:** add a root **ErrorBoundary** and wire **Sentry** (or at minimum a global `ErrorUtils` handler that POSTs to a Supabase `client_errors` table). Launching with **zero crash visibility** means the first you'll hear of a production crash is from an angry user, not a dashboard. This is the single biggest operational risk for this launch.
