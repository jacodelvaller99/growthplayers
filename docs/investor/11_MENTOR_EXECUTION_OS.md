# Mentor Execution OS — operaciones de coaching

**Fecha:** 2026-06-16 · **Estado:** implementado (migración pendiente de aplicar en dashboard).

## Qué es

La capa **operativa** que convierte las tareas del cliente en objetos evaluables y le da al
equipo de mentoría un sistema para detectar riesgo temprano, priorizar intervenciones y preparar
sesiones de mayor calidad. No es un checklist: es un **sistema de operaciones de coaching**.

Responde, por cliente: qué tareas tiene, cuáles están hechas/parciales/bloqueadas/evitadas/vencidas,
con qué evidencia, con qué calidad, qué patrón explica el no-cumplimiento, quién necesita intervención
ahora, y qué debe tratar el mentor en la próxima sesión.

## 4 módulos

- **A · Task Command Center** — `mentor_tasks` como objeto unificado (fuente, prioridad, due, status,
  evidencia, calidad, review). Por cliente y cross-client.
- **B · Client Execution Score** — 6 scores explicables (abajo).
- **C · Mentor Review Workspace** — rúbrica por tarea (`MentorReviewDrawer`): estado · calidad ·
  confianza de evidencia · tipo de fallo · acción del mentor + notas → `mentor_task_reviews`.
- **D · Intervention Queue** — cola cross-client: quién está en alerta, retrasado o en caída.

## Reutiliza, no duplica

`mentor_tasks` **normaliza** las fuentes existentes (planes de acción de mentoría, `mentorship_tasks`,
compromisos del Memory OS, lección/hábitos) — sin borrarlas. La IA **propone** tareas
(`mentor_review_status = 'ai_suggested'` desde compromisos de Norman); el **mentor aprueba**. La
evaluación autoritativa vive en `mentor_task_reviews` (admin-only).

## Scores (0-100, explicables — ver doc 12)

Adherencia · Calidad de ejecución · Follow-through · **Fricción** (mayor=peor) · **Atención del mentor**
(mayor=intervenir antes) · **Momentum** (rising/stable/fragile/declining/critical). Cada score expone
sus *drivers* (overdue, blocked, avoided, churn…) para que nada sea una caja negra.

## Diferencial por tier

`tierDepth()`: free → básico (vista ligera, "lo siguiente" + nudge a Premium); premium → completo;
premium_plus/polaris/growthplayers → profundo. Admin/mentor ve todo; el cliente ve solo sus tareas y
un progreso de apoyo (`clientSafeTasks`/`clientProgress`) — sin scoring duro ni lenguaje de evaluación.

## Automatizaciones

- Al confirmar una mentoría → el plan de acción se materializa en `mentor_tasks` (`createTasksFromActionPlan`).
- Compromiso detectado por Norman en chat → tarea `ai_suggested` (`suggestTasksFromCommitments`).
- Al abrir el detalle del cliente (admin) → normaliza fuentes, computa/persiste scores y regenera la
  cola de intervención (`fetchUserExecution` → `computeAndPersistScores`).
- **Mentor Prep** determinista por cliente: estado · dijo-vs-hizo · mayor fricción · confrontar ·
  simplificar · celebrar · 3 preguntas · 3 tareas a revisar (`NextMentorshipAgendaCard`).

## Privacidad / RLS

`mentor_tasks`: dueño+admin. `mentor_task_reviews` / `mentor_client_scores` /
`mentor_intervention_queue`: **admin-only**. El cliente nunca lee scores crudos ni reviews.

## Archivos clave

- Migración: `supabase/migrations/20260616000000_mentor_execution.sql`
- Pura (testeada, 29 tests): `lib/mentorExecutionLogic.ts` · IO/automatización: `lib/mentorExecution.ts`
- UI: `components/mentor-execution.tsx`, sección Ejecución en `app/admin/usuarios/[id].tsx`,
  dashboard `app/admin/mentores/ejecucion.tsx`, vista cliente `app/perfil/cliente.tsx`
- Integración: `hooks/use-mentorship.tsx` (confirmDraft), `app/(tabs)/mentor.tsx` (chat blur)

## Validación

`tsc 0 · lint 0 errores · 103 tests (29 nuevos) · export web OK`.

## Pendiente / evolución

- Aplicar la migración en prod (dashboard).
- Surfacing en `comando` (hoy "Lo siguiente" vive en perfil/cliente).
- Automatizaciones por **cron** (recalcular scores al vencer, mentor-prep nocturno) → requieren deploy
  server-side (handoff); hoy se computan on-read al abrir el cliente.
- IA opcional para enriquecer el mentor-prep (hoy determinista, ya útil).
