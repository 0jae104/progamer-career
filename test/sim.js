// 자동 커리어 시뮬레이션 테스트.  node test/sim.js [횟수]
// 1) 수천 번의 커리어를 은퇴까지 돌리며 불가능한 상태가 생기지 않는지 검사한다.
// 2) 진행 도중 저장→불러오기를 반복해 저장 데이터가 깨지지 않는지 검사한다.
// 3) 예전 형식 저장(1단계 실제 저장 포함)과 손상된 저장을 여는 경우를 검사한다.
// 5) 승부처: 시리즈 도중 저장·재개, 결과 중복 적용 여부, 표시 확률과 실제 성공률을 검사한다.
// 4) 밸런스 지표를 집계해 출력한다. 하나라도 실패하면 종료 코드 1.
const store = {};
globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const G = require('../js/engine.js');
const N = +process.argv[2] || 500;
const KEY = 'pg_career_v1', BAK = 'pg_career_v1_bak';
const SCENES = ['pickOrg', 'event', 'result', 'month', 'info', 'season', 'cards', 'stove', 'offers', 'tryout', 'retire', 'moment', 'mresult'];
let checks = 0;
function fail(msg) { console.error('실패: ' + msg); process.exit(1); }
function invariants(tag) {
  const s = G.state(); checks++;
  for (const k in s.stats) if (!(s.stats[k] >= 1 && s.stats[k] <= 99)) fail(`${tag} 능력치 ${k}=${s.stats[k]}`);
  for (const k in s.caps) if (!(s.caps[k] >= 30 && s.caps[k] <= 99)) fail(`${tag} 한계 ${k}=${s.caps[k]}`);
  for (const k of ['cond', 'wrist', 'trust', 'fame']) if (!(s[k] >= 0 && s[k] <= 100)) fail(`${tag} ${k}=${s[k]}`);
  if (!Number.isFinite(s.money)) fail(`${tag} 자금 ${s.money}`);
  if (!(s.m >= 0 && s.m <= 9)) fail(`${tag} 월 ${s.m}`);
  if (!(s.age >= 16 && s.age <= 36)) fail(`${tag} 나이 ${s.age}`);
  if (s.org && !G.D.ORG[s.org]) fail(`${tag} 없는 구단 ${s.org}`);
  if (s.contract.years < 0) fail(`${tag} 계약 기간 ${s.contract.years}`);
  const sc = G.scene(); if (sc && !SCENES.includes(sc.type)) fail(`${tag} 알 수 없는 장면 ${sc.type}`);
  if (!sc && !s.over && (s.pendingSim || s.pendingNewYear || s.sim)) fail(`${tag} 진행이 멈춘 상태`);
  if (sc && sc.type === 'moment') {
    if (!(s.sim && s.sim.tour && s.sim.tour.cur)) fail(`${tag} 승부처인데 진행 중인 시리즈가 없음`);
    if (s.opt.fast) fail(`${tag} 빠른 진행인데 승부처 장면이 나옴`);
    if (sc.choices.length < 2 || sc.choices.length > 3) fail(`${tag} 선택지 수 ${sc.choices.length}`);
    for (const c of sc.choices) if (!(c.p >= 5 && c.p <= 95 && c.down <= sc.base && sc.base <= c.up)) fail(`${tag} 승부처 확률 이상 ${JSON.stringify(c)}`);
  }
}

const A = { scores: [], grades: {}, retireAge: [], debutAge: [], noDebut: 0, titles: 0, bigTitles: 0, worlds: 0, poy: 0, inj: 0, moves: 0, peak: 0, g: 0, roundTrips: 0 };
const byTrait = {}, byRole = {}, ageOvr = {};
const LG = { n: 0, w: 0, rs: 0, b: [0, 0, 0, 0, 0] };   // 일반 리그 경기: 승률, 평점, 평점 구간(~5, 5~6, 6~7, 7~8, 8~)
const seenRep = new Set();
// 승부처 집계: 선택지 순서별(개인 기량 / 판단 / 조직력) 표시 확률 합계와 실제 성공 횟수, 세트 승률
const MO = { n: 0, byChoice: [0, 1, 2].map(() => ({ n: 0, p: 0, ok: 0 })), bucket: {}, okSet: { n: 0, w: 0, exp: 0 }, noSet: { n: 0, w: 0, exp: 0 }, resume: 0, series: 0, seriesWithMom: 0, perFinal: [0, 0, 0, 0] };
function playMoment(tag) {
  const sc = G.scene(), key = 'pg_career_v1';
  const snap = store[key];
  if (G.load() !== 'ok' || store[key] !== snap) fail(`${tag} 승부처 도중 저장 왕복 후 상태가 달라짐`);
  if (JSON.stringify(G.scene()) !== JSON.stringify(sc)) fail(`${tag} 불러온 뒤 다른 승부처가 나옴`);
  const i = Math.random() < .5 ? Math.floor(Math.random() * sc.choices.length) : 'auto';
  G.resolve(i);
  const r = G.scene(); if (r.type !== 'mresult') fail(`${tag} 승부처 결과 장면이 아님`);
  const ch = sc.choices[r.i], b = MO.byChoice[r.i]; MO.n++; b.n++; b.p += ch.p; if (r.ok) b.ok++;
  const bk = Math.floor(ch.p / 10) * 10; MO.bucket[bk] = MO.bucket[bk] || { n: 0, p: 0, ok: 0 }; MO.bucket[bk].n++; MO.bucket[bk].p += ch.p; if (r.ok) MO.bucket[bk].ok++;
  const st = r.ok ? MO.okSet : MO.noSet; st.n++; st.exp += r.ok ? ch.up : ch.down; if (r.setWin) st.w++;
  if (r.x + r.y !== sc.x + sc.y + 1) fail(`${tag} 승부처 뒤 세트가 한 번만 진행되지 않음`);
  // 결과 화면에서 다시 불러와도 세트·경기 수가 그대로여야 한다(중복 적용 금지)
  const g0 = G.state().yr.g, snap2 = store[key];
  for (let k = 0; k < 2; k++) if (G.load() !== 'ok') fail(`${tag} 결과 화면 저장 불러오기 실패`);
  const c = G.state().sim.tour.cur;
  if (store[key] !== snap2 || c.x !== r.x || c.y !== r.y || G.state().yr.g !== g0) fail(`${tag} 반복 불러오기로 결과가 달라짐`);
  MO.resume++;
}
for (let i = 0; i < N; i++) {
  const trait = ['genius', 'grinder', 'brain'][i % 3], role = ['van', 'rov', 'core', 'gun', 'sup'][i % 5];
  G.newGame({ nick: 'T' + i, region: ['kr', 'cn', 'eu', 'na'][i % 4], role, trait });
  if (i % 4 === 3) G.setFast(true);            // 네 번 중 한 번은 빠른 진행(승부처 자동 판단)
  let guard = 0, lastYear = 0;
  while (!G.state().over) {
    if (G.scene() && G.scene().type === 'moment') playMoment(`#${i} ${guard}`); else G.autoStep();
    if (++guard > 20000) fail('끝나지 않는 커리어: ' + JSON.stringify(G.scene()));
    invariants(`#${i} ${guard}`);
    const s = G.state(), now = G.scene();
    if (now && now.type === 'month' && !seenRep.has(i + now.title)) {
      seenRep.add(i + now.title);
      for (const m of now.matches) if (m.label) { MO.series++; if (m.moms && m.moms.length) MO.seriesWithMom++; if (m.label === '결승' && m.plays) MO.perFinal[m.moms.length]++; if (m.moms.length > (m.label === '결승' ? 3 : 1)) fail(`#${i} 승부처 횟수 초과`); }
      for (const m of now.matches) if (!m.label && m.plays) { LG.n++; if (m.win) LG.w++; LG.rs += m.r; LG.b[m.r < 5 ? 0 : m.r < 6 ? 1 : m.r < 7 ? 2 : m.r < 8 ? 3 : 4]++; }
    }
    if (s.year !== lastYear) { lastYear = s.year; (ageOvr[s.age] = ageOvr[s.age] || []).push(G.ovr()); }
    if (guard % 41 === 0 && !s.over) {           // 저장 → 불러오기 왕복
      const before = store[KEY];
      if (G.load() !== 'ok') fail(`#${i} 저장 불러오기 실패`);
      if (store[KEY] !== before) fail(`#${i} 불러온 뒤 저장 내용이 달라짐`);
      A.roundTrips++;
    }
  }
  const r = G.scene(), c = G.state().car;
  if (r.type !== 'retire') fail(`#${i} 은퇴 장면이 아님`);
  A.scores.push(r.score); A.grades[r.grade] = (A.grades[r.grade] || 0) + 1;
  A.retireAge.push(r.age); if (c.debut) A.debutAge.push(c.debut); else A.noDebut++;
  A.titles += r.titles.length; A.bigTitles += r.titles.filter(t => t.tier !== 'second').length;
  if (r.titles.some(t => t.tier === 'world')) A.worlds++; if (r.awards.some(a => a.name === '올해의 선수')) A.poy++;
  A.inj += c.inj; A.moves += c.moves; A.peak += r.peak; A.g += r.g;
  for (const [m, k] of [[byTrait, trait], [byRole, role]]) { m[k] = m[k] || { n: 0, score: 0, peak: 0, big: 0 }; m[k].n++; m[k].score += r.score; m[k].peak += r.peak; m[k].big += r.titles.filter(t => t.tier !== 'second').length; }
}

// 예전 형식 저장(새 필드 없음) 열기
G.newGame({ nick: 'Old', region: 'kr', role: 'core', trait: 'brain' });
for (let i = 0; i < 60; i++) G.autoStep();
const old = JSON.parse(store[KEY]); delete old.car.inj; delete old.car.moves; delete old.car.debut; delete old.opt; delete old.used; delete old.flags;
store[KEY] = JSON.stringify(old);
if (G.load() !== 'ok') fail('예전 형식 저장을 열지 못함');
for (let i = 0; i < 300 && !G.state().over; i++) { G.autoStep(); invariants('예전 저장'); }
// 1단계에서 실제로 만든 저장 파일을 열어 은퇴까지 진행
const fs = require('fs'), path = require('path'), fx = path.join(__dirname, 'fixtures');
let fixtures = 0;
for (const f of fs.readdirSync(fx).filter(n => n.startsWith('stage1-'))) for (let k = 0; k < 20; k++) {
  for (const key in store) delete store[key];
  store[KEY] = fs.readFileSync(path.join(fx, f), 'utf8');
  if (G.load() !== 'ok') fail(`1단계 저장 ${f} 을(를) 열지 못함`);
  let n = 0;
  while (!G.state().over) { if (G.scene() && G.scene().type === 'moment') playMoment(f); else G.autoStep(); invariants(f); if (++n > 20000) fail(`${f} 끝나지 않음`); }
  fixtures++;
}
// 손상된 저장 → 시즌 시작 사본으로 복구
G.newGame({ nick: 'Bad', region: 'eu', role: 'sup', trait: 'grinder' });
for (let i = 0; i < 80; i++) G.autoStep();
if (!store[BAK]) fail('시즌 시작 사본이 없음');
store[KEY] = store[KEY].slice(0, 200);
if (G.load() !== 'backup') fail('손상된 저장을 사본으로 복구하지 못함');
if (G.state().nick !== 'Bad') fail('다른 커리어가 복구됨');
for (let i = 0; i < 300 && !G.state().over; i++) { G.autoStep(); invariants('복구 저장'); }
store[KEY] = '{{{'; delete store[BAK];
if (G.load() !== '' || G.hasSave()) fail('열 수 없는 저장을 정상으로 판단함');

const avg = a => a.reduce((x, y) => x + y, 0) / (a.length || 1), pc = v => (v / N * 100).toFixed(1) + '%';
const dist = a => { const m = {}; a.forEach(v => m[v] = (m[v] || 0) + 1); return Object.keys(m).sort((x, y) => x - y).map(k => `${k}:${m[k]}`).join(' '); };
A.scores.sort((a, b) => b - a);
console.log(`통과: 커리어 ${N}회, 상태 검사 ${checks}회, 저장 왕복 ${A.roundTrips}회, 승부처 도중 저장·재개 ${MO.resume}회, 1단계 저장 파일 ${fixtures}회 완주, 손상 복구 검사`);
const rate = o => o.n ? (o.ok / o.n * 100).toFixed(1) : '-', mean = o => o.n ? (o.p / o.n).toFixed(1) : '-';
console.log(`승부처 ${MO.n}회 | 선택지별 표시 확률 평균 → 실제 성공률: ` + ['개인 기량', '판단', '조직력'].map((n, i) => `${n} ${mean(MO.byChoice[i])}% → ${rate(MO.byChoice[i])}% (${MO.byChoice[i].n}회)`).join(' | '));
console.log('표시 확률 구간별: ' + Object.keys(MO.bucket).sort((a, b) => a - b).map(k => `${k}%대 ${mean(MO.bucket[k])}→${rate(MO.bucket[k])} (${MO.bucket[k].n})`).join(' | '));
console.log(`승부처 세트 승률: 성공 뒤 표시 ${(MO.okSet.exp / MO.okSet.n).toFixed(1)}% → 실제 ${(MO.okSet.w / MO.okSet.n * 100).toFixed(1)}% | 실패 뒤 표시 ${(MO.noSet.exp / MO.noSet.n).toFixed(1)}% → 실제 ${(MO.noSet.w / MO.noSet.n * 100).toFixed(1)}%`);
console.log(`내가 뛴 시리즈 ${MO.series}회 중 승부처가 나온 시리즈 ${(MO.seriesWithMom / MO.series * 100).toFixed(1)}% | 결승 한 번의 승부처 횟수 분포 0:${MO.perFinal[0]} 1:${MO.perFinal[1]} 2:${MO.perFinal[2]} 3:${MO.perFinal[3]}`);
// 기준 2%p. 횟수가 적으면 우연한 차이가 커지므로 표본 오차의 4배까지는 허용한다(3000회에서는 2%p 그대로 적용된다).
for (const b of MO.byChoice) {
  if (!b.n) continue;
  const gap = Math.abs(b.p / b.n - b.ok / b.n * 100), lim = Math.max(2, 4 * Math.sqrt(.25 / b.n) * 100);
  if (gap > lim) fail(`표시 확률과 실제 성공률 차이 ${gap.toFixed(2)}%p (허용 ${lim.toFixed(2)}%p)`);
}
console.log(`은퇴 나이 평균 ${avg(A.retireAge).toFixed(1)}세 | 분포 ${dist(A.retireAge)}`);
console.log(`1군 데뷔 ${pc(N - A.noDebut)} | 데뷔 나이 평균 ${avg(A.debutAge).toFixed(1)}세 | 평균 최고 OVR ${(A.peak / N).toFixed(1)} | 평균 1군 경기 ${(A.g / N).toFixed(0)}`);
console.log(`우승(커리어당) 전체 ${(A.titles / N).toFixed(2)} · 1군 대회 ${(A.bigTitles / N).toFixed(2)} | 월드 우승 경험 ${pc(A.worlds)} | 올해의 선수 경험 ${pc(A.poy)}`);
console.log(`부상(커리어당) ${(A.inj / N).toFixed(2)} | 이적(커리어당) ${(A.moves / N).toFixed(2)}`);
console.log(`일반 리그 경기 ${LG.n}회 | 승률 ${(LG.w / LG.n * 100).toFixed(2)}% | 평균 평점 ${(LG.rs / LG.n).toFixed(3)} | 평점 구간 ${LG.b.map(v => (v / LG.n * 100).toFixed(2) + '%').join(' ')}`);
console.log('등급', ['S+', 'S', 'A', 'B', 'C', 'D', 'F'].map(g => `${g}:${pc(A.grades[g] || 0)}`).join(' '));
const tbl = m => Object.keys(m).map(k => `${k} 점수 ${(m[k].score / m[k].n).toFixed(1)}·최고OVR ${(m[k].peak / m[k].n).toFixed(1)}·우승 ${(m[k].big / m[k].n).toFixed(2)}`).join(' | ');
console.log('성향별', tbl(byTrait)); console.log('포지션별', tbl(byRole));
console.log('나이별 평균 OVR', Object.keys(ageOvr).map(a => a + ':' + avg(ageOvr[a]).toFixed(0)).join(' '));
console.log('PCT', JSON.stringify([1, 3, 8, 16, 28, 42, 58, 74, 90].map(p => [A.scores[Math.floor(N * p / 100)], p])));
