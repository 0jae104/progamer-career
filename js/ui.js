/* 프로게이머 키우기 — 화면 */
(function () {
  const UI_VERSION = '0.10.0';
  const VER = window.PG_VER = window.PG_VER || {}; VER.ui = UI_VERSION;
  // 스크립트 버전이 서로 다르면(업데이트 도중 파일이 섞임) 게임을 시작하지 않는다. 안내는 index.html 의 확인 스크립트가 띄운다.
  if (!window.PG || !window.PG_CARD || VER.data !== UI_VERSION || VER.engine !== UI_VERSION || VER.card !== UI_VERSION) return;
  const G = window.PG, D = G.D, CARD = window.PG_CARD, app = document.getElementById('app');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const U = { view: 'title', tab: 'home', C: { nick: '', region: 'kr', role: 'core', trait: 'genius' }, confirm: '', notice: '', vt: 'hall', vfrom: 'title', sort: 'score', cmp: [], rec: '', dlg: null, undo: '', vmsg: '', card: null, imp: null };
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
      sprite(x, 0, 0, 1, cv.dataset.seed || 'x', cv.dataset.color);
    });
  }
  // 도트 아바타 한 장. px: 점 하나의 크기(커리어 카드에서는 크게 그린다)
  function sprite(x, ox, oy, px, seed, color) {
    const h = hash(seed);
    const pal = { h: HAIR[h % HAIR.length], s: SKIN[(h >> 3) % SKIN.length], e: '#0e1126', k: '#62e4ff', m: '#62e4ff', j: color || '#ff4d6d', d: 'rgba(14,17,38,.45)' };
    const dot = (i, y, w) => x.fillRect(ox + i * px, oy + y * px, (w || 1) * px, px);
    SPRITE.forEach((row, y) => [...row].forEach((ch, i) => {
      if (ch === '.') return;
      if (ch === 'd') { x.fillStyle = pal.j; dot(i, y); }
      x.fillStyle = pal[ch]; dot(i, y);
    }));
    if ((h >> 5) % 2) { x.fillStyle = pal.h; dot(5, 3, 2); }
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
        ${sv ? `<button class="btn cta" data-act="continue">${sv.over ? '지난 커리어 결과 보기' : '이어하기'}<small>${esc(sv.nick)} · ${sv.started ? `${esc(sv.year)}년차 ${esc(sv.age)}세` : '입단 구단 선택 중'}</small></button>` : ''}
        <button class="btn ${sv ? 'ghost' : ''}" data-act="create">${live && U.confirm === 'new' ? '한 번 더 누르면 진행 중인 커리어가 삭제된다' : '새 커리어'}</button>
        <button class="btn line two" data-act="hall">기록실<small>명예의 전당 · 도전 과제 · 백업</small></button>
      </div>
      ${U.notice ? `<p class="warn">${esc(U.notice)}</p>` : ''}
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
      <span class="rinfo"><em>주요 능력치</em>${roleKeys(r).map(([st, w]) => `${esc(st.name)} ${Math.round(w * 100)}%`).join(' · ')}</span>` : ''}</button>`;
  }
  function vCreate() {
    return `<section class="page">
      <div><p class="eyebrow">NEW CAREER</p><h2>선수 등록</h2></div>
      <div class="field"><label for="nick">선수 아이디 (최대 10자)</label><input id="nick" maxlength="10" autocomplete="off" placeholder="예: Haneul" value="${esc(U.C.nick)}"></div>
      <div class="field"><span class="lab">국적 — 처음 뛸 리그와 대표팀이 정해진다</span><div class="opts c2">${D.REGIONS.map(r => opt('region', r.id, r.name, r.lgName)).join('')}</div></div>
      <div class="field"><span class="lab">포지션 — 고른 자리의 장점과 주의점이 아래에 펼쳐진다</span><div class="opts">${D.ROLES.map(roleOpt).join('')}</div></div>
      <div class="field"><span class="lab">성향</span><div class="opts">${D.TRAITS.map(t => opt('trait', t.id, t.name, t.desc)).join('')}</div></div>
      <button class="btn" data-act="start">입단 테스트 보러 가기</button>
      <button class="btn line" data-act="title">돌아가기</button>
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
      CARD.draw(cv, c.rec, { avatar: (x, ox, oy, px, seed) => sprite(x, ox, oy, px, seed) });
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
  function header(S) {
    const o = G.org(), st = S.squad === 'trainee' ? '연습생' : `${G.SQUAD[S.squad]} ${S.injury ? '부상' : G.isStarter() ? '주전' : '벤치'}`;
    return `<header class="lower" style="--team:${esc(o.color)}">
      <canvas class="av" data-seed="${esc(S.nick)}" data-color="${esc(o.color)}"></canvas>
      <div class="who"><b class="${[...S.nick].length > 6 ? 'long' : ''}">${esc(S.nick)}</b><span>${G.role().name} · ${esc(o.name)} ${esc(st)} · ${esc(S.age)}세</span></div>
      <div class="ovr"><b>${Math.floor(G.ovr())}</b><span>OVR</span></div></header>
      <div class="meters">${meter('컨디션', S.cond)}${meter('손목', S.wrist)}${meter(S.squad === 'trainee' ? '코치 평가' : '감독 신뢰', S.trust)}${meter('인기', S.fame, 'gold')}</div>`;
  }
  function tHome(S) {
    const mi = G.month(), c = S.contract;
    return `<div class="now" aria-live="polite"><div><p class="eyebrow">${esc(S.year)}년차 · ${esc(mi.m)}월</p><h2>${esc(mi.label)}</h2></div><p>${hint(S, mi)}</p></div>
      <div class="kv"><div><span>자금</span><b>${money(S.money)}</b></div><div><span>연봉</span><b>${money(c.salary)}</b></div><div><span>계약</span><b>${esc(c.years)}년 남음</b></div></div>
      ${(() => { const fx = G.rivalFixtures(); return fx.length ? `<p class="rvnote">이번 달 라이벌전 · ${fx.map(f => `${esc(f.nick)}의 ${esc(f.org)} (통산 ${esc(f.w)}승 ${esc(f.l)}패)`).join(', ')}</p>` : ''; })()}
      ${goalCard()}
      <div><p class="sec">이번 달 계획</p>${tip('plan')}${D.PLANS.map(p => `<button class="plan" data-act="plan" data-id="${esc(p.id)}" aria-pressed="${S.plan === p.id}"><i></i><div><b>${esc(p.name)}</b><span>${esc(p.desc)}</span></div></button>`).join('')}</div>
      <div><p class="sec">소식</p><ul class="log">${S.log.slice(0, 12).map(l => `<li class="${esc(l.tone)}"><time>${esc(l.y)}년차 ${esc(l.m)}월</time><span>${esc(l.msg)}</span></li>`).join('') || '<li class="dim">아직 소식이 없다.</li>'}</ul></div>`;
  }
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
  function goalCard() {
    const g = G.goal();
    return `<div class="goal"><p class="sec">다음 목표 · ${esc(g.title)}</p>${tip('goal')}
      ${g.items.map(i => `<div class="gi ${i.ok ? 'ok' : ''}"><span>${esc(i.label)}</span><div class="bar"><i style="width:${i.low ? (i.ok ? 100 : 40) : Math.max(4, Math.min(100, Math.round(i.cur / i.need * 100)))}%"></i></div><b>${esc(i.cur)}${i.low ? '위' : ''} <em>/ ${esc(i.need)}${i.low ? '위 안' : ''}</em></b></div>`).join('')}
      <p class="fine">${esc(g.note)}</p></div>`;
  }
  function hint(S, mi) {
    if (S.injury) return `부상 재활 ${esc(S.injury)}개월 남음`;
    if (S.squad === 'trainee') return '평가를 쌓아 2군 콜업을 노린다';
    if (mi.type === 'league') return G.isStarter() ? '주전으로 출전한다' : '벤치. 신뢰를 쌓아야 한다';
    if (mi.type === 'off') return '시즌 결산과 계약';
    return mi.type === 'nations' && S.year % 2 ? '리그 휴식기' : '진출 팀만 출전한다';
  }
  function tStats(S) {
    const perks = D.CARDS.filter(c => c.perk && S.perks.includes(c.perk));
    return `<div><p class="sec">능력치 <span class="chip">오른쪽 글자는 잠재력</span></p>
      ${D.STATS.map(s => `<div class="stat"><span class="nm">${esc(s.name)}</span><div class="bar"><i style="width:${Math.floor(S.stats[s.id])}%"></i></div><span class="v">${Math.floor(S.stats[s.id])}</span><span class="pot ${G.pot(s.id)}">${G.pot(s.id)}</span><small>${esc(s.tip)} · 포지션 비중 ${Math.round(G.role().w[s.id] * 100)}%</small></div>`).join('')}</div>
      ${(() => { const r = G.role(); return `<div class="card guide"><b>${esc(r.name)} 가이드</b><br><span class="dim">${esc(r.easy)}</span>
        <ul class="oinfo"><li>OVR에 크게 들어가는 능력치: ${roleKeys(r).map(([st, w]) => `${esc(st.name)} ${Math.round(w * 100)}% (지금 ${Math.floor(S.stats[st.id])})`).join(' · ')}</li>
        <li>이 포지션의 OVR을 빨리 올리는 계획: ${rolePlans(r).map(p => esc(p.name)).join(', ')}</li><li>주의: ${esc(r.care)}</li></ul></div>`; })()}
      ${rivalCards()}
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
    return `<div><p class="sec">라이벌</p>${rs.length ? rs.map(r => rivalCard(r)).join('') : '<p class="dim">아직 의식하는 상대가 없다. 1군에서 뛰다 보면 눈에 밟히는 이름이 생긴다.</p>'}
      ${rs.length ? '<p class="fine">상대 전적은 내가 출전한 공식전에서 라이벌이 상대 팀 로스터에 있을 때만 쌓인다. 스크림과 연습은 들어가지 않는다.</p>' : ''}</div>`;
  }
  function tLeague(S) {
    const t = G.table(), y = S.yr, r = G.region();
    const tb = t.length ? `<p class="sec">${esc(r.lgName)}${S.lg.tier === 'second' ? ' 넥스트(2군)' : ''} · ${S.lg.split === 'spring' ? '스프링' : '서머'}</p>
      <table><tr><th>순위</th><th class="l">팀</th><th>승</th><th>패</th></tr>${t.map((x, i) => `<tr class="${x.me ? 'me' : ''} ${i === 3 ? 'cut' : ''}"><td>${i + 1}</td><td class="l"><i class="tagdot" style="background:${esc(x.color)}"></i>${esc(x.name)}</td><td>${esc(x.w)}</td><td>${esc(x.l)}</td></tr>`).join('')}</table>
      <p class="fine">상위 4팀이 플레이오프에 오른다. ${S.lg.tier === 'first' ? '우승·준우승 팀은 국제 대회에 나간다.' : ''}</p>` : '<p class="dim">연습생은 리그에 출전하지 않는다. 능력치가 팀 2군 기준에 닿으면 스플릿이 끝날 때 콜업된다.</p>';
    return `<div>${tb}</div><div><p class="sec">올해 내 성적</p><div class="kv"><div><span>경기</span><b>${esc(y.g)}</b></div><div><span>승률</span><b>${y.g ? Math.round(y.w / y.g * 100) + '%' : '-'}</b></div><div><span>평균 평점</span><b>${y.g ? f1(y.rs / y.g) : '-'}</b></div></div></div>
      <div class="card"><b>올해 일정</b><br><span class="dim">2~4월 스프링 → 5월 미드시즌 컵 → 6~8월 서머 → 9월 네이션스컵(짝수 연차) → 10월 월드 파이널 → 11월 시상식·스토브리그</span></div>`;
  }
  function tShop(S) {
    return `<div><p class="sec">투자 · 자금 ${money(S.money)}</p>${D.SHOP.map(it => {
      const lv = it.once ? 0 : S.shop[it.id], max = !it.once && lv >= it.cost.length, cost = max ? 0 : it.cost[it.once ? 0 : lv], used = it.once && S.used[it.id];
      return `<div class="shop"><div class="grow" style="flex:1"><b>${esc(it.name)}</b><span>${esc(it.desc)}</span>${it.once ? '' : `<div class="pips">${it.cost.map((_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div>`}</div>
        <button data-act="buy" data-id="${esc(it.id)}" ${max || used || S.money < cost ? 'disabled' : ''}>${max ? '최대' : used ? '이번 달 완료' : money(cost)}</button></div>`;
    }).join('')}</div>`;
  }
  function tRecord(S) {
    const c = S.car;
    return `<div><p class="sec">통산</p><div class="kv"><div><span>1군 경기</span><b>${esc(c.g)}</b></div><div><span>평균 평점</span><b>${c.g ? f1(c.rs / c.g) : '-'}</b></div><div><span>경기 MVP</span><b>${esc(c.mvp)}</b></div></div></div>
      <div><p class="sec">트로피·수상</p>${c.titles.length + c.awards.length ? `<div class="chips">${c.titles.map(t => `<span class="chip gold">${esc(t.y)}년차 ${esc(t.name)}</span>`).join('')}${c.awards.map(a => `<span class="chip">${esc(a.y)}년차 ${esc(a.name)}</span>`).join('')}</div>` : '<p class="dim">아직 비어 있다.</p>'}</div>
      <div><p class="sec">시즌 기록</p>${S.hist.length ? `<div class="scroll-x"><table><tr><th>연차</th><th class="l">팀</th><th>경기</th><th>승</th><th>평점</th><th>OVR</th></tr>${S.hist.map(h => `<tr><td>${esc(h.year)} <span class="dim">${esc(h.age)}세</span></td><td class="l">${esc(h.tag)} ${G.SQUAD[h.squad]}</td><td>${esc(h.g)}</td><td>${esc(h.w)}</td><td>${h.g ? f1(h.avg) : '-'}</td><td>${esc(h.ovr)}</td></tr>`).join('')}</table></div>` : '<p class="dim">첫 시즌을 마치면 기록이 쌓인다.</p>'}</div>
      <div class="stack"><p class="sec">기록실</p>
        <button class="btn line" data-act="vault" data-id="hall">명예의 전당 — ${G.hallInfo().n}명</button>
        <button class="btn line" data-act="vault" data-id="ach">도전 과제 — ${G.achInfo().n} / ${G.achInfo().of}</button>
        <button class="btn line" data-act="vault" data-id="backup">백업 관리 — 내려받기·복원</button></div>
      <div class="stack"><p class="sec">설정</p>
        <button class="btn line" data-act="fast">빠른 진행 ${S.opt.fast ? '켜짐' : '꺼짐'} — 평범한 달의 결과 화면을 건너뛰고 승부처는 자동으로 고른다</button>
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
  function offerLines(o) {
    const v = G.offerInfo(o); if (!v) return '';
    const sign = n => (n > 0 ? '+' : '') + n, L = [];
    L.push(`${esc(v.lg)} · 전력 ${esc(v.str)} (리그 ${esc(v.teams)}팀 중 ${esc(v.rank)}위)${v.honor ? ` · ${esc(v.honor)}` : ''}`);
    if (v.squad === 'first') L.push(`내 OVR ${esc(v.ovr)}, 팀 전력보다 ${esc(sign(v.diff))}. ${v.diff >= 2 ? '내가 뛰면 팀이 강해진다.' : v.diff >= -3 ? '팀 평균과 비슷하다.' : '팀 평균에 못 미친다. 내가 뛰면 팀 전력이 조금 내려간다.'}`);
    else if (v.squad === 'second') L.push(`2군 계약. 1군 콜업 심사 기준은 OVR ${esc(v.need1)} (지금 ${esc(v.ovr)}).`);
    L.push(v.here ? `지금 팀이다. 감독 신뢰는 ${esc(v.trust)} 그대로(${v.starter ? '주전' : '벤치'}).` : `옮기면 감독 신뢰 ${esc(v.trust)}에서 시작한다. ${v.starter ? '바로 주전으로 뛴다.' : `주전 기준 ${esc(v.line)}에 닿기 전까지는 벤치다.`}`);
    for (const r of v.rivals) L.push(`이 팀 소속 라이벌: ${esc(r.nick)}(${esc(r.role)}, ${esc(r.squad)}). ${r.same ? '같은 포지션이라 자리를 두고 다툰다.' : '포지션이 달라 동료가 된다.'}`);
    if (!v.here) L.push(`지금 연봉보다 ${money(Math.abs(v.pay))} ${v.pay >= 0 ? '많다' : '적다'}.${v.abroad ? ` 다른 나라 리그다. 국가대표는 그대로 ${esc(v.home)}.` : ''}`);
    return `<ul class="oinfo">${L.map(x => `<li>${x}</li>`).join('')}</ul>`;
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
          ${sc.offers.map((o, i) => `<button class="choice" data-act="res" data-i="${esc(i)}"><div class="grow"><b>${esc(o.name)}</b><small>${esc(o.note)}</small>${o.need2 ? `<small class="swing">콜업 기준 — 2군 OVR ${esc(o.need2)} · 1군 OVR ${esc(o.need1)} (지금 내 OVR ${Math.floor(G.ovr())})</small>` : ''}</div><span class="pill sure">전력 ${esc(o.str)}</span></button>`).join('')}`; break;
      case 'event':
        h = `<p class="eyebrow">선택의 순간</p><h2>${esc(sc.title)}</h2><p>${esc(sc.text)}</p>
          ${sc.choices.map((c, i) => `<button class="choice" data-act="res" data-i="${esc(i)}" ${c.disabled ? 'disabled' : ''}><div class="grow"><b>${esc(c.label)}</b>${c.bd ? `<small>${c.bd.map(b => `${esc(b[0])} ${b[1] >= 0 && b[0] !== '기본' ? '+' : ''}${esc(b[1])}`).join(' · ')}</small>` : ''}${c.disabled ? '<small>자금이 부족하다</small>' : ''}</div>${pill(c.p)}</button>`).join('')}
          <p class="fine">표시된 숫자가 실제 성공 확률이다. 실패가 이어지면 다음 판정에 보정이 붙는다.</p>`; break;
      case 'moment':
        cls = 'clutch';
        h = `<p class="eyebrow">${esc(sc.tour)} · ${esc(sc.label)} ${esc(sc.set)}세트 · ${SIT[sc.sit]}</p>${board(sc, sc.x, sc.y)}
          ${stakeLine(sc)}<h2>${esc(sc.title)}</h2><p>${esc(sc.text)}</p>${sc.rival ? `<p class="rvnote">상대 팀에 ${esc(sc.rival)}. 이 시리즈 결과가 상대 전적에 남는다.</p>` : ''}<p class="fine">지금 이 세트를 이길 확률은 ${esc(sc.base)}%. 선택이 성공하면 오르고 실패하면 내려간다.</p>
          ${sc.choices.map((c, i) => `<button class="choice" data-act="res" data-i="${esc(i)}"><div class="grow"><b>${riskTag(c)}${esc(c.label)}</b><small>${c.bd.map(b => `${esc(b[0])} ${b[1] >= 0 && b[0] !== '기본' ? '+' : ''}${esc(b[1])}`).join(' · ')}</small><small class="swing">성공하면 세트 승률 <em class="up">${esc(c.up)}%</em> · 실패하면 <em class="down">${esc(c.down)}%</em></small></div>${pill(c.p)}</button>`).join('')}
          <button class="btn line" data-act="auto">감독 판단에 맡긴다 (자동 선택)</button>`; break;
      case 'mresult':
        cls = sc.ok ? 'good' : 'bad';
        h = `<p class="eyebrow">${esc(sc.tour)} · ${esc(sc.label)} ${esc(sc.set)}세트</p><span class="stamp ${sc.ok ? 'ok' : 'no'}">${sc.ok ? '성공' : '실패'} · ${esc(sc.p)}%</span>
          <h2>${esc(sc.title)}</h2><p class="dim">${esc(sc.choice)}</p><p>${esc(sc.text)}</p>
          <div class="chips"><span class="chip ${sc.eff > 0 ? 'up' : 'down'}">이 세트 팀 전력 ${sc.eff > 0 ? '+' : ''}${esc(sc.eff)}</span><span class="chip ${sc.setWin ? 'up' : 'down'}">${esc(sc.set)}세트 ${sc.setWin ? '승리' : '패배'}</span></div>
          ${board(sc, sc.x, sc.y)}<p>${sc.over ? (sc.x > sc.y ? '시리즈를 가져왔다.' : '시리즈를 내줬다.') : '경기는 계속된다.'}</p>${okBtn(sc.over ? '결과 보기' : '다음 세트로')}`; break;
      case 'result':
        cls = sc.checked ? (sc.ok ? 'good' : 'bad') : '';
        h = `${sc.checked ? `<span class="stamp ${sc.ok ? 'ok' : 'no'}">${sc.ok ? '성공' : '실패'} · ${esc(sc.p)}%</span>` : ''}<h2>${esc(sc.title)}</h2><p>${esc(sc.text)}</p>
          <div class="chips">${sc.lines.map(l => `<span class="chip ${/[-]\d|하락/.test(l) ? 'down' : 'up'}">${esc(l)}</span>`).join('')}</div>${okBtn()}`; break;
      case 'month':
        h = `<p class="eyebrow">${esc(sc.title)} · ${esc(sc.plan)}</p><h2>${esc(sc.sub)}</h2>${tip('report', sc)}${matchList(sc.matches)}${roleLine(sc.matches)}
          ${sc.eval ? `<div class="kv"><div><span>월말 평가전 평점</span><b>${f1(sc.eval.r)}</b></div><div><span>연습생 순위</span><b>12명 중 ${esc(sc.eval.rank)}위</b></div><div><span>코치 평가</span><b>${sc.eval.d == null ? '-' : (sc.eval.d > 0 ? '+' : '') + esc(sc.eval.d)}</b></div></div>` : ''}
          ${sc.fans && sc.fans.length ? `<div class="fans"><p class="sec">팬 반응</p>${sc.fans.map(x => `<p><span class="chip v${esc(x.v)}">${D.FAN_VOICE[x.v]}</span>${esc(x.t)}</p>`).join('')}</div>` : ''}
          ${sc.eval && sc.eval.rivals ? `<p class="fine">동기 순위 · ${sc.eval.rivals.map(v => `${esc(v.nick)} ${esc(v.rank)}위 (평점 ${f1(v.r)})`).join(' · ')}</p>` : ''}
          ${sc.notes.map(n => `<p>${esc(n)}</p>`).join('')}
          <div class="chips">${sc.growth.map(g => `<span class="chip ${g[1] > 0 ? 'up' : 'down'}">${esc(g[0])} ${g[1] > 0 ? '+' : ''}${esc(g[1])}</span>`).join('')}<span class="chip">OVR ${esc(sc.ovr)}</span><span class="chip">월급 +${money(sc.salary)}</span></div>${okBtn()}`; break;
      case 'info':
        if (sc.cele) cls += ' cele' + (sc.cele === 1 ? ' play' : '');
        h = `${sc.cele ? `<div class="trophy" aria-hidden="true">${sc.cele === 1 ? '<div class="confetti">' + '<i></i>'.repeat(14) + '</div>' : ''}<svg viewBox="0 0 64 64" width="72" height="72"><path d="M18 8h28v14a14 14 0 0 1-28 0z" fill="#ffc857"/><path d="M18 12H8v6a10 10 0 0 0 10 10M46 12h10v6a10 10 0 0 1-10 10" fill="none" stroke="#ffc857" stroke-width="4"/><path d="M28 35h8v9h-8z" fill="#d9a63a"/><path d="M20 44h24v6H20z" fill="#ffc857"/><path d="M16 50h32v6H16z" fill="#d9a63a"/><path d="M24 12h5v12a9 9 0 0 1-5-8z" fill="#ffe7a8"/></svg></div>` : ''}
          ${sc.cele ? `<p class="eyebrow champ">CHAMPIONS</p><h2>${esc(sc.text)}</h2>${sc.news ? `<p class="news"><b>뉴스</b>${esc(sc.news)}</p>` : ''}` : `${sc.news ? `<p class="news"><b>뉴스</b>${esc(sc.news)}</p>` : ''}<h2>${esc(sc.title)}</h2><p>${esc(sc.text)}</p>`}${sc.lines.length ? `<div class="chips">${sc.lines.map(l => `<span class="chip ${sc.tone === 'gold' ? 'gold' : ''}">${esc(l)}</span>`).join('')}</div>` : ''}${okBtn()}`; break;
      case 'season':
        h = `<p class="eyebrow">SEASON ${esc(sc.year)}</p><h2>${esc(sc.year)}년차 결산</h2><p>${esc(sc.org)} ${G.SQUAD[sc.squad]} · ${esc(sc.age)}세 · OVR ${esc(sc.ovr)}</p>
          <div class="kv"><div><span>경기</span><b>${esc(sc.g)}</b></div><div><span>승</span><b>${esc(sc.w)}</b></div><div><span>평균 평점</span><b>${sc.g ? f1(sc.avg) : '-'}</b></div></div>
          <div class="chips">${sc.titles.map(t => `<span class="chip gold">${esc(t)}</span>`).join('')}${sc.awards.map(t => `<span class="chip gold">${esc(t)}</span>`).join('')}${sc.mvp ? `<span class="chip">경기 MVP ${esc(sc.mvp)}회</span>` : ''}${!sc.titles.length && !sc.awards.length ? '<span class="chip">무관</span>' : ''}</div>${okBtn('스토브리그로')}`; break;
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
    return `<div class="veil"><section class="sheet ${esc(cls)}" role="dialog" aria-modal="true" aria-label="${esc(sc.title || sc.sub || '선택')}" tabindex="-1">${h}</section></div>`;
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
    const mi = G.month(), tabs = [['home', '홈'], ['stats', '능력'], ['league', '리그'], ['shop', '투자'], ['record', '기록']];
    const body = S.org ? { home: tHome, stats: tStats, league: tLeague, shop: tShop, record: tRecord }[U.tab](S) : '';
    const warn = G.saveFailed() ? '<p class="warn" role="alert">방금 진행한 내용을 저장하지 못했다. 브라우저 저장 공간이 가득 찼거나 저장이 막혀 있다. 지금 창을 닫으면 마지막으로 저장된 시점으로 돌아간다. 기록 탭 → 백업 관리에서 백업 파일을 내려받아 두면 안전하다.</p>' : U.notice ? `<p class="warn">${esc(U.notice)}</p>` : '';
    return `<div class="stagebg" ${sc ? 'inert aria-hidden="true"' : ''}>${S.org ? header(S) : ''}<main class="content">${warn}${body}</main>
      ${S.org ? `<footer class="foot"><nav class="tabs" role="tablist">${tabs.map(t => `<button role="tab" data-act="tab" data-id="${esc(t[0])}" aria-selected="${U.tab === t[0]}">${esc(t[1])}</button>`).join('')}</nav>
      <button class="btn cta" data-act="next" ${sc ? 'disabled' : ''}>${esc(mi.m)}월 진행<small>${esc(mi.label)} · ${D.PLANS.find(p => p.id === S.plan).name}</small></button></footer>` : ''}</div>
      ${sc ? vScene(sc, S) : ''}`;
  }

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
    const y = window.scrollY, S = G.state();
    if (U.view === 'game' && !S) U.view = 'title';
    // 키보드 사용자를 위해, 다시 그린 뒤에도 방금 누른 버튼에 포커스를 돌려준다.
    const a = document.activeElement, fk = a && app.contains(a) && a.dataset && a.dataset.act ? [a.dataset.act, a.dataset.id || '', a.dataset.i || '', a.dataset.grp || ''] : (a && a.id === 'nick' ? 'nick' : null);
    const prevScene = U.sceneKey;
    if (U.view === 'card' && !U.card) U.view = 'hall';
    app.innerHTML = U.view === 'title' ? vTitle() : U.view === 'create' ? vCreate() : U.view === 'hall' ? vVault() : U.view === 'rec' ? vRec() : U.view === 'compare' ? vCompare() : U.view === 'card' ? vCard() : vGame(S);
    drawAvatars();
    const sheet = app.querySelector('.sheet'), sc = U.view === 'game' && S ? G.scene() : null;
    U.sceneKey = sheet ? (sc ? [sc.type, sc.title || '', sc.sub || '', sc.ev || '', sc.mid || '', sc.set || ''].join('|') : 'dlg') : '';
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
    toastAch();
  }
  // 도전 과제 달성 알림: 화면 위쪽에 잠깐 뜨는 한 줄. 진행을 막지 않는다.
  let toastEl = null, toastTimer = 0;
  function toastAch() {
    const ids = G.achFresh(); if (!ids.length) return;
    if (app.querySelector('.veil')) return;   // 창이 열려 있으면 창의 윗부분을 가리므로, 창이 닫힌 다음에 알린다
    G.achSeen();
    const names = ids.map(id => (D.ACH.find(a => a.id === id) || {}).name).filter(Boolean); if (!names.length) return;
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.id = 'toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite'); document.body.appendChild(toastEl); toastEl.addEventListener('click', () => toastEl.classList.remove('on')); }
    toastEl.textContent = '도전 과제 달성 — ' + names.slice(0, 3).join(', ') + (names.length > 3 ? ` 외 ${names.length - 3}개` : '');
    toastEl.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('on'), 5000);
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

  app.addEventListener('input', e => { if (e.target.id === 'nick') U.C.nick = e.target.value; });
  app.addEventListener('change', e => { if (e.target.id === 'impfile') { readImport(e.target.files && e.target.files[0]); e.target.value = ''; } });
  const TAP_GUARD = new Set(['next', 'ok', 'res', 'auto', 'reroll', 'stay', 'transfer', 'try', 'accept', 'nego', 'retire', 'wipe', 'create', 'again', 'start', 'del', 'impok', 'tutnext', 'tutskip']);
  app.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    const a = b.dataset.act, id = b.dataset.id, i = +b.dataset.i;
    // 두 번 눌림 방지: 진행·선택·확정 버튼은 직전 입력 뒤 잠깐 동안 다시 받지 않는다.
    // 화면이 바뀌면서 같은 자리에 다른 버튼이 오면, 연달아 누른 두 번째 입력이 엉뚱한 선택이 되기 때문이다.
    if (TAP_GUARD.has(a)) { const now = Date.now(), ms = window.__pgTapGuard != null ? window.__pgTapGuard : 320; if (now - (U.lastTap || 0) < ms) return; U.lastTap = now; }
    const live = a === 'create' && U.view === 'title' && G.saveInfo() && !G.saveInfo().over;
    if (live && U.confirm !== 'new') { U.confirm = 'new'; return render(); }
    if (a !== 'retire' && a !== 'wipe') U.confirm = '';
    if (a !== 'continue') U.notice = '';
    if (a !== 'undo') U.vmsg = '';
    switch (a) {
      case 'create': return go('create');
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
      case 'tutnext': {
        G.tutNext(id); break;
      }
      case 'tutskip': G.tutSkip(); break;
      case 'tutreplay': G.tutReplay(); U.tab = 'home'; render(); return window.scrollTo(0, 0);
      case 'next': G.next(); break;
      case 'ok': G.resolve(); break;
      case 'res': G.resolve(i); break;
      case 'reroll': G.resolve('reroll'); break;
      case 'auto': G.resolve('auto'); break;
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

  window.PG_UI = { render, state: U };   // 자동 화면 검사(test/browser)에서 쓴다
  render();
})();
