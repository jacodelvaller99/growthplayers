# PRELAUNCH SMOKE TEST — Polaris / LifeFlow

A tight, ordered, must-pass checklist to run **before any release**. If any **[BLOCKER]** step fails, stop and do not ship. Target time: ~30-40 min per platform.

**Run on at minimum:** 1 iPhone (notch), 1 low-end Android, 1 desktop Chrome (≥1200px) + 1 mobile Safari (PWA).
**Have ready:** a fresh email, a valid access code, a throttling tool (devtools "Slow 3G" / offline), DevTools open on web.

> IDs in brackets map to `QA_MASTER_TEST_PLAN.md`. "BLOCKER-xx" maps to `RELEASE_BLOCKER_MATRIX.md`.

---

## Phase 0 — Boot & config (do first)

1. **[BLOCKER-10]** Web: open the deployed URL with DevTools Network on. Confirm requests go to the **real** Supabase project (not `your-project`) and you are **not** auto-logged-in as anonymous. `[A18]`
2. **[BLOCKER-02]** Web: in DevTools → Sources/Search the bundle for `gsk_` and `sk-` and `nvapi`. Confirm **no** live AI keys are present. (If found → No-Go.) `[M17]`
3. Cold start native: force-quit, relaunch. Splash hides within ~4 s; no white screen. `[R1, T5]`
4. Warm start: background then foreground. App resumes instantly to last screen. `[R2]`

## Phase 1 — Auth & session

5. **[BLOCKER]** Register with a valid access code → "revisa tu email" success. Confirm email, then log in → lands on `comando`. `[A1, A5]`
6. Register with an **invalid** code → correct error, account NOT created. `[A2]`
7. Login with wrong password → "Email o contraseña incorrectos." `[A6]`
8. **[BLOCKER-04]** Web: "¿Olvidaste tu contraseña?" → send → click the email link → confirm you can actually **set a new password** and log in with it. (Today this is expected to fail — verify.) `[A10]`
9. **[BLOCKER]** Kill the app (force-quit), relaunch → still logged in, no re-login required. `[A13]`
10. Logout (Perfil → Cerrar sesión) → returns to welcome; relaunch stays logged out. `[A11]`

## Phase 2 — Onboarding

11. **[BLOCKER]** New account → complete all 5 onboarding steps → INICIAR EL PROTOCOLO → lands on `comando` with your name shown. `[O1]`
12. Confirm onboarding cannot be skipped: with onboarding incomplete, any tab redirects back to the wizard. `[O7]`
13. Enter a real name (not blank) and verify the mentor/greeting uses it, not "Juan Carlos". `[O5]`

## Phase 3 — Daily check-in (core loop)

14. **[BLOCKER]** Submit a check-in (move all 4 sliders + need) → returns to comando; reopen check-in → values pre-filled (saved). `[C1, C2]`
15. **[BLOCKER-07]** Turn OFF network → submit a check-in → note the UI says success. Turn network back on, force-quit, reopen → **verify the check-in actually persisted** (or that the app told you it didn't). This is the silent-data-loss check. `[C3, R6]`
16. Confirm streak counter increments correctly across consecutive-day check-ins. `[C4]`

## Phase 4 — AI mentor (Norman)

17. **[BLOCKER]** Send a normal message → response streams in token-by-token → persists after refresh. `[M1]`
18. **[BLOCKER-01]** With DevTools/proxy set to **Slow 3G or a stalled connection**, send a message. Confirm there is a working **timeout or "Detener" cancel** and the input recovers. (Today: expected to hang — verify whether it does.) `[M3, R10]`
19. Free (unsubscribed) user: send 3 messages → 3rd triggers the paywall. `[M7]`
20. Kill network entirely, send a message → app falls back gracefully (dev-sim reply or clear error), no crash, no frozen input. `[M4, M6]`

## Phase 5 — Mentoría (notes → AI plan)

21. Add a session note → it persists. Tap "Generar con Norman" → 3-5 action items appear. `[MT1, MT2]`
22. **[BLOCKER-01 related]** During plan generation on a slow connection, confirm the spinner doesn't hang forever. `[MT5]`

## Phase 6 — Programs / lessons / wellness

23. Open a module → open a lesson → mark complete → completion persists. `[P2, P3]`
24. Run a breathing session to completion → session saved, sovereign-score bonus applied. `[W2, W9]`
25. Mid-breathing: background the app, return → no crash, timer sane; then exit the screen mid-run → confirm timers/mini-player are released (no stuck "playing"). `[W5, W6]`
26. Play a binaural/meditation audio → plays; exit → audio stops and is released (no leak / no ghost audio). `[W7]`

## Phase 7 — Biometrics / OAuth

27. **[BLOCKER-03]** RLS check (manual, not skippable): authenticated as **User B**, query `wearable_daily` / `daily_checkins` / `mentor_messages` for User A's data → expect **0 rows**. `[B12, AD1]`
28. Connect Oura or WHOOP (web full-page redirect) → consent → returns with "conectado" banner. `[B1, B2]`
29. Native: attempt connect via in-app browser → confirm the success path actually fires (redirect-scheme check). `[B3, SB-2]`
30. Deny authorization on the provider → returns with a clear "Autorización cancelada" banner. `[B4]`
31. Disconnect a device → it flips to "No conectado". `[B9]`

## Phase 8 — Subscriptions

32. **[BLOCKER]** iOS/Android: open paywall → offerings load → complete a sandbox purchase → entitlement granted, mentor gate lifts. `[S1, S3]`
33. iOS/Android: "Restaurar compras" with an active sub → restored; with none → "Sin suscripción activa". `[S6]`
34. **[BLOCKER-08]** Web: confirm the paywall behavior is the agreed product decision (cannot purchase on web) and the CTA isn't a dead button. `[S7]`
35. Grant a tier from admin/DB → confirm the app reflects the new tier live (realtime). `[S8]`

## Phase 9 — Admin

36. **[BLOCKER-09]** Open `/admin` as an admin with one backing view intentionally broken/empty → confirm an error state appears (not an infinite spinner). Then with everything healthy, KPIs load. `[AD4, AD5]`
37. **[BLOCKER]** Open `/admin` as a **non-admin** → redirected to comando, no admin data exposed. `[AD1, AD9]`
38. **[BLOCKER-05]** Cold-start directly into `/admin` (deep link) as an admin → confirm you are NOT wrongly locked out by stale `userId`. `[AD3]`

## Phase 10 — UI / theme / a11y / perf

39. Web ≥1200px: desktop sidebar shows, bottom tab bar hidden; auth/onboarding hide the sidebar. `[T4]`
40. Toggle light/dark on web → readable contrast in both; gold accents legible on light backgrounds; persists on reload. `[T1, T2, T3]`
41. Open a long mentor history (scroll up, load older) → no severe jank/crash (note: ScrollView, not virtualized). `[M10, T8]`
42. iOS/Android: focus chat input, check-in textarea, and onboarding Norte fields → keyboard does not cover the field or the send button. `[T7, O6]`
43. Quick screen-reader pass on login, check-in sliders, and send button → labels announced. `[T6]`

## Phase 11 — Notifications & deep links

44. iOS/Android: enable reminders → schedule check-in reminder → tap the notification → opens check-in. `[N3, N4]`
45. Trigger a pending smart notification → toast appears once (not duplicated). `[N1]`

---

## Sign-off

| Platform | Tester | Date | Blockers failed | Go / No-Go |
|----------|--------|------|-----------------|------------|
| iOS | | | | |
| Android | | | | |
| Web (desktop) | | | | |
| Web (mobile/PWA) | | | | |

**Rule:** any failed **[BLOCKER]** step or any unfixed item from `RELEASE_BLOCKER_MATRIX.md` Go/No-Go list ⇒ **No-Go**.
