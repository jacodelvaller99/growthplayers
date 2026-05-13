import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />

        {/* ── PWA / Theme ──────────────────────────────────────── */}
        <meta name="theme-color" content="#080808" />
        <link rel="manifest" href="/manifest.json" />

        {/* ── iOS PWA ──────────────────────────────────────────── */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Polaris" />
        <link rel="apple-touch-icon" href="/icon-192.png" />

        {/* ── Description / OG ─────────────────────────────────── */}
        <meta name="description" content="Transformación personal con el Método Polaris" />
        <meta property="og:title" content="Polaris Growth Institute" />
        <meta property="og:description" content="Transformación personal con el Método Polaris" />
        <meta property="og:image" content="/icon-512.png" />
        <meta property="og:type" content="website" />

        {/* ── Web Fonts (Google Fonts CDN — avoids broken Vercel asset paths) ── */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Inter 400 + 700 */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap"
        />
        {/* Michroma (single weight, display face) */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Michroma&display=swap"
        />
        {/* Space Mono 400 */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Mono&display=swap"
        />

        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `body{margin:0;background:#080808;overflow-x:hidden;}*{box-sizing:border-box;}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
