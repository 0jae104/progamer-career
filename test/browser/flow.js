// 처음 안내(첫 3개월)와 우승 연출, 예전 저장에서의 동작
const { open, step, start, fixtures } = require('./lib');
const tips = pg => pg.evaluate(() => [...document.querySelectorAll('.tip')].filter(e => !e.closest('[inert]')).map(e => e.id));
const inview = (pg, sel) => pg.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(), f = document.querySelector('.foot'); const lim = f && !e.closest('.sheet') ? f.getBoundingClientRect().top + 18 : innerHeight; return r.top >= 0 && r.bottom <= lim; }, sel);
async function toReport(pg) { await pg.click('[data-act=next]'); while (await pg.evaluate(() => PG.scene() && PG.scene().type) !== 'month') await step(pg); }
const reopen = async pg => { await pg.reload(); await pg.waitForTimeout(200); await pg.click('[data-act=continue]'); };

module.exports = async function flow(browser, url, R) {
  // A. 안내 3단계: 화면 안에 보이고, 새로 고쳐도 단계가 유지된다
  for (const [w, h] of [[390, 844], [320, 640], [320, 568]]) {
    const { ctx, pg } = await open(browser, url, { w, h }); await start(pg); await step(pg); await pg.waitForTimeout(800);
    R.ok(String(await tips(pg)) === 'tip-goal' && await inview(pg, '#tip-goal'), `${w}x${h}: 첫 화면에 목표 안내가 보이지 않음`);
    await pg.click('[data-act=tutnext]'); await pg.waitForTimeout(800);
    R.ok(String(await tips(pg)) === 'tip-plan' && await inview(pg, '#tip-plan'), `${w}x${h}: 계획 안내가 화면 안에 들어오지 않음`);
    await reopen(pg); R.ok(String(await tips(pg)) === 'tip-plan', `${w}x${h}: 새로 고침 뒤 안내 단계가 유지되지 않음`);
    await pg.click('[data-act=tutnext]'); R.ok((await tips(pg)).length === 0, `${w}x${h}: 홈 안내가 남음`);
    await toReport(pg); await pg.waitForTimeout(250);
    R.ok(String(await tips(pg)) === 'tip-report' && await inview(pg, '#tip-report'), `${w}x${h}: 월간 보고 안내가 보이지 않음`);
    await reopen(pg); R.ok(String(await tips(pg)) === 'tip-report', `${w}x${h}: 보고 화면에서 새로 고침 뒤 안내가 사라짐`);
    await pg.click('[data-act=tutnext]');
    R.ok((await tips(pg)).length === 0 && await pg.evaluate(() => PG.state().tut.done && localStorage.getItem('pg_tut_v1') === '1'), `${w}x${h}: 안내 완료가 저장되지 않음`);
    let seen = 0; for (let i = 0; i < 30; i++) { await step(pg); seen += (await tips(pg)).length; }
    R.ok(seen === 0, `${w}x${h}: 완료 뒤 안내가 다시 나옴`); R.ok(!pg.errs.length, `${w}x${h}: 스크립트 오류 ${pg.errs}`);
    await ctx.close();
  }
  // B. 건너뛰기, 같은 기기의 다음 커리어, 다시 보기, 3개월 뒤 종료
  {
    let { ctx, pg } = await open(browser, url); await start(pg); await step(pg);
    await pg.click('[data-act=tutskip]'); R.ok((await tips(pg)).length === 0, '건너뛰기 뒤 안내가 남음');
    await reopen(pg); R.ok((await tips(pg)).length === 0, '건너뛴 뒤 새로 고치자 안내가 다시 나옴');
    await pg.evaluate(() => PG.wipe()); await pg.reload(); await pg.waitForTimeout(200); await start(pg, 'Second'); await step(pg);
    R.ok((await tips(pg)).length === 0, '같은 기기의 두 번째 커리어에 안내가 나옴');
    await pg.click('[data-act=tab][data-id=record]'); await pg.click('[data-act=tutreplay]'); R.ok(String(await tips(pg)) === 'tip-goal', '다시 보기가 동작하지 않음');
    await ctx.close();
    ({ ctx, pg } = await open(browser, url)); await start(pg); await step(pg);
    const cnt = [];
    for (let m = 0; m < 5; m++) { await toReport(pg); cnt.push((await tips(pg)).length); while (await pg.evaluate(() => !!PG.scene())) await step(pg); cnt.push((await tips(pg)).length); }
    R.note('안내를 누르지 않았을 때 달마다 보이는 안내 수(보고, 홈)', cnt);
    R.ok(cnt[0] === 1 && cnt[1] === 1 && cnt[5] === 1 && cnt[7] === 0 && cnt[8] === 0 && cnt[9] === 0, '안내는 3개월 동안만 남아야 함');
    await ctx.close();
  }
  // C. 예전 저장 전부: 안내 없이 열리고 진행된다
  {
    const { ctx, pg } = await open(browser, url), bad = [], fx = fixtures();
    for (const [name, json] of fx) {
      await pg.evaluate(s => { localStorage.clear(); localStorage.setItem('pg_career_v1', s); }, json); await pg.reload(); await pg.waitForTimeout(120);
      await pg.click('[data-act=continue]'); let t = (await tips(pg)).length;
      for (let i = 0; i < 12 && !(await pg.evaluate(() => PG.state().over)); i++) { await step(pg); t += (await tips(pg)).length; }
      if (t || !(await pg.evaluate(() => PG.state().tut.done)) || await pg.evaluate(() => window.__pgRenderError)) bad.push(name);
    }
    R.note('예전 저장', `${fx.length}종을 열어 12번씩 진행, 문제가 있던 저장 ${bad.length}종 ${bad}`);
    R.ok(!bad.length && !pg.errs.length, `예전 저장에서 안내 또는 오류: ${bad} ${pg.errs}`);
    await ctx.close();
  }
  // D. 우승 연출: 우승 화면에서 멈춘 저장을 만든다
  let titleSave = null;
  {
    const { ctx, pg } = await open(browser, url);
    titleSave = await pg.evaluate(() => {
      for (let k = 0; k < 60; k++) {
        PG.newGame({ nick: 'Champ', region: 'kr', role: 'core', trait: 'brain' });
        for (let n = 0; n < 20000 && !PG.state().over; n++) { const sc = PG.scene(); if (sc && sc.type === 'info' && sc.cele === 1) return localStorage.getItem('pg_career_v1'); PG.autoStep(); }
      }
      return null;
    });
    R.ok(!!titleSave, '우승 화면에서 멈춘 저장을 만들지 못함'); await ctx.close();
  }
  for (const reduced of [false, true]) {
    const tag = reduced ? '움직임 줄이기' : '보통';
    const { ctx, pg } = await open(browser, url, { reduced });
    await pg.evaluate(s => { localStorage.clear(); localStorage.setItem('pg_career_v1', s); }, titleSave); await reopen(pg);
    const look = () => pg.evaluate(() => { const s = document.querySelector('.sheet'), c = s.querySelector('.confetti i'); return { cele: s.classList.contains('cele'), play: s.classList.contains('play'), n: s.querySelectorAll('.confetti i').length, anim: c ? getComputedStyle(c).animationName : '', disp: c ? getComputedStyle(c.parentElement).display : '', h2: s.querySelector('h2').textContent, news: !!s.querySelector('.news'), chips: s.querySelectorAll('.chip').length, trophy: !!s.querySelector('.trophy svg'), bg: document.querySelector('.stagebg').inert, modal: getComputedStyle(document.body).overflow, focus: document.activeElement.className }; });
    const a = await look(); R.note(`우승 화면(${tag})`, `연출 ${a.anim || '없음'}, 색종이 ${a.n}개(${a.disp}), 제목 "${a.h2}"`);
    R.ok(a.cele && a.play && a.trophy && a.chips >= 2 && /우승|금메달/.test(a.h2), `${tag}: 우승 화면 구성 이상 ${JSON.stringify(a)}`);
    R.ok(reduced ? a.anim === 'none' && a.disp === 'none' : a.anim === 'fall' && a.n === 14, `${tag}: 연출 상태가 설정과 다름 ${JSON.stringify(a)}`);
    R.ok(a.bg === true && a.modal === 'hidden' && a.focus.includes('sheet'), `${tag}: 대화상자 처리 이상`);
    const st = () => pg.evaluate(() => JSON.stringify([PG.state().car.titles.length, PG.state().money, PG.state().fame, PG.state().log.length]));
    const s0 = await st(); for (let i = 0; i < 3; i++) await reopen(pg);
    const b = await look();
    R.ok(b.cele && !b.play && b.trophy && b.chips === a.chips && (await st()) === s0, `${tag}: 다시 열자 연출이 또 재생되거나 기록이 달라짐`);
    await pg.keyboard.press('Tab'); const foc = await pg.evaluate(() => document.activeElement.dataset.act || ''); await pg.keyboard.press('Enter');
    R.ok(foc === 'ok' && await pg.evaluate(() => !PG.scene() || !PG.scene().cele), `${tag}: 키보드로 우승 화면을 넘기지 못함`);
    R.ok(!pg.errs.length, `${tag}: 스크립트 오류 ${pg.errs}`); await ctx.close();
  }
  // E. 이후 진행: 우승 화면 수 = 늘어난 우승 기록 수, 다른 알림 화면에는 연출 없음
  {
    const { ctx, pg } = await open(browser, url);
    await pg.evaluate(s => { localStorage.clear(); localStorage.setItem('pg_career_v1', s); }, titleSave); await reopen(pg);
    const t0 = await pg.evaluate(() => PG.state().car.titles.length - 1);
    let celes = 0, others = 0, wrong = 0, n = 0;
    do {
      const r = await pg.evaluate(() => { const sc = PG.scene(); if (!sc || sc.type !== 'info') return null; const s = document.querySelector('.sheet'); return [!!sc.cele, s.classList.contains('cele'), s.classList.contains('play')]; });
      if (r) { if (r[0]) { celes++; if (!r[1] || !r[2]) wrong++; } else { others++; if (r[1]) wrong++; } }
      await step(pg);
    } while (++n < 1500 && !(await pg.evaluate(() => PG.state().over)));
    const t1 = await pg.evaluate(() => PG.state().car.titles.length);
    R.note('우승 화면과 기록', `우승 화면 ${celes}회, 다른 알림 ${others}회, 늘어난 우승 기록 ${t1 - t0}회, 어긋난 경우 ${wrong}`);
    R.ok(wrong === 0 && celes === t1 - t0, '우승 화면 수와 우승 기록이 다르거나 연출이 엉뚱한 화면에 나옴'); R.ok(!pg.errs.length, `스크립트 오류 ${pg.errs}`);
    await ctx.close();
  }
};
