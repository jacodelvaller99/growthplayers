# Plantillas de correo — Supabase Auth (marca Polaris)

Dónde se pegan: **Supabase → Authentication → Emails → Templates**.
Cada plantilla tiene su propio **Subject** y su **Message body (HTML)**.

Las variables `{{ .ConfirmationURL }}` y `{{ .SiteURL }}` las rellena Supabase.
No las cambies ni las traduzcas.

> **Antes de pegar nada:** configura el SMTP propio (Resend) en
> *Project Settings → Authentication → SMTP Settings*. Sin eso los correos
> siguen saliendo del servidor compartido de Supabase, con su tope de pocos
> envíos por hora y remitente ajeno. La plantilla bonita no arregla la entrega.

También ajusta **Authentication → URL Configuration**:

| Campo | Valor |
|---|---|
| Site URL | `https://polarisgrowthinstitute.vercel.app` |
| Redirect URLs | `https://polarisgrowthinstitute.vercel.app/reset-password` |
| Redirect URLs | `polaris://reset-password` |
| Redirect URLs | `https://polarisgrowthinstitute.vercel.app/oauth/whoop/callback` |
| Redirect URLs | `https://polarisgrowthinstitute.vercel.app/oauth/oura/callback` |

Sin `polaris://reset-password` registrada, el enlace no vuelve a la app móvil.

---

## 1. Reset Password (la que importa hoy)

**Subject**

```
Recupera el acceso a tu sistema — Polaris
```

**Message body (HTML)**

```html
<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#0F0F0F;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0F0F0F;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#141414;border:1px solid rgba(255,255,255,.08);border-radius:16px;">

        <tr><td style="padding:36px 36px 0;">
          <div style="font:700 13px/1 Arial,Helvetica,sans-serif;letter-spacing:.14em;color:#FFC804;text-transform:uppercase;">Polaris</div>
          <div style="font:400 9px/1 Arial,Helvetica,sans-serif;letter-spacing:.22em;color:#6D6D6D;text-transform:uppercase;padding-top:5px;">Growth Institute</div>
        </td></tr>

        <tr><td style="padding:28px 36px 0;">
          <h1 style="margin:0;font:700 28px/1.15 Arial,Helvetica,sans-serif;color:#FFFFFF;letter-spacing:-.01em;">
            Recupera el acceso<br><span style="color:#FFC804;">a tu sistema.</span>
          </h1>
        </td></tr>

        <tr><td style="padding:20px 36px 0;">
          <p style="margin:0;font:400 15px/1.6 Arial,Helvetica,sans-serif;color:#C9C9C9;">
            Pediste una contraseña nueva para tu cuenta Polaris. Pulsa el botón y defínela.
            El enlace funciona una sola vez y caduca en 60 minutos.
          </p>
        </td></tr>

        <tr><td style="padding:28px 36px 0;">
          <a href="{{ .ConfirmationURL }}"
             style="display:inline-block;background:#FFC804;color:#0A0A0A;text-decoration:none;font:700 13px/1 Arial,Helvetica,sans-serif;letter-spacing:.08em;text-transform:uppercase;padding:16px 26px;border-radius:8px;">
            Crear contraseña nueva
          </a>
        </td></tr>

        <tr><td style="padding:24px 36px 0;">
          <p style="margin:0;font:400 12px/1.6 Arial,Helvetica,sans-serif;color:#6D6D6D;">
            Si el botón no funciona, copia esta dirección en tu navegador:<br>
            <span style="color:#C9C9C9;word-break:break-all;">{{ .ConfirmationURL }}</span>
          </p>
        </td></tr>

        <tr><td style="padding:24px 36px 0;">
          <div style="height:1px;background:rgba(255,255,255,.08);"></div>
        </td></tr>

        <tr><td style="padding:20px 36px 36px;">
          <p style="margin:0;font:400 12px/1.6 Arial,Helvetica,sans-serif;color:#6D6D6D;">
            Si no pediste esto, ignora este correo. Tu contraseña actual sigue intacta
            y nadie puede entrar con este enlace sin tu bandeja.
          </p>
          <p style="margin:16px 0 0;font:400 11px/1.6 Arial,Helvetica,sans-serif;color:#4A4A4A;">
            Polaris Growth Institute · Busca el estado, no el resultado.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

## 2. Confirm signup (mismo lenguaje, para que el sistema hable igual)

**Subject**

```
Confirma tu acceso — Polaris
```

**Message body (HTML)**

Toma el HTML de arriba y cambia solo estas tres piezas:

| Pieza | Texto nuevo |
|---|---|
| Titular | `Tu acceso está<br><span style="color:#FFC804;">a un clic.</span>` |
| Párrafo | `Confirma tu correo para activar tu cuenta Polaris y empezar el Protocolo Soberano.` |
| Botón | `Confirmar mi acceso` |

Y el cierre: `Si no creaste esta cuenta, ignora este correo.`

---

## Prueba después de pegar

1. En la app, entra a login y pulsa «¿Olvidaste tu contraseña?».
2. Escribe tu propio correo y envía.
3. Debe llegar desde tu dominio, en español, con el fondo negro y el botón oro.
4. Pulsa el botón: aterriza en `/reset-password` y deja fijar la clave.
5. Repite antes de 60 segundos: el botón debe decir «REENVIAR EN NNs» y no dejar.

Si el correo no llega, mira **Authentication → Logs** en Supabase: ahí sale si
el envío fue rechazado y por qué.
