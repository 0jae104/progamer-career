// 화면 자동 검사 공용 도구: 정적 파일 서버, 브라우저 실행, 자주 쓰는 동작
// 저장소 폴더를 로컬 HTTP 서버로 띄워서 검사한다(file:// 은 저장 동작이 배포 환경과 달라 쓰지 않는다).
const http = require('http'), https = require('https'), fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..', '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };

// dir 를 서비스한다. srv.down = true 면 연결을 끊고(오프라인 흉내), srv.fail = 정규식이면 그 경로만 끊는다. srv.dir 를 바꾸면 "새 버전 배포"가 된다.
function serve(dir, opt) {
  const srv = { dir, down: false, fail: null, hits: [] };
  const handler = (req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]);
    srv.hits.push(p);
    if (srv.down || (srv.fail && srv.fail.test(p))) { req.socket.destroy(); return; }
    const file = path.join(srv.dir, p === '/' ? 'index.html' : p);
    if (!file.startsWith(srv.dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  };
  const server = opt && opt.tls ? https.createServer(opt.tls, handler) : http.createServer(handler);
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => {
    srv.url = `${opt && opt.tls ? 'https' : 'http'}://localhost:${server.address().port}/`;
    srv.close = () => new Promise(r => { server.closeAllConnections && server.closeAllConnections(); server.close(r); });
    resolve(srv);
  }));
}

// 게임 실행에 필요한 파일만 임시 폴더로 복사한다(버전을 바꿔 가며 배포를 흉내 낼 때 쓴다)
const RUNTIME = ['index.html', 'sw.js', 'manifest.webmanifest', 'icon.svg', 'css/style.css', 'js/data.js', 'js/engine.js', 'js/card.js', 'js/ui.js'];
function copySite(from, to) {
  for (const f of RUNTIME) { const src = path.join(from, f); if (!fs.existsSync(src)) continue; fs.mkdirSync(path.dirname(path.join(to, f)), { recursive: true }); fs.copyFileSync(src, path.join(to, f)); }
  return to;
}
const tmpDir = name => fs.mkdtempSync(path.join(os.tmpdir(), 'pg-' + name + '-'));

async function launch(extraArgs) {
  const { chromium } = require('playwright');
  const tries = [process.env.PG_CHROME, undefined, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter((v, i, a) => a.indexOf(v) === i);
  let last;
  for (const exe of tries) {
    if (exe && !fs.existsSync(exe)) continue;
    try { return await chromium.launch({ executablePath: exe, args: ['--no-sandbox'].concat(extraArgs || []) }); } catch (e) { last = e; }
  }
  throw new Error('브라우저를 실행하지 못했다. "npx playwright install chromium" 을 실행하거나 PG_CHROME 에 크롬 실행 파일 경로를 넣는다.\n' + (last && last.message.split('\n')[0]));
}

// 검사 결과 모음
function reporter(name) {
  const R = { name, fails: [], notes: [], n: 0 };
  R.ok = (cond, msg) => { R.n++; if (!cond) { R.fails.push(msg); console.log('  실패: ' + msg); } return !!cond; };
  R.note = (k, v) => { R.notes.push([k, v]); console.log(`  ${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`); };
  return R;
}

async function open(browser, url, o) {
  o = o || {};
  const ctx = await browser.newContext({ viewport: { width: o.w || 390, height: o.h || 844 }, acceptDownloads: true, reducedMotion: o.reduced ? 'reduce' : 'no-preference', ignoreHTTPSErrors: true, serviceWorkers: o.sw ? 'allow' : 'block' });
  if (o.init) await ctx.addInitScript(o.init);
  const pg = await ctx.newPage(); pg.errs = [];
  pg.on('pageerror', e => pg.errs.push(String(e.message || e)));
  await pg.goto(url); await pg.waitForTimeout(200);
  return { ctx, pg };
}
// 화면에서 한 걸음 진행한다(장면이 있으면 첫 선택지나 확인, 없으면 "N월 진행")
async function step(pg) {
  const t = await pg.evaluate(() => (PG.scene() ? PG.scene().type : ''));
  if (!t) await pg.click('[data-act=next]');
  else if (['pickOrg', 'event', 'cards', 'moment'].includes(t)) { const els = await pg.$$('.sheet [data-act=res]:not([disabled])'); await els[t === 'pickOrg' ? els.length - 1 : 0].click(); }
  else if (t === 'offers') await pg.click('.sheet [data-act=accept]');
  else if (t === 'stove') await pg.click('.sheet [data-act=stay]');
  else if (t === 'tryout') await pg.click('.sheet [data-act=try]');
  else await pg.click('.sheet [data-act=ok]');
  return t;
}
async function start(pg, nick) { await pg.click('[data-act=create]'); await pg.fill('#nick', nick || 'Haneul'); await pg.click('[data-act=start]'); }
// 화면으로 시작한 뒤 엔진의 자동 진행으로 은퇴까지 가고, 새로 고쳐 은퇴 화면을 연다
async function career(pg, nick) {
  await start(pg, nick);
  await pg.evaluate(() => { let n = 0; while (!PG.state().over && n++ < 20000) PG.autoStep(); });
  await pg.reload(); await pg.waitForTimeout(200); await pg.click('[data-act=continue]');
}
const KEYS = ['pg_career_v1', 'pg_career_v1_bak', 'pg_hall_v1', 'pg_legacy_v1', 'pg_ach_v1', 'pg_tut_v1'];
const snap = pg => pg.evaluate(ks => ks.map(k => localStorage.getItem(k)), KEYS);
const fixtures = () => fs.readdirSync(path.join(ROOT, 'test', 'fixtures')).filter(f => f.endsWith('.json')).sort().map(f => [f.replace('.json', ''), fs.readFileSync(path.join(ROOT, 'test', 'fixtures', f), 'utf8')]);

// 배치 점검: 가로 넘침, 44px 미만 조작 요소, 12px 미만 글자, 말줄임으로 잘린 글자
const AUDIT = () => {
  const W = window.innerWidth, out = { over: 0, overEl: '', small: {}, tiny: {}, clip: {} };
  const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const name = e => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '');
  for (const e of document.querySelectorAll('#app *, #toast')) {
    if (!vis(e) || e.closest('.scroll-x') || e.classList.contains('srhide')) continue;
    const r = e.getBoundingClientRect();
    if (r.right - W > out.over) { out.over = Math.round(r.right - W); out.overEl = name(e); }
    if (e.matches('button, summary, input, a[href], label.btn') && (r.height < 43.5 || r.width < 43.5)) out.small[name(e)] = Math.round(r.width) + 'x' + Math.round(r.height);
    if ([...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) {
      const cs = getComputedStyle(e); if (parseFloat(cs.fontSize) < 11.9) out.tiny[name(e)] = parseFloat(cs.fontSize);
      if ((cs.overflowX === 'hidden' || cs.textOverflow === 'ellipsis') && e.scrollWidth > e.clientWidth + 1) out.clip[name(e)] = e.textContent.trim().slice(0, 24);
    }
  }
  // 겹친 글자: 장면 창과 선택지 안에서 위아래로 이어진 요소가 서로 겹치면 안 된다
  for (const box of document.querySelectorAll('.sheet, .sheet .choice .grow, .sheet .offer, .opt.role')) {
    const kids = [...box.children].filter(e => vis(e) && getComputedStyle(e).position !== 'absolute' && !e.classList.contains('confetti') && !e.classList.contains('trophy'));
    for (let i = 1; i < kids.length; i++) { const a = kids[i - 1].getBoundingClientRect(), b = kids[i].getBoundingClientRect(); if (b.top < a.bottom - 2 && b.left < a.right - 2 && a.left < b.right - 2) out.clip['겹침 ' + name(kids[i])] = kids[i].textContent.trim().slice(0, 20); }
  }
  out.docOver = Math.max(0, document.documentElement.scrollWidth - W);
  return out;
};
function auditor(pg) {
  const agg = { over: 0, el: '', doc: 0, small: {}, tiny: {}, clip: {}, screens: 0 };
  const m = async tag => {
    const r = await pg.evaluate(AUDIT); agg.screens++;
    if (r.over > agg.over) { agg.over = r.over; agg.el = tag + ' ' + r.overEl; }
    agg.doc = Math.max(agg.doc, r.docOver);
    for (const k of ['small', 'tiny', 'clip']) for (const a in r[k]) if (!(tag + ' ' + a in agg[k])) agg[k][tag + ' ' + a] = r[k][a];
  };
  m.agg = agg;
  m.line = () => `화면 ${agg.screens}개 | 가로 넘침 ${agg.over}px ${agg.el} | 문서 넘침 ${agg.doc}px | 44px 미만 ${JSON.stringify(agg.small)} | 12px 미만 ${JSON.stringify(agg.tiny)} | 잘린 글자 ${JSON.stringify(agg.clip)}`;
  m.clean = () => agg.over === 0 && agg.doc === 0 && !Object.keys(agg.small).length && !Object.keys(agg.tiny).length && !Object.keys(agg.clip).length;
  return m;
}
module.exports = { ROOT, serve, copySite, tmpDir, launch, reporter, open, step, start, career, snap, KEYS, fixtures, auditor, RUNTIME };
