# Memory OS — sistema de memoria de cliente + inteligencia de mentoría

**Fecha:** 2026-06-15 · **Estado:** implementado (migración pendiente de aplicar en prod vía dashboard).

## Qué es

No es "historial de chat". Es una **memoria operativa por cliente** y una **capa de inteligencia
para el coach**, en dos planos:

- **Cliente (Norman):** recuerda entre sesiones la identidad, metas, bloqueos, **compromisos** y
  loops abiertos del usuario, y los usa con naturalidad ("la semana pasada te comprometiste a X,
  ¿qué pasó?") — solo desde compromisos realmente almacenados.
- **Admin (coach):** un dossier por cliente — síntesis ejecutiva, temas recurrentes, compromisos
  abiertos/cumplidos, **briefing pre-mentoría** (preguntas sugeridas + challenge points + riesgo), y
  **notas privadas**. Más un dashboard cross-client para priorizar a quién atender.

## Arquitectura (reutiliza, no duplica)

Se reutilizó la infraestructura existente y se añadió **solo la capa narrativa faltante**:

| Capa | Implementación |
|------|----------------|
| Chat crudo (continuidad) | `mentor_conversations` / `mentor_messages` (existente) |
| Episódica / semántica (pgvector) | `mentor_memories` + RPC `search_mentor_memories` + `generate-embeddings` (existente; + columnas `source_type`/`tags`/`event_date`) |
| **Resúmenes unificados** | **`memory_summaries`** (chat · mentoría · llamada Plaud · manual) — NUEVO |
| **Perfil vivo sintetizado** | **`user_memory_profile`** (identidad, metas, bloqueos, compromisos, riesgos, foco…) — NUEVO |
| **Briefing operativo (admin)** | **`admin_briefings`** (admin-only por RLS) — NUEVO |
| **Notas privadas del coach** | **`admin_notes`** (admin-only por RLS) — NUEVO |

**Generación IA client-side:** los resúmenes y la síntesis del perfil corren vía
`streamMentorResponse` (misma cadena Claude Sonnet 4.6 → NVIDIA → Groq → OpenAI que el resto del app),
sin servidor nuevo. El perfil **sintetiza, no acumula** (dedup + caps por campo → anti-bloat,
protege la economía unitaria).

## Privacidad y gobernanza

- `admin_briefings` y `admin_notes` son **admin-only** por RLS (`is_admin`); el cliente no los ve.
- El contexto de Norman **excluye** notas privadas y challenge points.
- La vista cliente pasa por `clientSafeProfile` (oculta riesgos crudos, patrones, estilo, salud).
- Todo degrada a vacío si la migración/función no está aplicada — nunca rompe el flujo.

## Archivos clave

- Migración: `supabase/migrations/20260615000000_memory_system.sql`
- Lógica pura (testeada): `lib/memoryLogic.ts` · IO: `lib/memory.ts` · IA: `lib/memorySummarizer.ts`
- Integración: `lib/mentor.ts` (bloque "MEMORIA DEL CLIENTE"), `app/(tabs)/mentor.tsx` (resumen al
  cerrar sesión), `hooks/use-mentorship.tsx` (`confirmDraft`)
- UI admin: `app/admin/usuarios/[id].tsx` (sección Memoria), `app/admin/memoria.tsx` (dashboard)
- UI cliente: `app/perfil/cliente.tsx` · Import: `components/PlaudImport.tsx`
- Componentes: `components/memory.tsx` · Queries admin: `lib/admin/queries.ts`

## Validación

- `lib/memoryLogic.ts`: 17 tests de lógica pura (merge de perfil, parseo tolerante, vista cliente,
  ensamblado de contexto). Suite total: 74 tests · `tsc` 0 · `lint` 0 errores · export web OK.

## Pendiente

- Aplicar la migración en prod (SQL Editor del dashboard) — los embeddings server-side
  (`generate-embeddings`) siguen como handoff de deploy; la memoria narrativa no depende de ellos.
- Evolución: mover la summarización a una Edge Function con cron (hoy client-side por decisión).
