// 플레이 화면(0.11.1): 한 화면에서 할 일 바꾸기·진행·자동 관리. PC 헤드리스 크롬이며 실제 폰 검사가 아니다.
const { open, auditor, A11Y, snap } = require('./lib');
// 검사용 저장: 1군, 처음 안내가 끝남, 뜬 창 없음, 돈은 넉넉하게
const MAKE = money => { localStorage.clear(); localStorage.setItem('pg_tut_v1', '1'); PG._seen(); PG.seed(314); PG.newGame({ nick: '가나다라마바사아자차', region: 'kr', role: 'core', trait: 'brain' }); let n = 0; while (n++ < 30000 && !PG.state().over && !(PG.state().squad === 'first' && PG.state().tut.done && !PG.scene() && PG.state().m === 0)) PG.autoStep(); PG.state().money = money; PG.save(); return localStorage.getItem('pg_career_v1'); };
const YM = () => PG.state().year * 12 + PG.state().m;
module.exports = async function play(browser, url, R) {
  const mk = await open(browser, url), raw = await mk.pg.evaluate(MAKE, 30000); await mk.ctx.close();
  R.ok(!!raw, '검사용 저장');
  const load = async (pg, r, seed) => { await pg.evaluate(x => { const o = localStorage.getItem('pg_opt_v1'); localStorage.clear(); if (o) localStorage.setItem('pg_opt_v1', o); localStorage.setItem('pg_tut_v1', '1'); localStorage.setItem('pg_career_v1', x); }, r); await pg.reload(); await pg.waitForTimeout(250); await pg.click('[data-act=continue]'); await pg.waitForTimeout(150); if (seed) await pg.evaluate(s => PG.seed(s), seed); };
  // 창이 뜨면 첫 버튼으로 넘긴다(경기 준비는 전략 없이, 관전은 건너뛰기)
  const clear = async pg => { for (let i = 0; i < 80 && await pg.evaluate(() => !!PG.scene() && !PG.state().over); i++) { await pg.evaluate(() => { const w = document.querySelector('[data-act=wskip]'); if (w) return w.click(); const k = document.querySelector('.sheet [data-act=kick][data-id=none]'); if (k) return k.click(); const b = [...document.querySelectorAll('.veil .sheet [data-act]')].find(x => !x.disabled && !['snd', 'retire', 'reroll'].includes(x.dataset.act)); if (b) b.click(); }); await pg.waitForTimeout(30); } };

  // A. 배치와 접근: 320·360·390px
  for (const [w, h] of [[390, 844], [360, 740], [320, 568]]) {
    const { ctx, pg } = await open(browser, url, { w, h }), m = auditor(pg);
    await load(pg, raw, 11);
    const first = await pg.evaluate(() => { const vis = sel => { const e = document.querySelector(sel); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.top >= 0 && r.bottom <= innerHeight + 1 && r.height >= 44; }; return { tabs: [...document.querySelectorAll('.tabs [role=tab]')].map(x => x.textContent), next: vis('[data-act=next]'), run: vis('[data-act=run]'), plan: !!document.querySelector('[data-act=planopen]'), money: !!document.querySelector('[data-act=moneyopen]'), meters: document.querySelectorAll('.meters').length, hs: document.querySelectorAll('.hstat .hs').length, auto: PG.autoInfo().n, planList: !!document.querySelector('.planlist'), autop: !!document.querySelector('#autop') }; });
    R.ok(first.tabs.length === 3 && first.next && first.run && first.plan && first.money && !first.meters && first.hs >= 2 && first.hs <= 3 && first.auto === 0 && !first.planList && !first.autop, `${w}: 첫 화면 구성 ${JSON.stringify(first)}`);
    await m('플레이'); const a1 = await pg.evaluate(A11Y);
    // 할 일 바꾸기: 2번 누름
    await pg.click('[data-act=planopen]'); await m('할 일 고르기'); await pg.click('[data-act=plan][data-id=rest]');
    R.ok(await pg.evaluate(() => PG.state().plan === 'rest' && !document.querySelector('.planlist') && document.querySelector('.planbig b').textContent.includes('휴식')), `${w}: 할 일을 두 번 눌러 바꾸지 못함`);
    // 자동 관리 켜기: 2번 누름
    await pg.click('[data-act=moneyopen]'); await m('자금·자동 관리'); const a2 = await pg.evaluate(A11Y);
    await pg.click('[data-act=shop-auto][data-id=counsel]');
    R.ok(await pg.evaluate(() => PG.autoInfo().n === 1 && document.querySelector('[data-act=shop-auto][data-id=counsel]').getAttribute('aria-pressed') === 'true' && document.querySelector('[data-act=moneyopen] em').textContent.includes('1개 켜짐') && /220만/.test(document.querySelector('#autop').textContent)), `${w}: 자동 관리를 두 번 눌러 켜지 못함`);
    await pg.click('[data-act=moneyopen]');
    // 한 달 진행: 창 없이 요약만
    const y0 = await pg.evaluate(YM), sy = await pg.evaluate(() => { window.scrollTo(0, 60); return scrollY; });
    await pg.click('[data-act=next]'); await pg.waitForTimeout(120); await clear(pg);
    const one = await pg.evaluate(() => ({ ym: PG.state().year * 12 + PG.state().m, sc: PG.scene() && PG.scene().type, recap: (document.querySelector('.recap') || {}).textContent || '', n: PG.recap() && PG.recap().n, y: scrollY }));
    R.ok(one.ym === y0 + 1 && !one.sc && one.n === 1 && /월급 \+/.test(one.recap) && /자동 관리 −220만/.test(one.recap), `${w}: 한 달 진행 뒤 ${JSON.stringify(one).slice(0, 260)}`);
    await m('진행 요약'); await pg.click('[data-act=repopen]');
    R.ok(await pg.evaluate(() => { const b = document.querySelector('.repbody'); return !!b && /심리 상담 −220만/.test(b.textContent) && /OVR/.test(b.textContent); }), `${w}: 결과 자세히에 자동 관리 내역이 없음`);
    await m('결과 자세히'); const a3 = await pg.evaluate(A11Y);
    R.ok(m.clean(), `${w}: 배치 ${m.line()}`);
    const noName = [...a1.noName, ...a2.noName, ...a3.noName], low = Object.assign({}, a1.lowContrast, a2.lowContrast, a3.lowContrast);
    R.ok(!noName.length && !Object.keys(low).length, `${w}: 이름 없는 버튼 ${noName} / 낮은 대비 ${JSON.stringify(low)}`);
    R.note(`${w}x${h}`, m.line()); R.ok(!pg.errs.length, `스크립트 오류 ${pg.errs}`);
    await ctx.close();
  }

  // B. 진행: 연타, 다음 중요한 순간, 화면과 엔진의 일치, 불러온 저장의 창
  {
    const g = await open(browser, url, { guard: true }), pg = g.pg;
    await load(pg, raw, 21); await pg.waitForTimeout(400);
    const y0 = await pg.evaluate(YM);
    await pg.evaluate(() => { const b = document.querySelector('[data-act=next]'); b.click(); b.click(); b.click(); const r = document.querySelector('[data-act=run]'); if (r) r.click(); });
    await pg.waitForTimeout(150);
    R.ok(await pg.evaluate(YM) <= y0 + 1 && await pg.evaluate(() => PG.state().stat.turns) === JSON.parse(raw).stat.turns + 1, 'B: 진행 버튼 연타로 달이 두 번 넘어감');
    await g.ctx.close();
    const { ctx, pg: p2 } = await open(browser, url);
    // 엔진만으로 같은 저장·같은 시드에서 advance(12) 한 번
    const eng = await p2.evaluate(([r, s]) => { localStorage.setItem('pg_career_v1', r); PG._seen(); PG.load(); PG.seed(s); const k = PG.advance(12); const st = PG.state(); return { k, st: JSON.stringify([st.year, st.m, st.money, st.cond, st.stats, st.car]), sc: PG.scene() && PG.scene().type, stop: PG.recap().stop }; }, [raw, 33]);
    await load(p2, raw, 33); await p2.click('[data-act=run]'); await p2.waitForTimeout(150);
    const ui = await p2.evaluate(() => { const st = PG.state(); return { st: JSON.stringify([st.year, st.m, st.money, st.cond, st.stats, st.car]), sc: PG.scene() && PG.scene().type, sheet: !!document.querySelector('.veil .sheet'), recap: (document.querySelector('.recap') || {}).textContent || '' }; });
    R.ok(eng.k >= 1 && eng.k <= 12 && ui.st === eng.st && ui.sc === eng.sc, `B: "다음 중요한 순간"의 결과가 엔진과 다름 ${eng.k} ${eng.sc}/${ui.sc}`);
    R.ok(eng.sc ? ui.sheet && eng.sc !== 'month' && eng.sc !== 'result' : /멈췄다/.test(ui.recap), `B: 멈춘 이유가 보이지 않음 ${JSON.stringify(eng).slice(0, 80)} ${ui.recap.slice(0, 80)}`);
    // 창이 떠 있는 동안에는 진행 버튼이 눌리지 않는다
    if (eng.sc) { const before = await p2.evaluate(YM); await p2.evaluate(() => { for (const a of ['next', 'run']) { const b = document.querySelector(`[data-act=${a}]`); if (b) { b.disabled = false; b.click(); } } }); R.ok(await p2.evaluate(YM) === before && await p2.evaluate(() => PG.scene().type) === eng.sc, 'B: 창이 떠 있는데 진행됨'); }
    // 여러 번 눌러 한 시즌: 중요한 창만 뜨고(월간 보고·사건 결과 창 0), 사건의 결과는 요약에 나온다
    await load(p2, raw, 44); const seen = {}; let evInline = 0, presses = 0;
    for (let i = 0; i < 200 && await p2.evaluate(y => PG.state().year === y && !PG.state().over, JSON.parse(raw).year); i++) {
      const t = await p2.evaluate(() => PG.scene() && PG.scene().type);
      if (t) { seen[t] = (seen[t] || 0) + 1; const wasEvent = t === 'event'; await p2.evaluate(() => { const w = document.querySelector('[data-act=wskip]'); if (w) return w.click(); const k = document.querySelector('.sheet [data-act=kick][data-id=none]'); if (k) return k.click(); [...document.querySelectorAll('.veil .sheet [data-act]')].find(x => !x.disabled && !['snd', 'retire', 'reroll'].includes(x.dataset.act)).click(); }); await p2.waitForTimeout(30); if (wasEvent && await p2.evaluate(() => !!document.querySelector('.recap .evres') && (!PG.scene() || PG.scene().type !== 'result'))) evInline++; }
      else { await p2.click('[data-act=run]'); presses++; await p2.waitForTimeout(30); }
    }
    R.ok(!seen.month && !seen.result && presses >= 1 && presses <= 12, `B: 한 시즌에 뜬 창 ${JSON.stringify(seen)} · 진행 ${presses}번`);
    R.ok(!seen.event || evInline === seen.event, `B: 사건 ${seen.event}번 중 결과가 요약에 나온 것 ${evInline}번`);
    R.note('한 시즌', `"다음 중요한 순간" ${presses}번 · 뜬 창 ${Object.keys(seen).map(k => k + ' ' + seen[k]).join(', ') || '없음'} · 월간 보고·사건 결과 창 0`);
    // 예전 버전이 월간 보고 창에서 저장한 파일: 불러오면 그 창을 그대로 보여 준다(몰래 넘기지 않는다)
    const rawMonth = await p2.evaluate(r => { localStorage.setItem('pg_career_v1', r); PG._seen(); PG.load(); PG.seed(5); for (let i = 0; i < 40; i++) { if (PG.scene() && PG.scene().type === 'month') { PG.save(); return localStorage.getItem('pg_career_v1'); } PG.autoStep(); } return ''; }, raw);
    await load(p2, rawMonth);
    R.ok(rawMonth && await p2.evaluate(() => PG.scene() && PG.scene().type === 'month' && !!document.querySelector('.veil .sheet [data-act=ok]')), 'B: 월간 보고 창에서 저장된 파일을 불러오자 창이 사라짐');
    await p2.click('.sheet [data-act=ok]'); await p2.waitForTimeout(80);
    R.ok(await p2.evaluate(() => !PG.scene() || PG.scene().type !== 'month') && !p2.errs.length, `B: 불러온 월간 보고를 닫은 뒤 ${p2.errs}`);
    await ctx.close();
  }

  // C. 자동 관리: 기본 꺼짐, 켠 것만, 한 달에 한 번, 잔고 부족이면 건너뛰고 이유, 끄면 멈춤, 설정 유지, 다른 저장 키는 그대로
  {
    const { ctx, pg } = await open(browser, url);
    await load(pg, raw, 51);
    R.ok(await pg.evaluate(() => PG.autoInfo().n === 0 && !PG.state().auto), 'C: 새로 불러온 저장에 자동 관리가 켜져 있음');
    const m0 = await pg.evaluate(() => PG.state().money);
    await pg.click('[data-act=next]'); await pg.waitForTimeout(80); await clear(pg);
    R.ok(await pg.evaluate(() => !PG.lastRep() || !PG.lastRep().auto) && !/자동 관리 −/.test(await pg.evaluate(() => (document.querySelector('.recap') || {}).textContent || '')), 'C: 켜지 않았는데 자동으로 지출함');
    await pg.click('[data-act=moneyopen]'); await pg.click('[data-act=shop-auto][data-id=counsel]'); await pg.click('[data-act=shop-auto][data-id=gear]');
    const lv0 = await pg.evaluate(() => PG.state().shop.gear), mental0 = await pg.evaluate(() => PG.state().stats.mental);
    let spent = 0, months = 0, dup = 0, neg = 0;
    for (let i = 0; i < 60 && months < 10; i++) {
      if (await pg.evaluate(() => !!PG.scene())) { await clear(pg); continue; }
      const before = await pg.evaluate(() => JSON.stringify(PG.lastRep()));
      await pg.click('[data-act=next]'); await pg.waitForTimeout(40); await clear(pg);
      const r = await pg.evaluate(b => { const lr = PG.lastRep(); return { fresh: JSON.stringify(lr) !== b, auto: lr && lr.auto, money: PG.state().money }; }, before);
      if (r.fresh) { months++; if (r.auto) { spent += r.auto.spent; const ids = r.auto.items.map(x => x.id); if (new Set(ids).size !== ids.length) dup++; } }
      if (r.money < 0) neg++;
    }
    const end = await pg.evaluate(() => ({ lv: PG.state().shop.gear, auto: PG.autoInfo() }));
    R.ok(months === 10 && !dup && !neg && spent >= 220 * 9 && end.lv - lv0 <= 10 && end.lv <= 5, `C: 10개월 자동 관리 — 달 ${months} · 지출 ${spent} · 중복 ${dup} · 음수 ${neg} · 장비 ${lv0}→${end.lv}`);
    R.note('자동 관리 10개월', `심리 상담·장비 세팅 켬: 자동 지출 합계 ${spent}만 · 같은 달 중복 ${dup} · 음수 잔고 ${neg} · 장비 단계 ${lv0} → ${end.lv}`);
    // 설정은 새로 고친 뒤에도 그대로, 끄면 다음 달부터 지출 없음
    await pg.reload(); await pg.waitForTimeout(250); await pg.click('[data-act=continue]'); await pg.waitForTimeout(120);
    R.ok(await pg.evaluate(() => PG.autoInfo().items.find(x => x.id === 'counsel').on && document.querySelector('[data-act=moneyopen] em').textContent.includes('켜짐')), 'C: 새로 고친 뒤 자동 관리 설정이 사라짐');
    await clear(pg); await pg.click('[data-act=moneyopen]'); await pg.click('[data-act=shop-auto][data-id=counsel]'); if (await pg.evaluate(() => PG.autoInfo().items.find(x => x.id === 'gear').on)) await pg.click('[data-act=shop-auto][data-id=gear]');
    R.ok(await pg.evaluate(() => PG.autoInfo().n === 0), 'C: 자동 관리를 끄지 못함');
    await pg.click('[data-act=next]'); await pg.waitForTimeout(60); await clear(pg);
    R.ok(await pg.evaluate(() => !PG.lastRep() || !PG.lastRep().auto), 'C: 껐는데 자동으로 지출함');
    // 잔고 부족: 남겨 둘 돈을 크게 잡으면 사지 않고 이유를 적는다
    const poor = await pg.evaluate(r => { const o = JSON.parse(r); o.money = 300; o.contract.salary = 600; return JSON.stringify(o); }, raw);
    await load(pg, poor, 61); await pg.click('[data-act=moneyopen]'); await pg.click('[data-act=shop-auto][data-id=counsel]');
    for (let i = 0; i < 4 && await pg.evaluate(() => PG.autoInfo().keep) !== 2000; i++) await pg.click('[data-act=alim][data-id=keep]');
    await pg.click('[data-act=moneyopen]'); const pm = await pg.evaluate(() => PG.state().money);
    await pg.click('[data-act=next]'); await pg.waitForTimeout(60); await clear(pg);
    const pr = await pg.evaluate(() => ({ auto: PG.lastRep() && PG.lastRep().auto, recap: (document.querySelector('.recap') || {}).textContent || '', money: PG.state().money }));
    R.ok(pr.auto && pr.auto.spent === 0 && pr.auto.items[0].why === 'low' && /자동 건너뜀 1건/.test(pr.recap) && pr.money >= 0, `C: 잔고 부족 처리 ${JSON.stringify(pr).slice(0, 200)}`);
    await pg.click('[data-act=repopen]');
    R.ok(await pg.evaluate(() => /잔고 부족으로 건너뜀/.test(document.querySelector('.repbody').textContent)), 'C: 건너뛴 이유가 결과에 없음');
    R.ok(!pg.errs.length, `스크립트 오류 ${pg.errs}`); await ctx.close();
  }

  // D. 설정 분리: "승부처·전략 맡기기"는 진행 속도와 별개이고 기본은 꺼짐
  {
    const { ctx, pg } = await open(browser, url);
    await load(pg, raw, 71); await pg.click('[data-act=tab][data-id=record]');
    const t = await pg.evaluate(() => ({ fast: PG.state().opt.fast, txt: document.querySelector('[data-act=fast]').textContent, snd: !!document.querySelector('.content [data-act=snd]') }));
    R.ok(t.fast === false && /맡기기 꺼짐/.test(t.txt) && /별개/.test(t.txt) && t.snd, `D: 설정 화면 ${JSON.stringify(t).slice(0, 160)}`);
    await pg.click('[data-act=tab][data-id=career]');
    R.ok(await pg.evaluate(() => document.querySelectorAll('.meters .meter').length === 4 && !!document.querySelector('.stat')), 'D: 커리어 탭에 상태 4종과 능력치가 없음');
    await ctx.close();
  }
};
