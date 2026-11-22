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
        plans: document.querySelectorAll('.plan5 button').length, plansSeen: inView('.plan5', foot), fx: inView('.planfx', foot), goal: inView('.goalbtn', foot), hs: [...document.querySelectorAll('.hstat .hs')].map(x => x.firstChild.textContent.trim()).join('/'), moneyBtn: inView('.moneyrow', foot),
        scroll: document.documentElement.scrollHeight - innerHeight, auto: PG.autoInfo().n, ap: PG_UI.ap.on, sheet: !!document.querySelector('.veil'), log: document.querySelectorAll('.content .log').length, shop: document.querySelectorAll('.content .shop').length, stat: document.querySelectorAll('.content .stat').length };
    });
    R.ok(first.tabs === '플레이/선수/리그/자산/기록' && first.next && first.go && first.set && first.plans === 5 && first.plansSeen && first.fx && first.goal && /^컨디션\/손목\/(감독 신뢰|코치 평가)\/인기$/.test(first.hs) && first.moneyBtn && first.scroll <= 0 && first.auto === 0 && !first.ap && !first.sheet && !first.log && !first.shop && !first.stat, `${w}: 첫 화면 ${JSON.stringify(first)}`);
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
    // 긴 대회 단계·상대 이름이 잘리지 않고 줄을 바꾼다(390px에서 말줄임으로 잘리던 문제의 회귀 검사)
    const longOpp = await pg.evaluate(() => { const lr = PG.state().lastRep; lr.matches = [{ opp: '구름용 이스포츠 아카데미', win: true, plays: true, r: 7.1, k: 3, d: 1, a: 5, label: '준결승', score: '2-1' }, { opp: '문타이거즈', win: false, plays: true, r: 6.0, k: 1, d: 2, a: 3 }]; PG_UI.render(); const e = document.querySelector('.repbody .matches .opp'), cs = getComputedStyle(e); return { text: e.textContent, cut: e.scrollWidth > e.clientWidth + 1, ell: cs.textOverflow, ws: cs.whiteSpace, inside: e.getBoundingClientRect().right <= innerWidth }; });
    R.ok(/준결승/.test(longOpp.text) && /구름용 이스포츠 아카데미/.test(longOpp.text) && !longOpp.cut && longOpp.ell !== 'ellipsis' && longOpp.ws !== 'nowrap' && longOpp.inside, `${w}: 월간 보고의 긴 상대 이름이 잘림 ${JSON.stringify(longOpp)}`);
    await m('긴 상대 이름');
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
    await pg.click('[data-act=tab][data-id=money]'); await pg.click('[data-act=shop-auto][data-id=counsel]'); await pg.click('[data-act=shopgrp]'); await pg.click('[data-act=shop-auto][data-id=gear]'); await pg.click('[data-act=tab][data-id=home]');
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
    await pg.click('[data-act=shop-auto][data-id=counsel]'); if (await pg.evaluate(() => PG.autoInfo().items.find(x => x.id === 'gear').on)) { if (await pg.evaluate(() => !document.querySelector('[data-act=shop-auto][data-id=gear]'))) await pg.click('[data-act=shopgrp]'); await pg.click('[data-act=shop-auto][data-id=gear]'); }
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

  // E. 선수 등록(두 걸음)과 얼굴: 기본값만으로 세 번 눌러 시작, 고른 얼굴이 저장·화면에 그대로, 새 투자 항목은 꺼진 채로 보인다
  for (const [w, h] of [[390, 844], [320, 568]]) {
    const { ctx, pg } = await open(browser, url, { w, h }), m = auditor(pg);
    await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(250);
    await pg.click('[data-act=create]'); await m('등록 1/2'); const a1 = await pg.evaluate(A11Y);
    const s1 = await pg.evaluate(() => ({ nick: !!document.getElementById('nick'), looks: document.querySelectorAll('[data-act=look]').length, rand: !!document.querySelector('[data-act=lookrand]'), regions: document.querySelectorAll('[data-grp=region]').length, roles: document.querySelectorAll('[data-grp=role]').length, look: document.querySelector('canvas.av.big').dataset.look, ok: PG.lookOk(document.querySelector('canvas.av.big').dataset.look) }));
    R.ok(s1.nick && s1.looks === 5 && s1.rand && s1.regions === 4 && s1.roles === 0 && s1.ok, `${w}: 등록 1/2 ${JSON.stringify(s1)}`);
    await pg.click('[data-act=look][data-i="0"]'); const l1 = await pg.evaluate(() => document.querySelector('canvas.av.big').dataset.look);
    R.ok(l1 !== s1.look && l1.slice(1) === s1.look.slice(1), `${w}: 머리 모양만 바뀌어야 함 ${s1.look} → ${l1}`);
    let changed = false; for (let i = 0; i < 6 && !changed; i++) { await pg.click('[data-act=lookrand]'); changed = await pg.evaluate(x => document.querySelector('canvas.av.big').dataset.look !== x, l1); }
    R.ok(changed, `${w}: 무작위 버튼이 얼굴을 바꾸지 않음`);
    for (let i = 0; i < 5; i++) await pg.click(`[data-act=look][data-i="${i}"]`);
    const look = await pg.evaluate(() => document.querySelector('canvas.av.big').dataset.look);
    await pg.fill('#nick', '얼굴검사'); await pg.click('[data-act=cstep]'); await m('등록 2/2'); const a2 = await pg.evaluate(A11Y);
    const s2 = await pg.evaluate(() => ({ roles: document.querySelectorAll('[data-grp=role]').length, traits: [...document.querySelectorAll('[data-grp=trait]')].map(b => [b.dataset.id, b.getAttribute('aria-pressed'), /처음이라면/.test(b.textContent), b.querySelectorAll('.rinfo').length].join(':')).join(' '), nickKept: PG_UI.state.C.nick }));
    R.ok(s2.roles === 5 && /brain:true:true:3/.test(s2.traits) && /grinder:false:false:3/.test(s2.traits) && /genius:false:false:3/.test(s2.traits) && s2.nickKept === '얼굴검사', `${w}: 등록 2/2 ${JSON.stringify(s2)}`);
    await pg.click('[data-act=cstep]'); R.ok(await pg.evaluate(l => document.querySelector('canvas.av.big').dataset.look === l && document.getElementById('nick').value === '얼굴검사', look), `${w}: 이전으로 돌아가자 고른 것이 사라짐`);
    await pg.click('[data-act=cstep]'); await pg.click('[data-act=start]'); await pg.waitForTimeout(200);
    R.ok(await pg.evaluate(l => PG.state().look === l && PG.state().nick === '얼굴검사' && PG.state().trait === 'brain' && JSON.parse(localStorage.getItem('pg_career_v1')).look === l, look), `${w}: 고른 얼굴이 저장되지 않음`);
    await pg.click('.sheet [data-act=res]'); await pg.waitForTimeout(150);
    // 게임 화면의 얼굴: 고른 값으로 그려지고(유니폼 색만 구단 색), 얼굴을 고르지 않았을 때의 그림과는 다르다
    const hd = await pg.evaluate(() => { const S = PG.state(), q = () => document.querySelector('.lower canvas.av'), a = q().toDataURL(), keep = S.look; delete S.look; PG_UI.render(); const b = q().toDataURL(); S.look = keep; PG_UI.render(); return { look: q().dataset.look, differs: a !== b, back: q().toDataURL() === a }; });
    R.ok(hd.look === look && hd.differs && hd.back === true, `${w}: 게임 화면의 얼굴이 고른 것과 다름 ${JSON.stringify(hd)}`);
    R.ok(m.clean(), `${w}: 등록 화면 배치 ${m.line()}`);
    R.ok(![...a1.noName, ...a2.noName].length && !Object.keys(Object.assign({}, a1.lowContrast, a2.lowContrast)).length, `${w}: 등록 화면 접근성 ${JSON.stringify([a1.noName, a2.noName, a1.lowContrast, a2.lowContrast])}`);
    R.ok(!pg.errs.length, `스크립트 오류 ${pg.errs}`); await ctx.close();
  }
  {
    const { ctx, pg } = await open(browser, url);
    // 기본값만으로 시작: 타이틀에서 세 번 누름(새 커리어 → 다음 → 입단 테스트)
    await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(250);
    await pg.click('[data-act=create]'); await pg.click('[data-act=cstep]'); await pg.click('[data-act=start]'); await pg.waitForTimeout(150);
    R.ok(await pg.evaluate(() => !!PG.state() && PG.lookOk(PG.state().look) && PG.scene().type === 'pickOrg'), 'E: 기본값으로 세 번 눌러 시작하지 못함');
    // 자산 탭: 새 항목 두 개가 꺼진 채로 보이고, 직접 사면 효과가 난다
    await load(pg, raw, 81); await pg.click('[data-act=tab][data-id=money]');
    const shop = await pg.evaluate(() => ['fanmeet', 'analyst'].map(id => { const b = document.querySelector(`[data-act=shop-auto][data-id=${id}]`); return b ? b.getAttribute('aria-pressed') : 'none'; }).join(','));
    const f0 = await pg.evaluate(() => [PG.state().fame, PG.state().cond, PG.state().money]);
    await pg.click('[data-act=buy][data-id=fanmeet]');
    const f1 = await pg.evaluate(() => [PG.state().fame, PG.state().cond, PG.state().money, document.querySelector('[data-act=buy][data-id=fanmeet]').disabled]);
    R.ok(shop === 'false,false' && f1[0] > f0[0] && Math.round(f0[1] - f1[1]) === 6 && f0[2] - f1[2] === 250 && f1[3] === true, `E: 팬 미팅 ${shop} ${JSON.stringify([f0, f1])}`);
    R.ok(!pg.errs.length, `스크립트 오류 ${pg.errs}`); await ctx.close();
  }

  // F. 0.11.4: 홈의 상태 2×2와 자금 버튼, 자산 탭의 접힘, 라이벌 줄
  const mk4 = await open(browser, url);
  const S4 = await mk4.pg.evaluate(() => {
    const out = {};
    const run = (seed, want) => { localStorage.clear(); localStorage.setItem('pg_tut_v1', '1'); PG._seen(); PG.seed(seed); PG.newGame({ nick: '상태검사', region: 'kr', role: 'core', trait: 'brain' }); let n = 0; while (n++ < 60000 && !PG.state().over) { const s = PG.state(), sc = PG.scene(); if (!sc && s.org && s.tut.done && want(s)) { delete s.recap; delete s.lastRep; PG.save(); return localStorage.getItem('pg_career_v1'); } PG.autoStep(); } return ''; };
    out.trainee = run(41, s => s.squad === 'trainee'); out.second = run(42, s => s.squad === 'second'); out.first = run(43, s => s.squad === 'first' && s.injury === 0);
    for (let k = 0; k < 30 && !(out.rv && out.plain); k++) { out.rv = run(500 + k, s => s.squad === 'first' && s.injury === 0 && PG.rivalFixtures().length > 0); out.plain = run(500 + k, s => s.squad === 'first' && s.injury === 0 && s.m >= 1 && s.m <= 6 && PG.rivalFixtures().length === 0 && s.rivals.length > 0); }
    const mod = (raw, f) => { const o = JSON.parse(raw); f(o); return JSON.stringify(o); };
    out.injured = mod(out.first, o => { o.injury = 2; o.wrist = 18; }); out.wristLow = mod(out.first, o => { o.wrist = 30; o.cond = 81; }); out.condLow = mod(out.first, o => { o.cond = 22; o.wrist = 90; });
    return out;
  });
  await mk4.ctx.close();
  R.ok(Object.values(S4).every(Boolean), `F: 검사용 저장 ${Object.keys(S4).filter(k => !S4[k])}`);
  for (const [w, h] of [[430, 932], [390, 844], [360, 800], [320, 568]]) {
    const { ctx, pg } = await open(browser, url, { w, h, init: 'window.__pgApMs = 250;' }), m = auditor(pg);
    // 1) 여섯 상태에서 네 값이 저장된 수치 그대로, 이름이 소속에 맞게, 꾸며낸 말 없이
    for (const kind of ['trainee', 'second', 'first', 'injured', 'wristLow', 'condLow']) {
      await load(pg, S4[kind]);
      const v = await pg.evaluate(() => { const S = PG.state(), cells = [...document.querySelectorAll('.hstat .hs')].map(e => ({ label: e.firstChild.textContent.trim(), n: +e.querySelector('b').textContent, em: (e.querySelector('em') || {}).textContent || '', bad: e.classList.contains('bad'), good: e.classList.contains('good') })); const mr = document.querySelector('.moneyrow'); return { cells, want: [Math.round(S.cond), Math.round(S.wrist), Math.round(S.trust), Math.round(S.fame)], squad: S.squad, injury: S.injury, cond: S.cond, wrist: S.wrist, money: mr.querySelector('b').textContent === PG.fmtMoney(S.money), aria: mr.getAttribute('aria-label'), meters: document.querySelectorAll('.meters').length, txt: document.querySelector('.hstat').textContent, over: document.documentElement.scrollHeight - innerHeight, planSeen: (() => { const r = document.querySelector('.plan5').getBoundingClientRect(), f = document.querySelector('.foot').getBoundingClientRect().top; return r.top >= 0 && r.bottom <= f + 1; })() }; });
      const lab = v.cells.map(c => c.label).join('/'), nums = v.cells.map(c => c.n);
      R.ok(v.cells.length === 4 && lab === `컨디션/손목/${v.squad === 'trainee' ? '코치 평가' : '감독 신뢰'}/인기` && JSON.stringify(nums) === JSON.stringify(v.want), `${w} ${kind}: 상태 네 칸 ${lab} ${nums} / 저장 ${v.want}`);
      R.ok(v.cells[0].bad === (v.cond < 40) && v.cells[0].good === (v.cond >= 70) && v.cells[1].bad === (v.injury > 0 || v.wrist <= 35) && !v.cells[2].bad && !v.cells[3].bad && !/상승|하락/.test(v.txt), `${w} ${kind}: 경고 표시가 기준과 다르거나 꾸며낸 말이 있음 ${JSON.stringify(v.cells)}`);
      if (kind === 'injured') R.ok(w <= 350 || /재활 2개월/.test(v.cells[1].em), `${w}: 부상 재활 표시가 없음 ${v.cells[1].em}`);
      R.ok(v.money && /보유 자금 .*자산 페이지 열기/.test(v.aria) && v.meters === 0 && v.planSeen && v.over <= 0, `${w} ${kind}: 자금 줄·할 일 위치·넘침 ${JSON.stringify({ money: v.money, aria: v.aria, meters: v.meters, plan: v.planSeen, over: v.over })}`);
      await m('홈 ' + kind);
    }
    // 2) 자금 → 자산: 한 번 누름, 아래 탭의 선택 표시, 맨 위. 키보드(Enter·Space)도 된다
    await load(pg, S4.first); await pg.evaluate(() => scrollTo(0, 40));
    await pg.click('.moneyrow');
    R.ok(await pg.evaluate(() => PG_UI.state.tab === 'money' && document.querySelector('.tabs [aria-selected=true]').dataset.id === 'money' && scrollY === 0 && !!document.querySelector('#autop') && !document.querySelector('.veil') && !document.querySelector('.hstat')), `${w}: 자금을 눌러 자산 탭으로 가지 못함`);
    await m('자산');
    await pg.click('[data-act=tab][data-id=home]'); R.ok(await pg.evaluate(() => PG_UI.state.tab === 'home' && !!document.querySelector('.plan5')), `${w}: 자산에서 플레이로 돌아가지 못함`);
    for (const key of ['Enter', 'Space']) { await pg.evaluate(() => { document.activeElement && document.activeElement.blur(); }); let on = false; for (let i = 0; i < 12 && !on; i++) { await pg.keyboard.press('Tab'); on = await pg.evaluate(() => document.activeElement.classList.contains('moneyrow')); } const ring = on ? await pg.evaluate(() => getComputedStyle(document.activeElement).outlineStyle) : 'unreached'; await pg.keyboard.press(key); R.ok(await pg.evaluate(() => PG_UI.state.tab === 'money') && ring !== 'none', `${w}: 키보드 ${key}로 자산에 가지 못하거나 초점 표시가 없음(${ring})`); await pg.click('[data-act=tab][data-id=home]'); }
    // 3) 자동진행 중에 자금을 누르면 먼저 서고, 그다음 자산 탭으로 간다. 그 뒤로 달이 넘어가지 않고 저장과 화면이 같다
    await pg.evaluate(() => { PG.seed(9); PG.setAp('seen', true); PG_UI.render(); });
    await pg.click('[data-act=ap-go]'); await pg.waitForTimeout(350);
    if (await pg.evaluate(() => PG_UI.ap.on)) {
      await pg.click('.moneyrow'); const t = await pg.evaluate(() => PG.state().stat.turns); await pg.waitForTimeout(700);
      R.ok(await pg.evaluate(t0 => !PG_UI.ap.on && PG_UI.ap.t === 0 && PG_UI.state.tab === 'money' && PG.state().stat.turns === t0 && PG.recap().stop === 'pause' && JSON.parse(localStorage.getItem('pg_career_v1')).stat.turns === t0 && !PG.saveFailed(), t), `${w}: 자동진행 중 자금을 눌렀을 때 서지 않거나 저장이 어긋남`);
    } else R.ok(false, `${w}: 자금 버튼 검사 전에 자동진행이 이미 멈춤`);
    // 4) 자산: 첫 화면에 요약·한도·매달 반복, 단계형은 접힘. 접힘·설명 펼침은 조작 뒤에도 유지되고 저장에는 들어가지 않는다
    await load(pg, JSON.stringify(Object.assign(JSON.parse(S4.first), { money: 30000 }))); await pg.click('.moneyrow');
    const a0 = await pg.evaluate(() => ({ sum: document.querySelector('.autosum').textContent, lims: document.querySelectorAll('[data-act=alim]').length, togs: [...document.querySelectorAll('[data-act=shop-auto]')].map(b => b.dataset.id).join(','), grp: document.querySelector('[data-act=shopgrp]').getAttribute('aria-expanded'), desc: document.querySelectorAll('.sdesc').length, grpTxt: document.querySelector('[data-act=shopgrp]').textContent }));
    R.ok(/자동 모두 꺼짐/.test(a0.sum) && /없음/.test(a0.sum) && a0.lims === 2 && a0.togs === 'physio,counsel,fanmeet,analyst' && a0.grp === 'false' && a0.desc === 0 && /장비 0\/5/.test(a0.grpTxt), `${w}: 자산 첫 화면 ${JSON.stringify(a0)}`);
    await pg.click('[data-act=shop-info][data-id=fanmeet]');
    R.ok(await pg.evaluate(() => document.querySelectorAll('.sdesc').length === 1 && /인기 \+2/.test(document.querySelector('.sdesc').textContent)), `${w}: 이름을 눌러도 설명이 펼쳐지지 않음`);
    await m('자산 설명 펼침');
    await pg.click('[data-act=shopgrp]'); await m('자산 단계형 펼침');
    R.ok(await pg.evaluate(() => [...document.querySelectorAll('[data-act=shop-auto]')].length === 7 && document.querySelector('[data-act=shopgrp]').getAttribute('aria-expanded') === 'true'), `${w}: 단계형 투자가 펼쳐지지 않음`);
    // 일곱 항목 모두: 자동 켜기·끄기가 엔진 값과 같고, 펼쳐 둔 것이 닫히지 않는다
    let togOk = true; for (const id of ['physio', 'counsel', 'fanmeet', 'analyst', 'gear', 'coach', 'care']) { await pg.click(`[data-act=shop-auto][data-id=${id}]`); const on = await pg.evaluate(i => PG.autoInfo().items.find(x => x.id === i).on && document.querySelector(`[data-act=shop-auto][data-id=${i}]`).getAttribute('aria-pressed') === 'true', id); await pg.click(`[data-act=shop-auto][data-id=${id}]`); const off = await pg.evaluate(i => !PG.autoInfo().items.find(x => x.id === i).on, id); if (!on || !off) togOk = false; }
    R.ok(togOk && await pg.evaluate(() => document.querySelector('[data-act=shopgrp]').getAttribute('aria-expanded') === 'true' && document.querySelectorAll('.sdesc').length === 1 && document.querySelectorAll('[data-act=shop-auto]').length === 7), `${w}: 자동 스위치 일곱 개 또는 펼침 유지`);
    // 직접 사기: 단계형 한 단계, 한 달에 한 번 항목, 그리고 펼침 유지
    const b0 = await pg.evaluate(() => [PG.state().money, PG.state().shop.gear, PG.autoInfo().items.find(x => x.id === 'gear').cost, PG.autoInfo().items.find(x => x.id === 'counsel').cost]);
    await pg.click('[data-act=buy][data-id=gear]'); await pg.click('[data-act=buy][data-id=counsel]');
    const b1 = await pg.evaluate(() => ({ money: PG.state().money, gear: PG.state().shop.gear, used: document.querySelector('[data-act=buy][data-id=counsel]').disabled, usedTxt: document.querySelector('[data-act=shop-info][data-id=counsel]').textContent, grp: document.querySelector('[data-act=shopgrp]').getAttribute('aria-expanded'), desc: document.querySelectorAll('.sdesc').length, gearTxt: document.querySelector('[data-act=shop-info][data-id=gear]').textContent }));
    R.ok(b1.money === b0[0] - b0[2] - b0[3] && b1.gear === b0[1] + 1 && b1.used && /이번 달 완료/.test(b1.usedTxt) && b1.grp === 'true' && b1.desc === 1 && /1\/5 단계/.test(b1.gearTxt), `${w}: 직접 사기 ${JSON.stringify(b1)} / ${b0}`);
    // 한도 버튼, 잔고 부족, 최대 단계 표시
    await pg.click('[data-act=alim][data-id=keep]'); await pg.click('[data-act=alim][data-id=cap]');
    R.ok(await pg.evaluate(() => PG.autoInfo().keep === 2000 && PG.autoInfo().cap === 500 && document.querySelector('[data-act=shopgrp]').getAttribute('aria-expanded') === 'true'), `${w}: 한도 버튼 또는 펼침 유지`);
    R.ok(await pg.evaluate(() => { const s = JSON.parse(localStorage.getItem('pg_career_v1')); return !('shopOpen' in s) && !('shopInfo' in s) && !JSON.stringify(s).includes('shopOpen'); }), `${w}: 화면의 접힘 상태가 저장에 들어감`);
    await pg.evaluate(() => { const S = PG.state(); S.money = 10; S.shop.coach = 5; S.used = {}; PG_UI.render(); });
    const lim = await pg.evaluate(() => ({ poor: document.querySelector('[data-act=buy][data-id=physio]').disabled, max: document.querySelector('[data-act=buy][data-id=coach]').textContent + '|' + document.querySelector('[data-act=buy][data-id=coach]').disabled, maxTxt: document.querySelector('[data-act=shop-info][data-id=coach]').textContent }));
    R.ok(lim.poor && lim.max === '최대|true' && /5\/5 최대/.test(lim.maxTxt), `${w}: 잔고 부족·최대 단계 표시 ${JSON.stringify(lim)}`);
    // 5) 라이벌: 라이벌전이 있는 달에만 홈에 나오고(실제 상대와 전적), 누르면 리그 탭의 라이벌 기록으로 간다. 없는 달에는 자리도 없다
    await load(pg, S4.plain);
    R.ok(await pg.evaluate(() => PG.rivalFixtures().length === 0 && !document.querySelector('.rvcard') && !/라이벌/.test(document.querySelector('.content').textContent)), `${w}: 라이벌전이 없는 달인데 홈에 라이벌 영역이 있음`);
    await load(pg, S4.rv); await m('홈 라이벌전 달');
    const rv = await pg.evaluate(() => { const fx = PG.rivalFixtures(), c = document.querySelector('.rvcard'), t = c ? c.textContent : ''; return { n: fx.length, cards: document.querySelectorAll('.rvcard').length, all: fx.every(f => t.includes(f.nick) && t.includes(f.org) && t.includes(`통산 ${f.w}승 ${f.l}패`)), plan: (() => { const r = document.querySelector('.plan5').getBoundingClientRect(), f = document.querySelector('.foot').getBoundingClientRect().top; return r.bottom <= f + 1; })(), seen: (() => { const r = c.getBoundingClientRect(), f = document.querySelector('.foot').getBoundingClientRect().top; return r.top >= 0 && r.bottom <= f + 1; })(), peek: (() => { const r = c.getBoundingClientRect(), f = document.querySelector('.foot').getBoundingClientRect().top; return Math.round(f - r.top); })(), veil: !!document.querySelector('.veil') }; });
    // 0.11.8: 0.11.7 에서 320px 만 "제목 줄이 보인다"로 낮췄던 기준을 되돌렸다. 키가 작은 화면은 한 줄 요약이라 다시 줄 전체가 첫 화면에 보여야 한다.
    R.ok(rv.n > 0 && rv.cards === 1 && rv.all && rv.plan && rv.seen && !rv.veil, `${w}: 라이벌전 달의 홈 ${JSON.stringify(rv)}`);
    R.note(`라이벌전 달 ${w}`, `라이벌전 줄이 첫 화면에 ${rv.seen ? '다 보임' : `위쪽 ${rv.peek}px만 보임(나머지는 스크롤)`}`);
    await pg.click('.rvcard');
    R.ok(await pg.evaluate(() => { const e = document.getElementById('rivals'), r = e && e.getBoundingClientRect(); return PG_UI.state.tab === 'league' && document.querySelector('.tabs [aria-selected=true]').dataset.id === 'league' && !!e && r.top >= -2 && r.top < innerHeight / 2 && document.querySelectorAll('#rivals .rival').length >= 1; }), `${w}: 라이벌 줄을 눌러 리그 탭의 라이벌 기록으로 가지 못함`);
    await m('리그 라이벌');
    // 그 달을 진행하면 요약의 라이벌전 결과가 엔진 기록과 같다(승패, 통산 전적), 소식 줄은 소식 목록에 있는 문장뿐이다
    await pg.click('[data-act=tab][data-id=home]'); await pg.evaluate(() => PG.seed(77)); await pg.click('[data-act=next]'); await pg.waitForTimeout(120); await clear(pg);
    const rr = await pg.evaluate(() => { const r = PG.recap() || {}, rs = PG.rivals(), lines = [...document.querySelectorAll('.recap .rvres')].map(e => e.textContent), news = [...document.querySelectorAll('.recap .rvnews')].map(e => e.textContent.replace(/^라이벌 소식\s*/, '')), log = PG.state().log.map(l => l.msg); const rv = (r.rv || []); return { rv: rv.length, lines: lines.filter(t => /^라이벌전/.test(t)).length, ok: rv.every(v => { const x = rs.find(q => q.nick === v.nick); return lines.some(t => t.includes(v.nick) && t.includes(v.win ? '승리' : '패배') && (!x || t.includes(`통산 ${x.w}승 ${x.l}패`))); }), news: news.length, newsOk: news.every(t => log.includes(t)), link: !!document.querySelector('.recap [data-to=rivals]') }; });
    R.ok(rr.rv === rr.lines && rr.ok && rr.news <= 2 && rr.newsOk && (rr.rv + rr.news === 0 || rr.link), `${w}: 진행 요약의 라이벌 줄이 기록과 다름 ${JSON.stringify(rr)}`);
    await m('요약 라이벌');
    R.ok(m.clean(), `${w}: 0.11.4 화면 배치 ${m.line()}`); R.note(`0.11.4 ${w}x${h}`, m.line());
    R.ok(!pg.errs.length, `스크립트 오류 ${pg.errs}`); await ctx.close();
  }

  // G. 0.11.5: 시즌 목표(결산의 확인 자리), 홈의 한 줄, 라이벌 문장, 경기 결과의 선택 → 영향 → 결과, 구단 소개, 돈을 쓰기 전의 사실
  const mk5 = await open(browser, url);
  const S5 = await mk5.pg.evaluate(() => {
    const find = (want, seeds) => { for (let k = 0; k < (seeds || 40); k++) { localStorage.clear(); localStorage.setItem('pg_tut_v1', '1'); PG._seen(); PG.seed(900 + k); PG.newGame({ nick: '목표검사', region: 'kr', role: 'core', trait: 'brain' }); let n = 0; while (n++ < 60000 && !PG.state().over) { if (want(PG.state(), PG.scene())) { PG.save(); return localStorage.getItem('pg_career_v1'); } PG.autoStep(); } } return ''; };
    return {
      season: find((s, sc) => sc && sc.type === 'season' && s.squad === 'first' && sc.goal && sc.goals && sc.goals.length === 3 && sc.goals.some(g => g.id === 'rival')),
      season1: find((s, sc) => sc && sc.type === 'season' && s.year === 2 && sc.goal && sc.goals),
      rvHome: find((s, sc) => !sc && s.squad !== 'trainee' && s.tut.done && s.goal && PG.rivalFixtures().some(f => f.story)),
      match: find((s, sc) => sc && sc.type === 'match' && sc.moms.length > 0 && sc.story),
      offers: find((s, sc) => sc && sc.type === 'offers' && s.squad === 'first' && sc.offers.filter(o => o.squad === 'first' && !o.renew).length >= 1),
      prematch: find((s, sc) => sc && sc.type === 'prematch' && sc.rival && sc.story),
    };
  });
  await mk5.ctx.close();
  R.ok(Object.values(S5).every(Boolean), `G: 검사용 저장 ${Object.keys(S5).filter(k => !S5[k])}`);
  const skipWatch = async pg => { await pg.evaluate(() => { const w = document.querySelector('[data-act=wskip]'); if (w) w.click(); }); await pg.waitForTimeout(250); };
  for (const [w, h] of [[430, 932], [390, 844], [360, 800], [320, 568]]) {
    const { ctx, pg } = await open(browser, url, { w, h }), m = auditor(pg);
    // 1) 시즌 결산: 지난 목표의 판정과 이유, 다음 목표 2~3개가 확인 버튼 자리에. 한 번 눌러 넘어가고 고른 것이 저장된다
    for (const key of ['season', 'season1']) {
      await load(pg, S5[key]);
      const v = await pg.evaluate(() => { const sc = PG.scene(), sh = document.querySelector('.veil .sheet'), ev = sh.querySelector('.evres'); return { type: sc.type, goal: sc.goal, n: sc.goals.length, btns: [...sh.querySelectorAll('[data-act=goal]')].map(b => b.querySelector('b').textContent), titles: sc.goals.map(g => g.t), okBtn: !!sh.querySelector('[data-act=ok]'), ev: ev ? ev.textContent : '', cls: ev ? ev.className : '', year: PG.state().year }; });
      R.ok(v.type === 'season' && v.n >= 2 && v.n <= 3 && JSON.stringify(v.btns) === JSON.stringify(v.titles) && !v.okBtn, `${w} ${key}: 결산의 목표 버튼 ${JSON.stringify(v).slice(0, 300)}`);
      R.ok(v.ev.includes(v.goal.t) && v.ev.includes(v.goal.why) && v.ev.includes(v.goal.ok === 1 ? '달성' : v.goal.ok === 0 ? '미달성' : '판정 없음') && (v.goal.ok === 1) === /\bok\b/.test(v.cls) && (v.goal.ok === 0) === /\bno\b/.test(v.cls), `${w} ${key}: 지난 목표의 판정 표시 ${v.ev} / ${JSON.stringify(v.goal)}`);
      await m('시즌 결산 ' + key);
      const pick = v.n - 1; await pg.click(`.sheet [data-act=goal][data-i="${pick}"]`); await pg.waitForTimeout(150);
      R.ok(await pg.evaluate(([t, y]) => { const g = PG.state().goal, s = JSON.parse(localStorage.getItem('pg_career_v1')); return !!g && g.t === t && g.y === y && s.goal && s.goal.t === t && (!PG.scene() || PG.scene().type !== 'season'); }, [v.titles[pick], v.year]), `${w} ${key}: 한 번 눌러 목표를 고르고 넘어가지 못함`);
    }
    // 2) 홈: 올해 목표가 목표 칸 안의 한 줄로, 라이벌전 줄에 기록된 사실 한 줄. 첫 화면에 다 들어온다. 예전 저장(목표 없음)에는 줄이 없다
    await load(pg, S5.rvHome);
    const hm = await pg.evaluate(() => { const g = PG.goalNow(), fx = PG.rivalFixtures(), sg = document.querySelector('.goalbtn .gsum'), rc = document.querySelector('.rvcard'), foot = document.querySelector('.foot').getBoundingClientRect().top; return { g, sg: sg ? sg.textContent : '', inGoal: !!sg, story: fx[0].story, rc: rc ? rc.textContent : '', over: document.documentElement.scrollHeight - innerHeight, plan: document.querySelector('.plan5').getBoundingClientRect().bottom <= foot + 1, cards: document.querySelectorAll('.content > .goal, .content > .rvcard, .content > div').length }; });
    R.ok(hm.inGoal && hm.sg.includes(hm.g.t) && (!hm.g.txt || hm.sg.includes(hm.g.txt)) && hm.rc.includes(hm.story) && hm.plan && hm.over <= (w <= 320 ? 80 : 0), `${w}: 홈의 올해 목표·라이벌 줄 ${JSON.stringify(hm).slice(0, 400)}`);
    await m('홈 목표·라이벌');
    await load(pg, await pg.evaluate(r => { const o = JSON.parse(r); delete o.goal; delete o.goalLog; for (const x of o.rivals) { delete x.last; delete x.run; delete x.ko; delete x.mate; } return JSON.stringify(o); }, S5.rvHome));
    R.ok(await pg.evaluate(() => { const sm = document.querySelector('.rvcard small'), fx = PG.rivalFixtures()[0]; return !document.querySelector('.sgoal') && !/올해/.test((document.querySelector('.goalbtn .gsum') || {}).textContent || '') && PG.goalNow() === null && (!sm || (fx.w + fx.l === 0 && sm.textContent === '첫 맞대결.')) && !/지난 맞대결|연패|연승|같은 팀이었다|설욕/.test(document.querySelector('.rvcard').textContent); }), `${w}: 예전 저장인데 올해 목표나 기록에 없는 지난 일 문장이 보임`);
    // 3) 경기 준비: 라이벌의 지난 일 한 줄, 상대 팀 소개는 버튼 아래(승률과 무관하다고 적는다)
    await load(pg, S5.prematch); await skipWatch(pg);
    const pm = await pg.evaluate(() => { const sc = PG.scene(), sh = document.querySelector('.veil .sheet'), t = sh.textContent, kick = sh.querySelector('[data-act=kick]').getBoundingClientRect().top + sh.scrollTop, idt = [...sh.querySelectorAll('.fine')].find(e => /팀 분위기 소개/.test(e.textContent)); return { story: t.includes(sc.story), idt: !!idt && idt.textContent.includes(sc.oppIdt) && /승률 계산에는 들어가지 않는다/.test(idt.textContent), below: !!idt && idt.getBoundingClientRect().top + sh.scrollTop > kick }; });
    R.ok(pm.story && pm.idt && pm.below, `${w}: 경기 준비의 라이벌 문장·상대 소개 ${JSON.stringify(pm)}`);
    await m('경기 준비');
    // 4) 경기 결과: 선택 → 영향 → 실제 결과(두 줄 + 단서), 실제 스코어·승패와 같다. 예전의 겹치는 줄은 없다
    await load(pg, S5.match); await skipWatch(pg);
    const mt = await pg.evaluate(() => { const sc = PG.scene(), c = document.querySelector('.sheet .cause'), ps = c ? [...c.querySelectorAll('p')].map(p => p.textContent) : [], sh = document.querySelector('.veil .sheet').textContent; return { ps, res: `실제 ${sc.x}:${sc.y} ${sc.win ? '승리' : '패배'}`, moms: sc.moms.map(x => [x.label, x.ok ? '성공' : '실패']), story: sc.story, hasStory: sh.includes(sc.story), dup: /내 전략 —/.test(sh), ok: document.querySelectorAll('.sheet [data-act=ok]').length }; });
    R.ok(mt.ps.length >= 2 && mt.ps.length <= 4 && mt.ps[0].includes(mt.res) && mt.moms.every(x => mt.ps.join(' ').includes(x[0]) && mt.ps.join(' ').includes(x[1])) && /단정할 수는 없다/.test(mt.ps[mt.ps.length - 1]) && mt.hasStory && !mt.dup && mt.ok === 1, `${w}: 경기 결과의 설명 ${JSON.stringify(mt).slice(0, 500)}`);
    await m('경기 결과');
    // 5) 제안 화면: 구단 소개 한 줄과 매력·부담 한 줄(순위·주전 여부와 맞는다)
    await load(pg, S5.offers);
    const of = await pg.evaluate(() => { const sc = PG.scene(); return sc.offers.map((o, i) => { const v = PG.offerInfo(o), ul = document.querySelectorAll('.sheet .oinfo')[i], t = ul ? ul.textContent : ''; return { idt: !v.idt || t.includes(v.idt), pitch: v.here || v.squad !== 'first' ? null : [v.rank, v.teams, v.starter, /우승을 다투는 팀/.test(t), /성적은 낮은|성적이 낮은/.test(t), /바로 주전|주전으로 뛴다|주전이다/.test(t), /벤치/.test(t)] }; }); });
    R.ok(of.every(x => x.idt) && of.filter(x => x.pitch).every(x => { const [rank, teams, starter, top, low, st] = x.pitch; return top === (rank <= 2) && low === (rank >= teams - 2) && (!starter || st); }), `${w}: 제안의 구단 소개·매력과 부담 ${JSON.stringify(of).slice(0, 400)}`);
    await m('계약 제안');
    // 6) 리그 탭의 내 구단 소개, 자산 탭에서 돈을 쓰기 전의 사실(이름을 눌렀을 때만)
    await load(pg, S5.rvHome); await pg.click('[data-act=tab][data-id=league]');
    R.ok(await pg.evaluate(() => { const e = document.querySelector('.orgidt'); return !!e && e.textContent.includes(PG.org().idt); }), `${w}: 리그 탭에 내 구단 소개가 없음`);
    await m('리그 구단 소개');
    await pg.click('[data-act=tab][data-id=money]'); await pg.click('[data-act=shop-info][data-id=fanmeet]');
    const fm = await pg.evaluate(() => { const sp = PG.spendInfo(), t = document.querySelector('.sdesc').textContent; return { fame: t.includes(`지금 인기 ${sp.fame}`), pay: t.includes(`+${sp.payPct}%`), rows: document.querySelectorAll('.srow').length }; });
    await pg.click('[data-act=shop-info][data-id=analyst]');
    const an = await pg.evaluate(() => { const sp = PG.spendInfo(), t = document.querySelector('.sdesc').textContent; return { tour: sp.tour ? /플레이오프나 국제전이 열린다/.test(t) : /토너먼트가 없어/.test(t), starter: sp.starter || /주전이 아니라/.test(t), prep: /분석 자료/.test(t) }; });
    R.ok(fm.fame && fm.pay && fm.rows === 4 && an.tour && an.starter && an.prep, `${w}: 자산 탭의 사실 안내 ${JSON.stringify([fm, an])}`);
    await m('자산 설명');
    R.ok(m.clean(), `${w}: 0.11.5 화면 배치 ${m.line()}`); R.note(`0.11.5 ${w}x${h}`, m.line());
    R.ok(!pg.errs.length, `스크립트 오류 ${pg.errs}`); await ctx.close();
  }
  // H. 0.11.6: 목표는 맨 아래 접힌 한 줄, 지난 진행은 1~3줄, 소식의 중복 표시, 자산의 돈의 흐름, 선수 등록의 설명
  for (const [w, h] of [[390, 844], [320, 568]]) {
    const { ctx, pg } = await open(browser, url, { w, h, init: 'window.__pgApMs = 15;' }), m = auditor(pg);
    await load(pg, raw, 41);
    // 1) 홈의 순서(0.11.7): 자금 → 목표 → 할 일 → (라이벌전) → 지난 진행. 화면 위치와 DOM 순서가 같다. 목표는 접힌 요약
    await pg.evaluate(() => { PG.setAuto('counsel', true); }); await pg.click('[data-act=next]'); await pg.waitForTimeout(150); await clear(pg);
    const ord = await pg.evaluate(() => {
      const q = s => document.querySelector(s), top = e => (e ? Math.round(e.getBoundingClientRect().top) : -1), kids = [...q('main.content').children].map(e => e.className.split(' ')[0]);
      const gb = q('.goalbtn'), foot = q('.foot').getBoundingClientRect().top, g = PG.goalNow(), nx = PG.goal();
      return { kids, money: top(q('.stagebg .moneyrow')), moneyBottom: Math.round(q('.stagebg .moneyrow').getBoundingClientRect().bottom), goalN: document.querySelectorAll('.goal').length, plan: top(q('.plansec')), recap: top(q('.recap')), goal: top(q('.goal')), exp: gb.getAttribute('aria-expanded'), bars: document.querySelectorAll('.goal .gi').length, sum: gb.textContent, g, nx: nx.title, nOk: nx.items.filter(i => i.ok).length + '/' + nx.items.length,
        h: Math.round(gb.getBoundingClientRect().height), planSeen: q('.plan5').getBoundingClientRect().bottom <= foot + 1, next: !!q('[data-act=next]:not([disabled])'), recapLines: document.querySelectorAll('.recap > p').length, recapTxt: q('.recap').textContent.replace(/\s+/g, ' ').slice(0, 200), over: document.documentElement.scrollHeight - innerHeight };
    });
    R.ok(ord.kids[0] === 'gbox' && ord.kids.indexOf('gbox') < ord.kids.indexOf('plansec') && ord.kids.indexOf('plansec') < ord.kids.indexOf('recap') && ord.kids.filter(k => k === 'gbox').length === 1 && ord.money < ord.goal && ord.goal < ord.plan && ord.plan < ord.recap && ord.goal - ord.moneyBottom <= 24 && ord.goalN === 1, `${w}: 홈의 순서가 자금 → 목표 → 할 일 → 지난 진행이 아님(0.11.7) ${JSON.stringify(ord).slice(0, 300)}`);
    R.ok(ord.exp === 'false' && ord.bars === 0 && ord.h >= 44 && ord.h <= (w <= 320 ? 90 : 76) && ord.sum.includes(ord.nx) && ord.sum.includes(ord.nOk) && (!ord.g || ord.sum.includes(ord.g.t)), `${w}: 목표가 접힌 한 줄이 아니거나 요약이 실제 목표와 다름 ${JSON.stringify(ord).slice(0, 400)}`);
    R.ok(ord.planSeen && ord.next && ord.recapLines >= 1 && ord.recapLines <= 3, `${w}: 지난 진행이 1~3줄이 아니거나 할 일·진행 버튼이 가려짐 ${JSON.stringify(ord).slice(0, 300)}`);
    R.ok(/자금 [+−]/.test(ord.recapTxt) && /월급 \+/.test(ord.recapTxt) && /자동 관리 −/.test(ord.recapTxt), `${w}: 한 달 요약에 자금의 순변동과 내역이 없음: ${ord.recapTxt}`);
    await m('홈(한 달 진행 뒤)');
    // 펼치기·접기: 올해 목표·조건별 막대가 나오고, 고른 목표와 진행 상태는 그대로
    const g0 = await pg.evaluate(() => JSON.stringify([PG.state().goal, PG.goalNow()]));
    await pg.click('[data-act=goalopen]'); await pg.waitForTimeout(60);
    const op = await pg.evaluate(() => ({ exp: document.querySelector('.goalbtn').getAttribute('aria-expanded'), bars: document.querySelectorAll('.goal .gi').length, items: PG.goal().items.length, sg: (document.querySelector('.goal p.sgoal') || {}).textContent || '', g: PG.goalNow(), note: !!document.querySelector('.goal .fine') }));
    R.ok(op.exp === 'true' && op.bars === op.items && op.note && (!op.g || (op.sg.includes(op.g.t) && (!op.g.txt || op.sg.includes(op.g.txt)))), `${w}: 목표를 한 번 눌러 펼쳤는데 내용이 없음 ${JSON.stringify(op)}`);
    await m('홈(목표 펼침)');
    await pg.click('[data-act=goalopen]'); await pg.waitForTimeout(60);
    R.ok(await pg.evaluate(x => document.querySelector('.goalbtn').getAttribute('aria-expanded') === 'false' && JSON.stringify([PG.state().goal, PG.goalNow()]) === x, g0), `${w}: 접은 뒤 목표의 상태가 달라짐`);
    // 2) 지난 진행: 같은 경기가 토너먼트 결과와 라이벌전 두 줄로 나오지 않는다. 나머지는 "자세히"에. 저장된 요약은 그대로
    const rc = await pg.evaluate(() => {
      const S = PG.state(), r = S.recap, rv = PG.rivals()[0];
      if (!rv) return null;
      window.__rc0 = JSON.stringify(r);
      r.mt = [{ t: '검사컵 준결승', opp: '가짜 구단 A', win: true, s: '2-1' }, { t: '검사컵 결승', opp: '가짜 구단 B', win: false, s: '1-3' }, { t: '검사컵 8강', opp: '가짜 구단 C', win: true, s: '2-0' }];
      r.rv = [{ nick: rv.nick, opp: '가짜 구단 B', win: false, s: '검사용 한 줄.' }, { nick: rv.nick, opp: '가짜 구단 D', win: true }];
      r.ev = { type: 'result', title: '검사 사건', text: '가'.repeat(180), lines: ['멘탈 +1'], checked: false };
      const keep = JSON.stringify(r); PG_UI.render();
      const q = s => [...document.querySelectorAll(s)], shown = q('.recap .rvres').map(e => e.textContent), ev = document.querySelector('.recap .evres p:not(.sec)'), btn = document.querySelector('[data-act=recmore]');
      return { nick: rv.nick, shown, clamp: ev.scrollHeight > ev.clientHeight + 2, btn: btn ? btn.textContent : '', rivalBtn: !!document.querySelector('.recap [data-to=rivals]'), same: JSON.stringify(S.recap) === keep, lines: q('.recap > p').length };
    });
    if (R.ok(!!rc, `${w}: 라이벌이 없는 저장이라 요약 검사를 하지 못함`)) {
      R.ok(rc.shown.length === 1 && /결승/.test(rc.shown[0]) && rc.shown[0].includes('가짜 구단 B') && rc.shown[0].includes(rc.nick) && rc.shown[0].includes('검사용 한 줄.') && rc.shown[0].includes('1-3'), `${w}: 접힌 요약의 경기 줄이 가장 중요한 한 줄(결승·라이벌)이 아니거나 합쳐지지 않음 ${JSON.stringify(rc.shown)}`);
      R.ok(rc.clamp && /자세히 · 3건 더/.test(rc.btn) && rc.rivalBtn && rc.same && rc.lines <= 4, `${w}: 긴 사건 글이 줄지 않았거나 "자세히"·라이벌 기록 버튼이 없음 ${JSON.stringify(rc).slice(0, 300)}`);
      await m('홈(요약 접힘)');
      await pg.click('[data-act=recmore]'); await pg.waitForTimeout(60);
      const ex = await pg.evaluate(() => { const t = [...document.querySelectorAll('.recap .rvres')].map(e => e.textContent), ev = document.querySelector('.recap .evres p:not(.sec)'); return { t, full: ev.scrollHeight <= ev.clientHeight + 2, exp: document.querySelector('[data-act=recmore]').getAttribute('aria-expanded') }; });
      R.ok(ex.t.length === 4 && ex.t.filter(x => x.includes('가짜 구단 B')).length === 1 && ex.t.some(x => x.includes('가짜 구단 A')) && ex.t.some(x => x.includes('가짜 구단 C')) && ex.t.some(x => /라이벌전/.test(x) && x.includes('가짜 구단 D')) && ex.full && ex.exp === 'true', `${w}: "자세히"를 눌렀는데 나머지 경기·라이벌전이 다 나오지 않음(서로 다른 경기는 합치지 않는다) ${JSON.stringify(ex)}`);
      await m('홈(요약 펼침)');
      await pg.click('.recap [data-to=rivals]'); await pg.waitForTimeout(80);
      R.ok(await pg.evaluate(() => PG_UI.state.tab === 'league' && !!document.querySelector('.rival')), `${w}: 요약에서 라이벌 기록으로 한 번에 가지 못함`);
      await pg.click('[role=tab][data-id=home]'); await pg.waitForTimeout(60);
    }
    // 3) 기록 탭의 소식: 같은 달·같은 글은 한 번만 보이고 저장된 소식은 그대로. 긴 글은 두 줄까지, "더 보기"로 전체
    const lg = await pg.evaluate(() => {
      const S = PG.state(), y = S.year, mm = PG.month().m, long = '긴 소식 ' + '나'.repeat(120);
      S.log.unshift({ y, m: mm, msg: '검사 소식 하나', tone: '' }, { y, m: mm, msg: '검사 소식 하나', tone: '' }, { y, m: mm, msg: long, tone: '' }, { y, m: mm, msg: '검사 소식 하나', tone: 'gold' }, { y, m: mm - 1 || 12, msg: '검사 소식 하나', tone: '' });
      const n = S.log.length; PG_UI.state.tab = 'record'; PG_UI.state.logOpen = false; PG_UI.render();
      const li = [...document.querySelectorAll('.content .log li span')], t = li.map(e => e.textContent), lo = li.find(e => e.textContent === long);
      return { n, after: S.log.length, same: t.filter(x => x === '검사 소식 하나').length, shown: t.length, clamp: lo ? lo.scrollHeight > lo.clientHeight + 2 : null, btn: !!document.querySelector('[data-act=logopen]'), over: document.documentElement.scrollWidth - innerWidth };
    });
    R.ok(lg.after === lg.n && lg.shown === 4 && lg.same === 3 && lg.clamp === true && lg.btn && lg.over <= 0, `${w}: 소식의 중복 표시·긴 글 줄임 ${JSON.stringify(lg)} (같은 달·같은 종류·같은 글 한 쌍만 한 번으로, 종류나 달이 다르면 따로)`);
    await m('기록(소식 접힘)');
    await pg.click('[data-act=logopen]'); await pg.waitForTimeout(60);
    R.ok(await pg.evaluate(() => { const li = [...document.querySelectorAll('.content .log li span')], lo = li.find(e => /^긴 소식/.test(e.textContent)); return li.length > 4 && lo.scrollHeight <= lo.clientHeight + 2 && li.filter(e => e.textContent === '검사 소식 하나').length === 3; }), `${w}: "소식 더 보기"를 눌러도 전체 글이 나오지 않음`);
    await m('기록(소식 펼침)');
    await pg.evaluate(() => { PG.state().log.splice(0, 5); if (window.__rc0) PG.state().recap = JSON.parse(window.__rc0); PG.save(); });   // 검사용으로 넣은 것을 걷어 낸다
    // 4) 자산의 돈의 흐름: 진행한 달의 실제 내역, 새로 고친 뒤에는 없다고 적는다(숫자를 지어내지 않는다)
    await pg.click('[role=tab][data-id=money]'); await pg.waitForTimeout(60);
    const cb = await pg.evaluate(() => { const c = PG.cash(), b = document.querySelector('button.cashsum'), last = c.all[c.all.length - 1]; return { has: !!b, txt: b ? b.textContent : '', net: PG.fmtMoney(Math.abs(c.all.filter(x => x.y === last.y && x.m === last.m).reduce((a, x) => a + x.v, 0))), h: b ? b.getBoundingClientRect().height : 0 }; });
    R.ok(cb.has && cb.txt.includes(cb.net) && cb.h >= 44, `${w}: 자산 탭의 돈의 흐름 한 줄 ${JSON.stringify(cb)}`);
    await pg.click('[data-act=cashopen]'); await pg.waitForTimeout(60);
    R.ok(await pg.evaluate(() => { const r = [...document.querySelectorAll('.cashrow')]; return r.length >= 1 && r.length <= 3 && /월급 \+/.test(r[0].textContent) && /자동 관리 −/.test(r[0].textContent); }), `${w}: 돈의 흐름을 펼쳤는데 월급·자동 관리 내역이 없음`);
    await m('자산(돈의 흐름 펼침)');
    await pg.reload(); await pg.waitForTimeout(250); await pg.click('[data-act=continue]'); await pg.waitForTimeout(150); await pg.click('[role=tab][data-id=money]'); await pg.waitForTimeout(60);
    R.ok(await pg.evaluate(() => !document.querySelector('button.cashsum') && /내역이 없다/.test((document.querySelector('p.cashsum.none') || {}).textContent || '') && !PG.cash().known), `${w}: 새로 고친 뒤 돈의 흐름이 "내역 없음"이 아님`);
    await pg.click('[role=tab][data-id=home]'); await pg.waitForTimeout(60);
    R.ok(await pg.evaluate(() => /월급 \+/.test(document.querySelector('.recap .rline').textContent)), `${w}: 새로 고친 뒤 요약이 저장된 월급 합으로 돌아가지 않음`);
    R.ok(m.clean(), `${w}: 0.11.6 화면 배치 ${m.line()}`); R.note(`0.11.6 ${w}x${h}`, m.line());
    R.ok(!pg.errs.length, `스크립트 오류 ${pg.errs}`); await ctx.close();
  }
  // H-2. 선수 등록의 설명: 고른 항목 아래 한 줄, "자세히"로 펼침. 고르는 것을 바꾸면 요약이 따라 바뀐다. 누름 수는 그대로(세 번이면 시작)
  for (const [w, h] of [[390, 844], [320, 568]]) {
    const { ctx, pg } = await open(browser, url, { w, h }), m = auditor(pg);
    await pg.click('[data-act=create]'); await pg.waitForTimeout(80);
    const r1 = await pg.evaluate(() => { const D = PG.D, e = document.querySelector('#pinfo-region'), kr = D.REGIONS.find(x => x.id === 'kr'), st = D.ORGS.filter(g => g.region === 'kr').map(g => g.str); return { t: e ? e.textContent : '', want: [kr.lgName, `${Math.min(...st)}~${Math.max(...st)}`, `×${kr.pay}`, `OVR ${kr.natThr}`], open: !!document.querySelector('#pinfo-region .pdet') }; });
    R.ok(r1.want.every(x => r1.t.includes(x)) && !r1.open, `${w}: 국적의 한 줄 요약이 실제 값과 다르거나 처음부터 펼쳐져 있음 ${JSON.stringify(r1)}`);
    await pg.click('[data-act=pick][data-grp=region][data-id=na]'); await pg.click('[data-act=cmore][data-id=region]'); await pg.waitForTimeout(60);
    const r2 = await pg.evaluate(() => { const D = PG.D, t = document.querySelector('#pinfo-region').textContent, na = D.REGIONS.find(x => x.id === 'na'); return { t: t.slice(0, 80), na: t.includes(na.lgName) && t.includes(`×${na.pay}`), same: /능력치·한계·성장 속도를 바꾸지 않는다/.test(t), all: D.REGIONS.every(x => t.includes(`${x.name} ×${x.pay}`)), li: document.querySelectorAll('#pinfo-region .pdet li').length }; });
    R.ok(r2.na && r2.same && r2.all && r2.li >= 5, `${w}: 국적을 바꾸고 "자세히"를 눌렀을 때의 설명 ${JSON.stringify(r2)}`);
    await m('선수 등록 1(국적 자세히)');
    await pg.fill('#nick', '설명'); await pg.click('[data-act=cstep]'); await pg.waitForTimeout(80);
    const r3 = await pg.evaluate(() => { const D = PG.D, ro = document.querySelector('#pinfo-role').textContent, tr = document.querySelector('#pinfo-trait').textContent, w0 = D.ROLES.find(x => x.id === 'core').w, top = D.STATS.map(s => [s.name, w0[s.id]]).sort((a, b) => b[1] - a[1])[0]; return { ro: ro.includes(`${top[0]} ${Math.round(top[1] * 100)}%`) && /고정/.test(ro), tr: /판단력 \+5/.test(tr) && /무작위/.test(tr) && /고정/.test(tr), open: document.querySelectorAll('.pdet').length }; });
    R.ok(r3.ro && r3.tr && r3.open === 0, `${w}: 포지션·성향의 한 줄 요약 ${JSON.stringify(r3)}`);
    await pg.click('[data-act=pick][data-grp=trait][data-id=grinder]'); await pg.click('[data-act=cmore][data-id=trait]'); await pg.waitForTimeout(60);
    const r4 = await pg.evaluate(() => { const B = PG.D.BAL, t = document.querySelector('#pinfo-trait').textContent; return { g: t.includes(`×${B.grinderGrow}`) && t.includes(`${B.grinderCapAge}세까지`), rnd: /34~42/.test(t) && t.includes(`0~${B.capRand}`) && t.includes(`표준편차 ${B.talentSd}`), fixed: /고정인 것/.test(t) && /매번 달라지는 것/.test(t), one: document.querySelectorAll('.pdet').length }; });
    R.ok(r4.g && r4.rnd && r4.fixed && r4.one === 1, `${w}: 성향 "자세히"의 설명이 밸런스 값과 다르거나 무작위 여부를 답하지 않음 ${JSON.stringify(r4)}`);
    await m('선수 등록 2(성향 자세히)');
    await pg.click('[data-act=cmore][data-id=role]'); await pg.waitForTimeout(60);
    R.ok(await pg.evaluate(() => { const t = document.querySelector('#pinfo-role').textContent; return document.querySelectorAll('.pdet').length === 1 && /OVR = /.test(t) && /바꿀 수 없다/.test(t) && t.includes(`비중 × ${PG.D.BAL.capRole}`); }), `${w}: 포지션 "자세히"`);
    await m('선수 등록 2(포지션 자세히)');
    await pg.click('[data-act=start]'); await pg.waitForTimeout(200);
    R.ok(await pg.evaluate(() => !!PG.state() && PG.state().trait === 'grinder' && PG.state().home === 'na' && PG.scene().type === 'pickOrg'), `${w}: 설명을 본 뒤 고른 대로 시작되지 않음`);
    R.ok(m.clean(), `${w}: 선수 등록 화면 배치 ${m.line()}`); R.note(`0.11.6 선수 등록 ${w}x${h}`, m.line());
    R.ok(!pg.errs.length, `스크립트 오류 ${pg.errs}`); await ctx.close();
  }
};
