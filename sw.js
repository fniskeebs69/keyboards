/* Keyboard Collection — offline helper (service worker). Contains no personal data.
   Keeps a copy of the app page and the Firebase scripts on the device so the app can open without signal.
   The app page is always fetched fresh when online, so uploading a new index.html needs no change here. */
const CACHE = 'kbc-shell-v1';
const SDK = ['https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.add(new Request('./', { cache: 'reload' }));
    await Promise.all(SDK.map(u => fetch(u, { mode: 'no-cors' }).then(r => c.put(u, r)).catch(() => {})));
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== 'kbc-pictures-v1').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate' && url.origin === location.origin) {            // the app page: newest when online, saved copy when offline
    e.respondWith(fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./', copy)); } return r; })
      .catch(() => caches.open(CACHE).then(c => c.match('./')).then(r => r || Response.error())));
    return;
  }
  if (SDK.includes(req.url)) {                                                 // Firebase scripts: saved copy first (they never change for a version)
    e.respondWith(caches.open(CACHE).then(c => c.match(req.url)).then(r => r || fetch(req).then(n => { const copy = n.clone(); caches.open(CACHE).then(c => c.put(req.url, copy)); return n; })));
    return;
  }
  if (url.origin === location.origin && /\/keycaps\/.+\.(webp|png|jpe?g)$/i.test(url.pathname)) {   // kit pictures from the old Keycap app repo
    e.respondWith(caches.open('kbc-pictures-v1').then(c => c.match(req).then(r => r || fetch(req).then(n => { if (n.ok) c.put(req, n.clone()); return n; }))));
  }
});
