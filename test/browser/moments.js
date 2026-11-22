// 큰 경기와 시즌의 결말(0.11.11): 경기 준비의 "왜 큰 경기인가", 결과 화면의 제목(역전승 등)과 세트 기록의 일치, 순간의 소리, 시즌 결산의 문장, 이적 알림.
// PC 헤드리스 크롬이며 실제 폰 검사가 아니다. 소리는 "어떤 큐가 불렸는가"만 본다(실제로 어떻게 들리는지는 사람이 들어야 안다).
const { open } = require('./lib');
// 조건에 맞는 장면에서 멈춘 실제 커리어 저장을 찾는다(엔진만으로 미리 돌린다)
const FIND = ([pred, from, traitI]) => {
  const f = new Function('sc', 'S', 'return ' + pred);
  for (let seed = from; seed < from + 60; seed++) {
    localStorage.clear(); localStorage.setItem('pg_tut_v1', '1'); PG._seen(); PG.seed(seed);
    PG.newGame({ nick: '가나다라마바사아자차', region: ['kr', 'cn', 'eu', 'na'][seed % 4], role: 'core', trait: ['brain', 'genius', 'grinder'][(seed + (traitI || 0)) % 3] });
    let n = 0; while (n++ < 30000 && !PG.state().over) { const sc = PG.scene(); if (sc && f(sc, PG.state())) { PG.save(); return localStorage.getItem('pg_career_v1'); } PG.autoStep(); }
  }
  return '';
};
const PUT = raw => { const opt = localStorage.getItem('pg_opt_v1'); localStorage.clear(); if (opt != null) localStorage.setItem('pg_opt_v1', opt); localStorage.setItem('pg_tut_v1', '1'); localStorage.setItem('pg_career_v1', raw); window.__pgSnd = []; };
// 검사 쪽의 판정(화면 코드와 따로 적는다): 세트 기록에서 경기의 모양을 읽는다
const DRAMA = sc => { const need = (sc.bo + 1) / 2; let x = 0, y = 0, mp = false; for (const s of sc.sets) { if (s.w) x++; else y++; if (y === need - 1 && x < need - 1) mp = true; } return sc.win ? (mp && need >= 2 ? '역전승' : y === need - 1 && need >= 2 ? '접전 끝 승리' : y === 0 && need >= 2 ? '완승' : '승리') : (x === need - 1 && need >= 2 ? '석패' : '패배'); };
const MP = "(()=>{const need=(sc.bo+1)/2;let x=0,y=0,mp=false;for(const s of sc.sets){if(s.w)x++;else y++;if(y===need-1&&x<need-1)mp=true;}return mp;})()";
const WANT = {
  preFinal: "sc.type==='prematch' && sc.label==='결승'", preIntl: "sc.type==='prematch' && sc.kind==='intl' && sc.label!=='결승'", preRival: "sc.type==='prematch' && !!sc.rival && sc.label!=='결승' && sc.kind==='playoff'",
  prePlain: "sc.type==='prematch' && !sc.rival && sc.label!=='결승' && sc.kind==='playoff'",
  comeback: `sc.type==='match' && sc.win && sc.label!=='결승' && ${MP}`, finalWin: "sc.type==='match' && sc.win && sc.label==='결승'", loss: "sc.type==='match' && !sc.win", plainWin: `sc.type==='match' && sc.win && sc.label!=='결승' && !sc.rival && !${MP}`,
  season3: "sc.type==='season' && sc.story && sc.story.length===3", champ: "sc.type==='info' && sc.cele===1", callup: "sc.type==='info' && sc.title==='1군 콜업'", monthUp: "sc.type==='month' && typeof sc.o1==='number' && Math.floor(sc.o1+1e-9)>Math.floor(sc.o0+1e-9)",
  monthFlat: "sc.type==='month' && typeof sc.o1==='number' && Math.floor(sc.o1+1e-9)===Math.floor(sc.o0+1e-9) && S.year>=2", offers: "sc.type==='offers' && sc.offers.some(o=>!o.renew && o.org!==S.org)",
};

module.exports = async function moments(browser, url, R) {
  const mk = await open(browser, url), saves = {};
  for (const k in WANT) { saves[k] = await mk.pg.evaluate(FIND, [WANT[k], 500, 0]); R.ok(!!saves[k], `검사용 저장을 찾지 못함: ${k}`); }
  await mk.ctx.close();
  const cuesOf = pg => pg.evaluate(() => (window.__pgSnd || []).map(x => [x.c, x.played]));
  const go = async (pg, raw) => { await pg.evaluate(PUT, raw); await pg.reload(); await pg.waitForTimeout(250); await pg.evaluate(() => { window.__pgSnd.length = 0; }); await pg.click('[data-act=continue]'); await pg.waitForTimeout(220); };
  const overX = pg => pg.evaluate(() => document.documentElement.scrollWidth - innerWidth);

  for (const [w, h] of [[320, 568], [390, 844]]) {
    const { ctx, pg } = await open(browser, url, { w, h });
    // ---- A. 경기 준비: 왜 큰 경기인가 ----
    for (const [k, tag] of [['preFinal', '결승'], ['preIntl', '국제전'], ['preRival', '라이벌전']]) {
      if (!saves[k]) continue; await go(pg, saves[k]);
      const d = await pg.evaluate(() => { const sc = PG.scene(), st = document.querySelector('.stake'); return { sc: { why: sc.why, kind: sc.kind, label: sc.label, rival: sc.rival, bo: sc.bo }, big: st && st.classList.contains('bigm'), tags: [...document.querySelectorAll('.stake .mtag')].map(e => e.textContent), txt: st ? st.textContent : '', btn: document.querySelectorAll('[data-act=tac]').length, kick: document.querySelectorAll('[data-act=kick]').length, verdict: !!document.querySelector('.verdict'), top: st ? Math.round(st.getBoundingClientRect().top) : -1 }; });
      R.ok(d.big && d.tags.includes(tag) && d.btn === 3 && d.kick === 2 && !d.verdict && await overX(pg) <= 0, `${w} ${k}: 큰 경기 표시가 없거나 화면이 넘침 ${JSON.stringify(d)}`);
      R.ok(k === 'preRival' ? /지면 이 대회는 여기서 끝난다|이기면/.test(d.txt) : d.sc.why && d.txt.includes(d.sc.why), `${w} ${k}: 걸린 것 한 줄이 장면의 값과 다름 ${JSON.stringify([d.txt, d.sc.why])}`);
      R.ok(d.txt.includes(`${d.sc.bo}전 ${(d.sc.bo + 1) / 2}선승`) && d.top < h, `${w} ${k}: 몇 전제인지가 없거나 첫 화면 밖에 있음(${d.top}px)`);
      R.ok(!/승리했다|이겼다|졌다|패배했다/.test(d.txt), `${w} ${k}: 경기 전에 결과를 말함 ${d.txt}`);
    }
    if (saves.prePlain) {
      await go(pg, saves.prePlain);
      const d = await pg.evaluate(() => ({ big: !!document.querySelector('.stake.bigm'), tags: document.querySelectorAll('.mtag').length, txt: document.querySelector('.stake').textContent, why: PG.scene().why }));
      R.ok(!d.big && d.tags === 0 && !d.why && /지면 이 대회는 여기서 끝난다/.test(d.txt), `${w}: 평범한 경기에 큰 경기 표시가 붙음 ${JSON.stringify(d)}`);
      // 예전 저장(대회 종류·한 줄이 없는 경기 준비)도 그대로 그려진다
      const old = await pg.evaluate(raw => { const o = JSON.parse(raw); delete o.q[0].kind; delete o.q[0].why; return JSON.stringify(o); }, saves.preFinal || saves.prePlain);
      await go(pg, old);
      const o = await pg.evaluate(() => ({ t: PG.scene() && PG.scene().type, st: (document.querySelector('.stake') || {}).textContent || '', err: window.__pgRenderError || '' }));
      R.ok(o.t === 'prematch' && /선승/.test(o.st) && !o.err && !pg.errs.length, `${w}: 예전 형식의 경기 준비가 그려지지 않음 ${JSON.stringify(o)}`);
    }
    // ---- B. 결과 화면: 제목과 세트 기록, 소리, 반짝임은 한 번, 누르는 것을 막지 않음 ----
    for (const k of ['comeback', 'finalWin', 'loss', 'plainWin']) {
      if (!saves[k]) continue; await go(pg, saves[k]);
      if (await pg.$('[data-act=wskip]')) { await pg.click('[data-act=wskip]'); }
      await pg.waitForTimeout(60);
      const d = await pg.evaluate(() => { const v = document.querySelector('.verdict'), sc = PG.scene(); return { sc: { bo: sc.bo, win: sc.win, sets: sc.sets, label: sc.label, rival: sc.rival, x: sc.x, y: sc.y }, title: v ? v.querySelector('b').textContent : '', sub: v ? v.querySelector('span').textContent : '', cls: v ? v.className : '', okBtn: !!document.querySelector('.sheet [data-act=ok], .arena [data-act=ok], [data-act=ok]') }; });
      const want = DRAMA(d.sc), cues = (await cuesOf(pg)).map(x => x[0]), fin = d.sc.win ? (d.sc.label === '결승' ? 'winbig' : want === '역전승' ? 'comeback' : 'win') : 'lose', big = d.sc.win && (d.sc.label === '결승' || want === '역전승' || !!d.sc.rival);
      R.ok(d.title === want && d.sub.startsWith(`${d.sc.x}:${d.sc.y}`) && /\bw\b/.test(d.cls) === !!d.sc.win && /\bl\b/.test(d.cls) === !d.sc.win, `${w} ${k}: 결과 제목이 세트 기록과 다름 ${JSON.stringify([d.title, want, d.sub, d.cls, d.sc.sets])}`);
      R.ok(/\bbig\b/.test(d.cls) === big && /\bfx\b/.test(d.cls) === big, `${w} ${k}: 큰 승리 표시가 맞지 않음 ${d.cls} (큰 승리 ${big})`);
      R.ok(cues[cues.length - 1] === fin && cues.filter(c => c === fin).length === 1, `${w} ${k}: 결과의 소리가 다르거나 두 번 남 ${JSON.stringify(cues)} / ${fin}`);
      R.ok(k !== 'comeback' || (want === '역전승' && fin === 'comeback'), `${w}: 역전승 저장이 역전승으로 읽히지 않음 ${want}`);
      R.ok(k !== 'loss' || (!/승/.test(d.title) && !/\bbig\b|\bfx\b/.test(d.cls)), `${w}: 진 경기에 승리 표현이나 반짝임이 있음 ${d.title} ${d.cls}`);
      // 다시 그려도(소리 버튼) 반짝임과 결과 소리는 다시 나오지 않는다
      await pg.click('[data-act=snd]'); await pg.click('[data-act=snd]'); await pg.waitForTimeout(40);
      const again = await pg.evaluate(() => document.querySelector('.verdict').className), cues2 = (await cuesOf(pg)).map(x => x[0]);
      R.ok(!/\bfx\b/.test(again) && cues2.filter(c => c === fin).length === 1, `${w} ${k}: 다시 그렸을 때 연출이 반복됨 ${again} ${JSON.stringify(cues2)}`);
      // 연출을 기다리지 않고 바로 넘어갈 수 있다
      const t0 = Date.now(); await pg.click('[data-act=ok]'); const left = await pg.evaluate(() => !(PG.scene() && PG.scene().type === 'match'));
      R.ok(left && Date.now() - t0 < 1500 && await overX(pg) <= 0, `${w} ${k}: 결과 화면에서 바로 넘어가지 못함(${Date.now() - t0}ms)`);
    }
    // ---- C. 시즌 결산 ----
    if (saves.season3) {
      await go(pg, saves.season3);
      const d = await pg.evaluate(() => { const sc = PG.scene(), sh = document.querySelector('.veil .sheet'); return { story: sc.story, next: sc.next, li: [...document.querySelectorAll('.sstory li')].map(e => e.textContent), nx: (document.querySelector('.snext') || {}).textContent || '', h: sh.scrollHeight, small: [...sh.querySelectorAll('.sstory li, .snext')].filter(e => parseFloat(getComputedStyle(e).fontSize) < 13).length, btn: sh.querySelectorAll('button').length, txt: sh.innerText.replace(/\s+/g, ' ').length }; });
      R.ok(d.li.length === 3 && JSON.stringify(d.li) === JSON.stringify(d.story) && d.nx === d.next && d.small === 0 && await overX(pg) <= 0, `${w}: 시즌 결산의 문장이 장면의 값과 다르거나 글씨가 작음 ${JSON.stringify(d)}`);
      R.ok(d.h <= (w <= 320 ? 900 : 800) && d.btn <= 4, `${w}: 시즌 결산이 길어짐 ${d.h}px, 버튼 ${d.btn}`);
      R.ok((await cuesOf(pg)).filter(x => x[0] === 'season').length === 1, `${w}: 시즌 결산의 소리가 한 번이 아님`);
      R.note(`시즌 결산 ${w}px`, `높이 ${d.h}px · 글자 ${d.txt} · 버튼 ${d.btn} · ${d.li.join(' / ')} → ${d.nx}`);
      // 문장이 없는 예전 결산 장면도 그대로 그려진다
      const old = await pg.evaluate(raw => { const o = JSON.parse(raw); delete o.q[0].story; delete o.q[0].next; return JSON.stringify(o); }, saves.season3);
      await go(pg, old);
      const o = await pg.evaluate(() => ({ t: PG.scene() && PG.scene().type, li: document.querySelectorAll('.sstory li').length, nx: !!document.querySelector('.snext'), h2: (document.querySelector('.veil .sheet h2') || {}).textContent || '', err: window.__pgRenderError || '' }));
      R.ok(o.t === 'season' && o.li === 0 && !o.nx && /결산/.test(o.h2) && !o.err, `${w}: 예전 형식의 결산이 그려지지 않음 ${JSON.stringify(o)}`);
    }
    // ---- D. 순간의 소리: 우승·콜업·OVR 이 오른 달은 한 번씩, 평범한 달은 조용히, 꺼 두면 재생하지 않음 ----
    for (const [k, cue] of [['champ', 'champ'], ['callup', 'callup'], ['monthUp', 'up'], ['monthFlat', '']]) {
      if (!saves[k]) continue; await go(pg, saves[k]);
      let cues = await cuesOf(pg); const NEW = ['champ', 'callup', 'up', 'award', 'bad', 'season', 'move', 'comeback'], got = cues.map(x => x[0]).filter(c => NEW.includes(c));
      R.ok(cue ? got.length === 1 && got[0] === cue : got.length === 0, `${w} ${k}: 순간의 소리가 예상과 다름 ${JSON.stringify(cues)}`);
      if (k === 'monthUp') R.ok(await pg.evaluate(() => !!document.querySelector('.sheet.fxup .chip.ovrc.up')), `${w}: OVR 이 오른 달의 칩 강조가 없음`);
      if (k === 'monthFlat') R.ok(await pg.evaluate(() => !document.querySelector('.sheet.fxup')), `${w}: 오르지 않은 달에 강조가 붙음`);
      await pg.evaluate(() => { PG_UI.render(); PG_UI.render(); }); await pg.waitForTimeout(40);
      cues = await cuesOf(pg); R.ok(cues.map(x => x[0]).filter(c => NEW.includes(c)).length === (cue ? 1 : 0), `${w} ${k}: 다시 그렸을 때 소리가 또 남 ${JSON.stringify(cues)}`);
    }
    if (saves.champ) {   // 소리를 끈 상태
      await pg.evaluate(PUT, saves.champ); await pg.evaluate(() => localStorage.setItem('pg_opt_v1', JSON.stringify({ snd: 0 }))); await pg.reload(); await pg.waitForTimeout(250); await pg.evaluate(() => { window.__pgSnd.length = 0; }); await pg.click('[data-act=continue]'); await pg.waitForTimeout(200);
      const cues = await cuesOf(pg); R.ok(cues.every(x => !x[1]) && await pg.evaluate(() => !PG_UI.snd.on()), `${w}: 소리를 껐는데 재생됨 ${JSON.stringify(cues)}`);
      await pg.evaluate(() => localStorage.removeItem('pg_opt_v1'));
    }
    // ---- E. 이적 확정: 위쪽 알림 한 줄과 소리, 확인 버튼 없음 ----
    if (saves.offers) {
      await go(pg, saves.offers);
      const i = await pg.evaluate(() => { const S = PG.state(), sc = PG.scene(); return sc.offers.findIndex(o => !o.renew && o.org !== S.org); });
      const before = await pg.evaluate(() => PG.state().org);
      await pg.click(`[data-act=accept][data-i="${i}"]`); await pg.waitForTimeout(120);
      const d = await pg.evaluate(() => { const t = document.getElementById('toast'); return { org: PG.state().org, name: PG.D.ORG[PG.state().org].name, toast: t && t.classList.contains('on') ? t.textContent : '', dlg: document.querySelectorAll('[role=dialog] [data-act=ok]').length }; });
      const cues = (await cuesOf(pg)).map(x => x[0]);
      R.ok(d.org !== before && d.toast.includes('이적 확정') && d.toast.includes(d.name) && cues.filter(c => c === 'move').length === 1, `${w}: 이적 알림이나 소리가 없음 ${JSON.stringify([d, cues])}`);
      await pg.evaluate(() => document.getElementById('toast').click()); R.ok(await pg.evaluate(() => !document.getElementById('toast').classList.contains('on')), `${w}: 이적 알림을 눌러 닫지 못함`);
    }
    // ---- F. 자동진행이 달리는 동안에는 순간의 소리를 내지 않는다(멈춘 뒤의 첫 화면에서 난다) ----
    if (saves.monthFlat) {
      await pg.evaluate(PUT, saves.monthFlat); await pg.evaluate(() => { window.__pgApMs = 10; }); await pg.reload(); await pg.waitForTimeout(250); await pg.evaluate(() => { window.__pgApMs = 10; window.__pgSnd.length = 0; window.__apCues = []; const p = window.__pgSnd.push.bind(window.__pgSnd); window.__pgSnd.push = x => { if (PG_UI.ap.on) window.__apCues.push(x.c); return p(x); }; });
      await pg.click('[data-act=continue]'); await pg.waitForTimeout(150); await pg.click('[data-act=ok]').catch(() => {});
      for (let i = 0; i < 40 && await pg.evaluate(() => !!PG.scene()); i++) { await pg.evaluate(() => { const x = [...document.querySelectorAll('.veil .sheet [data-act]')].find(b => !b.disabled && !['snd', 'retire', 'reroll'].includes(b.dataset.act)); if (x) x.click(); }); await pg.waitForTimeout(30); }
      if (await pg.$('[data-act=ap-go]')) { await pg.click('[data-act=ap-go]'); await pg.waitForTimeout(40); if (await pg.$('.sheet [data-act=ap-start]')) await pg.click('.sheet [data-act=ap-start]'); await pg.waitForFunction(() => !PG_UI.ap.on, null, { timeout: 30000 }).catch(() => {}); }
      const d = await pg.evaluate(() => ({ n: PG_UI.ap.n, during: window.__apCues }));
      R.ok(d.n >= 1 && d.during.filter(c => ['up', 'season', 'champ', 'callup', 'award', 'bad'].includes(c)).length === 0, `${w}: 자동진행이 달리는 동안 순간의 소리가 남 ${JSON.stringify(d)}`);
    }
    R.ok(!pg.errs.length, `${w}: 화면 오류 ${pg.errs.join(' / ')}`);
    await ctx.close();
  }
};
