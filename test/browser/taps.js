// 조작 횟수 실측(0.11.1~0.11.2): 같은 저장·같은 난수 시드·같은 선택 규칙으로 1군 한 시즌을 실제 화면에서 눌러 가며 진행하고 누른 횟수를 센다.
//   node test/browser/taps.js [시드 수=3]
// 비교: v0.11.0(한 달씩) / v0.11.1("다음 중요한 순간") / 지금(한 달씩) / 지금 자동진행(경기 직접) / 지금 자동진행(평범한 경기도 맡김). 예전 화면은 저장소 이력에서 꺼낸다.
// 선택 규칙: 창이 떠 있으면 그 창의 첫 번째 버튼(경기 준비는 "전략 없이 시작", 관전은 건너뛰기), 없으면 진행 버튼.
// 한 달씩 진행한 경로들은 시즌 끝 상태가 글자 단위로 같아야 한다. 자동진행은 사건을 성향대로 고르므로 결과가 다를 수 있다(누른 횟수만 비교).
// PC 헤드리스 크롬이다. 사람이 폰에서 누른 횟수가 아니다. git 이력이 필요하다(없으면 건너뜀).
const { execSync } = require('child_process');
const { ROOT, serve, tmpDir, launch, reporter, open } = require('./lib');
const V110 = 'e6086bc', V111 = 'a3e1926', NS = +process.argv[2] || 3;
const CONFIRM = new Set(['month', 'result', 'info', 'season', 'mresult', 'match']);
(async () => {
  const R = reporter('taps'); let d110, d111;
  try { d110 = tmpDir('v0110'); execSync(`git -C "${ROOT}" archive ${V110} | tar -x -C "${d110}"`, { stdio: 'pipe', shell: '/bin/sh' }); d111 = tmpDir('v0111'); execSync(`git -C "${ROOT}" archive ${V111} | tar -x -C "${d111}"`, { stdio: 'pipe', shell: '/bin/sh' }); }
  catch (e) { console.log('건너뜀: 예전 버전을 저장소 이력에서 꺼내지 못함 — ' + String(e.message).split('\n')[0]); process.exit(0); }
  const s110 = await serve(d110), s111 = await serve(d111), sNew = await serve(ROOT), browser = await launch();
  const ST = () => { const s = PG.state(); return JSON.stringify([s.year, s.m, s.age, s.money, s.cond, s.wrist, s.trust, s.fame, s.stats, s.car, s.contract, s.org, s.squad, s.rivals.map(r => [r.id, r.w, r.l, r.ovr])]); };
  // mode: next = 한 달씩, run = 0.11.1의 "다음 중요한 순간", auto = 0.11.2 자동진행(경기는 직접), automatch = 자동진행 + 평범한 경기도 맡기기
  async function season(url, raw, seed, mode) {
    const { ctx, pg } = await open(browser, url, { init: 'window.__pgApMs = 0;' });
    await pg.evaluate(r => { localStorage.clear(); localStorage.setItem('pg_tut_v1', '1'); localStorage.setItem('pg_career_v1', r); localStorage.setItem('pg_opt_v1', '{"snd":0}'); }, raw);
    await pg.reload(); await pg.waitForTimeout(250); await pg.click('[data-act=continue]'); await pg.waitForTimeout(150);
    const y0 = await pg.evaluate(s => { PG.seed(s); return PG.state().year; }, seed);
    if (mode === 'auto' || mode === 'automatch') await pg.evaluate(m => { PG.setAp('seen', true); PG.setAp('match', m === 'automatch'); PG_UI.render(); }, mode);   // 처음 한 번의 설명 창(+1번)은 세지 않는다
    const c = { progress: 0, confirm: 0, decide: 0, skip: 0, sheets: 0 };
    for (let i = 0; i < 600; i++) {
      const s = await pg.evaluate(() => ({ t: PG.scene() ? PG.scene().type : '', y: PG.state().year, over: PG.state().over, w: !!(window.PG_UI && PG_UI.state.watch) }));
      if (s.over) break;
      if (!s.t && s.y > y0) break;
      if (s.w) { await pg.evaluate(() => { const b = document.querySelector('[data-act=wskip]'); if (b) b.click(); }); c.skip++; await pg.waitForTimeout(30); continue; }
      if (s.t) {
        c.sheets++;
        if (s.t === 'prematch') await pg.click('.sheet [data-act=kick][data-id=none]');
        else await pg.evaluate(() => { const b = [...document.querySelectorAll('.veil .sheet [data-act]')].find(x => !x.disabled && !['snd', 'demoend', 'retire', 'reroll', 'mom-auto'].includes(x.dataset.act)); b.click(); });
        CONFIRM.has(s.t) ? c.confirm++ : c.decide++; c.by = c.by || {}; c.by[s.t] = (c.by[s.t] || 0) + 1;
      } else if (mode === 'auto' || mode === 'automatch') { await pg.click('[data-act=ap-go]'); c.progress++; await pg.waitForFunction(() => !PG_UI.ap.on, null, { timeout: 30000 }); }
      else { await pg.click(mode === 'run' ? '[data-act=run]' : '[data-act=next]'); c.progress++; }
      await pg.waitForTimeout(25);
    }
    const out = { c, st: await pg.evaluate(ST), errs: pg.errs.slice(), total: c.progress + c.confirm + c.decide + c.skip };
    await ctx.close(); return out;
  }
  const mk = await open(browser, s110.url);   // 가장 오래된 버전으로 저장을 만든다(새 버전의 항목이 섞이지 않게)
  const raws = await mk.pg.evaluate(n => { const out = []; for (let k = 0; out.length < n && k < 40; k++) { localStorage.clear(); localStorage.setItem('pg_tut_v1', '1'); PG._seen(); PG.seed(500 + k); PG.newGame({ nick: '실측' + k, region: ['kr', 'cn', 'eu', 'na'][k % 4], role: ['van', 'rov', 'core', 'gun', 'sup'][k % 5], trait: 'brain' }); let i = 0; while (i++ < 30000 && !PG.state().over && !(PG.state().squad === 'first' && PG.isStarter() && PG.state().tut.done && !PG.scene() && PG.state().m === 0 && PG.state().age <= 26)) PG.autoStep(); if (!PG.state().over && PG.state().squad === 'first' && !PG.scene()) { PG.save(); out.push(localStorage.getItem('pg_career_v1')); } } return out; }, NS);
  await mk.ctx.close();
  R.ok(raws.length === NS, `검사용 저장 ${raws.length}개`);
  const PATHS = [['v0.11.0 한 달씩', s110.url, 'next'], ['v0.11.1 다음 중요한 순간', s111.url, 'run'], ['v0.11.2 한 달씩', sNew.url, 'next'], ['v0.11.2 자동진행(경기 직접)', sNew.url, 'auto'], ['v0.11.2 자동진행(평범한 경기도 맡김)', sNew.url, 'automatch']];
  const sum = PATHS.map(() => ({ progress: 0, confirm: 0, decide: 0, skip: 0, total: 0 }));
  for (let i = 0; i < raws.length; i++) {
    const rs = []; for (const [, url, mode] of PATHS) rs.push(await season(url, raws[i], 9000 + i, mode));
    // 같은 선택 규칙(첫 번째 버튼)을 쓰는 세 경로는 시즌 끝 상태가 같아야 한다. 자동진행은 성향대로 고르므로 결과가 다를 수 있다(의도된 차이).
    R.ok(rs[0].st === rs[1].st && rs[0].st === rs[2].st, `시드 ${i}: 한 달씩 진행한 경로들의 시즌 끝 상태가 다름`);
    R.ok(rs.every(r => !r.errs.length), `스크립트 오류 ${rs.map(r => r.errs).join(' ')}`);
    rs.forEach((r, k) => { for (const f of ['progress', 'confirm', 'decide', 'skip']) sum[k][f] += r.c[f]; sum[k].total += r.total; });
    console.log(`  시즌 ${i + 1}: ` + rs.map((r, k) => `${PATHS[k][0]} ${r.total}번(진행 ${r.c.progress}·확인만 ${r.c.confirm}·선택 ${r.c.decide}${r.c.skip ? '·관전 건너뛰기 ' + r.c.skip : ''})`).join(' | '));
  }
  const n = raws.length;
  console.log(`\n1군 한 시즌 평균(${n}시즌, 한 시즌 = 10개월 + 시즌 결산·계약). 누른 횟수 = 진행 버튼 + 확인만 + 직접 고른 선택 + 관전 건너뛰기`);
  PATHS.forEach((p, k) => console.log(`  ${p[0].padEnd(24)} 합계 ${(sum[k].total / n).toFixed(1)}번 (진행 ${(sum[k].progress / n).toFixed(1)} · 확인만 ${(sum[k].confirm / n).toFixed(1)} · 선택 ${(sum[k].decide / n).toFixed(1)} · 관전 건너뛰기 ${(sum[k].skip / n).toFixed(1)})${k ? ` — v0.11.0 대비 ${Math.round((1 - sum[k].total / sum[0].total) * 100)}% 감소` : ''}`));
  R.ok(sum[3].progress < sum[1].progress && sum[3].total < sum[1].total, '자동진행의 누름 횟수가 0.11.1의 "다음 중요한 순간"보다 줄지 않음');
  await browser.close(); await s110.close(); await s111.close(); await sNew.close();
  for (const f of R.fails) console.log('  실패: ' + f);
  console.log(`확인 ${R.n}개, 실패 ${R.fails.length}개`); process.exit(R.fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
