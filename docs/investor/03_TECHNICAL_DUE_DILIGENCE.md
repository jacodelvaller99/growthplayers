# 03 · DUE DILIGENCE TÉCNICA — 2026-06-12

## Stack (verificado en código, no en slides)

- **Cliente:** React Native + Expo SDK 54 (Router v6, file-based), TypeScript estricto
  (`tsc --noEmit` = 0), web PWA (Vercel) + iOS/Android (EAS — bloqueado por projectId).
  React 19 + reactCompiler experimental activo.
- **Backend:** Supabase — Auth, Postgres con RLS por usuario + triggers anti-escalación,
  7 Edge Functions (Deno), Storage, pgvector (memoria del mentor), Realtime (tier +
  inteligencia). Migraciones SQL versionadas (19) aplicadas vía dashboard.
- **IA:** cadena de fallback 3 proveedores (NVIDIA deepseek-v4-pro → Groq llama-3.3-70b →
  OpenAI gpt-4o-mini) con streaming SSE, abort/timeout, y **proxy server-side desplegado**
  (activable por env var). Whisper para transcripción de mentoría. Embeddings para memoria.
- **Monetización:** RevenueCat (nativo); web sin compra (mensaje claro, no dead-end silencioso).
- **Analítica:** event batching propio → `user_events`, gated por consentimiento ML; motor de
  inteligencia server-side (engagement, churn, next action) leído por Realtime.

## Arquitectura — fortalezas

1. **Separación de estado clara:** `useLifeFlow` (fuente única) + Zustand para el player +
   hooks de dominio (mentorship/theme/subscription/intelligence). Sin estado fantasma detectado.
2. **Theming a prueba de regresiones:** tokens semánticos con CSS vars (web) / hex (nativo),
   reglas documentadas y AHORA testeadas (paridad dark/light). El bug histórico "fondos negros
   en modo claro" tiene barrera de regresión.
3. **Defensa en profundidad real:** RLS + triggers DB + auth en funciones + guards de
   navegación + CSP. La autorización NO depende del cliente.
4. **Patrones de resiliencia:** ErrorBoundary + captura global, cola offline con feedback
   honesto, fallback chain de IA con degradación a simulación.

## Arquitectura — deudas honestas

1. **Claves IA en bundle** hasta activar el proxy (mitigación desplegada; falta operación).
2. **Sin staging** — un solo proyecto Supabase; migraciones se prueban en prod (mitigado por
   idempotencia IF NOT EXISTS, pero es deuda).
3. **Tests jóvenes:** 53 unit tests sólidos en lógica pura; 0 tests de render/E2E (reactCompiler
   complica render-tests en jest; Playwright ya está en devDeps como camino).
4. **Esquemas duplicados** legacy (`profiles`/`user_profiles`, `check_ins`/`daily_checkins`) —
   consolidación P2 documentada desde el war room.
5. **node_modules de 1 solo lockfile npm con --legacy-peer-deps** (react-native-purchases vs
   Expo 54) — conocido y documentado en CLAUDE.md/CI.

## Calidad verificable hoy

| Gate | Resultado 2026-06-12 |
|---|---|
| `npx tsc --noEmit` | 0 errores |
| `npm run lint` | 0 errores (90 warnings legacy) |
| `npm test` | 53/53 en 6 suites (~9s) |
| `npx expo export --platform web` | OK (bundle 3.85MB entry) |
| CI | `.github/workflows/ci.yml` en cada push/PR (primer run: confirmar en GitHub) |
| Prod | 200 + CSP/HSTS; guard E2E verificado; funciones 401 sin token |

## Trazabilidad

Todo el pase de hoy: commits `f8a0b01` + `e198e6b`, log operacional en `EXECUTION_LOG.md`,
hallazgos vs documentación en `docs/investor/01_CLAUDE_MD_AUDIT.md`, registro de gaps vivo en
`02_REPO_GAP_REGISTER.md`. Historia previa: `docs/launch/` (war room 2026-06-02, con addendum).
