# LAUNCH DAY COMMAND CENTER — Polaris / LifeFlow

> Owner: Release Operations (Team 6). Last updated: 2026-06-02.
> Use alongside RELEASE_RUNBOOK.md (procedures), ENV_AND_SECRET_MATRIX.md (config), POST_LAUNCH_MONITORING.md (24/72h watch).
>
> **Reality check:** there is currently **no CI, no Sentry, no automated alerting**. Launch day is therefore a **human-driven, manual-watch operation**. This doc makes that explicit so nobody assumes a dashboard will page them — a person has to watch.

---

## 1. Roles & owners (fill in real names before launch)

| Role | Responsibility | Owner | Backup |
|---|---|---|---|
| **Launch Commander** | Final GO/NO-GO, calls rollback, owns the timeline | _____ | _____ |
| **Web Deploy Owner** | Vercel promote/rollback, smoke web | _____ | _____ |
| **Native Release Owner** | EAS builds/submit, halt staged rollout | _____ | _____ |
| **Backend/DB Owner** | Supabase: Edge logs, migrations, cron kill-switch, secrets | _____ | _____ |
| **Monitoring Watch** | Eyeballs dashboards during the window (see §5) | _____ | _____ |
| **Comms Owner** | User-facing status + internal updates | _____ | _____ |
| **Support / Triage** | Watches inbound user reports, escalates | _____ | _____ |

Single point of contact for decisions = **Launch Commander**. Everyone else reports status to them.
Account on file: `ncapuozzo@polarisgrowthinstitute.com` (Apple ID for submit; Supabase project owner).

---

## 2. Comms channels (set up before T-0)

- **War room:** one synchronous channel (Slack/WhatsApp/Meet) where all owners are present for the full window.
- **Incident log:** a single running doc/thread — timestamp every action (deploy, smoke result, anomaly, rollback). This is the source of truth for the post-mortem.
- **User-facing status:** decide the channel (status page / X / in-app banner / email). Pre-draft the messages in §6.
- **Escalation path:** Watch → Owner of the affected surface → Launch Commander → (if data/security) Backend Owner + Commander together.

---

## 3. Pre-launch gate (T-minus 1 day → T-0)

All of these come from RELEASE_RUNBOOK §2/§6 — do not launch until green.

- [ ] Freeze gates green: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npx expo export --platform web` all pass.
- [ ] Release branch cut + commit tagged (`v1.0.0`). Tag SHA recorded in incident log.
- [ ] ENV matrix verified: real Supabase prod URL everywhere, ≥1 AI key in web+native build env, Edge secrets set, DB cron settings + extensions on, EAS projectId real.
- [ ] Migrations applied to prod and a **fresh Supabase backup / PITR checkpoint taken** (rollback anchor — there are no down-migrations).
- [ ] Smoke gate passed on the actual artifacts (Vercel Preview URL + `preview` native build).
- [ ] Wearables decision locked (provisioned OR connect-UI descoped).
- [ ] Rollback rehearsed: Web Owner can promote a prior Vercel deploy; Native Owner can halt the staged rollout; Backend Owner can `cron.unschedule` and redeploy a prior Edge function version.
- [ ] All §1 owners present in the war room and acknowledged.

> ⚠ Strongly recommended before T-0: ship a root **ErrorBoundary** + minimal crash capture (Sentry, or a global handler writing to a Supabase `client_errors` table). Launching blind to crashes is the top risk — see RELEASE_RUNBOOK §8.

---

## 4. Launch sequence (T-0 onward)

Sequence chosen so the **fastest-to-roll-back surface (web) goes first** and bakes before the irreversible one (native store submission).

| Step | Action | Owner | Gate to proceed |
|---|---|---|---|
| **T-0** | Commander declares GO in war room. Start incident log. | Commander | All §3 green |
| **T+0** | Merge/fast-forward `main` to tagged commit → Vercel auto-builds. | Web Owner | Build succeeds on Vercel |
| **T+10m** | Smoke the **Vercel Preview URL** (RUNBOOK §6 full pass). | Web Owner + Watch | All critical-path ✓ |
| **T+20m** | **Promote web to production domain.** Verify live domain loads + auth works. | Web Owner | Promote confirmed |
| **T+30m** | Begin **30-min web soak** — watch Supabase auth + Edge logs, error rate, AI responses (POST_LAUNCH §2). | Watch | No critical thresholds breached |
| **T+60m** | If web soak clean → submit **native production** builds via EAS; enable **iOS Phased Release** + **Android staged rollout (10–20%)**. | Native Owner | Web stable; store builds uploaded |
| **T+60m** | Announce launch on user-facing channels (§6 "We're live"). | Comms | Web confirmed healthy |
| **T+2–24h** | Hold native at low rollout %, keep watching. Ramp only after POST_LAUNCH 24h thresholds hold. | Native Owner + Watch | Crash-free + error rate within thresholds |

**Do not** submit native before the web soak is clean — web is your canary and your only fast rollback.

---

## 5. Monitoring dashboards (open these tabs at T-0)

There is no unified observability stack, so the "command center" is **these browser tabs**, watched live:

1. **Vercel → Deployments / Logs** — build status, function/edge runtime errors, traffic. Confirms web is up and which deployment is live.
2. **Supabase → Authentication → Users / Logs** — new sign-ups appearing = auth pipeline healthy. Watch for auth error spikes.
3. **Supabase → Edge Functions → Logs** (per function: `calculate-intelligence`, `generate-embeddings`, `smart-notifications`, `sync-wearables`, `delete-account`, `ml-dashboard`) — watch for non-2xx. This is the only place Edge errors surface (`console.error` only).
4. **Supabase → Database → Logs / Reports** — query errors, connection saturation, `cron.job_run_details` for failing scheduled jobs.
5. **Supabase → Reports (API/DB)** — request volume, error %, latency. Your closest thing to an SLO view.
6. **App Store Connect → App Analytics / Crashes** and **Google Play Console → Vitals (ANR & crash rate)** — native crash visibility (delayed; the only native crash signal absent Sentry).
7. **RevenueCat dashboard** — purchase/subscription events succeeding (if monetization is live at launch).
8. **AI provider consoles** (NVIDIA/Groq/OpenAI) — request volume + **spend** (client-inlined keys = abuse risk; watch for anomalous usage).
9. **In-app analytics:** query `user_events` in Supabase SQL editor (e.g. counts of `app_open`, `chat_sent`, `checkin_submit` over the last hour) to confirm real user activity is flowing. This is the homegrown analytics signal (`lib/analytics.ts`).

Assign each tab to a specific person in §1 so nothing is "everyone's job = no one's job."

---

## 6. Pre-drafted comms (fill blanks, keep ready)

**Internal — GO:** "🟢 GO for Polaris v1.0.0 launch. Web promoting now. All owners in war room. Incident log: [link]."

**User-facing — We're live:** "Polaris Growth Institute is now live 🌟 Start your 90-day Protocolo Soberano at [URL]."

**User-facing — degraded (use if AI/mentor or a feature is impaired but app usable):** "We're seeing high demand and some features may be slower than usual. The app is fully usable — thanks for your patience while we scale."

**User-facing — incident / rollback:** "We hit an issue shortly after launch and have temporarily rolled back to keep things stable. Your data is safe. We'll update here: [link]."

**Internal — rollback called:** "🔴 ROLLBACK: [surface]. Trigger: [metric/threshold]. Action: [Vercel promote prior / halt store rollout / redeploy Edge vN]. Owner: [name]. ETA: [time]."

---

## 7. Kill-switches & rollback triggers (decision table)

| Symptom | Threshold to act | Kill-switch / action | Owner |
|---|---|---|---|
| Web white-screen / cold-load failure | Any reproducible occurrence | Vercel → promote last good deployment (instant) | Web Owner |
| Auth/register broken in prod | >2% auth errors **or** anon dev-bypass detected | Roll back web; verify Supabase URL/keys in build env | Web + Backend |
| Edge function 5xx storm | Sustained 5xx on any function, or error rate >5% over 5 min | Redeploy prior Edge version; if a cron is the driver, `SELECT cron.unschedule('<job>');` | Backend Owner |
| `retry-failed-embeddings` hammering | generate-embeddings 500 looping every 15 min | Set Edge secret `OPENAI_API_KEY`, or `cron.unschedule('retry-failed-embeddings')` | Backend Owner |
| Native crash spike | Play Vitals crash rate >2% or ASC crash trend rising | **Halt** iOS Phased Release / Android staged rollout (the native kill-switch) | Native Owner |
| AI provider outage / all keys failing | Mentor returns canned simulation for all users | No emergency action (auto-degrades NVIDIA→Groq→OpenAI→sim); if a single key is **abused/leaked**, rotate it (requires rebuild+redeploy) | Backend Owner |
| AI spend anomaly | Provider spend spikes abnormally | Rotate/limit the leaked `EXPO_PUBLIC_*` key; rebuild+redeploy | Backend Owner |
| Bad DB migration | Data/integrity error post-migration | **Stop.** Restore from the pre-launch backup/PITR; write a forward fix migration (no auto down-migrations) | Backend Owner + Commander |
| Subscription/paywall broken | Purchases failing / entitlements not unlocking | Check RevenueCat ↔ Supabase webhook; if web-only impact, consider rollback | Native + Backend |

**Rollback authority:** any Owner may *recommend*; the **Launch Commander** *calls* it. For data/security incidents, Commander + Backend Owner decide jointly. When in doubt, roll back web (cheap, instant) and investigate — do not debug live in front of users.

---

## 8. End-of-window handoff

When the launch window closes (web soaked + native ramping safely):
- [ ] Commander declares "launch window closed, normal ops" in the war room.
- [ ] Snapshot all dashboards (screenshots into incident log) as the launch baseline.
- [ ] Hand off to **POST_LAUNCH_MONITORING.md** 24h/72h watch — assign the on-call rota.
- [ ] File any anomalies seen during the window as follow-ups.
- [ ] Schedule the post-launch retro (within 48h while memory is fresh).
