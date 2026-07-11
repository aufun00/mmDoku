/* mmDoku service worker —— 壳缓存(离线可用)+ 导航 network-first(联网 F5 拿最新)
   版本 = CACHE(唯一来源;格式 appname.major.minor.patch,每次部署至少 patch +1) */
const CACHE = 'mmdoku.0.5.3';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      // 只删本 app 的旧版缓存;github.io 等共享 origin 上别误删别的项目的缓存
      .then((ks) => Promise.all(ks.filter((k) => k.indexOf('mmdoku.') === 0 && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const req = e.request;
  const isNav = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isNav) {
    // 导航/HTML:network-first —— 联网拿最新 index.html,失败(离线)回退缓存
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
  } else {
    // 静态资源(manifest/图标):cache-first
    e.respondWith(caches.match(req).then((r) => r || fetch(req)));
  }
});
