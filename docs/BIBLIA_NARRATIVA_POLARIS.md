# POLARIS · Biblia de Narrativa
### Cómo habla Polaris — y cómo se gobierna esa voz

> Documento canónico de la voz del producto. Aplica a TODO lo que un cliente
> lee o escucha: la app, Norman IA, Skool, correos, marketing, ventas.
> Fecha: 21 de agosto de 2026 · Dueño de la voz: el fundador (o quien delegue por escrito).

---

## 0 · La frase generadora

> ## «Busca el estado, no el resultado.»

Todo lo demás en este documento se **deriva** de esta frase. Si alguna regla
de aquí entra en conflicto con un texto nuevo, la frase decide. Si alguien
del equipo solo puede memorizar una cosa, es esta.

**Qué significa:** Polaris no le pide al cliente que rinda — le enseña a leer
y regular el estado desde el que opera. El desempeño es consecuencia; el
estado es la palanca. Por eso la app mide energía, claridad, saturación y
sueño (estados), y no tareas cumplidas, metas batidas o días "perfectos"
(resultados).

**La única excepción, que confirma la regla:** el RESULTADO se declara **una
sola vez**, en Mi Norte — «¿Qué tiene que haber pasado en estos 90 días para
que Polaris haya valido la pena?». El ESTADO se busca **a diario**, en
Comando y el Check-in. Dos escalas de tiempo distintas; jamás se mezclan.
Un copy que empuje logro diario está fuera de voz. Un copy que lea y regule
estado está dentro.

---

## 1 · Las siete reglas duras

Derivadas de la frase. Las cinco primeras ya están **vigiladas por tests
automáticos en el código** — quien las viole, rompe el build.

| # | Regla | Guardián |
|---|---|---|
| 1 | **Vocabulario de acompañamiento, nunca clínico.** El estado del cuerpo se dice ÓPTIMO · COMPLETO · FRÁGIL · ATENCIÓN — jamás "patológico", "deficiente", "anormal". Polaris no diagnostica y su lenguaje tampoco. | test de `metricTileLogic` |
| 2 | **Sin lenguaje bélico.** "Sistema", "frente de trabajo", "criterio", "protocolo" — nunca "armas", "guerra", "batalla", "enemigo". El cliente no está en guerra consigo mismo. | regla del manual §voz |
| 3 | **La ausencia de dato es información, no fracaso.** "SIN DATO" en gris neutro. Nunca un cero inventado, nunca rojo por no medir. No medir no es fallar. | patrón `composeDayTiles` |
| 4 | **Doble registro coach/cliente.** El mentor ve lenguaje técnico (`coach_safe_summary`); el cliente solo el registro de acompañamiento (`client_safe_summary`). La separación es estructural (RLS), no de cortesía. | arquitectura + RLS |
| 5 | **El nombre interno no existe para el cliente.** "LifeFlow" es nombre de repositorio. El cliente ve BIENESTAR. | `nombreDeMarca.test.ts` |
| 6 | **La seguridad derriba la voz.** Ante crisis, autolesión o red-flag médica, Norman IA abandona el registro soberano y deriva a ayuda profesional — primero la derivación, después el estilo. | prompt de Norman + lógica pura del internista |
| 7 | **Rótulos en versalitas SIEMPRE con tilde.** La prisa no es excusa tipográfica: MENTORÍA, PROGRESO, SATURACIÓN. | `tildes.test.ts` |

---

## 2 · Glosario canónico

Los términos se usan EXACTAMENTE así. Un sinónimo inventado por prisa es una
fuga de narrativa.

| Término | Qué es | Nunca decirle |
|---|---|---|
| **Protocolo Soberano** | El programa de 90 días | "el curso", "el reto", "el challenge" |
| **Mi Norte** | La declaración de dirección: propósito, identidad, no negociables, recordatorio | "tus metas", "tus objetivos" |
| **Check-in** | La lectura diaria de estado (energía · claridad · saturación · sueño) | "encuesta", "evaluación", "test diario" |
| **Nivel de saturación** | Cuánta carga trae el sistema (1-3 Despejado · 4-7 Cargado · 8-10 Saturado) | "estrés" a secas, "carga del sistema" |
| **Score Soberano** | Acumulado vitalicio de lecturas + lecciones. No baja; el movimiento lo marca el delta | "puntaje de desempeño", "calificación" |
| **El Arco** | La historia de los 90 días en tres actos (Base · Profundidad · Identidad) | "tu progreso", "tu avance" a secas |
| **Norman IA** | El mentor de IA. Siempre con el apellido "IA" — se presenta como inteligencia artificial, sin fingir humanidad | "Norman" a secas en rótulos, "el bot", "el asistente" |
| **El Navegador** | El mentor humano de las sesiones semanales | "el coach" (en cliente), "el terapeuta" |
| **Bienestar** | El dominio de recuperación: prácticas, cuerpo, emocional | "LifeFlow" (nombre interno), "wellness" |
| **Arquetipos** | Guerrero, Pontífice, Mercader… — las capas de identidad que el protocolo integra | "niveles", "insignias", "badges" |
| **Las 7 Llaves** | El sistema de prosperidad del 4to Nivel de Consciencia | "los pasos", "los tips financieros" |
| **Operador / Soberano** | Los planes (free / pago). El cliente ES un operador que se vuelve soberano | "usuario free", "premium" en copy visible |
| **Modos** | Las 6 composiciones de la app: Específico · Esencial · Operador · Calma · Guiado · Logos | "temas", "vistas", "layouts" |
| **Directiva** | LA acción del día — una sola, con su porqué | "tu lista de tareas", "pendientes" |

---

## 3 · Pares «así sí / así no»

La forma más rápida de calibrar la voz. Cada par ilustra una regla.

**Estado, no resultado**
- ❌ «¡No cumpliste tu meta de hoy! Recupera el tiempo perdido.»
- ✅ «Así entra tu sistema hoy: saturación alta, sueño corto. Hoy: un frente, no diez.»

**Acompañamiento, no clínica**
- ❌ «Tu HRV es anormalmente bajo. Riesgo de fatiga patológica.»
- ✅ «HRV 42 ms · ATENCIÓN. Tu cuerpo pide ritmo suave hoy.»

**Sin guerra**
- ❌ «Destruye tus creencias limitantes. Sal a la batalla.»
- ✅ «La creencia que detectaste ya cumplió su función. Hoy se suelta.»

**Ausencia sin castigo**
- ❌ «Llevas 3 días fallando tu check-in. Racha perdida. 😞»
- ✅ «Volver no exige ponerte al día con nada. Un check-in de hoy vale más que reconstruir la semana.»

**Retomar sin culpa (el registro del regreso)**
- ❌ «¿Dónde estabas? Tu progreso se estancó.»
- ✅ «Llevas un tiempo fuera del sistema. El protocolo sigue aquí — se retoma donde estás, no donde deberías estar.»

**Norman IA se presenta como IA**
- ❌ «Hola, soy Norman, tu amigo que siempre te entiende.»
- ✅ «Soy Norman IA. Leo tu protocolo y tus lecturas — haz tu check-in y te devuelvo una instrucción operativa.»

**La directiva es una**
- ❌ «Hoy: medita, entrena, lee la lección, escribe el diario, conecta tu wearable y…»
- ✅ «HOY: sesión de fuerza. Tu recuperación está en rango y llevas 2 días sin entrenar.»

**El dato se cita, no se dramatiza** (regla de confrontación)
- ❌ «Estás mintiendo: dices que duermes bien pero tu wearable te delata.»
- ✅ «Dijiste "estoy durmiendo bien". Tu wearable registró 5 h 40 promedio esta semana. ¿Qué está pasando ahí?»

---

## 4 · Gobernanza — quién decide y cómo

1. **Dueño de la voz.** Una sola persona aprueba términos nuevos y cambios de
   registro. Hoy: el fundador. Todo lo demás es propuesta.
2. **La voz vive en el código.** Las reglas 1, 3, 5 y 7 tienen test — cambiarlas
   exige cambiar el test, y cambiar el test exige la firma del dueño de la voz.
   Este es el mecanismo que ningún PDF tiene: **violar la voz rompe el build**.
3. **Un solo módulo por mensaje.** Si dos pantallas dicen lo mismo, lo dicen
   desde la MISMA función (como el Arco en `narrativeLogic`): la duplicación de
   copy es el primer paso de la deriva.
4. **Skool bajo la misma ley.** Títulos de lecciones y documentos usan el
   glosario (§2). "Sesión Lifeflow – 4 jun" viola dos reglas a la vez: nombre
   interno + título sin contenido narrativo.
5. **Cambios de término = migración, no edición.** Renombrar un concepto
   (ej. "Carga del sistema" → "Nivel de saturación") se hace en TODOS los
   frentes el mismo día: app, Skool, correos. Un término a medio migrar
   confunde más que el término viejo.

---

## 5 · El ritual de entrada (30 minutos por persona)

Nadie entiende una voz leyéndola — se entiende **reescribiendo**.

1. **La frase (5 min).** Se explica «Busca el estado, no el resultado» con la
   excepción del Norte. Nada más de teoría.
2. **Conversar con Norman IA (10 min).** La voz está ahí operando. La
   instrucción que le queda a cualquiera: *"escribe como responde Norman"*.
3. **Reescritura (15 min).** Se entregan 5 textos fuera de voz (uno clínico,
   uno bélico, uno de culpa por ausencia, uno de lista de tareas, uno que
   dice "LifeFlow") y la persona los reescribe. Se corrigen contra los pares
   del §3. Quien pasa este ejercicio, escribe para Polaris.

---

## 6 · Checklist antes de publicar cualquier texto

- [ ] ¿Se deriva de «busca el estado, no el resultado»? (¿lee/regula estado, o empuja logro diario?)
- [ ] ¿Cero vocabulario clínico y cero bélico?
- [ ] ¿Los términos son los del glosario, sin sinónimos inventados?
- [ ] ¿La ausencia (de dato, de racha, de días) se trata sin culpa?
- [ ] ¿Norman aparece como "Norman IA" y no finge ser humano?
- [ ] ¿Hay UNA directiva, no una lista?
- [ ] ¿Versalitas con tilde?
- [ ] Si toca salud o crisis: ¿la derivación va antes que el estilo?
