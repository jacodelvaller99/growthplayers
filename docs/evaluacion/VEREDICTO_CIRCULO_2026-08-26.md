# Veredicto del Círculo de Evaluación — 2026-08-26

> Primera corrida del Círculo (ver `.claude/skills/circulo-evaluacion/SKILL.md`).
> Commit evaluado: `64d2896` (HEAD de `main`). Método: gates corridos en un
> clone fresco + CI real de GitHub + 8 sillas evaluadoras independientes
> (agentes con persona adversarial, evidencia `file:line` obligatoria) +
> verificación cruzada de toda la evidencia que sostiene un veto antes de firmar.

---

## FASE DICTAMINADA: **F1 — Alfa interna**

## NOTA GLOBAL: **4.5 / 10**

La nota global es el **mínimo** de las 8 sillas (regla del Círculo), y la fija
la Silla 7 (Operadora de Lanzamiento). El promedio simple sería 6.2 — y es
exactamente el número que la regla del mínimo existe para no mostrar: una app
es tan lanzable como su peor dimensión, y la peor dimensión hoy es la
operación, no el código.

**La respuesta corta a "¿cuándo podemos salir para el cliente?":** hoy no.
La app está en F1 (alfa interna: dogfooding del dueño). F2 —beta cerrada con
5–15 clientes de confianza, que es "salir al cliente"— está a **11 vetos de
distancia**, y la buena noticia es que casi ninguno es ingeniería nueva: son
handoffs de minutos (pegar SQL, poner secrets), fixes de horas (banner de
simulación, capa de crisis copiada del internista) y un pacto operativo.
Con foco, F2 es alcanzable en **1–2 semanas**. F3 (cobrar) exige además
resolver la oferta. F4 (tiendas) es otro mes de trabajo operativo.

---

## Las 8 sillas

| # | Silla | Score | Fase que aprueba | Vetos F2 |
|---|-------|-------|------------------|----------|
| 1 | Revisor de App Store | 6.4 | F1 | 2 |
| 2 | Ingeniero Principal | 6.5 | F2 condicionada | 1 |
| 3 | Auditora de Seguridad | 7.5 | F2 condicionada | 3 |
| 4 | Artesano de UI | 7.3 | F2 | 0 |
| 5 | Directora de QA | 5.5 | F2 (solo web) | 2 |
| 6 | Psicóloga Clínica | 5.5 | F1 | 4 |
| 7 | Operadora de Lanzamiento | **4.5** | F1 | 3 |
| 8 | Guardián de Producto | 6.5 | F2 condicionada | 3 |

Tres sillas (1, 6, 7) no pasan de F1. Ninguna silla aprueba F3.

---

## Gates medidos por el propio Círculo (clone fresco, 2026-08-26)

| Gate | Resultado | Evidencia |
|------|-----------|-----------|
| `npx tsc --noEmit` | 🔴 **FALLA** | `components/aura.tsx:107` — `backgroundImage` no existe en ViewStyle (exit 2) |
| `npm run lint` | 🟡 Pasa | 0 errores, **49 warnings** |
| `npm test` | 🟢 Pasa | **134 suites, 1060 tests, 0 fallos** (75s) |
| `npm run witness` | 🟢 Pasa | 18/18 fixes siguen cableados |
| `npx expo export --platform web` | 🟢 Pasa | 1899 módulos, export limpio a `dist/` |
| **CI de GitHub en `main`** | 🔴 **FALLA** | Corridas #267–#326 (18–24 ago): **todas `failure`**. La última muere en `npm run typecheck` con el mismo error de `aura.tsx:107` (log del job verificado) |

**El hallazgo estructural:** los commits recientes declaran "Gate: tsc limpio"
— y en la máquina del desarrollador probablemente lo era — pero en un clone
fresco (y en el CI, que instala con `npm ci` desde el lockfile) el typecheck
está rojo desde ~el 19 de agosto y **se siguió pusheando encima**. La red de
seguridad automática existe y nadie la mira. Esta es la razón de ser de la
regla №3 del Círculo: el clone fresco manda.

---

## Vetos consolidados para F2 (deduplicados entre sillas)

Cada veto lo levanta solo la silla que lo emitió, en re-evaluación, contra el
fix verificado. **Dueño** = quién puede cerrarlo: `código` (cualquier sesión
de desarrollo) o `handoff` (requiere cuentas/credenciales del dueño).

**V1 · La simulación de Norman es indistinguible, finge vivencias y corre en prod.**
Sillas 1, 2, 6, 7, 8 — el veto más convergente del Círculo.
Sin `EXPO_PUBLIC_AI_PROXY_URL`, `streamMentorResponse` cae a `streamDevSimulation`
(`lib/mentor.ts:800-802`), y **también es el fallback final si los 4 proveedores
fallan en producción configurada** (`lib/mentor.ts:835`). Emite 5 respuestas
enlatadas carácter a carácter con delay de 18ms (indistinguible de streaming
real), dos de ellas fingen biografía humana — «Yo también he estado ahí»,
«Esto me recuerda algo que viví yo mismo» (`DEV_RESPONSES[1]`,`[4]`) — y la UI
no lo marca en ningún lado (0 menciones de simulación en `app/(tabs)/mentor.tsx`).
Cierre: (a) *handoff* — secrets IA en Supabase + env var en Vercel + rotar las 3
claves viejas de bundles publicados; (b) *código* — marca visible de turno
degradado/demo + reescribir las 5 respuestas sin biografía fingida.
Esfuerzo: una tarde.

**V2 · Norman no tiene capa determinística de crisis; la simulación es ciega a ella.**
Silla 6 (respaldada por 7). El bloque SEGURIDAD vive solo en el prompt
(`lib/mentor.ts:434-443`) — depende de que el LLM obedezca. `detectRedFlags`
(la capa determinística pre-modelo) solo lo importa el internista (verificado:
`lib/internistLogic.ts`, `lib/internist.ts` — nadie más). En simulación,
«estoy cansado de vivir» matchea `'cansado'` → responde coaching enlatado.
La asimetría es la inversa al riesgo: blindaron al educativo y dejaron desnudo
al confesor emocional. Cierre: *código* — reusar `detectRedFlags` antes de la
cadena y en la simulación, con respuesta fija de derivación (el patrón ya está
escrito en `lib/internist.ts:207-228`; se copia, no se inventa). Esfuerzo: 1 día.

**V3 · El chat de Norman se vacía al recargar, para todos, en prod.**
Silla 7. `mentor_messages` no acepta INSERTs del cliente (error 42P10 del
índice parcial como árbitro de ON CONFLICT) — verificado contra prod el
2026-07-02 y documentado en `docs/launch/SQL_PENDIENTES_COMBINADAS.sql:8-33`
(«el chat con Norman se ve VACÍO tras cada recarga… Afecta a TODOS los
clientes»). El FIX-0 está escrito, idempotente, sin correr.
Cierre: *handoff* — pegar `SQL_PENDIENTES_COMBINADAS.sql` completo en el SQL
Editor. Esfuerzo: minutos.

**V4 · Seguridad aplicada a mano sin constancia + P1-7 abierto.**
Sillas 1 y 3. Los tokens OAuth de wearables (texto plano) son legibles por
cualquier admin — `docs/launch/P1_VERIFICACION_PROD_2026-07-29.md:19` los marca
«🔴 ABIERTO — arreglo listo» y la migración
`20260729000000_p1_7_wearable_token_privs.sql` existe sin aplicar. Además, toda
la defensa P0 (anti-escalación, no-autogrant) vive en migraciones aplicadas por
dashboard sin verificación reproducible. Cierre: *handoff* — pegar P1-7 +
correr las queries de verificación (`pg_trigger`/`pg_policies`) contra prod y
dejar constancia escrita. Esfuerzo: una hora.

**V5 · El feed de comunidad es legible por anónimos.**
Silla 3. `community_posts` y `community_reactions` tienen
`FOR SELECT USING (true)` sin `TO authenticated`
(`supabase/migrations/20260513000000_additive_features.sql:169-174`) — las
reflexiones personales del feed se leen con la clave pública sin sesión.
Cierre: *código+handoff* — recrear ambas policies scoped a `authenticated`.
Esfuerzo: minutos.

**V6 · Ayuno de 72h con la misma fricción que un 16:8.**
Silla 6. El protocolo 72h dice «Solo con supervisión médica»
(`app/bienestar/ayuno.tsx:43`) pero es un ítem más del mismo selector, con el
mismo modal de un tap; cero screening TCA — mientras el internista clasifica
TCA como red-flag *urgent* (`data/internistKnowledge.ts:707-713`). Los dos
sistemas no se hablan. Cierre: *código* — gate diferencial para 48h+ (2-3
preguntas tipo SCOFF + confirmación de supervisión). Esfuerzo: 1 día.

**V7 · La comunidad no responde a una crisis en primera persona.**
Silla 6. `data/moderation.ts:42-51` atrapa ataques a terceros
(«mátate/suicídate») pero «me quiero suicidar» pasa el filtro, se queda en el
feed sin interstitial de recursos, y la cola admin no distingue urgencia.
Cierre: *código* — detector de auto-daño en el composer → interstitial con
líneas de ayuda + flag prioritario en la cola. Esfuerzo: 1-2 días.

**V8 · Si algo se rompe con un cliente, nadie se entera; si el cliente quiere ayuda, no hay a dónde escribir.**
Silla 7. `logSilentError` es `console.warn` con el comentario «engancha Sentry
aquí cuando se integre» (`lib/observability.ts:19-24`); Sentry no está en
`package.json`; 0 `mailto:` en toda la app (el único contacto es texto plano
enterrado en las pantallas legales). Cierre: *código* — Sentry (medio día) +
ítem «Ayuda y soporte» en perfil; *pacto* — quién mira qué, cada día, por
escrito. Esfuerzo: 1 día.

**V9 · El CI está rojo, institucionalizado, y no gatea el deploy.**
Silla 5 + gates del propio Círculo. Typecheck rojo en `main` desde ~19-ago
(`aura.tsx:107`), todas las corridas de CI en failure mientras se pusheaba
encima (hasta un commit admite «b723c95 salió con la suite roja»), y Vercel
despliega automático en cada push **sin condición sobre los checks**.
Cierre: *código* — fix del tipo en `aura.tsx` (una línea: cast del style web) ·
*handoff* — branch protection en `main` con el job `quality` como required.
Esfuerzo: horas.

**V10 · Fugas de voz en el golden path.**
Silla 8. Tres violaciones de las reglas duras de la propia Biblia de Narrativa,
todas en las rendijas que los tests guardianes no miran: «LifeFlow + Polaris
completo» visible al cliente (`constants/subscriptions.ts:47` → se renderiza en
Progreso y Pricing; el glob de `nombreDeMarca.test.ts` no cubre `constants/`);
«Racha de N días — no la rompas hoy» con ícono de fuego (`app/checkin.tsx:989`
— la anti-referencia Duolingo prohibida por nombre); «con qué tropas sales hoy
al campo» (`app/checkin.tsx:994`, más `data/tour.ts:12` y la meditación «El
Plan de Batalla» en `data/wellness.ts:667-677`). Cierre: *código* — sweep de ~6
archivos + ampliar el glob del test de marca + `belico.test.ts`. Esfuerzo: 1 día.

**V11 · La beta es solo web/PWA hasta que exista un build nativo humo-testeado.**
Silla 5. La app nativa **jamás se ha ejecutado**: no hay `ios/`/`android/`,
todo lo nativo (HealthKit, RevenueCat, expo-av) está 100% mockeado en las 134
suites. No es un fix — es un descope explícito: la invitación a beta dice
web/PWA, y punto, hasta producir y probar un build EAS en dispositivo físico.
Esfuerzo: decisión (el projectId de EAS ya es real — `app.json:107` — la doc
que lo daba por placeholder está desactualizada).

---

## Checklist G1–G8 hacia F2 (estado real)

| Gate | Estado | Evidencia |
|------|--------|-----------|
| G1 · Gates verdes en CI | 🔴 | tsc rojo en main desde ~19-ago; CI failure #267–#326 |
| G2 · IA real o honestidad total | 🔴 | Handoff abierto; simulación sin marca (V1) |
| G3 · Seguridad verificada en prod | 🔴 | P1-7 abierto; migraciones sin constancia; feed anon (V4, V5) |
| G4 · Rutas de crisis ensayadas | 🔴 | Sin capa determinística en Norman; simulación ciega (V2) |
| G5 · Deuda operativa saldada | 🔴 | SQL_PENDIENTES sin correr; `sync-wearables` y `smart-notifications` sin re-deploy |
| G6 · Observabilidad mínima | 🔴 | Sin Sentry; sin canal de soporte visible (V8) |
| G7 · Smoke E2E manual firmado | 🔴 | No consta ninguna corrida fechada del golden path en prod |
| G8 · Un extraño lo usó | 🔴 | No consta ningún test de usabilidad con alguien ajeno |

**0 de 8.** Ninguno es largo; varios caen en cascada al cerrar V1–V9.

---

## Hallazgos mayores que no llegan a veto de F2 (pero sí de F3)

- **Economía unitaria abierta de par en par** (sillas 2, 7, 8): el ai-proxy no
  tiene rate limit ni cuota por usuario (`supabase/functions/ai-proxy/index.ts:26-27`
  — solo un cap de 64KB), el mentor no gatea por tier (`isSubscribed`: 0 usos
  en `app/(tabs)/mentor.tsx`), el paywall vende «Norman sin límites»
  (`app/paywall.tsx:153`) que el free ya recibe gratis (el gate se quitó —
  comentario en `mentor.tsx:331-333`), y `constants/subscriptions.ts:14` promete
  al free «5 mensajes/día» que ningún código impone. El día que la IA real se
  encienda, cada sesión válida es la tarjeta del dueño sin techo. **Bloqueante
  absoluto de F3.**
- **RGPD**: la PII de ClickUp sobrevive al borrado de cuenta
  (`clickup_webhook_events.payload` con `ON DELETE SET NULL`, no purgada por
  `delete-account` — 0 menciones); `web_leads` tampoco. El consentimiento de
  confrontación y el de aprendizaje son **obligatorios** para entrar
  (`app/(onboarding)/index.tsx:85-86`) — consent condicionado no es consent.
- **El freno de emergencia no existe**: `pause_state` (pausar el Confrontation
  OS en crisis/duelo) solo se lee — ningún código lo escribe jamás (verificado).
- **Confrontación con guard de promedio**: `isInCompromisedEmotionalState` usa
  el promedio de 3 días — un check-in de energía 1/10 HOY no frena la
  confrontación de hoy (`lib/confrontationLogic.ts:214-222`).
- **App Store**: los DMs 1-a-1 no tienen mecanismo de reporte (guideline 1.2 —
  el feed y El Círculo sí lo tienen); los borradores de privacy labels declaran
  «NOT collected via Apple HealthKit» cuando la app ya integra HealthKit
  (`docs/launch/PRIVACY_NUTRITION_DRAFT.md:31` vs `app.json:83-90`) — llenarlos
  así es retiro post-aprobación; la cuenta demo `APPLEREVIEW` no existe aún.
- **Documentación desincronizada en ambas direcciones**: el projectId de EAS ya
  es real y `OWNER_IDS` ya fue eliminado (los docs los dan por pendientes);
  CLAUDE.md dice «204 tests, 14 suites» (hay 134 suites y 1060 tests) y afirma
  un límite free del mentor que no existe. Quien ejecute los checklists actuales
  perseguirá fantasmas o confiará en «ya está» falsos.
- **Craft a medio obedecer** (silla 4): el ScoreRing de Comando es un segundo
  reloj paralelo que no usa el Dial; reduced-motion llegó a 1 de 3 instrumentos;
  3 de los 6 modos tienen CTAs sin feedback ni semántica; `NovedadesNorman` es
  invisible en 5 de 6 modos (`comando.tsx:1199-1223` monta solo el modo);
  micro-tipografía de 9/9.5pt contra la regla de 11pt del propio sistema.
- **Pantallas monolíticas**: `comando.tsx` 2701 líneas, `progreso.tsx` 2496,
  God Context sin memoizar con 68 consumidores (`use-lifeflow.tsx:1230-1258`),
  feeds sin virtualización. Deuda conocida, no urgente para F2.
- **CSP**: `script-src 'unsafe-inline' 'unsafe-eval'` + sesión en localStorage
  (`vercel.json:32`), y `connect-src` aún permite los orígenes LLM muertos.
- **Norman citando estadísticas inventadas**: la REGLA DE PRUEBA SOCIAL REAL
  del prompt instruye «El 80% siente exactamente esto en la Semana 2» — un dato
  que ningún dataset respalda, en la marca de «confrontar con dato».

---

## Lo que sí está bien (consolidado, con la misma vara)

- **La cultura de lógica pura es real y rara de ver**: 134 suites / 1060 tests,
  con invariantes creativos que rompen el build por violar la voz (tildes,
  nombre de marca, vocabulario no clínico, anti-gamificación de turnoLogic,
  botón volver a 44px, contraste de temas). El Círculo confirmó que los
  guardianes funcionan — las violaciones vivas están exactamente en las rendijas
  que sus globs no miran.
- **El internista es un modelo de seguridad fail-closed**: red-flag urgent →
  derivación determinística SIN llamar al modelo; `detectForbiddenLanguage`
  cableado al stream de verdad (corta el chunk, aborta sin reintentar, persiste
  el texto correctivo). Es el patrón que Norman debe copiar — ya está escrito.
- **La remediación de seguridad de junio fue seria**: los 5 P0 cerrados en
  código, trigger anti-escalación real, rango de mentor con RLS por
  `mentor_assignments` (no cosmético), capa PHI del internista ejemplar
  (owner-only + gate de consentimiento EN SQL + Storage path-enforced),
  `OWNER_IDS` eliminado, claves LLM fuera del cliente.
- **El loop de producto se cerró de verdad** (el veredicto de junio quedó
  atrás): `turnoLogic` mató las 6 opiniones contradictorias (5 estaban
  muertas), la jornada avanza el día, el delta se mide contra la línea base
  del propio cliente (`calcSovereignDelta`), el día 1 es honesto («no hay nada
  que medir»), y el guard de presencia corta la confrontación antes de los
  detectores. Profundidad transformacional: de 4.0 (junio) a zona 6.5–7 — por
  código, no por decoración.
- **El sistema visual aguanta**: temas de 2 ejes (11 fondos × 9 señales) con
  contraste AA medido y paleta para deuteranopia, honestidad del dato ejecutada
  (Dial con `pct=null` pinta solo pista, Guiado espeja la jornada real),
  paywall compliant casi de libro (restore, disclosures, links legales),
  SafetyWarning consistente en 8 prácticas, cero placeholders legales.
- **La cadena IA como software es de calidad producción**: 4 proveedores con
  watchdog de inactividad, cancelación que corta la cadena y devuelve el
  parcial, claves 100% server-side.

---

## El camino a F2 — «la semana de la verdad»

Orden sugerido (maximiza vetos cerrados por día):

1. **Día 1 (handoffs, sin código):** pegar `SQL_PENDIENTES_COMBINADAS.sql` (V3),
   pegar P1-7 + queries de verificación con constancia (V4), policies del feed
   a `authenticated` (V5), secrets IA + `EXPO_PUBLIC_AI_PROXY_URL` + rotar
   claves viejas (V1a), `supabase functions deploy sync-wearables smart-notifications`
   (G5), branch protection en `main` (V9b).
2. **Día 2:** fix de `aura.tsx` + CI verde end-to-end (V9a); banner de turno
   degradado + reescritura de las 5 respuestas de simulación (V1b).
3. **Días 3–4:** capa determinística de crisis en Norman + simulación (V2);
   Sentry + «Ayuda y soporte» + pacto de quién-mira-qué (V8).
4. **Día 5:** sweep de voz (V10) + gate diferencial de ayuno (V6).
5. **Días 6–7:** ruteo de crisis en comunidad (V7); smoke E2E manual firmado
   (G7); sentar a un extraño frente al onboarding (G8).
6. **Re-evaluación del Círculo** (las sillas que vetaron levantan o sostienen).

F2 se declara solo cuando la re-evaluación confirme los 11 vetos cerrados y
los 8 gates verdes — y la invitación a beta dice **web/PWA** (V11).

## Condiciones ya conocidas para F3 (cobrar)

Rate limit + cuota por usuario en ai-proxy y gate de tier server-side; decidir
la oferta (o se reinstala el límite free o «Norman sin límites» sale del
paywall); testimonios verificados o sección fuera; wearables encendidos o fuera
del paywall; consentimientos opcionales de verdad; purga RGPD completa
(ClickUp/web_leads); E2E del golden path en navegador real + compra en sandbox;
D7 de la beta medido; legal revisado por el dueño. Todas las sillas ≥ 7.5.

---

*Próxima corrida del Círculo: al cerrar los vetos de la semana de la verdad, o
en 2 semanas — lo que llegue primero. Este veredicto caduca entonces.*
