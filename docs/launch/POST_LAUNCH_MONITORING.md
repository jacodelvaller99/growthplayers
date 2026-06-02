# POST-LAUNCH MONITORING — Polaris / LifeFlow (24h / 72h)

> Owner: Release Operations (Team 6). Last updated: 2026-06-02.
> Companion to LAUNCH_DAY_COMMAND_CENTER.md. Starts when the launch window closes.
>
> **Honest constraint:** there is **no Sentry, no APM, no alerting** wired today. So this is a **pull-based, human-checked** plan: someone on rota runs the checks below on a cadence. The thresholds tell them when to escalate. Wiring real alerting (below) is the #1 follow-up.

---

## 1. On-call rota & cadence

| Window | Cadence of checks | Who |
|---|---|---|
| **0–4h** (hyper-care) | Every **15 min**, continuous watch | Monitoring Watch + Backend Owner |
| **4–24h** | Every **1h** | On-call (rotate) |
| **24–72h** | Every **3–4h** + morning/evening review | On-call (rotate) |
| **>72h** | Daily review until alerting is automated | Release Ops |

Each check = walk the dashboards in §3, compare to §2 thresholds, log a one-line status in the incident log. Any RED → escalate per LAUNCH_DAY §7.

---

## 2. Metrics, thresholds & escalation

GREEN = keep going · YELLOW = investigate now, prepare mitigation · RED = act / roll back (LAUNCH_DAY §7).

| Metric | Source | GREEN | YELLOW (investigate) | RED (act) |
|---|---|---|---|---|
| **Web availability / cold load** | Vercel logs + manual load | Loads, no white-screen | Intermittent slow loads | White-screen / load failure reproducible → roll back web |
| **JS/client errors** | ⚠ **no aggregator today** — manual: web devtools, user reports, (future) `client_errors` table | None reported | Scattered reports of one screen | Crash loop / widespread → roll back |
| **Native crash-free rate** | Play Console Vitals, App Store Connect Crashes | ≥99.5% sessions crash-free | 98–99.5% or rising trend | <98% or sharp spike → **halt staged rollout** |
| **Native ANR (Android)** | Play Vitals | <0.47% (Google bad-behavior threshold) | approaching 0.47% | exceeds → halt rollout, fix |
| **Auth success** | Supabase Auth logs; `user_events` `app_open` vs failures | New sign-ups flowing, errors near 0 | Auth error rate 1–2% | >2% auth failures → roll back, check Supabase URL/keys |
| **Edge Function error rate** | Supabase Edge logs (per fn) | <1% non-2xx | 1–5% non-2xx on any fn | >5% sustained, or any fn in a 5xx storm → redeploy prior version / unschedule driving cron |
| **`generate-embeddings` health** | Edge logs + `mentor_memories.embedding IS NULL` count | NULL backlog drains | NULL backlog growing | 500 loop (missing `OPENAI_API_KEY`) → set secret or `cron.unschedule('retry-failed-embeddings')` |
| **`calculate-intelligence` health** | Edge logs; `user_intelligence` rows updating | 200s, scores refreshing | occasional 500 / timeouts | persistent failure → intelligence/mentor context degrades; investigate |
| **DB health** | Supabase Reports (DB) | CPU/connections nominal | connections climbing toward pool limit | pool exhaustion / query errors → investigate, throttle |
| **Cron jobs** | `SELECT * FROM cron.job_run_details ORDER BY start_time DESC` | all recent runs `succeeded` | sporadic failures | jobs failing (likely `app.*` DB settings/extensions missing) → fix settings or unschedule |
| **AI mentor quality** | Manual spot-check + provider consoles | Real streamed responses | One provider failing (chain still serves) | All providers down → users get canned sim (degraded, not down); rotate any abused key |
| **AI spend / abuse** | NVIDIA / Groq / OpenAI consoles | Spend tracks user volume | Unusual spend bump | Spend spike (leaked inlined key) → rotate key + rebuild/redeploy |
| **Subscriptions** | RevenueCat + Supabase `subscription_tier` | Purchases succeed, entitlements unlock | Webhook lag | Purchases fail / entitlements not syncing → check RC↔Supabase webhook |
| **Engagement (product signal)** | `user_events` (`app_open`, `chat_sent`, `checkin_submit`, `lesson_complete`) | Steady activity | Activity drop vs first hours | Activity flatlines (often a symptom of a broken core flow) → investigate the flow |
| **Early churn signal** | `user_intelligence.churn_risk`; D1 return rate from `app_open` events | Normal distribution | Rising avg churn risk | Mass churn-risk spike correlated with a bug → fix the offending flow |

### Quick SQL probes (Supabase SQL editor)
```sql
-- Edge/cron failures in the last day
SELECT jobname, status, return_message, start_time
FROM cron.job_run_details
WHERE start_time > now() - interval '24 hours' AND status <> 'succeeded'
ORDER BY start_time DESC;

-- Embedding backlog (generate-embeddings health)
SELECT count(*) AS pending_embeddings
FROM mentor_memories WHERE embedding IS NULL;

-- Activity pulse (last hour)
SELECT event_type, count(*)
FROM user_events
WHERE created_at > now() - interval '1 hour'
GROUP BY event_type ORDER BY 2 DESC;

-- New users (last 24h)  [auth schema]
SELECT count(*) FROM auth.users WHERE created_at > now() - interval '24 hours';
```

---

## 3. Dashboards to walk each check (same tabs as launch day)

1. Vercel → Deployments + Logs (web up? which deploy live? runtime errors?)
2. Supabase → Auth (new users, error spikes)
3. Supabase → Edge Functions → Logs (per function non-2xx)
4. Supabase → Database → Reports + `cron.job_run_details`
5. App Store Connect → Crashes · Play Console → Vitals (native crash/ANR)
6. RevenueCat (purchases/entitlements)
7. AI provider consoles (volume + spend)
8. `user_events` SQL probes (real activity + engagement)

---

## 4. Escalation procedure

1. Watch detects YELLOW/RED → post in war room with metric, value, dashboard link, timestamp.
2. Surface Owner (Web / Native / Backend) investigates and proposes mitigation.
3. RED → Launch Commander decides; execute the matching kill-switch (LAUNCH_DAY §7). Data/security → Commander + Backend jointly.
4. Log every action with timestamps. Keep users informed via the pre-drafted comms (LAUNCH_DAY §6) if user-visible.
5. After stabilizing, write a short incident note (what/when/why/fix) for the retro.

---

## 5. 24h and 72h review gates

**At 24h — go/grow decision:**
- [ ] Native crash-free ≥99.5% and stable → **ramp staged rollout** (e.g. 20% → 50%).
- [ ] No open RED incidents; YELLOWs triaged with owners.
- [ ] Edge error rate <1%, cron jobs succeeding, auth healthy.
- [ ] Embedding backlog draining (not growing).
- [ ] AI spend tracks user volume (no abuse).

**At 72h — steady-state decision:**
- [ ] Native crash-free held ≥99.5% across the window → **ramp toward 100%**.
- [ ] Engagement steady; no mass early-churn signal tied to a defect.
- [ ] No recurring Edge/DB errors.
- [ ] Relax cadence to daily; hand to normal operations.
- [ ] Hold the post-launch retro; file follow-ups.

---

## 6. Top follow-ups to make this real (post-launch, prioritized)

These are the gaps this plan works *around* today. Closing them turns pull-based watching into push-based alerting:

1. **Crash monitoring — Sentry (P0).** Add `@sentry/react-native` (app, incl. web) + Sentry for Edge/Deno. Instantly converts "someone notices a crash" into release-health dashboards + alerts. Biggest single gap.
2. **Root ErrorBoundary (P0).** None exists — an uncaught render error white-screens the app with no recovery. Add one in `app/_layout.tsx` with a friendly fallback + "reload".
3. **Edge error alerting (P1).** Edge functions only `console.error`. Pipe logs to Sentry or a Supabase log-drain → alert on 5xx rate. Today you must scroll logs manually.
4. **Uptime/synthetic checks (P1).** External monitor (e.g. a cron hitting the web URL + a health Edge endpoint) to page when down — currently nothing watches availability automatically.
5. **CI gate (P1).** No `.github/` — add a workflow running `tsc --noEmit`, `lint`, `test`, `expo export` on PR so broken code can't reach `main`/Vercel.
6. **Staging Supabase project (P2).** Single prod project → no safe place to test migrations/secrets. A staging project removes the "every change is a prod change" risk.
7. **Move AI keys server-side (P2).** Proxy NVIDIA/Groq/OpenAI through an Edge Function so keys aren't inlined into the web bundle (kills the key-harvest/abuse vector).
8. **Down-migration / backup discipline (P2).** No reverse migrations. Codify pre-migration backups + write forward-fix SQL, or adopt a migration tool with rollback.
9. **Release tagging + changelog (P3).** No git tags today; tag every shipped build so rollback has a named anchor.
