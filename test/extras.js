// 0.11.2에서 더한 것들의 검사: 외형 저장, 돈 쓰는 선택 두 가지, 노력형의 한계 성장, 해외에서의 귀국 제안.
//   node test/extras.js
const mem = {}; globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
const G = require('../js/engine.js'), D = G.D, B = D.BAL, KEY = 'pg_career_v1';
const fail = m => { console.log('실패: ' + m); process.exit(1); };
const fresh = (seed, o) => { for (const k in mem) delete mem[k]; mem.pg_tut_v1 = '1'; G._seen(); G.seed(seed); G.newGame(Object.assign({ nick: 'X', region: 'kr', role: 'core', trait: 'brain' }, o || {})); };
const toIdle = () => { let n = 0; while (n++ < 4000 && !(G.state().org && G.state().tut.done && !G.scene())) G.autoStep(); };

// ---- 1) 외형 ----
{
  fresh(1, { look: '21031' }); if (G.state().look !== '21031') fail('고른 외형이 저장되지 않음');
  const statsA = JSON.stringify([G.state().stats, G.state().caps, G.state().grow]);
  fresh(1, { look: '55333' }); if (JSON.stringify([G.state().stats, G.state().caps, G.state().grow]) !== statsA) fail('외형이 능력치에 영향을 줌');
  fresh(1); if (JSON.stringify([G.state().stats, G.state().caps, G.state().grow]) !== statsA || 'look' in JSON.parse(mem[KEY])) fail('외형 없이 시작한 커리어가 다르거나 look 이 저장됨');
  for (const bad of ['', '2103', '210319', '71031', '2103x', 21031, null, ['2', '1', '0', '3', '1'], '<b>12']) { fresh(2, { look: bad }); if (G.state().look !== undefined) fail('잘못된 외형을 받아들임: ' + JSON.stringify(bad)); }
  // 저장을 직접 고친 경우: 열 때 버린다
  fresh(3, { look: '10101' }); toIdle(); G.save();
  for (const bad of ['99999', '<img>', 5, { a: 1 }]) { const s = JSON.parse(mem[KEY]); s.look = bad; mem[KEY] = JSON.stringify(s); G._seen(); if (G.load() !== 'ok' || G.state().look !== undefined) fail('저장에 든 잘못된 외형을 버리지 않음: ' + JSON.stringify(bad)); }
  // 은퇴 기록·백업에 남는다
  fresh(4, { look: '43212' }); let n = 0; while (!G.state().over && n++ < 30000) G.autoStep();
  const rec = G.endRec(), hall = G.hall('recent')[0];
  if (!rec || rec.look !== '43212' || !hall || hall.look !== '43212') fail('은퇴 기록에 외형이 남지 않음');
  const chk = G.importCheck(JSON.stringify(G.exportData())); if (!chk.ok) fail('외형이 든 백업이 검사를 통과하지 못함: ' + chk.err);
  const ex = G.exportData(); ex.payload.legacy.recs[0].look = 'zzzzz'; const c2 = G.importCheck(JSON.stringify(ex));
  if (c2.ok) { G.importApply(c2.data); if (G.hall('recent')[0].look !== undefined) fail('백업에 든 잘못된 외형이 기록에 들어감'); }
  console.log('외형: 고른 값 저장 · 능력치와 무관 · 잘못된 값 13종 거부 · 은퇴 기록과 백업에 유지 · 없는 저장은 그대로');
}
// ---- 2) 돈 쓰는 선택 두 가지 ----
{
  const fan = D.SHOP.find(x => x.id === 'fanmeet'), an = D.SHOP.find(x => x.id === 'analyst');
  fresh(11); toIdle(); const S = G.state(); S.money = 5000; S.cond = 80; S.fame = 20; S.used = {};
  if (G.autoInfo().n !== 0) fail('새 항목이 처음부터 켜져 있음');
  let m0 = S.money, f0 = S.fame, c0 = S.cond;
  if (!G.buy('fanmeet') || S.money !== m0 - fan.cost[0] || !(S.fame > f0) || Math.round(S.cond) !== Math.round(c0 - 6)) fail('팬 미팅의 효과가 설명과 다름');
  if (G.buy('fanmeet') || S.money !== m0 - fan.cost[0]) fail('팬 미팅을 같은 달에 두 번 삼');
  S.stats.sense = 60; S.caps.sense = 60.1; S.stats.pool = 50; S.caps.pool = 80; m0 = S.money;
  if (!G.buy('analyst') || S.stats.sense > 60.1 + 1e-9 || Math.abs(S.stats.pool - 50.2) > 1e-9 || S.money !== m0 - an.cost[0]) fail('전술 분석가의 효과가 설명과 다르거나 한계를 넘음');
  // 자동: 지쳤으면 팬 미팅을 건너뛰고, 더 오를 곳이 없으면 분석가를 건너뛴다. 음수 잔고·중복 없음
  fresh(12); toIdle(); const T = G.state(); T.money = 8000; G.setAuto('fanmeet', true); G.setAuto('analyst', true);
  let tired = 0, full = 0, bought = 0, dup = 0, neg = 0;
  for (let i = 0; i < 80 && !T.over; i++) {
    if (G.scene()) { G.autoStep(); continue; }
    if (i === 30) { for (const k of ['sense', 'pool']) T.stats[k] = T.caps[k]; }
    const t0 = T.stat.turns; T.plan = i % 3 ? 'solo' : 'scrim'; G.advance(1); const rep = G.lastRep();
    if (T.money < 0) neg++;
    if (rep && rep.auto && T.stat.turns > t0) { const ids = rep.auto.items.filter(x => !x.why).map(x => x.id); if (new Set(ids).size !== ids.length) dup++; bought += ids.length; for (const x of rep.auto.items) { if (x.why === 'tired') tired++; if (x.why === 'full') full++; } }
  }
  if (!bought || !tired || !full || dup || neg) fail(`자동: 산 것 ${bought} · 지쳐서 건너뜀 ${tired} · 필요 없어 건너뜀 ${full} · 중복 ${dup} · 음수 ${neg}`);
  console.log(`돈 쓰는 선택: 팬 미팅(인기↑ 컨디션 −6)·전술 분석가(한계까지) 효과 확인 · 같은 달 중복 0 · 자동으로 산 것 ${bought}건, 지쳐서 건너뜀 ${tired}건, 필요 없어 건너뜀 ${full}건, 음수 잔고 0 · 기본 꺼짐`);
}
// ---- 3) 노력형: 시즌마다 한계가 오른다(grinderCapAge 세까지), 다른 성향은 그대로, 지나간 시즌은 다시 계산하지 않는다 ----
{
  const run = trait => { fresh(21, { trait }); const rows = []; let n = 0, age = G.state().age, caps = Object.assign({}, G.state().caps); while (!G.state().over && n++ < 30000) { G.autoStep(); const s = G.state(); if (s.age !== age) { rows.push([s.age, +(s.caps.team - caps.team).toFixed(3), s.perks.length]); age = s.age; caps = Object.assign({}, s.caps); } } return rows; };
  // 한계는 성장 카드와 노쇠로도 바뀌므로, 둘 다 없는 해(카드가 한계를 건드리지 않고 23세 이하)의 팀워크 한계 변화만 본다
  const g = run('grinder'), b = run('brain');
  const young = r => r.filter(x => x[0] <= 23).map(x => x[1]);
  if (!young(g).some(d => Math.abs(d - B.grinderCapYear) < 1e-6)) fail('노력형의 한계가 시즌마다 오르지 않음 ' + JSON.stringify(g.slice(0, 8)));
  if (young(b).some(d => Math.abs(d - B.grinderCapYear) < 1e-6)) fail('다른 성향의 한계가 같이 오름');
  // 예전 저장(이미 22세인 노력형): 열어도 한계가 그대로이고, 다음 시즌부터만 오른다
  fresh(22, { trait: 'grinder' }); let n = 0; while (!G.state().over && G.state().age < 22 && n++ < 30000) G.autoStep(); while (G.scene() && !G.state().over) G.autoStep();
  if (!G.state().over) { G.save(); const before = JSON.stringify(JSON.parse(mem[KEY]).caps); G._seen(); G.load(); if (JSON.stringify(G.state().caps) !== before) fail('저장을 여는 것만으로 한계가 바뀜'); }
  console.log(`노력형: 시즌이 끝날 때 모든 한계 +${B.grinderCapYear}(${B.grinderCapAge}세까지) 확인 · 다른 성향은 변화 없음 · 저장을 열 때 다시 계산하지 않음`);
}
// ---- 4) 귀국 제안 ----
{
  // 고국에서 뛰는 선수: 제안 목록이 새 규칙을 끈 것과 글자 단위로 같아야 한다(난수 소비도 같다)
  let same = 0;
  for (let i = 0; i < 30; i++) {
    fresh(100 + i, { region: ['kr', 'cn', 'eu', 'na'][i % 4] }); let n = 0; while (!G.state().over && n++ < 30000 && !(G.scene() && G.scene().type === 'stove' && G.state().squad === 'first')) G.autoStep();
    if (G.state().over || D.ORG[G.state().org].region !== G.state().home) continue;
    G.seed(5000 + i); const a = JSON.stringify(G._offers(false)), ra = G.rand();
    B.homeSlot = false; const keep = B.homeAge; B.homeAge = 1; G.seed(5000 + i); const b = JSON.stringify(G._offers(false)), rb = G.rand(); B.homeSlot = true; B.homeAge = keep;
    if (a !== b || ra !== rb) fail('고국에서 뛰는 선수의 제안이 새 규칙 때문에 달라짐'); same++;
  }
  if (same < 10) fail('고국 선수 표본이 부족함 ' + same);
  // 해외에서 성적을 낸 선수: 고국 1군 제안이 후보에 있으면 목록에 나오고 back 표시가 붙는다. 성적이 없으면 예전 규칙 그대로다
  let abroad = 0, shown = 0, cand = 0, flagged = 0, plain = 0;
  for (let i = 0; i < 400 && abroad < 40; i++) {
    fresh(300 + i, { region: 'kr' }); let n = 0;
    while (!G.state().over && n++ < 30000) {
      const sc = G.scene(), s = G.state();
      if (sc && sc.type === 'offers') { const j = sc.offers.findIndex(o => o.squad === 'first' && D.ORG[o.org].region !== 'kr' && !o.renew); if (j >= 0 && D.ORG[s.org].region === 'kr') { G.resolve({ i: j, act: 'accept' }); continue; } }
      if (sc && sc.type === 'stove' && s.squad === 'first' && D.ORG[s.org].region !== 'kr') {
        const h = s.hist[s.hist.length - 1], proved = h.squad === 'first' && h.g >= B.homeGames && h.avg >= B.homeAvg; abroad++;
        for (let k = 0; k < 20; k++) {
          const r = G._offers(false), isHome = x => x.squad === 'first' && D.ORG[x.org].region === 'kr', inC = r.cand.some(isHome), inO = r.out.some(isHome);
          if (proved) { if (inC) { cand++; if (inO) shown++; else fail('성적을 낸 선수의 고국 제안이 후보에 있는데 목록에 없음'); if (r.out.filter(isHome).every(x => x.back)) flagged++; } }
          else { plain++; if (r.out.some(x => !isHome(x) && x.back)) fail('고국 제안이 아닌데 복귀 표시가 붙음'); }
          if (r.out.length > 3) fail('제안이 세 개를 넘음');
        }
        break;
      }
      G.autoStep();
    }
  }
  if (!cand || shown !== cand || flagged !== cand) fail(`귀국 제안: 해외 선수 ${abroad}명 · 후보 ${cand} · 목록 ${shown} · 표시 ${flagged}`);
  console.log(`귀국 제안: 고국에서 뛰는 선수 ${same}명의 제안 목록·난수는 새 규칙 전과 같음 · 해외 선수 ${abroad}명 — 성적을 낸 경우 고국 1군 제안이 후보에 든 ${cand}번 모두 목록에 나오고 복귀 표시가 붙음 · 성적이 없는 경우(${plain}번)는 예전 규칙`);
}
// ---- 5) 분석 자료(0.11.5): 전술 분석가를 산 달의 토너먼트에서만, 주전으로 뛸 때만 팀 전력 +B.prepStr ----
{
  // 같은 저장·같은 시드에서 플레이오프 달 직전에 산 경우와 사지 않은 경우의 "경기 준비" 화면을 비교한다
  const toPlayoff = seed => { fresh(seed); let n = 0; while (!G.state().over && n++ < 60000) { const s = G.state(); if (!G.scene() && s.squad === 'first' && s.tut.done && G.isStarter() && !s.injury && (s.m === 2 || s.m === 6) && s.money > 1000) { G.save(); return mem[KEY]; } G.autoStep(); } return ''; };
  let checked = 0, bench = 0, up = 0, gain = 0;
  for (let seed = 700; seed < 760 && checked < 6; seed++) {
    const raw = toPlayoff(seed); if (!raw) continue;
    const run = buy => { for (const k in mem) delete mem[k]; mem.pg_tut_v1 = '1'; mem[KEY] = raw; G._seen(); G.load(); G.seed(seed * 7); if (buy && !G.buy('analyst')) fail('전술 분석가를 사지 못함'); const stamp = G.state().year * 100 + G.state().m; if (buy && G.state().prep !== stamp) fail('직접 샀는데 이번 달 분석 자료가 준비되지 않음'); G.next(); let k = 0; while (G.scene() && G.scene().type !== 'prematch' && k++ < 20) G.resolve(G.scene().type === 'event' ? 0 : undefined); return G.scene() && G.scene().type === 'prematch' ? G.scene() : null; };
    const a = run(false), b = run(true); if (!a || !b) continue;   // 팀이 플레이오프에 못 올라간 달: 분석 자료는 쓰이지 않는다(돈만 나간다)
    if (a.prep || !b.prep) fail('분석 자료 표시가 산 것과 다름');
    if (b.base < a.base || b.base - a.base > 8) fail(`분석 자료의 효과가 설명과 다름: 세트 승률 ${a.base}% → ${b.base}%`);
    if (b.base > a.base) up++; gain += b.base - a.base;   // 전력 차가 큰 경기에서는 반올림한 승률이 같게 보일 수 있다
    checked++;
    // 그달이 지나면 사라진다
    let k = 0; while (G.scene() && k++ < 80) G.autoStep(); if (G.spendInfo().prepNow) fail('달이 지났는데 분석 자료가 남아 있음');
  }
  if (checked < 3 || !up) fail(`플레이오프 달의 표본이 부족하거나 효과가 한 번도 보이지 않음: ${checked}번 중 ${up}번`);
  // 주전이 아니면 적용되지 않고, 자동 구매는 다음 달에 걸린다. 이상한 값은 버린다
  fresh(31); toIdle(); const S = G.state(); S.money = 9000; S.used = {}; G.setAuto('analyst', true);
  for (let t = 0; t < 6 && !S.over; t++) { while (G.scene() && !S.over) G.autoStep(); if (S.over) break; const m0 = S.m, y0 = S.year, money0 = S.money; S.stats.sense = Math.min(S.stats.sense, S.caps.sense - 2); G.next(); let k = 0; while (G.scene() && k++ < 40 && S.year * 100 + S.m === y0 * 100 + m0) G.autoStep(); const bought = S.money < money0 && S.used.analyst === 1;
    if (bought) { const want = m0 + 1 < 10 ? y0 * 100 + m0 + 1 : (y0 + 1) * 100; if (S.prep !== want) fail(`자동으로 산 분석 자료가 다음 달에 걸리지 않음: ${S.prep} / ${want}`); bench++; } }
  if (!bench) fail('자동 구매가 한 번도 일어나지 않아 확인하지 못함');
  G.save(); const o = JSON.parse(mem[KEY]); o.prep = 'x'; mem[KEY] = JSON.stringify(o); G._seen(); if (G.load() !== 'ok' || G.state().prep != null) fail('이상한 분석 자료 값이 남음');
  const sp = G.spendInfo(); if (!sp || typeof sp.stream !== 'number' || sp.stream !== 30 + Math.round(G.state().fame * 8) || sp.payPct !== Math.round(G.state().fame / 2)) fail('인기의 효과 안내가 실제 식과 다름');
  console.log(`분석 자료: 플레이오프 달 ${checked}번에서 산 경우에만 경기 준비 화면에 표시되고 1세트 승률이 평균 ${(gain / checked).toFixed(1)}%p 오름(${up}번은 표시 숫자가 바뀜) · 달이 지나면 사라짐 · 자동 구매는 다음 달(${bench}번 확인) · 이상한 값은 버림 · 인기 안내는 실제 식과 같음`);
}
// ---- 6) 자금 내역(0.11.6): 돈이 바뀌는 모든 걸음에서 "시작 잔고 + 적힌 수입·지출 = 끝 잔고". 자동 관리는 한 달에 한 번, 같은 항목은 한 번 ----
{
  let steps = 0, months = 0, autoM = 0, dupes = 0; const kinds = {}, K = ['sal', 'stream', 'prize', 'award', 'event', 'auto', 'buy'];
  for (let c = 0; c < 24; c++) {
    fresh(9100 + c, { region: ['kr', 'cn', 'eu', 'na'][c % 4], role: ['van', 'rov', 'core', 'gun', 'sup'][c % 5], trait: ['genius', 'grinder', 'brain'][c % 3] }); toIdle();
    if (c % 3 !== 2) for (const it of D.SHOP) G.setAuto(it.id, true);   // 세 커리어 중 둘은 자동 관리를 전부 켠다
    if (c % 4 === 1) G.setAutoLimit('cap', G.autoInfo().caps[1]);
    let n = 0;
    while (!G.state().over && n++ < 30000) {
      const S = G.state(), m0 = S.money, q = G.cash().seq, ym = S.year * 100 + S.m;
      if (c % 5 === 0 && !G.scene() && n % 7 === 0) G.buy('counsel');   // 가끔 직접 산다
      G.autoStep(); steps++;
      const S1 = G.state(), it = G.cash().all.filter(x => x.seq > q), sum = it.reduce((a, x) => a + x.v, 0);
      if (Math.abs(m0 + sum - S1.money) > 1e-6 || it.some(x => x.gap)) fail(`자금 내역: 커리어 ${c} ${ym} — 잔고 ${m0} + 내역 ${sum} ≠ ${S1.money}`);
      if (S1.money < 0) fail(`자금 내역: 잔고가 음수 ${S1.money}`);
      for (const x of it) { if (!K.includes(x.k)) fail(`자금 내역: 종류를 모르는 변동 ${x.k} ${x.v}`); kinds[x.k] = (kinds[x.k] || 0) + 1; if (x.k === 'auto' && x.v >= 0) fail('자동 관리가 돈을 늘림'); if (x.k === 'sal' && x.v <= 0) fail('월급이 0 이하'); }
      const sal = it.filter(x => x.k === 'sal'), au = it.filter(x => x.k === 'auto'), lr = S1.q.find(x => x.type === 'month') || G.lastRep();   // 방금 만들어진 그달의 보고(아직 창으로 남아 있으면 그것)
      if (sal.length > 1) fail(`자금 내역: 한 걸음에 월급이 ${sal.length}번`);
      if (sal.length) { months++; if (lr && lr.salary !== sal[0].v) fail(`월급 ${sal[0].v} ≠ 월간 보고 ${lr.salary}`); const spent = lr && lr.auto ? lr.auto.spent : 0; if (-au.reduce((a, x) => a + x.v, 0) !== spent) fail(`자동 관리 내역 ${-au.reduce((a, x) => a + x.v, 0)} ≠ 월간 보고 ${spent}`); if (au.length) { autoM++; const ids = lr.auto.items.filter(x => !x.why).map(x => x.id); if (new Set(ids).size !== ids.length || ids.length !== au.length) { dupes++; fail(`자동 관리: 같은 달에 같은 항목이 두 번(${ids})`); } } }
      else if (au.length) fail('월급 없이 자동 관리만 나감');
    }
  }
  if (!kinds.sal || !kinds.auto || !kinds.buy || months < 1500) fail(`자금 내역: 표본이 모자람 ${JSON.stringify(kinds)}`);
  // 내역은 저장하지 않는다: 저장 글자에 들어가지 않고, 다시 불러오면 비어 있다. 다른 커리어의 내역은 섞이지 않는다
  fresh(9199); toIdle(); G.next(); let k = 0; while (G.scene() && k++ < 60) G.autoStep(); G.save();
  if (/"cash"|"seq"/.test(mem[KEY])) fail('자금 내역이 저장에 들어감');
  if (!G.cash().all.length) fail('진행했는데 내역이 없음');
  const raw = mem[KEY]; fresh(9200); if (G.cash().all.length || G.cash().known) fail('새 커리어에 앞 커리어의 내역이 보임');
  mem[KEY] = raw; G._seen(); if (G.load() !== 'ok') fail('저장을 다시 열지 못함');
  console.log(`자금 내역: 24커리어 ${steps}걸음(월급 ${months}달, 자동 관리가 나간 달 ${autoM}개)에서 잔고 + 내역 = 다음 잔고, 빠진 변동 0건 · 같은 달 중복 구매 ${dupes}건 · 종류별 ${K.filter(x => kinds[x]).map(x => `${x} ${kinds[x]}`).join(', ')} · 저장에는 들어가지 않음`);
}
// ---- 7) 0.11.9: 월간 보고의 OVR 변화와 "거의 오르지 않은 이유", 시즌 프로젝트 ----
{
  const B = D.BAL, P = B.proj, roleW = () => D.ROLES.find(r => r.id === G.state().role).w, ovrOf = st => { const w = roleW(); let t = 0; for (const k in w) t += w[k] * st[k]; return t; };
  const room = S => { const w = roleW(); let t = 0; for (const k in w) t += w[k] * Math.max(0, 1 - Math.pow(S.stats[k] / S.caps[k], 4)); return t; };
  // (가) 보고의 o0·o1 은 그달 앞뒤의 실제 OVR 이고, why 는 정의대로다(따로 다시 계산해 대조)
  let reps = 0; const whys = {};
  for (let c = 0; c < 9; c++) {
    fresh(9300 + c, { role: ['van', 'rov', 'core', 'gun', 'sup'][c % 5], trait: ['genius', 'grinder', 'brain'][c % 3] }); let n = 0, o0 = null, seen = null;
    while (!G.state().over && n++ < 30000) {
      const sc = G.scene();
      if (!sc && G.state().org) o0 = ovrOf(G.state().stats);   // 달을 시작하기 직전의 OVR
      if (sc && sc.type === 'month' && sc !== seen) {
        seen = sc; reps++;
        if (typeof sc.o0 !== 'number' || typeof sc.o1 !== 'number') fail('월간 보고에 OVR 변화가 없음');
        if (o0 != null && Math.abs(sc.o0 - Math.round(o0 * 10) / 10) > 1.05) fail(`보고의 시작 OVR ${sc.o0} 이 그달 시작의 실제 값 ${o0.toFixed(2)} 과 다름`);   // 사건으로 능력치가 바뀐 달은 달 시작(simMonth) 시점과 다를 수 있다
        if (sc.ovr !== Math.floor(sc.o1 + 1e-9) && Math.abs(sc.o1 - sc.ovr) > 1) fail(`o1 ${sc.o1} 과 OVR ${sc.ovr} 이 맞지 않음`);
        const sum = sc.growth.reduce((a, g) => a + Math.abs(g[1]), 0);
        if (sc.why) { whys[sc.why] = (whys[sc.why] || 0) + 1; if (!['rest', 'cap', 'age', 'plan'].includes(sc.why)) fail('모르는 이유 ' + sc.why); if (sc.o1 - sc.o0 >= .25) fail(`OVR 이 ${sc.o1 - sc.o0} 올랐는데 이유(${sc.why})가 붙음`); if (sc.why === 'rest' && sc.plan !== '휴식') fail('쉬지 않았는데 이유가 휴식'); }
        else if (sc.plan === '휴식' && sc.o1 - sc.o0 < .1 && sum < .5) fail('쉬어서 오르지 않은 달인데 이유가 없음');
      }
      G.autoStep();
    }
  }
  if (reps < 800 || !whys.rest || !whys.cap) fail(`이유 표본이 모자람 ${reps} ${JSON.stringify(whys)}`);
  // 이유 "cap" 은 남은 성장 여지가 0.25 미만일 때만: 상태를 직접 만들어 확인
  fresh(9320, { trait: 'genius' }); toIdle();
  { const S = G.state(); for (const k in S.stats) S.stats[k] = S.caps[k] - .2; S.cond = 90; S.wrist = 90; G.setPlan('scrim'); G.next(); let k = 0; while (G.scene() && G.scene().type !== 'month' && k++ < 40) G.autoStep(); const sc = G.scene(); if (!sc || sc.type !== 'month' || sc.why !== 'cap' || room(S) >= .25) fail(`한계에 붙은 선수의 이유가 cap 이 아님: ${sc && sc.why}`); if (G.growInfo().near.length < 2 || G.growInfo().room >= .25) fail('growInfo 가 한계에 가까운 능력치를 알려 주지 않음'); }
  fresh(9321, { trait: 'genius' }); toIdle();
  { const S = G.state(); for (const k in S.stats) S.stats[k] = S.caps[k] - 25; S.cond = 90; S.wrist = 90; G.setPlan('scrim'); G.next(); let k = 0; while (G.scene() && G.scene().type !== 'month' && k++ < 40) G.autoStep(); const sc = G.scene(); if (!sc || sc.type !== 'month' || sc.why) fail(`한계와 먼 어린 선수가 훈련했는데 이유가 붙음: ${sc && sc.why} (${sc && sc.o0}→${sc && sc.o1})`); if (sc.o1 - sc.o0 < .3) fail('훈련했는데 OVR 이 거의 오르지 않음'); }

  // (나) 시즌 프로젝트
  fresh(9330, { role: 'gun', trait: 'grinder' }); toIdle();
  let S = G.state(), I = G.projInfo();
  if (!I || I.done || I.opts.length !== 2 || I.opts.map(o => o.id).join() !== 'camp,fan') fail('프로젝트 선택지가 두 개가 아님');
  const wantCost = id => Math.max(P.min, Math.round(S.contract.salary * P[id].rate / 10) * 10);
  for (const o of I.opts) if (o.cost !== wantCost(o.id)) fail(`${o.id} 값 ${o.cost} ≠ 연봉 × ${P[o.id].rate} (${wantCost(o.id)})`);
  // 돈이 모자라면, 컨디션이 낮으면 못 산다(상태는 그대로)
  const snap = () => JSON.stringify([S.money, S.cond, S.fame, S.caps, S.proj || null]);
  S.money = 5; S.cond = 90; let a = snap(); if (G.buyProj('camp') || snap() !== a || G.projInfo().opts[0].why !== 'money') fail('돈이 모자란데 프로젝트를 샀거나 이유가 다름');
  S.money = 5000; S.cond = P.minCond - 1; a = snap(); if (G.buyProj('camp') || G.buyProj('fan') || snap() !== a || G.projInfo().opts[0].why !== 'cond') fail('컨디션이 낮은데 프로젝트를 샀거나 이유가 다름');
  if (G.buyProj('nope') || snap() !== a) fail('없는 프로젝트를 삼');
  // 집중 캠프: 비중이 큰 두 능력치의 한계만 +1, 컨디션 −20, 값만큼 자금, 능력치·인기는 그대로, 난수를 쓰지 않는다
  S.cond = 80; const w = roleW(), top = D.STATS.slice().sort((x, y) => w[y.id] - w[x.id]).slice(0, 2).map(x => x.id), caps0 = Object.assign({}, S.caps), st0 = JSON.stringify(S.stats), m0 = S.money, f0 = S.fame, q0 = G.cash().seq, cost = wantCost('camp');
  G.seed(4242); if (!G.buyProj('camp')) fail('집중 캠프를 사지 못함'); const r1 = G.rand(); G.seed(4242); if (G.rand() !== r1) fail('프로젝트 구매가 난수를 씀');
  for (const k in caps0) if (Math.abs(S.caps[k] - (caps0[k] + (top.includes(k) ? P.camp.cap : 0))) > 1e-9) fail(`집중 캠프 뒤 ${k} 한계가 예상과 다름`);
  if (S.money !== m0 - cost || S.cond !== 80 + P.camp.cond || JSON.stringify(S.stats) !== st0 || S.fame !== f0) fail('집중 캠프의 값·컨디션이 다르거나 능력치·인기가 바뀜');
  const led = G.cash().all.filter(x => x.seq > q0); if (led.length !== 1 || led[0].k !== 'proj' || led[0].v !== -cost || led[0].gap) fail('프로젝트 지출이 자금 내역에 한 줄로 적히지 않음');
  if (!S.proj || S.proj.y !== S.year || S.proj.id !== 'camp' || !G.projInfo().done) fail('산 프로젝트가 상태에 남지 않음');
  if (!S.log[0].msg.includes('시즌 프로젝트') || !S.log[0].msg.includes('집중 캠프')) fail('소식에 적히지 않음');
  // 같은 시즌에는 다시 못 산다. 저장하고 다시 열어도, 다른 선택지도
  S.cond = 90; S.money = 99999; a = snap(); if (G.buyProj('camp') || G.buyProj('fan') || snap() !== a || G.projInfo().opts.some(o => o.ok || o.why !== 'done')) fail('한 시즌에 프로젝트를 두 번 삼');
  G.save(); const raw = mem[KEY]; G._seen(); if (G.load() !== 'ok') fail('프로젝트가 든 저장을 열지 못함'); S = G.state();
  if (!S.proj || S.proj.id !== 'camp' || G.buyProj('fan') || Math.abs(S.caps[top[0]] - (caps0[top[0]] + P.camp.cap)) > 1e-9) fail('다시 연 뒤 프로젝트 상태가 사라졌거나 또 살 수 있음');
  if (!G.importCheck(JSON.stringify(G.exportData())).ok) fail('프로젝트가 든 백업이 검사를 통과하지 못함');
  // 다음 시즌에는 다시 고를 수 있다. 팬 캠페인: 인기는 addFame 의 식대로, 컨디션 −12, 한계·능력치 그대로
  const y0 = S.year; let n = 0; while (!G.state().over && G.state().year === y0 && n++ < 4000) G.autoStep(); let k2 = 0; while (G.scene() && k2++ < 200 && !G.state().over) G.autoStep();
  S = G.state(); if (S.over) fail('검사용 커리어가 일찍 끝남');
  if (G.projInfo().done || G.projInfo().lastY !== y0) fail('해가 바뀌었는데 지난 프로젝트가 올해 것으로 보임');
  S.cond = 90; S.money = 99999; const fame0 = S.fame, capsB = JSON.stringify(S.caps), wantFame = Math.min(100, fame0 + P.fan.fame * ((S.cards || []).includes('star') ? 1.5 : 1) * (1 - fame0 / 115));
  if (!G.buyProj('fan')) fail('다음 시즌에 팬 캠페인을 사지 못함');
  if (Math.abs(S.fame - wantFame) > 1e-6 || S.cond !== 90 + P.fan.cond || JSON.stringify(S.caps) !== capsB || S.proj.id !== 'fan' || S.proj.y !== S.year) fail(`팬 캠페인의 효과가 예상과 다름(인기 ${fame0} → ${S.fame}, 예상 ${wantFame})`);
  // 이상한 저장 값은 버리고 연다
  for (const bad of [{ y: 'x', id: 'camp', t: 'a', d: 'b' }, { y: 3, id: 'hack', t: 'a', d: 'b' }, [1, 2], 'camp', { y: 3, id: 'camp', t: 'x'.repeat(99), d: 'b' }, { y: -1, id: 'fan', t: 'a', d: 'b' }]) {
    const o = JSON.parse(raw); o.proj = bad; mem[KEY] = JSON.stringify(o); G._seen(); if (G.load() !== 'ok') fail('이상한 프로젝트 값이 든 저장을 열지 못함'); if (G.state().proj) fail('이상한 프로젝트 값을 버리지 않음: ' + JSON.stringify(bad)); if (!G.projInfo().opts.length) fail('프로젝트 안내가 깨짐');
  }
  // 자동으로는 사지 않는다: 자동 규칙·자동 관리로 은퇴까지 가도 프로젝트는 없다. 프로젝트가 없는 옛 저장도 그대로 열린다
  fresh(9340, { trait: 'grinder' }); toIdle(); for (const it of D.SHOP) G.setAuto(it.id, true); n = 0; while (!G.state().over && n++ < 30000) { if (G.state().proj) fail('자동 진행이 프로젝트를 삼'); G.autoStep(); }
  { const o = JSON.parse(raw); delete o.proj; mem[KEY] = JSON.stringify(o); G._seen(); if (G.load() !== 'ok' || G.state().proj || !G.projInfo().opts.every(x => x.why !== 'done')) fail('프로젝트가 없는 저장에서 이미 산 것으로 보임(소급 적용)'); }
  console.log(`성장 표시·시즌 프로젝트: 월간 보고 ${reps}개의 OVR 변화와 이유(${Object.entries(whys).map(x => x.join(' ')).join(', ')}) 대조 · 집중 캠프는 ${top.join('·')} 한계 +${P.camp.cap}·컨디션 ${P.camp.cond}, 팬 캠페인은 인기 식대로·컨디션 ${P.fan.cond} · 한 시즌 한 번(다시 열어도) · 난수 안 씀 · 자동으로 사지 않음 · 이상한 값 6종 버림`);
}
console.log('통과');
