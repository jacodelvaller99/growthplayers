# Task Evaluation System — modelo de tareas + scoring

Detalle técnico del motor (`lib/mentorExecutionLogic.ts`, puro y testeado). Fórmulas simples y
explicables a propósito.

## Modelo de tarea (`mentor_tasks`)

`id · user_id · title · description · category · source_type · source_id · assigned_by · assigned_at ·
due_date · priority(low|medium|high|critical) · status(not_started|in_progress|completed|blocked|
avoided|overdue|canceled) · evidence_required · evidence_type(checkin|text|transcript|lesson|biometrics
|upload|manual) · evidence_payload · self_report_score · mentor_score · execution_quality(low|medium|
high) · friction_reason · mentor_review_status(pending|ai_suggested|reviewed|approved|rejected|partial)
· completed_at · reviewed_at`.

`overdue` es **derivado** del tiempo (`deriveStatus`), no se persiste fijo: una tarea no completada con
`due_date` pasada se evalúa como vencida; `completed`/`blocked`/`avoided` se preservan.

Categorías: protocolo · bienestar · mentoría · identidad · negocio · relaciones · salud · energía ·
accountability · hábitos · decisiones.

## Rúbrica de review (`mentor_task_reviews`, admin-only)

El mentor clasifica, por tarea: **estado** (sin iniciar/parcial/completada/bloqueada/evitada) ·
**calidad** (baja/aceptable/fuerte/excepcional) · **confianza de evidencia** (ninguna/débil/moderada/
fuerte) · **tipo de fallo** (olvido/sin claridad/resistencia/miedo/perfeccionismo/caos de tiempo/
conflicto de identidad/baja energía/dependencia externa/cumplimiento aparente) · **acción del mentor**
(reforzar/simplificar/confrontar/redefinir/seguir/escalar) + notas. El veredicto refleja
`mentor_score`/`execution_quality` en la tarea (`submitReview`). El objetivo no es solo saber si está
hecha — es saber **qué significa el no-cumplimiento**.

## Scores (0-100)

| Score | Fórmula (resumen) | Dirección |
|---|---|---|
| **Adherencia** | % de tareas con fecha completadas (a tiempo=1, tarde=0.6, vencida=0). Sin tareas con fecha → 100. | mayor=mejor |
| **Calidad** | promedio de `mentor_score` (o mapeo de `execution_quality`: low 35 / medium 65 / high 90). Sin revisar → neutral 70. | mayor=mejor |
| **Follow-through** | 100·cumplidos/hechos (compromisos open+completed). Sin compromisos → 100. | mayor=mejor |
| **Fricción** | 100·(blocked·1 + avoided·1.2 + overdue·0.8)/activas. | mayor=PEOR |
| **Atención del mentor** | 0.40·fricción + 0.25·(100−adherencia) + 0.15·churn + crítica-vencida(+10 c/u, tope 20) + (días-sin-review−7). | mayor=intervenir antes |
| **Momentum** | bucket de adherencia+fricción → rising / stable / fragile / declining / critical. | estado |

Cada cómputo expone `drivers` (overdue, blocked, avoided, completed, criticalOverdue, churn) → cero
caja negra. Sin precisión falsa: son señales explicables para priorizar, no un veredicto automático.

## Cola de intervención (`buildInterventions`)

Reglas con severidad + acción recomendada: atención alta (≥70) · crítica vencida · fricción alta (≥60)
· baja adherencia (<40) · evitación repetida (≥2) · **falso cumplimiento** (marcada hecha, requería
evidencia, sin payload). Un cliente sano → sin alertas.

## Mentor Prep (`assembleMentorPrep`, determinista)

`execution_state · said_would_do (compromisos abiertos) · actually_did (completadas) ·
highest_friction_area (categoría con más bloqueo/evitación/vencimiento) · challenge (bloqueo recurrente)
· simplify (si >5 tareas abiertas) · celebrate (win reciente) · top_questions (loops + fricción +
compromiso) · tasks_to_review (top 3 abiertas por prioridad)`.

## Visibilidad

`clientSafeTasks` / `clientProgress` (cliente): sin `mentor_score`, fricción, review ni lenguaje duro
(`overdue` → "Pendiente", `avoided` → "En pausa"). `tierDepth` decide profundidad por tier.

## Tests (`__tests__/unit/mentorExecution.test.ts`, 29)

deriveStatus (overdue derivado, preservación) · cada score con entradas conocidas · momentum buckets ·
computeClientScores bundle · tierDepth · buildInterventions (umbrales + falso cumplimiento) ·
assembleMentorPrep (shape, dijo-vs-hizo) · vista cliente (strip + progreso).
