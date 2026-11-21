// 시즌 목표와 라이벌 서사의 사실관계 검사(0.11.5): node test/story.js [커리어 수=60] [--seed=K]
// 화면에 나오는 문장이 실제 기록과 어긋나지 않는지를, 엔진과 따로 센 기록으로 대조한다.
//  1) 목표 후보: 2~3개, 소속에 맞는 것만(연습생에게 우승·플레이오프·라이벌 없음), 라이벌 후보는 같은 리그·같은 군의 살아 있는 다른 팀 선수.
//  2) 목표 판정: 달성/미달성/판정 없음이 따로 센 기록(소속, 1군 경기 수, 평점, 우승, 플레이오프 승리, 라이벌 전적)과 같다.
//  3) 라이벌 문장: "첫 맞대결", "n연패를 끊었다", "n연승이 끊겼다", "n연패", "패배를 갚았다"가 따로 센 맞대결 순서와 맞는다.
//  4) 같은 팀이었다는 기록(mate)은 실제로 같은 팀·같은 군이었던 해에만 생긴다.
//  5) 목표를 무엇으로 고르든 경기 결과와 난수는 같다(목표는 기록일 뿐이다).
//  6) 저장: 시즌 도중 저장·불러오기, 예전 저장(목표 없음)은 다음 결산에서 처음 고름, 이상한 값은 버림, 백업 왕복.
const N = +process.argv[2] || 60, SEED = +((process.argv.find(a => a.startsWith('--seed=')) || '').split('=')[1] || 1);
const mem = {}; globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
const G = require('../js/engine.js'), D = G.D, KEY = 'pg_career_v1';
const fail = m => { console.log('실패: ' + m); process.exit(1); };
const fresh = (i, seed) => { for (const k in mem) delete mem[k]; mem.pg_tut_v1 = '1'; G._seen(); G.seed(seed); G.newGame({ nick: 'S' + i, region: D.REGIONS[i % 4].id, role: D.ROLES[i % 5].id, trait: D.TRAITS[i % 3].id }); };
const ALLOWED = { trainee: ['second', 'ovr'], second: ['first', 'ovr', 'rival'], first: ['starter', 'playoff', 'powin', 'title', 'rating', 'rival'] };
const stat = { seasons: 0, offered: {}, picked: {}, ok: {}, no: {}, na: {}, stories: {}, meets: 0, withStory: 0, mates: 0, reunions: 0, kos: 0, avenged: 0 };
const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };

function play(i, seed, pickRule) {
  fresh(i, seed);
  const S = () => G.state(), seq = {}, mateSeen = {};   // seq[rid] = 맞대결 결과 순서(따로 센 것), mateSeen[rid] = 같은 팀이었던 마지막 해
  let goal = { id: 'second', t: '2군 콜업' }, powWon = 0, n = 0, lastMatchTurn = -1;   // 첫해는 기본 목표
  if (!S().goal || S().goal.id !== 'second' || S().goal.y !== 1) fail('첫해의 기본 목표가 없음');
  const seeRv = (rv, win, big) => {   // 맞대결 한 번을 따로 적고, 엔진이 붙인 문장을 대조한다
    for (const v of rv) {
      const q = seq[v.id] || (seq[v.id] = { res: [], ko: false });
      let run = 0; for (let k = q.res.length - 1; k >= 0 && q.res[k] === q.res[q.res.length - 1]; k--) run++;
      const prevRun = q.res.length ? (q.res[q.res.length - 1] ? run : -run) : 0, s = v.s || '';
      stat.meets++; if (s) { stat.withStory++; bump(stat.stories, s.replace(/\d+/g, 'n')); }
      let m;
      if (/첫 맞대결/.test(s) && q.res.length !== 0) fail(`"첫 맞대결"인데 이미 ${q.res.length}번 맞붙음`);
      if ((m = /^(\d+)연패를 끊었다/.exec(s)) && !(win && prevRun === -m[1])) fail(`"${s}"인데 직전 흐름은 ${prevRun}, 이번 ${win}`);
      if ((m = /^(\d+)연승이 끊겼다/.exec(s)) && !(!win && prevRun === +m[1])) fail(`"${s}"인데 직전 흐름은 ${prevRun}`);
      if ((m = /^이 상대에게 (\d+)연패/.exec(s)) && !(!win && prevRun === -(m[1] - 1))) fail(`"${s}"인데 직전 흐름은 ${prevRun}`);
      if (/패배를 갚았다/.test(s)) { if (!(win && big && q.ko)) fail(`"${s}"인데 토너먼트에서 진 기록이 없거나 이번에 이기지 않음`); stat.avenged++; }
      if (/이겼다\.|끊었다|갚았다/.test(s) && !win) fail(`진 경기에 이긴 문장: ${s}`);
      if (/졌다\.|내줬다|연패\.|끊겼다/.test(s) && win) fail(`이긴 경기에 진 문장: ${s}`);
      if ((m = /^(\d+)년차까지 같은 팀이던 상대와의 첫 재회에서 (이겼다|졌다)/.exec(s))) { if (mateSeen[v.id] !== +m[1]) fail(`"${s}"인데 따로 적은 같은 팀 마지막 해는 ${mateSeen[v.id]}`); if (q.res.length && q.lastY > +m[1]) fail('재회가 처음이 아닌데 첫 재회라고 함'); stat.reunions++; }
      q.lastY = S().year;
      q.res.push(!!win); if (big) { if (win) q.ko = false; else { q.ko = true; stat.kos++; } }
    }
  };
  while (!S().over && n++ < 40000) {
    const sc = G.scene(), s = S();
    if (sc && sc.type === 'match' && s.stat.turns !== lastMatchTurn + 1e9) { if (/플레이오프/.test(sc.tour) && s.lg && s.lg.tier === 'first' && sc.win) powWon++; }
    if (sc && sc.type === 'month' && !sc.seen) {
      sc.seen = 1; for (const m of sc.matches) if (m.rv && m.rv.length) seeRv(m.rv, m.win, !!m.label);
      // 그달의 맞대결을 모두 적은 뒤에 엔진의 기록(연승·연패, 지난 결과, 토너먼트 패배)과 대조한다
      for (const id in seq) { const q = seq[id], r = S().rivals.find(x => x.id === id), lastW = q.res[q.res.length - 1]; let c = 0; for (let k = q.res.length - 1; k >= 0 && q.res[k] === lastW; k--) c++; const run = lastW ? c : -c;
        if (!r || r.run !== run || !r.last || r.last.win !== lastW || !!r.ko !== q.ko || r.w + r.l < q.res.length) fail(`라이벌 기록이 따로 센 것과 다름(${r && r.nick}): run ${r && r.run}/${run}, ko ${r && !!r.ko}/${q.ko}`); }
    }
    if (sc && sc.type === 'season') {
      stat.seasons++;
      const y = s.yr, t1 = s.car.titles.filter(t => t.y === sc.year && t.tier !== 'second').length;
      // 2) 지난 목표의 판정을 따로 센 기록과 대조
      if (goal) {
        if (!sc.goal || sc.goal.t !== goal.t) fail(`${sc.year}년차: 고른 목표의 판정이 결산에 없음`);
        const ok = sc.goal.ok; let want;
        if (goal.id === 'second') want = s.squad !== 'trainee' ? 1 : 0;
        else if (goal.id === 'first') want = s.squad === 'first' || y.g1 > 0 ? 1 : 0;
        else if (goal.id === 'starter') want = y.g1 >= goal.need ? 1 : 0;
        else if (goal.id === 'rating') want = y.g1 < 12 ? -1 : y.rs1 / y.g1 >= goal.need ? 1 : 0;
        else if (goal.id === 'title') want = t1 ? 1 : 0;
        else if (goal.id === 'powin') { want = ok; if ((ok === 1) !== (powWon > 0)) fail(`${sc.year}년차: 플레이오프 승리 판정 ${ok}, 따로 센 승리 ${powWon}`); }
        else if (goal.id === 'playoff') { want = ok; if (ok !== 1 && powWon > 0) fail('플레이오프에서 이겼는데 진출 미달성'); }
        else if (goal.id === 'ovr') want = Math.floor(G.ovr()) >= goal.need ? 1 : 0;
        else if (goal.id === 'rival') { const q = seq[goal.rid] || { res: [] }, mine = q.res.slice(goal.at), w = mine.filter(Boolean).length, l = mine.length - w; want = !mine.length ? -1 : w > l ? 1 : 0; if (ok !== -1 && !new RegExp(`올해 ${w}승 ${l}패`).test(sc.goal.why)) fail(`라이벌 목표의 설명이 따로 센 전적과 다름: ${sc.goal.why} / ${w}승 ${l}패`); }
        if (ok !== want) fail(`${sc.year}년차 목표 ${goal.id}: 판정 ${ok}, 따로 센 결과 ${want} (${sc.goal.why})`);
        bump(ok === 1 ? stat.ok : ok === 0 ? stat.no : stat.na, goal.id);
        const gl = s.goalLog[s.goalLog.length - 1]; if (!gl || gl.y !== sc.year || gl.ok !== ok) fail('목표 기록(goalLog)이 판정과 다름');
      } else if (sc.goal) fail('고른 적 없는 목표의 판정이 나옴');
      // 1) 다음 목표 후보
      const cs = sc.goals || [];
      if (s.age < 36) {
        if (cs.length < 2 || cs.length > 3) fail(`목표 후보가 ${cs.length}개`);
        if (new Set(cs.map(c => c.id)).size !== cs.length) fail('같은 목표가 두 번 나옴');
        for (const c of cs) {
          bump(stat.offered, c.id);
          if (!ALLOWED[s.squad].includes(c.id)) fail(`${s.squad}에게 ${c.id} 목표를 제시함`);
          if (!c.t || !c.d) fail('목표의 이름이나 설명이 비어 있음');
          if (c.id === 'rival') { const r = s.rivals.find(x => x.id === c.rid); if (!r || r.retired || r.org === s.org || r.squad !== s.squad || D.ORG[r.org].region !== D.ORG[s.org].region || r.nick !== c.nick || r.w !== c.w0 || r.l !== c.l0) fail('맞붙을 수 없는 라이벌을 목표로 제시함'); }
          if (c.id === 'title' && !y.pow) fail('플레이오프 승리가 없는데 우승 목표를 제시함');
        }
      }
      powWon = 0;
      const k = cs.length ? pickRule(cs, sc.year) : 0, c = cs[k];
      G.resolve({ goal: k });
      if (c) { bump(stat.picked, c.id); const g = S().goal; if (!g || g.id !== c.id || g.y !== S().year) fail('고른 목표가 저장되지 않음'); goal = Object.assign({}, c, { at: c.rid && seq[c.rid] ? seq[c.rid].res.length : 0 }); const now = G.goalNow(); if (!now || now.t !== c.t) fail('홈에 보일 올해 목표가 고른 것과 다름'); }
      else goal = null;
      continue;
    }
    // 4) 해가 넘어갈 때 같은 팀이었는지 따로 적어 둔다(결산 직전의 상태)
    if (!sc && s.org && s.m === 9) for (const r of s.rivals) if (!r.retired && r.org === s.org && r.squad === s.squad) mateSeen[r.id] = s.year;
    if (sc && sc.type === 'match' && sc.story) { /* 문장 대조는 월간 보고의 같은 경기에서 한다 */ }
    G.autoStep();
    for (const r of S().rivals) if (r.mate) { if (!mateSeen[r.id] || r.mate.y > S().year) fail(`같은 팀이었던 적이 없는데 mate 기록이 있음(${r.nick})`); }
  }
  if (!S().over) fail('커리어가 끝나지 않음');
  for (const r of S().rivals) if (r.mate) stat.mates++;
  return JSON.stringify([S().age, S().car, S().stats, S().money, S().rivals.map(r => [r.id, r.w, r.l, r.ovr, r.org])]) + '|' + G.rand();
}
// 본 검사: 목표를 돌아가며 고른다. 그리고 같은 시드에서 "항상 첫 번째"와 "항상 마지막"을 골라도 결과·난수가 같은지 본다
let same = 0;
for (let i = 0; i < N; i++) {
  const seed = SEED * 100000 + i, a = play(i, seed, (cs, y) => (y + i) % cs.length);
  if (i < Math.min(N, 20)) { const b = play(i, seed, () => 0), c = play(i, seed, cs => cs.length - 1); if (a !== b || a !== c) fail(`커리어 ${i}: 목표 선택에 따라 결과나 난수가 달라짐`); same++; }
}
const tot = k => (stat.ok[k] || 0) + (stat.no[k] || 0) + (stat.na[k] || 0), ids = Object.keys(stat.picked).sort((a, b) => stat.picked[b] - stat.picked[a]);
console.log(`시즌 목표·라이벌 서사 ${N}커리어(시드 ${SEED}) + 같은 시드 재실행 ${same * 2}회: 결산 ${stat.seasons}번, 사실관계 불일치 0건`);
console.log(`  목표를 무엇으로 고르든 최종 상태와 다음 난수가 같음: ${same}커리어 × 3가지 선택`);
console.log('  목표별(돌아가며 고른 경우) 판정 — ' + ids.map(k => `${k}: ${tot(k)}번 중 달성 ${stat.ok[k] || 0}(${tot(k) ? Math.round((stat.ok[k] || 0) / tot(k) * 100) : 0}%) · 미달성 ${stat.no[k] || 0} · 판정 없음 ${stat.na[k] || 0}`).join(' | '));
console.log('  제시된 횟수 — ' + Object.entries(stat.offered).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));
console.log(`  라이벌 맞대결 ${stat.meets}번 중 문장이 붙은 것 ${stat.withStory}번(${Math.round(stat.withStory / Math.max(1, stat.meets) * 100)}%) | 토너먼트에서 진 기록 ${stat.kos}번, 그 뒤 갚은 것 ${stat.avenged}번 | 같은 팀이었던 라이벌 ${stat.mates}명, 재회 문장 ${stat.reunions}번`);
console.log('  문장 종류 — ' + Object.entries(stat.stories).sort((a, b) => b[1] - a[1]).map(([k, v]) => `"${k}" ${v}`).join(' | '));

// 6) 저장
{
  // 시즌 도중 저장·불러오기: 목표가 그대로
  fresh(0, 4242); let n = 0; while (n++ < 30000 && !(G.state().year >= 3 && !G.scene() && G.state().goal)) G.autoStep();
  const before = JSON.stringify([G.state().goal, G.state().goalLog, G.goalNow()]); G.save(); G._seen(); if (G.load() !== 'ok' || JSON.stringify([G.state().goal, G.state().goalLog, G.goalNow()]) !== before) fail('저장·불러오기 뒤 목표가 달라짐');
  // 백업 왕복
  const chk = G.importCheck(JSON.stringify(G.exportData())); if (!chk.ok) fail('목표가 든 백업이 검사를 통과하지 못함');
  // 이상한 값: 버리고 열린다
  const raw = mem[KEY];
  for (const bad of [{ goal: 5 }, { goal: { y: 1, id: 'nope', t: 'x' } }, { goal: { y: 'a', id: 'title', t: 'x' } }, { goal: { y: 2, id: 'title', t: '<img src=x onerror=alert(1)>' } }, { goalLog: 'x' }, { goalLog: [{ y: 1, id: 'a', t: 'b', ok: 9 }, 7, null] }]) {
    const s = Object.assign(JSON.parse(raw), bad); mem[KEY] = JSON.stringify(s); G._seen(); if (G.load() !== 'ok') fail('이상한 목표 값 때문에 저장이 열리지 않음: ' + JSON.stringify(bad));
    const g = G.state().goal; if (g && (!['second', 'first', 'starter', 'rating', 'playoff', 'powin', 'title', 'ovr', 'rival'].includes(g.id) || typeof g.y !== 'number')) fail('이상한 목표가 남음');
    const gl = G.state().goalLog; if (gl && (!Array.isArray(gl) || gl.some(x => !x || ![1, 0, -1].includes(x.ok)))) fail('이상한 목표 기록이 남음');
    let k = 0; while (!G.state().over && k++ < 400) G.autoStep();   // 그 상태로 진행해도 멈추지 않는다
  }
  for (const badR of [{ last: 3 }, { run: 'x' }, { ko: { y: 1 } }, { mate: [] }, { last: { y: 1, m: 2, win: 'yes' } }]) {
    const s = JSON.parse(raw); if (!s.rivals.length) break; Object.assign(s.rivals[0], badR); mem[KEY] = JSON.stringify(s); G._seen(); if (G.load() !== 'ok') fail('이상한 라이벌 기록 때문에 저장이 열리지 않음');
    const r = G.state().rivals[0], key = Object.keys(badR)[0]; if (r[key] != null) fail('이상한 라이벌 기록이 남음: ' + key);
    G.rivalFixtures(); G.rivals();
  }
  // 예전 저장(목표·라이벌 기록 없음): 그해에는 목표가 없고, 다음 결산에서 처음 고른다. 지난 일을 지어내지 않는다
  const old = JSON.parse(raw); delete old.goal; delete old.goalLog; for (const r of old.rivals) { delete r.last; delete r.run; delete r.ko; delete r.mate; }
  mem[KEY] = JSON.stringify(old); G._seen(); G.load();
  if (G.goalNow() !== null) fail('예전 저장에 올해 목표가 생김');
  if (G.rivalFixtures().some(f => /지난 맞대결|연패|연승|같은 팀이었다|졌다\. 설욕/.test(f.story))) fail('예전 저장에서 기록에 없는 지난 일을 말함');
  let seen = false, k = 0; while (!G.state().over && k++ < 4000 && !seen) { const sc = G.scene(); if (sc && sc.type === 'season') { if (sc.goal) fail('예전 저장의 첫 결산에 목표 판정이 나옴'); if (!sc.goals || sc.goals.length < 2) fail('예전 저장의 첫 결산에 목표 후보가 없음'); seen = true; } G.autoStep(); }
  if (!seen) fail('예전 저장으로 결산까지 가지 못함');
  if (!G.state().over && !G.goalNow()) fail('결산을 지난 뒤에도 목표가 없음');
  console.log('저장: 시즌 도중 저장·불러오기 일치 · 백업 검사 통과 · 이상한 목표 6종·라이벌 기록 5종을 버리고 열림 · 예전 저장은 그해 목표 없이 다음 결산에서 처음 고르고 지난 일을 말하지 않음');
}
console.log('통과');
