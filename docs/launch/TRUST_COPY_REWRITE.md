# TRUST_COPY_REWRITE — Reescrituras concretas (ES)

**Equipo 5 — Producto / Copy / Experiencia**
Reescrituras listas para pegar de los ítems más riesgosos. Criterio: que suenen **elite, claras, seguras y confiables** — premium sin prometer lo que no se puede sostener, honestas sobre la IA, sin patologizar.

Principio rector: *el lujo es la precisión, no la exageración.* Un mentor de élite no garantiza resultados ni se inventa autoridad — calibra, acompaña y dice la verdad.

---

## 1. Paywall — la "garantía sin preguntas" (P0)

**Archivo:** `app/paywall.tsx:155-157`

ANTES
> 7 días de garantía total. Si no es para ti, devolvemos cada centavo — sin preguntas.

DESPUÉS (compras in-app — honesto con las reglas de la tienda)
> Sin permanencia. Cancela cuando quieras desde tu cuenta de Apple o Google; conservas el acceso hasta el final del periodo pagado. Los reembolsos se gestionan según las políticas de la App Store / Google Play.

> Nota de implementación: si el negocio realmente quiere ofrecer devolución incondicional, debe hacerse por venta directa (web/Stripe), donde Polaris sí controla el reembolso. Sobre compras in-app, prometer "devolvemos cada centavo sin preguntas" es incumplible y es motivo de queja y de rechazo en revisión.

---

## 2. Paywall — botón de pago y framing de "compromiso" (P1)

**Archivo:** `app/paywall.tsx:126, 198-209`

Mantener el copy de valor (el hero), volver **transaccional y claro** el botón.

Hero (se conserva, es buena voz):
> Operar tu vida con la misma seriedad con que operarías una empresa de alto rendimiento.

Botón (ANTES): `ME COMPROMETO — {precio}` / `COMPROMETERSE CON EL PROTOCOLO`
Botón (DESPUÉS):
> **EMPEZAR · {precio}/año** (renueva automáticamente)

Microcopy bajo el botón (nuevo):
> Suscripción anual. Se renueva automáticamente salvo que canceles al menos 24 h antes del final del periodo. Gestionas todo desde los ajustes de tu cuenta.

---

## 3. Paywall — testimonio sin verificar (P1)

**Archivo:** `app/paywall.tsx:146-149`

ANTES
> "El método que usé para pasar de 60 a 20 horas de trabajo semanales sin perder ingresos." — Operador activo

DESPUÉS (opción A — sin testimonio, enunciado de capacidad)
> Pensado para ayudarte a recuperar horas, delegar con criterio y operar con más foco — no para sumar otra tarea a tu día.

DESPUÉS (opción B — si hay testimonio real con consentimiento)
> "Recuperé el control de mi semana y dejé de operar en modo reacción." — M., Operador del Protocolo
> *Experiencia individual. No representa una promesa de resultados.*

---

## 4. Norman — identidad de IA, no suplantación del fundador (P0)

**Archivo:** `lib/mentor.ts:310` (bloque "QUIÉN ERES") y `:592,595` (dev responses)

ANTES (la IA habla como la persona real)
> Soy Norman Capuozzo, fundador del Polaris Growth Institute. Durante la pandemia de 2020 perdí a mi padre y vi cómo mi empresa se desplomaba…

DESPUÉS (la IA habla **en nombre del método**, con identidad de IA clara)
> Eres **Norman**, el mentor con inteligencia artificial de Polaris. Estás entrenado con el método, la filosofía y la voz de Norman Capuozzo, fundador del Polaris Growth Institute.
>
> Hablas desde el método de Norman, no como si fueras la persona. Cuando uses una historia o una vivencia de Norman Capuozzo, atribúyela con claridad: "Norman cuenta que durante la crisis de 2020…", nunca "yo perdí…". No inventes vivencias propias ni afirmes haber acompañado a personas en primera persona.
>
> Tu objetivo no es que el usuario crea que hablas con un humano — es darle la mejor guía posible con honestidad total sobre lo que eres.

Regla nueva a añadir en "LO QUE NUNCA HACES":
> - Nunca afirmas ser humano ni tener experiencias vividas propias. Si el usuario pregunta, respondes con naturalidad: "Soy la versión IA del mentor de Polaris, entrenado con el método de Norman."

Ajuste de las dev-responses (`mentor.ts:592,595`): cambiar "Yo también he estado ahí" / "algo que viví yo mismo" por encuadres que no fabriquen una vida humana:
> "Esto que describes es de lo más común en esta fase. El método lo aborda así…"
> "Hay un principio del método para exactamente este punto…"

---

## 5. Norman — prueba social inventada (P1)

**Archivo:** `lib/mentor.ts:378-379`

ANTES
> "El 80% siente exactamente esto en la Semana 2…" / "He acompañado a docenas de personas en este módulo…"

DESPUÉS (patrón cualitativo, sin cifras inventadas, sin experiencia humana)
> Cuando el usuario dude o quiera abandonar, puedes nombrar el patrón **sin inventar cifras ni experiencia personal**: "Lo que sientes suele aparecer justo en esta fase del proceso — y casi siempre viene antes de un avance, no de un estancamiento." Nunca des porcentajes, números de personas, ni afirmes haberlas acompañado tú.

---

## 6. Biometría — interpretación de HRV como "Norman dice" (P1)

**Archivo:** `app/bienestar/biometrics.tsx:316-327`

ANTES (header)
> NORMAN DICE
> "{interpretación de HRV}"

DESPUÉS
> LECTURA DE NORMAN IA
> "{interpretación}"
> *Interpretación generada por IA a partir de tus datos del wearable. Es orientativa y no constituye consejo médico.*

Y en `lib/mentor.ts:245` (instrucción interna de la señal):

ANTES
> …puede indicar fatiga o inflamación

DESPUÉS
> …puede reflejar que tu cuerpo todavía se está recuperando. Si se mantiene varios días, vale la pena revisarlo con un profesional de salud.

---

## 7. Wellness — claims de ansiedad / efecto en minutos (P1)

**Archivo:** `data/wellness.ts:677, 769, 798`

| ANTES | DESPUÉS |
|---|---|
| "Corta el pico de ansiedad y devuelve el control en minutos." | "Una ancla para los momentos de tensión alta: te ayuda a volver al presente y recuperar la calma." |
| "Activa el parasimpático. Reduce ansiedad en minutos." | "Respiración pensada para bajar revoluciones y favorecer la calma." |
| "Sincroniza corazón y cerebro. Estado de flow." | "Ritmo de respiración para entrar en foco sostenido." |

Regla general para todo `wellness.ts`: evitar verbos de efecto clínico cuantificado (**reduce / corta / elimina + condición + "en minutos"**). Preferir intención y experiencia ("te ayuda a", "pensado para", "favorece").

---

## 8. Binaurales — etiqueta "HEALING" y claim cerebral (P1)

**Archivo:** `app/bienestar/binaurales.tsx:136, 619`

| ANTES | DESPUÉS |
|---|---|
| `HEALING — 7.83 Hz Schumann — Resonancia terrestre` | `CALMA — 7.83 Hz — Frecuencia suave para relajación profunda` |
| "Frecuencias que sincronizan hemisferios cerebrales. Requiere audífonos." | "Audio binaural diseñado para acompañar estados de foco o calma. La experiencia es subjetiva y varía entre personas. Requiere audífonos." |

---

## 9. Wearables — "precisión clínica" (P1)

**Archivo:** `app/perfil/wearables.tsx:87`

ANTES
> El anillo Oura mide readiness, calidad de sueño y frecuencia cardíaca en reposo con **alta precisión clínica**.

DESPUÉS
> El anillo Oura mide readiness, calidad de sueño y frecuencia cardíaca en reposo con alta precisión para dispositivos de consumo.

---

## 10. Dashboard — "resultados medibles" / "neurociencia dice" (P2)

| Archivo:línea | ANTES | DESPUÉS |
|---|---|---|
| `comando.tsx:81` | "Tu disciplina está generando resultados medibles." | "Tu consistencia se está notando — sigue así." |
| `mentor.tsx:83` | "La neurociencia dice que a los 66 días un comportamiento se vuelve automático." | "Un hábito tarda semanas en volverse automático. Estás construyendo el tuyo, día a día." |
| `mentor.tsx:93` | "El cortisol alto colapsa el pensamiento estratégico." | "El estrés alto nubla el pensamiento estratégico." |

---

## 11. Mentor — estado de error visible y recuperable (P1)

**Archivo:** `app/(tabs)/mentor.tsx:458-466`

Hoy: en el `catch` solo hay `console.error` + haptic; el mensaje del usuario se descarta y no aparece nada. Añadir una burbuja de error y conservar el texto:

> No pude responder en este momento. Revisa tu conexión y vuelve a intentarlo — tu mensaje sigue aquí.

Con acción "Reintentar" que reenvía el último mensaje del usuario.

---

## Nota de voz (para mantener consistencia)

La voz Polaris funciona cuando es **precisa y directa** ("Eso es información, no debilidad"). Se rompe cuando:
- promete resultados o efectos clínicos ("reduce ansiedad en minutos", "resultados medibles"),
- finge ser humano ("yo perdí a mi padre"),
- inventa autoridad ("la neurociencia dice", "el 80%"),
- presiona en la transacción ("ME COMPROMETO" sobre un cobro).

Regla simple para cualquier copy nuevo: **¿lo podríamos defender ante un revisor de la App Store, un regulador de salud y un usuario escéptico a la vez?** Si las tres respuestas son sí, es voz Polaris.
