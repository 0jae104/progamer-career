// 밸런스 측정 도구(0.11.2): 성향별 장기 성장. 검사가 아니라 측정이다(통과·실패가 없다).
//   node test/balance.js traits [시드당 성향별 커리어 수=600] [--seeds=1,2,3,4,5] [--set=키=값,키=값]
//   node test/balance.js curve [시드당 성향별 커리어 수=300] [--seeds=1,2,3] [--set=…]   0.11.9: 나이별 OVR(10·50·90백분위), 22~25세 성장량, 한계에 막힌 달의 비율, 포지션·리그별, 상·중·하위 분포
//   node test/balance.js proj [정책별 커리어 수=300] [--seeds=1,2]   0.11.9: 시즌 프로젝트를 매 시즌 사는 정책과 사지 않는 정책의 비교(같은 시드·포지션·리그·성향)
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

if (mode === 'curve') {
  /* 0.11.9 — 성향별 성장 곡선. 같은 번호의 커리어는 성향만 다르고 포지션·리그·시드가 같다(난수 소비가 달라 완전한 짝은 아니다 → 분포로 비교한다).
     막힌 달 = 그달 끝의 "남은 성장 여지"(포지션 비중으로 평균한 1 − (능력치/한계)^4, 성장 공식의 마지막 곱)가 0.25 미만인 달. 성장이 정상의 4분의 1도 안 된다는 뜻이다. */
  const q = (a, p) => { if (!a.length) return NaN; const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
  const pq = (a, d) => (a.length ? `${q(a, .5).toFixed(d == null ? 1 : d)} (${q(a, .1).toFixed(d == null ? 1 : d)}~${q(a, .9).toFixed(d == null ? 1 : d)})` : '-');
  const AGES = [19, 22, 25, 28], mk = () => ({ o0: [], at: { 19: [], 22: [], 25: [], 28: [] }, g1922: [], g2225: [], g2528: [], peak: [], pkAge: [], second: [], sAge: [], debut: [], dAge: [], rAge: [], g: [], titles: [], awards: [], score: [], stall: { y: 0, n: 0 }, stall22: { y: 0, n: 0 }, room22: [], money: [], earn: [] });
  const rows = {}, byRole = {}, byReg = {}; for (const t of traits) { rows[t] = mk(); byRole[t] = {}; byReg[t] = {}; for (const r of roles) byRole[t][r] = mk(); for (const r of regs) byReg[t][r] = mk(); }
  const t0 = Date.now();
  for (const seed of SEEDS) for (let i = 0; i < N; i++) for (const tr of traits) {
    for (const k in mem) delete mem[k]; mem.pg_tut_v1 = '1'; G._seen(); G.seed(seed * 1000003 + i);
    const role = roles[i % roles.length], reg = regs[Math.floor(i / roles.length) % regs.length], w = D.ROLES.find(r => r.id === role).w;
    G.newGame({ nick: 'B', region: reg, role, trait: tr });
    const at = {}, o0 = G.ovr(); let n = 0, ym = -1, pk = 0, pkAge = 0, sAge = 0, st = [0, 0], st22 = [0, 0], room22 = null;
    while (!G.state().over && n++ < 30000) {
      const s = G.state(), key = s.year * 100 + s.m;
      if (key !== ym) {   // 달이 바뀐 순간
        ym = key; const o = G.ovr(); if (at[s.age] == null) at[s.age] = o; if (o > pk) { pk = o; pkAge = s.age; } if (!sAge && s.squad !== 'trainee') sAge = s.age;
        const room = D.STATS.reduce((a, x) => a + w[x.id] * Math.max(0, 1 - Math.pow(s.stats[x.id] / s.caps[x.id], 4)), 0);
        if (s.age <= 25) { st[1]++; if (room < .25) st[0]++; } if (s.age >= 20 && s.age <= 22) { st22[1]++; if (room < .25) st22[0]++; } if (s.age === 22 && room22 == null) room22 = room;
      }
      G.autoStep();
    }
    const s = G.state(), c = s.car, fin = s.q[0];
    for (const R of [rows[tr], byRole[tr][role], byReg[tr][reg]]) {
      R.o0.push(o0); for (const a of AGES) if (at[a] != null) R.at[a].push(at[a]);
      if (at[19] != null && at[22] != null) R.g1922.push(at[22] - at[19]); if (at[22] != null && at[25] != null) R.g2225.push(at[25] - at[22]); if (at[25] != null && at[28] != null) R.g2528.push(at[28] - at[25]);
      R.peak.push(pk); R.pkAge.push(pkAge); R.second.push(sAge ? 1 : 0); if (sAge) R.sAge.push(sAge); R.debut.push(c.debut ? 1 : 0); if (c.debut) R.dAge.push(c.debut); R.rAge.push(s.age); R.g.push(c.g);
      R.titles.push(c.titles.filter(x => x.tier !== 'second').length); R.awards.push(c.awards.length); R.score.push(fin.score); R.stall.y += st[0]; R.stall.n += st[1]; R.stall22.y += st22[0]; R.stall22.n += st22[1]; if (room22 != null) R.room22.push(room22); R.money.push(s.money); R.earn.push(c.earn);
    }
  }
  const name = t => D.TRAITS.find(x => x.id === t).name, per = x => (x.n ? (x.y / x.n * 100).toFixed(1) + '%' : '-');
  console.log(`성향별 성장 곡선 | 버전 ${G.VERSION} | 시드 ${SEEDS.join(',')} × 성향별 ${N}커리어 = 성향마다 ${SEEDS.length * N}커리어 | 바꾼 값: ${sets.length ? sets.map(x => x.join('=')).join(', ') : '없음'} | ${((Date.now() - t0) / 1000).toFixed(0)}초`);
  console.log('진행 규칙은 test/sim.js 의 autoStep(할 일을 돌아가며 고르고 컨디션이 낮으면 휴식, 상점은 쓰지 않음)이다. 사람의 플레이와 다르다.');
  console.log('"가운데 (하위 10%~상위 10%)"는 50백분위와 10·90백분위, "±"는 평균의 95% 신뢰구간. 나이별 값은 그 나이까지 선수 생활을 한 커리어만(표본 수가 다르다).\n');
  console.log('| 지표 | ' + traits.map(name).join(' | ') + ' |'); console.log('|---|' + traits.map(() => '---|').join(''));
  const line = (label, fn) => console.log(`| ${label} | ` + traits.map(t => fn(rows[t])).join(' | ') + ' |');
  line('시작 OVR: 가운데 (10%~90%)', R => pq(R.o0));
  for (const a of AGES) line(`${a}세 OVR: 가운데 (10%~90%) [표본]`, R => `${pq(R.at[a])} [${R.at[a].length}]`);
  line('19→22세 OVR 증가(평균)', R => f(R.g1922)); line('22→25세 OVR 증가(평균)', R => f(R.g2225)); line('25→28세 OVR 증가(평균)', R => f(R.g2528));
  line('22→25세 OVR 증가: 가운데 (10%~90%)', R => pq(R.g2225));
  line('최고 OVR: 가운데 (10%~90%)', R => pq(R.peak)); line('최고 OVR에 이른 나이(평균)', R => f(R.pkAge));
  line('22세의 남은 성장 여지(1이면 한계와 멀다)', R => f(R.room22, 2));
  line('20~22세 중 성장이 막힌 달', R => per(R.stall22)); line('25세까지 중 성장이 막힌 달', R => per(R.stall));
  line('2군 콜업 비율', R => pct(R.second)); line('2군 콜업 나이', R => f(R.sAge)); line('1군 데뷔 비율', R => pct(R.debut)); line('1군 데뷔 나이', R => f(R.dAge)); line('은퇴 나이', R => f(R.rAge));
  line('1군 경기 수(평균)', R => f(R.g, 0)); line('1군 우승 수(평균)', R => f(R.titles, 2)); line('개인상 수(평균)', R => f(R.awards, 2));
  line('커리어 점수(평균)', R => f(R.score, 0)); line('커리어 점수: 가운데 (10%~90%)', R => pq(R.score, 0));
  line('하위 커리어: 1군 경기 20 미만', R => pct(R.g.map(x => (x < 20 ? 1 : 0)))); line('상위 커리어: 최고 OVR 80 이상', R => pct(R.peak.map(x => (x >= 80 ? 1 : 0)))); line('상위 커리어: 1군 우승 1번 이상', R => pct(R.titles.map(x => (x > 0 ? 1 : 0))));
  line('통산 수입(만, 평균)', R => f(R.earn, 0)); line('은퇴할 때 잔고(만, 평균. 상점을 쓰지 않은 값)', R => f(R.money, 0));
  for (const [label, tab, ids] of [['포지션', byRole, roles], ['리그', byReg, regs]]) {
    console.log(`\n${label}별 (${traits.map(name).join(' / ')})`);
    console.log(`| ${label} | 25세 OVR 가운데 | 최고 OVR 가운데 | 22→25세 증가 | 1군 데뷔 | 커리어 점수 평균 | 커리어 점수 하위 10% |`); console.log('|---|---|---|---|---|---|---|');
    for (const id of ids) console.log(`| ${id} | ${traits.map(t => q(tab[t][id].at[25], .5).toFixed(1)).join(' / ')} | ${traits.map(t => q(tab[t][id].peak, .5).toFixed(1)).join(' / ')} | ${traits.map(t => mean(tab[t][id].g2225).toFixed(1)).join(' / ')} | ${traits.map(t => (mean(tab[t][id].debut) * 100).toFixed(0) + '%').join(' / ')} | ${traits.map(t => mean(tab[t][id].score).toFixed(0)).join(' / ')} | ${traits.map(t => q(tab[t][id].score, .1).toFixed(0)).join(' / ')} |`);
  }
}

if (mode === 'proj') {
  /* 0.11.9 — 시즌 프로젝트의 크기. 정책: none = 사지 않음, camp = 살 수 있는 시즌마다 집중 캠프, fan = 시즌마다 팬 캠페인, shop = 프로젝트 없이 단계형 투자(장비·코치·식단)를 돈이 되는 대로.
     나머지 진행은 autoStep 그대로다. 프로젝트는 컨디션을 깎아 그 뒤의 휴식 시점이 달라지므로 커리어 하나하나가 짝은 아니다 → 분포로 본다. */
  const q = (a, p) => { const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
  const POL = ['none', 'camp', 'fan', 'shop'], rows = {}; for (const p of POL) rows[p] = { peak: [], o25: [], debut: [], dAge: [], g: [], titles: [], score: [], earn: [], spent: [], n: [], fame: [], money: [] };
  const t0 = Date.now();
  for (const seed of SEEDS) for (let i = 0; i < N; i++) for (const pol of POL) {
    for (const k in mem) delete mem[k]; mem.pg_tut_v1 = '1'; G._seen(); G.seed(seed * 1000003 + i);
    G.newGame({ nick: 'B', region: regs[Math.floor(i / roles.length) % regs.length], role: roles[i % roles.length], trait: traits[i % traits.length] });
    let n = 0, pk = 0, o25 = null, spent = 0, cnt = 0, fameMax = 0;
    while (!G.state().over && n++ < 30000) {
      const s = G.state(); const o = G.ovr(); if (o > pk) pk = o; if (s.age === 25 && o25 == null) o25 = o; if (s.fame > fameMax) fameMax = s.fame;
      if (!G.scene() && s.org) {
        if (pol === 'camp' || pol === 'fan') { const I = G.projInfo(), op = I.opts.find(x => x.id === pol); if (op.ok && G.buyProj(pol)) { spent += op.cost; cnt++; } }
        if (pol === 'shop') for (const id of ['gear', 'coach', 'care']) { const it = G.autoInfo().items.find(x => x.id === id); if (!it.max && s.money >= it.cost + 300 && G.buy(id)) spent += it.cost; }
      }
      G.autoStep();
    }
    const s = G.state(), c = s.car, R = rows[pol];
    R.peak.push(pk); if (o25 != null) R.o25.push(o25); R.debut.push(c.debut ? 1 : 0); if (c.debut) R.dAge.push(c.debut); R.g.push(c.g); R.titles.push(c.titles.filter(x => x.tier !== 'second').length); R.score.push(s.q[0].score); R.earn.push(c.earn); R.spent.push(spent); R.n.push(cnt); R.fame.push(fameMax); R.money.push(s.money);
  }
  console.log(`시즌 프로젝트의 크기 | 버전 ${G.VERSION} | 시드 ${SEEDS.join(',')} × 정책별 ${N}커리어 = 정책마다 ${SEEDS.length * N}커리어(세 성향·다섯 포지션·네 리그 고르게) | ${((Date.now() - t0) / 1000).toFixed(0)}초`);
  console.log('값은 평균±95% 신뢰구간. 자동 규칙(autoStep)의 결과이며 사람의 플레이와 다르다.\n');
  const NAME = { none: '사지 않음', camp: '매 시즌 집중 캠프', fan: '매 시즌 팬 캠페인', shop: '단계형 투자만(프로젝트 없음)' };
  console.log('| 지표 | ' + POL.map(p => NAME[p]).join(' | ') + ' |'); console.log('|---|' + POL.map(() => '---|').join(''));
  const line = (label, fn) => console.log(`| ${label} | ` + POL.map(p => fn(rows[p])).join(' | ') + ' |');
  line('산 횟수(커리어당)', R => f(R.n)); line('쓴 돈(만)', R => f(R.spent, 0)); line('통산 수입(만)', R => f(R.earn, 0)); line('쓴 돈 ÷ 통산 수입', R => (mean(R.spent) / mean(R.earn) * 100).toFixed(1) + '%');
  line('25세 OVR', R => f(R.o25)); line('최고 OVR', R => f(R.peak)); line('최고 OVR 가운데 (10%~90%)', R => `${q(R.peak, .5).toFixed(1)} (${q(R.peak, .1).toFixed(1)}~${q(R.peak, .9).toFixed(1)})`);
  line('1군 데뷔 비율', R => pct(R.debut)); line('1군 데뷔 나이', R => f(R.dAge)); line('1군 경기 수', R => f(R.g, 0)); line('1군 우승 수', R => f(R.titles, 2)); line('커리어 중 최고 인기', R => f(R.fame)); line('커리어 점수', R => f(R.score, 0));
}
