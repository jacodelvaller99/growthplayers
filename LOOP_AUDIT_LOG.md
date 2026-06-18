# Loop Audit — Polaris Technical Pass

> Auditoría TÉCNICA exhaustiva, lenta, página por página + capa por capa.
> Objetivo: dejar el stack production-grade. Métricas reales (bundle, perf,
> a11y, RLS, índices, errores en consola), no opiniones de marketing.
> Stop: 95% de superficies auditadas + gate verde + consenso del consejo.

## Consejo directivo TÉCNICO (skills activas)

| Rol | Skill / Referencia |
|---|---|
| **Supabase Platform Engineer** | `supabase` (oficial, 127K installs) — auth, edge functions, realtime, storage, vectors, cron |
| **Postgres Architect** | `supabase-postgres-best-practices` (oficial, 238K installs) + `postgres-rls` (RLS deep dive) |
| **RN / Expo Performance Lead** | `expo-react-native-performance` + `react-native-architecture` + `vercel-react-native-skills` + `expo-react-native-typescript` |
| **Web Performance Lead** | `performance` (addyosmani/web-quality-skills, 17K installs) — Core Web Vitals, LCP, CLS, INP |
| **Accessibility Engineer** | `accessibility` (addyosmani, 29K installs) — WCAG 2.2 |
| **Mobile QA Director** | `mobile-app-testing` — unit + integration + Detox/Appium + XCTest |
| **Mobile Security Engineer** | `mobile-security-coder` — input validation, WebView, mobile vectors |
| **Code Review Director** | `code-review`, `simplify`, `security-review` |
| **Verifier** | `verify` — corre la app y observa comportamiento, no solo tests |
| **Research** | `deep-research` — benchmarks externos cuando hay duda |

## Reglas de proceso (anti-prisa)
1. **Una capa por iteración.** Schema → RLS → Edge Functions → Bundle/Web → RN nativo → A11y → UX/diseño.
2. **Cada hallazgo: file:line + métrica + severidad.** Sin opiniones.
3. **Severidad: P0 (bloqueante prod) / P1 (riesgo alto) / P2 (mejora notable) / P3 (polish).**
4. **Consenso del consejo:** dos skills cubriendo la misma área deben coincidir antes de marcar "listo".
5. **Vercel + Supabase gate por iteración**: build verde, prod accesible, schema sano.
6. **No tocar lo que ya está bien.** Si un módulo pasa los 7 lentes → cerrado.

## Estado de plataforma (iteración 1, inicio)
- Vercel prod último deploy verificable: `entry-3ff64fb949…js` (deploy anterior a Coach Intelligence v2). El commit `a38de5f` está pushed pero Vercel todavía no ha actualizado el bundle a la hora de empezar este loop.
- Supabase: 3 migraciones nuevas pendientes de aplicar (`20260618000000_wearables_native_providers`, `20260618100000_client_id_outbox`, `20260618200000_ml_consent_opt_in`).
- Build local OK: tsc 0, 224 tests, lint 0 errores, expo export web OK.

---

## ITERACIÓN 1 — Capa de datos: Postgres + Supabase (la columna vertebral)

### Por qué empezar aquí
El schema es lo más caro de cambiar y lo que más impacta perf + seguridad de TODO lo demás. RLS mal escrito = leaks. Índices mal puestos = queries lentas que la UI no puede compensar. Es el techo del sistema entero.

### Hallazgos verificados (con evidencia leída)

| # | Severidad | Ubicación | Hallazgo | Estado |
|---|---|---|---|---|
| 1 | **P0** | `intelligence_engine.sql:194-223` | `search_mentor_memories` es SECURITY DEFINER y NO valida `p_user_id == auth.uid()`. El hardening previo solo revocó EXECUTE de `anon`. Un `authenticated` puede consultar memorias ajenas. | ✅ FIX en `20260619000000_db_hardening_p1.sql` §1 (chequeo defensivo + reraise EXECUTE revoke) |
| 2 | P1 | `lifeflow_complete_schema.sql:99-115` + 5 archivos más | Policies usan `auth.uid()` sin envolver en `(SELECT auth.uid())`. En tablas grandes (daily_checkins, mentor_messages, user_events, wearable_*) evalúa por fila. Patrón oficial Supabase. | ✅ FIX §2 (DROP+CREATE de 9 policies caliente) |
| 3 | P1 | Múltiples (`additive_features.sql:180` etc.) | FK sin índice cubrente. `habits` tiene índice PARCIAL (`WHERE is_active=true`) que no cubre CASCADE. `community_posts.user_id` sin índice. CASCADE en delete-account hace seq scan. | ✅ FIX §3 (4 índices) |
| 4 | P1 | `intelligence_engine.sql:12-31` | `user_events` sin índice (user_id, created_at). El dossier admin lo consulta para timeline por usuario. | ✅ FIX §4 |
| 5 | P1 | `biometrics_engine.sql:68-78` | `wearable_timeseries` solo tiene UNIQUE — no acelera SELECT(user_id, metric, recorded_at) de hooks. | ✅ FIX §5 |
| 6 | P3 | `intelligence_engine.sql:93-94`, `biometrics_engine.sql:109-123` | Policies sin `TO authenticated` (estilo). NO es leak porque RLS bloquea `anon` por default y USING filtra por user_id. | ✅ También arreglado en §2 por limpieza. |
| 7 | P3 | `security_hardening_p0.sql:22,48` | Trigger usa `current_user = 'authenticated'`. En Supabase ESO funciona porque PostgREST hace SET ROLE — no es bug. El auditor sobrestimó. | ⏭️ No tocar. |
| 8 | P2 | `mentor_execution.sql:17-45` | CHECK constraints de status no exhaustivos. | ⏭️ Iteración 2. |
| 9 | P2 | `biometrics_engine.sql:126-135` | Vista `wearable_baseline` sin materializar (recalcula por query). Aceptable hasta crecer >50k rows. | ⏭️ Post-launch. |

### Hallazgos rechazados (auditor sobrestimó)
- `own_intelligence_select` sin TO clause **no es leak** — RLS bloquea anon por default; USING filtra por user_id. Lo arreglo igual por higiene en §2.c.
- `current_user = 'authenticated'` **funciona** en Supabase (PostgREST hace `SET ROLE authenticated`). El comentario del auditor de "compare silenciosamente falla" es falso.

### Próxima iteración (capa 2)
- **RN/Expo performance**: bundle splitting, FlashList en pantallas largas (mensajes admin, lista usuarios), useMemo donde corresponde, Image optimization, suspendidos.
- **Web LCP/CLS/INP** en `https://growthplayers.vercel.app/admin/usuarios/[id]`.
- **A11y WCAG 2.2** del dossier admin (touch targets, focus rings, aria-labels, contraste de chips).
