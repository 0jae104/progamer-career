// 화면 문자열 삽입 검사와, 손상된 데이터를 그릴 때의 안전성 검사
//   1) 저장 데이터의 글자 항목마다 태그·따옴표·이벤트 속성이 든 문자열을 넣고(가져오기 검사를 거치지 않고 저장소에 직접), 모든 화면을 열어 본다.
//      글자로만 보여야 하고, 요소나 속성으로 해석되거나 스크립트가 실행되면 실패다.
//   2) 장면과 저장 상태의 값을 하나씩 지우거나 바꾼 뒤, 검사(validScene / importCheck)를 통과한 것은 화면이 오류 없이 그려져야 한다.
const fs = require('fs'), path = require('path'), os = require('os');
const { open, fixtures } = require('./lib');
const PAY = `"'><img src=x onerror=window.__x=1><svg onload=window.__x=2><script>window.__x=3</script> onmouseover=window.__x=4 zz="😀&amp;`;
const probe = pg => pg.evaluate(() => ({
  x: window.__x || 0,
  evil: [...document.querySelectorAll('#app img:not(.cardimg), #app script, #app [onerror], #app [onload], #app [onmouseover], #app [onclick], #app [onfocus], #app [zz], #toast *')].map(e => e.outerHTML.slice(0, 80)),
  shown: (document.getElementById('app').textContent.match(/<img src=x/g) || []).length, err: window.__pgRenderError || '',
}));

module.exports = async function security(browser, url, R) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pg-sec-'));
  // 장면 종류마다 그 장면에서 멈춘 저장을 하나씩 모은다(+ 장면이 없는 홈 상태)
  const { ctx, pg } = await open(browser, url);
  const saves = await pg.evaluate(() => {
    const out = {}, want = ['pickOrg', 'event', 'result', 'month', 'info', 'season', 'cards', 'stove', 'offers', 'tryout', 'moment', 'mresult', 'retire'];
    // 0.11.9: 시드를 정해 두고, 홈 상태의 저장까지 모일 때까지 계속한다. 전에는 시드 없이 장면 종류 수만 세어서, 실행에 따라 홈 저장 없이 끝나 아래 검사가 중단되는 일이 있었다
    for (let k = 0; k < 40 && (Object.keys(out).length < want.length + 2 || !out.home || want.some(w => !out[w])); k++) {
      PG.seed(4100 + k); PG.newGame({ nick: 'Sec' + k, region: ['kr', 'cn', 'eu', 'na'][k % 4], role: ['van', 'rov', 'core', 'gun', 'sup'][k % 5], trait: ['genius', 'grinder', 'brain'][k % 3] });
      for (let n = 0; n < 20000; n++) {
        const sc = PG.scene(), s = PG.state();
        if (sc && !out[sc.type] && (sc.type !== 'month' || (sc.matches.length && (sc.fans || []).length)) && (sc.type !== 'info' || sc.cele)) out[sc.type] = localStorage.getItem('pg_career_v1');
        if (!sc && !out.home && s.car.g > 60 && s.rivals.length && s.hist.length > 3) out.home = localStorage.getItem('pg_career_v1');
        if (sc && sc.type === 'month' && sc.eval && !out.monthEval) out.monthEval = localStorage.getItem('pg_career_v1');
        if (s.over) break; PG.autoStep();
      }
    }
    return out;
  });
  const kinds = Object.keys(saves);
  R.ok(kinds.length >= 15, `장면 종류별 저장을 다 모으지 못함: ${kinds}`);

  // 1) 문자열 삽입: 저장소에 직접 넣는다
  const inject = (json, P) => {
    const s = JSON.parse(json), KEEP = new Set(['type', 'ev', 'org', 'squad', 'tier', 'cards']);
    const walk = o => { if (Array.isArray(o)) { o.forEach((v, i) => { if (typeof v === 'string') o[i] = P + v; else if (v && typeof v === 'object') walk(v); }); return; }
      for (const k of Object.keys(o)) { if (KEEP.has(k)) continue; if (typeof o[k] === 'string') o[k] = P + o[k]; else if (o[k] && typeof o[k] === 'object') walk(o[k]); } };
    s.nick = P; s.q.forEach(walk);
    s.log.forEach(l => { l.msg = P + l.msg; l.tone = P; }); s.hist.forEach(h => { h.tag = P + h.tag; });
    s.rivals.forEach(r => { r.nick = P + r.nick; r.news = P + r.news; r.style = P; r.hist.forEach(h => { h.t = P + h.t; }); });
    s.car.titles.forEach(t => { t.name = P + t.name; }); s.car.awards.forEach(a => { a.name = P + a.name; });
    if (s.yr) { s.yr.titles = s.yr.titles.map(t => P + t); s.yr.awards = s.yr.awards.map(t => P + t); }
    return JSON.stringify(s);
  };
  let screens = 0, shownTotal = 0; const bad = [];
  const look = async tag => { const p = await probe(pg); screens++; shownTotal += p.shown; if (p.x || p.evil.length || p.err) bad.push(`${tag}: 실행 ${p.x}, 요소 ${p.evil.join(' | ')}, 그리기 오류 ${p.err}`); return p; };
  for (const kind of kinds) {
    await pg.evaluate(([s]) => { localStorage.clear(); localStorage.setItem('pg_career_v1', s); }, [inject(saves[kind], PAY)]);
    await pg.reload(); await pg.waitForTimeout(150); const t = await look('타이틀 ' + kind); if (kind === 'home') R.ok(t.shown > 0, '타이틀의 이어하기에 선수 아이디가 글자로 보이지 않음');
    await pg.click('[data-act=continue]'); await pg.waitForTimeout(120);
    const p = await look('장면 ' + kind);
    if (!['pickOrg', 'cards', 'stove', 'tryout'].includes(kind)) R.ok(p.shown > 0, `${kind}: 넣은 문자열이 화면에 글자로 보이지 않음(검사가 그 화면에 닿지 않았을 수 있음)`);
    if (kind === 'retire') {
      await pg.locator('[data-act=endcard]').first().click(); await pg.waitForSelector('.cardimg', { timeout: 10000 }); await look('은퇴 카드');
      await pg.click('[data-act=back]'); await pg.click('[data-act=hall]'); await look('은퇴 뒤 명예의 전당'); await pg.locator('.hmain').first().click(); await look('은퇴 기록 상세');
    }
    if (kind === 'home') for (const tab of ['player', 'league', 'money', 'record', 'home']) { await pg.click(`[data-act=tab][data-id=${tab}]`); const q = await look('탭 ' + tab); R.ok(q.shown > 0, `탭 ${tab}: 넣은 문자열이 보이지 않음`); await pg.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; })); await look('탭 ' + tab + ' 펼침'); }
  }
  // 보관소·예전 명예의 전당·도전 과제에 직접 넣는다
  const rec = i => ({ id: '"\'zz=' + i, src: 'play', at: 5, ver: PAY, nick: PAY, role: PAY, roleId: 'core', home: 'kr', trait: 'brain', age: 30, years: 12, score: 80 - i, grade: PAY, ep: PAY, pct: 5, g: 300, w: 200, avg: 7, mvp: 30, kda: 4, peak: 90, earn: 9, big: 3, debut: 19, reason: PAY,
    titles: [{ y: 3, name: PAY, tier: 'world' }], awards: [{ y: 4, name: PAY }], orgs: [PAY, PAY], rv: [{ nick: PAY, w: 3, l: 2, label: PAY }], ax: { '기량': 50, '우승': 50, '개인상': 50, '인기': 50, '롱런': 50 } });
  await pg.evaluate(([leg, hall, ach]) => { localStorage.clear(); localStorage.setItem('pg_legacy_v1', leg); localStorage.setItem('pg_hall_v1', hall); localStorage.setItem('pg_ach_v1', ach); },
    [JSON.stringify({ v: 1, hall1: false, recs: [rec(0), rec(1)], trash: [rec(2)], gone: [PAY] }), JSON.stringify([{ nick: PAY, role: PAY, score: 50, grade: PAY, ep: PAY, peak: 80, titles: 2, years: 9 }]), JSON.stringify({ v: 1, got: { debut: { at: 5, nick: PAY, y: 3, age: 19, rid: PAY }, fin1: { at: 5, nick: PAY } }, runs: { n: 2, ids: [PAY] }, fresh: ['debut', 'fin1'] })]);
  await pg.reload(); await pg.waitForTimeout(150); await look('알림'); await pg.click('[data-act=hall]'); const hl = await look('명예의 전당 목록'); R.ok(hl.shown === 0 && await pg.locator('.hmain').count() === 3, '보관소의 꺾쇠가 읽을 때 지워지지 않았거나 기록 수가 다름');
  await pg.locator('.hcmp').nth(0).click(); await pg.locator('.hcmp').nth(1).click(); await pg.click('[data-act=compare]'); await look('비교'); await pg.click('[data-act=back]');
  await pg.locator('.hmain').first().click(); await look('상세'); await pg.click('[data-act=askdel]'); await look('삭제 확인'); await pg.click('[data-act=del]'); await look('되돌리기 안내'); await pg.click('[data-act=undo]'); await look('되돌린 뒤');
  await pg.locator('.hmain').first().click(); await pg.click('[data-act=card]'); await pg.waitForSelector('.cardimg', { timeout: 10000 }); await look('카드');
  await pg.click('[data-act=back]'); await pg.click('[data-act=back]'); await pg.click('[data-act=vt][data-id=ach]'); await look('도전 과제');
  // 백업 미리보기: 꺾쇠·따옴표가 든 파일
  const evilFile = path.join(tmp, 'evil.json');
  const bk = await pg.evaluate(([s]) => { localStorage.setItem('pg_career_v1', s); PG.load(); return JSON.stringify(PG.exportData()); }, [saves.home]);
  const ev = JSON.parse(bk); ev.payload.career.nick = '"><b zz='; ev.payload.career.log.forEach(l => { l.msg = PAY; l.tone = PAY; }); ev.app = PAY; ev.exportedAt = PAY;
  ev.payload.career.rivals.forEach(r => { r.news = PAY; r.style = PAY; }); ev.payload.legacy.recs.forEach(r => { r.ep = PAY; r.nick = '"><i zz='; });
  fs.writeFileSync(evilFile, JSON.stringify(ev));
  await pg.click('[data-act=vt][data-id=backup]'); await pg.setInputFiles('#impfile', evilFile); await pg.waitForTimeout(250);
  R.ok(await pg.locator('.impbox').count() === 1, '따옴표·꺾쇠가 든 백업의 미리보기가 열리지 않음'); await look('백업 미리보기');
  await pg.click('[data-act=impok]'); await look('복원 뒤 타이틀'); await pg.click('[data-act=continue]'); await pg.waitForTimeout(100);
  for (const tab of ['player', 'league', 'money', 'record', 'home']) { await pg.click(`[data-act=tab][data-id=${tab}]`); await look('복원 뒤 탭 ' + tab); }
  R.ok(await pg.evaluate(() => !Object.keys(localStorage).some(k => k.startsWith('pg_career') && /[<>]/.test(localStorage.getItem(k)))), '가져온 커리어 저장에 꺾쇠가 그대로 남음');
  R.note('문자열 삽입', `화면 ${screens}개를 열어 넣은 문자열이 글자로 ${shownTotal}번 보임, 실행·요소 삽입·속성 삽입 ${bad.length}건`);
  for (const b of bad) R.ok(false, '문자열이 글자가 아닌 것으로 해석됨 — ' + b);
  R.ok(!pg.errs.length, `스크립트 오류 ${pg.errs}`);

  // 2-1) 장면 변형: 항목 하나를 지우거나 다른 자료형으로 바꾼다. 규격 검사를 통과한 것은 오류 없이 그려져야 한다.
  const fz = await pg.evaluate(([saves]) => {
    const VALS = [undefined, null, 'x', 5, -1, [], {}, true, [null], 1e15], res = { n: 0, rej: 0, ok: 0, crash: [] };
    for (const kind of Object.keys(saves)) {
      if (kind === 'home') continue;
      localStorage.clear(); localStorage.setItem('pg_career_v1', saves[kind]); if (PG.load() !== 'ok') { res.crash.push(kind + ' 열기 실패'); continue; }
      const base = JSON.stringify(PG.scene()), slots = [];
      (function walk(o, p, depth) { for (const k of Object.keys(o)) { slots.push(p.concat(k)); if (o[k] && typeof o[k] === 'object' && depth < 3 && !(Array.isArray(o) && +k > 0)) walk(o[k], p.concat(k), depth + 1); } })(JSON.parse(base), [], 0);
      for (const pth of slots) for (const v of VALS) {
        const sc = JSON.parse(base); let o = sc; for (const k of pth.slice(0, -1)) o = o[k]; const last = pth[pth.length - 1];
        if (last === 'type' && pth.length === 1) continue;
        if (v === undefined) { if (Array.isArray(o)) o.splice(+last, 1); else delete o[last]; } else o[last] = v;
        res.n++;
        if (!PG.validScene(sc)) { res.rej++; continue; }
        res.ok++; PG.state().q[0] = sc; window.__pgRenderError = ''; PG_UI.state.view = 'game'; PG_UI.state.tab = 'home';
        try { PG_UI.render(); } catch (e) { window.__pgRenderError = String(e); }
        if (window.__pgRenderError) { if (res.crash.length < 12) res.crash.push(`${kind} ${pth.join('.')} → ${v === undefined ? '(삭제)' : JSON.stringify(v)}: ${window.__pgRenderError}`); PG_UI.state.view = 'game'; }
      }
    }
    window.__pgRenderError = ''; return res;
  }, [saves]);
  R.note('장면 변형', `${fz.n}개 가운데 규격 검사에서 ${fz.rej}개 거부, 통과한 ${fz.ok}개를 그려 오류 ${fz.crash.length}건`);
  for (const c of fz.crash) R.ok(false, '규격을 통과한 장면이 화면에서 오류 — ' + c);
  R.ok(fz.ok > 100, '장면 변형 검사가 충분히 돌지 않음');

  // 2-2) 저장 상태 변형: 가져오기 검사를 통과한 것은 복원한 뒤 모든 탭이 오류 없이 그려져야 한다.
  const bases = fixtures().map(f => f[1]).concat([saves.home, saves.month, saves.moment, saves.offers, saves.retire].filter(Boolean));
  const fz2 = await pg.evaluate(([bases, count]) => {
    let a = 20261120; const rnd = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const VALS = [undefined, null, 'x', '', -1, 0, 1e9, 0.5, [], {}, true, [null], { a: 1 }], res = { n: 0, rej: 0, ok: 0, crash: [] };
    const packs = bases.map(b => { localStorage.clear(); localStorage.setItem('pg_career_v1', b); PG.load(); return JSON.stringify(PG.exportData()); });
    for (let it = 0; it < count; it++) {
      const x = JSON.parse(packs[it % packs.length]), slots = [];
      (function walk(o, p) { for (const k of Object.keys(o)) { slots.push([o, k, p + '.' + k]); if (o[k] && typeof o[k] === 'object') walk(o[k], p + '.' + k); } })(x.payload.career, 'career');
      const [obj, key, where] = slots[Math.floor(rnd() * slots.length)], v = VALS[Math.floor(rnd() * VALS.length)];
      if (v === undefined) { if (Array.isArray(obj)) obj.splice(+key, 1); else delete obj[key]; } else obj[key] = v;
      res.n++; localStorage.clear();
      const c = PG.importCheck(JSON.stringify(x)); if (!c.ok) { res.rej++; continue; }
      res.ok++;
      try {
        if (!PG.importApply(c.data) || PG.load() !== 'ok') throw new Error('복원 뒤 열리지 않음');
        PG_UI.state.view = 'game';
        for (const tab of ['home', 'player', 'league', 'money', 'moneyopen', 'record', 'rep', 'apsheet']) { window.__pgRenderError = ''; PG_UI.state.tab = tab === 'rep' || tab === 'apsheet' ? 'home' : tab === 'moneyopen' ? 'money' : tab; PG_UI.state.shopOpen = tab === 'moneyopen'; PG_UI.state.shopInfo = tab === 'moneyopen' ? 'gear' : ''; PG_UI.state.repOpen = PG_UI.state.auOpen = PG_UI.state.goalOpen = tab === 'rep'; PG_UI.state.apOpen = tab === 'apsheet'; PG_UI.state.view = 'game'; PG_UI.render(); if (window.__pgRenderError) throw new Error(tab + ': ' + window.__pgRenderError); }
        for (let k = 0; k < 25 && !PG.state().over; k++) { PG.autoStep(); window.__pgRenderError = ''; PG_UI.state.view = 'game'; PG_UI.render(); if (window.__pgRenderError) throw new Error('진행 중: ' + window.__pgRenderError); }
      } catch (e) { if (res.crash.length < 12) res.crash.push(`${where} → ${v === undefined ? '(삭제)' : JSON.stringify(v)}: ${e.message}`); }
    }
    window.__pgRenderError = ''; localStorage.clear(); return res;
  }, [bases, 500]);
  R.note('저장 상태 변형', `${fz2.n}개 가운데 가져오기 검사에서 ${fz2.rej}개 거부, 통과한 ${fz2.ok}개를 복원해 탭 5개와 25번 진행을 그려 오류 ${fz2.crash.length}건`);
  for (const c of fz2.crash) R.ok(false, '검사를 통과한 저장이 화면에서 오류 — ' + c);
  R.ok(fz2.ok > 50, '저장 상태 변형 검사가 충분히 돌지 않음');
  await ctx.close();
};
