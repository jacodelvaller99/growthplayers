# 01 · AUDITORÍA DE CLAUDE.md vs CÓDIGO REAL — 2026-06-12

Metodología: cada claim de CLAUDE.md tratado como no-confiable y verificado contra el árbol
real (2 agentes de exploración + verificación manual; un 3er agente que auditó un directorio
equivocado fue detectado y descartado). **Score de confiabilidad inicial: 78/100.**
Tras las correcciones de hoy: los hallazgos quedan cerrados.

## Claims falsos / fantasma (corregidos hoy)

| # | Claim | Veredicto | Realidad (evidencia) | Estado |
|---|---|---|---|---|
| 1 | "Auth guard in `app/_layout.tsx`" | **FALSO** | Guard vivía en `app/index.tsx:6-23` + `(tabs)/_layout.tsx:143`; ~25 rutas (bienestar/comunidad/mentoria/perfil/checkin/module/lesson) sin guard en deep link | ✅ Corregido + `Stack.Protected` implementado |
| 2 | Sección Tests (suite Jest + coverage) | **FANTASMA** | `__tests__/` no existía; `npm test` → "No tests found", exit 1 | ✅ Suite real creada (53 tests) + doc corregido |
| 3 | NVIDIA = `meta/llama-3.3-70b-instruct` | **DESACTUALIZADO** | `lib/nvidia.ts:9` usa `deepseek-ai/deepseek-v4-pro` | ✅ Corregido |
| 4 | Comandos EAS "funcionan" | **OMISIÓN CRÍTICA** | `app.json:69` projectId = `00000000-…` → build nativo roto | ✅ Caveat añadido |
| 5 | Edge functions listadas sin estado de deploy | **OMISIÓN CRÍTICA** | Las 6 funciones en prod databan de hace un mes — fixes de seguridad sin desplegar | ✅ Desplegadas hoy + doc actualizado |
| 6 | Wearables sin nota del scheme/registro | OMISIÓN | `lib/wearables.ts:23` apuntaba a `growthplayers://`; URIs sin registrar en consolas | ✅ Código corregido + handoff documentado |
| 7 | Admin sin mencionar `OWNER_IDS` fallback | OMISIÓN | `app/admin/_layout.tsx:~134` IDs hardcodeados como red de seguridad | ✅ Documentado (candidato a remoción) |

## Claims CONFIRMADOS (muestra — el grueso del documento era fiel)

- Sistema de temas: `THEME_VARS` 17 vars, `cv()` var()/hex, `data-theme`, toggle web-only,
  reglas gold/goldText/ink — todo verificado (`constants/themeColors.ts`, `theme.ts`) y ahora
  protegido por test (paridad dark/light).
- `useLifeFlow` fuente única (shape verificado); `userId` reactivo (el bug del registro de
  issues #1 ya estaba corregido); wellnessStore Zustand separado; storage `lifeflow:v2`.
- Mentor: cadena de fallback y contrato de honestidad/crisis en `lib/mentor.ts:310-325`
  (ahora con test que lo protege de regresiones).
- Routing: 44 pantallas registradas, sin huérfanas; desktop sidebar ≥1200px; fonts (5 pesos
  GrandisExtended en assets + @font-face web).
- Mentoría/comunidad/bienestar/compliance/wearables: las secciones nuevas (2026-06-12 AM)
  reflejan archivos reales (mentorship.ts:145 `weekDateRange`, moderation.ts, transcription.ts…).

## Lección operativa

La documentación venía corriéndose en AMBAS direcciones: CLAUDE.md prometía cosas inexistentes
(tests) mientras los docs de launch sobre-reportaban riesgo (9/10 P0 ya cerrados). La regla
adoptada: **ningún claim sin evidencia file:line o verificación en prod**, y addenda fechados
en vez de reescrituras.
