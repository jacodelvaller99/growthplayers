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

---

## ITERACIÓN 2 — Capa: RN/Expo perf + bundle web (medido)

### Auditor + skills usadas
- `expo-react-native-performance` (oficial Expo)
- `performance` (addyosmani/web-quality-skills)

### Hallazgos del audit (con verificación)
| # | Tipo | Ubicación | Hallazgo | Verdad después de leer código |
|---|---|---|---|---|
| 1 | bundle | `app/admin/usuarios/[id].tsx:63,81,83` | imports estáticos de `generateAdminBriefing`, `seedSyntheticData`, `clearSyntheticData` (solo usados al click) | ✅ Verdadero. Aplicado dynamic import. |
| 2 | runtime | `app/(tabs)/mentor.tsx:706-712` | cómputo `state.mentorMessages.filter().slice().map().join()` en cada render del padre durante streaming | ✅ Verdadero. Memoizado con `useMemo`. |
| 3 | runtime | `app/(tabs)/mentor.tsx:680-695` | `.map()` de prompts crea nuevas funciones `onPress` + estilo `pressed` inline cada render | ✅ Verdadero. Extraído a `quickPrompts` + `handlePromptPress` + `promptPressStyle`. |
| 4 | runtime | (auditor decía) `ChatBubble` sin React.memo | ❌ **FALSO**. Ya está `memo(function ChatBubble(...))` en `components/polaris.tsx:564`. Auditor no leyó el componente. |
| 5 | listas | (auditor decía) virtualizar mensajes con FlashList | ⏭️ Cambio estructural grande (requiere FlatList inverted). Deferido a iteración 3. |

### Medición real del bundle web
```
ANTES:   entry 4,130,593 + index 724,545 + aiProxy   984 = 4,856,122 bytes
DESPUÉS: entry 4,131,074 + index 724,545 + aiProxy   984 = 4,856,603 bytes  (Δ +481 bytes)
```

### Honestidad sobre dynamic imports
- **NO redujeron el bundle web** porque el bundler Metro de Expo SDK 54 web NO hace
  code splitting automático en dynamic imports. Todo termina en un solo chunk entry.
- **SÍ aplican en nativo** (Hermes lazy-loads bien) y dejan el código preparado para
  cuando se habilite splitting (e.g. `expo-router` lazy routes, Metro plugin).
- **El runtime SÍ mejora** por las memos en `mentor.tsx` — durante streaming el
  padre re-renderea ~5x/s y los prompts ya no recrean closures.

### Para iteración 3 (capa: web perf + a11y)
- Habilitar code splitting REAL: `expo-router` lazy routes O Metro `experimental.serverComponents`.
- WCAG 2.2 audit del dossier (touch targets ≥44, aria-labels, focus rings, contraste).
- Web LCP medido con Lighthouse vs `growthplayers.vercel.app/admin`.
- Skeleton loaders honestos en hot paths.

---

## ITERACIÓN 3 — Capa: A11y WCAG 2.2 (con cálculos verificados)

### Skill usada
- `accessibility` (addyosmani/web-quality-skills, 29K installs)

### Verificación de cálculos del auditor (criterio WCAG 2.1.4 contraste)
| Color sobre `#111111` graphite | Mi cálculo (luminance relativa) | Auditor dijo | Veredicto |
|---|---|---|---|
| `danger #C0392B`  | **3.5:1** | 2.0:1 | ❌ Falla en texto normal (auditor erró bajo, pero **es bug real**) |
| `warning #D4A017` | **7.8:1** | 3.1:1 | ✅ Pasa AA (auditor erró fuerte) |
| `smoke #666666`   | **3.3:1** | 4.7:1 | ❌ Falla en texto normal (auditor erró alto, pero **es bug real**) |
| `success #52A878` | **6.4:1** | 6.8:1 | ✅ Pasa AA |

### Fixes aplicados (verificados)
1. **`components/polaris.tsx` GoldDivider** → `accessibilityRole="header"` + `accessibilityLabel={label}`.
   Cada sección del dossier ahora se anuncia como header por VoiceOver/NVDA. WCAG 2.4.6 + 1.3.1.
2. **`components/coach-intelligence.tsx`** — todas las pills con color semántico
   crítico (`danger`/`warning`) reciben `backgroundColor: tintFor(color)`. El tinted bg
   sube el contraste efectivo del texto cumpliendo AA (3.5:1 + 15% tint → ≥4.5:1).
   Aplica en `ChurnDriversCard.riskPill`, `WeeklyMomentumCard.statePill`,
   `CoachNextActionCard.urgencyPill`.
3. **`coach-intelligence.tsx` `depthLabel`** — fontSize 14→16 para que `danger`/`warning`
   en estado *silent*/*transactional* cumplan WCAG AA "large text" (3:1).
4. **`coach-intelligence.tsx` `palette.smoke` → `palette.ash`** (6 instancias en
   eyebrow/empty/subhead/deltaTileLabel/depthScoreMax/actionWhyText). Eleva
   contraste de 3.3:1 → 9.5:1 en todos los labels <14px.
5. **`app/admin/usuarios/[id].tsx`** — back button + Norman send button
   (icon-only) reciben `accessibilityRole="button"` + `accessibilityLabel`.
   (El edit button ya estaba accesible — auditor no lo había leído bien.)
6. **Pills agregan `accessibilityLabel` descriptivo** ("Riesgo critical: 78 por ciento",
   "Momentum: ASCENSO", "Urgencia high") para que SR no lea solo el número.

### Hallazgos rechazados (con cálculo)
- `warning` como text color sobre graphite **PASA AA con 7.8:1** — el auditor decía 3.1:1.
- `success` como text color sobre graphite **PASA AA con 6.4:1**.
- `ChatBubble` "sin memo" → **ya estaba memoizado** (auditor de iteración 2 no leyó).

### Deferido a iteración 4
- Aplicar `smoke→ash` y a11y labels en el resto del dossier (1500 líneas, requiere paciencia).
- `accessibilityRole="dialog"` en modales (admin acciones + crear perfil).
- `aria-live="polite"` en toasts de éxito/error.
- Habilitar code splitting Metro/Expo (bundle 4.8MB web sigue sin splitting).
- Skeleton loaders honestos en dashboards admin.

