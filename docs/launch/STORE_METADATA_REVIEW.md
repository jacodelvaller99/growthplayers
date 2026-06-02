# STORE METADATA REVIEW — Polaris (LifeFlow)

**Date:** 2026-06-02 · **Auditor:** Team 3 (Compliance) · **Posture:** hostile reviewer.
**Scope:** App Store / Play **listing** copy, screenshots, and claims — i.e. everything a reviewer reads *before* opening the app. Metadata is reviewed as strictly as the binary (Apple 2.3, Play "Store listing & promotion"). The in-app copy audited here is what your marketing will likely lift into the listing, so the same rules apply.

---

## 1. Claims to AVOID in description / screenshots / keywords

These are the phrases most likely to trigger a **health-claims** or **deceptive-claims** rejection. Several already exist in-app and must NOT be promoted to the store listing as-is.

### 1.1 Medical / therapeutic claims — DO NOT use
Avoid implying the app treats, cures, heals, or diagnoses any condition. Specific in-app strings to keep OUT of the listing (or reword):
- "la emoción que **sana**" / "tu presencia **sana**" — `app/bienestar/consciencia.tsx:135-136`
- "Confío en mi capacidad de **sanar**" — `app/bienestar/tapping.tsx:90`
- "Escritura **Terapéutica**" — appears widely (`data/tasks.ts:303`, `data/modules.ts:60`, `lib/mentor.ts:487`). The word "terapéutica" in feature names is borderline; in **store copy** prefer "escritura expresiva / reflexiva" to avoid implying therapy.
- Anything around "ansiedad / estrés" framed as treatment. The app references "ansiedad" as a *target you name* (`tapping.tsx:220`, `biblioteca.tsx:36`, `data/wellness.ts:673` "ansiedad-aguda" / "Corta el pico de ansiedad"). In the listing, do **not** say the app reduces/treats anxiety. "Herramientas de calma y enfoque" is safe; "reduce la ansiedad" is a health claim.
- Fasting/autophagy science claims ("Autofagia activa… Premio Nobel", "HGH aumenta hasta 5×", "Reducción de inflamación sistémica" — `app/bienestar/ayuno.tsx:23-24`) — keep these **out** of store copy; they read as medical efficacy claims.

**Banned-word shortlist for the listing:** cure / cura, heal / sana / sanar, treat / trata, diagnose / diagnóstico, therapy/therapeutic as a benefit, "clinically proven", "reduces anxiety/depression", "boosts immune system", disease names.

### 1.2 Earnings / results guarantees — DO NOT use
- "El método que usé para pasar de **60 a 20 horas de trabajo semanales sin perder ingresos**" — `app/paywall.tsx:148`. Income/lifestyle outcome claim. If used as a testimonial, mark clearly as an individual result and add "resultados no garantizados."
- "**7 días de garantía total… devolvemos cada centavo — sin preguntas**" — `paywall.tsx:156`. Do **not** repeat in store copy: Apple controls refunds; this is an unfulfillable promise in the listing.
- Avoid "guaranteed transformation" / "garantiza tu transformación" framing.

### 1.3 Misleading completeness / "high precision clinical" claims
- "frecuencia cardíaca en reposo con **alta precisión clínica**" — `app/perfil/wearables.tsx:87`. "Clinical precision" implies a medical-grade device. Reword to "seguimiento de tu frecuencia cardíaca en reposo." Keep "clínica" out of store copy.

---

## 2. Required disclosures the listing SHOULD include

- **"No es consejo médico"** wellness disclaimer in the description (you already have the sentence in-app: `(onboarding)/index.tsx:137`). Repeat a short version in the listing: *"Polaris es una app de bienestar y desarrollo personal. No brinda consejo médico, diagnóstico ni tratamiento."*
- **AI disclosure:** state that the "mentor Norman" is an **AI-powered** mentor, not a human coach or therapist. Today the persona reads as a real person ("Soy Norman Capuozzo…", `lib/mentor.ts:310`). The listing must not imply users get a live human coach/therapist.
- **Subscription terms** (Apple requires these in the description for auto-renew apps): price, duration, and the standard auto-renew language, plus links to **Terms (EULA)** and **Privacy Policy**. See `REJECTION_RISK_REPORT.md` H3.
- **UGC notice:** if the community ships, note it contains user-generated content and that abuse can be reported (ties to the moderation work in H1).

---

## 3. Screenshots — review-risk checklist

| Risk | Guidance |
|---|---|
| Showing biometric numbers (HRV/recovery) without context | Acceptable, but avoid captions implying medical interpretation ("detecta enfermedad", "tu salud cardíaca"). The app's own rule is to humanize, not diagnose (`lib/mentor.ts:293` "NUNCA digas tu HRV es X"). |
| Showing the **admin dashboard** | NEVER screenshot `app/admin/*` (KPIs, other users' events). It would advertise internal tooling and other-user data. |
| Screenshots with cure/results text overlays | Don't overlay "cura el estrés", income figures, or "garantía". |
| Community feed screenshot | If shown, ensure no objectionable sample content; ideally show after moderation ships. |
| Price/plan screenshots | If you show `pricing.tsx` (access-code redemption), make sure it doesn't read as an alternate purchase path that bypasses IAP on iOS. |
| Mentor chat screenshot | Fine, but include the AI disclosure in at least one caption. |

---

## 4. Age rating / audience
- Content: UGC community + intense self-development + fasting + emotional content. **Do not rate "4+/Everyone" by default.**
  - Apple: likely **17+** (or 12+ at minimum) given UGC and "unrestricted web/UGC" + mature themes. UGC without robust moderation pushes the rating up.
  - Google IARC: answer the UGC and "users interact / share content" questions truthfully.
- Wellness/fasting content for "adultos sanos" only is stated in-app (`ayuno.tsx:207`) — reflect an adult audience.

---

## 5. App name / brand consistency (metadata accuracy — Apple 2.3.8)
- The codebase mixes **Polaris Growth Institute** (`app.json` name), **LifeFlow** (repo/bundle/`pricing.tsx` header), **GrowthPlayers** (tier + `growthplayers.vercel.app` deep links + `growthplayers://` scheme), and **CMI**.
- **Pick ONE store-facing name** and use it consistently in: app name, subtitle, screenshots, description, support URL, and the URL scheme. A reviewer who sees the app called "Polaris" but landing on `growthplayers.vercel.app` (`app/perfil/index.tsx:82`) may flag inconsistency.

---

## 6. Support & marketing URLs (required fields)
- **Support URL:** required by both stores — provide a real page (none surfaced in-app today; `paywall.tsx:80` only says "contacta soporte" with no address).
- **Marketing URL:** optional but should match the chosen brand.
- **Privacy Policy URL:** required; must resolve (currently declared in `app.json:61` but unverified, and the `docs/launch/legal/` folder is empty).
- Ensure the support email/URL is reachable and monitored — Apple 1.5 + the 24h UGC response expectation (H1) both depend on it.

---

## 7. Suggested SAFE description skeleton (starting point for marketing)
> Polaris es tu sala de mando personal de alto rendimiento: un protocolo de 90 días, un mentor con inteligencia artificial ("Norman"), check-ins diarios y herramientas de bienestar (respiración, meditación, enfoque, hábitos) que se adaptan a ti. Conecta tu WHOOP u Oura para ver tu recuperación y descanso en un solo lugar.
>
> Polaris es una app de bienestar y desarrollo personal. Norman es un mentor potenciado por IA; **no es un profesional de la salud y no brinda consejo médico, diagnóstico ni tratamiento.** Consulta a un profesional antes de iniciar ayunos, ejercicios de respiración intensa u otros cambios de hábitos.
>
> Suscripción auto-renovable: [precio]/[periodo]. Se renueva automáticamente salvo que se cancele al menos 24h antes del fin del periodo. Gestiona o cancela en los ajustes de tu cuenta. Términos: [URL] · Privacidad: [URL].

(Adjust the subscription block to the exact RevenueCat product config.)

---

## 8. Summary of metadata blockers
1. Strip cure/heal/therapy/anxiety-treatment claims and income/refund guarantees from any store copy.
2. Add the not-medical-advice + AI-mentor disclosures to the description.
3. Add the full auto-renew subscription block + Terms/Privacy URLs.
4. Reconcile to a single brand name and a working Support + Privacy URL.
5. Set an appropriate (non-4+) age rating reflecting UGC + wellness content.
6. Never screenshot the admin panel or overlay outcome guarantees.
