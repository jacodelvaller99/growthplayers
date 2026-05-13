/**
 * Polaris Growth Institute — Service Worker v2
 *
 * Strategy:
 *  - Static assets (JS/CSS with hash in name) → Cache-first (immutable)
 *  - Fonts (Google Fonts) → Stale-while-revalidate
 *  - Navigation (HTML) → Network-first with offline fallback
 *  - Supabase API → Always network, never cached
 */

const CACHE_NAME = 'polaris-v2';
const STATIC_SHELL = ['/', '/index.html'];

// ── Install: pre-cache the app shell ────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_SHELL))
  );
});

// ── Activate: purge stale caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
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
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 6. Everything else — network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Cache-first: returns cached response immediately.
 * On miss, fetches from network and stores in cache.
 * Ideal for immutable assets (hash in filename).
 */
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

/**
 * Stale-while-revalidate: returns cached version immediately (if available),
 * then updates the cache from network in the background.
 * Ideal for fonts and resources that change occasionally.
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });

  return cached ?? fetchPromise;
}
