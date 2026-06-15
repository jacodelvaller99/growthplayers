# INVESTOR-READY CHANGELOG — Polaris Growth Institute

Cambios con impacto en la tesis de inversión, en orden cronológico inverso.
Cada entrada referencia commits/evidencia real. Complementa `EXECUTION_LOG.md` (operacional).

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
