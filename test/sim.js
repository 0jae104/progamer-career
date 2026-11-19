// 자동 커리어 시뮬레이션 테스트.  node test/sim.js [횟수]
// 1) 수천 번의 커리어를 은퇴까지 돌리며 불가능한 상태가 생기지 않는지 검사한다.
// 2) 진행 도중 저장→불러오기를 반복해 저장 데이터가 깨지지 않는지 검사한다.
// 3) 예전 형식 저장과 손상된 저장을 여는 경우를 검사한다.
// 4) 밸런스 지표를 집계해 출력한다. 하나라도 실패하면 종료 코드 1.
const store = {};
globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const G = require('../js/engine.js');
const N = +process.argv[2] || 500;
const KEY = 'pg_career_v1', BAK = 'pg_career_v1_bak';
const SCENES = ['pickOrg', 'event', 'result', 'month', 'info', 'season', 'cards', 'stove', 'offers', 'tryout', 'retire'];
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
  if (!sc && !s.over && (s.pendingSim || s.pendingNewYear)) fail(`${tag} 진행이 멈춘 상태`);
}

const A = { scores: [], grades: {}, retireAge: [], debutAge: [], noDebut: 0, titles: 0, bigTitles: 0, worlds: 0, poy: 0, inj: 0, moves: 0, peak: 0, g: 0, roundTrips: 0 };
const byTrait = {}, byRole = {}, ageOvr = {};
for (let i = 0; i < N; i++) {
  const trait = ['genius', 'grinder', 'brain'][i % 3], role = ['van', 'rov', 'core', 'gun', 'sup'][i % 5];
  G.newGame({ nick: 'T' + i, region: ['kr', 'cn', 'eu', 'na'][i % 4], role, trait });
  let guard = 0, lastYear = 0;
  while (!G.state().over) {
    G.autoStep(); if (++guard > 20000) fail('끝나지 않는 커리어: ' + JSON.stringify(G.scene()));
    invariants(`#${i} ${guard}`);
    const s = G.state();
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
console.log(`통과: 커리어 ${N}회, 상태 검사 ${checks}회, 저장 왕복 ${A.roundTrips}회, 예전 저장·손상 복구 검사`);
console.log(`은퇴 나이 평균 ${avg(A.retireAge).toFixed(1)}세 | 분포 ${dist(A.retireAge)}`);
console.log(`1군 데뷔 ${pc(N - A.noDebut)} | 데뷔 나이 평균 ${avg(A.debutAge).toFixed(1)}세 | 평균 최고 OVR ${(A.peak / N).toFixed(1)} | 평균 1군 경기 ${(A.g / N).toFixed(0)}`);
console.log(`우승(커리어당) 전체 ${(A.titles / N).toFixed(2)} · 1군 대회 ${(A.bigTitles / N).toFixed(2)} | 월드 우승 경험 ${pc(A.worlds)} | 올해의 선수 경험 ${pc(A.poy)}`);
console.log(`부상(커리어당) ${(A.inj / N).toFixed(2)} | 이적(커리어당) ${(A.moves / N).toFixed(2)}`);
console.log('등급', ['S+', 'S', 'A', 'B', 'C', 'D', 'F'].map(g => `${g}:${pc(A.grades[g] || 0)}`).join(' '));
const tbl = m => Object.keys(m).map(k => `${k} 점수 ${(m[k].score / m[k].n).toFixed(1)}·최고OVR ${(m[k].peak / m[k].n).toFixed(1)}·우승 ${(m[k].big / m[k].n).toFixed(2)}`).join(' | ');
console.log('성향별', tbl(byTrait)); console.log('포지션별', tbl(byRole));
console.log('나이별 평균 OVR', Object.keys(ageOvr).map(a => a + ':' + avg(ageOvr[a]).toFixed(0)).join(' '));
console.log('PCT', JSON.stringify([1, 3, 8, 16, 28, 42, 58, 74, 90].map(p => [A.scores[Math.floor(N * p / 100)], p])));
