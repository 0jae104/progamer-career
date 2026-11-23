// 큰돈의 쓸모(0.11.12): 자산 탭의 시즌 프로젝트 한 줄 안에서 전담 에이전트와 유소년 아카데미를 사고, 계약 제안·은퇴 화면·명예의 전당에서 결과를 본다.
// PC 헤드리스 크롬이며 실제 폰 검사가 아니다.
const { open } = require('./lib');
const { SAVE } = require('./apdom');
const SIZES = [[320, 568], [375, 667], [390, 664], [390, 844]];
// 에이전트 추천이 붙은 계약 제안에서 멈춘 저장 / 아카데미를 남기고 은퇴한 저장
const FIND_AG = () => { for (let seed = 700; seed < 760; seed++) { localStorage.clear(); localStorage.setItem('pg_tut_v1', '1'); PG._seen(); PG.seed(seed); PG.newGame({ nick: '가나다라마바사아자차', region: ['kr', 'cn', 'eu', 'na'][seed % 4], role: 'core', trait: 'brain' }); let n = 0; while (n++ < 30000 && !PG.state().over) { const S = PG.state(), sc = PG.scene(); if (!sc && S.org && !S.agent) { const o = PG.projInfo().opts.find(x => x.id === 'agent'); if (o.ok) PG.buyProj('agent'); } if (sc && sc.type === 'offers' && sc.offers.some(o => o.ag && o.squad === 'first') && sc.offers.length >= 4) { PG.save(); return localStorage.getItem('pg_career_v1'); } PG.autoStep(); } } return ''; };
const FIND_END = () => { localStorage.clear(); localStorage.setItem('pg_tut_v1', '1'); PG._seen(); PG.seed(811); PG.newGame({ nick: 'Haneul', region: 'kr', role: 'core', trait: 'brain' }); let n = 0, lv = 0; while (n++ < 40000 && !PG.state().over) { const S = PG.state(); if (!PG.scene() && S.org && lv < 2) { S.money += 110000; if (PG.buyProj('acad')) lv++; } PG.autoStep(); } PG.save(); return [localStorage.getItem('pg_career_v1'), localStorage.getItem('pg_legacy_v1'), PG.state().q[0].rid]; };

module.exports = async function spend(browser, url, R) {
  const mk = await open(browser, url), first = await mk.pg.evaluate(SAVE, [3, 'first']), agRaw = await mk.pg.evaluate(FIND_AG), end = await mk.pg.evaluate(FIND_END); await mk.ctx.close();
  R.ok(!!first && !!agRaw && !!end[0], '검사용 저장을 만들지 못함');
  const load = async (pg, raw, extra) => { await pg.evaluate(([x, ex]) => { localStorage.clear(); localStorage.setItem('pg_tut_v1', '1'); localStorage.setItem('pg_career_v1', x); if (ex) localStorage.setItem('pg_legacy_v1', ex); }, [raw, extra || '']); await pg.reload(); await pg.waitForTimeout(250); await pg.click('[data-act=continue]'); await pg.waitForTimeout(200); };
  const overX = pg => pg.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const box = pg => pg.evaluate(() => { const b = document.querySelector('.projbox'), S = PG.state(); return { h: b ? Math.round(b.getBoundingClientRect().height) : -1, page: document.documentElement.scrollHeight, rows: [...document.querySelectorAll('.projbox .prow')].map(r => ({ id: r.querySelector('.sbuy').dataset.id, dis: r.querySelector('.sbuy').disabled, h: Math.round(r.querySelector('.sbuy').getBoundingClientRect().height), w: Math.round(r.querySelector('.sbuy').getBoundingClientRect().width), t: r.querySelector('.sbuy').textContent, fs: Math.min(...[...r.querySelectorAll('b, span, small')].map(e => parseFloat(getComputedStyle(e).fontSize))) })), st: (document.querySelector('.projst') || {}).textContent || '', stH: document.querySelector('.projst') ? Math.round(document.querySelector('.projst').getBoundingClientRect().height) : 0, exp: document.querySelector('.projsum').getAttribute('aria-expanded'), money: S.money, agent: S.agent || null, acad: S.acad || null, proj: S.proj || null, moneyRows: document.querySelectorAll('.stagebg .moneyrow').length, dlg: document.querySelectorAll('[role=dialog]').length }; });

  for (const [w, h] of SIZES) {
    const { ctx, pg } = await open(browser, url, { w, h });
    // ---- 1) 접힌 한 줄: 아무것도 없을 때는 전과 같은 한 줄 ----
    await load(pg, first); await pg.evaluate(() => { PG.state().money = 12000; PG.state().cond = 80; }); await pg.click('[role=tab][data-id=money]'); await pg.waitForTimeout(80);
    const c0 = await box(pg);
    R.ok(c0.h > 0 && c0.rows.length === 0 && !c0.st && c0.exp === 'false' && c0.h <= (w <= 320 ? 84 : 66), `${w}×${h}: 접힌 시즌 프로젝트가 한 줄이 아님 ${JSON.stringify(c0)}`);
    // ---- 2) 펼침: 돈이 절반(1.5억)이 안 되면 아카데미는 목록에 없다. 에이전트는 있다 ----
    await pg.click('[data-act=projopen]'); await pg.waitForTimeout(60);
    let b = await box(pg);
    R.ok(b.rows.map(r => r.id).join() === 'camp,fan,agent' && b.rows.every(r => r.h >= 44 && r.w >= 44 && r.fs >= 12) && await overX(pg) <= 0 && b.dlg === 0, `${w}×${h}: 펼친 목록이 다름 ${JSON.stringify(b.rows)}`);
    R.ok(await pg.evaluate(() => /유소년 아카데미는 .*모으면 여기에 나온다/.test(document.querySelector('.projbox .fine').textContent) && /보장하지 않는다/.test(document.querySelector('.projbox').textContent)), `${w}×${h}: 아카데미가 언제 나오는지, 에이전트가 보장이 아니라는 안내가 없음`);
    // ---- 3) 에이전트: 한 번 눌러 사고, 빠르게 두 번 눌러도 한 번만, 다시 열어도 한 번만 ----
    const cost = await pg.evaluate(() => PG.projInfo().opts.find(x => x.id === 'agent').cost), m0 = b.money, seq0 = await pg.evaluate(() => PG.cash().seq);
    await pg.evaluate(() => { const x = document.querySelector('[data-act=proj][data-id=agent]'); x.click(); x.click(); }); await pg.waitForTimeout(80);
    b = await box(pg); const led = await pg.evaluate(q => PG.cash().all.filter(x => x.seq > q).map(x => [x.k, x.v, !!x.gap]), seq0);
    R.ok(b.money === m0 - cost && b.agent && b.agent.c === cost && b.proj && b.proj.id === 'agent' && led.length === 1 && led[0][0] === 'agent' && led[0][1] === -cost && !led[0][2], `${w}×${h}: 에이전트 구매가 한 번이 아니거나 장부와 다름 ${JSON.stringify([m0, cost, b.money, led])}`);
    R.ok(/전담 에이전트 완료/.test(await pg.evaluate(() => document.querySelector('.projsum').textContent)) && b.rows.length === 0 && b.moneyRows <= 1, `${w}×${h}: 산 뒤 상태 줄이 없거나 목록이 남아 있음 ${JSON.stringify(b)}`);
    await pg.reload(); await pg.waitForTimeout(250); await pg.click('[data-act=continue]'); await pg.waitForTimeout(150); await pg.click('[role=tab][data-id=money]'); await pg.waitForTimeout(60);
    b = await box(pg);
    R.ok(b.agent && b.agent.c === cost && b.money === m0 - cost && /전담 에이전트 완료/.test(await pg.evaluate(() => document.querySelector('.projsum').textContent)) && b.exp === 'false' && b.h - c0.h <= 40, `${w}×${h}: 다시 연 뒤 에이전트 계약이 다르거나 접힌 높이가 40px 넘게 늘어남 ${JSON.stringify([c0.h, b.h, b.stH, b.st])}`);
    R.ok(await pg.evaluate(() => !PG.buyProj('agent') && !PG.buyProj('camp') && !PG.buyProj('acad')), `${w}×${h}: 다시 연 뒤 같은 시즌에 또 살 수 있음`);
    // ---- 4) 아카데미: 돈이 있으면 목록에 나오고, 두 번 눌러야 산다. 다른 곳을 누르면 풀린다 ----
    await load(pg, first); await pg.evaluate(() => { PG.state().money = 45000; }); await pg.click('[role=tab][data-id=money]'); await pg.waitForTimeout(60); await pg.click('[data-act=projopen]'); await pg.waitForTimeout(60);
    b = await box(pg); R.ok(b.rows.map(r => r.id).join() === 'camp,fan,agent,acad' && await overX(pg) <= 0, `${w}×${h}: 돈이 있는데 아카데미가 목록에 없음 ${JSON.stringify(b.rows)}`);
    await pg.click('[data-act=proj][data-id=acad]'); await pg.waitForTimeout(450);
    b = await box(pg); let ac = b.rows.find(r => r.id === 'acad');
    R.ok(b.money === 45000 && !b.acad && /한 번 더/.test(ac.t) && ac.h >= 44, `${w}×${h}: 첫 번째 누름에 바로 샀거나 확인 표시가 없음 ${JSON.stringify([b.money, ac])}`);
    await pg.click('[data-act=projopen]'); await pg.waitForTimeout(450); await pg.click('[data-act=projopen]'); await pg.waitForTimeout(450);
    b = await box(pg); ac = b.rows.find(r => r.id === 'acad'); R.ok(!/한 번 더/.test(ac.t) && b.money === 45000, `${w}×${h}: 다른 곳을 눌러도 확인 상태가 풀리지 않음`);
    const q1 = await pg.evaluate(() => PG.cash().seq);
    await pg.click('[data-act=proj][data-id=acad]'); await pg.waitForTimeout(450); await pg.evaluate(() => { const x = document.querySelector('[data-act=proj][data-id=acad]'); x.click(); x.click(); }); await pg.waitForTimeout(80);
    b = await box(pg); const led2 = await pg.evaluate(q => PG.cash().all.filter(x => x.seq > q).map(x => [x.k, x.v]), q1);
    R.ok(b.money === 15000 && b.acad && b.acad.lv === 1 && b.acad.paid === 30000 && led2.length === 1 && led2[0][0] === 'acad' && led2[0][1] === -30000 && /유소년 아카데미 완료/.test(await pg.evaluate(() => document.querySelector('.projsum').textContent)), `${w}×${h}: 아카데미 구매가 한 번이 아니거나 장부와 다름 ${JSON.stringify([b.money, b.acad, led2, b.st])}`);
    R.ok(await pg.evaluate(() => /유소년 아카데미에 3억을 썼다/.test(document.querySelector('.projbox').textContent) && /지금까지 3억/.test(document.querySelector('.projbox').textContent)), `${w}×${h}: 자산 탭에 얼마를 썼는지가 보이지 않음`);
    // 접힌 높이: 에이전트 + 아카데미가 함께 있을 때도 40px 안쪽
    await pg.evaluate(() => { PG.state().agent = { y: PG.state().year - 1, c: 500 }; PG.state().proj.y -= 1; PG.state().acad.ys[0] -= 1; PG_UI.state.projOpen = false; PG_UI.render(); }); b = await box(pg);   // 다음 시즌의 모습: 고르지 않음 + 상태 줄(에이전트 대기, 아카데미)
    R.ok(b.h - c0.h <= 40 && b.stH > 0 && await overX(pg) <= 0, `${w}×${h}: 에이전트와 아카데미가 함께 있을 때 접힌 높이가 40px 넘게 늘어남(${c0.h} → ${b.h})`);
    R.note(`자산 탭 시즌 프로젝트 ${w}×${h}`, `접힌 높이 ${c0.h}px → 에이전트+아카데미 상태 줄 포함 ${b.h}px(+${b.h - c0.h})`);
    // ---- 5) 자동진행 한 시즌: 새 항목을 알아서 사지 않고, 자금 줄은 하나 ----
    await pg.evaluate(() => { delete PG.state().agent; window.__pgApMs = 10; PG.save(); }); await pg.evaluate(() => { window.__pgApMs = 10; }); await pg.click('[role=tab][data-id=home]'); await pg.waitForTimeout(60);
    const a0 = await pg.evaluate(() => ({ lv: PG.state().acad.lv, paid: PG.state().acad.paid, y: PG.state().year, proj: JSON.stringify(PG.state().proj) }));
    for (let k = 0, mo = 0; k < 30 && mo < 10; k++) { for (let i = 0; i < 40 && await pg.evaluate(() => !!PG.scene() && !PG.state().over); i++) { await pg.evaluate(() => { const w = document.querySelector('[data-act=wskip]'); if (w) return w.click(); const kk = document.querySelector('[data-act=kick][data-id=none]'); if (kk) return kk.click(); const x = [...document.querySelectorAll('.veil .sheet [data-act], .arena [data-act]')].find(x => !x.disabled && !['snd', 'retire', 'reroll', 'mom-auto', 'tac', 'wfast', 'transfer'].includes(x.dataset.act)); if (x) x.click(); }); await pg.waitForTimeout(30); } if (!await pg.$('[data-act=ap-go]')) break; await pg.click('[data-act=ap-go]'); await pg.waitForTimeout(40); if (await pg.$('.sheet [data-act=ap-start]')) await pg.click('.sheet [data-act=ap-start]'); await pg.waitForFunction(() => !PG_UI.ap.on, null, { timeout: 60000 }).catch(() => {}); mo = await pg.evaluate(y => (PG.state().year - y) * 10 + PG.state().m, a0.y); }
    const a1 = await pg.evaluate(() => ({ lv: PG.state().acad ? PG.state().acad.lv : 0, paid: PG.state().acad ? PG.state().acad.paid : 0, agent: PG.state().agent || null, y: PG.state().year, rows: document.querySelectorAll('.stagebg .moneyrow').length, neg: PG.state().money < 0, projY: PG.state().proj ? PG.state().proj.y : 0 }));
    R.ok(a1.lv === a0.lv && a1.paid === a0.paid && !a1.agent && a1.rows <= 1 && !a1.neg && a1.projY <= a0.y, `${w}×${h}: 자동진행이 새 항목을 샀거나 자금 줄이 여럿 ${JSON.stringify([a0, a1])}`);
    // ---- 6) 계약 제안의 에이전트 추천 ----
    await load(pg, agRaw);
    const of = await pg.evaluate(() => { const sc = PG.scene(); return { type: sc.type, n: sc.offers.length, ag: sc.offers.filter(o => o.ag).length, tags: document.querySelectorAll('.offer .agtag').length, cards: document.querySelectorAll('.offer').length, msg: /에이전트가/.test(sc.msg), btnH: Math.min(...[...document.querySelectorAll('.offer .btn')].map(e => e.getBoundingClientRect().height)), agent: PG.state().agent || null, i: sc.offers.findIndex(o => o.ag), org: sc.offers.find(o => o.ag).org }; });
    R.ok(of.type === 'offers' && of.ag === 1 && of.tags === 1 && of.cards === of.n && of.msg && !of.agent && of.btnH >= 44 && await overX(pg) <= 0, `${w}×${h}: 에이전트 추천이 화면과 다름 ${JSON.stringify(of)}`);
    await pg.click(`[data-act=accept][data-i="${of.i}"]`); await pg.waitForTimeout(120);
    R.ok(await pg.evaluate(o => PG.state().org === o && !PG.state().agent, of.org), `${w}×${h}: 에이전트 추천 제안과 계약하지 못함`);
    // ---- 7) 은퇴 화면과 명예의 전당 ----
    await load(pg, end[0], end[1]);
    const rt = await pg.evaluate(() => { const e = document.querySelector('.retire .acadend'), sc = PG.scene(); return { t: e ? e.textContent : '', life: sc.life, acad: sc.acad, grade: !!document.querySelector('.retire .grade') }; });
    R.ok(rt.acad && rt.acad.lv === 2 && rt.t.includes(rt.life) && rt.t.includes('2단계') && rt.t.includes(`${rt.acad.grads}명`) && rt.grade && await overX(pg) <= 0, `${w}×${h}: 은퇴 화면에 아카데미가 없음 ${JSON.stringify(rt)}`);
    const rec = await pg.evaluate(id => { const r = PG.hallGet(id); return r ? [r.acadLv, r.acadGrads, r.acadPaid] : null; }, end[2]);
    R.ok(rec && rec[0] === 2 && rec[1] === rt.acad.grads && rec[2] === rt.acad.paid, `${w}×${h}: 명예의 전당 기록에 아카데미가 없음 ${JSON.stringify(rec)}`);
    R.ok(!pg.errs.length, `${w}×${h}: 화면 오류 ${pg.errs.join(' / ')}`);
    await ctx.close();
  }
};
