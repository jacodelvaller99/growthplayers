# INVESTOR-READY CHANGELOG — Polaris Growth Institute

Cambios con impacto en la tesis de inversión, en orden cronológico inverso.
Cada entrada referencia commits/evidencia real. Complementa `EXECUTION_LOG.md` (operacional).

## 2026-06-16 — Apple-grade Final Audit (verdad de producción + cierre GDPR)

**Pase de auditoría con disciplina de verdad.** Auditoría rigurosa de 4 frentes con **verificación manual**
de cada hallazgo — se corrigieron las sobreestimaciones de los sub-agentes en vez de propagarlas:

- **GDPR / Apple 5.1.1 cerrado en código:** `delete-account` ahora borra **todas** las tablas PII (incluidas
  Memory OS, Mentor Execution OS, Biometric, mentoría, DM y bloqueos) — 14 deletes añadidos. El borrado de
  cuenta vuelve a ser veraz y completo.
- **Bug oculto descubierto y arreglado:** `journal_entries` no existía en producción — el diario degradaba en
  silencio; la migración ahora lo crea.
- **Verdad sobre el modo claro:** verificado **en vivo sobre prod** que el sistema de tema funciona (0 fondos
  oscuros en claro); el "bug de bienestar en negro" no es reproducible. Sin fixes fabricados.
- **Resiliencia:** tier-sync ya no traga fallos parciales (consistencia de suscripción entre tablas).
- **Pulido Apple-grade selectivo** (legibilidad/táctil) sin rewrite del design system.
- **Cero librerías nuevas** (rechazo explícito de un 2º design system).
- Validado: `tsc 0` · `lint 0 errores` · `134 tests` · `export web OK`. Veredicto: **PRODUCTION CANDIDATE**
  (web lanzable tras datos legales; native tras `eas init`). Docs: `docs/investor/16–19`.

## 2026-06-16 — Biometric Intelligence Layer (el cuerpo entra al circuito de decisión)

**De números de wearable a una lectura accionable del cuerpo.** Cierra el loop medir→diagnosticar→actuar
del consejo asesor (prioridad #1, capacidad operativa en 90 días): HRV/sueño/recuperación dejan de ser
vanity metrics y se vuelven input de carga/recuperación, para el cliente (acompañamiento) y el mentor
(decisión).

- **Reutiliza** la capa de wearables existente (wearable_daily/timeseries/connections + journal_entries) y
  añade **una** tabla nueva (`biometric_insights`, owner+admin). No duplica.
- 6 estados **explicables** (sueño, recuperación, coherencia HRV/FC, fatiga, tendencia, nivel de
  intervención) con *drivers* visibles; **diferencial de audiencia**: el mentor ve la lectura técnica, el
  cliente una versión de apoyo sin jerga ni alarma (`client_safe_summary`).
- Las **reflexiones de bienestar** del cliente entran al Memory OS (`source_type='wellness'`) — Norman
  conecta lo subjetivo con lo objetivo y confronta el desajuste.
- **Simulador determinista** (PRNG sembrado, 7 escenarios narrativos) para demo/ventas/QA sin wearable
  físico — ataca el riesgo de economía unitaria (no se necesita hardware para demostrar el valor).
- Validado: 31 tests de lógica pura (134 total) · tsc 0 · lint 0 errores · export web OK. Migración
  aplicada en producción. Docs: `docs/investor/13_BIOMETRIC_INTELLIGENCE.md`.

## 2026-06-16 — Mentor Execution OS (operaciones de coaching)

**La capa operativa que faltaba para escalar coaching premium.** Convierte las tareas del cliente en
objetos evaluables y le da al mentor scoring, review por rúbrica, cola de intervención y preparación
de sesión — el "operating leverage" del modelo high-touch (ataca el riesgo #3 del consejo: que la
operación no escale por cada N clientes).

- 4 tablas nuevas (`mentor_tasks` + reviews/scores/queue admin-only). **Reutiliza** las fuentes
  (planes de acción, mentorship_tasks, compromisos del Memory OS) normalizándolas — no duplica.
- 6 scores **explicables** (adherencia, calidad, follow-through, fricción, atención, momentum) con
  *drivers* visibles; cola de intervención (atención alta, crítica vencida, evitación repetida, falso
  cumplimiento); mentor-prep determinista (dijo-vs-hizo, confrontar, simplificar, celebrar, 3 preguntas).
- IA **propone** tareas (compromisos de Norman → ai_suggested); el **mentor aprueba**. Diferencial por
  tier (free ligero / premium completo / elite profundo); el cliente nunca ve scoring crudo.
- Validado: 29 tests de lógica pura (103 total) · tsc 0 · lint 0 · export web OK. Docs:
  `docs/investor/11_MENTOR_EXECUTION_OS.md` + `12_TASK_EVALUATION_SYSTEM.md`.

## 2026-06-15 — Memory OS (memoria de cliente + inteligencia de mentoría)

**De "chat con contexto" a sistema de cambio medible** (prioridad #2 del consejo asesor: Norman
como sistema de decisión/accountability). Norman ahora recuerda entre sesiones — identidad, metas,
**compromisos** y loops abiertos — y confronta solo desde compromisos almacenados. El admin obtiene
un dossier por cliente: síntesis, temas recurrentes, **briefing pre-mentoría** (preguntas + challenge
points + riesgo) y notas privadas, más un dashboard cross-client para priorizar.

- **Reutiliza** la infra existente (mentor_memories+pgvector, conversaciones, hilos) y añade 4 tablas
  (perfil vivo, resúmenes unificados, briefings admin-only, notas admin-only). Síntesis IA client-side
  vía la misma cadena de Norman (sin servidor nuevo). El perfil sintetiza, no acumula (anti-bloat →
  protege la economía unitaria, riesgo #3 del consejo).
- **Privacidad por diseño:** briefings/notas del coach son admin-only (RLS) y nunca entran al contexto
  de Norman ni a la vista del cliente.
- Validado: 17 tests de lógica pura (74 total) · tsc 0 · lint 0 · export web OK. Docs:
  `docs/investor/10_MEMORY_SYSTEM.md`. Migración pendiente de aplicar en dashboard.

## 2026-06-12 — Hardening pass (commits `f8a0b01`, `e198e6b` + deploys)

**Riesgo de seguridad eliminado en producción.** Las 4 Edge Functions con fixes de
auth del 2026-06-02 estaban escritas pero **nunca desplegadas** — prod corría las
versiones vulnerables. Hoy quedaron desplegadas y verificadas (requests sin token → 401).
La superficie completa: escalación de privilegios (trigger DB, ya aplicado), exfiltración
de memorias del mentor (JWT obligatorio), auto-grant de membresías (políticas removidas),
borrado de cuenta GDPR completo (33 tablas).

**Gobernanza de IA con camino de salida.** Nueva función `ai-proxy` desplegada: chat y
transcripción con claves en el servidor (JWT por usuario, límite de payload). El cliente
conmuta con una variable de entorno; pendiente solo cargar secrets + rotar claves antiguas.
Cierra la principal deuda señalada por el consejo asesor (prioridad 4).

**Acceso protegido de verdad.** ~37 rutas privadas envueltas en guards de navegación
(`Stack.Protected`): un deep link sin sesión ya no renderiza contenido privado — verificado
end-to-end en producción en ambos sentidos (con y sin sesión).

**Gate de calidad real.** La suite de tests pasó de inexistente a 53 tests reales (lógica de
protocolo, score, semanas de mentoría, contrato del sistema de temas, filtro de moderación,
cadena de fallback de IA con su regla de honestidad/crisis, parser SSE) + CI en GitHub
Actions (lint, typecheck, tests, build web) + 14 errores de lint eliminados (6 eran
violaciones reales de rules-of-hooks con riesgo de crash).

**Honestidad de producto.** El guardado offline ya no finge éxito (estado synced/queued +
toast); el timeout del mentor es visible; los scores de inteligencia no se cuelgan en
blanco ante un fallo de red; captura global de crashes (antes solo crashes de render).

**Documentación alineada con la realidad.** Los docs de lanzamiento decían RED (2026-06-02);
los addenda fechados reflejan que 9/10 blockers están cerrados y cuáles quedan. CLAUDE.md
corregido (3 afirmaciones falsas/fantasma). Paquete de due-diligence en `docs/investor/`.

## 2026-06-04 → 06-10 — Features de producto (walkthrough del fundador)

Mentoría con fechas reales + grabación→Whisper→notas/plan (web; nativo pendiente expo-av),
comunidad reactivada con moderación UGC App-Store-compliant (reportar/bloquear/EULA/filtro
+ cola admin) y mensajería interna, sistema integral de bienestar (hábitos con puntos,
ayuno 24/48/72h, nutrición con upload, medidas corporales, suplementación estructurada,
calibración Hawkins), consentimiento legal en onboarding, deep links de notificaciones.
Migración `20260604000000_meeting_features.sql` aplicada en prod.

## 2026-06-02 — War room + remediación P0 (seguridad/compliance/robustez)

Auditoría de 6 equipos (docs/launch/) → 10 blockers P0 → remediados en código el mismo día:
RLS + anti-escalación, divulgación de IA + ruteo de crisis de Norman, pantallas legales,
borrado GDPR, timeout/abort del chat, cola offline, ErrorBoundary, headers CSP en Vercel.

## Riesgos abiertos (honestos)

1. **Builds nativos bloqueados** por `eas init` pendiente (projectId placeholder) — operacional, ~0.5 día.
2. **Claves IA aún en el bundle web** hasta activar ai-proxy (secrets + env var + rotación).
3. **Economía unitaria de IA sin presupuestos por interacción** (límite burdo de payload ya en el proxy; budgets reales en backlog — riesgo #3 del consejo asesor).
4. **Wearables nativos** end-to-end pendientes de registro de URIs + dev build.
5. **Outbox completo** para escrituras no-idempotentes (mensajes/wellness) pendiente.
