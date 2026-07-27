/* Service worker de Coordinació 2n — accelera les càrregues repetides.
   Estratègia SEGURA:
   - Document/HTML → XARXA PRIMER (mai et quedes amb una versió antiga si tens connexió;
     si no hi ha xarxa, s'agafa de la cau).
   - Altres recursos same-origin (img, manifest…) → CAU PRIMER (instantani), amb
     actualització en segon pla.
   - Les crides a Apps Script (POST, cross-origin) NO es toquen mai.
   Per forçar una actualització d'assets, puja la versió de CACHE. */
const CACHE = 'coord-2n-v1';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './img/logo.webp', './img/icon-192.png', './img/icon-512.png',
  './img/favicon.svg', './img/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(ASSETS.map((a) => c.add(a)))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                                  // no toquis POST (API)
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;                   // no toquis cross-origin (Apps Script)

  const isDoc = req.mode === 'navigate' || req.destination === 'document';
  if (isDoc) {
    // Xarxa primer; si falla, la cau; últim recurs, l'index.
    e.respondWith(
      fetch(req)
        .then((res) => { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return res; })
        .catch(() => caches.match(req).then((m) => m || caches.match('./index.html')))
    );
    return;
  }
  // Assets: cau primer, i si no hi és, xarxa (i la desa).
  e.respondWith(
    caches.match(req).then((m) => m || fetch(req).then((res) => {
      if (res && res.ok && res.type === 'basic') { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
      return res;
    }).catch(() => m))
  );
});
