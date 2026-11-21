// 배치 점검: 여러 화면 크기에서 실제로 진행하며 가로 넘침·작은 조작 요소·작은 글자·잘린 글자를 찾는다
const { open, step, start, auditor } = require('./lib');
module.exports = async function layout(browser, url, R, opt) {
  const steps = (opt && opt.steps) || 250;
  for (const [w, h] of [[320, 568], [390, 844], [768, 1024], [1280, 800]]) {
    const { ctx, pg } = await open(browser, url, { w, h }), m = auditor(pg);
    await m('타이틀'); await pg.click('[data-act=create]'); await m('선수 등록'); await pg.fill('#nick', '가나다라마바사아자차'); await pg.click('[data-act=start]'); await m('구단 선택'); await step(pg);
    const goTab = async t => { if (t === 'goal') { await pg.click('[data-act=tab][data-id=home]'); if (await pg.evaluate(() => document.querySelector('[data-act=goalopen]').getAttribute('aria-expanded') !== 'true')) await pg.click('[data-act=goalopen]'); } else await pg.click(`[data-act=tab][data-id=${t}]`); };   // 0.11.2: 탭 5개 + 홈의 목표 펼침
    const tabs = async () => { for (const t of ['player', 'league', 'money', 'record', 'goal', 'home']) { await goTab(t); await m('탭 ' + t); } };
    await tabs();
    let n = 0;
    while (n < steps && !(await pg.evaluate(() => PG.state().over))) {
      n++; await step(pg);
      const t = await pg.evaluate(() => (PG.scene() ? PG.scene().type : 'home')); await m(t);
      if (n % 60 === 0 && t === 'home') await tabs();
    }
    // 키보드: Tab 으로 닿는 요소마다 초점 표시가 있어야 한다
    while (await pg.evaluate(() => !!PG.scene() && !PG.state().over)) await step(pg);
    let noRing = 0, focused = 0;
    if (!(await pg.evaluate(() => PG.state().over))) for (let i = 0; i < 14; i++) {
      await pg.keyboard.press('Tab');
      const f = await pg.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const cs = getComputedStyle(e); return [e.tagName, cs.outlineStyle, parseFloat(cs.outlineWidth)]; });
      if (f) { focused++; if (f[1] === 'none' || !(f[2] >= 2)) noRing++; }
    }
    R.note(`${w}x${h} (${n}번 진행)`, m.line() + ` | Tab 초점 ${focused}개 중 표시 없는 것 ${noRing} | 스크립트 오류 ${pg.errs.length}`);
    R.ok(m.clean(), `${w}x${h}: 배치 문제 — ${m.line()}`); R.ok(noRing === 0, `${w}x${h}: 초점 표시가 없는 요소 ${noRing}개`);
    R.ok(!pg.errs.length && !(await pg.evaluate(() => window.__pgRenderError)), `${w}x${h}: 스크립트 오류 ${pg.errs}`);
    await ctx.close();
  }
};
