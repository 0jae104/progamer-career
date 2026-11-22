// 홈·자산·시즌 결산 화면의 길이와 조작 수를 버전별로 잰다(직전 버전 / 지금). 같은 저장: 1군 3월(라이벌 있음).
//   node test/browser/measure.js [그림을 둘 폴더=docs/qa-logs/stage11-4/shots]
// PC 헤드리스 크롬의 폰 크기 에뮬레이션이다. 실제 폰이 아니고, 사람이 편하다고 느끼는지는 재지 못한다. git 이력이 필요하다.
const { execSync } = require('child_process'), fs = require('fs'), path = require('path');
const { ROOT, serve, tmpDir, launch, open } = require('./lib');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'docs', 'qa-logs', 'stage11-6-1', 'measure'));
const VERS = [['v0.11.4', 'a39de95'], ['v0.11.5', 'cb31d1a'], ['v0.11.6', '4c14f12'], ['v0.11.7', '41c2caf'], ['v0.11.8', '80472df'], ['v0.11.9', '92b32da'], ['지금', null]];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const dirs = [];
  try { for (const [, rev] of VERS) { if (!rev) { dirs.push(ROOT); continue; } const d = tmpDir('msr'); execSync(`git -C "${ROOT}" archive ${rev} | tar -x -C "${d}"`, { stdio: 'pipe', shell: '/bin/sh' }); dirs.push(d); } }
  catch (e) { console.log('건너뜀: 예전 버전을 저장소 이력에서 꺼내지 못함'); process.exit(0); }
  const browser = await launch(), rows = [];
  // 저장은 예전 버전으로 만든다: (가) 1군, 장면 없음, 라이벌전이 있는 달 (나) 같은 선수, 라이벌전이 없는 달
  const s0 = await serve(dirs[0]), mk = await open(browser, s0.url);
  const saves = await mk.pg.evaluate(() => { let rv = '', plain = ''; for (let k = 0; k < 30 && !(rv && plain); k++) { rv = plain = ''; localStorage.clear(); localStorage.setItem('pg_tut_v1', '1'); PG._seen(); PG.seed(20261121 + k); PG.newGame({ nick: 'Haneul', region: 'kr', role: 'core', trait: 'brain' }); let n = 0; while (n++ < 60000 && !PG.state().over && !(rv && plain)) { const sc = PG.scene(), s = PG.state(); if (!sc && s.squad === 'first' && s.tut.done && s.car.g > 20 && s.injury === 0) { const fx = PG.rivalFixtures().length; if (fx && !rv) { PG.save(); rv = localStorage.getItem('pg_career_v1'); } if (!fx && !plain && s.m >= 1 && s.m <= 6) { PG.save(); plain = localStorage.getItem('pg_career_v1'); } } PG.autoStep(); } } let pre = ''; for (let k = 0; k < 30 && !pre; k++) { localStorage.clear(); localStorage.setItem('pg_tut_v1', '1'); PG._seen(); PG.seed(31000 + k); PG.newGame({ nick: 'Haneul', region: 'kr', role: 'core', trait: 'brain' }); let n = 0; while (n++ < 60000 && !PG.state().over) { const s = PG.state(); if (!PG.scene() && s.squad === 'first' && s.tut.done && s.m === 9 && s.year >= 4 && s.age < 30) { PG.save(); pre = localStorage.getItem('pg_career_v1'); break; } PG.autoStep(); } } return { rv, plain, pre }; });
  await mk.ctx.close(); await s0.close();
  if (!saves.rv || !saves.plain) { console.log('실패: 검사용 저장을 만들지 못함'); process.exit(1); }
  for (let v = 0; v < VERS.length; v++) {
    const name = VERS[v][0], tag = name === '지금' ? 'v0.11.10' : name, srv = await serve(dirs[v]);
    for (const [w, h] of [[320, 568], [375, 812], [390, 844], [430, 932]]) {
      const { ctx, pg } = await open(browser, srv.url, { w, h });
      const load = async raw => { await pg.evaluate(r => { localStorage.clear(); localStorage.setItem('pg_tut_v1', '1'); localStorage.setItem('pg_opt_v1', '{"snd":0}'); localStorage.setItem('pg_career_v1', r); }, raw); await pg.reload(); await pg.waitForTimeout(300); await pg.addStyleTag({ content: '#toast{display:none!important}' }); await pg.click('[data-act=continue]'); await pg.waitForTimeout(400); };
      const shot = n => ([320, 390].includes(w) ? pg.screenshot({ path: path.join(OUT, `${tag}-${w}-${n}.png`) }) : null);
      await load(saves.plain); await shot('1-home');
      const home = await pg.evaluate(() => {
        const foot = document.querySelector('.foot').getBoundingClientRect().top, txt = document.querySelector('.stagebg').textContent;
        const top = sel => { const e = document.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().top) : -1; }, seen = sel => { const e = document.querySelector(sel); if (!e) return false; const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= foot + 2; };
        const has = k => new RegExp(k + '\\s*\\d').test(txt.replace(/\n/g, ' '));
        return { doc: document.documentElement.scrollHeight, over: document.documentElement.scrollHeight - innerHeight, planTop: top('.plan5'), planSeen: seen('.plan5'), goalSeen: seen('.goalbtn'), nextTop: top('[data-act=next]'), four: ['컨디션', '손목', '(감독 신뢰|코치 평가)', '인기'].filter(has).length, moneyBtn: !!document.querySelector('.stagebg :is(button,a)[data-act=tab][data-id=money]:not([role=tab])') };
      });
      // 자금 → 자산: 누름 수(홈의 자금을 누를 수 있으면 그것으로, 아니면 아래 탭)
      const moneyTaps = 1; await pg.click(home.moneyBtn ? '.stagebg :is(button,a)[data-act=tab][data-id=money]:not([role=tab])' : '[data-act=tab][data-id=money]'); await pg.waitForTimeout(150); await shot('2-money');
      const money = await pg.evaluate(() => {
        const foot = document.querySelector('.foot').getBoundingClientRect().top, togs = [...document.querySelectorAll('[data-act=shop-auto]')], y = e => Math.round(e.getBoundingClientRect().bottom + scrollY);
        const lim = document.querySelector('[data-act=alim]');
        return { doc: document.documentElement.scrollHeight, over: document.documentElement.scrollHeight - innerHeight, scrollY: Math.round(scrollY), togs: togs.length, togsSeen: togs.filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.top >= 0 && r.bottom <= foot + 2; }).length, firstTogScroll: togs.length ? Math.max(0, Math.round(togs[0].getBoundingClientRect().bottom - foot)) : -1, lastTogScroll: togs.length ? Math.max(0, Math.round(Math.max(...togs.map(e => e.getBoundingClientRect().bottom)) - foot)) : -1, limSeen: !!lim && lim.getBoundingClientRect().bottom <= foot + 2, sel: document.querySelector('.tabs [aria-selected=true]').dataset.id };
      });
      // 단계형 투자까지 펼쳤을 때의 길이(지금 버전만 접혀 있다)와, 맨 위에서 특정 스위치까지 필요한 스크롤
      const scrollTo = id => pg.evaluate(i => { const e = document.querySelector(`[data-act=shop-auto][data-id=${i}]`); if (!e) return -1; const foot = document.querySelector('.foot').getBoundingClientRect().top; return Math.max(0, Math.round(e.getBoundingClientRect().bottom + scrollY - foot)); }, id);
      money.counsel = await scrollTo('counsel'); money.grpTaps = 0;
      if (await pg.$('[data-act=shopgrp]')) { await pg.click('[data-act=shopgrp]'); money.grpTaps = 1; await pg.waitForTimeout(100); await shot('2b-money-open'); }
      money.gear = await scrollTo('gear'); money.docOpen = await pg.evaluate(() => document.documentElement.scrollHeight); money.overOpen = Math.max(0, money.docOpen - h);
      // 라이벌전이 있는 달
      await load(saves.rv); await shot('3-rival-home');
      const rv = await pg.evaluate(() => { const fx = PG.rivalFixtures(), t = document.querySelector('.content').textContent; return { fx: fx.length, shown: fx.length > 0 && fx.every(f => t.includes(f.nick)), over: document.documentElement.scrollHeight - innerHeight, link: !!document.querySelector('.content [data-to=rivals]') }; });
      // 시즌 결산: 시즌 마지막 달 직전의 같은 저장에서 한 달을 진행해 결산 창까지 간다. 넘어가는 데 드는 누름 수와 그 버튼까지의 스크롤
      await load(saves.pre); await pg.evaluate(() => PG.seed(4040)); await pg.click('[data-act=next]'); await pg.waitForTimeout(150);
      for (let i = 0; i < 12 && await pg.evaluate(() => PG.scene() && PG.scene().type !== 'season'); i++) { await pg.evaluate(() => { const b = [...document.querySelectorAll('.veil .sheet [data-act]')].find(x => !x.disabled && x.dataset.act !== 'snd'); if (b) b.click(); }); await pg.waitForTimeout(80); }
      const season = await pg.evaluate(() => { const sh = document.querySelector('.veil .sheet'); if (!sh || !PG.scene() || PG.scene().type !== 'season') return null; const btns = [...sh.querySelectorAll('[data-act=ok],[data-act=goal]')], vis = sh.getBoundingClientRect(), need = b => Math.max(0, Math.round(b.getBoundingClientRect().bottom - Math.min(vis.bottom, innerHeight))); return { btns: btns.length, first: need(btns[0]), last: need(btns[btns.length - 1]), sheet: Math.round(sh.scrollHeight) }; });
      await shot('4-season');
      let seasonTaps = 0; if (season) { await pg.evaluate(() => document.querySelector('.veil .sheet [data-act=ok], .veil .sheet [data-act=goal]').click()); seasonTaps = 1; await pg.waitForTimeout(100); }
      const after = await pg.evaluate(() => PG.scene() && PG.scene().type);
      rows.push({ name, w, h, home, money, moneyTaps, rv, season, seasonTaps, after });
      await ctx.close();
    }
    await srv.close();
  }
  await browser.close();
  console.log('홈·자산 화면 측정(헤드리스 크롬 에뮬레이션, 같은 저장: 1군)\n');
  console.log('| 버전 | 화면 | 홈: 상태 4종 중 보이는 수 | 홈 세로 넘침(px) | 할 일 칸의 위치(px) | 할 일·목표가 첫 화면에 | 홈에서 자금을 눌러 자산으로 | 자산: 문서 길이(px) | 자산: 넘침(px) | 자동 스위치 중 첫 화면에 보이는 수 | 마지막 스위치까지 스크롤(px) | 라이벌전 달: 홈에 상대 표시 / 기록으로 가는 버튼 / 넘침(px) |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) console.log(`| ${r.name} | ${r.w}×${r.h} | ${r.home.four} | ${Math.max(0, r.home.over)} | ${r.home.planTop} | ${r.home.planSeen ? '예' : '아니오'} · ${r.home.goalSeen ? '예' : '아니오'} | ${r.home.moneyBtn ? '예(1번)' : '아니오(아래 탭 1번)'} | ${r.money.doc} | ${Math.max(0, r.money.over)} | ${r.money.togsSeen} / ${r.money.togs} | ${r.money.lastTogScroll} | ${r.rv.shown ? '예' : '아니오'} / ${r.rv.link ? '예' : '아니오'} / ${Math.max(0, r.rv.over)} |`);
  console.log('\n조작 수(홈에서 시작. 누름 수 + 그때 필요한 세로 스크롤)\n');
  console.log('| 버전 | 화면 | 상태 네 가지 확인 | 자금 → 자산 | 심리 상담 자동 켜기 | 장비 세팅 자동 켜기 | 자산을 다 펼친 길이(px) / 넘침(px) |');
  console.log('|---|---|---|---|---|---|---|');
  for (const r of rows) console.log(`| ${r.name} | ${r.w}×${r.h} | ${r.home.four === 4 ? '0번(홈에 있음)' : '1번(선수 탭으로 이동)'} | 1번(${r.home.moneyBtn ? '위쪽 자금 줄 또는 아래 탭' : '아래 탭만'}) | 2번 + 스크롤 ${r.money.counsel}px | ${2 + r.money.grpTaps}번 + 스크롤 ${r.money.gear}px | ${r.money.docOpen} / ${r.money.overOpen} |`);
  console.log('\n시즌 결산 창(같은 저장에서 시즌 마지막 달을 진행)\n');
  console.log('| 버전 | 화면 | 넘어가는 버튼 수 | 넘어가는 데 드는 누름 | 첫 버튼까지 스크롤(px) | 마지막 버튼까지 스크롤(px) | 창의 길이(px) | 넘어간 다음 장면 |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const r of rows) console.log(r.season ? `| ${r.name} | ${r.w}×${r.h} | ${r.season.btns} | ${r.seasonTaps} | ${r.season.first} | ${r.season.last} | ${r.season.sheet} | ${r.after} |` : `| ${r.name} | ${r.w}×${r.h} | (결산 창에 닿지 못함) | | | | | |`);
  console.log(`\n그림: ${path.relative(ROOT, OUT)}/<버전>-<폭>-<화면>.png (320·390px)`);
})().catch(e => { console.error(e); process.exit(1); });
