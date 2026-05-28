const CACHE = 'becurlyfulcr-v1';

const STATIC = [
  '/',
  '/manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first para API, cache-first para assets estáticos
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Ignorar requests de extensiones y non-GET
  if (e.request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // API — siempre red, sin cache
  if (url.pathname.startsWith('/api/')) return;

  // Assets estáticos (JS, CSS, imágenes) — cache-first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|woff2?)$/) ||
    url.hostname !== location.hostname
  ) {
    e.respondWith(
      caches.match(e.request).then(
        (cached) => cached || fetch(e.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
      )
    );
    return;
  }

  // Páginas HTML — network-first, fallback a cache
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((c) => c || caches.match('/')))
  );
});
