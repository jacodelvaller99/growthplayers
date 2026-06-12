# 07 · CHECKLIST FINAL DE SHIP (firmable) — actualizado 2026-06-12

No se declara "listo" sin marcar TODAS las casillas de la sección correspondiente.
Estado actual pre-marcado con evidencia.

## Seguridad / Datos

- [x] Migración anti-escalación aplicada en prod (trigger + políticas) — 2026-06-02, SQL editor
- [x] Edge Functions con auth **desplegadas** (4 redeploys + ai-proxy) — 2026-06-12, curl 401
- [x] RLS por usuario en tablas PII/salud + vistas security_invoker
- [x] Headers CSP/HSTS vivos en prod (verificado por curl -I)
- [x] Rutas privadas con guard de navegación (E2E prod ambos caminos)
- [ ] ai-proxy ACTIVO (secrets + env var) y claves antiguas **rotadas**
- [ ] Tokens wearables cifrados — o wearables descopados de v1

## Compliance / Legal

- [x] Divulgación de IA + ruteo de crisis (protegido por test)
- [x] Consentimiento en onboarding (términos/privacidad/salud) persistido
- [x] Legal screens con contenido real + links in-app + privacyPolicyUrl
- [x] UGC: reportar + bloquear + EULA + filtro + cola admin
- [x] Borrado de cuenta GDPR completo desplegado (33 tablas + CASCADE)
- [x] Suscripción: auto-renovación + Restore, sin promesas falsas
- [ ] URLs públicas de Privacy/Terms accesibles fuera de la app (página estática)
- [ ] Sweep de marca store-facing (un solo nombre)

## Robustez / Calidad

- [x] Chat IA: timeout 45s + cancelar + texto parcial preservado + feedback de timeout
- [x] Cola offline con feedback honesto (synced/queued)
- [x] ErrorBoundary + captura global de crashes → analytics
- [x] tsc 0 · lint 0 errores · 53/53 tests · export web OK
- [x] CI configurado (lint+typecheck+test+export)
- [ ] Primer run de CI verde confirmado en GitHub
- [ ] Smoke test manual completo (PRELAUNCH_SMOKE_TEST.md) en iOS/Android/web aplicables

## Operación

- [x] Deploy web reproducible (push → Vercel) con rollback instantáneo
- [x] Funciones desplegables sin CLI (flujo dashboard documentado en EXECUTION_LOG)
- [ ] `eas init` + credenciales (desbloquea nativo)
- [ ] Cron service-role configurado (smart-notifications/sync programados)
- [ ] Monitoreo post-launch activo (POST_LAUNCH_MONITORING.md) + canal de alertas

## Producto / Activación

- [x] Loop nuclear: check-in → recomendación accionable → próxima acción visible
- [x] Day-zero: entrada clara ("EMPIEZA AQUÍ")
- [ ] Semana 1 guiada (sprint D1-D7) — mayor delta restante de activación
- [ ] Curaduría por evidencia del hub de bienestar (jerarquía epistemológica)

**Firma de release (Go/No-Go):** Producto ___ · Ingeniería ___ · Legal ___ · Fecha ___
