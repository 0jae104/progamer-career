// 화면 명령(data-act) 정적 검사: 같은 이름의 case 가 두 번 나오거나, 화면에 있는 명령을 처리하는 곳이 없으면 실패한다.
// 0.11.1에서 'auto'가 자동 관리 스위치와 승부처 "감독 판단" 두 곳에 쓰여 뒤쪽이 눌리지 않던 문제의 재발 방지.
//   node test/static.js
const fs = require('fs'), path = require('path');
const ui = fs.readFileSync(path.join(__dirname, '..', 'js', 'ui.js'), 'utf8');
const i0 = ui.indexOf("app.addEventListener('click'"), body = ui.slice(i0);
const cases = [...body.matchAll(/case '([a-z0-9-]+)':/gi)].map(m => m[1]);
const dup = cases.filter((c, i) => cases.indexOf(c) !== i);
const early = [...body.slice(0, body.indexOf('switch (a)')).matchAll(/a === '([a-z0-9-]+)'/gi)].map(m => m[1]);
const used = new Set([...ui.matchAll(/data-act="([a-z0-9-]+)"/gi)].map(m => m[1]));
const handled = new Set([...cases, ...early]);
const missing = [...used].filter(a => !handled.has(a)), unused = [...new Set(cases)].filter(c => !used.has(c));
console.log(`화면 명령 ${used.size}종 | 처리하는 case ${new Set(cases).size}종 | 중복 case ${dup.length ? dup.join(', ') : '없음'} | 처리하는 곳이 없는 명령 ${missing.length ? missing.join(', ') : '없음'} | 화면에 없는 case ${unused.length ? unused.join(', ') : '없음'}`);
if (dup.length || missing.length) { console.log('실패'); process.exit(1); }

/* 0.11.6 — 1) 자동진행의 부분 갱신이 상태 칸을 통째로 바꿔(outerHTML) 형제 요소를 늘리는 모양이 다시 생기지 않았는지.
   2) 선수 등록 화면의 설명(국적·포지션·성향)이 엔진의 실제 동작과 같은지: 같은 시드로 선택만 바꿔 새 커리어를 만들어 숫자를 대조한다. */
const bad = [];
if (/\.outerHTML\s*=\s*hstat\(/.test(ui)) bad.push('상태 칸을 outerHTML 로 바꾸는 코드가 있음(자금 줄이 쌓인다)');
if (!/id="hbox"/.test(ui) || !/hb\.innerHTML = hstatIn\(S\)/.test(ui)) bad.push('상태·자금 상자(#hbox)의 안쪽만 바꾸는 코드가 없음');
// 0.11.7: 목표는 자금 다음·할 일 앞에 한 번만, 상태·자금 상자와 다른 상자(#gbox)에. 자동진행은 그 안쪽만 바꾼다
// 0.11.8: 이번 달 할 일도 상자(#pbox)의 안쪽만, 글이 달라진 달에만 바꾼다. 라이벌전 줄은 한 곳에서만 만든다
if (!/function tPlay\(S\) \{ RV_HTML = rivalLine\(\); return `\$\{goalLine\(\)\}\$\{planBar\(S\)\}\$\{RV_HTML\}\$\{recapCard\(\)\}`; \}/.test(ui)) bad.push('홈 본문의 순서가 목표 → 할 일 → 라이벌전 → 지난 진행이 아님');
if (!/id="pbox"/.test(ui) || !/if \(ph !== PLAN_HTML\) \{ PLAN_HTML = ph; pb\.innerHTML = ph; \}/.test(ui)) bad.push('이번 달 할 일 상자(#pbox)를 달라진 달에만 바꾸는 코드가 없음');
if ((ui.match(/class="plan5"/g) || []).length !== 1 || (ui.match(/class="rvcard"/g) || []).length !== 1) bad.push('할 일 다섯 칸이나 라이벌전 줄을 만드는 곳이 한 곳이 아님');
if ((ui.match(/goalLine\(\)/g) || []).length !== 2) bad.push('goalLine() 을 그리는 곳이 한 곳이 아님(목표 칸이 둘이 될 수 있다)');
if (!/id="gbox"/.test(ui) || !/gb\.innerHTML = gh/.test(ui) || /hstatIn[^\n]*goalIn\(/.test(ui)) bad.push('목표 상자(#gbox)의 안쪽만 바꾸는 코드가 없거나 목표가 상태·자금 상자 안에 들어감');
const mem = {}; globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
const G = require('../js/engine.js'), D = G.D, B = D.BAL, near = (a, b) => Math.abs(a - b) < 1e-9;
const make = (seed, o) => { for (const k of Object.keys(mem)) delete mem[k]; G._seen(); G.seed(seed); const S = G.newGame(Object.assign({ nick: 't', region: 'kr', role: 'core', trait: 'brain' }, o)); return { st: Object.assign({}, S.stats), cap: Object.assign({}, S.caps), grow: S.grow, money: S.money, sal: S.contract.salary }; };
const WANT = {   // 화면(js/ui.js 의 TRAIT_FX)에 적은 값. 기준은 보정이 없는 가상의 선수(아래에서 천재형에서 보정을 뺀 값)로 잡는다
  genius: { st: { mech: 4, reflex: 4, mental: -4 }, cap: { mech: 5, reflex: 5 } },
  grinder: { st: { mech: 1, reflex: 1, sense: 1, team: 1, mental: 1, pool: 1 }, cap: { mech: B.grinderCap, reflex: B.grinderCap, sense: B.grinderCap, team: B.grinderCap, mental: B.grinderCap, pool: B.grinderCap } },
  brain: { st: { sense: 5, pool: 3 }, cap: { sense: 6, pool: 5, mental: 2 } },
};
let seeds = 0, spread = new Set(), talent = new Set();
for (let seed = 1; seed <= 60; seed++) {
  const t = {}; for (const id of Object.keys(WANT)) t[id] = make(seed, { trait: id });
  if (Object.values(t).some(x => Object.values(x.cap).some(v => v <= 55 || v >= 99))) continue;   // 한계가 55~99 경계에 걸린 시드는 대조에서 뺀다
  seeds++;
  const base = { st: {}, cap: {} }; for (const s of D.STATS) { base.st[s.id] = t.genius.st[s.id] - (WANT.genius.st[s.id] || 0); base.cap[s.id] = t.genius.cap[s.id] - (WANT.genius.cap[s.id] || 0); }
  for (const id of Object.keys(WANT)) for (const s of D.STATS) {
    if (!near(t[id].st[s.id], base.st[s.id] + (WANT[id].st[s.id] || 0))) bad.push(`시드 ${seed} ${id} ${s.id}: 시작 보정이 화면 설명과 다름`);
    if (!near(t[id].cap[s.id], base.cap[s.id] + (WANT[id].cap[s.id] || 0))) bad.push(`시드 ${seed} ${id} ${s.id}: 한계 보정이 화면 설명과 다름`);
  }
  // 바탕 숫자: 시작값 = 34~42 + 비중 × 45, 한계 = capBase + 재능 + 0~capRand + 비중 × capRole. 재능은 능력치 여섯 개에 같은 값
  const w = D.ROLES.find(r => r.id === 'core').w;
  for (const s of D.STATS) { const v = base.st[s.id] - w[s.id] * 45; if (v < 34 - 1e-9 || v > 42 + 1e-9) bad.push(`시드 ${seed} ${s.id}: 시작 바탕 ${v} 이 34~42 밖`); }
  const rest = D.STATS.map(s => base.cap[s.id] - B.capBase - w[s.id] * B.capRole), tl = (t.genius.grow - 1) / B.talentGrow * B.talentSd;
  if (t.genius.grow > .7001 && t.genius.grow < 1.2999 && rest.some(v => v - tl < -1e-6 || v - tl > B.capRand + 1e-6)) bad.push(`시드 ${seed}: 한계의 무작위 몫이 0~${B.capRand} 밖`);
  if (t.genius.grow !== t.grinder.grow || t.genius.grow !== t.brain.grow) bad.push(`시드 ${seed}: 숨은 재능이 성향에 따라 달라짐`);
  spread.add(Math.round(base.st.mech * 100)); talent.add(Math.round(t.genius.grow * 1000));
  // 국적: 능력치·한계·성장 배율·시작 자금·연습생 연봉이 같다
  const reg = D.REGIONS.map(r => make(seed, { region: r.id }));
  if (!reg.every(x => JSON.stringify([x.st, x.cap, x.grow, x.money, x.sal]) === JSON.stringify([reg[0].st, reg[0].cap, reg[0].grow, reg[0].money, reg[0].sal]))) bad.push(`시드 ${seed}: 국적에 따라 능력치·한계·성장·시작 자금이 달라짐`);
  // 포지션: 시작값의 차 = 비중의 차 × 45, 한계의 차 = 비중의 차 × capRole
  const a = make(seed, { role: 'core' }), b = make(seed, { role: 'sup' }), wb = D.ROLES.find(r => r.id === 'sup').w;
  for (const s of D.STATS) { if (!near(a.st[s.id] - b.st[s.id], (w[s.id] - wb[s.id]) * 45)) bad.push(`시드 ${seed} ${s.id}: 포지션의 시작 보정이 비중 × 45 가 아님`); if (a.cap[s.id] > 55 && a.cap[s.id] < 99 && b.cap[s.id] > 55 && b.cap[s.id] < 99 && !near(a.cap[s.id] - b.cap[s.id], (w[s.id] - wb[s.id]) * B.capRole)) bad.push(`시드 ${seed} ${s.id}: 포지션의 한계 보정이 비중 × ${B.capRole} 가 아님`); }
}
for (const r of D.ROLES) if (!near(Object.values(r.w).reduce((x, y) => x + y, 0), 1)) bad.push(`${r.id}: 비중의 합이 100%가 아님`);
if (seeds < 30 || spread.size < 20 || talent.size < 20) bad.push(`대조한 시드 ${seeds}개, 서로 다른 시작값 ${spread.size}종·재능 ${talent.size}종: 너무 적음`);
const eng = fs.readFileSync(path.join(__dirname, '..', 'js', 'engine.js'), 'utf8');
for (const [name, re] of [['천재형 19세까지 +0.15', /S\.trait === 'genius' && a <= 19\) f \+= \.15/], ['노력형 컨디션 소모 ×0.75', /c < 0 && S\.trait === 'grinder'\) c \*= \.75/], ['두뇌형 노쇠 +1년', /B\.fadeFrom \+ \(S\.trait === 'brain' \? 1 : 0\)/], ['성장 배율의 팀 전력 몫', /coachF = \.92 \+ \(org\(\)\.str - 62\) \/ 160/], ['해외 1군 제안 조건', /g\.region !== S\.home && !\(o >= 76 \|\| S\.fame >= 45\)/], ['대표팀 선발 조건', /S\.squad === 'first' && isStarter\(\) && S\.injury === 0 && ovr\(\) >= me\.natThr/]]) if (!re.test(eng)) bad.push(`엔진의 "${name}" 줄이 바뀜: 선수 등록 화면의 설명(js/ui.js pickInfo)도 고쳐야 한다`);
// 0.11.10: 쉬운 말로 바꾼 설명. (1) 성향·리그 문장에 배율·비중 같은 내부 숫자가 없다 (2) 문장이 말하는 차이가 실제 값에 있다
for (const t of D.TRAITS) for (const k of ['good', 'bad', 'desc']) { if (!t[k]) bad.push(`${t.id}.${k} 설명이 없음`); else if (/[%×]|\d+(\.\d+)?\s*배|\+\s*\d|−\s*\d|-\s*\d/.test(t[k]) || /\d{2,}/.test(t[k].replace(/10대|20대/g, ''))) bad.push(`${t.id}.${k}: 내부 숫자가 남아 있음 — ${t[k]}`); }
for (const id of Object.keys(D.REGION_NOTE)) if (/[%×\d]/.test(D.REGION_NOTE[id].replace(/[12]군/g, ''))) bad.push(`리그 설명 ${id}: 숫자가 남아 있음`);
if (/TRAIT_FX|포지션 비중 \$\{|성장 배율 =|표준편차|\* 100\)\}%`\)\.join\(' · '\)\}<\/span>/.test(ui)) bad.push('화면 코드에 성향 보정표·비중(%)·성장 배율 식이 남아 있음');
{ const st = id => D.ORGS.filter(g => g.region === id).map(g => g.str), top = id => Math.max(...st(id)), low = id => Math.min(...st(id)), R = id => D.REGIONS.find(r => r.id === id);
  const claims = [
    ['한국: 팀들이 가장 강하다', ['cn', 'eu', 'na'].every(x => top('kr') > top(x) && low('kr') > low(x))],
    ['중국: 한국 다음으로 강하고 연봉이 가장 높다', top('cn') > top('eu') && top('cn') > top('na') && ['kr', 'eu', 'na'].every(x => R('cn').pay > R(x).pay)],
    ['유럽: 한국·중국보다 약하고 연봉은 한국보다 조금 높다', top('eu') < top('cn') && R('eu').pay > R('kr').pay && R('eu').pay < R('na').pay],
    ['북미: 팀들이 가장 약하고 연봉은 높은 편, 대표팀은 가장 약하다', ['kr', 'cn', 'eu'].every(x => top('na') < top(x) && low('na') < low(x) && R('na').nat < R(x).nat) && R('na').pay > R('eu').pay],
    ['성향 문장의 근거(위의 보정 대조와 같은 값): 천재형 멘탈 시작 낮음·노력형 시작 한계 가장 낮음·두뇌형 피지컬·반응속도 보정 없음', WANT.genius.st.mental < 0 && B.grinderCap < 0 && !WANT.genius.cap.sense && !WANT.brain.st.mech && !WANT.brain.cap.mech && !WANT.brain.cap.reflex && B.grinderCapYear > 0 && B.grinderGrow > 1],
  ];
  for (const [name, ok] of claims) if (!ok) bad.push(`설명과 실제 값이 다름: ${name}`); }
console.log(`선수 등록 설명 대조: 시드 ${seeds}개 — 성향의 시작·한계 보정이 화면에 적은 값과 같음 · 같은 시드에서 국적만 바꾸면 능력치·한계·성장 배율이 같음 · 포지션의 차는 비중 × 45(시작)·× ${B.capRole}(한계) · 같은 선택이어도 시드마다 시작값 ${spread.size}종·숨은 재능 ${talent.size}종으로 다름`);
if (bad.length) { for (const b of bad.slice(0, 12)) console.log('실패: ' + b); process.exit(1); }
console.log('통과');
