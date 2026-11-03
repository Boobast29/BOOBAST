// Service worker de Manager Foot : jeu installable et jouable hors ligne.
// Stratégie « réseau d'abord » (principe repris de Workbox NetworkFirst, code original) : quand le serveur répond,
// on sert toujours la version à jour et on la garde en copie ; sans réseau, la copie prend le relais.
// L'API de la base mondiale (/api/, /img/) n'est jamais mise en cache ici (le serveur local a son propre cache d'images).
const CACHE = 'manager-foot-studio20-v1';
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html', './style.css', './manifest.webmanifest', './icone.svg', './theme.css', './studio-club.css', './js/studio-club.js', './vendor/integration20/bundle.js', './vendor/integration20/bundle.css']).catch(() => { }))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/') || u.pathname.startsWith('/img/')) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const copie = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copie)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
});
