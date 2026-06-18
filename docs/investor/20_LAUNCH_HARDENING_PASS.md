# 20 — Launch Hardening Pass (Apple-grade audit → fixes)

> Fecha: 2026-06-17. Auditoría de grado Apple ejecutada con **8 agentes read-only** (7 dimensiones:
> repo-truth · ux-core · ux-deep · design · arch · release · libraries) + síntesis. Veredicto inicial
> `INTERNALLY_READY · EXTERNALLY_BLOCKED`. Este documento registra los hallazgos y el cierre código-fixable
> en 6 batches. Complementa (no reemplaza) los docs 16–19 del pass de 2026-06-16.

## Scores de entrada (auditoría)
| Dimensión | Score | Lectura |
|---|---|---|
| Final readiness | 62/100 | Código listo; bloqueado por handoffs DevOps + integración |
| Design quality | 72/100 | Sistema visual sólido; faltaba pulido de estados |
| Apple-grade UX | 55/100 | Degradación silenciosa rompía la confianza |

## Qué se arregló (código, esta sesión)

**B1 — AI Stability**
- `lib/nvidia/groq/openai/anthropic.ts`: `createStreamGuard` — timeout total 45s + **watchdog de
  inactividad 8s**; distingue timeout (avanza la cadena de fallback) de cancelación de usuario (detiene).
  Un proveedor que se estanca falla en 8s y hace failover, en vez de colgar 45s matando toda la cadena.
- `lib/transcription.ts`: Whisper con **retry exponencial** (3 intentos 1s/2s/5s), sin reintentar en
  abort ni 4xx-cliente. `hooks/use-mentorship.tsx`: si la transcripción falla definitivamente, se abre
  el editor de **notas manuales** (la sesión nunca se pierde); Norman degradado → transcripción cruda.

**B2 — Write Resilience**
- `migrations/20260618100000_client_id_outbox.sql`: columna `client_id` + índice único parcial en
  `mentor_messages`/`mentorship_sessions`.
- `hooks/use-lifeflow.tsx` `persistMentorMessages`: outbox idempotente auto-ajustable — upsert-on-client_id
  (exactamente-una-vez) post-migración; insert simple pre-migración (sin regresión); encola en fallo de red.
- Journal (`app/bienestar/index.tsx`): el campo solo se limpia tras éxito confirmado (`{ error }` chequeado);
  en fallo conserva el texto + "REINTENTAR".
- Hábitos (`app/bienestar/habitos.tsx` + `services/notifications.ts`): los recordatorios se rehidratan
  desde el SO (`getScheduledRemindersByHabit`) — el toggle ya no se pierde al recargar.
- (#12 core loop: `saveCheckIn`/`saveLessonTask`/`markLessonComplete` ya tenían upsert+enqueue de WAVE 3 —
  verificado, sin cambios.)

**B3 — Observability & Schema Health**
- `lib/observability.ts` `logSilentError(context, error)`: reemplaza catches ciegos (memory/biometric/
  confrontation/mentorExecution) por degradación **con rastro**. Punto único para enganchar Sentry.
- `lib/schemaHealth.ts` `checkCriticalSchema()`: tras login, verifica tablas críticas (memory/execution/
  biometric/confrontation); si falta una migración, deja rastro en vez de degradar en silencio.
- Admin Mission Control (`app/admin/index.tsx`): `Promise.allSettled` + `finally` — una query que falla
  ya no deja spinner infinito.
- (#13 userId null: `analytics.track()` ya hacía `if (!userId) return` — verificado, sin cambios.)

**B4 — Auth & Subscription**
- `lib/subscription.ts` `resolveEntitlement(...)`: reconciliador puro (DB tier + expiración + recibo RC).
  Resuelve el split-brain RC↔DB y **exige `expiresAt > now`** (un tier vencido ya no da premium).
  Cableado en `useSubscription` + `use-lifeflow` (`isSubscribed` ahora derivado).
- Recuperación de contraseña web: `detectSessionInUrl: true` (web) + ruta `app/(auth)/reset-password.tsx`
  (maneja `PASSWORD_RECOVERY` → `updateUser`). Antes un usuario web bloqueado no podía recuperar la cuenta.
- Paywall web (`app/paywall.tsx`): **descope honesto** — panel "se gestiona en la app móvil" en vez del
  dead-end "descarga la app" tras un CTA que parecía llevar a pago.

**B5 — UX Polish (estados honestos)**
- Permiso HealthKit/Health Connect denegado (`app/perfil/wearables.tsx`): Alert con "Abrir Ajustes"
  (`Linking.openSettings`) — sin loop sin salida.
- Tarea IA sin revisión (`app/perfil/cliente.tsx` + `clientSafeTasks`): cue "Propuesta de Norman ·
  pendiente de tu coach" (estado de flujo, no score — seguro de mostrar).
- Wearable sync OAuth: mensaje honesto "en curso" en vez de falsa "completa".
- Memory summary: umbral de turnos 4→2 (sesiones cortas con compromisos ya no se pierden).
- (#18 mentor skeleton: el tab layout ya gatea en `isLoaded` y el mensaje de apertura es intencional —
  un skeleton lo reemplazaría con shimmer, regresión de UX. Decisión: no forzar.)

**B6 — Compliance & Docs**
- `migrations/20260618200000_ml_consent_opt_in.sql`: `ml_consent` DEFAULT `false` (opt-in RGPD).
- Onboarding (`app/(onboarding)/index.tsx`): checkbox de análisis **OPCIONAL y separado** (no bloquea
  el gate); `analytics.setConsent(mlConsent)` + persiste el valor real.
- Doc-truth: corregidos claims stale — 37→**42 rutas**, 53→**204 tests**, 33→**48 deletes**, "E2E prod"→
  "verificación manual", delete-account/ai-proxy marcados como handoff real.

## Verdict de salida
`PRODUCTION_CANDIDATE` para web (free tier) y para cohorte cerrada nativa **una vez completados los handoffs**.
El código de los 25 issues código-fixables está cerrado; lo que resta es activación del owner (abajo).

## Handoffs del owner (no ejecutables por el agente)
1. `eas init` → `app.json` `eas.projectId` real (bloquea build nativo).
2. ai-proxy: secrets `ANTHROPIC/NVIDIA/GROQ/OPENAI` en Supabase + `EXPO_PUBLIC_AI_PROXY_URL` en Vercel + rotar.
3. Registrar `polaris://oauth/<provider>/callback` en consolas Oura + WHOOP.
4. Aplicar migraciones en SQL Editor: `…_wearables_native_providers`, `…_client_id_outbox`, `…_ml_consent_opt_in`.
5. App Store / Play Store: justificar uso de HealthKit/Health Connect (coaching, NO clinical).

## Post-launch (clasificado, no bloqueante)
FlashList virtualización · Sentry · cron biométrico server-side · E2E Playwright · encriptación de tokens
wearable · skeleton loaders admin · Stripe web · Mixpanel.

## Gate de validación (esta sesión)
`npx tsc --noEmit` → 0 · `npm run lint` → 0 errores · `npm test` → 204/204 · `npx expo export --platform web` → OK.
