/* 프로게이머 키우기 — 화면 */
(function () {
  const G = window.PG, D = G.D, app = document.getElementById('app');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const U = { view: 'title', tab: 'home', C: { nick: '', region: 'kr', role: 'core', trait: 'genius' }, confirm: '', notice: '' };
  const money = G.fmtMoney, f1 = v => (Math.round(v * 10) / 10).toFixed(1);

  /* ---- 도트 아바타 (직접 그린 14×14 스프라이트) ---- */
  const SPRITE = ['....hhhhhh....', '...hhhhhhhh...', '..hhhhhhhhhh..', '.kkhhsssshhkk.', '.kksssssssskk.', '.kksesssseskk.', '..ssssssssss..',
    '..m.ssssss....', '..mmm.ss......', '....jjssjj....', '..jjjjjjjjjj..', '.jjjdjjjjdjjj.', '.jjjdjjjjdjjj.', '.jjjdjjjjdjjj.'];
  const HAIR = ['#23264a', '#5a3b2a', '#c9a24b', '#7b4bd1', '#d94f6b', '#2f8f83'], SKIN = ['#f6d3b0', '#e8b88f', '#c98f66'];
  function hash(s) { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
  function drawAvatars() {
    app.querySelectorAll('canvas.av').forEach(cv => {
      const h = hash(cv.dataset.seed || 'x'), x = cv.getContext('2d');
      const pal = { h: HAIR[h % HAIR.length], s: SKIN[(h >> 3) % SKIN.length], e: '#0e1126', k: '#62e4ff', m: '#62e4ff', j: cv.dataset.color || '#ff4d6d', d: 'rgba(14,17,38,.45)' };
      cv.width = cv.height = 14; x.clearRect(0, 0, 14, 14);
      SPRITE.forEach((row, y) => [...row].forEach((ch, i) => {
        if (ch === '.') return;
        if (ch === 'd') { x.fillStyle = pal.j; x.fillRect(i, y, 1, 1); }
        x.fillStyle = pal[ch]; x.fillRect(i, y, 1, 1);
      }));
      if ((h >> 5) % 2) { x.fillStyle = pal.h; x.fillRect(5, 3, 2, 1); }
    });
  }

  /* ---- 화면 ---- */
  function vTitle() {
    const sv = G.saveInfo(), live = sv && !sv.over;
    return `<section class="title">
      <p class="eyebrow onair">E-SPORTS CAREER SIM</p>
      <h1>프로<br>게이머<br><em>키우기</em></h1>
      <p class="lede">열여섯 연습생에서 월드 파이널까지. 팀이 아니라 선수 한 명의 커리어 전체를 살아 본다.</p>
      <div class="stage"><canvas class="av" data-seed="title" data-color="#ff4d6d"></canvas><p>연습생 → 2군 → 1군 벤치 → 주전 → 국가대표 → 올해의 선수</p></div>
      <div class="stack">
        ${sv ? `<button class="btn cta" data-act="continue">${sv.over ? '지난 커리어 결과 보기' : '이어하기'}<small>${esc(sv.nick)} · ${sv.started ? `${sv.year}년차 ${sv.age}세` : '입단 구단 선택 중'}</small></button>` : ''}
        <button class="btn ${sv ? 'ghost' : ''}" data-act="create">${live && U.confirm === 'new' ? '한 번 더 누르면 진행 중인 커리어가 삭제된다' : '새 커리어'}</button>
        <button class="btn line" data-act="hall">명예의 전당</button>
      </div>
      ${U.notice ? `<p class="warn">${U.notice}</p>` : ''}
      ${G.storageOk() ? '' : '<p class="warn">이 브라우저에서는 저장이 되지 않는다. 사생활 보호 모드를 끄거나 다른 브라우저로 열어야 진행 상황이 남는다.</p>'}
      <p class="fine">등장하는 리그·구단·선수·대회는 모두 창작이며 실제와 관계가 없습니다. 진행 상황은 이 기기의 브라우저에 저장되며, 브라우저 데이터를 지우면 함께 사라집니다.</p>
    </section>`;
  }
  const opt = (grp, id, name, desc) => `<button class="opt" data-act="pick" data-grp="${grp}" data-id="${id}" aria-pressed="${U.C[grp] === id}"><b>${name}</b>${desc ? `<span>${desc}</span>` : ''}</button>`;
  function vCreate() {
    return `<section class="page">
      <div><p class="eyebrow">NEW CAREER</p><h2>선수 등록</h2></div>
      <div class="field"><label for="nick">선수 아이디 (최대 10자)</label><input id="nick" maxlength="10" autocomplete="off" placeholder="예: Haneul" value="${esc(U.C.nick)}"></div>
      <div class="field"><span class="lab">국적 — 처음 뛸 리그와 대표팀이 정해진다</span><div class="opts c2">${D.REGIONS.map(r => opt('region', r.id, r.name, r.lgName)).join('')}</div></div>
      <div class="field"><span class="lab">포지션</span><div class="opts">${D.ROLES.map(r => opt('role', r.id, r.name, r.desc)).join('')}</div></div>
      <div class="field"><span class="lab">성향</span><div class="opts">${D.TRAITS.map(t => opt('trait', t.id, t.name, t.desc)).join('')}</div></div>
      <button class="btn" data-act="start">입단 테스트 보러 가기</button>
      <button class="btn line" data-act="title">돌아가기</button>
    </section>`;
  }
  function vHall() {
    const h = G.hall();
    return `<section class="page"><div><p class="eyebrow">HALL OF FAME</p><h2>명예의 전당</h2></div>
      ${h.length ? `<div class="scroll-x"><table><tr><th>선수</th><th class="l">평가</th><th>최고</th><th>우승</th><th>점수</th></tr>
        ${h.map(r => `<tr><td><b>${esc(r.nick)}</b> <span class="dim">${r.role}</span></td><td class="l">${r.grade} · ${r.ep}</td><td>${r.peak}</td><td>${r.titles}</td><td>${r.score}</td></tr>`).join('')}</table></div>`
        : '<p class="dim">아직 은퇴한 선수가 없다. 첫 커리어를 끝까지 살아 보자.</p>'}
      <button class="btn line" data-act="title">돌아가기</button></section>`;
  }

  const meter = (name, v, cls) => `<div class="meter"><span>${name}<b>${Math.round(v)}</b></span><div class="bar ${cls || ''} ${v < 35 ? 'low' : ''}"><i style="width:${Math.round(v)}%"></i></div></div>`;
  function header(S) {
    const o = G.org(), st = S.squad === 'trainee' ? '연습생' : `${G.SQUAD[S.squad]} ${S.injury ? '부상' : G.isStarter() ? '주전' : '벤치'}`;
    return `<header class="lower" style="--team:${o.color}">
      <canvas class="av" data-seed="${esc(S.nick)}" data-color="${o.color}"></canvas>
      <div class="who"><b>${esc(S.nick)}</b><span>${G.role().name} · ${o.name} ${st} · ${S.age}세</span></div>
      <div class="ovr"><b>${Math.floor(G.ovr())}</b><span>OVR</span></div></header>
      <div class="meters">${meter('컨디션', S.cond)}${meter('손목', S.wrist)}${meter(S.squad === 'trainee' ? '코치 평가' : '감독 신뢰', S.trust)}${meter('인기', S.fame, 'gold')}</div>`;
  }
  function tHome(S) {
    const mi = G.month(), c = S.contract;
    return `<div class="now"><div><p class="eyebrow">${S.year}년차 · ${mi.m}월</p><h2>${mi.label}</h2></div><p>${hint(S, mi)}</p></div>
      <div class="kv"><div><span>자금</span><b>${money(S.money)}</b></div><div><span>연봉</span><b>${money(c.salary)}</b></div><div><span>계약</span><b>${c.years}년 남음</b></div></div>
      <div><p class="sec">이번 달 계획</p>${D.PLANS.map(p => `<button class="plan" data-act="plan" data-id="${p.id}" aria-pressed="${S.plan === p.id}"><i></i><div><b>${p.name}</b><span>${p.desc}</span></div></button>`).join('')}</div>
      <div><p class="sec">소식</p><ul class="log">${S.log.slice(0, 12).map(l => `<li class="${l.tone}"><time>${l.y}년차 ${l.m}월</time><span>${esc(l.msg)}</span></li>`).join('') || '<li class="dim">아직 소식이 없다.</li>'}</ul></div>`;
  }
  function hint(S, mi) {
    if (S.injury) return `부상 재활 ${S.injury}개월 남음`;
    if (S.squad === 'trainee') return '평가를 쌓아 2군 콜업을 노린다';
    if (mi.type === 'league') return G.isStarter() ? '주전으로 출전한다' : '벤치. 신뢰를 쌓아야 한다';
    if (mi.type === 'off') return '시즌 결산과 계약';
    return mi.type === 'nations' && S.year % 2 ? '리그 휴식기' : '진출 팀만 출전한다';
  }
  function tStats(S) {
    const perks = D.CARDS.filter(c => c.perk && S.perks.includes(c.perk));
    return `<div><p class="sec">능력치 <span class="chip">오른쪽 글자는 잠재력</span></p>
      ${D.STATS.map(s => `<div class="stat"><span class="nm">${s.name}</span><div class="bar"><i style="width:${Math.floor(S.stats[s.id])}%"></i></div><span class="v">${Math.floor(S.stats[s.id])}</span><span class="pot ${G.pot(s.id)}">${G.pot(s.id)}</span><small>${s.tip} · 포지션 비중 ${Math.round(G.role().w[s.id] * 100)}%</small></div>`).join('')}</div>
      <div><p class="sec">특성</p>${perks.length ? `<div class="stack">${perks.map(c => `<div class="card"><b>${c.name}</b><br><span class="dim">${c.desc}</span></div>`).join('')}</div>` : '<p class="dim">시즌이 끝날 때마다 성장 카드를 한 장 고른다.</p>'}</div>
      <div class="card"><b>${D.TRAITS.find(t => t.id === S.trait).name}</b><br><span class="dim">${D.TRAITS.find(t => t.id === S.trait).desc}</span></div>`;
  }
  function tLeague(S) {
    const t = G.table(), y = S.yr, r = G.region();
    const tb = t.length ? `<p class="sec">${r.lgName}${S.lg.tier === 'second' ? ' 넥스트(2군)' : ''} · ${S.lg.split === 'spring' ? '스프링' : '서머'}</p>
      <table><tr><th>순위</th><th class="l">팀</th><th>승</th><th>패</th></tr>${t.map((x, i) => `<tr class="${x.me ? 'me' : ''} ${i === 3 ? 'cut' : ''}"><td>${i + 1}</td><td class="l"><i class="tagdot" style="background:${x.color}"></i>${x.name}</td><td>${x.w}</td><td>${x.l}</td></tr>`).join('')}</table>
      <p class="fine">상위 4팀이 플레이오프에 오른다. ${S.lg.tier === 'first' ? '우승·준우승 팀은 국제 대회에 나간다.' : ''}</p>` : '<p class="dim">연습생은 리그에 출전하지 않는다. 능력치가 팀 2군 기준에 닿으면 스플릿이 끝날 때 콜업된다.</p>';
    return `<div>${tb}</div><div><p class="sec">올해 내 성적</p><div class="kv"><div><span>경기</span><b>${y.g}</b></div><div><span>승률</span><b>${y.g ? Math.round(y.w / y.g * 100) + '%' : '-'}</b></div><div><span>평균 평점</span><b>${y.g ? f1(y.rs / y.g) : '-'}</b></div></div></div>
      <div class="card"><b>올해 일정</b><br><span class="dim">2~4월 스프링 → 5월 미드시즌 컵 → 6~8월 서머 → 9월 네이션스컵(짝수 연차) → 10월 월드 파이널 → 11월 시상식·스토브리그</span></div>`;
  }
  function tShop(S) {
    return `<div><p class="sec">투자 · 자금 ${money(S.money)}</p>${D.SHOP.map(it => {
      const lv = it.once ? 0 : S.shop[it.id], max = !it.once && lv >= it.cost.length, cost = max ? 0 : it.cost[it.once ? 0 : lv], used = it.once && S.used[it.id];
      return `<div class="shop"><div class="grow" style="flex:1"><b>${it.name}</b><span>${it.desc}</span>${it.once ? '' : `<div class="pips">${it.cost.map((_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div>`}</div>
        <button data-act="buy" data-id="${it.id}" ${max || used || S.money < cost ? 'disabled' : ''}>${max ? '최대' : used ? '이번 달 완료' : money(cost)}</button></div>`;
    }).join('')}</div>`;
  }
  function tRecord(S) {
    const c = S.car;
    return `<div><p class="sec">통산</p><div class="kv"><div><span>1군 경기</span><b>${c.g}</b></div><div><span>평균 평점</span><b>${c.g ? f1(c.rs / c.g) : '-'}</b></div><div><span>경기 MVP</span><b>${c.mvp}</b></div></div></div>
      <div><p class="sec">트로피·수상</p>${c.titles.length + c.awards.length ? `<div class="chips">${c.titles.map(t => `<span class="chip gold">${t.y}년차 ${t.name}</span>`).join('')}${c.awards.map(a => `<span class="chip">${a.y}년차 ${a.name}</span>`).join('')}</div>` : '<p class="dim">아직 비어 있다.</p>'}</div>
      <div><p class="sec">시즌 기록</p>${S.hist.length ? `<div class="scroll-x"><table><tr><th>연차</th><th class="l">팀</th><th>경기</th><th>승</th><th>평점</th><th>OVR</th></tr>${S.hist.map(h => `<tr><td>${h.year} <span class="dim">${h.age}세</span></td><td class="l">${h.tag} ${G.SQUAD[h.squad]}</td><td>${h.g}</td><td>${h.w}</td><td>${h.g ? f1(h.avg) : '-'}</td><td>${h.ovr}</td></tr>`).join('')}</table></div>` : '<p class="dim">첫 시즌을 마치면 기록이 쌓인다.</p>'}</div>
      <div class="stack"><p class="sec">설정</p>
        <button class="btn line" data-act="fast">빠른 진행 ${S.opt.fast ? '켜짐' : '꺼짐'} — 평범한 달의 결과 화면을 건너뛴다</button>
        <button class="btn line" data-act="title">타이틀로 (자동 저장됨)</button>
        <button class="btn line" data-act="wipe">${U.confirm === 'wipe' ? '한 번 더 누르면 이 커리어가 삭제된다' : '커리어 삭제'}</button></div>`;
  }

  /* ---- 장면 ---- */
  const okBtn = t => `<button class="btn" data-act="ok">${t || '확인'}</button>`;
  const pill = p => p == null ? '<span class="pill sure">확정</span>' : `<span class="pill ${p >= 65 ? 'hi' : p < 40 ? 'lo' : ''}">${p}%</span>`;
  const matchList = ms => ms.length ? `<ul class="matches">${ms.map(m => `<li><span class="opp">${m.label ? `<small>${m.label}</small>` : ''}vs ${m.opp}</span><span class="res ${m.win ? 'W' : 'L'}">${m.score ? m.score + ' ' : ''}${m.win ? '승' : '패'}</span>${m.plays ? `<span class="rt">${f1(m.r)}</span><span class="kda">${m.k}/${m.d}/${m.a}${m.mvp ? '<span class="mvp">MVP</span>' : ''}</span>` : '<span class="rt dim">-</span><span class="kda">벤치</span>'}</li>`).join('')}</ul>` : '';
  function retireBtn() { return `<button class="btn line" data-act="retire">${U.confirm === 'retire' ? '한 번 더 누르면 은퇴한다. 되돌릴 수 없다' : '은퇴한다'}</button>`; }

  function vScene(sc, S) {
    let cls = sc.tone || '', h = '';
    switch (sc.type) {
      case 'pickOrg':
        h = `<p class="eyebrow">TRYOUT PASSED</p><h2>세 구단의 제안</h2><p>입단 테스트를 통과했다. 연습생 계약을 맺을 구단을 고르자.</p>
          ${sc.offers.map((o, i) => `<button class="choice" data-act="res" data-i="${i}"><div class="grow"><b>${o.name}</b><small>${o.note}</small></div><span class="pill sure">전력 ${o.str}</span></button>`).join('')}`; break;
      case 'event':
        h = `<p class="eyebrow">선택의 순간</p><h2>${sc.title}</h2><p>${sc.text}</p>
          ${sc.choices.map((c, i) => `<button class="choice" data-act="res" data-i="${i}" ${c.disabled ? 'disabled' : ''}><div class="grow"><b>${c.label}</b>${c.bd ? `<small>${c.bd.map(b => `${b[0]} ${b[1] >= 0 && b[0] !== '기본' ? '+' : ''}${b[1]}`).join(' · ')}</small>` : ''}${c.disabled ? '<small>자금이 부족하다</small>' : ''}</div>${pill(c.p)}</button>`).join('')}
          <p class="fine">표시된 숫자가 실제 성공 확률이다. 실패가 이어지면 다음 판정에 보정이 붙는다.</p>`; break;
      case 'result':
        cls = sc.checked ? (sc.ok ? 'good' : 'bad') : '';
        h = `${sc.checked ? `<span class="stamp ${sc.ok ? 'ok' : 'no'}">${sc.ok ? '성공' : '실패'} · ${sc.p}%</span>` : ''}<h2>${sc.title}</h2><p>${sc.text}</p>
          <div class="chips">${sc.lines.map(l => `<span class="chip ${/[-]\d|하락/.test(l) ? 'down' : 'up'}">${l}</span>`).join('')}</div>${okBtn()}`; break;
      case 'month':
        h = `<p class="eyebrow">${sc.title} · ${sc.plan}</p><h2>${sc.sub}</h2>${matchList(sc.matches)}
          ${sc.notes.map(n => `<p>${n}</p>`).join('')}
          <div class="chips">${sc.growth.map(g => `<span class="chip ${g[1] > 0 ? 'up' : 'down'}">${g[0]} ${g[1] > 0 ? '+' : ''}${g[1]}</span>`).join('')}<span class="chip">OVR ${sc.ovr}</span><span class="chip">월급 +${money(sc.salary)}</span></div>${okBtn()}`; break;
      case 'info':
        h = `<h2>${sc.title}</h2><p>${sc.text}</p>${sc.lines.length ? `<div class="chips">${sc.lines.map(l => `<span class="chip ${sc.tone === 'gold' ? 'gold' : ''}">${l}</span>`).join('')}</div>` : ''}${okBtn()}`; break;
      case 'season':
        h = `<p class="eyebrow">SEASON ${sc.year}</p><h2>${sc.year}년차 결산</h2><p>${sc.org} ${G.SQUAD[sc.squad]} · ${sc.age}세 · OVR ${sc.ovr}</p>
          <div class="kv"><div><span>경기</span><b>${sc.g}</b></div><div><span>승</span><b>${sc.w}</b></div><div><span>평균 평점</span><b>${sc.g ? f1(sc.avg) : '-'}</b></div></div>
          <div class="chips">${sc.titles.map(t => `<span class="chip gold">${t}</span>`).join('')}${sc.awards.map(t => `<span class="chip gold">${t}</span>`).join('')}${sc.mvp ? `<span class="chip">경기 MVP ${sc.mvp}회</span>` : ''}${!sc.titles.length && !sc.awards.length ? '<span class="chip">무관</span>' : ''}</div>${okBtn('스토브리그로')}`; break;
      case 'cards':
        h = `<p class="eyebrow">OFF-SEASON</p><h2>성장 카드</h2><p>비시즌 동안 무엇을 얻었을까. 한 장을 고른다.</p>
          ${sc.cards.map((id, i) => { const c = D.CARDS.find(x => x.id === id); return `<button class="gcard r${c.r}" data-act="res" data-i="${i}"><small>${D.RARITY[c.r]}</small><b>${c.name}</b><span>${c.desc}</span></button>`; }).join('')}
          <button class="btn line" data-act="reroll" ${sc.reroll ? '' : 'disabled'}>다시 뽑기 (${sc.reroll}회 남음)</button>`; break;
      case 'stove':
        h = `<p class="eyebrow">STOVE LEAGUE</p><h2>스토브리그</h2><p>${G.org().name}와의 계약이 ${sc.years}년 남았다. 연봉 ${money(sc.salary)}.</p>
          <button class="btn" data-act="stay">잔류한다</button><button class="btn ghost" data-act="transfer">이적을 요청한다</button>${sc.canRetire ? retireBtn() : ''}
          <p class="fine">이적을 요청했다가 잔류하면 감독 신뢰가 떨어진다.</p>`; break;
      case 'offers':
        h = `<p class="eyebrow">CONTRACT</p><h2>계약 제안</h2><p>${sc.msg}</p>
          ${sc.offers.map((o, i) => `<div class="offer"><div class="row"><div class="grow"><b>${o.name}</b> <span class="dim">${o.region}${o.renew ? ' · 재계약' : ''}</span><br><span class="dim">${G.SQUAD[o.squad]} · ${o.years}년 · 연봉</span> <b>${money(o.salary)}</b></div></div>
            <div class="btns"><button class="btn" data-act="accept" data-i="${i}">계약</button><button class="btn ghost" data-act="nego" data-i="${i}" ${o.p == null ? 'disabled' : ''}>${o.p == null ? '협상 불가' : `15% 인상 요구 ${o.p}%`}</button></div></div>`).join('')}
          ${sc.canStay ? '<button class="btn ghost" data-act="stay">잔류한다</button>' : ''}${S.age >= 20 ? retireBtn() : ''}
          <p class="fine">인상 요구가 실패하면 제안이 철회될 수 있다.</p>`; break;
      case 'tryout':
        cls = 'bad';
        h = `<h2>무소속</h2><p>${sc.text}</p><button class="choice" data-act="try"><div class="grow"><b>공개 테스트에 지원한다</b><small>떨어지면 그대로 은퇴한다</small></div>${pill(sc.p)}</button>${retireBtn()}`; break;
    }
    return `<div class="veil"><section class="sheet ${cls}" role="dialog" aria-modal="true">${h}</section></div>`;
  }

  function vRetire(r) {
    const ax = Object.keys(r.ax), pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / ax.length, d = 20 + v * .8; return [150 + Math.cos(a) * d, 130 + Math.sin(a) * d]; };
    const poly = v => ax.map((k, i) => pt(i, v == null ? r.ax[k] : v).map(n => n.toFixed(1)).join(',')).join(' ');
    return `<section class="page retire">
      <div><p class="eyebrow">CAREER END · ${r.years}시즌</p><h2>${esc(r.nick)}, 은퇴</h2><p class="dim">${r.reason}</p></div>
      <div class="grade"><b>${r.grade}</b><div><h2>${r.ep}</h2><p>커리어 점수 ${r.score}점 · 자동 시뮬레이션 커리어 대비 상위 ${r.pct}%</p></div></div>
      <svg class="radar" viewBox="0 0 300 250" role="img" aria-label="커리어 평가 5개 축">
        ${[100, 66, 33].map(v => `<polygon points="${poly(v)}" fill="none" stroke="#2d3363"/>`).join('')}
        <polygon points="${poly()}" fill="rgba(255,77,109,.35)" stroke="#ff4d6d" stroke-width="2"/>
        ${ax.map((k, i) => { const [x, y] = pt(i, 122); return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${k} ${Math.round(r.ax[k])}</text>`; }).join('')}
      </svg>
      <div class="kv"><div><span>1군 경기</span><b>${r.g}</b></div><div><span>승률</span><b>${r.g ? Math.round(r.w / r.g * 100) + '%' : '-'}</b></div><div><span>평균 평점</span><b>${r.g ? f1(r.avg) : '-'}</b></div>
        <div><span>최고 OVR</span><b>${r.peak}</b></div><div><span>경기 MVP</span><b>${r.mvp}</b></div><div><span>통산 수입</span><b>${money(r.earn)}</b></div></div>
      <div><p class="sec">트로피·수상</p>${r.titles.length + r.awards.length ? `<div class="chips">${r.titles.map(t => `<span class="chip gold">${t.y}년차 ${t.name}</span>`).join('')}${r.awards.map(a => `<span class="chip">${a.y}년차 ${a.name}</span>`).join('')}</div>` : '<p class="dim">트로피 없이 커리어를 마쳤다.</p>'}</div>
      <div><p class="sec">거쳐 간 팀</p><p>${r.orgs.join(' → ')}</p></div>
      <button class="btn" data-act="again">새 커리어</button><button class="btn line" data-act="hall">명예의 전당</button></section>`;
  }

  function vGame(S) {
    const sc = G.scene();
    if (S.over && sc) return vRetire(sc);
    const mi = G.month(), tabs = [['home', '홈'], ['stats', '능력'], ['league', '리그'], ['shop', '투자'], ['record', '기록']];
    const body = S.org ? { home: tHome, stats: tStats, league: tLeague, shop: tShop, record: tRecord }[U.tab](S) : '';
    const warn = G.saveFailed() ? '<p class="warn">저장에 실패했다. 이 브라우저에서는 진행 상황이 남지 않는다.</p>' : U.notice ? `<p class="warn">${U.notice}</p>` : '';
    return `${S.org ? header(S) : ''}<main class="content">${warn}${body}</main>
      ${S.org ? `<footer class="foot"><nav class="tabs" role="tablist">${tabs.map(t => `<button role="tab" data-act="tab" data-id="${t[0]}" aria-selected="${U.tab === t[0]}">${t[1]}</button>`).join('')}</nav>
      <button class="btn cta" data-act="next" ${sc ? 'disabled' : ''}>${mi.m}월 진행<small>${mi.label} · ${D.PLANS.find(p => p.id === S.plan).name}</small></button></footer>` : ''}
      ${sc ? vScene(sc, S) : ''}`;
  }

  function render() {
    const y = window.scrollY, S = G.state();
    if (U.view === 'game' && !S) U.view = 'title';
    app.innerHTML = U.view === 'title' ? vTitle() : U.view === 'create' ? vCreate() : U.view === 'hall' ? vHall() : vGame(S);
    drawAvatars(); window.scrollTo(0, y);
  }
  function go(v) { U.view = v; U.confirm = ''; render(); window.scrollTo(0, 0); }

  app.addEventListener('input', e => { if (e.target.id === 'nick') U.C.nick = e.target.value; });
  app.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    const a = b.dataset.act, id = b.dataset.id, i = +b.dataset.i;
    const live = a === 'create' && U.view === 'title' && G.saveInfo() && !G.saveInfo().over;
    if (live && U.confirm !== 'new') { U.confirm = 'new'; return render(); }
    if (a !== 'retire' && a !== 'wipe') U.confirm = '';
    if (a !== 'continue') U.notice = '';
    switch (a) {
      case 'create': return go('create');
      case 'title': return go('title');
      case 'hall': return go('hall');
      case 'continue': {
        const r = G.load();
        if (r === 'backup') U.notice = '저장 데이터가 손상되어 이번 시즌 시작 시점으로 되돌렸다.';
        if (r) { U.view = 'game'; U.tab = 'home'; render(); window.scrollTo(0, 0); } else { U.notice = '저장 데이터를 열 수 없다.'; render(); }
        return;
      }
      case 'pick': U.C[b.dataset.grp] = id; break;
      case 'start': G.newGame({ nick: U.C.nick.trim() || 'Rookie', region: U.C.region, role: U.C.role, trait: U.C.trait }); U.tab = 'home'; return go('game');
      case 'again': G.wipe(); return go('create');
      case 'tab': U.tab = id; render(); return window.scrollTo(0, 0);
      case 'plan': G.setPlan(id); break;
      case 'buy': G.buy(id); break;
      case 'fast': G.setFast(!G.state().opt.fast); break;
      case 'next': G.next(); break;
      case 'ok': G.resolve(); break;
      case 'res': G.resolve(i); break;
      case 'reroll': G.resolve('reroll'); break;
      case 'stay': G.resolve('stay'); break;
      case 'transfer': G.resolve('transfer'); break;
      case 'try': G.resolve('try'); break;
      case 'accept': G.resolve({ i, act: 'accept' }); break;
      case 'nego': G.resolve({ i, act: 'nego' }); break;
      case 'retire': if (U.confirm === 'retire') { U.confirm = ''; G.resolve('retire'); } else U.confirm = 'retire'; break;
      case 'wipe': if (U.confirm === 'wipe') { G.wipe(); return go('title'); } U.confirm = 'wipe'; break;
    }
    render();
  });

  render();
})();
