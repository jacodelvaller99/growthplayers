# REJECTION RISK REPORT — Polaris Growth Institute (LifeFlow)

**Audit team:** Team 3 — App Store / Google Play Compliance
**Posture:** Hostile reviewer. We reject in advance anything Apple/Google could object to.
**Date:** 2026-06-02
**Build target:** Expo SDK 54, iOS + Android + Web PWA. `bundleIdentifier: com.polarisgrowthinstitute.lifeflow`

> Bottom line up front: **The current build does NOT pass App Store / Play review as-is.** There are several HIGH-severity blockers — primarily a community feed with zero moderation, missing in-app legal links (Privacy/Terms/Support/EULA), an unconfigured `eas.projectId`, and unguarded breathwork/scream/fasting "therapy" tools mixed with health-adjacent biometric data. None are architecturally hard to fix, but they must be fixed before submission.

Severity scale: **HIGH** = near-certain rejection or store-level legal exposure. **MED** = likely metadata rejection or a reviewer follow-up that delays release. **LOW** = polish / second-pass risk.

---

## HIGH RISK

### H1 — User-generated community feed with NO moderation, reporting, or blocking
- **Guideline:** Apple **1.2 Safety – User-Generated Content**; Google Play **User Generated Content** policy.
- **Evidence:** `app/bienestar/comunidad.tsx` — users post free text (`submitPost`, line 140) and like posts; posts render directly (`postContent`, line 243). There is **no** report button, **no** block-user, **no** mute, **no** EULA acceptance, and **no** profanity/abuse filtering. `maxLength={500}` is the only control (line 182).
- **Why it fails:** Apple 1.2 requires, for any app with UGC: (a) a method to filter objectionable content, (b) a mechanism to report and act on it, (c) the ability to block abusive users, and (d) published contact info. This screen has none of the four. This is one of the most consistently enforced rejection reasons.
- **Fix:**
  1. Add a "Report" action on every post (writes to a `post_reports` table) and a "Block user" action that hides all posts from that user locally + server-side.
  2. Add an EULA / community-rules acceptance gate before first post, with a zero-tolerance statement for objectionable content.
  3. Add server-side moderation (even a basic word-filter + manual admin review queue — `app/admin/` already exists and can host the queue).
  4. Apple expects abusive content/users to be acted on within **24 hours**. Document an SLA.
  - **Alternative if you cannot ship moderation in time:** gate `comunidad.tsx` behind a feature flag and ship without it. Shipping UGC unmoderated is the single biggest avoidable rejection here.

### H2 — No in-app Privacy Policy, Terms of Use, Support, or EULA links
- **Guideline:** Apple **5.1.1 (Privacy – Data Collection and Storage)** + **3.1.2 (Subscriptions)** + App Review **1.5 (Developer Information / Support URL)**; Google Play **User Data** policy (privacy policy link required in-app AND in store listing).
- **Evidence:**
  - `app/paywall.tsx:226` — "Al continuar aceptas los Términos de Uso y la Política de Privacidad" is **plain `Text`, not a tappable link**. No `Linking.openURL`, no `<a>`.
  - `app/(onboarding)/index.tsx:135-138` — references privacy as plain text only.
  - `app.json:61` declares `extra.privacyPolicyUrl: "https://polarisgrowthinstitute.com/privacidad"` but **nothing in the UI links to it**, and the URL is not verified to resolve.
  - Settings screen `app/(tabs)/progreso.tsx` has GDPR export/delete (good) but **no Privacy Policy / Terms / Support links** in the "PRIVACIDAD Y DATOS" or "SISTEMA" sections.
  - `docs/launch/legal/` is **empty** — no privacy policy or terms documents exist yet.
- **Why it fails:** Apps that collect personal data (this app collects email, biometrics, journal text, behavioral analytics, AI chat) MUST link a functional privacy policy from within the app. Subscriptions (3.1.2) additionally require functional links to Terms (EULA) and Privacy Policy on the paywall itself. Google requires the privacy policy URL both in the Play Console listing and accessible in-app.
- **Fix:**
  1. Publish a real Privacy Policy and Terms of Use (the `docs/launch/legal/` folder is empty — author them). Confirm `https://polarisgrowthinstitute.com/privacidad` and a `/terminos` page actually resolve (200, not 404).
  2. Make the paywall legal line tappable: link Terms (EULA) and Privacy Policy with `Linking.openURL`.
  3. Add a "Legal" section in `progreso.tsx` settings with: Privacy Policy, Terms of Use, and a Support URL / contact email.
  4. If you use Apple's standard EULA, link to `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`; otherwise link your own.

### H3 — Subscription metadata incomplete on the paywall (Apple 3.1.2)
- **Guideline:** Apple **3.1.2 (Auto-Renewable Subscriptions)** — binding design/metadata requirements.
- **Evidence:** `app/paywall.tsx`. Present and good: title, restore button (line 212, "Restaurar compras anteriores"), price from RevenueCat `priceString` (line 177/194), platform-aware auto-renew sentence (line 227-229). **Missing the full 3.1.2 disclosure set on-screen:**
  - No explicit **subscription length / billing period** label next to price beyond "ANUAL/MENSUAL" (line 174) — Apple wants title + length + price per period clearly grouped.
  - No statement that **"payment is charged to the Apple ID account at confirmation"**, that **"subscription auto-renews unless turned off at least 24h before the end of the period"**, and that **"the account is charged for renewal within 24h prior to the end of the period"** — the current line 228 is a partial paraphrase only.
  - **No functional Terms (EULA) and Privacy Policy links** on the paywall (ties to H2).
  - The **"7 días de garantía total… devolvemos cada centavo — sin preguntas"** (line 156) is a **developer-issued refund promise Apple does not control.** Apple handles refunds; you cannot guarantee "every cent, no questions." This can trigger 3.1.2 / 2.3.1 (accurate metadata) and creates a support liability. See H6.
- **Fix:** Add the full standard auto-renew disclosure block on the paywall, group title+length+price, add functional Terms + Privacy links, and reword or remove the refund guarantee (see H6).

### H4 — `eas.projectId` is a placeholder / zeroed UUID
- **Guideline:** Build/submission integrity (not a content guideline, but a hard build blocker).
- **Evidence:** `app.json:63` — `"projectId": "00000000-0000-0000-0000-000000000000"`.
- **Why it fails:** EAS Build/Submit and push notifications cannot work with a placeholder project ID. Any production build pipeline that relies on this is broken. Also implies the app has not been provisioned for a real EAS project.
- **Fix:** Run `eas init` / set the real project ID before building for submission.

### H5 — Health-adjacent "therapy" tools without disclaimers or safety warnings, mixed with biometric data
- **Guideline:** Apple **1.4.1 (Physical Harm)** + **5.1.1(iii)/Health** ; Google Play **Health content & services** / **Inappropriate content (health)**.
- **Evidence:**
  - The app brands itself around biometrics ("BIOMETRÍA INTELIGENTE", `wearables.tsx:532`; "Biometría diaria calibrada", onboarding `index.tsx:122`) and ingests WHOOP/Oura recovery, HRV, resting HR, sleep.
  - **`MedicalDisclaimer` component exists but is used in exactly ONE screen** — `app/bienestar/biometrics.tsx` only (confirmed via grep). It is also **dismissable and one-time** (`STORAGE_KEY = 'medical_disclaimer_dismissed'`, `components/MedicalDisclaimer.tsx:17`).
  - **`app/bienestar/grito.tsx`** (scream / somatic release, 3-minute body activation) — **no medical/safety disclaimer**. Scream + breath-hold activation can cause dizziness/fainting.
  - **`app/bienestar/respiracion.tsx`** — offers breathing techniques including holotropic-style/"liberación" breathwork (referenced in `lib/mentor.ts:516`: "Holotrópica para liberación"). **No "do not practice while driving / in water / if pregnant / if you have cardiovascular conditions" safety warning** (grep found none). Hyperventilation-style breathwork is a documented physical-harm concern for breathwork apps.
  - **`app/bienestar/tapping.tsx`** (EFT) script says "Confío en mi capacidad de **sanar**" (line 90) — heal claim, no disclaimer.
  - **`app/bienestar/consciencia.tsx`** — "la emoción que **sana**" / "tu presencia **sana**" (lines 135-136) — heal/therapeutic framing, no disclaimer.
  - **Good examples to replicate:** `app/bienestar/ayuno.tsx:199-207` has a non-dismissable modal disclaimer (diabetes/pregnancy/eating-disorder/medication warnings, "solo para adultos sanos. No es consejo médico") and `app/bienestar/suplementacion.tsx:94-95` ("Consulta a tu médico antes de suplementarte").
- **Why it fails:** A wellness app that surfaces biometric "readiness/recovery" and offers fasting, scream therapy, and intense breathwork must (a) consistently disclaim it is not medical advice/diagnosis, and (b) warn about physical-harm scenarios. A reviewer who opens `grito` or `respiracion` and sees breath-hold/scream activation with zero safety copy can reject under 1.4.1.
- **Fix:**
  1. Render a **persistent (non-dismissable) medical disclaimer** on every wellness tool that touches the body or emotions: `respiracion`, `grito`, `tapping`, `meditacion`, `sueno`, `nutricion`, `cuerpo`, `consciencia`, `ayuno` (already done), `suplementacion` (already done).
  2. Add **breathwork safety warnings** to `respiracion` (do not practice driving / in or near water / while pregnant / with epilepsy or cardiovascular conditions; stop if dizzy).
  3. Soften "sana/heal" language in `tapping` and `consciencia` to non-clinical framing, or keep it but front it with the disclaimer.
  4. Make the global `MedicalDisclaimer` non-dismissable (or at least re-show per major version), since a one-time dismissable banner that the reviewer may never see does not protect you.

---

## MEDIUM RISK

### M1 — Admin panel reachable from the consumer app (reviewer confusion / "hidden features")
- **Guideline:** Apple **2.3.1 (Hidden or undocumented features)**; general reviewer scrutiny.
- **Evidence:** `app/(tabs)/progreso.tsx:1296-1303` renders a "Cuadro de Mando →" button when `isAdmin`, routing to `/admin`. `app/admin/` is a full internal dashboard (KPIs, live user-event feed, membership/codes/content/intelligence, `app/admin/index.tsx`). Gate is the `profiles.is_admin` flag.
- **Why it's a risk:** If the review account is accidentally flagged admin, the reviewer sees an internal analytics console showing other users' behavioral data and may reject for 2.3.1 or raise privacy questions (5.1.2 — surfacing other users' data). Even if not exposed, undocumented internal tooling can prompt "what is this?" follow-ups.
- **Fix:** Ensure the demo/review account is NOT an admin. Confirm RLS on `user_intelligence` / `user_events` so the admin schema cannot leak other users' PII to a non-admin. Consider compiling admin routes out of the store build, or gating behind a server-verified role (not just a client boolean). Document the admin panel in App Review Notes if it ships.

### M2 — AI mentor ("Norman") tone is high-pressure and persuasion-engineered; no AI/limits disclosure to the user
- **Guideline:** Apple **1.4.1 (Physical Harm)** / **5.x**; emerging store scrutiny on AI-generated content and on apps that "design for obsession."
- **Evidence:** `lib/mentor.ts buildSystemPrompt` — the system prompt includes a literal **"DISEÑO DE OBSESIÓN — REGLAS AVANZADAS"** section (line 360), variable-reward rules (line 366), urgency rules (line 372), and "make them feel this system knows me from message 1" (line 376). The persona presents as a real named human ("Soy Norman Capuozzo… perdí a mi padre…", line 310) with no in-app statement that responses are AI-generated. It does emotional pattern-detection on stress streaks (`analyzeUserPatterns`, line 73+: "3 días consecutivos con estrés ≥7/10… sistema nervioso en modo amenaza").
- **Why it's a risk:** (a) No disclosure that Norman is an AI persona, not a real person/coach replying live — Apple and Google increasingly want AI content labeled and want safeguards against harmful advice. (b) "Diseño de obsesión" + variable-reward language is exactly the kind of manipulative-engagement pattern reviewers and regulators flag, especially in a wellness/mental-adjacent context. (c) The bot detects elevated stress but has **no crisis / self-harm safety routing** (no "if a user expresses crisis, surface a helpline").
- **Mitigations (good, keep them):** mentor.ts:357 "Nunca prometes resultados sin herramienta concreta" and 379 "NUNCA inventes historias de éxito específicas." No explicit cure/heal/diagnose claims were found in the prompt itself. The onboarding states "No es consejo médico" (`index.tsx:137`).
- **Fix:**
  1. Add a visible, persistent "Norman es un mentor con IA. No es un profesional de salud; sus respuestas no son consejo médico ni terapéutico" disclosure in the mentor chat UI (`app/(tabs)/mentor.tsx`).
  2. Add a crisis-safety instruction to `buildSystemPrompt`: if a user expresses self-harm/suicidal ideation or acute crisis, the bot must stop coaching and surface emergency/helpline resources.
  3. Rename or temper the "DISEÑO DE OBSESIÓN" framing (it is internal, but if a reviewer or journalist ever sees it, it is a reputational + policy liability). Functionally keep personalization; drop the "obsession/variable reward" packaging.

### M3 — Sign in with Apple: currently NOT required, but a trap if social login is added
- **Guideline:** Apple **4.8 (Login Services)**.
- **Evidence:** `app/(auth)/index.tsx` uses **only** Supabase email/password + an access code (`signInWithPassword`, `signUp`, line 74/137). No Google/Facebook/Apple/third-party OAuth login. The WHOOP/Oura OAuth (`app/perfil/wearables.tsx`) is **data integration, not account login** — it does not trigger 4.8.
- **Status:** **PASS today.** Apple requires Sign in with Apple only when you offer a third-party or social login as a sign-in option. Email/password alone does not trigger it.
- **Fix:** None now. **But** the moment anyone adds "Sign in with Google" (or any social login), you MUST also add Sign in with Apple, or it's an automatic 4.8 rejection. Flagged so it isn't forgotten.

### M4 — Web/PWA paywall dead-ends; pricing relies on access codes (purchase clarity)
- **Guideline:** Apple **3.1.1 (In-App Purchase)** is satisfied on native (uses RevenueCat/StoreKit). Risk is **metadata accuracy (2.3)** and purchase-flow clarity.
- **Evidence:** `app/paywall.tsx:55-62` — on web, purchase shows an alert "Para suscribirte descarga la app en iOS o Android." `app/pricing.tsx` shows tiers but only redeems **access codes** (no purchase). `services/revenuecat.ts` is a no-op on web by design.
- **Why it's a risk:** This is mostly fine (you are NOT selling digital content on web to dodge IAP). But: (a) ensure the iOS build never links out to an external web purchase page (that would violate 3.1.1 anti-steering). (b) The `priceString` comes from RevenueCat offerings; if offerings fail to load, the button reads "COMPROMETERSE CON EL PROTOCOLO" with no price (line 202) — a reviewer hitting that sees a CTA with no price, which can read as incomplete. Provide a fallback price or disable cleanly.
- **Fix:** Verify RevenueCat offerings load in the review build (sandbox). Keep web as informational only. Do not add external purchase links in the iOS binary.

### M5 — `app.json` missing iOS `infoPlist`, notifications plugin, and ATT/usage strings
- **Guideline:** Apple **5.1.1** (purpose strings) and build correctness.
- **Evidence:** `app.json` has **no `ios.infoPlist` block at all** and **no `expo-notifications` plugin** even though `services/notifications.ts` schedules local notifications (`scheduleNotificationAsync`, line 61) and `progreso.tsx:434` requests notification permission.
  - No native HealthKit/Google Fit is used (wearables are cloud OAuth) — so **NSHealthShareUsageDescription is NOT required.** Good.
  - Local notifications on iOS still surface a system permission prompt; the `expo-notifications` config plugin should be declared.
  - No `NSUserTrackingUsageDescription` — only needed if you use IDFA/tracking. `lib/analytics.ts` writes first-party events to Supabase (no cross-app tracking found), so ATT likely not required — **but confirm** the analytics SDK and RevenueCat aren't collecting IDFA. If they are, you need an ATT prompt + string or you fail 5.1.2.
- **Fix:** Add `expo-notifications` to plugins; add an `ios.infoPlist` with any required strings. Confirm no IDFA usage; if present, add `NSUserTrackingUsageDescription` and the ATT prompt.

### M6 — Developer-issued "money-back guarantee" conflicts with store refund control
- **Guideline:** Apple **2.3.1 / 3.1.2**; Google Play billing terms.
- **Evidence:** `app/paywall.tsx:156` "7 días de garantía total… devolvemos cada centavo — sin preguntas." Also social-proof testimonial line 148 ("pasar de 60 a 20 horas… sin perder ingresos") = income/results claim.
- **Why it's a risk:** On iOS, **Apple processes refunds**, not the developer. Promising an unconditional refund you cannot execute is inaccurate metadata and a support nightmare (users will demand it; you cannot force-refund through Apple). The income/results testimonial can read as an unsubstantiated earnings claim.
- **Fix:** Reword to "Cancela cuando quieras" + direct users to Apple/Google's refund process, or remove the guarantee. Soften results-based testimonials or add "resultados no garantizados / individuales."

---

## LOW RISK

### L1 — Mixed brand naming may confuse review (Polaris / LifeFlow / GrowthPlayers / CMI)
- **Evidence:** `app.json` name "Polaris Growth Institute"; repo + bundle "lifeflow"; `pricing.tsx` header comment "CMI LifeFlow"; tiers include "GrowthPlayers" and "Polaris" (`constants/subscriptions.ts`); share text + deep links point to `growthplayers.vercel.app` (`app/perfil/index.tsx:82`). Scheme is `polaris` but native wearable redirect uses `growthplayers://oauth` (`wearables.tsx:434`).
- **Risk:** Apple 2.3.8 (accurate metadata/name). A reviewer seeing four brand names + a scheme mismatch (`polaris` vs `growthplayers://`) may ask for clarification; the OAuth redirect scheme mismatch could also break the wearable connect flow in the build.
- **Fix:** Pick one store-facing brand. **Critically, reconcile the URL scheme**: `app.json` declares `scheme: "polaris"` but `wearables.tsx` opens `growthplayers://oauth` — verify the registered scheme matches or the OAuth callback will fail on device.

### L2 — `ITSAppUsesNonExemptEncryption` not declared
- **Evidence:** No `ios.infoPlist.ITSAppUsesNonExemptEncryption` key.
- **Risk:** App Store Connect will prompt for export-compliance every submission; if you only use standard HTTPS, set `ITSAppUsesNonExemptEncryption: false` to skip the prompt.
- **Fix:** Add the key to `infoPlist`.

### L3 — Account-deletion UX is good but buried
- **Evidence:** Delete account exists, is real, 2-step confirmed, server-side cascade (`app/(tabs)/progreso.tsx:515-552` → `use-lifeflow.tsx:892` → `supabase/functions/delete-account/index.ts`). **This satisfies Apple's in-app account-deletion requirement (5.1.1(v)).** It is, however, reached only via Progreso tab → scroll to "PRIVACIDAD Y DATOS".
- **Risk:** Low — it's reachable, which is what Apple requires. Just make sure App Review Notes tell the reviewer where it is.
- **Fix:** None required. Optionally surface a "Manage account" link in `/perfil`.

### L4 — Data export writes a file/share — confirm it doesn't expose other users
- **Evidence:** `use-lifeflow.tsx:902 exportData` exports only the current user's own state — looks correct.
- **Risk:** Low; noted for completeness.

---

## What already PASSES (credit where due)
- **In-app account deletion** with real server-side data cascade — **5.1.1(v) satisfied** (`delete-account` edge function + 2-step UI).
- **GDPR data export** implemented (`exportData` + UI).
- **Restore Purchases** present on paywall (3.1.1) — `paywall.tsx:212`.
- **ML/analytics consent toggle** (`mlConsent` switch, `progreso.tsx:1225`) with "tus datos nunca se venden."
- **Some** medical disclaimers exist and are well-written (`ayuno`, `suplementacion`, `biometrics`, onboarding "No es consejo médico").
- **No native HealthKit** → no health-permission purpose-string burden.
- **No third-party social login** → Sign in with Apple not currently required.
- Mentor prompt explicitly forbids fabricated success stories and unearned promises.

---

## Priority fix order (do these before any submission)
1. **H1** — Moderate or disable the community feed (report/block/EULA/filter). *Hard blocker.*
2. **H2** — Ship real Privacy Policy + Terms; add tappable in-app links (paywall + settings) + Support contact. *Hard blocker.*
3. **H5** — Persistent disclaimers + breathwork/scream/fasting safety warnings across all bienestar tools.
4. **H4** — Set the real `eas.projectId`. *Build blocker.*
5. **H3 / M6** — Complete the 3.1.2 subscription disclosure on the paywall; fix the refund guarantee.
6. **M1** — Confirm review account is non-admin + RLS prevents cross-user PII.
7. **M2** — Add AI disclosure + crisis-safety routing to Norman; temper "diseño de obsesión."
8. **M5 / L1 / L2** — `app.json` hygiene: notifications plugin, infoPlist, encryption key, brand/scheme reconciliation.
