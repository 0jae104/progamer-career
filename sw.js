// 오프라인에서도 열리도록 마지막으로 받은 파일을 보관한다.
// 온라인일 때는 항상 서버에 최신 여부를 확인하고(브라우저 캐시를 그대로 믿지 않는다), 받지 못했을 때만 보관본을 쓴다.
// 버전을 올리면 예전 보관본은 지워진다. index.html 의 ?v= 와 js/engine.js 의 VERSION 도 같은 값으로 올린다.
const VERSION = '0.7.0';
const CACHE = 'pg-career-' + VERSION;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('pg-career-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const same = new URL(req.url).origin === self.location.origin;
  e.respondWith(
    fetch(same ? new Request(req.url, { cache: 'no-cache' }) : req).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match(req, { ignoreSearch: true })))
  );
});
