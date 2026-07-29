# Wearables — por qué nunca funcionaron, y qué falta (2026-07-29)

## El hallazgo

`supabase/functions/sync-wearables/index.ts` tenía, en `connectOura` (L481) y
`connectWhoop` (L515), un objeto construido así:

```ts
await adminSupabase.from('wearable_connections').upsert({
  user_id,              // ← el parámetro se llama `userId`
  provider: 'oura',
  …
});
```

No existe ninguna variable `user_id` en ese ámbito — el resto del archivo escribe
`user_id: userId` en los diez sitios donde toca la base. Ese shorthand lanza
**ReferenceError en cada intento de conexión**.

**Consecuencia:** el intercambio de código OAuth se completaba contra Oura/WHOOP
(el usuario veía la pantalla de autorización y volvía "bien"), pero la fila nunca
se guardaba. No había un solo `wearable_connections` en producción, y no era por
falta de credenciales: era este bug.

Explica también por qué el resto del motor biométrico parecía muerto: no había
datos que interpretar porque no había conexiones que sincronizar.

---

## Qué se arregló en este commit

| Qué | Dónde | Impacto |
|---|---|---|
| **El bug del `user_id`** | `sync-wearables` `connectOura` / `connectWhoop` | Sin esto no hay wearables. Es el arreglo que lo desbloquea todo |
| Dispatch de refresh explícito | `getValidToken` | Era un ternario `oura ? … : whoop`: cualquier proveedor que no fuera Oura iba al refresh de WHOOP, con sus credenciales y su endpoint. Inofensivo con dos proveedores, bomba al añadir el tercero |
| Pérdida de datos en el sync | `mergeDaily()` nuevo → RPC `merge_wearable_daily` | El upsert plano mandaba varios días en un array; PostgREST usa la unión de claves y rellena con NULL las que faltan. Un fallo transitorio de un endpoint **borraba** datos ya sincronizados. La RPC hace COALESCE por columna bajo row-lock |
| `raw_payload` en la RPC | migración `20260729010000` | La RPC no lo contemplaba; sin esto, mover el sync a la RPC habría cambiado un bug por otro |
| Dominio del redirect URI | `lib/wearables.ts` → `EXPO_PUBLIC_APP_URL` | Estaba hardcodeado en dos sitios. Ver abajo |

### Sobre el dominio

`growthplayers.vercel.app` responde **307 → `polarisgrowthinstitute.vercel.app`**.
El flujo sobrevive porque cliente y edge function usan la misma cadena literal, así
que el `redirect_uri` coincide de punta a punta. Pero OAuth compara ese valor como
string exacto: si alguien "corrige" un lado y no el otro, se rompe con
`redirect_uri mismatch`. Ahora sale de `EXPO_PUBLIC_APP_URL` — un solo sitio.

---

## Lo que falta (dueño)

Con el bug arreglado, Oura y WHOOP quedan a **tres pasos** de funcionar:

1. **Aplicar la migración** `20260729010000_merge_wearable_daily_raw_payload.sql`
   en el SQL Editor. (El código degrada al upsert previo si no está, así que no
   es bloqueante para el deploy — pero sin ella sigue viva la pérdida de datos.)

2. **Desplegar la función:**
   ```
   supabase functions deploy sync-wearables
   ```
   Sin esto el bug del `user_id` sigue vivo en producción por mucho que esté
   arreglado en el repo.

3. **Registrar credenciales y redirect URIs** en cada consola. Deben coincidir
   **carácter a carácter** con `EXPO_PUBLIC_APP_URL`:

   | Proveedor | Consola | URIs a registrar |
   |---|---|---|
   | Oura | cloud.ouraring.com | `https://growthplayers.vercel.app/oauth/oura/callback` · `polaris://oauth/oura/callback` |
   | WHOOP | developer.whoop.com | `https://growthplayers.vercel.app/oauth/whoop/callback` · `polaris://oauth/whoop/callback` |

   Y los secrets: `OURA_CLIENT_ID` / `OURA_CLIENT_SECRET` / `WHOOP_CLIENT_ID` /
   `WHOOP_CLIENT_SECRET` en Supabase, más `EXPO_PUBLIC_OURA_CLIENT_ID` /
   `EXPO_PUBLIC_WHOOP_CLIENT_ID` en Vercel.

---

## Polar: por qué NO está escrito todavía

El plan contemplaba añadir Polar en esta sesión. **No se hizo, a propósito.**

Polar AccessLink no es un clon de Oura/WHOOP:

- Autentica con `Authorization: Basic base64(id:secret)`, no con credenciales en
  el cuerpo del formulario.
- No tiene refresh token; el access token es de larga duración.
- Los datos **no se leen con un GET simple**: hay que crear una *transacción*,
  listar, obtener y confirmar. Es un modelo distinto, no un endpoint distinto.

Escribir ~200 líneas de integración que no puedo ejecutar ni una sola vez —no hay
credenciales de developer de Polar todavía— es exactamente el riesgo que este
proyecto ya documentó como el número uno: mapeos basados en documentación que
nadie validó contra un payload real.

**El criterio:** Polar se escribe cuando existan las credenciales para probarlo
contra un reloj real, no antes. Mientras tanto, el arreglo del `user_id`
desbloquea Oura y WHOOP, que ya estaban completos y solo estaban rotos.

**Y las marcas cerradas siguen cubiertas sin ninguna API:** Garmin, Coros,
Samsung y Fitbit entran por Apple Salud / Health Connect en cuanto exista el
build nativo. Ese código ya está escrito y testeado (`lib/wearablesNative.ts`).
