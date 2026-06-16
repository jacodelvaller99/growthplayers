# 19 — Final Production GO / NO-GO

> Fecha: 2026-06-16. Veredicto basado en evidencia verificada, no en aspiración.

## VEREDICTO: **PRODUCTION CANDIDATE**
- **Web (PWA):** **GO condicional** — desplegable hoy tras rellenar datos legales (no-código).
- **Native (iOS/Android store):** **NO-GO hasta handoffs del dueño** (`eas init` + legal + cuentas).

La base técnica es de producción: segura (P0s cerrados + verificados en prod), resiliente (local-first),
testeada (134 tests + CI), y honesta (sin éxito fingido). Lo que falta para tienda **no es código** —
son credenciales y datos de entidad que solo el dueño puede aportar.

## Bloqueantes duros (ordenados) y dueño de cada uno
| # | Bloqueante | Tipo | Dueño | Estado |
|---|---|---|---|---|
| 1 | `app.json` `eas.projectId` placeholder | Build nativo | Dueño (`eas init`) | ⛔ abierto |
| 2 | Placeholders legales visibles (`[RAZÓN SOCIAL]`, `[EMAIL LEGAL]`, `[DIRECCIÓN]`, crisis) | Submission | Dueño (datos entidad) | ⛔ abierto |
| 3 | `delete-account` cobertura de tablas nuevas (GDPR/5.1.1) | Compliance | **Agente** | ✅ **cerrado este pase** |
| 4 | `journal_entries` faltaba en prod | Datos | **Agente** | ✅ cerrado (migración) |
| 5 | Claves IA en bundle web | Seguridad | Dueño (activar ai-proxy) | 🟡 mitigado (proxy listo, inactivo) |
| 6 | URIs OAuth Oura/WHOOP sin registrar | Wearables nativos | Dueño (consolas) | ⛔ abierto (no bloquea web/v1) |

## Lo que está listo (verificado)
- Seguridad P0: RLS + anti-escalación, Edge auth (401 sin token), moderación UGC, Norman con disclosure +
  ruteo de crisis, ErrorBoundary + crash capture. **Desplegado y verificado en prod.**
- Resiliencia: local-first en todo el core-loop; cola offline idempotente; tier-sync ya no traga fallos.
- GDPR: borrado de cuenta ahora cubre todas las tablas PII (Memory/Execution/Biometric/mentoría/DM/bloqueos).
- Calidad: `tsc 0` · `lint 0 errores` · `134 tests` · `export web OK` · CI en cada push.
- UX: tema light/dark funcional (0 fondos oscuros en claro, probado en vivo); pulido de legibilidad/táctil.

## Riesgos residuales honestos (no bloqueantes de v1)
1. Sync cloud de mensajes de mentor sin retry (local-first protege el dato; cross-device = backlog #21).
2. `ml_consent` default opt-in (debería opt-out — ajuste de privacidad recomendado).
3. Densidad tipográfica en `comando.tsx`/`mentor.tsx` (pulido, no funcional).
4. Sin staging env ni down-migrations (madurez operativa, recomendado pre-scale).
5. Cron de scoring/insights pendiente (hoy on-read client-side; funciona, no escala infinitamente).

## Camino mínimo a "ship" (estimado)
1. [Dueño · 0.5d] Rellenar `app/legal/*` con entidad real + líneas de crisis.
2. [Dueño · 0.5d] `eas init` → projectId real.
3. [Dueño · 0.5d] Activar ai-proxy (secrets + env var + rotar claves).
4. [Agente · hecho] Redeploy `delete-account`.
→ Con 1+2: **web lanzable**. Con 1+2+3: **native submittable** (tras assets de tienda + cuentas dev).

## Recomendación
**Lanzar web primero** una vez rellenados los datos legales; preparar native en paralelo mientras el dueño
ejecuta `eas init` y activa el proxy. La ingeniería no es el cuello de botella — los handoffs de credenciales
lo son. El producto es **defendible ante inversionistas hoy**: seguro, testeado, honesto y diferenciado
(Memory OS + Mentor Execution OS + Biometric Intelligence sobre Norman).
