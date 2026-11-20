// 폰 화면 점검(10단계): 세로 320·360·390·430px 과 가로 모드 두 가지에서 주요 화면을 모두 열어 본다.
//   배치(가로 넘침·작은 조작 요소·작은 글자·잘림·겹침), 창 안의 모든 버튼이 스크롤로 닿고 다른 것에 가려지지 않는지,
//   조작 요소의 이름과 명암비, 입력 중 화면이 좁아졌을 때(키보드가 올라온 상황 흉내), 두 번 눌림 방지.
// 헤드리스 크롬에서 화면 크기만 맞춘 검사다. 노치·하단 바·실제 키보드·터치감은 실제 폰에서 봐야 한다(docs/mobile-qa.md).
const { open, step, auditor, collectSaves, A11Y } = require('./lib');
const SIZES = [[320, 568, '세로 320'], [360, 740, '세로 360'], [390, 844, '세로 390'], [430, 932, '세로 430'], [844, 390, '가로 844'], [667, 375, '가로 667']];
const OLD_HALL = Array.from({ length: 12 }, (_, i) => ({ nick: i === 0 ? '가나다라마바사아자차' : 'Old' + i, role: ['선봉', '유격', '코어', '사수', '지원'][i % 5], score: 90 - i * 3, grade: 'A', ep: '리그의 간판', peak: 88 - i, titles: i % 4, years: 10 + i % 3 }));
// 지금 보이는 창(또는 페이지) 안의 조작 요소가 모두 스크롤로 화면 안에 들어오고, 그 자리를 다른 요소가 덮지 않는지
const REACH = () => {
  const bad = [], box = document.querySelector('.veil .sheet'), list = [...document.querySelectorAll(box ? '.veil .sheet button, .veil .sheet label.btn' : '#app button, #app label.btn, #app input:not(.srhide)')].filter(e => !e.closest('[inert]') && e.getBoundingClientRect().width > 0);
  const foot = box ? null : document.querySelector('.foot');
  for (const e of list) {
    e.scrollIntoView({ block: 'center' });
    const r = e.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + Math.min(r.height / 2, 20), top = document.elementFromPoint(cx, cy);
    const inView = r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1;
    if (!inView || !top || !(e === top || e.contains(top) || top.contains(e) || (foot && foot.contains(e)))) bad.push((e.dataset.act || e.tagName) + ':' + (e.textContent || '').trim().slice(0, 14) + (inView ? ' 가려짐(' + (top && (top.className || top.tagName)) + ')' : ' 화면 밖'));
  }
  if (box) box.scrollTop = 0; else scrollTo(0, 0);
  return bad;
};

module.exports = async function mobile(browser, url, R) {
  // 검사용 저장을 한 번 만든다
  const seed = await open(browser, url), saves = await collectSaves(seed.pg, 'sup');
  const backup = await seed.pg.evaluate(s => { localStorage.setItem('pg_career_v1', s); PG.load(); return JSON.stringify(PG.exportData()); }, saves.home);
  await seed.ctx.close();
  const kinds = ['pickOrg', 'event', 'result', 'month', 'monthEval', 'info', 'season', 'cards', 'stove', 'offers', 'tryout', 'moment', 'mresult'];
  R.ok(kinds.every(k => saves[k]) && saves.home && saves.retire, `검사용 저장을 다 만들지 못함: ${Object.keys(saves)}`);

  for (const [w, h, tag] of SIZES) {
    const { ctx, pg } = await open(browser, url, { w, h }), m = auditor(pg), unreachable = [], noName = new Set(), low = {};
    const look = async name => {
      if (await pg.locator('.veil .sheet').count()) await pg.waitForTimeout(260);   // 창이 올라오는 움직임(0.22초)이 끝난 뒤에 잰다
      await m(name);
      const r = await pg.evaluate(REACH); for (const x of r) unreachable.push(name + ' → ' + x);
      const a = await pg.evaluate(A11Y); a.noName.forEach(x => noName.add(name + ' ' + x)); Object.assign(low, Object.fromEntries(Object.entries(a.lowContrast).map(([k, v]) => [name + ' ' + k, v])));
    };
    const load = async s => { await pg.evaluate(x => { localStorage.setItem('pg_tut_v1', '1'); localStorage.setItem('pg_career_v1', x); }, s); await pg.reload(); await pg.waitForTimeout(150); await pg.click('[data-act=continue]'); await pg.waitForTimeout(120); };
    await pg.evaluate(hall => { localStorage.setItem('pg_hall_v1', hall); }, JSON.stringify(OLD_HALL)); await pg.reload(); await pg.waitForTimeout(150);
    await look('타이틀');
    await pg.click('[data-act=create]'); await pg.fill('#nick', '가나다라마바사아자차');
    for (const id of ['van', 'rov', 'core', 'gun', 'sup']) { await pg.click(`[data-grp=role][data-id=${id}]`); await look('선수 등록 ' + id); }
    for (const k of kinds) { await load(saves[k]); await look('장면 ' + k); }
    await load(saves.home); for (const t of ['home', 'stats', 'league', 'shop', 'record']) { await pg.click(`[data-act=tab][data-id=${t}]`); await pg.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; })); await look('탭 ' + t); }
    await pg.click('[data-act=tab][data-id=home]');
    R.ok(await pg.evaluate(() => { scrollTo(0, document.documentElement.scrollHeight); const f = document.querySelector('.foot').getBoundingClientRect(), kids = [...document.querySelector('main.content').children].filter(e => e.getBoundingClientRect().height > 0), last = kids[kids.length - 1].getBoundingClientRect(); return last.bottom <= f.top + 20; }), `${tag}: 홈 화면의 마지막 내용이 하단 진행 버튼 뒤에 가려짐`);
    await load(saves.retire); await look('은퇴');
    await pg.locator('[data-act=endcard]').first().click(); await look('카드 생성 중'); await pg.waitForSelector('.cardimg', { timeout: 10000 }); await look('카드');
    await pg.click('[data-act=back]'); await pg.click('[data-act=hall]'); await look('명예의 전당');
    await pg.locator('.hcmp').nth(0).click(); await pg.locator('.hcmp').nth(1).click(); await look('비교 선택'); await pg.click('[data-act=compare]'); await look('비교'); await pg.click('[data-act=back]');
    await pg.locator('.hmain').nth(1).click(); await look('기록 상세'); await pg.click('[data-act=askdel]'); await look('삭제 확인'); await pg.click('[data-act=del]'); await look('되돌리기 안내'); await pg.click('[data-act=undo]');
    await pg.click('[data-act=vt][data-id=ach]'); await look('도전 과제'); await pg.click('[data-act=vt][data-id=backup]'); await look('백업');
    await pg.setInputFiles('#impfile', { name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backup) }); await pg.waitForSelector('.impbox'); await look('복원 미리보기');
    await pg.setInputFiles('#impfile', []); await pg.waitForTimeout(80);   // 파일 고르기를 취소한 경우: 아무 일도 일어나지 않아야 한다
    R.ok(await pg.locator('.impbox').count() === 1, `${tag}: 파일 선택을 취소하자 미리보기가 사라짐`);
    await pg.setInputFiles('#impfile', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('x') }); await pg.waitForTimeout(100); await look('복원 오류');
    R.note(tag + ` (${w}x${h})`, m.line() + ` | 닿지 않거나 가려진 버튼 ${unreachable.length} | 이름 없는 조작 요소 ${noName.size} | 명암비 미달 ${Object.keys(low).length} | 스크립트 오류 ${pg.errs.length}`);
    R.ok(m.clean(), `${tag}: 배치 문제 — ${m.line()}`);
    R.ok(!unreachable.length, `${tag}: 닿지 않거나 가려진 버튼 — ${unreachable.slice(0, 6).join(' | ')}`);
    R.ok(!noName.size, `${tag}: 이름 없는 조작 요소 — ${[...noName].slice(0, 6).join(' | ')}`);
    R.ok(!Object.keys(low).length, `${tag}: 명암비 미달 — ${JSON.stringify(low).slice(0, 400)}`);
    R.ok(!pg.errs.length && !(await pg.evaluate(() => window.__pgRenderError)), `${tag}: 스크립트 오류 ${pg.errs}`);
    await ctx.close();
  }
  // 입력 중 화면이 좁아졌을 때(키보드가 화면 절반을 가린 상황을 낮은 화면 높이로 흉내 낸다)
  {
    const { ctx, pg } = await open(browser, url, { w: 360, h: 330 }); await pg.click('[data-act=create]'); await pg.focus('#nick'); await pg.keyboard.type('Haneul');
    const r = await pg.evaluate(REACH);
    R.ok(!r.length && await pg.inputValue('#nick') === 'Haneul', `입력 중 좁은 화면에서 닿지 않는 버튼: ${r.join(' | ')}`);
    await pg.click('[data-act=start]'); await pg.waitForTimeout(300); R.ok(await pg.locator('.sheet [data-act=res]').count() === 3 && !(await pg.evaluate(REACH)).length, '좁은 화면에서 구단 선택 버튼에 닿지 않음');
    R.note('입력 중 좁은 화면(360x330)', '아이디 입력 뒤 모든 버튼에 스크롤로 닿음'); await ctx.close();
  }
  // 두 번 눌림 방지(실제 설정 그대로)
  {
    const { ctx, pg } = await open(browser, url, { guard: true });
    await pg.evaluate(s => { localStorage.setItem('pg_tut_v1', '1'); localStorage.setItem('pg_career_v1', s); }, saves.home); await pg.reload(); await pg.waitForTimeout(150); await pg.click('[data-act=continue]');
    await pg.evaluate(() => PG.setFast(true)); await pg.waitForTimeout(400);
    const t0 = await pg.evaluate(() => PG.state().stat.turns);
    await pg.evaluate(() => { const b = document.querySelector('[data-act=next]'); b.click(); const again = document.querySelector('[data-act=next]'); if (again && !again.disabled) again.click(); const any = document.querySelector('.sheet [data-act=ok], .sheet [data-act=res]'); if (any) any.click(); });
    const s1 = await pg.evaluate(() => [PG.state().stat.turns, PG.scene() ? PG.scene().type : '']);
    R.ok(s1[0] === t0 + 1, `연달아 누르자 ${s1[0] - t0}번 진행됨`);
    await pg.waitForTimeout(450); let guard = 0;
    while (await pg.evaluate(() => !!PG.scene()) && guard++ < 30) { await step(pg); await pg.waitForTimeout(340); }
    const t1 = await pg.evaluate(() => PG.state().stat.turns); await pg.click('[data-act=next]'); await pg.waitForTimeout(60);
    R.ok(await pg.evaluate(() => PG.state().stat.turns) === t1 + 1, '잠깐 기다린 뒤의 입력이 받아들여지지 않음');
    // 확인을 두 번 연달아 눌러도 다음 창의 버튼이 대신 눌리지 않는다
    await pg.evaluate(s => { localStorage.setItem('pg_career_v1', s); }, saves.event); await pg.reload(); await pg.waitForTimeout(150); await pg.click('[data-act=continue]'); await pg.waitForTimeout(400);
    const before = await pg.evaluate(() => PG.scene().type);
    await pg.evaluate(() => { document.querySelector('.sheet [data-act=res]:not([disabled])').click(); const nx = document.querySelector('.sheet [data-act=ok]'); if (nx) nx.click(); });
    R.ok(before === 'event' && await pg.evaluate(() => PG.scene() && PG.scene().type) === 'result', '선택 직후의 두 번째 입력이 다음 창을 넘겨 버림');
    R.note('두 번 눌림 방지', '진행 버튼을 연달아 눌러도 한 번만 진행, 0.45초 뒤 입력은 정상, 선택 직후의 두 번째 입력은 다음 창에 닿지 않음');
    R.ok(!pg.errs.length, `스크립트 오류 ${pg.errs}`); await ctx.close();
  }
  // 200% 확대(0.10.2): 화면을 두 배로 키우면 CSS 폭이 절반이 된다. PC 1280x720 → 640x360, 폰 390x844(iOS 사파리의 페이지 확대) → 195x422.
  // 가로로 넘치지 않고 버튼이 옆으로 잘리지 않아야 한다. 320px 폰의 200%(160px)는 넘친다는 것을 알고 있어 기록만 한다(docs/stage10-2-qa-report.md).
  for (const [w, h, must] of [[640, 360, true], [195, 422, true], [160, 284, false]]) {
    const { ctx, pg } = await open(browser, url, { w, h });
    const m = () => pg.evaluate(() => { const off = [...document.querySelectorAll('button:not([disabled]), input')].filter(b => { const r = b.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1); }).length; return [Math.max(0, document.documentElement.scrollWidth - innerWidth), off]; });
    const seen = [['타이틀', await m()]];
    await pg.click('[data-act=create]'); await pg.waitForTimeout(200); seen.push(['선수 등록', await m()]);
    await pg.evaluate(() => { PG.newGame({ nick: '가나다라마바사아자차', region: 'kr', role: 'core', trait: 'brain' }); for (let i = 0; i < 40; i++) PG.autoStep(); });
    await pg.reload(); await pg.waitForTimeout(200); await pg.click('[data-act=continue]'); await pg.waitForTimeout(300); seen.push(['장면 창', await m()]);
    for (let i = 0; i < 30 && await pg.evaluate(() => !!PG.scene()); i++) await step(pg);
    seen.push(['홈', await m()]);
    const bad = seen.filter(x => x[1][0] > 1 || x[1][1] > 0);
    if (must) R.ok(!bad.length, `200% 확대(${w}x${h}): ${bad.map(x => `${x[0]} 가로 넘침 ${x[1][0]}px·잘린 버튼 ${x[1][1]}`).join(', ')}`);
    R.note(`200% 확대 ${w}x${h}`, bad.length ? `넘침: ${bad.map(x => `${x[0]} ${x[1][0]}px`).join(', ')}${must ? '' : ' (알려진 한계, 기록만)'}` : '가로 넘침 없음, 옆으로 잘린 버튼 없음(타이틀·선수 등록·장면 창·홈)');
    await ctx.close();
  }
};
