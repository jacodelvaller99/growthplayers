# COPY_RISK_AUDIT — Polaris / LifeFlow

**Equipo 5 — Producto / Copy / Experiencia · Auditoría pre-lanzamiento**
Alcance: copy visible al usuario (onboarding, auth, Norman, paywall, check-in, biometría, bienestar, notificaciones, disclaimers).
Objetivo: proteger la promesa premium **sin** cruzar líneas regulatorias (App Store 1.4.1 / 5.1.1, Google Play Health, prácticas de consumo) ni sonar cursi/manipulador.

Leyenda de riesgo:
- **REG-MED** — claim médico / terapéutico / fisiológico implícito (cura, trata, diagnostica, "reduce ansiedad", efectos clínicos).
- **REG-PAGO** — práctica de consumo / suscripción (garantía irreal, dark pattern, fricción de cancelación, choque con reglas de stores).
- **REG-IA** — falta de divulgación de IA / la IA reclama identidad o autoridad humana.
- **MANIP** — urgencia falsa, presión, prueba social no verificable, FOMO.
- **CURSI/GEN** — genérico, motivacional-poster, vacío.
- **AMB** — estado de error/vacío ambiguo o que culpa al usuario.

Severidad: **P0** bloqueante para lanzar · **P1** corregir antes de stores · **P2** pulido.

---

## A. Riesgo regulatorio — médico / terapéutico (REG-MED)

| # | Ubicación (file:line) | Copy actual | Riesgo | Por qué es riesgoso | Reescritura sugerida |
|---|---|---|---|---|---|
| A1 | `data/wellness.ts:677` | "Corta el pico de **ansiedad** y devuelve el control en minutos." | REG-MED · P1 | "Corta la ansiedad en minutos" es un claim de eficacia terapéutica sobre una condición clínica. Sin respaldo = publicidad sanitaria engañosa; en stores entra en categoría salud. | "Una ancla para momentos de tensión alta. Te ayuda a volver al presente y recuperar la calma." |
| A2 | `data/wellness.ts:769` | "Activa el parasimpático. **Reduce ansiedad en minutos.**" | REG-MED · P1 | Mismo patrón: efecto fisiológico medible + reducción de ansiedad cuantificada en tiempo. | "Respiración pensada para bajar revoluciones y favorecer la calma." (sin "reduce ansiedad", sin "minutos") |
| A3 | `data/wellness.ts:798` | "Sincroniza corazón y cerebro. Estado de flow." | REG-MED · P2 | "Sincroniza corazón y cerebro" es un claim neurofisiológico no comprobable como se enuncia. | "Ritmo de respiración usado para entrar en foco sostenido." |
| A4 | `app/bienestar/binaurales.tsx:136` | "HEALING — 7.83 Hz Schumann — Resonancia terrestre" + (cards) | REG-MED · P1 | Etiqueta **"HEALING"** (sanación) sobre un tono binaural sugiere efecto curativo. Pseudociencia con marca de salud. | Renombrar a "CALMA" / "RESET". Descripción: "Frecuencia suave para relajación profunda." Quitar "HEALING/Resonancia/sanación". |
| A5 | `app/bienestar/binaurales.tsx:619` | "Frecuencias que **sincronizan hemisferios cerebrales.** Requiere audífonos." | REG-MED · P2 | Claim cerebral categórico presentado como hecho. | "Audio binaural diseñado para acompañar estados de foco o calma. Experiencia subjetiva; requiere audífonos." |
| A6 | `app/bienestar/tapping.tsx:90` | "Mi cuerpo sabe cómo soltar esto... **Confío en mi capacidad de sanar...**" | REG-MED · P2 | Es guion de afirmación (1ª persona del usuario), riesgo bajo, pero "sanar" sumado al resto refuerza encuadre terapéutico. Mantener como afirmación está OK; vigilar que la pantalla no prometa "sanación". | Aceptable como afirmación personal. Asegurar que ningún encabezado de la pantalla afirme que el tapping "sana" o "trata". |
| A7 | `app/bienestar/consciencia.tsx:72,79` | "Ansiedad, retraimiento. El sistema nervioso ve peligro…" / "Codicia, **adicción**…" | REG-MED · P2 | Describe estados clínicos (ansiedad, adicción) dentro de una "escala de consciencia" como diagnóstico de estado. Es contenido educativo, pero conviene encuadre. | Mantener como descripción emocional educativa; añadir nota de pantalla "Marco de autoconocimiento, no una evaluación clínica." |
| A8 | `app/perfil/wearables.tsx:87` | "El anillo Oura mide readiness… con **alta precisión clínica.**" | REG-MED · P1 | "Precisión clínica" implica grado médico/validación regulatoria que el wearable de consumo no tiene. | "…con alta precisión para dispositivos de consumo." (quitar "clínica") |
| A9 | `lib/mentor.ts:245` | "SEÑAL BIOMÉTRICA: su frecuencia cardíaca en reposo está elevada sobre su línea base — puede indicar **fatiga o inflamación**" | REG-MED · P1 | Instrucción al modelo para sugerir causas fisiológicas ("inflamación") a partir de FC. Es interpretación cuasi-diagnóstica que Norman puede verbalizar al usuario. | "…puede reflejar que tu cuerpo aún se está recuperando. Si se mantiene varios días, conviene revisarlo con un profesional de salud." Quitar "inflamación". |
| A10 | `lib/mentor.ts:93` | "El **sistema nervioso del operador lleva días en modo amenaza.**" (+ análogos en `mentor.tsx:61`, `comando.tsx:351`) | REG-MED · P2 | Afirmación fisiológica categórica derivada solo de un slider de estrés autorreportado, no de datos clínicos. Aceptable como lenguaje metafórico si no se presenta como medición. | "Llevas varios días reportando estrés alto." (descriptivo, basado en lo que el usuario registró) |
| A11 | `app/(tabs)/mentor.tsx:83` | "La **neurociencia dice que a los 66 días** un comportamiento se vuelve automático." | REG-MED / GEN · P2 | Cita "neurociencia" para un dato (los 66 días vienen de un estudio de formación de hábitos, no de neurociencia) — autoridad científica mal atribuida. | "Se necesita tiempo para que un hábito se vuelva automático — distintos estudios hablan de semanas, no de días." |
| A12 | `app/(tabs)/mentor.tsx:93` | "El **cortisol alto colapsa el pensamiento estratégico.**" | REG-MED · P2 | Afirmación bioquímica categórica como hecho clínico. | "El estrés alto nubla el pensamiento estratégico." |

---

## B. Riesgo regulatorio — pago / suscripción (REG-PAGO)

| # | Ubicación | Copy actual | Riesgo | Por qué es riesgoso | Reescritura sugerida |
|---|---|---|---|---|---|
| B1 | `app/paywall.tsx:155-157` | "**7 días de garantía total. Si no es para ti, devolvemos cada centavo — sin preguntas.**" | REG-PAGO · **P0** | Polaris **no controla los reembolsos** de App Store / Google Play. Apple no garantiza reembolsos "sin preguntas"; prometer "cada centavo, sin preguntas" es un compromiso que la plataforma no honra → queja de consumidor + posible rechazo de revisión. | "Puedes cancelar cuando quieras desde tu cuenta de Apple/Google. Los reembolsos se gestionan según las políticas de la tienda." (Si quieres garantía real, ofrécela por canal directo/Stripe, no sobre compras in-app.) |
| B2 | `app/paywall.tsx:126` | "¿ESTÁS LISTO PARA **COMPROMETERTE**?" + CTA "ME COMPROMETO" / "COMPROMETERSE CON EL PROTOCOLO" (`:203-204`) | MANIP · P1 | El framing de "compromiso" sobre un botón de **cobro recurrente** mezcla presión psicológica con la transacción. El usuario debe ver claro qué paga, cuánto y cada cuánto — no un voto moral. | Mantener el tono premium en el copy de valor, pero el botón debe ser transaccional y claro: "SUSCRIBIRME · {precio}/año" con renovación visible. Reserva "comprometerte" para el texto motivacional, no para el botón de pago. |
| B3 | `app/paywall.tsx:179-182` | Badge "MEJOR VALOR" sobre el plan anual, anual preseleccionado (`:47`) | REG-PAGO · P2 | Preseleccionar el plan más caro + badge es práctica común pero en la frontera de "dark pattern" si el mensual no es igual de visible. | Aceptable si: ambos planes visibles con igual jerarquía, precio mensual equivalente del anual mostrado ("{precio}/año ≈ {precio}/mes"), y nada preseleccionado o el más barato por defecto. |
| B4 | `app/paywall.tsx:146-149` | "**'El método que usé para pasar de 60 a 20 horas de trabajo semanales sin perder ingresos.' — Operador activo**" | MANIP / REG-PAGO · P1 | Testimonio sin atribución verificable ("Operador activo") con resultado económico específico = prueba social no comprobable + claim de resultado de ingresos. Riesgo de publicidad engañosa. | Sustituir por enunciado de capacidad sin cifra prometida: "Diseñado para ayudarte a recuperar horas y operar con más foco." O usar testimonio real, con consentimiento, nombre/inicial y aviso "resultados individuales; no representan una promesa." |
| B5 | `app/(onboarding)/index.tsx:60` | Mensaje de éxito de código: "✅ {producto} **activado**" | AMB · P2 | OK. Solo confirmar que `PRODUCT_LABELS` no prometa más de lo que el código concede. | Sin cambio si el label es preciso. |

---

## C. Riesgo de IA — divulgación e identidad (REG-IA)

| # | Ubicación | Copy actual | Riesgo | Por qué es riesgoso | Reescritura sugerida |
|---|---|---|---|---|---|
| C1 | `lib/mentor.ts:310` | System prompt: "**Soy Norman Capuozzo, fundador del Polaris Growth Institute. Durante la pandemia de 2020 perdí a mi padre…**" — la IA habla en 1ª persona como el fundador real, narra su vida y dice "lo que he vivido". | REG-IA · **P0** | La IA **se hace pasar por una persona real** (Norman Capuozzo es el fundador; el email del usuario es `ncapuozzo@…`). Relata experiencias personales en 1ª persona ("perdí a mi padre", "viví yo mismo" `:592,595`) como si fueran del humano. Sin divulgación clara de que es IA, esto es suplantación de identidad + posible engaño. Apple 5.1.1 y normas de IA exigen que el usuario sepa que habla con una IA. | (a) Divulgación persistente "Norman IA — mentor con inteligencia artificial inspirado en el método de Norman Capuozzo" (ya existe el label en `comando.tsx:415`, falta en el contenido). (b) Reescribir el prompt para que hable **en nombre del método**, no como la persona: "Soy Norman, tu mentor IA. Estoy entrenado con el método y la filosofía de Norman Capuozzo, fundador de Polaris." Evitar 1ª persona de vivencias reales del humano salvo encuadre "Norman cuenta que…". |
| C2 | `app/bienestar/biometrics.tsx:319,322` | Sección "**NORMAN DICE**" con interpretación de HRV generada por IA, mostrada como cita textual de Norman. | REG-IA + REG-MED · P1 | Combina (a) IA presentada como persona y (b) interpretación de un dato biométrico. El usuario puede creer que un experto humano revisó su HRV. | Etiqueta "LECTURA DE NORMAN IA" + microcopy "Interpretación generada por IA a partir de tus datos. No es consejo médico." |
| C3 | `app/(tabs)/comando.tsx:81` | Greeting de engagement: "¡Excelente racha! Tu disciplina está **generando resultados medibles.**" | MANIP / GEN · P2 | "Resultados medibles" afirma un resultado que la app no necesariamente ha medido (es un mensaje motivacional disparado por engagement_tier). | "¡Excelente racha! Tu consistencia se está notando." |
| C4 | `lib/mentor.ts:378-379` | REGLA DE PRUEBA SOCIAL: "El 80% siente exactamente esto en la Semana 2…" / "He acompañado a docenas de personas…" | MANIP · P1 | Instruye a la IA a inventar **estadísticas ("80%") y experiencia humana ("he acompañado a docenas")** como prueba social. Aunque el prompt dice "no inventes historias específicas", sí autoriza cifras y experiencia personal no verificables. | Quitar cifras inventadas. Permitir solo patrones cualitativos sin número y sin reclamar experiencia humana: "Mucha gente siente esto justo en esta fase — suele aparecer antes de un avance." |
| C5 | `lib/mentor.ts:360-392` | Sección **"DISEÑO DE OBSESIÓN"** (reglas de recompensa variable, urgencia, interrupción de patrón). | MANIP (interno) · P2 | No es copy visible, pero el **nombre y la intención** ("diseñar obsesión", "recompensa variable") son patrones de captación de atención que, si trascienden o se auditan, dañan la marca premium y rozan diseño manipulador. | Renombrar a "DISEÑO DE COMPROMISO PROFUNDO" y reencuadrar como adherencia saludable. No es bloqueante para lanzar, pero conviene por reputación. |

---

## D. Estados de error / vacío ambiguos (AMB)

| # | Ubicación | Copy actual | Riesgo | Por qué es riesgoso | Reescritura sugerida |
|---|---|---|---|---|---|
| D1 | `app/paywall.tsx:80` | `Alert('Error en la compra', err?.message ?? 'Inténtalo de nuevo o contacta soporte.')` | AMB · P2 | Muestra `err.message` crudo del SDK (técnico, en inglés a veces) al usuario. | Mapear errores comunes (cancelado por usuario, sin red, ya suscrito) a mensajes claros en español; "contacta soporte" con vía concreta. |
| D2 | `app/(tabs)/mentor.tsx:458-460` | En error de streaming solo hay `console.error` + haptic de error; **no se muestra nada al usuario**; el burbuja del usuario desaparece. | AMB · P1 | El usuario envía un mensaje, no recibe respuesta y su mensaje se borra sin explicación. Parece que la app falló o lo ignoró. | Mostrar burbuja de error recuperable: "No pude responder ahora mismo. Revisa tu conexión y vuelve a intentarlo." + botón reintentar; conservar el texto del usuario. |
| D3 | `app/(onboarding)/index.tsx:69` | `errorMap[result.status] ?? '**Código no válido o expirado**'` | AMB · P2 | El fallback colapsa estados distintos en uno; aceptable. Verificar que `invalid/exhausted/expired/inactive` cubran los casos reales del backend. | OK; añadir "Verifica el código con tu coach si el problema persiste." |
| D4 | `app/(tabs)/comando.tsx:644-645` | Empty norte: "Define tu norte" / "Agrega tu recordatorio diario en Mi Norte." | AMB · P2 | Claro. Sin cambio. | — |
| D5 | `app/bienestar/index.tsx:303-305` | Journal: "Silent fail — journal is best-effort" (sin feedback si falla el guardado) | AMB · P2 | Si Supabase falla, el usuario cree que guardó pero se perdió. | Mostrar toast discreto "No se pudo guardar tu reflexión. Inténtalo de nuevo." en el catch. |

---

## E. Onboarding / paywall — sobrepromesa y tono (CURSI/GEN, MANIP)

| # | Ubicación | Copy actual | Riesgo | Por qué es riesgoso | Reescritura sugerida |
|---|---|---|---|---|---|
| E1 | `app/(onboarding)/index.tsx:114-117` | "Esta app **no es para todos.** Es para quien ya sabe que la distancia entre donde está y donde quiere estar no es de estrategia — es de sistema interno." | MANIP (leve) / elite · P2 | "No es para todos" es exclusividad calculada. Bien ejecutado suena premium; vigilar que no derive en presión. Aquí está en el límite aceptable y refuerza marca. | Mantener. Es de los mejores ejemplos de voz elite del producto. |
| E2 | `app/(auth)/welcome.tsx:140` | "PROTOCOLO **v4.2** · SOBERANÍA OPERATIVA" | GEN · P2 | "v4.2" inventa un número de versión de producto que no significa nada para el usuario; resta credibilidad si alguien pregunta. | Quitar el número de versión o reemplazar por algo con significado ("PROGRAMA DE 90 DÍAS · SOBERANÍA OPERATIVA"). |
| E3 | `app/(onboarding)/index.tsx:135-139` | Nota legal: "…son usados exclusivamente para personalizar tu experiencia. **No son consejo médico.** Puedes exportar o eliminar tu cuenta en Perfil → Privacidad y Datos (RGPD/GDPR)." | (positivo) | **Buen ejemplo.** Ya cubre uso de datos + no-consejo-médico + derechos GDPR. | Mantener. Reusar este patrón en la pantalla de consentimiento de wearables (ver CONSENT_SCREEN_COPY.md). |
| E4 | `app/paywall.tsx:127-129` | "No es solo una suscripción. Es la decisión de operar tu vida con la misma seriedad con que operarías una empresa de alto rendimiento." | elite · P2 | Tono premium correcto, sin claim. | Mantener. |
| E5 | `app/checkin.tsx:31-39,86-93` | Títulos rotativos + "Estrés {n}/10 — tu sistema reconoce un desafío real. Eso es información, no debilidad." | (positivo) | **Buen ejemplo.** Reencuadra el estrés sin patologizar; no promete nada. | Mantener. Modelo de voz a seguir. |
| E6 | `services/notifications.ts:9-23` | 14 mensajes de recordatorio ("El guerrero no espera sentirse bien para actuar…") | GEN/elite · P2 | Sin claims médicos ni urgencia falsa. Tono consistente con la marca. | Mantener. |
| E7 | `app/bienestar/index.tsx:24-114` | DAILY_PHRASES — 90 frases estoicas/Polaris con atribución de autor | GEN · P2 | Riesgo bajo. Algunas atribuciones podrían discutirse (frases parafraseadas atribuidas a Séneca/Marco Aurelio), pero es práctica común. | Mantener. Revisar que las citas a autores reales sean parafraseo razonable, no invención literal. |

---

## Resumen de severidad

| Severidad | Items | Acción |
|---|---|---|
| **P0 (bloqueante)** | B1 (garantía "sin preguntas"), C1 (IA suplanta al fundador real) | Corregir antes de cualquier build de stores. |
| **P1** | A1, A2, A4, A8, A9, B2, B4, C2, C4, D2 | Corregir antes de enviar a revisión. |
| **P2** | resto | Pulido; algunos son ejemplos positivos a conservar. |

**Lo que ya está bien (conservar como modelo):** disclaimer de onboarding (E3), reencuadre del estrés en check-in (E5), modal médico no-omitible de ayuno (`ayuno.tsx:199-214`), `MedicalDisclaimer.tsx` y su surfacing en `biometrics.tsx:211`, nota de privacidad de tokens OAuth (`wearables.tsx:576-579`), copy de notificaciones (E6).
