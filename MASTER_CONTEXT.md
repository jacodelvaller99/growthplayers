# MASTER CONTEXT

> Documento vivo. Cada sesión lo deja mejor que como lo encontró.
> La guía completa de arquitectura, comandos y patrones es `CLAUDE.md` (mantenida al día).
> Este archivo registra el **ESTADO REAL operativo**: qué funciona, qué está bloqueado y por qué.
> Ubicación: worktree `Growth Players-Polaris/.claude/worktrees/sweet-diffie/lifeflow` del repo raíz,
> rama `launch-hardening-p0`. **No confundir** con `Growth Players-Polaris/Lifeflow` (repo `growthplayers`,
> snapshot abril 2026) ni con `APLICACION DEL MILLON DE DOLARES/lifeflow-app` (LifeFlow de Norman Capuozzo).

---

## Estado actual (2026-09-07)

**Polaris Growth Institute** — app React Native / Expo SDK 54 (iOS, Android, Web PWA) de coaching de alto
rendimiento: Protocolo Soberano de 90 días, mentor IA "Norman", biometría/wearables, bienestar integral,
mentoría humana y panel admin. Web en Vercel (`growthplayers.vercel.app`), Supabase de PRODUCCIÓN (sin staging).

Último commit: `68db6f4` (2026-09-02). 375 commits desde 2026-06-01, 152 desde 2026-08-01. Working tree limpio.
CI (`.github/workflows/ci.yml`): lint + typecheck + test + export web. 135 archivos de test en `__tests__/`.

### Qué funciona hoy (respaldado por código / git)

- **Rutas** (`app/`): `(auth)` (login, welcome, reset-password) · `(onboarding)` (wizard + consent gate + `umbral`) ·
  `(tabs)` comando / norte / programas / mentor / progreso · `bienestar/` (21 pantallas: respiración, meditación,
  sueño, ayuno, nutrición, cuerpo, escaneo, biometrics, internista, exámenes, tapping, grito, hábitos, comunidad…) ·
  `mentoria/` · `comunidad/` (DM, espacios, eventos, conexiones) · `admin/` (usuarios, membresías, cursos, códigos,
  inteligencia, contenido, auditoría, comunidad, mentores, mentor/[id], biometría, copilot, plaud, ranking,
  mission-control, memoria) · `perfil/` (wearables, apariencia, cliente) · `oauth/{whoop,oura,polar,strava}` ·
  `legal/` · `lesson/[id]` · `module/[id]` · `checkin` · `ritual` · `paywall` · `pricing`.
- **Auth en 3 capas** (index → tabs layout → `Stack.Protected`), recuperación de contraseña web, borrado de cuenta
  (`delete-account`), consentimientos en onboarding.
- **Estado**: Context `hooks/use-lifeflow.tsx` (fuente de verdad, persistencia `lifeflow:v2`, outbox `client_id`) +
  Zustand `store/wellnessStore.ts` (mini-player global `WellnessMiniPlayer`, persiste en pausa) y `store/tourStore.ts`.
- **Mentor IA** (`lib/mentor.ts`): cadena Claude Sonnet 4.6 → NVIDIA → Groq → OpenAI **solo vía Edge Function
  `ai-proxy`** (`EXPO_PUBLIC_AI_PROXY_URL`); sin proxy → simulación pre-programada. Stream guard 45s + watchdog 8s.
  Memory OS, Mentor Execution OS, Confrontation OS, Internista educativo, Novedades en voz de Norman.
- **Comando**: Focus Deck (métricas del día reales), 6 modos de composición (esencial, guiado, específico, calma,
  operador, LOGOS), Dial circular, personalización desde header/sidebar.
- **Wearables** (3 caminos): OAuth directo WHOOP/Oura/Polar/Strava (`sync-wearables`); nativo HealthKit / Health
  Connect (`lib/wearablesNative.ts`, plugin registrado 2026-09-02); agregador **Open Wearables (default desde
  2026-09-01, Terra solo fallback)** (`wearable-aggregator`). Desconexión real con revocación upstream + purga;
  **circuit breaker** (`20260831000000`); admin "sincronizar todos".
- **Admin / Espacio del Mentor** (plan 5 fases, ago-31, fases 1-3 completas, 4-5 parciales): briefing automático,
  copiloto por apartados, dossier por cliente, rango de mentor restringido (`mentor_role`), Focus Desk.
- **Onboarding automático ClickUp** (`clickup-onboarding`, desplegada y probada en vivo): contrato "Firmado" →
  usuario + membresía premium, doble idempotencia.
- **Las 7 Llaves** (`notify-7-llaves`): email de resultados con marca real (Resend). Test público en
  `Growth Players-Polaris/las-7-llaves-test` (repo aparte).
- **Diseño**: pasada Apple-grade multiagente (ago-26), audit "Fluidez Polaris" fases 0-5 (gestos, springs,
  reduced-motion, BlurView), a11y 44px en toda la app, tema 8 fondos × 7 señales (99 combinaciones verificadas),
  Sistema Vivo generado desde el código, Biblia de Narrativa (`docs/BIBLIA_NARRATIVA_POLARIS.md`).
- **Web hardening**: `vercel.json` con CSP/HSTS/headers, PWA (service worker, manifest, `PWAInstallBanner`).
- **EAS**: `eas init` corrido (2026-08-11, proyecto `polaris-growth-institute`) → build nativo desbloqueado.

### Bloqueado / handoffs del dueño (sin esto la feature no enruta datos reales)

- [ ] **IA real en prod**: `EXPO_PUBLIC_AI_PROXY_URL` en Vercel/EAS + secrets `ANTHROPIC_API_KEY` / `NVIDIA_API_KEY` /
      `GROQ_API_KEY` / `OPENAI_API_KEY` en Supabase; **rotar** las claves viejas que quedaron en bundles antiguos. P0.
- [ ] **Open Wearables self-host**: desplegar instancia (FastAPI+Postgres+Redis), OAuth por marca en cada consola
      (Garmin requiere aprobación de partner), secrets `OPEN_WEARABLES_BASE_URL/API_KEY/WEBHOOK_SECRET`, webhook →
      `…/functions/v1/wearable-aggregator`, `EXPO_PUBLIC_AGGREGATOR_ENABLED=true`. Validar `openWearablesToDaily`
      contra payload real. P0 para "cualquier reloj"; WHOOP/Oura no dependen de esto.
- [ ] **WHOOP directo**: `WHOOP_CLIENT_ID/SECRET` + redirect URIs (`growthplayers.vercel.app/oauth/whoop/callback`,
      `polaris://oauth/whoop/callback`) en consola WHOOP. Camino más rápido a "WHOOP funcionando".
- [ ] **ClickUp**: configurar la Automatización (URL + header `x-clickup-secret`); el secret ya está en Supabase.
- [ ] **Build nativo**: `eas build --profile preview --platform all` (HealthKit/Health Connect solo en nativo).
- [ ] **Migraciones**: 59 archivos en `supabase/migrations/` (última `20260831000000_wearable_circuit_breaker.sql`);
      se aplican por SQL Editor (no hay service-role local). `checkCriticalSchema()` avisa tras login si falta alguna.
- [ ] Deuda técnica registrada en `CLAUDE.md`: outbox completo para inserts no idempotentes; paywall web es descope
      honesto (RevenueCat solo nativo).

### Cómo correr / deployar

```bash
npm install --legacy-peer-deps
npm run web | ios | android
npm run lint && npm run typecheck && npm test
npx expo export --platform web          # Vercel lo hace en cada push a main
eas build --profile preview --platform all
supabase functions deploy <fn>          # lista completa en CLAUDE.md → Commands
```

Env cliente (`.env.local`, `app/config/env.ts`): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
`EXPO_PUBLIC_AI_PROXY_URL`, `EXPO_PUBLIC_REVENUECAT_KEY`, flags `EXPO_PUBLIC_AGGREGATOR_ENABLED`,
`EXPO_PUBLIC_AGGREGATOR_VENDOR`, `EXPO_PUBLIC_CONFRONTATION_OS_ENABLED`, `EXPO_PUBLIC_SOCIAL_SPACES_ENABLED`.
**Ya no existen** `EXPO_PUBLIC_{NVIDIA,GROQ,OPENAI}_API_KEY`.

---

## Documentación del repo (mapa)

| Doc | Rol |
|---|---|
| `CLAUDE.md` | Guía canónica de arquitectura y comandos (55 KB, al día 2026-09-02) |
| `MASTER_CONTEXT.md` | Este archivo — estado operativo y bloqueos |
| `PRODUCT.md`, `DESIGN.md` | Registro de producto y sistema de diseño |
| `docs/BIBLIA_NARRATIVA_POLARIS.md` | Voz de Polaris / Norman |
| `docs/launch/` | Auditorías de seguridad, legales (drafts), QA, store metadata, runbooks, estados wearables (jul–ago) |
| `docs/investor/` | Dossier de readiness (2026-07-10) |
| `EXECUTION_LOG.md`, `LOOP_AUDIT_LOG.md`, `INVESTOR_READY_CHANGELOG.md` | Bitácoras de julio 2026 (históricas) |

Nota: `CLAUDE.md` referencia `docs/launch/00_EXECUTIVE_LAUNCH_VERDICT.md` y `KNOWN_ISSUES_REGISTER.md`, que no
existen en el árbol; el verdict vigente está en `docs/investor/19_FINAL_PRODUCTION_GO_NO_GO.md` y el estado en
`docs/launch/ESTADO_ACTUAL_2026-08-03.md`.

---

## Historial reciente (resumen por bloque)

| Fechas | Bloque |
|---|---|
| 2026-06 | Memory OS, Mentor Execution, Biometric Intelligence, Confrontation OS, wearables nativos, hardening P0/P1, agregador (Terra → OW) |
| 2026-07 | Comunidad (El Círculo, DM), moderación, dashboard metrics, docs launch/investor, cierre de acabado (10 sesiones) |
| 2026-08-01 → 14 | Hero umbral, códigos de acceso, check-in con mapa corporal (`body_points`), Polar/Strava, Plaud sync, `eas init` |
| 2026-08-19 → 24 | Sistema Vivo, tema 99 paletas, a11y 44px, Focus Deck, 6 modos de Comando, Dial, mentoría por sesión, ClickUp onboarding, novedades Norman |
| 2026-08-26 → 27 | Pasada Apple-grade (8 dominios), audit Fluidez Polaris fases 0-5 |
| 2026-08-31 → 09-02 | Espacio del Mentor fases 1-5 (parcial), admin look&feel, desconexión real de wearables + circuit breaker, OW default, Health Connect plugin |

La bitácora detallada de la sesión de wearables del 2026-06-24 (investigación Metriport/Wearipedia/Shimmer, RPC
`merge_wearable_daily`, revisión adversarial) quedó absorbida en `CLAUDE.md` → "Agregador universal".
