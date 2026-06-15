# APP STORE / GOOGLE PLAY SUBMISSION CHECKLIST — Polaris (LifeFlow)

**Date:** 2026-06-02 · **Auditor:** Team 3 (Compliance) · **Posture:** hostile reviewer.
**Legend:** ✅ PASS · ❌ FAIL (blocker) · ⚠️ PARTIAL / fix needed · ❓ UNKNOWN (verify before submit) · ➖ N/A

Each row cites the guideline and the file/config evidence. "Blocker" = must fix before submission.

---

## ⏱ ADDENDUM — Estado al 2026-06-15 (re-verificado contra el código real)

Las filas de abajo son del **2026-06-02** (estado pre-fixes). Re-auditoría 2026-06-15 con
3 pasadas (build/compliance/verificación dirigida). **Resueltos desde entonces** (≠ a lo que dicen
las filas):

- ✅ **1.2 UGC** (filas 1.1–1.4): moderación viva — reportar (`community_reports`), bloquear
  (`user_blocks`), filtro (`data/moderation.ts`), gate EULA tolerancia-cero antes de postear, cola
  admin. Flag `COMMUNITY_ENABLED=true`.
- ✅ **1.4.1 IA** (fila 1.7): `lib/mentor.ts` enruta crisis/autolesión a ayuda profesional + admite
  ser IA; banner persistente "Norman es un mentor de IA…" en `app/(tabs)/mentor.tsx`.
- ✅ **1.4.1 prácticas** (filas 1.5–1.6): `SafetyWarning` no-descartable en respiración, grito,
  tapping, consciencia, **meditación y sueño (añadidos hoy)** + ayuno/suplementación. 9/9 prácticas
  cubiertas.
- ✅ **3.1.2 suscripción** (fila 2.3): auto-renovación 24h + "gestiónala en ajustes" + restaurar
  compras + links legales en `paywall.tsx`. Promesa "sin preguntas" eliminada.
- ✅ **Permisos nativos** (hoy): `NSMicrophoneUsageDescription` (iOS) + `RECORD_AUDIO` (Android) en
  `app.json`; `expo-av` instalado; `buildNumber`/`versionCode`/`runtimeVersion` añadidos.
- ✅ **delete-account** (5.1.1(v)): borra 30+ tablas PII/salud + `auth.users` (ver
  `legal/ACCOUNT_DELETION_POLICY.md`).
- ✅ **OAuth scheme**: `polaris://oauth` nativo (coincide con `app.json`).

**Blockers REALES que quedan:**
- 🔴 `eas.projectId` placeholder → `eas init` (handoff Expo).
- 🔴 **Placeholders legales** visibles en `app/legal/{privacidad,terminos,salud}.tsx`
  (`[RAZÓN SOCIAL]`, `[EMAIL LEGAL]`, `[JURISDICCIÓN]`, edad, líneas de crisis) → rellenar con datos
  reales de la entidad.
- 🟠 Cuentas de tienda + `google-service-account.json` + EAS secrets + assets de tienda
  (screenshots/descripción) + RevenueCat productos en consola.
- 🟠 Marca: estandarizar a "Polaris Growth Institute" en listing (display name ya es ese).

---

## 1. Apple App Store Review Guidelines

| # | Guideline | Requirement | Status | Evidence / Notes |
|---|-----------|-------------|--------|------------------|
| 1.1 | 1.2 Safety – UGC | Filter objectionable content | ❌ | `app/bienestar/comunidad.tsx` — free-text posts, no filter. |
| 1.2 | 1.2 Safety – UGC | Report mechanism for content | ❌ | No report button anywhere in `comunidad.tsx`. |
| 1.3 | 1.2 Safety – UGC | Block abusive users | ❌ | No block/mute. |
| 1.4 | 1.2 Safety – UGC | Published contact / EULA for UGC | ❌ | No EULA gate, no contact surfaced. |
| 1.5 | 1.4.1 Physical Harm | Health/wellness tools disclaim + warn | ⚠️ | Disclaimers only on `ayuno`, `suplementacion`, `biometrics`. Missing on `respiracion` (no breathwork safety), `grito`, `tapping`, `consciencia`, `meditacion`, `sueno`. `MedicalDisclaimer` used in 1 file only. |
| 1.6 | 1.4.1 Physical Harm | No dangerous instructions w/o safety | ⚠️ | `respiracion.tsx` holotropic/"liberación" breathing, `grito.tsx` scream+activation — no "don't drive / in water / pregnant / cardiac" warning. |
| 1.7 | 1.4 Physical Harm (AI) | AI gives safe advice; crisis handling | ❌ | `lib/mentor.ts` detects high stress but no self-harm/crisis routing; no AI-is-not-medical disclosure in chat UI. |
| 2.1 | 2.1 App Completeness | No placeholders / demo account works | ❌ | `app.json:63` `eas.projectId` = `0000…0000`. Provide working review credentials + access code. |
| 2.2 | 2.3.1 Accurate Metadata | No hidden/undocumented features | ⚠️ | `app/admin/*` reachable via `progreso.tsx:1296` when `is_admin`. Must document or hide; ensure review acct non-admin. |
| 2.3 | 2.3.1 / 3.1.2 | No uncontrollable refund promises | ⚠️ | `paywall.tsx:156` "devolvemos cada centavo — sin preguntas" — Apple controls refunds. |
| 2.4 | 2.3.8 Metadata | Consistent app name/brand | ⚠️ | Polaris / LifeFlow / GrowthPlayers / CMI mixed; scheme `polaris` vs `growthplayers://` redirect. |
| 3.1 | 3.1.1 In-App Purchase | Digital goods via IAP only | ✅ | Native uses RevenueCat/StoreKit (`services/revenuecat.ts`); web is informational no-op (`paywall.tsx:55`). |
| 3.2 | 3.1.1 Anti-steering | No external purchase links in iOS binary | ❓ | Verify no out-links to web checkout in iOS build. Web alert just says "descarga la app". |
| 3.3 | 3.1.1 | Restore purchases available | ✅ | `paywall.tsx:212` "Restaurar compras anteriores" → `restorePurchases()`. |
| 3.4 | 3.1.2 Subscriptions | Title + duration + price grouped | ⚠️ | Price shown (`priceString`); duration only "ANUAL/MENSUAL". Needs full grouping. |
| 3.5 | 3.1.2 Subscriptions | Full auto-renew disclosure on paywall | ⚠️ | `paywall.tsx:227-229` partial; missing standard "charged 24h before / cancel 24h before / managed in account settings" text. |
| 3.6 | 3.1.2 Subscriptions | Functional Terms (EULA) + Privacy links on paywall | ❌ | `paywall.tsx:226` is plain text, not links. |
| 4.1 | 4.8 Login Services | Sign in with Apple if social login offered | ✅ | Email/password + access code only (`(auth)/index.tsx`). No social login → SiwA not required. Re-check if social login added later. |
| 4.2 | 4.2 Minimum Functionality | Not just a website wrapper | ✅ | Native RN app, biometrics, AI, offline state. |
| 5.1 | 5.1.1 Privacy – policy link | Privacy policy accessible in-app | ❌ | URL in `app.json:61` but no in-app link; `docs/launch/legal/` empty (no policy authored). |
| 5.2 | 5.1.1(v) Account Deletion | In-app account deletion | ✅ | `progreso.tsx:515` (2-step) → `use-lifeflow.tsx:892` → `delete-account` edge fn (server cascade). |
| 5.3 | 5.1.1 Data Collection consent | Consent for data processing | ✅ | `mlConsent` toggle (`progreso.tsx:1225`); onboarding notice (`(onboarding)/index.tsx:135`). |
| 5.4 | 5.1.1 Purpose strings | iOS usage strings for sensitive data | ⚠️ | No `infoPlist`. No HealthKit (cloud OAuth) so NSHealth not needed. Confirm notifications/ATT. |
| 5.5 | 5.1.2 Data Use | No exposing other users' data | ❓ | Admin schema (`user_intelligence`, `user_events`) — verify RLS blocks non-admins. |
| 5.6 | 5.1.5 Location | Location strings if used | ➖ | No location APIs found. |
| 5.7 | 5.1.1 ATT / IDFA | ATT prompt if tracking | ❓ | `lib/analytics.ts` first-party only; confirm RevenueCat/analytics don't pull IDFA. |

## 2. Google Play Policies

| # | Policy | Requirement | Status | Evidence / Notes |
|---|--------|-------------|--------|------------------|
| G1 | User Generated Content | Moderation + report + block | ❌ | Same as Apple 1.2 — `comunidad.tsx` has none. |
| G2 | User Data | Privacy policy in listing AND in-app | ❌ | No in-app link; policy not authored. |
| G3 | Data Safety form | Accurate Play Console Data Safety declaration | ❓ | Must be completed at submission — see `PRIVACY_NUTRITION_DRAFT.md` for the source-of-truth categories. |
| G4 | Health content | Disclaimers for health/wellness features | ⚠️ | Partial (see Apple 1.5/1.6). |
| G5 | Subscriptions / Play Billing | Use Play Billing; clear terms; manage/cancel info | ⚠️ | RevenueCat→Play Billing on Android (`paywall.tsx:229`); add full terms + management link. |
| G6 | Account deletion | In-app + web deletion path | ✅ (in-app) / ❓ (web) | In-app delete exists. Google also wants a **web-accessible** deletion request URL for the listing — provide one. |
| G7 | Permissions | Request only needed permissions w/ rationale | ⚠️ | `expo-notifications` not in `app.json` plugins though used; declare it. |
| G8 | Families / target audience | Age rating + audience set correctly | ❓ | Set IARC questionnaire; UGC + wellness → not "Everyone" without controls. |
| G9 | Deceptive behavior | No unsubstantiated claims | ⚠️ | Refund "sin preguntas" + income testimonial (`paywall.tsx:148,156`). |

## 3. Build / Config hygiene

| # | Item | Status | Evidence |
|---|------|--------|----------|
| B1 | Real `eas.projectId` | ❌ | `app.json:63` placeholder UUID. |
| B2 | `expo-notifications` plugin declared | ❌ | Missing in `app.json:39-55` though `services/notifications.ts` schedules local notifs. |
| B3 | iOS `infoPlist` block | ❌ | Absent in `app.json`. |
| B4 | `ITSAppUsesNonExemptEncryption` | ❌ | Absent — add `false` if HTTPS-only to skip export prompts. |
| B5 | URL scheme consistency | ⚠️ | `scheme: "polaris"` vs `growthplayers://oauth` (`wearables.tsx:434`) — reconcile or wearable OAuth breaks on device. |
| B6 | App icons / splash present | ✅ | `app.json` icon, adaptiveIcon, splash configured. |
| B7 | Privacy/Terms/Support URLs resolve | ❓ | `polarisgrowthinstitute.com/privacidad` must 200, plus `/terminos` + support page. |
| B8 | Secrets not shipped client-side | ⚠️ | All AI keys are `EXPO_PUBLIC_*` (inlined, client-visible by design) — fine for review, but note Groq/OpenAI keys are extractable from the bundle; prefer proxying via edge functions long-term. |

---

## Pre-submission action list (condensed)
**Hard blockers (❌):** UGC moderation (G1/1.2), in-app legal links + published policy (5.1.1/G2), paywall Terms+Privacy links (3.1.2), real `eas.projectId` (2.1), AI crisis-safety (1.4.1), notifications plugin + infoPlist (build).
**Fix before submit (⚠️):** complete subscription disclosure, refund-promise reword, disclaimers on all wellness tools + breathwork safety, admin-panel review-account check, brand/scheme reconciliation.
**Verify (❓):** RLS on admin schema, IDFA/ATT, Play Data Safety form, web deletion URL, age rating, URLs resolve, no iOS external purchase links.

> Verdict: **Not submittable today.** Clear the ❌ rows (all are tractable) and the ⚠️ paywall/legal/disclaimer rows, then re-audit.
