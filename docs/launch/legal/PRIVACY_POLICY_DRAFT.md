# POLÍTICA DE PRIVACIDAD — POLARIS GROWTH INSTITUTE / LIFEFLOW

> **ESTADO: BORRADOR PARA REVISIÓN LEGAL.** Este documento describe el tratamiento de datos personales tal como está **realmente implementado** en el código de la aplicación a fecha de redacción. Los campos entre corchetes `[ ]` son marcadores que deben completarse por la empresa antes de su publicación. Las secciones marcadas con **⚠ BRECHA** señalan puntos donde el comportamiento técnico actual NO cumple aún con lo que esta política promete; deben cerrarse en ingeniería o ajustarse en el texto antes del lanzamiento.

**Responsable del tratamiento (Data Controller):** [RAZÓN SOCIAL]
**Domicilio:** [DIRECCIÓN FISCAL]
**Contacto de privacidad / Delegado de Protección de Datos:** [EMAIL LEGAL / privacidad@polarisgrowthinstitute.com]
**Última actualización:** [FECHA]
**Versión:** 1.0-draft

---

## 1. Quiénes somos y alcance

Polaris Growth Institute opera la aplicación **LifeFlow / Polaris** (en adelante, "la App"), disponible en iOS, Android y web (PWA), para acompañamiento de alto rendimiento personal. La App incluye un programa de 90 días ("Protocolo Soberano"), un mentor de inteligencia artificial llamado "Norman", herramientas de bienestar y seguimiento de métricas biométricas y de hábitos.

Esta política aplica a todas las personas usuarias de la App. Al crear una cuenta y usar la App, usted acepta el tratamiento de sus datos descrito aquí.

> La App está dirigida a personas mayores de edad. No está dirigida a menores de [18] años. Ver sección 11.

---

## 2. Datos que recolectamos, por categoría

La siguiente tabla refleja las tablas y campos efectivamente presentes en nuestra base de datos (Supabase / PostgreSQL) y en el almacenamiento local del dispositivo.

### 2.1 Datos de cuenta e identidad
| Dato | Origen | Dónde se almacena |
|---|---|---|
| Correo electrónico | Usted, al registrarse | `auth.users`, `user_profiles.email` |
| Nombre / nombre mostrado | Usted | `user_profiles.name`, `profiles.name` |
| Rol / ocupación declarada | Usted (onboarding) | `profiles.role` |
| Foto de avatar (URL) | Usted (opcional) | `user_profiles.avatar_url` |
| Zona horaria | Inferida / dispositivo | `profiles.timezone` |
| Token de notificaciones push (Expo) | Dispositivo | `UserProfile.expoPushToken` (estado local) |
| Sesión de autenticación | Generada | Dispositivo: `SecureStore` (nativo) / `localStorage` (web), namespace `lifeflow:v2` |

### 2.2 Contenido generado por el usuario (datos personales sensibles por contexto)
| Dato | Descripción | Tabla |
|---|---|---|
| Norte del operador | Propósito de vida, identidad declarada, "no negociables", recordatorio diario | `north_stars` (purpose, identity, non_negotiables, daily_reminder) |
| Check-ins diarios | Autoevaluación 1–10 de energía, claridad, **estrés**, **sueño**, y "necesidad del sistema" (texto libre) | `daily_checkins` / `check_ins` |
| Diario personal | Entradas de texto libre, puntuación de estado de ánimo (`mood_score` 1–10), tipo (reflexión/gratitud/intención) | `journal_entries` |
| Tareas de lección | Respuestas reflexivas de texto libre a ejercicios del programa | `lesson_tasks.responses` |
| Conversaciones con el mentor | Mensajes completos intercambiados con "Norman" | `mentor_messages`, `mentor_conversations` |
| Hilos de mentoría | Títulos y resúmenes de conversaciones | `mentor_threads` |
| Publicaciones de comunidad | Texto que usted publica en la comunidad | `community_posts`, `community_reactions` |

> **⚠ BRECHA (visibilidad de comunidad):** Las tablas `community_posts` y `community_reactions` tienen una política de lectura pública (`USING (true)`). Cualquier usuario autenticado puede leer las publicaciones de comunidad de otros usuarios. Esto debe declararse explícitamente al usuario en el punto de publicación y/o restringirse. Esta política asume que el contenido de comunidad es **público dentro de la base de usuarios**.

### 2.3 Datos biométricos y de salud
La App trata **datos de salud / categorías especiales** cuando usted los introduce manualmente o conecta un dispositivo wearable.

**a) Introducidos manualmente:**
| Dato | Tabla |
|---|---|
| Peso, estatura, IMC | `body_measurements` (weight_kg, height_cm, bmi) |
| Perfil nutricional: tipo de dieta, **restricciones**, **alergias**, objetivos, meta calórica | `nutrition_profiles` |
| Suplementación (stack de suplementos) | `supplement_stacks` |
| Sesiones de ayuno intermitente | `fasting_sessions` |
| Hábitos y su registro diario | `habits`, `habit_logs` |

**b) Sincronizados desde wearables (Oura Ring / WHOOP)** — ver sección 4:
| Dato | Tabla |
|---|---|
| Puntuación de sueño, duración, eficiencia, fases REM/profundo/ligero/despierto | `wearable_daily` |
| Recuperación / readiness, **variabilidad de frecuencia cardíaca (HRV, RMSSD ms)**, **frecuencia cardíaca en reposo (bpm)** | `wearable_daily` |
| Desviación de temperatura corporal, **SpO₂ (saturación de oxígeno en sangre)** | `wearable_daily` |
| Actividad, strain, calorías, pasos, minutos activos, estrés | `wearable_daily` |
| Series temporales intradía (frecuencia cardíaca, HRV, etc.) | `wearable_timeseries` |
| Cargas brutas ("raw payload") de la API del wearable | `wearable_daily.raw_payload` |
| Tokens de acceso OAuth del proveedor wearable | `wearable_connections` (access_token, refresh_token) |

### 2.4 Datos de uso, comportamiento y analítica
| Dato | Detalle | Tabla |
|---|---|---|
| Eventos de comportamiento | Vistas de pantalla, inicio/fin/abandono de lecciones, uso de herramientas de bienestar, envíos de chat, check-ins, escritura en diario, apertura/cierre de app, taps de botón, impactos de paywall | `user_events` |
| Identificador de sesión, pantalla, metadatos (p. ej. duración, % de scroll, palabras escritas, estado de ánimo antes/después) | Generado en cliente | `user_events.metadata` |
| Sesiones de bienestar completadas | Tipo, nombre, duración | `wellness_sessions` |
| Lecciones completadas | — | `completed_lessons` |

> La analítica de comportamiento (`lib/analytics.ts`) respeta el indicador `ml_consent`: cuando está desactivado, **no se envían eventos** y la cola en memoria se descarta.
>
> **⚠ BRECHA (consentimiento opt-out):** El campo `ml_consent` tiene valor por defecto `true` (`profiles.ml_consent DEFAULT true`). El seguimiento conductual está **activado por defecto**; el usuario debe desactivarlo expresamente. Para jurisdicciones que exigen consentimiento previo (opt-in), esto debe revisarse legalmente o cambiarse a opt-in.

### 2.5 Datos inferidos por inteligencia artificial (perfilado)
A partir de los datos anteriores, generamos automáticamente perfiles e inferencias (tabla `user_intelligence` y memoria del mentor). Esto constituye **elaboración de perfiles**:
| Inferencia | Detalle |
|---|---|
| Puntuación de engagement (0–100) | `engagement_score` |
| **Riesgo de abandono (churn 0–1) y etiqueta** (bajo/medio/alto/crítico) | `churn_risk`, `churn_risk_label`, `predicted_churn_date` |
| "ADN de comportamiento" | franja horaria preferida, duración media de sesión, módulo/herramienta dominante |
| Afinidades de contenido (0–1) | binaurales, respiración, meditación, diario, lecciones, mentor |
| "Próxima mejor acción" y urgencia | `next_action`, `next_action_urgency` |
| **Detección de anomalías** | p. ej. "caída de ánimo", "ruptura de racha", "estrés biométrico", "frecuencia cardíaca en reposo elevada", "aislamiento" |
| Asignación a cohorte de comportamiento | p. ej. "alto rendimiento", "en riesgo", "buscador de bienestar" |
| Inferencias biométricas | readiness biométrico, HRV, HR en reposo, anomalía biométrica |
| **Memoria episódica del mentor** | Fragmentos de sus conversaciones y reflexiones, clasificados (conversación / insight / breakthrough / lucha / objetivo / reflexión), con importancia y **embeddings vectoriales** (pgvector, 1536 dimensiones) para búsqueda semántica | `mentor_memories` |
| Notificaciones inteligentes generadas | `smart_notifications` |

### 2.6 Datos de suscripción y pago
| Dato | Detalle |
|---|---|
| Nivel de suscripción (free / de pago) | `profiles.subscription_tier`, `user_profiles.subscription_tier` |
| Fecha de expiración del nivel | Estado `subscriptionExpiresAt` |
| Códigos de acceso usados | `access_codes`, `access_code_uses` |

> Los **pagos y datos de tarjeta NO se procesan ni almacenan en nuestros servidores.** Las suscripciones se gestionan a través de **RevenueCat** y de las tiendas de aplicaciones (Apple App Store / Google Play). RevenueCat es la fuente de verdad del estado de suscripción; nuestro `subscription_tier` se sincroniza vía webhook.

---

## 3. Para qué usamos sus datos (finalidades) y base legal

| Finalidad | Datos | Base legal (orientativa — confirmar por jurisdicción) |
|---|---|---|
| Prestar el servicio (cuenta, progreso, programa) | Cuenta, contenido, suscripción | Ejecución del contrato |
| Personalizar el mentor IA y las recomendaciones | Check-ins, norte, tareas, memoria, biométricos | Ejecución del contrato / **Consentimiento explícito** para datos de salud |
| Sincronizar y mostrar métricas de wearables | Datos biométricos | **Consentimiento explícito** (categoría especial) — ver Consentimiento de Wearables |
| Análisis de comportamiento, ML y prevención de abandono | `user_events`, `user_intelligence` | Consentimiento (`ml_consent`) / interés legítimo (a confirmar) |
| Notificaciones inteligentes | Datos de uso e inferencias | Consentimiento |
| Seguridad, prevención de fraude y abuso | Cuenta, eventos | Interés legítimo |
| Cumplimiento de obligaciones legales | Mínimo necesario | Obligación legal |

> El tratamiento de **datos de salud / biométricos y la elaboración de perfiles de salud** se basa en su **consentimiento explícito**, que puede retirar en cualquier momento (ver secciones 7 y 8).

---

## 4. Datos de terceros: dispositivos wearables (Oura / WHOOP)

Si usted conecta un dispositivo **Oura Ring** o **WHOOP**, autoriza a la App, mediante OAuth, a acceder a los siguientes ámbitos ("scopes") en su nombre:

- **Oura:** `email personal daily heartrate workout tag session`
- **WHOOP:** `read:recovery read:cycles read:sleep read:workout read:profile`

Importamos los datos descritos en la sección 2.3(b) y los almacenamos en nuestra base de datos para mostrarlos y alimentar las inferencias del mentor. Guardamos los **tokens OAuth** del proveedor para poder sincronizar periódicamente (proceso automático vía tarea programada). Estos datos provienen originalmente de Oura Health Oy y/o WHOOP, Inc.; su recolección por el dispositivo se rige adicionalmente por las políticas de privacidad de esos proveedores.

> **⚠ BRECHA (cifrado de tokens):** El esquema documenta que los tokens OAuth deberían estar "cifrados en reposo (idealmente Supabase Vault)", pero el código actual los guarda como texto plano (`access_token`, `refresh_token` de tipo `text`) en `wearable_connections`. Antes de afirmar "cifrado de tokens" en esta política, ingeniería debe implementar cifrado a nivel de aplicación o Vault. Mientras tanto, la protección efectiva es Row-Level Security + el rol de servicio.

Puede **desconectar** un wearable en cualquier momento desde la App. La desconexión detiene futuras sincronizaciones; para eliminar los datos biométricos ya almacenados, ver sección 8 (eliminación de cuenta) y la Política de Eliminación de Cuenta.

---

## 5. Con quién compartimos sus datos (encargados y terceros)

No vendemos sus datos personales. Los compartimos con los siguientes proveedores ("encargados del tratamiento" / subprocesadores) estrictamente para operar la App:

| Proveedor | Función | Datos que recibe | Notas |
|---|---|---|---|
| **Supabase** (PostgreSQL, Auth, Edge Functions, almacenamiento) | Base de datos y backend principal | Todas las categorías | Almacenamiento primario |
| **Vercel** | Hosting de la versión web (PWA) | Datos en tránsito de la sesión web | — |
| **NVIDIA (NIM)** | Modelo de IA primario del mentor (meta/llama-3.3-70b) | Prompt del mentor: nombre, norte, check-ins recientes, tareas, inferencias y **señales biométricas humanizadas**, memorias relevantes | Solo en entorno servidor/nativo (no soporta CORS en navegador) |
| **Groq** | Modelo de IA secundario | Igual que arriba | — |
| **OpenAI** | Modelo de IA de respaldo (gpt-4o-mini) **y generación de embeddings** (text-embedding-3-small) | Igual que arriba; además, el texto de memorias para vectorización | — |
| **Oura / WHOOP** | Origen de datos de wearable | — (recibimos datos de ellos) | Ver sección 4 |
| **RevenueCat** | Gestión de suscripciones | Identificador de usuario y estado de compra | No recibe datos de salud |
| **Apple App Store / Google Play** | Procesamiento de pagos y distribución | Datos de pago (no llegan a nuestros servidores) | — |
| **Expo** (notificaciones push) | Entrega de notificaciones | Token de push y contenido de la notificación | — |

> **IMPORTANTE — IA y datos sensibles:** Para personalizar las respuestas, el sistema envía a los proveedores de IA (NVIDIA / Groq / OpenAI) un "prompt" que incluye su norte, sus check-ins recientes (energía, claridad, **estrés**, **sueño**), sus tareas reflexivas, inferencias de ML (incluido **riesgo de abandono** y anomalías) y una versión **humanizada** de sus señales biométricas (el sistema está diseñado para traducir HRV/frecuencia cardíaca a lenguaje cualitativo en lugar de enviar cifras exactas en el texto del prompt). Estos proveedores procesan estos datos para generar la respuesta del mentor.
>
> **⚠ BRECHA (claves de IA en cliente / web):** Las claves de API de IA están definidas como variables `EXPO_PUBLIC_*`, inlineadas en el cliente. En la **versión web**, las llamadas a Groq y OpenAI se realizan **directamente desde el navegador del usuario** hacia esos proveedores. Esto significa que (a) datos personales y de contexto de salud viajan del navegador a un tercero sin pasar por nuestro backend, y (b) las claves quedan expuestas en el cliente. Ingeniería debe migrar estas llamadas a un proxy de servidor (Edge Function) antes del lanzamiento. Este documento describe el flujo actual de forma transparente; el equipo legal debe decidir si el flujo es aceptable o bloqueante.

También podremos divulgar datos cuando lo exija la ley, una autoridad competente, o para proteger derechos, seguridad o integridad de las personas o del servicio.

---

## 6. Transferencias internacionales

Algunos de los proveedores anteriores (Supabase, Vercel, NVIDIA, Groq, OpenAI, RevenueCat, Expo, Apple, Google, Oura, WHOOP) pueden procesar datos **fuera de [PAÍS / JURISDICCIÓN del usuario]**, incluidos Estados Unidos. Cuando esto ocurra, nos apoyaremos en los mecanismos de transferencia aplicables (p. ej. cláusulas contractuales tipo) según corresponda. [CONFIRMAR ubicación de la región de Supabase y mecanismos de transferencia.]

---

## 7. Sus derechos

Según su jurisdicción (p. ej. RGPD/GDPR en la UE, Ley 1581 de 2012 en Colombia, CCPA/CPRA en California), usted puede tener derecho a:

- **Acceso** a los datos que tratamos sobre usted.
- **Rectificación** de datos inexactos (gran parte editable directamente en la App).
- **Supresión / eliminación** ("derecho al olvido") — ver sección 8.
- **Portabilidad / exportación** de sus datos.
- **Oposición y limitación** del tratamiento, incluido el **perfilado** y la analítica de ML (desactivando `ml_consent`).
- **Retirar el consentimiento** para datos de salud/biométricos y desconectar wearables en cualquier momento, sin afectar la licitud del tratamiento previo.
- **No ser objeto de decisiones exclusivamente automatizadas** con efectos jurídicos significativos. *Nota: las inferencias del mentor IA y las recomendaciones de bienestar son orientativas y no producen efectos jurídicos ni decisiones vinculantes sobre usted.*

Para ejercer estos derechos, escriba a **[EMAIL LEGAL]** o use las opciones de la App ("Perfil → Privacidad y Datos"). Responderemos en los plazos legales aplicables [p. ej. 30 días / 15 días hábiles].

> **⚠ BRECHA (exportación de datos):** El onboarding y la App ofrecen "exportar o eliminar tu cuenta", y existe una función de **eliminación** (`delete-account`). No se ha verificado una función de **exportación/portabilidad** automatizada en el código. Si no existe, debe implementarse o gestionarse manualmente vía el correo de privacidad, y el texto de la App debe alinearse.

---

## 8. Conservación y eliminación

- **Datos de cuenta y contenido:** se conservan mientras su cuenta esté activa.
- **Eliminación de cuenta:** puede solicitar la eliminación desde la App ("Eliminar cuenta") o por correo. Al hacerlo, ejecutamos un borrado del usuario que elimina sus datos de las tablas principales y su cuenta de autenticación. El detalle exacto de qué se borra, qué se retiene y los plazos está en la **Política de Eliminación de Cuenta** (documento aparte). 
- **Datos biométricos:** se eliminan junto con la cuenta. La desconexión de un wearable detiene la recolección futura.
- **Copias de seguridad:** los datos pueden persistir en copias de seguridad cifradas durante un periodo limitado [DEFINIR, p. ej. hasta 30 días] hasta su rotación.

> **⚠ BRECHA (cobertura del borrado):** La función `delete-account` actual **no elimina todas las tablas** que contienen datos personales/sensibles. En particular, NO borra: `north_stars` (propósito/identidad), `habits`, `habit_logs`, `fasting_sessions`, `body_measurements` (peso/IMC), `nutrition_profiles` (alergias), `supplement_stacks`, `community_posts`, `community_reactions`, `weekly_sessions`, `mentor_threads`, `access_code_uses`, y las tablas B2B `b2b_organizations`/`org_members`. Esto es un incumplimiento del derecho de supresión si la política promete "eliminamos todos tus datos". DEBE corregirse en ingeniería antes del lanzamiento (ver Política de Eliminación de Cuenta para la lista completa).

---

## 9. Seguridad

Aplicamos medidas técnicas y organizativas razonables, incluyendo:
- **Row-Level Security (RLS)** en Supabase: cada usuario solo puede leer/escribir sus propias filas en las tablas de datos personales.
- Autenticación basada en tokens; sesión almacenada en **SecureStore** (almacenamiento seguro del sistema) en dispositivos nativos y en `localStorage` en web.
- Cifrado en tránsito (HTTPS/TLS) hacia nuestros proveedores.
- Operaciones administrativas y de ML ejecutadas mediante el **rol de servicio** en funciones de servidor (Edge Functions), no expuesto al cliente.

> **Limitaciones y advertencias honestas:**
> - **Acceso administrativo:** Cuentas con rol de administrador (`profiles.is_admin = true`) pueden leer datos agregados e individuales, **incluidos datos biométricos** de todos los usuarios, a través del panel interno (CMI dashboard). Ver políticas `admin_wearable_daily` / `admin_wearable_connections`. Esto se usa para soporte y análisis de la plataforma.
> - **Almacenamiento web:** En la versión web, la sesión se guarda en `localStorage`, que es menos resistente que el almacenamiento seguro nativo.
> - Ninguna medida de seguridad es infalible. No podemos garantizar seguridad absoluta.

---

## 10. Inteligencia artificial — transparencia adicional

- El mentor "Norman" es un **sistema de inteligencia artificial generativa**, no una persona real ni un profesional licenciado. Ver el **Descargo de Salud y Bienestar**.
- Las respuestas se generan con modelos de terceros (NVIDIA / Groq / OpenAI) y pueden contener errores.
- Realizamos **elaboración de perfiles** automatizada (engagement, riesgo de abandono, anomalías, cohortes, afinidades) para personalizar la experiencia. Usted puede oponerse desactivando `ml_consent`.
- Mantenemos una **memoria** de fragmentos de sus interacciones (con embeddings vectoriales) para dar continuidad al acompañamiento. Esta memoria se elimina al eliminar la cuenta (sujeto a la corrección de la brecha de borrado de la sección 8).

---

## 11. Menores de edad

La App no está dirigida a menores de [18] años y no recopilamos conscientemente sus datos. Si detectamos una cuenta de un menor, la eliminaremos. [CONFIRMAR edad mínima y mecanismo de verificación; relevante para datos de salud.]

---

## 12. Cambios a esta política

Podremos actualizar esta política. Notificaremos cambios materiales por la App o por correo. La fecha de "Última actualización" indica la versión vigente.

---

## 13. Contacto

**[RAZÓN SOCIAL]**
Privacidad / Protección de Datos: **[EMAIL LEGAL]**
Dirección: **[DIRECCIÓN]**
[Autoridad de control competente y derecho a reclamar ante ella, p. ej. SIC en Colombia / AEPD en España — COMPLETAR según jurisdicción.]
