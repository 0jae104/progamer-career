/* 프로게이머 키우기 — 게임 엔진 (화면과 분리된 순수 로직. Node 에서도 실행 가능) */
(function (root) {
  const D = root.PG_DATA || require('./data.js');
  const VERSION = '0.11.1';   // index.html 의 ?v= 와 sw.js 의 VERSION 도 함께 올린다(test/sim.js 가 일치 여부를 검사)
  const B = D.BAL;
  const TUT = 'pg_tut_v1';   // 이 기기에서 처음 안내를 끝냈거나 건너뛴 적이 있으면 '1'
  const KEY = 'pg_career_v1', BAK = 'pg_career_v1_bak', BAD = 'pg_career_v1_bad', HALL = 'pg_hall_v1';
  const mem = {};
  let box = null;   // 백업 파일을 시험 삼아 돌려 볼 때(dryRun)만 쓰는 임시 저장소. 이 값이 있는 동안에는 실제 저장소를 읽지도 쓰지도 않는다
  const store = {
    get(k) { if (box) return k in box ? box[k] : null; try { if (root.localStorage) return root.localStorage.getItem(k); } catch (e) {} return mem[k] || null; },
    set(k, v) { if (box) { box[k] = v; return; } mem[k] = v; try { if (root.localStorage) root.localStorage.setItem(k, v); } catch (e) {} },
    del(k) { if (box) { delete box[k]; return; } delete mem[k]; try { if (root.localStorage) root.localStorage.removeItem(k); } catch (e) {} },
    // 브라우저 저장소에 실제로 쓸 수 있는지 (사생활 보호 모드, 용량 초과 등에서는 false)
    ok() { try { if (!root.localStorage) return false; root.localStorage.setItem('pg_probe', '1'); root.localStorage.removeItem('pg_probe'); return true; } catch (e) { return false; } },
  };
  let saveFailed = false;
  // 다른 탭 보호: 이 탭이 마지막으로 읽거나 쓴 커리어 저장의 원문. 저장소의 값이 이것과 다르면 다른 탭(또는 예전 버전의 탭)이 그 사이에 썼다는 뜻이다.
  // 그때는 이 탭의 오래된 상태로 덮어쓰지 않는다(화면이 새로 고침을 안내한다). 경기 계산·난수와는 무관하다.
  let seenRaw = store.get(KEY), conflict = false;
  const seen = () => { if (!box) { seenRaw = store.get(KEY); conflict = false; } };
  const stale = () => !box && (conflict || store.get(KEY) !== seenRaw);
  // 기록 보관(커리어 저장과 별개로 기기에 쌓인다)
  //   HALL  pg_hall_v1   : 예전 형식의 명예의 전당(상위 30명). 그대로 유지한다.
  //   LEG   pg_legacy_v1 : 은퇴한 커리어의 상세 기록. 기록마다 ID와 은퇴 시각이 있다.
  //   ACH   pg_ach_v1    : 도전 과제 달성 상태.
  const LEG = 'pg_legacy_v1', ACH = 'pg_ach_v1', LEG_MAX = 200, BACKUP_MAX = 3 * 1024 * 1024, BACKUP_FORMAT = 'progamer-career-backup';
  // 실제로 저장소에 쓰였는지 확인하며 쓴다(용량 초과·저장 차단이면 false)
  function put(k, v) { store.set(k, v); if (box) return true; try { return root.localStorage ? root.localStorage.getItem(k) === v : true; } catch (e) { return false; } }
  const txt = (v, n) => (typeof v === 'string' ? v.replace(/[<>]/g, '').slice(0, n) : '');
  const hash36 = str => { let h = 7; for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h.toString(36); };

  const MONTHS = [
    { m: 2, label: '스프링 1라운드', type: 'league', split: 'spring', rounds: [0, 5] },
    { m: 3, label: '스프링 2라운드', type: 'league', split: 'spring', rounds: [5, 10] },
    { m: 4, label: '스프링 최종전·플레이오프', type: 'league', split: 'spring', rounds: [10, 14], playoff: true },
    { m: 5, label: '미드시즌 컵', type: 'intl', cup: 'mid', split: 'spring' },
    { m: 6, label: '서머 1라운드', type: 'league', split: 'summer', rounds: [0, 5] },
    { m: 7, label: '서머 2라운드', type: 'league', split: 'summer', rounds: [5, 10] },
    { m: 8, label: '서머 최종전·플레이오프', type: 'league', split: 'summer', rounds: [10, 14], playoff: true },
    { m: 9, label: '네이션스컵·휴식기', type: 'nations' },
    { m: 10, label: '월드 파이널', type: 'intl', cup: 'world', split: 'summer' },
    { m: 11, label: '시상식·스토브리그', type: 'off' },
  ];
  const SPLIT = { spring: '스프링', summer: '서머' };
  const SQUAD = { trainee: '연습생', second: '2군', first: '1군' };

  let S = null, backupNext = false;
  // 난수. 평소에는 Math.random, 테스트에서는 seed(n) 으로 같은 결과를 다시 만들 수 있다.
  let rnd = Math.random;
  function seed(n) {
    if (n == null) { rnd = Math.random; return; }
    let a = n >>> 0;
    rnd = function () { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += rnd(); return (u - 3) / 0.7071; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = a => a[Math.floor(rnd() * a.length)];
  const sg = v => (v > 0 ? '+' : '') + (Math.round(v * 10) / 10);
  const r100 = v => Math.round(v / 100) * 100;

  function fmtMoney(v) {
    v = Math.round(v); const neg = v < 0; v = Math.abs(v);
    let s;
    if (v >= 10000) { const e = Math.floor(v / 10000), r = v % 10000; s = e + '억' + (r ? ' ' + r.toLocaleString('ko-KR') + '만' : ''); }
    else s = v.toLocaleString('ko-KR') + '만';
    return (neg ? '-' : '') + s;
  }
  const role = () => D.ROLES.find(r => r.id === S.role);
  const org = () => D.ORG[S.org];
  const region = () => D.REGION[org().region];
  const statName = k => D.STATS.find(s => s.id === k).name;
  const has = p => S.perks.includes(p);
  const str = (id, tier) => S.orgStr[id] - (tier === 'second' ? 16 : 0);
  function ovr() { const w = role().w; let t = 0; for (const k in w) t += w[k] * S.stats[k]; return t; }
  function isStarter() { return S.squad === 'first' ? S.trust >= 45 : S.squad === 'second' ? S.trust >= 30 : false; }
  function addFame(v) { if (v > 0) v *= (has('star') ? 1.5 : 1) * (1 - S.fame / 115); S.fame = clamp(S.fame + v, 0, 100); }
  function addTrust(v) { if (v > 0 && has('glue')) v *= 1.3; S.trust = clamp(S.trust + v, 0, 100); }
  function setCond(v) { S.cond = clamp(v, has('form') ? 55 : 0, 100); }
  function addWrist(v) { if (v < 0 && has('steel')) v *= .5; S.wrist = clamp(S.wrist + v, 0, 100); }
  function log(msg, tone) { S.log.unshift({ y: S.year, m: MONTHS[S.m].m, msg, tone: tone || '' }); if (S.log.length > 40) S.log.pop(); }
  function earn(v) { S.money += v; if (v > 0) S.car.earn += v; }
  const info = (title, text, tone, lines) => ({ type: 'info', title, text, tone: tone || '', lines: lines || [] });

  function applyFx(fx) {
    const out = [];
    for (const k in fx) {
      let v = fx[k];
      if (k === 'buff') { S.buff = { r: v[0], m: v[1] }; out.push(`${v[1]}개월간 경기력 ${v[0] > 0 ? '상승' : '하락'}`); }
      else if (k === 'money') {
        if (v === 'ad') v = 300 + Math.round(S.fame) * 20;
        if (v === 'collab') v = 100 + Math.round(S.fame) * 5;
        earn(v); out.push(`자금 ${v > 0 ? '+' : '-'}${fmtMoney(Math.abs(v))}`);
      }
      else if (k === 'cap') { for (const s of D.STATS) S.caps[s.id] = Math.min(99, S.caps[s.id] + v); out.push(`모든 한계 +${v}`); }
      else if (k === 'all') { for (const s of D.STATS) S.stats[s.id] = clamp(S.stats[s.id] + v, 1, 99); out.push(`모든 능력치 +${v}`); }
      else if (k === 'flag') { S.flags[v] = S.year; if (v === 'scout') out.push('스토브리그에 1군 제안이 올 수 있다'); }
      else if (k === 'weak') {   // 가장 낮은 능력치를 올린다
        const low = D.STATS.map(x => x.id).sort((a, b) => S.stats[a] - S.stats[b])[0];
        S.stats[low] = Math.min(99, S.stats[low] + v); out.push(`${statName(low)} ${sg(v)}`);
      }
      else if (k === 'cond') { setCond(S.cond + v); out.push(`컨디션 ${sg(v)}`); }
      else if (k === 'wrist') { addWrist(v); out.push(`손목 ${sg(v)}`); }
      else if (k === 'trust') { addTrust(v); out.push(`${S.squad === 'trainee' ? '코치 평가' : '감독 신뢰'} ${sg(v)}`); }
      else if (k === 'fame') { addFame(v); out.push(`인기 ${sg(v)}`); }
      else {
        const cur = S.stats[k];
        S.stats[k] = v > 0 ? Math.max(cur, Math.min(cur + v, S.caps[k] + 2, 99)) : Math.max(1, cur + v);
        out.push(`${statName(k)} ${sg(v)}`);
      }
    }
    return out;
  }

  function chance(chk) {
    const bd = [['기본', chk.base]]; let p = chk.base;
    for (const k in chk) {
      if (k === 'base') continue;
      if (k === 'trust') { const v = Math.round((S.trust - 50) * .3 * chk[k]); p += v; bd.push(['감독 신뢰 ' + Math.round(S.trust), v]); }
      else if (k === 'cond') { const v = Math.round((S.cond - 60) * .25 * chk[k]); p += v; bd.push(['컨디션 ' + Math.round(S.cond), v]); }   // 포지션 전용 승부처의 과감한 선택에만 쓰인다
      else { const v = Math.round((S.stats[k] - 50) * .6 * chk[k]); p += v; bd.push([statName(k) + ' ' + Math.floor(S.stats[k]), v]); }
    }
    if (has('nerve')) { p += 8; bd.push(['강심장', 8]); }
    if (S.pity > 0) { const v = Math.min(18, S.pity * 6); p += v; bd.push(['연속 불운 보정', v]); }
    return { p: clamp(Math.round(p), 5, 95), bd };
  }

  /* ---------- 시작 ---------- */
  function newGame(o) {
    const r = D.ROLES.find(x => x.id === o.role);
    if (stale()) { conflict = true; return; }
    store.del(BAK);
    S = {
      v: 1, cid: 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1679616).toString(36), nick: (String(o.nick || '').replace(/[<>&"'`]/g, '').trim() || 'Player').slice(0, 12), home: o.region, role: o.role, trait: o.trait,
      age: 16, year: 1, m: 0, stats: {}, caps: {}, cond: 80, trust: 30, fame: 0, money: 100, wrist: 100,
      org: null, squad: 'trainee', contract: { salary: 600, years: 3 }, plan: 'solo', monthsInOrg: 0,
      perks: [], shop: { gear: 0, coach: 0, care: 0 }, used: {}, buff: null, injury: 0, pity: 0, recentEv: [],
      orgStr: {}, lg: null, dom: {}, yr: null, hist: [], log: [], q: [], flags: {}, opt: { fast: false },
      car: { g: 0, w: 0, rs: 0, mvp: 0, k: 0, d: 0, a: 0, g2: 0, titles: [], awards: [], peak: 0, earn: 0, orgs: [], inj: 0, moves: 0, debut: 0, tryouts: 0, retry: 0 },
      stat: { turns: 0, t0: Date.now(), t20: 0, ev20: 0 },
      rivals: [], rivalSeq: 0, evn: {}, fan: { g: 0, st: 0, seen: [] },
      tut: { p: 0, g: 0, r: 0, done: store.get(TUT) === '1' },   // 처음 안내: 계획·목표·보고서 안내를 봤는지
      pendingSim: false, pendingNewYear: false, over: false, sim: null, recentMom: [],
    };
    const t = gauss(), talent = t * B.talentSd;
    S.grow = clamp(1 + t * B.talentGrow, .7, 1.3);   // 숨은 재능은 한계뿐 아니라 성장 속도에도 작용한다
    for (const s of D.STATS) {
      const w = r.w[s.id];
      let v = 34 + rnd() * 8 + w * 45, c = B.capBase + talent + rnd() * B.capRand + w * B.capRole;
      if (o.trait === 'genius') { if (s.id === 'mech' || s.id === 'reflex') { v += 4; c += 5; } if (s.id === 'mental') v -= 4; }
      if (o.trait === 'grinder') { v += 1; c -= 1; }
      if (o.trait === 'brain') { if (s.id === 'sense') { v += 5; c += 6; } if (s.id === 'pool') { v += 3; c += 5; } if (s.id === 'mental') c += 2; }
      S.stats[s.id] = v; S.caps[s.id] = clamp(c, 55, 99);
    }
    for (const g of D.ORGS) S.orgStr[g.id] = g.str;
    const list = D.ORGS.filter(g => g.region === o.region);
    const picks = [list[ri(0, 1)], list[ri(3, 4)], list[ri(6, 7)]];
    const notes = ['명문 구단. 코치진이 좋아 성장이 가장 빠르다. 다만 기준이 높아 이 팀 1군에 오르기는 매우 어렵고, 실력을 키운 뒤 다른 팀에서 데뷔하는 길도 생각해야 한다.', '중위권 구단. 성장과 기회의 균형이 좋다.', '하위권 구단. 성장은 더디지만 콜업 기준이 낮아 데뷔가 빠르다. 팀 전력은 약하다.'];
    S.q.push({ type: 'pickOrg', offers: picks.map((g, i) => ({ org: g.id, name: g.name, str: g.str, note: notes[i], need2: Math.ceil(g.str - B.toSecondGap), need1: Math.ceil(g.str - B.toFirstGap) })) });
    save(); return S;
  }

  function startYear() {
    for (const g of D.ORGS) S.orgStr[g.id] = clamp(S.orgStr[g.id] + gauss() * 2.2 + (g.str - S.orgStr[g.id]) * .25, 58, 96);
    S.m = 0; S.dom = { spring: {}, summer: {} };
    backupNext = true;
    S.yr = { g: 0, w: 0, rs: 0, mvp: 0, g1: 0, rs1: 0, titles: [], awards: [] };
    setupSplit('spring');
  }

  function setupSplit(split) {
    if (S.squad === 'trainee') { S.lg = null; return; }
    const ids = D.ORGS.filter(g => g.region === org().region).map(g => g.id).sort(() => rnd() - .5);
    const arr = ids.slice(), half = [];
    for (let r = 0; r < 7; r++) {
      const round = []; for (let i = 0; i < 4; i++) round.push([arr[i], arr[7 - i]]);
      half.push(round); arr.splice(1, 0, arr.pop());
    }
    const w = {}, l = {}; ids.forEach(i => { w[i] = 0; l[i] = 0; });
    S.lg = { split, tier: S.squad, ids, w, l, rounds: half.concat(half), sg: 0, srs: 0 };
  }

  function table() {
    if (!S || !S.lg) return [];
    const L = S.lg;
    return L.ids.map(id => ({ id, name: D.ORG[id].name, tag: D.ORG[id].tag, color: D.ORG[id].color, w: L.w[id], l: L.l[id], me: id === S.org }))
      .sort((a, b) => b.w - a.w || a.l - b.l || S.orgStr[b.id] - S.orgStr[a.id]);
  }

  /* ---------- 경기 ---------- */
  const winP = (eff, O) => 1 / (1 + Math.pow(10, (O - eff) / 16));
  // 내가 출전했을 때 팀의 실제 전력. mod.s 는 승부처 선택으로 생긴 그 세트 한정 보정이다.
  // 포지션별 경기 영향력: 기준보다 잘하는 만큼만 배율이 붙는다(못할 때의 손해는 포지션과 무관하게 같다).
  const carried = d => d > 0 ? d * (B.carry[S.role] || 1) : d;
  function effStr(T, plays, mod) {
    if (!plays) return T;
    return T + carried(ovr() - T) * B.impact + (S.cond - 60) / 40 * 1.2 + (has('dynasty') ? 2 : 0) + (mod ? mod.s : 0);
  }
  function playGame(T, O, stage, plays, mod) {
    const o = ovr(), cadj = (S.cond - 60) / 40;
    const g = { win: rnd() < winP(effStr(T, plays, mod), O), plays, r: 0, k: 0, d: 0, a: 0 };
    if (plays) {
      let r = 6.3 + carried(o - (T + O) / 2) / 11 + cadj * .5 + (g.win ? .45 : -.45) + gauss() * .75 + (S.buff ? S.buff.r : 0) + (mod ? mod.r : 0);
      if (stage !== 'league') { r += (S.stats.mental - 65) / 50; if (has('clutch')) r += .4; }
      g.r = clamp(Math.round(r * 10) / 10, 3, 10);
      const bk = { gun: 6, core: 5, rov: 4, van: 3, sup: 1 }[S.role], ba = { sup: 11, rov: 8, van: 7, core: 6, gun: 5 }[S.role];
      const f = Math.pow(g.r / 6.5, 1.5);
      g.k = Math.round(bk * f * (.6 + rnd() * .8)); g.a = Math.round(ba * f * (.6 + rnd() * .8));
      g.d = Math.max(0, Math.round(3.2 / f * (.5 + rnd())));
    }
    return g;
  }
  const decidePlays = () => S.injury > 0 ? false : (isStarter() || rnd() < .2);

  function record(m, first, stage) {
    if (!m.plays) { addTrust(.2); return; }
    const y = S.yr, c = S.car;
    y.g++; y.rs += m.r; if (m.win) y.w++;
    m.mvp = m.win && m.r >= (B.mvpAt[S.role] || 8) && rnd() < .5;
    if (m.mvp) y.mvp++;
    if (first) {
      y.g1++; y.rs1 += m.r; c.g++; c.rs += m.r; if (m.win) c.w++;
      c.k += m.k; c.d += m.d; c.a += m.a;
      if (m.win) addFame(stage === 'league' ? .12 : .4);
      if (m.mvp) { c.mvp++; addFame(.5); }
    } else c.g2++;
    addTrust((m.r - 6) * 2);
    setCond(S.cond - 1); addWrist(-.6);
    if (S.lg && stage === 'league') { S.lg.sg++; S.lg.srs += m.r; }
  }

  /* ---------- 토너먼트(플레이오프·국제전·네이션스컵)와 승부처 ----------
     대진과 진행 위치를 S.sim.tour 에 두고 세트 단위로 진행한다. 승부처가 나오면 장면을 띄우고 멈췄다가
     선택 뒤 같은 자리에서 이어 간다. 상태가 전부 S 안에 있어서 도중에 저장·불러오기를 해도 같은 경기가 이어지고,
     판정은 선택하는 순간 한 번만 일어난 뒤 바로 저장되므로 다시 불러와도 결과가 두 번 적용되지 않는다. */
  const tStr = (t, id) => t.kind === 'nations' ? t.teams[id].s : t.kind === 'playoff' ? str(id, t.tier) : S.orgStr[id];
  const tName = (t, id) => t.kind === 'nations' ? t.teams[id].name : D.ORG[id].name;
  const tRef = (t, x) => (x && typeof x === 'object') ? t.w[x.w] : x;
  const newSeries = () => ({ x: 0, y: 0, plays: decidePlays(), rs: 0, n: 0, k: 0, d: 0, a: 0, mom: 0, mod: null, asked: -1, used: [], moms: [], sets: [], shown: 0 });

  /* ---------- 경기 전 전략(0.11.0) ----------
     내가 출전하는 토너먼트 시리즈(플레이오프·국제전·네이션스컵)가 시작될 때 전략을 하나 고른다. 고른 전략은 그 시리즈의 세트에만,
     세트마다 한 번씩, 팀 전력에 작은 보정(절댓값 B.tac.cap 이하)으로 들어가고 시리즈가 끝나면 사라진다(c.tac 은 시리즈 상태 안에 있다).
     - 난수를 쓰지 않는다. 보정은 세트 승률 계산에 더해질 뿐이고, 승패는 원래의 난수 한 번으로 정해진다.
     - 고르지 않으면(c.tac 이 '' 또는 없음) 보정이 0이고 판정이 0.10.2와 글자 단위로 같다. 예전 저장의 진행 중 시리즈, 빠른 진행, 자동 진행이 여기에 해당한다.
     - 정규 리그 경기는 한 달 치를 한꺼번에 계산하고 상대를 미리 알려 주는 구조가 아니라서 적용하지 않는다(없는 대진을 지어내지 않는다). */
  const TAC = { press: 1, steady: 1, wait: 1 };
  function tacS(c, T, O) {
    const id = c && c.tac; if (!id || !TAC[id]) return 0;
    const K = B.tac, base = winP(effStr(T, true), O), lead = c.x - c.y;
    let v = 0;
    if (id === 'press') v = lead >= 0 ? clamp(K.press[0] + (S.cond - 60) / K.press[1], K.press[2], K.press[3]) : K.press[4];   // 앞서거나 동률일 때 컨디션만큼 밀어붙인다. 뒤지면 무리수가 된다
    else if (id === 'steady') v = base >= K.fav ? K.steady[0] : base > 1 - K.fav ? K.steady[1] : K.steady[2];                    // 전력이 앞설 때 실수를 줄인다. 열세면 말려 들어간다
    else if (id === 'wait') v = lead < 0 ? K.wait[0] : base <= 1 - K.fav ? K.wait[3] : lead === 0 ? K.wait[1] : K.wait[2];             // 뒤질 때와 전력이 밀릴 때 받아친다. 전력이 앞서는데 기다리면 주도권을 내준다
    return clamp(v, -K.cap, K.cap);
  }
  const tacMod = (c, T, O, m) => { const ts = tacS(c, T, O); return ts ? { s: (m ? m.s : 0) + ts, r: m ? m.r : 0 } : m; };
  const pips = c => (c.sets || []).map(x => (x.w ? 'W' : 'L')).join('');
  function prematchScene(t, m, c, T, O, opp) {
    const pct = v => Math.round(v * 100), base = winP(effStr(T, true), O), meO = t.kind === 'nations' ? null : D.ORG[t.me], opO = t.kind === 'nations' ? null : D.ORG[opp];
    const rv = t.kind === 'nations' ? [] : rivalsAlive().filter(r => r.org === opp && r.squad === (t.kind === 'playoff' ? t.tier : 'first') && !r.out);
    return {
      type: 'prematch', tour: t.name, label: m.label, bo: m.bo, me: tName(t, t.me), opp: tName(t, opp),
      meTag: meO ? meO.tag : '', oppTag: opO ? opO.tag : '', meColor: meO ? meO.color : '', oppColor: opO ? opO.color : '',
      base: pct(base), cond: Math.round(S.cond), role: role().name,
      rival: rv.map(r => r.nick).join(', '), h2h: rv.length ? `${rv[0].nick}와의 통산 ${rv[0].w}승 ${rv[0].l}패` : '',
      tacs: D.TACTICS.map(k => ({ id: k.id, p: pct(winP(effStr(T, true, { s: tacS({ tac: k.id, x: 0, y: 0 }, T, O), r: 0 }), O)) })),
    };
  }
  function matchScene(t, m, c, rec, opp, adv) {
    const meO = t.kind === 'nations' ? null : D.ORG[t.me], opO = t.kind === 'nations' ? null : D.ORG[opp], v = (rec.rv || [])[0];
    return {
      type: 'match', tour: t.name, label: m.label, bo: m.bo, me: tName(t, t.me), opp: rec.opp, win: rec.win, x: c.x, y: c.y,
      meTag: meO ? meO.tag : '', oppTag: opO ? opO.tag : '', meColor: meO ? meO.color : '', oppColor: opO ? opO.color : '',
      sets: c.sets.map(x => ({ w: !!x.w, d: x.d })), from: Math.min(c.shown || 0, c.sets.length), tac: c.tac || '',
      r: rec.r, k: rec.k, d: rec.d, a: rec.a, mvp: !!rec.mvp, moms: c.moms.map(x => ({ title: x.title, label: x.label, ok: x.ok, auto: !!x.auto })),
      rival: v ? `${v.nick}의 ${rec.opp}와(과) 통산 ${v.w}승 ${v.l}패` : '',
      next: rec.win ? (adv ? '다음 라운드 진출' : m.label === '결승' ? '우승' : '시리즈 승리') : (m.label === '결승' ? '준우승' : '이 대회는 여기까지'),
    };
  }

  // 승부처가 나오는 세트: 결승은 어느 한쪽이 매치 포인트인 세트마다(시리즈당 최대 3회), 그 밖의 시리즈는 마지막 세트 1회
  function momentDue(m, c, need) {
    if (!c.plays) return false;
    const last = c.x === need - 1 && c.y === need - 1;
    return m.label === '결승' ? (c.x === need - 1 || c.y === need - 1) && c.mom < 3 : last && c.mom < 1;
  }
  function momentScene(t, m, c, need, T, O, opp) {
    const sit = c.x === need - 1 && c.y === need - 1 ? 'last' : c.x === need - 1 ? 'match' : 'elim';
    // 후보: 이 시리즈와 최근에 나오지 않은 상황 가운데 지금 상황(sit)에 맞는 것. 내 포지션 전용 상황이 있으면 B.roleMoment 확률로 그쪽에서 고른다.
    const fit = D.MOMENTS.filter(x => !c.used.includes(x.id) && !S.recentMom.includes(x.id) && (x.sit === 'any' || x.sit === sit) && (!x.role || x.role === S.role));
    const own = fit.filter(x => x.role);
    let pool = fit.filter(x => !x.role);
    if (own.length && (!pool.length || rnd() < B.roleMoment)) pool = own;
    else { const exact = pool.filter(x => x.sit === sit); if (exact.length && rnd() < .5) pool = exact; }
    if (!pool.length) pool = D.MOMENTS.filter(x => !x.role && x.sit === 'any' && !c.used.includes(x.id));
    const mo = pick(pool), pct = v => Math.round(v * 100);
    c.used.push(mo.id); S.recentMom.push(mo.id); while (S.recentMom.length > B.momentMemory) S.recentMom.shift();
    const ts = tacS(c, T, O);
    const sc = {
      type: 'moment', mid: mo.id, tour: t.name, label: m.label, bo: m.bo, set: c.x + c.y + 1, me: tName(t, t.me), opp: tName(t, opp), x: c.x, y: c.y, sit,
      rival: t.kind === 'nations' ? '' : rivalsAlive().filter(r => r.org === opp && r.squad === (t.kind === 'playoff' ? t.tier : 'first') && !r.out).map(r => r.nick).join(', '),
      title: mo.title, text: mo.text, base: pct(winP(effStr(T, true, ts ? { s: ts } : null), O)),
      choices: mo.c.map(ch => {
        const k = chance(ch.chk);
        return { label: ch.label, p: k.p, bd: k.bd, up: pct(winP(effStr(T, true, { s: ch.s[0] + ts }), O)), down: pct(winP(effStr(T, true, { s: ch.s[1] + ts }), O)) };
      }),
    };
    if (c.tac !== undefined) { sc.tac = c.tac || ''; sc.pips = pips(c); sc.from = Math.min(c.shown || 0, (c.sets || []).length); }   // 전략 흐름으로 시작한 시리즈: 화면이 지금까지의 세트를 보여 준다
    return sc;
  }
  // 자동 판단: 기대 세트 승률이 가장 높은 선택
  function bestChoice(sc) { let b = 0, bv = -1; sc.choices.forEach((c, i) => { const v = c.p * c.up + (100 - c.p) * c.down; if (v > bv) { bv = v; b = i; } }); return b; }
  // 화면에 표시한 확률 그대로 한 번 판정한다.
  function decideMoment(sc, i, c, auto) {
    const ch = D.MOMENTS.find(x => x.id === sc.mid).c[i], ok = rnd() * 100 < sc.choices[i].p;
    S.pity = ok ? 0 : S.pity + 1;
    const s = ch.s[ok ? 0 : 1];
    c.mod = { s, r: s * .06 };
    c.moms.push({ title: sc.title, label: ch.label, ok, auto: !!auto });
    return { ok, s, label: ch.label, text: ok ? ch.ok : ch.no };
  }
  function playSet(t, c, T, O) {
    const ts = c.plays ? tacS(c, T, O) : 0;
    const d = ts ? Math.round((winP(effStr(T, true, { s: (c.mod ? c.mod.s : 0) + ts }), O) - winP(effStr(T, true, c.mod), O)) * 100) : 0;   // 전략이 이 세트 승률을 몇 %p 바꿨는가(기록용)
    const g = playGame(T, O, t.stage, c.plays, ts ? tacMod(c, T, O, c.mod) : c.mod); c.mod = null;
    g.win ? c.x++ : c.y++;
    if (c.sets) c.sets.push({ w: g.win ? 1 : 0, d });
    if (c.plays) { c.rs += g.r; c.n++; c.k += g.k; c.d += g.d; c.a += g.a; }
    return g;
  }
  // 반환: true 대회가 끝남, false 승부처 장면을 띄우고 멈춤
  function runTour(t) {
    while (t.i < t.ms.length) {
      const m = t.ms[t.i], a = tRef(t, m.a), b = tRef(t, m.b), need = Math.min(4, (m.bo + 1) / 2);   // 3·5전제에서는 2·3 그대로. 상한은 손상된 저장이 끝나지 않는 시리즈를 만들지 못하게 하는 안전장치
      if (!t.me || (a !== t.me && b !== t.me)) {
        const p = winP(tStr(t, a), tStr(t, b)); let x = 0, y = 0;
        while (x < need && y < need) rnd() < p ? x++ : y++;
        t.w[t.i++] = x > y ? a : b; continue;
      }
      const opp = a === t.me ? b : a, T = tStr(t, t.me), O = tStr(t, opp);
      if (!t.cur) {
        t.cur = newSeries();
        // 내가 출전하는 시리즈: 전략을 묻고 멈춘다. 빠른 진행에서는 묻지 않는다(승부처와 같은 규칙. 판정은 예전과 같다).
        if (t.cur.plays && !S.opt.fast) { t.cur.tac = null; S.q.push(prematchScene(t, m, t.cur, T, O, opp)); return false; }
      }
      const c = t.cur;
      if (c.tac === null) { if (S.q.some(x => x.type === 'prematch')) return false; c.tac = ''; }   // 전략 선택을 기다리는 중(장면이 사라진 손상 저장이면 전략 없이 진행)
      while (c.x < need && c.y < need) {
        const set = c.x + c.y;
        if (c.asked !== set && momentDue(m, c, need)) {
          c.asked = set; c.mom++;
          const sc = momentScene(t, m, c, need, T, O, opp);
          if (!S.opt.fast) { S.q.push(sc); return false; }
          decideMoment(sc, bestChoice(sc), c, true);
        }
        playSet(t, c, T, O);
      }
      const win = c.x > c.y;
      const rec = { opp: tName(t, opp), win, plays: c.plays, r: c.n ? Math.round(c.rs / c.n * 10) / 10 : 0, k: c.k, d: c.d, a: c.a, label: m.label, score: c.x + '-' + c.y, moms: c.moms };
      record(rec, t.first, t.stage); t.lines.push(rec);
      if (t.kind !== 'nations') rivalMatch(opp, t.kind === 'playoff' ? t.tier : 'first', rec, `${S.year}-${S.m}-${t.kind}${t.i}`, T, O, t.name);
      if (c.plays && c.tac !== undefined && c.sets) {
        const adv = win && t.ms.slice(t.i + 1).some(x => (x.a && x.a.w === t.i) || (x.b && x.b.w === t.i));
        S.q.push(matchScene(t, m, c, rec, opp, adv));   // 시리즈 결과 장면(판정은 이미 끝났다. 화면은 이 기록만 읽는다)
      }
      t.w[t.i++] = win ? t.me : opp; t.cur = null;
    }
    return true;
  }
  const newTour = (o) => Object.assign({ w: [], i: 0, cur: null, lines: [] }, o);

  // 뉴스 헤드라인: 우승, 라이벌과의 결승, 1군 이적, 은퇴에 한 줄. 이미 있는 화면과 소식 목록에 붙이고 새 화면은 만들지 않는다.
  const teamName = () => (S.sim && S.sim.tour && S.sim.tour.kind === 'nations' ? D.REGION[S.home].name + ' 대표팀' : org().name);
  function title(name, tier, fin) {
    S.car.titles.push({ y: S.year, name, tier }); S.yr.titles.push(name);
    const fame = { world: 14, mid: 8, nations: 10, dom: 5, second: 1 }[tier];
    const prize = { world: 20000, mid: 8000, nations: 3000, dom: 3000, second: 200 }[tier];
    addFame(fame); earn(prize); log(`${name}! 상금 ${fmtMoney(prize)}`, 'gold');
    const sc = info('우승', name, 'gold', [`상금 ${fmtMoney(prize)}`, `인기 상승`]);
    sc.cele = 1;   // 우승 연출: 1 아직 재생 전, 2 재생함(다시 열어도 연출 없이 같은 내용만 보여 준다)
    sc.news = `${teamName()}, ${name}` + (fin && fin.plays ? ` — 결승 ${fin.score}, ${S.nick} 평점 ${fin.r.toFixed(1)}` : '');
    return sc;
  }
  function award(name, fame) { S.car.awards.push({ y: S.year, name }); S.yr.awards.push(name); addFame(fame); log(`${name} 수상`, 'gold'); }

  function npcFinalists(rid) {
    const a = D.ORGS.filter(g => g.region === rid).map(g => ({ id: g.id, s: S.orgStr[g.id] + gauss() * 4 })).sort((x, y) => y.s - x.s);
    return { champ: a[0].id, runner: a[1].id };
  }

  // 1군 콜업 심사에서 자리가 날 확률. 자격(OVR, 감독 신뢰)을 못 채우면 0.
  function slotChance() {
    const gap = ovr() - (S.orgStr[S.org] - B.toFirstGap);
    if (S.squad !== 'second' || gap < 0 || S.trust < B.toFirstTrust) return 0;
    return clamp(B.slotBase + gap * B.slotPerOvr, B.slotBase, B.slotMax);
  }
  // 승격·강등 심사. 스플릿이 끝날 때(4월, 8월)와 스토브리그(11월)에 한 번씩 한다.
  function evaluateSquad(after, notes) {
    const o = ovr(), base = S.orgStr[S.org], pay = region().pay;
    if (S.squad === 'trainee') {
      if (S.monthsInOrg >= B.toSecondMonths && o >= base - B.toSecondGap && S.trust >= B.toSecondTrust) {
        S.squad = 'second'; S.trust = 40; S.contract.salary = Math.max(S.contract.salary, r100(2400 * pay)); S.contract.years = Math.max(S.contract.years, 2);
        after.push(info('2군 콜업', `${org().name} 2군 로스터에 이름을 올렸다. 다음 스플릿부터 ${region().lg} 넥스트에 출전한다.`, 'good'));
        log('2군 콜업. 연습생 딱지를 뗐다.', 'good');
      }
    } else if (S.squad === 'second') {
      const p = slotChance();
      if (p > 0) {
        const ok = rnd() < p, pct = Math.round(p * 100);
        S.flags.lastEval = { y: S.year, m: MONTHS[S.m].m, p: pct, ok };
        // 같은 구단 2군에 같은 포지션 라이벌이 기준을 넘겨 있으면 한 자리를 두고 다툰 것으로 기록한다(내 확률은 그대로다).
        const rv = rivalsAlive().find(r => r.org === S.org && r.squad === 'second' && r.role === S.role && !r.out && r.ovr >= base - B.toFirstGap);
        if (rv) {
          rv.f.skip = S.stat.turns;
          if (ok) { rRel(rv, 6, 2); rNote(rv, '1군 한 자리를 두고 다퉜고, 올라간 것은 나였다.', 'good', true); }
          else {
            rv.squad = 'first'; if (!rv.debut) rv.debut = rv.age; rv.f.ahead = S.year; rRel(rv, 10, 0);
            rNote(rv, '1군 한 자리를 두고 다퉜고, 올라간 것은 저쪽이었다.', 'bad', true);
          }
        }
        if (ok) {
          S.squad = 'first'; S.trust = 30; if (!S.car.debut) { S.car.debut = S.age; S.car.via = 'callup'; } S.contract.salary = Math.max(S.contract.salary, r100(salaryFor(org(), o) * .5)); S.contract.years = Math.max(S.contract.years, 2);
          after.push(info('1군 콜업', `${rv ? `같은 포지션의 ${rv.nick}을(를) 제치고 ` : ''}${org().name} 1군에 합류했다. 감독 신뢰 45 이상이면 주전으로 나선다. 자리는 스스로 만들어야 한다.`, 'good'));
          log('1군 콜업. 꿈의 무대가 눈앞이다.', 'good');
        } else {
          const msg = rv ? `1군 콜업 심사: 한 자리는 같은 포지션의 ${rv.nick}에게 돌아갔다(내가 뽑힐 확률 ${pct}%). OVR을 더 올리면 확률이 오른다.`
            : `1군 콜업 심사: 기준은 넘었지만 이번에는 자리가 나지 않았다(자리가 날 확률 ${pct}%). OVR을 더 올리면 확률이 오른다.`;
          log(msg); if (notes) notes.push(msg);
        }
      }
    } else if (S.trust < B.demoteTrust && o < base - B.demoteGap) {
      S.squad = 'second'; S.trust = 45;
      after.push(info('2군행 통보', '감독이 2군에서 다시 증명하고 오라고 했다.', 'bad'));
      log('2군으로 내려갔다.', 'bad');
    }
  }

  function leagueMonth(mi, sim) {
    const L = S.lg, rep = sim.rep;
    if (!L) {
      rep.notes.push('연습생 평가전과 훈련으로 한 달을 보냈다.');
      if (mi.playoff) { for (const r of D.REGIONS) S.dom[mi.split][r.id] = npcFinalists(r.id); evaluateSquad(sim.after, rep.notes); }
      return;
    }
    const first = L.tier === 'first';
    for (let r = mi.rounds[0]; r < mi.rounds[1]; r++) for (const [a, b] of L.rounds[r]) {
      let win;
      if (a === S.org || b === S.org) {
        const opp = a === S.org ? b : a, plays = decidePlays();
        const g = playGame(str(S.org, L.tier), str(opp, L.tier), 'league', plays);
        const m = Object.assign(g, { opp: D.ORG[opp].name }); record(m, first, 'league'); rep.matches.push(m);
        rivalMatch(opp, L.tier, m, `${S.year}-${S.m}-L${r}`, str(S.org, L.tier), str(opp, L.tier));
        win = g.win ? S.org : opp;
      } else win = rnd() < 1 / (1 + Math.pow(10, (S.orgStr[b] - S.orgStr[a]) / 16)) ? a : b;
      const lose = win === a ? b : a; L.w[win]++; L.l[lose]++;
    }
    if (!mi.playoff) return;
    const rank = table(), top = rank.slice(0, 4).map(x => x.id), my = rank.findIndex(x => x.me) + 1;
    const lgTag = region().lg + (first ? '' : ' 넥스트');
    rep.notes.push(`${lgTag} ${SPLIT[mi.split]} 정규 리그 ${my}위.`);
    sim.tour = newTour({
      kind: 'playoff', stage: 'playoff', tier: L.tier, first, me: S.org, split: mi.split, lgTag, my, name: `${lgTag} ${SPLIT[mi.split]} 플레이오프`,
      ms: [{ a: top[0], b: top[3], bo: 3, label: '준결승' }, { a: top[1], b: top[2], bo: 3, label: '준결승' }, { a: { w: 0 }, b: { w: 1 }, bo: 5, label: '결승' }],
    });
  }

  function intlMonth(mi, sim) {
    const q = S.dom[mi.split], regs = D.REGIONS.map(r => r.id), name = mi.cup === 'world' ? '월드 파이널' : '미드시즌 컵';
    const champs = regs.map(r => q[r].champ), runners = regs.map(r => q[r].runner), off = ri(1, 3);
    const inIt = S.squad === 'first' && (champs.includes(S.org) || runners.includes(S.org));
    const ms = regs.map((_, i) => ({ a: champs[i], b: runners[(i + off) % 4], bo: 5, label: '8강' }));
    ms.push({ a: { w: 0 }, b: { w: 1 }, bo: 5, label: '4강' }, { a: { w: 2 }, b: { w: 3 }, bo: 5, label: '4강' }, { a: { w: 4 }, b: { w: 5 }, bo: 5, label: '결승' });
    sim.tour = newTour({ kind: 'intl', stage: 'intl', first: true, me: inIt ? S.org : null, cup: mi.cup, name, ms });
  }

  function nationsMonth(sim) {
    const rep = sim.rep;
    if (S.year % 2) { rep.notes.push('리그 휴식기. 팀 훈련으로 서머의 피로를 풀었다.'); return; }
    const me = D.REGION[S.home], others = D.REGIONS.filter(r => r.id !== S.home).sort(() => rnd() - .5);
    const sel = S.squad === 'first' && isStarter() && S.injury === 0 && ovr() >= me.natThr;
    if (!sel) {
      const w = D.REGIONS.map(r => ({ r, s: r.nat + gauss() * 4 })).sort((a, b) => b.s - a.s)[0].r;
      rep.notes.push(`네이션스컵: ${w.name} 대표팀 우승. ${S.squad === 'first' ? '대표팀 명단에 내 이름은 없었다.' : ''}`); return;
    }
    log(`${me.name} 국가대표로 선발됐다.`, 'good');
    const teams = { me: { s: me.nat + 1.5, name: me.name + ' 대표팀' } };
    others.forEach((r, i) => { teams['n' + i] = { s: r.nat, name: r.name + ' 대표팀' }; });
    sim.tour = newTour({
      kind: 'nations', stage: 'intl', first: true, me: 'me', teams, name: '네이션스컵',
      ms: [{ a: 'me', b: 'n0', bo: 3, label: '준결승' }, { a: 'n1', b: 'n2', bo: 3, label: '준결승' }, { a: { w: 0 }, b: { w: 1 }, bo: 5, label: '결승' }],
    });
  }

  // 대회가 끝난 뒤 한 번만 실행된다: 경기 기록을 월간 보고에 옮기고 우승·수상을 처리한다.
  function tourEnd(t, sim) {
    const rep = sim.rep, after = sim.after, last = t.lines[t.lines.length - 1], ch = t.w[t.ms.length - 1];
    // 라이벌과 실제로 맞붙은 시리즈가 있을 때만 재회를 알린다(결승은 별도 화면, 그 밖은 월간 보고의 한 줄).
    for (const ln of t.lines) for (const v of (ln.rv || [])) {
      const r = rivalOf(v.id); if (!r) continue;
      if (ln.label === '결승') after.push(info('결승의 라이벌', `${t.name} 결승 상대는 ${r.nick}의 ${ln.opp}였다. ${ln.score}로 ${ln.win ? '이겼다' : '졌다'}. ${ln.win ? '트로피 너머로 눈이 마주쳤다.' : '시상대 아래에서 저쪽의 환호를 지켜봤다.'}`, ln.win ? 'gold' : 'bad', [`${r.nick} 상대 통산 ${r.w}승 ${r.l}패`, `${r.nick} 평점 ${v.r.toFixed(1)}`]));
      if (ln.label === '결승') after[after.length - 1].news = `${r.origin === 'trainee' ? '연습생 동기' : '오랜 맞수'}의 결승 맞대결, ${ln.score} — 웃은 쪽은 ${ln.win ? S.nick : r.nick}`;
      else rep.notes.push(`${ln.label}에서 ${r.nick}의 ${ln.opp}을(를) 만나 ${ln.score}로 ${ln.win ? '이겼다' : '졌다'}. 통산 ${r.w}승 ${r.l}패.`);
    }
    if (t.kind === 'playoff') {
      const ru = ch === t.w[0] ? t.w[1] : t.w[0];
      rep.matches.push(...t.lines);
      for (const r of D.REGIONS) S.dom[t.split][r.id] = npcFinalists(r.id);
      if (t.first) S.dom[t.split][org().region] = { champ: ch, runner: ru };
      if (ch === S.org) after.push(title(`${t.lgTag} ${SPLIT[t.split]} 우승`, t.first ? 'dom' : 'second', last));
      else rep.notes.push(`${SPLIT[t.split]} 우승: ${D.ORG[ch].name}${ru === S.org ? ' — 준우승으로 마쳤다.' : ''}`);
      const L = S.lg;
      if (t.first && L && L.sg >= 9) {
        const avg = L.srs / L.sg;
        if (t.my <= 3 && avg >= 7.4 && rnd() < clamp((avg - 7.2) * 1.2, .05, .95)) {
          award(`${region().lg} ${SPLIT[t.split]} MVP`, 6);
          after.push(info('스플릿 MVP', `정규 리그 평균 평점 ${avg.toFixed(2)}. 기자단 투표로 MVP에 선정됐다.`, 'gold'));
        }
      }
      evaluateSquad(after, rep.notes);
    } else if (t.kind === 'intl') {
      if (!t.me) { rep.notes.push(`${t.name}: ${D.ORG[ch].name} 우승. 나는 화면으로 지켜봤다.`); return; }
      rep.matches.push(...t.lines);
      if (ch === S.org) after.push(title(`${t.name} 우승`, t.cup, last));
      else {
        rep.notes.push(`${t.name} ${last.label}에서 ${last.opp}에 막혔다. 우승은 ${D.ORG[ch].name}.`);
        log(`${t.name} ${last.label} 탈락.`);
        if (last.label === '결승') { addFame(4); earn(t.cup === 'world' ? 6000 : 2500); }
      }
    } else {
      rep.matches.push(...t.lines);
      if (ch === 'me') after.push(title('네이션스컵 금메달', 'nations', last));
      else rep.notes.push(t.lines.length > 1 ? '네이션스컵 은메달. 시상대에서 고개를 들지 못했다.' : '네이션스컵 4강에서 탈락했다.');
    }
  }

  /* ---------- 성장 ---------- */
  function ageFactor() {
    const a = S.age; let f = B.ageGrow.find(x => a <= x[0])[1];
    if (S.trait === 'genius' && a <= 19) f += .15;
    return f;
  }
  function applyPlan(plan, playFactor) {
    const coachF = .92 + (org().str - 62) / 160, tf = S.trait === 'grinder' ? B.grinderGrow : 1, af = ageFactor();
    for (const s of D.STATS) {
      const k = s.id, cur = S.stats[k], cap = S.caps[k];
      let g = B.growBase * (plan.base == null ? 1 : plan.base) * playFactor + (plan.g[k] || 0) * (plan.id === 'solo' && has('grind') ? 1.3 : 1);
      g *= af * tf * coachF * (S.grow || 1);
      if (k === 'mech' || k === 'reflex') g *= 1 + .05 * S.shop.gear; else if (k !== 'mental') g *= 1 + .05 * S.shop.coach;
      g *= Math.max(0, 1 - Math.pow(cur / cap, 4)) * (.7 + rnd() * .6);
      S.stats[k] = clamp(cur + g, 1, 99);
    }
    let c = plan.cond; if (c < 0 && S.trait === 'grinder') c *= .75;
    setCond(S.cond + c + 4 + S.shop.care * 1.5);
    addWrist(plan.wrist + 1 - Math.max(0, S.age - 24) * B.wristAge);
    if (plan.trust && S.squad !== 'trainee') addTrust(plan.trust);
    if (plan.fame) { addFame(plan.fame); const inc = 30 + Math.round(S.fame * 8); earn(inc); return inc; }
    return 0;
  }

  // 한 달은 simMonth(시작) → runSim(대회 진행, 승부처에서 멈출 수 있음) → finishMonth(마무리) 순서로 처리한다.
  function simMonth() {
    const mi = MONTHS[S.m];
    const rep = { type: 'month', title: `${S.year}년차 ${mi.m}월`, sub: mi.label, matches: [], notes: [], growth: [] };
    let plan = D.PLANS.find(p => p.id === S.plan);
    const REST = D.PLANS.find(p => p.id === 'rest');
    if (S.injury > 0) { plan = REST; rep.notes.push('손목 부상으로 재활 중. 경기에 나서지 못했다.'); }
    else if (S.cond < 15) { plan = REST; S.stats.mental = Math.max(1, S.stats.mental - 1); rep.notes.push('번아웃이 왔다. 이번 달은 아무것도 하지 못하고 쉬었다.'); }
    rep.plan = plan.name;
    const sim = S.sim = { before: Object.assign({}, S.stats), after: [], rep, plan: plan.id, g0: S.yr.g, tour: null, sq: S.squad, c0: S.car.g };
    if (mi.type === 'league') leagueMonth(mi, sim);
    else if (mi.type === 'intl') intlMonth(mi, sim);
    else if (mi.type === 'nations') nationsMonth(sim);
    runSim();
  }
  function runSim() {
    const sim = S.sim;
    if (sim.tour) { if (!runTour(sim.tour)) return; tourEnd(sim.tour, sim); sim.tour = null; }
    finishMonth(sim);
  }
  function finishMonth(sim) {
    const mi = MONTHS[S.m], rep = sim.rep, after = sim.after, before = sim.before, plan = D.PLANS.find(p => p.id === sim.plan);
    S.sim = null;
    const played = S.yr.g - sim.g0;
    const inc = applyPlan(plan, S.squad === 'trainee' ? .9 : played > 0 ? 1.15 : .85);
    if (inc) rep.notes.push(`방송 수입 ${fmtMoney(inc)}.`);
    const o = ovr();
    if (S.squad === 'trainee') {
      // 월말 평가전: 2군 기준 대비 실력에 운이 더해진 평점. 코치 평가가 이 평점을 따라 오르내린다.
      const r = clamp(Math.round((6 + (o - (S.orgStr[S.org] - B.toSecondGap)) / 8 + gauss() * .8) * 10) / 10, 3, 10);
      // 코치 평가는 평점이 가리키는 수준으로 조금씩 따라간다(평점 6.0 이면 콜업 기준인 40 근처). 한 번 떨어져도 실력이 오르면 회복된다.
      const before = S.trust, tgt = clamp(B.toSecondTrust + (r - 6) * 12, 5, 95);
      S.trust = clamp(S.trust + (tgt - S.trust) * .35, 0, 100);
      rep.eval = { r, rank: clamp(Math.round(6.5 - (r - 6) * 3), 1, 12), d: Math.round((S.trust - before) * 10) / 10 };
    }
    else { const T = str(S.org, S.squad); addTrust(o >= T ? 3 : o >= T - 5 ? 1.5 : o < T - 14 ? -2 : 0); }
    const sal = Math.round(S.contract.salary / 10); earn(sal); rep.salary = sal;
    const au = autoSpend(); if (au) rep.auto = au;   // 자동 관리: 월급을 받은 직후 한 번(꺼져 있으면 아무 일도 없다)
    if (S.buff && --S.buff.m <= 0) S.buff = null;
    if (S.injury > 0) S.injury--;
    else if (S.wrist <= 20) {
      S.injury = 2; S.wrist = 50; S.car.inj++;
      after.push(info('손목 부상', '버티던 손목이 결국 탈이 났다. 두 달간 경기에 나설 수 없다. 휴식과 물리치료로 손목을 관리하자.', 'bad'));
      log('손목 부상. 2개월 결장.', 'bad');
    }
    for (const s of D.STATS) { const d = S.stats[s.id] - before[s.id]; if (Math.abs(d) >= .05) rep.growth.push([s.name, Math.round(d * 10) / 10]); }
    rivalsMonth(mi, rep);
    // 팬 반응: 이 달 경기 기록에서만 만든다(난수 없음).
    const fr = fanReact(rep.matches, { nick: S.nick, tier: (sim.sq || S.squad) === 'second' ? 2 : 1, key: `${S.nick}|${S.year}|${S.m}`, debut: sim.c0 === 0 && S.car.g > 0, fan: S.fan, role: S.role });
    S.fan = fr.fan; if (fr.lines.length) rep.fans = fr.lines;
    S.car.peak = Math.max(S.car.peak, ovr()); S.monthsInOrg++;
    rep.ovr = Math.floor(ovr());
    const pm = rep.matches.filter(m => m.plays);
    if (pm.length) log(`${mi.m}월: ${pm.filter(m => m.win).length}승 ${pm.filter(m => !m.win).length}패, 평균 평점 ${(pm.reduce((a, m) => a + m.r, 0) / pm.length).toFixed(1)}`);
    if (mi.type === 'off') { S.q.push(rep); offseason(); return; }
    if (!S.opt.fast || after.length || rep.notes.length) S.q.push(rep);
    S.q.push(...after);
    S.m++;
    if (S.m === 4) setupSplit('summer');
  }

  /* ---------- 스토브리그 ---------- */
  function salaryFor(g, o) {
    const pay = D.REGION[g.region].pay, s = S.orgStr[g.id];
    return Math.max(3000, r100(4000 * pay * Math.exp((o - 60) / 9) * (.8 + (s - 60) / 75) * (1 + S.fame / 200)));
  }
  function makeOffer(g, squad, renew) {
    const o = ovr(), pay = D.REGION[g.region].pay;
    const salary = squad === 'first' ? salaryFor(g, o) : squad === 'second' ? r100(2400 * pay) : 600;
    return { org: g.id, name: g.name, region: D.REGION[g.region].name, squad, salary, years: squad === 'first' ? ri(1, 3) : 2, renew: !!renew, tries: 0 };
  }
  function genOffers(withRenew) {
    const o = ovr(), cand = [], out = [];
    const agePen = Math.max(0, S.age - B.ageFrom) * B.ageSlope;
    const scouted = S.flags.scout != null && S.flags.scout >= S.year - 1;       // 스카우터가 지켜본 선수는 경력자처럼 평가받는다
    const need = (S.car.g >= B.provenGames || scouted) ? B.offerGap : B.offerGapUnproven;
    for (const g of D.ORGS) {
      if (g.id === S.org) continue;
      if (g.region !== S.home && !(o >= 76 || S.fame >= 45)) continue;
      const gap = o - S.orgStr[g.id] + gauss() * 3;
      if (gap >= -need + agePen) cand.push(makeOffer(g, 'first'));
      else if (S.age <= B.secondOfferAge && gap >= -B.secondOfferGap) cand.push(makeOffer(g, 'second'));
      else if (S.age <= B.traineeOfferAge && gap >= -B.traineeOfferGap) cand.push(makeOffer(g, 'trainee'));
    }
    cand.sort((a, b) => b.salary - a.salary);
    out.push(...cand.splice(0, 2)); if (cand.length) out.push(cand.splice(ri(0, cand.length - 1), 1)[0]);
    if (withRenew) {
      const base = S.orgStr[S.org];
      const want = S.squad === 'first' ? o >= base - 12 - (S.trust - 50) / 10 + agePen : S.squad === 'second' ? S.age <= B.secondRenewAge : S.age < B.traineeMaxAge;
      if (want) out.unshift(makeOffer(org(), S.squad, true));
    }
    return out;
  }
  const canRetry = () => S.car.retry < B.retryMax && S.age <= B.retryMaxAge;
  function negoP(of) { return clamp(Math.round(40 + (ovr() - S.orgStr[of.org]) * 2 + S.fame * .2 - of.tries * 15), 5, 90); }
  function offersScene(offers, canStay, msg) {
    if (!offers.length && !canStay) {
      const p = clamp(Math.round(B.tryoutBase + (ovr() - B.tryoutOvr) * B.tryoutPerOvr - Math.max(0, S.age - B.tryoutAgeFrom) * B.tryoutAgeSlope), 5, 90);
      const vet = S.car.g >= B.provenGames;
      return {
        type: 'tryout', p, vet, retry: !vet && canRetry(),
        text: vet ? '재계약 제안도, 다른 팀의 연락도 오지 않았다. 입단 테스트를 자청해 한 시즌 더 뛸 자리를 찾거나, 여기서 선수 생활을 마칠 수 있다.'
          : '계약을 제안한 팀이 없다. 공개 테스트에 지원해 2군 자리를 노리거나, 여기서 선수 생활을 마칠 수 있다.',
      };
    }
    offers.forEach(of => { of.p = of.squad === 'first' ? negoP(of) : null; });
    return { type: 'offers', offers, canStay, msg: msg || '' };
  }
  function joinOrg(of) {
    const moved = of.org !== S.org;
    S.org = of.org; S.squad = of.squad; S.contract = { salary: of.salary, years: of.years };
    if (moved) { S.trust = of.squad === 'first' ? 35 : 45; S.monthsInOrg = 0; S.car.moves++; if (!S.car.orgs.includes(of.org)) S.car.orgs.push(of.org); }
    if (of.squad === 'first' && !S.car.debut) { S.car.debut = S.age; S.car.via = 'offer'; }
    log(`${of.name}와(과) ${of.years}년 계약. ${SQUAD[of.squad]}, 연봉 ${fmtMoney(of.salary)}.`, 'good');
    if (moved && of.squad === 'first') log(`[뉴스] ${role().name} ${S.nick}, ${of.name}행 — ${of.years}년 계약`, 'news');
  }

  function offseason() {
    const y = S.yr, after = S.q, squadPlayed = S.squad;   // 시즌 기록에는 승격·강등 전 소속을 남긴다
    evaluateSquad(after);
    const avg1 = y.g1 ? y.rs1 / y.g1 : 0;
    if (S.squad === 'first' && y.g1 >= 12) {
      if (!S.flags.rookie) { S.flags.rookie = 1; if (avg1 >= 6.7 && rnd() < clamp((avg1 - 6.4) * 1.2, .1, .9)) award('신인상', 5); }
      if (avg1 >= 7.2 + gauss() * .25) award(`${region().lg} 베스트 5`, 4);
      let sc = avg1 * 10 + S.fame * .02;
      for (const t of S.car.titles) if (t.y === S.year) sc += { world: 6, mid: 3, nations: 3, dom: 2, second: 0 }[t.tier];
      if (sc > 84.5 + gauss() * 2) { award('올해의 선수', 12); earn(5000); }
    }
    const rec = { year: S.year, age: S.age, org: org().name, tag: org().tag, squad: squadPlayed, g: y.g, w: y.w, avg: y.g ? y.rs / y.g : 0, mvp: y.mvp, titles: y.titles.slice(), awards: y.awards.slice(), ovr: Math.floor(ovr()), salary: S.contract.salary };
    S.hist.push(rec);
    after.push(Object.assign({ type: 'season' }, rec));
    if (y.awards.includes('올해의 선수')) after.push(info('올해의 선수', '전 세계 기자단과 선수단 투표 1위. 올해 이 종목에서 가장 빛난 이름은 나였다.', 'gold', ['상금 5,000만']));
    rivalsYear();   // 해가 넘어가기 전에 처리해야 사건 기록의 연차가 맞는다
    // 나이
    S.age++; S.year++;
    const st = B.fadeFrom + (S.trait === 'brain' ? 1 : 0) + (has('late') ? 2 : 0), a = S.age;
    const fade = (k, v) => { if (v > 0) { S.stats[k] = Math.max(20, S.stats[k] - v); S.caps[k] = Math.max(30, S.caps[k] - v); } };
    if (a > st) fade('reflex', (a - st) * B.fadeReflex[0] + B.fadeReflex[1] + rnd());
    if (a > st + 1) fade('mech', (a - st - 1) * B.fadeMech[0] + B.fadeMech[1] + rnd() * .5);
    if (a > st + B.fadeOtherDelay) for (const k of ['sense', 'team', 'pool', 'mental']) fade(k, B.fadeOther);
    S.fame *= .97; S.pendingNewYear = true;
    if (S.age >= 36) { retire('서른여섯. 손이 더는 따라오지 않는다.'); return; }
    after.push({ type: 'cards', cards: rollCards(), reroll: 1 });
    S.contract.years--;
    const released = (S.squad === 'trainee' && S.age >= B.traineeMaxAge) || (S.squad === 'second' && S.age >= B.secondMaxAge);
    if (released) after.push(info('방출 통보', S.squad === 'trainee' ? '연습생 계약이 끝났다. 구단은 재계약 의사가 없다고 전했다.' : '구단이 2군 로스터를 젊은 선수들로 채우기로 했다. 계약 해지 통보를 받았다.', 'bad'));
    if (released || S.contract.years <= 0) after.push(offersScene(genOffers(!released), false, '계약이 만료됐다. 다음 행선지를 정하자.'));
    else after.push({ type: 'stove', years: S.contract.years, salary: S.contract.salary, canRetire: S.age >= 20, scouted: S.flags.scout != null && S.flags.scout >= S.year - 1 });
  }

  function rollCards() {
    const out = [];
    while (out.length < 3) {
      const x = rnd(), r = x < .03 ? 3 : x < .15 ? 2 : x < .45 ? 1 : 0;
      const pool = D.CARDS.filter(c => c.r === r && !(c.perk && has(c.perk)) && !out.includes(c.id));
      if (pool.length) out.push(pick(pool).id);
    }
    return out;
  }

  /* ---------- 은퇴 ---------- */
  function evaluate() {
    const c = S.car;
    let tr = 0; for (const t of c.titles) tr += { world: 22, mid: 12, nations: 12, dom: 7, second: 2 }[t.tier];
    let aw = c.mvp * .3; for (const a of c.awards) aw += a.name === '올해의 선수' ? 25 : a.name.includes('MVP') ? 10 : 6;
    const ax = {
      '기량': clamp((c.peak - 50) * 2.2, 0, 100), '우승': clamp(tr, 0, 100), '개인상': clamp(aw, 0, 100),
      '인기': clamp(S.fame * 1.1, 0, 100), '롱런': clamp(c.g / 3.2, 0, 100),
    };
    const score = Math.round(ax['기량'] * .28 + ax['우승'] * .27 + ax['개인상'] * .2 + ax['인기'] * .1 + ax['롱런'] * .15);
    const grade = B.grades.find(g => score >= g[1])[0];
    let pct = 95; for (const [t, p] of D.PCT) if (score >= t) { pct = p; break; }
    const big = c.titles.filter(t => t.tier !== 'second').length, worlds = c.titles.filter(t => t.tier === 'world').length;
    let ep = { 'S+': '살아 있는 전설', S: '시대를 풍미한 스타', A: '리그의 간판', B: '믿음직한 주전', C: '묵묵한 프로', D: '짧았던 1군의 꿈', F: '끝내 닿지 못한 무대' }[grade];
    if (worlds >= 3) ep = '왕조의 주인';
    else if (c.awards.some(a => a.name === '올해의 선수')) ep = '시대의 아이콘';
    else if (c.peak >= 90 && big === 0) ep = '무관의 제왕';
    else if (c.orgs.length === 1 && c.g >= 150) ep = '원클럽맨';
    else if (c.orgs.length >= 5) ep = '저니맨';
    return { ax, score, grade, pct, ep };
  }
  function retire(reason) {
    const ev = evaluate(), c = S.car;
    S.over = true; S.pendingNewYear = false; S.pendingSim = false;
    const sc = Object.assign({
      type: 'retire', reason, nick: S.nick, role: role().name, roleId: S.role, age: S.age, years: S.hist.length,
      g: c.g, w: c.w, avg: c.g ? c.rs / c.g : 0, mvp: c.mvp, kda: c.d ? (c.k + c.a) / c.d : 0, peak: Math.floor(c.peak), earn: c.earn,
      titles: c.titles.slice(), awards: c.awards.slice(), orgs: c.orgs.map(id => D.ORG[id].name),
      news: c.g ? `${role().name} ${S.nick}, ${S.age}세에 은퇴 — 1군 ${c.g}경기${c.titles.filter(t => t.tier !== 'second').length ? `, 우승 ${c.titles.filter(t => t.tier !== 'second').length}회` : ''}` : `${S.nick}, 1군 무대를 밟지 못하고 ${S.age}세에 은퇴`,
      rivals: S.rivals.map(r => Object.assign(rivalView(r), { epilogue: rivalEpilogue(r), hist: r.hist.slice(0, 1).concat(r.hist.slice(1).slice(-4)) })),
    }, ev);
    sc.rid = S.cid; sc.at = Date.now();
    S.q = [sc];
    legacy();   // 예전 명예의 전당을 아직 옮기지 않았다면, 이번 기록을 더하기 전에 먼저 옮긴다
    let hall = []; try { hall = JSON.parse(store.get(HALL) || '[]'); } catch (e) {}
    hall.push({ nick: S.nick, role: role().name, score: ev.score, grade: ev.grade, ep: ev.ep, peak: sc.peak, titles: c.titles.filter(t => t.tier !== 'second').length, years: sc.years });
    hall.sort((a, b) => b.score - a.score); store.set(HALL, JSON.stringify(hall.slice(0, 30)));
    legacyAdd(recFromScene(sc, S));
  }

  /* ---------- 기록 보관소(명예의 전당) ----------
     { v: 1, hall1: 예전 명예의 전당을 옮겼는지, recs: [기록], trash: [방금 지운 기록(되돌리기용)], gone: [지운 기록 ID] }
     기록 = { id, src: 'play'(상세 기록 있음) | 'hall1'(예전 명예의 전당에서 옮김, 요약만 있음), at: 은퇴 시각(ms, 모르면 null), ... }
     없는 값은 넣지 않는다. 화면은 없는 값을 "기록 없음"으로 보여 준다. */
  const TIERS = ['world', 'mid', 'nations', 'dom', 'second'];
  let legRaw = null, legObj = null, legFail = false, addFail = false;   // addFail: 은퇴 기록을 넣지 못했다(다음에 그 저장을 열 때 다시 넣는다)
  function cleanRec(r) {
    if (!r || typeof r !== 'object') return null;
    const nick = txt(r.nick, 12); if (!nick || !Number.isFinite(r.score)) return null;
    const o = { id: txt(r.id, 40), src: r.src === 'play' ? 'play' : 'hall1', at: Number.isFinite(r.at) && r.at > 0 ? r.at : null, nick, role: txt(r.role, 12), score: clamp(Math.round(r.score), 0, 100), grade: txt(r.grade, 2), ep: txt(r.ep, 24) };
    const num = (k, lo, hi, int) => { if (Number.isFinite(r[k])) o[k] = clamp(int ? Math.round(r[k]) : r[k], lo, hi); };
    num('peak', 0, 99, 1); num('big', 0, 999, 1); num('years', 0, 60, 1); num('age', 10, 60, 1); num('g', 0, 1e5, 1); num('w', 0, 1e5, 1); num('avg', 0, 10); num('mvp', 0, 1e5, 1);
    num('kda', 0, 999); num('earn', 0, 1e12, 1); num('pct', 0, 100, 1); num('debut', 0, 60, 1);
    if (o.src !== 'play') return o;
    for (const [k, list] of [['roleId', D.ROLES], ['home', D.REGIONS], ['trait', D.TRAITS]]) if (list.find(x => x.id === r[k])) o[k] = r[k];
    o.ver = txt(r.ver, 10); o.reason = txt(r.reason, 120);
    o.titles = (Array.isArray(r.titles) ? r.titles : []).filter(t => t && Number.isFinite(t.y) && typeof t.name === 'string' && TIERS.includes(t.tier)).slice(0, 80).map(t => ({ y: clamp(Math.round(t.y), 1, 60), name: txt(t.name, 40), tier: t.tier }));
    o.awards = (Array.isArray(r.awards) ? r.awards : []).filter(a => a && Number.isFinite(a.y) && typeof a.name === 'string').slice(0, 80).map(a => ({ y: clamp(Math.round(a.y), 1, 60), name: txt(a.name, 40) }));
    o.orgs = (Array.isArray(r.orgs) ? r.orgs : []).filter(x => typeof x === 'string').slice(0, 30).map(x => txt(x, 30));
    o.rv = (Array.isArray(r.rv) ? r.rv : []).filter(v => v && typeof v.nick === 'string').slice(0, 6).map(v => ({ nick: txt(v.nick, 16), w: clamp(Math.round(+v.w || 0), 0, 1e5), l: clamp(Math.round(+v.l || 0), 0, 1e5), label: txt(v.label, 12) }));
    if (r.ax && typeof r.ax === 'object') { o.ax = {}; for (const k of ['기량', '우승', '개인상', '인기', '롱런']) if (Number.isFinite(r.ax[k])) o.ax[k] = clamp(Math.round(r.ax[k]), 0, 100); }
    return o;
  }
  function recFromScene(sc, st) {
    return cleanRec({
      id: sc.rid || st.cid, src: 'play', at: sc.at, ver: VERSION, nick: sc.nick, role: sc.role, roleId: st.role, home: st.home, trait: st.trait, age: sc.age, years: sc.years,
      score: sc.score, grade: sc.grade, ep: sc.ep, pct: sc.pct, ax: sc.ax, g: sc.g, w: sc.w, avg: sc.avg, mvp: sc.mvp, kda: sc.kda, peak: sc.peak, earn: sc.earn,
      titles: sc.titles, awards: sc.awards, orgs: sc.orgs, reason: sc.reason, big: (sc.titles || []).filter(t => t.tier !== 'second').length, debut: st.car.debut || 0,
      rv: (sc.rivals || []).map(v => ({ nick: v.nick, w: v.w, l: v.l, label: v.label })),
    });
  }
  function cleanLegacy(p) {
    const o = { v: 1, hall1: !!(p && p.hall1), recs: [], trash: [], gone: [] }, ids = new Set();
    for (const key of ['recs', 'trash']) for (const r0 of (p && Array.isArray(p[key]) ? p[key] : [])) {
      const r = cleanRec(r0); if (!r) continue;
      if (!r.id) r.id = 'x' + hash36(JSON.stringify(r)) + '-' + o[key].length;
      if (ids.has(r.id)) continue; ids.add(r.id); o[key].push(r);
    }
    o.recs = o.recs.slice(0, LEG_MAX); o.trash = o.trash.slice(-5);
    o.gone = (p && Array.isArray(p.gone) ? p.gone : []).filter(x => typeof x === 'string').map(x => txt(x, 40)).slice(-100);
    return o;
  }
  // 예전 명예의 전당(pg_hall_v1)의 한 줄. 있는 항목만 옮기고 나머지는 비워 둔다.
  function cleanHall1(h) {
    if (!h || typeof h !== 'object' || typeof h.nick !== 'string' || !Number.isFinite(h.score)) return null;
    const o = { nick: txt(h.nick, 12), role: txt(h.role, 12), score: clamp(Math.round(h.score), 0, 100), grade: txt(h.grade, 2), ep: txt(h.ep, 24) };
    for (const k of ['peak', 'titles', 'years']) if (Number.isFinite(h[k])) o[k] = clamp(Math.round(h[k]), 0, 999);
    return o.nick ? o : null;
  }
  const hall1Key = h => [h.nick, h.role, h.score, h.grade, h.peak, h.titles, h.years].join('|');
  function legacy() {
    const raw = store.get(LEG);
    if (raw && raw === legRaw) return legObj;
    let p = null;
    if (raw) { try { p = JSON.parse(raw); if (!p || p.v !== 1 || !Array.isArray(p.recs)) p = null; } catch (e) { p = null; } if (!p) store.set(LEG + '_bad', raw); }
    const o = cleanLegacy(p);
    if (!o.hall1) {
      let old = []; try { old = JSON.parse(store.get(HALL) || '[]'); } catch (e) {}
      (Array.isArray(old) ? old : []).slice(0, 30).forEach((h0, i) => {
        const h = cleanHall1(h0); if (!h) return;
        const r = cleanRec({ id: 'h' + hash36(hall1Key(h)) + '-' + i, src: 'hall1', at: null, nick: h.nick, role: h.role, score: h.score, grade: h.grade, ep: h.ep, peak: h.peak, big: h.titles, years: h.years });
        if (r && !o.recs.some(x => x.id === r.id)) o.recs.push(r);
      });
      o.hall1 = true; legacyWrite(o);
      return legObj || o;
    }
    legRaw = raw; legObj = o; return o;
  }
  function legacyWrite(o) {
    const json = JSON.stringify(o), ok = put(LEG, json);
    if (ok) { legRaw = json; legObj = o; legFail = false; } else { legFail = true; if (store.get(LEG) === json) { legRaw = json; legObj = o; } }
    return ok;
  }
  // 같은 ID는 한 번만 들어간다. fromLoad: 예전 버전에서 은퇴한 저장을 열었을 때(요약만 있던 항목을 상세 기록으로 바꾼다)
  function legacyAdd(rec, fromLoad) {
    if (!rec || !rec.id) return false;
    const o = legacy(), cur = { v: 1, hall1: o.hall1, recs: o.recs.slice(), trash: o.trash.slice(), gone: o.gone.slice() };
    const i = cur.recs.findIndex(r => r.id === rec.id);
    if (i >= 0) { if (cur.recs[i].at && !rec.at) rec.at = cur.recs[i].at; cur.recs[i] = rec; }
    else {
      if (fromLoad && cur.gone.includes(rec.id)) return false;
      const key = hall1Key({ nick: rec.nick, role: rec.role, score: rec.score, grade: rec.grade, peak: rec.peak, titles: rec.big, years: rec.years });
      const j = fromLoad ? cur.recs.findIndex(r => r.src === 'hall1' && hall1Key({ nick: r.nick, role: r.role, score: r.score, grade: r.grade, peak: r.peak, titles: r.big, years: r.years }) === key) : -1;
      if (j >= 0) cur.recs[j] = rec; else cur.recs.push(rec);
      if (cur.recs.length > LEG_MAX) {   // 가득 차면 방금 넣은 기록을 뺀 나머지 가운데 점수가 가장 낮은 기록이 빠진다
        let lo = -1; cur.recs.forEach((r, k) => { if (r.id !== rec.id && (lo < 0 || r.score < cur.recs[lo].score)) lo = k; });
        cur.recs.splice(lo, 1);
      }
    }
    const ok = legacyWrite(cur); addFail = !ok; return ok;
  }
  function legacyDel(id) {
    const o = legacy(), i = o.recs.findIndex(r => r.id === id); if (i < 0) return false;
    const cur = { v: 1, hall1: true, recs: o.recs.filter(r => r.id !== id), trash: o.trash.concat([o.recs[i]]).slice(-5), gone: o.gone.concat([id]).slice(-100) };
    return legacyWrite(cur);
  }
  function legacyUndo(id) {
    const o = legacy(), i = o.trash.findIndex(r => r.id === id); if (i < 0 || o.recs.length >= LEG_MAX) return false;
    return legacyWrite({ v: 1, hall1: true, recs: o.recs.concat([o.trash[i]]), trash: o.trash.filter(r => r.id !== id), gone: o.gone.filter(x => x !== id) });
  }

  /* ---------- 도전 과제 ----------
     { v: 1, got: { id: { at, nick, y, age, rid } }, runs: { n: 은퇴까지 마친 커리어 수, ids: [센 커리어 ID] }, fresh: [아직 알리지 않은 ID] }
     판정은 저장된 기록(S.car, 라이벌 전적, 은퇴 평가)만 읽는다. 경기 계산과 난수에는 관여하지 않는다.
     상태를 보고 판정하므로 저장·불러오기를 되풀이해도 같은 과제가 두 번 달성되지 않는다. */
  const bigT = s => s.car.titles.filter(t => t.tier !== 'second').length, hasT = (s, tier) => s.car.titles.some(t => t.tier === tier);
  const fin = s => (s.over && s.q[0] && s.q[0].type === 'retire' ? s.q[0] : null);
  const ACHV = {
    debut: s => s.car.debut > 0, win1: s => s.car.w > 0, mvp1: s => s.car.mvp > 0, g100: s => s.car.g >= 100,
    t_second: s => hasT(s, 'second'), t_dom: s => hasT(s, 'dom'), t_mid: s => hasT(s, 'mid'), t_nations: s => hasT(s, 'nations'), t_world: s => hasT(s, 'world'),
    rookie: s => s.car.awards.some(a => a.name === '신인상'), poy: s => s.car.awards.some(a => a.name === '올해의 선수'),
    rv_win: s => s.rivals.some(r => r.w > 0), rv_10: s => s.rivals.some(r => r.w >= 10),
    fin1: (s, a) => a.runs.n >= 1, fin3: (s, a) => a.runs.n >= 3, fin10: (s, a) => a.runs.n >= 10,
    no_title: s => !!fin(s) && s.car.g > 0 && bigT(s) === 0, no_debut: s => !!fin(s) && !s.car.debut && s.car.g === 0,
    grade_a: s => !!fin(s) && ['A', 'S', 'S+'].includes(fin(s).grade), grade_s: s => !!fin(s) && ['S', 'S+'].includes(fin(s).grade), age30: s => !!fin(s) && s.age >= 30,
  };
  let achRaw = null, achObj = null, achFail = false;
  function cleanAch(p) {
    const o = { v: 1, got: {}, runs: { n: 0, ids: [] }, fresh: [] };
    if (!p || typeof p !== 'object' || p.v !== 1) return o;
    for (const d of D.ACH) {
      const g = p.got && p.got[d.id]; if (!g || typeof g !== 'object') continue;
      o.got[d.id] = { at: Number.isFinite(g.at) && g.at > 0 ? g.at : null, nick: txt(g.nick, 12), y: Number.isFinite(g.y) ? clamp(Math.round(g.y), 1, 60) : null, age: Number.isFinite(g.age) ? clamp(Math.round(g.age), 10, 60) : null, rid: txt(g.rid, 40) };
    }
    if (p.runs && typeof p.runs === 'object') { o.runs.ids = (Array.isArray(p.runs.ids) ? p.runs.ids : []).filter(x => typeof x === 'string').map(x => txt(x, 40)).slice(-500); o.runs.n = Number.isFinite(p.runs.n) ? clamp(Math.round(p.runs.n), o.runs.ids.length, 1e6) : o.runs.ids.length; }
    o.fresh = (Array.isArray(p.fresh) ? p.fresh : []).filter(id => o.got[id]).slice(0, D.ACH.length);
    return o;
  }
  function ach() {
    const raw = store.get(ACH);
    if (raw && raw === achRaw) return achObj;
    let p = null; if (raw) { try { p = JSON.parse(raw); } catch (e) { p = null; } }
    achRaw = raw; achObj = cleanAch(p); return achObj;
  }
  function achWrite(o) { const json = JSON.stringify(o), ok = put(ACH, json); achFail = !ok; if (ok || store.get(ACH) === json) { achRaw = json; achObj = o; } return ok; }
  function achCheck() {
    if (!S || !S.org || !S.cid) return;
    const a = ach(); let cur = null;
    const edit = () => cur || (cur = { v: 1, got: Object.assign({}, a.got), runs: { n: a.runs.n, ids: a.runs.ids.slice() }, fresh: a.fresh.slice() });
    if (fin(S) && !a.runs.ids.includes(S.cid)) { const c = edit(); c.runs.ids.push(S.cid); c.runs.ids = c.runs.ids.slice(-500); c.runs.n++; }
    for (const d of D.ACH) {
      const st = cur || a;
      if (!st.got[d.id] && ACHV[d.id](S, st)) { const c = edit(); c.got[d.id] = { at: Date.now(), nick: S.nick, y: S.year, age: S.age, rid: S.cid }; c.fresh.push(d.id); }
    }
    if (cur) achWrite(cur);
  }
  function achList() {
    const a = ach(), runs = a.runs.n, c = S && S.org ? S.car : null;
    const prog = { fin3: [runs, 3], fin10: [runs, 10], g100: c ? [c.g, 100, 1] : null, rv_10: S && S.org && S.rivals.length ? [Math.max(...S.rivals.map(r => r.w)), 10, 1] : null };
    return D.ACH.map(d => ({ id: d.id, name: d.name, desc: d.desc, got: a.got[d.id] || null, prog: !a.got[d.id] && prog[d.id] ? [Math.min(prog[d.id][0], prog[d.id][1]), prog[d.id][1], !!prog[d.id][2]] : null }));
  }
  function achSeen() { const a = ach(); if (a.fresh.length) achWrite({ v: 1, got: a.got, runs: a.runs, fresh: [] }); }

  /* ---------- 백업 내보내기·가져오기 ----------
     이 게임의 저장 키만 담는다. 가져오기는 전체 복원(기기의 데이터를 파일 내용으로 바꾼다)이며, 하나라도 쓰지 못하면 원래대로 되돌린다. */
  const SCENE_TYPES = ['pickOrg', 'event', 'result', 'month', 'info', 'season', 'cards', 'stove', 'offers', 'tryout', 'retire', 'moment', 'mresult'];
  function exportData() {
    const pj = k => { try { return JSON.parse(store.get(k) || 'null'); } catch (e) { return null; } };
    return { format: BACKUP_FORMAT, version: 1, app: VERSION, exportedAt: new Date().toISOString(),
      payload: { career: pj(KEY), careerBackup: pj(BAK), hall: pj(HALL), legacy: legacy(), achievements: ach(), tutorialDone: store.get(TUT) === '1' } };
  }
  // 문자열의 꺾쇠를 무해한 글자로 바꾼다(파일 내용이 화면에서 태그로 해석되지 않게). 너무 깊거나 큰 구조는 거부한다.
  function scrub(v, depth, budget) {
    if (depth > 24 || --budget.n < 0) throw new Error('too big');
    if (typeof v === 'string') return v.replace(/</g, '‹').replace(/>/g, '›');
    if (Array.isArray(v)) return v.map(x => scrub(x, depth + 1, budget));
    if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) { if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue; o[scrub(k, depth + 1, budget)] = scrub(v[k], depth + 1, budget); } return o; }
    if (typeof v === 'number' && !Number.isFinite(v)) return 0;
    return v;
  }
  /* 장면 규격: 화면과 엔진이 읽는 항목이 빠지거나 자료형이 다르면 그 저장은 복원하지 않는다.
     'n' 유한한 수, 's' 문자열, 'b' 참·거짓, 'org' 있는 구단 ID, 'card' 있는 카드 ID, 'ev' 있는 이벤트 ID, 'squad'·'tier' 정해진 값, 'color' #색상값,
     'pair' [문자열, 수], 'bd' pair 의 배열. 끝의 '?' 는 없어도 된다는 뜻. [규칙, 최소, 최대] 는 배열, { … } 는 객체(적힌 항목만 검사). */
  const HIST = [{ y: 'n', m: 'n', t: 's' }, 0, 60], PCTN = 'n';
  const RIVALV = { nick: 's', role: 's', style: 's', age: 'n', ovr: 'n', org: 's', color: 'color', squad: 's', retired: 'b', status: 's', rv: 'n', rs: 'n', label: 's', w: 'n', l: 'n', news: 's', titles: 'n', hist: HIST, epilogue: 's?' };
  const SCENE = {
    pickOrg: { offers: [{ name: 's', org: 'org', note: 's', need1: 'n', need2: 'n', str: 'n' }, 1, 6] },
    event: { ev: 'ev', title: 's', text: 's', rid: 's?', choices: [{ label: 's', p: 'n?', disabled: 'b?', bd: 'bd?' }, 1, 4] },
    result: { title: 's', text: 's', ok: 'b', checked: 'b', p: 'n?', lines: ['s', 0, 16] },
    month: { title: 's', sub: 's', plan: 's', ovr: 'n', salary: 'n', notes: ['s', 0, 16], growth: ['pair', 0, 16],
      matches: [{ opp: 's', win: 'b', plays: 'b', r: 'n', k: 'n', d: 'n', a: 'n', label: 's?', score: 's?', mvp: 'b?', moms: [{ title: 's', label: 's', ok: 'b', auto: 'b?' }, 0, 8, '?'], rv: [{ nick: 's', r: 'n' }, 0, 6, '?'] }, 0, 16],
      eval: { r: 'n', rank: 'n', d: 'n?', rivals: [{ nick: 's', rank: 'n', r: 'n' }, 0, 6, '?'], '?': 1 }, fans: [{ v: 's', t: 's' }, 0, 8, '?'],
      auto: { spent: 'n', items: [{ id: 's', cost: 'n', why: 's' }, 0, 8], '?': 1 } },
    info: { title: 's', text: 's', tone: 's', lines: ['s', 0, 12], news: 's?', cele: 'n?' },
    season: { year: 'n', age: 'n', org: 's', squad: 'squad', tag: 's', g: 'n', w: 'n', avg: 'n', mvp: 'n', ovr: 'n', salary: 'n', titles: ['s', 0, 30], awards: ['s', 0, 30] },
    cards: { cards: ['card', 1, 6], reroll: 'n' },
    stove: { years: 'n', salary: 'n', canRetire: 'b', scouted: 'b?' },
    offers: { msg: 's', canStay: 'b', offers: [{ name: 's', org: 'org', region: 's', renew: 'b', salary: 'n', squad: 'squad', years: 'n', p: 'n?', tries: 'n' }, 0, 8] },
    tryout: { p: PCTN, text: 's', vet: 'b', retry: 'b' },
    moment: { title: 's', text: 's', tour: 's', label: 's', me: 's', opp: 's', mid: 's', sit: 's', set: 'n', bo: 'n', x: 'n', y: 'n', base: 'n', rival: 's?', pips: 's?', tac: 's?', from: 'n?', seen: 'n?', choices: [{ label: 's', p: 'n', up: 'n', down: 'n', bd: 'bd' }, 2, 3] },
    mresult: { title: 's', text: 's', tour: 's', label: 's', me: 's', opp: 's', choice: 's', i: 'n', p: 'n', eff: 'n', set: 'n', x: 'n', y: 'n', ok: 'b', over: 'b', setWin: 'b', pips: 's?', tac: 's?', d: 'n?' },
    prematch: { tour: 's', label: 's', bo: 'n', me: 's', opp: 's', meTag: 's', oppTag: 's', meColor: 's', oppColor: 's', base: 'n', cond: 'n', role: 's', rival: 's', h2h: 's', tacs: [{ id: 's', p: 'n' }, 3, 3] },
    match: { tour: 's', label: 's', bo: 'n', me: 's', opp: 's', win: 'b', x: 'n', y: 'n', meTag: 's', oppTag: 's', meColor: 's', oppColor: 's', sets: [{ w: 'b', d: 'n' }, 1, 7], from: 'n', tac: 's',
      r: 'n', k: 'n', d: 'n', a: 'n', mvp: 'b', moms: [{ title: 's', label: 's', ok: 'b', auto: 'b?' }, 0, 8], rival: 's', next: 's', seen: 'n?' },
    retire: { nick: 's', role: 's', reason: 's', age: 'n', years: 'n', g: 'n', w: 'n', avg: 'n', mvp: 'n', kda: 'n', peak: 'n', earn: 'n', score: 'n', pct: 'n', grade: 's', ep: 's',
      ax: { '기량': 'n', '우승': 'n', '개인상': 'n', '인기': 'n', '롱런': 'n' }, titles: [{ y: 'n', name: 's', tier: 'tier' }, 0, 120], awards: [{ y: 'n', name: 's' }, 0, 120], orgs: ['s', 0, 40],
      news: 's?', rid: 's?', at: 'n?', rivals: [RIVALV, 0, 8, '?'] },
  };
  function fits(v, rule) {
    if (typeof rule === 'string') {
      const opt = rule.endsWith('?'), t = opt ? rule.slice(0, -1) : rule;
      if (v == null) return opt;
      switch (t) {
        case 'n': return typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1e13;
        case 's': return typeof v === 'string' && v.length <= 600;
        case 'b': return typeof v === 'boolean';
        case 'org': return typeof v === 'string' && !!D.ORG[v];
        case 'card': return typeof v === 'string' && D.CARDS.some(c => c.id === v);
        case 'ev': return typeof v === 'string' && D.EVENTS.some(e => e.id === v);
        case 'squad': return v === 'trainee' || v === 'second' || v === 'first';
        case 'tier': return TIERS.includes(v);
        case 'color': return typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v);
        case 'pair': return Array.isArray(v) && v.length === 2 && fits(v[0], 's') && fits(v[1], 'n');
        case 'bd': return Array.isArray(v) && v.length <= 16 && v.every(x => fits(x, 'pair'));
      }
      return false;
    }
    if (Array.isArray(rule)) { if (v == null) return rule[3] === '?'; return Array.isArray(v) && v.length >= rule[1] && v.length <= rule[2] && v.every(x => fits(x, rule[0])); }
    if (v == null) return !!rule['?'];
    if (typeof v !== 'object' || Array.isArray(v)) return false;
    for (const k in rule) if (k !== '?' && !fits(v[k], rule[k])) return false;
    return true;
  }
  function validScene(sc) {
    if (!sc || typeof sc !== 'object' || !SCENE[sc.type] || !fits(sc, SCENE[sc.type])) return false;
    if (sc.type === 'event') { const ev = D.EVENTS.find(e => e.id === sc.ev); if (sc.choices.length > ev.c.length) return false; }
    if (sc.type === 'mresult' && !(sc.i >= 0 && sc.i <= 2)) return false;
    return true;
  }
  // 엔진이 계속 돌릴 수 있는 상태인지
  function sane() {
    if (!S || typeof S !== 'object' || !Array.isArray(S.q)) return false;
    for (const st of D.STATS) if (!(S.stats[st.id] >= 1 && S.stats[st.id] <= 99) || !(S.caps[st.id] >= 20 && S.caps[st.id] <= 99)) return false;
    for (const k of ['cond', 'wrist', 'trust', 'fame']) if (!(S[k] >= 0 && S[k] <= 100)) return false;
    if (!Number.isFinite(S.money) || !(S.m >= 0 && S.m < MONTHS.length) || !(S.age >= 14 && S.age <= 60) || (S.org && (!D.ORG[S.org] || !Number.isFinite(ovr())))) return false;
    return S.q.every(validScene);
  }
  /* 시험 주행: 복원하기 전에 그 저장을 임시 저장소 안에서 실제로 은퇴까지 자동으로 돌려 본다(수십 밀리초). 도중에 오류가 나거나 값이 망가지면 복원하지 않는다.
     실제 저장소·진행 중인 게임·게임 난수는 건드리지 않는다(끝나면 모두 원래대로 돌린다). */
  const DRY_STEPS = 6000;
  function dryRun(c) {
    const keep = { S, rnd, saveFailed, backupNext, legRaw, legObj, legFail, addFail, achRaw, achObj, achFail };
    let ok = true, a = 0x2545F491;
    try {
      box = {}; legRaw = achRaw = null; legObj = achObj = null;
      rnd = function () { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
      S = JSON.parse(JSON.stringify(c));
      if (!sane()) ok = false;
      else {
        const views = () => { if (S.org && !S.over) { table(); goal(); S.rivals.map(rivalView); rivalFixtures(); org(); region(); role(); isStarter(); } };   // 화면이 부르는 조회
        views(); flush(); save(); views();
        const t0 = Date.now();
        for (let i = 0; ok && i < DRY_STEPS && !S.over; i++) { autoStep(); ok = sane() && Date.now() - t0 < 5000; if (ok && i < 40) views(); }   // 정상 저장은 수십 밀리초. 5초를 넘기면 비정상으로 본다
        if (ok && S.over) ok = !!fin(S) && !!recFromScene(fin(S), S);
      }
    } catch (e) { ok = false; }
    box = null;
    ({ S, rnd, saveFailed, backupNext, legRaw, legObj, legFail, addFail, achRaw, achObj, achFail } = keep);
    return ok;
  }
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  function validCareer(c) {
    const fin01 = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi, int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
    const s = migrate(c); if (!s) return null;
    if (typeof s.nick !== 'string' || !s.nick || s.nick.length > 12) return null;
    if (!D.REGION[s.home] || !D.ROLES.find(x => x.id === s.role) || !D.TRAITS.find(x => x.id === s.trait)) return null;
    if (!int(s.age, 14, 45) || !int(s.year, 1, 40) || !Number.isFinite(s.money) || Math.abs(s.money) > 1e12) return null;
    for (const k of ['cond', 'trust', 'fame', 'wrist']) if (!fin01(s[k], 0, 100)) return null;
    for (const st of D.STATS) if (!fin01(s.stats[st.id], 1, 99) || !s.caps || !fin01(s.caps[st.id], 20, 99)) return null;
    if (!s.contract || !Number.isFinite(s.contract.salary) || !fin01(s.contract.years, 0, 20)) return null;
    if (!['trainee', 'second', 'first'].includes(s.squad) || !D.PLANS.find(x => x.id === s.plan)) return null;
    if (s.q.length > 40 || !s.q.every(validScene)) return null;
    // 화면과 엔진이 그대로 읽는 묶음들의 모양
    for (const k of ['stats', 'caps', 'contract', 'shop', 'used', 'flags', 'opt', 'car', 'stat', 'orgStr', 'evn', 'fan']) if (!isObj(s[k])) return null;
    for (const k of ['g', 'w', 'rs', 'mvp']) if (s.yr && !(Number.isFinite(s.yr[k]) && s.yr[k] >= 0)) return null;
    if (s.org && (!isObj(s.yr) || !Array.isArray(s.yr.titles) || !Array.isArray(s.yr.awards) || !isObj(s.dom))) return null;
    for (const sp in s.dom || {}) { if (!isObj(s.dom[sp])) return null; for (const rg in s.dom[sp]) { const d = s.dom[sp][rg]; if (!isObj(d) || !D.ORG[d.champ] || !D.ORG[d.runner]) return null; } }
    if (s.lg != null) {   // 리그 진행 상태: 팀 목록은 있는 구단이어야 하고 승·패는 수여야 한다
      const L = s.lg;
      if (!isObj(L) || !Array.isArray(L.ids) || L.ids.length < 2 || L.ids.length > 16 || L.ids.some(id => !D.ORG[id]) || !isObj(L.w) || !isObj(L.l) || L.ids.some(id => !Number.isFinite(L.w[id]) || !Number.isFinite(L.l[id]))) return null;
      if (!Array.isArray(L.rounds) || L.rounds.length > 40 || !['first', 'second'].includes(L.tier) || !['spring', 'summer'].includes(L.split)) return null;
    }
    if (s.sim != null) {   // 진행 중이던 달·대회의 상태
      if (!isObj(s.sim)) return null;
      const t = s.sim.tour, small = (v, hi) => Number.isInteger(v) && v >= 0 && v <= hi;
      if (t != null) {
        if (!isObj(t) || !Array.isArray(t.ms) || t.ms.length < 1 || t.ms.length > 16 || t.ms.some(m => !isObj(m) || ![1, 3, 5, 7].includes(m.bo))) return null;
        if (!small(t.i, t.ms.length) || !Array.isArray(t.w) || t.w.length > 16 || !Array.isArray(t.lines) || t.lines.length > 16) return null;
        if (t.cur != null && (!isObj(t.cur) || !small(t.cur.x, 4) || !small(t.cur.y, 4) || !small(t.cur.mom, 3) || !Array.isArray(t.cur.used) || !Array.isArray(t.cur.moms) || t.cur.moms.length > 8)) return null;
        if (t.cur != null) {
          const c = t.cur;
          if (!(c.tac === undefined || c.tac === null || c.tac === '' || TAC[c.tac] === 1)) return null;
          if (c.sets !== undefined && (!Array.isArray(c.sets) || c.sets.length > 7 || c.sets.some(x => !isObj(x) || (x.w !== 0 && x.w !== 1) || !Number.isFinite(x.d) || Math.abs(x.d) > 50))) return null;
          if (c.shown !== undefined && !small(c.shown, 7)) return null;
        }
      }
    }
    if (s.buff != null && !isObj(s.buff)) return null;
    for (const k of ['gear', 'coach', 'care']) if (!Number.isInteger(s.shop[k]) || s.shop[k] < 0 || s.shop[k] > 9) return null;
    for (const id in s.orgStr) if (!D.ORG[id] || !Number.isFinite(s.orgStr[id])) return null;
    if (s.org && D.ORGS.some(o => !Number.isFinite(s.orgStr[o.id]))) return null;
    if (!Number.isFinite(s.monthsInOrg) || !Number.isFinite(s.pity) || !Number.isFinite(s.injury) || !Number.isFinite(s.grow)) return null;
    if (!Array.isArray(s.recentEv) || !Array.isArray(s.recentMom) || s.perks.some(x => typeof x !== 'string')) return null;
    if (s.log.some(l => !isObj(l) || !fits(l, { y: 'n', m: 'n', msg: 's', tone: 's?' })) || s.hist.some(h => !isObj(h) || !fits(h, { year: 'n', age: 'n', tag: 's', squad: 'squad', g: 'n', w: 'n', avg: 'n', ovr: 'n' }))) return null;
    if (s.rivals.some(r => !fits(r.hist, HIST) || !Number.isFinite(r.ovr) || !D.ORG[r.org])) return null;
    if (!Array.isArray(s.hist) || s.hist.length > 45 || !Array.isArray(s.log) || s.log.length > 2000 || !Array.isArray(s.perks) || s.rivals.length > 8) return null;
    const c2 = s.car;
    for (const k of ['g', 'w', 'rs', 'mvp', 'k', 'd', 'a', 'g2', 'peak', 'earn', 'inj', 'moves', 'debut', 'tryouts', 'retry']) if (!Number.isFinite(c2[k]) || c2[k] < 0) return null;
    if (!Array.isArray(c2.titles) || c2.titles.some(t => !t || !TIERS.includes(t.tier) || typeof t.name !== 'string' || !Number.isFinite(t.y))) return null;
    if (!Array.isArray(c2.awards) || c2.awards.some(a => !a || typeof a.name !== 'string' || !Number.isFinite(a.y))) return null;
    if (!Array.isArray(c2.orgs) || c2.orgs.some(id => !D.ORG[id])) return null;
    if (s.org && (!s.orgStr || !Number.isFinite(s.orgStr[s.org]))) return null;
    if (s.over && !(s.q[0] && s.q[0].type === 'retire')) return null;
    if (!dryRun(s)) return null;
    return s;
  }
  // 반환: { ok: true, data, preview } 또는 { ok: false, err } (err: big, json, format, version, newer, payload, career, hall, legacy)
  function importCheck(text) {
    if (typeof text !== 'string' || !text) return { ok: false, err: 'json' };
    if (text.length > BACKUP_MAX) return { ok: false, err: 'big' };
    let f; try { f = JSON.parse(text); } catch (e) { return { ok: false, err: 'json' }; }
    if (!f || typeof f !== 'object' || Array.isArray(f) || f.format !== BACKUP_FORMAT) return { ok: false, err: 'format' };
    if (!Number.isInteger(f.version) || f.version < 1) return { ok: false, err: 'version' };
    if (f.version > 1) return { ok: false, err: 'newer' };
    let p; try { p = scrub(f.payload, 0, { n: 400000 }); } catch (e) { return { ok: false, err: 'big' }; }
    if (!p || typeof p !== 'object' || Array.isArray(p)) return { ok: false, err: 'payload' };
    const data = { career: null, careerBackup: null, hall: null, legacy: null, ach: null, tut: p.tutorialDone === true };
    for (const k of ['career', 'careerBackup']) if (p[k] != null) { try { data[k] = validCareer(p[k]); } catch (e) { data[k] = null; } if (!data[k]) return { ok: false, err: 'career' }; }
    if (p.hall != null) {
      if (!Array.isArray(p.hall) || p.hall.length > 30) return { ok: false, err: 'hall' };
      data.hall = p.hall.map(cleanHall1); if (data.hall.some(h => !h)) return { ok: false, err: 'hall' };
    }
    if (p.legacy != null) {
      const l = p.legacy;
      if (typeof l !== 'object' || l.v !== 1 || !Array.isArray(l.recs) || l.recs.length > LEG_MAX || l.recs.some(r => !cleanRec(r))) return { ok: false, err: 'legacy' };
      data.legacy = cleanLegacy(l); data.legacy.hall1 = true;
    }
    if (p.achievements != null) { if (typeof p.achievements !== 'object' || p.achievements.v !== 1) return { ok: false, err: 'payload' }; data.ach = cleanAch(p.achievements); }
    const c = data.career || data.careerBackup, when = Date.parse(typeof f.exportedAt === 'string' ? f.exportedAt : '');
    return { ok: true, data, preview: {
      exportedAt: Number.isFinite(when) ? when : null, app: txt(String(f.app || ''), 10),
      career: c ? { nick: c.nick, year: c.year, age: c.age, over: !!c.over, started: !!c.org } : null,
      hall: data.legacy ? data.legacy.recs.length : data.hall ? data.hall.length : 0, ach: data.ach ? Object.keys(data.ach.got).length : 0,
    } };
  }
  // 전체 복원. 하나라도 쓰지 못하면 모든 키를 원래 값으로 되돌리고 false 를 돌려준다.
  function importApply(data) {
    if (!data || typeof data !== 'object') return false;
    const want = [[KEY, data.career], [BAK, data.careerBackup], [HALL, data.hall], [LEG, data.legacy], [ACH, data.ach]].map(([k, v]) => [k, v == null ? null : JSON.stringify(v)]);
    want.push([TUT, data.tut ? '1' : null]);
    const before = want.map(([k]) => [k, store.get(k)]);
    let ok = true;
    for (const [k, v] of want) { if (v == null) store.del(k); else if (!put(k, v)) { ok = false; break; } }
    if (!ok) for (const [k, v] of before) { if (v == null) store.del(k); else store.set(k, v); }
    legRaw = achRaw = null; legObj = achObj = null;
    if (ok) { S = null; saveFailed = false; legFail = achFail = addFail = false; }
    seen();
    return ok;
  }

  /* ---------- 라이벌 ----------
     연습생 동기 두 명이 은퇴까지 함께 간다. 리그 전체를 시뮬레이션하지 않고, 라이벌마다 OVR 하나와 소속·상태만 가볍게 진행한다.
       성장·부상: 매달(rivalsMonth) / 콜업 심사: 스플릿 종료와 스토브리그(rivalEval) / 노쇠·방출·이적·은퇴: 스토브리그(rivalsYear)
     맞대결 전적은 내가 출전한 공식전의 결과가 확정되는 순간에만 기록하고, 경기 ID로 중복을 막는다(rivalMatch).
     라이벌은 경기 계산식에 들어가지 않는다. 상대 팀 전력은 구단 전력 그대로다.
     r = { id, nick, role, style, grow, age, home, ovr, pot, org, squad, months, origin, rv(경쟁심), rs(존중), w, l(내 기준 맞대결 승·패),
           mids(기록한 경기 ID), hist(사건 기록), news(최근 소식), titles, debut, peak, moves, out(부상 남은 달), slump, retired, f(알림 표시) } */
  const RSQ = { trainee: 0, second: 1, first: 2 };
  const STYLES = ['공격적인', '침착한', '성실한', '대담한', '영리한', '끈질긴'];
  const rivalsAlive = () => S.rivals.filter(r => !r.retired);
  const rivalOf = id => S.rivals.find(r => r.id === id);
  const round1 = v => Math.round(v * 10) / 10;
  function rivalNick() {
    let n, k = 0;
    do { n = pick(D.SYL_A) + pick(D.SYL_B) + (k++ > 40 ? k : ''); } while (n.toLowerCase() === S.nick.toLowerCase() || S.rivals.some(r => r.nick === n));
    return n;
  }
  // 사건 기록: 처음 5개(만남)와 최근 기록을 남긴다.
  function rHist(r, text) { r.hist.push({ y: S.year, m: MONTHS[S.m].m, t: text }); if (r.hist.length > 36) r.hist.splice(5, 1); }
  function rNote(r, text, tone, quiet) { r.news = text; rHist(r, text); if (!quiet) log(`${r.nick} — ${text}`, tone); }
  function rRel(r, drv, drs) { r.rv = clamp(r.rv + (drv || 0), 0, 100); r.rs = clamp(r.rs + (drs || 0), 0, 100); }
  function relLabel(r) {
    if (r.rs >= 60 && r.rv >= 60) return '호적수';
    if (r.rs >= 60) return '벗';
    if (r.rv >= 60) return r.rs < 35 ? '앙숙' : '경쟁자';
    return r.origin === 'trainee' ? '동기' : '맞수';
  }
  function makeRival(o) {
    const r = {
      id: 'r' + (++S.rivalSeq), nick: rivalNick(), role: o.role, style: pick(STYLES), grow: pick(['early', 'steady', 'steady', 'late']),
      age: S.age, home: S.home, ovr: o.ovr, pot: Math.max(o.pot, o.ovr + 1), org: o.org, squad: o.squad, months: 0, origin: o.origin,
      rv: o.rv, rs: o.rs, w: 0, l: 0, mids: [], hist: [], news: '', titles: 0, debut: o.squad === 'first' ? S.age : 0, peak: o.ovr, moves: 0, out: 0, slump: 0, retired: null, f: {},
    };
    S.rivals.push(r); return r;
  }
  // 새 커리어: 같은 날 입단한 동기 둘. 하나는 나와 같은 포지션, 하나는 다른 포지션.
  function spawnRivals() {
    const o = ovr(), other = pick(D.ROLES.filter(x => x.id !== S.role)).id;
    const a = makeRival({ role: S.role, ovr: clamp(o + gauss() * 2, 38, 60), pot: clamp(83 + gauss() * 5, 74, 96), org: S.org, squad: 'trainee', origin: 'trainee', rv: 25, rs: 25 });
    const b = makeRival({ role: other, ovr: clamp(o + gauss() * 2.5, 38, 60), pot: clamp(80 + gauss() * 6, 68, 96), org: S.org, squad: 'trainee', origin: 'trainee', rv: 15, rs: 35 });
    for (const r of [a, b]) { r.news = '같은 날 입단한 연습생 동기.'; rHist(r, `${org().name} 연습생 동기로 처음 만났다.`); }
  }
  // 라이벌이 없는 커리어(예전 저장)에서 리그의 맞수를 만든다. 지나간 일을 지어내지 않고 지금부터의 기록만 쌓는다.
  function leagueRival() {
    const o = ovr(), ids = S.lg.ids.filter(id => id !== S.org);
    const r = makeRival({ role: S.role, ovr: clamp(o + gauss() * 3, 50, 95), pot: clamp(o + 3 + rnd() * 5, 60, 97), org: pick(ids), squad: 'first', origin: 'league', rv: 25, rs: 20 });
    r.news = '리그에서 의식하기 시작한 선수.'; rHist(r, `${D.ORG[r.org].name} 소속으로 리그에서 처음 의식하게 됐다.`);
    return r;
  }
  function aheadCheck(r) { if (RSQ[r.squad] > RSQ[S.squad]) r.f.ahead = S.year; }

  function rivalGrow(r) {
    const af = B.ageGrow.find(x => r.age <= x[0])[1];
    const tm = r.grow === 'early' ? (r.age <= 19 ? 1.2 : .85) : r.grow === 'late' ? (r.age <= 19 ? .85 : 1.25) : 1;
    r.ovr = clamp(r.ovr + B.rivalGrow * af * tm * Math.max(0, 1 - Math.pow(r.ovr / r.pot, 4)) * (.7 + rnd() * .6), 20, 99);
    r.peak = Math.max(r.peak, r.ovr);
  }
  // 콜업 심사: 선수와 같은 기준을 쓴다(감독 신뢰 조건만 없다).
  function rivalEval(r) {
    if (r.f.skip === S.stat.turns) return;               // 이번 심사에서 이미 처리됨(자리 경쟁)
    const base = S.orgStr[r.org], name = D.ORG[r.org].name;
    if (r.squad === 'trainee') {
      if (r.months >= B.toSecondMonths && r.ovr >= base - B.toSecondGap) { r.squad = 'second'; rNote(r, `${name} 2군에 콜업됐다.`); aheadCheck(r); }
    } else if (r.squad === 'second' && !r.out) {
      const gap = r.ovr - (base - B.toFirstGap);
      if (gap >= 0 && rnd() < clamp(B.slotBase + gap * B.slotPerOvr, B.slotBase, B.slotMax)) {
        r.squad = 'first'; if (!r.debut) r.debut = r.age; rNote(r, `${name} 1군에 콜업됐다.`); aheadCheck(r);
      }
    }
  }
  function rivalRetire(r) {
    r.retired = { y: S.year, age: r.age }; r.f.retired = S.year; r.out = 0;
    rNote(r, r.debut ? `${r.age}세에 은퇴를 발표했다.` : `1군 무대를 밟지 못하고 ${r.age}세에 선수 생활을 접었다.`);
  }
  function rivalGo(r, g, squad) {
    const from = D.ORG[r.org].name;
    r.org = g.id; r.squad = squad; r.months = 0; r.moves++; if (squad === 'first' && !r.debut) r.debut = r.age;
    r.f.moved = S.year;
    rNote(r, `${from}에서 ${g.name} ${SQUAD[squad]}으로 옮겼다.`); aheadCheck(r);
  }
  // released: 방출돼 새 팀을 찾는다(못 찾으면 은퇴). 아니면 더 나은 자리가 있을 때만 옮긴다.
  function rivalMove(r, released) {
    const agePen = Math.max(0, r.age - B.ageFrom) * B.ageSlope, need = r.debut ? B.offerGap : B.rivalGapUnproven;
    const orgs = D.ORGS.filter(g => g.region === r.home && g.id !== r.org);
    const firsts = orgs.filter(g => r.ovr - S.orgStr[g.id] >= -need + agePen).sort((a, b) => S.orgStr[b.id] - S.orgStr[a.id]);
    if (!released) {
      const up = r.squad === 'first' ? firsts.filter(g => S.orgStr[g.id] > S.orgStr[r.org] + 2) : firsts;
      if (up.length) rivalGo(r, up[ri(0, Math.min(1, up.length - 1))], 'first');
      return;
    }
    if (firsts.length) return rivalGo(r, firsts[ri(0, Math.min(1, firsts.length - 1))], 'first');
    const seconds = r.age <= B.secondOfferAge ? orgs.filter(g => r.ovr >= S.orgStr[g.id] - B.secondOfferGap) : [];
    if (seconds.length) return rivalGo(r, pick(seconds), 'second');
    rivalRetire(r);
  }

  // 매달: 성장, 부상, 연습생 평가전 순위, 스플릿 종료 달의 콜업 심사
  function rivalsMonth(mi, rep) {
    const alive = rivalsAlive();
    for (const r of alive) {
      r.months++;
      if (r.out > 0) { if (--r.out === 0) { r.f.back = S.year; rNote(r, '부상에서 돌아왔다.'); } }
      else {
        rivalGrow(r);
        if (r.squad !== 'trainee' && rnd() < B.rivalInjury) { r.out = ri(2, 4); rNote(r, `부상으로 ${r.out}개월 결장한다.`); }
      }
    }
    if (rep.eval) {
      // 같은 구단 연습생 동기의 평가전 결과. 내 평점과 같은 식으로 계산하고, 순위가 평점 순서와 어긋나지 않게 맞춘다.
      const used = [rep.eval.rank], list = [];
      for (const r of alive) {
        if (r.org !== S.org || r.squad !== 'trainee') continue;
        const rt = clamp(round1(6 + (r.ovr - (S.orgStr[S.org] - B.toSecondGap)) / 8 + gauss() * .8), 3, 10);
        let rank = clamp(Math.round(6.5 - (rt - 6) * 3), 1, 12);
        const above = rt > rep.eval.r || (rt === rep.eval.r && rnd() < .5), step = above ? -1 : 1;
        if (above ? rank >= rep.eval.rank : rank <= rep.eval.rank) rank = rep.eval.rank + step;
        while (used.includes(rank)) rank += step;          // 같은 순위가 겹치면 내 순위에서 먼 쪽으로 한 칸
        if (rank < 1 || rank > 12) continue;               // 순위표에 자리가 없으면 이번 달은 표시하지 않는다
        used.push(rank); list.push({ id: r.id, nick: r.nick, r: rt, rank });
        if (Math.abs(rank - rep.eval.rank) <= 2) rRel(r, 1.5, 0);
      }
      if (list.length) rep.eval.rivals = list;
    }
    if (mi.playoff) for (const r of alive) rivalEval(r);
  }

  // 스토브리그: 우승 기록, 나이, 노쇠, 부진, 콜업 심사, 방출·이적·은퇴
  function rivalsYear() {
    for (const r of rivalsAlive()) {
      for (const sp of ['spring', 'summer']) {
        const d = S.dom[sp] && S.dom[sp][r.home];
        if (d && r.squad === 'first' && !r.out && d.champ === r.org) { r.titles++; rNote(r, `${D.ORG[r.org].name}에서 ${SPLIT[sp]} 우승을 차지했다.`, '', r.org === S.org); }
      }
      r.age++;
      const st = B.fadeFrom + (r.grow === 'late' ? 2 : r.grow === 'early' ? -1 : 0);
      if (r.age > st) { const d = (r.age - st) * B.rivalFade + rnd(); r.ovr = Math.max(20, r.ovr - d); r.pot = Math.max(r.ovr, r.pot - d); }
      if (r.slump) { r.slump = 0; r.ovr = Math.min(99, r.ovr + 2.5); r.pot = Math.max(r.pot, r.ovr); r.f.back = S.year; rNote(r, '긴 부진에서 벗어났다.'); }
      else if (r.squad === 'first' && r.age >= 21 && rnd() < B.rivalSlump) { r.slump = 1; r.ovr = Math.max(20, r.ovr - 3); r.f.slump = S.year; rNote(r, '부진에 빠졌다.'); }
      rivalEval(r);
      const base = S.orgStr[r.org], agePen = Math.max(0, r.age - B.ageFrom) * B.ageSlope;
      const out = r.age >= 34 || (r.squad === 'trainee' && r.age >= B.traineeMaxAge) || (r.squad === 'second' && r.age >= B.secondMaxAge) || (r.squad === 'first' && r.ovr < base - 12 + agePen);
      if (r.age >= 34) rivalRetire(r);
      else if (out) rivalMove(r, true);
      else if (r.months >= 10 && (r.squad === 'first' ? rnd() < B.rivalAmbition : (r.squad === 'second' && r.age >= 20 && r.ovr < base - B.toFirstGap - 2 && rnd() < .7))) rivalMove(r, false);
    }
  }

  // 공식전 결과가 확정될 때 호출한다. 상대 구단의 같은 리그 로스터에 있는, 부상이 아닌 라이벌만 기록한다.
  // mid(경기 ID)가 이미 기록돼 있으면 다시 세지 않는다. 내가 출전하지 않은 경기와 같은 구단 라이벌은 세지 않는다.
  function rivalMatch(oppOrg, tier, rec, mid, T, O, tourName) {
    if (!rec.plays || oppOrg === S.org) return;
    for (const r of rivalsAlive()) {
      if (r.org !== oppOrg || r.squad !== tier || r.out > 0 || r.mids.includes(mid)) continue;
      r.mids.push(mid); if (r.mids.length > 80) r.mids.shift();
      if (rec.win) r.w++; else r.l++;
      const rt = clamp(round1(6.3 + (r.ovr - (T + O) / 2) / 11 + (rec.win ? -.45 : .45) + gauss() * .7), 3, 10);
      (rec.rv = rec.rv || []).push({ id: r.id, nick: r.nick, r: rt, w: r.w, l: r.l });
      rRel(r, rec.label === '결승' ? 6 : rec.label ? 3 : .6, rec.label === '결승' ? 3 : rec.label ? 1.5 : .2);   // 맞붙을수록 조금씩, 큰 경기일수록 크게
      S.flags.rvLast = { id: r.id, win: !!rec.win, turn: S.stat.turns, used: 0 };
      if (rec.label) rNote(r, `${tourName} ${rec.label}에서 맞붙어 ${rec.score}로 ${rec.win ? '내가 이겼다' : '내가 졌다'}.`, rec.win ? 'good' : 'bad');
      else r.news = `${MONTHS[S.m].m}월 리그 맞대결에서 ${rec.win ? '내가 이겼다' : '내가 졌다'}. 통산 ${r.w}승 ${r.l}패.`;
    }
  }
  // 이번 달 리그 일정에서 만나는 라이벌(홈 화면 안내와 이벤트 조건에 쓴다)
  function rivalFixtures() {
    const mi = MONTHS[S.m], L = S.lg, out = [];
    if (!L || mi.type !== 'league') return out;
    const opps = new Set();
    for (let r = mi.rounds[0]; r < mi.rounds[1]; r++) for (const [a, b] of L.rounds[r]) { if (a === S.org) opps.add(b); if (b === S.org) opps.add(a); }
    for (const r of rivalsAlive()) if (opps.has(r.org) && r.squad === L.tier && !r.out && r.org !== S.org) out.push(r);
    return out;
  }
  function rivalView(r) {
    const same = !r.retired && r.org === S.org;
    return {
      id: r.id, nick: r.nick, role: D.ROLES.find(x => x.id === r.role).name, style: r.style, age: r.age, ovr: Math.floor(r.ovr), org: D.ORG[r.org].name, color: D.ORG[r.org].color,
      squad: SQUAD[r.squad], retired: !!r.retired, same,
      status: r.retired ? `은퇴 (${r.retired.age}세)` : r.out ? `부상 (${r.out}개월)` : r.slump ? '부진' : same ? '같은 팀' : '활동 중',
      sameRole: r.role === S.role, rv: Math.round(r.rv), rs: Math.round(r.rs), label: relLabel(r), w: r.w, l: r.l, news: r.news, titles: r.titles, hist: r.hist.slice(-6).reverse(), origin: r.origin,
    };
  }
  // 은퇴 화면의 회고 한 줄. 실제 전적과 관계에서만 문장을 만든다.
  function rivalEpilogue(r) {
    const n = r.w + r.l, lab = relLabel(r);
    const h = n === 0 ? '공식전에서는 끝내 한 번도 마주치지 못했다.' : r.w > r.l ? `공식전 ${n}번 가운데 ${r.w}번을 이겼다.` : r.w < r.l ? `공식전 ${n}번 가운데 ${r.l}번을 졌다.` : `공식전 ${n}번, 정확히 반씩 나눠 가졌다.`;
    const t = { '호적수': '서로를 가장 높은 벽으로 여겼고, 그래서 여기까지 왔다.', '벗': '유니폼은 달라도 가장 먼저 연락하는 사이로 남았다.', '앙숙': '끝내 악수는 없었다. 그래도 서로의 이름은 잊지 못할 것이다.', '경쟁자': '끝까지 지고 싶지 않은 이름이었다.', '동기': '같은 날 연습실 문을 열었던 동기.', '맞수': '리그에서 오래 의식해 온 이름.' }[lab];
    const e = r.retired ? (r.debut ? `${r.retired.age}세에 먼저 은퇴했다.` : '1군에 오르지 못하고 먼저 떠났다.') : '아직 현역이다.';
    return `${h} ${t} ${e}`;
  }

  /* ---------- 팬 반응 ----------
     그 달 경기 기록(월간 보고의 matches)에서 확인되는 사실만 골라 문장을 붙인다.
     난수를 쓰지 않는다: 경기 결과와 밸런스에 영향이 없고, 같은 기록이면 항상 같은 문장이 나온다.
     저장하는 것은 S.fan 하나뿐이다 — g: 출전 경기 수, st: 연승(+)·연패(−), seen: 최근에 쓴 문장 [문장 ID, 그때의 g]. 10경기가 지난 기록은 지운다. */
  const FAN_GAP = 10;   // 같은 문장은 출전 경기 기준 10경기 안에 다시 쓰지 않는다
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  // 이 달에 실제로 일어난 일의 목록(중요한 순서). fan.g 와 fan.st 를 이 달 경기만큼 진행시킨다.
  function fanFacts(matches, ctx, fan) {
    const played = matches.filter(m => m.plays), facts = [];
    if (!matches.length) return facts;                                  // 경기가 없는 달: 반응도 없다
    if (!played.length) { facts.push({ k: 'bench', p: 50 }); return facts; }
    for (const m of played) fan.st = m.win ? (fan.st > 0 ? fan.st + 1 : 1) : (fan.st < 0 ? fan.st - 1 : -1);
    fan.g += played.length;
    const w = played.filter(m => m.win).length, l = played.length - w, avg = played.reduce((a, m) => a + m.r, 0) / played.length;
    const add = (k, p, m, extra) => facts.push(Object.assign({ k, p, w, l, avg: avg.toFixed(1), L: l > 0 },
      m ? { opp: m.opp, r: m.r.toFixed(1), rn: m.r, score: m.score, label: m.label, kl: m.k, de: m.d, as: m.a, ka: m.k + m.a } : {}, extra || {}));
    const last = f => played.filter(f).pop();
    const fin = last(m => m.label === '결승'); if (fin) add(fin.win ? 'final_w' : 'final_l', 100, fin);
    if (ctx.debut) add('debut', 95, played[0]);
    const rvm = last(m => m.rv && m.rv.length);
    if (rvm) { const v = rvm.rv[0]; add(rvm.win ? 'rv_w' : 'rv_l', 90, rvm, { rival: v.nick, rr: v.r.toFixed(1), gt: rvm.r > v.r, lt: rvm.r < v.r, hw: v.w, hl: v.l, behind: v.l > v.w }); }
    const po = last(m => m.label && m.label !== '결승'); if (po) add(po.win ? 'po_w' : 'po_l', 80, po);
    const mv = played.filter(m => m.mvp).sort((a, b) => b.r - a.r)[0]; if (mv) add('mvp', 75, mv);
    const cm = last(m => m.moms && m.moms.length); if (cm) add(cm.moms[cm.moms.length - 1].ok ? 'clutch_ok' : 'clutch_no', 70, cm, { mt: cm.moms[cm.moms.length - 1].title });
    if (fan.st >= 3) add('streak_w', 68, null, { n: fan.st }); else if (fan.st <= -3) add('streak_l', 68, null, { n: -fan.st });
    const cl = played.filter(m => !m.win && m.r >= 7.5).sort((a, b) => b.r - a.r)[0]; if (cl) add('carry_l', 65, cl);
    const pw = played.filter(m => m.win && m.r <= 5.4).sort((a, b) => a.r - b.r)[0]; if (pw) add('pass_w', 60, pw);
    if (avg >= 7.5) add('form_hi', 50); else if (avg <= 5.3) add('form_lo', 50);
    add(w > l ? 'month_good' : w < l ? 'month_bad' : 'month_even', 30);
    return facts.sort((a, b) => b.p - a.p);
  }
  // 문장 틀에 값을 채운다. 필요한 값이 하나라도 없으면 null(그 문장은 쓰지 않는다).
  function fanFill(t, f, nick) {
    let ok = true;
    const out = t.replace(/\{(\w+)\}/g, (_, k) => { const v = k === 'nick' ? nick : f[k]; if (v == null || v === '' || (typeof v === 'number' && !Number.isFinite(v))) ok = false; return v; });
    return ok ? out : null;
  }
  const fanCond = (tp, f, tier, role) => (!tp.role || tp.role === role) && (!tp.tier || tp.tier === tier) && (!tp.if || (tp.if === 'r6' ? f.rn >= 6 : tp.if === 'r6-' ? f.rn < 6 : !!f[tp.if]));
  // matches: 그 달의 경기 기록. ctx: { nick, tier(1 또는 2), key(문장 선택용 문자열), debut(이 달에 1군 첫 출전), fan(S.fan) }
  // 반환: { lines: [{ k, id, v, t }], fan: 갱신된 상태 }. 상태를 직접 바꾸지 않는 순수 함수다.
  function fanReact(matches, ctx) {
    const fan = { g: ctx.fan.g, st: ctx.fan.st, seen: ctx.fan.seen.slice() };
    const facts = fanFacts(matches, ctx, fan), lines = [];
    fan.seen = fan.seen.filter(e => fan.g - e[1] < FAN_GAP);
    const take = (f, newVoice) => {
      const cand = [];
      D.FAN[f.k].forEach((tp, i) => {
        const id = f.k + '#' + i;
        if (!tp.t || !fanCond(tp, f, ctx.tier, ctx.role) || fan.seen.some(e => e[0] === id) || (newVoice && lines.some(x => x.v === tp.v))) return;
        const t = fanFill(tp.t, f, ctx.nick); if (t) cand.push({ k: f.k, id, v: tp.v, t });
      });
      if (!cand.length) return false;
      const c = cand[hashStr(ctx.key + '|' + f.k + '|' + lines.length) % cand.length];
      lines.push(c); fan.seen.push([c.id, fan.g]); return true;
    };
    const max = facts.length && facts[0].k === 'bench' ? 2 : 3;
    // 중요한 사실부터 한 줄씩, 말투가 겹치지 않게. 쓸 문장이 없으면(최근에 다 썼으면) 그 사실은 건너뛴다.
    for (const f of facts) { if (lines.length >= max) break; if (!take(f, true)) take(f, false); }
    // 두 줄이 안 되면 같은 사실에서 다른 문장을 하나 더 찾는다. 그래도 없으면 줄 수를 줄인다(반복보다 생략).
    for (const f of facts) { if (lines.length >= 2) break; take(f, true) || take(f, false); }
    return { lines, fan };
  }

  /* ---------- 포지션: 표시 이름, 경기 해설, 계약 제안 설명 (0.9.0) ----------
     모두 이미 있는 기록을 읽어 문장으로 바꾸는 조회 함수다. 상태를 바꾸지 않고 난수도 쓰지 않는다. */
  // 포지션 이름을 화면에 보여 줄 때 쓴다. id 를 알면 지금 이름, 모르면 예전 이름(선봉·유격·코어·사수·지원)을 지금 이름으로 바꾼다.
  // 저장된 값은 건드리지 않는다. 모르는 글자는 그대로, 비어 있으면 '미상'.
  function roleLabel(name, id) {
    const r = D.ROLES.find(x => x.id === id) || D.ROLES.find(x => x.name === name) || D.ROLES.find(x => x.id === D.ROLE_OLD[name]);
    return r ? r.name : (typeof name === 'string' && name ? name : '미상');
  }
  // 월간 보고의 "이번 달 활약" 한 줄. 그 달 출전 경기 가운데 평점이 가장 높은 경기(없으면 가장 낮은 경기)의 실제 킬·데스·어시스트·평점만으로 만든다.
  // 포지션마다 앞에 내세우는 숫자가 다르다: 탑 데스·관여, 정글 관여, 미드 킬·평점, 원딜 킬·데스, 서폿 어시스트.
  function roleReview(matches, roleId) {
    const played = (matches || []).filter(m => m && m.plays && Number.isFinite(m.r)); if (!played.length) return null;
    const best = played.reduce((a, m) => (m.r > a.r ? m : a)), worst = played.reduce((a, m) => (m.r < a.r ? m : a));
    const good = best.r >= 7.5, m = good ? best : worst.r <= 4.8 ? worst : null; if (!m) return null;
    const id = roleId || (S && S.role), pos = roleLabel('', id), ka = m.k + m.a, r = m.r.toFixed(1);
    const head = { van: `데스 ${m.d} · 관여 ${ka}`, rov: `킬 관여 ${ka}`, core: `${m.k}킬 · 평점 ${r}`, gun: `${m.k}킬 ${m.d}데스`, sup: `어시스트 ${m.a}` }[id] || `평점 ${r}`;
    let text;
    if (!good) text = `${m.opp}전 평점 ${r}. ${m.d}번 쓰러졌고 킬과 어시스트를 합쳐 ${ka}번 관여했다.`;
    else text = `${m.opp}전 ` + ({
      van: m.d <= 2 ? `${m.d}번밖에 쓰러지지 않았다. 탑이 버텨 준 경기다.` : `킬과 어시스트를 합쳐 ${ka}번 관여했다. 탑이 싸움마다 있었다.`,
      rov: `킬과 어시스트를 합쳐 ${ka}번. 정글의 값은 관여 횟수에서 나온다.`,
      core: `${m.k}킬에 평점 ${r}. 미드가 중심을 잡은 경기다.`,
      gun: m.d <= 2 ? `${m.k}킬을 하는 동안 ${m.d}번만 쓰러졌다. 원딜은 살아 있어야 때린다.` : `${m.k}킬. 쓰러지면서도 화력은 냈다.`,
      sup: `킬은 ${m.k}개여도 어시스트가 ${m.a}개다. 서폿의 평점 ${r}은 여기서 나온다.`,
    }[id] || `평점 ${r}.`);
    return { pos, good, opp: m.opp, r: m.r, k: m.k, d: m.d, a: m.a, head, text, mvp: !!m.mvp };
  }
  // 계약 제안 하나에 대한 설명. 구단 전력·리그 순위·내 OVR과의 차이·이적 뒤 감독 신뢰·같은 구단의 라이벌·연봉 차이.
  function offerInfo(of) {
    if (!S || !of || !D.ORG[of.org] || !Number.isFinite(S.orgStr[of.org])) return null;
    const g = D.ORG[of.org], str = Math.round(S.orgStr[g.id]), o = Math.floor(ovr()), here = g.id === S.org;
    const peers = D.ORGS.filter(x => x.region === g.region).sort((a, b) => S.orgStr[b.id] - S.orgStr[a.id]);
    let honor = '';
    for (const sp of ['summer', 'spring']) { const d = S.dom && S.dom[sp] && S.dom[sp][g.region]; if (!honor && d) honor = d.champ === g.id ? `올해 ${SPLIT[sp]} 우승 팀` : d.runner === g.id ? `올해 ${SPLIT[sp]} 준우승 팀` : ''; }
    const trust = here ? Math.round(S.trust) : of.squad === 'first' ? 35 : 45, line = of.squad === 'first' ? 45 : 30;
    return {
      lg: D.REGION[g.region].lgName, abroad: g.region !== S.home, home: D.REGION[S.home].name, str, rank: peers.findIndex(x => x.id === g.id) + 1, teams: peers.length, honor,
      ovr: o, diff: o - str, squad: of.squad, here, trust, line, starter: trust >= line, need1: Math.ceil(S.orgStr[g.id] - B.toFirstGap),
      rivals: rivalsAlive().filter(r => r.org === g.id).map(r => ({ nick: r.nick, squad: SQUAD[r.squad], role: roleLabel('', r.role), same: r.role === S.role })),
      pay: of.salary - S.contract.salary,
    };
  }

  /* ---------- 처음 안내와 우승 연출의 표시 상태 ----------
     화면 쪽 기능이라 게임 규칙과 난수에는 손대지 않는다. 여기서는 "봤는지"만 저장한다. */
  function tutFinish() { S.tut.done = true; store.set(TUT, '1'); }
  // 지금 보여 줄 안내. where: plan 계획 고르기 / goal 다음 목표 카드 / report 월간 보고. 없으면 null
  function tutTip(where) {
    if (!S || !S.org || S.tut.done) return null;
    const order = ['goal', 'plan', 'report'], key = { plan: 'p', goal: 'g', report: 'r' }[where];
    if (S.tut[key]) return null;
    if (where === 'plan' && !S.tut.g) return null;        // 홈에서는 화면 위쪽의 목표 안내부터, 한 번에 하나씩 보여 준다
    return { where, step: order.indexOf(where) + 1, of: 3 };
  }
  function tutNext(where) {
    if (!S || S.tut.done) return;
    S.tut[{ plan: 'p', goal: 'g', report: 'r' }[where]] = 1;
    if (S.tut.p && S.tut.g && S.tut.r) tutFinish();
    save();
  }
  function tutSkip() { if (S && !S.tut.done) { tutFinish(); save(); } }
  function tutReplay() { if (S) { S.tut = { p: 0, g: 0, r: 0, done: false, replay: true }; save(); } }
  // 관전 연출을 본 장면에 표시한다(다시 열면 연출 없이 같은 내용만 보여 준다). 판정·난수와 무관하다.
  function watched() { const sc = S && S.q[0]; if (sc && (sc.type === 'match' || sc.type === 'moment') && !sc.seen) { sc.seen = 1; save(); } }
  function celePlayed() { const sc = S && S.q[0]; if (sc && sc.cele === 1) { sc.cele = 2; save(); } }

  /* ---------- 진행 ---------- */
  // 이벤트 조건에 넘기는 도우미
  function rivalHelp() {
    const fx = rivalFixtures(), last = S.flags.rvLast;
    return {
      starter: isStarter(), facing: r => fx.includes(r),
      inLeague: r => !!S.lg && S.lg.ids.includes(r.org) && r.org !== S.org && r.squad === S.lg.tier,
      last: last && !last.used && S.stat.turns - last.turn <= 2 ? last : null,
    };
  }
  function eventScene() {
    const free = e => !S.recentEv.includes(e.id) && !(e.once && S.flags['ev_' + e.id]) && !(e.max && (S.evn[e.id] || 0) >= e.max);
    const norm = D.EVENTS.filter(e => !e.rv && !e.make && e.when(S) && free(e));
    // 라이벌 이벤트는 따로 모아, 조건이 맞는 것이 있을 때 정해진 비율로만 고른다(일반 이벤트를 밀어내지 않게).
    const H = rivalHelp(), rvs = [];
    for (const e of D.EVENTS) {
      if (!free(e)) continue;
      if (e.rv) { const r = e.rv(S, H); if (r) rvs.push([e, r]); }
      else if (e.make && e.when(S)) rvs.push([e, null]);
    }
    let ev, r = null;
    const hot = rvs.filter(x => x[0].news);
    if (hot.length && rnd() < B.rivalNewsShare) [ev, r] = pick(hot);
    else if (rvs.length && (!norm.length || rnd() < B.rivalEventShare)) { [ev, r] = pick(rvs); if (ev.make) r = leagueRival(); }
    else if (norm.length) ev = pick(norm);
    else return null;
    S.recentEv.push(ev.id); while (S.recentEv.length > B.eventMemory) S.recentEv.shift();
    if (ev.once) S.flags['ev_' + ev.id] = S.year;
    if (ev.max) S.evn[ev.id] = (S.evn[ev.id] || 0) + 1;
    if (r && ev.shown) ev.shown(S, r);
    const fill = t => rFill(typeof t === 'function' ? t(S, r) : t, r);
    return {
      type: 'event', ev: ev.id, rid: r ? r.id : null, title: fill(ev.title), text: fill(ev.text),
      choices: ev.c.map(c => { const ch = c.chk ? chance(c.chk) : null; return { label: fill(c.label), p: ch ? ch.p : null, bd: ch ? ch.bd : null, disabled: !!(c.need && S.money < c.need) }; }),
    };
  }
  const rFill = (t, r) => r ? String(t).replace(/\{r\}/g, r.nick).replace(/\{org\}/g, D.ORG[r.org].name) : t;
  function next() {
    if (!S || S.over || S.q.length) return;
    S.used = {};
    S.stat.turns++;
    if (!S.tut.done && !S.tut.replay && S.stat.turns > 3) tutFinish();   // 안내는 첫 3개월까지만
    if (S.stat.turns === 20) S.stat.t20 = Date.now() - S.stat.t0;   // 첫 20번 진행에 걸린 시간(기기 안에만 기록)
    const sc = MONTHS[S.m].type !== 'off' && S.injury === 0 && rnd() < (S.squad === 'trainee' ? B.eventChanceTrainee : B.eventChance) ? eventScene() : null;
    if (sc && S.stat.turns <= 20) S.stat.ev20++;
    if (sc) { S.q.push(sc); S.pendingSim = true; } else simMonth();
    save();
  }
  function flush() {
    while (!S.q.length && !S.over) {
      if (S.sim) runSim();
      else if (S.pendingSim) { S.pendingSim = false; simMonth(); }
      else if (S.pendingNewYear) { S.pendingNewYear = false; startYear(); break; }
      else break;
    }
  }
  function resolve(arg) {
    const sc = S.q[0]; if (!sc) return;
    const done = () => S.q.shift();
    switch (sc.type) {
      case 'pickOrg': {
        const of = sc.offers[arg]; if (!of) return;
        S.org = of.org; S.car.orgs.push(of.org); done(); startYear(); spawnRivals();
        log(`${of.name} 연습생으로 입단했다. 열여섯, 시작이다.`, 'good'); break;
      }
      case 'event': {
        const ev = D.EVENTS.find(e => e.id === sc.ev), c = ev.c[arg];
        if (!c || sc.choices[arg].disabled) return;
        let ok = true;
        if (c.chk) { ok = rnd() * 100 < sc.choices[arg].p; S.pity = ok ? 0 : S.pity + 1; }
        const r = ok ? c.ok : c.no, lines = applyFx(r.fx || {});
        const rv = sc.rid ? rivalOf(sc.rid) : null, text = rFill(r.t, rv);
        if (rv) {
          // 선택이 관계를 바꾸고, 사건 기록에 남는다.
          const d = r.rel || [0, 0], b0 = rv.rv, b1 = rv.rs; rRel(rv, d[0], d[1]);
          if (Math.round(rv.rv - b0)) lines.push(`${rv.nick} 경쟁심 ${sg(Math.round(rv.rv - b0))}`);
          if (Math.round(rv.rs - b1)) lines.push(`${rv.nick} 존중 ${sg(Math.round(rv.rs - b1))}`);
          rHist(rv, `${sc.title}: ${sc.choices[arg].label.replace(/ \(.*\)$/, '')} — ${text}`); rv.news = text;
        }
        S.q[0] = { type: 'result', title: sc.title, ok, checked: !!c.chk, p: sc.choices[arg].p, text, lines };
        log(`${sc.title} — ${text}`, ok ? '' : 'bad'); break;
      }
      case 'prematch': {
        const t = S.sim && S.sim.tour, c = t && t.cur;
        if (c && c.tac === null) c.tac = TAC[arg] ? arg : '';   // 한 번만 정해진다. 이미 정해진 시리즈에는 다시 적용하지 않는다
        done(); break;
      }
      case 'match': done(); break;
      case 'moment': {
        const t = S.sim && S.sim.tour, c = t && t.cur;
        if (!c) { done(); break; }                       // 대회 상태가 없으면 장면만 닫는다
        const i = arg === 'auto' ? bestChoice(sc) : arg; if (!sc.choices[i]) return;
        const m = t.ms[t.i], a = tRef(t, m.a), b = tRef(t, m.b), opp = a === t.me ? b : a, need = (m.bo + 1) / 2;
        const d = decideMoment(sc, i, c, arg === 'auto');
        const g = playSet(t, c, tStr(t, t.me), tStr(t, opp));
        S.q[0] = {
          type: 'mresult', ok: d.ok, p: sc.choices[i].p, i, title: sc.title, choice: d.label, text: d.text, eff: d.s,
          tour: sc.tour, label: sc.label, set: sc.set, me: sc.me, opp: sc.opp, x: c.x, y: c.y, setWin: g.win, over: c.x >= need || c.y >= need,
        };
        if (c.sets) { c.shown = c.sets.length; if (c.tac !== undefined) { S.q[0].pips = pips(c); S.q[0].tac = c.tac || ''; S.q[0].d = c.sets[c.sets.length - 1].d; } }

        break;
      }
      case 'cards': {
        if (arg === 'reroll') { if (sc.reroll > 0) { sc.reroll--; sc.cards = rollCards(); } break; }
        const c = D.CARDS.find(x => x.id === sc.cards[arg]); if (!c) return;
        if (c.perk) S.perks.push(c.perk);
        if (c.fx) { if (c.fx.cap == null) { const f = Object.assign({}, c.fx); delete f.all; for (const k in f) S.caps[k] = Math.min(99, S.caps[k] + f[k]); } applyFx(c.fx); }
        log(`성장 카드 [${c.name}] 획득.`, 'good'); done(); break;
      }
      case 'stove': {
        if (arg === 'retire') { retire('스스로 헤드셋을 내려놓았다.'); break; }
        if (arg === 'transfer') {
          const offers = genOffers(false); done();
          if (!offers.length) { addTrust(-8); S.q.unshift(info('이적 요청', '관심을 보인 팀이 없었다. 요청 사실이 알려져 감독의 눈초리가 차갑다.', 'bad', ['감독 신뢰 -8'])); }
          else S.q.unshift(offersScene(offers, true, '이적 시장에 이름을 올렸다. 잔류하면 감독 신뢰가 8 떨어진다.'));
          break;
        }
        done(); break;
      }
      case 'offers': {
        if (arg === 'stay') { if (!sc.canStay) return; addTrust(-8); done(); break; }
        if (arg === 'retire') { retire('스스로 헤드셋을 내려놓았다.'); break; }
        const of = sc.offers[arg.i]; if (!of) return;
        if (arg.act === 'nego') {
          if (of.p == null) return;
          if (rnd() * 100 < of.p) { of.salary = r100(of.salary * 1.15); sc.msg = `${of.name}: 인상안을 받아들였다. 연봉 ${fmtMoney(of.salary)}.`; }
          else if (rnd() < .35) { sc.offers.splice(arg.i, 1); sc.msg = `${of.name}: 협상 결렬. 제안을 거둬들였다.`; if (!sc.offers.length && !sc.canStay) S.q[0] = offersScene([], false); }
          else sc.msg = `${of.name}: 더는 올려 줄 수 없다고 한다.`;
          of.tries++; if (S.q[0] === sc) sc.offers.forEach(o => { if (o.p != null) o.p = negoP(o); });
          break;
        }
        joinOrg(of); done(); break;
      }
      case 'tryout': {
        const vet = S.car.g >= B.provenGames;
        if (arg !== 'try') { retire(vet ? '불러 주는 팀이 없었다. 미련 없이 헤드셋을 내려놓았다.' : '불러 주는 팀이 없었다. 조용히 무대를 떠났다.'); break; }
        S.car.tryouts++;
        const list = D.ORGS.filter(g => g.region === S.home).sort((a, b) => S.orgStr[a.id] - S.orgStr[b.id]);
        if (rnd() * 100 < sc.p) {
          // 경력자는 하위 구단 1군과 낮은 연봉의 1년 계약, 신인은 2군 1년 계약
          const of = makeOffer(pick(list.slice(0, vet ? 3 : 4)), vet ? 'first' : 'second'); of.years = 1; if (vet) of.salary = Math.max(3000, r100(of.salary * .5));
          joinOrg(of); done();
          S.q.unshift(info('테스트 합격', vet ? `${of.name}와(과) 1년 계약을 맺었다. 한 시즌 더 뛴다.` : `${of.name} 2군과 1년 계약을 맺었다. 다시 시작이다.`, 'good'));
        } else if (!vet && canRetry()) {
          // 한 번은 다시 도전할 수 있다: 최하위 구단이 최저 연봉으로 1년을 준다.
          S.car.retry++;
          const of = makeOffer(list[0], 'second'); of.years = 1; of.salary = 1200; joinOrg(of); S.trust = 30; done();
          S.stats.mental = Math.max(1, S.stats.mental - 2);
          S.q.unshift(info('마지막 기회', `테스트에는 떨어졌다. 그런데 ${of.name} 코치가 연락해 왔다. "연습 상대가 필요하다. 1년, 최저 연봉. 그 안에 보여 줘라." 다음 기회는 없다.`, 'bad', ['2군 1년 계약', '멘탈 -2']));
        } else retire(vet ? '마지막 입단 테스트에서도 자리를 얻지 못했다. 헤드셋을 내려놓을 때가 됐다.' : S.car.g ? '공개 테스트에서 떨어졌다. 받아 주는 팀은 끝내 없었다.' : '끝내 1군 무대를 밟지 못했다. 다른 길을 찾기로 했다.');
        break;
      }
      default: done();
    }
    flush(); save();
  }

  /* ---------- 저장 ----------
     KEY: 현재 진행 상황(행동마다 자동 저장). BAK: 매 시즌 시작 시점의 복구용 사본.
     저장 형식을 바꿀 때는 migrate() 에 기본값을 추가해 예전 저장도 열리게 한다. */
  function save() {
    if (!S) return;
    if (stale()) { conflict = true; return; }   // 다른 탭이 먼저 썼다: 덮어쓰지 않는다
    const json = JSON.stringify(S);
    store.set(KEY, json);
    if (backupNext) { backupNext = false; store.set(BAK, json); }
    saveFailed = store.get(KEY) !== json;
    if (!box) seenRaw = store.get(KEY);
    achCheck();
  }
  function migrate(s) {
    if (!s || typeof s !== 'object' || s.v !== 1 || !s.stats || !s.car || !Array.isArray(s.q)) return null;
    const def = (o, k, v) => { if (o[k] == null) o[k] = v; };
    def(s, 'opt', { fast: false }); def(s, 'used', {}); def(s, 'flags', {}); def(s, 'recentEv', []); def(s, 'perks', []); def(s, 'log', []); def(s, 'hist', []);
    def(s, 'pity', 0); def(s, 'injury', 0); def(s, 'recentMom', []); if (s.sim === undefined) s.sim = null;
    def(s, 'grow', 1); def(s, 'evn', {});
    normAuto(s); normRecap(s);   // 자동 관리 설정과 진행 요약(0.11.1): 없으면 꺼짐, 이상하면 버린다
    // 처음 안내: 이 값이 없는 저장은 안내가 생기기 전에 시작한 커리어다. 진행 중에 안내가 끼어들지 않게 끝난 것으로 둔다.
    if (!s.tut || typeof s.tut !== 'object') s.tut = { p: 1, g: 1, r: 1, done: true };
    // 팬 반응 상태: 없거나 깨져 있으면 처음부터(지난 경기를 지어내지 않는다)
    if (!s.fan || typeof s.fan !== 'object' || !Array.isArray(s.fan.seen) || !Number.isFinite(s.fan.g) || !Number.isFinite(s.fan.st)) s.fan = { g: 0, st: 0, seen: [] };
    s.fan.seen = s.fan.seen.filter(e => Array.isArray(e) && typeof e[0] === 'string' && Number.isFinite(e[1])).slice(-30);
    // 라이벌: 없으면 빈 목록(지나간 일을 지어내지 않는다). 손상된 항목은 버리거나 고쳐서 게임이 멈추지 않게 한다.
    if (!Array.isArray(s.rivals)) s.rivals = [];
    const ids = new Set(), num = (v, d, lo, hi) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d);
    s.rivals = s.rivals.filter(r => r && typeof r === 'object' && typeof r.id === 'string' && !ids.has(r.id) && ids.add(r.id));
    for (const r of s.rivals) {
      if (typeof r.nick !== 'string' || !r.nick) r.nick = 'Rival' + r.id;
      if (!D.ROLES.find(x => x.id === r.role)) r.role = s.role;
      if (!D.REGION[r.home]) r.home = s.home;
      if (!D.ORG[r.org]) r.org = D.ORGS.find(g => g.region === r.home).id;
      if (!(r.squad in RSQ)) r.squad = 'second';
      r.age = num(r.age, s.age, 15, 40); r.ovr = num(r.ovr, 60, 20, 99); r.pot = num(r.pot, r.ovr, r.ovr, 99); r.peak = num(r.peak, r.ovr, 20, 99);
      r.rv = num(r.rv, 20, 0, 100); r.rs = num(r.rs, 30, 0, 100); r.w = Math.floor(num(r.w, 0, 0, 1e5)); r.l = Math.floor(num(r.l, 0, 0, 1e5));
      for (const k of ['months', 'titles', 'debut', 'moves', 'out', 'slump']) r[k] = num(r[k], 0, 0, 1e4);
      if (!Array.isArray(r.mids)) r.mids = []; if (!Array.isArray(r.hist)) r.hist = [];
      r.hist = r.hist.filter(h => h && typeof h.t === 'string');
      if (!r.f || typeof r.f !== 'object') r.f = {};
      if (typeof r.news !== 'string') r.news = ''; if (typeof r.style !== 'string') r.style = STYLES[0]; if (!r.grow) r.grow = 'steady'; if (!r.origin) r.origin = 'league';
      if (r.retired && typeof r.retired !== 'object') r.retired = { y: s.year, age: r.age };
      if (!r.retired) r.retired = null;
    }
    s.rivalSeq = Math.max(num(s.rivalSeq, 0, 0, 1e6), ...s.rivals.map(r => +String(r.id).replace(/\D/g, '') || 0));
    def(s, 'stat', { turns: 99, t0: 0, t20: 0, ev20: 0 });   // 예전 저장: 첫 20번 측정 대상이 아니다
    def(s, 'monthsInOrg', 0); def(s, 'dom', { spring: {}, summer: {} });   // (0.6.0까지는 이 줄이 위 주석에 붙어 실행되지 않았다. 두 값이 없는 저장은 지금까지 없었다)
    s.shop = Object.assign({ gear: 0, coach: 0, care: 0 }, s.shop);
    for (const k of ['g', 'w', 'rs', 'mvp', 'k', 'd', 'a', 'g2', 'peak', 'earn', 'inj', 'moves', 'debut', 'tryouts', 'retry']) def(s.car, k, 0);
    for (const k of ['titles', 'awards', 'orgs']) def(s.car, k, []);
    if (!(s.m >= 0 && s.m < MONTHS.length)) s.m = 0;
    if (s.org && !D.ORG[s.org]) return null;
    if (!s.org && !(s.q[0] && s.q[0].type === 'pickOrg')) return null;
    if (s.org && !s.yr) s.yr = { g: 0, w: 0, rs: 0, mvp: 0, g1: 0, rs1: 0, titles: [], awards: [] };
    // 커리어 ID: 없던 시절의 저장은 내용에서 계산한다(같은 저장은 언제 열어도 같은 ID).
    if (typeof s.cid !== 'string' || !s.cid) s.cid = 'o' + hash36([s.nick, s.home, s.role, s.trait, s.stat.t0 || 0].join('|'));
    return s;
  }
  function read(key) { try { return migrate(JSON.parse(store.get(key) || 'null')); } catch (e) { return null; } }
  // 반환: 'ok' 정상, 'backup' 손상되어 시즌 시작 시점 사본으로 복구, '' 불러올 것이 없음
  function load() {
    seen();
    let s = read(KEY), from = 'ok';
    if (!s) {
      const raw = store.get(KEY);
      s = read(BAK); from = 'backup';
      if (!s) return '';
      if (raw) store.set(BAD, raw);   // 손상된 원본은 지우지 않고 따로 둔다
    }
    S = s;
    // 은퇴 화면에서 멈춘 저장인데 보관소에 없으면(예전 버전에서 은퇴했거나 그때 쓰지 못한 경우) 지금 넣는다. 일부러 지운 기록은 다시 넣지 않는다.
    const end = fin(S);
    if (end) { if (!end.rid) end.rid = S.cid; if (!legacy().recs.some(r => r.id === end.rid)) legacyAdd(recFromScene(end, S), true); }
    flush(); save(); return from;
  }
  // 구매의 실제 효과(직접 구매와 자동 구매가 같이 쓴다). 저장은 부르는 쪽에서 한다.
  function purchase(it) {
    const id = it.id;
    if (it.once) {
      if (S.used[id] || S.money < it.cost[0]) return false;
      S.money -= it.cost[0]; S.used[id] = 1;
      if (id === 'physio') addWrist(25); else { S.stats.mental = clamp(S.stats.mental + 1, 1, 99); setCond(S.cond + 12); }
    } else {
      const lv = S.shop[id]; if (lv >= it.cost.length || S.money < it.cost[lv]) return false;
      S.money -= it.cost[lv]; S.shop[id]++;
    }
    return true;
  }
  function buy(id) {
    const it = D.SHOP.find(x => x.id === id); if (!it || !S) return false;
    if (!purchase(it)) return false;
    if (it.once) (S.man || (S.man = {}))[id] = S.year * 100 + S.m;   // 이 달에 직접 샀다는 표시: 자동 관리가 같은 달에 또 사지 않는다
    save(); return true;
  }

  /* ---------- 자동 관리(0.11.1): 켜 둔 투자 항목을 매달 한 번 알아서 산다 ----------
     - 플레이어가 직접 켠 항목만. 새 커리어와 예전 저장은 전부 꺼져 있다(S.auto 가 없으면 아무 일도 하지 않고 판정도 예전과 같다).
     - 실행 시점은 한 군데: 월말 결산에서 월급을 받은 직후(finishMonth). 한 달에 한 번만(S.auto.at 에 실행한 달을 적는다).
     - 효과는 직접 구매(purchase)와 같다. 그 달에 이미 직접 산 "한 달에 한 번" 항목은 다시 사지 않는다.
     - 남겨 둘 돈(keep) 아래로는 쓰지 않고, 한 달 상한(cap, 0 = 제한 없음)을 넘기지 않는다. 모자라면 사지 않고 이유를 적는다. 빚은 없다.
     - 단계형 항목(장비·코치·식단)은 한 달에 한 단계까지만. 난수를 쓰지 않는다. */
  const autoOn = id => !!(S.auto && S.auto.on && S.auto.on[id]);
  function autoSpend() {
    const A = S.auto; if (!A || !A.on) return null;
    const list = D.SHOP.filter(it => A.on[it.id]); if (!list.length) return null;
    const stamp = S.year * 100 + S.m; if (A.at === stamp) return null;
    A.at = stamp;
    const keep = A.keep || 0, cap = A.cap || 0, out = { spent: 0, items: [] };
    for (const it of list.filter(x => x.once).concat(list.filter(x => !x.once))) {
      const lv = it.once ? 0 : S.shop[it.id], cost = it.once ? it.cost[0] : it.cost[lv];
      let why = '';
      if (!it.once && lv >= it.cost.length) { why = 'max'; delete A.on[it.id]; }   // 최대 단계: 더 살 것이 없으니 자동 설정을 끈다
      else if (it.once && (S.used[it.id] || (S.man && S.man[it.id] === stamp))) why = 'used';
      else if (it.id === 'physio' && S.wrist > B.auto.physioBelow) why = 'full';      // 손목이 충분하면 돈을 쓰지 않는다
      else if (cap && out.spent + cost > cap) why = 'cap';
      else if (S.money - cost < keep) why = 'low';
      if (!why && !purchase(it)) why = 'low';
      if (why) out.items.push({ id: it.id, cost: cost || 0, why });
      else { out.spent += cost; out.items.push({ id: it.id, cost, why: '' }); }
    }
    return out;
  }
  function setAuto(id, on) {
    if (!S || !D.SHOP.some(x => x.id === id)) return false;
    if (!S.auto) S.auto = { on: {}, keep: B.auto.keep, cap: 0 };
    if (on) S.auto.on[id] = 1; else delete S.auto.on[id];
    save(); return true;
  }
  function setAutoLimit(k, v) {
    if (!S || (k !== 'keep' && k !== 'cap') || !B.auto[k + 's'].includes(v)) return false;
    if (!S.auto) S.auto = { on: {}, keep: B.auto.keep, cap: 0 };
    S.auto[k] = v; save(); return true;
  }
  function autoInfo() {
    const A = S.auto || { on: {}, keep: B.auto.keep, cap: 0 };
    const items = D.SHOP.map(it => { const lv = it.once ? 0 : S.shop[it.id], max = !it.once && lv >= it.cost.length; return { id: it.id, name: it.name, desc: it.desc, once: !!it.once, on: !!A.on[it.id], lv, of: it.once ? 0 : it.cost.length, max, cost: max ? 0 : it.cost[lv], used: !!(it.once && S.used[it.id]) }; });
    return { items, keep: A.keep || 0, cap: A.cap || 0, n: items.filter(x => x.on).length, monthly: items.filter(x => x.on && x.once).reduce((a, x) => a + x.cost, 0), keeps: B.auto.keeps, caps: B.auto.caps };
  }
  // 저장에 들어 있는 자동 관리 설정을 안전한 모양으로 고친다(모르는 항목·이상한 값은 버린다. 값이 이상하면 꺼진 것으로 본다).
  function normAuto(s) {
    if (s.man != null) { const m = {}; if (typeof s.man === 'object' && !Array.isArray(s.man)) for (const it of D.SHOP) if (Number.isFinite(s.man[it.id]) && s.man[it.id] >= 0 && s.man[it.id] < 1e6) m[it.id] = Math.floor(s.man[it.id]); s.man = m; }
    const a = s.auto; if (a == null) return;
    if (typeof a !== 'object' || Array.isArray(a)) { delete s.auto; return; }
    const on = {}; if (a.on && typeof a.on === 'object' && !Array.isArray(a.on)) for (const it of D.SHOP) if (a.on[it.id] === 1 || a.on[it.id] === true) on[it.id] = 1;
    s.auto = { on, keep: B.auto.keeps.includes(a.keep) ? a.keep : B.auto.keep, cap: B.auto.caps.includes(a.cap) ? a.cap : 0 };
    if (Number.isFinite(a.at) && a.at >= 0 && a.at < 1e6) s.auto.at = Math.floor(a.at);
  }

  /* ---------- 진행 래퍼(0.11.1): "이번 달 진행"과 "다음 중요한 순간까지" ----------
     next() 와 resolve() 를 사람이 누르는 순서 그대로 부를 뿐이다. 판정·난수·저장 순서는 손으로 한 달씩 넘긴 것과 같다.
     - 자동으로 닫는 것은 "평범한 월간 보고" 하나뿐이다(ordinary). 닫으면서 그 내용을 S.lastRep(지난달 보고)과 S.recap(진행 요약)에 남긴다.
     - 선택이 필요한 장면(사건, 구단 선택, 경기 전 전략, 승부처, 성장 카드, 계약·이적)과 중요한 결과(경기 결과, 콜업·강등·우승 소식,
       시즌 결산, 은퇴, 처음 안내 중의 보고)는 건드리지 않는다. 대신 고르지 않는다.
     - 라이벌전이 있는 달은 그 달로 넘어가기 전에 멈춘다(할 일을 고를 수 있게). 그 달의 결과는 요약에 라이벌전 한 줄로 따로 적는다(S.recap.rv).
     - 사건에서 내가 고른 선택의 결과(result)는 고를 것이 없는 사실 전달이라 창을 띄우지 않고 요약(S.recap.ev)에 담는다.
     - 멈추는 조건: 장면이 생김 / 다음 달에 라이벌전 / 컨디션·손목이 위험 / 개월 수 상한 / 시간 상한. */
  const ordinary = sc => !!sc && sc.type === 'month' && S.tut.done && !S.over;
  function newRecap() { const mi = MONTHS[S.m]; return { y0: S.year, m0: mi.m, y1: S.year, m1: mi.m, n: 0, w: 0, l: 0, sal: 0, spent: 0, skip: 0, cond0: Math.round(S.cond), cond1: Math.round(S.cond), g: [], stop: '', cur: [S.year, mi.m] }; }
  function absorb(sc) {
    const r = S.recap || (S.recap = newRecap());
    r.n++; r.y1 = r.cur[0]; r.m1 = r.cur[1];
    for (const m of sc.matches) { if (m.plays) m.win ? r.w++ : r.l++; if (m.rv && m.rv.length && (r.rv || (r.rv = [])).length < 6) r.rv.push({ nick: m.rv[0].nick, opp: m.opp, win: !!m.win }); }
    r.sal += sc.salary || 0;
    if (sc.auto) { r.spent += sc.auto.spent; r.skip += sc.auto.items.filter(x => x.why === 'low' || x.why === 'cap').length; }
    for (const g of sc.growth) { const e = r.g.find(x => x[0] === g[0]); if (e) e[1] = Math.round((e[1] + g[1]) * 10) / 10; else if (r.g.length < 16) r.g.push([g[0], g[1]]); }
    r.cond1 = Math.round(S.cond);
    S.lastRep = sc;
  }
  function settle() {
    let n = 0;
    while (S && !S.over && S.q.length && n < 24) {
      const sc = S.q[0];
      if (ordinary(sc)) absorb(sc);
      else if (sc.type === 'result' && S.tut.done) (S.recap || (S.recap = newRecap())).ev = sc;   // 내가 고른 사건의 결과: 창 대신 플레이 화면 맨 위에 보여 준다
      else break;
      resolve(); n++;
    }
    return n;
  }
  // was = 진행을 시작할 때 이미 낮았는가. 이미 알고 누른 상태로는 다시 멈추지 않고, 진행 중에 새로 위험해졌을 때만 멈춘다.
  function stopWhy(was) {
    if (rivalFixtures().length) return 'rival';
    if (S.injury > 0) return '';                       // 재활 중에는 컨디션·손목 때문에 멈추지 않는다(할 수 있는 것이 없다)
    if (S.cond < B.run.cond && !was.cond) return 'cond';
    if (S.wrist <= B.run.wrist && !was.wrist) return 'wrist';
    return '';
  }
  function advance(max) {
    if (!S || S.over || S.q.length || stale()) return 0;
    max = clamp(Math.floor(max) || 1, 1, B.run.max);
    S.recap = newRecap();
    const t0 = Date.now(), was = { cond: S.cond < B.run.cond, wrist: S.wrist <= B.run.wrist }; let k = 0;
    while (k < max) {
      const mi = MONTHS[S.m]; S.recap.cur = [S.year, mi.m];
      next(); k++; settle();
      if (!S || S.over || S.q.length) { if (S && S.recap) S.recap.stop = 'scene'; break; }
      if (k >= max) { S.recap.stop = max > 1 ? 'max' : ''; break; }
      const why = stopWhy(was); if (why) { S.recap.stop = why; break; }
      if (Date.now() - t0 > B.run.ms) { S.recap.stop = 'time'; break; }
    }
    if (S) save();
    return k;
  }
  function normRecap(s) {
    const r = s.recap, num = v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1e12;
    if (r != null && !(typeof r === 'object' && !Array.isArray(r) && ['y0', 'm0', 'y1', 'm1', 'n', 'w', 'l', 'sal', 'spent', 'skip', 'cond0', 'cond1'].every(k => num(r[k])) && typeof r.stop === 'string' && r.stop.length < 12
      && Array.isArray(r.g) && r.g.length <= 16 && r.g.every(x => fits(x, 'pair')) && Array.isArray(r.cur) && r.cur.length === 2 && r.cur.every(num) && (r.ev == null || fits(r.ev, SCENE.result)) && fits(r.rv, [{ nick: 's', opp: 's', win: 'b' }, 0, 6, '?']))) delete s.recap;
    if (s.lastRep != null && !(validScene(s.lastRep) && s.lastRep.type === 'month')) delete s.lastRep;
  }

  /* ---------- 경기 체험(0.11.0) ----------
     타이틀의 "경기 체험하기"가 쓴다. 실제 엔진으로 새 선수를 만들어 1군 토너먼트 시리즈 직전까지 자동으로 진행한 뒤 멈춘다.
     백업 검사(dryRun)와 같은 방식으로 저장소를 메모리 상자로 바꿔 놓고 돌리므로, 체험 중의 저장·명예의 전당·도전 과제 쓰기는
     전부 그 상자 안에서 끝나고 실제 기기 저장에는 한 글자도 닿지 않는다. 진행 중인 커리어(S)와 난수도 따로 떼어 두었다가 demoEnd 에서 되돌린다. */
  let demo = null;
  function demoStart(seed) {
    if (demo || box) return false;
    demo = { S, rnd, saveFailed, backupNext, legRaw, legObj, legFail, addFail, achRaw, achObj, achFail };
    let a = (seed >>> 0) || 1, ok = false;
    box = {}; legRaw = achRaw = null; legObj = achObj = null;
    rnd = function () { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const t0 = Date.now();
    try {
      for (let k = 0; k < 40 && !ok && Date.now() - t0 < 3000; k++) {
        newGame({ nick: '체험선수', region: D.REGIONS[(seed + k) % D.REGIONS.length].id, role: D.ROLES[(seed + k) % D.ROLES.length].id, trait: D.TRAITS[(seed + k) % D.TRAITS.length].id });
        for (let i = 0; i < 6000 && S && !S.over; i++) {
          const sc = S.q[0];
          if (sc && sc.type === 'prematch' && S.squad === 'first') { ok = true; break; }
          autoStep();
        }
      }
    } catch (e) { ok = false; }
    if (!ok) { demoEnd(); return false; }
    return true;
  }
  function demoEnd() {
    if (!demo) return;
    box = null;
    ({ S, rnd, saveFailed, backupNext, legRaw, legObj, legFail, addFail, achRaw, achObj, achFail } = demo);
    demo = null;
  }
  // 자동 진행 (밸런스 검증용)
  let autoTac = null;   // 검사용: 자동 진행이 고를 전략을 정하는 함수(없으면 전략 없음)
  function autoStep() {
    const sc = S.q[0];
    if (!sc) { S.plan = S.cond < 38 || S.wrist < 35 ? 'rest' : ['solo', 'scrim', 'review'][(S.year * 10 + S.m) % 3]; next(); return; }
    if (sc.type === 'pickOrg' || sc.type === 'cards') return resolve(ri(0, 2));
    if (sc.type === 'event') { let b = 0, bv = -1; sc.choices.forEach((c, i) => { const v = c.disabled ? -2 : c.p == null ? 55 : c.p; if (v > bv) { bv = v; b = i; } }); return resolve(b); }
    if (sc.type === 'moment') return resolve('auto');
    if (sc.type === 'prematch') return resolve(autoTac ? autoTac(sc, S) : '');   // 기본은 전략 없음: 판정이 0.10.2와 같다
    if (sc.type === 'match') return resolve();
    if (sc.type === 'offers') {
      // 1군 제안을 가장 먼저, 그다음 2군, 연습생 순으로 받는다. 잔류할 수 있을 때는 1군 제안이 있을 때만 옮긴다.
      const rank = { first: 0, second: 1, trainee: 2 };
      let b = 0; sc.offers.forEach((o, i) => { const c = sc.offers[b]; if (rank[o.squad] < rank[c.squad] || (rank[o.squad] === rank[c.squad] && o.salary > c.salary)) b = i; });
      if (sc.canStay && sc.offers[b].squad !== 'first') return resolve('stay');
      return resolve({ i: b, act: 'accept' });
    }
    if (sc.type === 'stove') {
      // 2군에서 스무 살을 넘겼는데 1군 기준에 한참 못 미치면 기회를 찾아 이적을 요청한다.
      const stuck = S.squad === 'second' && S.age >= 20 && ovr() < S.orgStr[S.org] - B.toFirstGap - 2;
      return resolve(stuck ? 'transfer' : 'stay');
    }
    if (sc.type === 'tryout') return resolve(sc.p >= 15 ? 'try' : 'retire');   // 가망이 거의 없으면 받아들인다
    resolve();
  }

  // 홈 화면의 "다음 목표": 지금 소속에서 다음 단계로 가는 조건과 현재 수치
  function goal() {
    const o = Math.floor(ovr()), base = S.orgStr[S.org], when = S.m <= 2 ? '4월 말' : S.m <= 6 ? '8월 말' : '11월 스토브리그';
    const it = (label, cur, need) => ({ label, cur, need, ok: cur >= need });
    if (S.squad === 'trainee') return {
      title: '2군 콜업', items: [it('OVR', o, Math.ceil(base - B.toSecondGap)), it('코치 평가', Math.round(S.trust), B.toSecondTrust), it('입단 개월', S.monthsInOrg, B.toSecondMonths)],
      note: `다음 심사는 ${when}. ${B.traineeMaxAge}세가 되는 스토브리그까지 2군에 오르지 못하면 방출된다.`,
    };
    if (S.squad === 'second') {
      const p = Math.round(slotChance() * 100), le = S.flags.lastEval;
      const seat = rivalsAlive().find(r => r.org === S.org && r.squad === 'second' && r.role === S.role);
      return {
        title: '1군 콜업', items: [it('OVR', o, Math.ceil(base - B.toFirstGap)), it('감독 신뢰', Math.round(S.trust), B.toFirstTrust)],
        note: (p ? `조건 충족. 다음 심사(${when})에서 자리가 날 확률 ${p}%. OVR이 오를수록 확률도 오른다.` : `두 조건을 채우면 심사(${when}) 때 자리 경쟁에 들어간다.`)
          + ` ${B.secondMaxAge}세가 되는 스토브리그까지 1군에 오르지 못하면 방출된다.` + (le && !le.ok && le.y === S.year ? ' 지난 심사에서는 자리가 나지 않았다.' : '')
          + (seat ? ` 같은 포지션의 ${seat.nick}(OVR ${Math.floor(seat.ovr)})도 같은 자리를 노린다.` : ''),
      };
    }
    if (!isStarter()) return { title: '주전 자리', items: [it('감독 신뢰', Math.round(S.trust), 45)], note: '벤치에서는 다섯 경기에 한 번꼴로 나선다. 출전한 경기의 평점과 팀 스크림으로 신뢰가 오른다.' };
    const rank = table().findIndex(x => x.me) + 1;
    return {
      title: '플레이오프와 국제 대회', items: rank ? [{ label: '리그 순위', cur: rank, need: 4, ok: rank <= 4, low: true }] : [],
      note: '4위 안에 들면 플레이오프, 결승에 오르면 국제 대회에 나간다.' + (S.trust < 35 ? ' 감독 신뢰가 낮다. 더 떨어지면 2군으로 내려갈 수 있다.' : ''),
    };
  }

  const Game = {
    D, MONTHS, SQUAD, VERSION, seed, rand: () => rnd(), goal, newGame, load, save, next, resolve, buy, table, fmtMoney, autoStep, evaluate,
    state: () => S, scene: () => S && S.q[0], ovr: () => S ? ovr() : 0, isStarter, org, region, role,
    setPlan(id) { if (S && D.PLANS.find(p => p.id === id)) { S.plan = id; save(); } },
    setFast(v) { S.opt.fast = !!v; save(); },
    advance, settle, setAuto, setAutoLimit, autoInfo, lastRep: () => (S && S.lastRep) || null, recap: () => (S && S.recap) || null,
    month: () => MONTHS[S.m],
    // 첫 20번 진행 측정값(이 기기에만 있다): 걸린 시간(ms, 화면을 꺼 둔 시간 포함)과 이벤트 수
    metrics: () => S ? Object.assign({}, S.stat) : null,
    fanReact, FAN_GAP, tutTip, tutNext, tutSkip, tutReplay, celePlayed, watched, demoStart, demoEnd, inDemo: () => !!demo,
    _autoTac: f => { autoTac = typeof f === 'function' ? f : null; },
    rivals: () => S ? S.rivals.map(rivalView) : [],
    roleLabel, roleReview, offerInfo,
    rivalFixtures: () => (S && S.org ? rivalFixtures().map(r => ({ nick: r.nick, org: D.ORG[r.org].name, w: r.w, l: r.l })) : []),
    pot(k) { const c = S.caps[k]; return c >= 95 ? 'S' : c >= 90 ? 'A' : c >= 85 ? 'B' : 'C'; },
    hasSave() { return !!(read(KEY) || read(BAK)); },
    // 타이틀 화면에 보여 줄 저장 요약
    saveInfo() { const s = read(KEY) || read(BAK); return s ? { nick: s.nick, year: s.year, age: s.age, over: !!s.over, started: !!s.org } : null; },
    storageOk: () => store.ok(), saveFailed: () => saveFailed,
    // 명예의 전당: 보관소의 기록(예전 30명 포함). sort: score 점수, titles 우승, recent 최근 은퇴
    hall(sort) {
      const r = legacy().recs.map((x, i) => [x, i]), big = x => x.big || 0;
      const by = { titles: (a, b) => big(b[0]) - big(a[0]) || b[0].score - a[0].score || a[1] - b[1], recent: (a, b) => (b[0].at || 0) - (a[0].at || 0) || b[1] - a[1] }[sort] || ((a, b) => b[0].score - a[0].score || a[1] - b[1]);
      return r.sort(by).map(x => x[0]);
    },
    hallGet: id => legacy().recs.find(r => r.id === id) || null,
    hallDel: legacyDel, hallUndo: legacyUndo, hallTrash: () => legacy().trash.slice(),
    hallInfo: () => ({ n: legacy().recs.length, max: LEG_MAX, failed: legFail || addFail }),
    achList, achSeen, achFresh: () => ach().fresh.slice(), achInfo: () => ({ n: Object.keys(ach().got).length, of: D.ACH.length, runs: ach().runs.n, failed: achFail }),
    exportData, importCheck, importApply, BACKUP_MAX, validScene,
    // 은퇴 화면의 기록(보관소에 쓰지 못했어도 카드는 만들 수 있게)
    endRec: () => (S && fin(S) ? recFromScene(fin(S), S) : null),
    wipe() { if (stale()) { conflict = true; return; } store.del(KEY); store.del(BAK); S = null; seen(); },
    // 다른 탭이 커리어 저장을 바꿨는가(그렇다면 이 탭은 저장하지 않는다. 새로 고치면 풀린다)
    stale,
    // 검사용: 저장소를 직접 바꾼 뒤 그 값을 이 탭이 본 것으로 맞춘다(게임 화면은 쓰지 않는다)
    _seen: seen,
  };
  (root.PG_VER = root.PG_VER || {}).engine = VERSION;
  root.PG = Game;
  if (typeof module !== 'undefined') module.exports = Game;
})(typeof window !== 'undefined' ? window : globalThis);
