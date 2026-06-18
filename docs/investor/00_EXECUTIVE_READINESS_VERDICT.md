# 00 · VEREDICTO EJECUTIVO DE READINESS — 2026-06-12

> Para founder/operador/inversionista. Cada afirmación es verificable en código, commit o
> producción. Complementa (y corrige en fecha) `docs/launch/00_EXECUTIVE_LAUNCH_VERDICT.md` (2026-06-02).

## Veredicto: 🟡 CONDITIONALLY INVESTOR-READY · web launch-candidate, nativo bloqueado

**Score de readiness: 74/100** (era ~35 el 2026-06-02 con la misma vara).

| Dimensión | Estado | Evidencia clave |
|---|---|---|
| Seguridad (datos/PII) | 🟢 Fuerte | Migración anti-escalación aplicada en prod; 4 Edge Functions con auth **desplegadas hoy** (curl sin token → 401); RLS por usuario; CSP/HSTS vivos en prod |
| Compliance (stores/legal) | 🟢 Base sólida | IA con divulgación + ruteo de crisis (protegido por test); consentimiento en onboarding (+ ml_consent opt-in explícito, RGPD); legal screens; UGC moderado (reportar/bloquear/EULA/filtro + cola admin); GDPR delete 48 operaciones (deploy = handoff) |
| Robustez | 🟢 Buena | Timeout/abort+cancel del chat (+ watchdog idle + failover por proveedor); outbox idempotente (mensajes vía client_id); observabilidad de degradación + healthcheck de schema; ErrorBoundary + captura global; guards en 42 rutas (verificación manual) |
| Calidad de ingeniería | 🟡 En pie | 204 tests reales + CI; tsc/lint en 0 errores; sin E2E automatizado |
| Producto/activación | 🟡 Medio | Loop check-in→recomendación ✓; day-zero framing ✓; rediseño de Semana 1 guiada pendiente (prioridad 5 del consejo) |
| Operación | 🟠 Débil | eas projectId placeholder (nativo bloqueado); cron service-role sin configurar; sin staging; secrets del ai-proxy pendientes |
| Economía unitaria IA | 🟠 Riesgo | Claves aún en bundle hasta activar proxy; sin budgets por interacción (límite burdo 64KB en proxy) |

## Lo que cambió hoy (resumen de 1 minuto)

1. **Descubrimiento crítico:** los fixes de seguridad de Edge Functions del 2026-06-02 nunca se
   desplegaron — prod corría versiones vulnerables. **Hoy quedaron desplegadas y verificadas.**
2. Guards de navegación en todas las rutas privadas (verificado E2E en prod, ambos caminos).
3. Suite de tests real (53) + CI; 14 errores de lint (6 con riesgo de crash) eliminados.
4. `ai-proxy` desplegado: claves de IA server-side listas para activar (secrets + env var + rotación).
5. Docs alineados con la realidad (addenda fechados; CLAUDE.md corregido; este paquete).

## Para pasar a "READY FOR LAUNCH-CANDIDATE REVIEW" (en orden)

1. Activar ai-proxy (secrets → env var → **rotar claves**) — 0.5 día, owner: founder.
2. `eas init` + credenciales de firma — 0.5 día (desbloquea nativo).
3. Smoke test manual de `PRELAUNCH_SMOKE_TEST.md` en iOS/Android/web.
4. Decisión explícita: wearables descopados para v1 (recomendado) o registrar URIs en consolas.
5. Semana 1 guiada (activación) — el mayor delta de producto restante.

## Los 3 riesgos que un inversionista debe conocer (sin maquillaje)

1. **Foco de producto** — amplitud funcional alta vs. un journey nuclear nítido (tesis del
   consejo asesor 2026-06-12; ver CLAUDE.md → Strategic Roadmap).
2. **Regulatorio/reputacional** — IA + biometría + wellness sensible exige mantener los
   guardrails (hoy protegidos por test) y la curaduría por evidencia pendiente.
3. **Costo de IA** — voz+memoria+chat sin budgets por usuario puede erosionar margen premium;
   el proxy es el punto de control natural para imponerlos.
