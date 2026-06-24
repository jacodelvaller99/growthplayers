# Metacognición — drive a completar y pushear (autónomo)

> Directiva del dueño: dejar TODO completo y profundamente funcional, commitear, pushear,
> loop hasta que funcione, sin mensajes hasta el 100%. Permiso de commit+push concedido.

## Definición honesta de "100% completo" (qué controlo vs qué no)

**En mi poder (lo llevo a 100% en este drive):**
- Gate verde: `tsc 0` · `lint 0 errores` · `jest` verde · `expo export web` OK.
- Sin crash de runtime en las pantallas alcanzables (verificación en preview).
- TODO el trabajo de la sesión + el internista pulido **commiteado**.
- **Pusheado** a `launch-hardening-p0`.
- Handoffs de infra documentados con precisión (para el último tramo del dueño).

**Físicamente fuera de mi alcance (no lo puedo fingir — requiere credenciales/cuenta del dueño):**
- Aplicar las 3 migraciones en el SQL Editor del dashboard (sin service-role local; Chrome MCP no renderiza la SPA).
- Redeploy de edge functions (`smart-notifications`, etc.).
- Secrets de ai-proxy / Terra.
- `eas init` + build nativo (push 24h, biofeedback, HealthKit/Health Connect, WHOOP).
- Testimonios reales / oferta Magister (contenido + consentimiento).

→ "100% de MI scope" = código completo, verificado, commiteado, pusheado + handoffs nítidos.
El residual de producción es físicamente owner-only; documentarlo con honestidad ES completarlo
por mi parte. Fingirlo violaría la integridad del trabajo.

## Criterios de salida del loop (todos deben cumplirse)
1. [ ] Gate completo verde (tsc/lint/test/export).
2. [ ] Preview: welcome (pantalla pública) renderiza sin error de consola, con la nueva triada + tagline.
3. [ ] Internista pulido commiteado.
4. [ ] Backlog del audit commiteado.
5. [ ] `git push` exitoso a launch-hardening-p0.
6. [ ] Handoffs de infra en docs.

## Autocrítica / riesgos vigilados
- **Off-by-one onboarding** (TOTAL_STEPS 5→6): revisado adversarialmente, consent sigue paso 0 bloqueante. Re-verifico en preview si alcanzo el flujo.
- **web_leads RLS**: insert anon / select admin; dup=éxito. Migración sin aplicar (handoff).
- **No padding**: no invento trabajo ni claims. Si el well autónomo está seco, lo digo y empujo al dueño — eso NO es complacencia, es honestidad.
- **Preview auth-gated**: solo welcome es 100% pública; onboarding/paywall necesitan sesión. Verifico lo alcanzable; el resto queda cubierto por gate+export+revisión adversarial.

## Bitácora
- Inicio del drive: gate ya verde (tsc 0 · lint 0 · 339 tests · export OK) tras cierre paralelo + 2 fixes de review.
