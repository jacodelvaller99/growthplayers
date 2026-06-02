# ENV & SECRET MATRIX — Polaris / LifeFlow

> Owner: Release Operations (Team 6). Last updated: 2026-06-02.
> Sources of truth in repo: `app/config/env.ts`, `lib/supabase.ts`, `lib/wearables.ts`, `.env.example`, `supabase/functions/**`, `eas.json`, `vercel.json`.
>
> **How to read "Status":**
> - `repo: …` = what the repo evidence shows (a value committed, a placeholder, or a reference).
> - `prod: VERIFY` = cannot be confirmed from the repo; **must be checked in the live dashboard** (Vercel / EAS / Supabase) before launch.
>
> **Golden rule (already correct in this repo):** `EXPO_PUBLIC_*` vars are **inlined into the client bundle at build time** — they are *public* and visible to anyone. Anything truly secret (service role, OAuth client secrets, embeddings key) must be a **server-side** var (Supabase Edge secret or EAS/Vercel build env that is NOT `EXPO_PUBLIC_*`) and must **never** be referenced from client code.

---

## 1. Where each surface gets its env

| Surface | Mechanism | Set where |
|---|---|---|
| **Native app (iOS/Android)** | `EXPO_PUBLIC_*` inlined at `eas build` time | EAS build environment (`eas env` / EAS dashboard / `.env` resolved at build). |
| **Web (PWA)** | `EXPO_PUBLIC_*` inlined at `npx expo export --platform web` time | **Vercel → Project → Settings → Environment Variables** (build-time). |
| **Edge Functions (Deno)** | `Deno.env.get(...)` at runtime | **Supabase → Project → Edge Functions → Secrets** (`supabase secrets set`). |
| **pg_cron jobs** | `current_setting('app.*')` | Postgres DB settings: `ALTER DATABASE postgres SET app.supabase_url=…` / `app.service_role_key=…`. |
| **Local dev** | `.env` / `.env.local` (gitignored) | Developer machine only. |

Git hygiene (verified): only `.env.example` is tracked. `.env`, `.env.local`, `google-service-account.json`, `*.p8/.p12/.jks/.key` are all gitignored and **not** committed. ✅

---

## 2. Master matrix

Legend — **Public/Secret**: `PUBLIC` = safe to expose (inlined in client) · `SECRET` = must stay server-side.
**Status**: `SET` (evidence it's configured) · `MISSING` (referenced but empty/placeholder) · `PENDING` (intentionally not yet provisioned) · `VERIFY` (must confirm in dashboard).

### 2a. Client — `EXPO_PUBLIC_*` (app + web)

| Var | Used in (file) | Surface | Dev | Prod | Pub/Sec | Status |
|---|---|---|---|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `lib/supabase.ts:7`, `hooks/use-lifeflow.tsx:311` | app + web | ✓ | ✓ | PUBLIC | repo `.env.local` placeholder `your-project`; real ref is `bizbbtiyftfjufxinwsu`. **prod: VERIFY** it's the real URL in Vercel + EAS (placeholder triggers anon dev-bypass). |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase.ts:8` | app + web | ✓ | ✓ | PUBLIC (anon, RLS-protected) | **prod: VERIFY** in Vercel + EAS. |
| `EXPO_PUBLIC_GROQ_API_KEY` | `app/config/env.ts:13` → `lib/groq.ts` | app + web | opt | ✓ (≥1 AI key) | PUBLIC ⚠ | **VERIFY**. ⚠ Inlined → harvestable from the web bundle. See risk note §4. |
| `EXPO_PUBLIC_NVIDIA_API_KEY` | `app/config/env.ts:10` → `lib/nvidia.ts` | app + web | opt | ✓ (primary) | PUBLIC ⚠ | **VERIFY**. Same harvest risk. |
| `EXPO_PUBLIC_OPENAI_API_KEY` | `app/config/env.ts:16` → `lib/openai.ts` | app + web | opt | opt (fallback) | PUBLIC ⚠ | **VERIFY**. Same harvest risk. |
| `EXPO_PUBLIC_REVENUECAT_KEY` | `app/config/env.ts:19` → `services/revenuecat.ts` | app (iOS) | opt | ✓ (native) | PUBLIC (RC SDK key is publishable) | **VERIFY** in EAS. `.env.example` notes a separate `_ANDROID` key is needed for Android. |
| `EXPO_PUBLIC_REVENUECAT_KEY_ANDROID` | (commented in `.env.example:39`) | app (Android) | — | ✓ if Android paid | PUBLIC | **MISSING/PENDING** — needed for Android subscriptions; confirm Android RC key. |
| `EXPO_PUBLIC_OURA_CLIENT_ID` | `lib/wearables.ts:30` | app + web | opt | opt | PUBLIC | empty in `.env.example`. **PENDING** — wearables OAuth (see §3). |
| `EXPO_PUBLIC_WHOOP_CLIENT_ID` | `lib/wearables.ts:40` | app + web | opt | opt | PUBLIC | empty in `.env.example`. **PENDING**. |
| `EXPO_PUBLIC_APP_URL` | (read by Edge `sync-wearables` as `Deno.env.get('EXPO_PUBLIC_APP_URL')` :459/:493) | web/redirect | opt | ✓ if wearables | PUBLIC | `.env.example` → `https://growthplayers.vercel.app`. **VERIFY** matches the real prod domain (used to build OAuth redirect URLs). |
| `EXPO_PUBLIC_DEV_MODE` | declared in `.env.local` only — **not read anywhere in code** (grep: 0 refs) | — | (noise) | must be absent/false | — | **DEAD VAR.** Real dev bypass is gated on placeholder `SUPABASE_URL`, not this flag (`hooks/use-lifeflow.tsx:312`). Recommend deleting to avoid false confidence. |
| `EXPO_PUBLIC_OPENAI_KEY` | declared in `.env.local` — **not read in app code** (only `_API_KEY` variant is) | — | (noise) | n/a | — | **DEAD VAR** (legacy naming). Ignore; remove. |

### 2b. Server — Supabase Edge Function secrets (`Deno.env.get`)

| Secret | Used in (file) | Pub/Sec | Required for | Status |
|---|---|---|---|---|
| `SUPABASE_URL` | `_shared/supabase.ts:8`, `sync-wearables:22` | (auto-injected by Supabase runtime) | all Edge fns | **SET by platform** — Supabase injects this automatically; usually no manual action. VERIFY. |
| `SUPABASE_SERVICE_ROLE_KEY` | `_shared/supabase.ts:9`, `calculate-intelligence:464`, `ml-dashboard:24`, `sync-wearables:23` | **SECRET (full DB, bypasses RLS)** | all Edge fns + cron | **CRITICAL — VERIFY** set as Edge secret. Auto-injected by Supabase for functions; for **pg_cron** it must ALSO be set as DB setting `app.service_role_key`. Highest-value secret in the system. |
| `OPENAI_API_KEY` | `generate-embeddings:18` | **SECRET** | mentor vector memory (embeddings) | **VERIFY** `supabase secrets set OPENAI_API_KEY=…`. If missing → embeddings 500 and `retry-failed-embeddings` cron loops every 15 min. |
| `OURA_CLIENT_ID` | `sync-wearables:18` | (id is low-sensitivity) | wearable sync | **PENDING** (Oura app not yet provisioned per `.env.example`). |
| `OURA_CLIENT_SECRET` | `sync-wearables:19` | **SECRET** | wearable OAuth token exchange | **PENDING**. |
| `WHOOP_CLIENT_ID` | `sync-wearables:20` | (id) | wearable sync | **PENDING**. |
| `WHOOP_CLIENT_SECRET` | `sync-wearables:21` | **SECRET** | wearable OAuth token exchange | **PENDING**. |
| `ANTHROPIC_API_KEY` | declared in `.env.example:32` — **no current code reference** | SECRET | (future "Claude directo") | **OPTIONAL/UNUSED** today. Set only if a feature needs it. |

### 2c. Server — Postgres DB settings (for pg_cron → pg_net calls)

| Setting | Used in | Pub/Sec | Status |
|---|---|---|---|
| `app.supabase_url` | all cron jobs (`20260502000001_cron_jobs.sql`, `20260506000001_wearables_cron.sql`) | internal | **VERIFY** `ALTER DATABASE postgres SET app.supabase_url='https://bizbbtiyftfjufxinwsu.supabase.co';`. Without it, every scheduled job fails silently. |
| `app.service_role_key` | all cron jobs | **SECRET** | **VERIFY** set via `ALTER DATABASE … SET app.service_role_key=…`. Migration explicitly warns NOT to hardcode it in SQL — prefer Vault. |
| `pg_cron` extension | cron migrations | — | **VERIFY enabled** (Dashboard → Database → Extensions). |
| `pg_net` extension | cron migrations | — | **VERIFY enabled** (default on in Supabase). |

### 2d. Build / submit secrets (CI-equivalent, local today)

| Secret / file | Used in | Pub/Sec | Status |
|---|---|---|---|
| `app.json` `extra.eas.projectId` | EAS build association | internal | **PLACEHOLDER** `0000…0000` in repo → **MISSING**. Run `eas init` to set a real UUID before any `eas build`. |
| EAS credentials (iOS dist cert / provisioning, Android keystore) | `eas build`/`submit` | **SECRET** | **VERIFY** in EAS (recommend EAS-managed credentials; nothing in repo — correct). |
| `google-service-account.json` | `eas.json` `submit.production.android` | **SECRET** | **MISSING from repo (correct)** — must exist locally at submit time (Play Console service account). |
| Apple App-specific password / ASC API key | `eas submit` iOS (`appleId` set in `eas.json`) | **SECRET** | **VERIFY** available at submit time. |
| `SUPABASE_ACCESS_TOKEN` (`sbp_…`) | `supabase functions deploy` / `db push` (CLI auth) | **SECRET** | **VERIFY** present in the deploy operator's env (`.env.example:58`). |
| Vercel project env vars (the §2a `EXPO_PUBLIC_*` set) | Vercel web build | mixed | **VERIFY** — this is the #1 thing to confirm in the Vercel dashboard; an empty AI key here = mentor demo-mode in prod. |

---

## 3. Wearables (Oura / WHOOP) — explicitly PENDING

The full OAuth plumbing exists in code (`lib/wearables.ts`, `supabase/functions/sync-wearables/index.ts`, `20260506000001_wearables_cron.sql`, biometric migrations), but **every Oura/WHOOP credential is empty/placeholder** in `.env.example` and there is no evidence they are provisioned.

**Launch decision required:** either (a) provision Oura + WHOOP developer apps and set the 6 vars (2 public client IDs + 4 server id/secret) before launch, or (b) **descope wearables for v1.0.0** — hide the connect UI so users don't hit a dead OAuth flow. Recommendation: **(b) descope** unless the credentials are confirmed live during the freeze. The `sync-all-wearables` cron will no-op harmlessly with no connections, but a visible-but-broken "Connect Oura" button is a bad first impression.

---

## 4. Risk notes (honest)

1. **AI keys are client-inlined (`EXPO_PUBLIC_*`).** On **web** especially, `EXPO_PUBLIC_GROQ/NVIDIA/OPENAI_API_KEY` are extractable from the JS bundle by anyone. This is a real cost/abuse exposure (someone can pull your key and bill your account). Proper fix: proxy AI calls through an Edge Function so the keys live server-side. If shipping as-is for launch: use **restricted, low-quota keys**, monitor provider spend daily, and be ready to rotate (rotation requires a rebuild+redeploy since the value is baked in).
2. **No staging project.** All Edge secrets and DB settings are configured on the single prod project `bizbbtiyftfjufxinwsu`. There is no place to test secret/migration changes safely. Treat every `supabase secrets set` and `db push` as a production change.
3. **Placeholder values still in committed dotfiles.** `.env.local` carries `your-project.supabase.co` and `EXPO_PUBLIC_DEV_MODE=true`. These are gitignored and harmless to git, but they are a trap: if anyone copies `.env.local` into a build env, the app silently enters anonymous dev-bypass. Make the freeze step (RELEASE_RUNBOOK §2) verify the **real** URL in every build environment.
4. **Service role key fan-out.** The same `SUPABASE_SERVICE_ROLE_KEY` is used by 4 Edge functions *and* stored as a DB setting for cron. One leak = total DB compromise. Keep it only in Supabase secrets + DB setting; never in client env, never in the repo. (Currently correct.)

---

## 5. Pre-launch action list (env/secrets only)

- [ ] Set real `app.json` `extra.eas.projectId` (`eas init`).
- [ ] Vercel: confirm all `EXPO_PUBLIC_*` (Supabase URL/anon + ≥1 AI key + APP_URL) are set to **production** values.
- [ ] EAS: confirm the same client vars + RevenueCat key(s) in the build env.
- [ ] Supabase secrets: confirm `OPENAI_API_KEY` (embeddings); service role auto-injected; Oura/WHOOP if in scope.
- [ ] DB: `app.supabase_url` + `app.service_role_key` set; `pg_cron` + `pg_net` enabled.
- [ ] Provide `google-service-account.json` locally for Android submit; Apple ASC credentials for iOS.
- [ ] Decide wearables: provision all 6 Oura/WHOOP vars **or** descope the connect UI.
- [ ] Remove dead vars (`EXPO_PUBLIC_DEV_MODE`, `EXPO_PUBLIC_OPENAI_KEY`) from dotfiles to avoid confusion.
- [ ] Confirm AI keys are restricted/low-quota and you can see provider spend (web inlining risk).
