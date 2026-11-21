// 진행 래퍼와 자동 관리 검사(0.11.1): node test/pacing.js [커리어 수=60]
// 1) "이번 달 진행 / 다음 중요한 순간까지"는 손으로 한 달씩 넘긴 것과 결과·난수가 같다.
// 2) 자동으로 닫히는 것은 평범한 월간 보고뿐이다. 선택이 필요한 장면과 중요한 결과는 하나도 건너뛰지 않는다.
// 3) 자동 관리: 기본 꺼짐, 켜면 한 달에 한 번, 같은 항목 중복 결제 0, 잔고가 음수가 되거나 남겨 둘 돈 아래로 내려가지 않음, 건너뛴 이유 기록, 합계 검산.
// 4) 꺼 둔 상태의 판정은 예전과 같다(이 파일에서는 켜지 않은 경로끼리 비교. 예전 버전과의 비교는 문서의 기준선 검사).
// 5) 이상한 설정이 든 저장은 안전한 값으로 고쳐 연다.
const N = +process.argv[2] || 60;
const mem = {}; globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
const G = require('../js/engine.js'), D = G.D, KEY = 'pg_career_v1';
const fail = m => { console.log('실패: ' + m); process.exit(1); };
const fresh = (i, seed) => { for (const k in mem) delete mem[k]; G._seen(); G.seed(seed); G.newGame({ nick: 'P' + i, region: D.REGIONS[i % D.REGIONS.length].id, role: D.ROLES[i % D.ROLES.length].id, trait: D.TRAITS[i % D.TRAITS.length].id }); };
const core = () => { const s = JSON.parse(JSON.stringify(G.state())); delete s.recap; delete s.lastRep; delete s.stat; delete s.cid; s.q = (s.q || []).map(x => Object.assign({}, x, { rid: 0, at: 0 })); return JSON.stringify(s); };   // 커리어 ID와 기록 시각은 실행할 때마다 다르다
const IMPORTANT = new Set(['event', 'pickOrg', 'cards', 'stove', 'offers', 'tryout', 'prematch', 'moment', 'mresult', 'match', 'season', 'info', 'result', 'retire']);

// ---- 1, 2) 같은 시드에서 두 가지 방법으로 진행 ----
// 손으로: 장면이 없으면 next(), 월간 보고는 resolve()(확인을 누른 것), 그 밖의 장면은 같은 규칙(autoStep)으로 고른다.
// 래퍼로: 장면이 없으면 advance(12) 또는 advance(1), 남아 있는 월간 보고(평범하지 않아 창으로 뜬 것)는 resolve(), 그 밖의 장면은 같은 규칙.
// 누름 횟수 계산: 진행 버튼 1, 장면마다 1(경기 준비는 전략 고르기 + 시작 = 2). 같은 선택을 한다고 보고 센다.
const W = t => (t === 'prematch' ? 2 : 1);
function playManual(steps) {
  const seen = []; let taps = 0, months = 0;
  playManual.out = () => ({ taps, months });
  for (let n = 0; n < steps && !G.state().over; n++) {
    const sc = G.scene();
    if (!sc) { G.next(); taps++; months++; continue; }
    taps += W(sc.type);
    if (sc.type !== 'month') seen.push(sc.type);
    if (sc.type === 'month') G.resolve(); else G.autoStep();
  }
  return seen;
}
function playWrapped(steps, max) {
  const seen = []; let closed = 0, shown = 0, calls = 0, months = 0, results = 0, lastEv = null, taps = 0;
  for (let n = 0; n < steps && !G.state().over; n++) {
    const sc = G.scene();
    if (!sc) { const k = G.advance(max); calls++; taps++; months += k; closed += G.recap() ? G.recap().n : 0; if (!k) fail('장면이 없는데 진행하지 못함'); continue; }
    taps += W(sc.type);
    if (sc.type !== 'month') seen.push(sc.type); else shown++;
    if (sc.type === 'month') G.resolve(); else G.autoStep();
    const k = G.settle(); closed += k;   // 화면이 장면을 닫은 뒤 하는 일
    const ev = G.recap() && G.recap().ev; if (ev && ev !== lastEv) { results++; lastEv = ev; }
  }
  return { seen, closed, shown, calls, months, results, taps };
}
let cmp = 0, absorbed = 0, shownMonths = 0, runCalls = 0, runMonths = 0, kinds = {}; const T = { old: 0, one: 0, run: 0, m: 0 };
for (let i = 0; i < N; i++) {
  for (const max of [12, 1]) {
    fresh(i, 100 + i); const a = playManual(100000); const A = core(), ra = G.rand(), ma = playManual.out();
    fresh(i, 100 + i); const b = playWrapped(100000, max); const Bc = core(), rb = G.rand();
    if (!G.state().over) fail('커리어가 끝나지 않음');
    if (A !== Bc) fail(`래퍼(최대 ${max}개월)로 진행한 커리어 ${i}의 최종 상태가 손으로 넘긴 것과 다름`);
    if (ra !== rb) fail(`래퍼가 난수를 더 쓰거나 덜 씀(커리어 ${i})`);
    // 사건의 결과(result)는 래퍼 쪽에서 창 없이 요약으로 넘어간다(고를 것이 없는 장면). 처음 안내 중의 것만 창으로 남는다.
    const aNoRes = a.filter(t => t !== 'result'), bNoRes = b.seen.filter(t => t !== 'result'), resA = a.length - aNoRes.length, resB = b.seen.length - bNoRes.length;
    if (max === 12 && resB + b.results !== resA) fail(`사건 결과의 개수가 다름: 손 ${resA} / 래퍼 창 ${resB} + 요약 ${b.results}`);
    if (JSON.stringify(aNoRes) !== JSON.stringify(bNoRes)) fail(`래퍼가 장면을 건너뛰거나 순서를 바꿈(커리어 ${i}): 손 ${a.length}개 / 래퍼 ${b.seen.length}개`);
    for (const t of a) { if (!IMPORTANT.has(t)) fail('모르는 장면 종류 ' + t); kinds[t] = (kinds[t] || 0) + 1; }
    if (max === 12) { T.old += ma.taps; T.m += ma.months; T.run += b.taps; } else T.one += b.taps;
    cmp++; if (max === 12) { absorbed += b.closed; shownMonths += b.shown; runCalls += b.calls; runMonths += b.months; }
  }
}
console.log(`진행 래퍼: 커리어 ${N}개 × 2가지(한 달씩 / 최대 12개월) = ${cmp}회 비교, 최종 상태와 다음 난수 값이 손으로 넘긴 것과 모두 같음`);
console.log(`  멈춘 장면 ${Object.values(kinds).reduce((p, c) => p + c, 0) / 2}개(${Object.keys(kinds).sort().map(k => `${k} ${kinds[k] / 2}`).join(', ')}): 손으로 넘길 때와 종류·순서가 같음 = 건너뛴 것 0`);
console.log(`  "다음 중요한 순간까지" ${runCalls}번 누름 → ${runMonths}개월 진행(한 번에 평균 ${(runMonths / runCalls).toFixed(2)}개월) | 창 없이 요약으로 넘긴 월간 보고·사건 결과 ${absorbed}개 · 창으로 남은 월간 보고 ${shownMonths}개(처음 안내 기간)`);
const per = v => (v / T.m * 12).toFixed(1);
console.log(`누름 횟수(같은 선택을 한다고 볼 때, 커리어 ${N}개 · ${T.m}개월): 0.11.0 방식 ${T.old}번 = 12개월당 ${per(T.old)}번 | "이번 달 진행"만 ${T.one}번 = ${per(T.one)}번(${Math.round((1 - T.one / T.old) * 100)}% 감소) | "다음 중요한 순간" ${T.run}번 = ${per(T.run)}번(${Math.round((1 - T.run / T.old) * 100)}% 감소)`);

// ---- 상한: 한 번에 12개월을 넘기지 않고, 장면이 있으면 진행하지 않는다 ----
{ fresh(0, 7); let n = 0; while (n++ < 3000 && !(G.state().tut.done && !G.scene())) G.autoStep();
  const y = G.state().year * 12 + G.state().m; const k = G.advance(999);
  if (k > 12) fail('한 번에 12개월 넘게 진행함');
  if (G.scene()) { const raw = core(); if (G.advance(12) !== 0 || core() !== raw) fail('장면이 떠 있는데 진행함'); } }

// ---- 3) 자동 관리 ----
function tenMonths(i, setup) {
  fresh(i, 900 + i); let n = 0;
  while (n++ < 30000 && !G.state().over && !(G.state().squad === 'first' && G.state().tut.done && !G.scene() && G.state().m === 0)) G.autoStep();
  if (G.state().over || G.state().squad !== 'first') return null;
  G.state().money = setup.money; G.save(); setup.fn();
  const s0 = JSON.parse(JSON.stringify(G.state())), reps = []; let months = 0;
  while (months < 10 && !G.state().over) {
    const sc = G.scene();
    if (!sc) { const before = G.state().lastRep; const k = G.advance(1); months += k; const lr = G.state().lastRep; if (lr && lr !== before) reps.push(lr); if (G.state().money < 0) fail('잔고가 음수'); continue; }
    if (sc.type === 'month') { reps.push(sc); G.resolve(); } else G.autoStep();
    G.settle(); const lr = G.state().lastRep; if (lr && !reps.includes(lr) && lr.auto) reps.push(lr);
  }
  return { s0, reps, s1: G.state() };
}
let autoRuns = 0, bought = 0, skipped = 0, why = {};
for (let i = 0; i < Math.max(12, N / 3 | 0); i++) {
  // (가) 꺼 둠: 보고에 자동 관리가 없고, 설정 자체가 없다
  const off = tenMonths(i, { money: 5000, fn: () => {} }); if (!off) continue;
  if (off.s1.auto || off.reps.some(r => r.auto)) fail('켜지 않았는데 자동 관리가 실행됨');
  // (나) 전부 켬, 돈 넉넉: 한 달에 항목당 한 번, 단계형은 한 단계, 합계 검산
  const on = tenMonths(i, { money: 60000, fn: () => { for (const it of D.SHOP) G.setAuto(it.id, true); G.setAutoLimit('keep', 500); } });
  let spent = 0; const lv0 = Object.assign({}, on.s0.shop);
  for (const r of on.reps) {
    if (!r.auto) continue; autoRuns++;
    const ids = r.auto.items.map(x => x.id); if (new Set(ids).size !== ids.length) fail('같은 달에 같은 항목이 두 번 처리됨');
    const sum = r.auto.items.filter(x => !x.why).reduce((p, x) => p + x.cost, 0); if (sum !== r.auto.spent) fail('자동 관리 합계가 항목의 합과 다름');
    if (sum > 0 && !(r.auto.bal >= 500)) fail(`자동으로 산 뒤의 잔고(${r.auto.bal})가 남겨 둘 돈(500) 아래`);
    spent += sum; for (const x of r.auto.items) { if (x.why) { skipped++; why[x.why] = (why[x.why] || 0) + 1; } else bought++; }
  }
  const up = D.SHOP.filter(x => !x.once).reduce((p, it) => p + (on.s1.shop[it.id] - lv0[it.id]), 0), upMax = on.reps.filter(r => r.auto).length * 3;
  if (up > upMax) fail('단계형 항목이 한 달에 한 단계보다 많이 올라감');
  for (const it of D.SHOP.filter(x => !x.once)) if (on.s1.shop[it.id] > it.cost.length) fail('최대 단계를 넘음');
  if (on.reps.filter(r => r.auto).length < 9) fail(`10개월 중 자동 관리가 실행된 달이 ${on.reps.filter(r => r.auto).length}개`);
  // (다) 돈이 모자람: 사지 않고 이유를 적는다. 남겨 둘 돈 아래로 내려가지 않는다
  const poor = tenMonths(i, { money: 0, fn: () => { G.state().contract.salary = 600; for (const it of D.SHOP) G.setAuto(it.id, true); G.setAutoLimit('keep', 2000); } });
  // 잔고 0으로 시작해도 상금·사건 수입으로 돈이 모이면 살 수 있다. 샀다면 "산 직후의 잔고"가 남겨 둘 돈(2000) 이상이어야 한다(예전 검사는 한 건이라도 사면 실패로 봤다: 외부 검수에서 지적)
  for (const r of poor.reps) if (r.auto) { if (r.auto.items.some(x => !x.why) && !(r.auto.bal >= 2000)) fail(`남겨 둘 돈 아래로 내려가며 자동으로 삼(산 직후 잔고 ${r.auto.bal})`); if (r.auto.bal < 0) fail('잔고가 음수'); for (const x of r.auto.items) { if (x.why) { why[x.why] = (why[x.why] || 0) + 1; skipped++; } else bought++; } }
  if (!poor.reps.some(r => r.auto && r.auto.items.some(x => x.why === 'low'))) fail('잔고 부족으로 건너뛴 기록이 없음');
  // (라) 상한: 한 달 자동 지출이 상한을 넘지 않는다
  const capd = tenMonths(i, { money: 60000, fn: () => { for (const it of D.SHOP) G.setAuto(it.id, true); G.setAutoLimit('cap', 500); G.setAutoLimit('keep', 0); } });
  for (const r of capd.reps) if (r.auto && r.auto.spent > 500) fail('한 달 상한을 넘겨 지출함');
}
// (마) 같은 달 두 번 실행 방지: 실행한 달 표시가 같으면 다시 사지 않는다. 직접 산 달에는 자동으로 또 사지 않는다
{ fresh(1, 55); let n = 0; while (n++ < 30000 && !(G.state().squad !== 'trainee' && G.state().tut.done && !G.scene())) G.autoStep();
  G.state().money = 50000; G.setAuto('counsel', true); const m0 = G.state().stats.mental;
  if (!G.buy('counsel')) fail('직접 구매 실패'); const afterBuy = G.state().money;
  let rep = null; for (let k = 0; k < 40 && !rep; k++) { const sc = G.scene(); if (!sc) { G.advance(1); rep = G.state().lastRep && G.state().lastRep.auto ? G.state().lastRep : null; } else if (sc.type === 'month') { if (sc.auto) rep = sc; G.resolve(); } else G.autoStep(); }
  if (!rep || rep.auto.items[0].why !== 'used' || rep.auto.spent !== 0) fail('직접 산 달에 자동으로 또 삼 ' + JSON.stringify(rep && rep.auto)); }
// (바) 설정은 저장·불러오기 뒤에도 그대로다
{ fresh(2, 56); G.setAuto('gear', true); G.setAutoLimit('cap', 2000); const raw = mem[KEY]; for (const k in mem) delete mem[k]; mem[KEY] = raw; G._seen(); G.load(); const a = G.autoInfo(); if (!(a.items.find(x => x.id === 'gear').on && a.cap === 2000 && a.n === 1)) fail('자동 관리 설정이 저장되지 않음'); G.setAuto('gear', false); if (G.autoInfo().n !== 0) fail('끄기가 되지 않음'); }
console.log(`자동 관리: 실행된 달 ${autoRuns}개 | 산 것 ${bought}건 · 건너뛴 것 ${skipped}건(${Object.keys(why).map(k => k + ' ' + why[k]).join(', ')}) | 같은 달 중복 0 · 음수 잔고 0 · 합계 검산 일치 · 상한 준수 · 직접 산 달 중복 없음 · 설정 저장`);

// ---- 5) 이상한 설정이 든 저장 ----
{ fresh(3, 77); for (let k = 0; k < 6; k++) G.autoStep(); G.save(); const base = JSON.parse(mem[KEY]);
  const bad = [{ on: { evil: 1, counsel: 'yes', gear: 1, __proto__x: 1 }, keep: -5, cap: 1e99, at: 'x' }, 'on', [1, 2], { on: [1] }, { on: null, keep: NaN }, { on: { counsel: 1 }, keep: 500, cap: 500, at: 1e9, extra: '<img onerror=1>' }];
  for (const b of bad) {
    const o = JSON.parse(JSON.stringify(base)); o.auto = b; o.recap = { n: 'x', g: '<b>' }; o.lastRep = { type: 'month', title: 1 };
    for (const k in mem) delete mem[k]; mem[KEY] = JSON.stringify(o); G._seen();
    if (G.load() !== 'ok') fail('설정만 이상한 저장을 열지 못함');
    const s = G.state(), a = s.auto;
    if (s.recap || s.lastRep) fail('이상한 진행 요약을 그대로 둠');
    if (a && (Object.keys(a.on).some(k => !D.SHOP.some(x => x.id === k)) || !D.BAL.auto.keeps.includes(a.keep) || !D.BAL.auto.caps.includes(a.cap) || JSON.stringify(a).includes('<'))) fail('이상한 자동 관리 설정을 그대로 둠 ' + JSON.stringify(a));
    for (let k = 0; k < 30; k++) { if (G.scene()) G.autoStep(); else G.advance(1); } if (G.state().money < 0) fail('잔고가 음수');
  }
  // 백업으로 내보내고 다시 검사해도 통과한다
  fresh(4, 78); G.setAuto('counsel', true); for (let k = 0; k < 40; k++) { if (G.scene()) G.autoStep(); else G.advance(3); G.settle(); }
  const chk = G.importCheck(JSON.stringify(G.exportData())); if (!chk || chk.ok !== true) fail('자동 관리·진행 요약이 든 저장이 백업 검사를 통과하지 못함 ' + JSON.stringify(chk).slice(0, 200));
  console.log(`이상한 설정 ${bad.length}종: 안전한 값으로 고쳐 열고 계속 진행됨 | 자동 관리·진행 요약이 든 저장의 백업 검사 통과`); }
console.log('통과');
