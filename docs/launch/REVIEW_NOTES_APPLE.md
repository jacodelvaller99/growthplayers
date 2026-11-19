# Notas de revisión para Apple — App Store Connect

Pegar la versión en inglés (abajo) en **App Review Information → Notes** antes de enviar la build.
Las credenciales van **solo** en App Review Information → Sign-in required, nunca en este repo.

## Checklist del dueño antes de enviar

- [ ] Generar el código `APPLEREVIEW` en `/admin/codigos` con acceso completo de **cliente**.
- [ ] Crear la cuenta demo como **cliente** (no staff: las pantallas de equipo muestran precios internos),
      completar su onboarding y dejar datos de ejemplo (check-ins, racha, Norte) para que nada se vea vacío.
- [ ] Poner email y contraseña de esa cuenta en App Store Connect → Sign-in. Aquí: `<ver App Store Connect>`.
- [ ] Confirmar que el ai-proxy de Supabase tiene `ANTHROPIC_API_KEY` y la clave de OpenAI. Sin ellas Norman
      entra en «Modo demostración» y la build se rechaza por 2.1.
- [ ] Desplegar `delete-account` (la migración `20261119000000_ugc_report_user_dm_block.sql` ya está aplicada).

---

## Notes (English — paste this)

**Access model (Guideline 3.1.3 / 2.1(b)).** Polaris OS is a companion app for clients of Polaris Growth
Institute's one-on-one coaching service. Clients sign a service contract with us outside the app; the
price and payment are handled in that contract. The app sells nothing: there are no prices, plans, in-app
purchases or links to buy. New accounts require the access code that the client's coach gives them, so
the sign-up screen asking for a code is intentional, not a bug.

**Demo account.** A client demo account with sample data is provided in Sign-in information. To register
a new account instead, use the access code `APPLEREVIEW`.

**HealthKit (2.5.1).** With the user's permission, the app only reads from Apple Health: sleep, heart rate,
heart rate variability, resting heart rate, steps, active energy, blood oxygen and respiratory rate. It uses
them to compute a recovery score and to adapt the coaching. It never writes to Health, does not use Health
data for advertising, does not sell it and does not store it in iCloud. HealthKit is optional; the app works
without it. Where to see it: Yo → Tu reloj, and Bienestar → Tu reloj. Permissions can be changed in
Settings › Health › Data Access & Devices.

**AI features (5.1.2).** "Norman" (mentor) and "Internista" (health education) are AI assistants, labelled
as AI in the app, and neither is a doctor or a person. Before any AI use, the app asks for explicit consent
that names the providers: Anthropic (mentor and Internista; NVIDIA, Groq or OpenAI as fallback) and OpenAI
(transcription of optional mentoring voice recordings). Both assistants route crisis messages to emergency
lines and never diagnose or prescribe. Health advice screens cite their sources (Yo → Fuentes médicas).

**Community (1.2).** Members can report posts, comments, events, spaces and other members, and block
members (which hides their content and messages). Users accept a zero-tolerance code of conduct before
posting. Reports are reviewed within 24 hours.

**Account deletion (5.1.1(v)).** Yo → Eliminar mi cuenta deletes the account and all its data, including
health data and voice recordings.

---

## Notas (español, referencia interna)

- **Acceso:** la app es complemento del servicio de mentoría que el cliente contrata fuera de ella. No vende
  nada; el registro pide el código del coach a propósito.
- **HealthKit:** solo lectura de los 8 tipos de arriba, para recuperación y acompañamiento; no escribe, sin
  publicidad, sin iCloud, opcional. Dónde: Yo → Tu reloj y Bienestar → Tu reloj.
- **IA:** Norman e Internista se declaran IA; consentimiento previo que nombra a Anthropic (y respaldos) y a
  OpenAI para transcripción; derivación de crisis; fuentes citadas.
- **Comunidad:** reportar y bloquear en todas las superficies; código de conducta de cero tolerancia; revisión
  en 24 h.
- **Borrado:** Yo → Eliminar mi cuenta.
