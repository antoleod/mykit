const BUILD = 'b1fe7561666d';
const CACHE_NAME = 'MyKit-shell-' + BUILD;
const RUNTIME_CACHE = 'MyKit-runtime-' + BUILD;
const BASE = self.location.pathname.replace(/\/sw\.js$/, '');
const APP_SHELL = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/login/',
  BASE + '/app/',
  BASE + '/manifest.webmanifest',
  BASE + '/favicon.ico',
  BASE + '/favicon.png',
  BASE + '/icon-192.png',
  BASE + '/icon-512.png',
  BASE + '/AppEntry-b1fe7561666de8f41b74c2a56bef6940.js',
];
const STATIC_EXTENSIONS = /\.(js|css|woff2?|ttf|otf|eot|png|jpg|jpeg|gif|svg|ico|webp)(\?.*)?$/i;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const valid = new Set([CACHE_NAME, RUNTIME_CACHE]);
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('MyKit-') && !valid.has(key)).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function cachedShell() {
  const cache = await caches.open(CACHE_NAME);
  return (await cache.match(BASE + '/index.html')) || (await cache.match(BASE + '/'));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (request.url.startsWith('blob:') || request.url.startsWith('data:')) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation = request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, response.clone()).catch(() => undefined);
          return response;
        }
      } catch (_) {}

      const exact = await caches.match(request);
      if (exact) return exact;
      const shell = await cachedShell();
      return shell || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    })());
    return;
  }

  if (STATIC_EXTENSIONS.test(url.pathname)) {
    event.respondWith((async () => {
      const shellCache = await caches.open(CACHE_NAME);
      const runtimeCache = await caches.open(RUNTIME_CACHE);
      const cached = (await shellCache.match(request)) || (await runtimeCache.match(request));
      if (cached) {
        event.waitUntil(fetch(request).then((response) => {
          if (response.ok) return runtimeCache.put(request, response.clone());
        }).catch(() => undefined));
        return cached;
      }
      try {
        const response = await fetch(request);
        if (response.ok) runtimeCache.put(request, response.clone()).catch(() => undefined);
        return response;
      } catch (_) {
        return new Response('', { status: 503 });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, response.clone()).catch(() => undefined);
      }
      return response;
    } catch (_) {
      return (await caches.match(request)) || new Response('Not found', { status: 404 });
    }
  })());
});
