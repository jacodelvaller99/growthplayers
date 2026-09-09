# Polaris — Qué es y todo lo que tiene

> Inventario completo del producto, tomado del código real del repositorio el 9 de septiembre de 2026. No es una promesa ni un roadmap: todo lo que aparece aquí existe y está construido. Donde algo depende de una configuración que aún falta, se dice.

---

## 1. En una frase

**Polaris es un sistema operativo personal para empresarios y operadores de alto rendimiento.** Durante 90 días, el Protocolo Soberano reprograma la mentalidad, regula las emociones, eleva la energía y construye un estado interno estable, con un mentor de inteligencia artificial que recuerda, un mentor humano que acompaña y el cuerpo como fuente de datos.

La frase que gobierna todo el producto: **«Busca el estado, no el resultado».** El resultado se declara una sola vez (Mi Norte). El estado se busca todos los días (check-in, Comando, prácticas).

---

## 2. Dónde vive

| Canal | Estado |
|---|---|
| Web / PWA | En producción: `polarisgrowthinstitute.vercel.app` |
| Landing de presentación | En producción, en la raíz del dominio. Botón «Ingresar app» lleva a la app |
| iOS (App Store) | Código listo, build nativo vía EAS. Pendiente publicar |
| Android (Google Play) | Código listo, APK generado vía EAS. Pendiente publicar y resolver un cierre al abrir en el celular del dueño |

Una sola base de código (React Native + Expo) sirve las tres plataformas. Escritorio tiene barra lateral propia; móvil usa pestañas inferiores.

---

## 3. El recorrido de un cliente

1. **Bienvenida cinemática** con la marca y la frase generadora.
2. **Registro con código de acceso.** Nadie entra sin un código que el coach entrega. El código se valida sin consumirse; se consume al activar la membresía.
3. **Onboarding** en pasos: nombre, rol, y **Mi Norte** (propósito, identidad, no negociables, recordatorio diario).
4. **Puerta de consentimientos.** Términos, privacidad y aviso de salud son obligatorios. Dos casillas opcionales y separadas: uso de datos para inteligencia (RGPD, apagado por defecto) y «Norman puede confrontarme con datos».
5. **El Umbral.** Cada día, la primera vez que abre la app, pasa por un ritual corto antes de ver el tablero.
6. **Comando central.** Su día empieza aquí.

Alternativa automática: cuando un cliente firma el contrato en ClickUp, su cuenta nace sola, con membresía premium, sin alta manual.

---

## 4. Las pantallas principales

### Comando (el tablero)
Lo primero que ve cada día. Muestra el estado del sistema, no logros. El usuario elige **hasta 4 métricas de un catálogo de 10** y las ordena; la elección se guarda en su cuenta y sincroniza entre dispositivos. Cada métrica abre su pantalla de detalle. Incluye el Score Soberano y la racha.

### Check-in diario
Dos minutos de honestidad: **energía, claridad, saturación y sueño**, más «qué necesita mi sistema hoy». Alimenta el Score Soberano, a Norman y al motor de inteligencia. La ausencia de dato se trata como información, no como fracaso.

### Mi Norte
Propósito, identidad, no negociables y recordatorio diario. Se declara una vez y se ajusta cuando cambia la dirección, no a diario.

### Programas
El Protocolo Soberano completo (sección 5).

### Norman IA
El mentor artificial (sección 6).

### Progreso
Historial, gráficas de los últimos días, lecciones y tareas completadas.

### Explorar
Acceso rápido al hub de Bienestar.

---

## 5. El Protocolo Soberano (el curso)

Nueve módulos organizados por arquetipos, más el onboarding y las sesiones en vivo. Cada lección tiene video (Vimeo o Skool), guía práctica descargable y tarea. Los módulos se desbloquean progresivamente; el sistema sugiere, no impone.

| # | Módulo | Arquetipo | Lecciones |
|---|---|---|---|
| 0 | Onboarding: Bienvenido al Método Polaris | — | 7 (InformACCIÓN, Historia/Misión/Visión, RoadMap, Dashboard de tareas, Comunidad, Proceso de trabajo, Documentos) |
| 1 | Guerrero: Mentalidad | Guerrero | 7 (Nunca es Suficiente, Resultados del Mindset, Origen de una creencia, Detecta tus creencias, Crea tu nueva identidad, Intégrala, Recupera tu inversión) |
| 2 | Emociones: Autoconocimiento | Guerrero | 4 (Emociones, Herramientas para subir la energía, Escritura terapéutica, Escala de consciencia) |
| 3 | Maduración del Guerrero | Comprensión | 5 (Sentido y propósito de vida / IKIGAI, HISAR-PERAS, Leyes universales I y II, C.A.D.A.V.R.A.) |
| 4 | Pontífice: Estado de Flow | Pontífice | 4 (LifeFLOW, La ciencia detrás, Coherencia cardíaca, Indicadores subjetivos del flow) |
| 5 | Intro al 4to Nivel de Consciencia | Cooperación | 8 (Los 7 niveles + las 7 Llaves de la Prosperidad, con test propio) |
| 6 | Mercader: Gestión del Tiempo | Mercader | 3 (Planeación semanal, las 6 preguntas diarias, las 4 del cierre) |
| 7 | Mercader: Relaciones | Mercader | 3 (Los 3 personajes internos, La Gran Obra, Relaciones desde el Escultor) |
| 8 | La No Negociación | — | Las 7 Llaves de la Prosperidad |
| 9 | Logrología | — | Ley de ayuda y servicio |
| + | Sesiones Semanales Polaris | — | Masterclasses en vivo |
| + | Sesiones Lifeflow | — | 14 grabaciones del programa en vivo (mayo a agosto 2026) |

Cada módulo tiene una **tarea de lección** con respuestas guardadas, y un sistema de **celebración** al completar.

---

## 6. Norman IA — el mentor artificial

Norman se presenta como lo que es: inteligencia artificial. No es un chat genérico; es un sistema de decisión y acompañamiento.

**Qué sabe de ti en cada conversación:** tu Norte, tus check-ins recientes, tus lecciones completadas, tus datos del cuerpo (si conectaste un reloj), tus puntajes de inteligencia (compromiso, riesgo de abandono, próxima acción) y tu memoria.

**Cuatro modos explícitos** que el usuario elige: diagnóstico, decisión, rendición de cuentas y reflexión.

**Memoria que acompaña.** Norman recuerda entre sesiones: resume conversaciones, mantiene un perfil vivo del cliente (metas, bloqueos recurrentes, patrones emocionales, estilo de decisión, compromisos abiertos y cumplidos) y lo usa en la siguiente conversación.

**Confrontación con dato («dijiste, hiciste»).** Cuando el cliente declaró algo explícito y la conducta registrada lo contradice, el sistema produce la evidencia y Norman puede abrir con ella. Solo con consentimiento explícito, nunca usando mensajes privados ni publicaciones de comunidad como evidencia. Hoy está apagado por bandera de configuración, listo para encenderse por cohortes.

**Seguridad.** Ante temas de crisis o autolesión, Norman deriva a ayuda profesional; ningún modo lo anula.

**Bajo el capó.** Cuatro proveedores en cadena (Claude como primario, después NVIDIA, Groq y OpenAI), todos a través de un proxy del servidor: ninguna clave de pago viaja en la app. Si un proveedor se cuelga, el siguiente entra en menos de 8 segundos. Sin proxy configurado, la app cae a una simulación local.

**Voz.** Norman tiene voz propia (ElevenLabs) para las prácticas y los videos.

---

## 7. Mentoría humana

Recorrido de 90 días dividido en semanas con fechas reales. Cada sesión con **El Navegador** (el mentor humano) puede grabarse: el audio se transcribe y Norman redacta notas estructuradas y un plan de acción de 3 a 5 puntos que el mentor aprueba. Si la transcripción falla, se abre el editor manual: la sesión nunca se pierde. Las tareas del plan se convierten en objetos evaluables (sección 13).

---

## 8. Bienestar — el sistema integral

Un hub con tres familias de prácticas. Todas las pantallas de práctica mantienen avisos de seguridad.

**Prácticas de estado**
- Binaurales (catálogo con frecuencias y ecualizador visual)
- Meditación
- Respiración guiada
- Sueño (catálogo de prácticas y Yoga Nidra)
- Diario (con estado de ánimo, etiquetas de energía y estrés, y vínculo al día biométrico)
- Biblioteca

**Sistema integral del cuerpo**
- Hábitos (rutinas de mañana y noche con puntos, racha, guía y video; enlazadas desde notificaciones)
- Ayuno (temporizador con presets de 24/48/72 horas y guía para preparar y romper)
- Nutrición (plan subido a almacenamiento, restricciones, alergias, meta calórica, nutricionista)
- Cuerpo (medidas corporales: peso, cintura, pecho, cadera, grasa, masa muscular)
- Movimiento
- Suplementación (stack con dosis y horario)
- Biométricos (lecturas del reloj, sección 10)
- Escaneo corporal 3D y mapa corporal («dónde lo sientes», no solo «cuánto»)
- Contexto corporal

**Liberación emocional**
- Grito
- Tapping (EFT)
- Consciencia (calibración semanal con la escala de Hawkins)

**Comunidad** (sección 11)

Un reproductor en miniatura mantiene el audio de la práctica mientras el usuario navega por otras pestañas.

---

## 9. Internista educativo

Una segunda inteligencia artificial, distinta de Norman, en Bienestar. **Educa, no diagnostica.** Explica marcadores de laboratorio, fisiología y evidencia de medicina del estilo de vida citando guías reales (USPSTF, NIH, Mayo Clinic, ACLM, Cochrane, ADA, AHA/ACC, entre otras).

- Base de conocimiento con 15 marcadores comunes (glucosa, HbA1c, colesterol, TSH, vitamina D, B12, ferritina, creatinina, etc.), 13 hechos de estilo de vida con grado de evidencia, y 12 reglas de alerta.
- **Ante cualquier señal de alerta** (dolor torácico, crisis de salud mental, valores críticos, embarazo con medicación, trastornos alimentarios) deja de educar y deriva, sin pasar por el modelo.
- Si el modelo intenta decir «tienes diabetes» o «te receto», el sistema corta la frase antes de mostrarla.
- **Exámenes médicos:** el usuario sube sus laboratorios a un espacio privado; los marcadores se extraen y guardan. El coach solo ve los metadatos, y solo si el cliente activó «compartir con mi coach». La conversación con el internista nunca llega al coach.

---

## 10. El cuerpo como dato — wearables y biometría

**Tres caminos para conectar un reloj:**

1. **Directo (OAuth):** WHOOP, Oura, Polar y Strava. Funciona en web y móvil. WHOOP y Oura ya están activados en producción.
2. **Nativo del sistema:** Apple Salud (iOS) y Google Health Connect (Android). Cubren Apple Watch, Garmin, Samsung, Fitbit, Xiaomi, Amazfit, Withings y cualquier reloj que escriba ahí. Solo en la app instalada, no en web.
3. **Agregador universal (Open Wearables):** una sola integración para más de 500 dispositivos, también desde web. Código listo; falta desplegar la instancia.

**Qué se lee:** sueño (duración, fases, eficiencia, score), recuperación, HRV, frecuencia cardíaca en reposo, temperatura, saturación de oxígeno, actividad, pasos, calorías, frecuencia respiratoria.

**Desconectar es real.** Revoca el permiso en el proveedor, borra los tokens y borra el histórico de ese dispositivo. Un interruptor automático apaga las conexiones con token vencido y lo dice en pantalla.

**Capa de inteligencia biométrica.** Convierte la señal cruda en una lectura interpretable: estado de sueño, de recuperación, coherencia frente a tu línea base de 7 días, riesgo de fatiga, tendencia, nivel de intervención. El mentor ve la versión técnica; el cliente ve solo un resumen sin jerga ni alarma. Es coaching, no diagnóstico clínico. Un simulador determinista permite demostrar todo esto sin reloj físico.

**Reflexión frente a dato:** cuando lo que el cliente dice de su energía no coincide con lo que dice su cuerpo, el sistema lo detecta.

---

## 11. Comunidad

- Feed de publicaciones con reacciones y comentarios
- Espacios temáticos con miembros
- Eventos con fecha, cupo y confirmación de asistencia
- Mensajes directos 1 a 1
- Conexiones entre usuarios
- Perfil público de cada miembro
- **Moderación** exigida por las tiendas: reportar contenido, bloquear usuarios, filtro de contenido y aceptación de política de tolerancia cero. Cola de moderación en el panel de administración.

Privacidad: el coach ve señal de actividad (conteos, última fecha), nunca el contenido de los mensajes privados.

---

## 12. Perfil, personalización y acceso

- **Apariencia:** modo claro y oscuro en web y escritorio, y **seis modos de presentación** según cómo procesa información cada persona (todo a la vista, mínimo, calma, guiado paso a paso, silencioso, entre otros).
- **Mi cuenta como cliente:** perfil sintetizado, tareas activas, «tu cuerpo hoy» y captura de reflexión.
- **Suscripción:** niveles gratuito, premium, premium plus, Polaris y Growth Players. El nivel vive en la base de datos y el recibo en RevenueCat; se reconcilian y se respeta la fecha de vencimiento. En web, el pago se gestiona desde iOS o Android.
- **Recuperación de contraseña** honesta: enlace por correo, cuenta regresiva real, error visible si el envío falla, y retorno a la app en móvil.
- **Borrar mi cuenta** (RGPD): purga completa de todas las tablas personales, archivos médicos y revocación en los proveedores de wearables.

---

## 13. Panel de administración (el lado del negocio)

Dos rangos: **admin** (todo) y **mentor** (solo sus clientes asignados, impuesto por seguridad real en la base de datos, no solo en pantalla).

| Sección | Qué hace |
|---|---|
| Focus Desk (inicio) | Mi cartera, asignación de mentor por cliente, equipo. Un mentor ve solo «Mis clientes» |
| Usuarios | Lista, búsqueda, crear cuenta real con login, editar identidad, cambiar rol, **enviar enlace de contraseña** |
| Dossier del cliente | Todo lo que el cliente HACE, no solo lo que dice: identidad, membresías, check-ins, conversaciones con Norman, mentoría, ejecución, memoria y briefing, fricciones detectadas, biométricos, cuerpo y protocolo, reflexiones y comunidad |
| Espacio del Mentor | Modo simple por cliente: notas de sesión con autoguardado, plan de acción, copiloto IA, perfil sintetizado y línea de tiempo |
| Membresías | Activar, extender, cancelar, cambiar nivel |
| Códigos de acceso | Crear, con usos máximos, vencimiento y tipo |
| Cursos | Otorgar o revocar acceso a módulos por cliente |
| Ejecución (mentores) | Tablero cruzado de clientes con puntajes de adherencia, calidad, fricción y atención requerida, cola de intervención y preparación de sesión generada por IA |
| Memoria | Panel cruzado de perfiles y resúmenes |
| Biometría | Lecturas de todos los clientes ordenadas por urgencia, botón para **sincronizar todos los wearables** |
| Inteligencia | Motor de ML: compromiso, riesgo de abandono, cohortes |
| Ranking | Posiciones por Score Soberano |
| Comunidad | Cola de moderación |
| Contenido | Gestión de contenido |
| Auditoría | Registro de cada acción sensible de un admin |
| Copiloto | IA para el equipo |
| Plaud | Importación de transcripciones de la grabadora Plaud a la memoria del cliente |
| Mission Control | Vista heredada |

**Mentor Execution OS.** Las tareas del cliente (del plan de acción, de la mentoría y de sus compromisos con Norman) se normalizan en objetos evaluables. La IA propone; el mentor aprueba. Seis puntajes explicables por cliente. Los clientes nunca ven sus puntajes crudos.

---

## 14. Automatizaciones y motor (lo invisible)

**Doce funciones de servidor** (Supabase Edge Functions):

| Función | Qué hace |
|---|---|
| ai-proxy | Todas las llamadas de IA y transcripción de voz, con claves del servidor |
| calculate-intelligence | Compromiso, riesgo de abandono, ADN conductual, cohortes |
| generate-embeddings | Vectores para la memoria de Norman |
| smart-notifications | Notificaciones push personalizadas con medición de efectividad |
| sync-wearables | Sincronización y desconexión de WHOOP, Oura, Polar y Strava |
| wearable-aggregator | Open Wearables: webhooks firmados y conexión por marca |
| clickup-onboarding | Alta automática del cliente al firmar contrato |
| create-user | El admin crea cuentas reales |
| delete-account | Borrado RGPD completo |
| notify-7-llaves | Correo por cada respuesta al test de las 7 Llaves |
| plaud-sync | Sincroniza grabaciones de Plaud |
| ml-dashboard | Tablero del motor de inteligencia |

**Analítica** con consentimiento: los eventos de uso solo se registran si el cliente aceptó; sin consentimiento, no se escribe nada.

**Notificaciones inteligentes** con hora preferida por usuario y enlace profundo a la acción.

**Modo sin conexión:** las escrituras no críticas se encolan y reintentan al reconectar; los mensajes con Norman no se duplican al reintentar.

---

## 15. Seguridad, privacidad y cumplimiento

- Consentimientos separados y registrados con fecha.
- Datos médicos en un espacio privado, servidos por enlaces firmados de 5 minutos, nunca públicos.
- Seguridad a nivel de fila en la base de datos para cada tabla personal; un disparador impide que alguien se auto-otorgue permisos de admin.
- Ninguna clave de pago de IA viaja en la app.
- Tokens de wearables legibles solo por el servidor.
- Cabeceras de seguridad estrictas en web (CSP, HSTS, etc.).
- Borrado de cuenta que purga todo, incluidos archivos y revocaciones externas.
- Honestidad codificada: el paywall solo muestra testimonios verificados; se corrigieron afirmaciones falsas anteriores.
- Pantalla de error de marca si algo falla al renderizar, con reintento.
- Respeto a «reducir movimiento» del sistema en todas las animaciones decorativas.

---

## 16. El desarrollo en números

| | |
|---|---|
| Pantallas de la app | 83 |
| Funciones de servidor | 12 |
| Migraciones de base de datos | 60 |
| Tablas y vistas (documentadas en español) | 85 |
| Columnas documentadas | 864 |
| Suites de pruebas automáticas | 136 |
| Pruebas | 1 085 |
| Lecciones cargadas del protocolo | 55 + 14 sesiones grabadas |
| Videos de marketing producidos | 18 (9 piezas en horizontal y vertical) |

Integración continua en cada cambio: lint, tipos, pruebas y build web.

---

## 17. Marca y diseño

Manual de marca de Orgánico Studio 2024, aplicado en la app, el landing y los videos: tipografía Grandis Extended, oro Philippine Yellow sobre negro Smoky Black, brújula de 8 puntas como logo, títulos en frase, sin lenguaje bélico. Sistema de botones unificado, rejilla de 8 puntos, objetivos táctiles mínimos de 44 puntos.

Videos cinematográficos (Remotion) con voz de Norman y música orquestal: teaser, video insignia de 4 minutos «Tu historia completa» y siete piezas por dominio.

---

## 18. Lo que falta de tu lado (honesto)

Nada de esto es código pendiente; son configuraciones o decisiones del dueño.

- **Correo propio** (Resend en Supabase) para que los enlaces de recuperación salgan desde tu dominio y sin límite de envíos.
- **Instancia de Open Wearables** desplegada, para el agregador universal.
- **Publicación en App Store y Google Play** (los builds ya se generan).
- **El cierre de la app Android en tu celular**, en diagnóstico: hay un build de prueba de la versión anterior para aislar la causa.
- **Definición del arquetipo «Mago»** para el landing; la redacción actual es una propuesta.
- Dos migraciones SQL por correr en Supabase: relleno de correos históricos y el interruptor automático de wearables.
- Encender por cohortes la confrontación con dato y el agregador cuando estén listos.
