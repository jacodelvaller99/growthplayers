# POLÍTICA DE ELIMINACIÓN DE CUENTA Y DATOS

> **ESTADO: BORRADOR PARA REVISIÓN LEGAL + ACCIÓN DE INGENIERÍA REQUERIDA.** Este documento se ha **verificado contra la función real `delete-account`** (`supabase/functions/delete-account/index.ts`). Contiene una **brecha crítica de cobertura**: la función NO borra varias tablas con datos personales. Hasta que se corrija, las afirmaciones de "eliminación total" no son ciertas. Los campos `[ ]` deben completarse.

**Responsable:** [RAZÓN SOCIAL] · Contacto: [EMAIL LEGAL]
**Última actualización:** [FECHA]

---

## 1. Cómo solicitar la eliminación

Puede solicitar la eliminación permanente de su cuenta de dos formas:

1. **Desde la App:** Perfil → Privacidad y Datos → "Eliminar cuenta". Esto invoca la función segura `delete-account`, que se identifica con su propia sesión (token JWT) — solo usted puede borrar su cuenta.
2. **Por correo:** escribiendo a **[EMAIL LEGAL]** desde el correo asociado a su cuenta. [Definir verificación de identidad para solicitudes por correo.]

La acción es **permanente e irreversible**. No es posible recuperar los datos eliminados.

---

## 2. Qué se elimina

### 2.1 Qué borra HOY la función `delete-account` (verificado en código)

Al eliminar su cuenta, se borran sus filas en las siguientes tablas y, finalmente, su registro de autenticación (`auth.users`):

- `mentor_messages` — mensajes con el mentor
- `daily_checkins` — check-ins diarios (energía, claridad, estrés, sueño)
- `completed_lessons` — lecciones completadas
- `lesson_tasks` — respuestas a tareas reflexivas
- `wellness_sessions` — sesiones de bienestar
- `journal_entries` — diario personal
- `user_events` — eventos de comportamiento (analítica)
- `user_intelligence` — perfil e inferencias de ML (engagement, churn, anomalías, cohorte)
- `mentor_memories` — memoria episódica del mentor + embeddings vectoriales
- `mentor_conversations` — historial estructurado de conversación
- `smart_notifications` — notificaciones inteligentes
- `wearable_connections` — conexiones y **tokens OAuth** de wearables
- `wearable_daily` — resumen biométrico diario
- `wearable_timeseries` — series temporales biométricas intradía
- `user_profiles` — perfil (variante de migraciones)
- `profiles` — perfil base (id = auth.uid)
- **Cuenta de autenticación** (`auth.users`) — vía `auth.admin.deleteUser`.

> Las tablas que usan `ON DELETE CASCADE` respecto a `auth.users` también se purgan al borrar el usuario de autenticación en el paso final; aun así, la función las borra explícitamente antes para mayor robustez.

### 2.2 ⚠ BRECHA CRÍTICA — Qué NO borra la función actual

Las siguientes tablas **contienen datos personales y/o sensibles** y **NO se eliminan** en la función `delete-account` actual. Algunas referencian `auth.users` con `ON DELETE CASCADE` (y por tanto se purgarían al borrar la cuenta de auth en el paso final), pero **otras NO tienen cascada** y **quedarían huérfanas/persistentes**. Esto debe corregirse antes del lanzamiento.

| Tabla | Contenido | ¿Tiene `ON DELETE CASCADE` a auth.users? | Riesgo |
|---|---|---|---|
| `north_stars` | **Propósito de vida, identidad, no negociables** | Sí (→ `profiles`, que cascada a auth) | Datos muy personales; borrar explícitamente |
| `habits` | Hábitos personales | Sí | Cascada, pero no explícito |
| `habit_logs` | Registro diario de hábitos | Sí | — |
| `fasting_sessions` | **Ayuno (dato de salud)** | Sí | — |
| `body_measurements` | **Peso, estatura, IMC (salud)** | Sí | — |
| `nutrition_profiles` | **Dieta, alergias, restricciones (salud)** | Sí | — |
| `supplement_stacks` | **Suplementación (salud)** | Sí | — |
| `weekly_sessions` | Mensajes IA semanales | Sí | — |
| `mentor_threads` | Hilos de mentoría (títulos/resúmenes) | Sí | — |
| `community_posts` | **Publicaciones de comunidad (visibles a terceros)** | Sí | Contenido público: confirmar si se anonimiza o elimina |
| `community_reactions` | Reacciones en comunidad | Sí | — |
| `access_code_uses` | Uso de códigos de acceso | Sí | Posible interés de retención (antifraude) |
| `b2b_organizations` | Organización (si es admin de una) | Parcial (`admin_user_id` sin cascada explícita) | **Puede quedar huérfana** |
| `org_members` | Pertenencia a organización B2B | Sí | — |

> **Importante sobre la cascada:** Aunque la mayoría de estas tablas tienen `REFERENCES auth.users(id) ON DELETE CASCADE` y, por tanto, se purgarían al ejecutarse `auth.admin.deleteUser` (paso final), **depender únicamente de la cascada es frágil**: (1) si la cascada falla o cambia, los datos persisten; (2) la función borra explícitamente otras tablas, lo que crea una expectativa de cobertura completa; (3) `b2b_organizations.admin_user_id` **no** declara cascada y puede dejar la organización sin propietario. **Recomendación de ingeniería:** añadir explícitamente todas las tablas anteriores a la lista de borrado de `delete-account` (y resolver la titularidad de organizaciones B2B), para garantizar el derecho de supresión de forma demostrable.

> **Nota sobre RLS y borrado parcial:** La función usa el **rol de servicio** (`adminSupabase`), que omite RLS, por lo que puede borrar todas las filas del usuario. El borrado se hace con `Promise.allSettled`, de modo que un fallo en una tabla no detiene las demás; sin embargo, **los fallos individuales no se reportan al usuario** (se ignoran). Recomendación: registrar/alertar fallos parciales para poder reintentar.

---

## 3. Plazos

- **Eliminación en tiempo real:** la función ejecuta el borrado de forma inmediata al confirmar la solicitud desde la App.
- **Copias de seguridad:** los datos pueden permanecer en copias de seguridad cifradas de la infraestructura (Supabase) hasta su rotación, por un máximo de **[DEFINIR, p. ej. 30 días]**.
- **Solicitudes por correo:** se atenderán en un plazo máximo de **[p. ej. 30 días naturales / 15 días hábiles]** conforme a la ley aplicable.

> [CONFIRMAR la política de retención de copias de seguridad de Supabase para el plan contratado.]

---

## 4. Qué se conserva (y por qué)

Tras la eliminación, podremos conservar de forma limitada:

- **Datos en proveedores externos de pago:** El historial de transacciones de suscripción gestionado por **Apple App Store / Google Play** y **RevenueCat** se rige por sus políticas y puede conservarse por obligaciones contables/fiscales, **fuera de nuestro control directo**. La eliminación de la cuenta en la App **no cancela automáticamente** una suscripción activa en la tienda: debe cancelarla en su tienda.
- **Registros mínimos por obligación legal:** podremos conservar información estrictamente necesaria para cumplir obligaciones legales, contables, fiscales o para la defensa frente a reclamaciones, durante los plazos legales aplicables [DEFINIR].
- **Registros de seguridad/antifraude:** datos mínimos para prevenir abuso (p. ej. uso de códigos), si existe base legal de interés legítimo [CONFIRMAR si se retiene `access_code_uses` y por cuánto].
- **Datos agregados/anonimizados:** información que ya no permite identificarle puede conservarse con fines estadísticos.

---

## 5. Datos de wearables al eliminar

Al eliminar la cuenta se borran `wearable_connections` (incluidos los tokens), `wearable_daily` y `wearable_timeseries`. **Esto elimina la copia de sus datos biométricos en nuestros sistemas**, pero **no elimina los datos en su cuenta de Oura o WHOOP**; gestione esos datos directamente con el proveedor. Le recomendamos además revocar el acceso de la App desde el panel de su proveedor.

---

## 6. Efecto de la eliminación

- Perderá el acceso a la App y a su progreso, programa, conversaciones y métricas.
- Las suscripciones activas en la tienda **deben cancelarse por separado** (ver sección 4).
- La acción es irreversible.

---

## 7. Contacto

Solicitudes y dudas: **[EMAIL LEGAL]** — **[RAZÓN SOCIAL]**.

---

## Anexo A — Lista de acción para ingeniería (resumen de brechas)

1. **Ampliar `delete-account`** para borrar explícitamente: `north_stars`, `habits`, `habit_logs`, `fasting_sessions`, `body_measurements`, `nutrition_profiles`, `supplement_stacks`, `weekly_sessions`, `mentor_threads`, `community_posts`, `community_reactions`, `access_code_uses` (según decisión de retención), `org_members`, y resolver `b2b_organizations` (titularidad).
2. **Verificar/añadir** una función de **exportación/portabilidad** de datos (la App promete "exportar" en onboarding).
3. **Registrar fallos parciales** del borrado (`allSettled`) para reintento/auditoría en lugar de ignorarlos.
4. **Confirmar** la cobertura de `wellness_sessions` y otras tablas de bienestar (`store/wellnessStore.ts` es estado local; verificar que la tabla `wellness_sessions` en BD se purga — actualmente sí está en la lista).
5. **Cifrar** los tokens OAuth de wearables (relacionado con privacidad/seguridad).
6. **Persistir consentimientos** (wearables, salud) con versión y timestamp para demostrar cumplimiento.
