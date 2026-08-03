# Polaris — Estado actual (2026-08-03)

Este documento reemplaza a `00_EXECUTIVE_LAUNCH_VERDICT.md`, `OWNER_HANDOFF_PACKET.md`,
`RUNBOOK_DUENO_2026-07-29.md`, `KNOWN_ISSUES_REGISTER.md`, `RELEASE_BLOCKER_MATRIX.md`
y `RELEASE_RUNBOOK.md` — todos daban un veredicto de una fecha concreta (la mayoría
del "🔴 RED, no se puede lanzar esta semana" de la auditoría inicial) que ya no
describe el estado real del producto. Se borraron para que no quede un registro
que contradiga lo que hoy es cierto.

Lo que **no** se tocó: `SECURITY_LAUNCH_AUDIT.md`, `QA_MASTER_TEST_PLAN.md`,
`legal/`, `STORE_METADATA_REVIEW.md` y el resto de contenido sustancial de
`docs/launch/` — eso sigue siendo referencia válida, no un veredicto de estado.
Para arquitectura y patrones técnicos, `CLAUDE.md` en la raíz del repo manda —
este archivo es un corte de estado, no documentación técnica.

---

## Rutas de desarrollo

| Qué | Ruta |
|---|---|
| **Working copy principal** (rama `launch-hardening-p0`) | `C:\Users\ASUS\OneDrive - Caja de Compensacion Familiar de Antioquia COMFAMA\Escritorio\JACO EL PROGRAMADOR\Growth Players-Polaris\.claude\worktrees\sweet-diffie\lifeflow` |
| **Worktree paralelo** — sonido/voz de Bienestar (rama `meditaciones-sonido-voz`) | `C:\Users\ASUS\wt\medita` |
| **Remoto** | `https://github.com/jacodelvaller99/growthplayers.git` |
| **Deploy web** | Vercel, automático en push a `main` (`vercel.json`: `npx expo export --platform web`) |
| **Dominio prod** | `polarisgrowthinstitute.vercel.app` (`growthplayers.vercel.app` redirige 307 hacia él) |

Ambas rutas son worktrees de git del mismo repositorio — comparten historia,
cada una en su propia rama, para poder trabajar en paralelo sin pisarse archivos.
Ninguna de las dos está pusheada a `origin` en este momento (ver commits locales
más abajo) — el push siempre requiere una instrucción explícita aparte.

---

## Resumen ejecutivo

Polaris pasó de "app con simulación de IA y varios módulos a medio construir"
(estado de la auditoría original de julio) a una plataforma con **más de una
docena de sistemas propios completos**: Memory OS, Mentor Execution OS,
Inteligencia Biométrica, Confrontation OS ("dijo vs hizo"), Internista educativo,
wearables (OAuth + nativo + agregador universal Terra), El Círculo (red social
interna), panel de administración completo, y — desde esta semana — el
**Camino del Héroe** (narrativa de progreso personalizada) y **Perfeccionamiento
Bienestar** (sonido y voz reales en meditación/sueño/binaurales, en curso).

El código está en buen estado técnico: **620+ tests unitarios verdes, 0 errores
de TypeScript, 0 errores de lint, export web limpio**, y un sistema de
regresión (`witness`) que falla el CI si un fix documentado se revierte en
silencio. Lo que falta para lanzar **no es código en su mayoría** — son
handoffs operativos del dueño (secrets, deploys de edge functions, `eas init`,
migraciones SQL, cuentas de terceros) detallados más abajo.

---

## Sistemas construidos (estado por área)

| Sistema | Estado | Nota |
|---|---|---|
| Núcleo (Comando · Norte · Check-in · Programas · Progreso) | ✅ Completo, con estados honestos (Empty/Error/Skeleton) | Fallos silenciosos eliminados (S1) |
| Mentor IA "Norman" (Claude → NVIDIA → Groq → OpenAI) | ✅ Completo vía `ai-proxy` | **Necesita el handoff de activación** — ver abajo |
| Memory OS (perfil vivo + resúmenes + memoria vectorial) | ✅ Completo (5 fases) | |
| Mentor Execution OS (scoring, intervenciones, prep de sesión) | ✅ Completo (5 fases) | |
| Inteligencia Biométrica (insights + simulador + reflexión) | ✅ Completo (5 fases) | |
| Confrontation OS ("dijo vs hizo") | ✅ Completo, flag apagado por defecto | Rollout por cohorte pendiente de decisión |
| Internista educativo (Cluster B) | ✅ Completo, con red-flags deterministas | |
| Wearables — OAuth (Oura/WHOOP) | ✅ Código arreglado | **Bloqueado en prod** — falta deploy + secrets, ver abajo |
| Wearables — nativo (Apple Salud / Health Connect) | ✅ Código completo | Necesita build nativo (`eas init`) para probarse |
| Wearables — agregador universal (Terra) | ✅ Código completo | Necesita cuenta Terra + BAA firmado + secrets |
| El Círculo (red social interna) | ✅ Completo (7 fases) | Encendido en Preview; producción pendiente de tu verificación |
| Panel de administración | ✅ Completo — dossier de cliente, dashboards cross-client, roles, copiloto IA | |
| Camino del Héroe (Fases 1–4) | ✅ Completo esta semana | Ver detalle abajo |
| Perfeccionamiento Bienestar | 🔶 En curso (rama paralela) | Ver detalle abajo |
| La Inmersión (semana 1 guiada) | 🔶 Fase 1 de 5 (modelo de datos) | Guión, player 3 capas y generación batch, pendientes |
| Video de demo / walkthrough | 🔶 En curso | Guion + audio + script de grabación listos; falta grabar y renderizar |

---

## Trabajo de esta sesión (2026-08-03)

### Camino del Héroe — las 4 fases, completas

El brief: que el onboarding deje de fingir una identidad ("Juan Carlos,
Empresario") y empiece a escuchar de verdad, y que la app le devuelva al
usuario, con el tiempo, los pequeños momentos que va identificando — sin que
se acumulen como ruido ni desaparezcan para siempre.

- **Fase 1 — El Umbral** (`fea151c`): los defaults falsos de perfil/norte se
  vaciaron. El `painPoint` que el onboarding preguntaba y descartaba ahora se
  siembra en el Memory OS (`seedHeroOrigin`) como la primera entrada de la
  línea de tiempo del usuario — "Día 0, el umbral". Columna nueva
  `user_profiles.role` (antes se preguntaba y se perdía en cada refresh).
- **Fase 2 — Motor de Momentos** (`fa7b2cf`): al entrar, como mucho un momento
  al día — un eco de lo último que el usuario le dijo a Norman, o un
  recordatorio de gratitud si no hay nada nuevo. De paso se encontró y arregló
  un bug real: las notificaciones push de `smart-notifications` mandaban la
  ruta de destino sin el `/` inicial, así que **toda** notificación (churn,
  anomalía, racha, next-action, milestone) caía siempre a `/checkin` en vez de
  abrir la pantalla correcta.
- **Fases 3–4 — Ecos de memoria + Perduración** (`67c0852`): si no hay nada
  nuevo que ecoar, el motor resurge el logro viejo (`recent_wins`) más cercano
  a desaparecer del perfil, en vez de repetir gratitud genérica. Y se corrigió
  la causa real de por qué los logros "no perduraban": un cupo de 8 que
  confundía el límite del prompt de Norman (ya acotado aparte a 4) con cuánto
  tiempo un logro sobrevive en la tarjeta "Mis Avances" del cliente — subido a
  20, con retrocompatibilidad para estado local guardado antes del cambio.

Gate verde en las tres, mutación verificada en toda lógica nueva. **No
pusheado.** Fases futuras del camino del héroe quedan explícitamente en pausa
hasta que se pidan de nuevo.

### Perfeccionamiento Bienestar — rama `meditaciones-sonido-voz`

El brief: voz de Norman real en todas las respiraciones (con conteo hablado),
meditaciones y sueño con voz+sonido+ondas funcionales de verdad, controles de
audio que realmente paren/pausen, y los flows de movimiento narrados.

**Terminado (PB-0 + PB-1, 10 commits, verificado independientemente):**
- La meditación de "compasión" sonaba con la voz de Norman completamente seca
  (única categoría sin cama musical) — cableada + test de fallback.
- El timer de sueño cortaba a Norman a mitad de frase — ahora usa la duración
  real del guion grabado, no la etiqueta de marketing de la tarjeta.
- `duck()` (bajar la música mientras habla la voz) usaba un piso fijo — ahora
  es proporcional al volumen real del usuario.
- Pausar en nativo era teatro (no hacía nada) y la cama sonaba muda bajo el
  modo silencio de iOS — ahora pausa/reanuda de verdad con la config de audio
  correcta.
- **El bug real detrás de "Premium ve Sueño bloqueado":** el store de
  bienestar nunca se enteraba del tier real de suscripción del usuario — una
  línea, en el único punto del repo que sincroniza ese store.
- Mini-reproductor gana botón PAUSA real (antes solo existía STOP).
- El fade al parar bajó de 1.5s a 0.25s — se siente como respuesta inmediata,
  no como "esto no funciona".
- El mini-reproductor dejó de llamar "BINAURAL" a una sesión de Sueño y de
  navegar a la pantalla equivocada.

**En curso ahora mismo (PB-2 + PB-3):**
- Respiración inmersiva: conteo hablado en vivo ("inhala… 2… 3… 4") vía un
  módulo nuevo de clips atómicos precargados (el motor de narración existente
  es lineal, no sirve para esto), intro hablada por cada una de las 8
  técnicas, honestidad en el temporizador de Wim Hof, y cierre automático en
  todas las técnicas (ninguna debe quedar en loop infinito ahora que habla).
- Los 11 flows de movimiento y tapping, narrados de verdad (no telegramas de
  15s) — `flow-principiante` con el guion más rico.

Un loop autónomo sigue esta rama y, cuando termine, decide sola si continúa
con el resto del plan (diario con IA, biblioteca, cursos desbloqueados,
revisión de wearables) o pasa al siguiente ítem de código pendiente del
backlog general.

---

## Pendiente real de código (no bloqueado por ti)

- **PB-4 a PB-6** de Perfeccionamiento Bienestar: diario con acompañamiento de
  IA (el modo `reflection` de Norman ya existe, solo falta cablearlo a la
  pantalla de diario), biblioteca funcional con lector de PDFs propios
  (bloqueado en el punto siguiente porque necesita tu lista de materiales), y
  desbloqueo total de cursos (cambio trivial de 2 líneas, sin gate de
  suscripción real en el programa).
- **La Inmersión** (semana 1 guiada): modelo de datos en curso; guión
  original, player de 3 capas con ducking, generación batch de audio y
  pantalla final, pendientes.
- **Outbox completo** para inserts no-idempotentes de mensajería/wellness (el
  patrón de `client_id` ya existe para mensajes del mentor; falta extenderlo
  al resto).
- **Video de demo**: guion, voz (ElevenLabs) y script de grabación ya están
  listos — falta correr la grabación, montar la composición en Remotion y
  renderizar.
- **Parte B/C** del programa de mentoría: integración real con la API de Plaud
  (hoy hay import manual) y perfiles diferenciados Norman/Juan Jacobo.

---

## Handoffs tuyos (esto SÍ bloquea, y no es código)

Estas son las acciones reales que dependen de tus cuentas, credenciales o
permisos — el agente no puede hacerlas por ti.

### 1 · Activar la IA real (crítico — sin esto la app simula, no piensa)
Sin `EXPO_PUBLIC_AI_PROXY_URL` configurado, Norman cae en simulación
pre-programada en vez de responder con IA real. Se necesita:
1. Secrets en el dashboard de Supabase: `ANTHROPIC_API_KEY`, `NVIDIA_API_KEY`,
   `GROQ_API_KEY`, `OPENAI_API_KEY`.
2. Variable `EXPO_PUBLIC_AI_PROXY_URL` en Vercel (y en EAS cuando haya build
   nativo).
3. **Rotar las tres claves viejas** (`NVIDIA`/`GROQ`/`OPENAI` client-side) —
   siguen siendo válidas en cualquier bundle ya publicado antes de que se
   eliminaran del código.

### 2 · Wearables — desplegar y conectar
1. `supabase functions deploy sync-wearables` — sin esto, el connect de
   Oura/WHOOP sigue roto en producción (el bug de origen ya está arreglado en
   el código, pero nunca se desplegó).
2. Aplicar la migración `20260729010000_merge_wearable_daily_raw_payload.sql`
   en el SQL Editor (evita que un fallo transitorio de sync borre datos ya
   guardados).
3. Registrar los redirect URIs carácter a carácter en las consolas de
   desarrollador de Oura y WHOOP.
4. Para el agregador universal (Terra, cubre +500 marcas sin build nativo):
   crear cuenta en tryterra.co, secrets `TERRA_DEV_ID`/`TERRA_API_KEY`/
   `TERRA_SIGNING_SECRET` en Supabase, configurar la URL del webhook, y
   **firmar el BAA antes de enrutar cualquier dato de salud real**.

### 3 · `eas init` — builds nativos
`app.json` sigue con un `projectId` placeholder. Sin esto no hay build nativo
de iOS/Android, y sin build nativo no funciona Apple Salud / Health Connect
(la vía por la que llegan Garmin, Coros, Samsung, Fitbit sin integrar sus APIs
una por una).

### 4 · El Círculo — promover a producción
Ya está encendido en Preview. Antes de promoverlo a producción, verificar en
el deploy de Preview: que reportar y bloquear funcionan de punta a punta
(requisito 1.2 de App Store) y que la RLS de las tablas `circle_*` está viva
en producción, no solo en las migraciones.

### 5 · Biblioteca — lista de tus PDFs
Para PB-5 (biblioteca funcional): necesito el nombre y archivo de tus propios
materiales del Método a subir. Los 6 libros de terceros ya listados en la
pantalla se quedan como recomendaciones externas — no se sirven como PDF
propio por derechos de autor.

### 6 · Audio nuevo por subir al bucket `wellness-audio`
A medida que la rama de meditaciones genera clips (`compasion.mp3`, la
carpeta `breathing/`, los mp3 de intro por técnica, los 11 guiones de flows),
la subida al bucket sigue siendo manual — el código ya cablea las URLs y
degrada con elegancia si el archivo aún no existe.

### 7 · App Store
`ascAppId` para `eas.json`, y nombre/correo reales para crear la cuenta demo
del revisor (código `APPLEREVIEW` ya implementado).

---

## Cómo verificar el estado del código en cualquier momento

```bash
npx tsc --noEmit                      # 0 errores esperado
npm run lint                          # 0 errores esperado (warnings preexistentes OK)
npm test                              # 620+ tests, todos verdes
npm run witness                       # 18/18 fixes documentados siguen cableados
npx expo export --platform web        # export limpio a dist/
```

Estos cuatro (más export) son el gate que cada commit de esta sesión pasó
antes de commitear — no es una promesa, es lo que corrió en esta máquina hoy.

---

## Documentos que siguen vigentes en `docs/launch/`

`SECURITY_LAUNCH_AUDIT.md`, `QA_MASTER_TEST_PLAN.md`, `REJECTION_RISK_REPORT.md`,
`APP_STORE_SUBMISSION_CHECKLIST.md`, `APP_STORE_PRIVACY_EVIDENCE.md`,
`STORE_METADATA_REVIEW.md`, `STORE_DESCRIPTION_DRAFT.md`, `COPY_RISK_AUDIT.md`,
`TRUST_COPY_REWRITE.md`, `CONSENT_SCREEN_COPY.md`, `PRIVACY_NUTRITION_DRAFT.md`,
`DATA_FLOW_AND_SECRET_MAP.md`, `ENV_AND_SECRET_MATRIX.md`,
`P0_P1_SECURITY_FIXLIST.md`, `WEARABLES_ACTIVATION.md`, `WEARABLES_ESTADO_2026-07-29.md`,
`WHOOP_AUTOPLAN_2026-07-29.md`, `NORMAN_VOZ_24_7.md`, `EVIDENCIA_BIENESTAR.md`,
`GUION_DEMO_WOW.md`, `RUNBOOK_DEMO_48H.md`, `LAUNCH_DAY_COMMAND_CENTER.md`,
`POST_LAUNCH_MONITORING.md`, `PRELAUNCH_SMOKE_TEST.md`, `REVIEW_NOTES_APPLE.md`,
`P1_VERIFICACION_PROD_2026-07-29.md`, `SQL_PENDIENTES_COMBINADAS.sql`, y las
carpetas `legal/` y `assets/`. Ninguno de estos se tocó.
