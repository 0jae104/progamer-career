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
    const sc = (window.__script || []).find(x => x.at === window.__calls); window.__calls = (window.__calls || 0) + 1;
    if (sc && !PG.scene()) { const S0 = PG.state(); if (sc.cond != null) S0.cond = sc.cond; if (sc.wrist != null) S0.wrist = sc.wrist; }
    const before = PG.state().money, seq = PG.cash ? PG.cash().seq : null, r = f.apply(this, arguments);
    setTimeout(() => {
      const S = PG.state(), q = s => document.querySelectorAll(s), mr = q('.stagebg .moneyrow'), hs = q('.stagebg .hstat .hs b'), pause = document.querySelector('[data-act=ap-pause]');
      const pr = pause ? pause.getBoundingClientRect() : null, hit = pr ? document.elementFromPoint(pr.left + pr.width / 2, pr.top + pr.height / 2) : null;
      const row = { on: PG_UI.ap.on, k: r.k, stop: r.stop || '', before, money: S.money, rows: mr.length, hstat: q('.stagebg .hstat').length, btns: q('.stagebg button').length - q('#fbox button').length, nodes: q('.stagebg *').length - q('#fbox, #fbox *').length,   /* 최근 진행 칸은 따로 본다 */
        docH: document.documentElement.scrollHeight, mainH: Math.round((document.querySelector('.stagebg .lower') || document.body).getBoundingClientRect().height), planTop: Math.round((document.querySelector('.stagebg .plan5') || document.body).getBoundingClientRect().top), viewH: window.innerHeight,
        shown: mr.length ? mr[mr.length - 1].querySelector('b').textContent : '', first: mr.length ? mr[0].querySelector('b').textContent : '', want: PG.fmtMoney(S.money),
        hs: [...hs].map(b => b.textContent).join(','), hsWant: hs.length ? [S.cond, S.wrist, S.trust, S.fame].map(v => String(Math.round(v))).join(',') : '',
        ovr: (document.querySelector('.lower .ovr b') || {}).textContent || '', ovrWant: String(Math.floor(PG.ovr())),
        pause: pause ? (pr.height >= 44 && pr.bottom <= window.innerHeight + 1 && !!hit && (hit === pause || pause.contains(hit))) : null,
        goals: q('.stagebg .goal').length, gbox: q('#gbox').length, hbox: q('#hbox').length, aplines: q('#apline').length, apcashes: q('#apcash').length,
        line: (document.getElementById('apline') || {}).textContent || '', cashLine: (document.getElementById('apcash') || {}).textContent || '', plan: q('.stagebg .plan5 button').length };
      if (PG.cash && seq != null) { const c = PG.cash(), it = c.all.filter(x => x.seq > seq); row.led = it.reduce((a, x) => a + x.v, 0); row.gap = it.some(x => x.gap); row.auto = it.filter(x => x.k === 'auto').reduce((a, x) => a + x.v, 0); row.sal = it.filter(x => x.k === 'sal').reduce((a, x) => a + x.v, 0); }
      const lr = PG.lastRep(); if (r.k && lr) { row.repSal = lr.salary || 0; row.repAuto = lr.auto ? lr.auto.spent : 0; row.repItems = lr.auto ? lr.auto.items.filter(x => !x.why).map(x => x.id) : []; row.bal = lr.auto ? lr.auto.bal : null; }
      // 목표 칸(0.11.7): 자금 바로 다음, 할 일 바로 앞. 요약의 글이 엔진의 지금 목표와 같은지
      const gEl = document.querySelector('.stagebg .goal'), gBtn = gEl && gEl.querySelector('.goalbtn'), mrow = mr[0], p5 = document.querySelector('.stagebg .plan5');
      if (gEl && gBtn && PG.goalNow) {
        const sg = PG.goalNow(), g = PG.goal(), txt = gBtn.textContent, F = Node.DOCUMENT_POSITION_FOLLOWING;
        row.goalOk = txt.includes(g.title) && txt.includes(`${g.items.filter(i => i.ok).length}/${g.items.length}`) && (!sg || (txt.includes(sg.t) && (!sg.txt || txt.includes(sg.txt))));
        row.goalTxt = txt.replace(/\s+/g, ' ').slice(0, 90); row.goalOpen = gBtn.getAttribute('aria-expanded'); row.bars = gEl.querySelectorAll('.gi').length; row.barsWant = g.items.length;
        row.order = !!mrow && !!p5 && !!(mrow.compareDocumentPosition(gEl) & F) && !!(gEl.compareDocumentPosition(p5) & F) && mrow.getBoundingClientRect().bottom <= gEl.getBoundingClientRect().top + 1 && gEl.getBoundingClientRect().bottom <= p5.getBoundingClientRect().top + 1;
        const main = document.querySelector('main.content'); row.firstKid = main && main.firstElementChild ? main.firstElementChild.id : '';
        row.goalH = Math.round(gEl.getBoundingClientRect().height); row.planBottom = Math.round(p5.getBoundingClientRect().bottom); row.footTop = Math.round(document.querySelector('.foot').getBoundingClientRect().top);
      }
      // 이번 달 할 일(0.11.8): 눌린 버튼·이름·자동 휴식 안내가 엔진의 지금 할 일과 같은지. 라이벌전 줄도 엔진의 이번 달 대진과 같은지
      const pb = [...q('.stagebg .plan5 button')], on = pb.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.id), fxEl = document.querySelector('.stagebg .planfx'), fxT = fxEl ? fxEl.textContent : '';
      const A = PG.apInfo(), cur = PG.D.PLANS.find(x => x.id === S.plan), bk = A.back && S.plan === 'rest' ? PG.D.PLANS.find(x => x.id === A.back) : null;
      row.planNow = S.plan; row.back = A.back || ''; row.pressed = on.join(','); row.planTxt = fxT.replace(/\s+/g, ' ').slice(0, 70);
      row.planOk = on.length === 1 && on[0] === S.plan && fxT.includes(cur.name) && fxT.includes(cur.desc) && (bk ? /자동 휴식 중/.test(fxT) && fxT.includes(bk.name) : !/자동 휴식 중/.test(fxT));
      if (!window.__pb) window.__pb = pb[0]; row.planSame = window.__pb === pb[0]; window.__pb = pb[0];   // 같은 버튼 요소인지(다시 만들어졌는지)
      const fxs = PG.rivalFixtures(), rc = q('.stagebg .rvcard'), rt = rc.length ? (rc[0].getAttribute('aria-label') || '') : '';
      row.rvWant = fxs.length; row.rvCards = rc.length; row.rvOk = fxs.length ? rc.length === 1 && fxs.every(f => rt.includes(f.nick) && rt.includes(`통산 ${f.w}승 ${f.l}패`)) : rc.length === 0;
      row.cond = Math.round(S.cond); row.wrist = Math.round(S.wrist); row.fresh = !!window.__fresh; window.__fresh = false;   // fresh = 이 달 앞에서 자동진행을 (다시) 시작했다: 화면을 통째로 그린 직후
      // 0.11.9: 진행 줄의 성장 토막이 엔진의 방금 보고(lastRep)와 같은지, 시즌 프로젝트를 자동으로 사지 않았는지
      if (PG.projInfo) { const lr0 = PG.lastRep(), g0 = lr0 && (lr0.growth || []).slice().sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0], a0 = lr0 ? Math.floor(lr0.o0 + 1e-9) : 0, b0 = lr0 ? Math.floor(lr0.o1 + 1e-9) : 0;
        row.growOk = !!lr0 && typeof lr0.o1 === 'number' && row.line.includes(a0 !== b0 ? `OVR ${a0}→${b0}` : `OVR ${lr0.o1.toFixed(1)}`) && (!g0 || row.line.includes(`${g0[0]} ${g0[1] > 0 ? '+' : ''}${g0[1]}`)) && Math.abs(lr0.o1 - Math.round(PG.ovr() * 10) / 10) < .051;
        row.proj = !!S.proj; const ael = document.getElementById('apline'); row.lineH = ael ? Math.round(ael.getBoundingClientRect().height) : 0; if (!ael) row.growOk = null; }
      // 최근 진행(0.11.10): 칸은 하나, 같은 일이 두 번 없고, 성장 숫자가 엔진의 요약과 같다
      { const fb = q('#fbox'), rc = PG.recap(), fd = [...q('#fbox .fd')], keys = fd.map(e => e.dataset.k), chips = [...q('#fbox .chips.grow .chip')].map(e => e.textContent);
        row.feedN = fb.length; row.recapN = q('.stagebg .recap').length; row.feedDup = keys.length - new Set(keys).size; row.feedLines = fd.length; row.feedH = fb.length ? Math.round(fb[0].getBoundingClientRect().height) : 0;
        if (fb.length && rc && rc.n && typeof rc.o0 === 'number') { const a = Math.floor(rc.o0 + 1e-9), b = Math.floor(rc.o1 + 1e-9), top = rc.g.slice().sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 2).map(g => `${g[0]} ${g[1] > 0 ? '+' : ''}${g[1]}`);
          row.feedOk = chips[0] === (a !== b ? `OVR ${a} → ${b}` : `OVR ${b} · 다음까지 ${(Math.round((b + 1 - rc.o1) * 10) / 10).toFixed(1)}`) && top.every(t => chips.includes(t)) && chips.length === top.length + 1 && Math.abs(rc.o1 - Math.round(PG.ovr() * 10) / 10) < .051 && fb[0].textContent.includes(`${rc.w}승 ${rc.l}패`) === (rc.w + rc.l > 0) && !/평균 평점/.test(fb[0].textContent); }
        else row.feedOk = fb.length ? null : (rc && rc.n ? false : null); }
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
  await pg.evaluate(() => { window.__fresh = true; }); await pg.click('[data-act=ap-go]'); await pg.waitForTimeout(40);
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
  await pg.evaluate(a => { window.__script = a.script || []; window.__calls = 0; if (a.plan) PG.setPlan(a.plan); if (a.rest != null) PG.setAp('rest', a.rest); if (a.injury0) { PG.state().injury = 0; } }, { script: o.script, plan: o.plan, rest: o.rest, injury0: o.script ? 1 : 0 });
  await pg.evaluate(HOOK);
  if (o.goalOpen) { await pg.click('[data-act=goalopen]'); await pg.waitForTimeout(40); }
  const money0 = await pg.evaluate(() => PG.state().money);
  const ev = { starts: 0, pauses: 0, tabs: 0, scenes: {} };
  let guard = 0, paused = false, tabbed = false, planned = false;
  while (await months(pg) < o.want && guard++ < 200) {
    if (!await go(pg)) break; ev.starts++;
    const n0 = await months(pg);
    if (o.pauseAt != null && !paused && n0 >= o.pauseAt) {   // 달리는 중에 멈춤을 누르고 다시 시작한다
      await pg.waitForFunction(n => window.__ap.reduce((a, x) => a + x.k, 0) > n || !PG_UI.ap.on, n0, { timeout: 30000 });
      if (await pg.evaluate(() => { const b = document.querySelector('[data-act=ap-pause]'); if (!PG_UI.ap.on || !b) return false; b.click(); return !PG_UI.ap.on; })) { paused = true; ev.pauses++; }
    }
    if (o.planAt != null && !planned && n0 >= o.planAt) {   // 달리는 중에 이번 달 할 일을 한 번 눌러 바꾼다
      await pg.waitForFunction(n => window.__ap.reduce((a, x) => a + x.k, 0) > n || !PG_UI.ap.on, n0, { timeout: 30000 });
      const pr = await pg.evaluate(() => { if (!PG_UI.ap.on) return null; const cur = PG.state().plan, b = [...document.querySelectorAll('.stagebg .plan5 button')].find(x => x.dataset.id !== cur && !x.disabled && x.getAttribute('aria-pressed') !== 'true'); if (!b) return null; const r = b.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); const seen = r.bottom <= document.querySelector('.foot').getBoundingClientRect().top + 1 && !!hit && (hit === b || b.contains(hit)); b.click(); return { from: cur, want: b.dataset.id, now: PG.state().plan, seen, on: PG_UI.ap.on, goals: document.querySelectorAll('.stagebg .goal').length, rows: document.querySelectorAll('.stagebg .moneyrow').length }; });
      if (pr) { planned = true; ev.plan = pr; }
    }
    await stopped(pg); await pg.waitForTimeout(30);
    const sc = await pg.evaluate(() => (PG.scene() ? PG.scene().type : '')); if (sc) ev.scenes[sc] = (ev.scenes[sc] || 0) + 1;
    if (o.tabAt && !tabbed && await months(pg) >= o.tabAt) {   // 자산 탭에 다녀온다(자금 줄을 눌러서 가고, 아래 탭으로 돌아온다)
      await clear(pg);
      if (!await pg.evaluate(() => PG.state().over)) { await pg.click('.stagebg .moneyrow'); await pg.waitForTimeout(60); ev.toMoney = await pg.evaluate(() => PG_UI.state.tab); await pg.click('[role=tab][data-id=home]'); await pg.waitForTimeout(60); tabbed = true; ev.tabs++; }
    }
  }
  await pg.waitForTimeout(40);
  const log = await pg.evaluate(() => window.__ap), end = await pg.evaluate(() => ({ rows: document.querySelectorAll('.stagebg .moneyrow').length, goals: document.querySelectorAll('.stagebg .goal').length, hstat: document.querySelectorAll('.stagebg .hstat').length, over: PG.state().over, ver: PG.VERSION, err: window.__pgApError || window.__pgRenderError || '', money: PG.state().money, cash: PG.cash ? (c => ({ n: c.all.length, sum: c.all.reduce((a, x) => a + x.v, 0), gap: c.all.filter(x => x.gap).length, kinds: c.all.reduce((o, x) => (o[x.k] = (o[x.k] || 0) + x.v, o), {}) }))(PG.cash()) : null }));
  end.money0 = money0;
  const errs = pg.errs.slice(); await ctx.close();
  return { log, ev, end, errs };
}
// 기록에서 숫자를 뽑는다
function digest(log) {
  const m = log.filter(x => x.k && !x.stop && x.on);   // 달이 넘어갔고 계속 달리는 중(부분 갱신이 일어난 달)
  const max = (a, f) => a.reduce((v, x) => Math.max(v, f(x)), 0);
  const cont = x => { const i = log.indexOf(x), p = log[i - 1]; return !x.fresh && !!p && p.k > 0 && !p.stop && p.on; };   // 앞 달도 멈추지 않고 달린 달(그 사이에 화면을 통째로 다시 그리지 않았다)
  let grow = 0, run = 0; for (let i = 1; i < m.length; i++) { if (m[i].planTop > m[i - 1].planTop) { run++; grow = Math.max(grow, run); } else run = 0; }
  return { plan0: m.length ? m[0].planTop : 0, plan1: m.length ? Math.max(...m.map(x => x.planTop)) : 0, n: m.length, months: log.reduce((a, x) => a + x.k, 0), maxRows: max(m, x => x.rows), maxHstat: max(m, x => x.hstat), minRows: m.reduce((v, x) => Math.min(v, x.rows), 99), maxMainH: max(m, x => x.mainH), minMainH: m.reduce((v, x) => Math.min(v, x.mainH), 1e9), maxDocH: max(m, x => x.docH), maxBtns: max(m, x => x.btns), minBtns: m.reduce((v, x) => Math.min(v, x.btns), 1e9), maxNodes: max(m, x => x.nodes), minNodes: m.reduce((v, x) => Math.min(v, x.nodes), 1e9),
    staleMoney: m.filter(x => x.first !== x.want).length, badMoney: m.filter(x => x.shown !== x.want).length, badStat: m.filter(x => x.hs !== x.hsWant).length, badOvr: m.filter(x => x.ovr !== x.ovrWant).length, badPause: m.filter(x => x.pause !== true).length, growRun: grow,
    badGoalN: m.filter(x => x.goals !== 1 || x.gbox !== 1 || x.hbox !== 1 || x.aplines !== 1 || x.apcashes !== 1).length, badGoalTxt: m.filter(x => x.goalOk !== true).length, badOrder: m.filter(x => x.order !== true || x.firstKid !== 'gbox').length, goalTexts: new Set(m.map(x => x.goalTxt)).size, maxGoalH: max(m, x => x.goalH || 0), badPlanSeen: m.filter(x => !(x.planBottom <= x.footTop + 1)).length,
    badPlan: m.filter(x => x.planOk !== true).length, badRv: m.filter(x => x.rvOk !== true).length, rvMonths: m.filter(x => x.rvWant > 0).length, rests: m.filter((x, i) => x.planNow === 'rest' && x.back && (i === 0 || m[i - 1].planNow !== 'rest')).length, backs: m.filter((x, i) => i > 0 && m[i - 1].planNow === 'rest' && m[i - 1].back && x.planNow !== 'rest' && !x.back).length,
    badFeedN: m.filter(x => x.feedN > 1 || x.recapN > 1).length, noFeed: m.filter(x => x.feedN === 0).length, feedDup: m.reduce((a, x) => a + (x.feedDup || 0), 0), badFeed: m.filter(x => x.feedOk === false).length, maxFeedLines: max(m, x => x.feedLines || 0), maxFeedH: max(m, x => x.feedH || 0), feedTexts: new Set(m.map(x => x.feedH + '|' + x.feedLines)).size,
    badGrow: m.filter(x => x.growOk === false).length, anyProj: log.filter(x => x.proj).length, maxLineH: max(m, x => x.lineH || 0),
    rebuilt: m.filter((x, i) => i > 0 && !x.planSame).length, needless: m.filter((x, i) => i > 0 && !x.planSame && x.planNow === m[i - 1].planNow && x.back === m[i - 1].back && cont(x)).length };
}
module.exports = async function apdom(browser, url, R) {
  const mk = await open(browser, url), first = await mk.pg.evaluate(SAVE, [3, 'first']), second = await mk.pg.evaluate(SAVE, [4, 'second']); await mk.ctx.close();
  R.ok(!!first && !!second, '검사용 저장(1군·2군)을 만들지 못함');
  const AUTO = ['counsel', 'physio', 'analyst', 'gear', 'coach', 'care'];
  const cases = [
    { name: '390×844 1군 24개월(자동 관리 켬, 멈춤·재개, 자산 탭 왕복, 달리는 중 할 일 바꾸기)', raw: first, w: 390, h: 844, want: 24, auto: AUTO, give: 3000, pauseAt: 3, tabAt: 6, planAt: 8, seed: 11 },
    { name: '320×568 1군 24개월(자동 관리 켬, 달리는 중 할 일 바꾸기)', raw: first, w: 320, h: 568, want: 24, auto: AUTO, give: 3000, pauseAt: 2, tabAt: 5, planAt: 9, seed: 12 },
    { name: '390×844 2군 24개월(목표를 펼쳐 둔 채로)', raw: second, w: 390, h: 844, want: 24, goalOpen: true, pauseAt: 0, tabAt: 7, seed: 15 },
    { name: '320×568 2군 12개월(목표를 펼쳐 둔 채로)', raw: second, w: 320, h: 568, want: 12, goalOpen: true, seed: 16 },
    { name: '375×812 2군 12개월(자동 관리 끔)', raw: second, w: 375, h: 812, want: 12, pauseAt: 0, tabAt: 3, seed: 13 },
    // 정해 둔 값(0.11.8): 스크림으로 시작해 컨디션을 낮춰 자동 휴식 → 회복시켜 복귀 → 손목을 낮춰 다시 휴식 → 복귀. 난수에 맡기지 않는다
    { name: '390×844 1군 자동 휴식·복귀(정해 둔 값)', raw: first, w: 390, h: 844, want: 14, plan: 'scrim', rest: true, seed: 21, restCase: true, script: [{ at: 1, cond: 22, wrist: 90 }, { at: 3, cond: 96, wrist: 90 }, { at: 6, cond: 90, wrist: 24 }, { at: 8, cond: 96, wrist: 92 }, { at: 10, cond: 30, wrist: 90 }, { at: 12, cond: 97, wrist: 92 }] },
    { name: '320×568 1군 자동 휴식·복귀(정해 둔 값, 분석에서 시작)', raw: first, w: 320, h: 568, want: 12, plan: 'review', rest: true, seed: 22, restCase: true, script: [{ at: 1, cond: 18, wrist: 88 }, { at: 3, cond: 95, wrist: 90 }, { at: 5, cond: 92, wrist: 20 }, { at: 7, cond: 96, wrist: 91 }] },
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
    R.ok(d.maxBtns - d.minBtns <= 2 && d.maxNodes - d.minNodes <= (c.goalOpen ? 24 : 16),   // 목표를 펼쳐 두면 목표의 종류에 따라 조건 막대 수가 달라진다
      `${c.name}: 달리는 중 버튼·요소 수가 크게 변함(라이벌전 줄처럼 달에 따라 있고 없는 것만 허용)(버튼 ${d.minBtns}~${d.maxBtns}, 요소 ${d.minNodes}~${d.maxNodes})`);
    R.ok(d.growRun <= 1 && d.plan1 - d.plan0 <= (c.goalOpen ? 60 : 24) && d.maxMainH - d.minMainH <= 24, `${c.name}: 달리는 중 이번 달 할 일 칸이 아래로 밀림(${d.plan0}→${d.plan1}px, 이어서 밀린 달 ${d.growRun}, 위 칸 높이 ${d.minMainH}~${d.maxMainH}px)`);
    if (!c.goalOpen) R.ok(d.plan1 < c.h - 150, `${c.name}: 이번 달 할 일 칸이 화면 아래쪽으로 밀려남(${d.plan1}px / 화면 ${c.h}px)`);
    R.ok(m.every(x => x.plan === 5), `${c.name}: 이번 달 할 일 다섯 칸이 사라진 달이 있음`);
    // 목표 칸(0.11.7): 달마다 정확히 하나, 자금 바로 다음·할 일 바로 앞, 요약의 글이 엔진의 지금 목표와 같다. 진행 줄·자금 줄도 하나씩
    R.ok(d.badGoalN === 0 && r.end.goals === 1, `${c.name}: 목표 칸·상자·진행 줄이 하나가 아닌 달 ${d.badGoalN}개(끝난 뒤 목표 ${r.end.goals}개)`);
    R.ok(d.badGoalTxt === 0, `${c.name}: 목표 요약이 실제 목표·진척과 다른 달 ${d.badGoalTxt}개 ${JSON.stringify(m.filter(x => x.goalOk !== true).slice(0, 2).map(x => x.goalTxt))}`);
    R.ok(d.badOrder === 0, `${c.name}: 순서가 자금 → 목표 → 이번 달 할 일이 아닌 달 ${d.badOrder}개`);
    if (c.goalOpen) R.ok(m.every(x => x.goalOpen === 'true' && x.bars === x.barsWant && x.bars > 0), `${c.name}: 펼쳐 둔 목표가 달리는 중에 접히거나 막대가 사라짐`);
    else { R.ok(m.every(x => x.goalOpen === 'false' && x.bars === 0), `${c.name}: 접어 둔 목표가 달리는 중에 펼쳐짐`); R.ok(d.badPlanSeen === 0 && d.maxGoalH <= (c.w <= 320 ? 112 : 90), `${c.name}: 접힌 목표 때문에 할 일 다섯 칸이 첫 화면 밖으로 나간 달 ${d.badPlanSeen}개(목표 높이 최대 ${d.maxGoalH}px)`); }
    // 이번 달 할 일(0.11.8): 달마다 눌린 버튼 하나 = 엔진의 지금 할 일, 설명과 자동 휴식 안내도 같다. 라이벌전 줄 = 엔진의 이번 달 대진
    R.ok(d.badPlan === 0, `${c.name}: 화면의 이번 달 할 일이 실제와 다른 달 ${d.badPlan}개 ${JSON.stringify(m.filter(x => x.planOk !== true).slice(0, 3).map(x => `실제 ${x.planNow}(돌아갈 일 ${x.back || '-'}) / 화면 ${x.pressed} "${x.planTxt}"`))}`);
    R.ok(d.badRv === 0, `${c.name}: 화면의 라이벌전 줄이 이번 달 대진과 다른 달 ${d.badRv}개(라이벌전이 있는 달 ${d.rvMonths}개) ${JSON.stringify(m.filter(x => x.rvOk !== true).slice(0, 3).map(x => `대진 ${x.rvWant} / 줄 ${x.rvCards}`))}`);
    R.ok(d.needless === 0, `${c.name}: 할 일이 바뀌지 않았는데 버튼이 다시 만들어진 달 ${d.needless}개`);
    R.ok(d.badGrow === 0 && d.anyProj === 0, `${c.name}: 진행 줄의 성장 표시가 엔진의 보고와 다른 달 ${d.badGrow}개, 자동으로 산 시즌 프로젝트 ${d.anyProj}`);
    R.ok(d.maxLineH <= (c.w <= 330 ? 44 : 50), `${c.name}: 진행 줄이 너무 길어짐(높이 ${d.maxLineH}px)`);
    R.ok(d.badFeedN === 0 && d.noFeed === 0 && d.feedDup === 0 && d.badFeed === 0 && d.maxFeedLines <= 2, `${c.name}: 최근 진행 — 칸이 둘 이상인 달 ${d.badFeedN}, 칸이 없는 달 ${d.noFeed}, 같은 일이 두 번 나온 횟수 ${d.feedDup}, 성장 숫자가 엔진과 다른 달 ${d.badFeed}, 접힌 줄 수 최대 ${d.maxFeedLines}`);
    if (c.restCase) R.ok(d.rests >= 2 && d.backs >= 2, `${c.name}: 자동 휴식 ${d.rests}번·복귀 ${d.backs}번(각 2번 이상 일어나야 검사가 된다) ${m.map(x => `${x.planNow}${x.back ? '(' + x.back + ')' : ''}`).join('→')}`);
    if (c.planAt != null) R.ok(!!r.ev.plan && r.ev.plan.seen && r.ev.plan.now === r.ev.plan.want && r.ev.plan.goals === 1 && r.ev.plan.rows === 1, `${c.name}: 달리는 중에 할 일을 한 번 눌러 바꾸지 못함 ${JSON.stringify(r.ev.plan)}`);
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
    R.note(c.name, `${d.months}개월(부분 갱신 ${d.n}달) · 시작 ${r.ev.starts}번 · 멈춤 ${r.ev.pauses} · 탭 왕복 ${r.ev.tabs} · 자금 버튼 ${d.minRows}~${d.maxRows}개 · 상태 영역 ${d.maxHstat}개 · 할 일 칸 위치 ${d.plan0}~${d.plan1}px · 버튼 ${d.minBtns}~${d.maxBtns} · 월급 합 ${sal} · 자동 지출 합 ${spent} · 잔고 ${r.end.money0} + 내역 ${JSON.stringify(r.end.cash.kinds)} = ${r.end.money} · 목표 칸 항상 1개, 요약이 바뀐 횟수 ${d.goalTexts}가지, 높이 최대 ${d.maxGoalH}px· 최근 진행 칸 항상 1개(높이 최대 ${d.maxFeedH}px, 접힌 줄 최대 ${d.maxFeedLines}) · 할 일 표시 불일치 ${d.badPlan}달(자동 휴식 ${d.rests}번·복귀 ${d.backs}번, 버튼을 다시 만든 달 ${d.rebuilt}개) · 라이벌전 줄 불일치 ${d.badRv}달(라이벌전 달 ${d.rvMonths}개)${c.restCase ? ` · 달마다 ${m.map(x => `${x.planNow}${x.back ? '←' + x.back : ''}[${x.pressed}]`).join(' ')}` : ''}${r.ev.plan ? ` · 달리는 중 할 일 ${r.ev.plan.from}→${r.ev.plan.now}(자동진행 ${r.ev.plan.on ? '계속' : '멈춤'})` : ''} · 멈춘 장면 ${JSON.stringify(r.ev.scenes)}`);
  }
};
module.exports.run = run; module.exports.digest = digest; module.exports.SAVE = SAVE;
