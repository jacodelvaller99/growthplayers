# DESCARGO DE RESPONSABILIDAD DE SALUD Y BIENESTAR

> **ESTADO: FINALIZADO** — datos de entidad y recursos de crisis por país confirmados por el dueño 2026-07-22. El texto vigente vive en `app/legal/salud.tsx`; este archivo queda como referencia histórica del borrador.

**Titular:** POLARIS GROWTH INSTITUTE CORP · Contacto: info@polarisgrowthinstitute.com
**Última actualización:** 22 de julio de 2026

---

## 1. La App es para bienestar y educación — no es atención médica

La aplicación **LifeFlow / Polaris** y todo su contenido (programa, mentor de IA, herramientas de bienestar, interpretaciones de datos biométricos, seguimiento de hábitos, ayuno, suplementación y mediciones) tienen una finalidad **exclusivamente informativa, educativa y de desarrollo personal**.

**La App NO es un dispositivo médico, no presta servicios de salud, no realiza diagnósticos y no sustituye la consulta, el examen, el diagnóstico ni el tratamiento de un profesional de la salud cualificado.**

---

## 2. "Norman" es una inteligencia artificial, no un profesional

- El mentor **"Norman" es un sistema de inteligencia artificial generativa.** Aunque adopta una voz y una persona inspiradas en una figura real, **en la App no es una persona real respondiéndole**, ni un médico, psicólogo, psiquiatra, terapeuta, coach licenciado, nutricionista ni asesor financiero.
- **No se establece ninguna relación profesional-paciente, terapéutica ni de asesoría.**
- **La IA puede equivocarse.** Puede generar afirmaciones inexactas, incompletas, desactualizadas o inadecuadas para su situación. Sus respuestas no han sido validadas individualmente por un profesional.
- Sus sugerencias (incluida la "acción para las próximas 24 horas" o herramientas como respiración, escritura terapéutica, tapping, etc.) son **propuestas generales de bienestar**, no indicaciones clínicas.

---

## 3. Los datos biométricos no son diagnósticos

- Las métricas de wearables (HRV, frecuencia cardíaca en reposo, sueño, recuperación, SpO₂, temperatura, etc.) y las **interpretaciones** que la App o el mentor hacen de ellas (p. ej. "recuperación baja", "sistema nervioso en conservación", "estrés biométrico", "frecuencia cardíaca elevada") son **informativas y orientativas**.
- **No constituyen un diagnóstico médico** ni una valoración clínica de su estado de salud. La exactitud depende de dispositivos y APIs de terceros y no está garantizada.
- No tome decisiones de salud basándose únicamente en estos datos o en su interpretación dentro de la App.

---

## 4. No use la App en emergencias

**La App no está diseñada para emergencias y no monitoriza ni responde a crisis en tiempo real.**

Si usted o alguien más experimenta una **emergencia médica, una crisis de salud mental, pensamientos de autolesión o suicidio, o cualquier situación de riesgo vital**, deje de usar la App y **contacte de inmediato a los servicios de emergencia locales** [p. ej. número de emergencias de su país] o a una **línea de crisis / línea de prevención del suicidio** de su localidad.

> [COMPLETAR con recursos de emergencia/crisis relevantes para las jurisdicciones de lanzamiento, p. ej. línea local de salud mental.]

---

## 5. Consulte a un profesional antes de actuar

**Consulte siempre a un médico u otro profesional de la salud cualificado** antes de:

- Iniciar, modificar o suspender cualquier tratamiento o medicación.
- Cambiar su **dieta**, iniciar **ayuno intermitente** o tomar **suplementos**.
- Comenzar un nuevo régimen de ejercicio o una práctica intensa de respiración/meditación, especialmente si tiene condiciones preexistentes.
- Tomar decisiones basadas en sus datos biométricos o en las recomendaciones del mentor.

Esto es especialmente importante si está **embarazada o en lactancia**, es **menor de edad**, tiene **condiciones cardíacas, respiratorias, metabólicas, psiquiátricas o de otro tipo**, o toma medicación. Algunas técnicas (p. ej. ciertos ejercicios de respiración o el ayuno) **no son adecuadas para todas las personas**.

---

## 6. Sin promesa de resultados

No garantizamos ningún resultado específico de salud, bienestar, rendimiento, emocional o financiero derivado del uso de la App, del programa o del mentor. Los resultados varían según la persona.

---

## 7. Su responsabilidad

El uso que haga de la información de la App es **bajo su propia responsabilidad y criterio**. En la máxima medida permitida por la ley, **[RAZÓN SOCIAL]** no será responsable de decisiones tomadas o acciones realizadas con base en el contenido de la App, conforme a la limitación de responsabilidad de los Términos y Condiciones.

---

## 8. Contacto

Dudas sobre este descargo: **[EMAIL LEGAL]** — **[RAZÓN SOCIAL]**.

---

> **Nota de implementación (no parte del texto legal):** Actualmente la App muestra un banner descartable (`components/MedicalDisclaimer.tsx`) limitado a los datos biométricos ("no constituyen diagnóstico ni consejo médico"). Recomendación: ampliar la cobertura para incluir (a) un descargo específico del **mentor IA** ("Norman es una IA y puede equivocarse; no es un profesional; no usar en emergencias") visible en la pantalla de chat, y (b) advertencias contextuales en las herramientas de **ayuno** y **suplementación**. El banner actual es descartable y de una sola vez, lo que puede ser insuficiente para el contexto de salud del mentor.
