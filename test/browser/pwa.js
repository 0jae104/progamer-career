// 오프라인 보관(서비스 워커)과 버전 갱신. 저장소의 파일을 임시 폴더에 복사해 띄우고, 그 폴더의 버전 숫자를 바꿔 "새 버전 배포"를 흉내 낸다.
// 로컬 주소(http://localhost)는 브라우저가 보안 주소로 취급하므로 서비스 워커가 실제로 설치된다. 배포 주소(HTTPS)의 인증서·CDN 동작까지 확인하는 것은 아니다.
const fs = require('fs'), path = require('path');
const { ROOT, serve, copySite, tmpDir, open, snap, RUNTIME } = require('./lib');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function bump(dir, from, to) { for (const f of RUNTIME) { const p = path.join(dir, f); if (!fs.existsSync(p)) continue; const s = fs.readFileSync(p, 'utf8'); if (s.includes(from)) fs.writeFileSync(p, s.split(from).join(to)); } }
const swState = pg => pg.evaluate(async () => ({ caches: (await caches.keys()).sort(), ctl: !!navigator.serviceWorker.controller, ver: window.PG ? PG.VERSION : null, marks: window.PG_VER || null, mixed: window.PG_MIXED || null, title: !!document.querySelector('.title h1') }));
const waitFor = async (pg, fn, ms) => { const t = Date.now(); while (Date.now() - t < (ms || 8000)) { if (await fn()) return true; await pg.waitForTimeout(150); } return false; };
const consistent = (s, v) => s.ver === v && s.marks && ['data', 'engine', 'card', 'ui'].every(k => s.marks[k] === v) && !s.mixed && s.title;

module.exports = async function pwa(browser, _url, R) {
  const v0 = require(path.join(ROOT, 'package.json')).version, dir = copySite(ROOT, tmpDir('pwa')), srv = await serve(dir);
  const { ctx, pg } = await open(browser, srv.url, { sw: true });
  // A. 첫 방문: 설치되고, 핵심 파일이 한 번에 보관된다
  R.ok(await waitFor(pg, async () => (await swState(pg)).caches.length === 1 && await pg.evaluate(() => navigator.serviceWorker.ready.then(() => true))), 'A: 서비스 워커가 설치되지 않음');
  await pg.reload(); await pg.waitForTimeout(300);
  let s = await swState(pg);
  const cached = await pg.evaluate(async () => { const c = await caches.open((await caches.keys())[0]); return (await c.keys()).map(r => new URL(r.url).pathname + new URL(r.url).search).sort(); });
  R.note('보관된 파일', cached.join(', '));
  R.ok(s.ctl && same(s.caches, ['pg-career-' + v0]) && ['js/card.js', 'js/engine.js', 'js/ui.js', 'js/data.js', 'css/style.css'].every(f => cached.includes(`/${f}?v=${v0}`)) && cached.includes('/index.html') && cached.includes('/icon.svg') && cached.includes('/manifest.webmanifest'), `A: 보관 목록이 완전하지 않음 ${JSON.stringify(s.caches)}`);
  // 데이터 만들기: 은퇴 한 번(명예의 전당·도전 과제) + 진행 중인 커리어
  await pg.evaluate(() => { PG.newGame({ nick: 'Keep1', region: 'kr', role: 'core', trait: 'brain' }); let n = 0; while (!PG.state().over && n++ < 20000) PG.autoStep(); PG.wipe(); PG.newGame({ nick: 'Keep2', region: 'eu', role: 'sup', trait: 'grinder' }); for (let i = 0; i < 60; i++) PG.autoStep(); });
  // 한 번 열어서 달성 알림 표시 등이 정리된 뒤의 값을 기준으로 삼는다(그 뒤로는 열고 닫아도 저장 내용이 같아야 한다)
  await pg.reload(); await pg.waitForTimeout(300); await pg.click('[data-act=continue]'); await pg.reload(); await pg.waitForTimeout(300);
  const data0 = await snap(pg); R.ok(data0[0] && data0[3] && data0[4], 'A: 검사용 데이터 준비');
  // B. 서버가 죽은 상태(연결 실패)에서 다시 열기
  srv.down = true; await pg.reload(); await pg.waitForTimeout(400); s = await swState(pg);
  R.ok(consistent(s, v0), `B: 오프라인에서 열리지 않거나 파일 버전이 섞임 ${JSON.stringify(s)}`);
  await pg.click('[data-act=hall]'); await pg.locator('.hmain').first().click(); await pg.click('[data-act=card]');
  R.ok(await pg.waitForSelector('.cardimg', { timeout: 10000 }).then(() => true, () => false) && await pg.evaluate(() => document.querySelector('.cardimg').naturalWidth === 1080), 'B: 오프라인에서 커리어 카드 생성(js/card.js)');
  for (let i = 0; i < 3; i++) await pg.click('[data-act=back]');
  await pg.click('[data-act=continue]'); R.ok(await pg.evaluate(() => PG.state().nick) === 'Keep2', 'B: 오프라인에서 이어하기');
  await ctx.setOffline(true); await pg.reload(); await pg.waitForTimeout(400);
  R.ok((await pg.innerText('.title')).includes('오프라인 상태다'), 'B: 오프라인 안내가 보이지 않음'); await ctx.setOffline(false);
  R.ok(same(await snap(pg), data0), 'B: 오프라인 사용 중 저장 데이터가 달라짐');
  R.note('오프라인', `서버 연결이 끊긴 상태에서 v${s.ver} 실행, 이어하기·카드 생성 가능`);
  // C. 새 버전 배포: 온라인에서 새로 고치면 새 파일을 받고, 예전 보관본은 지워지고, 저장은 그대로
  // (0.10.2) 갱신 전에 탭을 하나 더 열어 둔다: 다른 탭이 새 버전을 받으면 이 탭에 새로 고침 안내가 떠야 한다
  srv.down = false;
  const left = await ctx.newPage(); left.errs = []; left.on('pageerror', e => left.errs.push(String(e.message || e)));
  await left.goto(srv.url); await left.waitForTimeout(300);   // 타이틀에 둔다(진행하면 저장이 바뀌어 아래의 '저장 불변' 확인과 섞인다)
  R.ok(await left.evaluate(() => !document.querySelector('#vernote')), 'C: 갱신이 없는데 새 버전 안내가 뜸');
  bump(dir, v0, '9.9.1'); await pg.reload(); await pg.waitForTimeout(500); s = await swState(pg);
  R.ok(consistent(s, '9.9.1'), `C: 새 버전이 한 벌로 열리지 않음 ${JSON.stringify(s)}`);
  R.ok(await waitFor(pg, async () => same((await swState(pg)).caches, ['pg-career-9.9.1'])), `C: 예전 보관본이 지워지지 않음 ${JSON.stringify((await swState(pg)).caches)}`);
  R.ok(same(await snap(pg), data0), 'C: 버전 갱신 뒤 저장 데이터가 달라짐');
  R.ok(await waitFor(left, () => left.evaluate(v => { const n = document.querySelector('#vernote'); return !!n && n.textContent.includes('9.9.1') && n.textContent.includes(v) && !!n.querySelector('[data-act=reload]'); }, v0)), 'C: 열어 둔 탭에 새 버전 안내가 뜨지 않음');
  R.ok(await pg.evaluate(() => !document.querySelector('#vernote')), 'C: 이미 새 버전인 탭에 새 버전 안내가 뜸');
  R.ok(await left.evaluate(() => { const b = document.querySelector('#vernote [data-act=reload]').getBoundingClientRect(); const v = document.querySelector('.veil'); return b.height >= 44 && document.documentElement.scrollWidth <= innerWidth && !(v && v.textContent.includes('새 버전')); }) && same(await snap(left), data0), 'C: 새 버전 안내가 화면을 막거나 넘치거나 저장을 바꿈');
  await Promise.all([left.waitForNavigation(), left.click('#vernote [data-act=reload]')]); await left.waitForTimeout(400);
  R.ok(consistent(await swState(left), '9.9.1') && await left.evaluate(() => !document.querySelector('#vernote')) && same(await snap(left), data0) && !left.errs.length, `C: 열어 둔 탭을 새로 고친 뒤 ${JSON.stringify(await swState(left))} ${left.errs}`);
  await left.close();
  R.note('열어 둔 탭', '다른 탭이 새 버전을 받자 예전 버전 탭에 "새 버전이 올라왔다" 안내와 새로 고침 버튼이 뜸(게임은 막지 않음), 누르면 새 버전으로 열리고 저장은 그대로');
  await pg.click('[data-act=continue]'); R.ok(await pg.evaluate(() => PG.state().nick === 'Keep2' && PG.hall().length === 1 && PG.achInfo().runs === 1), 'C: 갱신 뒤 커리어·명예의 전당·도전 과제');
  srv.down = true; await pg.reload(); await pg.waitForTimeout(400); s = await swState(pg); R.ok(consistent(s, '9.9.1'), `C: 갱신 뒤 오프라인 실행 ${JSON.stringify(s)}`); srv.down = false;
  R.note('버전 갱신', `v${v0} → v9.9.1(흉내): 새 파일 한 벌로 열림, 보관본 ${JSON.stringify((await swState(pg)).caches)}, 저장 여섯 키 불변`);
  // D. 갱신 도중 일부 파일만 실패: 섞인 채로 게임이 돌면 안 된다
  bump(dir, '9.9.1', '9.9.2'); srv.fail = /engine\.js/; await pg.reload(); await pg.waitForTimeout(500); s = await swState(pg);
  const guarded = !!s.mixed && (await pg.innerText('#app')).includes('새로 고쳐 주세요') && !s.title;
  R.ok(guarded || consistent(s, '9.9.1') || consistent(s, '9.9.2'), `D: 버전이 섞인 채 게임이 열림 ${JSON.stringify(s)}`);
  R.ok(same(await snap(pg), data0), 'D: 실패한 갱신이 저장 데이터를 바꿈');
  srv.fail = null; if (guarded) await pg.click('#app button'); else await pg.reload(); await pg.waitForTimeout(500); s = await swState(pg);
  R.ok(consistent(s, '9.9.2'), `D: 연결이 돌아온 뒤 새 버전으로 열리지 않음 ${JSON.stringify(s)}`);
  R.note('갱신 도중 일부 실패', guarded ? '게임을 시작하지 않고 새로 고침 안내를 띄움 → 연결 복구 뒤 새 버전으로 정상 실행' : '한 버전으로 일관되게 열림');
  R.ok(await waitFor(pg, async () => same((await swState(pg)).caches, ['pg-career-9.9.2'])), 'D: 새 버전 보관이 끝나지 않음');
  // E. 새 버전이 올라왔지만 오프라인: 마지막으로 다 받은 버전이 한 벌로 열린다
  bump(dir, '9.9.2', '9.9.3'); srv.down = true; await pg.reload(); await pg.waitForTimeout(400); s = await swState(pg);
  R.ok(consistent(s, '9.9.2') && same(s.caches, ['pg-career-9.9.2']), `E: 오프라인에서 마지막 버전이 한 벌로 열리지 않음 ${JSON.stringify(s)}`);
  // F. 보관본을 통째로 지워도 저장은 남는다
  srv.down = false; await pg.evaluate(async () => { for (const k of await caches.keys()) await caches.delete(k); (await navigator.serviceWorker.getRegistrations()).forEach(r => r.unregister()); });
  await pg.reload(); await pg.waitForTimeout(500);
  R.ok(same(await snap(pg), data0), 'F: 보관본(캐시)을 지우자 저장 데이터가 달라짐'); s = await swState(pg); R.ok(consistent(s, '9.9.3'), `F: 보관본을 지운 뒤 실행 ${JSON.stringify(s)}`);
  R.ok(!pg.errs.length, `스크립트 오류 ${pg.errs}`);
  await ctx.close(); await srv.close();
};
