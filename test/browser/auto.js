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

  // 소속별 저장(연습생·2군·1군)을 시드마다 만든다
  const SAVE = ([seed, squad]) => {
    localStorage.clear(); localStorage.setItem('pg_tut_v1', '1'); PG._seen();
    for (let k = 0; k < 30; k++) {
      PG.seed(seed * 100 + k); PG.newGame({ nick: '자동' + seed, region: ['kr', 'cn', 'eu', 'na'][seed % 4], role: ['van', 'rov', 'core', 'gun', 'sup'][seed % 5], trait: ['genius', 'grinder', 'brain'][seed % 3] });
      let n = 0; while (n++ < 30000 && !PG.state().over && !(PG.state().squad === squad && PG.state().tut.done && !PG.scene() && PG.state().m <= 2 && PG.state().injury === 0)) PG.autoStep();
      if (!PG.state().over && PG.state().squad === squad && !PG.scene()) { delete PG.state().recap; delete PG.state().lastRep; PG.save(); return localStorage.getItem('pg_career_v1'); }
    }
    return '';
  };
  const NEVER = ['info', 'season', 'cards', 'stove', 'offers', 'tryout', 'pickOrg', 'retire'];
  const stopped = pg => pg.waitForFunction(() => !PG_UI.ap.on, null, { timeout: 60000 });
  const clear = async pg => { for (let i = 0; i < 80 && await pg.evaluate(() => !!PG.scene() && !PG.state().over); i++) { await pg.evaluate(() => { const w = document.querySelector('[data-act=wskip]'); if (w) return w.click(); const k = document.querySelector('.sheet [data-act=kick][data-id=none]'); if (k) return k.click(); const b = [...document.querySelectorAll('.veil .sheet [data-act]')].find(x => !x.disabled && !['snd', 'retire', 'reroll', 'mom-auto'].includes(x.dataset.act)); if (b) b.click(); }); await pg.waitForTimeout(25); } };
  const ym = pg => pg.evaluate(() => PG.state().year * 12 + PG.state().m);

  // B. 처음 누르면 무엇을 맡기는지 먼저 보여 준다. 시작 전에는 아무것도 진행하지 않는다. 한 번 시작한 뒤에는 한 번 눌러 바로 시작한다.
  const mk2 = await open(browser, url), base = await mk2.pg.evaluate(SAVE, [3, 'first']); await mk2.ctx.close();
  {
    const { ctx, pg } = await open(browser, url, { init: 'window.__pgApMs = 15;' });
    await load(pg, base); await pg.evaluate(() => PG.seed(77));
    const y0 = await ym(pg);
    R.ok(await pg.evaluate(() => !PG_UI.ap.on && !PG.state().ap && PG.apInfo().seen === false && PG.autoInfo().n === 0), 'B: 불러온 저장에서 자동진행·자동 관리가 켜져 있음');
    await pg.click('[data-act=ap-go]'); await pg.waitForTimeout(200);
    const sh = await pg.evaluate(() => ({ sheet: (document.querySelector('.veil .sheet') || {}).textContent || '', on: PG_UI.ap.on, inert: document.querySelector('.stagebg').hasAttribute('inert'), focus: document.activeElement && document.activeElement.classList.contains('sheet') }));
    R.ok(/항상 멈추는 곳/.test(sh.sheet) && /계약·이적/.test(sh.sheet) && /성장 카드/.test(sh.sheet) && !sh.on && sh.inert && sh.focus && await ym(pg) === y0, `B: 첫 누름에 설명이 뜨지 않았거나 이미 진행됨 ${JSON.stringify(sh).slice(0, 200)}`);
    await pg.click('[data-act=ap-style][data-id=bold]'); await pg.click('[data-act=ap-match]'); await pg.click('[data-act=ap-rest]');
    R.ok(await pg.evaluate(() => { const a = PG.apInfo(); return a.style === 'bold' && a.match === true && a.rest === false && document.querySelector('[data-act=ap-style][data-id=bold]').getAttribute('aria-pressed') === 'true'; }) && await ym(pg) === y0, 'B: 설정을 바꾸지 못했거나 설정만으로 진행됨');
    await pg.click('[data-act=ap-match]'); await pg.click('[data-act=ap-rest]'); await pg.click('[data-act=ap-style][data-id=even]');
    await pg.click('[data-act=ap-close]');
    R.ok(await pg.evaluate(() => !document.querySelector('.veil') && !PG_UI.ap.on) && await ym(pg) === y0, 'B: 닫기를 눌렀는데 진행됨');
    // 엔진만으로 같은 저장·같은 시드를 돌린 결과와 화면에서 돌린 결과가 같아야 한다
    const eng = await pg.evaluate(([r, s]) => { const keep = localStorage.getItem('pg_career_v1'); localStorage.setItem('pg_career_v1', r); PG._seen(); PG.load(); PG.seed(s); PG.autoStart(); let k = 0, st = ''; for (let i = 0; i < PG.D.BAL.ap.max; i++) { const x = PG.autoMonth(); k += x.k; if (x.stop) { st = x.stop; break; } } const S = PG.state(), out = { k, st, core: JSON.stringify([S.year, S.m, S.money, S.cond, S.stats, S.car]), sc: PG.scene() && PG.scene().type, aun: PG.recap().aun || 0 }; localStorage.setItem('pg_career_v1', keep); PG._seen(); PG.load(); PG.seed(s); return out; }, [base, 77]);
    await pg.evaluate(() => PG_UI.render());
    await pg.click('[data-act=ap-set]'); await pg.click('[data-act=ap-start]');
    R.ok(await pg.evaluate(() => PG_UI.ap.on && !!document.querySelector('[data-act=ap-pause]') && !document.querySelector('[data-act=next]')), 'B: 시작을 눌렀는데 진행 중 표시가 없음');
    await stopped(pg);
    const ui = await pg.evaluate(() => { const S = PG.state(); return { core: JSON.stringify([S.year, S.m, S.money, S.cond, S.stats, S.car]), sc: PG.scene() && PG.scene().type, stop: PG.recap().stop, n: PG.recap().n, why: (document.querySelector('.stopwhy') || {}).textContent || '', sheet: !!document.querySelector('.veil .sheet'), next: !!document.querySelector('[data-act=next]') }; });
    R.ok(eng.k >= 2 && ui.core === eng.core && ui.sc === eng.sc && ui.stop === eng.st, `B: 화면의 자동진행이 엔진과 다름 ${eng.k}개월 ${eng.st}/${ui.stop} ${eng.sc}/${ui.sc}`);
    R.ok(ui.why.length > 4 && ui.next && (ui.sc ? ui.sheet : true), `B: 멈춘 이유가 보이지 않음 ${JSON.stringify(ui).slice(-160)}`);
    R.note('한 번 누름', `1군 저장에서 "자동진행" 한 번 → ${eng.k}개월 진행, 대신 고른 것 ${eng.aun}건, 멈춘 이유 "${ui.why}"`);
    await clear(pg);
    // 두 번째부터는 설명 없이 한 번에 시작
    const y1 = await ym(pg);
    if (await pg.evaluate(() => !PG.state().over)) { await pg.click('[data-act=ap-go]'); R.ok(await pg.evaluate(() => PG_UI.ap.on || PG.state().year * 12 + PG.state().m > 0) && await pg.evaluate(() => !document.querySelector('.apstops')), 'B: 두 번째 누름에 또 설명이 뜸'); await stopped(pg); R.ok(await ym(pg) > y1 || await pg.evaluate(() => !!PG.scene()), 'B: 두 번째 누름이 진행되지 않음'); }
    R.ok(!pg.errs.length && await pg.evaluate(() => !window.__pgApError), `스크립트 오류 ${pg.errs}`); await ctx.close();
  }

  // C. 시드 10개(연습생 3·2군 3·1군 4): 평범한 사건 3회 이상을 추가 입력 없이 지나 이어지는 구간이 시드마다 있어야 한다(1군은 "경기도 맡기기"를 켠 상태). 대신 넘긴 장면은 정책표가 허용한 것뿐이다.
  {
    const plan = [[11, 'trainee'], [12, 'trainee'], [13, 'trainee'], [14, 'second'], [15, 'second'], [16, 'second'], [17, 'first'], [18, 'first'], [19, 'first'], [20, 'first']];
    const { ctx, pg } = await open(browser, url, { init: 'window.__pgApMs = 0;' });
    let okSeeds = 0, totalRuns = 0, totalMonths = 0, totalEv = 0; const stopsSeen = {}, lines = [];
    for (const [seed, squad] of plan) {
      const raw = await pg.evaluate(SAVE, [seed, squad]); if (!R.ok(!!raw, `C: ${squad} 저장(시드 ${seed})을 만들지 못함`)) continue;
      await load(pg, raw);
      await pg.evaluate(s => { PG.seed(s * 31); PG.setAp('seen', true); PG.setAp('match', PG.state().squad === 'first'); PG.setAp('style', ['safe', 'even', 'bold'][s % 3]); window.__ops = []; PG._apTrace(window.__ops); PG_UI.render(); }, seed);
      let best = 0, bestK = 0, runs = 0, clicks = 0;
      for (let r = 0; r < 14 && best < 3 && await pg.evaluate(() => !PG.state().over); r++) {
        const o0 = await pg.evaluate(() => window.__ops.length), m0 = await pg.evaluate(() => PG.state().stat.turns);
        await pg.click('[data-act=ap-go]'); clicks = 1; runs++; await stopped(pg);
        const res = await pg.evaluate(o => ({ ev: window.__ops.slice(o).filter(x => x[0] === 'res' && x[2] === 'event').length, bad: window.__ops.slice(o).filter(x => x[0] === 'res').map(x => x[2]), stop: PG.recap().stop, sc: PG.scene() && PG.scene().type }), o0);
        const k = await pg.evaluate(() => PG.state().stat.turns) - m0; totalMonths += k;
        // 평범한 사건 때문에 멈춘 적이 없어야 한다: 사건 장면에서 멈췄다면 이유는 '한 번뿐인 사건'이나 '돈이 드는 선택'이어야 한다
        if (res.sc === 'event' && res.stop !== 'once' && res.stop !== 'money') R.ok(false, `C: 시드 ${seed}: 평범한 사건에서 멈춤(${res.stop})`); totalEv += res.ev; stopsSeen[res.stop] = (stopsSeen[res.stop] || 0) + 1;
        for (const t of res.bad) if (NEVER.includes(t)) R.ok(false, `C: 시드 ${seed}: 대신 넘기면 안 되는 장면을 넘김 ${t}`);
        if (res.sc && !NEVER.includes(res.sc) && !['prematch', 'event', 'month'].includes(res.sc)) R.ok(false, `C: 시드 ${seed}: 예상하지 못한 장면에서 멈춤 ${res.sc}`);
        if (res.ev > best) { best = res.ev; bestK = k; }
        await clear(pg);
      }
      totalRuns += runs; if (best >= 3) okSeeds++;
      lines.push(`${squad} 시드 ${seed}: 한 번 눌러 사건 ${best}회를 지나 ${bestK}개월`);
      R.ok(best >= 3, `C: ${squad} 시드 ${seed}: 사건 3회 이상을 추가 입력 없이 지난 구간이 없음(최대 ${best}회, ${runs}번 시도)`);
    }
    R.note('연속 진행', `시드 10개 중 ${okSeeds}개에서 "사건 3회 이상을 지나 추가 입력 없이 계속" 확인 · 자동진행 ${totalRuns}번에 ${totalMonths}개월(한 번에 평균 ${(totalMonths / Math.max(1, totalRuns)).toFixed(1)}개월) · 대신 고른 사건 ${totalEv}건`);
    R.note('시드별', lines.join(' | '));
    R.note('멈춘 이유', Object.entries(stopsSeen).map(([k, v]) => `${k} ${v}`).join(', '));
    R.ok(!pg.errs.length && await pg.evaluate(() => !window.__pgApError), `스크립트 오류 ${pg.errs}`); await ctx.close();
  }

  // D. 멈춤 1번 누름 · 연타 · 화면 가려짐 · 탭 이동 · 새로 고침 · 다른 탭의 저장 변경 · 소리 끔 · 느린 기기
  {
    const { ctx, pg } = await open(browser, url, { init: 'window.__pgApMs = 250;' });
    const begin = async seed => { await load(pg, base); await pg.evaluate(s => { PG.seed(s); PG.setAp('seen', true); PG_UI.render(); }, seed); };
    // 멈춤: 한 번 누르면 바로 서고, 그 뒤로는 한 달도 더 가지 않는다
    await begin(5); await pg.click('[data-act=ap-go]'); await pg.waitForTimeout(700);
    const mid = await pg.evaluate(() => ({ on: PG_UI.ap.on, line: (document.getElementById('apline') || {}).textContent || '', pause: !!document.querySelector('[data-act=ap-pause]') }));
    if (mid.on) {
      R.ok(mid.pause && /개월 진행/.test(mid.line), `D: 진행 중 표시 ${JSON.stringify(mid)}`);
      await pg.click('[data-act=ap-pause]'); const y = await ym(pg), t = await pg.evaluate(() => PG.state().stat.turns);
      R.ok(await pg.evaluate(() => !PG_UI.ap.on && PG_UI.ap.t === 0 && PG.recap().stop === 'pause' && /멈춤을 눌러/.test(document.querySelector('.stopwhy').textContent) && !!document.querySelector('[data-act=next]')), 'D: 멈춤을 한 번 눌렀는데 서지 않음');
      await pg.waitForTimeout(900);
      R.ok(await ym(pg) === y && await pg.evaluate(() => PG.state().stat.turns) === t, 'D: 멈춘 뒤에도 달이 넘어감');
      R.ok(await pg.evaluate(() => { const s = JSON.parse(localStorage.getItem('pg_career_v1')); return s.year === PG.state().year && s.m === PG.state().m && s.recap.stop === 'pause'; }), 'D: 멈춘 시점이 저장되지 않음');
    } else R.ok(false, 'D: 멈춤을 누르기 전에 이미 멈춤(검사용 저장을 바꿔야 함)');
    // 연타: 시작 버튼을 여러 번 눌러도 예약 작업은 하나(0.25초에 한 달보다 빨라지지 않는다)
    await begin(6); const t0 = await pg.evaluate(() => PG.state().stat.turns);
    await pg.evaluate(() => { for (let i = 0; i < 6; i++) { const b = document.querySelector('[data-act=ap-go]'); if (b) b.click(); } });
    await pg.waitForTimeout(1100);
    const fast = await pg.evaluate(() => ({ d: PG.state().stat.turns, on: PG_UI.ap.on }));
    R.ok(fast.d - t0 <= 5, `D: 연타로 진행이 빨라짐(1.1초에 ${fast.d - t0}개월)`);
    await pg.evaluate(() => { const b = document.querySelector('[data-act=ap-pause]'); if (b) b.click(); });
    // 화면이 가려지면 선다
    await begin(7); await pg.click('[data-act=ap-go]'); await pg.waitForTimeout(350);
    if (await pg.evaluate(() => PG_UI.ap.on)) {
      await pg.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
      const y = await ym(pg); await pg.waitForTimeout(800);
      R.ok(await pg.evaluate(() => !PG_UI.ap.on && PG.recap().stop === 'hidden') && await ym(pg) === y, 'D: 화면이 가려졌는데 계속 진행됨');
      await pg.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); }); await pg.waitForTimeout(500);
      R.ok(await pg.evaluate(() => !PG_UI.ap.on) && await ym(pg) === y, 'D: 화면으로 돌아오자 저절로 다시 시작됨');
    } else R.ok(false, 'D: 가려짐 검사 전에 이미 멈춤');
    // 진행 중에 다른 탭(화면)을 누르면 서고, 그 탭으로 간다
    await begin(8); await pg.click('[data-act=ap-go]'); await pg.waitForTimeout(350);
    if (await pg.evaluate(() => PG_UI.ap.on)) { await pg.click('[data-act=tab][data-id=money]'); const y = await ym(pg); await pg.waitForTimeout(700); R.ok(await pg.evaluate(() => !PG_UI.ap.on && PG_UI.state.tab === 'money' && !!document.querySelector('#autop')) && await ym(pg) === y, 'D: 탭을 옮겼는데 계속 진행됨'); } else R.ok(false, 'D: 탭 이동 검사 전에 이미 멈춤');
    // 진행 중에 새로 고침: 다시 열면 멈춰 있고, 저장은 마지막으로 끝낸 달
    await begin(9); await pg.click('[data-act=ap-go]'); await pg.waitForTimeout(600);
    const savedYm = await pg.evaluate(() => { const s = JSON.parse(localStorage.getItem('pg_career_v1')); return [s.year * 12 + s.m, s.stat.turns, s.money]; });
    await pg.reload(); await pg.waitForTimeout(300); await pg.click('[data-act=continue]'); await pg.waitForTimeout(700);
    const after = await pg.evaluate(() => ({ on: PG_UI.ap.on, v: [PG.state().year * 12 + PG.state().m, PG.state().stat.turns, PG.state().money], sc: PG.scene() && PG.scene().type }));
    R.ok(!after.on && after.v[0] >= savedYm[0] && after.v[0] <= savedYm[0] + 1 && after.v[1] <= savedYm[1] + 1, `D: 새로 고친 뒤 ${JSON.stringify(after)} / 저장 ${savedYm}`);
    const again = await pg.evaluate(() => [PG.state().year * 12 + PG.state().m, PG.state().stat.turns]); await pg.waitForTimeout(600);
    R.ok(JSON.stringify(await pg.evaluate(() => [PG.state().year * 12 + PG.state().m, PG.state().stat.turns])) === JSON.stringify(again), 'D: 새로 고친 뒤 저절로 진행됨');
    // 다른 탭이 저장을 바꾸면 선다(이 탭은 더 저장하지 않는다)
    await begin(10); const other = await ctx.newPage(); await other.goto(url); await other.waitForTimeout(200);
    await pg.click('[data-act=ap-go]'); await pg.waitForTimeout(300);
    if (await pg.evaluate(() => PG_UI.ap.on)) {
      await other.evaluate(() => { const s = JSON.parse(localStorage.getItem('pg_career_v1')); s.money += 1; localStorage.setItem('pg_career_v1', JSON.stringify(s)); });
      const theirs = await other.evaluate(() => localStorage.getItem('pg_career_v1')); await pg.waitForTimeout(900);
      R.ok(await pg.evaluate(() => !PG_UI.ap.on && PG.stale()) && await pg.evaluate(() => localStorage.getItem('pg_career_v1')) === theirs, 'D: 다른 탭이 저장을 바꿨는데 계속 진행하거나 덮어씀');
    } else R.ok(false, 'D: 다른 탭 검사 전에 이미 멈춤');
    await other.close();
    R.ok(!pg.errs.length && await pg.evaluate(() => !window.__pgApError), `스크립트 오류 ${pg.errs}`); await ctx.close();
    // 소리를 끈 상태 + 느린 기기(CPU 6배 느리게)에서도 끝까지 돌고 선다
    const slow = await open(browser, url, { init: 'window.__pgApMs = 0;' });
    await slow.pg.evaluate(() => localStorage.setItem('pg_opt_v1', JSON.stringify({ snd: 0 })));
    await load(slow.pg, base).catch(() => {}); await slow.pg.evaluate(() => { localStorage.setItem('pg_opt_v1', JSON.stringify({ snd: 0 })); });
    const cdp = await slow.ctx.newCDPSession(slow.pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    await slow.pg.evaluate(() => { PG.seed(11); PG.setAp('seen', true); PG_UI.render(); });
    const t1 = Date.now(), y1 = await ym(slow.pg); await slow.pg.click('[data-act=ap-go]'); await stopped(slow.pg);
    const sl = await slow.pg.evaluate(() => ({ stop: PG.recap().stop, n: PG.recap().n, why: (document.querySelector('.stopwhy') || {}).textContent || '' }));
    R.ok(await ym(slow.pg) > y1 && sl.why.length > 4 && !slow.pg.errs.length, `D: 느린 기기에서 ${JSON.stringify(sl)} ${slow.pg.errs}`);
    R.note('느린 기기(CPU 6배 느리게)', `${sl.n}개월 자동진행에 ${Date.now() - t1}ms, 멈춘 이유 "${sl.why}"`);
    await slow.ctx.close();
  }
};
