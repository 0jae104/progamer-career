// 여러 탭·저장 보호(0.10.1). 같은 브라우저에서 탭 두 개로 같은 커리어를 열었을 때 오래된 탭이 최근 진행을 덮어쓰지 않는지,
// 그리고 파일 보관본(Cache Storage)을 지워도 게임 저장(localStorage)이 남는지 본다. PC 헤드리스 크롬 기준이며 실제 폰 검사가 아니다.
const { open, step, snap, copySite, tmpDir, serve, ROOT } = require('./lib');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const CAREER = pg => pg.evaluate(() => localStorage.getItem('pg_career_v1'));
const NOTICE = pg => pg.evaluate(() => { const s = document.querySelector('.veil .sheet'); return !!s && s.textContent.includes('다른 탭에서 진행됐다'); });
const waitFor = async (pg, fn, ms) => { const t = Date.now(); while (Date.now() - t < (ms || 6000)) { if (await fn()) return true; await pg.waitForTimeout(100); } return false; };

module.exports = async function tabs(browser, url, R) {
  // A. 탭 두 개가 같은 커리어를 연다
  const { ctx, pg: a } = await open(browser, url);
  await a.evaluate(() => { PG.newGame({ nick: 'Tab', region: 'kr', role: 'core', trait: 'brain' }); for (let i = 0; i < 30; i++) PG.autoStep(); });
  await a.reload(); await a.waitForTimeout(200); await a.click('[data-act=continue]');
  const b = await ctx.newPage(); b.errs = []; b.on('pageerror', e => b.errs.push(String(e.message || e)));
  await b.goto(url); await b.waitForTimeout(200); await b.click('[data-act=continue]');
  R.ok(!(await NOTICE(a)) && !(await NOTICE(b)), 'A: 탭을 두 개 열기만 했는데 안내가 뜸');
  // 탭 A에서 화면으로 진행(약 석 달)
  let moved = 0;   // 달이 바뀐 횟수. (연도와 달을 더한 값으로 비교하면 시즌이 넘어갈 때 달이 1로 돌아가 거꾸로 보인다)
  for (let i = 0; i < 60 && moved < 3; i++) { const before = await a.evaluate(() => PG.state().year * 12 + PG.state().m); await step(a); if (await a.evaluate(() => PG.state().year * 12 + PG.state().m) !== before) moved++; }
  const savedA = await CAREER(a);
  R.ok(moved >= 1 && savedA !== await b.evaluate(() => JSON.stringify(PG.state())) && !(await NOTICE(a)), 'A: 탭 A가 진행하지 못함');
  // 탭 B(오래된 상태): 알림이 뜨고, 눌러도 진행되지 않고, 저장을 덮어쓰지 않는다
  R.ok(await waitFor(b, () => NOTICE(b)), 'A: 다른 탭이 저장을 바꿨는데 오래된 탭에 안내가 뜨지 않음');
  R.ok(await b.evaluate(() => { const s = document.querySelector('.veil .sheet'), bt = s.querySelector('[data-act=reload]'), r = bt.getBoundingClientRect(); return s.getAttribute('role') === 'alertdialog' && document.querySelectorAll('.veil').length === 1 && r.height >= 44 && r.bottom <= innerHeight && r.top >= 0; }), 'A: 안내 창의 버튼이 화면 밖이거나 44px 미만이거나 창이 겹침');
  await b.evaluate(() => { for (const el of document.querySelectorAll('[data-act]')) if (el.dataset.act !== 'reload') el.click(); });
  await b.evaluate(() => { PG.autoStep(); PG.autoStep(); PG.save(); });   // 화면을 거치지 않고 엔진을 직접 불러도
  R.ok(await CAREER(b) === savedA, 'A: 오래된 탭이 최근 저장을 덮어씀');
  R.ok(await b.evaluate(() => PG.stale()), 'A: 엔진이 오래된 상태임을 모름');
  // "최근 저장 불러오기" → 새로 고쳐지고 탭 A의 진행이 열린다
  await Promise.all([b.waitForNavigation(), b.click('.veil [data-act=reload]')]); await b.waitForTimeout(200);
  R.ok(!(await NOTICE(b)) && await b.evaluate(() => !!document.querySelector('.title h1')), 'A: 새로 고친 뒤 타이틀이 아님');
  await b.click('[data-act=continue]');
  R.ok(await b.evaluate(() => JSON.stringify(PG.state())) === await a.evaluate(() => JSON.stringify(PG.state())), 'A: 새로 고친 탭이 최근 저장과 다른 상태를 엶');
  // 이제 탭 B가 진행하면 탭 A가 오래된 탭이 된다(방향이 바뀌어도 같다)
  await step(b); await step(b);
  const savedB = await CAREER(b);
  R.ok(savedB !== savedA && await waitFor(a, () => NOTICE(a)), 'A: 반대 방향에서 안내가 뜨지 않음');
  await a.evaluate(() => { for (const el of document.querySelectorAll('[data-act]')) if (el.dataset.act !== 'reload') el.click(); PG.autoStep(); });
  R.ok(await CAREER(a) === savedB, 'A: 반대 방향에서 덮어씀');
  R.note('탭 두 개', '한쪽이 진행하면 다른 쪽에 안내가 뜨고 멈춤, 저장을 덮어쓰지 않음, "최근 저장 불러오기"로 최근 상태를 엶');

  // B. 한 탭에서 커리어를 지우고 새로 시작: 오래된 탭이 지운 커리어를 되살리지 않는다
  await Promise.all([a.waitForNavigation(), a.click('.veil [data-act=reload]')]); await a.waitForTimeout(200);
  await a.evaluate(() => { PG.load(); PG.wipe(); PG.newGame({ nick: 'Fresh', region: 'eu', role: 'sup', trait: 'grinder' }); PG.autoStep(); });
  const fresh = await CAREER(a);
  R.ok(await waitFor(b, () => NOTICE(b)), 'B: 다른 탭이 새 커리어를 시작했는데 안내가 뜨지 않음');
  await b.evaluate(() => { PG.autoStep(); PG.save(); PG.wipe(); });
  R.ok(await CAREER(b) === fresh && JSON.parse(fresh).nick === 'Fresh', 'B: 오래된 탭이 새 커리어를 덮어쓰거나 지움');

  // C. 타이틀에 머물던 탭: 다른 탭이 커리어를 만든 뒤 "새 커리어"로 덮어쓰지 않는다
  await a.evaluate(() => { PG.wipe(); }); await a.reload(); await b.reload(); await b.waitForTimeout(200);
  await a.evaluate(() => { PG.newGame({ nick: 'First', region: 'kr', role: 'gun', trait: 'brain' }); PG.autoStep(); });
  const first = await CAREER(a);
  await b.evaluate(() => { PG.newGame({ nick: 'Second', region: 'kr', role: 'van', trait: 'brain' }); PG.save(); });
  R.ok(await CAREER(b) === first, 'C: 타이틀에 있던 탭의 새 커리어가 다른 탭의 커리어를 덮어씀');
  R.ok(await waitFor(b, () => NOTICE(b)), 'C: 안내가 뜨지 않음');

  // D. 은퇴를 두 탭이 각각 처리해도 명예의 전당 기록은 한 건
  await b.reload(); await b.waitForTimeout(200); await b.click('[data-act=continue]');
  await a.evaluate(() => { let n = 0; while (!PG.state().over && n++ < 20000) PG.autoStep(); });
  const hallN = await a.evaluate(() => PG.hall().length);
  await b.reload(); await b.waitForTimeout(200); await b.click('[data-act=continue]'); await a.reload(); await a.waitForTimeout(200); await a.click('[data-act=continue]');
  R.ok(hallN >= 1 && await b.evaluate(() => PG.hall().length) === hallN && await a.evaluate(() => PG.hall().length) === hallN, 'D: 같은 은퇴 기록이 두 번 들어감');
  R.ok(!a.errs.length && !b.errs.length, `스크립트 오류 ${a.errs} ${b.errs}`);
  await ctx.close();

  // E. 파일 보관본과 게임 저장은 다른 곳이다: 보관본과 서비스 워커를 모두 지워도 저장은 그대로
  const dir = copySite(ROOT, tmpDir('tabs')), srv = await serve(dir);
  const o = await open(browser, srv.url, { sw: true }), pg = o.pg;
  await waitFor(pg, async () => (await pg.evaluate(async () => (await caches.keys()).length)) === 1 && await pg.evaluate(() => navigator.serviceWorker.ready.then(() => true)), 8000);
  await pg.evaluate(() => { PG.newGame({ nick: 'Keep1', region: 'kr', role: 'core', trait: 'brain' }); let n = 0; while (!PG.state().over && n++ < 20000) PG.autoStep(); PG.wipe(); PG.newGame({ nick: 'Keep2', region: 'kr', role: 'sup', trait: 'brain' }); for (let i = 0; i < 20; i++) PG.autoStep(); });
  await pg.reload(); await pg.waitForTimeout(300); await pg.click('[data-act=continue]'); await pg.reload(); await pg.waitForTimeout(300);
  const d0 = await snap(pg);
  R.ok(d0[0] && d0.filter(Boolean).length >= 3, 'E: 검사용 데이터 준비');
  const cleared = await pg.evaluate(async () => { for (const k of await caches.keys()) await caches.delete(k); for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); return (await caches.keys()).length; });
  R.ok(cleared === 0 && same(await snap(pg), d0), 'E: 보관본을 지우자 저장이 달라짐');
  await pg.reload(); await pg.waitForTimeout(500);
  R.ok(same(await snap(pg), d0), 'E: 보관본을 지우고 다시 연 뒤 저장이 달라짐');
  await pg.click('[data-act=continue]');
  R.ok(await pg.evaluate(() => PG.state().nick === 'Keep2' && PG.hall().length >= 1), 'E: 보관본을 지운 뒤 이어하기 또는 명예의 전당');
  R.ok(await waitFor(pg, async () => (await pg.evaluate(async () => (await caches.keys()).length)) === 1, 8000), 'E: 다시 연 뒤 보관본이 새로 만들어지지 않음');
  R.note('보관본과 저장', '파일 보관본(Cache Storage)과 서비스 워커를 지워도 커리어·명예의 전당·도전 과제(localStorage)는 그대로, 다시 열면 보관본만 새로 받음');
  R.ok(!pg.errs.length, `스크립트 오류 ${pg.errs}`);
  await o.ctx.close(); await srv.close();
};
