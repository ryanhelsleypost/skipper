// Skipper/Heath offline shell — cache-first with background refresh.
// Upload this file to each repo alongside index.html.
const CACHE = 'app-shell-v2';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Only ever handle same-origin requests. Cross-origin traffic (Firebase
  // Realtime Database, CORS relays, Queue-Times) must pass through untouched —
  // intercepting it can break Firebase's transport and hijack navigation.
  if (url.origin !== location.origin) return;
  // Update-check and force-refresh requests always hit the network,
  // and force-refresh responses replace the cached shell.
  if (url.searchParams.has('u')) { e.respondWith(fetch(e.request)); return; }
  if (url.searchParams.has('v')) {
    e.respondWith(fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put('./', copy));
      return r;
    }).catch(() => caches.match('./')));
    return;
  }
  // App shell: serve cached instantly, refresh in the background
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('./').then(cached => {
        const net = fetch('./').then(r => {
          caches.open(CACHE).then(c => c.put('./', r.clone()));
          return r;
        }).catch(() => cached);
        return cached || net;
      })
    );
  }
});
