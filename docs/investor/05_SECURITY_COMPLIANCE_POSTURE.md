# 05 · POSTURA DE SEGURIDAD Y COMPLIANCE — 2026-06-12

## Modelo de amenaza cubierto

| Vector | Defensa | Estado |
|---|---|---|
| Escalación de privilegios (self-grant admin/tier) | Trigger BEFORE-UPDATE + políticas removidas (`20260602000000_security_hardening_p0.sql`) | ✅ Aplicado en prod (dashboard, 2026-06-02) |
| Exfiltración cross-user vía Edge Functions | JWT obligatorio + `user_id = auth.uid()` forzado en generate-embeddings; service-role-only en batch | ✅ **Desplegado 2026-06-12**; curl sin token → 401 |
| Lectura de PII por RLS débil | RLS por usuario en tablas núcleo; vistas con security_invoker | ✅ Migración aplicada |
| Códigos de acceso (paywall bypass) | Políticas abiertas removidas; redención solo por RPC atómica | ✅ Aplicado |
| XSS / clickjacking / MITM (web) | CSP completa + HSTS 2 años + X-Frame-Options + nosniff (vercel.json) | ✅ Vivo en prod (verificado por headers) |
| Acceso a rutas privadas sin sesión | `Stack.Protected` (37 rutas) + redirects + RLS de respaldo | ✅ E2E verificado en prod |
| Claves de IA | Proxy server-side desplegado; activación + rotación pendientes | 🟡 Transitorio |
| Tokens OAuth wearables | En texto plano en DB | 🟠 Abierto (cifrar o descopar wearables v1) |

## Compliance (stores + privacidad)

| Requisito | Estado | Evidencia |
|---|---|---|
| Apple 1.2 — UGC moderado | ✅ | Reportar + bloquear (filtra feed y DM) + EULA tolerancia cero + filtro de contenido + cola admin |
| Apple 1.4.1 — IA honesta / crisis | ✅ | Divulgación + ruteo a emergencia, protegido por test |
| Apple 5.1.1(v) — borrado in-app | ✅ | `delete-account` 33 tablas + CASCADE, **desplegado** |
| GDPR — erasure/export/consent | ✅ base | Delete completo; export JSON; consentimiento granular en onboarding (términos/privacidad/salud) persistido |
| Legal surfaces | ✅ | `app/legal/{terminos,privacidad,salud}` con contenido real + links en paywall/onboarding; `privacyPolicyUrl` en app.json |
| Suscripción conforme | ✅ | Texto de auto-renovación; sin promesas de reembolso no honrables; Restore Purchases |
| Health framing | ✅ | "Bienestar, no atención médica" + SafetyWarnings contextuales en prácticas |
| Apple 2.3.8 — consistencia de marca | 🟠 | Mezcla Polaris/LifeFlow/GrowthPlayers/CMI — sweep pendiente |

## Qué falta para una postura "verde" completa

1. Activar ai-proxy + rotar claves (elimina el último secreto en cliente).
2. Cifrado de tokens wearables **o** descope de wearables en v1 (decisión de producto).
3. Sweep de marca store-facing.
4. Staging para probar migraciones fuera de prod.
5. Monitoreo de crashes externo (hoy: analytics propio `app_crash` — suficiente para web beta,
   corto para escala nativa; Sentry es el candidato).

**Lectura honesta:** la confidencialidad de PII/salud — el riesgo existencial señalado el
2026-06-02 — está cerrada en DB **y desde hoy también en las funciones desplegadas**. Lo
abierto es endurecimiento operativo, no agujeros activos conocidos.
