# 06 · BLOCKERS DE LANZAMIENTO — 2026-06-12

Lista corta y accionable. "Web" = PWA en Vercel (rollback instantáneo). "Nativo" = stores.

## Web (launch-candidate) — bloqueante real: NINGUNO técnico

| # | Item | Tipo | Owner | Esfuerzo |
|---|---|---|---|---|
| W1 | Smoke test manual (`docs/launch/PRELAUNCH_SMOKE_TEST.md`) en prod | Verificación | Founder/QA | 0.5d |
| W2 | Activar ai-proxy + rotar claves (recomendado pre-anuncio, no estrictamente bloqueante para beta privada por invitación) | Operación | Founder | 0.5d |
| W3 | Confirmar primer run verde de CI en GitHub | Verificación | Eng | 5 min |

## Nativo (stores) — bloqueado

| # | Item | Tipo | Owner | Esfuerzo |
|---|---|---|---|---|
| N1 | `eas init` → projectId real + credenciales firma iOS/Android | Operación | Founder | 0.5d |
| N2 | `npm i expo-av --legacy-peer-deps` (grabación de mentoría nativa) + buckets Storage `mentorship-audio`/`nutrition-plans` | Código+Ops | Eng | 1d |
| N3 | Decisión wearables v1: **descopar (recomendado)** o registrar `polaris://oauth/*` en consolas Oura/WHOOP + dev build | Decisión | Founder | 0 / 1-2d |
| N4 | Sweep de marca (Apple 2.3.8): unificar Polaris vs LifeFlow/GrowthPlayers/CMI en superficies store-facing | Producto | Producto | 1-2d |
| N5 | Build preview + TestFlight/Internal testing + smoke en device | Verificación | Eng | 1d |

## Decisiones pendientes del founder (no técnicas)

1. **Wearables en v1:** descopar (recomendado por war room + consejo) o completar.
2. **Pago web:** mantener "descarga la app" o integrar Stripe (hoy: mensaje claro, no dead-end).
3. **Fecha de cohorte 1:** el modelo por invitación permite lanzar web ya con la cohorte cerrada.

## Secuencia recomendada (2 semanas)

Semana 1: W2 → W1 → W3 → N1 → N2 · Semana 2: N3/N4 → N5 → revisión Go/No-Go con
`07_FINAL_SHIP_CHECKLIST.md`.
