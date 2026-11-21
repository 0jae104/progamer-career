// 자동진행 검사(0.11.2): node test/autoplay.js [커리어 수=45] [--seed=K]
// 1) 자동진행이 엔진을 부른 순서(할 일 바꾸기 → 다음 달 → 장면 처리)를 그대로 손으로 다시 불러도 최종 상태와 다음 난수가 같다(난수를 따로 쓰지 않는다).
// 2) 대신 처리한 장면은 정책표가 허용한 것뿐이다. 계약·이적·잔류·입단 테스트·성장 카드·시즌 결산·은퇴·알림은 한 번도 대신 넘기지 않았다.
// 3) 평범한 사건을 여러 번 지나며 추가 입력 없이 여러 달 이어진다(시드마다 "사건 3회 이상을 지난 연속 구간"이 있어야 한다).
// 4) 모르는 장면은 멈춘다. 생애에 한 번뿐인 사건, 돈이 드는 선택만 남은 사건에서 멈춘다. 다른 탭이 저장을 바꾸면 멈춘다.
// 5) 성향 세 가지의 선택이 설명과 같다. "컨디션이 낮으면 휴식"은 켰을 때만 할 일을 바꾼다.
// 6) 자동 관리와 함께 돌려도 같은 달 중복 결제·음수 잔고가 없다.
const N = +process.argv[2] || 45, SEED = +((process.argv.find(a => a.startsWith('--seed=')) || '').split('=')[1] || 1);
const mem = {}; globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
const G = require('../js/engine.js'), D = G.D, B = D.BAL;
const fail = m => { console.log('실패: ' + m); process.exit(1); };
const STYLES = ['safe', 'even', 'bold'];
const fresh = (i, seed) => { for (const k in mem) delete mem[k]; mem.pg_tut_v1 = '1'; G._seen(); G.seed(seed); G.newGame({ nick: 'A' + i, region: D.REGIONS[i % D.REGIONS.length].id, role: D.ROLES[i % D.ROLES.length].id, trait: D.TRAITS[i % D.TRAITS.length].id }); };
const core = () => { const s = JSON.parse(JSON.stringify(G.state())); for (const k of ['recap', 'lastRep', 'stat', 'cid', 'ap', 'alog']) delete s[k]; s.q = (s.q || []).map(x => Object.assign({}, x, { rid: 0, at: 0 })); return JSON.stringify(s); };
const MAY = new Set(Object.keys(G.AP_RULE).filter(k => G.AP_RULE[k] !== 'stop'));   // 대신 처리해도 되는 장면
const NEVER = ['info', 'season', 'cards', 'stove', 'offers', 'tryout', 'pickOrg', 'retire'];

let cmp = 0, months = 0, starts = 0, auEvents = 0, auSeries = 0, auMoments = 0, rests = 0, longest = 0, runs3 = 0, seedsWith3 = 0;
const stops = {}, bySquad = { trainee: [0, 0], second: [0, 0], first: [0, 0] }, stopSeen = {}, resolved = {};
for (let i = 0; i < N; i++) {
  const style = STYLES[i % 3], match = i % 2 === 1, rest = i % 4 !== 3, seed = SEED * 100000 + i;
  // ---- 자동진행으로 한 커리어 ----
  fresh(i, seed);
  const ops = []; G._apTrace(ops);
  const conf = () => { G.setAp('style', style); G.setAp('match', match); G.setAp('rest', rest); };
  let confed = false, got3 = false, guard = 0;
  while (!G.state().over && guard++ < 60000) {
    if (!G.state().org || !G.state().tut.done) { ops.push(['step']); G.autoStep(); continue; }   // 입단 전과 처리 안내 기간은 검사 규칙으로 넘긴다
    if (!confed) { conf(); confed = true; }
    if (G.scene()) {
      // 멈춘 장면: 사람이 고를 차례. 검사에서는 같은 규칙(autoStep)으로 고르고 그 호출을 기록한다.
      ops.push(['step']); G.autoStep(); continue;
    }
    // 한 번 "자동진행"을 누른 것: 멈출 때까지 달마다 autoMonth
    if (!G.autoStart()) fail('자동진행을 시작하지 못함');
    starts++; const sq = G.state().squad; let k = 0, ev = 0, st = '';
    const a0 = (G.autoLog()[0] || {});
    for (let m = 0; m < B.ap.max; m++) {
      const before = ops.length, r = G.autoMonth(); k += r.k;
      for (let j = before; j < ops.length; j++) { const o = ops[j]; if (o[0] === 'res') { resolved[o[2]] = (resolved[o[2]] || 0) + 1; if (!MAY.has(o[2])) fail(`대신 처리하면 안 되는 장면을 넘김: ${o[2]}`); if (o[2] === 'event') { ev++; auEvents++; const e = D.EVENTS.find(x => x.id === o[3]); if (e.once) fail('한 번뿐인 사건을 대신 고름: ' + e.id); if (e.c[o[1]].need) fail('돈이 드는 선택을 대신 고름: ' + e.id); } if (o[2] === 'prematch') { auSeries++; if (!match) fail('"경기도 맡기기"를 끄고 있는데 경기를 대신 시작함'); } if (o[2] === 'moment') auMoments++; } if (o[0] === 'plan') { rests++; if (!rest) fail('"컨디션이 낮으면 휴식"을 껐는데 할 일을 바꿈'); } }
      if (r.stop) { st = r.stop; break; }
      if (G.scene()) fail('멈추지 않았는데 장면이 남아 있음: ' + G.scene().type);
    }
    if (!st) { st = 'max'; G.autoStop('max'); }
    stops[st] = (stops[st] || 0) + 1; months += k; bySquad[sq][0]++; bySquad[sq][1] += k; longest = Math.max(longest, k);
    if (ev >= 3) { runs3++; got3 = true; }
    const sc = G.scene();
    if (st !== 'over' && st !== 'max' && !sc) fail(`멈췄는데(${st}) 처리할 장면이 없음`);
    if (sc) { stopSeen[sc.type] = (stopSeen[sc.type] || 0) + 1; if (G.recap().stop !== st) fail('멈춘 이유가 요약에 남지 않음'); }
    if (k === 0 && st !== 'over' && !sc) fail('한 달도 가지 못하고 멈춤: ' + st);
  }
  if (!G.state().over) fail('커리어가 끝나지 않음');
  if (got3) seedsWith3++;
  G._apTrace(null);
  const endA = core(), rndA = G.rand(), log = G.autoLog();
  if (log.length > B.ap.log) fail('자동 선택 기록이 상한을 넘음');
  // ---- 같은 호출을 손으로 다시 ----
  fresh(i, seed);
  for (const o of ops) {
    if (o[0] === 'step') G.autoStep();
    else if (o[0] === 'plan') G.state().plan = o[1];
    else if (o[0] === 'next') G.next();
    else if (o[0] === 'res') { if (!G.scene() || G.scene().type !== o[2]) fail(`다시 돌릴 때 장면이 다름: ${G.scene() && G.scene().type} / ${o[2]}`); G.resolve(o[1] === null ? undefined : o[1]); }
  }
  if (core() !== endA) fail(`커리어 ${i}(${style}): 자동진행과 손으로 다시 부른 결과가 다름`);
  if (G.rand() !== rndA) fail(`커리어 ${i}: 다음 난수가 다름`);
  cmp++;
}
for (const t of NEVER) if (resolved[t]) fail('대신 넘긴 장면: ' + t);
if (seedsWith3 < Math.min(10, N)) fail(`사건 3회 이상을 지나 이어진 구간이 있는 커리어가 ${seedsWith3}개뿐`);
console.log(`자동진행 ${cmp}커리어(시드 ${SEED}, 성향 3종 × 경기 맡기기 켬/끔 × 휴식 켬/끔): 같은 호출을 손으로 다시 불러 최종 상태와 다음 난수가 모두 같음`);
console.log(`  ${starts}번 시작 → ${months}개월(한 번에 평균 ${(months / starts).toFixed(2)}개월, 최장 ${longest}개월) | 소속별 평균: ${Object.keys(bySquad).map(k => `${k} ${(bySquad[k][1] / Math.max(1, bySquad[k][0])).toFixed(2)}`).join(' · ')}`);
console.log(`  대신 처리: 사건 ${auEvents} · 경기 시작 ${auSeries} · 승부처 ${auMoments} · 할 일 바꿈 ${rests} | 사건 3회 이상을 지나 이어진 구간 ${runs3}개(커리어 ${seedsWith3}/${N}개에 있음)`);
console.log(`  대신 넘긴 장면 종류: ${Object.entries(resolved).map(([k, v]) => `${k} ${v}`).join(', ')} | 대신 넘기면 안 되는 종류(${NEVER.join('·')}) 0건`);
console.log(`  멈춘 이유: ${Object.entries(stops).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}(${(v / starts * 100).toFixed(0)}%)`).join(' · ')}`);
console.log(`  멈췄을 때 떠 있던 장면: ${Object.entries(stopSeen).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}`);

// ---- 4) 모르는 장면·한 번뿐인 사건·돈이 드는 선택·다른 탭 ----
{
  fresh(0, 777); let n = 0; while (n++ < 3000 && !(G.state().org && G.state().tut.done && !G.scene())) G.autoStep();
  G.state().q.push({ type: 'brandnew', title: 'x' });
  let r = G.autoMonth(); if (r.stop !== 'unknown' || r.k !== 0 || G.scene().type !== 'brandnew') fail('모르는 장면에서 멈추지 않음 ' + JSON.stringify(r));
  G.state().q.length = 0;
  const once = D.EVENTS.find(e => e.once), mk = ev => ({ type: 'event', ev: ev.id, rid: null, title: 't', text: 'x', choices: ev.c.map(c => ({ label: String(c.label), p: c.chk ? 50 : null, bd: null, disabled: false })) });
  G.state().q.push(mk(once)); r = G.autoMonth(); if (r.stop !== 'once' || G.scene().type !== 'event') fail('한 번뿐인 사건에서 멈추지 않음 ' + JSON.stringify(r));
  G.state().q.length = 0;
  const paid = D.EVENTS.find(e => !e.once && e.c.some(c => c.need));
  if (paid) { const sc = mk(paid); sc.choices.forEach((c, j) => { if (!paid.c[j].need) c.disabled = true; }); G.state().q.push(sc); r = G.autoMonth(); if (r.stop !== 'money') fail('돈이 드는 선택만 남았는데 멈추지 않음 ' + JSON.stringify(r)); G.state().q.length = 0; }
  for (const t of NEVER) { if (t === 'retire') continue; G.state().q.push({ type: t }); r = G.autoMonth(); if (r.stop !== t || G.state().q.length !== 1) fail(`${t} 장면에서 멈추지 않음`); G.state().q.length = 0; }
  G.save(); mem.pg_career_v1 = mem.pg_career_v1 + ' ';   // 다른 탭이 저장을 바꾼 것처럼
  const ym = G.state().year * 12 + G.state().m; r = G.autoMonth(); if (r.stop !== 'tab' || G.state().year * 12 + G.state().m !== ym) fail('다른 탭이 저장을 바꿨는데 진행함'); if (G.autoStart()) fail('다른 탭이 저장을 바꿨는데 시작됨');
  console.log(`정지 규칙: 모르는 장면 · 한 번뿐인 사건 · 돈이 드는 선택만 남은 사건${paid ? '' : '(해당 사건 없음)'} · ${NEVER.length - 1}종의 결정 장면 · 다른 탭의 저장 변경 — 모두 멈추고 장면은 그대로`);
}
// ---- 5) 성향별 선택 ----
{
  fresh(1, 888); let n = 0; while (n++ < 3000 && !(G.state().org && G.state().tut.done && !G.scene())) G.autoStep();
  const ev = D.EVENTS.find(e => !e.once && e.c.length >= 2 && e.c[0].chk && !e.c[1].chk && !e.c.some(c => c.need));
  const pick = (style, p) => { G.setAp('style', style); G.state().q.length = 0; G.state().q.push({ type: 'event', ev: ev.id, rid: null, title: 't', text: 'x', choices: ev.c.map((c, j) => ({ label: 'c' + j, p: c.chk ? p : null, bd: null, disabled: false })) }); const ops = []; G._apTrace(ops); G.state().pendingSim = false; G.autoMonth(); G._apTrace(null); const o = ops.find(x => x[0] === 'res' && x[2] === 'event'); G.state().q.length = 0; return o ? o[1] : -1; };
  const got = { safe70: pick('safe', 70), even70: pick('even', 70), even50: pick('even', 50), bold50: pick('bold', 50), bold20: pick('bold', 20) };
  if (!(got.safe70 === 1 && got.even70 === 0 && got.even50 === 1 && got.bold50 === 0 && got.bold20 === 1)) fail('성향별 선택이 설명과 다름 ' + JSON.stringify(got));
  console.log(`성향: 안정 = 판정 없는 선택 | 균형 = 성공 확률 ${B.ap.even}% 이상일 때만 도전(70% 도전, 50% 안전) | 도전 = ${B.ap.bold}% 이상이면 도전(50% 도전, 20% 안전) — 확인`);
}
// ---- 6) 자동 관리와 함께 ----
{
  let dup = 0, neg = 0, ran = 0;
  for (let i = 0; i < 6; i++) {
    fresh(i, 4000 + i); let n = 0; while (n++ < 3000 && !(G.state().org && G.state().tut.done && !G.scene())) G.autoStep();
    G.state().money = 20000; for (const it of D.SHOP) G.setAuto(it.id, true);
    for (let m = 0; m < 60 && !G.state().over; m++) {
      if (G.scene()) { G.autoStep(); continue; }
      const t0 = G.state().stat.turns, r = G.autoMonth(), rep = G.lastRep();
      if (G.state().money < 0) neg++;
      if (rep && rep.auto && G.state().stat.turns > t0) { ran++; const ids = rep.auto.items.filter(x => !x.why).map(x => x.id); if (new Set(ids).size !== ids.length) dup++; }
    }
  }
  if (dup || neg || !ran) fail(`자동 관리와 함께: 중복 ${dup} · 음수 ${neg} · 실행 ${ran}`);
  console.log(`자동 관리와 함께 자동진행: 자동 관리가 실행된 달 ${ran}개, 같은 달 중복 0, 음수 잔고 0`);
}
console.log('통과');
