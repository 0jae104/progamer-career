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
//   8) 팬 반응: 분기별 단위 검사, 사실과 어긋나는 문장 0건, 출전 10경기 안 같은 문장 0건, 경기 없는 달에는 반응 없음
//      (같은 문장 판정: 아이디·구단 이름·숫자·문장부호·공백을 지운 뒤 글자가 같으면 같은 문장으로 본다)
//   9) 처음 안내와 우승 연출: 표시 상태만 바뀌고 난수·결과는 그대로인지, 예전 저장에는 안내가 없는지, 우승 화면 수와 우승 기록 수가 같은지
//  10) 기록 보관(파일 끝): 명예의 전당 이관·중복 방지·삭제·용량, 도전 과제 판정, 커리어 카드 내용, 백업 내보내기·가져오기·거부·되돌리기, 저장 실패
//   7) 라이벌: 고유 ID 유지, 능력치·구단·관계 범위, 실제 경기 결과와 맞대결 전적 일치, 불러오기 반복 시 전적 불변, 손상된 라이벌 데이터 복구
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
  const seen = new Set();
  for (const r of s.rivals) {
    if (typeof r.id !== 'string' || seen.has(r.id)) fail(`${tag} 라이벌 ID 중복 또는 이상 ${r.id}`); seen.add(r.id);
    if (!(r.ovr >= 20 && r.ovr <= 99) || !(r.pot >= 20 && r.pot <= 99)) fail(`${tag} 라이벌 능력치 ${r.nick} ${r.ovr}/${r.pot}`);
    if (!G.D.ORG[r.org]) fail(`${tag} 라이벌이 없는 구단을 가리킴 ${r.org}`);
    if (!['trainee', 'second', 'first'].includes(r.squad)) fail(`${tag} 라이벌 스쿼드 ${r.squad}`);
    if (!(r.rv >= 0 && r.rv <= 100 && r.rs >= 0 && r.rs <= 100)) fail(`${tag} 라이벌 관계 범위 ${r.rv}/${r.rs}`);
    if (!Number.isInteger(r.w) || !Number.isInteger(r.l) || r.w < 0 || r.l < 0) fail(`${tag} 라이벌 전적 ${r.w}/${r.l}`);
    if (new Set(r.mids).size !== r.mids.length) fail(`${tag} 같은 경기가 전적에 두 번 기록됨`);
    if (!(r.age >= 15 && r.age <= 40) || !r.nick) fail(`${tag} 라이벌 나이·이름 이상`);
  }
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
  const g0 = G.state().yr.g, money = G.state().money, snap2 = store[KEY], h0 = JSON.stringify(G.state().rivals.map(v => [v.id, v.w, v.l]));
  for (let k = 0; k < 2; k++) if (G.load() !== 'ok') fail(`${tag} 결과 화면 저장 불러오기 실패`);
  const c = G.state().sim.tour.cur;
  if (store[KEY] !== snap2 || c.x !== r.x || c.y !== r.y || G.state().yr.g !== g0 || G.state().money !== money) fail(`${tag} 반복 불러오기로 결과가 달라짐`);
  if (JSON.stringify(G.state().rivals.map(v => [v.id, v.w, v.l])) !== h0) fail(`${tag} 반복 불러오기로 라이벌 전적이 달라짐`);
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
  if (sc.ev.startsWith('rv_')) { car.rvEv++; if (!sc.rid) fail(`#${car.i} 라이벌 이벤트에 상대가 없음`); }
  if (car.turn <= 20 && car.fresh) { F.events++; if (sc.ev.startsWith('rv_')) F.rv = (F.rv || 0) + 1; car.f20.add(sc.ev); F.idx[b]++; if (ch.p == null) F.sure++; else { F.chk++; F.pSum += ch.p; } }
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
const FX = { n: 0, withRival: 0 };
const SV = { n: 0 };    // 규격 검사를 한 장면 수
const LGC = { n: 0 };   // 은퇴 기록 검사 수
const CE = { n: 0, tut: 0 };   // 우승 화면 수, 처음 안내 검사 수
/* ---- 팬 반응 검사 ---- */
const FN = { months: 0, lines: 0, byCount: [0, 0, 0, 0], keys: {}, voices: {}, none: 0, benchMonths: 0, repeatChecked: 0, minGap: 1e9 };
const NAMES = G.D.ORGS.map(o => o.name).concat(G.D.REGIONS.map(r => r.name + ' 대표팀')).sort((a, b) => b.length - a.length);
function fanNorm(t, nick, rivals) {
  for (const n of [nick].concat(rivals, NAMES)) t = t.split(n).join('');
  return t.replace(/[0-9.,!?:"'()\-\s]/g, '');
}
function lastOf(a, f) { return a.filter(f).pop(); }
// 한 달치 보고서의 팬 반응이 그 달 경기 기록과 맞는지 검사한다. streak: 테스트가 따로 센 연승·연패(모르면 null)
function checkFans(tag, rep, nick, rivalNicks, streak, first1) {
  const ms = rep.matches, played = ms.filter(m => m.plays), fans = rep.fans || [];
  if (!ms.length) { if (fans.length) fail(`${tag} 경기가 없는 달에 팬 반응이 나옴`); return; }
  if (fans.length > 3) fail(`${tag} 팬 반응이 3줄을 넘음`);
  if (new Set(fans.map(x => x.id)).size !== fans.length) fail(`${tag} 한 달 안에 같은 문장`);
  const w = played.filter(m => m.win).length, l = played.length - w, avg = played.length ? played.reduce((a, m) => a + m.r, 0) / played.length : 0;
  const fin = lastOf(played, m => m.label === '결승'), po = lastOf(played, m => m.label && m.label !== '결승'), rvm = lastOf(played, m => m.rv && m.rv.length), cm = lastOf(played, m => m.moms && m.moms.length);
  const truth = {
    bench: () => !played.length,
    final_w: () => fin && fin.win, final_l: () => fin && !fin.win, po_w: () => po && po.win, po_l: () => po && !po.win,
    rv_w: () => rvm && rvm.win, rv_l: () => rvm && !rvm.win,
    mvp: () => played.some(m => m.mvp), clutch_ok: () => cm && cm.moms[cm.moms.length - 1].ok, clutch_no: () => cm && !cm.moms[cm.moms.length - 1].ok,
    streak_w: () => streak == null || streak >= 3, streak_l: () => streak == null || streak <= -3,
    carry_l: () => played.some(m => !m.win && m.r >= 7.5), pass_w: () => played.some(m => m.win && m.r <= 5.4),
    form_hi: () => avg >= 7.5, form_lo: () => avg <= 5.3,
    month_good: () => played.length && w > l, month_bad: () => played.length && w < l, month_even: () => played.length && w === l,
    debut: () => first1,
  };
  for (const x of fans) {
    const t = x.t;
    if (!truth[x.k] || !truth[x.k]()) fail(`${tag} 사실과 어긋난 팬 반응 [${x.k}] ${t}`);
    if (/[{}]|undefined|NaN|null/.test(t)) fail(`${tag} 덜 채워진 팬 반응 ${t}`);
    if (/MVP/.test(t) && x.k !== 'mvp') fail(`${tag} MVP 가 아닌데 MVP 언급: ${t}`);
    if (/라이벌/.test(t) && !x.k.startsWith('rv_')) fail(`${tag} 라이벌전이 아닌데 라이벌 언급: ${t}`);
    for (const n of rivalNicks) if (n !== nick && t.includes(n) && !(x.k.startsWith('rv_') && rvm.rv[0].nick === n)) fail(`${tag} 맞붙지 않은 라이벌 이름: ${t}`);
    if (x.k.startsWith('rv_') && !t.includes(rvm.rv[0].nick) && /\{rival\}/.test(G.D.FAN[x.k][+x.id.split('#')[1]].t)) fail(`${tag} 라이벌 이름이 다름: ${t}`);
    if (/연승/.test(t) && x.k !== 'streak_w') fail(`${tag} 연승이 아닌데 연승 언급: ${t}`);
    if (/연패/.test(t) && x.k !== 'streak_l') fail(`${tag} 연패가 아닌데 연패 언급: ${t}`);
    if (streak != null && /연(승|패)/.test(t) && !t.includes(String(Math.abs(streak)))) fail(`${tag} 연승·연패 숫자가 다름(${streak}): ${t}`);
    if (/승부처/.test(t) && !x.k.startsWith('clutch_')) fail(`${tag} 승부처가 없는데 승부처 언급: ${t}`);
    if (/데뷔/.test(t) && x.k !== 'debut') fail(`${tag} 데뷔전이 아닌데 데뷔 언급: ${t}`);
    if (/결승/.test(t.replace(/준결승/g, '')) && !fin) fail(`${tag} 결승이 아닌데 결승 언급: ${t}`);
    if (x.k === 'mvp' && /전/.test(t) && !played.some(m => m.mvp && t.includes(m.opp)) && /\{opp\}/.test(G.D.FAN.mvp[+x.id.split('#')[1]].t)) fail(`${tag} MVP 경기의 상대가 다름: ${t}`);
    FN.lines++; FN.keys[x.k] = (FN.keys[x.k] || 0) + 1; FN.voices[x.v] = (FN.voices[x.v] || 0) + 1;
  }
  FN.months++; FN.byCount[fans.length]++;
  if (!played.length) FN.benchMonths++; else if (!fans.length) FN.none++;
}
   // 라이벌이 없던 예전 저장에서 이어 간 커리어
// 라이벌 집계
const RV = { n: 0, second: 0, first: 0, moved: 0, retired: 0, full: 0, noDebut: 0, games: 0, met: 0, metCareers: 0, finals: 0, finalCareers: 0, h2hChecked: 0, h2hLines: 0, rvSum: 0, rsSum: 0, labels: {}, ev: 0, evCareers: 0, evMax: 0, late: 0, age: [], peak: [], titles: 0, sameOrgEnd: 0 };

function runCareer(i, tag, onEnd) {
  const car = { i, turn: 0, evTurns: [], f20: new Set(), seen: new Set(), counted20: false, ids: {}, exp: {}, rvEv: 0, finals: 0, fresh: !!onEnd, streak: 0, fg: 0, fanAt: {}, cele: 0 };
  let guard = 0, lastYear = 0;
  while (!G.state().over) {
    const sc = G.scene();
    if (sc && sc !== car.lastSc) { car.lastSc = sc; SV.n++; if (!G.validScene(sc)) fail(`${tag} 장면이 규격에 맞지 않음: ${JSON.stringify(sc).slice(0, 300)}`); for (const q of G.state().q) if (!G.validScene(q)) fail(`${tag} 대기 중인 장면이 규격에 맞지 않음: ${JSON.stringify(q).slice(0, 300)}`); }
    if (sc && sc.type === 'info' && sc.cele) {
      // 우승 화면: 연출 표시를 바꾸고 여러 번 다시 불러와도 우승 기록·자금이 그대로여야 한다.
      const t0 = G.state().car.titles.length, m0 = G.state().money;
      if (sc.cele !== 1) fail(`${tag} 처음 보는 우승 화면인데 이미 재생한 것으로 표시됨`);
      G.celePlayed(); G.celePlayed();
      for (let k = 0; k < 2; k++) if (G.load() !== 'ok') fail(`${tag} 우승 화면에서 불러오기 실패`);
      const s2 = G.state(), sc2 = G.scene();
      if (sc2.cele !== 2 || sc2.title !== sc.title || sc2.text !== sc.text || s2.car.titles.length !== t0 || s2.money !== m0) fail(`${tag} 우승 화면을 다시 불러오자 내용이나 기록이 달라짐`);
      car.cele++; CE.n++;
    }
    if (!sc) { car.turn++; G.autoStep(); }
    else if (sc.type === 'moment') playMoment(`${tag} ${guard}`);
    else if (sc.type === 'event') playEvent(car);
    else G.autoStep();
    if (sc && car.turn <= 20 && onEnd) F.scenes++;
    if (++guard > 20000) fail(`${tag} 끝나지 않는 커리어: ${JSON.stringify(G.scene())}`);
    invariants(`${tag} ${guard}`);
    const s = G.state(), now = G.scene();
    for (const r of s.rivals) { if (car.ids[r.id] && car.ids[r.id] !== r.nick) fail(`${tag} 라이벌 ${r.id} 의 이름이 바뀜`); car.ids[r.id] = r.nick; }
    if (Object.keys(car.ids).some(id => !s.rivals.find(r => r.id === id))) fail(`${tag} 라이벌이 사라짐`);
    if (onEnd && !car.counted20 && car.turn === 20 && !now) {
      car.counted20 = true; F.n++; F.distinct += car.f20.size; F.squad[s.squad]++; F.ovr += G.ovr();
    }
    if (now && now.type === 'month' && !car.seen.has(now.title)) {
      car.seen.add(now.title);
      {
        const pl = now.matches.filter(m => m.plays), nicks = s.rivals.map(r => r.nick), pre = car.streak;
        for (const m of pl) car.streak = m.win ? (car.streak > 0 ? car.streak + 1 : 1) : (car.streak < 0 ? car.streak - 1 : -1);
        const first1 = s.car.g > 0 && s.car.g <= pl.length;   // 1군 통산 출전이 이 달 출전 수를 넘지 않으면 이 달이 첫 출전이다
        checkFans(tag, now, s.nick, nicks, car.fresh && !s.opt.fast ? car.streak : null, first1);
        if (!s.opt.fast) {             // 반복 간격: 빠른 진행은 보고서가 생략돼 경기 수를 셀 수 없으므로 제외
          car.fg += pl.length;
          for (const x of (now.fans || [])) {
            const key = fanNorm(x.t, s.nick, nicks), prev = car.fanAt[key];
            if (prev != null) { const gap = car.fg - prev; FN.minGap = Math.min(FN.minGap, gap); if (gap < G.FAN_GAP) fail(`${tag} 같은 팬 반응이 ${gap}경기 만에 다시 나옴: ${x.t}`); }
            car.fanAt[key] = car.fg; FN.repeatChecked++;
          }
        }
      }
      for (const m of now.matches) {
        for (const v of (m.rv || [])) {
          // 보고서에 라이벌전으로 찍힌 경기: 내가 출전했고, 상대 구단이 그 라이벌의 소속이며, 같은 구단이 아니어야 한다.
          const r = s.rivals.find(x => x.id === v.id);
          if (!r || !m.plays || G.D.ORG[r.org].name !== m.opp || r.org === s.org) fail(`${tag} 맞대결이 아닌 경기가 라이벌전으로 기록됨`);
          const e = car.exp[v.id] = car.exp[v.id] || { w: 0, l: 0 }; if (m.win) e.w++; else e.l++;
          RV.h2hLines++; if (m.label === '결승') car.finals++;
        }
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
  const st = G.state();
  if ((r.rivals || []).length !== st.rivals.length) fail(`${tag} 은퇴 화면의 라이벌 수가 다름`);
  {
    // 은퇴 기록: 은퇴하는 순간 보관소에 한 건, 은퇴 화면과 같은 값으로 들어가 있어야 한다. 다시 불러와도 늘지 않는다.
    const rid = r.rid, n0 = G.hall().length, runs0 = G.achInfo().runs, rec = G.hallGet(rid);
    if (!rid || rid !== st.cid || !rec) fail(`${tag} 은퇴 기록이 보관소에 없음`);
    if (rec.nick !== r.nick || rec.score !== r.score || rec.grade !== r.grade || rec.g !== r.g || rec.titles.length !== r.titles.length || rec.awards.length !== r.awards.length || rec.big !== r.titles.filter(t => t.tier !== 'second').length) fail(`${tag} 보관소의 기록이 은퇴 화면과 다름`);
    if (G.load() !== 'ok' || G.hall().length !== n0 || G.achInfo().runs !== runs0 || G.hall().filter(x => x.id === rid).length !== 1) fail(`${tag} 은퇴 화면을 다시 불러오자 기록이 늘어남`);
    LGC.n++;
  }
  if (onEnd && car.cele !== st.car.titles.length) fail(`${tag} 우승 화면 ${car.cele}번, 우승 기록 ${st.car.titles.length}개로 서로 다름`);
  if (!onEnd && /^stage[123]-/.test(String(tag))) { FX.n++; if (st.rivals.length) FX.withRival++; if (st.rivals.some(v => v.origin === 'trainee' || v.hist.some(h => /연습생 동기/.test(h.t)))) fail(`${tag} 예전 저장에 연습생 시절 라이벌 기록이 지어내짐`); }
  if (onEnd) {
    // 실제 경기 결과로 따로 센 전적과 저장된 전적이 같아야 한다(빠른 진행은 보고서가 생략돼 제외).
    if (!st.opt.fast) { for (const v of st.rivals) { const e = car.exp[v.id] || { w: 0, l: 0 }; if (e.w !== v.w || e.l !== v.l) fail(`${tag} 라이벌 전적 불일치 ${v.nick}: 경기 기록 ${e.w}승 ${e.l}패, 저장 ${v.w}승 ${v.l}패`); } RV.h2hChecked++; }
    let met = 0;
    for (const v of st.rivals) {
      RV.n++; const hs = v.hist.map(h => h.t).join('|');
      const sec = v.squad !== 'trainee' || /2군에 콜업/.test(hs), fst = !!v.debut;
      if (sec) RV.second++; if (fst) RV.first++; else RV.noDebut++; if (v.moves) RV.moved++; if (v.retired) RV.retired++;
      if (sec && fst && v.moves && v.retired) RV.full++;
      if (v.origin !== 'trainee') RV.late++;
      RV.games += v.w + v.l; if (v.w + v.l) met++; RV.rvSum += v.rv; RV.rsSum += v.rs; RV.titles += v.titles; RV.peak.push(v.peak); if (v.retired) RV.age.push(v.retired.age);
      const lab = r.rivals.find(x => x.id === v.id).label; RV.labels[lab] = (RV.labels[lab] || 0) + 1;
    }
    RV.met += met; if (met) RV.metCareers++; RV.finals += car.finals; if (car.finals) RV.finalCareers++;
    RV.ev += car.rvEv; if (car.rvEv) RV.evCareers++; RV.evMax = Math.max(RV.evMax, car.rvEv);
    onEnd(r, st.car);
  }
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
    if (!G.state().tut.done || G.tutTip('goal') || G.tutTip('plan') || G.tutTip('report')) fail(`예전 저장 ${f} 에 처음 안내가 나옴`);
    runCareer(-1, f); fixtures++;
  }
}
// 새 필드가 없는 저장
G.newGame({ nick: 'Old', region: 'kr', role: 'core', trait: 'brain' });
for (let i = 0; i < 60; i++) G.autoStep();
const old = JSON.parse(store[KEY]); for (const k of ['inj', 'moves', 'debut', 'tryouts']) delete old.car[k]; for (const k of ['opt', 'used', 'flags', 'sim', 'recentMom', 'stat', 'grow', 'rivals', 'rivalSeq', 'evn', 'fan', 'tut']) delete old[k];
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

/* ---- 라이벌 데이터가 없거나 손상된 저장 ---- */
function midCareer(n) { G.newGame({ nick: 'Rv', region: 'kr', role: 'core', trait: 'genius' }); for (let i = 0; i < n; i++) { if (G.state().over) return midCareer(n); G.autoStep(); } while (G.scene() && !G.state().over) G.autoStep(); }
const damage = [
  d => { delete d.rivals; delete d.rivalSeq; },
  d => { d.rivals = 'broken'; },
  d => { d.rivals = [null, 7, { id: 'r1' }, { id: 'r1', nick: 'Dup' }, { id: 'r9', nick: 'Odd', org: 'nowhere', ovr: NaN, squad: 'x', rv: 999, w: -3, hist: 'no', f: null, retired: 'yes' }]; },
  d => { for (const r of d.rivals) { delete r.mids; delete r.hist; delete r.f; r.pot = 5; r.age = null; } },
];
let damaged = 0;
for (const fn of damage) for (let k = 0; k < 5; k++) {
  midCareer(120 + k * 60); if (G.state().over) continue;
  const d = JSON.parse(store[KEY]); fn(d); store[KEY] = JSON.stringify(d); delete store[BAK];
  if (G.load() !== 'ok') fail('라이벌 데이터가 손상된 저장을 열지 못함');
  invariants('손상된 라이벌'); runCareer(-1, '손상된 라이벌'); damaged++;
}
/* ---- 맞대결 기록 규칙: 상대 구단에 있을 때만, 내가 출전한 경기만, 같은 구단이면 기록하지 않는다 ---- */
let unit = 0;
for (let k = 0; k < 40 && unit < 12; k++) {
  midCareer(150 + k * 13); const s = G.state();
  const mi = G.month();
  if (s.over || G.scene() || !s.lg || mi.type !== 'league' || mi.playoff || s.injury || s.rivals.length < 2) continue;
  const opps = []; for (let r = mi.rounds[0]; r < mi.rounds[1]; r++) for (const [a, b] of s.lg.rounds[r]) { if (a === s.org) opps.push(b); if (b === s.org) opps.push(a); }
  const [ra, rb] = s.rivals; const target = opps[0];
  Object.assign(ra, { org: target, squad: s.lg.tier, out: 0, retired: null }); Object.assign(rb, { org: s.org, squad: s.lg.tier, out: 0, retired: null });
  const a0 = ra.w + ra.l, b0 = rb.w + rb.l; s.opt.fast = false; s.cond = 80;
  G.save(); G.next(); while (G.scene() && G.scene().type !== 'month') { const t = G.scene().type; if (t === 'event') G.resolve(G.scene().choices.findIndex(c => !c.disabled)); else G.autoStep(); }
  const rep = G.scene(); if (!rep) continue;
  const name = G.D.ORG[target].name, vs = rep.matches.filter(m => m.opp === name && !m.label), played = vs.filter(m => m.plays).length;
  const s2 = G.state(), A2 = s2.rivals.find(r => r.id === ra.id), B2 = s2.rivals.find(r => r.id === rb.id);
  if (A2.w + A2.l - a0 !== played) fail(`맞대결 기록 수 불일치: 그 구단과 내가 뛴 경기 ${played}, 전적 증가 ${A2.w + A2.l - a0}`);
  if (vs.some(m => m.plays !== !!(m.rv && m.rv.some(v => v.id === ra.id)))) fail('출전하지 않은 경기가 기록되거나 출전한 경기가 빠짐');
  if (rep.matches.some(m => m.opp !== name && (m.rv || []).some(v => v.id === ra.id))) fail('다른 구단과의 경기가 라이벌전으로 기록됨');
  if (B2.w + B2.l !== b0) fail('같은 구단 라이벌에게 맞대결 전적이 기록됨');
  for (let j = 0; j < 3; j++) { if (G.load() !== 'ok') fail('불러오기 실패'); const A3 = G.state().rivals.find(r => r.id === ra.id); if (A3.w !== A2.w || A3.l !== A2.l) fail('결과 화면을 다시 불러오자 전적이 달라짐'); }
  unit++;
}
if (unit < 6) fail(`맞대결 기록 규칙 검사를 충분히 하지 못함(${unit}회)`);

/* ---- 팬 반응 분기별 단위 검사(만든 경기 기록을 넣고 결과를 확인한다) ---- */
let fanUnit = 0;
{
  const M = o => Object.assign({ opp: '미리내 게이밍', win: true, plays: true, r: 6.5, k: 3, d: 2, a: 5 }, o);
  const C = o => Object.assign({ nick: 'Tester', tier: 1, key: 'unit', debut: false, fan: { g: 0, st: 0, seen: [] } }, o);
  const run = (ms, o) => G.fanReact(ms, C(o)), keys = r => r.lines.map(x => x.k), all = r => r.lines.map(x => x.t).join(' ');
  const ok = (c, msg) => { fanUnit++; if (!c) fail('팬 반응 단위 검사: ' + msg); };
  let r = run([]); ok(r.lines.length === 0 && r.fan.g === 0, '경기 없는 달에 반응이 나옴');
  r = run([M({ plays: false }), M({ plays: false, win: false })]); ok(r.lines.length >= 1 && r.lines.length <= 2 && keys(r).every(k => k === 'bench') && r.fan.g === 0 && r.fan.st === 0, '벤치 달');
  r = run([M({}), M({}), M({}), M({ win: false })]); ok(r.lines.length >= 2 && keys(r).every(k => k === 'month_good' || k === 'streak_w') && !/MVP|라이벌|연패|승부처|결승|데뷔/.test(all(r)), '이긴 달');
  r = run([M({ win: false }), M({ win: false }), M({ win: false }), M({ win: false }), M({})]); ok(r.lines.length >= 2 && keys(r).every(k => k === 'month_bad') && !/MVP|라이벌|연승|연패|승부처|결승/.test(all(r)), '진 달');
  r = run([M({ win: false }), M({})]); ok(keys(r).every(k => k === 'month_even'), '반반인 달');
  r = run([M({ mvp: true, r: 8.6, opp: '청룡 유니온' }), M({ win: false })]); ok(keys(r).includes('mvp') && /MVP/.test(all(r)), 'MVP');
  r = run([M({ r: 8.6 }), M({ win: false })]); ok(!/MVP/.test(all(r)), 'MVP 가 아닌데 MVP');
  r = run([M({ rv: [{ id: 'r1', nick: 'Zulo', r: 6.1, w: 3, l: 2 }] }), M({ win: false })]); ok(keys(r).includes('rv_w') && !keys(r).includes('rv_l') && /Zulo/.test(all(r)), '라이벌전 승리');
  r = run([M({ win: false, r: 5.9, rv: [{ id: 'r1', nick: 'Zulo', r: 7.2, w: 1, l: 4 }] }), M({})]); ok(keys(r).includes('rv_l') && !keys(r).includes('rv_w') && /Zulo/.test(all(r)), '라이벌전 패배');
  r = run([M({ rv: [{ id: 'r1', nick: 'Zulo', r: 6.1 }] })]); ok(!/undefined/.test(all(r)) && keys(r).includes('rv_w'), '통산 전적 값이 없을 때');
  r = run([M({}), M({ win: false })]); ok(!/라이벌/.test(all(r)), '라이벌이 없는데 라이벌 언급');
  r = run([M({ label: '준결승', score: '2-1', moms: [{ title: 't', label: 'l', ok: true }] })]); ok(keys(r).includes('clutch_ok') && !keys(r).includes('clutch_no') && keys(r).includes('po_w'), '승부처 성공');
  r = run([M({ win: false, label: '준결승', score: '1-2', moms: [{ title: 't', label: 'l', ok: false }] })]); ok(keys(r).includes('clutch_no') && keys(r).includes('po_l') && !/통과/.test(all(r)), '승부처 실패');
  r = run([M({})], { fan: { g: 7, st: 2, seen: [] } }); ok(keys(r).includes('streak_w') && /3연승/.test(all(r)) && r.fan.st === 3 && r.fan.g === 8, '3연승');
  r = run([M({ win: false })], { fan: { g: 7, st: -2, seen: [] } }); ok(keys(r).includes('streak_l') && /3연패/.test(all(r)) && r.fan.st === -3, '3연패');
  r = run([M({ win: false })], { fan: { g: 7, st: 5, seen: [] } }); ok(!/연승|연패/.test(all(r)) && r.fan.st === -1, '연승이 끊긴 달');
  r = run([M({ win: false, r: 8.1 }), M({ win: false, r: 6 })]); ok(keys(r).includes('carry_l') && !keys(r).includes('pass_w'), '높은 평점의 패배');
  r = run([M({ r: 4.9 }), M({ r: 6 })]); ok(keys(r).includes('pass_w') && !keys(r).includes('carry_l'), '낮은 평점의 승리');
  r = run([M({ label: '결승', score: '3-1', r: 7.4 })]); ok(keys(r).includes('final_w') && !keys(r).includes('final_l'), '결승 승리');
  r = run([M({ win: false, label: '결승', score: '2-3', r: 6.1 })]); ok(keys(r).includes('final_l') && !keys(r).includes('final_w'), '결승 패배');
  r = run([M({ r: 6.4 })], { debut: true }); ok(keys(r).includes('debut') && /데뷔/.test(all(r)), '데뷔전');
  r = run([M({})]); ok(!/데뷔/.test(all(r)), '데뷔전이 아닌데 데뷔');
  const a1 = run([M({ mvp: true, r: 8 }), M({ win: false })], { key: 'same' }), a2 = run([M({ mvp: true, r: 8 }), M({ win: false })], { key: 'same' });
  ok(JSON.stringify(a1) === JSON.stringify(a2), '같은 기록인데 다른 문장');
  r = run([M({})], { nick: '하늘<b>' }); ok(all(r).includes('하늘<b>') || !/\{nick\}/.test(all(r)), '한글·기호 아이디');
  // 2군 경기에는 1군 전용 문장이, 1군 경기에는 2군 전용 문장이 나오지 않는다. 같은 문장은 10경기 안에 다시 나오지 않는다.
  for (const tier of [1, 2]) {
    let fan = { g: 0, st: 0, seen: [] }; const at = {};
    for (let i = 0; i < 400; i++) {
      const ms = [M({ win: i % 3 !== 0, r: 5 + (i * 7 % 40) / 10, mvp: i % 5 === 0 && i % 3 !== 0 }), M({ win: i % 2 === 0, r: 4.5 + (i * 3 % 45) / 10 })].slice(0, 1 + (i % 2));
      const res = G.fanReact(ms, C({ tier, key: 'k' + i, fan })); fan = res.fan;
      for (const x of res.lines) {
        const tp = G.D.FAN[x.k][+x.id.split('#')[1]];
        ok(!tp.tier || tp.tier === tier, `${tier}군 경기에 다른 리그 전용 문장`);
        ok(at[x.id] == null || fan.g - at[x.id] >= G.FAN_GAP, `같은 문장이 ${fan.g - at[x.id]}경기 만에 반복`); at[x.id] = fan.g;
        if (/[{}]|undefined|NaN/.test(x.t)) fail('덜 채워진 문장 ' + x.t);
      }
      ok(res.lines.length <= 3 && fan.seen.length <= 40, '줄 수 또는 저장 크기');
    }
  }
}
/* ---- 팬 반응 상태가 없거나 깨진 저장 ---- */
for (const fn of [d => { delete d.fan; }, d => { d.fan = 'x'; }, d => { d.fan = { g: 'a', st: null, seen: 5 }; }, d => { d.fan.seen = [1, ['ok', 2], [3, 4], null]; }]) {
  midCareer(140); if (G.state().over) continue;
  const d = JSON.parse(store[KEY]); fn(d); store[KEY] = JSON.stringify(d); delete store[BAK];
  if (G.load() !== 'ok') fail('팬 반응 상태가 깨진 저장을 열지 못함');
  runCareer(-1, '깨진 팬 반응 상태');
}

/* ---- 처음 안내의 표시 상태 ---- */
{
  const TUT = 'pg_tut_v1', t = (c, msg) => { CE.tut++; if (!c) fail('처음 안내: ' + msg); };
  const fresh = () => { delete store[TUT]; G.newGame({ nick: 'Tut', region: 'kr', role: 'core', trait: 'brain' }); };
  fresh(); t(G.state().tut.done === false && !G.tutTip('goal'), '구단을 고르기 전에는 안내가 없어야 함');
  G.resolve(1);
  t(G.tutTip('goal').step === 1 && G.tutTip('goal').of === 3 && !G.tutTip('plan') && G.tutTip('report').step === 3, '첫 화면: 목표 안내 1/3, 계획 안내는 그다음');
  G.tutNext('goal'); t(!G.tutTip('goal') && G.tutTip('plan').step === 2, '다음을 누르면 계획 안내 2/3');
  const snap = JSON.stringify(G.state().tut); t(G.load() === 'ok' && JSON.stringify(G.state().tut) === snap && G.tutTip('plan'), '저장·불러오기 뒤 안내 단계 유지');
  G.tutNext('plan'); t(!G.tutTip('plan') && G.tutTip('report') && !G.state().tut.done, '홈 안내를 다 봐도 보고 안내는 남음');
  G.tutNext('report'); t(G.state().tut.done && store[TUT] === '1' && !G.tutTip('report'), '세 가지를 다 보면 끝');
  G.newGame({ nick: 'Tut2', region: 'kr', role: 'core', trait: 'brain' }); G.resolve(0); t(G.state().tut.done && !G.tutTip('goal'), '같은 기기의 다음 커리어에는 안내 없음');
  G.tutReplay(); t(G.tutTip('goal') && !G.state().tut.done, '다시 보기');
  G.tutSkip(); t(G.state().tut.done && !G.tutTip('goal') && G.load() === 'ok' && G.state().tut.done, '건너뛰기와 그 뒤 불러오기');
  fresh(); G.resolve(2); while (G.state().stat.turns < 3 || G.scene()) G.autoStep();
  t(!G.state().tut.done && G.tutTip('goal'), '3개월까지는 안내가 남아 있음');
  G.autoStep(); t(G.state().stat.turns === 4 && G.state().tut.done && !G.tutTip('goal') && !G.tutTip('report'), '4번째 달부터는 안내 없음');
  // 안내·연출 표시는 난수를 쓰지 않는다: 같은 시드에서 다음 난수가 같아야 한다.
  fresh(); G.resolve(1); G.seed(4242); const a = G.rand(); G.seed(4242);
  G.tutTip('goal'); G.tutNext('goal'); G.tutTip('plan'); G.tutSkip(); G.tutReplay(); G.celePlayed(); G.tutNext('plan'); G.tutNext('report');
  t(G.rand() === a, '안내·연출 표시가 난수를 소비함');
  if (seedArg != null) G.seed(+seedArg + 99991); else G.seed(null);
  delete store[TUT];
}

/* ---- 버전 표기 일치 ---- */
const root = path.join(__dirname, '..'), html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
if (G.VERSION) {
  const vs = [...html.matchAll(/\?v=([\w.]+)/g)].map(m => m[1]), swv = (sw.match(/VERSION = '([\w.]+)'/) || [])[1];
  // 스크립트마다 적어 둔 파일 버전과 index.html 의 확인 스크립트도 같은 값이어야 한다
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8'), pick1 = (txt, re) => (txt.match(re) || [])[1];
  const marks = { 'js/data.js': pick1(rd('js/data.js'), /\.data = '([\w.]+)'/), 'js/card.js': pick1(rd('js/card.js'), /\.card = '([\w.]+)'/), 'js/ui.js': pick1(rd('js/ui.js'), /UI_VERSION = '([\w.]+)'/), 'index.html 확인 스크립트': pick1(html, /want = '([\w.]+)'/) };
  for (const f in marks) if (marks[f] !== G.VERSION) fail(`버전 표기가 서로 다름: 엔진 ${G.VERSION}, ${f} ${marks[f]}`);
  for (const f of ['css/style.css', 'js/data.js', 'js/engine.js', 'js/card.js', 'js/ui.js']) if (!html.includes(f + '?v=' + G.VERSION)) fail(`index.html 이 ${f} 를 이 버전으로 부르지 않음`);
  for (const f of ['index.html', 'css/style.css', 'js/data.js', 'js/engine.js', 'js/card.js', 'js/ui.js', 'manifest.webmanifest', 'icon.svg']) if (!sw.includes("'" + f + "'") && !sw.includes("'" + f + "' + Q")) fail(`sw.js 의 사전 보관 목록에 ${f} 가 없음`);
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
console.log('— 라이벌 —');
const rp = v => (v / RV.n * 100).toFixed(1) + '%';
console.log(`라이벌 ${RV.n}명(커리어당 ${f(RV.n / N, 2)}) | 2군 도달 ${rp(RV.second)} · 1군 데뷔 ${rp(RV.first)} · 이적 경험 ${rp(RV.moved)} · 내 은퇴 전에 은퇴 ${rp(RV.retired)} · 연습생→2군→1군→이적→은퇴를 모두 거침 ${rp(RV.full)} | 나중에 생긴 맞수 ${RV.late}명`);
console.log(`라이벌 최고 OVR 평균 ${f(avg(RV.peak))} · 은퇴 나이 평균 ${f(avg(RV.age))}세 · 우승(1인당) ${f(RV.titles / RV.n, 2)}`);
console.log(`공식전에서 라이벌을 만난 커리어 ${pc(RV.metCareers)} | 맞대결(커리어당) ${f(RV.games / N, 1)}경기 | 결승에서 만난 커리어 ${pc(RV.finalCareers)} (결승 맞대결 ${RV.finals}회)`);
console.log(`라이벌이 없던 예전 저장 ${FX.n}회 가운데 ${FX.withRival}회에서 리그의 맞수가 새로 생김(연습생 시절 기록은 만들지 않음)`);
console.log(`전적 대조: 보고서의 라이벌전 ${RV.h2hLines}경기를 따로 세어 저장된 전적과 비교, ${RV.h2hChecked}개 커리어 모두 일치 | 규칙 단위 검사 ${unit}회 | 손상된 라이벌 데이터 ${damaged}회 복구 후 완주`);
console.log(`라이벌 이벤트 커리어당 ${f(RV.ev / N, 2)}회(최대 ${RV.evMax}) · 전체 이벤트의 ${f(RV.ev / EV.n * 100)}% · 한 번이라도 본 커리어 ${pc(RV.evCareers)} | 관계 평균 경쟁심 ${f(RV.rvSum / RV.n)} · 존중 ${f(RV.rsSum / RV.n)} | 은퇴 시 관계 ${Object.keys(RV.labels).map(k => `${k} ${rp(RV.labels[k])}`).join(' · ')}`);
console.log('— 팬 반응 —');
console.log(`경기가 있던 달 ${FN.months}개 | 줄 수 분포 0줄:${FN.byCount[0]} 1줄:${FN.byCount[1]} 2줄:${FN.byCount[2]} 3줄:${FN.byCount[3]} | 출전했는데 반응이 없던 달 ${FN.none} | 벤치만 지킨 달 ${FN.benchMonths}`);
console.log(`문장 ${FN.lines}줄 모두 그 달 기록과 대조해 사실 불일치 0건 | 반복 간격 검사 ${FN.repeatChecked}줄, 같은 문장이 다시 나온 가장 짧은 간격 ${FN.minGap === 1e9 ? '-' : FN.minGap + '경기'}(기준 ${G.FAN_GAP}경기 이상) | 분기별 단위 검사 ${fanUnit}개`);
console.log('말투: ' + Object.keys(FN.voices).map(k => `${G.D.FAN_VOICE[k]} ${f(FN.voices[k] / FN.lines * 100, 0)}%`).join(' · ') + ' | 분류: ' + Object.keys(FN.keys).sort((a, b) => FN.keys[b] - FN.keys[a]).map(k => `${k} ${f(FN.keys[k] / FN.lines * 100)}%`).join(' '));
console.log('— 처음 안내·우승 연출 —');
console.log(`처음 안내 상태 검사 ${CE.tut}개 통과(단계 이동, 저장·재개, 건너뛰기, 다음 커리어, 3개월 뒤 종료, 난수 미사용) | 예전 저장 ${fxNames.length}종 모두 안내 없음 | 우승 화면 ${CE.n}회: 반복 불러오기에서 내용·우승 기록·자금 불변, 새 커리어마다 우승 화면 수 = 우승 기록 수`);
console.log('— 첫 20번 진행 —');
console.log(`이벤트 ${f(F.events / F.n, 2)}회 · 서로 다른 이벤트 ${f(F.distinct / F.n, 2)}종 | 장면(눌러야 하는 화면) ${f(F.scenes / F.n)}개 | 20번째 진행 뒤 소속: 연습생 ${f(F.squad.trainee / F.n * 100, 0)}% · 2군 ${f(F.squad.second / F.n * 100, 0)}% · 1군 ${f(F.squad.first / F.n * 100, 0)}% | 평균 OVR ${f(F.ovr / F.n)}`);
console.log(`첫 20번 가운데 라이벌 이벤트 ${f((F.rv || 0) / F.n, 2)}회`);
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

/* ---- 기록 보관: 명예의 전당, 도전 과제, 커리어 카드, 백업 (7단계) ----
   앞의 집계가 끝난 뒤에 돌린다. 그래야 같은 시드에서 앞부분의 출력이 이전 버전과 그대로 같다. */
{
  const CARD = require('../js/card.js');
  const HALL = 'pg_hall_v1', LEG = 'pg_legacy_v1', ACHK = 'pg_ach_v1', TUT = 'pg_tut_v1', KEYS = [KEY, BAK, HALL, LEG, ACHK, TUT];
  const R = { n: 0 }, t = (c, msg) => { R.n++; if (!c) fail('기록 보관: ' + msg); };
  const clear = () => { for (const k in store) delete store[k]; };
  const snap = () => JSON.stringify(KEYS.map(k => (k in store ? store[k] : null)));
  const finish = () => { let g = 0; while (!G.state().over) { G.autoStep(); if (++g > 20000) fail('기록 보관: 커리어가 끝나지 않음'); } return G.scene(); };
  const start = (nick, i) => G.newGame({ nick, region: REGIONS[i % 4], role: ROLES[i % 5], trait: TRAITS[i % 3] });
  if (seedArg != null) G.seed(+seedArg + 70007);

  // 1) 예전 명예의 전당 30명 → 보관소. 원본은 그대로, 없는 값은 만들지 않는다. 손상된 줄은 건너뛴다.
  clear();
  const oldHall = Array.from({ length: 30 }, (_, i) => ({ nick: 'Old' + i, role: '코어', score: 95 - i * 3, grade: 'A', ep: '리그의 간판', peak: 90 - i, titles: i % 4, years: 8 + i % 5 }));
  store[HALL] = JSON.stringify(oldHall);
  let h = G.hall();
  t(h.length === 30 && store[HALL] === JSON.stringify(oldHall), '예전 30명 이관 또는 원본 보존');
  t(new Set(h.map(r => r.id)).size === 30 && h.every(r => r.id && r.src === 'hall1' && r.at === null && !('g' in r) && !('titles' in r) && !('age' in r) && !('earn' in r)), '이관한 기록에 ID가 없거나 없는 값이 채워짐');
  t(h.every((r, i) => r.nick === oldHall[i].nick && r.score === oldHall[i].score && r.peak === oldHall[i].peak && r.big === oldHall[i].titles && r.years === oldHall[i].years), '이관한 값이 원본과 다름');
  const legOnce = store[LEG]; G.hall(); G.hall('titles'); G.hall('recent'); t(store[LEG] === legOnce && G.hall().length === 30, '다시 읽자 이관이 반복됨');
  t(G.hall('titles')[0].big === 3 && G.hall('recent').length === 30 && G.hall()[0].score === 95, '정렬');
  t(G.achInfo().n === 0 && G.achInfo().runs === 0, '상세가 없는 예전 기록으로 도전 과제가 달성됨');
  clear(); store[HALL] = JSON.stringify([null, 5, { nick: 7 }, { nick: 'Ok', score: 'x' }, oldHall[0], { nick: '<b>X</b>', role: '코어', score: 10 }]);
  h = G.hall(); t(h.length === 2 && h[1].nick === 'bX/b' && !('peak' in h[1]), '손상된 예전 항목 처리');
  clear(); store[HALL] = '{not json'; t(G.hall().length === 0, '깨진 예전 명예의 전당');
  // 보관소가 깨져 있으면 원본을 따로 두고 예전 키에서 다시 만든다
  clear(); store[HALL] = JSON.stringify(oldHall); store[LEG] = '{broken';
  t(G.hall().length === 30 && store[LEG + '_bad'] === '{broken', '깨진 보관소 복구');

  // 2) 새 은퇴가 더해져도 예전 키는 예전 방식(상위 30명)대로, 보관소에는 전부
  clear(); store[HALL] = JSON.stringify(oldHall);
  const expect = new Set(); let runs = 0; const recs = [];
  const P = {   // 도전 과제 판정을 테스트 쪽에서 따로 계산한다
    debut: s => s.car.debut > 0, win1: s => s.car.w > 0, mvp1: s => s.car.mvp > 0, g100: s => s.car.g >= 100,
    t_second: s => s.car.titles.some(x => x.tier === 'second'), t_dom: s => s.car.titles.some(x => x.tier === 'dom'), t_mid: s => s.car.titles.some(x => x.tier === 'mid'),
    t_nations: s => s.car.titles.some(x => x.tier === 'nations'), t_world: s => s.car.titles.some(x => x.tier === 'world'),
    rookie: s => s.car.awards.some(a => a.name === '신인상'), poy: s => s.car.awards.some(a => a.name === '올해의 선수'),
    rv_win: s => s.rivals.some(v => v.w > 0), rv_10: s => s.rivals.some(v => v.w >= 10),
    fin1: () => runs >= 1, fin3: () => runs >= 3, fin10: () => runs >= 10,
    no_title: (s, e) => s.car.g > 0 && !s.car.titles.some(x => x.tier !== 'second'), no_debut: s => !s.car.debut && s.car.g === 0,
    grade_a: (s, e) => ['A', 'S', 'S+'].includes(e.grade), grade_s: (s, e) => ['S', 'S+'].includes(e.grade), age30: s => s.age >= 30,
  };
  t(G.D.ACH.length === Object.keys(P).length && G.D.ACH.every(a => P[a.id]), '도전 과제 목록과 판정식의 수가 다름');
  for (let i = 0; i < 40; i++) {
    start('Leg' + i, i); const cid = G.state().cid;
    // 진행 중에도 저장·불러오기를 되풀이한다(달성이 두 번 기록되지 않아야 한다)
    for (let k = 0; k < 30 && !G.state().over; k++) G.autoStep();
    const mid = store[ACHK]; G.load(); G.load(); t((store[ACHK] || null) === (mid || null), '불러오기만으로 도전 과제 상태가 바뀜');
    const e = finish(), s = G.state(); runs++;
    for (const id in P) if (P[id](s, e)) expect.add(id);
    recs.push(G.hallGet(cid));
    t(e.rid === cid && G.hall().filter(r => r.id === cid).length === 1, '은퇴 기록 한 건');
    for (let k = 0; k < 3; k++) { G.load(); G.save(); }
    t(G.hall().length === 30 + i + 1 && G.achInfo().runs === runs, '불러오기 반복 뒤 기록 수 ' + G.hall().length + ' / 완주 ' + G.achInfo().runs);
  }
  const a1 = JSON.parse(store[ACHK]), gotIds = Object.keys(a1.got).sort();
  t(JSON.stringify(gotIds) === JSON.stringify([...expect].sort()), `도전 과제 달성 목록이 실제 기록과 다름: ${gotIds} / ${[...expect].sort()}`);
  t(a1.fresh.length === gotIds.length && new Set(a1.fresh).size === a1.fresh.length && a1.runs.n === 40 && new Set(a1.runs.ids).size === 40, '달성 알림 또는 완주 수 중복');
  t(Object.values(a1.got).every(g => g.at > 0 && g.nick && g.rid && g.y >= 1), '달성 시점 정보 누락');
  G.achSeen(); t(G.achFresh().length === 0 && Object.keys(JSON.parse(store[ACHK]).got).length === gotIds.length, '알림 확인 처리');
  const list = G.achList(); t(list.length === G.D.ACH.length && list.filter(x => x.got).length === gotIds.length && list.every(x => x.got || !x.prog || (x.prog[0] >= 0 && x.prog[0] <= x.prog[1])), '도전 과제 목록');
  const hallOld = JSON.parse(store[HALL]);
  t(hallOld.length === 30 && hallOld.every((x, i) => i === 0 || hallOld[i - 1].score >= x.score) && hallOld.every(x => !('id' in x)), '예전 키의 형식이 달라짐');
  t(G.hall().length === 70 && G.hall().filter(r => r.src === 'play').length === 40 && recs.every(r => r && r.at > 0 && r.ver === G.VERSION), '보관소 기록 수 또는 시각·버전');

  // 3) 커리어 카드: 기록에 있는 값만, 같은 기록은 같은 내용, 긴 이름은 줄임
  const measure = (str, font) => Array.from(str).reduce((w, c) => w + (c.charCodeAt(0) > 255 ? 1 : .6), 0) * +/(\d+)px/.exec(font)[1];
  let cardOps = 0;
  for (const r of G.hall()) {
    const ops = CARD.plan(r, measure), tx = ops.filter(o => o.t === 'text'), by = k => tx.filter(o => o.k === k).map(o => o.s);
    cardOps += tx.length;
    t(JSON.stringify(ops) === JSON.stringify(CARD.plan(JSON.parse(JSON.stringify(r)), measure)), '같은 기록의 카드 내용이 다름');
    t(!tx.some(o => /undefined|NaN|null|\[object/.test(o.s)), '카드에 빈 값이 글자로 찍힘');
    t(by('nick')[0] === r.nick && by('score')[0] === r.score + '점' && by('grade')[0] === (r.grade || '-'), '카드의 이름·점수·등급');
    for (const o of tx) { const w = measure(o.s, o.font), L = o.align === 'right' ? o.x - w : o.align === 'center' ? o.x - w / 2 : o.x; if (L < 20 || L + w > CARD.W - 20) fail('기록 보관: 카드 글자가 바깥으로 나감 ' + o.s); }
    if (r.src === 'play') {
      const facts = new Set(r.titles.map(x => `${x.y}년차 ${x.name}`).concat(r.awards.map(x => `${x.y}년차 ${x.name}`)));
      t(by('item').every(x => facts.has(x) || facts.has(x.replace(/…$/, '')) || [...facts].some(f => x.endsWith('…') && f.startsWith(x.slice(0, -1)))), '카드에 기록에 없는 트로피가 있음');
      const want = [String(r.g), r.g > 0 ? Math.round(r.w / r.g * 100) + '%' : null, r.g > 0 ? (Math.round(r.avg * 10) / 10).toFixed(1) : null, String(r.peak), String(r.mvp), r.big + '회'].filter(x => x != null);
      t(JSON.stringify(by('stat')) === JSON.stringify(want) && by('none').length === 6 - want.length, '카드의 수치가 기록과 다름');
      t(r.titles.length + r.awards.length ? by('item').length > 0 : by('note')[0] === '트로피 없이 커리어를 마쳤다', '트로피 표시');
    } else t(by('none').length === 6 - ('peak' in r ? 1 : 0) - ('big' in r ? 1 : 0) && by('stat').length === 6 - by('none').length && by('item').length === 0 && by('pct').length === 0 && by('orgs').length === 0 && /예전 버전 기록/.test(by('note')[0]), '요약만 있는 기록의 카드에 없는 값이 들어감');
  }
  const longRec = Object.assign({}, recs[0], { nick: '가나다라마바사아자차카타', orgs: Array.from({ length: 12 }, (_, i) => '아주 긴 이름의 구단 ' + i) });
  const lo = CARD.plan(longRec, measure).filter(o => o.t === 'text');
  t(lo.find(o => o.k === 'nick').s.length <= 12 && (lo.find(o => o.k === 'orgs') || { s: '…' }).s.endsWith('…'), '긴 이름·긴 팀 목록 줄임');
  t(CARD.fit(measure, 'W'.repeat(40), px => px + 'px x', 300, 100, 50).s.endsWith('…'), '줄임표');

  // 4) 삭제, 되돌리기, 일부러 지운 기록은 은퇴 저장을 다시 열어도 돌아오지 않음
  const lastId = G.state().cid, n0 = G.hall().length;
  t(G.hallDel(lastId) && G.hall().length === n0 - 1 && G.hallTrash().some(r => r.id === lastId) && !G.hallDel('nope'), '삭제');
  G.load(); t(G.hall().length === n0 - 1, '지운 기록이 불러오기로 되살아남');
  t(G.hallUndo(lastId) && G.hall().length === n0 && G.hallTrash().length === 0 && !G.hallUndo(lastId), '되돌리기');
  t(Object.keys(JSON.parse(store[ACHK]).got).length === gotIds.length, '기록 삭제가 도전 과제에 영향을 줌');

  // 5) 예전 버전에서 은퇴한 저장(ID·시각 없음): 예전 키의 요약 한 줄이 상세 한 건으로 바뀌고, 두 건이 되지 않는다
  { const s = JSON.parse(store[KEY]), sum = { nick: s.nick, role: s.q[0].role, score: s.q[0].score, grade: s.q[0].grade, ep: s.q[0].ep, peak: s.q[0].peak, titles: s.q[0].titles.filter(x => x.tier !== 'second').length, years: s.q[0].years };
    delete s.cid; delete s.q[0].rid; delete s.q[0].at; clear(); store[KEY] = JSON.stringify(s); store[HALL] = JSON.stringify([sum, oldHall[3]]);
    t(G.load() === 'ok' && G.hall().length === 2 && G.hall().filter(r => r.src === 'play').length === 1 && G.hallGet(G.state().cid).at === null, '예전 은퇴 저장의 기록 합치기');
    const cid = G.state().cid; G.load(); G.load(); t(G.state().cid === cid && G.hall().length === 2 && G.achInfo().runs === 1, '예전 은퇴 저장을 다시 열자 기록이 늘어남'); }

  // 6) 가득 찬 보관소(200명): 새 기록은 들어가고 나머지 가운데 점수가 가장 낮은 기록이 빠진다
  clear(); store[LEG] = JSON.stringify({ v: 1, hall1: true, recs: Array.from({ length: 200 }, (_, i) => ({ id: 'f' + i, src: 'hall1', at: null, nick: 'F' + i, role: '코어', score: 1 + (i % 90), grade: 'C', ep: '' })), trash: [], gone: [] });
  start('Full', 1); finish();
  t(G.hall().length === 200 && !!G.hallGet(G.state().cid) && !G.hallGet('f0') && !!G.hallGet('f1') && !G.hallInfo().failed, '가득 찬 보관소');

  // 7) 백업: 내보내기 → 빈 기기에서 가져오기 → 그대로인지, 이어서 은퇴까지
  clear(); store[HALL] = JSON.stringify(oldHall.slice(0, 5));
  start('Back1', 2); finish(); start('Back2', 3); for (let k = 0; k < 120; k++) G.autoStep();
  t(!G.state().over && !!store[BAK], '백업 검사 준비');
  const before = snap(), file = JSON.stringify(G.exportData()), obj = JSON.parse(file);
  t(obj.format === 'progamer-career-backup' && obj.version === 1 && obj.app === G.VERSION && !isNaN(Date.parse(obj.exportedAt)) && JSON.stringify(Object.keys(obj.payload).sort()) === JSON.stringify(['achievements', 'career', 'careerBackup', 'hall', 'legacy', 'tutorialDone']), '백업 파일 형식');
  t(snap() === before, '내보내기가 데이터를 바꿈');
  clear(); let chk = G.importCheck(file);
  t(chk.ok && chk.preview.career.nick === 'Back2' && !chk.preview.career.over && chk.preview.hall === 6 && chk.preview.ach === Object.keys(obj.payload.achievements.got).length && chk.preview.exportedAt > 0, '가져오기 미리보기');
  t(Object.keys(store).length === 0, '확인 단계에서 데이터가 쓰임');
  t(G.importApply(chk.data) === true && G.state() === null, '복원');
  // 키 순서와 무관하게 내용을 비교한다(도전 과제는 복원할 때 목록 순서로 다시 정리된다)
  const canon = v => (Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.keys(v).sort().reduce((o, k) => { o[k] = canon(v[k]); return o; }, {}) : v);
  const parse = sn => canon(JSON.parse(sn).map(x => (x && x[0] === '{' || x && x[0] === '[' ? JSON.parse(x) : x)));
  t(JSON.parse(before)[0] === store[KEY] && JSON.parse(before)[1] === store[BAK] && JSON.stringify(parse(before)) === JSON.stringify(parse(snap())), '복원한 데이터가 내보낸 데이터와 다름');
  t(G.load() === 'ok' && G.state().nick === 'Back2' && G.hall().length === 6 && G.achInfo().runs === 1, '복원 뒤 불러오기');
  runCareer(-1, '복원한 커리어'); t(G.hall().length === 7 && G.achInfo().runs === 2, '복원한 커리어의 은퇴 기록');
  // 예전 저장 22종: 열기 → 내보내기 → 빈 기기에서 가져오기 → 은퇴까지
  let fxBack = 0;
  for (const f of fxNames) {
    clear(); store[KEY] = fs.readFileSync(path.join(fx, f + '.json'), 'utf8');
    if (G.load() !== 'ok') fail('기록 보관: 예전 저장 ' + f + ' 을(를) 열지 못함');
    const k0 = store[KEY], nick = G.state().nick, year = G.state().year, turns = G.state().stat.turns, out = JSON.stringify(G.exportData());
    clear(); const c = G.importCheck(out);
    if (!c.ok || !G.importApply(c.data) || store[KEY] !== k0 || G.load() !== 'ok' || G.state().nick !== nick || G.state().year !== year || G.state().stat.turns !== turns) fail('기록 보관: 예전 저장 ' + f + ' 의 백업·복원이 원본과 다름' + (c.ok ? '' : ' (' + c.err + ')'));
    runCareer(-1, f + ' 복원'); fxBack++;
  }

  // 8) 잘못된 파일은 모두 거부되고 기기의 데이터는 그대로다
  clear(); store[HALL] = JSON.stringify(oldHall.slice(0, 3)); start('Keep', 4); for (let k = 0; k < 60; k++) G.autoStep(); G.hall();
  const keep = snap(), good = JSON.parse(file), mod = fn => { const x = JSON.parse(file); fn(x); return JSON.stringify(x); };
  const bad = {
    '문자열 아님': 5, '빈 문자열': '', '깨진 JSON': file.slice(0, 300), '배열': '[1]', 'null': 'null', '다른 형식': '{"a":1}',
    '다른 format': mod(x => { x.format = 'other'; }), '새 버전': mod(x => { x.version = 2; }), '버전 0': mod(x => { x.version = 0; }), '버전 문자열': mod(x => { x.version = '1'; }), '버전 소수': mod(x => { x.version = 1.5; }),
    'payload 없음': mod(x => { delete x.payload; }), 'payload 배열': mod(x => { x.payload = []; }),
    '커리어 문자열': mod(x => { x.payload.career = 'x'; }), '저장 버전 다름': mod(x => { x.payload.career.v = 2; }), '능력치 문자열': mod(x => { x.payload.career.stats.mech = '50'; }), '능력치 범위': mod(x => { x.payload.career.stats.mech = 400; }),
    '한계 누락': mod(x => { delete x.payload.career.caps; }), '나이 범위': mod(x => { x.payload.career.age = 99; }), '연차 소수': mod(x => { x.payload.career.year = 2.5; }), '없는 구단': mod(x => { x.payload.career.org = 'zz'; }),
    '없는 포지션': mod(x => { x.payload.career.role = 'zz'; }), '없는 국적': mod(x => { x.payload.career.home = 'zz'; }), '이름 숫자': mod(x => { x.payload.career.nick = 5; }), '이름 너무 김': mod(x => { x.payload.career.nick = 'a'.repeat(50); }),
    '자금 문자열': mod(x => { x.payload.career.money = '1e9'; }), '없는 장면': mod(x => { x.payload.career.q = [{ type: 'hack' }]; }), '장면 너무 많음': mod(x => { x.payload.career.q = Array.from({ length: 60 }, () => ({ type: 'info' })); }),
    '우승 등급 손상': mod(x => { x.payload.career.car.titles = [{ y: 1, name: 'x', tier: 'galaxy' }]; }), '통산 음수': mod(x => { x.payload.career.car.g = -5; }), '거쳐 간 구단 손상': mod(x => { x.payload.career.car.orgs = ['zz']; }),
    '계약 누락': mod(x => { delete x.payload.career.contract; }), '시즌 사본 손상': mod(x => { x.payload.careerBackup = { v: 1 }; }), '은퇴 표시와 장면 불일치': mod(x => { x.payload.career.over = true; }),
    '전당 객체': mod(x => { x.payload.hall = {}; }), '전당 31명': mod(x => { x.payload.hall = oldHall.concat([oldHall[0]]); }), '전당 항목 손상': mod(x => { x.payload.hall = [{ nick: 1 }]; }),
    '보관소 버전': mod(x => { x.payload.legacy.v = 2; }), '보관소 기록 손상': mod(x => { x.payload.legacy.recs = [{ score: 'a' }]; }), '보관소 201명': mod(x => { x.payload.legacy.recs = Array.from({ length: 201 }, (_, i) => ({ id: 'z' + i, nick: 'Z', score: 1 })); }),
    '도전 과제 버전': mod(x => { x.payload.achievements.v = 9; }), '도전 과제 문자열': mod(x => { x.payload.achievements = 'all'; }),
    '3MB 초과': mod(x => { x.payload.pad = 'x'.repeat(G.BACKUP_MAX + 1); }), '너무 깊음': mod(x => { let o = x.payload.career.flags; for (let i = 0; i < 40; i++) o = o.d = {}; }), '항목 너무 많음': mod(x => { x.payload.career.flags.big = Array.from({ length: 450000 }, () => 1); }),
  };
  let rejected = 0;
  for (const name in bad) { const c = G.importCheck(bad[name]); if (c.ok || !c.err || c.data) fail('기록 보관: 잘못된 백업 "' + name + '" 이 거부되지 않음'); if (snap() !== keep) fail('기록 보관: 거부된 백업 "' + name + '" 이 데이터를 바꿈'); rejected++; }
  t(G.importApply(null) === false && G.importApply('x') === false && snap() === keep, '빈 복원 요청');
  // 꺾쇠는 무해한 글자로 바뀌고, 모르는 도전 과제와 여분의 값은 버려진다
  const evil = '<img src=x onerror=alert(1)>';
  chk = G.importCheck(mod(x => { x.payload.career.log = [{ y: 1, m: 2, msg: evil, tone: 'gold' }]; x.payload.legacy.recs[0].ep = evil; x.payload.legacy.recs[0].hack = evil; x.payload.achievements.got.debut = { at: 5, nick: evil }; x.payload.achievements.got.cheat = { at: 5 }; x.payload.hall[0].ep = evil; x.payload.evil = evil; x.payload.career.__proto__x = 1; }));
  t(chk.ok && !/[<>]/.test(JSON.stringify(chk.data)) && !('cheat' in chk.data.ach.got) && !('hack' in chk.data.legacy.recs[0]), '꺾쇠·여분 값 정리');
  t(snap() === keep, '검사만으로 데이터가 바뀜');
  // 형식이 맞는 백업의 내용을 조금 바꿔도(다른 선수 이름) 그대로 복원된다 = 전체 복원
  chk = G.importCheck(mod(x => { x.payload.career.nick = 'Other'; x.payload.careerBackup = null; x.payload.achievements = null; x.payload.tutorialDone = true; }));
  t(chk.ok && G.importApply(chk.data) && JSON.parse(store[KEY]).nick === 'Other' && !(BAK in store) && !(ACHK in store) && store[TUT] === '1' && G.load() === 'ok' && G.state().nick === 'Other', '전체 복원은 기기의 값을 파일 내용으로 바꾼다');

  // 9) 복원 도중 쓰기 실패: 모든 키가 원래 값으로 돌아온다
  const realSet = localStorage.setItem; let block = '';
  localStorage.setItem = (k, v) => { if (k === block) throw new Error('QuotaExceededError'); realSet(k, v); };
  for (const key of [KEY, BAK, HALL, LEG, ACHK]) {
    clear(); store[HALL] = JSON.stringify(oldHall.slice(0, 2)); start('Roll', 5); for (let k = 0; k < 50; k++) G.autoStep(); G.hall();
    const b4 = snap(); chk = G.importCheck(file); block = key; const res = G.importApply(chk.data); block = '';
    t(res === false && snap() === b4 && G.state() && G.state().nick === 'Roll' && G.load() === 'ok', key + ' 쓰기 실패 뒤 되돌리기');
  }
  // 10) 보관소·도전 과제만 쓰지 못할 때: 은퇴는 정상, 커리어 저장도 정상, 실패가 표시된다
  clear(); start('Quota', 6); for (let k = 0; k < 40; k++) G.autoStep();
  block = LEG; const endSc = finish(); block = '';
  t(G.state().over && endSc.type === 'retire' && G.hallInfo().failed && !G.hallGet(G.state().cid) && !G.saveFailed() && JSON.parse(store[KEY]).over && !!G.endRec() && G.endRec().nick === 'Quota', '보관소 쓰기 실패가 은퇴나 커리어 저장을 망가뜨림');
  t(G.load() === 'ok' && !!G.hallGet(G.state().cid) && !G.hallInfo().failed && G.hall().length === 1, '쓰기 실패 뒤 다시 열면 기록이 들어가야 함');
  clear(); start('Quota2', 7); block = ACHK; finish(); block = '';
  t(G.state().over && G.achInfo().failed && !(ACHK in store) && !G.saveFailed() && !!G.hallGet(G.state().cid), '도전 과제 쓰기 실패가 다른 저장을 망가뜨림');
  G.load(); t(!G.achInfo().failed && G.achInfo().runs === 1, '쓰기 실패 뒤 다시 열면 도전 과제가 기록되어야 함');
  localStorage.setItem = realSet;

  // 11) 기록 기능은 게임 난수를 쓰지 않는다
  G.seed(909); const r0 = G.rand(); G.seed(909);
  G.hall(); G.hall('titles'); G.hallInfo(); G.achList(); G.achInfo(); G.achSeen(); G.endRec(); G.importCheck(file); JSON.stringify(G.exportData()); CARD.plan(G.hall()[0], measure); G.hallDel(G.hall()[0].id); G.hallUndo(G.hallTrash()[0].id); G.save(); G.load();
  t(G.rand() === r0, '기록 기능이 난수를 소비함');
  t(G.state().nick !== '<b>' && (() => { G.newGame({ nick: '<b>"x\'&', region: 'kr', role: 'core', trait: 'brain' }); return G.state().nick === 'bx'; })(), '새 선수 아이디의 특수문자 정리');

  // 12) 장면 규격: 형식은 맞지만 장면의 필수 항목이 빠진 저장은 복원 전에 거부된다
  const sceneBad = {
    '내용 없는 알림': [{ type: 'info' }], '줄 목록 없는 알림': [{ type: 'info', title: 'a', text: 'b', tone: 'gold' }], '선택지 없는 이벤트': [{ type: 'event', ev: 'parents', title: 'a', text: 'b' }],
    '없는 이벤트': [{ type: 'event', ev: 'nope', title: 'a', text: 'b', choices: [{ label: 'x', p: 50 }] }], '없는 카드': [{ type: 'cards', cards: ['zz', 'zz', 'zz'], reroll: 1 }],
    '확률이 문자열': [{ type: 'tryout', p: '50', text: 'x', vet: false, retry: false }], '없는 구단 제안': [{ type: 'offers', msg: '', canStay: true, offers: [{ name: 'x', org: 'zz', region: 'x', renew: false, salary: 1, squad: 'first', years: 1, p: null, tries: 0 }] }],
    '경기 목록이 문자열': [{ type: 'month', title: 'a', sub: 'b', plan: 'c', ovr: 50, salary: 1, notes: [], growth: [], matches: 'x' }], '은퇴 평가 축 누락': [Object.assign({}, G.scene() && G.scene().type === 'retire' ? G.scene() : { type: 'retire' }, { ax: {} })],
  };
  let sceneRej = 0;
  for (const name in sceneBad) { const c = G.importCheck(mod(x => { x.payload.career.q = sceneBad[name]; })); if (c.ok) fail('기록 보관: 장면이 손상된 백업 "' + name + '" 이 거부되지 않음'); sceneRej++; }

  // 13) 변형 시험: 정상 백업(예전 저장 22종에서 만든 것)의 값 하나를 지우거나 다른 자료형·극단값으로 바꾼다.
  //     거부되면 그만이고, 통과했다면 복원해서 은퇴까지 진행하는 동안 오류·값 이상·규격 밖 장면이 없어야 한다. 기기의 데이터는 거부 시 그대로여야 한다.
  let fa = (seedArg != null ? +seedArg : Date.now()) + 424242 | 0;
  const fr = () => { fa = fa + 0x6D2B79F5 | 0; let x = Math.imul(fa ^ fa >>> 15, 1 | fa); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
  const bases = fxNames.map(f => { clear(); store[KEY] = fs.readFileSync(path.join(fx, f + '.json'), 'utf8'); G.load(); for (let k = 0, n = Math.floor(fr() * 40); k < n && !G.state().over; k++) G.autoStep(); return JSON.stringify(G.exportData()); });
  const VALS = [undefined, null, 'x', '', -1, 0, 1e9, 1e15, 0.5, [], {}, true, 'zz'.repeat(400), [null], { a: 1 }];
  const FZ = { n: 0, rej: 0, ok: 0, steps: 0 }, FUZZ = +(process.env.PG_FUZZ || Math.max(200, Math.min(1000, Math.round(N / 3))));
  for (let it = 0; it < FUZZ; it++) {
    const x = JSON.parse(bases[it % bases.length]), slots = [];
    (function walk(o, p) { for (const k of Object.keys(o)) { slots.push([o, k, p + '.' + k]); if (o[k] && typeof o[k] === 'object') walk(o[k], p + '.' + k); } })(x.payload.career, 'career');
    const [obj, key, where] = slots[Math.floor(fr() * slots.length)], v = VALS[Math.floor(fr() * VALS.length)], was = JSON.stringify(obj[key]);
    if (v === undefined) { if (Array.isArray(obj)) obj.splice(+key, 1); else delete obj[key]; } else obj[key] = v;
    const what = `${fxNames[it % bases.length]} ${where}: ${String(was).slice(0, 60)} → ${v === undefined ? '(삭제)' : JSON.stringify(v).slice(0, 30)}`;
    clear(); store[HALL] = '[]'; const before = snap(); FZ.n++;
    let c; try { c = G.importCheck(JSON.stringify(x)); } catch (e) { fail('기록 보관: 변형 백업 검사 중 오류 — ' + what + ' — ' + e.message); }
    if (!c.ok) { FZ.rej++; if (snap() !== before) fail('기록 보관: 거부된 변형 백업이 데이터를 바꿈 — ' + what); continue; }
    FZ.ok++;
    try {
      if (!G.importApply(c.data) || G.load() !== 'ok') throw new Error('복원 뒤 열리지 않음');
      if (G.state().org && !G.state().over) { G.table(); G.goal(); G.rivals(); G.rivalFixtures(); }
      for (let k = 0; k < 6000 && !G.state().over; k++) { G.autoStep(); FZ.steps++; const st = G.state(); for (const q of st.q) if (!G.validScene(q)) throw new Error('규격 밖 장면 ' + q.type);
        for (const id in st.stats) if (!(st.stats[id] >= 1 && st.stats[id] <= 99)) throw new Error('능력치 ' + id); for (const id of ['cond', 'wrist', 'trust', 'fame']) if (!(st[id] >= 0 && st[id] <= 100)) throw new Error(id);
        if (!Number.isFinite(st.money) || !Number.isFinite(G.ovr())) throw new Error('자금·OVR'); }
      G.table(); G.goal(); G.rivals(); G.achList(); G.hall();
    } catch (e) { fail('기록 보관: 검사를 통과한 변형 백업이 진행 중 문제를 일으킴 — ' + what + ' — ' + e.message); }
  }

  console.log('— 기록 보관(7단계) —');
  console.log(`은퇴 기록 검사 ${LGC.n}회(은퇴마다 보관소에 한 건, 은퇴 화면과 같은 값, 다시 불러와도 늘지 않음) | 단위 검사 ${R.n}개 통과: 예전 명예의 전당 30명 이관·원본 보존, 커리어 40개의 도전 과제 ${gotIds.length}종이 실제 기록과 일치, 카드 글자 ${cardOps}개 대조`);
  console.log(`장면 규격(8단계): 진행 중 나온 장면 ${SV.n}개 모두 규격 통과 | 장면이 손상된 백업 ${sceneRej}종 거부 | 변형 백업 ${FZ.n}개 중 ${FZ.rej}개 거부, 통과한 ${FZ.ok}개는 복원 뒤 ${FZ.steps}번 진행하는 동안 오류 0`);
  console.log(`백업: 내보내기→빈 기기 복원 일치(커리어 저장은 글자 단위로 동일) 후 은퇴까지 진행 | 예전 저장 ${fxBack}종 백업·복원 후 완주 | 잘못된 파일 ${rejected}종 모두 거부·데이터 불변 | 쓰기 실패 5개 위치에서 되돌리기 | 보관소·도전 과제 쓰기 실패 시 커리어 저장 정상 | 난수 미사용`);
}
