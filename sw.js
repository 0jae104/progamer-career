// 오프라인에서도 열리도록 파일을 보관한다.
//   설치할 때: 이 버전의 핵심 파일을 한꺼번에 받아 둔다. 하나라도 못 받으면 설치하지 않고 예전 버전이 그대로 일한다(버전이 섞이지 않게).
//   실행 중  : 온라인이면 항상 서버에 최신 여부를 확인하고(브라우저 캐시를 그대로 믿지 않는다), 받지 못했을 때만 설치 때 받아 둔 보관본을 쓴다.
//   버전을 올리면 예전 보관본은 지워진다. 지우는 것은 파일 보관본(Cache Storage)뿐이고, 게임 저장(localStorage)은 건드리지 않는다.
// 버전은 여섯 곳이 같아야 한다: 이 파일, index.html 의 ?v= 와 확인 스크립트, js/data.js, js/engine.js, js/card.js, js/ui.js (test/sim.js 가 검사)
const VERSION = '0.11.0';
const CACHE = 'pg-career-' + VERSION;
const Q = '?v=' + VERSION;
const CORE = ['./', 'index.html', 'css/style.css' + Q, 'js/data.js' + Q, 'js/engine.js' + Q, 'js/card.js' + Q, 'js/ui.js' + Q, 'manifest.webmanifest', 'icon.svg'];
self.addEventListener('install', e => e.waitUntil(
  caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())
));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('pg-career-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const same = new URL(req.url).origin === self.location.origin;
  if (same) {
    // 게임 파일: 서버가 먼저다. 받지 못하면 설치할 때 받아 둔 이 버전의 파일을 준다.
    // 실행 중에 받은 파일은 보관본에 섞어 넣지 않는다. 보관본은 언제나 "한 번에 받아 둔 한 버전"이어야 오프라인에서 버전이 섞이지 않는다.
    e.respondWith(
      fetch(new Request(req.url, { cache: 'no-cache' })).then(res => (res.ok ? res : Promise.reject(new Error('http ' + res.status)))).catch(() =>
        caches.open(CACHE).then(c => c.match(req).then(hit => hit || (req.mode === 'navigate' ? c.match('index.html') : undefined))).then(hit => hit || Response.error())
      )
    );
    return;
  }
  // 바깥 파일(웹 글꼴): 받은 것을 보관해 두었다가 오프라인에서 쓴다. 없으면 기기 글꼴로 보인다.
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
      return res;
    }).catch(() => caches.open(CACHE).then(c => c.match(req)).then(hit => hit || Response.error()))
  );
});
