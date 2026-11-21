// 자동진행 중 홈 화면의 DOM 누적 검사(0.11.6). PC 헤드리스 크롬이며 실제 폰 검사가 아니다.
//   - 자동진행이 한 달 넘어갈 때마다 화면에서 직접 센다: 보유 자금 버튼(.moneyrow) 수, 상태 영역(.hstat) 수, 버튼 수, 문서 높이,
//     화면에 적힌 자금·컨디션·손목·신뢰·인기·OVR 과 엔진 값, 멈춤 버튼이 눌리는 위치에 있는지.
//   - 0.11.5 는 이 검사에서 실패한다(달마다 .moneyrow 가 하나씩 늘어난다). test/browser/repro.js 가 옛 버전으로 그것을 확인한다.
//   - 엔진의 새 기능(자금 내역)은 있으면 함께 대조하고, 없는 옛 버전에서는 건너뛴다.
const { open } = require('./lib');
const SAVE = ([seed, squad]) => {
  localStorage.clear(); localStorage.setItem('pg_tut_v1', '1'); PG._seen();
  for (let k = 0; k < 30; k++) {
    PG.seed(seed * 100 + k); PG.newGame({ nick: '자금' + seed, region: ['kr', 'cn', 'eu', 'na'][seed % 4], role: ['van', 'rov', 'core', 'gun', 'sup'][seed % 5], trait: ['genius', 'grinder', 'brain'][seed % 3] });
    let n = 0; while (n++ < 30000 && !PG.state().over && !(PG.state().squad === squad && PG.state().tut.done && !PG.scene() && PG.state().m <= 1 && PG.state().injury === 0 && PG.state().age <= 22)) PG.autoStep();
    if (!PG.state().over && PG.state().squad === squad && !PG.scene()) { delete PG.state().recap; delete PG.state().lastRep; PG.save(); return localStorage.getItem('pg_career_v1'); }
  }
  return '';
};
// mainH = 위쪽 선수 정보 칸(상태·자금이 들어 있는 곳)의 높이, planTop = 이번 달 할 일 칸의 화면 위치
// 화면 안에서: 자동진행이 한 달을 넘길 때마다(G.autoMonth 가 끝나고 화면이 바뀐 직후) 한 줄씩 적는다
const HOOK = () => {
  window.__ap = [];
  const f = PG.autoMonth;
  PG.autoMonth = function () {
    const before = PG.state().money, seq = PG.cash ? PG.cash().seq : null, r = f.apply(this, arguments);
    setTimeout(() => {
      const S = PG.state(), q = s => document.querySelectorAll(s), mr = q('.stagebg .moneyrow'), hs = q('.stagebg .hstat .hs b'), pause = document.querySelector('[data-act=ap-pause]');
      const pr = pause ? pause.getBoundingClientRect() : null, hit = pr ? document.elementFromPoint(pr.left + pr.width / 2, pr.top + pr.height / 2) : null;
      const row = { on: PG_UI.ap.on, k: r.k, stop: r.stop || '', before, money: S.money, rows: mr.length, hstat: q('.stagebg .hstat').length, btns: q('.stagebg button').length, nodes: q('.stagebg *').length,
        docH: document.documentElement.scrollHeight, mainH: Math.round((document.querySelector('.stagebg .lower') || document.body).getBoundingClientRect().height), planTop: Math.round((document.querySelector('.stagebg .plan5') || document.body).getBoundingClientRect().top), viewH: window.innerHeight,
        shown: mr.length ? mr[mr.length - 1].querySelector('b').textContent : '', first: mr.length ? mr[0].querySelector('b').textContent : '', want: PG.fmtMoney(S.money),
        hs: [...hs].map(b => b.textContent).join(','), hsWant: hs.length ? [S.cond, S.wrist, S.trust, S.fame].map(v => String(Math.round(v))).join(',') : '',
        ovr: (document.querySelector('.lower .ovr b') || {}).textContent || '', ovrWant: String(Math.floor(PG.ovr())),
        pause: pause ? (pr.height >= 44 && pr.bottom <= window.innerHeight + 1 && !!hit && (hit === pause || pause.contains(hit))) : null,
        line: (document.getElementById('apline') || {}).textContent || '', cashLine: (document.getElementById('apcash') || {}).textContent || '', plan: q('.stagebg .plan5 button').length };
      if (PG.cash && seq != null) { const c = PG.cash(), it = c.all.filter(x => x.seq > seq); row.led = it.reduce((a, x) => a + x.v, 0); row.gap = it.some(x => x.gap); row.auto = it.filter(x => x.k === 'auto').reduce((a, x) => a + x.v, 0); row.sal = it.filter(x => x.k === 'sal').reduce((a, x) => a + x.v, 0); }
      const lr = PG.lastRep(); if (r.k && lr) { row.repSal = lr.salary || 0; row.repAuto = lr.auto ? lr.auto.spent : 0; row.repItems = lr.auto ? lr.auto.items.filter(x => !x.why).map(x => x.id) : []; row.bal = lr.auto ? lr.auto.bal : null; }
      row.ym = S.year * 100 + S.m;
      window.__ap.push(row);
    }, 0);
    return r;
  };
};
const clear = async pg => { for (let i = 0; i < 120 && await pg.evaluate(() => !!PG.scene() && !PG.state().over); i++) { await pg.evaluate(() => { const w = document.querySelector('[data-act=wskip]'); if (w) return w.click(); const k = document.querySelector('.sheet [data-act=kick][data-id=none]'); if (k) return k.click(); const b = [...document.querySelectorAll('.veil .sheet [data-act]')].find(x => !x.disabled && !['snd', 'retire', 'reroll', 'mom-auto'].includes(x.dataset.act)); if (b) b.click(); }); await pg.waitForTimeout(25); } };
const stopped = pg => pg.waitForFunction(() => !PG_UI.ap.on, null, { timeout: 90000 });
const months = pg => pg.evaluate(() => window.__ap.reduce((a, x) => a + x.k, 0));
const go = async pg => {
  await clear(pg);
  if (await pg.evaluate(() => PG.state().over)) return false;
  if (await pg.evaluate(() => PG_UI.state.tab !== 'home')) await pg.click('[role=tab][data-id=home]');
  await pg.click('[data-act=ap-go]'); await pg.waitForTimeout(40);
  if (await pg.$('.sheet [data-act=ap-start]')) await pg.click('.sheet [data-act=ap-start]');
  return true;
};
/* 한 번의 측정: 저장을 불러와 자동진행으로 want 개월을 넘긴다. 중간에 멈춤·재개(pauseAt), 다른 탭 왕복(tabAt)을 섞는다.
   멈춘 이유가 장면이면 화면의 버튼으로 넘기고 다시 시작한다. 돌려주는 것은 달마다의 기록이다. */
async function run(browser, url, raw, o) {
  const { ctx, pg } = await open(browser, url, { w: o.w, h: o.h, init: 'window.__pgApMs = 12;' });
  await pg.evaluate(x => { localStorage.clear(); localStorage.setItem('pg_tut_v1', '1'); localStorage.setItem('pg_career_v1', x); }, raw);
  await pg.reload(); await pg.waitForTimeout(250); await pg.click('[data-act=continue]'); await pg.waitForTimeout(150);
  await pg.evaluate(a => { PG.seed(a.seed || 5); if (a.auto) { for (const id of a.auto) PG.setAuto(id, true); } if (a.give) { PG.state().money += a.give; PG.save(); } }, { seed: o.seed, auto: o.auto, give: o.give || 0 });
  await pg.evaluate(HOOK);
  const money0 = await pg.evaluate(() => PG.state().money);
  const ev = { starts: 0, pauses: 0, tabs: 0, scenes: {} };
  let guard = 0, paused = false, tabbed = false;
  while (await months(pg) < o.want && guard++ < 200) {
    if (!await go(pg)) break; ev.starts++;
    const n0 = await months(pg);
    if (o.pauseAt != null && !paused && n0 >= o.pauseAt) {   // 달리는 중에 멈춤을 누르고 다시 시작한다
      await pg.waitForFunction(n => window.__ap.reduce((a, x) => a + x.k, 0) > n || !PG_UI.ap.on, n0, { timeout: 30000 });
      if (await pg.evaluate(() => { const b = document.querySelector('[data-act=ap-pause]'); if (!PG_UI.ap.on || !b) return false; b.click(); return !PG_UI.ap.on; })) { paused = true; ev.pauses++; }
    }
    await stopped(pg); await pg.waitForTimeout(30);
    const sc = await pg.evaluate(() => (PG.scene() ? PG.scene().type : '')); if (sc) ev.scenes[sc] = (ev.scenes[sc] || 0) + 1;
    if (o.tabAt && !tabbed && await months(pg) >= o.tabAt) {   // 자산 탭에 다녀온다(자금 줄을 눌러서 가고, 아래 탭으로 돌아온다)
      await clear(pg);
      if (!await pg.evaluate(() => PG.state().over)) { await pg.click('.stagebg .moneyrow'); await pg.waitForTimeout(60); ev.toMoney = await pg.evaluate(() => PG_UI.state.tab); await pg.click('[role=tab][data-id=home]'); await pg.waitForTimeout(60); tabbed = true; ev.tabs++; }
    }
  }
  await pg.waitForTimeout(40);
  const log = await pg.evaluate(() => window.__ap), end = await pg.evaluate(() => ({ rows: document.querySelectorAll('.stagebg .moneyrow').length, hstat: document.querySelectorAll('.stagebg .hstat').length, over: PG.state().over, ver: PG.VERSION, err: window.__pgApError || window.__pgRenderError || '', money: PG.state().money, cash: PG.cash ? (c => ({ n: c.all.length, sum: c.all.reduce((a, x) => a + x.v, 0), gap: c.all.filter(x => x.gap).length, kinds: c.all.reduce((o, x) => (o[x.k] = (o[x.k] || 0) + x.v, o), {}) }))(PG.cash()) : null }));
  end.money0 = money0;
  const errs = pg.errs.slice(); await ctx.close();
  return { log, ev, end, errs };
}
// 기록에서 숫자를 뽑는다
function digest(log) {
  const m = log.filter(x => x.k && !x.stop && x.on);   // 달이 넘어갔고 계속 달리는 중(부분 갱신이 일어난 달)
  const max = (a, f) => a.reduce((v, x) => Math.max(v, f(x)), 0);
  let grow = 0, run = 0; for (let i = 1; i < m.length; i++) { if (m[i].planTop > m[i - 1].planTop) { run++; grow = Math.max(grow, run); } else run = 0; }
  return { plan0: m.length ? m[0].planTop : 0, plan1: m.length ? Math.max(...m.map(x => x.planTop)) : 0, n: m.length, months: log.reduce((a, x) => a + x.k, 0), maxRows: max(m, x => x.rows), maxHstat: max(m, x => x.hstat), minRows: m.reduce((v, x) => Math.min(v, x.rows), 99), maxMainH: max(m, x => x.mainH), minMainH: m.reduce((v, x) => Math.min(v, x.mainH), 1e9), maxDocH: max(m, x => x.docH), maxBtns: max(m, x => x.btns), minBtns: m.reduce((v, x) => Math.min(v, x.btns), 1e9), maxNodes: max(m, x => x.nodes), minNodes: m.reduce((v, x) => Math.min(v, x.nodes), 1e9),
    staleMoney: m.filter(x => x.first !== x.want).length, badMoney: m.filter(x => x.shown !== x.want).length, badStat: m.filter(x => x.hs !== x.hsWant).length, badOvr: m.filter(x => x.ovr !== x.ovrWant).length, badPause: m.filter(x => x.pause !== true).length, growRun: grow };
}
module.exports = async function apdom(browser, url, R) {
  const mk = await open(browser, url), first = await mk.pg.evaluate(SAVE, [3, 'first']), second = await mk.pg.evaluate(SAVE, [4, 'second']); await mk.ctx.close();
  R.ok(!!first && !!second, '검사용 저장(1군·2군)을 만들지 못함');
  const AUTO = ['counsel', 'physio', 'analyst', 'gear', 'coach', 'care'];
  const cases = [
    { name: '390×844 1군 24개월(자동 관리 켬, 멈춤·재개, 자산 탭 왕복)', raw: first, w: 390, h: 844, want: 24, auto: AUTO, give: 3000, pauseAt: 3, tabAt: 6, seed: 11 },
    { name: '320×568 1군 24개월(자동 관리 켬)', raw: first, w: 320, h: 568, want: 24, auto: AUTO, give: 3000, pauseAt: 2, tabAt: 5, seed: 12 },
    { name: '375×812 2군 12개월(자동 관리 끔)', raw: second, w: 375, h: 812, want: 12, pauseAt: 0, tabAt: 3, seed: 13 },
    { name: '430×932 1군 6개월(자동 관리 켬)', raw: first, w: 430, h: 932, want: 6, auto: AUTO.slice(0, 3), seed: 14 },
  ];
  for (const c of cases) {
    const r = await run(browser, url, c.raw, c), d = digest(r.log), m = r.log.filter(x => x.k && !x.stop && x.on), all = r.log.filter(x => x.k);
    R.ok(d.months >= c.want, `${c.name}: ${c.want}개월을 채우지 못함(${d.months}개월, 은퇴 ${r.end.over})`);
    R.ok(d.n >= Math.min(4, c.want - 2), `${c.name}: 부분 갱신이 일어난 달이 너무 적어 검사가 되지 않음(${d.n})`);
    R.ok(d.maxRows === 1 && d.minRows === 1 && r.end.rows === 1, `${c.name}: 보유 자금 버튼이 1개가 아님(달리는 중 최소 ${d.minRows}·최대 ${d.maxRows}, 끝난 뒤 ${r.end.rows})`);
    R.ok(d.maxHstat === 1 && r.end.hstat === 1, `${c.name}: 상태 영역이 1개가 아님(최대 ${d.maxHstat})`);
    R.ok(d.badMoney === 0 && d.staleMoney === 0, `${c.name}: 화면의 자금이 실제 자금과 다른 달 ${d.badMoney}개(첫 줄이 낡은 달 ${d.staleMoney}개)`);
    R.ok(d.badStat === 0 && d.badOvr === 0, `${c.name}: 화면의 상태·OVR이 실제와 다른 달 ${d.badStat}·${d.badOvr}개`);
    R.ok(d.badPause === 0, `${c.name}: 멈춤 버튼이 가려지거나 화면 밖인 달 ${d.badPause}개`);
    R.ok(d.maxBtns - d.minBtns <= 2 && d.maxNodes - d.minNodes <= 16, `${c.name}: 달리는 중 버튼·요소 수가 크게 변함(라이벌전 줄처럼 달에 따라 있고 없는 것만 허용)(버튼 ${d.minBtns}~${d.maxBtns}, 요소 ${d.minNodes}~${d.maxNodes})`);
    R.ok(d.growRun <= 1 && d.plan1 - d.plan0 <= 24 && d.maxMainH - d.minMainH <= 24, `${c.name}: 달리는 중 이번 달 할 일 칸이 아래로 밀림(${d.plan0}→${d.plan1}px, 이어서 밀린 달 ${d.growRun}, 위 칸 높이 ${d.minMainH}~${d.maxMainH}px)`);
    R.ok(d.plan1 < c.h - 150, `${c.name}: 이번 달 할 일 칸이 화면 아래쪽으로 밀려남(${d.plan1}px / 화면 ${c.h}px)`);
    R.ok(m.every(x => x.plan === 5), `${c.name}: 이번 달 할 일 다섯 칸이 사라진 달이 있음`);
    R.ok(c.tabAt ? r.ev.tabs === 1 && r.ev.toMoney === 'money' : true, `${c.name}: 자금 줄을 눌러 자산 탭으로 가지 못함(${r.ev.toMoney})`);
    R.ok(c.pauseAt != null ? r.ev.pauses === 1 : true, `${c.name}: 멈춤·재개를 해 보지 못함`);
    R.ok(!r.errs.length && !r.end.err, `${c.name}: 스크립트 오류 ${r.errs} ${r.end.err}`);
    // 정산: 달마다 시작 잔고 + 그달에 적힌 수입·지출 = 끝 잔고. 자동 관리는 한 달에 한 번, 같은 항목은 한 번, 잔고는 음수가 아니다
    const withLed = all.filter(x => x.led != null);
    R.ok(withLed.length === all.length, `${c.name}: 자금 내역이 없는 달 ${all.length - withLed.length}개`);
    R.ok(withLed.every(x => x.before + x.led === x.money && !x.gap), `${c.name}: 시작 잔고 + 수입 − 지출 ≠ 끝 잔고인 달 ${withLed.filter(x => x.before + x.led !== x.money || x.gap).length}개`);
    const one = all.filter(x => x.k === 1 && !x.stop && x.repSal != null);   // 그달의 보고까지 끝난 달만(장면에서 멈춘 달은 월급이 아직 들어오지 않았다)
    R.ok(one.every(x => x.sal === x.repSal && -x.auto === x.repAuto), `${c.name}: 내역의 월급·자동 관리 합이 월간 보고와 다른 달 ${one.filter(x => x.sal !== x.repSal || -x.auto !== x.repAuto).length}개`);
    R.ok(one.every(x => new Set(x.repItems).size === x.repItems.length) && all.every(x => x.money >= 0), `${c.name}: 같은 달 같은 항목을 두 번 샀거나 잔고가 음수`);
    R.ok(m.every(x => /잔고/.test(x.cashLine) && x.cashLine.includes(x.want)), `${c.name}: 진행 줄의 잔고가 실제와 다른 달 ${m.filter(x => !x.cashLine.includes(x.want)).length}개`);
    R.ok(r.end.cash && r.end.cash.n < 240 && r.end.cash.gap === 0 && Math.abs(r.end.money0 + r.end.cash.sum - r.end.money) < 1e-6, `${c.name}: 처음 잔고 ${r.end.money0} + 내역 합 ${r.end.cash && r.end.cash.sum} ≠ 마지막 잔고 ${r.end.money} (빠진 변동 ${r.end.cash && r.end.cash.gap}건)`);
    if (!c.auto) R.ok(all.every(x => !x.auto && !x.repAuto), `${c.name}: 자동 관리를 껐는데 자동 지출이 있음`);
    const spent = all.reduce((a, x) => a - (x.auto || 0), 0), sal = all.reduce((a, x) => a + (x.sal || 0), 0);
    R.note(c.name, `${d.months}개월(부분 갱신 ${d.n}달) · 시작 ${r.ev.starts}번 · 멈춤 ${r.ev.pauses} · 탭 왕복 ${r.ev.tabs} · 자금 버튼 ${d.minRows}~${d.maxRows}개 · 상태 영역 ${d.maxHstat}개 · 할 일 칸 위치 ${d.plan0}~${d.plan1}px · 버튼 ${d.minBtns}~${d.maxBtns} · 월급 합 ${sal} · 자동 지출 합 ${spent} · 잔고 ${r.end.money0} + 내역 ${JSON.stringify(r.end.cash.kinds)} = ${r.end.money} · 멈춘 장면 ${JSON.stringify(r.ev.scenes)}`);
  }
};
module.exports.run = run; module.exports.digest = digest; module.exports.SAVE = SAVE;
