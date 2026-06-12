# 02 · REGISTRO DE GAPS DEL REPO — estado vivo al 2026-06-12

Gaps detectados en la auditoría de hoy, con estado post-ejecución. Severidad:
**P0** bloquea lanzamiento · **P1** pre-escala · **P2** mejora.

## Cerrados HOY (ejecutado + validado)

| Sev | Gap | Fix | Evidencia |
|---|---|---|---|
| P0 | 0 tests en la rama (gate roto, doc fantasma) | Suite real 53 tests + script typecheck + CI | `__tests__/unit/*`, `.github/workflows/ci.yml`, commit `e198e6b` |
| P0 | ~25 rutas privadas sin guard en deep link | `Stack.Protected` en MainStack (37 rutas) | `app/_layout.tsx`; E2E prod: `/bienestar/sueno` sin sesión → `/welcome` |
| P0 | Edge Functions de prod SIN los fixes de auth (un mes desactualizadas) | 4 redeploys vía dashboard + verificación | curl sin token → 401 (generate-embeddings, ai-proxy, delete-account) |
| P1 | 6 violaciones rules-of-hooks (riesgo de crash) | `WeeklySparkline` → dispatcher + 2 componentes | `components/polaris.tsx`; lint 0 errores |
| P1 | Claves IA sin camino server-side | `ai-proxy` desplegado + opt-in cliente con fallback | `supabase/functions/ai-proxy`, `lib/aiProxy.ts` |
| P1 | Sin captura global de crashes | `lib/crash.ts` (web+nativo) → analytics | init en RootLayout |
| P1 | OAuth nativo roto (scheme) | REDIRECT_BASE por plataforma → `polaris://oauth` | `lib/wearables.ts:23` |
| P1 | Check-in offline finge éxito | retorno synced/queued/local + toast | `hooks/use-lifeflow.tsx`, `app/checkin.tsx` |
| P1 | Intelligence colgada en error | try/catch + hasError, isLoading siempre resuelve | `hooks/useUserIntelligence.ts` |
| P2 | Timeout del mentor invisible | timedOutRef + toast | `app/(tabs)/mentor.tsx` |
| P2 | Day-zero sin entrada clara | "EMPIEZA AQUÍ · Tu primera lección" | `app/(tabs)/comando.tsx` |
| P2 | Docs en deriva doble | Addenda fechados + CLAUDE.md corregido | `docs/launch/*`, `CLAUDE.md` |

## Abiertos (priorizados)

| Sev | Gap | Próximo paso | Esfuerzo | Owner |
|---|---|---|---|---|
| P0 (nativo) | `eas.projectId` placeholder | `eas init` + credenciales de firma | 0.5d | Founder |
| P1 | Claves IA aún en bundle (proxy inactivo) | Secrets en dashboard → `EXPO_PUBLIC_AI_PROXY_URL` en Vercel → **rotar claves** | 0.5d | Founder (secrets) |
| P1 | Cron jobs sin service-role configurado | `app.service_role_key` vía Vault/db config | 0.5d | Founder |
| P1 | Wearables E2E nativo | Registrar `polaris://oauth/*` en consolas Oura/WHOOP + dev build; o **descopar v1** (recomendado) | 1d / 0 | Founder |
| P1 | Semana 1 guiada (activación) | Diseño del sprint guiado D1-D7 sobre el loop existente | 3-5d | Producto |
| P1 | Outbox client-id (mensajes/wellness) | Extender `lib/offlineQueue.ts` con idempotencia | 2-3d | Eng |
| P1 | Tokens wearable en texto plano | pgcrypto/Vault o no afirmar cifrado | 1-2d | Eng |
| P2 | 90 warnings de lint (unused vars, exhaustive-deps) | Limpieza incremental — no bloquea | 1-2d | Eng |
| P2 | Budgets de IA por interacción | Implementar en ai-proxy (punto de control ya existe) | 2-3d | Eng |
| P2 | Mezcla de 4 marcas (Polaris/LifeFlow/GrowthPlayers/CMI) | Sweep de marca store-facing (Apple 2.3.8) | 1-2d | Producto |
| P2 | `OWNER_IDS` fallback hardcodeado en admin | Remover (migración ya aplicada en prod) | 0.2d | Eng |
| P2 | Sin staging (un solo proyecto Supabase) | Proyecto staging + seeds | 2d | Eng |
| P2 | grabación nativa de mentoría | `npm i expo-av --legacy-peer-deps` + buckets Storage | 1d | Eng |
