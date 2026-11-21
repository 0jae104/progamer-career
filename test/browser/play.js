// 플레이 화면(0.11.2): 할 일 1번 누름, 목표 한 줄, 자산 탭의 자동 관리, 창 없는 한 달 진행. PC 헤드리스 크롬이며 실제 폰 검사가 아니다.
const { open, auditor, A11Y } = require('./lib');
const MAKE = money => { localStorage.clear(); localStorage.setItem('pg_tut_v1', '1'); PG._seen(); PG.seed(314); PG.newGame({ nick: '가나다라마바사아자차', region: 'kr', role: 'core', trait: 'brain' }); let n = 0; while (n++ < 30000 && !PG.state().over && !(PG.state().squad === 'first' && PG.state().tut.done && !PG.scene() && PG.state().m === 0)) PG.autoStep(); PG.state().money = money; delete PG.state().recap; delete PG.state().lastRep; PG.save(); return localStorage.getItem('pg_career_v1'); };
const YM = () => PG.state().year * 12 + PG.state().m;
module.exports = async function play(browser, url, R) {
  const mk = await open(browser, url), raw = await mk.pg.evaluate(MAKE, 30000); await mk.ctx.close();
  R.ok(!!raw, '검사용 저장');
  const load = async (pg, r, seed) => { await pg.evaluate(x => { const o = localStorage.getItem('pg_opt_v1'); localStorage.clear(); if (o) localStorage.setItem('pg_opt_v1', o); localStorage.setItem('pg_tut_v1', '1'); localStorage.setItem('pg_career_v1', x); }, r); await pg.reload(); await pg.waitForTimeout(250); await pg.click('[data-act=continue]'); await pg.waitForTimeout(150); if (seed) await pg.evaluate(s => PG.seed(s), seed); };
  const clear = async pg => { for (let i = 0; i < 80 && await pg.evaluate(() => !!PG.scene() && !PG.state().over); i++) { await pg.evaluate(() => { const w = document.querySelector('[data-act=wskip]'); if (w) return w.click(); const k = document.querySelector('.sheet [data-act=kick][data-id=none]'); if (k) return k.click(); const b = [...document.querySelectorAll('.veil .sheet [data-act]')].find(x => !x.disabled && !['snd', 'retire', 'reroll'].includes(x.dataset.act)); if (b) b.click(); }); await pg.waitForTimeout(30); } };

  // A. 첫 화면과 접근: 320·360·390·430px
  for (const [w, h] of [[430, 932], [390, 844], [360, 740], [320, 568]]) {
    const { ctx, pg } = await open(browser, url, { w, h }), m = auditor(pg);
    await load(pg, raw, 11);
    const first = await pg.evaluate(() => {
      const foot = document.querySelector('.foot').getBoundingClientRect().top;
      const inView = (sel, lim) => { const e = document.querySelector(sel); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.top >= 0 && r.bottom <= (lim || innerHeight) + 1; };
      return { tabs: [...document.querySelectorAll('.tabs [role=tab]')].map(x => x.textContent).join('/'), next: inView('[data-act=next]'), go: inView('[data-act=ap-go]'), set: inView('[data-act=ap-set]'),
        plans: document.querySelectorAll('.plan5 button').length, plansSeen: inView('.plan5', foot), fx: inView('.planfx', foot), goal: inView('.goalbtn', foot), hs: [...document.querySelectorAll('.hstat .hs')].map(x => x.textContent.replace(/[\d,억만 ]+$/, '').trim()).join('/'),
        scroll: document.documentElement.scrollHeight - innerHeight, auto: PG.autoInfo().n, ap: PG_UI.ap.on, sheet: !!document.querySelector('.veil'), log: document.querySelectorAll('.content .log').length, shop: document.querySelectorAll('.content .shop').length, stat: document.querySelectorAll('.content .stat').length };
    });
    R.ok(first.tabs === '플레이/선수/리그/자산/기록' && first.next && first.go && first.set && first.plans === 5 && first.plansSeen && first.fx && first.goal && /컨디션\/(감독 신뢰|코치 평가)\/자금/.test(first.hs) && first.scroll <= 0 && first.auto === 0 && !first.ap && !first.sheet && !first.log && !first.shop && !first.stat, `${w}: 첫 화면 ${JSON.stringify(first)}`);
    await m('플레이'); const a1 = await pg.evaluate(A11Y);
    // 할 일 바꾸기: 한 번 누름. 고른 것의 효과가 바로 아래에 나온다. 달은 넘어가지 않는다
    const y0 = await pg.evaluate(YM);
    await pg.click('.plan5 [data-id=rest]');
    R.ok(await pg.evaluate(() => PG.state().plan === 'rest' && document.querySelector('.plan5 [data-id=rest]').getAttribute('aria-pressed') === 'true' && document.querySelectorAll('.plan5 [aria-pressed=true]').length === 1 && /휴식/.test(document.querySelector('.planfx').textContent) && /컨디션 \+24/.test(document.querySelector('.planfx').textContent)) && await pg.evaluate(YM) === y0, `${w}: 할 일을 한 번 눌러 바꾸지 못함`);
    await pg.click('.plan5 [data-id=scrim]');
    // 목표 펼치기
    await pg.click('[data-act=goalopen]'); R.ok(await pg.evaluate(() => document.querySelectorAll('.goal .gi').length >= 1 && document.querySelector('[data-act=goalopen]').getAttribute('aria-expanded') === 'true'), `${w}: 목표가 펼쳐지지 않음`); await m('목표 펼침'); await pg.click('[data-act=goalopen]');
    // 자산 탭: 한 번에 가고, 스위치는 그 자리에서. 자동 관리 스위치는 달을 넘기거나 장면을 건드리지 않는다(명령 충돌 회귀의 반대 방향)
    await pg.click('[data-act=tab][data-id=money]'); await m('자산'); const a2 = await pg.evaluate(A11Y);
    const t0 = await pg.evaluate(() => PG.state().stat.turns);
    await pg.click('[data-act=shop-auto][data-id=counsel]');
    R.ok(await pg.evaluate(() => PG.autoInfo().n === 1 && document.querySelector('[data-act=shop-auto][data-id=counsel]').getAttribute('aria-pressed') === 'true' && /자동 1개 켜짐/.test(document.querySelector('#autop').textContent) && /220만/.test(document.querySelector('#autop').textContent)) && await pg.evaluate(() => PG.state().stat.turns) === t0 && await pg.evaluate(() => !PG.scene()), `${w}: 자산 탭에서 자동 관리를 켜지 못했거나 다른 일이 일어남`);
    await pg.click('[data-act=tab][data-id=home]');
    // 한 달 진행: 창 없이 요약만, 화면이 튀지 않는다
    await pg.click('[data-act=next]'); await pg.waitForTimeout(120); await clear(pg);
    const one = await pg.evaluate(() => ({ ym: PG.state().year * 12 + PG.state().m, sc: PG.scene() && PG.scene().type, recap: (document.querySelector('.recap') || {}).textContent || '', n: PG.recap() && PG.recap().n }));
    R.ok(one.ym === y0 + 1 && !one.sc && one.n === 1 && /월급 \+/.test(one.recap) && /자동 관리 −220만/.test(one.recap), `${w}: 한 달 진행 뒤 ${JSON.stringify(one).slice(0, 260)}`);
    await m('진행 요약'); await pg.click('[data-act=repopen]');
    R.ok(await pg.evaluate(() => { const b = document.querySelector('.repbody'); return !!b && /심리 상담 −220만/.test(b.textContent) && /OVR/.test(b.textContent); }), `${w}: 결과 자세히에 자동 관리 내역이 없음`);
    await m('결과 자세히'); const a3 = await pg.evaluate(A11Y);
    for (const t of ['player', 'league', 'record']) { await pg.click(`[data-act=tab][data-id=${t}]`); await m('탭 ' + t); }
    R.ok(m.clean(), `${w}: 배치 ${m.line()}`);
    const noName = [...a1.noName, ...a2.noName, ...a3.noName], low = Object.assign({}, a1.lowContrast, a2.lowContrast, a3.lowContrast);
    R.ok(!noName.length && !Object.keys(low).length, `${w}: 이름 없는 버튼 ${noName} / 낮은 대비 ${JSON.stringify(low)}`);
    R.note(`${w}x${h}`, `첫 화면 세로 넘침 ${first.scroll}px(0 이하 = 스크롤 없이 다 보임) · ${m.line()}`); R.ok(!pg.errs.length, `스크립트 오류 ${pg.errs}`);
    await ctx.close();
  }

  // B. 진행: 연타해도 한 달, 창이 떠 있으면 진행 안 됨, 예전 버전의 월간 보고 창은 그대로
  {
    const g = await open(browser, url, { guard: true }), pg = g.pg;
    await load(pg, raw, 21); await pg.waitForTimeout(400);
    await pg.evaluate(() => { const b = document.querySelector('[data-act=next]'); b.click(); b.click(); b.click(); });
    await pg.waitForTimeout(150);
    R.ok(await pg.evaluate(() => PG.state().stat.turns) === JSON.parse(raw).stat.turns + 1, 'B: 진행 버튼 연타로 달이 두 번 넘어감');
    await g.ctx.close();
    const { ctx, pg: p2 } = await open(browser, url);
    await load(p2, raw, 33);
    for (let i = 0; i < 30 && await p2.evaluate(() => !PG.scene()); i++) { await p2.click('[data-act=next]'); await p2.waitForTimeout(30); }
    const t = await p2.evaluate(() => PG.scene() && PG.scene().type), before = await p2.evaluate(YM);
    await p2.evaluate(() => { for (const a of ['next', 'ap-go', 'ap-set']) { const b = document.querySelector(`[data-act=${a}]`); if (b) { b.disabled = false; b.click(); } } });
    R.ok(!!t && await p2.evaluate(YM) === before && await p2.evaluate(() => PG.scene().type) === t && await p2.evaluate(() => !PG_UI.ap.on && !PG_UI.state.apOpen), `B: 창(${t})이 떠 있는데 진행되거나 자동진행이 켜짐`);
    const rawMonth = await p2.evaluate(r => { localStorage.setItem('pg_career_v1', r); PG._seen(); PG.load(); PG.seed(5); for (let i = 0; i < 40; i++) { if (PG.scene() && PG.scene().type === 'month') { PG.save(); return localStorage.getItem('pg_career_v1'); } PG.autoStep(); } return ''; }, raw);
    await load(p2, rawMonth);
    R.ok(rawMonth && await p2.evaluate(() => PG.scene() && PG.scene().type === 'month' && !!document.querySelector('.veil .sheet [data-act=ok]')), 'B: 월간 보고 창에서 저장된 파일을 불러오자 창이 사라짐');
    await p2.click('.sheet [data-act=ok]'); await p2.waitForTimeout(80);
    R.ok(await p2.evaluate(() => !PG.scene() || PG.scene().type !== 'month') && !p2.errs.length, `B: 불러온 월간 보고를 닫은 뒤 ${p2.errs}`);
    await ctx.close();
  }

  // C. 자동 관리: 기본 꺼짐, 켠 것만, 한 달에 한 번, 잔고 부족이면 건너뛰고 이유, 끄면 멈춤, 설정 유지
  {
    const { ctx, pg } = await open(browser, url);
    await load(pg, raw, 51);
    R.ok(await pg.evaluate(() => PG.autoInfo().n === 0 && !PG.state().auto), 'C: 새로 불러온 저장에 자동 관리가 켜져 있음');
    await pg.click('[data-act=next]'); await pg.waitForTimeout(80); await clear(pg);
    R.ok(await pg.evaluate(() => !PG.lastRep() || !PG.lastRep().auto) && !/자동 관리 −/.test(await pg.evaluate(() => (document.querySelector('.recap') || {}).textContent || '')), 'C: 켜지 않았는데 자동으로 지출함');
    await pg.click('[data-act=tab][data-id=money]'); await pg.click('[data-act=shop-auto][data-id=counsel]'); await pg.click('[data-act=shop-auto][data-id=gear]'); await pg.click('[data-act=tab][data-id=home]');
    const lv0 = await pg.evaluate(() => PG.state().shop.gear);
    let spent = 0, months = 0, dup = 0, neg = 0;
    for (let i = 0; i < 60 && months < 10; i++) {
      if (await pg.evaluate(() => !!PG.scene())) { await clear(pg); continue; }
      const before = await pg.evaluate(() => JSON.stringify(PG.lastRep()));
      await pg.click('[data-act=next]'); await pg.waitForTimeout(40); await clear(pg);
      const r = await pg.evaluate(b => { const lr = PG.lastRep(); return { fresh: JSON.stringify(lr) !== b, auto: lr && lr.auto, money: PG.state().money }; }, before);
      if (r.fresh) { months++; if (r.auto) { spent += r.auto.spent; const ids = r.auto.items.map(x => x.id); if (new Set(ids).size !== ids.length) dup++; } }
      if (r.money < 0) neg++;
    }
    const end = await pg.evaluate(() => ({ lv: PG.state().shop.gear }));
    R.ok(months === 10 && !dup && !neg && spent >= 220 * 9 && end.lv <= 5, `C: 10개월 자동 관리 — 달 ${months} · 지출 ${spent} · 중복 ${dup} · 음수 ${neg} · 장비 ${lv0}→${end.lv}`);
    R.note('자동 관리 10개월', `심리 상담·장비 세팅 켬: 자동 지출 합계 ${spent}만 · 같은 달 중복 ${dup} · 음수 잔고 ${neg} · 장비 단계 ${lv0} → ${end.lv}`);
    await pg.reload(); await pg.waitForTimeout(250); await pg.click('[data-act=continue]'); await pg.waitForTimeout(120); await clear(pg);
    await pg.click('[data-act=tab][data-id=money]');
    R.ok(await pg.evaluate(() => PG.autoInfo().items.find(x => x.id === 'counsel').on && /켜짐/.test(document.querySelector('[data-act=shop-auto][data-id=counsel]').textContent)), 'C: 새로 고친 뒤 자동 관리 설정이 사라짐');
    await pg.click('[data-act=shop-auto][data-id=counsel]'); if (await pg.evaluate(() => PG.autoInfo().items.find(x => x.id === 'gear').on)) await pg.click('[data-act=shop-auto][data-id=gear]');
    R.ok(await pg.evaluate(() => PG.autoInfo().n === 0), 'C: 자동 관리를 끄지 못함');
    await pg.click('[data-act=tab][data-id=home]'); await pg.click('[data-act=next]'); await pg.waitForTimeout(60); await clear(pg);
    R.ok(await pg.evaluate(() => !PG.lastRep() || !PG.lastRep().auto), 'C: 껐는데 자동으로 지출함');
    const poor = await pg.evaluate(r => { const o = JSON.parse(r); o.money = 300; o.contract.salary = 600; return JSON.stringify(o); }, raw);
    await load(pg, poor, 61); await pg.click('[data-act=tab][data-id=money]'); await pg.click('[data-act=shop-auto][data-id=counsel]');
    for (let i = 0; i < 4 && await pg.evaluate(() => PG.autoInfo().keep) !== 2000; i++) await pg.click('[data-act=alim][data-id=keep]');
    await pg.click('[data-act=tab][data-id=home]');
    await pg.click('[data-act=next]'); await pg.waitForTimeout(60); await clear(pg);
    const pr = await pg.evaluate(() => ({ auto: PG.lastRep() && PG.lastRep().auto, recap: (document.querySelector('.recap') || {}).textContent || '', money: PG.state().money }));
    R.ok(pr.auto && pr.auto.spent === 0 && pr.auto.items[0].why === 'low' && /자동 건너뜀 1건/.test(pr.recap) && pr.money >= 0, `C: 잔고 부족 처리 ${JSON.stringify(pr).slice(0, 200)}`);
    await pg.click('[data-act=repopen]');
    R.ok(await pg.evaluate(() => /잔고 부족으로 건너뜀/.test(document.querySelector('.repbody').textContent)), 'C: 건너뛴 이유가 결과에 없음');
    R.ok(!pg.errs.length, `스크립트 오류 ${pg.errs}`); await ctx.close();
  }

  // D. 나머지 목적지: 선수(상태 4종·능력치), 리그(순위·라이벌), 기록(소식·설정)
  {
    const { ctx, pg } = await open(browser, url);
    await load(pg, raw, 71);
    await pg.click('[data-act=tab][data-id=player]');
    R.ok(await pg.evaluate(() => document.querySelectorAll('.meters .meter').length === 4 && document.querySelectorAll('.stat').length >= 6), 'D: 선수 탭에 상태 4종과 능력치가 없음');
    await pg.click('[data-act=tab][data-id=league]');
    R.ok(await pg.evaluate(() => !!document.querySelector('.content table') && /라이벌/.test(document.querySelector('.content').textContent)), 'D: 리그 탭에 순위표와 라이벌이 없음');
    await pg.click('[data-act=tab][data-id=record]');
    const t = await pg.evaluate(() => ({ fast: PG.state().opt.fast, txt: document.querySelector('[data-act=fast]').textContent, snd: !!document.querySelector('.content [data-act=snd]'), log: document.querySelectorAll('.content .log li').length }));
    R.ok(t.fast === false && /맡기기 꺼짐/.test(t.txt) && t.snd && t.log >= 1, `D: 기록 탭 ${JSON.stringify(t).slice(0, 160)}`);
    R.ok(!pg.errs.length, `스크립트 오류 ${pg.errs}`); await ctx.close();
  }
};
