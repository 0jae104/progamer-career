// 홈의 "이번 달 라이벌전" 줄(0.11.8). PC 헤드리스 크롬의 화면 크기 흉내이며 실제 폰 검사가 아니다.
//   - 키가 작은 화면(높이 720px 이하: 320×568, 375×667, 390×664)에서는 한 줄 요약, 44px 이상, 가로 넘침 없음, 첫 화면에 다 보이고 눌린다.
//     390×664 는 390×844 폰의 사파리에서 주소 표시줄을 뺀 높이에 가까운 값이다.
//   - 높이가 넉넉한 화면(360×800, 390×844, 430×932)에서는 전과 같은 줄(구단 이름과 지난 일 한 줄 포함).
//   - 버튼의 이름(aria-label)에는 어느 크기에서나 닉네임·구단·전적·지난 일이 다 들어 있다. 누르면 리그 탭의 라이벌 기록.
//   - 라이벌전이 없는 달에는 요소가 없고 빈 자리도 없다.
const { open } = require('./lib');
// 라이벌전이 있는 달의 1군 저장(올해 목표도 있는 상태)과, 같은 커리어에서 라이벌전이 없는 달의 저장
const SAVES = () => {
  localStorage.clear(); localStorage.setItem('pg_tut_v1', '1'); PG._seen();
  for (let k = 0; k < 40; k++) {
    PG.seed(300 + k); PG.newGame({ nick: 'rv', region: 'kr', role: 'core', trait: 'brain' });
    let n = 0, plain = '';
    while (n++ < 30000 && !PG.state().over) {
      const S = PG.state(), idle = S.squad === 'first' && !PG.scene() && S.injury === 0 && !!PG.goalNow();
      if (idle && !PG.rivalFixtures().length && PG.rivals().length) { delete S.recap; delete S.lastRep; PG.save(); plain = localStorage.getItem('pg_career_v1'); }
      if (idle && plain && PG.rivalFixtures().length) { delete S.recap; delete S.lastRep; PG.save(); return { rv: localStorage.getItem('pg_career_v1'), plain }; }
      PG.autoStep();
    }
  }
  return null;
};
const load = async (pg, raw) => { await pg.evaluate(x => { localStorage.clear(); localStorage.setItem('pg_tut_v1', '1'); localStorage.setItem('pg_career_v1', x); }, raw); await pg.reload(); await pg.waitForTimeout(250); await pg.click('[data-act=continue]'); await pg.waitForTimeout(150); };
// 화면에서 잰다. 옛 버전(.rvmini 가 없는 버전)에서도 돌아가도록 없는 요소는 건너뛴다
const MEASURE = () => {
  const q = s => document.querySelector(s), c = q('.stagebg .rvcard'), foot = q('.foot').getBoundingClientRect().top, fx = PG.rivalFixtures(), vis = e => !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0;
  const base = { fx: fx.length, cards: document.querySelectorAll('.rvcard').length, foot: Math.round(foot), overX: document.documentElement.scrollWidth - innerWidth, overY: document.documentElement.scrollHeight - innerHeight,
    plan: (() => { const r = q('.plan5').getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)]; })(), planSeen: q('.plan5').getBoundingClientRect().bottom <= foot + 1, planBtnH: Math.round(q('.plan5 button').getBoundingClientRect().height), planBtns: document.querySelectorAll('.plan5 button').length,
    next: (() => { const b = q('[data-act=next]'), r = b.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!hit && (hit === b || b.contains(hit)) && r.bottom <= innerHeight + 1; })(),
    order: [...q('main.content').children].map(e => e.id || e.className.split(' ')[0]), mainGapEnd: (() => { const p = q('#pbox') || q('.plansec'), n = p.nextElementSibling; return n ? Math.round(n.getBoundingClientRect().top - p.getBoundingClientRect().bottom) : 0; })() };
  if (!c) return base;
  const r = c.getBoundingClientRect(), full = c.querySelector('.rvfull') || c.querySelector('span'), mini = c.querySelector('.rvmini'), hit = document.elementFromPoint(r.left + r.width / 2, Math.min(r.top + r.height / 2, innerHeight - 1));
  const label = c.getAttribute('aria-label') || '', shown = vis(mini) ? mini : full, lines = shown ? [...shown.querySelectorAll('*'), shown].flatMap(e => [...e.getClientRects()].filter(x => x.height > 0).map(x => (x.top + x.bottom) / 2)).sort((x, y) => x - y).reduce((n, v, i, arr) => n + (i === 0 || v - arr[i - 1] > 10 ? 1 : 0), 0) : 0;   // 글자 줄 수: 세로 가운데가 10px 넘게 떨어진 묶음의 수
  const focusables = [...document.querySelectorAll('.stagebg button:not([disabled]), .stagebg [tabindex="0"]')].filter(e => e.getBoundingClientRect().height > 0), fi = focusables.indexOf(c), p5 = [...document.querySelectorAll('.plan5 button')];
  return Object.assign(base, { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), w: Math.round(r.width), seenPx: Math.max(0, Math.round(Math.min(r.bottom, foot) - Math.max(r.top, 0))), seen: r.top >= 0 && r.bottom <= foot + 1,
    hit: !!hit && (hit === c || c.contains(hit)), mini: vis(mini), full: vis(full), miniH: mini ? Math.round(mini.getBoundingClientRect().height) : 0, oneLine: vis(mini) ? mini.getBoundingClientRect().height <= 26 && c.scrollWidth <= c.clientWidth + 1 && mini.scrollWidth <= mini.clientWidth + 1 : false,
    txt: (shown ? shown.textContent : '').replace(/\s+/g, ' ').trim(), label,
    labelOk: fx.every(f => label.includes(f.nick) && label.includes(f.org) && label.includes(`통산 ${f.w}승 ${f.l}패`)) && (!fx[0].story || label.includes(fx[0].story)) && /라이벌 기록 열기/.test(label),
    miniOk: mini ? mini.textContent.includes(fx[0].nick) && mini.textContent.includes(`통산 ${fx[0].w}승 ${fx[0].l}패`) && (fx.length > 1 ? mini.textContent.includes(`외 ${fx.length - 1}명`) : !/외 \d+명/.test(mini.textContent)) && /라이벌전/.test(mini.textContent) : false,
    fullOk: fx.every(f => (full ? full.textContent : '').includes(f.nick) && full.textContent.includes(f.org) && full.textContent.includes(`통산 ${f.w}승 ${f.l}패`)) && (!fx[0].story || full.textContent.includes(fx[0].story)),
    nickCut: (() => { const n = mini && mini.querySelector('.rvn'); return n ? n.scrollWidth > n.clientWidth + 1 : false; })(), story: fx[0].story || '', nFx: fx.length,
    afterPlan: fi > 0 && focusables[fi - 1] === p5[p5.length - 1], lines });
};
const SIZES = [[320, 568, 'mini'], [375, 667, 'mini'], [390, 664, 'mini'], [360, 800, 'full'], [390, 844, 'full'], [430, 932, 'full']];
module.exports = async function rival(browser, url, R) {
  const mk = await open(browser, url), sv = await mk.pg.evaluate(SAVES); await mk.ctx.close();
  if (!R.ok(!!sv && !!sv.rv && !!sv.plain, '검사용 저장(라이벌전이 있는 달·없는 달)을 만들지 못함')) return;
  for (const [w, h, want] of SIZES) {
    const { ctx, pg } = await open(browser, url, { w, h });
    // 1) 라이벌전이 없는 달: 요소가 없고, 할 일 다음은 빈 자리 없이 끝난다
    await load(pg, sv.plain);
    const p = await pg.evaluate(MEASURE);
    R.ok(p.fx === 0 && p.cards === 0 && !p.order.includes('rvcard') && p.order[0] === 'gbox' && p.order[1] === 'pbox' && p.order.length === 2, `${w}×${h} 라이벌전이 없는 달: 줄이나 빈 자리가 있음 ${JSON.stringify(p.order)}`);
    R.ok(p.planSeen && p.planBtns === 5 && p.planBtnH >= 44 && p.next && p.overX <= 0, `${w}×${h} 라이벌전이 없는 달: 할 일 다섯 칸·진행 버튼 ${JSON.stringify(p).slice(0, 200)}`);
    // 2) 라이벌전이 있는 달
    await load(pg, sv.rv);
    const a = await pg.evaluate(MEASURE);
    R.ok(a.fx > 0 && a.cards === 1 && a.order.join() === 'gbox,pbox,rvcard' && a.afterPlan, `${w}×${h}: 순서가 목표 → 할 일 → 라이벌전이 아니거나 포커스 순서가 할 일 다음이 아님 ${JSON.stringify(a.order)} ${a.afterPlan}`);
    R.ok(a.labelOk, `${w}×${h}: 버튼 이름(aria-label)에 닉네임·구단·전적·지난 일이 다 들어 있지 않음: ${a.label}`);
    R.ok(a.h >= 44 && a.hit && a.overX <= 0 && a.planSeen && a.planBtns === 5 && a.planBtnH >= 44 && a.next, `${w}×${h}: 라이벌전 줄이 44px 미만이거나 눌리지 않거나 할 일·진행 버튼이 가려짐 ${JSON.stringify(a).slice(0, 260)}`);
    if (want === 'mini') {
      R.ok(a.mini && !a.full && a.oneLine && a.lines === 1 && a.h <= 52 && a.miniOk, `${w}×${h}: 한 줄 요약이 아님(높이 ${a.h}px, 줄 ${a.lines}) "${a.txt}"`);
      R.ok(!a.nickCut, `${w}×${h}: 보통 길이의 닉네임이 한 줄 요약에서 잘림 "${a.txt}"`);
      R.ok(a.seen, `${w}×${h}: 한 줄 라이벌전 알림이 첫 화면에 다 보이지 않음(줄 ${a.top}~${a.bottom}px, 아래 버튼 시작 ${a.foot}px, 보이는 높이 ${a.seenPx}px)`);
    } else {
      R.ok(a.full && !a.mini && a.fullOk && a.h > 60, `${w}×${h}: 넉넉한 화면인데 예전 줄(구단·지난 일 포함)이 아님 "${a.txt}"`);
    }
    R.note(`${w}×${h} 라이벌전 달`, `${a.mini ? '한 줄 요약' : '전체 줄'} · 줄 ${a.top}~${a.bottom}px(높이 ${a.h}px) · 아래 버튼 시작 ${a.foot}px · 첫 화면에 보이는 높이 ${a.seenPx}/${a.h}px · 가로 넘침 ${Math.max(0, a.overX)} · 세로 넘침 ${Math.max(0, a.overY)}px · 할 일 칸 ${a.plan[0]}~${a.plan[1]}px · "${a.txt.slice(0, 60)}"`);
    // 3) 긴 닉네임, 라이벌 세 명: 한 줄이 유지되고 전적과 "외 N명"은 잘리지 않는다. 이름은 말줄임이어도 버튼 이름에는 전부 있다
    if (want === 'mini') {
      const b = await pg.evaluate(M => { const rs = PG.state().rivals, f = PG.rivalFixtures()[0], r = rs.find(x => x.nick === f.nick || x.id === f.id); if (r) r.nick = 'Wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww'; PG_UI.render(); return (new Function('return (' + M + ')()'))(); }, MEASURE.toString());
      R.ok(b.mini && b.oneLine && b.lines === 1 && b.h >= 44 && b.h <= 52 && b.overX <= 0 && b.nickCut && b.labelOk && b.label.includes('Wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww') && /통산 \d+승 \d+패/.test(b.txt) && (b.nFx > 1 ? /외 \d+명/.test(b.txt) : true), `${w}×${h}: 긴 닉네임에서 한 줄이 깨지거나 전적이 잘리거나 버튼 이름에서 빠짐 ${JSON.stringify(b).slice(0, 300)}`);
    }
    // 4) 누르면 리그 탭의 라이벌 기록(전체 정보)으로 간다. 키보드로도
    await load(pg, sv.rv);
    await pg.focus('.stagebg .rvcard'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(100);
    const to = await pg.evaluate(() => ({ tab: PG_UI.state.tab, rivals: document.querySelectorAll('.rival').length, txt: (document.querySelector('.content') || {}).textContent || '', fx: PG.rivalFixtures().map(f => [f.nick, f.org]) }));
    R.ok(to.tab === 'league' && to.rivals > 0 && to.fx.every(f => to.txt.includes(f[0])), `${w}×${h}: 라이벌전 줄을 눌러 라이벌 기록으로 가지 못함 ${JSON.stringify(to).slice(0, 160)}`);
    await pg.click('[role=tab][data-id=home]'); await pg.waitForTimeout(80);
    await pg.click('.stagebg .rvcard'); await pg.waitForTimeout(100);
    R.ok(await pg.evaluate(() => PG_UI.state.tab === 'league' && !!document.querySelector('.rival')), `${w}×${h}: 터치로 라이벌 기록에 가지 못함`);
    R.ok(!pg.errs.length, `스크립트 오류 ${pg.errs}`); await ctx.close();
  }
};
module.exports.SAVES = SAVES; module.exports.MEASURE = MEASURE; module.exports.load = load; module.exports.SIZES = SIZES;
