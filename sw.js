// sw.js — simple offline support for shell + cached JSON
const CACHE = 'newshub-v2';
const CORE = [
  '/', '/index.html',
  '/assets/styles.css',
  '/assets/app.js',
  '/assets/placeholder.svg',
  '/data/index.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k!==CACHE).map(k => caches.delete(k)))));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Runtime caching for JSON under /data/
  if (url.pathname.startsWith('/data/')) {
    e.respondWith(
      fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // Cache-first for core/static
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request))
  );
});
