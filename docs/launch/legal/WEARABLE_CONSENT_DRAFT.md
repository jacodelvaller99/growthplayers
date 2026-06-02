# CONSENTIMIENTO EXPLÍCITO PARA LA CONEXIÓN DE WEARABLES Y EL TRATAMIENTO DE DATOS BIOMÉTRICOS Y DE SALUD

> **ESTADO: BORRADOR PARA REVISIÓN LEGAL.** Este texto está diseñado para mostrarse **en pantalla, en el momento de conectar un wearable**, con una casilla de aceptación **NO premarcada** (opt-in activo). Los campos `[ ]` deben completarse. La aceptación debe registrarse con marca de tiempo.

**Responsable del tratamiento:** [RAZÓN SOCIAL] · Contacto: [EMAIL LEGAL]

---

## Lo que está a punto de autorizar

Está a punto de conectar su dispositivo **Oura Ring** o **WHOOP** a la aplicación LifeFlow / Polaris. Esto implica el tratamiento de **datos de categoría especial (datos relativos a la salud / biométricos)**. Por su naturaleza sensible, le pedimos su **consentimiento explícito**.

**Al activar la casilla "Acepto" y continuar, usted declara que ha leído y entendido lo siguiente y otorga su consentimiento libre, específico e informado.**

---

## 1. Qué datos importaremos

Al conectar, autoriza a la App, mediante el protocolo OAuth, a acceder a los siguientes ámbitos en su cuenta del proveedor:

- **Oura:** `email`, `personal`, `daily`, `heartrate`, `workout`, `tag`, `session`.
- **WHOOP:** `read:recovery`, `read:cycles`, `read:sleep`, `read:workout`, `read:profile`.

Importaremos y almacenaremos en nuestra base de datos, entre otros:

- **Sueño:** puntuación, duración, eficiencia, fases (REM, profundo, ligero, despierto).
- **Recuperación / readiness.**
- **Variabilidad de la frecuencia cardíaca (HRV / RMSSD, en milisegundos).**
- **Frecuencia cardíaca en reposo (latidos por minuto).**
- **Saturación de oxígeno en sangre (SpO₂).**
- **Desviación de temperatura corporal / temperatura de la piel.**
- **Actividad, esfuerzo (strain), calorías, pasos, minutos activos, estrés.**
- **Series temporales intradía** (p. ej. frecuencia cardíaca a lo largo del día).
- **La respuesta técnica completa ("raw payload")** del proveedor, para depuración y reprocesamiento.

También almacenaremos los **tokens de acceso (OAuth)** necesarios para sincronizar periódicamente sus datos de forma automática.

---

## 2. Para qué los usaremos

- **Mostrarle** sus métricas dentro de la App (sección de biometría).
- **Personalizar** las recomendaciones y la conversación con el mentor IA "Norman". Para ello, el sistema calcula un "estado de preparación biométrica" y traduce sus señales (p. ej. HRV, recuperación) a **lenguaje cualitativo y humanizado** (p. ej. "tu cuerpo pide descanso hoy", "recuperación óptima") que puede incorporarse al contexto del mentor.
- **Alimentar nuestros modelos de inferencia** (motor de inteligencia / ML): detección de anomalías biométricas (p. ej. "estrés biométrico", "frecuencia cardíaca en reposo elevada"), readiness y próxima mejor acción.
- **Establecer una línea base** personal (medias móviles de 7 días) para contextualizar sus lecturas.

> Estas interpretaciones son **orientativas y de bienestar; NO son diagnóstico ni consejo médico.** Ver el Descargo de Salud y Bienestar.

---

## 3. Con quién se comparten

Sus datos biométricos se almacenan en **Supabase** (nuestro proveedor de base de datos). Las inferencias derivadas pueden incorporarse, **de forma humanizada**, al contexto que se envía a los proveedores de IA (**NVIDIA / Groq / OpenAI**) para generar las respuestas del mentor.

> **⚠ BRECHA (transparencia técnica):** En la versión **web**, parte de las llamadas a los proveedores de IA se realizan **directamente desde su navegador**. Además, los **tokens OAuth del wearable** se almacenan actualmente sin cifrado a nivel de aplicación (la protección efectiva es el control de acceso por fila y el rol de servicio). Ingeniería tiene pendiente: (a) enrutar las llamadas de IA por un servidor, y (b) cifrar los tokens (Supabase Vault o cifrado a nivel de aplicación). Hasta que se cierren, no debe afirmarse "cifrado de tokens" en este consentimiento.

Cuentas con rol de **administrador** de la plataforma pueden acceder a datos biométricos para soporte y análisis (ver Política de Privacidad, sección de Seguridad).

---

## 4. Durante cuánto tiempo

Conservaremos sus datos biométricos mientras mantenga el wearable conectado y su cuenta activa. Puede:

- **Desconectar el wearable** en cualquier momento desde la App. Esto detiene futuras sincronizaciones (la conexión se marca como inactiva).
- **Solicitar la eliminación** de los datos biométricos ya almacenados eliminando su cuenta o contactando a [EMAIL LEGAL]. Ver la Política de Eliminación de Cuenta.

---

## 5. Carácter voluntario y retirada del consentimiento

- **Conectar un wearable es totalmente opcional.** Puede usar la App sin conectar ningún dispositivo.
- Puede **retirar este consentimiento en cualquier momento** desconectando el dispositivo. La retirada no afecta la licitud del tratamiento realizado antes de la retirada.
- Retirar el consentimiento puede limitar funciones que dependen de datos biométricos.

---

## 6. Sus derechos

Tiene derecho a acceder, rectificar, eliminar, exportar y oponerse al tratamiento de sus datos biométricos, conforme a la **Política de Privacidad** y a la legislación aplicable (p. ej. RGPD/GDPR, Ley 1581 de 2012 de Colombia). Para ejercerlos: **[EMAIL LEGAL]**.

---

## 7. Origen y responsabilidad de los datos

Los datos provienen de su dispositivo y de las APIs de **Oura Health Oy** y/o **WHOOP, Inc.**, cuyo tratamiento en origen se rige por sus propias políticas. No garantizamos la exactitud ni la disponibilidad continua de los datos que esos proveedores nos entregan.

---

### Declaración de consentimiento (a registrar en la App)

> ☐ **He leído y entiendo la información anterior. Otorgo mi consentimiento explícito para que [RAZÓN SOCIAL] importe, almacene y trate mis datos biométricos y de salud del wearable seleccionado, con las finalidades aquí descritas, incluida su utilización (de forma humanizada) por el mentor de IA. Entiendo que esto NO es consejo médico y que puedo retirar mi consentimiento en cualquier momento.**

(Casilla NO premarcada. Registrar: identificador de usuario, proveedor, versión del texto, marca de tiempo de la aceptación.)

> **⚠ BRECHA (registro de consentimiento):** No se ha verificado en el código un mecanismo que **persista de forma auditable** la aceptación de este consentimiento específico de wearables (con versión y timestamp). Hoy el onboarding solo muestra una nota legal general. Para datos de salud, se recomienda registrar el consentimiento de forma demostrable. Ingeniería debe implementar este registro antes del lanzamiento.
