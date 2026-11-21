// 화면 비교(0.11.0 / 0.11.1 / 지금): 같은 저장으로 대표 화면을 찍고, 홈의 정보량과 자주 하는 일의 조작 수를 잰다.
//   node test/browser/compare.js [그림을 둘 폴더=docs/qa-logs/stage11-2/shots]
// PC 헤드리스 크롬의 폰 크기 에뮬레이션이다. 실제 폰 화면이 아니고, 사람이 편하다고 느끼는지는 재지 못한다. git 이력이 필요하다.
const { execSync } = require('child_process'), fs = require('fs'), path = require('path');
const { ROOT, serve, tmpDir, launch, open } = require('./lib');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'docs', 'qa-logs', 'stage11-2', 'shots'));
const VERS = [['v0.11.0', 'e6086bc'], ['v0.11.1', 'a3e1926'], ['v0.11.2', null]];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const dirs = [];
  try { for (const [, rev] of VERS) { if (!rev) { dirs.push(ROOT); continue; } const d = tmpDir('cmp'); execSync(`git -C "${ROOT}" archive ${rev} | tar -x -C "${d}"`, { stdio: 'pipe', shell: '/bin/sh' }); dirs.push(d); } }
  catch (e) { console.log('건너뜀: 예전 버전을 저장소 이력에서 꺼내지 못함'); process.exit(0); }
  const browser = await launch(), rows = [];
  // 저장은 가장 오래된 버전으로 만든다: 1군 주전, 4월(플레이오프 달) 직전
  const s0 = await serve(dirs[0]), mk = await open(browser, s0.url);
  const saves = await mk.pg.evaluate(() => { localStorage.clear(); localStorage.setItem('pg_tut_v1', '1'); PG._seen(); PG.seed(20261121); PG.newGame({ nick: 'Haneul', region: 'kr', role: 'core', trait: 'brain' }); let n = 0, home = '', pre = ''; while (n++ < 40000 && !PG.state().over && !(home && pre)) { const sc = PG.scene(), s = PG.state(); if (!home && !sc && s.squad === 'first' && s.tut.done && s.m === 1 && s.car.g > 20) { PG.save(); home = localStorage.getItem('pg_career_v1'); } if (home && !pre && sc && sc.type === 'prematch') { PG.save(); pre = localStorage.getItem('pg_career_v1'); } PG.autoStep(); } return { home, pre }; });
  await mk.ctx.close(); await s0.close();
  for (let v = 0; v < VERS.length; v++) {
    const name = VERS[v][0], srv = await serve(dirs[v]);
    for (const [w, h] of [[390, 844], [320, 568]]) {
      const { ctx, pg } = await open(browser, srv.url, { w, h });
      const load = async raw => { await pg.evaluate(r => { localStorage.clear(); localStorage.setItem('pg_tut_v1', '1'); localStorage.setItem('pg_opt_v1', '{"snd":0}'); localStorage.setItem('pg_career_v1', r); }, raw); await pg.reload(); await pg.waitForTimeout(300); await pg.addStyleTag({ content: '#toast{display:none!important}' }); await pg.click('[data-act=continue]'); await pg.waitForTimeout(400); };   // 도전 과제 알림은 그림을 가리므로 숨긴다
      const shot = n => pg.screenshot({ path: path.join(OUT, `${name}-${w}-${n}.png`) });
      await load(saves.home); await shot('1-home');
      // 홈 첫 화면의 정보량
      const info = await pg.evaluate(() => {
        const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }, inV = e => { const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
        const all = [...document.querySelectorAll('#app .stagebg *')].filter(vis);
        const text = e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
        const foot = document.querySelector('.foot'), fr = foot.getBoundingClientRect();
        const planEl = document.querySelector('.plan5 [data-id=rest], .plan[data-id=rest]'), pr = planEl ? planEl.getBoundingClientRect() : null;
        return { pages: +(document.documentElement.scrollHeight / innerHeight).toFixed(2), chars: all.reduce((a, e) => a + text(e).length, 0), charsFirst: all.filter(inV).reduce((a, e) => a + text(e).length, 0), buttons: all.filter(e => e.matches('button') && !e.disabled).length, tabs: document.querySelectorAll('.tabs [role=tab]').length,
          planNow: !!pr, planSeen: !!pr && pr.top >= 0 && pr.bottom <= fr.top + 2, footH: Math.round(fr.height), next: !!document.querySelector('[data-act=next]') };
      });
      // 할 일을 "휴식"으로 바꾸기까지의 누름과 스크롤
      let planTaps = 0, planScroll = 0;
      if (!await pg.evaluate(() => !!document.querySelector('.plan5 [data-id=rest], .plan[data-id=rest]'))) { await pg.click('[data-act=planopen]'); planTaps++; await pg.waitForTimeout(100); }
      planScroll = await pg.evaluate(() => { const e = document.querySelector('.plan5 [data-id=rest], .plan[data-id=rest]'), r = e.getBoundingClientRect(), lim = document.querySelector('.foot').getBoundingClientRect().top; return r.bottom > lim ? Math.round(r.bottom - lim) : r.top < 0 ? Math.round(-r.top) : 0; });
      await pg.evaluate(() => document.querySelector('.plan5 [data-id=rest], .plan[data-id=rest]').scrollIntoView({ block: 'center' })); await shot('2-plan');
      await pg.click('.plan5 [data-id=rest], .plan[data-id=rest]'); planTaps++;
      const planOk = await pg.evaluate(() => PG.state().plan === 'rest');
      // 투자 화면까지
      let shopTaps = 0; await pg.evaluate(() => scrollTo(0, 0));
      if (await pg.$('[data-act=tab][data-id=shop]')) { await pg.click('[data-act=tab][data-id=shop]'); shopTaps = 1; } else if (await pg.$('[data-act=tab][data-id=money]')) { await pg.click('[data-act=tab][data-id=money]'); shopTaps = 1; } else { await pg.click('[data-act=moneyopen]'); shopTaps = 1; }
      await pg.waitForTimeout(150); await shot('3-invest');
      const shopPages = await pg.evaluate(() => +(document.documentElement.scrollHeight / innerHeight).toFixed(2));
      // 경기 준비 화면
      await load(saves.pre); await pg.waitForTimeout(300); await shot('4-prematch');
      rows.push({ name, w, ...info, planTaps, planScroll, planOk, shopTaps, shopPages });
      await ctx.close();
    }
    await srv.close();
  }
  await browser.close();
  console.log('화면 비교(헤드리스 크롬 에뮬레이션. 같은 저장: 1군 주전 3월)\n');
  console.log('| 버전 | 폭 | 탭 수 | 홈 길이(화면 몇 장) | 홈 글자 수(전체/첫 화면) | 홈의 누를 수 있는 버튼 | 할 일 바꾸기: 누름 | 그때 필요한 스크롤(px) | 투자 화면: 누름 | 투자가 있는 화면 길이 |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) console.log(`| ${r.name} | ${r.w} | ${r.tabs} | ${r.pages} | ${r.chars} / ${r.charsFirst} | ${r.buttons} | ${r.planTaps} | ${r.planScroll} | ${r.shopTaps} | ${r.shopPages} |`);
  console.log(`\n그림 ${fs.readdirSync(OUT).filter(f => f.endsWith('.png')).length}장: ${path.relative(ROOT, OUT)}/<버전>-<폭>-<화면>.png`);
  if (rows.some(r => !r.planOk)) { console.log('실패: 할 일을 바꾸지 못한 버전이 있음'); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
