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

        {/* ── Supabase preconnect (opens TCP socket before JS runs) ─────── */}
        <link rel="preconnect" href="https://bizbbtiyftfjufxinwsu.supabase.co" />
        <link rel="dns-prefetch" href="https://bizbbtiyftfjufxinwsu.supabase.co" />

        {/* ── GrandisExtended preload — critical fonts first (reduces FOIT) ─── */}
        <link rel="preload" href="/assets/fonts/GrandisExtended-Bold.ttf"   as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/assets/fonts/GrandisExtended-Medium.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />

        {/* ── Web Fonts: Inter + Space Mono (Google Fonts) ──────────────── */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Space+Mono&display=swap"
        />

        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
body{margin:0;background:#080808;overflow-x:hidden;}
*{box-sizing:border-box;}
#root{background:#080808;}

/* ── GrandisExtended — Manual de Marca Polaris (Orgánico Studio 2024) ── */
@font-face {
  font-family: 'GrandisExtended';
  src: url('/assets/fonts/GrandisExtended-Black.ttf') format('truetype');
  font-weight: 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'GrandisExtended';
  src: url('/assets/fonts/GrandisExtended-Bold.ttf') format('truetype');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'GrandisExtended';
  src: url('/assets/fonts/GrandisExtended-Medium.ttf') format('truetype');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'GrandisExtended';
  src: url('/assets/fonts/GrandisExtended-Regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'GrandisExtended';
  src: url('/assets/fonts/GrandisExtended-Light.ttf') format('truetype');
  font-weight: 300;
  font-style: normal;
  font-display: swap;
}
            `,
          }}
        />

      </head>
      <body>{children}</body>
    </html>
  );
}
