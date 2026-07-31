# WHOOP — verificación autónoma y plan de cierre (2026-07-29)

Verificado sin intervención humana hasta el límite donde el flujo OAuth exige,
por diseño, que una persona se autentique. Cada resultado abajo es una medición,
no una inferencia.

---

## Lo que quedó PROBADO

### 1 · WHOOP acepta nuestra app (la prueba decisiva)

`GET https://api.prod.whoop.com/oauth/oauth2/auth` con el client_id, el
redirect_uri y los tres scopes reales:

| Momento | Respuesta de WHOOP |
|---|---|
| Con el ID equivocado | `302 → fallbacks/error?error=invalid_client` — *"The requested OAuth 2.0 Client does not exist"* |
| Con el ID correcto | `302 → /auth-service/v2/idp/login?login_challenge=e7b240fb…` |

Emitir un *login challenge* significa que WHOOP validó las tres cosas: el
cliente existe, el `redirect_uri` está registrado y los scopes son válidos. Un
redirect no registrado habría dado error; un scope inválido, `invalid_scope`.

**La cadena OAuth está verificada.** Lo único que falta es que una persona
introduzca sus credenciales de WHOOP y pulse Authorize — eso no se puede ni se
debe automatizar.

### 2 · El bundle desplegado envía lo correcto

Inspección del bundle real en el alias de la rama
(`entry-d9678625af0ab094ca55ee32572ec436.js`, 4.4 MB):

| Comprobación | Resultado |
|---|---|
| Client ID correcto `10a51f4d-…` | ✅ presente |
| Client ID equivocado `0c8d1e4f-…` | ✅ ausente |
| Scopes reducidos `read:recovery read:cycles read:sleep` | ✅ presente |
| Scopes viejos `read:workout read:profile` | ✅ ausentes |
| `developer/v2` | ausente — **correcto**: el path de la API vive en la edge function, no en el cliente. El cliente solo construye la URL de autorización |

### 3 · La app de WHOOP está bien configurada

Leído del dashboard de developer:

- Client ID + Secret puestos
- Contacto: `ncapuozzo@polarisgrowthinstitute.com`
- Privacy Policy → `polarisgrowthinstitute.vercel.app/legal/privacidad`
- **Las tres** redirect URLs registradas (web × 2 + `polaris://`)
- Webhooks: ninguno — correcto, no tenemos handler

---

## 🔴 El hueco que encontré: la función desplegada es PRE-v2

El orden de los hechos deja un desajuste:

```
67d5c71  fix del user_id  ──►  aquí se desplegó la función
67d8242  migración a v2   ──►  NO desplegado
c56358e  scopes + logo
```

La función que corre en producción tiene el `connectWhoop` arreglado pero
**sigue llamando a `/developer/v1/`**, que WHOOP dio de baja el 1-oct-2025.

**El síntoma será engañoso:** `fetchWhoop` devuelve `null` cuando la respuesta no
es OK (no lanza), así que `syncWhoop` construirá un `byDate` vacío y
`mergeDaily([])` saldrá sin escribir nada. Resultado:

> La conexión se crea correctamente en `wearable_connections`, pero
> `wearable_daily` queda **vacío y sin ningún error visible**.

Es exactamente el fallo silencioso que esta sesión se dedicó a erradicar, y aquí
reaparece por orden de despliegue.

---

## Plan de cierre — 3 pasos

### Paso 1 · Redesplegar la función (bloqueante)

```
supabase functions deploy sync-wearables
```

Sin esto, WHOOP conecta pero no trae datos. **Hazlo antes de probar**, o el
resultado de la prueba será un falso negativo.

### Paso 2 · Conectar desde el alias estable

```
https://growthplayers-git-launch-hardening-p0-growthplayers-projects.vercel.app/perfil/wearables
```

Usa **el alias**, no una URL `growthplayers-<hash>`: el alias no cambia entre
builds, así que la sesión sobrevive a cada reconstrucción. Cada URL con hash es
un origen distinto y obliga a iniciar sesión otra vez.

### Paso 3 · Verificar con dos queries

```sql
-- ¿Se creó la conexión? (esto valida el fix del user_id)
select provider, is_active, connected_at, last_synced_at,
       (access_token is not null) as tiene_token
  from wearable_connections
 where provider = 'whoop';
```

```sql
-- ¿Llegaron datos? (esto valida la migración a v2)
select date, recovery_score, hrv_ms, resting_hr,
       sleep_score, sleep_duration_min, respiratory_rate, strain_score
  from wearable_daily
 where provider = 'whoop'
 order by date desc;
```

Interpretación:

| Resultado | Significa |
|---|---|
| Conexión ✅ + datos ✅ | Todo cerrado. `sleep_duration_min` y `respiratory_rate` con valor confirman los dos bugs de mapeo arreglados hoy |
| Conexión ✅ + datos vacíos | Falta el Paso 1 (función pre-v2) |
| Sin conexión | Revisar el secret en Supabase, o que el deploy del Paso 1 se completara |

---

## Dos límites de lanzamiento que no estaban en ningún plan

**1 · Máximo 10 usuarios de prueba.** El dashboard marca
*"10 REMAINING TEST USERS"*. La app funciona ya, sin aprobación, para hasta 10
miembros de WHOOP. Para más hay que pulsar **REQUEST APPROVAL** y esperar
revisión. Si hay más de 10 clientes con WHOOP, la solicitud es urgente — la
aprobación no es inmediata.

**2 · Scopes sobre-registrados.** La app quedó registrada con los seis scopes,
incluido `read:body_measurement` (peso y altura). No afecta al usuario —el
consent solo muestra los tres que pedimos— pero un revisor preguntará por qué
registraste acceso que no ejerces. Conviene desmarcar `read:workout`,
`read:profile` y `read:body_measurement` **antes** de enviar a aprobación.

---

## Nada de esto está en producción

`launch-hardening-p0` lleva **17 commits que `main` no tiene**, y producción
sirve desde `main`. Todo lo verificado aquí vive en el Preview. El merge es una
decisión pendiente del dueño.
