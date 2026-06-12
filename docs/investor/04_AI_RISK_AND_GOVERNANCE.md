# 04 · RIESGO Y GOBERNANZA DE IA — 2026-06-12

## Superficies de IA del producto

1. **Norman (mentor)** — chat streaming contextualizado con biometría/historial/ML scores.
2. **Transcripción de mentoría** — voz → Whisper → notas + plan de acción redactados por Norman.
3. **Memoria vectorial** — embeddings de mensajes significativos (pgvector), recuperación semántica.
4. **Motor de inteligencia** — engagement/churn/next-action server-side (no generativo).

## Controles implementados (con evidencia)

| Control | Implementación | Protección contra regresión |
|---|---|---|
| Divulgación de IA | "REGLA DE HONESTIDAD (innegociable)" en el system prompt — Norman se declara IA si se le pregunta, nunca afirma ser humano (`lib/mentor.ts:314`) | ✅ Test unitario que falla si la regla sale del prompt |
| Ruteo de crisis | Bloque "SEGURIDAD — PRIORIDAD ABSOLUTA": ante ideación de autolesión deja el coaching y deriva a líneas de emergencia (123/106 CO) (`lib/mentor.ts:317-325`) | ✅ Test unitario |
| Sin claims médicos | Disclaimers de salud contextual (ayuno/suplementación/prácticas) + legal/salud; lenguaje no clínico auditado (war room Copy) | Revisión editorial |
| Resiliencia | Fallback 3 proveedores; timeout 45s + abort + cancelar; texto parcial nunca se pierde | ✅ Tests de cadena + parser SSE |
| Autenticación del acceso a IA | `ai-proxy` exige JWT de usuario; memoria del mentor exige JWT y fuerza `user_id=auth.uid()` (desplegado, curl sin token → 401) | Verificado en prod |
| Contención de payload | Límite 64KB de mensajes por request en el proxy (anti contexto desbocado) | Código del proxy |
| Consentimiento ML | `ml_consent` gated en analytics; consentimiento explícito en onboarding | Persistido en perfil |

## Riesgos abiertos y plan

1. **Claves en bundle (transitorio).** Mitigación desplegada (ai-proxy); pendiente: secrets +
   `EXPO_PUBLIC_AI_PROXY_URL` + **rotación** de claves expuestas. Hasta entonces el costo de
   extracción de clave = riesgo de quota-drain, no de datos (las claves no dan acceso a PII).
2. **Budgets por interacción.** No hay límite de gasto por usuario/sesión más allá del payload.
   El proxy es el punto único donde imponerlos (tokens/min, sesiones/día, presupuesto mensual).
3. **Consistencia de persona entre proveedores.** El system prompt es compartido, pero no hay
   "persona runtime contract" con validación post-respuesta (recomendación CTO del consejo).
4. **Sobre-interpretación de biometría.** El prompt usa lenguaje probabilístico, pero no existe
   un knowledge layer con scoring de evidencia por práctica (prioridad 6 del consejo).
5. **Trazabilidad.** Conversaciones se persisten (`mentor_conversations`); no se registra aún
   proveedor usado/causa de fallback/latencia por respuesta (deseable para governance y costo).

## Postura

La capa de IA tiene los guardrails de seguridad y honestidad **en el código y protegidos por
tests**, y el control de claves tiene camino de salida desplegado. La deuda restante es de
gobernanza operativa (budgets, trazabilidad, contrato de persona), no de exposición de datos.
