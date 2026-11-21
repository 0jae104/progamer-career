// 자동진행(0.11.2)과 명령 충돌 회귀. PC 헤드리스 크롬이며 실제 폰 검사가 아니다.
const { open } = require('./lib');
// 승부처 장면에서 멈춘 저장을 만든다(엔진만으로)
const MOMENT = () => {
  localStorage.clear(); localStorage.setItem('pg_tut_v1', '1'); PG._seen();
  for (let seed = 1; seed <= 60; seed++) {
    PG.seed(7000 + seed); PG.newGame({ nick: '승부처', region: 'kr', role: ['van', 'rov', 'core', 'gun', 'sup'][seed % 5], trait: 'brain' });
    let n = 0;
    while (!PG.state().over && n++ < 40000) { const sc = PG.scene(); if (sc && sc.type === 'moment' && PG.state().tut.done) { PG.save(); return { raw: localStorage.getItem('pg_career_v1'), seed }; } PG.autoStep(); }
  }
  return null;
};
module.exports = async function auto(browser, url, R) {
  const mk = await open(browser, url), mom = await mk.pg.evaluate(MOMENT); await mk.ctx.close();
  R.ok(!!mom, '승부처 저장을 만들지 못함');
  const load = async (pg, raw) => { await pg.evaluate(x => { localStorage.clear(); localStorage.setItem('pg_tut_v1', '1'); localStorage.setItem('pg_career_v1', x); }, raw); await pg.reload(); await pg.waitForTimeout(250); await pg.click('[data-act=continue]'); await pg.waitForTimeout(200); };

  // A. 명령 충돌 회귀: "감독 판단에 맡긴다"는 승부처를 진행시키고, 자동 관리 스위치는 건드리지 않는다
  {
    const { ctx, pg } = await open(browser, url);
    await load(pg, mom.raw);
    await pg.evaluate(() => { const w = document.querySelector('[data-act=wskip]'); if (w) w.click(); }); await pg.waitForTimeout(400);   // 관전 중이면 건너뛴다
    const before = await pg.evaluate(() => ({ t: PG.scene().type, title: PG.scene().title, auto: JSON.stringify(PG.state().auto || null), n: PG.autoInfo().n, btn: [...document.querySelectorAll('.sheet button')].filter(b => /감독 판단/.test(b.textContent)).length }));
    R.ok(before.t === 'moment' && before.btn === 1, `A: 승부처 화면에 "감독 판단" 버튼이 하나가 아님 ${JSON.stringify(before)}`);
    await pg.evaluate(() => [...document.querySelectorAll('.sheet button')].find(b => /감독 판단/.test(b.textContent)).click());
    await pg.waitForTimeout(250);
    const after = await pg.evaluate(() => ({ t: PG.scene() && PG.scene().type, auto: JSON.stringify(PG.state().auto || null), n: PG.autoInfo().n, txt: (document.querySelector('.veil .sheet') || document.body).textContent.slice(0, 400) }));
    R.ok(after.t !== 'moment', `A: "감독 판단에 맡긴다"를 눌렀는데 승부처가 진행되지 않음(장면 ${after.t})`);
    R.ok(after.auto === before.auto && after.n === before.n, `A: 승부처 버튼이 자동 관리 설정을 바꿈 ${before.auto} → ${after.auto}`);
    R.ok(/감독 판단|자동 선택/.test(after.txt), `A: 결과에 자동 선택 표시가 없음: ${after.txt.slice(0, 160)}`);
    R.note('명령 충돌', `승부처 "${before.title}"에서 "감독 판단" → 장면 ${before.t} → ${after.t}, 자동 관리 설정 변화 없음`);
    R.ok(!pg.errs.length, `스크립트 오류 ${pg.errs}`); await ctx.close();
  }
};
