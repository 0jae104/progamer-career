/* 프로게이머 키우기 — 게임 엔진 (화면과 분리된 순수 로직. Node 에서도 실행 가능) */
(function (root) {
  const D = root.PG_DATA || require('./data.js');
  const KEY = 'pg_career_v1', BAK = 'pg_career_v1_bak', BAD = 'pg_career_v1_bad', HALL = 'pg_hall_v1';
  const mem = {};
  const store = {
    get(k) { try { if (root.localStorage) return root.localStorage.getItem(k); } catch (e) {} return mem[k] || null; },
    set(k, v) { mem[k] = v; try { if (root.localStorage) root.localStorage.setItem(k, v); } catch (e) {} },
    del(k) { delete mem[k]; try { if (root.localStorage) root.localStorage.removeItem(k); } catch (e) {} },
    // 브라우저 저장소에 실제로 쓸 수 있는지 (사생활 보호 모드, 용량 초과 등에서는 false)
    ok() { try { if (!root.localStorage) return false; root.localStorage.setItem('pg_probe', '1'); root.localStorage.removeItem('pg_probe'); return true; } catch (e) { return false; } },
  };
  let saveFailed = false;

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
  const rnd = Math.random;
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
      else if (k === 'cond') { setCond(S.cond + v); out.push(`컨디션 ${sg(v)}`); }
      else if (k === 'wrist') { addWrist(v); out.push(`손목 ${sg(v)}`); }
      else if (k === 'trust') { addTrust(v); out.push(`감독 신뢰 ${sg(v)}`); }
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
      else { const v = Math.round((S.stats[k] - 50) * .6 * chk[k]); p += v; bd.push([statName(k) + ' ' + Math.floor(S.stats[k]), v]); }
    }
    if (has('nerve')) { p += 8; bd.push(['강심장', 8]); }
    if (S.pity > 0) { const v = Math.min(18, S.pity * 6); p += v; bd.push(['연속 불운 보정', v]); }
    return { p: clamp(Math.round(p), 5, 95), bd };
  }

  /* ---------- 시작 ---------- */
  function newGame(o) {
    const r = D.ROLES.find(x => x.id === o.role);
    store.del(BAK);
    S = {
      v: 1, nick: String(o.nick || 'Player').slice(0, 12), home: o.region, role: o.role, trait: o.trait,
      age: 16, year: 1, m: 0, stats: {}, caps: {}, cond: 80, trust: 30, fame: 0, money: 100, wrist: 100,
      org: null, squad: 'trainee', contract: { salary: 600, years: 3 }, plan: 'solo', monthsInOrg: 0,
      perks: [], shop: { gear: 0, coach: 0, care: 0 }, used: {}, buff: null, injury: 0, pity: 0, recentEv: [],
      orgStr: {}, lg: null, dom: {}, yr: null, hist: [], log: [], q: [], flags: {}, opt: { fast: false },
      car: { g: 0, w: 0, rs: 0, mvp: 0, k: 0, d: 0, a: 0, g2: 0, titles: [], awards: [], peak: 0, earn: 0, orgs: [], inj: 0, moves: 0, debut: 0 },
      pendingSim: false, pendingNewYear: false, over: false, sim: null, recentMom: [],
    };
    const talent = gauss() * 3.5;
    for (const s of D.STATS) {
      const w = r.w[s.id];
      let v = 34 + rnd() * 8 + w * 45, c = 70 + talent + rnd() * 12 + w * 22;
      if (o.trait === 'genius') { if (s.id === 'mech' || s.id === 'reflex') { v += 4; c += 5; } if (s.id === 'mental') v -= 4; }
      if (o.trait === 'grinder') { v += 1; c -= 1; }
      if (o.trait === 'brain') { if (s.id === 'sense') { v += 5; c += 6; } if (s.id === 'pool') { v += 3; c += 5; } if (s.id === 'mental') c += 2; }
      S.stats[s.id] = v; S.caps[s.id] = clamp(c, 60, 99);
    }
    for (const g of D.ORGS) S.orgStr[g.id] = g.str;
    const list = D.ORGS.filter(g => g.region === o.region);
    const picks = [list[ri(0, 1)], list[ri(3, 4)], list[ri(6, 7)]];
    const notes = ['명문 구단. 코치진이 좋아 성장이 빠르지만 1군 문턱이 매우 높다.', '중위권 구단. 성장과 기회의 균형이 좋다.', '하위권 구단. 데뷔는 빠르지만 팀 전력이 약하다.'];
    S.q.push({ type: 'pickOrg', offers: picks.map((g, i) => ({ org: g.id, name: g.name, str: g.str, note: notes[i] })) });
    save(); return S;
  }

  function startYear() {
    for (const g of D.ORGS) S.orgStr[g.id] = clamp(S.orgStr[g.id] + gauss() * 2.2 + (g.str - S.orgStr[g.id]) * .25, 58, 93);
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
  function effStr(T, plays, mod) {
    if (!plays) return T;
    return T + (ovr() - T) * .22 + (S.cond - 60) / 40 * 1.2 + (has('dynasty') ? 2 : 0) + (mod ? mod.s : 0);
  }
  function playGame(T, O, stage, plays, mod) {
    const o = ovr(), cadj = (S.cond - 60) / 40;
    const g = { win: rnd() < winP(effStr(T, plays, mod), O), plays, r: 0, k: 0, d: 0, a: 0 };
    if (plays) {
      let r = 6.3 + (o - (T + O) / 2) / 11 + cadj * .5 + (g.win ? .45 : -.45) + gauss() * .75 + (S.buff ? S.buff.r : 0) + (mod ? mod.r : 0);
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
    m.mvp = m.win && m.r >= 8 && rnd() < .5;
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
  const newSeries = () => ({ x: 0, y: 0, plays: decidePlays(), rs: 0, n: 0, k: 0, d: 0, a: 0, mom: 0, mod: null, asked: -1, used: [], moms: [] });

  // 승부처가 나오는 세트: 결승은 어느 한쪽이 매치 포인트인 세트마다(시리즈당 최대 3회), 그 밖의 시리즈는 마지막 세트 1회
  function momentDue(m, c, need) {
    if (!c.plays) return false;
    const last = c.x === need - 1 && c.y === need - 1;
    return m.label === '결승' ? (c.x === need - 1 || c.y === need - 1) && c.mom < 3 : last && c.mom < 1;
  }
  function momentScene(t, m, c, need, T, O, opp) {
    const sit = c.x === need - 1 && c.y === need - 1 ? 'last' : c.x === need - 1 ? 'match' : 'elim';
    let pool = D.MOMENTS.filter(x => !c.used.includes(x.id) && !S.recentMom.includes(x.id) && (x.sit === 'any' || x.sit === sit));
    const exact = pool.filter(x => x.sit === sit);
    if (exact.length && rnd() < .5) pool = exact;
    if (!pool.length) pool = D.MOMENTS.filter(x => x.sit === 'any' && !c.used.includes(x.id));
    const mo = pick(pool), pct = v => Math.round(v * 100);
    c.used.push(mo.id); S.recentMom.push(mo.id); if (S.recentMom.length > 6) S.recentMom.shift();
    return {
      type: 'moment', mid: mo.id, tour: t.name, label: m.label, bo: m.bo, set: c.x + c.y + 1, me: tName(t, t.me), opp: tName(t, opp), x: c.x, y: c.y, sit,
      title: mo.title, text: mo.text, base: pct(winP(effStr(T, true), O)),
      choices: mo.c.map(ch => {
        const k = chance(ch.chk);
        return { label: ch.label, p: k.p, bd: k.bd, up: pct(winP(effStr(T, true, { s: ch.s[0] }), O)), down: pct(winP(effStr(T, true, { s: ch.s[1] }), O)) };
      }),
    };
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
    const g = playGame(T, O, t.stage, c.plays, c.mod); c.mod = null;
    g.win ? c.x++ : c.y++;
    if (c.plays) { c.rs += g.r; c.n++; c.k += g.k; c.d += g.d; c.a += g.a; }
    return g;
  }
  // 반환: true 대회가 끝남, false 승부처 장면을 띄우고 멈춤
  function runTour(t) {
    while (t.i < t.ms.length) {
      const m = t.ms[t.i], a = tRef(t, m.a), b = tRef(t, m.b), need = (m.bo + 1) / 2;
      if (!t.me || (a !== t.me && b !== t.me)) {
        const p = winP(tStr(t, a), tStr(t, b)); let x = 0, y = 0;
        while (x < need && y < need) rnd() < p ? x++ : y++;
        t.w[t.i++] = x > y ? a : b; continue;
      }
      const opp = a === t.me ? b : a, T = tStr(t, t.me), O = tStr(t, opp);
      if (!t.cur) t.cur = newSeries();
      const c = t.cur;
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
      t.w[t.i++] = win ? t.me : opp; t.cur = null;
    }
    return true;
  }
  const newTour = (o) => Object.assign({ w: [], i: 0, cur: null, lines: [] }, o);

  function title(name, tier) {
    S.car.titles.push({ y: S.year, name, tier }); S.yr.titles.push(name);
    const fame = { world: 14, mid: 8, nations: 10, dom: 5, second: 1 }[tier];
    const prize = { world: 20000, mid: 8000, nations: 3000, dom: 3000, second: 200 }[tier];
    addFame(fame); earn(prize); log(`${name}! 상금 ${fmtMoney(prize)}`, 'gold');
    return info('우승', name, 'gold', [`상금 ${fmtMoney(prize)}`, `인기 상승`]);
  }
  function award(name, fame) { S.car.awards.push({ y: S.year, name }); S.yr.awards.push(name); addFame(fame); log(`${name} 수상`, 'gold'); }

  function npcFinalists(rid) {
    const a = D.ORGS.filter(g => g.region === rid).map(g => ({ id: g.id, s: S.orgStr[g.id] + gauss() * 4 })).sort((x, y) => y.s - x.s);
    return { champ: a[0].id, runner: a[1].id };
  }

  function evaluateSquad(after) {
    const o = ovr(), base = S.orgStr[S.org], pay = region().pay;
    if (S.squad === 'trainee') {
      if (S.monthsInOrg >= 5 && o >= base - 26) {
        S.squad = 'second'; S.trust = 40; S.contract.salary = Math.max(S.contract.salary, r100(2400 * pay));
        after.push(info('2군 콜업', `${org().name} 2군 로스터에 이름을 올렸다. 다음 스플릿부터 ${region().lg} 넥스트에 출전한다.`, 'good'));
        log('2군 콜업. 연습생 딱지를 뗐다.', 'good');
      }
    } else if (S.squad === 'second') {
      if (o >= base - 8 && S.trust >= 55) {
        S.squad = 'first'; S.trust = 30; if (!S.car.debut) S.car.debut = S.age; S.contract.salary = Math.max(S.contract.salary, r100(salaryFor(org(), o) * .5)); S.contract.years = Math.max(S.contract.years, 2);
        after.push(info('1군 콜업', `${org().name} 1군에 합류했다. 감독 신뢰 45 이상이면 주전으로 나선다. 자리는 스스로 만들어야 한다.`, 'good'));
        log('1군 콜업. 꿈의 무대가 눈앞이다.', 'good');
      }
    } else if (S.trust < 25 && o < base - 12) {
      S.squad = 'second'; S.trust = 45;
      after.push(info('2군행 통보', '감독이 2군에서 다시 증명하고 오라고 했다.', 'bad'));
      log('2군으로 내려갔다.', 'bad');
    }
  }

  function leagueMonth(mi, sim) {
    const L = S.lg, rep = sim.rep;
    if (!L) {
      rep.notes.push('연습생 평가전과 훈련으로 한 달을 보냈다.');
      if (mi.playoff) { for (const r of D.REGIONS) S.dom[mi.split][r.id] = npcFinalists(r.id); evaluateSquad(sim.after); }
      return;
    }
    const first = L.tier === 'first';
    for (let r = mi.rounds[0]; r < mi.rounds[1]; r++) for (const [a, b] of L.rounds[r]) {
      let win;
      if (a === S.org || b === S.org) {
        const opp = a === S.org ? b : a, plays = decidePlays();
        const g = playGame(str(S.org, L.tier), str(opp, L.tier), 'league', plays);
        const m = Object.assign(g, { opp: D.ORG[opp].name }); record(m, first, 'league'); rep.matches.push(m);
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
    if (t.kind === 'playoff') {
      const ru = ch === t.w[0] ? t.w[1] : t.w[0];
      rep.matches.push(...t.lines);
      for (const r of D.REGIONS) S.dom[t.split][r.id] = npcFinalists(r.id);
      if (t.first) S.dom[t.split][org().region] = { champ: ch, runner: ru };
      if (ch === S.org) after.push(title(`${t.lgTag} ${SPLIT[t.split]} 우승`, t.first ? 'dom' : 'second'));
      else rep.notes.push(`${SPLIT[t.split]} 우승: ${D.ORG[ch].name}${ru === S.org ? ' — 준우승으로 마쳤다.' : ''}`);
      const L = S.lg;
      if (t.first && L && L.sg >= 9) {
        const avg = L.srs / L.sg;
        if (t.my <= 3 && avg >= 7.4 && rnd() < clamp((avg - 7.2) * 1.2, .05, .95)) {
          award(`${region().lg} ${SPLIT[t.split]} MVP`, 6);
          after.push(info('스플릿 MVP', `정규 리그 평균 평점 ${avg.toFixed(2)}. 기자단 투표로 MVP에 선정됐다.`, 'gold'));
        }
      }
      evaluateSquad(after);
    } else if (t.kind === 'intl') {
      if (!t.me) { rep.notes.push(`${t.name}: ${D.ORG[ch].name} 우승. 나는 화면으로 지켜봤다.`); return; }
      rep.matches.push(...t.lines);
      if (ch === S.org) after.push(title(`${t.name} 우승`, t.cup));
      else {
        rep.notes.push(`${t.name} ${last.label}에서 ${last.opp}에 막혔다. 우승은 ${D.ORG[ch].name}.`);
        log(`${t.name} ${last.label} 탈락.`);
        if (last.label === '결승') { addFame(4); earn(t.cup === 'world' ? 6000 : 2500); }
      }
    } else {
      rep.matches.push(...t.lines);
      if (ch === 'me') after.push(title('네이션스컵 금메달', 'nations'));
      else rep.notes.push(t.lines.length > 1 ? '네이션스컵 은메달. 시상대에서 고개를 들지 못했다.' : '네이션스컵 4강에서 탈락했다.');
    }
  }

  /* ---------- 성장 ---------- */
  function ageFactor() {
    const a = S.age; let f = a <= 17 ? 1.35 : a <= 19 ? 1.15 : a <= 21 ? .85 : a <= 23 ? .55 : a <= 25 ? .3 : .15;
    if (S.trait === 'genius' && a <= 19) f += .15;
    return f;
  }
  function applyPlan(plan, playFactor) {
    const coachF = .92 + (org().str - 62) / 160, tf = S.trait === 'grinder' ? 1.12 : 1, af = ageFactor();
    for (const s of D.STATS) {
      const k = s.id, cur = S.stats[k], cap = S.caps[k];
      let g = .4 * (plan.base == null ? 1 : plan.base) * playFactor + (plan.g[k] || 0) * (plan.id === 'solo' && has('grind') ? 1.3 : 1);
      g *= af * tf * coachF;
      if (k === 'mech' || k === 'reflex') g *= 1 + .05 * S.shop.gear; else if (k !== 'mental') g *= 1 + .05 * S.shop.coach;
      g *= Math.max(0, 1 - Math.pow(cur / cap, 4)) * (.7 + rnd() * .6);
      S.stats[k] = clamp(cur + g, 1, 99);
    }
    let c = plan.cond; if (c < 0 && S.trait === 'grinder') c *= .75;
    setCond(S.cond + c + 4 + S.shop.care * 1.5);
    addWrist(plan.wrist + 1 - (S.age > 24 ? .5 : 0));
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
    const sim = S.sim = { before: Object.assign({}, S.stats), after: [], rep, plan: plan.id, g0: S.yr.g, tour: null };
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
    if (S.squad === 'trainee') addTrust(o >= S.orgStr[S.org] - 26 ? 3 : 1);
    else { const T = str(S.org, S.squad); addTrust(o >= T ? 3 : o >= T - 5 ? 1.5 : o < T - 14 ? -2 : 0); }
    const sal = Math.round(S.contract.salary / 10); earn(sal); rep.salary = sal;
    if (S.buff && --S.buff.m <= 0) S.buff = null;
    if (S.injury > 0) S.injury--;
    else if (S.wrist <= 20) {
      S.injury = 2; S.wrist = 50; S.car.inj++;
      after.push(info('손목 부상', '버티던 손목이 결국 탈이 났다. 두 달간 경기에 나설 수 없다. 휴식과 물리치료로 손목을 관리하자.', 'bad'));
      log('손목 부상. 2개월 결장.', 'bad');
    }
    for (const s of D.STATS) { const d = S.stats[s.id] - before[s.id]; if (Math.abs(d) >= .05) rep.growth.push([s.name, Math.round(d * 10) / 10]); }
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
    for (const g of D.ORGS) {
      if (g.id === S.org) continue;
      if (g.region !== S.home && !(o >= 76 || S.fame >= 45)) continue;
      const gap = o - S.orgStr[g.id] + gauss() * 3;
      if (gap >= -9 + Math.max(0, S.age - 24) * 3.5) cand.push(makeOffer(g, 'first'));
      else if (S.age <= 20 && gap >= -28) cand.push(makeOffer(g, 'second'));
      else if (S.age <= 18 && gap >= -42) cand.push(makeOffer(g, 'trainee'));
    }
    cand.sort((a, b) => b.salary - a.salary);
    out.push(...cand.splice(0, 2)); if (cand.length) out.push(cand.splice(ri(0, cand.length - 1), 1)[0]);
    if (withRenew) {
      const base = S.orgStr[S.org];
      const want = S.squad === 'first' ? o >= base - 12 - (S.trust - 50) / 10 + Math.max(0, S.age - 24) * 3.5 : S.squad === 'second' ? S.age <= 22 : S.age < 19;
      if (want) out.unshift(makeOffer(org(), S.squad, true));
    }
    return out;
  }
  function negoP(of) { return clamp(Math.round(40 + (ovr() - S.orgStr[of.org]) * 2 + S.fame * .2 - of.tries * 15), 5, 90); }
  function offersScene(offers, canStay, msg) {
    if (!offers.length && !canStay) {
      const p = clamp(Math.round(50 + (ovr() - 55) * 2 - Math.max(0, S.age - 23) * 9), 5, 90);
      return { type: 'tryout', p, text: '계약을 제안한 팀이 없다. 공개 테스트에 지원해 2군 자리를 노리거나, 여기서 선수 생활을 마칠 수 있다.' };
    }
    offers.forEach(of => { of.p = of.squad === 'first' ? negoP(of) : null; });
    return { type: 'offers', offers, canStay, msg: msg || '' };
  }
  function joinOrg(of) {
    const moved = of.org !== S.org;
    S.org = of.org; S.squad = of.squad; S.contract = { salary: of.salary, years: of.years };
    if (moved) { S.trust = of.squad === 'first' ? 35 : 45; S.monthsInOrg = 0; S.car.moves++; if (!S.car.orgs.includes(of.org)) S.car.orgs.push(of.org); }
    if (of.squad === 'first' && !S.car.debut) S.car.debut = S.age;
    log(`${of.name}와(과) ${of.years}년 계약. ${SQUAD[of.squad]}, 연봉 ${fmtMoney(of.salary)}.`, 'good');
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
    // 나이
    S.age++; S.year++;
    const st = (S.trait === 'brain' ? 24 : 23) + (has('late') ? 2 : 0), a = S.age;
    const fade = (k, v) => { if (v > 0) { S.stats[k] = Math.max(20, S.stats[k] - v); S.caps[k] = Math.max(30, S.caps[k] - v); } };
    if (a > st) fade('reflex', (a - st) * 1.5 + 1 + rnd());
    if (a > st + 1) fade('mech', (a - st - 1) * 1.3 + .5 + rnd() * .5);
    if (a > st + 3) for (const k of ['sense', 'team', 'pool', 'mental']) fade(k, 1.2);
    S.fame *= .97; S.pendingNewYear = true;
    if (S.age >= 36) { retire('서른여섯. 손이 더는 따라오지 않는다.'); return; }
    after.push({ type: 'cards', cards: rollCards(), reroll: 1 });
    S.contract.years--;
    const released = (S.squad === 'trainee' && S.age >= 19) || (S.squad === 'second' && S.age >= 25);
    if (released) after.push(info('방출 통보', S.squad === 'trainee' ? '연습생 계약이 끝났다. 구단은 재계약 의사가 없다고 전했다.' : '구단이 2군 로스터를 젊은 선수들로 채우기로 했다. 계약 해지 통보를 받았다.', 'bad'));
    if (released || S.contract.years <= 0) after.push(offersScene(genOffers(!released), false, '계약이 만료됐다. 다음 행선지를 정하자.'));
    else after.push({ type: 'stove', years: S.contract.years, salary: S.contract.salary, canRetire: S.age >= 20 });
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
    const grade = score >= 90 ? 'S+' : score >= 76 ? 'S' : score >= 58 ? 'A' : score >= 44 ? 'B' : score >= 30 ? 'C' : score >= 16 ? 'D' : 'F';
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
      type: 'retire', reason, nick: S.nick, role: role().name, age: S.age, years: S.hist.length,
      g: c.g, w: c.w, avg: c.g ? c.rs / c.g : 0, mvp: c.mvp, kda: c.d ? (c.k + c.a) / c.d : 0, peak: Math.floor(c.peak), earn: c.earn,
      titles: c.titles.slice(), awards: c.awards.slice(), orgs: c.orgs.map(id => D.ORG[id].name),
    }, ev);
    S.q = [sc];
    let hall = []; try { hall = JSON.parse(store.get(HALL) || '[]'); } catch (e) {}
    hall.push({ nick: S.nick, role: role().name, score: ev.score, grade: ev.grade, ep: ev.ep, peak: sc.peak, titles: c.titles.filter(t => t.tier !== 'second').length, years: sc.years });
    hall.sort((a, b) => b.score - a.score); store.set(HALL, JSON.stringify(hall.slice(0, 30)));
  }

  /* ---------- 진행 ---------- */
  function eventScene() {
    const ok = D.EVENTS.filter(e => e.when(S) && !S.recentEv.includes(e.id));
    if (!ok.length) return null;
    const ev = pick(ok); S.recentEv.push(ev.id); if (S.recentEv.length > 5) S.recentEv.shift();
    return {
      type: 'event', ev: ev.id, title: ev.title, text: ev.text,
      choices: ev.c.map(c => { const ch = c.chk ? chance(c.chk) : null; return { label: c.label, p: ch ? ch.p : null, bd: ch ? ch.bd : null, disabled: !!(c.need && S.money < c.need) }; }),
    };
  }
  function next() {
    if (!S || S.over || S.q.length) return;
    S.used = {};
    const sc = MONTHS[S.m].type !== 'off' && S.injury === 0 && rnd() < .55 ? eventScene() : null;
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
        S.org = of.org; S.car.orgs.push(of.org); done(); startYear();
        log(`${of.name} 연습생으로 입단했다. 열여섯, 시작이다.`, 'good'); break;
      }
      case 'event': {
        const ev = D.EVENTS.find(e => e.id === sc.ev), c = ev.c[arg];
        if (!c || sc.choices[arg].disabled) return;
        let ok = true;
        if (c.chk) { ok = rnd() * 100 < sc.choices[arg].p; S.pity = ok ? 0 : S.pity + 1; }
        const r = ok ? c.ok : c.no, lines = applyFx(r.fx);
        S.q[0] = { type: 'result', title: ev.title, ok, checked: !!c.chk, p: sc.choices[arg].p, text: r.t, lines };
        log(`${ev.title} — ${r.t}`, ok ? '' : 'bad'); break;
      }
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
        if (arg !== 'try') { retire('불러 주는 팀이 없었다. 조용히 무대를 떠났다.'); break; }
        if (rnd() * 100 < sc.p) {
          const list = D.ORGS.filter(g => g.region === S.home).sort((a, b) => S.orgStr[a.id] - S.orgStr[b.id]);
          const of = makeOffer(pick(list.slice(0, 4)), 'second'); of.years = 1; joinOrg(of); done();
          S.q.unshift(info('테스트 합격', `${of.name} 2군과 1년 계약을 맺었다. 다시 시작이다.`, 'good'));
        } else retire('공개 테스트에서 떨어졌다. 받아 주는 팀은 끝내 없었다.');
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
    const json = JSON.stringify(S);
    store.set(KEY, json);
    if (backupNext) { backupNext = false; store.set(BAK, json); }
    saveFailed = store.get(KEY) !== json;
  }
  function migrate(s) {
    if (!s || typeof s !== 'object' || s.v !== 1 || !s.stats || !s.car || !Array.isArray(s.q)) return null;
    const def = (o, k, v) => { if (o[k] == null) o[k] = v; };
    def(s, 'opt', { fast: false }); def(s, 'used', {}); def(s, 'flags', {}); def(s, 'recentEv', []); def(s, 'perks', []); def(s, 'log', []); def(s, 'hist', []);
    def(s, 'pity', 0); def(s, 'injury', 0); def(s, 'recentMom', []); if (s.sim === undefined) s.sim = null; def(s, 'monthsInOrg', 0); def(s, 'dom', { spring: {}, summer: {} });
    s.shop = Object.assign({ gear: 0, coach: 0, care: 0 }, s.shop);
    for (const k of ['g', 'w', 'rs', 'mvp', 'k', 'd', 'a', 'g2', 'peak', 'earn', 'inj', 'moves', 'debut']) def(s.car, k, 0);
    for (const k of ['titles', 'awards', 'orgs']) def(s.car, k, []);
    if (!(s.m >= 0 && s.m < MONTHS.length)) s.m = 0;
    if (s.org && !D.ORG[s.org]) return null;
    if (!s.org && !(s.q[0] && s.q[0].type === 'pickOrg')) return null;
    if (s.org && !s.yr) s.yr = { g: 0, w: 0, rs: 0, mvp: 0, g1: 0, rs1: 0, titles: [], awards: [] };
    return s;
  }
  function read(key) { try { return migrate(JSON.parse(store.get(key) || 'null')); } catch (e) { return null; } }
  // 반환: 'ok' 정상, 'backup' 손상되어 시즌 시작 시점 사본으로 복구, '' 불러올 것이 없음
  function load() {
    let s = read(KEY), from = 'ok';
    if (!s) {
      const raw = store.get(KEY);
      s = read(BAK); from = 'backup';
      if (!s) return '';
      if (raw) store.set(BAD, raw);   // 손상된 원본은 지우지 않고 따로 둔다
    }
    S = s; flush(); save(); return from;
  }
  function buy(id) {
    const it = D.SHOP.find(x => x.id === id); if (!it || !S) return false;
    if (it.once) {
      if (S.used[id] || S.money < it.cost[0]) return false;
      S.money -= it.cost[0]; S.used[id] = 1;
      if (id === 'physio') addWrist(25); else { S.stats.mental = clamp(S.stats.mental + 1, 1, 99); setCond(S.cond + 12); }
    } else {
      const lv = S.shop[id]; if (lv >= it.cost.length || S.money < it.cost[lv]) return false;
      S.money -= it.cost[lv]; S.shop[id]++;
    }
    save(); return true;
  }

  // 자동 진행 (밸런스 검증용)
  function autoStep() {
    const sc = S.q[0];
    if (!sc) { S.plan = S.cond < 38 || S.wrist < 35 ? 'rest' : ['solo', 'scrim', 'review'][(S.year * 10 + S.m) % 3]; next(); return; }
    if (sc.type === 'pickOrg' || sc.type === 'cards') return resolve(ri(0, 2));
    if (sc.type === 'event') { let b = 0, bv = -1; sc.choices.forEach((c, i) => { const v = c.disabled ? -2 : c.p == null ? 55 : c.p; if (v > bv) { bv = v; b = i; } }); return resolve(b); }
    if (sc.type === 'moment') return resolve('auto');
    if (sc.type === 'offers') return resolve({ i: 0, act: 'accept' });
    if (sc.type === 'stove') return resolve('stay');
    if (sc.type === 'tryout') return resolve('try');
    resolve();
  }

  const Game = {
    D, MONTHS, SQUAD, newGame, load, save, next, resolve, buy, table, fmtMoney, autoStep, evaluate,
    state: () => S, scene: () => S && S.q[0], ovr: () => S ? ovr() : 0, isStarter, org, region, role,
    setPlan(id) { if (S && D.PLANS.find(p => p.id === id)) { S.plan = id; save(); } },
    setFast(v) { S.opt.fast = !!v; save(); },
    month: () => MONTHS[S.m],
    pot(k) { const c = S.caps[k]; return c >= 95 ? 'S' : c >= 90 ? 'A' : c >= 85 ? 'B' : 'C'; },
    hasSave() { return !!(read(KEY) || read(BAK)); },
    // 타이틀 화면에 보여 줄 저장 요약
    saveInfo() { const s = read(KEY) || read(BAK); return s ? { nick: s.nick, year: s.year, age: s.age, over: !!s.over, started: !!s.org } : null; },
    storageOk: () => store.ok(), saveFailed: () => saveFailed,
    hall() { try { return JSON.parse(store.get(HALL) || '[]'); } catch (e) { return []; } },
    wipe() { store.del(KEY); store.del(BAK); S = null; },
  };
  root.PG = Game;
  if (typeof module !== 'undefined') module.exports = Game;
})(typeof window !== 'undefined' ? window : globalThis);
