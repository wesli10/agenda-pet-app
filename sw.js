// Service worker — app instalável e disponível offline.
// Navegação: network-first (pega versão nova quando há internet, senão usa o cache).
// Arquivos com hash (/_expo/...) e ícones: cache-first.
const CACHE = 'agenda-pet-v5';
// Funciona na raiz do domínio ou num subcaminho (GitHub Pages): a base vem de onde o sw.js está.
const BASE = new URL('./', self.location).pathname;
const SHELL = [BASE, BASE + 'manifest.json', BASE + 'icon-180.png', BASE + 'icon-192.png', BASE + 'icon-512.png', BASE + 'favicon.png'];

// Guarda já na instalação o shell e os scripts do app (lidos do index.html), para o
// modo offline funcionar logo após a primeira visita, sem precisar abrir duas vezes.
async function precache() {
  const cache = await caches.open(CACHE);
  await cache.addAll(SHELL);
  const html = await (await cache.match(BASE)).text();
  const assets = [...html.matchAll(/(?:src|href)="([^"]*\/_expo\/[^"]+)"/g)].map(m => m[1]);
  await cache.addAll(assets);
}

self.addEventListener('install', e => {
  e.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function put(req, res) {
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
  }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // app de página única: toda rota cai no mesmo index.html
    e.respondWith(
      fetch(req)
        .then(res => put(new Request(BASE), res))
        .catch(() => caches.match(BASE)),
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => put(req, res)).catch(() => hit)),
  );
});
