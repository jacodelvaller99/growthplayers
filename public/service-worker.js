/**
 * Polaris Growth Institute — Service Worker v3
 *
 * Strategy:
 *  - Static assets (JS/CSS with hash) → Cache-first (immutable)
 *  - Fonts (Google Fonts)             → Stale-while-revalidate
 *  - Navigation (HTML)                → Network-first, offline fallback
 *  - Supabase API                     → Always network, never cached
 *
 * v3: fixes offline by pre-caching the current entry bundle at install time.
 */

const CACHE_NAME = 'polaris-v3';

// ── Install: pre-cache app shell + current entry bundle ─────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Always cache the shell
      const shell = ['/', '/index.html'];
      try {
        // Fetch fresh HTML to discover the current hashed entry bundle
        const res = await fetch('/', { cache: 'no-store' });
        const html = await res.text();
        const match = html.match(/\/_expo\/static\/js\/web\/entry-[a-f0-9]+\.js/);
        if (match) shell.push(match[0]);
        // Cache root response too
        await cache.put('/', new Response(html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }));
      } catch (_) { /* offline during install — skip bundle pre-cache */ }
      await cache.addAll(shell.filter(u => u !== '/'));
    })()
  );
});

// ── Activate: purge all previous caches ────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Supabase API — always network, never intercept
  if (url.hostname.includes('supabase.co')) return;

  // 2. Cross-origin except Google Fonts — skip
  if (url.origin !== self.location.origin && !url.hostname.includes('fonts.g')) return;

  // 3. Expo static assets (hashed JS/CSS) — cache-first (immutable)
  if (
    url.pathname.startsWith('/_expo/static/') ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 4. Google Fonts — stale-while-revalidate
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // 5. Navigation (SPA routes) — network-first, fallback to cached /index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Cache the fresh HTML for offline
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 6. Everything else — network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  return cached ?? fetchPromise;
}
