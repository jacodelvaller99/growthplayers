# INFORME — ML, Mejoras para Mentores y Estado Visual del Admin

> Evaluación honesta y basada en evidencia (file:line). Sin maquillaje. Tres ejes:
> (1) Machine Learning / Inteligencia, (2) Mejoras para mentores, (3) Cómo se ve
> cada detalle del admin. Fecha: 2026-06-18 · Branch `launch-hardening-p0`.

---

## 1. MACHINE LEARNING / INTELIGENCIA

### 1.1 Qué hay realmente (la verdad incómoda)
**No hay ML entrenado. Hay heurística explicable + un motor nuevo de drivers.**

| Motor | Qué es | Dónde |
|---|---|---|
| `calculate-intelligence` (edge fn) | **Heurística + sigmoid**, NO modelo entrenado. Pesos fijos hardcodeados. | `supabase/functions/calculate-intelligence/index.ts` (529 líneas) |
| **Coach Intelligence v2** (nuevo) | Drivers EXPLICABLES con evidencia citable + momentum + profundidad relacional + NBA específica. Determinista, 20 tests. | `lib/coachIntelligenceLogic.ts` + `lib/coachIntelligence.ts` |

**`calculate-intelligence` produce** (todo regla fija, no aprendido):
- `engagement_score` 0–100 (suma ponderada: 30% días activos, 25% lecciones, 20% wellness, 15% check-ins, 10% mentor).
- `churn_risk` 0–1 (logística sobre 6 señales → sigmoid). `churn_label` por tramos 0.3/0.5/0.7.
- `cohort_label`: 6 clusters por cascada IF/THEN (no k-means real).
- `next_action`: 1 de 9 templates de texto.
- `anomaly_detected`: 4 umbrales fijos (mood_drop, isolation, streak_break, biometric_stress).
- `affinity_*`: proporciones brutas de uso por tipo (binaural/breathing/etc.).

**Coach Intelligence v2 produce** (lo que sí da valor de coaching):
- `drivers[]` con peso Y **evidencia literal** ("5 compromisos abiertos (ej. 'entrenar 5x')").
- `momentum` semanal con deltas reales (energía, chats Norman, tareas cerradas).
- `relational_depth` (silent/transactional/open/deep) — salud de la relación con Norman.
- `next_action` específico ("Decile que…") — NO template. Si hay confrontación severa, usa el prompt literal.

### 1.2 Cómo se VE en el admin
- **Mission Control** (`app/admin/index.tsx`): hero de distribución + lista "en riesgo" con churn% y pills de severidad.
- **Inteligencia ML** (`app/admin/inteligencia/index.tsx`): dashboard agregado — engagement, churn, cohortes, afinidades, anomalías, usuarios en riesgo. Solo-lectura + botón "Recalcular todos".
- **Dossier · sección D** (`app/admin/usuarios/[id].tsx`): las 4 cards de Coach Intelligence v2 (QUÉ DECIRLE / ANÁLISIS DE RIESGO con drivers / MOMENTUM / RELACIÓN) **ENCIMA** de los scores heurísticos heredados + botón "Recalcular". **Esta es la pantalla más valiosa del admin hoy.**
- **Biométrica** (`app/admin/biometria.tsx`): dashboard fisiológico por intervención.

### 1.3 Gaps honestos del ML (qué impide que se vea con datos reales)
1. **No es ML entrenado.** Falta data labelada (qué cliente abandonó de verdad) + infra Python. Hoy = heurística explicable. Para ML real: fase futura cuando haya histórico.
2. **El cron puede no correr.** `calculate-intelligence` se agenda cada 6h vía pg_cron, pero **requiere service-role key + URL en Supabase Settings**. Si no está → `user_intelligence` se queda en defaults neutros (engagement 50, churn low) y el admin muestra todo plano. → **handoff abierto del dueño.**
3. **Biometría vacía.** `wearable_daily` está vacío sin OAuth Oura/WHOOP registrado en sus consolas (handoff abierto) o sin un build nativo con HealthKit/Health Connect. → la pantalla Biométrica renderiza pero con `–`.
4. **Coach Intelligence v2 degrada silencioso si faltan migraciones** (memory/execution/biometric/confrontation). Mitigado: la pasada de observabilidad (`logSilentError` + `checkCriticalSchema`) ya deja rastro en vez de fallar mudo.

---

## 2. MEJORAS PARA MENTORES (4 sistemas operativos)

El admin tiene **4 "OS" de coaching** que convierten datos crudos en acción del mentor. Todo se ve dentro del **dossier** (`usuarios/[id].tsx`) como secciones + 2 dashboards cross-client.

### 2.1 Mentor Execution OS — `lib/mentorExecution*.ts`
- **Por cliente** (dossier sección EJECUCIÓN): 6 scores explicables (adherencia, calidad de ejecución, follow-through, fricción, atención del mentor, momentum) + rúbrica de review + cola de intervención + **mentor-prep** (qué revisar antes de la sesión).
- **Cross-client** (`app/admin/mentores/ejecucion.tsx`): quién necesita intervención, quién está más retrasado, quién en caída. Hero de momentum + 3 listas.

### 2.2 Confrontation OS — "DIJO vs HIZO" — `lib/confrontation*.ts`
- Detecta cuando el cliente declaró algo explícito y la conducta lo contradice → `ConfrontationItem` con evidencia citable (said + did + gap) + severidad + prompt sugerido en voz de Norman.
- **Dossier sección FRICCIONES** (`FriccionesCard`): fricciones rankeadas + evidence visible + sugerido Norman + botón "NO APLICA · 7d".
- Privacidad por diseño: DMs y posts NUNCA se usan como evidencia.

### 2.3 Coach Intelligence v2 — `lib/coachIntelligence*.ts` (lo más nuevo)
- El "qué decirle esta semana" accionable + drivers con evidencia + momentum + profundidad relacional. Ver §1.1.

### 2.4 Memory OS — `lib/memory*.ts`
- Perfil vivo del cliente (compromisos abiertos/cerrados, blockers, wins) + resúmenes unificados + **briefing admin** generado por IA + notas privadas del mentor.
- **Dossier sección MEMORIA & BRIEFING** + dashboard cross-client (`app/admin/memoria.tsx`: loops abiertos, follow-up estancado, riesgo).

### 2.5 Veredicto mentores
**Muy completo.** El mentor humano tiene, por cliente: qué hace vs qué dice, scores de ejecución, fricciones citables, NBA de la semana, memoria viva, y prep de sesión. Cross-client: 3 dashboards (ejecución, biometría, memoria) ordenados por urgencia. Esto es señal operativa real, no surveillance.

---

## 3. CÓMO SE VE CADA DETALLE DEL ADMIN (estado visual, pantalla por pantalla)

Comparado contra el diseño "Polaris Admin Panel" (capturado en vivo de claude.ai/design).

| Pantalla | Estado visual | Detalle |
|---|---|---|
| **Sidebar** (`_layout.tsx`) | 🟡 Funcional, básico | Tiene 12 nav items + guard. Falta vs diseño: logo oro (PolarisLogo), labels de sección "OPERACIONES/INTELIGENCIA", activo con barra-acento oro, toggle dark/light, user card "Coach Polaris/ADMIN". Ancho 220 (diseño 260). |
| **Mission Control** (`index.tsx`) | 🟢 Alineado al diseño | Hero de distribución + listas (en riesgo / sin actividad / recién activados) con churn% + pills de severidad. Match. |
| **Dossier** (`usuarios/[id].tsx`) | 🟢 La más pulida | ChipNav sticky (10 secciones) + Coach Intelligence v2 cards + todas las secciones (identidad/membresías/ML/bio/memoria/ejecución/fricciones/cuerpo/reflexiones/audit). Es la joya. |
| **Biométrica** (`biometria.tsx`) | 🟢 Alineado · 🔴 sin datos | DistributionHero + listas por intervención. Pero vacío sin wearables conectados. |
| **Ejecución** (`mentores/ejecucion.tsx`) | 🟢 Alineado | Hero de momentum + 3 listas operativas. Match al patrón cross-client. |
| **Inteligencia ML** (`inteligencia/index.tsx`) | 🟡 Funcional | Charts agregados (cohort, churn, afinidades). Funciona; menos pulido que las hero. |
| **Memoria** (`memoria.tsx`) | 🟡 Funcional | 3 secciones de priorización. Sólido pero header ad-hoc. |
| **Usuarios lista** (`usuarios/index.tsx`) | 🟡 Funcional | FlatList + crear perfil. Búsqueda literal (no case-insensitive), sin filtros. |
| **Membresías** (`membresias/index.tsx`) | 🟡 Funcional | CRUD completo (activar/cancelar/extender/cambiar tier). Sin bulk, sin reactivar cancelada. |
| **Cursos** (`cursos/index.tsx`) | 🟡 Básico | Dar/revocar acceso. Sin filtro "sin acceso", sin bulk. |
| **Códigos** (`codigos/index.tsx`) | 🟡 Funcional | Crear/desactivar + copy. Sin filtros, sin export. |
| **Contenido** (`contenido/index.tsx`) | 🟡 Funcional | Diarios + conversaciones (solo-lectura, privacidad). Sin búsqueda/filtro. |
| **Moderación** (`comunidad/index.tsx`) | 🟡 Básico | Cola de reportes + cambio de estado. Sin contexto inline, sin respuesta. |
| **Auditoría** (`auditoria/index.tsx`) | 🟡 Básico | Log de 100 últimas acciones. Sin filtro/búsqueda, limit fijo. |

**Resumen visual:** las **4 pantallas hero** (Mission Control, Dossier, Biometría, Ejecución) ya matchean el diseño. Las **secundarias** (9 rutas) son funcionales pero visualmente menos pulidas — headers ad-hoc, poco Space Mono, sin el sidebar restyle. El gap es de **consistencia de shell**, no de funcionalidad.

A11y reciente: WCAG AA cumplido en las cards (pills tintadas + token `smoke` corregido + back buttons + modales con etiquetas).

---

## 4. VEREDICTO + QUÉ DESBLOQUEA VALOR (sin código nuevo)

**Lo que está fuerte:**
- 4 sistemas de mentoría completos y cableados (Memory · Execution · Confrontation · Coach Intelligence v2).
- Coach Intelligence v2 da drivers explicables — el coach sabe "por qué este score" y "qué decir".
- Dossier = pantalla de clase mundial. Mission Control + 2 cross-client alineados al diseño.

**Lo que NO se ve con datos reales (handoffs del dueño, no código):**
1. **Cron service-role** en Supabase → sin esto `user_intelligence` queda en defaults y el ML se ve plano.
2. **OAuth Oura/WHOOP** registrado (o build nativo HealthKit/HC) → sin esto la Biometría está vacía.
3. **Aplicar las migraciones nuevas** en el SQL Editor (memory/execution/biometric/confrontation/wearables/client_id/ml_consent/db_hardening).

**Lo que es deuda real de ML (futuro):**
- ML entrenado de verdad (regresión/XGBoost de churn, k-means de cohortes) necesita histórico labelado. Hoy = heurística explicable, que para coaching es más útil que un número opaco.

**Recomendación priorizada:**
1. (Owner, 0.5 día) Activar cron service-role + aplicar migraciones → el ML y los 4 OS pasan de "renderizan vacío" a "muestran señal real".
2. (Owner) Registrar OAuth wearables → Biometría con datos.
3. (Código, cuando quieras) Rebrand del shell admin (sidebar + headers + Space Mono en secundarias) para que las 9 rutas secundarias matcheen el nivel de las 4 hero.
4. (Futuro) ML entrenado cuando haya histórico de abandono.
