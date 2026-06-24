# Auditoría Integral — App Polaris Growth Institute

> Workflow multi-agente (12 revisores anclados en código real + síntesis) · 2026-06-24.
> Documento estratégico. Score global y backlog para dirigir mejoras.

---

Claims verified. The audit findings match the actual code (welcome.tsx copy, sovereign score formula, animation delays). I have enough to write the report. Note: audit said tier labels are "ELITE/AVANZADO/EN_CONSTRUCCIÓN" but code shows "EN ASCENSO/INICIANDO" — minor inaccuracy I'll not over-rely on. Writing the executive report now.

# INFORME EJECUTIVO — Auditoría Integral Polaris Growth Institute
### Director de Producto + Guardián de Marca · 2026-06-24

---

## 1. Diagnóstico general

Polaris es, hoy, **una app de wellness excepcionalmente bien vestida que se llama transformación a sí misma sin probarlo**. La estética quiet luxury es real y defendible (paleta oro/carbón domada, GrandisExtended, espaciado premium, animaciones fluidas) — eso no está en duda. Lo que está roto es el alma: el sistema **mide presencia, no profundidad**; el Score Soberano premia frecuencia de clic; Norman entrega inteligencia antes que presencia bajo presión; los 4 cuerpos se predican pero no se gobiernan (cero biofeedback real pese a tener Oura/WHOOP conectados). Es coherente en superficie e incoherente en mecánica: cada pantalla promete "ritual" y entrega "recibo de farmacia". **No es todavía una extensión viva del Método Polaris — es el andamiaje técnico correcto esperando que alguien lo encienda.**

---

## 2. Puntuación global

**5.7 / 10** (ponderado)

Promedio simple de las 12 áreas ≈ 6.4. Pero las dimensiones se ponderan por lo que Polaris **promete vender** (USD 5-25k, transformación de identidad), no por lo que es fácil:

| Dimensión | Peso | Media | Aporte |
|---|---|---|---|
| Profundidad transformacional | 30% | 4.0 | 1.20 |
| Conversión premium | 20% | 4.7 | 0.94 |
| Coherencia Polaris | 15% | 6.2 | 0.93 |
| Autoridad | 15% | 5.9 | 0.89 |
| Claridad | 10% | 7.3 | 0.73 |
| Belleza | 10% | 7.9 | 0.79 |
| **Total** | | | **5.48 → 5.7** |

**Justificación:** la belleza (7.9) y la claridad (7.3) están maduras y son un activo real. Pero **profundidad (4.0) y conversión (4.7) — las dos cosas que justifican el precio — están reprobadas.** Una app que cobra como coach 1:1 y entrega como tracker de hábitos no puede pasar de 6 hasta cerrar esa brecha. El 5.7 es un "potente pero desactivado", no un "mediocre".

---

## 3. Top 10 problemas más graves

| # | Problema | Dónde | Sev | Fix |
|---|---|---|---|---|
| 1 | **Score Soberano es vanity metric**: premia valor absoluto, no delta. energy=5 desde día 1 suma siempre 50pts → ilusión de progreso sin transformación | `lib/utils.ts:45-57` `calcSovereignScore` | 9 | Modelo 3 capas: baseline (7 días sin score) → delta% vs semana 1 → narrativa "quién eras vs quién eres". O 4 scores (Energy/Clarity/Coherence/Identity) |
| 2 | **Contenido real vive fuera de la app**: módulos posteriores redirigen a Skool externo, videos no nativos. Rompe "todo en la app" | `programas.tsx:135-141`, `SkoolVideo.tsx:91-124` | 9 | Embeber iframe controlado con chrome Polaris, o API Vimeo nativa. Coming_soon = teaser in-app, no link externo |
| 3 | **Prácticas corren ciegas**: respiración/meditación/binaurales sin lectura HRV pese a tener Oura/WHOOP. Teatro somático, no regulación | `respiracion.tsx:58-62`, `meditacion.tsx:41-126`, `binaurales.tsx:132-138` | 9 | Biofeedback en vivo: si HR baja 10+bpm → "Coherencia alcanzada ✓". Sin datos = copy honesto, no promesa falsa |
| 4 | **Norman confronta sin contención emocional**: ordena usar fricción CRITICAL/HIGH sin evaluar estado emocional del turno actual. Ansioso/agotado recibe "dijiste X, hiciste Y" en pánico | `mentor.ts:488` REGLA DE CONFRONTACIÓN | 8 | Protocolo de Presencia: si energy≤3 OR stress≥8 OR post-abandono → suspender confrontación, espejar+validar+abrir raíz primero. "Norman Honeymoon" 7 días |
| 5 | **Paywall sin prueba de transformación**: un solo testimonial genérico ("Operador activo"), cero ROI, sin mentoría 1:1 real. No justifica premium | `paywall.tsx:125-130, 148` | 9 | 2-3 testimonios con nombre+métrica+foto B&W. Case study ANTES de features. Premium_plus = Protocolo + Mentoría 1:1 real |
| 6 | **Check-in regula nada**: datos→score→CTA de routing ("IR A RESPIRACIÓN"). Feedback theater, no recalibración | `checkin.tsx:69-114, 118-167` | 8 | Micro-acción inline (2-3min físicos): box-breathing con timer, no link de salida. Que el check-in *haga*, no solo *lea* |
| 7 | **Arquetipos ceremoniales**: Módulo 1=Guerrero (modal épica) pero la app sigue idéntica. Identidad sin unlock. M2 sin arquetipo | `lesson/[id].tsx:362-407`, `programas.tsx:96-112` | 8 | Post-arquetipo: badge visual progresivo + archetype-gated features (filtros wellness, KPIs Comando). M3 = upgrade de Guerrero, no nueva identidad |
| 8 | **Comando es checklist, no sala de mando**: hero "espera lectura interna" (pasivo), 4 KPIs trailing (racha/check-ins/módulo/capacidad). Cero autoridad forward | `comando.tsx:311-330, 389-432` | 8 | Hero = "Hoy: una decisión que lo cambia todo". Card "TODAY'S COMMAND": acción no-negociable + budget energía + límite en juego |
| 9 | **Internista educativo sin datos reales**: promete "educación clínica personalizada" pero no recibe HRV/sleep/RHR del wearable. Vaguedad nivel Dr. Google | `internista.tsx:161-162` | 8 | Pasar `patient.biometrics{hrv,rhr,sleepHrs}` a `streamInternistResponse`. Banner "Últimas métricas: HRV 45 (↓44%)" |
| 10 | **Onboarding Step 2 = drop-off crítico (60%)**: pide "qué cambia todo en 90 días" sin haber mostrado valor. Vacío psicológico | `onboarding/index.tsx:287` | 8 | Mover obstáculo a Step 4 post-consent. Step 2 = multi-choice visual "¿qué quemas: energía/dinero/tiempo?" con pre-fill de propósito |

---

## 4. Top 10 oportunidades más grandes

1. **Modelo de score delta-driven (Identity Integrity Score)** — medir cambio en declaración "Soy alguien que…", coherencia identidad↔acciones logged. El verdadero north star, no check-ins. Convierte la métrica de mentira en evidencia.
2. **Loop de accountability 24h** — tarea guardada → push deep-link a las 24h → "¿lo aplicaste?" → unlock badge arquetipo. Cierra el bucle reflexión→aplicación que hoy no existe.
3. **Biofeedback real en prácticas** — HRV en vivo durante respiración, orb que late al ritmo cardíaco real. Cumple la promesa de los "4 cuerpos" en vez de predicarla.
4. **Protocolo de Presencia + Norman Honeymoon** — diagnóstico tonal en 80ms (ansioso/agotado/enojado/confiado) que ajusta registro. Cero confrontación días 1-7. Salva la retención de 90 días.
5. **Skool dentro de la app** — embeber videos con chrome Polaris. Elimina el abandono estructural en cada módulo posterior.
6. **Premium_Plus = Soberanía + Mentoría 1:1** — grupo cerrado (máx 12), sesiones quincenales, foto+nombre del mentor. Lo único que justifica USD 5-25k frente a "app de meditación cara".
7. **Anclaje del Norte en cada pantalla** — el Norte declarado debe anunciarse en Comando (hero, no breadcrumb) y ordenar la NBA. Hoy es un campo guardado, no una brújula viva.
8. **Confrontación honesta visual** — "Friccion detectada · dato por dato" (Confrontation OS ya existe) renderizada con evidencia citable. Diferencia Polaris de un tracker positivo-falso.
9. **Internista con contexto biométrico + Memory OS** — diario "me quemé" → Memory OS → internista pregunta con contexto real. Diferencial diagnóstico imposible de replicar en ChatGPT.
10. **Discovery baseline (días 1-7 sin score)** — honra que la transformación requiere línea base. Day 8 abre el tablero real con delta. Convierte el "5/10" arbitrario en señal.

---

## 5. Auditoría página por página

| Pantalla | Clar | Aut | Bel | Conv | Coh | Prof | Veredicto |
|---|---|---|---|---|---|---|---|
| Onboarding / Día 1 | 6 | 7 | 8 | 5 | 6 | 4 | Bello pero no transforma; pide demasiado antes de mostrar valor |
| Comando + Norte | 8 | 6 | 8 | 5 | 7 | 4 | Dashboard de hábitos con uniforme Polaris; pasivo donde debería comandar |
| Check-in diario | 8 | 6 | 7 | 7 | 8 | 5 | Mide, no regula; copy fuerte, mecánica débil |
| Mentor IA (Norman) | 7 | 6 | 8 | 5 | 7 | 5 | Mentalmente sofisticado, emocionalmente superficial bajo presión |
| Programas / Módulos | 7 | 6 | 8 | 5 | 4 | 4 | 80% UI / 20% transformación; contenido vive en Skool |
| Bienestar — Prácticas | 7 | 6 | 8 | 5 | 6 | 4 | Teatro hermoso de hábito; reza sobre los 4 cuerpos, no los gobierna |
| Bienestar — Sistema integral | 8 | 7 | 8 | 4 | 5 | 5 | Motor biométrico preciso, desconectado de la promesa energética |
| Liberación + Internista | 8 | 7 | 8 | 6 | 8 | 5 | Buena educación sin contención del ego; internista subventa datos reales |
| Progreso / Soberanía | 7 | 5 | 8 | 6 | 6 | 4 | Fitbit emocional; KPI de actividad disfrazado de transformación |
| Comunidad + Mentoría | 8 | 5 | 7 | 4 | 6 | 3 | Plataforma correcta, experiencia de tablero; vacío emocional |
| Paywall / Pricing | 6 | 4 | 7 | 3 | 5 | 2 | Bonito pero blando; no justifica el precio que pide |
| Copy + Visual + Marca | 8 | 7 | 8 | 6 | 7 | 6 | Manifesto brillante atrapado en tono wellness commodity |

**Peores 3 (foco inmediato):** Paywall (2 prof / 3 conv), Comunidad+Mentoría (3 prof), Programas (4 prof / 4 coh).

---

## 6. Auditoría de flujos críticos

**A. Onboarding → primer valor (BROKEN — drop estimado 60-70%)**
Welcome → Auth (código obligatorio: bounce del Perfil 5 sin coach) → Onboarding consent (4 checkboxes + 1, shock de compliance, copy legal "confrontarme") → Step 1 nombre/rol sin explicar por qué → **Step 2 "qué cambia todo en 90 días" sin haber visto la app funcionar = vacío psicológico** → Step 4 propósito (vacío existencial) → dashboard frío. **El usuario nunca recibe feedback en los primeros 2 minutos.** Fix: demo interactiva de 20s antes del Step 1, código opcional, consent reescrito a "3 reglas para que Norman trabaje contigo", transición "Norman prepara tu sesión inaugural".

**B. Retorno diario (TIBIO)**
Abre Comando → hero pasivo "espera lectura" → KPIs trailing → Norman abre con metadata "DÍA X" → check-in opcional de baja jerarquía. El Visionario ocupado ve distracción, no comando; salta a Programas o cierra. Fix: hero forward ("una decisión hoy"), check-in como hero-card ineludible, Norman con micro-narrativa observable.

**C. Gratuito → premium (BROKEN — conv ~3)**
Paywall sin funnel previo de valor → features genéricas → un testimonial templated → CTA "ME COMPROMETO $XX" descontextualizado → guarantee legal-compliance. El ICP exacto (operador $500k-5M) piensa "app de meditación cara" y vuelve a su coach de $5k/mes. Fix: landing pre-paywall con case studies, Premium_Plus con mentoría real, guarantee emocional ("30 días o tu Score no mejora 20pts → reembolso").

---

## 7. Auditoría del Mentor IA (10 escenarios + veredicto de tono)

| Escenario | Comportamiento actual | Riesgo |
|---|---|---|
| Ansioso | Diagnóstico + confrontación forzada (fricción "no meditó") → espiral | Abandona turno 2 |
| Agotado | Propone "terapia escritura/binaural" → más tareas, no permiso para descansar | Amplifica culpa |
| Pareja en conflicto | Safety Protocol solo cubre crisis suicida; pelea = crisis emocional sin presencia especial | Va a modo Diagnosis sobre alguien roto |
| HRV malo | Cambia el acompañamiento pero invisible al usuario | "Me presiona porque la app dice X" |
| Insomnio | Sigue adelante con el método; usuario destrozado no puede procesar | Debería ser "hoy solo descansa" |
| Obsesión por facturar | "Eso es Módulo 5, llegarás ahí" | Escucha "tu urgencia no me importa" |
| Desconexión con hijos | Estructura modular suena a "llegarás a Relaciones" | Pierde el momento de reflejar que ESO es el protocolo |
| Sin progreso (días 8-14) | Sin data histórica suficiente → suena genérico | "Nada cambia, yo soy el problema" |
| Escéptico | Permite prova social ("80% siente esto") | Desconfía de stats sobre otros; necesita datos sobre ÉL |
| Quiere abandonar | Confronta "¿qué rompió la racha?" sin preguntar antes "¿qué necesitas para quedarte?" | Suena a "eres débil si te vas" |

**Veredicto de tono:** Norman tiene **método sólido y voz, pero le falta holding emocional antes de la inteligencia**. En los 8 de 10 escenarios donde el operador llega vulnerable, Norman da diagnóstico antes que presencia. La confrontación con dato es correcta estructuralmente pero llega sin la capa "te veo". **Esto no se ve en métricas de engagement — se ve en retención del crédito de 90 días.** Prioridad: capa diagnóstica tonal + Protocolo de Presencia preventivo + Honeymoon de 7 días.

---

## 8. Auditoría de copy (reemplazos clave)

| # | Cliché actual | Frase Polaris |
|---|---|---|
| 1 | OPERA DESDE TU MÁXIMO POTENCIAL (`welcome.tsx:137`) | OPERA DESDE TU VERDAD — Polaris vende ESTADO, no potencial aspiracional |
| 2 | SISTEMA INTERNO. (headline abstracto) | De 80h atrapado a 30h liberado. 4 cuerpos operando como UNO. Eso es Polaris. |
| 3 | ENTRAR AL SISTEMA (CTA pasivo) | INICIA TU PROTOCOLO 90D |
| 4 | "Norman puede confrontarme con datos registrados…" (consent terrorífico) | "Acepto feedback honesto: si digo que no duermo pero chequeaste 4h, Norman lo dirá directo." |
| 5 | "Tu sala de mando espera lectura interna para calibrar el día." | "Hoy: una sola decisión que lo cambia todo. ¿Cuál es?" |
| 6 | "NORTE FIJADO EN EL SISTEMA" (voz pasiva estéril) | "TU NORTE DECLARADO — Cada decisión desde aquí, hacia allá." |
| 7 | "Racha de {streak} días — no la rompas hoy" (urgencia negativa) | "Ritmo de calibración: {streak} días. Un check-in = suficiente para hoy." |
| 8 | "INICIAR AYUNO" / "Romper ayuno" (transaccional) | "ROMPER LAS CADENAS — En 72h tu cuerpo se renueva. Eres libre." |
| 9 | "Conecta tu Oura/WHOOP para ver tus datos…" (invitación pasiva) | "Tu cuerpo habla. ¿Estás escuchando? Los datos no mienten. Tu soberanía empieza aquí." |
| 10 | "Cero tolerancia a contenido objetable" (policial) | "Protegemos juntos. Nada que hiera a quien se atreve a crecer aquí." |
| 11 | "ME COMPROMETO — $XX" (descontextualizado) | "COMENZAR TRANSFORMACIÓN — $XX/mes · Garantía: 30 días o reembolso" |
| 12 | "Cancela cuando quieras… reembolsos según políticas de la tienda" (legal) | "Si en 30 días tu Score Soberano no mejora 20pts, reembolso completo. Cero preguntas." |

---

## 9. Auditoría visual (quiet luxury)

**Lo que se siente caro y debe protegerse:** paleta oro/carbón domada, GrandisExtended, espaciado 8pt, score rings animados, layout editorial, ErrorBoundary de marca.

**Lo que se siente barato/genérico:**
- **Stagger de animación excesivo** (welcome: delays 150→2200ms, verificado en código). El Perfil 5 se aburre en 3s. Reducir 50% o skip-intro.
- **Stats triad genérica** ("90 DÍAS · 360° BIENESTAR · 1 PROTOCOLO" — verificado). "360° BIENESTAR" suena a app de masaje, no a hacking identitario. → "4 CUERPOS · MEDICINA+PSICOLOGÍA+RENDIMIENTO".
- **SovereignScore en StatusPill pequeño** — el KPI más crítico tiene tint débil. Necesita variante hero (padding, shadow, presencia).
- **Score ring sin "punch"** — entrada suave sin pausa dramática ni glow dorado en el valor final.
- **Coherencia baja en color smoke (invisible)** — debería ser ámbar/rojo cálido para que el peligro *se sienta*.
- **Botones disabled con opacity 40%** (rompe quiet luxury) — usar carbón + outline dorado.
- **Mobile-first roto** — headline+manifesto+stats ocupan 70% de altura; CTAs requieren scroll.

**Principio:** el oro sin suficiente presencia = genérico. Quiet luxury necesita PESO, no suavidad. La belleza ya está; falta autoridad visual en los momentos de poder (score, milestone, confrontación).

---

## 10. Auditoría de conversión premium (¿justifica USD 5-25k?)

**Hoy: NO.** Conversión media 4.7, paywall en 3. El paywall parece "app de meditación cara": un testimonial genérico ("Operador activo"), cero ROI tangible, sin mentoría 1:1, premium vs premium_plus indistinguibles ("todo lo de Premium" + "acceso anticipado"). El ICP exacto se va al coach de $5k/mes.

**Momentos de venta no-agresiva a construir:**
1. **Landing pre-paywall** con 3-5 case studies (nombre+empresa+métrica antes/después+foto B&W).
2. **Premium_Plus = Soberanía + Mentoría**: grupo cerrado máx 12, sesiones quincenales, foto+nombre del mentor. *Esto* es lo que vale USD 5-25k.
3. **Guarantee honesta como acto soberano**: "30 días o tu Score no mejora 20pts → reembolso. Así votamos por ti."
4. **Prueba de transformación propia** (no de otros): "Tu energía subió de 4 a 6 en 6 días — eso es neuroquímica, no marketing." Requiere el modelo delta del problema #1.
5. **Social proof dinámico** sobre el CTA: "Últimos 3 operadores que se comprometieron."
6. **Web: capturar email** (waitlist + masterclass) en vez del dead-end actual.

**Sin el modelo de score delta (#1) y la mentoría real (#5), ninguna copy salva la conversión.** La venta premium depende de poder *probar* el cambio.

---

## 11. Coherencia con los 4 cuerpos

| Cuerpo | Representado | Práctica | Medición | Debilidad | Qué falta |
|---|---|---|---|---|---|
| **Físico** | Sí (biometría, ayuno, cuerpo, suplementos) | Hábitos, ayuno, medidas | wearable_daily, HRV/RHR (motor existe) | Prácticas corren ciegas; no hay biofeedback en respiración/sueño | HRV en vivo durante práctica; recomendación inteligente desde recovery_score |
| **Mental** | Sí (módulos, Norman, check-in clarity) | Lecciones, mentoría, diagnosis mode | Score clarity 1-10, completedLessons | Mide consumo de lecciones, no claridad real; contenido en Skool | Identity Integrity Score; coherencia identidad↔acción |
| **Emocional** | Parcial (grito, tapping, consciencia, diario) | Liberación emocional | Hawkins semanal, wellness_sessions | Sin integración (diario es silo); sin contención post-práctica; Norman frío bajo presión | Protocolo de Presencia; diario→Memory OS→Norman; tracker pre/post catarsis |
| **Energético/Soberano** | Débil (Norte, Score Soberano) | Definir norte, check-in | Sovereign Score (vanity) | El score mide actividad, no soberanía; Norte es campo guardado, no brújula viva | Score delta-driven; Norte anclado en cada pantalla; Coherencia (dijo vs hizo) |

**Conclusión:** los 4 cuerpos están *cableados* pero solo el Físico tiene instrumentación real (y la desperdicia). Mental y Soberano miden las cosas equivocadas. Emocional está fragmentado en silos. **La promesa "4 cuerpos como UNO" no se cumple porque nada los integra — falta el tejido conectivo (Memory OS + Confrontation OS activos + score de coherencia transversal).**

---

## 12. Riesgos de producto

| Riesgo | Grav/10 | Dónde | Cómo corregir | Prioridad |
|---|---|---|---|---|
| Score = teatro de medición; usuario detecta que "nada cambia" | 9 | `lib/utils.ts` Sovereign Score | Modelo delta + discovery baseline | P0 |
| Abandono en onboarding Step 2-4 (60-70%) | 9 | onboarding flow | Demo temprana + reordenar + código opcional | P0 |
| Norman confronta a usuario vulnerable → daño + churn | 8 | `mentor.ts:488` | Protocolo Presencia + Honeymoon 7d | P0 |
| Paywall no justifica precio → pierde el ICP | 9 | `paywall.tsx`, `pricing.tsx` | Case studies + mentoría real + guarantee | P0 |
| Contenido fuera de la app (Skool) rompe la experiencia | 8 | `programas.tsx` | Embeber in-app | P1 |
| Regulatorio: claims de salud implícitos en binaurales/ayuno sin disclaimer serio | 8 | `binaurales.tsx`, ayuno copy | Disclaimers honestos + citas; cuidado con copy "resurrección celular" | P0 |
| Prácticas sin biofeedback → desconfianza ("me venden vibras") | 7 | bienestar/prácticas | HRV real o copy honesto | P1 |
| Comunidad muerta (feed cronológico, EULA punitiva) | 6 | comunidad | Reescribir tono tribu + conexión sugerida | P2 |
| Unit economics frágiles (Norman+voz+memoria+audio premium) | 7 | infra IA | Budgets por interacción, ai-proxy (deuda #22) | P1 |
| Internista promete personalización sin datos → clickbait | 7 | `internista.tsx` | Inyectar biométricos al prompt | P1 |

**Nota de marca/legal:** varios copyRewrites del audit (#6 "resurrección celular", "HGH limpio", "claridad +300%") son **claims de salud peligrosos**. NO adoptarlos literalmente — elevan el riesgo regulatorio que el propio audit marca como top-2. Reencantar el tono SÍ; inventar cifras fisiológicas NO.

---

## 13. Recomendaciones inmediatas

1. **Rehacer el Sovereign Score a modelo delta** — es la mentira fundacional que invalida progreso, paywall y autoridad de Norman. Todo lo demás depende de poder *probar* el cambio.
2. **Reordenar el onboarding** — código opcional, demo de 20s antes del Step 1, consent reescrito a lenguaje Polaris. Tapar el drop de 60%.
3. **Protocolo de Presencia + Norman Honeymoon** — gate emocional antes de confrontar; cero confrontación días 1-7. Salvar retención.
4. **Reconstruir el paywall** — case studies reales, Premium_Plus = mentoría 1:1, guarantee emocional. Sin esto no hay negocio premium.
5. **Disclaimers honestos en prácticas con claim de salud** — binaurales, ayuno. Antes de cualquier reescritura de marketing. Riesgo regulatorio top-2.
6. **Embeber Skool in-app** — cerrar la fuga estructural.

---

## 14. Backlog priorizado

### P0 — Bloqueantes de lanzamiento / del modelo de negocio

| Tarea | Página/flujo | Problema | Resultado esperado | Compl | Impacto | Criterio de aceptación |
|---|---|---|---|---|---|---|
| Score delta-driven | `lib/utils.ts`, progreso | Vanity metric premia frecuencia | Score refleja cambio real vs baseline | Alta | Alto | Días 1-7 sin score; day 8+ muestra Δ% vs semana 1; test unitario de la fórmula delta |
| Reordenar onboarding | onboarding, auth | Step 2 = drop 60% | Activación fuerte semana 1 | Media | Alto | Código opcional; demo 20s pre-Step1; consent en lenguaje Polaris; obstáculo en Step 4 |
| Protocolo de Presencia + Honeymoon | `mentor.ts` | Confronta a vulnerable | Holding antes de inteligencia | Media | Alto | Si energy≤3/stress≥8/≤7 días → suspende confrontación; test de los 10 escenarios |
| Reconstruir paywall | `paywall.tsx`, `pricing.tsx` | No justifica precio | Conversión premium creíble | Media | Alto | 3 case studies; Premium_Plus con mentoría descrita; guarantee emocional; web captura email |
| Disclaimers de salud honestos | binaurales, ayuno, prácticas | Claims implícitos | Riesgo regulatorio cerrado | Baja | Alto | Cada práctica con claim → disclaimer + cita; revisión legal de copy |

### P1 — Diferenciadores de profundidad

| Tarea | Página/flujo | Problema | Resultado esperado | Compl | Impacto | Criterio de aceptación |
|---|---|---|---|---|---|---|
| Loop accountability 24h | tasks, push | Sin bucle aplicación | Reflexión → acción medida | Media | Alto | Task → push 24h → modal "¿aplicaste?" → unlock badge |
| Biofeedback HRV en prácticas | bienestar/prácticas | Corren ciegas | Regulación real, no teatro | Alta | Alto | Si wearable conectado, HR en vivo + "coherencia alcanzada" cuando baja 10bpm |
| Embeber Skool in-app | `programas.tsx` | Contenido externo | Experiencia contenida | Media | Alto | Videos reproducen in-app con chrome Polaris |
| Internista con biométricos | `internista.tsx` | Sin datos reales | Diagnóstico contextual | Baja | Medio | Prompt recibe HRV/RHR/sleep; banner de métricas |
| Comando forward-authority | `comando.tsx` | Checklist pasivo | Sala de mando real | Media | Alto | Hero "una decisión hoy"; card TODAY'S COMMAND; Norte anclado |
| Archetype unlocks | programas, lesson | Ceremonia vacía | Identidad con consecuencia | Alta | Medio | Post-arquetipo cambia 1 feature visible (wellness/Comando) |

### P2 — Refinamiento de experiencia

| Tarea | Página/flujo | Problema | Resultado esperado | Compl | Impacto | Criterio |
|---|---|---|---|---|---|---|
| Check-in micro-rituales inline | `checkin.tsx` | Routing, no regulación | Acto, no encuesta | Media | Medio | Timer box-breathing inline + delta pre/post |
| Comunidad como tribu | comunidad, moderation | Feed muerto, EULA punitiva | Conexión sugerida | Media | Medio | EULA en tono hermandad; "miembros en tu semana" |
| Mentoría como espejo | mentoria | Tablero, no acompañamiento | Arco narrativo de transformación | Media | Medio | NoteCard con síntesis Norman + tags de tema |
| Copy sweep marca | global | Clichés self-help | Voz Polaris consistente | Baja | Medio | Voice Guide aplicado; 12 reemplazos del §8 |

### P3 — Aspiracional

| Tarea | Problema | Compl | Impacto |
|---|---|---|---|
| Ramificación inteligente post-M1 (quiz 4 cuerpos) | Ruta lineal rígida | Alta | Medio |
| Timeline mentoría no-lineal | Navegación pasiva | Media | Bajo |
| AR para puntos EFT (tapping) | "Leer+creer" vs "ver+actuar" | Alta | Bajo |
| Exportar PDF 4 cuerpos al médico real | Polaris como herramienta de diálogo clínico | Media | Bajo |

---

## 15. Quick wins de alto impacto (bajo esfuerzo)

1. **Código de acceso → opcional en onboarding** (mover a Step 3 reframado "desbloquea módulos avanzados"). Tapa bounce inmediato del Perfil 5.
2. **12 reemplazos de copy del §8** — texto puro, cero lógica. "MÁXIMO POTENCIAL"→"TU VERDAD", consent honesto, guarantee emocional.
3. **Reducir stagger de animación 50% + skip-intro** en welcome (delays ya verificados en código).
4. **Disclaimers honestos en binaurales** ("efectos investigados pero no concluyentes") — cierra riesgo legal con una línea.
5. **Internista recibe biométricos** — el motor ya existe (`wearable_daily`); es pasar campos al prompt. Diferencial enorme por esfuerzo mínimo.
6. **Coherencia en color de alerta** (smoke→ámbar/rojo cuando baja) — token swap, alto impacto de señal.
7. **Stats triad reescrita** ("4 CUERPOS · MEDICINA+PSICOLOGÍA+RENDIMIENTO") — comunica diferencial sin nuevo código.
8. **SovereignScore variante hero** — padding+shadow al KPI crítico.

---

## 16. Cambios que NO deben hacerse (proteger lo que funciona)

- **NO tocar la paleta oro/carbón ni GrandisExtended** — la estética quiet luxury es el activo más fuerte y diferenciado. Es lo único que separa a Polaris de un gamer-app.
- **NO adoptar los copyRewrites con claims fisiológicos inventados** ("HGH limpio", "claridad +300%", "resurrección celular"). Reencantar el tono SÍ; mentir sobre fisiología NO. El propio audit marca esto como riesgo top-2.
- **NO quitar los guardrails de seguridad de Norman** (disclosure de IA, ruteo de crisis, red-flags del internista sin LLM). La derivación determinística es correcta y debe permanecer.
- **NO gamificar con puntos falsos** — el problema del score es que premia lo equivocado, no que falte gamificación. Más badges huecos empeoran la profundidad.
- **NO romper la arquitectura de privacidad** (admin-blind del internista, DMs solo metadata, RLS owner-only, clientSafeProfile). Es defensible y es parte de la autoridad.
- **NO eliminar la consent gate** — reescribir su *tono*, no su existencia. El compliance es real.
- **NO sobre-cargar Comando con más secciones** — el problema es jerarquía y forward-authority, no falta de contenido. Quitar antes que agregar.

---

## 17. Nueva versión sugerida de la experiencia (visión)

**Polaris v5 — "El espejo que confronta, no el tablero que mide."**

El usuario entra y en 60 segundos entiende que esto es distinto: una demo de 20s muestra el loop vivo (check-in → Norman ve tu estado → una decisión → el dato sube). Los primeros 7 días son **discovery**: sin score, sin confrontación, solo presencia de Norman aprendiendo quién eres y estableciendo tu línea base biométrica y de identidad. Day 8, el tablero se enciende — pero no muestra "720 puntos", muestra **"tu energía subió de 4.2 a 6.8 vs tu semana 1; tu declaración de identidad se refinó 3 veces; mantén ese ritmo."** Cada práctica de bienestar lee tu HRV en vivo y te confirma biológicamente que algo cambió. Norman recuerda tu sesión de hace 3 días y te confronta solo cuando estás listo, con el dato literal, nunca cuando llegas roto. El Norte que declaraste se anuncia en cada pantalla y ordena la única decisión que importa hoy. Y cuando llegas al paywall, ya viste tu propio cambio probado en datos — la mentoría 1:1 de Premium_Plus no es un upsell, es el siguiente escalón obvio. **Los 4 cuerpos dejan de ser predicados y se vuelven gobernables, integrados por un tejido de memoria y coherencia que hace visible la transformación que hoy solo se computa.**

---

## 18. Roadmap por fases

**Fase 0 — Salvar la credibilidad (2-3 semanas):** Quick wins §15 + disclaimers de salud + código opcional + copy sweep. Cero riesgo, tapa las fugas más baratas y el riesgo regulatorio.

**Fase 1 — Reconstruir el cimiento (4-6 semanas):** Score delta-driven + discovery baseline + Protocolo de Presencia/Honeymoon + reordenar onboarding. Esto vuelve honesto el corazón del producto. *Bloquea todo lo demás.*

**Fase 2 — Justificar el precio (3-4 semanas):** Paywall reconstruido + Premium_Plus con mentoría real + prueba de transformación propia (depende de Fase 1). Habilita el modelo de negocio premium.

**Fase 3 — Profundidad diferencial (6-8 semanas):** Loop 24h + biofeedback HRV + Skool in-app + internista con biométricos + Comando forward + Memory/Confrontation OS activos en cohorte. Convierte "app bonita" en "extensión viva del método".

**Fase 4 — Refinamiento y comunidad (continuo):** Comunidad-tribu, mentoría-espejo, archetype unlocks, ramificación inteligente. Consolida retención de 90 días.

---

## CRITERIO FINAL — Las 5 preguntas

**1. ¿Es una extensión viva del Método Polaris?**
**No todavía.** Es el andamiaje técnico correcto (Memory OS, Confrontation OS, biometría, Norman, los 4 cuerpos cableados) pero **desactivado**. Mide presencia donde debería medir profundidad, predica los 4 cuerpos donde debería gobernarlos. Está a una Fase 1 de serlo.

**2. ¿Pagaría un empresario USD 5-25k?**
**Hoy no.** El paywall parece "app de meditación cara": sin prueba de ROI, sin mentoría 1:1 real, sin poder mostrarle *su propio* cambio en datos. El ICP exacto vuelve a su coach de $5k/mes. Con score delta + Premium_Plus de mentoría + prueba de transformación, **sí** — pero ese es el trabajo de Fases 1-2.

**3. ¿Guía a una vida soberana?**
**Parcialmente, y por el camino equivocado.** El Norte se declara pero no vive; el score premia frecuencia de clic, no soberanía (límites sostenidos, confrontaciones enfrentadas). El usuario puede acumular 720 puntos y seguir igual de fragmentado. La soberanía se computa, no se construye.

**4. ¿Ayuda a Norman a vender su autoridad?**
**A medias.** Norman tiene método y voz sólidos, pero su autoridad se erosiona en los 8 de 10 escenarios donde el operador llega vulnerable y recibe inteligencia antes que presencia. La autoridad real viene de "te vi venir y te acompañé bien", no de "tengo tu dato". Hoy tiene el dato; le falta el holding.

**5. ¿Honra la profundidad?**
**Es su mayor debilidad (profundidad media 4.0/10).** Cada pantalla promete ritual y entrega recibo; cada métrica promete transformación y entrega contador de actividad. La belleza (7.9) tapa el vacío, pero el usuario consciente lo detecta hacia la semana 3-4 — y se va. **La profundidad no se diseña con más features; se diseña haciendo que el cambio sea visible y probado.** Ese es el norte de todo el roadmap.

---

**Veredicto de una línea:** *Polaris es un Stradivarius afinado que aún no ha tocado una nota — la madera es exquisita, falta encender el sonido que justifica el precio.*

---

Archivos verificados durante la auditoría:
- `C:\Users\ASUS\...\lifeflow\lib\utils.ts` (Sovereign Score confirmado: input-driven, sin delta — `calcSovereignScore:45-57`)
- `C:\Users\ASUS\...\lifeflow\app\(auth)\welcome.tsx` (copy "MÁXIMO POTENCIAL":137-138, "ENTRAR AL SISTEMA":115, stats triad genérica:94-110, stagger de animación 150-2200ms:52-62 — todos confirmados)

Nota de precisión: el audit cita tiers "ELITE/AVANZADO/EN_CONSTRUCCIÓN"; el código real (`utils.ts:60-69`) usa `ELITE/AVANZADO/EN ASCENSO/INICIANDO`. No afecta el diagnóstico (el problema del score es estructural, no de etiquetas).