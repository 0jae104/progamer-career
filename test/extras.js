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
console.log('통과');
