# Polaris — Launch-Readiness

Loop de **verificación** (no de generación). El código está listo; esto rastrea los
**handoffs del dueño** hasta que todo esté verde en producción.

**Cómo correrlo:** `bash scripts/launch-readiness.sh` — on-demand, tras cada handoff.
Es read-only (no escribe secretos, no aplica migraciones, no despliega).

---

## Scorecard (última corrida)

| # | Gate | Estado | Próxima acción |
|---|------|--------|----------------|
| 1 | **Gate (tsc + tests)** | ✅ | — (CI lo cubre en cada push) |
| 2 | **Claude (ai-proxy)** | ⚠️ desplegado, auth-gated | Poner secret + verificar logueado |
| 3a | **Migración `web_leads`** | ❌ no aplicada | Aplicar `20260626000000_web_leads.sql` |
| 3b | **Migraciones wearables** | ✅ aplicadas | — |
| 4 | **Prod (merge + deploy)** | ❌ sin las mejoras | Merge `launch-hardening-p0` → `main` |
| 5 | **Nativo (eas)** | ⚠️ pendiente | `eas init` + build + device-test teclado |

> El script es la fuente de verdad — esta tabla es el snapshot. Re-córrelo tras cada paso.

---

## Handoffs del dueño (en orden de impacto)

1. **Claude vivo** — el de mayor ROI (internista + Norman pasan a Claude Sonnet 4.6):
   - **Rota** la key que pegaste en el chat (está comprometida) → genera una nueva en console.anthropic.com.
   - `supabase secrets set ANTHROPIC_API_KEY=<key-NUEVA> --project-ref bizbbtiyftfjufxinwsu`
   - `supabase functions deploy ai-proxy`
   - Avísame y **yo añado** `EXPO_PUBLIC_AI_PROXY_URL=https://bizbbtiyftfjufxinwsu.supabase.co/functions/v1/ai-proxy`
     a `.env.local` (URL pública, no secreto) — y verificamos que Claude responde logueado.

2. **Migración `web_leads`** — pega `supabase/migrations/20260626000000_web_leads.sql` en el SQL Editor.
   (Las de wearables ya están aplicadas según el probe.)

3. **Producción** — merge `launch-hardening-p0` → `main`. Vercel despliega solo.
   Tras el deploy, el gate #4 del script pasa a ✅.

4. **Redeploy `smart-notifications`** — para que el copy honesto nuevo surta efecto.

5. **Nativo** — `eas init` + `eas build --profile preview --platform all` → habilita push 24h,
   biofeedback, HealthKit/Health Connect, WHOOP, y permite el **device-test del teclado** (KAV)
   que quedó como única validación abierta del último commit.

6. **Contenido** — testimonios reales (`data/testimonials.ts`) + oferta Magister concreta.

---

## Qué NO hace este loop
Verifica; no ejecuta los handoffs. No configura el secret de Claude (límite de seguridad +
credencial del dueño), no aplica migraciones, no despliega, no hace `eas build`.
