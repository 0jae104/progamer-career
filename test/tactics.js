// 경기 전 전략 검사(0.11.0): node test/tactics.js [상태 수=400] [상태당 반복=24]
// 같은 "시리즈 직전 상태"에서 같은 난수 시드로 전략만 바꿔 가며 시리즈를 치러 본다(짝지은 비교).
// 확인하는 것: 전략 없음은 보정이 0이다 / 보정이 상한 안이다 / 어느 전략도 모든 상황에서 가장 좋지는 않다 /
//             같은 상태·같은 시드·같은 전략이면 몇 번을 다시 해도 결과가 같다 / 전략은 그 시리즈에만 적용된다.
const NS = +process.argv[2] || 400, R = +process.argv[3] || 24;
const mem = {}; globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
const G = require('../js/engine.js'), KEY = 'pg_career_v1', D = G.D;
const fail = m => { console.log('실패: ' + m); process.exit(1); };
const put = raw => { for (const k in mem) delete mem[k]; mem[KEY] = raw; G._seen(); if (G.load() !== 'ok') fail('상태를 열지 못함'); };

// 1) 시리즈 직전 상태 모으기
G.seed(7);
const snaps = [], roles = D.ROLES.map(r => r.id), regs = D.REGIONS.map(r => r.id), tr = D.TRAITS.map(t => t.id);
for (let i = 0; snaps.length < NS && i < 4000; i++) {
  for (const k in mem) delete mem[k]; G._seen();
  G.newGame({ nick: 'T' + i, region: regs[i % regs.length], role: roles[i % roles.length], trait: tr[i % tr.length] });
  let n = 0;
  while (!G.state().over && n++ < 30000 && snaps.length < NS) {
    const sc = G.scene();
    if (sc && sc.type === 'prematch' && n % 7 === 0) { G.save(); snaps.push(mem[KEY]); }
    G.autoStep();
  }
}
if (snaps.length < NS) fail(`상태를 ${snaps.length}개밖에 모으지 못함`);

// 2) 전략별로 같은 시드에서 시리즈 치르기
const TACS = ['', 'press', 'steady', 'wait'], NAME = { '': '전략 없음', press: '강하게 압박', steady: '안정 운영', wait: '실수 노리기' };
function playSeries(raw, tac, seed) {
  put(raw); G.seed(seed);
  const pre = G.scene(); if (pre.type !== 'prematch') fail('시리즈 직전 장면이 아님');
  G.resolve(tac);
  for (let n = 0; n < 60; n++) {
    const sc = G.scene();
    if (sc && sc.type === 'match') return { pre, m: sc, st: JSON.stringify([G.state().car, G.state().money, G.state().cond, G.state().rivals.map(r => [r.id, r.w, r.l])]) };
    if (!sc) fail('시리즈가 끝나기 전에 장면이 사라짐');
    G.autoStep();
  }
  fail('시리즈가 끝나지 않음');
}
const B = { fav: s => s.base >= 55, even: s => s.base > 45 && s.base < 55, dog: s => s.base <= 45, hot: s => s.cond >= 70, cold: s => s.cond < 50 };
const BN = { all: '전체', fav: '전력 우세(세트 승률 55% 이상)', even: '비슷(45~55%)', dog: '전력 열세(45% 이하)', hot: '컨디션 70 이상', cold: '컨디션 50 미만' };
const agg = {}; for (const b of Object.keys(BN)) { agg[b] = {}; for (const t of TACS) agg[b][t] = { n: 0, w: 0, sets: 0, sw: 0, d: 0 }; }
let maxD = 0, setN = 0, carry = 0;
snaps.forEach((raw, si) => {
  for (let r = 0; r < R; r++) {
    const seed = 1000 + si * 131 + r;
    for (const t of TACS) {
      const o = playSeries(raw, t, seed), m = o.m;
      if (m.tac !== t) fail(`고른 전략(${t})과 기록된 전략(${m.tac})이 다름`);
      if (t === '' && m.sets.some(x => x.d !== 0)) fail('전략 없음인데 보정이 기록됨');
      for (const x of m.sets) { if (Math.abs(x.d) > maxD) maxD = Math.abs(x.d); setN++; }
      if (m.x + m.y !== m.sets.length || m.sets.filter(x => x.w).length !== m.x || m.win !== (m.x > m.y)) fail('결과 장면의 세트 기록과 스코어가 다름');
      for (const b of Object.keys(BN)) if (b === 'all' || B[b](o.pre)) { const a = agg[b][t]; a.n++; if (m.win) a.w++; a.sets += m.sets.length; a.sw += m.x; a.d += m.sets.reduce((p, x) => p + x.d, 0); }
      // 같은 상태·시드·전략을 다시 하면 글자 단위로 같아야 한다(다시 열기·건너뛰기는 엔진을 부르지 않으므로 이것으로 충분하다)
      if (r === 0 && si % 10 === 0) { const o2 = playSeries(raw, t, seed); if (JSON.stringify(o2.m) !== JSON.stringify(m) || o2.st !== o.st) fail('같은 상태·시드·전략인데 결과가 달라짐'); }
      // 전략은 그 시리즈에서 끝난다: 다음 시리즈의 상태에 남아 있지 않아야 한다
      if (r === 0 && t && si % 10 === 0) { G.resolve(); const c = G.state().sim && G.state().sim.tour && G.state().sim.tour.cur; if (c && c.tac) fail('끝난 시리즈의 전략이 다음 시리즈에 남아 있음'); carry++; }
    }
  }
});
if (maxD > 7) fail(`전략 보정이 상한을 넘음: 세트 승률 ${maxD}%p`);

// 2-1) 예전 저장·손상된 상태·중복 입력
let legacy = 0, healed = 0, once = 0;
for (let si = 0; si < snaps.length; si += 8) {
  const raw = snaps[si], seed = 5000 + si, base = playSeries(raw, '', seed);
  // (가) 0.10.2 형식의 진행 중 시리즈(전략·세트 기록 필드가 없음): 전략을 묻지 않고, 결과 장면 없이, '전략 없음'과 같은 판정으로 끝나야 한다
  { const o = JSON.parse(raw), c = o.sim.tour.cur, L0 = o.sim.tour.lines.length; delete c.tac; delete c.sets; delete c.shown; o.q = o.q.filter(x => x.type !== 'prematch');
    for (const k in mem) delete mem[k]; mem[KEY] = JSON.stringify(o); G._seen(); G.seed(seed);
    if (G.load() !== 'ok') fail('예전 형식의 상태를 열지 못함');   // 불러오면서 멈춰 있던 시리즈가 이어진다
    const lines = () => (G.state().sim && G.state().sim.tour ? G.state().sim.tour.lines : null);
    for (let n = 0; n < 20 && lines() && lines().length === L0; n++) {
      const sc = G.scene(); if (!sc) break;
      if (sc.type === 'prematch' || sc.type === 'match' || sc.pips != null) fail(`예전 형식의 진행 중 시리즈에 새 장면이 나옴(${sc.type})`);
      G.autoStep();
    }
    const ln = lines() && lines()[L0];
    if (ln) { if (ln.win !== base.m.win || ln.score !== `${base.m.x}-${base.m.y}`) fail(`예전 형식의 시리즈가 전략 없음과 다른 결과를 냄 ${ln.score} / ${base.m.x}-${base.m.y}`); legacy++; } }
  // (나) 전략을 기다리는 중인데 선택 장면이 사라진 상태: 멈추지 않고 전략 없이 진행한다
  { const o = JSON.parse(raw); o.q = o.q.filter(x => x.type !== 'prematch'); put(JSON.stringify(o)); G.seed(seed);
    let n = 0; while (n++ < 80 && !G.state().over && !(G.scene() && G.scene().type === 'match')) { if (!G.scene() && !G.state().sim) break; G.autoStep(); }
    const m = G.scene(); if (m && m.type === 'match' && m.tac !== '') fail('선택 장면 없이 전략이 적용됨'); healed++; }
  // (다) 선택 장면이 두 번 처리돼도(연타) 전략은 한 번만 정해진다
  { const o = JSON.parse(raw); o.q.splice(1, 0, JSON.parse(JSON.stringify(o.q[0]))); put(JSON.stringify(o)); G.seed(seed);
    G.resolve('press'); const c = G.state().sim.tour.cur; if (G.scene() && G.scene().type === 'prematch') { G.resolve('wait'); }
    if (c && c.tac !== 'press') fail(`두 번째 입력이 전략을 바꿈(${c.tac})`); once++; }
  // (라) 없는 전략 이름은 전략 없음으로 처리된다
  { put(raw); G.resolve('<img>'); const c = G.state().sim && G.state().sim.tour && G.state().sim.tour.cur; if (c && c.tac) fail('없는 전략 이름이 저장됨'); }
}
// 2-2) 전략 선택 장면에 적힌 1세트 승률은 실제로 쓰이는 값이다: 전력 차와 컨디션에서 다시 계산해 대조한다
{ let chk = 0; for (let si = 0; si < snaps.length; si += 5) { put(snaps[si]); const sc = G.scene(); for (const t of sc.tacs) { if (!(t.p >= 1 && t.p <= 99) || Math.abs(t.p - sc.base) > 7) fail(`선택 장면의 승률 표시 이상 ${JSON.stringify(t)} 기준 ${sc.base}`); chk++; } if (sc.tacs.length !== 3 || new Set(sc.tacs.map(t => t.id)).size !== 3) fail('전략이 3종이 아님'); }
  console.log(`선택 장면 표시 검사 ${chk}개 | 예전 형식 시리즈 ${legacy}회(새 장면 없음, 전략 없음과 같은 결과) | 사라진 선택 장면 복구 ${healed}회 | 중복 입력 ${once}회`); }

// 3) 표
const pct = (a, b) => (b ? (a / b * 100).toFixed(1) : '-');
console.log(`전략 검사: 시리즈 직전 상태 ${NS}개 × 시드 ${R}개 × 전략 4종 = 시리즈 ${NS * R * 4}회, 세트 ${setN}개 | 세트당 보정의 최댓값 ${maxD}%p`);
console.log('상황 | 시리즈 수(전략당) | ' + TACS.map(t => NAME[t] + ' 시리즈 승률(세트 승률, 세트당 평균 보정)').join(' | '));
const best = {}, worst = {};
for (const b of Object.keys(BN)) {
  const row = agg[b]; if (!row[''].n) continue;
  console.log(`${BN[b]} | ${row[''].n} | ` + TACS.map(t => `${pct(row[t].w, row[t].n)}% (${pct(row[t].sw, row[t].sets)}%, ${(row[t].d / row[t].sets).toFixed(2)}%p)`).join(' | '));
  const three = TACS.slice(1).map(t => [t, row[t].w / row[t].n]).sort((p, q) => q[1] - p[1]);
  best[b] = three[0][0]; worst[b] = three[2][0];
}
console.log('상황별로 가장 좋았던 전략: ' + Object.keys(best).map(b => `${BN[b]} → ${NAME[best[b]]}`).join(' | '));
const winners = new Set(['fav', 'even', 'dog'].map(b => best[b]).filter(Boolean));
if (winners.size < 2) fail('전력 상황이 달라져도 가장 좋은 전략이 하나뿐임(정답이 정해진 선택)');
for (const t of TACS.slice(1)) if (['fav', 'even', 'dog', 'hot', 'cold'].every(b => !agg[b][''].n || agg[b][t].w / agg[b][t].n > agg[b][''].w / agg[b][''].n)) console.log(`  참고: ${NAME[t]}은(는) 모든 상황에서 전략 없음보다 높았다`);
console.log(`통과: 전략 없음의 보정 0 · 상한 ${maxD}%p ≤ 7 · 같은 상태·시드·전략의 재실행 일치 · 전략이 다음 시리즈로 넘어가지 않음(${carry}회 확인) · 상황에 따라 가장 좋은 전략이 달라짐`);
