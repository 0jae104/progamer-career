/* 프로게이머 키우기 — 화면 */
(function () {
  const UI_VERSION = '0.11.11';
  const VER = window.PG_VER = window.PG_VER || {}; VER.ui = UI_VERSION;
  // 스크립트 버전이 서로 다르면(업데이트 도중 파일이 섞임) 게임을 시작하지 않는다. 안내는 index.html 의 확인 스크립트가 띄운다.
  if (!window.PG || !window.PG_CARD || VER.data !== UI_VERSION || VER.engine !== UI_VERSION || VER.card !== UI_VERSION) return;
  const G = window.PG, D = G.D, CARD = window.PG_CARD, app = document.getElementById('app');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const U = { view: 'title', tab: 'home', C: { nick: '', region: 'kr', role: 'core', trait: (D.TRAITS.find(t => t.pick) || D.TRAITS[0]).id, look: '', step: 1 }, confirm: '', notice: '', vt: 'hall', vfrom: 'title', sort: 'score', cmp: [], rec: '', dlg: null, undo: '', vmsg: '', card: null, imp: null };
  const money = G.fmtMoney, f1 = v => (Math.round(v * 10) / 10).toFixed(1);

  /* ---- 도트 아바타 (직접 그린 14×14 스프라이트) ---- */
  const SPRITE = ['....hhhhhh....', '...hhhhhhhh...', '..hhhhhhhhhh..', '.kkhhsssshhkk.', '.kksssssssskk.', '.kksesssseskk.', '..ssssssssss..',
    '..m.ssssss....', '..mmm.ss......', '....jjssjj....', '..jjjjjjjjjj..', '.jjjdjjjjdjjj.', '.jjjdjjjjdjjj.', '.jjjdjjjjdjjj.'];
  const HAIR = ['#23264a', '#5a3b2a', '#c9a24b', '#7b4bd1', '#d94f6b', '#2f8f83'], SKIN = ['#f6d3b0', '#e8b88f', '#c98f66'];
  function hash(s) { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
  function drawAvatars() {
    app.querySelectorAll('canvas.av').forEach(cv => {
      const x = cv.getContext('2d');
      cv.width = cv.height = 14; x.clearRect(0, 0, 14, 14); cv.setAttribute('aria-hidden', 'true');
      sprite(x, 0, 0, 1, cv.dataset.seed || 'x', cv.dataset.color, cv.dataset.look);
    });
  }
  /* 외형(0.11.2): look = 머리 모양·머리 색·피부·표정·소품 다섯 자리. 선수 등록에서 고르고(기본은 무작위) 저장·기록·커리어 카드에 같이 남는다.
     look 이 없는 예전 저장과 라이벌은 예전 그대로 아이디에서 얼굴이 정해진다(그림이 바뀌지 않는다). 능력치와는 무관하다. */
  const SKIN2 = ['#f6d3b0', '#e8b88f', '#c98f66', '#8d5a3b'];
  const LOOKS = [['머리 모양', ['기본', '앞머리', '짧게', '삐죽', '긴 머리', '가르마']], ['머리 색', ['남색', '갈색', '금색', '보라', '분홍', '청록']], ['피부', ['밝게', '보통', '그을림', '짙게']], ['표정', ['담담', '미소', '집중', '윙크']], ['소품', ['없음', '안경', '반창고', '머리띠']]];
  const randLook = () => LOOKS.map(l => Math.floor(Math.random() * l[1].length)).join('');
  const shade = (hex, k) => '#' + [1, 3, 5].map(i => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * k))).toString(16).padStart(2, '0')).join('');
  // 도트 아바타 한 장. px: 점 하나의 크기(커리어 카드에서는 크게 그린다)
  function sprite(x, ox, oy, px, seed, color, look) {
    const h = hash(seed), L = G.lookOk(look) ? [...look].map(Number) : null;
    const pal = { h: L ? HAIR[L[1]] : HAIR[h % HAIR.length], s: L ? SKIN2[L[2]] : SKIN[(h >> 3) % SKIN.length], e: '#0e1126', k: '#62e4ff', m: '#62e4ff', j: color || '#ff4d6d', d: 'rgba(14,17,38,.45)' };
    const dot = (i, y, w) => x.fillRect(ox + i * px, oy + y * px, (w || 1) * px, px), put = (c, i, y, w) => { x.fillStyle = c; dot(i, y, w); };
    const rows = SPRITE.slice();
    if (L && L[0] === 2) { rows[0] = '..............'; rows[1] = '....hhhhhh....'; rows[2] = '...hhhhhhhh...'; rows[3] = '.kkhsssssshkk.'; }
    if (L && L[0] === 3) rows[0] = '...h.hh.hh.h..';
    rows.forEach((row, y) => [...row].forEach((ch, i) => {
      if (ch === '.') return;
      if (ch === 'd') { x.fillStyle = pal.j; dot(i, y); }
      x.fillStyle = pal[ch]; dot(i, y);
    }));
    if (!L) { if ((h >> 5) % 2) put(pal.h, 5, 3, 2); return; }
    // 머리 모양
    if (L[0] === 1) put(pal.h, 4, 3, 3);
    if (L[0] === 4) { put(pal.h, 1, 6); put(pal.h, 12, 6); put(pal.h, 12, 7); put(pal.h, 12, 8); put(pal.h, 1, 7); }
    if (L[0] === 5) { put(pal.h, 3, 3, 4); put(pal.h, 3, 4, 2); }
    // 명암: 머리 윗부분의 밝은 점, 턱 아래 그늘
    if (L[0] !== 2) put(shade(pal.h, 1.45), 5, 1, 2); else put(shade(pal.h, 1.45), 5, 2, 2);
    put(shade(pal.s, .8), 6, 8, 2);
    // 표정
    if (L[3] === 1) put('#b5485a', 6, 7, 2);
    if (L[3] === 2) { put(shade(pal.h, .7), 4, 4); put(shade(pal.h, .7), 9, 4); put(shade(pal.s, .72), 6, 7, 2); }
    if (L[3] === 3) { put(shade(pal.s, .62), 9, 5); put('#b5485a', 6, 7, 2); }
    // 소품
    if (L[4] === 1) { for (const i of [3, 5, 6, 7, 8, 10]) put('#e8ecff', i, 5); }
    if (L[4] === 2) put('#f4efe6', 8, 6, 2);
    if (L[4] === 3) put(pal.j, 2, 2, 10);
  }

  function vTitle() {
    const sv = G.saveInfo(), live = sv && !sv.over;
    return `<section class="title">
      <p class="eyebrow onair">E-SPORTS CAREER SIM</p>
      <h1>프로<br>게이머<br><em>키우기</em></h1>
      <p class="lede">열여섯 연습생에서 월드 파이널까지. 팀이 아니라 선수 한 명의 커리어 전체를 살아 본다.</p>
      <div class="stage"><canvas class="av" data-seed="title" data-color="#ff4d6d"></canvas><p>연습생 → 2군 → 1군 벤치 → 주전 → 국가대표 → 올해의 선수</p></div>
      <div class="stack">
        ${sv ? `<button class="btn cta" data-act="continue">${sv.over ? '지난 커리어 결과 보기' : '이어하기'}<small>${esc(sv.nick)} · ${sv.started ? `${esc(sv.year)}년차 ${esc(sv.age)}세` : '입단 구단 선택 중'}</small></button>` : ''}
        <button class="btn ${sv ? 'ghost' : ''}" data-act="create">${live && U.confirm === 'new' ? '한 번 더 누르면 진행 중인 커리어가 삭제된다' : '새 커리어'}</button>
        <button class="btn line two" data-act="hall">기록실<small>명예의 전당 · 도전 과제 · 백업</small></button>
        <button class="btn line two" data-act="demo">경기 체험하기<small>1군 토너먼트 한 경기 · 약 3분 · 기록에 남지 않는 비공식 체험전</small></button>
        ${sndBtn('btn line')}
      </div>
      ${verNote()}${U.notice ? `<p class="warn">${esc(U.notice)}</p>` : ''}
      ${G.storageOk() ? '' : '<p class="warn">이 브라우저에서는 저장이 되지 않는다. 사생활 보호 모드를 끄거나 다른 브라우저로 열어야 진행 상황이 남는다.</p>'}
      ${navigator.onLine === false ? '<p class="fine" role="status">오프라인 상태다. 게임과 저장은 그대로 된다. 새 버전 확인과 웹 글꼴은 온라인에서만 된다.</p>' : ''}
      <p class="fine">등장하는 리그·구단·선수·대회는 모두 창작이며 실제와 관계가 없습니다. 진행 상황은 이 기기의 브라우저에 저장되며, 브라우저 데이터를 지우면 함께 사라집니다. v${esc(G.VERSION)}</p>
    </section>`;
  }

  const opt = (grp, id, name, desc) => `<button class="opt" data-act="pick" data-grp="${esc(grp)}" data-id="${esc(id)}" aria-pressed="${U.C[grp] === id}"><b>${esc(name)}</b>${desc ? `<span>${esc(desc)}</span>` : ''}</button>`;
  // 포지션에서 비중이 큰 능력치 세 개(D.ROLES 의 w 에서 그대로 읽는다)
  const roleKeys = r => D.STATS.map(st => [st, r.w[st.id]]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  // 그 포지션의 OVR을 가장 빨리 올리는 월간 계획 두 개: 계획의 능력치별 성장량 × 포지션 비중의 합이 큰 순서
  const rolePlans = r => D.PLANS.map(p => [p, Object.keys(p.g).reduce((a, k) => a + p.g[k] * r.w[k], 0)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 2).map(x => x[0]);
  function roleOpt(r) {
    const on = U.C.role === r.id;
    return `<button class="opt role" data-act="pick" data-grp="role" data-id="${esc(r.id)}" aria-pressed="${on}"><b>${esc(r.name)} <small>${esc(r.en)}</small></b><span>${esc(on ? r.easy : r.desc)}</span>${on ? `
      <span class="rinfo"><em>장점</em>${esc(r.good)}</span><span class="rinfo"><em>주의</em>${esc(r.care)}</span>
      <span class="rinfo"><em>주요 능력치</em>${roleKeys(r).map(([st]) => esc(st.name)).join(' · ')}</span>` : ''}</button>`;
  }
  // 선수 등록(0.11.2): 두 걸음. ① 누구인가(아이디·얼굴·국적) ② 어떻게 뛰는가(포지션·성향). 얼굴은 무작위로 정해져 있어 그냥 넘어가도 된다.
  function traitOpt(t) {
    const on = U.C.trait === t.id;
    return `<button class="opt trait" data-act="pick" data-grp="trait" data-id="${esc(t.id)}" aria-pressed="${on}"><b>${esc(t.name)}${t.pick ? ' <small>처음이라면</small>' : ''}</b>
      <span class="rinfo"><em>장점</em>${esc(t.good)}</span><span class="rinfo"><em>단점</em>${esc(t.bad)}</span></button>`;
  }
  /* 고른 항목 아래의 한 줄(0.11.10): 쉬운 말 한두 문장만. 배율·비중·식 같은 내부 숫자는 화면에 적지 않는다(0.11.6~0.11.9 에는 "자세히"에 있었다).
     문장은 실제로 계산에 들어가는 차이만 말한다: 리그는 팀 전력·연봉·대표팀, 포지션은 OVR에 크게 들어가는 능력치, 성향은 시작값과 자라는 폭. */
  function pickInfo(grp) {
    const box = t => `<div class="pinfo" id="pinfo-${grp}"><p class="psum">${t}</p></div>`;
    if (grp === 'region') { const r = D.REGIONS.find(x => x.id === U.C.region) || D.REGIONS[0]; return box(`<b>${esc(r.name)}</b>${esc(D.REGION_NOTE[r.id] || '')} 국적은 선수의 능력치를 바꾸지 않고, 나중에 다른 리그로 옮길 수 있다.`); }
    if (grp === 'role') { const r = D.ROLES.find(x => x.id === U.C.role) || D.ROLES[0]; return box(`<b>${esc(r.name)}</b>주요 능력치가 높을수록 OVR이 높다. 포지션은 도중에 바꿀 수 없다.`); }
    return box('같은 성향이어도 시작 능력치와 잠재력은 선수마다 조금씩 다르다.');
  }
  function vCreate() {
    if (!G.lookOk(U.C.look)) U.C.look = randLook();
    const L = [...U.C.look].map(Number);
    if (U.C.step !== 2) return `<section class="page">
      <div><p class="eyebrow">NEW CAREER · 1 / 2</p><h2>선수 등록</h2></div>
      <div class="field"><label for="nick">선수 아이디 (최대 10자)</label><input id="nick" maxlength="10" autocomplete="off" placeholder="예: Haneul" value="${esc(U.C.nick)}"></div>
      <div class="field"><span class="lab">얼굴 — 그냥 두어도 된다. 능력치와는 상관없다</span>
        <div class="lookrow"><canvas class="av big" data-seed="new" data-color="#ff4d6d" data-look="${esc(U.C.look)}"></canvas><button class="btn line" data-act="lookrand">무작위로 다시</button></div>
        <div class="lookgrid">${LOOKS.map((l, i) => `<button data-act="look" data-i="${i}" aria-label="${esc(l[0])}: ${esc(l[1][L[i]])}. 누르면 다음으로">${esc(l[0])}<b>${esc(l[1][L[i]])}</b></button>`).join('')}</div></div>
      <div class="field"><span class="lab">국적 — 처음 뛸 리그와 대표팀이 정해진다. 능력치는 달라지지 않는다</span><div class="opts c2">${D.REGIONS.map(r => opt('region', r.id, r.name, r.lgName)).join('')}</div>${pickInfo('region')}</div>
      <button class="btn" data-act="cstep" data-id="2">다음 — 포지션과 성향</button>
      <button class="btn line" data-act="title">돌아가기</button>
    </section>`;
    return `<section class="page">
      <div><p class="eyebrow">NEW CAREER · 2 / 2</p><h2>포지션과 성향</h2></div>
      <div class="field"><span class="lab">포지션 — 고른 자리의 장점과 주의점이 아래에 펼쳐진다</span><div class="opts">${D.ROLES.map(roleOpt).join('')}</div>${pickInfo('role')}</div>
      <div class="field"><span class="lab">성향 — 어떻게 자라는 선수인가. 셋 다 정상에 설 수 있고, 가는 길이 다르다</span><div class="opts">${D.TRAITS.map(traitOpt).join('')}</div>${pickInfo('trait')}</div>
      <button class="btn" data-act="start">입단 테스트 보러 가기</button>
      <button class="btn line" data-act="cstep" data-id="1">이전</button>
    </section>`;
  }
  /* ---- 기록실: 명예의 전당 · 도전 과제 · 백업 ---- */
  const none = '<span class="dim">기록 없음</span>';
  const val = (v, f) => (typeof v === 'number' && isFinite(v) ? (f ? f(v) : String(v)) : none);
  const day = t => { const d = new Date(t), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`; };
  const seg = (act, cur, items) => `<div class="seg" role="group">${items.map(([id, name]) => `<button data-act="${esc(act)}" data-id="${esc(id)}" aria-pressed="${cur === id}">${esc(name)}</button>`).join('')}</div>`;
  function vVault() {
    const body = U.vt === 'ach' ? vAch() : U.vt === 'backup' ? vBackup() : vHallList();
    return `<section class="page vault" ${U.dlg ? 'inert aria-hidden="true"' : ''}>
      <div><p class="eyebrow">RECORDS</p><h2>기록실</h2></div>
      ${seg('vt', U.vt, [['hall', '명예의 전당'], ['ach', '도전 과제'], ['backup', '백업']])}
      ${U.vmsg ? `<p class="warn" role="status">${esc(U.vmsg)}</p>` : ''}
      ${body}
      <button class="btn line" data-act="back">돌아가기</button></section>${U.dlg ? vDialog() : ''}`;
  }
  function vHallList() {
    const h = G.hall(U.sort), info = G.hallInfo(), trash = U.undo && G.hallTrash().find(r => r.id === U.undo);
    U.cmp = U.cmp.filter(id => h.some(r => r.id === id));
    return `${info.failed ? '<p class="warn">명예의 전당을 이 브라우저에 저장하지 못했다. 저장 공간이 부족하거나 저장이 막혀 있다. 지금 보이는 기록은 창을 닫으면 사라질 수 있다.</p>' : ''}
      ${trash ? `<div class="warn undo" role="status"><span>${esc(trash.nick)}의 기록을 지웠다.</span><button data-act="undo" data-id="${esc(trash.id)}">되돌리기</button></div>` : ''}
      ${h.length ? `<p class="dim small">${esc(h.length)}명 보관 중 (최대 ${esc(info.max)}명. 가득 차면 점수가 가장 낮은 기록부터 빠진다)</p>
        ${seg('sort', U.sort, [['score', '점수순'], ['titles', '우승순'], ['recent', '최근 은퇴순']])}
        <ol class="hlist">${h.map((r, i) => `<li><button class="hmain" data-act="rec" data-id="${esc(r.id)}"><span class="rk">${i + 1}</span><span class="who"><b>${esc(r.nick)}</b><small>${esc(G.roleLabel(r.role, r.roleId))} · ${esc(r.grade || '-')} ${esc(r.ep)}</small></span><span class="pt"><b>${esc(r.score)}</b><small>우승 ${typeof r.big === 'number' ? r.big : '-'}</small></span></button><button class="hcmp" data-act="cmp" data-id="${esc(r.id)}" aria-pressed="${U.cmp.includes(r.id)}" aria-label="${esc(r.nick)} 비교에 담기">비교</button></li>`).join('')}</ol>
        ${U.cmp.length === 2 ? '<button class="btn" data-act="compare">고른 두 선수 비교하기</button>' : U.cmp.length === 1 ? '<p class="dim small">한 명을 더 고르면 비교할 수 있다.</p>' : ''}`
        : '<p class="dim">아직 은퇴한 선수가 없다. 첫 커리어를 끝까지 살아 보자.</p>'}`;
  }
  const trophyChips = r => (r.titles.length + r.awards.length ? `<div class="chips">${r.titles.map(t => `<span class="chip gold">${esc(t.y)}년차 ${esc(t.name)}</span>`).join('')}${r.awards.map(a => `<span class="chip">${esc(a.y)}년차 ${esc(a.name)}</span>`).join('')}</div>` : '<p class="dim">트로피 없이 커리어를 마쳤다.</p>');
  function vRec() {
    const r = G.hallGet(U.rec); if (!r) return vVault();
    const full = r.src === 'play';
    return `<section class="page vault" ${U.dlg ? 'inert aria-hidden="true"' : ''}>
      <div><p class="eyebrow">HALL OF FAME</p><h2 class="wrap">${esc(r.nick)}</h2><p class="dim">${[esc(G.roleLabel(r.role, r.roleId)), typeof r.age === 'number' ? `${esc(r.age)}세 은퇴` : '', typeof r.years === 'number' ? `${esc(r.years)}시즌` : ''].filter(Boolean).join(' · ')}</p></div>
      <div class="grade"><b>${esc(r.grade || '-')}</b><div><h2>${esc(r.ep) || '-'}</h2><p>커리어 점수 ${esc(r.score)}점${typeof r.pct === 'number' ? ` · 자동 시뮬레이션 커리어 대비 상위 ${esc(r.pct)}%` : ''}</p></div></div>
      ${full ? '' : '<p class="warn">예전 버전의 명예의 전당에서 옮긴 기록이다. 그때 저장된 요약만 남아 있어 나머지는 "기록 없음"으로 보인다.</p>'}
      <div class="kv"><div><span>1군 경기</span><b>${val(r.g)}</b></div><div><span>승률</span><b>${r.g > 0 ? val(r.w, w => Math.round(w / r.g * 100) + '%') : none}</b></div><div><span>평균 평점</span><b>${r.g > 0 ? val(r.avg, f1) : none}</b></div>
        <div><span>최고 OVR</span><b>${val(r.peak)}</b></div><div><span>경기 MVP</span><b>${val(r.mvp)}</b></div><div><span>1군 우승</span><b>${val(r.big, v => v + '회')}</b></div>
        <div><span>통산 수입</span><b>${val(r.earn, money)}</b></div><div><span>1군 데뷔</span><b>${full ? (r.debut ? esc(r.debut) + '세' : '데뷔 못 함') : none}</b></div><div><span>은퇴한 날</span><b>${r.at ? day(r.at) : none}</b></div></div>
      <div><p class="sec">트로피·수상</p>${full ? trophyChips(r) : `<p>${none}</p>`}</div>
      <div><p class="sec">거쳐 간 팀</p><p>${full && r.orgs.length ? r.orgs.map(esc).join(' → ') : none}</p></div>
      ${full && r.rv.length ? `<div><p class="sec">라이벌 상대 전적</p><ul class="plain">${r.rv.map(v => `<li><b>${esc(v.nick)}</b> ${esc(v.w)}승 ${esc(v.l)}패${v.label ? ` · ${esc(v.label)}` : ''}</li>`).join('')}</ul></div>` : ''}
      ${full && r.reason ? `<p class="dim">${esc(r.reason)}</p>` : ''}
      <div class="stack"><button class="btn" data-act="card" data-id="${esc(r.id)}">커리어 카드 만들기</button>
        <button class="btn line" data-act="cmp" data-id="${esc(r.id)}" aria-pressed="${U.cmp.includes(r.id)}">${U.cmp.includes(r.id) ? '비교에서 빼기' : '비교에 담기'}</button>
        <button class="btn line" data-act="askdel" data-id="${esc(r.id)}">이 기록 삭제</button>
        <button class="btn line" data-act="back">목록으로</button></div></section>${U.dlg ? vDialog() : ''}`;
  }
  function vCompare() {
    const a = G.hallGet(U.cmp[0]), b = G.hallGet(U.cmp[1]); if (!a || !b) return vVault();
    const rows = [['포지션', r => esc(G.roleLabel(r.role, r.roleId))], ['등급', r => esc(r.grade) || none], ['별칭', r => esc(r.ep) || none], ['커리어 점수', r => val(r.score)], ['은퇴 나이', r => val(r.age, v => v + '세')], ['시즌', r => val(r.years)],
      ['1군 경기', r => val(r.g)], ['승률', r => (r.g > 0 ? val(r.w, w => Math.round(w / r.g * 100) + '%') : none)], ['평균 평점', r => (r.g > 0 ? val(r.avg, f1) : none)], ['최고 OVR', r => val(r.peak)], ['경기 MVP', r => val(r.mvp)],
      ['1군 우승', r => val(r.big, v => v + '회')], ['월드 우승', r => (r.src === 'play' ? r.titles.filter(t => t.tier === 'world').length + '회' : none)], ['개인상', r => (r.src === 'play' ? r.awards.length + '개' : none)], ['통산 수입', r => val(r.earn, money)], ['은퇴한 날', r => (r.at ? day(r.at) : none)]];
    return `<section class="page vault"><div><p class="eyebrow">COMPARE</p><h2>기록 비교</h2></div>
      <table class="cmp"><caption class="srhide">두 선수의 은퇴 기록 비교</caption><tr><th scope="col">항목</th><th scope="col">${esc(a.nick)}</th><th scope="col">${esc(b.nick)}</th></tr>
        ${rows.map(([k, f]) => `<tr><th scope="row">${esc(k)}</th><td>${f(a)}</td><td>${f(b)}</td></tr>`).join('')}</table>
      <button class="btn line" data-act="back">목록으로</button></section>`;
  }
  function endDemo(msg) { stopWatch(); G.demoEnd(); U.view = 'title'; U.tab = 'home'; U.tac = ''; U.akey = ''; U.arenaShown = ''; if (msg) U.notice = msg; }
  function stopWatch() { if (U.watch) { clearTimeout(U.watch.t); U.watch = null; } }
  /* 경기의 모양(0.11.11): 이미 정해진 세트 기록에서만 읽는다. 역전승 = 상대가 먼저 매치 포인트(한 세트만 더 따면 끝)를 잡았는데 이긴 경기.
     결과를 바꾸지 않고, 결과 화면의 제목과 소리를 고르는 데만 쓴다. */
  function drama(sc) {
    const need = (sc.bo + 1) / 2, sets = sc.sets || []; let x = 0, y = 0, mp = false;
    for (const st of sets) { if (st.w) x++; else y++; if (y === need - 1 && x < need - 1) mp = true; }
    if (sc.win) return mp && need >= 2 ? ['역전승', '벼랑 끝에서 뒤집었다.'] : y === need - 1 && need >= 2 ? ['접전 끝 승리', '마지막 세트까지 갔다.'] : y === 0 && need >= 2 ? ['완승', '한 세트도 내주지 않았다.'] : ['승리', ''];
    return x === need - 1 && need >= 2 ? ['석패', '마지막 세트에서 갈렸다.'] : ['패배', ''];
  }
  const bigWin = sc => sc.type === 'match' && sc.win && (sc.label === '결승' || drama(sc)[0] === '역전승' || !!sc.rival);
  const finalCue = sc => (sc.type === 'match' ? (sc.win ? (sc.label === '결승' ? 'winbig' : drama(sc)[0] === '역전승' ? 'comeback' : 'win') : 'lose') : 'tension');
  /* 경기장 밖의 순간(0.11.11): 우승 알림·콜업·수상·나쁜 소식·시즌 결산·OVR 이 오른 달에 짧은 소리 하나. 장면이 바뀐 첫 그림에서 한 번만.
     자동진행이 달리는 동안에는 내지 않는다(자동진행은 이런 장면에서 멈추고, 멈춘 뒤의 첫 그림에서 난다). 소리를 꺼 두면 아무것도 나지 않는다. */
  function sceneCue(S, sc) {
    const k = sc && S ? [sc.type, sc.title || '', S.year, S.m, S.q.length, S.stat ? S.stat.turns : 0].join('|') : '';
    if (k === U.cueKey) return; U.cueKey = k; U.fxScene = '';
    if (!sc || AP.on) return;
    let c = '';
    if (sc.type === 'info') c = sc.cele === 1 ? 'champ' : /콜업/.test(sc.title) ? 'callup' : sc.tone === 'gold' ? 'award' : sc.tone === 'bad' ? 'bad' : '';
    else if (sc.type === 'season') c = 'season';
    else if (sc.type === 'month' && typeof sc.o0 === 'number' && typeof sc.o1 === 'number' && Math.floor(sc.o1 + 1e-9) > Math.floor(sc.o0 + 1e-9)) c = 'up';
    if (c) { SND.play(c); U.fxScene = k; }
  }
  // 장면이 바뀌었을 때 한 번: 아직 보여 주지 않은 세트가 있으면 관전을 시작하고, 없으면 그 장면의 소리만 낸다.
  // 장면에 seen 표시가 남으므로(엔진의 watched) 다시 그리거나 새로 고쳐도 같은 연출이 두 번 나오지 않는다.
  function arenaSync(sc) {
    const k = akey(sc);
    if (k === U.akey) return;
    U.akey = k; stopWatch();
    if (!sc || !ARENA[sc.type]) { U.tac = ''; return; }
    if (sc.type === 'prematch') { U.tac = ''; return; }
    if ((sc.type === 'match' || (sc.type === 'moment' && sc.pips != null)) && !sc.seen) {
      const n = wl(sc).length, from = Math.max(0, Math.min(n, sc.from | 0));
      if (from < n) { U.watch = { k, i: from, n, fast: false, t: setTimeout(tickWatch, 650) }; return; }
      SND.play(finalCue(sc)); U.fxOnce = skey(sc); G.watched();
    }
  }
  function tickWatch() {
    const w = U.watch, sc = U.view === 'game' && G.state() ? G.scene() : null;
    if (!w || akey(sc) !== w.k) { U.watch = null; return; }
    if (w.i < w.n) {
      w.i++; SND.play(wl(sc)[w.i - 1] === 'W' ? 'setw' : 'setl');
      w.t = setTimeout(tickWatch, w.i < w.n ? (w.fast ? 380 : 1150) : (w.fast ? 420 : 1000));
      return render();
    }
    endWatch(sc);
  }
  function endWatch(sc) { stopWatch(); SND.play(finalCue(sc)); U.fxOnce = skey(sc); G.watched(); render(); }
  // 다른 탭(또는 예전 버전의 탭)이 저장을 바꿨을 때: 이 탭의 오래된 상태로 덮어쓰지 않도록 멈추고 새로 고침을 안내한다.
  function vStale() {
    return `<div class="veil"><section class="sheet bad" role="alertdialog" aria-modal="true" aria-label="다른 탭에서 진행됨" tabindex="-1"><h2>다른 탭에서 진행됐다</h2>
      <p>이 게임이 다른 탭이나 창에서도 열려 있고, 그쪽에서 저장이 바뀌었다. 여기서 계속하면 그쪽 진행이 지워질 수 있어 이 탭은 멈춰 두었다.</p>
      <p class="dim">저장 데이터는 그대로다. 아래 버튼을 누르면 가장 최근에 저장된 상태를 불러온다. 게임은 한 번에 탭 하나에서만 진행하는 것이 안전하다.</p>
      <button class="btn" data-act="reload">최근 저장 불러오기</button></section></div>`;
  }
  // 이 탭이 열려 있는 동안 다른 탭이 새 버전을 받아 서비스 워커가 바뀌었을 때: 이 탭은 예전 코드로 돌고 있다.
  // 저장은 그대로이므로 막지는 않고, 새로 고침만 권한다(누르기 전까지 게임은 계속된다).
  function verNote() {
    return U.newVer ? `<p class="warn" role="status" id="vernote">새 버전(v${esc(U.newVer)})이 올라왔다. 이 탭은 아직 예전 버전(v${esc(G.VERSION)})이다. 진행 상황은 저장되어 있으니 새로 고치면 이어서 할 수 있다. <button class="btn ghost" data-act="reload">새로 고침</button></p>` : '';
  }
  function checkVersion() {
    if (U.newVer || typeof fetch !== 'function') return;
    fetch('sw.js', { cache: 'no-store' }).then(r => (r.ok ? r.text() : '')).then(t => {
      const m = /VERSION = '([0-9][0-9.]{0,15})'/.exec(t || '');
      if (m && m[1] !== G.VERSION && !U.newVer) { U.newVer = m[1]; render(); }
    }).catch(() => {});
  }
  function checkStale() {
    if (U.stale || !G.stale()) return U.stale;
    U.stale = true; render();
    const s = app.querySelector('.veil .sheet'); if (s) s.focus();
    return true;
  }
  function vDialog() {
    const r = G.hallGet(U.dlg.id); if (!r) return '';
    return `<div class="veil"><section class="sheet bad" role="alertdialog" aria-modal="true" aria-label="기록 삭제 확인" tabindex="-1"><h2>기록 삭제</h2>
      <p>${esc(r.nick)}(${esc(r.grade || '-')} · ${esc(r.score)}점)의 기록을 명예의 전당에서 지운다.</p>
      <p class="dim">지운 직후에는 목록 위의 "되돌리기"로 복구할 수 있다. 그 뒤에는 미리 내려받은 백업 파일이 있어야 복구할 수 있다. 이미 달성한 도전 과제는 지워지지 않는다.</p>
      <button class="btn" data-act="del" data-id="${esc(r.id)}">삭제한다</button><button class="btn ghost" data-act="canceldlg">취소</button></section></div>`;
  }
  function vAch() {
    const list = G.achList(), info = G.achInfo();
    return `${info.failed ? '<p class="warn">도전 과제를 이 브라우저에 저장하지 못했다. 창을 닫으면 달성 기록이 사라질 수 있다.</p>' : ''}
      <p class="dim small">${esc(info.n)} / ${esc(info.of)} 달성 · 은퇴까지 마친 커리어 ${esc(info.runs)}개. 도전 과제는 기록용이며 경기·능력치·연봉에는 영향이 없다.</p>
      <ul class="achs">${list.map(a => `<li class="${a.got ? 'got' : ''}"><span class="mk" aria-hidden="true">${a.got ? '★' : '☆'}</span><div><b>${esc(a.name)}</b><small>${esc(a.desc)}</small>
        <small class="st">${a.got ? `달성${a.got.at ? ' ' + day(a.got.at) : ''}${a.got.nick ? ` · ${esc(a.got.nick)}${a.got.y ? ` ${esc(a.got.y)}년차` : ''}${a.got.age ? ` ${esc(a.got.age)}세` : ''}` : ''}` : a.prog ? `미달성 · ${a.prog[2] ? '이번 커리어 ' : ''}${esc(a.prog[0])} / ${esc(a.prog[1])}` : '미달성'}</small></div></li>`).join('')}</ul>`;
  }
  const IMP_ERR = { big: '파일이 너무 크다(3MB 초과). 이 게임의 백업 파일이 아니다.', json: '파일을 읽을 수 없다. 내용이 깨졌거나 백업 파일이 아니다.', format: '이 게임의 백업 파일이 아니다.', version: '백업 파일의 버전 표시가 올바르지 않다.',
    newer: '더 새로운 버전의 게임에서 만든 백업이다. 게임을 최신으로 새로 고친 뒤 다시 시도해 달라.', payload: '백업 파일의 구조가 올바르지 않다.', career: '백업 안의 커리어 데이터가 올바르지 않아 복원하지 않았다.',
    hall: '백업 안의 명예의 전당 데이터가 올바르지 않아 복원하지 않았다.', legacy: '백업 안의 명예의 전당 데이터가 올바르지 않아 복원하지 않았다.', read: '파일을 읽지 못했다.', apply: '복원하지 못했다(저장 공간 부족 또는 저장 차단). 이 기기의 데이터는 원래대로 남아 있다.' };
  const careerLine = c => (c ? `${esc(c.nick)} · ${c.over ? '은퇴함' : c.started ? `${esc(c.year)}년차 ${esc(c.age)}세 진행 중` : '입단 구단 선택 중'}` : '없음');
  function vBackup() {
    const m = U.imp, here = G.saveInfo(), hi = G.hallInfo(), ai = G.achInfo();
    let imp = '';
    if (m && m.res) {
      const p = m.res.preview;
      imp = `<div class="impbox" role="group" aria-label="복원 미리보기"><p class="sec">이 파일의 내용</p>
        <dl class="dl"><dt>만든 때</dt><dd>${p.exportedAt ? day(p.exportedAt) : '기록 없음'}${p.app ? ` · v${esc(p.app)}` : ''}</dd><dt>커리어</dt><dd>${careerLine(p.career)}</dd><dt>명예의 전당</dt><dd>${esc(p.hall)}명</dd><dt>도전 과제</dt><dd>${esc(p.ach)}개 달성</dd></dl>
        <p class="sec">지금 이 기기</p>
        <dl class="dl"><dt>커리어</dt><dd>${careerLine(here)}</dd><dt>명예의 전당</dt><dd>${esc(hi.n)}명</dd><dt>도전 과제</dt><dd>${esc(ai.n)}개 달성</dd></dl>
        <p class="warn">복원하면 "지금 이 기기"의 데이터가 모두 지워지고 파일의 내용으로 바뀐다. 두 쪽을 합치지 않는다. 남기고 싶다면 먼저 위에서 백업 파일을 내려받아 둔다.</p>
        <button class="btn" data-act="impok">덮어쓰고 복원한다</button><button class="btn ghost" data-act="impcancel">취소</button></div>`;
    } else if (m && m.err) imp = `<p class="warn" role="alert">${IMP_ERR[m.err] || IMP_ERR.json}${m.err === 'apply' ? '' : ' 이 기기의 데이터는 바뀌지 않았다.'}</p>`;
    return `${G.storageOk() ? '' : '<p class="warn">이 브라우저에서는 저장이 막혀 있다. 백업 파일을 내려받을 수는 있지만 복원은 할 수 없다.</p>'}
      <div class="stack"><p class="sec">백업 파일 만들기</p>
        <p class="dim">진행 중인 커리어, 시즌 시작 사본, 명예의 전당, 도전 과제를 파일 하나(JSON)로 내려받는다. 이 게임의 데이터만 담긴다.</p>
        <button class="btn" data-act="export">백업 파일 내려받기</button>
        ${U.expmsg ? `<p class="dim small" role="status">${esc(U.expmsg)}</p>` : ''}</div>
      <div class="stack"><p class="sec">백업 파일에서 복원</p>
        <p class="dim">전체 복원이다. 파일을 고르면 내용을 먼저 보여 주고, 확인한 뒤에만 바꾼다.</p>
        <input type="file" id="impfile" class="srhide" accept=".json,application/json"><label class="btn ghost" for="impfile">백업 파일 고르기</label>
        ${imp}</div>
      <p class="fine">저장은 이 기기의 이 브라우저 안에만 있다. 브라우저 데이터를 지우면 사라지고, 시크릿(사생활 보호) 모드나 다른 기기·다른 브라우저에서는 보이지 않으며 자동으로 옮겨지지 않는다. 옮기거나 지키려면 백업 파일을 내려받아 두었다가 복원한다.</p>`;
  }

  /* ---- 커리어 카드 ---- */
  function vCard() {
    const c = U.card, r = c.rec;
    const alt = `${r.nick}의 커리어 카드. ${r.grade || ''}등급 ${r.ep || ''}, 커리어 점수 ${r.score}점`;
    return `<section class="page vault"><div><p class="eyebrow">CAREER CARD</p><h2>커리어 카드</h2><p class="dim">${esc(r.nick)}의 은퇴 기록을 그림 한 장(1080×1350)으로 만든다. 기록에 있는 값만 들어간다.</p></div>
      <div class="cardbox">${c.state === 'ready' ? `<img class="cardimg" src="${esc(c.url)}" width="1080" height="1350" alt="${esc(alt)}">` : `<div class="cardwait ${c.state === 'fail' ? 'fail' : ''}">${c.state === 'fail' ? '카드를 만들지 못했다' : '카드를 만드는 중…'}</div>`}</div>
      <p class="cardst ${c.state === 'fail' ? 'warn' : 'dim'}" role="status" aria-live="polite">${esc(c.msg || (c.state === 'ready' ? '완성. 아래 버튼으로 저장하거나, 그림을 길게 눌러 저장할 수 있다.' : c.state === 'fail' ? '이 브라우저에서 그림을 만들지 못했다. 다른 브라우저에서 다시 시도해 달라. 게임 진행에는 영향이 없다.' : '카드를 만드는 중…'))}</p>
      <div class="stack"><button class="btn" data-act="cardsave" ${c.state === 'ready' ? '' : 'disabled'}>PNG 저장</button>
        ${c.state === 'ready' && c.file ? '<button class="btn ghost" data-act="cardshare">공유</button>' : c.state === 'ready' ? '<p class="dim small">이 브라우저는 그림 파일 공유를 지원하지 않는다. "PNG 저장"으로 내려받은 뒤 원하는 앱에서 직접 올리면 된다.</p>' : ''}
        ${c.state === 'fail' ? '<button class="btn ghost" data-act="cardretry">다시 만들기</button>' : ''}
        <button class="btn line" data-act="back">돌아가기</button></div></section>`;
  }
  const fileNick = n => (String(n).replace(/[^\w가-힣-]/g, '_').slice(0, 20) || 'player');
  function download(blob, name) {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.style.display = 'none'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  function openCard(rec, from) {
    if (U.card && U.card.url) URL.revokeObjectURL(U.card.url);
    // 카드에는 지금 쓰는 포지션 이름을 넣는다(예전 기록의 '코어'는 '미드'로 보인다). 기록 자체는 바꾸지 않고 그릴 때 쓰는 사본만 바꾼다.
    rec = Object.assign({}, rec, { role: G.roleLabel(rec.role, rec.roleId) });
    U.card = { rec, from, state: 'busy', msg: '', url: '', blob: null, file: null };
    go('card'); makeCard();
  }
  function makeCard() {
    const c = U.card; if (!c) return;
    c.state = 'busy'; c.msg = '';
    const wait = ms => new Promise(res => setTimeout(res, ms));
    // 글꼴을 기다리되 4초 안에 오지 않으면 기기의 기본 한글 글꼴로 그린다.
    // 웹 글꼴은 글자 묶음별로 나뉘어 있어서, 카드에 실제로 들어갈 글자를 모두 넘겨야 필요한 묶음이 다 받아진다.
    // (일부만 받아진 채 그리면 같은 기록인데 처음 만든 카드와 나중에 만든 카드의 글자 모양이 달라진다.)
    let need = '가A1';
    try { const x0 = document.createElement('canvas').getContext('2d'); need = [...new Set(CARD.plan(c.rec, (t, f) => { x0.font = f; return x0.measureText(t).width; }).filter(o => o.t === 'text').map(o => o.s).join(''))].join(''); } catch (e) {}
    const fonts = document.fonts && document.fonts.load ? Promise.race([Promise.all(CARD.fonts.map(f => document.fonts.load(f, need).catch(() => 0))), wait(4000)]) : Promise.resolve();
    fonts.then(() => new Promise((res, rej) => {
      const cv = document.createElement('canvas');
      CARD.draw(cv, c.rec, { avatar: (x, ox, oy, px, seed) => sprite(x, ox, oy, px, seed, undefined, c.rec.look) });
      if (!cv.toBlob) return rej(new Error('toBlob'));
      cv.toBlob(b => (b && b.size > 1000 ? res(b) : rej(new Error('blob'))), 'image/png');
    })).then(blob => {
      if (U.card !== c) return;
      c.blob = blob; c.url = URL.createObjectURL(blob); c.state = 'ready';
      try { const f = new File([blob], `progamer-career-${fileNick(c.rec.nick)}.png`, { type: 'image/png' }); if (navigator.canShare && navigator.share && navigator.canShare({ files: [f] })) c.file = f; } catch (e) { c.file = null; }
      if (U.view === 'card') render();
    }).catch(() => { if (U.card !== c) return; c.state = 'fail'; if (U.view === 'card') render(); });
  }

  const meter = (name, v, cls) => `<div class="meter"><span>${esc(name)}<b>${Math.round(v)}</b></span><div class="bar ${cls || ''} ${v < 35 ? 'low' : ''}"><i style="width:${Math.round(v)}%"></i></div></div>`;
  /* 홈의 상태 요약(0.11.4): 컨디션·손목·코치 평가(감독 신뢰)·인기를 2×2로 항상 보여 준다. 값은 저장된 수치 그대로이고, 붙는 말은
     게임이 실제로 쓰는 기준에서만 나온다(컨디션 40 미만·70 이상, 손목 35 이하, 부상 재활). 변화 방향처럼 기록에 없는 것은 적지 않는다.
     칸은 배열이라 나중에 손목을 빼도 나머지가 그대로 놓인다. 자금은 상태와 구분해 한 줄 버튼으로 두고, 누르면 자산 탭으로 간다. */
  const hcells = S => [
    ['컨디션', S.cond, S.cond < 40 ? 'bad' : S.cond >= 70 ? 'good' : '', S.cond < 40 ? '낮음' : S.cond >= 70 ? '좋음' : ''],
    ['손목', S.wrist, S.injury || S.wrist <= 35 ? 'bad' : '', S.injury ? `재활 ${S.injury}개월` : S.wrist <= 35 ? '주의' : ''],
    [S.squad === 'trainee' ? '코치 평가' : '감독 신뢰', S.trust, '', ''],
    ['인기', S.fame, '', ''],
  ];
  /* 0.11.6: 상태 네 칸과 자금 줄을 상자 하나(#hbox)에 담는다. 0.11.4~0.11.5 는 이 둘을 형제로 내보내면서 자동진행의 부분 갱신이
     상태 칸 하나만 통째로 바꿔(outerHTML) 자금 줄이 달마다 하나씩 더 생겼다. */
  function hstat(S) {
    const cells = hcells(S);
    return `<div class="hbox" id="hbox">${hstatIn(S, cells)}</div>`;
  }
  // 상자 안쪽. 자동진행은 달마다 이 안쪽만 통째로 바꾼다(상자는 그대로라 줄이 쌓이지 않는다)
  function hstatIn(S, cells) {
    cells = cells || hcells(S);
    return `<div class="hstat" role="group" aria-label="선수 상태">${cells.map(c => `<span class="hs ${c[2]}">${esc(c[0])}<b>${Math.round(c[1])}</b>${c[3] ? `<em>${esc(c[3])}</em>` : ''}</span>`).join('')}</div>
      <button class="moneyrow" data-act="tab" data-id="money" aria-label="보유 자금 ${esc(money(S.money))}, 자산 페이지 열기"><span>보유 자금</span><b>${money(S.money)}</b><i aria-hidden="true">자산 ›</i></button>`;
  }
  function header(S) {
    const o = G.org(), st = S.squad === 'trainee' ? '연습생' : `${G.SQUAD[S.squad]} ${S.injury ? '부상' : G.isStarter() ? '주전' : '벤치'}`;
    return `<header class="lower" style="--team:${esc(o.color)}">
      <canvas class="av" data-seed="${esc(S.nick)}" data-color="${esc(o.color)}" data-look="${esc(S.look || '')}"></canvas>
      <div class="who"><b class="${[...S.nick].length > 6 ? 'long' : ''}">${esc(S.nick)}</b><span>${G.role().name} · ${esc(o.name)} ${esc(st)} · ${esc(S.age)}세</span></div>
      <div class="ovr"><b>${Math.floor(G.ovr())}</b><span>OVR</span></div></header>
      ${U.tab === 'player' ? `<div class="meters">${meter('컨디션', S.cond)}${meter('손목', S.wrist)}${meter(S.squad === 'trainee' ? '코치 평가' : '감독 신뢰', S.trust)}${meter('인기', S.fame, 'gold')}</div>` : U.tab === 'home' ? hstat(S) : ''}`;   // 상태 요약은 플레이 탭에만(선수 탭은 막대 네 개, 나머지 탭은 자기 내용에 자리를 준다)
  }
  /* ---------- 플레이 화면(0.11.2) ----------
     홈에는 매달 하는 일만 둔다: 이번 달 할 일(다섯 개 중 한 번 눌러 고름) → 다음 목표 한 줄 → 지난 진행 요약 → 맨 아래 진행 버튼.
     능력치는 "선수", 순위와 라이벌은 "리그", 돈과 자동 관리는 "자산", 소식·기록·설정은 "기록" 탭에 있다.
     평범한 달의 결과는 창으로 띄우지 않고 요약으로 남긴다. */
  const STOP = {
    season: '시즌이 끝나 멈췄다. 결산을 확인하자.', offers: '계약 제안이 와서 멈췄다.', stove: '스토브리그: 남을지 옮길지 정할 차례라 멈췄다.', cards: '성장 카드를 고를 차례라 멈췄다.',
    info: '알림이 있어 멈췄다.', tryout: '입단 테스트를 정할 차례라 멈췄다.', pickOrg: '구단을 고를 차례라 멈췄다.', prematch: '경기 준비: 전략을 고를 차례라 멈췄다.', bigmatch: '중요한 경기(결승·국제전·라이벌 팀)라 멈췄다.',
    once: '한 번뿐인 사건이라 직접 고르도록 멈췄다.', money: '돈을 쓸지 정해야 하는 선택이라 멈췄다.', pause: '멈춤을 눌러 멈췄다.', hidden: '화면이 가려져 멈췄다.', leave: '다른 화면으로 옮겨 멈췄다.',
    max: `${D.BAL.ap.max}개월을 이어 와서 멈췄다. 다시 누르면 계속한다.`, unknown: '처음 보는 장면이라 멈췄다.', month: '안내가 달린 보고라 멈췄다.', moment: '경기 중이라 멈췄다.', mresult: '경기 중이라 멈췄다.', match: '경기 결과를 확인할 차례라 멈췄다.',
    error: '문제가 생겨 멈췄다. 진행한 곳까지는 저장됐다.', tab: '다른 탭에서 저장이 바뀌어 멈췄다.', over: '', tut: '',
  };
  const AP_STYLE = { safe: ['안정', '확률 판정이 없는 선택지를 고른다. 없으면 성공 확률이 가장 높은 것.'], even: ['균형', `성공 확률이 ${D.BAL.ap.even}% 이상인 도전이 있으면 하고, 아니면 판정이 없는 선택지.`], bold: ['도전', `성공 확률이 ${D.BAL.ap.bold}% 이상이면 도전한다.`] };
  const AU_KIND = { event: '사건', tac: '경기 전략', moment: '승부처', rest: '할 일' };
  const AUTO_WHY = { low: '잔고 부족으로 건너뜀', cap: '한 달 상한을 넘어 건너뜀', used: '이번 달에 이미 직접 샀음', max: '이미 최대 단계', full: '지금은 필요 없어 건너뜀', tired: '컨디션이 낮아 건너뜀' };
  const shopName = id => (D.SHOP.find(x => x.id === id) || {}).name || id;
  function autoLine(a) {
    if (!a || !a.items.length) return '';
    return `<p class="autoline"><b>자동 관리</b> ${a.items.map(x => (x.why ? `${esc(shopName(x.id))} ${esc(AUTO_WHY[x.why] || '건너뜀')}` : `${esc(shopName(x.id))} −${money(x.cost)}`)).join(' · ')}${a.spent ? ` · 합계 −${money(a.spent)}` : ''}</p>`;
  }
  function monthBody(sc) {
    return `${matchList(sc.matches)}${roleLine(sc.matches)}
          ${sc.eval ? `<div class="kv"><div><span>월말 평가전 평점</span><b>${f1(sc.eval.r)}</b></div><div><span>연습생 순위</span><b>12명 중 ${esc(sc.eval.rank)}위</b></div><div><span>코치 평가</span><b>${sc.eval.d == null ? '-' : (sc.eval.d > 0 ? '+' : '') + esc(sc.eval.d)}</b></div></div>` : ''}
          ${sc.fans && sc.fans.length ? `<div class="fans"><p class="sec">팬 반응</p>${sc.fans.map(x => `<p><span class="chip v${esc(x.v)}">${D.FAN_VOICE[x.v]}</span>${esc(x.t)}</p>`).join('')}</div>` : ''}
          ${sc.eval && sc.eval.rivals ? `<p class="fine">동기 순위 · ${sc.eval.rivals.map(v => `${esc(v.nick)} ${esc(v.rank)}위 (평점 ${f1(v.r)})`).join(' · ')}</p>` : ''}
          ${sc.notes.map(n => `<p>${esc(n)}</p>`).join('')}${autoLine(sc.auto)}
          <div class="chips">${sc.growth.map(g => `<span class="chip ${g[1] > 0 ? 'up' : 'down'}">${esc(g[0])} ${g[1] > 0 ? '+' : ''}${esc(g[1])}</span>`).join('')}${ovrChip(sc.o0, sc.o1) || `<span class="chip">OVR ${esc(sc.ovr)}</span>`}<span class="chip">월급 +${money(sc.salary)}</span></div>${sc.why && WHY[sc.why] ? `<p class="why">${esc(WHY[sc.why])}</p>` : ''}`;
  }
  // 진행 요약의 라이벌 줄(0.11.4): 엔진이 기록한 사실만 쓴다. 라이벌전 결과(r.rv)에 지금의 통산 전적을 붙이고,
  // 진행한 달에 소식 목록(S.log)에 남은 라이벌의 일(콜업·이적·부상·복귀·우승·은퇴·대회 맞대결)을 최대 두 줄 보여 준다. 없으면 아무것도 그리지 않는다.
  /* 지난 진행의 핵심 결과(0.11.6): 기본은 1~3줄(진행 줄 · 능력치 변화 · 가장 중요한 경기 한 줄)만 보인다.
     - 같은 경기가 "토너먼트 결과"와 "라이벌전" 두 줄로 나오던 것은 한 줄로 합친다(같은 상대·같은 승패일 때만. 다른 경기는 합치지 않는다).
     - 나머지 경기, 라이벌 소식(기록 탭의 소식과 같은 글), 사건 결과의 긴 글은 "자세히"를 눌러야 나온다. 지우는 것은 없다.
     - 자금은 엔진이 적어 둔 실제 내역이 있을 때 순변동으로, 없으면(새로 고친 뒤) 저장된 월급·자동 관리 합으로 적는다. */
  /* 성장의 결과(0.11.9): 엔진이 월간 보고에 적은 실제 값만 쓴다.
     - OVR 칩: 정수가 바뀌었으면 "OVR 65 → 66", 아니면 "OVR 65 · 다음까지 0.4"(실제 남은 값).
     - 거의 오르지 않은 달에는 이유 한 줄. 이유는 엔진이 성장 공식에서 실제로 작았던 항으로 고른다(why). */
  const WHY = {
    rest: '이번 달은 쉬어서 능력치가 거의 오르지 않았다.',
    cap: '주요 능력치가 한계에 가까워 성장이 느리다. 자산 탭의 집중 캠프로 한계를 올릴 수 있다.',
    age: '나이 때문에 성장이 느려지는 시기다.',
    plan: '이번 달 할 일은 이 포지션의 주요 능력치를 거의 올리지 않는다.',
  };
  function ovrChip(o0, o1) {
    if (typeof o0 !== 'number' || typeof o1 !== 'number') return '';
    const a = Math.floor(o0 + 1e-9), b = Math.floor(o1 + 1e-9);
    if (a !== b) return `<span class="chip ovrc ${b > a ? 'up' : 'down'}">OVR ${esc(a)} → ${esc(b)}</span>`;
    const left = Math.round((b + 1 - o1) * 10) / 10;
    return `<span class="chip ovrc">OVR ${esc(b)} · 다음까지 ${esc(left.toFixed(1))}</span>`;
  }
  // 자동진행의 진행 줄에 붙는 한 토막: 가장 크게 변한 능력치와 OVR. 지나간 달을 쌓지 않는다
  function growShort(lr) {
    if (!lr || typeof lr.o1 !== 'number') return '';
    const g = (lr.growth || []).slice().sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0], a = Math.floor(lr.o0 + 1e-9), b = Math.floor(lr.o1 + 1e-9);
    return `${g ? `${g[0]} ${g[1] > 0 ? '+' : ''}${g[1]} · ` : ''}${a !== b ? `OVR ${a}→${b}` : `OVR ${lr.o1.toFixed(1)}`}${lr.why === 'cap' ? ' · 한계 근접' : ''}`;
  }
  /* 최근 진행(0.11.10): 홈의 진행 요약과 기록 탭의 소식을 한 칸으로 합쳤다. 기록 탭의 소식 목록은 없앴고, 지난 소식은 이 칸의 "지난 소식"에서 본다.
     저장된 소식(S.log)과 요약(S.recap)은 그대로다. 보여 주는 방법만 바꿨다.
     - 순서: (멈춘 이유) → 중요한 일(우승·수상·콜업·계약·라이벌전·토너먼트) → 진행 줄 → 성장(OVR 칩이 먼저, 그다음 가장 크게 변한 능력치 둘) → 이유.
     - 같은 일을 두 번 보여 주지 않는다:
         · 매달의 "N월: x승 y패, 평균 평점" 소식은 진행 줄의 승패와 같은 내용이라 이 칸에서 뺀다.
         · "○○ 탈락." 소식은 같은 대회의 패배 경기 줄이 있으면 뺀다. 우승 소식이 있으면 그 대회의 결승 승리 줄을 뺀다.
         · 이적 뉴스 한 줄은 같은 달의 계약 소식이 있으면 뺀다. 방금 본 사건 결과와 같은 소식도 뺀다.
         · 같은 달·같은 종류·글자까지 같은 소식은 한 번만.
     - 상자(#fbox)는 하나이고 자동진행은 안쪽의 글이 달라진 달에만 바꾼다. 달마다 새 칸을 붙이지 않는다. */
  const ROUTINE = /^\d+월: \d+승 \d+패/;
  function feedLogs(S) {
    const seen = {}, deal = {};
    for (const l of S.log) if (l.tone === 'good' && /계약\./.test(l.msg)) deal[l.y * 100 + l.m] = 1;
    return S.log.filter(l => { const k = `${l.y}|${l.m}|${l.tone}|${l.msg}`; if (seen[k] || ROUTINE.test(l.msg) || (l.tone === 'news' && deal[l.y * 100 + l.m])) return false; seen[k] = 1; return true; });
  }
  function feedItems(r, logs) {
    const S = G.state(), rs = G.rivals(), by = n => rs.find(x => x.nick === n), rv = (r.rv || []).slice(), out = [], lo = r.y0 * 100 + r.m0, hi = r.y1 * 100 + r.m1;
    const inR = logs.filter(l => { const t = l.y * 100 + l.m; return t >= lo && t <= hi; });
    const won = inR.filter(l => l.tone === 'gold' && /우승/.test(l.msg));
    for (const v of r.mt || []) {
      const k = rv.findIndex(x => x.opp === v.opp && !!x.win === !!v.win), m = k >= 0 ? rv.splice(k, 1)[0] : null, x = m && by(m.nick), fin = /결승/.test(v.t) && !/준결승/.test(v.t);
      if (fin && v.win && won.some(l => l.msg.includes(v.t.split(' ')[0]))) continue;   // 우승 소식이 같은 일을 말한다
      const back = !!(m && m.s && v.win && /갚았다|끊었다|재회에서 이겼다/.test(m.s));
      out.push({ w: (fin && v.win) || back ? 5 : fin || m ? 4 : v.win ? 3 : 2, cls: `${v.win ? 'w' : 'l'}${(fin && v.win) || back ? ' big' : ''}`,   // 결승 패배(준우승)는 중요하지만 우승·설욕보다 앞서지 않는다
        rival: !!m, mt: v.t, key: `mt|${v.t}|${v.opp}|${v.s}`,
        html: `<b>${esc(v.t)}</b> ${m ? `라이벌 ${esc(m.nick)}의 ` : ''}${esc(v.opp)}에 ${esc(v.s)} ${v.win ? '승리' : '패배'}${x ? ` · 통산 ${esc(x.w)}승 ${esc(x.l)}패` : ''}${m && m.s ? ` — ${esc(m.s)}` : ''}` });
    }
    // 같은 라이벌과 여러 번 맞붙은 구간은 한 줄로 모은다("3번 맞붙어 1승 2패"). 마지막 맞대결의 한 줄만 붙인다
    const grp = [];
    for (const v of rv) { const g = grp.find(x => x.nick === v.nick && x.opp === v.opp); if (g) { g.n++; g.w += v.win ? 1 : 0; g.last = v; if (v.s) g.s = v.s; } else grp.push({ nick: v.nick, opp: v.opp, n: 1, w: v.win ? 1 : 0, last: v, s: v.s || '' }); }
    for (const g of grp) {
      const x = by(g.nick), win = g.last.win, s1 = g.n === 1 ? g.s : (g.last.s || ''), back = !!(s1 && win && /갚았다|끊었다|재회에서 이겼다/.test(s1));
      out.push({ w: back ? 5 : 4, cls: `${(g.n === 1 ? win : g.w * 2 > g.n) ? 'w' : (g.n > 1 && g.w * 2 === g.n ? '' : 'l')}${back ? ' big' : ''}`, rival: true, key: `rv|${g.nick}|${g.opp}`,
        html: `<b>라이벌전</b> ${esc(g.nick)}의 ${esc(g.opp)}${g.n === 1 ? `에 ${win ? '승리' : '패배'}` : `와(과) ${esc(g.n)}번 맞붙어 ${esc(g.w)}승 ${esc(g.n - g.w)}패`}${x ? ` · 통산 ${esc(x.w)}승 ${esc(x.l)}패` : ''}${s1 ? ` — ${esc(s1)}` : ''}` });
    }
    const lost = (r.mt || []).filter(v => !v.win).map(v => v.t);
    for (const l of inR) {
      if (/ 탈락\.$/.test(l.msg) && lost.some(t => l.msg.startsWith(t))) continue;                 // 패배 경기 줄이 같은 일을 말한다
      if (r.ev && r.ev.title && l.msg.startsWith(r.ev.title + ' — ')) continue;                    // 방금 본 사건 결과와 같다
      const rival = rs.some(x => l.msg.startsWith(x.nick + ' — ')), ev = !rival && / — /.test(l.msg) && !l.tone;
      const w = l.tone === 'gold' ? 6 : l.tone === 'good' ? (/성장 카드/.test(l.msg) ? 2 : 4) : l.tone === 'bad' ? 3 : l.tone === 'news' ? 3 : rival || ev ? 1 : 2;
      out.push({ w, cls: `${l.tone === 'gold' ? 'big gold' : l.tone === 'good' ? 'good' : l.tone === 'bad' ? 'l' : ''}`, rival, key: `log|${l.y}|${l.m}|${l.tone}|${l.msg}`, html: `${rival ? '<b>라이벌 소식</b> ' : l.tone === 'gold' ? '<b>★</b> ' : ''}${esc(l.msg)}` });
    }
    return { items: out.map((x, i) => Object.assign(x, { i })).sort((a, b) => b.w - a.w || a.i - b.i), lo };
  }
  let FEED_HTML = '';
  function recapCard() { FEED_HTML = feedIn(); return FEED_HTML ? `<section class="recap feed" id="fbox" aria-label="최근 진행">${FEED_HTML}</section>` : ''; }
  function feedIn() {
    const r = G.recap(), lr = G.lastRep(), S = G.state(), has = !!r && !!(r.n || r.ev || STOP[r.stop]), logs = feedLogs(S);
    if (!has) return '';   // 아직 진행한 달이 없으면 칸을 만들지 않는다(첫 화면을 늘리지 않는다). 지난 소식은 한 달을 진행하면 이 칸에서 볼 수 있다
    const more = !!U.recMore, e = has ? r.ev : null, long = !!e && String(e.text || '').length > 70, head = '';   // 제목 줄을 따로 두지 않는다(진행 줄의 앞머리가 "최근 진행"이다). 칸의 이름은 aria-label 에 있다
    const evHtml = e ? `<div class="evres ${e.checked ? (e.ok ? 'ok' : 'no') : ''} ${more ? '' : 'clamp'}"><p class="sec">${e.checked ? `${e.ok ? '성공' : '실패'} · ${esc(e.p)}% — ` : ''}${esc(e.title)}</p><p>${esc(e.text)}</p>${e.lines.length ? `<div class="chips">${e.lines.map(l => `<span class="chip ${/[-]\d|하락/.test(l) ? 'down' : 'up'}">${esc(l)}</span>`).join('')}</div>` : ''}</div>` : '';
    const stop = has && STOP[r.stop] ? `<p class="stopwhy" role="status">${esc(STOP[r.stop])}</p>` : '';
    const moreBtn = n => `<button class="more" data-act="recmore" aria-expanded="${more}">${more ? '간단히' : n ? `자세히 · ${esc(n)}건 더` : '자세히'}</button>`;
    const F = has && r.n ? feedItems(r, logs) : { items: [], lo: 1e9 }, old = logs.filter(l => l.y * 100 + l.m < F.lo), oldOpen = !!U.logOpen;
    const oldBtn = old.length ? `<button class="more" data-act="logopen" aria-expanded="${oldOpen}">${oldOpen ? '지난 소식 접기' : `지난 소식 ${esc(old.length)}건`}</button>` : '';
    const oldList = oldOpen && old.length && (more || !has || !r.n) ? `<ul class="log flog">${old.slice(0, 20).map(l => `<li class="${esc(l.tone)}"><time>${esc(l.y)}년차 ${esc(l.m)}월</time><span>${esc(l.msg)}</span></li>`).join('')}</ul>` : '';
    const line = x => `<p class="fd rvres ${x.cls}" data-k="${esc(x.key)}">${x.html}</p>`;
    if (!has || !r.n) return `<p class="rline"><b class="fhead">최근 진행</b></p>${stop}${evHtml}${long || oldBtn ? `<div class="morerow">${long ? moreBtn(0) : ''}${oldBtn}</div>` : ''}${oldList}`;
    const range = r.n > 1 ? `${r.y0 !== r.y1 ? r.y0 + '년차 ' : ''}${r.m0}월~${r.y0 !== r.y1 ? r.y1 + '년차 ' : ''}${r.m1}월` : `${r.m1}월`, dc = r.cond1 - r.cond0;
    const top = r.g.slice().sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 2), au = r.au || [], C = G.cash();
    const oc = ovrChip(r.o0, r.o1), whyTxt = lr && lr.why && WHY[lr.why] && typeof r.o0 === 'number' && r.o1 - r.o0 < .15 * r.n ? WHY[lr.why] : '';
    const oldCash = ` · 월급 +${money(r.sal)}${r.spent ? ` · 자동 관리 −${money(r.spent)}` : ''}`;
    const cashTxt = r.n === 1 && C.known && !C.gap ? ` · 자금 ${msgn(C.net)} (${esc(cashParts(C.month))})` : r.ap && AP.m0 != null && r.n > 1 ? ` · 자금 ${msgn(S.money - AP.m0)}` : oldCash;   // 여러 달: 순변동만(내역은 자산 탭의 돈의 흐름과 "결과 자세히"에 있다)
    // 접힌 동안: 중요한 일 두 줄까지, 줄마다 두 줄 높이까지. 그 가운데 크게 볼 일(무게 4 이상)은 진행 줄보다 위에 둔다
    const bigs = F.items.filter(x => x.w >= 4).slice(0, 2), shown = bigs.length ? bigs : F.items.filter(x => x.w >= 2).slice(0, 1),   // 큰 일이 있으면 그것만(둘까지), 없으면 그다음 것 하나
      rest = F.items.filter(x => !shown.includes(x)), hi = shown.filter(x => x.w >= 4), lowS = shown.filter(x => x.w < 4);
    const hidden = rest.length, anyRival = F.items.some(x => x.rival);
    return `${head}${stop}${evHtml}<div class="fds ${more ? '' : 'clamp'}">${hi.map(line).join('')}</div>
      <p class="rline"><b class="fhead">최근 진행</b> <b>${esc(range)}${r.ap ? ` 자동진행(${esc(r.n)}개월)` : ''}</b>${r.w + r.l ? ` · ${esc(r.w)}승 ${esc(r.l)}패` : ''}${cashTxt}${r.skip ? ` · 자동 건너뜀 ${esc(r.skip)}건` : ''} · 컨디션 ${dc > 0 ? '+' : ''}${esc(dc)}</p>
      ${top.length || oc ? `<div class="chips grow">${oc}${top.map(g => `<span class="chip ${g[1] > 0 ? 'up' : 'down'}">${esc(g[0])} ${g[1] > 0 ? '+' : ''}${esc(g[1])}</span>`).join('')}</div>` : ''}${whyTxt ? `<p class="why">${esc(whyTxt)}</p>` : ''}
      <div class="fds ${more ? '' : 'clamp'}">${lowS.map(line).join('')}${more ? rest.map(line).join('') : ''}</div>
      <div class="morerow">${hidden || long || old.length ? moreBtn(hidden) : ''}${more ? oldBtn : ''}${anyRival ? '<button class="more" data-act="tab" data-id="league" data-to="rivals">라이벌 기록 보기 ›</button>' : ''}${au.length ? `<button class="more" data-act="auopen" aria-expanded="${!!U.auOpen}">${U.auOpen ? '자동 선택 접기' : `자동 선택 ${esc(r.aun || au.length)}건`}</button>` : ''}${lr ? `<button class="more" data-act="repopen" aria-expanded="${!!U.repOpen}">${U.repOpen ? '결과 접기' : `${esc(r.m1)}월 결과 자세히`}</button>` : ''}</div>
      ${oldList}
      ${U.auOpen && au.length ? `<ul class="aulist">${au.slice().reverse().map(x => `<li><b>자동 선택 · ${esc(AU_KIND[x.k] || '선택')}</b> ${esc(x.t)} → ${esc(x.c)}${x.r ? `<small>${esc(x.r)}</small>` : ''}</li>`).join('')}</ul>${(r.aun || 0) > au.length ? '<p class="fine">최근 것만 보인다. 전체는 기록 탭의 "최근 자동 선택"에 있다.</p>' : ''}` : ''}
      ${lr && U.repOpen ? `<div class="repbody"><p class="eyebrow">${esc(lr.title)} · ${esc(lr.plan)}</p>${monthBody(lr)}</div>` : ''}`;
  }
  /* 자산 탭(0.11.4): 위에서부터 요약(켜진 수·매달 나가는 돈) → 한도 두 개 → 매달 반복 항목(펼쳐 둠) → 단계형 투자(접어 둠).
     항목은 한 줄(이름·상태 / 자동 스위치 / 사기)이고 설명은 이름을 눌렀을 때만 펼친다. 가격·조건·효과·자동 관리 규칙은 그대로다.
     접힘·펼침은 화면 상태(U.shopOpen, U.shopInfo)로만 기억한다. 저장에는 들어가지 않는다. */
  function shopRow(it, S) {
    const open = U.shopInfo === it.id, sp = G.spendInfo() || {};
    // 돈을 쓰기 전에 볼 사실(0.11.5): 분석 자료가 이번 달에 쓰이는가, 인기가 지금 무엇을 바꾸는가. 숫자는 게임이 실제로 쓰는 식에서 나온다
    const fact = it.id === 'analyst' ? (sp.prepNow ? ' 이번 달 분석 자료가 준비돼 있다.' : '') + (sp.tour ? ' 이번 달에는 플레이오프나 국제전이 열린다(팀이 올라가야 경기가 있다).' : ' 이번 달에는 토너먼트가 없어 분석 자료는 쓰이지 않는다.') + (sp.starter ? '' : ' 지금은 주전이 아니라 분석 자료가 적용되지 않는다.')
      : it.id === 'fanmeet' ? ` 지금 인기 ${sp.fame}: 방송 한 달 수입 약 ${money(sp.stream)}, 1군 연봉 제안 +${sp.payPct}%, 연봉 협상 성공률 +${sp.nego}%p.` : '';
    const st = it.once ? (it.id === 'analyst' && sp.prepNow ? '분석 자료 준비됨' : it.used ? '이번 달 완료' : `${money(it.cost)} · 매달`) : (it.max ? `${it.lv}/${it.of} 최대` : `${it.lv}/${it.of} 단계 · 다음 ${money(it.cost)}`);
    return `<div class="srow"><button class="sname" data-act="shop-info" data-id="${esc(it.id)}" aria-expanded="${open}"><b>${esc(it.name)}</b><span>${esc(st)}</span></button>
      <button class="tog" data-act="shop-auto" data-id="${esc(it.id)}" aria-pressed="${it.on}" aria-label="${esc(it.name)} ${it.once ? '매달 자동' : '모이면 자동'} ${it.on ? '켜짐' : '꺼짐'}" ${it.max && !it.on ? 'disabled' : ''}>자동 ${it.on ? '켜짐' : '꺼짐'}</button>
      <button class="sbuy" data-act="buy" data-id="${esc(it.id)}" aria-label="${esc(it.name)} ${it.max ? '최대 단계' : it.used ? '이번 달 완료' : `지금 사기 ${esc(money(it.cost))}`}" ${it.max || it.used || S.money < it.cost ? 'disabled' : ''}>${it.max ? '최대' : it.used ? '완료' : '사기'}</button></div>
      ${open ? `<p class="sdesc">${esc(it.desc)}${esc(fact)}${it.once ? '' : esc(tierFact(it))}${it.once ? '' : ' 자동을 켜면 돈이 모였을 때 한 달에 한 단계씩 산다.'}${!it.max && !it.used && S.money < it.cost ? ' 지금은 자금이 모자라다.' : ''}</p>` : ''}`;
  }
  /* 시즌 프로젝트(0.11.9): 자산 탭의 접힌 한 줄. 누르면 두 가지 가운데 하나를 고를 수 있다. 고르지 않아도 된다(자동으로 사지 않는다).
     값·효과·대가·살 수 없는 이유는 엔진의 projInfo() 그대로다. */
  const PROJ_WHY = { cond: n => `컨디션 ${n} 이상일 때 할 수 있다`, money: () => '자금이 모자라다', max: () => '이미 한계가 최대다', done: () => '', over: () => '' };
  function projBox(S) {
    const I = G.projInfo(); if (!I) return '';
    const open = !!U.projOpen, top = D.STATS.slice().sort((a, b) => D.ROLES.find(r => r.id === S.role).w[b.id] - D.ROLES.find(r => r.id === S.role).w[a.id]).slice(0, 2).map(x => x.name).join('·');
    const head = I.done ? `<b>시즌 프로젝트</b> ${esc(I.y)}년차 ${esc(I.done.t)} 완료 — ${esc(I.done.d)}` : `<b>시즌 프로젝트</b> ${esc(I.y)}년차 · 아직 고르지 않음 <em>(한 시즌에 하나, 선택)</em>`;
    return `<div class="projbox"><button class="projsum" data-act="projopen" aria-expanded="${open}"><span>${head}</span><i aria-hidden="true">${open ? '접기' : I.done ? '내용' : '고르기'}</i></button>
      ${open ? (I.done ? `<p class="sdesc">${esc(I.done.t)}에 ${money(I.done.c || 0)}을 썼다. ${I.done.id === 'camp' ? '오른 한계는 남는다(나이에 따른 노쇠는 전처럼 깎는다). 한계가 오르면 그 능력치가 다시 자랄 자리가 생긴다.' : '오른 인기는 해마다 조금씩 식는다. 인기는 방송 수입, 연봉 제안, 협상, 해외 제안에 쓰인다.'} 다음 프로젝트는 다음 시즌에 고를 수 있다.</p>`
        : `${I.opts.map(o => `<div class="prow"><div class="pinfo2"><b>${esc(o.name)}</b><span>${esc(o.gain)} · ${esc(o.price)}</span><small>${o.id === 'camp' ? `${esc(top)} — 이 두 능력치가 한계에 막혔을 때 다시 자랄 자리를 만든다. 능력치가 바로 오르지는 않는다.` : '인기는 방송 수입과 다음 연봉 제안을 올린다. 능력치는 오르지 않는다.'}${o.why && PROJ_WHY[o.why] ? ` <i>${esc(PROJ_WHY[o.why](I.minCond))}</i>` : ''}</small></div><button class="sbuy" data-act="proj" data-id="${esc(o.id)}" aria-label="${esc(o.name)} ${esc(money(o.cost))}에 하기. ${esc(o.gain)}, ${esc(o.price)}" ${o.ok ? '' : 'disabled'}>${money(o.cost)}</button></div>`).join('')}<p class="fine">값은 연봉에 비례한다(집중 캠프 10%, 팬 캠페인 6%, 최소 100만). 한 시즌에 하나만 할 수 있고 되돌릴 수 없다. 누르면 바로 적용된다.</p>`) : ''}</div>`;
  }
  // 단계형 투자의 지금 효과 → 다음 단계(0.11.9). 숫자는 성장 공식(장비·코치: 단계당 성장 +5%, 식단: 단계당 매달 컨디션 +1.5)에서 나온다
  function tierFact(it) {
    const gi = G.growInfo() || { ratio: {} }, lv = it.lv, nx = Math.min(it.of, lv + 1), pc = v => `+${v * 5}%`, near = ks => ks.every(k => (gi.ratio[k] || 0) >= .95);
    if (it.id === 'gear') return ` 지금 피지컬·반응속도 성장 ${pc(lv)}${it.max ? '(최대)' : ` → 다음 단계 ${pc(nx)}`}.${near(['mech', 'reflex']) ? ' 지금은 두 능력치가 한계에 가까워 사도 거의 오르지 않는다(장비는 한계를 올리지 않는다).' : ''}`;
    if (it.id === 'coach') return ` 지금 판단력·팀워크·숙련 폭 성장 ${pc(lv)}${it.max ? '(최대)' : ` → 다음 단계 ${pc(nx)}`}.${near(['sense', 'team', 'pool']) ? ' 지금은 세 능력치가 한계에 가까워 사도 거의 오르지 않는다(코치는 한계를 올리지 않는다).' : ''}`;
    if (it.id === 'care') return ` 지금 매달 컨디션 +${lv * 1.5}${it.max ? '(최대)' : ` → 다음 단계 +${nx * 1.5}`}. 컨디션이 높으면 쉬는 달이 줄어든다.`;
    return '';
  }
  function autoPanel(S) {
    const sal = Math.round(S.contract.salary / 10), a = G.autoInfo(), opt = (k, v) => (k === 'keep' ? `${money(v)}` : v ? money(v) : '제한 없음');
    const once = a.items.filter(x => x.once), tier = a.items.filter(x => !x.once), tOn = tier.filter(x => x.on).length, open = !!U.shopOpen;
    return `<div class="autop" id="autop"><p class="autosum" role="status"><b>${a.n ? `자동 ${esc(a.n)}개 켜짐` : '자동 모두 꺼짐'}</b> · 매달 자동으로 나가는 돈 <b>${a.monthly ? money(a.monthly) : '없음'}</b>${tOn ? ` · 단계형 ${esc(tOn)}개는 돈이 모이면` : ''}</p>
      ${a.monthly ? `<p class="payline ${a.monthly > sal ? 'warn' : ''}">월급 ${money(sal)} − 반복 지출 ${money(a.monthly)} = <b>${msgn(sal - a.monthly)}</b>${a.monthly > sal ? ' · 반복 지출이 월급보다 크다. 잔고가 매달 줄어든다.' : ''} <small>방송 수입·상금·단계형 구매는 뺀 값이고, 계약이 바뀌면 달라진다.</small></p>` : ''}
      <div class="lims"><button class="lim" data-act="alim" data-id="keep">남겨 둘 돈<b>${opt('keep', a.keep)}</b></button><button class="lim" data-act="alim" data-id="cap">한 달 자동 지출 상한<b>${opt('cap', a.cap)}</b></button></div>
      <p class="sec">매달 반복 — 한 달에 한 번</p>${once.map(it => shopRow(it, S)).join('')}
      <button class="grp" data-act="shopgrp" aria-expanded="${open}"><span><b>단계형 투자</b>${tier.map(it => `${esc({ gear: '장비', coach: '코치', care: '식단' }[it.id] || it.name)} ${it.lv}/${it.of}`).join(' · ')}${tOn ? ` · 자동 ${esc(tOn)}개` : ''}</span><i aria-hidden="true">${open ? '접기' : '펼치기'}</i></button>
      ${open ? tier.map(it => shopRow(it, S)).join('') : ''}
      <p class="fine">자동을 켠 항목만 매달 월급 직후에 산다. 돈이 모자라면 사지 않고 그달 결과에 이유를 적는다. 빚은 지지 않는다. 이름을 누르면 설명이 나온다.</p></div>`;
  }
  // 이번 달 할 일: 다섯 개가 항상 보이고 한 번 눌러 바꾼다. 고른 것의 효과와 기본 소모를 바로 아래에 적는다.
  /* 0.11.8: 이번 달 할 일도 상자(#pbox) 하나에 담고, 자동진행은 안쪽의 글이 달라진 달에만 바꾼다.
     0.11.7 까지는 자동진행이 이 칸을 건드리지 않아, 컨디션·손목이 낮아 엔진이 자동 휴식으로 바꾸거나 회복해 되돌려도
     화면에는 멈출 때까지 예전 할 일이 눌린 채로 남았다. 엔진의 규칙은 그대로이고 표시만 따라가게 한다. */
  let PLAN_HTML = '', RV_HTML = '';
  function planBar(S) { PLAN_HTML = planIn(S); return `<div class="plansec" id="pbox">${PLAN_HTML}</div>`; }
  function planIn(S) {
    const cur = D.PLANS.find(p => p.id === S.plan), n = v => (v > 0 ? '+' : '−') + Math.abs(v), A = G.apInfo();
    const fx = [`컨디션 ${n(cur.cond)}`, cur.wrist ? `손목 ${n(cur.wrist)}` : '', cur.trust ? `신뢰 ${n(cur.trust)}` : '', cur.fame ? `인기 ${n(cur.fame)}` : ''].filter(Boolean).join(' · ');
    return `<p class="sec">이번 달 할 일</p>${tip('plan')}
      <div class="plan5" role="group" aria-label="이번 달 할 일">${D.PLANS.map(p => `<button data-act="plan" data-id="${esc(p.id)}" aria-pressed="${S.plan === p.id}" aria-label="${esc(p.name)}">${esc(p.s)}</button>`).join('')}</div>
      <p class="planfx" aria-live="polite"><b>${esc(cur.name)}</b> ${esc(cur.desc)}<em>기본 ${esc(fx)}</em>${A.back && S.plan === 'rest' ? `<em>자동 휴식 중 — 회복하면 ${esc((D.PLANS.find(p => p.id === A.back) || cur).name)}(으)로 돌아간다</em>` : ''}</p>`;
  }
  /* 홈의 순서(0.11.6): 이번 달 할 일 → 이번 달 라이벌전(있을 때만) → 지난 진행의 핵심 결과 → 목표(맨 아래, 기본 접힘).
     목표는 한 줄 요약(올해 목표의 진행 · 다음 목표의 조건 달성 수)만 보이고, 누르면 올해 목표·조건별 막대·설명이 펼쳐진다.
     고른 시즌 목표와 진행 상태는 그대로이고 보이는 자리만 바뀌었다. 화면에 그리는 순서와 읽는 순서(DOM)가 같다. */
  /* 이번 달 라이벌전(있는 달만. 없으면 요소 자체가 없다).
     0.11.8: 키가 작은 화면(높이 720px 이하. CSS가 고른다)에서는 한 줄 요약(.rvmini)만 보인다 — "⚔ 라이벌전 · 닉네임 (통산 W승 L패) 외 N명".
     구단 이름과 지난 일 한 줄은 그 크기의 홈에서만 생략되고, 버튼의 이름(aria-label)에는 전부 들어 있다. 누르면 전처럼 리그 탭의 라이벌 기록으로 간다.
     자동진행 중에도 달이 바뀌면 이번 달의 대진에 맞춰 넣거나 뺀다(apTick). */
  function rivalLine() {
    const fx = G.rivalFixtures();
    if (!fx.length) return '';
    const f0 = fx[0];
    return `<button class="rvcard" data-act="tab" data-id="league" data-to="rivals" aria-label="이번 달 라이벌전: ${fx.map(f => `${esc(f.nick)}의 ${esc(f.org)}, 통산 ${esc(f.w)}승 ${esc(f.l)}패`).join(', ')}.${f0.story ? ` ${esc(f0.story)}` : ''} 라이벌 기록 열기"><span class="rvfull"><b>이번 달 라이벌전</b>${fx.map(f => `${esc(f.nick)}의 ${esc(f.org)} · 통산 ${esc(f.w)}승 ${esc(f.l)}패`).join(' / ')}${f0.story ? `<small>${esc(f0.story)}</small>` : ''}</span><span class="rvmini"><b>⚔ 라이벌전 ·</b><span class="rvn">${esc(f0.nick)}</span><em>(<span class="rvw">통산 </span>${esc(f0.w)}승 ${esc(f0.l)}패)${fx.length > 1 ? ` 외 ${esc(fx.length - 1)}명` : ''}</em></span><i aria-hidden="true"><span class="rvgo">기록 </span>›</i></button>`;
  }
  /* 0.11.7: 목표는 보유 자금 바로 아래(본문의 맨 처음)에 둔다. 상자(#gbox)는 그대로 두고 자동진행은 그 안쪽만 바꾼다.
     - 상태·자금 상자(#hbox) 안에 넣지 않는다: 그 상자는 달마다 통째로 바뀌므로 목표가 사라지거나 펼친 상태가 접힌다.
     - 안쪽의 글이 지난달과 같으면 건드리지 않는다(포커스가 유지된다). 펼침 여부는 U.goalOpen 이 기억한다.
     - 화면에 보이는 순서와 DOM 순서가 같다: 상태 → 자금 → 목표 → 이번 달 할 일 → 라이벌전 → 지난 진행. */
  let GOAL_HTML = '';
  function goalLine() { GOAL_HTML = goalIn(); return `<div class="gbox" id="gbox">${GOAL_HTML}</div>`; }
  function goalIn() {
    const g = G.goal(), open = U.goalOpen || !!G.tutTip('goal'), sg = G.goalNow(), okN = g.items.filter(i => i.ok).length;
    // 0.11.9: 아직 못 채운 조건 가운데 첫 번째를 숫자로("OVR 3 부족"). 조건과 값은 엔진의 goal() 그대로다
    const miss = g.items.find(i => !i.ok), gap = miss ? (miss.low ? `${miss.cur}위→${miss.need}위` : `${miss.label} ${Math.round((miss.need - miss.cur) * 10) / 10} 부족`) : '';
    return `<div class="goal slim low"><button class="goalbtn" data-act="goalopen" aria-expanded="${open}"><span class="gsum">${sg ? `<span class="${sg.done ? 'ok' : ''}"><b>목표</b>올해 ${esc(sg.t)}${sg.txt ? ` <em>${esc(sg.txt)}</em>` : ''}</span>` : ''}<span>${sg ? '' : '<b>목표</b>'}다음 ${esc(g.title)}${gap ? ` <em class="gap">${esc(gap)}</em>` : ''} <em class="gcnt ${gap ? 'hasgap' : ''} ${okN === g.items.length ? 'ok' : ''}">${esc(okN)}/${esc(g.items.length)}</em></span></span><i aria-hidden="true">${open ? '접기' : '펼치기'}</i></button>
${tip('goal')}
      ${open ? `${sg ? `<p class="sgoal ${sg.done ? 'ok' : ''}"><b>올해 목표</b> ${esc(sg.t)}${sg.txt ? ` <em>${esc(sg.txt)}</em>` : ''}</p>` : ''}<p class="sec gnext">다음 목표 · ${esc(g.title)}</p>${g.items.map(i => `<div class="gi ${i.ok ? 'ok' : ''}"><span>${esc(i.label)}</span><div class="bar"><i style="width:${i.low ? (i.ok ? 100 : 40) : Math.max(4, Math.min(100, Math.round(i.cur / i.need * 100)))}%"></i></div><b>${esc(i.cur)}${i.low ? '위' : ''} <em>/ ${esc(i.need)}${i.low ? '위 안' : ''}</em></b></div>`).join('')}<p class="fine">${esc(g.note)}</p>` : ''}</div>`;
  }
  function tPlay(S) { RV_HTML = rivalLine(); return `${goalLine()}${planBar(S)}${RV_HTML}${recapCard()}`; }
  function tMoney(S) {
    const c = S.contract;
    return `<p class="moneyline"><span>보유 자금</span><b>${money(S.money)}</b><em>연봉 ${money(c.salary)} · 계약 ${esc(c.years)}년 남음</em></p>${autoPanel(S)}${projBox(S)}${cashBox(S)}`;   // 돈의 흐름은 맨 아래: 위쪽의 요약·한도·자동 스위치 위치를 0.11.5 와 같게 둔다
  }
  /* 돈의 흐름(0.11.6): 최근에 진행한 달의 수입과 지출을 종류별로 보여 준다. 내역은 앱을 연 동안만 기억한다(저장에 넣지 않는다).
     새로 고친 직후에는 내역이 없으므로 숫자를 지어내지 않고 없다고 적는다. 기본은 한 줄이고 누르면 최근 세 달이 펼쳐진다. */
  function cashBox(S) {
    const C = G.cash(), by = [];
    for (const x of C.all) { const k = x.y * 100 + x.m, g = by.length && by[by.length - 1].k === k ? by[by.length - 1] : (by.push({ k, y: x.y, m: x.m, it: [] }), by[by.length - 1]); g.it.push(x); }
    if (!by.length) return `<p class="cashsum none">돈의 흐름 — 이번에 앱을 연 뒤로 진행한 달이 없어 내역이 없다. 한 달을 진행하면 나온다.</p>`;
    const last = by[by.length - 1], net = g => g.it.reduce((a, x) => a + x.v, 0), open = !!U.cashOpen;
    return `<div class="cashbox"><button class="cashsum" data-act="cashopen" aria-expanded="${open}"><span><b>돈의 흐름</b> ${esc(last.y)}년차 ${esc(last.m)}월 <em class="${net(last) < 0 ? 'down' : 'up'}">${msgn(net(last))}</em></span><i aria-hidden="true">${open ? '접기' : '내역'}</i></button>
      ${open ? `${by.slice(-3).reverse().map(g => `<p class="cashrow"><b>${esc(g.y)}년차 ${esc(g.m)}월</b> ${esc(cashParts(g.it))} → <em class="${net(g) < 0 ? 'down' : 'up'}">${msgn(net(g))}</em></p>`).join('')}<p class="fine">월급은 연봉의 10분의 1이 매달 들어온다. 자동 관리는 아래에서 켠 항목만 월급 직후에 나간다. 이 내역은 앱을 연 동안만 보이고, 새로 고치면 다음 진행부터 다시 쌓인다.</p>` : ''}</div>`;
  }
  // 자동진행 설정: 처음 누를 때 한 번 보여 주고, 그 뒤에는 "설정"으로 연다.
  function vApSheet() {
    const A = G.apInfo(), tg = (act, on, name, desc) => `<button class="tog wide" data-act="${act}" aria-pressed="${on}"><b>${esc(name)} — ${on ? '켜짐' : '꺼짐'}</b><small>${esc(desc)}</small></button>`;
    return `<div class="veil"><section class="sheet" role="dialog" aria-modal="true" aria-label="자동진행 설정" tabindex="-1"><p class="eyebrow">자동진행</p><h2>무엇을 맡길까</h2>
      <p>달을 계속 넘기고, 평범한 사건은 아래 성향대로 대신 고른다. 언제든 <b>멈춤</b>을 누르면 그달에서 선다.</p>
      <p class="apstops"><b>항상 멈추는 곳</b> 계약·이적 제안, 스토브리그, 입단 테스트, 성장 카드, 시즌 결산, 콜업·강등·부상·우승 알림, 결승·국제전·라이벌 팀과의 경기, 한 번뿐인 사건, 돈을 써야 위험을 피할 수 있는 사건. 대신 정하지 않는다.</p>
      <div><p class="sec">사건을 고르는 성향</p><div class="seg" role="group" aria-label="사건을 고르는 성향">${Object.keys(AP_STYLE).map(k => `<button data-act="ap-style" data-id="${k}" aria-pressed="${A.style === k}">${AP_STYLE[k][0]}</button>`).join('')}</div><p class="fine">${esc(AP_STYLE[A.style][1])} 돈이 드는 선택지는 고르지 않는다.</p></div>
      ${tg('ap-rest', A.rest, '컨디션이 낮으면 휴식', `컨디션 ${D.BAL.run.cond} 미만이나 손목 ${D.BAL.run.wrist} 이하면 쉬고, 컨디션이 ${D.BAL.ap.restBack}을 넘으면 하던 일로 돌아간다. 끄면 고른 할 일을 그대로 둔다.`)}
      ${tg('ap-match', A.match, '평범한 토너먼트 경기도 맡기기', '켜면 경기 전 전략과 승부처를 성향대로 대신 정하고 결과만 요약에 남긴다. 결승·국제전·라이벌 팀과의 경기는 켜도 직접 한다.')}
      <div><p class="sec">속도</p><div class="seg" role="group" aria-label="속도">${[['norm', '보통'], ['fast', '빠름']].map(([k, n]) => `<button data-act="ap-spd" data-id="${k}" aria-pressed="${A.spd === k}">${n}</button>`).join('')}</div></div>
      <button class="btn" data-act="ap-start">▶▶ 자동진행 시작</button><button class="btn ghost" data-act="ap-close">닫기</button></section></div>`;
  }
  /* 자금 내역의 표시(0.11.6): 엔진이 적어 둔 실제 수입·지출만 쓴다. 종류별로 묶어 한 줄로 만든다. */
  const CASH_K = [['sal', '월급'], ['stream', '방송'], ['prize', '상금'], ['award', '수상'], ['event', '사건'], ['auto', '자동 관리'], ['buy', '직접 구매'], ['proj', '시즌 프로젝트'], ['etc', '기타']];
  const msgn = v => (v < 0 ? '−' : '+') + money(Math.abs(v));
  const cashParts = items => CASH_K.map(([k, name]) => [name, items.filter(x => x.k === k).reduce((a, x) => a + x.v, 0)]).filter(x => x[1]).map(x => `${x[0]} ${msgn(x[1])}`).join(' · ');
  // 자동진행의 진행 줄 아래 한 줄: 방금 넘긴 달의 순변동과 잔고. 지나간 달을 쌓지 않고 이 한 줄만 바꾼다
  const cashMonth = (items, S) => (items.length ? `${items[0].m}월 자금 ${msgn(items.reduce((a, x) => a + x.v, 0))} (${cashParts(items)}) · 잔고 ${money(S.money)}` : `자금 변동 없음 · 잔고 ${money(S.money)}`);
  const apLine = S => { const r = G.recap() || {}, g = AP.n ? growShort(G.lastRep()) : ''; return `${S.year}년차 ${G.month().m}월 · ${AP.n}개월 진행${g ? ` · ${g}` : r.aun ? ` · 자동 선택 ${r.aun}건` : ''}`; };   // 0.11.9: 방금 넘긴 달의 성장 한 토막
  // 처음 안내(첫 3개월): 해당 화면 요소 바로 옆에 한 줄씩. 다음·건너뛰기를 누르면 다시 나오지 않는다.
  function tip(where, sc) {
    const t = G.tutTip(where); if (!t) return '';
    const S = G.state(), mi = G.month();
    const text = where === 'goal' ? (S.squad === 'trainee' ? '지금의 목표다. 아래 세 줄이 모두 초록이 되면 다음 심사에서 2군에 올라간다.' : '지금의 목표다. 아래 줄이 모두 초록이 되면 다음 심사에서 기회가 온다.')
      : where === 'plan' ? `이번 달에 할 일을 하나 고른다. 능력치가 오르는 대신 컨디션이 닳으니, 컨디션이 낮으면 휴식을 고르자. 골랐으면 맨 아래 "${esc(mi.m)}월 진행"을 누른다.`
        : (sc && sc.eval ? '한 달이 지났다. 평가전 평점이 6.0을 넘으면 코치 평가가 오르고, 코치 평가 40은 2군에 올라가는 조건이다. 아래 초록 숫자는 이번 달에 오른 능력치다.' : '한 달의 결과다. 경기 평점이 높을수록 감독 신뢰가 오른다. 아래 초록 숫자는 이번 달에 오른 능력치다.');
    return `<div class="tip" role="note" id="tip-${esc(where)}"><p><b>안내 ${esc(t.step)}/${esc(t.of)}</b>${esc(text)}</p>
      <div class="tipbtns"><button class="tipgo" data-act="tutnext" data-id="${esc(where)}">${t.step < t.of ? '다음' : '알겠어요'}</button>${t.step < t.of ? '<button class="tipskip" data-act="tutskip">건너뛰기</button>' : ''}</div></div>`;
  }
  function hint(S, mi) {
    if (S.injury) return `부상 재활 ${esc(S.injury)}개월 남음`;
    if (S.squad === 'trainee') return '평가를 쌓아 2군 콜업을 노린다';
    if (mi.type === 'league') return G.isStarter() ? '주전으로 출전한다' : '벤치. 신뢰를 쌓아야 한다';
    if (mi.type === 'off') return '시즌 결산과 계약';
    return mi.type === 'nations' && S.year % 2 ? '리그 휴식기' : '진출 팀만 출전한다';
  }
  function tStats(S) {
    const perks = D.CARDS.filter(c => c.perk && S.perks.includes(c.perk)), key = roleKeys(G.role()).map(x => x[0].id);   // 0.11.10: 비중(%) 대신 "주요 능력치" 표시
    return `<div><p class="sec">능력치 <span class="chip">오른쪽 글자는 잠재력</span></p>
      ${D.STATS.map(s => `<div class="stat"><span class="nm">${esc(s.name)}</span><div class="bar"><i style="width:${Math.floor(S.stats[s.id])}%"></i></div><span class="v">${Math.floor(S.stats[s.id])}</span><span class="pot ${G.pot(s.id)}">${G.pot(s.id)}</span><small>${esc(s.tip)}${key.includes(s.id) ? ' · <b class="keyst">주요 능력치</b>' : ''}</small></div>`).join('')}</div>
      ${(() => { const r = G.role(); return `<div class="card guide"><b>${esc(r.name)} 가이드</b><br><span class="dim">${esc(r.easy)}</span>
        <ul class="oinfo"><li>OVR에 크게 들어가는 능력치: ${roleKeys(r).map(([st]) => `${esc(st.name)} ${Math.floor(S.stats[st.id])}`).join(' · ')}</li>
        <li>이 포지션의 OVR을 빨리 올리는 계획: ${rolePlans(r).map(p => esc(p.name)).join(', ')}</li><li>주의: ${esc(r.care)}</li></ul></div>`; })()}
      <div><p class="sec">특성</p>${perks.length ? `<div class="stack">${perks.map(c => `<div class="card"><b>${esc(c.name)}</b><br><span class="dim">${esc(c.desc)}</span></div>`).join('')}</div>` : '<p class="dim">시즌이 끝날 때마다 성장 카드를 한 장 고른다.</p>'}</div>
      <div class="card"><b>${D.TRAITS.find(t => t.id === S.trait).name}</b><br><span class="dim">${D.TRAITS.find(t => t.id === S.trait).desc}</span></div>`;
  }
  const relBar = (name, v) => `<div class="meter"><span>${esc(name)}<b>${esc(v)}</b></span><div class="bar"><i style="width:${esc(v)}%"></i></div></div>`;
  function rivalCard(r, extra) {
    return `<div class="rival ${r.retired ? 'gone' : ''}" style="--team:${esc(r.color)}">
      <div class="rhead"><canvas class="av" data-seed="${esc(r.nick)}" data-color="${esc(r.color)}"></canvas>
        <div class="grow"><b>${esc(r.nick)}</b><span>${esc(G.roleLabel(r.role))} · ${esc(r.style)} · ${esc(r.age)}세</span><span>${esc(r.org)} ${esc(r.squad)} · ${esc(r.status)}</span></div>
        <div class="rovr"><b>${esc(r.ovr)}</b><span>OVR</span></div></div>
      <div class="rmid"><div class="h2h"><span>상대 전적</span><b>${esc(r.w)}승 ${esc(r.l)}패</b></div>${relBar('경쟁심', r.rv)}${relBar('존중', r.rs)}</div>
      ${r.sameRole === true ? '<p class="rkind same"><b>같은 포지션</b>같은 팀이 되면 한 자리를 두고 다투는 상대다.</p>' : r.sameRole === false ? '<p class="rkind"><b>다른 포지션</b>자리는 겹치지 않는다. 경기에서 상대 팀으로 만난다.</p>' : ''}
      <p class="rnews"><span class="chip">${esc(r.label)}</span>${r.titles ? `<span class="chip gold">우승 ${esc(r.titles)}회</span>` : ''} ${esc(r.news)}</p>
      ${extra || ''}
      ${r.hist.length ? `<details><summary>함께한 기록</summary><ul class="log">${r.hist.map(h => `<li><time>${esc(h.y)}년차 ${esc(h.m)}월</time><span>${esc(h.t)}</span></li>`).join('')}</ul></details>` : ''}</div>`;
  }
  function rivalCards() {
    const rs = G.rivals();
    return `<div id="rivals" tabindex="-1"><p class="sec">라이벌</p>${rs.length ? rs.map(r => rivalCard(r)).join('') : '<p class="dim">아직 의식하는 상대가 없다. 1군에서 뛰다 보면 눈에 밟히는 이름이 생긴다.</p>'}
      ${rs.length ? '<p class="fine">상대 전적은 내가 출전한 공식전에서 라이벌이 상대 팀 로스터에 있을 때만 쌓인다. 스크림과 연습은 들어가지 않는다.</p>' : ''}</div>`;
  }
  function tLeague(S) {
    const t = G.table(), y = S.yr, r = G.region();
    const tb = t.length ? `<p class="sec">${esc(r.lgName)}${S.lg.tier === 'second' ? ' 넥스트(2군)' : ''} · ${S.lg.split === 'spring' ? '스프링' : '서머'}</p>
      <table><tr><th>순위</th><th class="l">팀</th><th>승</th><th>패</th></tr>${t.map((x, i) => `<tr class="${x.me ? 'me' : ''} ${i === 3 ? 'cut' : ''}"><td>${i + 1}</td><td class="l"><i class="tagdot" style="background:${esc(x.color)}"></i>${esc(x.name)}</td><td>${esc(x.w)}</td><td>${esc(x.l)}</td></tr>`).join('')}</table>
      <p class="fine">상위 4팀이 플레이오프에 오른다. ${S.lg.tier === 'first' ? '우승·준우승 팀은 국제 대회에 나간다.' : ''}</p>` : '<p class="dim">연습생은 리그에 출전하지 않는다. 능력치가 팀 2군 기준에 닿으면 스플릿이 끝날 때 콜업된다.</p>';
    const me = G.org();
    return `${me && me.idt ? `<p class="orgidt"><b>${esc(me.name)}</b> — ${esc(me.style)}. ${esc(me.idt)}</p>` : ''}<div>${tb}</div><div><p class="sec">올해 내 성적</p><div class="kv"><div><span>경기</span><b>${esc(y.g)}</b></div><div><span>승률</span><b>${y.g ? Math.round(y.w / y.g * 100) + '%' : '-'}</b></div><div><span>평균 평점</span><b>${y.g ? f1(y.rs / y.g) : '-'}</b></div></div></div>
      <div class="card"><b>올해 일정</b><br><span class="dim">2~4월 스프링 → 5월 미드시즌 컵 → 6~8월 서머 → 9월 네이션스컵(짝수 연차) → 10월 월드 파이널 → 11월 시상식·스토브리그</span></div>`;
  }
  function tRecord(S) {
    const c = S.car, al = G.autoLog();
    // 0.11.10: 소식 목록은 플레이 탭의 "최근 진행"으로 옮겼다(저장된 소식은 그대로). 여기에는 통산 기록만 둔다
    return `${al.length ? `<details class="aulog"><summary>최근 자동 선택 ${esc(al.length)}건</summary><ul class="aulist">${al.map(x => `<li><b>${esc(x.y)}년차 ${esc(x.m)}월 · ${esc(AU_KIND[x.k] || '선택')}</b> ${esc(x.t)} → ${esc(x.c)}</li>`).join('')}</ul></details>` : ''}
      ${(() => { const gl = G.goalLog(); return gl.length ? `<details class="aulog"><summary>시즌 목표 — ${gl.filter(x => x.ok === 1).length}번 달성 / ${gl.length}번</summary><ul class="aulist">${gl.slice().reverse().map(x => `<li><b>${esc(x.y)}년차</b> ${esc(x.t)} — ${x.ok === 1 ? '달성' : x.ok === 0 ? '미달성' : '판정 없음'}</li>`).join('')}</ul></details>` : ''; })()}
      <div><p class="sec">통산</p><div class="kv"><div><span>1군 경기</span><b>${esc(c.g)}</b></div><div><span>평균 평점</span><b>${c.g ? f1(c.rs / c.g) : '-'}</b></div><div><span>경기 MVP</span><b>${esc(c.mvp)}</b></div></div></div>
      <div><p class="sec">트로피·수상</p>${c.titles.length + c.awards.length ? `<div class="chips">${c.titles.map(t => `<span class="chip gold">${esc(t.y)}년차 ${esc(t.name)}</span>`).join('')}${c.awards.map(a => `<span class="chip">${esc(a.y)}년차 ${esc(a.name)}</span>`).join('')}</div>` : '<p class="dim">아직 비어 있다.</p>'}</div>
      <div><p class="sec">시즌 기록</p>${S.hist.length ? `<div class="scroll-x"><table><tr><th>연차</th><th class="l">팀</th><th>경기</th><th>승</th><th>평점</th><th>OVR</th></tr>${S.hist.map(h => `<tr><td>${esc(h.year)} <span class="dim">${esc(h.age)}세</span></td><td class="l">${esc(h.tag)} ${G.SQUAD[h.squad]}</td><td>${esc(h.g)}</td><td>${esc(h.w)}</td><td>${h.g ? f1(h.avg) : '-'}</td><td>${esc(h.ovr)}</td></tr>`).join('')}</table></div>` : '<p class="dim">첫 시즌을 마치면 기록이 쌓인다.</p>'}</div>
      <div class="stack"><p class="sec">기록실</p>
        <button class="btn line" data-act="vault" data-id="hall">명예의 전당 — ${G.hallInfo().n}명</button>
        <button class="btn line" data-act="vault" data-id="ach">도전 과제 — ${G.achInfo().n} / ${G.achInfo().of}</button>
        <button class="btn line" data-act="vault" data-id="backup">백업 관리 — 내려받기·복원</button></div>
      <div class="stack"><p class="sec">설정</p>
        ${sndBtn('btn line')}<button class="btn line" data-act="fast">승부처·전략 맡기기 ${S.opt.fast ? '켜짐' : '꺼짐'} — 켜면 경기 전 전략과 승부처를 직접 고르지 않고 감독 판단에 맡긴다. 진행 속도와는 별개다</button>
        <button class="btn line" data-act="tutreplay">처음 안내 다시 보기</button>
        <button class="btn line" data-act="title">타이틀로 (자동 저장됨)</button>
        <button class="btn line" data-act="wipe">${U.confirm === 'wipe' ? '한 번 더 누르면 이 커리어가 삭제된다' : '커리어 삭제'}</button></div>`;
  }

  /* ---- 장면 ---- */
  const okBtn = t => `<button class="btn" data-act="ok">${t || '확인'}</button>`;
  const pill = p => p == null ? '<span class="pill sure">확정</span>' : `<span class="pill ${p >= 65 ? 'hi' : p < 40 ? 'lo' : ''}">${esc(p)}%</span>`;
  const matchList = ms => ms.length ? `<ul class="matches">${ms.map(m => `<li><span class="opp">${m.label ? `<small>${esc(m.label)}</small>` : ''}vs ${esc(m.opp)}</span><span class="res ${m.win ? 'W' : 'L'}">${m.score ? esc(m.score) + ' ' : ''}${m.win ? '승' : '패'}</span>${m.plays ? `<span class="rt">${f1(m.r)}</span><span class="kda">${esc(m.k)}/${esc(m.d)}/${esc(m.a)}${m.mvp ? '<span class="mvp">MVP</span>' : ''}</span>` : '<span class="rt dim">-</span><span class="kda">벤치</span>'}${(m.rv || []).map(v => `<small class="mom rvl">라이벌전 · ${esc(v.nick)} 평점 ${f1(v.r)}</small>`).join('')}${(m.moms || []).map(o => `<small class="mom ${o.ok ? 'ok' : 'no'}">승부처 · ${esc(o.title)} — ${esc(o.label)} · ${o.ok ? '성공' : '실패'}${o.auto ? ' (자동)' : ''}</small>`).join('')}</li>`).join('')}</ul>` : '';
  const board = (sc, x, y) => `<div class="board"><div class="side"><span>${esc(sc.me)}</span><b>${esc(x)}</b></div><i>:</i><div class="side opp"><b>${esc(y)}</b><span>${esc(sc.opp)}</span></div></div>`;
  const SIT = { last: '마지막 세트', match: '매치 포인트', elim: '탈락 위기' };
  // 월간 보고의 포지션 해설 한 줄. 그 달 경기의 실제 킬·데스·어시스트·평점에서만 나온다(G.roleReview).
  function roleLine(matches) {
    const v = G.roleReview(matches); if (!v) return '';
    return `<p class="act ${v.good ? 'up' : 'down'}"><b>${esc(v.pos)} 해설</b><span class="chip ${v.good ? 'up' : 'down'}">${esc(v.head)}</span>${esc(v.text)}</p>`;
  }
  // 계약 제안에 붙는 구단 설명
  // 제안의 매력과 부담 한 줄(0.11.5): 아래 줄들에 이미 있는 사실(리그 순위, 주전 여부, 내 OVR과 팀 전력의 차)을 한 문장으로 묶는다
  function pitch(v) {
    const top = v.rank <= 2, low = v.rank >= v.teams - 2;
    if (top && !v.starter) return '우승을 다투는 팀이지만 벤치에서 시작한다. 트로피에 가깝고 출전은 멀다.';
    if (top && v.starter) return '우승을 다투는 팀에서 바로 주전이다. 기대도 그만큼 크다.';
    if (low && v.starter) return v.diff >= 2 ? '성적은 낮은 팀이지만 바로 주전이고, 내가 팀에서 가장 강한 축이 된다.' : '성적은 낮은 팀이지만 바로 주전으로 뛴다. 경기 수를 쌓기 좋다.';
    if (low) return '성적이 낮은 팀인데 벤치에서 시작한다. 얻을 것이 분명하지 않다.';
    return v.starter ? '중위권 팀에서 주전으로 뛴다. 플레이오프 문턱을 다투게 된다.' : '중위권 팀의 벤치에서 시작한다. 자리를 따내면 플레이오프를 다툰다.';
  }
  function offerLines(o) {
    const v = G.offerInfo(o); if (!v) return '';
    const sign = n => (n > 0 ? '+' : '') + n, L = [];
    L.push(`${esc(v.lg)} · 전력 ${esc(v.str)} (리그 ${esc(v.teams)}팀 중 ${esc(v.rank)}위)${v.honor ? ` · ${esc(v.honor)}` : ''}`);
    if (v.idt) L.push(`<b>${esc(v.style)}.</b> ${esc(v.idt)}`);
    if (!v.here && v.squad === 'first') L.push(pitch(v));
    if (v.back) L.push(`<b>${esc(v.home)} 리그 복귀 제안.</b> 해외에서 쌓은 1군 경력을 보고 연락해 왔다.`);
    if (v.squad === 'first') L.push(`내 OVR ${esc(v.ovr)}, 팀 전력보다 ${esc(sign(v.diff))}. ${v.diff >= 2 ? '내가 뛰면 팀이 강해진다.' : v.diff >= -3 ? '팀 평균과 비슷하다.' : '팀 평균에 못 미친다. 내가 뛰면 팀 전력이 조금 내려간다.'}`);
    else if (v.squad === 'second') L.push(`2군 계약. 1군 콜업 심사 기준은 OVR ${esc(v.need1)} (지금 ${esc(v.ovr)}).`);
    L.push(v.here ? `지금 팀이다. 감독 신뢰는 ${esc(v.trust)} 그대로(${v.starter ? '주전' : '벤치'}).` : `옮기면 감독 신뢰 ${esc(v.trust)}에서 시작한다. ${v.starter ? '바로 주전으로 뛴다.' : `주전 기준 ${esc(v.line)}에 닿기 전까지는 벤치다.`}`);
    for (const r of v.rivals) L.push(`이 팀 소속 라이벌: ${esc(r.nick)}(${esc(r.role)}, ${esc(r.squad)}). ${r.same ? '같은 포지션이라 자리를 두고 다툰다.' : '포지션이 달라 동료가 된다.'}`);
    if (!v.here) L.push(`지금 연봉보다 ${money(Math.abs(v.pay))} ${v.pay >= 0 ? '많다' : '적다'}.${v.abroad ? ` 다른 나라 리그다. 국가대표는 그대로 ${esc(v.home)}.` : ''}`);
    return `<ul class="oinfo">${L.map(x => `<li>${x}</li>`).join('')}</ul>`;
  }
  /* ---------- 소리(0.11.0) ----------
     효과음은 전부 이 파일에서 Web Audio 로 직접 합성한다(음원 파일 없음. docs/audio-assets.md).
     - 사용자가 화면을 처음 누른 뒤에만 오디오를 켠다(모바일 자동 재생 제한). 켜지 못해도 게임은 그대로 진행된다.
     - 설정은 커리어 저장과 별개인 pg_opt_v1 에 둔다(백업·복원·저장 형식과 무관).
     - 탭이 숨겨지면 멈추고, 돌아오면 설정이 켜져 있을 때만 다시 켠다. 같은 소리는 짧은 간격으로 겹쳐 내지 않는다.
     - 경기 판정·난수와는 아무 관계가 없다. 소리를 꺼도, 낼 수 없어도 결과는 같다. */
  const SND = (() => {
    const OPT = 'pg_opt_v1', log = (window.__pgSnd = window.__pgSnd || []);
    let on = true, ctx = null, master = null, nbuf = null, last = {};
    try { const o = JSON.parse(localStorage.getItem(OPT) || '{}'); if (o && o.snd === 0) on = false; } catch (e) {}
    const AC = () => window.AudioContext || window.webkitAudioContext;
    function unlock() {
      if (!on) return;
      try {
        if (!ctx) { const A = AC(); if (!A) return; ctx = new A(); master = ctx.createGain(); master.gain.value = .42; master.connect(ctx.destination); }
        if (ctx.state === 'suspended' && !document.hidden) { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); }
      } catch (e) { ctx = null; }
    }
    function quiet() { try { if (ctx && ctx.state === 'running') { const p = ctx.suspend(); if (p && p.catch) p.catch(() => {}); } } catch (e) {} }
    function tone(t, f, dur, type, vol, f2) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'triangle'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol || .2, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .03);
    }
    function noise(t, dur, vol, freq) {
      if (!nbuf) { nbuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = nbuf.getChannelData(0); let x = 22222; for (let i = 0; i < d.length; i++) { x = (x * 16807) % 2147483647; d[i] = x / 1073741823.5 - 1; } }   // 고정된 수열: 게임 난수를 쓰지 않는다
      const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      n.buffer = nbuf; f.type = 'bandpass'; f.frequency.value = freq || 900; f.Q.value = .7;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol || .12, t + dur * .35); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t + dur + .03);
    }
    const CUES = {
      tap: t => tone(t, 240, .07, 'square', .07, 190),                                                                    // 전략 선택·주요 버튼: 낮고 짧게
      start: t => { noise(t, .55, .12, 800); tone(t, 110, .32, 'sawtooth', .09, 220); tone(t + .2, 330, .24, 'triangle', .16); },   // 경기 시작: 1초 안의 전환
      setw: t => { tone(t, 523, .11, 'triangle', .16); tone(t + .09, 784, .18, 'triangle', .16); },                          // 세트를 가져옴
      setl: t => { tone(t, 392, .13, 'triangle', .14); tone(t + .1, 294, .22, 'triangle', .14); },                           // 세트를 내줌
      tension: t => { noise(t, .7, .06, 500); tone(t, 147, .15, 'sawtooth', .08); tone(t + .2, 165, .15, 'sawtooth', .08); tone(t + .4, 196, .22, 'sawtooth', .09); },   // 승부처 진입: 짧은 상승
      ok: t => [523, 659, 784, 1047].forEach((f, i) => tone(t + i * .07, f, .16, 'triangle', .17)),                           // 승부처 성공
      fail: t => tone(t, 330, .36, 'sine', .17, 233),                                                                        // 승부처 실패: 짧은 아쉬움
      win: t => { [523, 659, 784].forEach((f, i) => tone(t + i * .12, f, .2, 'triangle', .18)); tone(t + .36, 1047, .5, 'triangle', .2); },
      winbig: t => { noise(t + .3, 1.1, .1, 1400); [523, 659, 784, 1047].forEach((f, i) => tone(t + i * .12, f, .22, 'triangle', .18)); tone(t + .5, 1319, .7, 'triangle', .2); tone(t + .5, 659, .7, 'sine', .12); },   // 결승 승리
      lose: t => { tone(t, 262, .3, 'sine', .16); tone(t + .26, 196, .55, 'sine', .16); },
      // 0.11.11 순간의 소리: 모두 1초 안쪽, 외부 음원 없이 합성
      comeback: t => { tone(t, 196, .16, 'sawtooth', .08); [392, 523, 659, 784, 1047].forEach((f, i) => tone(t + .14 + i * .09, f, .2, 'triangle', .18)); tone(t + .62, 1319, .45, 'triangle', .18); },   // 역전승: 낮게 시작해 치고 올라간다
      champ: t => { noise(t, .9, .07, 2200); [659, 784, 1047, 1319].forEach((f, i) => tone(t + i * .1, f, .3, 'triangle', .16)); tone(t + .42, 1568, .5, 'sine', .12); },                                  // 우승 알림: 트로피가 오를 때
      callup: t => { tone(t, 392, .12, 'triangle', .16); tone(t + .11, 523, .12, 'triangle', .16); tone(t + .22, 784, .34, 'triangle', .18); },                                                            // 콜업: 밝은 세 음
      move: t => { noise(t, .35, .07, 600); tone(t + .05, 330, .14, 'triangle', .15); tone(t + .19, 494, .3, 'triangle', .17); },                                                                          // 이적: 문이 열리는 느낌의 두 음
      award: t => { tone(t, 784, .14, 'triangle', .15); tone(t + .12, 988, .14, 'triangle', .15); tone(t + .24, 1175, .4, 'triangle', .16); },                                                             // 수상
      up: t => { tone(t, 659, .08, 'triangle', .12); tone(t + .07, 880, .16, 'triangle', .13); },                                                                                                           // OVR 이 오른 달: 아주 짧게
      season: t => { tone(t, 262, .5, 'sine', .1); tone(t + .02, 330, .5, 'sine', .09); tone(t + .04, 392, .6, 'sine', .09); },                                                                             // 시즌 결산: 조용한 화음
      bad: t => tone(t, 220, .32, 'sine', .14, 165),                                                                                                                                                         // 강등·부상·방출
    };
    function play(name) {
      const now = Date.now(); let played = false;
      if (CUES[name] && on && !(now - (last[name] || 0) < 90)) {
        last[name] = now; unlock();
        try { if (ctx && ctx.state === 'running') { CUES[name](ctx.currentTime + .01); played = true; } } catch (e) {}
      }
      log.push({ c: name, on, played }); if (log.length > 200) log.shift();
      return played;
    }
    function set(v) { on = !!v; try { localStorage.setItem(OPT, JSON.stringify({ snd: on ? 1 : 0 })); } catch (e) {} if (on) unlock(); else quiet(); }
    return { play, set, unlock, quiet, on: () => on, cues: Object.keys(CUES), state: () => (ctx ? ctx.state : 'none') };
  })();
  const sndBtn = cls => `<button class="${cls || 'sndb'}" data-act="snd" aria-pressed="${SND.on()}" aria-label="소리 ${SND.on() ? '끄기' : '켜기'}">소리 ${SND.on() ? '켜짐' : '꺼짐'}</button>`;

  /* ---------- 경기장(0.11.0): 경기 준비 → 관전 → 승부처 → 결과를 한 장의 창 안에서 이어 보여 준다 ----------
     화면은 장면에 저장된 실제 기록(세트별 승패, 전략이 바꾼 승률, 승부처 결과, 내 성적)만 읽는다. 판정은 엔진이 이미 끝냈다.
     관전 속도·건너뛰기·소리는 U(화면 상태)에만 있고 엔진을 부르지 않으므로 결과에 영향을 줄 수 없다. */
  const ARENA = { prematch: 1, moment: 1, mresult: 1, match: 1 };
  const hex = c => (typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : '#3a4070');
  const teamOf = name => D.ORGS.find(o => o.name === name) || null;
  const skey = sc => (sc && ARENA[sc.type] ? [sc.tour, sc.label, sc.opp].join('|') : '');
  const akey = sc => (sc && ARENA[sc.type] ? [sc.type, sc.tour, sc.label, sc.opp, sc.set || '', sc.x == null ? '' : sc.x, sc.y == null ? '' : sc.y].join('|') : '');
  const wl = sc => (sc.type === 'match' ? sc.sets.map(x => (x.w ? 'W' : 'L')).join('') : String(sc.pips || ''));
  const TAC = id => D.TACTICS.find(t => t.id === id);
  const sgn = v => (v > 0 ? '+' : '') + v;
  const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function arenaHead(sc, seq, shown) {
    const need = (sc.bo + 1) / 2, vis = seq.slice(0, shown), x = [...vis].filter(c => c === 'W').length, y = vis.length - x;
    const a = teamOf(sc.me), b = teamOf(sc.opp), tag = (o, t) => esc(t || (o ? o.tag : '') || '');
    const slots = Math.max(sc.bo || 0, seq.length);
    return `<div class="arena"><div class="ateam"><span class="tagb" style="border-color:${hex(sc.meColor || (a && a.color))}">${tag(a, sc.meTag) || '우리'}</span><span class="tn">${esc(sc.me)}</span></div>
      <div class="ascore" aria-label="세트 스코어 ${esc(x)} 대 ${esc(y)}"><b>${esc(x)}</b><i>:</i><b>${esc(y)}</b></div>
      <div class="ateam opp"><span class="tn">${esc(sc.opp)}</span><span class="tagb" style="border-color:${hex(sc.oppColor || (b && b.color))}">${tag(b, sc.oppTag) || '상대'}</span></div></div>
      <div class="pips" role="img" aria-label="${esc(sc.bo)}전 ${esc(need)}선승. ${vis.length ? [...vis].map((c, i) => `${i + 1}세트 ${c === 'W' ? '승' : '패'}`).join(', ') : '아직 치른 세트 없음'}">${Array.from({ length: slots }, (_, i) => `<i class="${i < vis.length ? (vis[i] === 'W' ? 'w' : 'l') : ''}"></i>`).join('')}</div>`;
  }
  const arenaTop = (sc, sub) => `${G.inDemo() ? '<p class="demo" role="note">비공식 체험전이다. 이 경기는 기록·저장·도전 과제에 남지 않는다.<button class="sndb" data-act="demoend">체험 끝내기</button></p>' : ''}<div class="arow"><p class="eyebrow">${esc(sc.tour)} · ${esc(sc.label)}${sub ? ' · ' + esc(sub) : ''}</p>${sndBtn()}</div>`;
  // 관전: 아직 보여 주지 않은 세트를 하나씩 드러낸다. U.watch.i = 지금까지 드러낸 세트 수.
  function vWatch(sc) {
    const seq = wl(sc), w = U.watch, i = w.i, need = (sc.bo + 1) / 2, vis = seq.slice(0, i), x = [...vis].filter(c => c === 'W').length, y = vis.length - x;
    const lastW = i > 0 ? seq[i - 1] === 'W' : null, d = sc.type === 'match' && i > 0 ? sc.sets[i - 1].d : 0;
    const pos = clampN(50 + (x - y) / need * 38, 8, 92);   // 전선: 이길수록 상대 진영 쪽으로 밀린다
    const cap = i === 0 ? '경기가 시작됐다.' : `${i}세트를 ${lastW ? '가져왔다' : '내줬다'}.${i < seq.length || sc.type === 'moment' ? (x === need - 1 && y === need - 1 ? ' 마지막 세트로 간다.' : x === need - 1 ? ' 매치 포인트다.' : y === need - 1 ? ' 벼랑 끝이다.' : '') : ''}`;
    return `${arenaTop(sc, '관전')}${arenaHead(sc, seq, i)}
      <div class="lane" aria-hidden="true"><span class="lme">우리 진영</span><div class="track"><i class="mark ${lastW === null ? '' : lastW ? 'w' : 'l'}" style="left:${pos}%"></i></div><span class="lop">상대 진영</span></div>
      <p class="wcap ${lastW === null ? '' : lastW ? 'w' : 'l'}" role="status" aria-live="polite">${esc(cap)}${d ? ` <span class="chip ${d > 0 ? 'up' : 'down'}">전략 ${esc(sgn(d))}%p</span>` : ''}</p>
      <div class="wbtns"><button class="btn ghost" data-act="wfast" aria-pressed="${!!w.fast}">빠르게</button><button class="btn ghost" data-act="wskip">${sc.type === 'match' ? '바로 결과' : '바로 승부처로'}</button></div>`;
  }
  function vPrematch(sc) {
    const need = (sc.bo + 1) / 2;
    // 이 경기가 왜 큰 경기인지(0.11.11): 결승·국제전·대표팀·라이벌전 꼬리표와, 엔진이 실제 기록으로 만든 한 줄(sc.why). 평범한 경기에는 꼬리표가 없다
    const tags = [sc.label === '결승' ? '결승' : '', sc.kind === 'intl' ? '국제전' : sc.kind === 'nations' ? '국가대표' : '', sc.rival ? '라이벌전' : ''].filter(Boolean);
    return `${arenaTop(sc)}${arenaHead(sc, '', 0)}
      <p class="stake${tags.length ? ' bigm' : ''}">${tags.map(x => `<i class="mtag">${esc(x)}</i>`).join('')}<b>${esc(sc.bo)}전 ${esc(need)}선승</b>${sc.why ? esc(sc.why) : sc.label === '결승' ? '이기면 우승이다.' : '지면 이 대회는 여기서 끝난다.'}</p>
      <div class="chips"><span class="chip">${esc(sc.role)} 출전</span><span class="chip ${sc.cond >= 70 ? 'up' : sc.cond < 50 ? 'down' : ''}">컨디션 ${esc(sc.cond)}</span><span class="chip ${sc.base >= 55 ? 'up' : sc.base <= 45 ? 'down' : ''}">전력으로 본 세트 승률 ${esc(sc.base)}%</span>${sc.prep ? `<span class="chip up">분석 자료 · 전력 +${esc(D.BAL.prepStr)}</span>` : ''}</div>
      ${sc.rival ? `<p class="rvnote">상대 팀에 ${esc(sc.rival)}. ${esc(sc.h2h)}${sc.h2h ? '.' : ''}${sc.story ? ` ${esc(sc.story)}` : ''}</p>` : ''}
      <h2>어떻게 싸울까</h2>
      ${sc.tacs.map(t => { const k = TAC(t.id); if (!k) return ''; const dd = t.p - sc.base; return `<button class="choice tac" data-act="tac" data-id="${esc(t.id)}" aria-pressed="${U.tac === t.id}"><div class="grow"><b>${esc(k.name)}</b><small class="tgood">유리 — ${esc(k.good)}</small><small class="tbad">불리 — ${esc(k.bad)}</small></div><span class="pill ${dd > 0 ? 'hi' : dd < 0 ? 'lo' : ''}">${esc(t.p)}%<small>1세트 ${esc(sgn(dd))}</small></span></button>`; }).join('')}
      <button class="btn" data-act="kick" ${U.tac ? '' : 'disabled'}>${U.tac ? `${esc((TAC(U.tac) || {}).name || '')} — 경기 시작` : '전략을 고르면 시작할 수 있다'}</button>
      <button class="btn line" data-act="kick" data-id="none">전략 없이 시작한다</button>
      ${sc.oppIdt ? `<p class="fine">상대 팀 ${esc(sc.opp)} — ${esc(sc.oppStyle)}. ${esc(sc.oppIdt)} (팀 분위기 소개다. 승률 계산에는 들어가지 않는다.)</p>` : ''}
      <p class="fine">고른 전략은 이 시리즈의 세트 승률에 실제로 반영된다(세트당 최대 약 ±6%p). 오른쪽 숫자는 1세트 승률이다. 세트 스코어가 바뀌면 효과도 바뀐다.</p>`;
  }
  // 경기 결과의 "내 선택 → 그때의 영향 → 실제 결과"(0.11.5). 두 줄 이내. 숫자는 판정 때 실제로 들어간 세트별 보정과 승부처의 표시 확률이다.
  // 확률을 조금 바꿨을 뿐이므로 "이 선택 때문에 이겼다/졌다"고 쓰지 않는다.
  function causeLines(sc, k) {
    const ds = sc.sets.map(x => x.d || 0), sum = Math.round(ds.reduce((a, b) => a + b, 0) / Math.max(1, ds.length) * 10) / 10, res = `실제 ${sc.x}:${sc.y} ${sc.win ? '승리' : '패배'}`;
    const l1 = k ? `<b>${esc(k.name)}</b>을(를) 골랐다 → 세트 승률 평균 ${esc(sgn(sum))}%p(${ds.map(d => esc(sgn(d))).join(' / ')}) → ${esc(res)}.` : `전략 없이 치렀다 → 세트 승률 보정 없음 → ${esc(res)}.`;
    const l0 = sc.prep ? `<p>전술 분석가의 <b>분석 자료</b>가 적용된 경기였다(팀 전력 +${esc(D.BAL.prepStr)}).</p>` : '';
    const l2 = sc.moms.map(m => `승부처 「${esc(m.title)}」에서 <b>${esc(m.label)}</b>${m.auto ? '(감독 판단)' : ''} → ${m.ok ? '성공' : '실패'}.`).join(' ');
    return `<div class="cause">${l0}<p>${l1}</p>${l2 ? `<p>${l2}</p>` : ''}<p class="fine">선택은 확률을 조금 움직였을 뿐이다. 결과의 원인이라고 단정할 수는 없다.</p></div>`;
  }
  function vMatch(sc) {
    const k = TAC(sc.tac), plus = sc.sets.filter(x => x.d > 0), minus = sc.sets.filter(x => x.d < 0);
    const line = !k ? '전략 없이 치렀다. 세트 승률에 보정은 없었다.'
      : `전략이 유리하게 작용한 세트 ${plus.length}개(그중 ${plus.filter(x => x.w).length}승), 불리하게 작용한 세트 ${minus.length}개(그중 ${minus.filter(x => !x.w).length}패).`;
    const lm = U.lastM && U.lastM.k === skey(sc) ? U.lastM : null;
    const dr = drama(sc), fx = U.fxOnce === skey(sc) && bigWin(sc); U.fxOnce = '';   // 큰 승리의 반짝임은 결과가 처음 그려질 때 한 번만(0.7초, 누르는 것을 막지 않는다)
    return `${arenaTop(sc, '결과')}${arenaHead(sc, wl(sc), sc.sets.length)}
      ${lm ? `<div class="evres ${lm.ok ? 'ok' : 'no'}"><p class="sec">승부처 ${lm.ok ? '성공' : '실패'} · ${esc(lm.p)}% — ${esc(lm.choice)}</p><p>${esc(lm.text)}</p><div class="chips"><span class="chip ${lm.setWin ? 'up' : 'down'}">${esc(lm.set)}세트 ${lm.setWin ? '승리' : '패배'}</span>${lm.d ? `<span class="chip ${lm.d > 0 ? 'up' : 'down'}">전략 ${esc(sgn(lm.d))}%p</span>` : ''}</div></div>` : ''}
      <div class="verdict ${sc.win ? 'w' : 'l'}${bigWin(sc) ? ' big' : ''}${fx ? ' fx' : ''}"><b>${esc(dr[0])}</b><span>${esc(sc.x)}:${esc(sc.y)}${dr[1] ? ` · ${esc(dr[1])}` : ''} · ${esc(sc.next)}</span></div>
      ${causeLines(sc, k)}
      <div class="chips">${sc.sets.map((x, i) => `<span class="chip ${x.d > 0 ? 'up' : x.d < 0 ? 'down' : ''}">${i + 1}세트 ${x.w ? '승' : '패'}${k ? ' · ' + esc(sgn(x.d)) + '%p' : ''}</span>`).join('')}</div>
      ${k ? `<p class="fine">${esc(line)}</p>` : ''}
      <p class="sec">내 활약</p>
      <div class="chips"><span class="chip ${sc.r >= 7 ? 'up' : sc.r < 5.5 ? 'down' : ''}">평점 ${esc(Number(sc.r).toFixed(1))}</span><span class="chip">K/D/A ${esc(sc.k)}/${esc(sc.d)}/${esc(sc.a)}</span>${sc.mvp ? '<span class="chip gold">시리즈 MVP</span>' : ''}</div>
      ${sc.rival ? `<p class="rvnote">${esc(sc.rival)}.${sc.story ? ` ${esc(sc.story)}` : ''}</p>` : ''}
      ${okBtn(G.inDemo() ? '다음으로' : '다음 일정으로')}
      <p class="fine">${G.inDemo() ? '체험전에서는 여기까지의 기록이 남지 않는다.' : '자세한 성적과 팬 반응은 이어지는 월간 보고에 있다.'}</p>`;
  }
  // 승부처의 판돈: 몇 전제인지, 지금 스코어, 이 세트에 걸린 것. 장면에 저장된 실제 값(bo, x, y)에서만 만든다.
  function stakeLine(sc) {
    const need = (sc.bo + 1) / 2; if (!(need >= 1)) return '';
    const mine = sc.x === need - 1, theirs = sc.y === need - 1;
    const stake = mine && theirs ? '이 세트를 이기는 쪽이 시리즈를 가져간다.' : mine ? '이 세트를 이기면 시리즈가 끝난다. 져도 한 세트가 더 남는다.' : theirs ? '이 세트를 지면 시리즈가 끝난다.' : '';
    return `<p class="stake"><b>${esc(sc.bo)}전 ${esc(need)}선승</b>지금 ${esc(sc.x)}:${esc(sc.y)}. ${stake}${sc.label === '결승' ? ' 결승이다.' : ''}</p>`;
  }
  // 선택지의 위험도: 성공했을 때와 실패했을 때의 세트 승률 차이(화면에 보이는 두 숫자의 차)로 나눈다.
  function riskTag(c) {
    const gap = c.up - c.down; if (!(gap >= 0)) return '';
    return gap >= 14 ? '<span class="risk hi">큰 승부</span>' : gap >= 9 ? '<span class="risk mid">승부</span>' : '<span class="risk lo">안전</span>';
  }
  function retireBtn() { return `<button class="btn line" data-act="retire">${U.confirm === 'retire' ? '한 번 더 누르면 은퇴한다. 되돌릴 수 없다' : '은퇴한다'}</button>`; }

  function vScene(sc, S) {
    let cls = sc.tone || '', h = '';
    switch (sc.type) {
      case 'pickOrg':
        h = `<p class="eyebrow">TRYOUT PASSED</p><h2>세 구단의 제안</h2><p>입단 테스트를 통과했다. 연습생 계약을 맺을 구단을 고르자.</p>
          ${sc.offers.map((o, i) => `<button class="choice" data-act="res" data-i="${esc(i)}"><div class="grow"><b>${esc(o.name)}</b><small>${esc(o.note)}</small>${D.ORG[o.org] && D.ORG[o.org].idt ? `<small>${esc(D.ORG[o.org].style)} — ${esc(D.ORG[o.org].idt)}</small>` : ''}${o.need2 ? `<small class="swing">콜업 기준 — 2군 OVR ${esc(o.need2)} · 1군 OVR ${esc(o.need1)} (지금 내 OVR ${Math.floor(G.ovr())})</small>` : ''}</div><span class="pill sure">전력 ${esc(o.str)}</span></button>`).join('')}`; break;
      case 'event':
        h = `<p class="eyebrow">선택의 순간</p><h2>${esc(sc.title)}</h2><p>${esc(sc.text)}</p>
          ${sc.choices.map((c, i) => `<button class="choice" data-act="res" data-i="${esc(i)}" ${c.disabled ? 'disabled' : ''}><div class="grow"><b>${esc(c.label)}</b>${c.bd ? `<small>${c.bd.map(b => `${esc(b[0])} ${b[1] >= 0 && b[0] !== '기본' ? '+' : ''}${esc(b[1])}`).join(' · ')}</small>` : ''}${c.disabled ? '<small>자금이 부족하다</small>' : ''}</div>${pill(c.p)}</button>`).join('')}
          <p class="fine">표시된 숫자가 실제 성공 확률이다. 실패가 이어지면 다음 판정에 보정이 붙는다.</p>`; break;
      case 'prematch': cls = 'arenas'; h = vPrematch(sc); break;
      case 'match':
        cls = 'arenas ' + (U.watch ? '' : sc.win ? 'good' : 'bad');
        h = U.watch ? vWatch(sc) : vMatch(sc); break;
      case 'moment':
        cls = 'clutch' + (sc.pips != null ? ' arenas' : '');
        if (U.watch) { h = vWatch(sc); break; }
        h = `${sc.pips != null ? arenaTop(sc, `${sc.set}세트 · ${SIT[sc.sit]}`) + arenaHead(sc, wl(sc), wl(sc).length) : `<p class="eyebrow">${esc(sc.tour)} · ${esc(sc.label)} ${esc(sc.set)}세트 · ${SIT[sc.sit]}</p>${board(sc, sc.x, sc.y)}`}
          ${stakeLine(sc)}<h2>${esc(sc.title)}</h2><p>${esc(sc.text)}</p>${sc.rival ? `<p class="rvnote">상대 팀에 ${esc(sc.rival)}. 이 시리즈 결과가 상대 전적에 남는다.</p>` : ''}<p class="fine">지금 이 세트를 이길 확률은 ${esc(sc.base)}%${sc.tac && TAC(sc.tac) ? `(전략 「${esc(TAC(sc.tac).name)}」 반영)` : ''}. 선택이 성공하면 오르고 실패하면 내려간다.</p>
          ${sc.choices.map((c, i) => `<button class="choice" data-act="res" data-i="${esc(i)}"><div class="grow"><b>${riskTag(c)}${esc(c.label)}</b><small>${c.bd.map(b => `${esc(b[0])} ${b[1] >= 0 && b[0] !== '기본' ? '+' : ''}${esc(b[1])}`).join(' · ')}</small><small class="swing">성공하면 세트 승률 <em class="up">${esc(c.up)}%</em> · 실패하면 <em class="down">${esc(c.down)}%</em></small></div>${pill(c.p)}</button>`).join('')}
          <button class="btn line" data-act="mom-auto">감독 판단에 맡긴다 (자동 선택)</button>`; break;
      case 'mresult':
        cls = (sc.ok ? 'good' : 'bad') + (sc.pips != null ? ' arenas' : '');
        h = `${sc.pips != null ? arenaTop(sc, `${sc.set}세트`) + arenaHead(sc, wl(sc), wl(sc).length) : `<p class="eyebrow">${esc(sc.tour)} · ${esc(sc.label)} ${esc(sc.set)}세트</p>`}<span class="stamp ${sc.ok ? 'ok' : 'no'}">${sc.ok ? '성공' : '실패'} · ${esc(sc.p)}%</span>
          <h2>${esc(sc.title)}</h2><p class="dim">${sc.auto ? '자동 선택(감독 판단): ' : ''}${esc(sc.choice)}</p><p>${esc(sc.text)}</p>
          <div class="chips"><span class="chip ${sc.eff > 0 ? 'up' : 'down'}">이 세트 팀 전력 ${sc.eff > 0 ? '+' : ''}${esc(sc.eff)}</span><span class="chip ${sc.setWin ? 'up' : 'down'}">${esc(sc.set)}세트 ${sc.setWin ? '승리' : '패배'}</span>${sc.d ? `<span class="chip ${sc.d > 0 ? 'up' : 'down'}">전략 ${esc(sgn(sc.d))}%p</span>` : ''}</div>
          ${sc.pips != null ? '' : board(sc, sc.x, sc.y)}<p>${sc.over ? (sc.x > sc.y ? '시리즈를 가져왔다.' : '시리즈를 내줬다.') : '경기는 계속된다.'}</p>${okBtn(sc.over ? '결과 보기' : '다음 세트로')}`; break;
      case 'result':
        cls = sc.checked ? (sc.ok ? 'good' : 'bad') : '';
        h = `${sc.checked ? `<span class="stamp ${sc.ok ? 'ok' : 'no'}">${sc.ok ? '성공' : '실패'} · ${esc(sc.p)}%</span>` : ''}<h2>${esc(sc.title)}</h2><p>${esc(sc.text)}</p>
          <div class="chips">${sc.lines.map(l => `<span class="chip ${/[-]\d|하락/.test(l) ? 'down' : 'up'}">${esc(l)}</span>`).join('')}</div>${okBtn()}`; break;
      case 'month':
        if (U.fxScene && U.fxScene === U.cueKey) { cls += ' fxup'; U.fxScene = ''; }   // OVR 이 오른 달의 첫 그림: 칩이 한 번 커졌다 돌아온다
        h = `<p class="eyebrow">${esc(sc.title)} · ${esc(sc.plan)}</p><h2>${esc(sc.sub)}</h2>${tip('report', sc)}${monthBody(sc)}${okBtn()}`; break;
      case 'info':
        if (sc.cele) cls += ' cele' + (sc.cele === 1 ? ' play' : '');
        h = `${sc.cele ? `<div class="trophy" aria-hidden="true">${sc.cele === 1 ? '<div class="confetti">' + '<i></i>'.repeat(14) + '</div>' : ''}<svg viewBox="0 0 64 64" width="72" height="72"><path d="M18 8h28v14a14 14 0 0 1-28 0z" fill="#ffc857"/><path d="M18 12H8v6a10 10 0 0 0 10 10M46 12h10v6a10 10 0 0 1-10 10" fill="none" stroke="#ffc857" stroke-width="4"/><path d="M28 35h8v9h-8z" fill="#d9a63a"/><path d="M20 44h24v6H20z" fill="#ffc857"/><path d="M16 50h32v6H16z" fill="#d9a63a"/><path d="M24 12h5v12a9 9 0 0 1-5-8z" fill="#ffe7a8"/></svg></div>` : ''}
          ${sc.cele ? `<p class="eyebrow champ">CHAMPIONS</p><h2>${esc(sc.text)}</h2>${sc.news ? `<p class="news"><b>뉴스</b>${esc(sc.news)}</p>` : ''}` : `${sc.news ? `<p class="news"><b>뉴스</b>${esc(sc.news)}</p>` : ''}<h2>${esc(sc.title)}</h2><p>${esc(sc.text)}</p>`}${sc.lines.length ? `<div class="chips">${sc.lines.map(l => `<span class="chip ${sc.tone === 'gold' ? 'gold' : ''}">${esc(l)}</span>`).join('')}</div>` : ''}${okBtn()}`; break;
      case 'season':
        h = `<p class="eyebrow">SEASON ${esc(sc.year)}</p><h2>${esc(sc.year)}년차 결산</h2><p>${esc(sc.org)} ${G.SQUAD[sc.squad]} · ${esc(sc.age)}세 · OVR ${esc(sc.ovr)}</p>
          ${sc.story && sc.story.length ? `<ul class="sstory" aria-label="이 시즌에 있었던 일">${sc.story.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
          <div class="chips"><span class="chip">${sc.g ? `${esc(sc.g)}경기 ${esc(sc.w)}승 · 평균 평점 ${f1(sc.avg)}` : '출전 경기 없음'}</span>${sc.titles.map(t => `<span class="chip gold">${esc(t)}</span>`).join('')}${sc.awards.map(t => `<span class="chip gold">${esc(t)}</span>`).join('')}${sc.mvp ? `<span class="chip">경기 MVP ${esc(sc.mvp)}회</span>` : ''}${!sc.titles.length && !sc.awards.length ? '<span class="chip">무관</span>' : ''}</div>
          ${sc.goal ? `<div class="evres ${sc.goal.ok === 1 ? 'ok' : sc.goal.ok === 0 ? 'no' : ''}"><p class="sec">올해 목표 — ${esc(sc.goal.t)} · ${sc.goal.ok === 1 ? '달성' : sc.goal.ok === 0 ? '미달성' : '판정 없음'}</p><p>${esc(sc.goal.why)}</p></div>` : ''}
          ${sc.goals && sc.goals.length ? `<p class="sec">다음 시즌의 목표를 하나 고른다</p><p class="fine">기록에 남는 다짐이다. 능력치나 승률은 바뀌지 않는다.</p>${sc.next ? `<p class="snext">${esc(sc.next)}</p>` : ''}${sc.goals.map((g, i) => `<button class="choice" data-act="goal" data-i="${esc(i)}"><div class="grow"><b>${esc(g.t)}</b><small>${esc(g.d)}</small></div></button>`).join('')}` : `${sc.next ? `<p class="snext">${esc(sc.next)}</p>` : ''}${okBtn('스토브리그로')}`}`; break;
      case 'cards':
        h = `<p class="eyebrow">OFF-SEASON</p><h2>성장 카드</h2><p>비시즌 동안 무엇을 얻었을까. 한 장을 고른다.</p>
          ${sc.cards.map((id, i) => { const c = D.CARDS.find(x => x.id === id); return `<button class="gcard r${esc(c.r)}" data-act="res" data-i="${esc(i)}"><small>${D.RARITY[c.r]}</small><b>${esc(c.name)}</b><span>${esc(c.desc)}</span></button>`; }).join('')}
          <button class="btn line" data-act="reroll" ${sc.reroll ? '' : 'disabled'}>다시 뽑기 (${esc(sc.reroll)}회 남음)</button>`; break;
      case 'stove':
        h = `<p class="eyebrow">STOVE LEAGUE</p><h2>스토브리그</h2><p>${G.org().name}와의 계약이 ${esc(sc.years)}년 남았다. 연봉 ${money(sc.salary)}.</p>
          <button class="btn" data-act="stay">잔류한다</button><button class="btn ghost" data-act="transfer">이적을 요청한다</button>${sc.canRetire ? retireBtn() : ''}
          <p class="fine">${sc.scouted ? '시즌 중 연락해 온 스카우터가 있다. 이적을 요청하면 1군 제안이 올 가능성이 높다. ' : ''}이적을 요청했다가 잔류하면 감독 신뢰가 떨어진다.</p>`; break;
      case 'offers':
        h = `<p class="eyebrow">CONTRACT</p><h2>계약 제안</h2><p>${esc(sc.msg)}</p>
          ${sc.offers.map((o, i) => `<div class="offer"><div class="row"><div class="grow"><b>${esc(o.name)}</b> <span class="dim">${esc(o.region)}${o.renew ? ' · 재계약' : ''}</span><br><span class="dim">${G.SQUAD[o.squad]} · ${esc(o.years)}년 · 연봉</span> <b>${money(o.salary)}</b></div></div>
            ${offerLines(o)}
            <div class="btns"><button class="btn" data-act="accept" data-i="${esc(i)}">계약</button><button class="btn ghost" data-act="nego" data-i="${esc(i)}" ${o.p == null ? 'disabled' : ''}>${o.p == null ? '협상 불가' : `15% 인상 요구 ${esc(o.p)}%`}</button></div></div>`).join('')}
          ${sc.canStay ? '<button class="btn ghost" data-act="stay">잔류한다</button>' : ''}${S.age >= 20 ? retireBtn() : ''}
          <p class="fine">인상 요구가 실패하면 제안이 철회될 수 있다.</p>`; break;
      case 'tryout':
        cls = 'bad';
        h = `<h2>${sc.vet ? '갈림길' : '무소속'}</h2><p>${esc(sc.text)}</p><button class="choice" data-act="try"><div class="grow"><b>공개 테스트에 지원한다</b><small>${sc.vet ? '합격하면 하위 구단 1군과 1년 계약. 떨어지면 은퇴한다' : sc.retry ? '합격하면 2군 1년 계약. 떨어져도 최하위 구단에서 한 번은 더 기회를 준다' : '합격하면 2군 1년 계약. 떨어지면 그대로 은퇴한다'}</small></div>${pill(sc.p)}</button>${retireBtn()}`; break;
    }
    // 이 버전이 모르는 장면(더 새 버전에서 저장된 것): 빈 창에 가두지 않고 넘어갈 수 있게 한다. 엔진은 모르는 장면을 그냥 닫는다.
    if (!h) h = `<h2>표시할 수 없는 장면</h2><p>이 버전에서는 이 장면을 보여 줄 수 없다. 더 새로운 버전에서 저장된 것일 수 있다. 저장 데이터는 그대로다.</p>${okBtn('넘어간다')}`;
    const still = ARENA[sc.type] && U.arenaShown === skey(sc) ? ' still' : '';   // 같은 시리즈 안에서는 창이 다시 올라오지 않고 내용만 바뀐다
    return `<div class="veil"><section class="sheet ${esc(cls)}${still}" role="dialog" aria-modal="true" aria-label="${esc(sc.title || sc.sub || (ARENA[sc.type] ? `${sc.me} 대 ${sc.opp}` : '선택'))}" tabindex="-1">${h}</section></div>`;
  }

  function vRetire(r) {
    const ax = Object.keys(r.ax), pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / ax.length, d = 20 + v * .8; return [150 + Math.cos(a) * d, 130 + Math.sin(a) * d]; };
    const poly = v => ax.map((k, i) => pt(i, v == null ? r.ax[k] : v).map(n => n.toFixed(1)).join(',')).join(' ');
    return `<section class="page retire">
      <div><p class="eyebrow">CAREER END · ${esc(r.years)}시즌</p><h2>${esc(r.nick)}, 은퇴</h2><p class="dim">${esc(r.reason)}</p></div>
      ${r.news ? `<p class="news"><b>뉴스</b>${esc(r.news)}</p>` : ''}
      <div class="grade"><b>${esc(r.grade)}</b><div><h2>${esc(r.ep)}</h2><p>커리어 점수 ${esc(r.score)}점 · 자동 시뮬레이션 커리어 대비 상위 ${esc(r.pct)}%</p></div></div>
      ${G.hallGet(r.rid) && !G.hallInfo().failed ? '<p class="dim small" role="status">명예의 전당에 기록했다. 새 커리어를 시작해도 이 기록은 남는다.</p>' : '<p class="warn" role="status">명예의 전당에 기록하지 못했다(저장 공간 부족 또는 저장 차단). 아래에서 커리어 카드를 저장해 두면 그림으로는 남는다.</p>'}
      <button class="btn" data-act="endcard">커리어 카드 만들기</button>
      <svg class="radar" viewBox="0 0 300 250" role="img" aria-label="커리어 평가 5개 축">
        ${[100, 66, 33].map(v => `<polygon points="${poly(v)}" fill="none" stroke="#2d3363"/>`).join('')}
        <polygon points="${poly()}" fill="rgba(255,77,109,.35)" stroke="#ff4d6d" stroke-width="2"/>
        ${ax.map((k, i) => { const [x, y] = pt(i, 122); return `<text x="${esc(x)}" y="${esc(y)}" text-anchor="middle" dominant-baseline="middle">${esc(k)} ${Math.round(r.ax[k])}</text>`; }).join('')}
      </svg>
      <div class="kv"><div><span>1군 경기</span><b>${esc(r.g)}</b></div><div><span>승률</span><b>${r.g ? Math.round(r.w / r.g * 100) + '%' : '-'}</b></div><div><span>평균 평점</span><b>${r.g ? f1(r.avg) : '-'}</b></div>
        <div><span>최고 OVR</span><b>${esc(r.peak)}</b></div><div><span>경기 MVP</span><b>${esc(r.mvp)}</b></div><div><span>통산 수입</span><b>${money(r.earn)}</b></div></div>
      <div><p class="sec">트로피·수상</p>${r.titles.length + r.awards.length ? `<div class="chips">${r.titles.map(t => `<span class="chip gold">${esc(t.y)}년차 ${esc(t.name)}</span>`).join('')}${r.awards.map(a => `<span class="chip">${esc(a.y)}년차 ${esc(a.name)}</span>`).join('')}</div>` : '<p class="dim">트로피 없이 커리어를 마쳤다.</p>'}</div>
      <div><p class="sec">거쳐 간 팀</p><p>${r.orgs.map(esc).join(' → ')}</p></div>
      ${r.rivals && r.rivals.length ? `<div><p class="sec">라이벌</p>${r.rivals.map(v => rivalCard(v, `<p class="epi">${esc(v.epilogue)}</p>`)).join('')}</div>` : ''}
      <button class="btn ghost" data-act="endcard">커리어 카드 만들기</button><button class="btn" data-act="again">새 커리어</button><button class="btn line" data-act="hall">기록실 — 명예의 전당 · 도전 과제 · 백업</button></section>`;
  }

  function vGame(S) {
    const sc = G.scene();
    if (S.over && sc) return vRetire(sc);
    const mi = G.month(), tabs = [['home', '플레이'], ['player', '선수'], ['league', '리그'], ['money', '자산'], ['record', '기록']];
    if (!tabs.some(t => t[0] === U.tab)) U.tab = { stats: 'player', career: 'player', shop: 'money' }[U.tab] || 'home';   // 예전 탭 이름
    const body = S.org ? { home: tPlay, player: tStats, league: x => tLeague(x) + rivalCards(), money: tMoney, record: tRecord }[U.tab](S) : '';
    const canRun = S.tut.done, A = G.apInfo(), sheet = !sc && U.apOpen && canRun && !AP.on;   // 처음 안내(첫 3개월) 동안에는 한 달씩만
    const warn = verNote() + (G.saveFailed() ? '<p class="warn" role="alert">방금 진행한 내용을 저장하지 못했다. 브라우저 저장 공간이 가득 찼거나 저장이 막혀 있다. 지금 창을 닫으면 마지막으로 저장된 시점으로 돌아간다. 기록 탭 → 백업 관리에서 백업 파일을 내려받아 두면 안전하다.</p>' : U.notice ? `<p class="warn">${esc(U.notice)}</p>` : '');
    const ctas = AP.on ? `<div class="ctas running"><p id="apline" role="status" aria-live="polite">${esc(apLine(S))}</p><p id="apcash">${esc(AP.cash || `잔고 ${money(S.money)}`)}</p><button class="btn cta pause" data-act="ap-pause">Ⅱ 멈춤<small>자동진행 중 — 누르면 이번 달에서 선다</small></button></div>`
      : `<div class="ctas ${canRun ? 'three' : ''}"><button class="btn cta" data-act="next" ${sc ? 'disabled' : ''}>▶ ${esc(mi.m)}월 진행<small>${esc(mi.label)}</small></button>
      ${canRun ? `<button class="btn cta run" data-act="ap-go" ${sc ? 'disabled' : ''}>▶▶ 자동진행<small>사건 ${AP_STYLE[A.style][0]} · 경기 ${A.match ? '맡김' : '직접'}</small></button><button class="apset" data-act="ap-set" ${sc ? 'disabled' : ''} aria-label="자동진행 설정">설정</button>` : ''}</div>`;
    return `<div class="stagebg" ${sc || sheet ? 'inert aria-hidden="true"' : ''}>${S.org ? header(S) : ''}<main class="content">${warn}${body}</main>
      ${S.org ? `<footer class="foot"><nav class="tabs" role="tablist">${tabs.map(t => `<button role="tab" data-act="tab" data-id="${esc(t[0])}" aria-selected="${U.tab === t[0]}">${esc(t[1])}</button>`).join('')}</nav>${ctas}</footer>` : ''}</div>
      ${sc ? vScene(sc, S) : sheet ? vApSheet() : ''}`;
  }

  /* ---------- 자동진행(0.11.2) ----------
     한 번 누르면 달마다 G.autoMonth() 를 짧은 예약 작업으로 이어 부른다(화면을 막지 않는다). 멈춤, 화면이 가려짐, 다른 화면으로 이동,
     장면이 열림, 다른 탭의 저장 변경, 오류가 생기면 바로 선다. 무엇을 대신 고르는지는 엔진의 정책표가 정한다. 화면은 순서만 잡는다. */
  const AP = { on: false, t: 0, n: 0 };
  function apStart() {
    const S = G.state();
    if (AP.on || !S || S.over || U.view !== 'game' || G.inDemo() || G.scene() || !S.tut.done) return;
    if (!G.autoStart()) { checkStale(); return render(); }
    AP.on = true; AP.n = 0; AP.m0 = S.money; AP.cash = `잔고 ${money(S.money)}`; U.recMore = false; U.apOpen = false; U.repOpen = false; U.auOpen = false; U.logOpen = false; U.tab = 'home'; SND.play('tap'); render(); apKick();
  }
  function apKick() { clearTimeout(AP.t); AP.t = setTimeout(apTick, window.__pgApMs != null ? window.__pgApMs : G.apInfo().spd === 'fast' ? 40 : 260); }
  function apStop(why) { if (!AP.on) return; AP.on = false; clearTimeout(AP.t); AP.t = 0; G.autoStop(why); render(); }
  function apTick() {
    AP.t = 0; if (!AP.on) return;
    if (document.hidden) return apStop('hidden');
    if (U.view !== 'game' || U.tab !== 'home' || !G.state() || U.stale) return apStop('leave');
    let r; const q0 = G.cash().seq;
    try { r = G.autoMonth(); } catch (err) { window.__pgApError = String(err && err.message || err); AP.on = false; G.autoStop('error'); return render(); }
    AP.n += r.k;
    if (r.stop) { AP.on = false; if (r.stop === 'tab') checkStale(); return render(); }
    if (AP.n >= D.BAL.ap.max) return apStop('max');
    // 달마다 화면 전체를 다시 그리지 않는다: 진행 줄과 위쪽 숫자만 바꾼다
    const S = G.state(), el = document.getElementById('apline'), ec = document.getElementById('apcash'), hb = document.getElementById('hbox'), gb = document.getElementById('gbox'), pb = document.getElementById('pbox'), ov = app.querySelector('.lower .ovr b');
    AP.cash = cashMonth(G.cash().all.filter(x => x.seq > q0), S);
    if (!el || !ec || !hb || !gb || !pb || app.querySelectorAll('#hbox, #gbox, #pbox, .stagebg .moneyrow, .stagebg .hstat, .stagebg .goal, .stagebg .plan5').length !== 7 || app.querySelectorAll('.stagebg .rvcard').length > 1 || app.querySelectorAll('#fbox, .stagebg .recap').length > 1) render();   // 하나라도 없거나 여럿이면 통째로 다시 그린다
    else {
      el.textContent = apLine(S); ec.textContent = AP.cash; hb.innerHTML = hstatIn(S); if (ov) ov.textContent = Math.floor(G.ovr());
      const gh = goalIn(); if (gh !== GOAL_HTML) { GOAL_HTML = gh; gb.innerHTML = gh; }   // 목표의 진척: 글이 달라진 달에만 안쪽을 바꾼다
      // 이번 달 할 일(0.11.8): 엔진이 자동 휴식으로 바꿨거나 되돌린 달에만 안쪽을 바꾼다. 그 밖의 달에는 버튼을 건드리지 않는다
      const ph = planIn(S); if (ph !== PLAN_HTML) { PLAN_HTML = ph; pb.innerHTML = ph; }
      // 최근 진행(0.11.10): 하나뿐인 칸의 안쪽을 새 결과로 바꾼다. 칸이 아직 없으면(첫 달) 본문 맨 끝에 하나 만든다
      const fh = feedIn(), fb = document.getElementById('fbox');
      if (fh !== FEED_HTML) { FEED_HTML = fh; if (fb && fh) fb.innerHTML = fh; else if (fb) fb.remove(); else if (fh) app.querySelector('main.content').insertAdjacentHTML('beforeend', `<section class="recap feed" id="fbox" aria-label="최근 진행">${fh}</section>`); }
      // 이번 달 라이벌전: 대진이 달라진 달에만 줄을 넣거나 빼거나 바꾼다(할 일 바로 다음 자리)
      const rh = rivalLine(); if (rh !== RV_HTML) { RV_HTML = rh; const old = app.querySelector('.stagebg .rvcard'); if (old) old.remove(); if (rh) pb.insertAdjacentHTML('afterend', rh); }
    }
    apKick();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) apStop('hidden'); });
  window.addEventListener('pagehide', () => apStop('hidden'));

  // 화면을 그리다 오류가 나면(손상된 저장의 장면 등) 멈춘 화면에 가두지 않고 타이틀로 돌려보낸다. 저장 데이터는 건드리지 않는다.
  function render() {
    try { paint(); } catch (err) {
      window.__pgRenderError = String(err && err.message || err);
      if (window.console && console.error) console.error(err);
      if (U.view === 'title') return;
      U.view = 'title'; U.dlg = null; U.notice = '이 데이터는 화면에 표시할 수 없어 타이틀로 돌아왔다. 저장 데이터는 지우지 않았다. 기록실의 백업에서 복원하거나 새 커리어를 시작할 수 있다.';
      try { paint(); } catch (e2) {}
    }
  }
  function paint() {
    let S = G.state();
    // 체험전은 경기 장면이 이어지는 동안만 유지한다. 그 밖의 화면으로 넘어가면 끝내고 원래 상태로 돌아온다.
    if (G.inDemo() && !(U.view === 'game' && S && G.scene() && ARENA[G.scene().type])) { endDemo('체험전이 끝났다. 이 경기는 기록에 남지 않았다. 마음에 들었다면 새 커리어에서 진짜 시즌을 시작해 보자.'); S = G.state(); }
    const y = window.scrollY;
    if (U.view === 'game' && !S) U.view = 'title';
    arenaSync(U.view === 'game' && S ? G.scene() : null);
    sceneCue(S, U.view === 'game' && S ? G.scene() : null);
    // 키보드 사용자를 위해, 다시 그린 뒤에도 방금 누른 버튼에 포커스를 돌려준다.
    const a = document.activeElement, fk = a && app.contains(a) && a.dataset && a.dataset.act ? [a.dataset.act, a.dataset.id || '', a.dataset.i || '', a.dataset.grp || ''] : (a && a.id === 'nick' ? 'nick' : null);
    const prevScene = U.sceneKey;
    if (U.view === 'card' && !U.card) U.view = 'hall';
    app.innerHTML = U.view === 'title' ? vTitle() : U.view === 'create' ? vCreate() : U.view === 'hall' ? vVault() : U.view === 'rec' ? vRec() : U.view === 'compare' ? vCompare() : U.view === 'card' ? vCard() : vGame(S);
    if (U.stale) { app.querySelectorAll('.veil').forEach(v => v.remove()); app.insertAdjacentHTML('beforeend', vStale()); }
    drawAvatars();
    const sheet = app.querySelector('.sheet'), sc = U.view === 'game' && S ? G.scene() : null;
    U.sceneKey = sheet ? (sc ? [sc.type, sc.title || '', sc.sub || '', sc.ev || '', sc.mid || '', sc.set || '', ARENA[sc.type] ? skey(sc) + (U.watch ? 'w' : '') : ''].join('|') : 'dlg') : '';
    U.arenaShown = sc && ARENA[sc.type] && sheet ? skey(sc) : '';
    document.body.classList.toggle('modal', !!sheet);      // 장면이 열려 있는 동안 뒤 화면이 따라 움직이지 않게
    window.scrollTo(0, y);
    let target = null;
    if (fk === 'nick') target = document.getElementById('nick');
    else if (fk && U.sceneKey === prevScene) target = [...app.querySelectorAll(`[data-act="${fk[0]}"]`)].find(e => (e.dataset.id || '') === fk[1] && (e.dataset.i || '') === fk[2] && (e.dataset.grp || '') === fk[3] && !e.disabled && !e.closest('[inert]'));
    if (!target && sheet && U.sceneKey !== prevScene) target = sheet;       // 새 장면이 열리면 대화상자로 포커스를 옮긴다
    if (U.focusNext) { const el = app.querySelector(U.focusNext); U.focusNext = ''; if (el) { if (!el.matches('button, input, a')) el.setAttribute('tabindex', '-1'); target = el; } }
    if (target) try { target.focus({ preventScroll: true }); } catch (e) {}
    // 홈의 안내가 화면 밖(또는 하단 바 뒤)에 있으면 안내마다 한 번만 보이는 곳으로 옮긴다.
    const tp = app.querySelector('.stagebg:not([inert]) .tip'), foot = app.querySelector('.foot');
    if (tp && U.tipShown !== tp.id) {
      U.tipShown = tp.id;
      const r = tp.getBoundingClientRect(), lim = foot ? foot.getBoundingClientRect().top + 18 : window.innerHeight;
      if (r.top < 0 || r.bottom > lim) tp.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
    if (sc && sc.cele === 1) G.celePlayed();               // 우승 연출은 한 번만. 다시 열면 같은 내용이 연출 없이 나온다
    if (U.moved) { const mv = U.moved; U.moved = null; toastMove(mv[0], mv[1]); } else toastAch();
  }
  // 도전 과제 달성 알림: 화면 위쪽에 잠깐 뜨는 한 줄. 진행을 막지 않는다.
  let toastEl = null, toastTimer = 0;
  function toastAch() {
    if (G.inDemo()) return;   // 체험전의 달성은 실제 기록이 아니다
    const ids = G.achFresh(); if (!ids.length) return;
    if (app.querySelector('.veil')) return;   // 창이 열려 있으면 창의 윗부분을 가리므로, 창이 닫힌 다음에 알린다
    G.achSeen();
    const names = ids.map(id => (D.ACH.find(a => a.id === id) || {}).name).filter(Boolean); if (!names.length) return;
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.id = 'toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite'); document.body.appendChild(toastEl); toastEl.addEventListener('click', () => toastEl.classList.remove('on')); }
    toastEl.textContent = '도전 과제 달성 — ' + names.slice(0, 3).join(', ') + (names.length > 3 ? ` 외 ${names.length - 3}개` : '');
    toastEl.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('on'), 5000);
  }
  // 이적이 확정된 순간(0.11.11): 위쪽 알림 한 줄(3초, 누르면 닫힘)과 짧은 소리. 확인 버튼은 없다.
  function toastMove(name, squad) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.id = 'toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite'); document.body.appendChild(toastEl); toastEl.addEventListener('click', () => toastEl.classList.remove('on')); }
    toastEl.textContent = `이적 확정 — ${name} ${squad}`;
    toastEl.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('on'), 3000);
  }
  function readImport(file) {
    if (!file) return;
    if (file.size > G.BACKUP_MAX) { U.imp = { err: 'big' }; return render(); }
    const fr = new FileReader();
    fr.onerror = () => { U.imp = { err: 'read' }; render(); };
    fr.onload = () => { const res = G.importCheck(String(fr.result || '')); U.imp = res.ok ? { res } : { err: res.err }; render(); };
    fr.readAsText(file);
  }
  function go(v) { U.view = v; U.confirm = ''; U.dlg = null; if (v !== 'game' && v !== 'title' && v !== 'create' && !U.focusNext) U.focusNext = '.page h2'; render(); window.scrollTo(0, 0); }

  // 다른 탭이 저장을 바꾸면 바로 알린다. storage 이벤트는 다른 탭에서 쓴 경우에만 온다. 놓쳤을 때를 위해 탭으로 돌아올 때와 누를 때도 확인한다.
  window.addEventListener('storage', e => { if (e.key === null || e.key === 'pg_career_v1') checkStale(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkStale(); });
  window.addEventListener('pageshow', () => checkStale());
  document.addEventListener('visibilitychange', () => { if (document.hidden) SND.quiet(); else if (SND.state() !== 'none') SND.unlock(); });   // 숨겨진 탭에서는 소리를 멈춘다
  document.addEventListener('pointerdown', () => SND.unlock(), { passive: true });
  try { if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('controllerchange', checkVersion); } catch (e) {}
  app.addEventListener('input', e => { if (e.target.id === 'nick') U.C.nick = e.target.value; });
  app.addEventListener('change', e => { if (e.target.id === 'impfile') { readImport(e.target.files && e.target.files[0]); e.target.value = ''; } });
  const DEMO_OK = new Set(['res', 'ok', 'mom-auto', 'tac', 'kick', 'wfast', 'wskip', 'snd', 'demoend', 'reload']);
  const TAP_GUARD = new Set(['proj', 'kick', 'demo', 'wskip', 'ap-go', 'ap-start', 'next', 'ok', 'res', 'goal', 'mom-auto', 'reroll', 'stay', 'transfer', 'try', 'accept', 'nego', 'retire', 'wipe', 'create', 'again', 'start', 'del', 'impok', 'tutnext', 'tutskip']);
  app.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    const a = b.dataset.act, id = b.dataset.id, i = +b.dataset.i;
    SND.unlock();   // 사용자의 입력 뒤에만 오디오를 켠다
    if (a === 'reload') { window.location.reload(); return; }
    if (AP.on) { apStop('pause'); if (!['tab', 'plan', 'goalopen'].includes(a)) return; }   // 자동진행 중에는 어떤 입력이든 먼저 멈춘다. 탭 이동, 이번 달 할 일 바꾸기, 목표 펼치기는 멈춘 뒤 그대로 처리한다(한 번 누르면 된다. 0.11.7)
    if (checkStale()) return;
    // 두 번 눌림 방지: 진행·선택·확정 버튼은 직전 입력 뒤 잠깐 동안 다시 받지 않는다.
    // 화면이 바뀌면서 같은 자리에 다른 버튼이 오면, 연달아 누른 두 번째 입력이 엉뚱한 선택이 되기 때문이다.
    if (G.inDemo() && !DEMO_OK.has(a)) return;   // 체험전 중에는 경기 장면의 조작만 받는다
    if (TAP_GUARD.has(a)) { const now = Date.now(), ms = window.__pgTapGuard != null ? window.__pgTapGuard : 320; if (now - (U.lastTap || 0) < ms) return; U.lastTap = now; }
    const live = a === 'create' && U.view === 'title' && G.saveInfo() && !G.saveInfo().over;
    if (live && U.confirm !== 'new') { U.confirm = 'new'; return render(); }
    if (a !== 'retire' && a !== 'wipe') U.confirm = '';
    if (a !== 'continue') U.notice = '';
    if (a !== 'undo') U.vmsg = '';
    const sc0 = U.view === 'game' && G.state() ? G.scene() : null, t0 = sc0 ? sc0.type : '';
    switch (a) {
      case 'snd': SND.set(!SND.on()); SND.play('tap'); return render();
      case 'tac': U.tac = TAC(id) ? id : ''; SND.play('tap'); return render();
      case 'kick': if (t0 !== 'prematch' || (id !== 'none' && !U.tac)) return; G.resolve(id === 'none' ? '' : U.tac); SND.play('start'); U.tac = ''; break;
      case 'wfast': if (U.watch) { U.watch.fast = !U.watch.fast; clearTimeout(U.watch.t); U.watch.t = setTimeout(tickWatch, 200); } return render();
      case 'wskip': if (U.watch && sc0) return endWatch(sc0); return;
      case 'demo': {
        if (!G.demoStart((Date.now() % 1000000007) + 1)) { U.notice = '체험전을 준비하지 못했다. 잠시 뒤 다시 눌러 보자. 진행 중인 커리어와 기록은 그대로다.'; return render(); }
        U.view = 'game'; U.tab = 'home'; U.confirm = ''; SND.play('tap'); render(); window.scrollTo(0, 0); return;
      }
      case 'demoend': endDemo('체험전을 끝냈다. 이 경기는 기록에 남지 않았다.'); return render();
      case 'create': U.C.step = 1; return go('create');
      case 'title': return go('title');
      case 'hall': U.vfrom = U.view === 'game' ? 'game' : 'title'; U.vt = 'hall'; U.imp = null; U.undo = ''; return go('hall');
      case 'vault': U.vfrom = 'game'; U.vt = id; U.imp = null; U.undo = ''; return go('hall');
      case 'vt': U.vt = id; U.imp = null; U.expmsg = ''; break;
      case 'sort': U.sort = id; break;
      case 'rec': U.rec = id; return go('rec');
      case 'cmp': U.cmp = U.cmp.includes(id) ? U.cmp.filter(x => x !== id) : U.cmp.concat([id]).slice(-2); break;
      case 'compare': return go('compare');
      case 'back': {
        if (U.view === 'card') return go(U.card && U.card.from === 'game' ? 'game' : 'rec');
        if (U.view === 'rec' || U.view === 'compare') return go('hall');
        return go(U.vfrom === 'game' && G.state() ? 'game' : 'title');
      }
      case 'askdel': U.dlg = { id }; break;
      case 'canceldlg': U.dlg = null; break;
      case 'del': {
        const ok = G.hallDel(id); U.dlg = null; U.cmp = U.cmp.filter(x => x !== id);
        if (ok) { U.undo = id; U.focusNext = '[data-act=undo]'; return go('hall'); }
        U.vmsg = '기록을 지우지 못했다(저장 실패). 기록은 그대로 있다.'; return go('hall');
      }
      case 'undo': { const ok = G.hallUndo(id); U.undo = ''; U.vmsg = ok ? '기록을 되돌렸다.' : '되돌리지 못했다.'; break; }
      case 'endcard': { const r = G.endRec(); if (r) return openCard(r, 'game'); break; }
      case 'card': { const r = G.hallGet(id); if (r) return openCard(r, 'rec'); break; }
      case 'cardretry': makeCard(); break;
      case 'cardsave': {
        const c = U.card; if (!c || !c.blob) break;
        try { download(c.blob, `progamer-career-${fileNick(c.rec.nick)}.png`); c.msg = 'PNG 저장을 시작했다. 브라우저의 다운로드 폴더에 들어왔는지 확인한다. 저장 창을 닫았거나 파일이 보이지 않으면 다시 누르거나, 그림을 길게 눌러 저장한다.'; }
        catch (err) { c.msg = '이 브라우저에서는 파일 저장을 시작하지 못했다. 위 그림을 길게 눌러 "이미지 저장"을 고르면 된다.'; }
        break;
      }
      case 'cardshare': {
        const c = U.card; if (!c || !c.file) break;
        // 공유 창은 누른 순간에 바로 열어야 한다. 취소하거나 실패해도 게임에는 영향이 없다.
        let pr; try { pr = navigator.share({ files: [c.file], title: '프로게이머 키우기', text: `${c.rec.nick} — ${c.rec.grade || ''} ${c.rec.ep || ''} (커리어 점수 ${c.rec.score}점)` }); } catch (err) { pr = Promise.reject(err); }
        Promise.resolve(pr).then(() => { c.msg = '공유 창으로 넘겼다.'; }, err => { c.msg = err && err.name === 'AbortError' ? '공유를 취소했다.' : '공유 창을 열지 못했다. "PNG 저장"으로 내려받아 직접 올려 달라. 게임에는 영향이 없다.'; }).then(() => { if (U.card === c && U.view === 'card') render(); });
        return;
      }
      case 'export': {
        try {
          const d = new Date(), p = n => String(n).padStart(2, '0');
          download(new Blob([JSON.stringify(G.exportData())], { type: 'application/json' }), `progamer-career-backup-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`);
          U.expmsg = '백업 파일 내려받기를 시작했다. 브라우저의 다운로드 폴더에 파일이 들어왔는지 꼭 확인한 뒤, 잃어버리지 않을 곳에 보관한다.';
        } catch (err) { U.expmsg = '이 브라우저에서는 백업 파일 내려받기를 시작하지 못했다. 다른 브라우저(크롬, 사파리, 삼성 인터넷)로 열어 다시 시도해 달라. 게임 데이터는 그대로다.'; }
        break;
      }
      case 'impcancel': U.imp = null; break;
      case 'impok': {
        if (!U.imp || !U.imp.res) break;
        const ok = G.importApply(U.imp.res.data);
        if (!ok) { U.imp = { err: 'apply' }; break; }
        U.imp = null; U.cmp = []; U.rec = ''; U.undo = ''; U.card = null; go('title'); U.notice = '백업을 복원했다. 이어하기로 복원된 커리어를 연다.'; return render();
      }
      case 'continue': {
        const r = G.load();
        if (r === 'backup') U.notice = '저장 데이터가 손상되어 이번 시즌 시작 시점으로 되돌렸다.';
        if (r) { U.view = 'game'; U.tab = 'home'; render(); window.scrollTo(0, 0); } else { U.notice = '저장 데이터를 열 수 없다. 데이터는 지우지 않았다. 내려받아 둔 백업 파일이 있으면 기록실 → 백업에서 복원할 수 있다.'; render(); }
        return;
      }
      case 'pick': U.C[b.dataset.grp] = id; break;
      case 'cstep': U.C.step = id === '2' ? 2 : 1; render(); return window.scrollTo(0, 0);
      case 'lookrand': U.C.look = randLook(); SND.play('tap'); break;
      case 'look': { const L = [...U.C.look]; L[i] = String((+L[i] + 1) % LOOKS[i][1].length); U.C.look = L.join(''); break; }
      case 'start': G.newGame({ nick: U.C.nick.trim() || 'Rookie', region: U.C.region, role: U.C.role, trait: U.C.trait, look: U.C.look }); U.tab = 'home'; U.C.step = 1; U.C.look = ''; return go('game');
      case 'again': G.wipe(); return go('create');
      case 'tab': {   // 탭 이동. data-to 가 있으면 그 탭의 해당 구역으로 간다(홈의 라이벌 줄 → 리그 탭의 라이벌)
        U.tab = id; U.apOpen = false; render();
        const to = b.dataset.to && document.getElementById(b.dataset.to);
        if (to) { to.scrollIntoView({ block: 'start' }); try { to.focus({ preventScroll: true }); } catch (err) {} } else window.scrollTo(0, 0);
        return;
      }
      case 'plan': G.setPlan(id); SND.play('tap'); break;
      case 'goalopen': U.goalOpen = !U.goalOpen; break;
      case 'cashopen': U.cashOpen = !U.cashOpen; break;
      case 'projopen': U.projOpen = !U.projOpen; break;
      case 'proj': if (G.buyProj(id)) U.projOpen = true; break;
      case 'recmore': U.recMore = !U.recMore; break;

      case 'auopen': U.auOpen = !U.auOpen; break;
      case 'logopen': U.logOpen = !U.logOpen; break;
      case 'repopen': U.repOpen = !U.repOpen; break;
      case 'shop-auto': { const it = G.autoInfo().items.find(x => x.id === id); if (it) { G.setAuto(id, !it.on); SND.play('tap'); } break; }
      case 'alim': { const a = G.autoInfo(), list = id === 'keep' ? a.keeps : a.caps, cur = id === 'keep' ? a.keep : a.cap; G.setAutoLimit(id, list[(list.indexOf(cur) + 1) % list.length]); break; }
      case 'goal': if (t0 !== 'season') return; G.resolve({ goal: i }); break;   // 시즌 결산의 확인 자리에서 다음 시즌 목표를 고른다
      case 'buy': G.buy(id); break;
      case 'shop-info': U.shopInfo = U.shopInfo === id ? '' : id; break;
      case 'shopgrp': U.shopOpen = !U.shopOpen; break;
      case 'fast': G.setFast(!G.state().opt.fast); break;
      case 'tutnext': {
        G.tutNext(id); break;
      }
      case 'tutskip': G.tutSkip(); break;
      case 'tutreplay': G.tutReplay(); U.tab = 'home'; render(); return window.scrollTo(0, 0);
      case 'next': if (sc0) return; U.repOpen = false; U.auOpen = false; U.recMore = false; AP.m0 = null; G.advance(1); break;
      case 'ap-go': if (sc0 || !G.state().tut.done) return; if (G.apInfo().seen) return apStart(); U.apOpen = true; break;   // 처음에는 무엇을 맡기는지 먼저 보여 준다
      case 'ap-set': if (sc0 || !G.state().tut.done) return; U.apOpen = true; break;
      case 'ap-close': U.apOpen = false; break;
      case 'ap-start': if (sc0) return; return apStart();
      case 'ap-pause': break;   // 진행 중의 입력은 위에서 이미 멈춤으로 처리했다
      case 'ap-style': G.setAp('style', id); break;
      case 'ap-rest': G.setAp('rest', !G.apInfo().rest); break;
      case 'ap-match': G.setAp('match', !G.apInfo().match); break;
      case 'ap-spd': G.setAp('spd', id); break;
      case 'ok': G.resolve(); break;
      case 'res': G.resolve(i); break;
      case 'reroll': G.resolve('reroll'); break;
      case 'mom-auto': if (t0 !== 'moment') return; G.resolve('auto'); break;
      case 'stay': G.resolve('stay'); break;
      case 'transfer': G.resolve('transfer'); break;
      case 'try': G.resolve('try'); break;
      case 'accept': case 'nego': { const o0 = G.state().org; G.resolve({ i, act: a }); const s1 = G.state(); if (s1 && o0 && s1.org !== o0 && D.ORG[s1.org]) { SND.play('move'); U.moved = [D.ORG[s1.org].name, G.SQUAD[s1.squad] || '']; } break; }
      case 'retire': if (U.confirm === 'retire') { U.confirm = ''; G.resolve('retire'); } else U.confirm = 'retire'; break;
      case 'wipe': if (U.confirm === 'wipe') { G.wipe(); return go('title'); } U.confirm = 'wipe'; break;
    }
    // 장면을 닫은 뒤 평범한 월간 보고가 이어지면 창으로 띄우지 않고 플레이 화면의 요약으로 넘긴다(불러온 직후의 장면은 그대로 둔다)
    if (sc0 && U.view === 'game' && G.state() && !G.inDemo() && G.scene() !== sc0) G.settle();
    // 승부처를 고른 직후: 판정이 끝난 결과 장면에 맞춰 소리를 낸다(성공·실패는 엔진이 정한 값을 읽을 뿐이다).
    if (t0 === 'moment') {
      const r = G.state() ? G.scene() : null;
      if (r && r.type === 'mresult') {
        SND.play(r.ok ? 'ok' : 'fail');
        // 이 선택으로 시리즈가 끝났으면 승부처 결과 창을 따로 띄우지 않고, 그 내용을 경기 결과 화면 맨 위에 붙여 한 번에 보여 준다(확인 한 번 줄임).
        if (r.over && r.pips != null) { U.lastM = { k: skey(r), title: r.title, text: r.text, ok: r.ok, p: r.p, choice: (r.auto ? '자동 선택(감독 판단): ' : '') + r.choice, setWin: r.setWin, set: r.set, d: r.d || 0 }; G.resolve(); if (!G.inDemo()) G.settle(); }
      }
    }
    render();
  });

  window.PG_UI = { render, state: U, snd: SND, ap: AP };   // 자동 화면 검사(test/browser)에서 쓴다
  render();
})();
