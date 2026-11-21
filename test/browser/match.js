// 경기 한 판(0.11.0): 경기 준비 → 전략 선택 → 관전/빠르게/바로 결과 → 승부처 → 결과. PC 헤드리스 크롬이며 실제 폰 검사가 아니다.
// 보는 것: 화면 배치(320·390px), 승부처를 고르기 전에 결과가 드러나지 않는지, 관전 방식·소리 설정이 결과를 바꾸지 않는지,
//         도중 새로 고침, 소리 큐와 음소거·오디오 미지원, 체험전이 실제 저장을 건드리지 않는지.
const { open, auditor, snap, A11Y } = require('./lib');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ST = () => { const s = PG.state(), m = PG.scene() && PG.scene().type === 'match' ? Object.assign({}, PG.scene(), { seen: 0 }) : null; return JSON.stringify([m, s.car, s.yr, s.money, s.cond, s.trust, s.fame, s.rivals.map(r => [r.id, r.w, r.l]), s.sim && s.sim.tour ? s.sim.tour.lines : null]); };
const waitFor = async (pg, fn, ms) => { const t = Date.now(); while (Date.now() - t < (ms || 12000)) { if (await pg.evaluate(fn)) return true; await pg.waitForTimeout(80); } return false; };
const PRE = raw => { const opt = localStorage.getItem('pg_opt_v1'); localStorage.clear(); if (opt != null) localStorage.setItem('pg_opt_v1', opt); localStorage.setItem('pg_tut_v1', '1'); if (raw) localStorage.setItem('pg_career_v1', raw); };   // 소리 설정은 남긴다
// 시리즈 직전에서 멈춘 실제 커리어 저장을 만든다. 승부처가 나오는 시드도 함께 찾는다(엔진만으로 미리 돌려 본다. 화면 검사는 그 뒤에 같은 시드로 한다).
const MAKE = () => {
  localStorage.clear(); localStorage.setItem('pg_tut_v1', '1'); PG._seen(); PG.seed(20261121);
  let raw = '', n = 0;
  PG.newGame({ nick: '가나다라마바사아자차', region: 'kr', role: 'core', trait: 'brain' });
  while (!PG.state().over && n++ < 40000) { const sc = PG.scene(); if (sc && sc.type === 'prematch' && PG.state().squad === 'first' && sc.bo >= 3) { PG.save(); raw = localStorage.getItem('pg_career_v1'); break; } PG.autoStep(); }
  if (!raw) return null;
  const run = (seed, tac) => { localStorage.setItem('pg_career_v1', raw); PG._seen(); PG.load(); PG.seed(seed); PG.resolve(tac); let k = 0; while (k++ < 60 && !(PG.scene() && PG.scene().type === 'match')) { const s = PG.scene(); if (s && s.type === 'moment') PG.resolve(0); else if (s && s.type === 'mresult') PG.resolve(); else PG.autoStep(); } return PG.scene(); };
  let withMom = 0, plain = 0;
  for (let s = 1; s <= 200 && !(withMom && plain); s++) { const m = run(s, 'press'); if (m && m.moms.length && !withMom) withMom = s; if (m && !m.moms.length && !plain) plain = s; }
  localStorage.setItem('pg_career_v1', raw); PG._seen();
  return { raw, withMom, plain };
};

module.exports = async function match(browser, url, R) {
  const seedPg = await open(browser, url);
  const fx = await seedPg.pg.evaluate(MAKE); await seedPg.ctx.close();
  R.ok(fx && fx.raw && fx.withMom && fx.plain, `검사용 상태를 만들지 못함 ${JSON.stringify(fx && [fx.withMom, fx.plain])}`);
  if (!fx || !fx.raw) return;

  // 화면으로 한 시리즈를 치른다. mode: watch(끝까지 관전) | fast(빠르게) | skip(바로 결과). 승부처는 항상 첫 선택지.
  async function play(pg, seed, tac, mode, hooks) {
    await pg.evaluate(PRE, fx.raw); await pg.reload(); await pg.waitForTimeout(250); await pg.click('[data-act=continue]'); await pg.waitForTimeout(200);
    await pg.evaluate(s => PG.seed(s), seed);
    if (hooks && hooks.pre) await hooks.pre();
    if (tac) { await pg.click(`[data-act=tac][data-id=${tac}]`); await pg.click('[data-act=kick]:not([data-id])'); } else await pg.click('[data-act=kick][data-id=none]');
    let leaked = false, moments = 0; const trace = [];
    for (let i = 0; i < 400; i++) {
      const s = await pg.evaluate(() => ({ t: PG.scene() && PG.scene().type, w: !!PG_UI.state.watch, verdict: !!document.querySelector('.verdict'), seen: PG.scene() && PG.scene().seen }));
      trace.push((s.t || '-') + (s.w ? '*' : '')); if (s.t === 'match' && !s.w) break;
      if (s.w) {
        if (hooks && hooks.watch) { await hooks.watch(i); hooks.watch = null; }
        // 관전은 스스로 끝나므로 버튼이 방금 사라졌을 수 있다: 있으면 누른다
        if (mode === 'skip') await pg.evaluate(() => { const b = document.querySelector('[data-act=wskip]'); if (b) b.click(); });
        else if (mode === 'fast') await pg.evaluate(() => { const b = document.querySelector('[data-act=wfast][aria-pressed=false]'); if (b) b.click(); });
        await pg.waitForTimeout(100);
      } else if (s.t === 'moment') {
        if (s.verdict || await pg.evaluate(() => /시리즈를 (가져왔다|내줬다)|승리|패배/.test(document.querySelector('.sheet').textContent.replace(/성공하면|실패하면/g, '')))) leaked = true;   // 고르기 전에 결과가 보이면 안 된다
        moments++; if (hooks && hooks.moment) await hooks.moment();
        await pg.locator('.sheet [data-act=res]').first().click(); await pg.waitForTimeout(60);
      } else if (s.t === 'mresult') { await pg.click('.sheet [data-act=ok]'); await pg.waitForTimeout(60); }
      else if (s.t === 'prematch') await pg.waitForTimeout(60);
      else break;
    }
    if (process.env.PG_TRACE) console.log('TRACE', mode, tac, trace.join(' ').slice(-300), '|', await pg.evaluate(() => [PG.scene() && PG.scene().type, window.__pgRenderError || '', document.querySelector('.title h1') ? 'title' : '']), pg.errs);
    return { st: await pg.evaluate(ST), leaked, moments, snd: await pg.evaluate(() => window.__pgSnd.map(x => [x.c, x.played])), sc: await pg.evaluate(() => PG.scene()) };
  }

  // A. 배치: 경기 준비·관전·승부처·결과 화면을 320·390px 에서 본다
  for (const [w, h] of [[390, 844], [320, 568]]) {
    const { ctx, pg } = await open(browser, url, { w, h }), m = auditor(pg);
    await pg.evaluate(PRE, fx.raw); await pg.reload(); await pg.waitForTimeout(250); await pg.click('[data-act=continue]'); await pg.waitForTimeout(350);
    await pg.evaluate(s => PG.seed(s), fx.withMom);
    const pre = await pg.evaluate(() => { const sh = document.querySelector('.veil .sheet'), k = sh.querySelector('[data-act=kick]:not([data-id])'); return { type: PG.scene().type, tacs: sh.querySelectorAll('[data-act=tac]').length, dis: k.disabled, label: sh.getAttribute('aria-label'), pips: (sh.querySelector('.pips') || {}).getAttribute ? sh.querySelector('.pips').getAttribute('aria-label') : '', snd: !!sh.querySelector('[data-act=snd]'), txt: sh.textContent }; });
    R.ok(pre.type === 'prematch' && pre.tacs === 3 && pre.dis && pre.snd && /대/.test(pre.label) && /선승/.test(pre.pips) && /세트 승률 \d+%/.test(pre.txt) && /컨디션 \d+/.test(pre.txt), `${w}: 경기 준비 화면 구성 ${JSON.stringify(pre).slice(0, 200)}`);
    await m('경기 준비');
    const a1 = await pg.evaluate(A11Y);
    await pg.click('[data-act=tac][data-id=press]');
    R.ok(await pg.evaluate(() => document.querySelector('[data-act=tac][data-id=press]').getAttribute('aria-pressed') === 'true' && !document.querySelector('[data-act=kick]:not([data-id])').disabled && document.querySelector('.sheet').classList.contains('still')), `${w}: 전략을 골랐는데 표시·시작 버튼이 바뀌지 않거나 창이 다시 올라옴`);
    await m('전략 선택');
    await pg.click('[data-act=kick]:not([data-id])'); await pg.waitForTimeout(150);
    R.ok(await pg.evaluate(() => !!PG_UI.state.watch && !!document.querySelector('.wcap[role=status]') && document.querySelectorAll('.wbtns button').length === 2), `${w}: 경기 시작 뒤 관전 화면이 아님`);
    await m('관전');
    R.ok(await waitFor(pg, () => PG.scene().type === 'moment' && !PG_UI.state.watch), `${w}: 관전 뒤 승부처로 넘어가지 않음`);
    await m('승부처');
    const a2 = await pg.evaluate(A11Y);
    await pg.locator('.sheet [data-act=res]').first().click(); await pg.waitForTimeout(120); 
    // 0.11.1: 시리즈를 끝낸 승부처의 결과는 따로 창이 뜨지 않고 경기 결과 맨 위에 나온다. 시리즈가 이어지면 예전처럼 결과 창이 뜬다
    if (await pg.evaluate(() => PG.scene() && PG.scene().type === 'mresult')) { await m('승부처 결과'); await pg.click('.sheet [data-act=ok]'); }
    else R.ok(await pg.evaluate(() => PG.scene() && PG.scene().type === 'match' && !!document.querySelector('.sheet .evres')), `${w}: 승부처의 결과가 경기 결과 화면에 없음`);
    R.ok(await waitFor(pg, () => PG.scene() && PG.scene().type === 'match' && !PG_UI.state.watch && !!document.querySelector('.verdict')), `${w}: 결과 화면에 닿지 못함`);
    await m('경기 결과');
    const a3 = await pg.evaluate(A11Y), noName = [...a1.noName, ...a2.noName, ...a3.noName], low = Object.assign({}, a1.lowContrast, a2.lowContrast, a3.lowContrast);
    const res = await pg.evaluate(() => { const t = document.querySelector('.sheet').textContent, sc = PG.scene(); return { verdict: t.includes(sc.win ? '승리' : '패배'), tac: t.includes('강하게 압박한다'), sets: document.querySelectorAll('.sheet .chips .chip').length >= sc.sets.length, r: t.includes('평점 ' + sc.r.toFixed(1)), kda: t.includes(`${sc.k}/${sc.d}/${sc.a}`), btn: document.querySelectorAll('.sheet [data-act=ok]').length === 1, next: t.includes(sc.next) }; });
    R.ok(Object.values(res).every(Boolean), `${w}: 결과 요약에 빠진 것 ${JSON.stringify(res)}`);
    R.ok(m.clean(), `${w}: 배치 ${m.line()}`); R.ok(!noName.length && !Object.keys(low).length, `${w}: 이름 없는 버튼 ${noName} / 낮은 대비 ${JSON.stringify(low)}`);
    R.note(`${w}x${h}`, m.line());
    await pg.click('.sheet [data-act=ok]'); await pg.waitForTimeout(150);
    R.ok(await pg.evaluate(() => !PG.scene() || PG.scene().type !== 'match') && !pg.errs.length, `${w}: 결과를 닫은 뒤 ${pg.errs}`);
    await ctx.close();
  }

  // B. 관전 방식과 소리 설정은 결과를 바꾸지 않는다(같은 상태·같은 시드·같은 전략)
  {
    const { ctx, pg } = await open(browser, url);
    const eng = await pg.evaluate(([raw, seed, st]) => { localStorage.setItem('pg_career_v1', raw); PG._seen(); PG.load(); PG.seed(seed); PG.resolve('press'); let k = 0; while (k++ < 60 && !(PG.scene() && PG.scene().type === 'match')) { const s = PG.scene(); if (s && s.type === 'moment') PG.resolve(0); else PG.resolve(); } return (0, eval)('(' + st + ')')(); }, [fx.raw, fx.withMom, ST.toString()]);
    const w1 = await play(pg, fx.withMom, 'press', 'watch');
    const f1 = await play(pg, fx.withMom, 'press', 'fast');
    const s1 = await play(pg, fx.withMom, 'press', 'skip');
    await pg.evaluate(() => PG_UI.snd.set(false));
    const q1 = await play(pg, fx.withMom, 'press', 'watch');
    R.ok(w1.st === eng && f1.st === eng && s1.st === eng && q1.st === eng, 'B: 관전·빠르게·바로 결과·음소거 가운데 결과가 다른 것이 있음');
    R.ok(w1.moments >= 1 && !w1.leaked && !f1.leaked && !s1.leaked, `B: 승부처를 고르기 전에 결과가 드러남 또는 승부처 없음(${w1.moments})`);
    // 소리: 켜진 상태의 큐 순서와 실제 재생 여부, 꺼진 상태의 무음
    const cues = w1.snd.map(x => x[0]), has = c => cues.includes(c), fin = w1.sc.win ? (w1.sc.label === '결승' ? 'winbig' : 'win') : 'lose';
    R.ok(has('tap') && has('start') && (has('setw') || has('setl')) && has('tension') && (has('ok') || has('fail')) && cues[cues.length - 1] === fin && cues.indexOf('start') < cues.indexOf('tension') && cues.indexOf('tension') < Math.max(cues.indexOf('ok'), cues.indexOf('fail')), `B: 소리 큐 순서 ${cues.join(' ')}`);
    R.ok(w1.snd.filter(x => x[1]).length >= 5 && await pg.evaluate(() => PG_UI.snd.cues.length >= 8), `B: 실제로 재생된 큐가 적음 ${JSON.stringify(w1.snd)}`);
    R.ok(q1.snd.every(x => !x[1]) && q1.snd.length >= 5, 'B: 소리를 껐는데 재생됨');
    R.ok(await pg.evaluate(() => { try { return JSON.parse(localStorage.getItem('pg_opt_v1')).snd === 0; } catch (e) { return false; } }), 'B: 소리 설정이 저장되지 않음');
    await pg.reload(); await pg.waitForTimeout(250);
    R.ok(await pg.evaluate(() => !PG_UI.snd.on() && document.querySelector('.title [data-act=snd]').getAttribute('aria-pressed') === 'false'), 'B: 새로 고친 뒤 소리 설정이 유지되지 않음');
    await pg.click('.title [data-act=snd]');
    R.ok(await pg.evaluate(() => PG_UI.snd.on() && document.querySelector('.title [data-act=snd]').getAttribute('aria-pressed') === 'true'), 'B: 타이틀에서 소리를 켜지 못함');
    // 숨겨진 탭: 소리를 멈추고, 돌아오면 다시 켠다
    await pg.evaluate(() => { PG_UI.snd.play('tap'); Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    R.ok(await waitFor(pg, () => PG_UI.snd.state() === 'suspended', 3000), 'B: 탭이 숨겨졌는데 오디오가 멈추지 않음');
    await pg.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
    R.ok(await waitFor(pg, () => PG_UI.snd.state() === 'running', 3000), 'B: 탭으로 돌아왔는데 오디오가 다시 켜지지 않음');
    R.note('같은 결과', `엔진만 / 관전 / 빠르게 / 바로 결과 / 음소거 다섯 경로의 경기 결과·기록·자금·컨디션·라이벌 전적이 글자 단위로 같음 | 소리 큐 ${cues.join(' → ')}`);
    R.ok(!pg.errs.length, `스크립트 오류 ${pg.errs}`); await ctx.close();
  }

  // C. 도중 새로 고침: 관전 중, 승부처에서, 결과 화면에서. 결과는 한 번만 적용되고 본 연출은 다시 나오지 않는다
  {
    const { ctx, pg } = await open(browser, url);
    const ref = await play(pg, fx.withMom, 'press', 'skip');
    let reloads = 0;
    const again = await play(pg, fx.withMom, 'press', 'watch', {
      watch: async () => { await pg.reload(); await pg.waitForTimeout(250); await pg.click('[data-act=continue]'); await pg.waitForTimeout(200); reloads++; },
      moment: async () => { const before = await pg.evaluate(() => JSON.stringify(PG.scene())); await pg.reload(); await pg.waitForTimeout(250); await pg.click('[data-act=continue]'); await pg.waitForTimeout(200); reloads++; R.ok(await pg.evaluate(b => { const s = Object.assign({}, PG.scene()), o = JSON.parse(b); delete s.seen; delete o.seen; return JSON.stringify(s) === JSON.stringify(o) && !PG_UI.state.watch; }, before), 'C: 승부처에서 새로 고치자 장면이 달라지거나 관전이 다시 나옴'); },
    });
    // 난수의 위치는 저장하지 않으므로(예전부터 그렇다) 새로 고친 뒤에 치르는 세트는 달라질 수 있다. 확인할 것은 "이미 치른 세트는 바뀌지 않는다"이다.
    const before = ref.sc.moms.length ? ref.sc.sets.length - 1 : 0, pre = x => JSON.stringify(x.sc.sets.slice(0, Math.min(before, x.sc.sets.length - 1)));
    R.ok(reloads === 2 && again.sc.type === 'match' && again.sc.tac === 'press' && pre(again) === pre(ref), `C: 새로 고친 뒤 이미 치른 세트가 달라짐(새로 고침 ${reloads}회) ${pre(again)} / ${pre(ref)}`);
    const g0 = await pg.evaluate(() => [PG.state().car.g, PG.state().yr.g, PG.state().money]);
    for (let i = 0; i < 2; i++) { await pg.reload(); await pg.waitForTimeout(250); await pg.click('[data-act=continue]'); await pg.waitForTimeout(250); }
    R.ok(await pg.evaluate(g => JSON.stringify([PG.state().car.g, PG.state().yr.g, PG.state().money]) === JSON.stringify(g) && PG.scene().type === 'match' && PG.scene().seen === 1 && !PG_UI.state.watch && !!document.querySelector('.verdict'), g0) && await pg.evaluate(ST) === again.st, 'C: 결과 화면에서 새로 고치자 기록이 달라지거나 연출이 다시 나옴');
    // 전략 선택 화면의 연타: 시작을 빠르게 두 번 눌러도 한 번만 처리된다(실제 누름 간격 보호를 켠 상태)
    const g = await open(browser, url, { guard: true });
    await g.pg.evaluate(PRE, fx.raw); await g.pg.reload(); await g.pg.waitForTimeout(250); await g.pg.click('[data-act=continue]'); await g.pg.waitForTimeout(450);
    await g.pg.evaluate(s => PG.seed(s), fx.plain);
    await g.pg.click('[data-act=tac][data-id=steady]'); await g.pg.waitForTimeout(400);
    await g.pg.evaluate(() => { const b = document.querySelector('[data-act=kick]:not([data-id])'); b.click(); b.click(); const o = document.querySelector('.sheet [data-act=ok], .sheet [data-act=wskip]'); if (o) o.click(); });
    R.ok(await g.pg.evaluate(() => { const s = PG.scene(); return s && (s.type === 'match' || s.type === 'moment') && (s.type !== 'match' || s.tac === 'steady') && !!PG_UI.state.watch; }), 'C: 시작 버튼 연타가 다음 화면까지 넘겨 버림');
    R.note('도중 저장·재개', '관전 중·승부처에서 새로 고쳐도 이미 치른 세트와 장면이 그대로, 결과 화면에서 새로 고쳐도 기록은 한 번만·본 연출은 다시 나오지 않음 | 시작 버튼 연타는 한 번만 처리');
    R.ok(!pg.errs.length && !g.pg.errs.length, `스크립트 오류 ${pg.errs} ${g.pg.errs}`); await g.ctx.close(); await ctx.close();
  }

  // D. 오디오를 쓸 수 없는 브라우저(Web Audio 없음 / 만들 때 오류): 소리 없이 같은 결과로 끝까지 진행된다
  for (const kind of ['none', 'throw']) {
    const { ctx, pg } = await open(browser, url);
    await ctx.addInitScript(k => { if (k === 'none') { delete window.AudioContext; delete window.webkitAudioContext; window.AudioContext = undefined; window.webkitAudioContext = undefined; } else { window.AudioContext = function () { throw new Error('blocked'); }; window.webkitAudioContext = window.AudioContext; } }, kind);
    const ref = await pg.evaluate(([raw, seed, st]) => { localStorage.setItem('pg_career_v1', raw); PG._seen(); PG.load(); PG.seed(seed); PG.resolve('wait'); let k = 0; while (k++ < 60 && !(PG.scene() && PG.scene().type === 'match')) { const s = PG.scene(); if (s && s.type === 'moment') PG.resolve(0); else PG.resolve(); } return (0, eval)('(' + st + ')')(); }, [fx.raw, fx.withMom, ST.toString()]);
    const r = await play(pg, fx.withMom, 'wait', 'fast');
    R.ok(r.st === ref && r.snd.length >= 4 && r.snd.every(x => !x[1]) && !pg.errs.length && await pg.evaluate(() => PG_UI.snd.state() === 'none' && !window.__pgRenderError), `D(${kind}): 오디오 없이 진행하지 못하거나 결과가 다름 ${pg.errs}`);
    await ctx.close();
  }
  R.note('오디오 없음', 'Web Audio 가 없거나 만들 때 오류가 나는 브라우저에서도 소리 없이 같은 결과로 끝까지 진행');

  // E. 체험전: 진행 중인 커리어·명예의 전당·도전 과제·백업 대상 키를 한 글자도 바꾸지 않는다
  {
    const { ctx, pg } = await open(browser, url);
    await pg.evaluate(() => { PG.newGame({ nick: 'Keep1', region: 'kr', role: 'core', trait: 'brain' }); let n = 0; while (!PG.state().over && n++ < 30000) PG.autoStep(); PG.wipe(); PG.newGame({ nick: 'Keep2', region: 'eu', role: 'sup', trait: 'brain' }); for (let i = 0; i < 25; i++) PG.autoStep(); PG.save(); });
    await pg.reload(); await pg.waitForTimeout(250);
    const d0 = await snap(pg), s0 = await pg.evaluate(() => JSON.stringify(PG.state())), opt0 = await pg.evaluate(() => localStorage.length);
    R.ok(d0[0] && d0.filter(Boolean).length >= 3, 'E: 검사용 데이터 준비');
    const run = async how => {
      await pg.click('.title [data-act=demo]'); await pg.waitForTimeout(300);
      const st = await pg.evaluate(() => ({ demo: PG.inDemo(), type: PG.scene() && PG.scene().type, note: !!document.querySelector('.sheet .demo'), nick: PG.state().nick, squad: PG.state().squad }));
      R.ok(st.demo && st.type === 'prematch' && st.note && st.nick !== 'Keep2' && st.squad === 'first', `E(${how}): 체험전이 경기 준비 화면으로 시작하지 않음 ${JSON.stringify(st)}`);
      R.ok(same(await snap(pg), d0), `E(${how}): 체험전을 시작하자 저장이 달라짐`);
      if (how === 'reload') { await pg.click('[data-act=tac][data-id=press]'); await pg.click('[data-act=kick]:not([data-id])'); await pg.waitForTimeout(200); await pg.reload(); await pg.waitForTimeout(250); return; }
      if (how === 'quit') { await pg.click('[data-act=tac][data-id=wait]'); await pg.click('[data-act=kick]:not([data-id])'); await pg.waitForTimeout(150); await pg.click('.sheet [data-act=demoend]'); await pg.waitForTimeout(150); return; }
      // 끝까지: 전략을 고르고, 승부처는 첫 선택지, 다음 시리즈가 나오면 계속
      for (let i = 0; i < 300 && await pg.evaluate(() => PG.inDemo()); i++) {
        const s = await pg.evaluate(() => ({ t: PG.scene() && PG.scene().type, w: !!PG_UI.state.watch }));
        if (s.w) await pg.evaluate(() => { const b = document.querySelector('[data-act=wskip]'); if (b) b.click(); });
        else if (s.t === 'prematch') { await pg.click('[data-act=tac][data-id=steady]'); await pg.click('[data-act=kick]:not([data-id])'); }
        else if (s.t === 'moment') await pg.locator('.sheet [data-act=res]').first().click();
        else await pg.click('.sheet [data-act=ok]');
        await pg.waitForTimeout(40);
      }
    };
    for (const how of ['full', 'quit', 'reload']) {
      await run(how);
      const after = await pg.evaluate(() => ({ demo: PG.inDemo(), title: !!document.querySelector('.title h1'), st: JSON.stringify(PG.state()), n: localStorage.length, cont: (document.querySelector('[data-act=continue]') || {}).textContent || '' }));
      R.ok(!after.demo && after.title && after.st === s0 && after.cont.includes('Keep2') && same(await snap(pg), d0) && after.n === opt0, `E(${how}): 체험전 뒤 저장·상태가 달라짐 ${JSON.stringify({ demo: after.demo, title: after.title, same: after.st === s0, n: after.n })}`);
    }
    // 체험전 뒤에도 실제 커리어가 그대로 이어지고 저장된다
    await pg.click('[data-act=continue]'); await pg.waitForTimeout(200);
    R.ok(await pg.evaluate(() => PG.state().nick === 'Keep2' && !PG.inDemo() && PG.hall().length >= 1 && !PG.stale()), 'E: 체험전 뒤 실제 커리어를 이어 가지 못함');
    R.note('체험전', '끝까지 / 도중에 끝내기 / 도중 새로 고침 세 경우 모두 여섯 저장 키와 진행 중인 커리어 상태가 글자 단위로 그대로');
    R.ok(!pg.errs.length, `스크립트 오류 ${pg.errs}`); await ctx.close();
  }

  // F. 동작 줄이기: 전선 표시의 이동 효과가 꺼진다(소리 설정과는 별개)
  {
    const { ctx, pg } = await open(browser, url, { reduced: true });
    await pg.evaluate(PRE, fx.raw); await pg.reload(); await pg.waitForTimeout(250); await pg.click('[data-act=continue]'); await pg.waitForTimeout(250);
    await pg.evaluate(s => PG.seed(s), fx.plain); await pg.click('[data-act=kick][data-id=none]'); await pg.waitForTimeout(150);
    R.ok(await pg.evaluate(() => { const m = document.querySelector('.mark'); return !!m && parseFloat(getComputedStyle(m).transitionDuration) === 0 && getComputedStyle(document.querySelector('.sheet')).animationName === 'none' && PG_UI.snd.on(); }), 'F: 동작 줄이기에서 이동 효과가 남아 있거나 소리까지 꺼짐');
    R.ok(await waitFor(pg, () => PG.scene() && (PG.scene().type === 'match' || PG.scene().type === 'moment') && !PG_UI.state.watch), 'F: 관전이 끝나지 않음');
    await ctx.close();
  }
};
