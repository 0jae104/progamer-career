// 포지션(9단계): 선수 등록 화면의 포지션 안내, 전용 승부처·계약 제안·포지션 가이드·라이벌 구분의 표시와 배치, 예전 포지션 이름의 표시 변환
const { open, step, auditor } = require('./lib');
const NAMES = { van: ['탑', 'TOP'], rov: ['정글', 'JUNGLE'], core: ['미드', 'MID'], gun: ['원딜', 'ADC'], sup: ['서폿', 'SUPPORT'] };
const reopen = async pg => { await pg.reload(); await pg.waitForTimeout(200); await pg.click('[data-act=continue]'); await pg.waitForTimeout(150); };

module.exports = async function positions(browser, url, R) {
  for (const [w, h] of [[320, 568], [390, 844], [768, 1024], [1280, 800]]) {
    const { ctx, pg } = await open(browser, url, { w, h }), m = auditor(pg);
    // A. 선수 등록: 다섯 포지션의 이름·영문 표기, 고르면 장점·주의·주요 능력치가 펼쳐진다
    await pg.click('[data-act=create]'); await pg.click('[data-act=cstep]');   // 0.11.2: 포지션은 등록의 두 번째 화면
    for (const id of Object.keys(NAMES)) {
      const b = pg.locator(`[data-act=pick][data-grp=role][data-id=${id}]`); await b.click();
      const t = await b.innerText();
      R.ok(t.includes(NAMES[id][0]) && t.includes(NAMES[id][1]) && t.includes('장점') && t.includes('주의') && t.includes('주요 능력치') && !/\d+%/.test(t) && await b.getAttribute('aria-pressed') === 'true', `${w}: ${id} 포지션 안내가 펼쳐지지 않음`);
      await m('선수 등록 ' + id);
    }
    R.ok(await pg.locator('[data-grp=role][aria-pressed=true]').count() === 1 && !/선봉|유격|사수/.test(await pg.innerText('#app')), `${w}: 예전 포지션 이름이 남아 있거나 선택 표시가 여럿`);
    if (w === 390) {   // 키보드: Tab 으로 포지션 버튼에 닿고 Enter 로 고른다
      await pg.focus('[data-grp=role][data-id=van]'); await pg.keyboard.press('Tab'); await pg.keyboard.press('Enter');
      R.ok(await pg.evaluate(() => { const e = document.activeElement; return e.dataset.id === 'rov' && e.getAttribute('aria-pressed') === 'true' && getComputedStyle(e).outlineStyle !== 'none'; }), '키보드로 포지션을 고르지 못하거나 초점 표시가 없음');
    }
    // B. 포지션마다: 전용 승부처 화면, 월간 보고의 해설, 계약 제안 설명, 능력 탭의 가이드와 라이벌 구분
    for (const id of w === 390 ? Object.keys(NAMES) : ['sup', 'gun']) {
      const got = await pg.evaluate(role => {
        localStorage.clear(); localStorage.setItem('pg_tut_v1', '1'); PG._seen();   // 검사가 저장소를 직접 비웠다: 다른 탭이 지운 것으로 보지 않게 맞춘다
        const out = {};
        for (let k = 0; k < 60 && !(out.moment && out.offers && out.home); k++) {
          PG.newGame({ nick: '가나다라마바사아자차', region: ['kr', 'cn', 'eu', 'na'][k % 4], role, trait: 'brain' });
          for (let n = 0; n < 20000 && !PG.state().over; n++) {
            const sc = PG.scene(), s = PG.state();
            if (sc && sc.type === 'moment' && !out.moment && PG.D.MOMENTS.find(x => x.id === sc.mid).role === role) out.moment = localStorage.getItem('pg_career_v1');
            if (sc && sc.type === 'offers' && !out.offers && sc.offers.length >= 2 && s.car.g > 30) out.offers = localStorage.getItem('pg_career_v1');
            if (!sc && !out.home && s.car.g > 40 && s.rivals.some(r => !r.retired)) out.home = localStorage.getItem('pg_career_v1');
            PG.autoStep();
          }
        }
        return out;
      }, id);
      R.ok(got.moment && got.offers && got.home, `${w} ${id}: 검사용 상황을 만들지 못함`);
      const put = s => pg.evaluate(x => { localStorage.setItem('pg_career_v1', x); }, s);
      await put(got.moment); await reopen(pg);
      await pg.evaluate(() => { const b = document.querySelector('[data-act=wskip]'); if (b) b.click(); }); await pg.waitForTimeout(60);   // 0.11.0: 승부처 앞의 관전을 건너뛴다
      const mo = await pg.evaluate(() => ({ n: document.querySelectorAll('.sheet .choice').length, cond: document.querySelector('.sheet').textContent.includes('컨디션') === PG.D.MOMENTS.find(x => x.id === PG.scene().mid).c.some(c => !!c.chk.cond),   // 컨디션이 걸린 상황에서만 보여야 한다(0.10.0의 sup_swap 은 컨디션이 없다)
         pct: document.querySelectorAll('.sheet .choice .pill').length, role: PG.D.MOMENTS.find(x => x.id === PG.scene().mid).role, label: document.querySelector('.sheet').getAttribute('aria-label') }));
      R.ok(mo.n === 3 && mo.cond && mo.pct === 3 && mo.role === id && !!mo.label, `${w} ${id}: 전용 승부처 화면 구성 ${JSON.stringify(mo)}`); await m('승부처 ' + id);
      await pg.locator('.sheet .choice').first().click(); await pg.waitForTimeout(80); await m('승부처 결과 ' + id);
      const before = await pg.evaluate(() => JSON.stringify([PG.scene().ok, PG.scene().x, PG.scene().y, PG.state().money]));
      await reopen(pg); R.ok(await pg.evaluate(() => JSON.stringify([PG.scene().ok, PG.scene().x, PG.scene().y, PG.state().money])) === before, `${w} ${id}: 승부처 결과 화면에서 새로 고치자 결과가 달라짐`);
      // 0.11.1: 평범한 달의 보고는 창이 아니라 플레이 화면의 "결과 자세히"에 들어간다. 그 달의 보고가 나올 때까지 진행한 뒤 펼쳐서 본다(라이벌전이 있던 달은 창으로 뜬다)
      const lr0 = await pg.evaluate(() => JSON.stringify(PG.lastRep()));
      for (let i = 0; i < 40 && (await pg.evaluate(() => PG.scene() && PG.scene().type)) !== 'month' && (await pg.evaluate(() => JSON.stringify(PG.lastRep()))) === lr0; i++) await step(pg);
      const modal = await pg.evaluate(() => !!PG.scene() && PG.scene().type === 'month');
      if (!modal) await pg.evaluate(() => { PG_UI.state.repOpen = true; PG_UI.render(); });   // 다른 창(탈락 소식 등)이 떠 있어도 뒤의 플레이 화면에 펼쳐 둔다
      const rep = await pg.evaluate(modal => { const sc = modal ? PG.scene() : PG.lastRep(), box = document.querySelector(modal ? '.sheet' : '.repbody'), v = PG.roleReview(sc.matches), e = box.querySelector('.act'); return { has: !!v, shown: e ? e.textContent : '', pos: v && v.pos, moms: [...box.querySelectorAll('.mom')].map(x => x.textContent).join(' ') }; }, modal);
      R.ok(rep.has ? rep.shown.includes(NAMES[id][0] + ' 해설') : !rep.shown, `${w} ${id}: 월간 보고의 포지션 해설 표시 ${JSON.stringify(rep).slice(0, 200)}`);
      R.ok(rep.moms.includes('승부처'), `${w} ${id}: 승부처 결과가 월간 보고의 경기 기록에 없음`); await m('월간 보고 ' + id);
      await put(got.offers); await reopen(pg);
      const of = await pg.evaluate(() => [...document.querySelectorAll('.sheet .offer')].map(o => o.querySelector('.oinfo') ? o.querySelector('.oinfo').textContent : ''));
      R.ok(of.length >= 2 && of.every(t => /전력 \d+ \(리그 \d+팀 중 \d+위\)/.test(t) && /감독 신뢰/.test(t)) && of.some(t => /지금 연봉보다|지금 팀이다/.test(t)), `${w} ${id}: 계약 제안 설명이 빠짐 ${of.join(' / ').slice(0, 200)}`); await m('계약 제안 ' + id);
      await put(got.home); await reopen(pg); await pg.click('[data-act=tab][data-id=player]');
      const st = await pg.evaluate(() => ({ guide: (document.querySelector('.guide') || {}).textContent || '', head: document.querySelector('.lower .who span').textContent }));
      await pg.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; })); await m('선수 탭 ' + id);
      await pg.click('[data-act=tab][data-id=league]');   // 0.11.2: 라이벌은 리그 탭
      Object.assign(st, await pg.evaluate(() => ({ kinds: [...document.querySelectorAll('.rkind')].map(e => e.textContent), rivals: document.querySelectorAll('.rival').length })));
      R.ok(st.guide.includes(NAMES[id][0] + ' 가이드') && /OVR을 빨리 올리는 계획/.test(st.guide) && st.kinds.length === st.rivals && st.head.includes(NAMES[id][0]), `${w} ${id}: 능력 탭의 포지션 가이드 또는 라이벌 구분 ${JSON.stringify(st).slice(0, 240)}`);
      await pg.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; })); await m('리그 탭 ' + id);
    }
    // C. 예전 포지션 이름으로 저장된 기록: 화면과 카드에서는 지금 이름, 저장은 그대로
    await pg.evaluate(() => { localStorage.clear(); localStorage.setItem('pg_hall_v1', JSON.stringify(['선봉', '유격', '코어', '사수', '지원'].map((role, i) => ({ nick: 'Old' + i, role, score: 80 - i, grade: 'A', ep: '리그의 간판', peak: 85, titles: 2, years: 10 })))); });
    await pg.reload(); await pg.waitForTimeout(200); await pg.click('[data-act=hall]');
    const list = await pg.innerText('.hlist');
    R.ok(['탑', '정글', '미드', '원딜', '서폿'].every(n => list.includes(n)) && !/선봉|유격|코어|사수|지원/.test(list), `${w}: 예전 포지션 이름이 목록에 그대로 보임`); await m('예전 기록 목록');
    await pg.locator('.hcmp').nth(0).click(); await pg.locator('.hcmp').nth(4).click(); await pg.click('[data-act=compare]');
    const cmp = await pg.innerText('.cmp'); R.ok(cmp.includes('탑') && cmp.includes('서폿') && !/선봉|지원/.test(cmp), `${w}: 비교 화면의 포지션 이름`); await m('예전 기록 비교'); await pg.click('[data-act=back]');
    await pg.locator('.hmain').nth(2).click(); R.ok((await pg.innerText('.vault')).includes('미드'), `${w}: 상세 화면의 포지션 이름`);
    await pg.click('[data-act=card]'); await pg.waitForSelector('.cardimg', { timeout: 10000 });
    R.ok(await pg.evaluate(() => PG_UI.state.card.rec.role === '미드' && JSON.parse(localStorage.getItem('pg_legacy_v1')).recs.every(r => ['선봉', '유격', '코어', '사수', '지원'].includes(r.role)) && JSON.parse(localStorage.getItem('pg_hall_v1'))[2].role === '코어'), `${w}: 카드의 포지션 이름 또는 저장 원본`);
    R.note(`${w}x${h}`, m.line() + ` | 스크립트 오류 ${pg.errs.length}`);
    R.ok(m.clean() && !pg.errs.length && !(await pg.evaluate(() => window.__pgRenderError)), `${w}: 배치 문제 또는 오류 — ${m.line()} ${pg.errs}`);
    await ctx.close();
  }
};
