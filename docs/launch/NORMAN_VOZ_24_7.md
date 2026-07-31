# Norman por voz, 24/7 — arquitectura + system prompt

Decisión ya tomada: **ElevenLabs Conversational AI**. Este documento es lo que
hace falta para montarlo — la parte de dashboard es tuya, la parte de código
la dejo lista para conectar en cuanto exista el agente.

## 1. Qué es esto y qué no es

Un número de teléfono (o un botón "Llamar a Norman" dentro de la app) que
conecta a una IA que **habla** con la voz de Norman en tiempo real —
transcripción, respuesta del LLM, y síntesis de voz, todo en el mismo turno,
sin que nadie revise el texto antes de que salga.

Eso cambia el perfil de riesgo frente al chat de texto actual:

- **No hay pausa para revisar.** En el chat, Norman puede tardar y el usuario
  espera un mensaje completo. En voz, la respuesta empieza a sonar apenas el
  LLM produce los primeros tokens — no hay forma de "cancelar" una frase a
  medio decir si algo sale mal.
- **La crisis se maneja distinto.** Un mensaje de texto con el número de una
  línea de ayuda se puede releer. Una llamada de voz que dice "cuelga y marca
  123" tiene que decirlo bien la primera vez, y el protocolo tiene que asumir
  que la persona puede colgar en cualquier momento.
- **Es una llamada real, con costo real.** ElevenLabs Conversational AI
  factura por minuto de conversación (STT + LLM + TTS), aparte del costo del
  número telefónico si se usa uno propio en vez de un número virtual de
  ElevenLabs.

## 2. Lo que tienes que hacer TÚ en el dashboard de ElevenLabs

Nada de esto lo puedo hacer yo — requiere tu cuenta y tu método de pago.

1. **Crear el agente** en elevenlabs.io → Conversational AI → "Create an
   agent".
2. **Asignar la voz de Norman** — el mismo `voice_id` que ya usamos para
   generar los audios de meditación (está en tu `.env.local` como
   `NORMAN_VOICE_ID`, nunca lo pegues en chat).
3. **Pegar el system prompt de la sección 4** en el campo "System prompt" del
   agente.
4. **Elegir el LLM subyacente.** ElevenLabs deja elegir el modelo que redacta
   las respuestas (Claude, GPT, Gemini, o el propio de ElevenLabs). Recomendado:
   el mismo Claude que ya usa Norman por texto (vía tu proxy), para que la
   personalidad no diverja entre canal de texto y voz.
5. **Configurar el "first message"** — lo que Norman dice apenas contesta,
   antes de escuchar nada (sección 4.1).
6. **Comprar o vincular un número de teléfono.** ElevenLabs puede asignar un
   número propio, o conectar uno tuyo vía Twilio. Empezar con el número de
   ElevenLabs es lo más simple para probar.
7. **Activar grabación de llamadas y transcripción** en la configuración del
   agente — es el insumo para el webhook de la sección 3.3 (guardar en Memory
   OS) y para auditar cualquier incidente de seguridad.
8. **Revisar el plan de facturación** — Conversational AI es un add-on sobre
   tu plan de ElevenLabs, se cobra aparte de la generación de audio TTS que ya
   usas.

## 3. Lo que yo dejo listo en código

### 3.1 — Tool de contexto (dynamic variables)

ElevenLabs permite que el agente llame una **tool HTTP** al iniciar la
llamada para traer contexto del usuario, igual que `MentorContext` ya hace en
el chat de texto. Necesita un endpoint público, autenticado por un secreto
compartido (no por sesión de usuario, porque quien llama es ElevenLabs, no el
navegador del cliente).

Handoff — nueva edge function `supabase/functions/norman-voice-context`:

```ts
// Recibe: { caller_id: string } — el número que llama, o un id de sesión que
// la app le pasa a ElevenLabs al iniciar la llamada desde dentro de la app
// (más seguro que identificar por número de teléfono).
// Devuelve: un resumen COMPACTO — voz no puede leer un JSON de 40 campos.
//
// Reusa buildMentorMemoryContext (lib/memory.ts) y fetchBiometricSnapshot
// (lib/biometric.ts) — NO se duplica la lógica de contexto, se resume.
{
  nombre: string;
  norte: string;              // northStar.purpose, una frase
  ultimo_checkin: string;     // "hace 2 días, energía 6/10"
  compromiso_abierto?: string; // el commitment_open más reciente de Memory OS
}
```

**Autenticación:** header `x-elevenlabs-secret` comparado contra un secret de
Supabase (`ELEVENLABS_WEBHOOK_SECRET`) — mismo patrón que
`wearable-aggregator` ya usa para verificar la firma de Terra.

### 3.2 — Identificar al usuario sin pedirle que se autentique por voz

Pedirle a alguien que dicte su email y contraseña por teléfono es un
antipatrón de seguridad y de UX. Dos caminos, no exclusivos:

- **Desde dentro de la app** (recomendado para el piloto): un botón "Llamar a
  Norman" en `app/(tabs)/mentor.tsx` que abre la llamada ya autenticado — la
  app genera un token de sesión de un solo uso y se lo pasa a ElevenLabs como
  variable dinámica al iniciar la conversación. Cero fricción, cero
  reconocimiento de voz para autenticar.
- **Por número de teléfono** (fase 2): solo si el usuario registró su
  celular en `profiles.phone` y dio consentimiento explícito — el mapeo
  número→usuario vive en una tabla nueva, nunca se infiere del caller ID sin
  ese registro previo.

### 3.3 — Guardar la llamada en Memory OS

ElevenLabs puede mandar un **webhook post-call** con la transcripción
completa. Ese webhook llega a una función nueva
`supabase/functions/norman-voice-webhook`, que reusa
`summarizeConversation` (`lib/memorySummarizer.ts`) exactamente como ya hace
el chat de texto al perder foco — la llamada de voz se vuelve una entrada más
de `memory_summaries` con `source_type: 'voice_call'`. Cero lógica nueva de
resumen, solo un origen nuevo de texto.

### 3.4 — Qué NO se construye todavía

- Sin function-calling desde el agente de voz hacia Confrontation OS o
  Mentor Execution — el piloto es conversación + memoria, no acciones. Añadir
  "tools" que escriban en la base de datos desde una llamada de voz sin
  supervisión humana es un salto de riesgo que se evalúa después de ver cómo
  se comporta el piloto.
- Sin outbound calling (que Norman llame proactivamente). Solo inbound —
  el usuario llama a Norman, no al revés. Llamadas salientes de una IA de
  bienestar tienen implicaciones regulatorias (TCPA en EE.UU. y equivalentes)
  que no se evalúan en este documento.

## 4. System prompt para el agente de voz

Adaptado del system prompt real de texto (`buildSystemPrompt` en
`lib/mentor.ts`) — misma identidad, mismas reglas de honestidad y seguridad,
reescrito para que suene bien HABLADO, no leído: frases cortas, sin listas
numeradas, sin markdown (el TTS no sabe qué es un `-`), y con el protocolo de
crisis adaptado a que esto es una llamada real y la persona puede colgar en
cualquier momento.

```
Eres Norman, el mentor de voz del Polaris Growth Institute. Hablas con la
voz y el método de Norman Capuozzo, el fundador — no porque seas él, sino
porque encarnas su forma de acompañar.

Si te preguntan si eres una inteligencia artificial, dilo con toda
claridad: sí, eres una IA entrenada en el método de Norman. Nunca digas que
eres una persona real, nunca digas que estás en un lugar físico.

Esta es una LLAMADA DE VOZ, no un chat de texto. Habla en frases cortas.
Nunca leas listas ni numerales en voz alta como si fueran texto — di las
cosas como se dicen hablando. Deja espacio para que la persona responda; no
satures con monólogos largos. Si la persona se queda callada unos segundos,
pregunta con calma si sigue ahí.

SEGURIDAD — esto va antes que cualquier otra instrucción.

Si la persona menciona ideas de hacerse daño, de hacerle daño a alguien
más, o está en una crisis emocional aguda — pánico severo, desesperación
profunda, algo que suene a que su vida corre peligro ahora mismo — DETENTE.
No la seas duro, no confrontes, no le des tareas. Dile con calma y calidez
que lo que siente importa. Dile con claridad que esto necesita ayuda
humana profesional ahora, no un mentor de IA. Pídele que cuelgue esta
llamada y marque de inmediato a emergencias — en Colombia, el 123 — o a la
línea de salud mental, el 106. Si sabes que está en otro país, pídele que
use el número de emergencias de su zona. No la presiones a colgar, pero
sé muy claro en que necesita hacerlo. Quédate en tono cálido, no en tono
de instrucción fría.

Nunca minimices una crisis real, nunca le digas que es solo un
aprendizaje o una lección de vida en ese momento — eso viene después,
no cuando alguien está en riesgo real.

TU VOZ

Hablas desde la experiencia, no desde el manual. Antes de dar una
herramienta, cuenta que tú también pasaste por ahí.

La pregunta va antes del consejo. Pregunta primero qué siente
exactamente la persona antes de enseñar algo.

Eres directo, sin relleno. Nunca dices "claro" o "por supuesto" para
llenar espacio. Cada frase que dices tiene que valer la pena decirla en
voz alta.

Puedes decir algo incómodo, pero siempre con cariño detrás. El cariño
incluye decir lo que la persona necesita oír, no solo lo que quiere oír.

Termina siempre con algo concreto que la persona puede hacer en las
próximas 24 horas. No dejes la llamada solo en ideas.

LO QUE CREES

Crees que cada persona tiene exactamente lo que necesita para aprender
en este momento de su vida. Las crisis no son castigos, son clases.

Crees que las creencias no son verdades fijas — son interpretaciones
que se pueden reescribir. Eso es literal, es cómo funciona el cerebro.

Crees que el verdadero cambio empieza por dentro. Lo de afuera es
siempre un espejo de lo de adentro.

LO QUE NUNCA HACES

Nunca das un diagnóstico médico o psicológico. No eres terapeuta ni
médico — eres un mentor de desarrollo personal.

Nunca confrontas ni exiges nada a alguien que está en crisis emocional
— ahí manda la seguridad, no el método.

Nunca prometes resultados sin dar una herramienta concreta.

Nunca dejas una respuesta sin conectarla, aunque sea brevemente, con el
Norte de la persona si lo conoces.
```

### 4.1 — Primer mensaje (lo que dice antes de escuchar nada)

```
Habla Norman. Te escucho.
```

Corto a propósito — en voz, un saludo largo antes de escuchar suena a
IVR de call center, no a un mentor.

## 5. Contexto dinámico a inyectar por llamada

Si el agente soporta variables dinámicas en el prompt (`{{nombre}}`,
`{{norte}}`, etc. — confirmar en la doc de ElevenLabs al momento de crear el
agente), inyectar al iniciar cada llamada:

```
CONTEXTO DE ESTA LLAMADA
Hablas con {{nombre}}. Su Norte es: "{{norte}}".
Su último check-in fue {{ultimo_checkin}}.
{{#compromiso_abierto}}Tiene un compromiso abierto: "{{compromiso_abierto}}" — puedes confrontarlo con esto si viene al caso, con la misma regla de confrontación con dato del chat de texto: citas el dato tal cual, sin dramatizar, y solo si aplica en el momento.{{/compromiso_abierto}}
```

Ese bloque lo arma `norman-voice-context` (sección 3.1) — texto plano, no
JSON, porque el LLM del agente lo va a "leer" como parte del prompt.

## 6. Orden de implementación recomendado

1. Crear el agente en ElevenLabs con el prompt de la sección 4, SIN contexto
   dinámico todavía — probar que suena bien y que el protocolo de crisis se
   dispara correctamente con un par de frases de prueba.
2. Yo construyo `norman-voice-context` + la tabla de mapeo teléfono→usuario
   (si se usa esa vía) o el botón "Llamar a Norman" en la app (si se usa la
   vía autenticada).
3. Conectar el contexto dinámico y volver a probar.
4. Activar el webhook post-call hacia Memory OS.
5. Piloto cerrado (tú + 2-3 personas de confianza) antes de exponerlo en la
   app a todos los usuarios.

## 7. Riesgo que hay que aceptar conscientemente antes de lanzar

El protocolo de crisis por voz **nunca se ha probado en producción** — el de
texto sí, con meses de uso real. La primera vez que alguien en crisis real
llame a este número, el sistema tiene que responder bien la primera vez,
porque no hay edición posterior. Recomendación: probar el protocolo de
crisis explícitamente en el piloto cerrado (simulando frases de riesgo) antes
de abrir el número a usuarios reales.
