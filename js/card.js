/* 프로게이머 키우기 — 커리어 카드 (은퇴 기록 한 건을 1080×1350 그림으로 그린다)
   기록에 있는 값만 쓴다. 없는 값은 "기록 없음"으로 쓰거나 줄을 뺀다. 난수와 시계를 쓰지 않으므로 같은 기록은 언제나 같은 그림이 된다.
   plan(기록, 글자폭 재는 함수) 이 그릴 목록을 만들고, draw(캔버스, 기록) 이 그 목록대로 그린다. plan 은 Node 에서도 돌아간다(test/sim.js). */
(function (root) {
  const W = 1080, H = 1350, PAD = 72;
  const FALL = '"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR","Noto Sans CJK KR",system-ui,sans-serif';
  const FD = px => `400 ${px}px "Black Han Sans",${FALL}`, FB = (px, w) => `${w || 500} ${px}px "IBM Plex Sans KR",${FALL}`;
  const C = { ink: '#0e1126', panel: '#171b38', panel2: '#20254a', line: '#2d3363', text: '#eef0ff', dim: '#9aa1cf', hot: '#ff4d6d', cy: '#62e4ff', gold: '#ffc857' };
  const NONE = '기록 없음', URL_TEXT = '0jae104.github.io/progamer-career';
  const has = v => typeof v === 'number' && isFinite(v);
  const chars = s => Array.from(String(s));

  // 한 줄에 들어가도록 글자 크기를 줄이고, 그래도 넘치면 끝을 … 으로 줄인다.
  function fit(measure, text, font, maxW, max, min) {
    let px = max; text = String(text);
    while (px > min && measure(text, font(px)) > maxW) px -= 4;
    if (measure(text, font(px)) <= maxW) return { s: text, px };
    const c = chars(text); let n = c.length;
    while (n > 1 && measure(c.slice(0, n).join('') + '…', font(px)) > maxW) n--;
    return { s: c.slice(0, n).join('') + '…', px, cut: true };
  }

  function plan(r, measure) {
    const ops = [], T = (k, s, x, y, font, fill, align) => ops.push({ t: 'text', k, s: String(s), x, y, font, fill, align: align || 'left' });
    const full = r.src === 'play';
    ops.push({ t: 'rect', x: 0, y: 0, w: W, h: H, fill: C.ink });
    ops.push({ t: 'poly', pts: [[0, 0], [W, 0], [W, 112], [0, 128]], fill: C.panel });
    ops.push({ t: 'poly', pts: [[0, 128], [W, 112], [W, 120], [0, 136]], fill: C.hot });
    ops.push({ t: 'rect', x: 20, y: 20, w: W - 40, h: H - 40, stroke: C.line, lw: 2 });
    T('label', 'E-SPORTS CAREER SIM', PAD, 84, FB(26, 700), C.cy);
    T('label', 'CAREER CARD', W - PAD, 84, FB(26, 700), C.dim, 'right');

    // 선수
    ops.push({ t: 'rect', x: PAD, y: 164, w: 252, h: 252, fill: C.panel2, stroke: C.line, lw: 2 });
    ops.push({ t: 'avatar', x: PAD + 14, y: 178, px: 16, seed: r.nick });
    const nx = PAD + 252 + 36, nw = W - PAD - nx;
    const nick = fit(measure, r.nick, FD, nw, 104, 52);
    T('nick', nick.s, nx, 268, FD(nick.px), C.text);
    const sub = [r.role, has(r.age) ? `${r.age}세 은퇴` : '', has(r.years) ? `${r.years}시즌` : ''].filter(Boolean).join(' · ');
    if (sub) { const f = fit(measure, sub, px => FB(px, 500), nw, 36, 26); T('sub', f.s, nx, 328, FB(f.px, 500), C.dim); }
    if (r.ep) { const f = fit(measure, r.ep, FD, nw, 50, 32); T('ep', f.s, nx, 398, FD(f.px), C.gold); }

    // 등급과 점수
    ops.push({ t: 'rect', x: PAD, y: 446, w: W - PAD * 2, h: 230, fill: C.panel, stroke: C.line, lw: 2 });
    ops.push({ t: 'rect', x: PAD, y: 446, w: 10, h: 230, fill: C.hot });
    const g = fit(measure, r.grade || '-', FD, 250, 190, 110);
    T('grade', g.s, PAD + 170, 628, FD(g.px), C.hot, 'center');
    T('label', '커리어 점수', PAD + 350, 524, FB(30, 600), C.dim);
    T('score', `${r.score}점`, PAD + 350, 624, FD(96), C.text);
    if (has(r.pct)) { T('label', '자동 시뮬레이션 대비', W - PAD - 34, 524, FB(26, 500), C.dim, 'right'); T('pct', `상위 ${r.pct}%`, W - PAD - 34, 612, FD(60), C.cy, 'right'); }

    // 수치 여섯 칸
    const cells = [
      ['1군 경기', has(r.g) ? String(r.g) : null],
      ['승률', has(r.g) && r.g > 0 && has(r.w) ? Math.round(r.w / r.g * 100) + '%' : null],
      ['평균 평점', has(r.g) && r.g > 0 && has(r.avg) ? (Math.round(r.avg * 10) / 10).toFixed(1) : null],
      ['최고 OVR', has(r.peak) ? String(r.peak) : null],
      ['경기 MVP', has(r.mvp) ? String(r.mvp) : null],
      ['1군 우승', has(r.big) ? `${r.big}회` : null],
    ];
    const cw = (W - PAD * 2 - 40) / 3, ch = 130;
    cells.forEach(([label, v], i) => {
      const x = PAD + (i % 3) * (cw + 20), y = 712 + Math.floor(i / 3) * (ch + 20);
      ops.push({ t: 'rect', x, y, w: cw, h: ch, fill: C.panel, stroke: C.line, lw: 2 });
      T('label', label, x + 22, y + 44, FB(26, 500), C.dim);
      if (v == null) T('none', NONE, x + 22, y + 102, FB(30, 500), C.dim); else T('stat', v, x + 22, y + 106, FB(52, 700), C.text);
    });

    // 트로피·수상: 큰 대회부터, 같은 급이면 먼저 딴 순서로. 넘치면 "외 N개"
    T('label', '트로피 · 수상', PAD, 1054, FD(30), C.dim);
    const order = { world: 0, mid: 1, nations: 1, dom: 2, second: 4 };
    const items = full ? (r.titles || []).map(t => ({ s: `${t.y}년차 ${t.name}`, o: order[t.tier], y: t.y, gold: 1 }))
      .concat((r.awards || []).map(a => ({ s: `${a.y}년차 ${a.name}`, o: a.name === '올해의 선수' ? 0.5 : 3, y: a.y })))
      .sort((a, b) => a.o - b.o || a.y - b.y) : [];
    const lw = W - PAD * 2 - 30, rows = [];
    if (!full) rows.push({ s: has(r.big) ? `1군 우승 ${r.big}회 (예전 버전 기록: 대회별 내역 없음)` : '예전 버전 기록: 내역 없음', dim: 1 });
    else if (!items.length) rows.push({ s: '트로피 없이 커리어를 마쳤다', dim: 1 });
    else { items.slice(0, items.length > 4 ? 3 : 4).forEach(x => rows.push(x)); if (items.length > 4) rows.push({ s: `외 ${items.length - 3}개`, dim: 1 }); }
    rows.forEach((x, i) => {
      const y = 1104 + i * 42, f = fit(measure, x.s, px => FB(px, 600), lw, 30, 24);
      if (!x.dim) ops.push({ t: 'rect', x: PAD, y: y - 20, w: 12, h: 12, fill: x.gold ? C.gold : C.cy });
      T(x.dim ? 'note' : 'item', f.s, PAD + (x.dim ? 0 : 30), y, FB(f.px, 600), x.dim ? C.dim : x.gold ? C.gold : C.text);
    });
    if (full && r.orgs && r.orgs.length) { const f = fit(measure, '팀  ' + r.orgs.join(' → '), px => FB(px, 500), W - PAD * 2, 26, 22); T('orgs', f.s, PAD, 1276, FB(f.px, 500), C.dim); }

    ops.push({ t: 'rect', x: PAD, y: 1294, w: W - PAD * 2, h: 2, fill: C.line });
    T('label', '프로게이머 키우기', PAD, 1322, FD(24), C.dim);
    T('label', URL_TEXT, W - PAD, 1322, FB(22, 500), C.dim, 'right');
    return ops;
  }

  // opt.avatar(ctx, x, y, px, seed): 도트 아바타를 그리는 함수(화면 쪽에서 넘겨준다)
  function draw(canvas, rec, opt) {
    canvas.width = W; canvas.height = H;
    const x = canvas.getContext('2d'), measure = (s, font) => { x.font = font; return x.measureText(s).width; };
    x.textBaseline = 'alphabetic';
    for (const o of plan(rec, measure)) {
      if (o.t === 'rect') { if (o.fill) { x.fillStyle = o.fill; x.fillRect(o.x, o.y, o.w, o.h); } if (o.stroke) { x.strokeStyle = o.stroke; x.lineWidth = o.lw; x.strokeRect(o.x, o.y, o.w, o.h); } }
      else if (o.t === 'poly') { x.beginPath(); o.pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.closePath(); x.fillStyle = o.fill; x.fill(); }
      else if (o.t === 'avatar') { if (opt && opt.avatar) opt.avatar(x, o.x, o.y, o.px, o.seed); }
      else { x.font = o.font; x.fillStyle = o.fill; x.textAlign = o.align; x.fillText(o.s, o.x, o.y); }
    }
    return canvas;
  }

  const api = { W, H, plan, draw, fit, NONE, fonts: [FD(40), FB(40, 500), FB(40, 700)] };
  (root.PG_VER = root.PG_VER || {}).card = '0.11.8';
  root.PG_CARD = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
