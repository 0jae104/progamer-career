// 밸런스 측정 도구(0.11.2): 성향별 장기 성장. 검사가 아니라 측정이다(통과·실패가 없다).
//   node test/balance.js traits [시드당 성향별 커리어 수=600] [--seeds=1,2,3,4,5] [--set=키=값,키=값]
//   node test/balance.js offers [국적별 커리어 수=400] [--seeds=1,2] [--set=…]   해외 리그에서 뛰는 선수에게 고국 리그의 1군 제안이 오는 비율
// 같은 시드 번호의 커리어는 성향만 다르고 포지션·리그·난수 시드가 같다(난수 소비가 달라지므로 완전한 짝은 아니다).
// 진행 규칙은 test/sim.js 와 같은 autoStep(할 일을 돌아가며 고르고 컨디션이 낮으면 휴식)이다. 사람의 플레이와는 다르다.
// --set 은 D.BAL 의 값을 실행 중에만 바꾼다(후보 비교용). 예: --set=grinderCap=0,grinderLate=0.2
const args = process.argv.slice(2), mode = args[0] || 'traits', N = +(args[1] && !args[1].startsWith('--') ? args[1] : 600);
const opt = k => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=').slice(1).join('=') : ''; };
const SEEDS = (opt('seeds') || '1,2,3,4,5').split(',').map(Number);
const mem = {}; globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
const G = require('../js/engine.js'), D = G.D, B = D.BAL;
const sets = opt('set') ? opt('set').split(',').map(x => x.split('=')) : [];
for (const [k, v] of sets) { if (!(k in B)) { console.log('없는 값: ' + k); process.exit(2); } B[k] = JSON.parse(v); }
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const ci = a => { if (a.length < 2) return 0; const m = mean(a), sd = Math.sqrt(a.reduce((x, y) => x + (y - m) * (y - m), 0) / (a.length - 1)); return 1.96 * sd / Math.sqrt(a.length); };
const f = (a, d) => `${mean(a).toFixed(d == null ? 1 : d)}±${ci(a).toFixed(d == null ? 1 : d)}`;
const pct = (a) => { const p = mean(a), n = a.length; return `${(p * 100).toFixed(1)}±${(196 * Math.sqrt(p * (1 - p) / n)).toFixed(1)}%`; };
const roles = D.ROLES.map(r => r.id), regs = D.REGIONS.map(r => r.id), traits = D.TRAITS.map(t => t.id);

if (mode === 'traits') {
  const rows = {}, cell = {};   // rows[trait] = 지표별 배열, cell[role|reg|seed][trait] = 커리어 점수 배열
  for (const t of traits) rows[t] = { o0: [], cap0: [], o20: [], o23: [], o27: [], peak: [], debut: [], dage: [], rage: [], g: [], titles: [], mvp: [], score: [], third: [], awards: [] };
  const t0 = Date.now();
  for (const seed of SEEDS) for (let i = 0; i < N; i++) for (const tr of traits) {
    for (const k in mem) delete mem[k]; mem.pg_tut_v1 = '1'; G._seen(); G.seed(seed * 1000003 + i);
    const role = roles[i % roles.length], reg = regs[Math.floor(i / roles.length) % regs.length];
    G.newGame({ nick: 'B', region: reg, role, trait: tr });
    const S0 = G.state(), w = D.ROLES.find(r => r.id === role).w, R = rows[tr];
    R.o0.push(G.ovr()); R.cap0.push(Object.keys(w).reduce((a, k) => a + w[k] * S0.caps[k], 0));
    let n = 0; const at = {};
    while (!G.state().over && n++ < 30000) { const s = G.state(); if (!at[s.age]) at[s.age] = G.ovr(); G.autoStep(); }
    const s = G.state(), c = s.car, fin = s.q[0];
    for (const a of [20, 23, 27]) if (at[a]) R['o' + a].push(at[a]);
    R.peak.push(c.peak); R.debut.push(c.debut ? 1 : 0); if (c.debut) R.dage.push(c.debut); R.rage.push(s.age); R.g.push(c.g);
    R.titles.push(c.titles.filter(x => x.tier !== 'second').length); R.mvp.push(c.mvp); R.awards.push(c.awards.length); R.score.push(fin.score); R.third.push(c.g < 20 ? 1 : 0);
    const key = role + '|' + reg + '|' + seed; (cell[key] = cell[key] || {}); (cell[key][tr] = cell[key][tr] || []).push(fin.score);
  }
  console.log(`성향별 장기 성장 | 버전 ${G.VERSION} | 시드 ${SEEDS.join(',')} × 성향별 ${N}커리어 = 성향마다 ${SEEDS.length * N}커리어 | 바꾼 값: ${sets.length ? sets.map(x => x.join('=')).join(', ') : '없음'} | ${((Date.now() - t0) / 1000).toFixed(0)}초`);
  console.log('값은 평균±95% 신뢰구간. 20·23·27세 OVR은 그 나이까지 선수 생활을 한 커리어만의 평균이다(표본 수가 다르다).\n');
  const name = t => D.TRAITS.find(x => x.id === t).name;
  console.log('| 지표 | ' + traits.map(name).join(' | ') + ' |'); console.log('|---|' + traits.map(() => '---|').join(''));
  const line = (label, fn) => console.log(`| ${label} | ` + traits.map(t => fn(rows[t])).join(' | ') + ' |');
  line('시작 OVR', R => f(R.o0)); line('시작 시점의 한계(포지션 비중 평균)', R => f(R.cap0));
  line('20세 OVR (표본)', R => `${f(R.o20)} (${R.o20.length})`); line('23세 OVR (표본)', R => `${f(R.o23)} (${R.o23.length})`); line('27세 OVR (표본)', R => `${f(R.o27)} (${R.o27.length})`);
  line('최고 OVR', R => f(R.peak)); line('1군 데뷔 비율', R => pct(R.debut)); line('데뷔 나이(데뷔한 커리어)', R => f(R.dage)); line('은퇴 나이', R => f(R.rage));
  line('1군 경기 수', R => f(R.g, 0)); line('1군 경기 20 미만으로 끝난 비율', R => pct(R.third)); line('1군 우승 수', R => f(R.titles, 2)); line('경기 MVP 수', R => f(R.mvp)); line('개인상 수', R => f(R.awards, 2)); line('커리어 점수', R => f(R.score, 0));
  // 칸(포지션×리그×시드)마다 커리어 점수 평균이 가장 낮은 성향
  const low = {}, high = {}; let cells = 0; for (const t of traits) low[t] = high[t] = 0;
  for (const k in cell) { const m = traits.map(t => [t, mean(cell[k][t])]).sort((a, b) => a[1] - b[1]); low[m[0][0]]++; high[m[m.length - 1][0]]++; cells++; }
  console.log(`\n칸(포지션 5 × 리그 4 × 시드 ${SEEDS.length} = ${cells}칸, 칸당 성향별 ${Math.round(N / 20)}커리어)에서 커리어 점수 평균이 가장 낮은 성향: ` + traits.map(t => `${name(t)} ${low[t]}칸(${Math.round(low[t] / cells * 100)}%)`).join(' · '));
  console.log('가장 높은 성향: ' + traits.map(t => `${name(t)} ${high[t]}칸(${Math.round(high[t] / cells * 100)}%)`).join(' · '));
  // 포지션별·리그별 커리어 점수
  for (const [label, idx, ids] of [['포지션', 0, roles], ['리그', 1, regs]]) {
    console.log(`\n${label}별 커리어 점수 평균: ` + ids.map(id => `${id} ` + traits.map(t => { const a = []; for (const k in cell) if (k.split('|')[idx] === id) a.push(...cell[k][t]); return mean(a).toFixed(0); }).join('/')).join(' · ') + `  (${traits.map(name).join('/')})`);
  }
}

if (mode === 'offers') {
  // 해외에서 뛰는 동안, 매 스토브리그에 "지금 제안을 받는다면"을 K번 뽑아 본다(genOffers 는 난수 말고는 상태를 바꾸지 않는다).
  // cand = 조건을 통과한 후보 전체, out = 화면에 실제로 나오는 제안(0.11.1: 연봉 상위 2 + 무작위 1).
  const K = 40, age = a => (a <= 23 ? '~23세' : a <= 26 ? '24~26세' : a <= 29 ? '27~29세' : '30세~');
  const acc = {}, add = (key, c, o) => { const x = acc[key] || (acc[key] = { n: 0, cand: 0, out: 0, any: 0 }); x.n++; x.cand += c; x.out += o; };
  let abroadCareers = 0, careers = 0, seasons = 0; const t0 = Date.now();
  for (const seed of SEEDS) for (const home of regs) for (let i = 0; i < N; i++) {
    for (const k in mem) delete mem[k]; mem.pg_tut_v1 = '1'; G._seen(); G.seed(seed * 7000003 + i * 13 + regs.indexOf(home));
    G.newGame({ nick: 'O', region: home, role: roles[i % roles.length], trait: traits[i % traits.length] }); careers++;
    let n = 0, was = false, sampledYear = 0;
    while (!G.state().over && n++ < 30000) {
      const s = G.state(), sc = G.scene(), here = s.org ? D.ORG[s.org].region : home;
      // 해외 1군 제안이 오면 받는다(해외로 나가는 경로를 만들기 위한 규칙). 그 밖에는 검사용 규칙 그대로.
      if (sc && sc.type === 'offers') { const j = sc.offers.findIndex(o => o.squad === 'first' && D.ORG[o.org].region !== home && !o.renew); if (j >= 0 && here === home) { G.resolve({ i: j, act: 'accept' }); continue; } }
      if (sc && (sc.type === 'stove' || sc.type === 'offers') && here !== home && s.squad === 'first' && s.year !== sampledYear) {
        sampledYear = s.year; seasons++; if (!was) { was = true; abroadCareers++; }
        const h = s.hist[s.hist.length - 1] || { g: 0, avg: 0 }, o = G.ovr();
        const good = h.g >= 20 && h.avg >= 6.3, perf = h.g < 12 ? '출전 적음(12경기 미만)' : good ? '준수(20경기+, 평점 6.3+)' : '부진';
        let c = 0, u = 0;
        for (let k = 0; k < K; k++) { const r = G._offers(sc.type === 'offers'); if (r.cand.some(x => x.squad === 'first' && D.ORG[x.org].region === home)) c++; if (r.out.some(x => x.squad === 'first' && D.ORG[x.org].region === home && !x.renew)) u++; }
        for (const key of ['전체', '나이 ' + age(s.age), '성적 ' + perf, `${home}→${here}`, '나이·성적 ' + age(s.age) + ' / ' + perf, 'OVR ' + (o >= 85 ? '85+' : o >= 80 ? '80~84' : o >= 76 ? '76~79' : '~75')]) add(key, c / K, u / K);
      }
      G.autoStep();
    }
  }
  console.log(`해외에서 뛰는 1군 선수에게 고국 리그의 1군 제안이 오는 비율 | 버전 ${G.VERSION} | 시드 ${SEEDS.join(',')} × 국적 4 × ${N}커리어 = ${careers}커리어 | 바꾼 값: ${sets.length ? sets.map(x => x.join('=')).join(', ') : '없음'} | ${((Date.now() - t0) / 1000).toFixed(0)}초`);
  console.log(`해외 1군을 경험한 커리어 ${abroadCareers}개(${(abroadCareers / careers * 100).toFixed(1)}%), 해외에서 맞은 스토브리그 ${seasons}번. 스토브리그마다 제안을 ${K}번 뽑아 본 평균이다.`);
  console.log('"후보" = 조건(OVR·나이)을 통과해 제안 후보에 든 비율, "화면" = 실제로 화면의 제안 목록에 나오는 비율. 두 값의 차이가 "후보인데 목록에서 밀려난" 몫이다.\n');
  console.log('| 구분 | 스토브리그 수 | 고국 1군 제안이 후보에 든 비율 | 화면에 나온 비율 |'); console.log('|---|---|---|---|');
  const order = k => (k === '전체' ? '0' : k.startsWith('나이 ') ? '1' + k : k.startsWith('성적') ? '2' + k : k.startsWith('OVR') ? '3' + k : k.includes('→') ? '4' + k : '5' + k);
  for (const k of Object.keys(acc).sort((a, b) => order(a).localeCompare(order(b)))) { const x = acc[k]; if (x.n >= 15) console.log(`| ${k} | ${x.n} | ${(x.cand / x.n * 100).toFixed(0)}% | ${(x.out / x.n * 100).toFixed(0)}% |`); }
}
