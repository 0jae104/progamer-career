// 자동 커리어 시뮬레이션 테스트.
//   node test/sim.js [횟수=500] [--seed=숫자]
// 시드를 주면 같은 코드에서 같은 결과가 다시 나온다(전후 비교용). 시드가 없으면 매번 다른 난수를 쓴다.
//
// 검사(하나라도 어긋나면 종료 코드 1)
//   1) 커리어를 은퇴까지 돌리며 NaN, 범위 이탈, 진행 불가, 끝나지 않는 커리어가 없는지
//   2) 진행 도중 저장→불러오기를 반복해도 저장 내용이 같은지
//   3) 승부처: 도중 저장·재개, 결과 화면에서 반복 불러오기 시 중복 적용이 없는지, 표시 확률과 실제 성공률
//   4) 같은 이벤트가 짧은 기간에 몰려 나오지 않는지
//   5) test/fixtures 의 예전 저장(1단계, 2단계)을 열어 은퇴까지 진행되는지, 손상된 저장이 복구되는지
//   6) index.html, sw.js, 엔진의 버전 표기가 서로 같은지
// 집계(밸런스 지표. 목표 범위는 js/data.js 의 D.BAL.target, 없으면 표시만 한다)
const fs = require('fs'), path = require('path');
const store = {};
globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const G = require('../js/engine.js');
const args = process.argv.slice(2);
const N = +(args.find(a => /^\d+$/.test(a)) || 500);
const seedArg = (args.find(a => a.startsWith('--seed=')) || '').split('=')[1];
if (seedArg != null && G.seed) G.seed(+seedArg);
const rand = () => (G.rand ? G.rand() : Math.random());
const KEY = 'pg_career_v1', BAK = 'pg_career_v1_bak';
const SCENES = ['pickOrg', 'event', 'result', 'month', 'info', 'season', 'cards', 'stove', 'offers', 'tryout', 'retire', 'moment', 'mresult'];
const ROLES = ['van', 'rov', 'core', 'gun', 'sup'], TRAITS = ['genius', 'grinder', 'brain'], REGIONS = ['kr', 'cn', 'eu', 'na'];
const t0 = Date.now();
let checks = 0;
function fail(msg) { console.error('실패: ' + msg); process.exit(1); }

function invariants(tag) {
  const s = G.state(); checks++;
  for (const k in s.stats) if (!(s.stats[k] >= 1 && s.stats[k] <= 99)) fail(`${tag} 능력치 ${k}=${s.stats[k]}`);
  for (const k in s.caps) if (!(s.caps[k] >= 20 && s.caps[k] <= 99)) fail(`${tag} 한계 ${k}=${s.caps[k]}`);
  for (const k of ['cond', 'wrist', 'trust', 'fame']) if (!(s[k] >= 0 && s[k] <= 100)) fail(`${tag} ${k}=${s[k]}`);
  if (!Number.isFinite(s.money)) fail(`${tag} 자금 ${s.money}`);
  if (!Number.isFinite(G.ovr())) fail(`${tag} OVR ${G.ovr()}`);
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

/* ---- 승부처 ---- */
const MO = { n: 0, byChoice: [0, 1, 2].map(() => ({ n: 0, p: 0, ok: 0 })), okSet: { n: 0, w: 0, exp: 0 }, noSet: { n: 0, w: 0, exp: 0 }, resume: 0, series: 0, seriesWithMom: 0, perFinal: [0, 0, 0, 0] };
function playMoment(tag) {
  const sc = G.scene(), snap = store[KEY];
  if (G.load() !== 'ok' || store[KEY] !== snap) fail(`${tag} 승부처 도중 저장 왕복 후 상태가 달라짐`);
  if (JSON.stringify(G.scene()) !== JSON.stringify(sc)) fail(`${tag} 불러온 뒤 다른 승부처가 나옴`);
  G.resolve(rand() < .5 ? Math.floor(rand() * sc.choices.length) : 'auto');
  const r = G.scene(); if (r.type !== 'mresult') fail(`${tag} 승부처 결과 장면이 아님`);
  const ch = sc.choices[r.i], b = MO.byChoice[r.i]; MO.n++; b.n++; b.p += ch.p; if (r.ok) b.ok++;
  const st = r.ok ? MO.okSet : MO.noSet; st.n++; st.exp += r.ok ? ch.up : ch.down; if (r.setWin) st.w++;
  if (r.x + r.y !== sc.x + sc.y + 1) fail(`${tag} 승부처 뒤 세트가 한 번만 진행되지 않음`);
  const g0 = G.state().yr.g, money = G.state().money, snap2 = store[KEY];
  for (let k = 0; k < 2; k++) if (G.load() !== 'ok') fail(`${tag} 결과 화면 저장 불러오기 실패`);
  const c = G.state().sim.tour.cur;
  if (store[KEY] !== snap2 || c.x !== r.x || c.y !== r.y || G.state().yr.g !== g0 || G.state().money !== money) fail(`${tag} 반복 불러오기로 결과가 달라짐`);
  MO.resume++;
}

/* ---- 이벤트: 자동 정책(성공 확률이 가장 높은 선택, 확정 선택은 55로 본다)으로 고르고 기록한다 ---- */
const EV = { n: 0, sure: 0, chk: 0, pSum: 0, ok: 0, idx: [0, 0, 0], ids: {} };
function playEvent(car) {
  const sc = G.scene(); let b = 0, bv = -9;
  sc.choices.forEach((c, i) => { const v = c.disabled ? -2 : c.p == null ? 55 : c.p; if (v > bv) { bv = v; b = i; } });
  const ch = sc.choices[b];
  EV.n++; EV.idx[b]++; EV.ids[sc.ev] = (EV.ids[sc.ev] || 0) + 1;
  car.evTurns.push([car.turn, sc.ev]);
  if (car.evTurns.filter(e => e[1] === sc.ev && car.turn - e[0] < 12).length > 2) fail(`#${car.i} 같은 이벤트 ${sc.ev} 가 12번 진행 안에 3번 나옴`);
  if (car.turn <= 20) { F.events++; car.f20.add(sc.ev); F.idx[b]++; if (ch.p == null) F.sure++; else { F.chk++; F.pSum += ch.p; } }
  G.resolve(b);
  const r = G.scene();
  if (ch.p == null) EV.sure++; else { EV.chk++; EV.pSum += ch.p; if (r.ok) EV.ok++; }
}

/* ---- 첫 20번 진행 ---- */
const F = { n: 0, events: 0, distinct: 0, sure: 0, chk: 0, pSum: 0, idx: [0, 0, 0], scenes: 0, squad: { trainee: 0, second: 0, first: 0 }, ovr: 0, turnsWithScene: 0 };

/* ---- 집계 ---- */
const A = { scores: [], grades: {}, retireAge: [], debutAge: [], noDebut: 0, titles: 0, big: [], worlds: 0, poy: 0, awards: 0, inj: 0, moves: 0, peak: [], g: 0, roundTrips: 0, tryouts: 0, via: {}, debutDist: {} };
const byTrait = {}, byRole = {}, ageOvr = {}, endWhy = {};
const LG = { n: 0, w: 0, rs: 0, b: [0, 0, 0, 0, 0] };

function runCareer(i, tag, onEnd) {
  const car = { i, turn: 0, evTurns: [], f20: new Set(), seen: new Set(), counted20: false };
  let guard = 0, lastYear = 0;
  while (!G.state().over) {
    const sc = G.scene();
    if (!sc) { car.turn++; G.autoStep(); }
    else if (sc.type === 'moment') playMoment(`${tag} ${guard}`);
    else if (sc.type === 'event') playEvent(car);
    else G.autoStep();
    if (sc && car.turn <= 20) F.scenes++;
    if (++guard > 20000) fail(`${tag} 끝나지 않는 커리어: ${JSON.stringify(G.scene())}`);
    invariants(`${tag} ${guard}`);
    const s = G.state(), now = G.scene();
    if (!car.counted20 && car.turn === 20 && !now) {
      car.counted20 = true; F.n++; F.distinct += car.f20.size; F.squad[s.squad]++; F.ovr += G.ovr();
    }
    if (now && now.type === 'month' && !car.seen.has(now.title)) {
      car.seen.add(now.title);
      for (const m of now.matches) {
        if (m.label) { MO.series++; const k = (m.moms || []).length; if (k) MO.seriesWithMom++; if (m.label === '결승' && m.plays) MO.perFinal[k]++; if (k > (m.label === '결승' ? 3 : 1)) fail(`${tag} 승부처 횟수 초과`); }
        else if (m.plays) { LG.n++; if (m.win) LG.w++; LG.rs += m.r; LG.b[m.r < 5 ? 0 : m.r < 6 ? 1 : m.r < 7 ? 2 : m.r < 8 ? 3 : 4]++; }
      }
    }
    if (s.year !== lastYear) { lastYear = s.year; if (onEnd) (ageOvr[s.age] = ageOvr[s.age] || []).push(G.ovr()); }
    if (guard % 41 === 0 && !s.over && !(now && now.type === 'moment')) {
      const before = store[KEY];
      if (G.load() !== 'ok') fail(`${tag} 저장 불러오기 실패`);
      if (store[KEY] !== before) fail(`${tag} 불러온 뒤 저장 내용이 달라짐`);
      A.roundTrips++;
    }
  }
  const r = G.scene(); if (r.type !== 'retire') fail(`${tag} 은퇴 장면이 아님`);
  if (onEnd) onEnd(r, G.state().car);
}

for (let i = 0; i < N; i++) {
  const trait = TRAITS[i % 3], role = ROLES[i % 5];
  G.newGame({ nick: 'T' + i, region: REGIONS[i % 4], role, trait });
  if (i % 4 === 3) G.setFast(true);            // 네 번 중 한 번은 빠른 진행(승부처 자동 판단)
  runCareer(i, '#' + i, (r, c) => {
    const big = r.titles.filter(t => t.tier !== 'second').length;
    A.scores.push(r.score); A.grades[r.grade] = (A.grades[r.grade] || 0) + 1;
    A.retireAge.push(r.age); if (c.debut) A.debutAge.push(c.debut); else A.noDebut++;
    if (c.debut) { A.via[c.via || '?'] = (A.via[c.via || '?'] || 0) + 1; A.debutDist[c.debut] = (A.debutDist[c.debut] || 0) + 1; }
    A.titles += r.titles.length; A.big.push(big); A.awards += r.awards.length;
    if (r.titles.some(t => t.tier === 'world')) A.worlds++; if (r.awards.some(a => a.name === '올해의 선수')) A.poy++;
    A.inj += c.inj; A.moves += c.moves; A.peak.push(r.peak); A.g += r.g; A.tryouts += c.tryouts || 0;
    endWhy[r.reason] = (endWhy[r.reason] || 0) + 1;
    for (const [m, k] of [[byTrait, trait], [byRole, role]]) { m[k] = m[k] || { n: 0, score: 0, peak: 0, big: 0, age: 0, debut: 0 }; m[k].n++; m[k].score += r.score; m[k].peak += r.peak; m[k].big += big; m[k].age += r.age; if (c.debut) m[k].debut++; }
  });
}

/* ---- 예전 저장 ---- */
const fx = path.join(__dirname, 'fixtures'); let fixtures = 0; const fxNames = [];
for (const f of fs.readdirSync(fx).filter(n => n.endsWith('.json')).sort()) {
  fxNames.push(f.replace('.json', ''));
  for (let k = 0; k < 20; k++) {
    for (const key in store) delete store[key];
    store[KEY] = fs.readFileSync(path.join(fx, f), 'utf8');
    const nick = JSON.parse(store[KEY]).nick, year = JSON.parse(store[KEY]).year;
    if (G.load() !== 'ok') fail(`저장 ${f} 을(를) 열지 못함`);
    if (G.state().nick !== nick || G.state().year !== year) fail(`저장 ${f} 의 커리어가 바뀜`);
    runCareer(-1, f); fixtures++;
  }
}
// 새 필드가 없는 저장
G.newGame({ nick: 'Old', region: 'kr', role: 'core', trait: 'brain' });
for (let i = 0; i < 60; i++) G.autoStep();
const old = JSON.parse(store[KEY]); for (const k of ['inj', 'moves', 'debut', 'tryouts']) delete old.car[k]; for (const k of ['opt', 'used', 'flags', 'sim', 'recentMom', 'stat', 'grow']) delete old[k];
store[KEY] = JSON.stringify(old);
if (G.load() !== 'ok') fail('새 필드가 없는 저장을 열지 못함');
runCareer(-1, '예전 저장');
// 손상된 저장 → 시즌 시작 사본으로 복구
G.newGame({ nick: 'Bad', region: 'eu', role: 'sup', trait: 'grinder' });
for (let i = 0; i < 80; i++) G.autoStep();
if (!store[BAK]) fail('시즌 시작 사본이 없음');
store[KEY] = store[KEY].slice(0, 200);
if (G.load() !== 'backup') fail('손상된 저장을 사본으로 복구하지 못함');
if (G.state().nick !== 'Bad') fail('다른 커리어가 복구됨');
runCareer(-1, '복구 저장');
store[KEY] = '{{{'; delete store[BAK];
if (G.load() !== '' || G.hasSave()) fail('열 수 없는 저장을 정상으로 판단함');

/* ---- 버전 표기 일치 ---- */
const root = path.join(__dirname, '..'), html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
if (G.VERSION) {
  const vs = [...html.matchAll(/\?v=([\w.]+)/g)].map(m => m[1]), swv = (sw.match(/VERSION = '([\w.]+)'/) || [])[1];
  if (!vs.length || vs.some(v => v !== G.VERSION) || swv !== G.VERSION) fail(`버전 표기가 서로 다름: 엔진 ${G.VERSION}, index.html ${[...new Set(vs)]}, sw.js ${swv}`);
}

/* ---- 출력 ---- */
const avg = a => a.reduce((x, y) => x + y, 0) / (a.length || 1), sd = a => { const m = avg(a); return Math.sqrt(avg(a.map(v => (v - m) ** 2))); };
const pc = v => (v / N * 100).toFixed(1) + '%', f = (v, d = 1) => v.toFixed(d);
const dist = a => { const m = {}; a.forEach(v => m[v] = (m[v] || 0) + 1); return Object.keys(m).sort((x, y) => x - y).map(k => `${k}:${m[k]}`).join(' '); };
const T = (G.D.BAL && G.D.BAL.target) || null;
const mark = (v, r) => !T || !r ? '' : (v >= r[0] && v <= r[1] ? ` [목표 ${r[0]}~${r[1]} 충족]` : ` [목표 ${r[0]}~${r[1]} 벗어남]`);
const roleMeans = ROLES.map(k => byRole[k].score / byRole[k].n), spread = Math.max(...roleMeans) - Math.min(...roleMeans);
const debut = (N - A.noDebut) / N * 100;
A.scores.sort((a, b) => b - a);
console.log(`환경: node ${process.version}, 커리어 ${N}회, 시드 ${seedArg == null ? '없음(매번 다름)' : seedArg}, 소요 ${((Date.now() - t0) / 1000).toFixed(1)}초${G.VERSION ? ', 버전 ' + G.VERSION : ''}`);
console.log(`통과: 상태 검사 ${checks}회, 저장 왕복 ${A.roundTrips}회, 승부처 도중 저장·재개 ${MO.resume}회, 예전 저장 ${fxNames.length}종(${fxNames.join(', ')}) ${fixtures}회 완주, 손상 복구, 이벤트 몰림 검사`);
console.log('— 밸런스 —');
console.log(`1군 데뷔율 ${f(debut)}%${mark(debut, T && T.debut)} | 데뷔 나이 평균 ${f(avg(A.debutAge))}세 | 공개 테스트(커리어당) ${f(A.tryouts / N, 2)}`);
console.log(`데뷔 경로: 소속 구단 콜업 ${pc(A.via.callup || 0)} · 다른 구단의 1군 제안 ${pc(A.via.offer || 0)} · 데뷔 못 함 ${pc(A.noDebut)} | 데뷔 나이 분포 ${Object.keys(A.debutDist).map(k => k + ':' + A.debutDist[k]).join(' ')}`);
console.log(`은퇴 나이 평균 ${f(avg(A.retireAge), 2)}세${mark(avg(A.retireAge), T && T.retireAge)} · 표준편차 ${f(sd(A.retireAge), 2)} | 분포 ${dist(A.retireAge)}`);
console.log(`포지션별 평균 점수: ${ROLES.map((k, i) => `${k} ${f(roleMeans[i])} (n=${byRole[k].n}, 데뷔 ${f(byRole[k].debut / byRole[k].n * 100, 0)}%, 은퇴 ${f(byRole[k].age / byRole[k].n)}세, 우승 ${f(byRole[k].big / byRole[k].n, 2)})`).join(' | ')}`);
console.log(`포지션 점수 차(최댓값−최솟값) ${f(spread, 2)}${mark(spread, T && T.roleSpread)}`);
console.log(`성향별 평균 점수: ${TRAITS.map(k => `${k} ${f(byTrait[k].score / byTrait[k].n)} (n=${byTrait[k].n}, 우승 ${f(byTrait[k].big / byTrait[k].n, 2)})`).join(' | ')}`);
console.log(`1군 대회 우승 커리어당 ${f(avg(A.big), 2)}${mark(avg(A.big), T && T.titles)} · 표준편차 ${f(sd(A.big), 2)} · 무관 ${pc(A.big.filter(v => !v).length)} | 2군 포함 ${f(A.titles / N, 2)} | 월드 우승 경험 ${pc(A.worlds)}`);
console.log(`올해의 선수 경험 ${pc(A.poy)}${mark(A.poy / N * 100, T && T.poy)} | 개인상(커리어당) ${f(A.awards / N, 2)} | 부상(커리어당) ${f(A.inj / N, 2)} | 이적(커리어당) ${f(A.moves / N, 2)}`);
console.log(`최고 OVR 평균 ${f(avg(A.peak))} · 표준편차 ${f(sd(A.peak))} | 1군 경기 평균 ${f(A.g / N, 0)} | 커리어 점수 평균 ${f(avg(A.scores))} · 표준편차 ${f(sd(A.scores))}`);
console.log('등급 ' + ['S+', 'S', 'A', 'B', 'C', 'D', 'F'].map(g => `${g}:${pc(A.grades[g] || 0)}`).join(' '));
console.log('은퇴 사유 ' + Object.keys(endWhy).map(k => `"${k}" ${pc(endWhy[k])}`).join(' | '));
console.log('나이별 평균 OVR ' + Object.keys(ageOvr).map(a => a + ':' + f(avg(ageOvr[a]), 0)).join(' '));
console.log('— 첫 20번 진행 —');
console.log(`이벤트 ${f(F.events / F.n, 2)}회 · 서로 다른 이벤트 ${f(F.distinct / F.n, 2)}종 | 장면(눌러야 하는 화면) ${f(F.scenes / F.n)}개 | 20번째 진행 뒤 소속: 연습생 ${f(F.squad.trainee / F.n * 100, 0)}% · 2군 ${f(F.squad.second / F.n * 100, 0)}% · 1군 ${f(F.squad.first / F.n * 100, 0)}% | 평균 OVR ${f(F.ovr / F.n)}`);
console.log(`자동 정책이 고른 선택: 확률 판정 ${f(F.chk / (F.chk + F.sure) * 100, 0)}% (평균 표시 확률 ${f(F.pSum / (F.chk || 1))}%) · 확정 ${f(F.sure / (F.chk + F.sure) * 100, 0)}% | 선택지 순서별 ${F.idx.map(v => f(v / F.events * 100, 0) + '%').join(' / ')}`);
console.log('— 전체 이벤트 —');
const evIds = Object.keys(EV.ids).sort((a, b) => EV.ids[b] - EV.ids[a]);
console.log(`종류 ${evIds.length}종 | 가장 잦은 이벤트 비중 ${f(EV.ids[evIds[0]] / EV.n * 100)}% (${evIds[0]}) | 확률 판정 평균 표시 ${f(EV.pSum / (EV.chk || 1))}% → 실제 ${f(EV.ok / (EV.chk || 1) * 100)}%`);
console.log('— 승부처·리그 회귀 —');
const rate = o => o.n ? (o.ok / o.n * 100).toFixed(1) : '-', mean = o => o.n ? (o.p / o.n).toFixed(1) : '-';
console.log(`승부처 ${MO.n}회 | 표시 확률 평균 → 실제 성공률: ` + ['개인 기량', '판단', '조직력'].map((n, i) => `${n} ${mean(MO.byChoice[i])}% → ${rate(MO.byChoice[i])}% (${MO.byChoice[i].n}회)`).join(' | '));
if (MO.okSet.n && MO.noSet.n) console.log(`승부처 세트 승률: 성공 뒤 표시 ${f(MO.okSet.exp / MO.okSet.n)}% → 실제 ${f(MO.okSet.w / MO.okSet.n * 100)}% | 실패 뒤 표시 ${f(MO.noSet.exp / MO.noSet.n)}% → 실제 ${f(MO.noSet.w / MO.noSet.n * 100)}%`);
console.log(`내가 뛴 시리즈 ${MO.series}회 중 승부처가 나온 시리즈 ${f(MO.seriesWithMom / (MO.series || 1) * 100)}% | 결승 승부처 횟수 분포 0:${MO.perFinal[0]} 1:${MO.perFinal[1]} 2:${MO.perFinal[2]} 3:${MO.perFinal[3]}`);
console.log(`일반 리그 경기 ${LG.n}회 | 승률 ${f(LG.w / LG.n * 100, 2)}% | 평균 평점 ${f(LG.rs / LG.n, 3)} | 평점 구간(~5, 5~6, 6~7, 7~8, 8~) ${LG.b.map(v => f(v / LG.n * 100, 2) + '%').join(' ')}`);
console.log('PCT ' + JSON.stringify([1, 3, 8, 16, 28, 42, 58, 74, 90].map(p => [A.scores[Math.floor(N * p / 100)], p])));
// 표시 확률과 실제 성공률: 기준 2%p. 횟수가 적으면 표본 오차의 4배까지 허용한다(3000회에서는 2%p 가 그대로 적용된다).
for (const b of MO.byChoice) {
  if (!b.n) continue;
  const gap = Math.abs(b.p / b.n - b.ok / b.n * 100), lim = Math.max(2, 4 * Math.sqrt(.25 / b.n) * 100);
  if (gap > lim) fail(`승부처 표시 확률과 실제 성공률 차이 ${gap.toFixed(2)}%p (허용 ${lim.toFixed(2)}%p)`);
}
if (EV.chk) { const gap = Math.abs(EV.pSum / EV.chk - EV.ok / EV.chk * 100), lim = Math.max(2, 4 * Math.sqrt(.25 / EV.chk) * 100); if (gap > lim) fail(`이벤트 표시 확률과 실제 성공률 차이 ${gap.toFixed(2)}%p`); }
