// 조작 횟수 실측(0.11.1): 같은 저장·같은 난수 시드·같은 선택 규칙으로 1군 한 시즌을 실제 화면에서 눌러 가며 진행하고 누른 횟수를 센다.
//   node test/browser/taps.js [시드 수=3]
// 비교: v0.11.0 화면(저장소 이력에서 꺼냄) / 지금 화면에서 "N월 진행"만 / 지금 화면에서 "다음 중요한 순간 ▶▶".
// 선택 규칙: 창이 떠 있으면 그 창의 첫 번째 버튼(경기 준비는 "전략 없이 시작", 관전은 건너뛰기), 없으면 진행 버튼.
// 세 경로의 시즌 끝 상태가 글자 단위로 같아야 한다(화면까지 포함해 진행 방식이 결과를 바꾸지 않는다는 확인).
// PC 헤드리스 크롬이다. 사람이 폰에서 누른 횟수가 아니다. git 이력이 필요하다(없으면 건너뜀).
const { execSync } = require('child_process');
const { ROOT, serve, tmpDir, launch, reporter, open } = require('./lib');
const OLD = 'e6086bc', NS = +process.argv[2] || 3;
const CONFIRM = new Set(['month', 'result', 'info', 'season', 'mresult', 'match']);
(async () => {
  const R = reporter('taps'); let oldDir;
  try { oldDir = tmpDir('v0110'); execSync(`git -C "${ROOT}" archive ${OLD} | tar -x -C "${oldDir}"`, { stdio: 'pipe', shell: '/bin/sh' }); }
  catch (e) { console.log('건너뜀: v0.11.0을 저장소 이력에서 꺼내지 못함 — ' + String(e.message).split('\n')[0]); process.exit(0); }
  const sOld = await serve(oldDir), sNew = await serve(ROOT), browser = await launch();
  const ST = () => { const s = PG.state(); return JSON.stringify([s.year, s.m, s.age, s.money, s.cond, s.wrist, s.trust, s.fame, s.stats, s.car, s.contract, s.org, s.squad, s.rivals.map(r => [r.id, r.w, r.l, r.ovr])]); };
  async function season(url, raw, seed, mode) {
    const { ctx, pg } = await open(browser, url);
    await pg.evaluate(r => { localStorage.clear(); localStorage.setItem('pg_tut_v1', '1'); localStorage.setItem('pg_career_v1', r); localStorage.setItem('pg_opt_v1', '{"snd":0}'); }, raw);
    await pg.reload(); await pg.waitForTimeout(250); await pg.click('[data-act=continue]'); await pg.waitForTimeout(150);
    const y0 = await pg.evaluate(s => { PG.seed(s); return PG.state().year; }, seed);
    const c = { progress: 0, confirm: 0, decide: 0, skip: 0, sheets: 0 };
    for (let i = 0; i < 600; i++) {
      const s = await pg.evaluate(() => ({ t: PG.scene() ? PG.scene().type : '', y: PG.state().year, over: PG.state().over, w: !!(window.PG_UI && PG_UI.state.watch), sheet: !!document.querySelector('.veil .sheet') }));
      if (s.over) break;
      if (!s.t && s.y > y0) break;
      if (s.w) { await pg.evaluate(() => { const b = document.querySelector('[data-act=wskip]'); if (b) b.click(); }); c.skip++; await pg.waitForTimeout(30); continue; }
      if (s.t) {
        c.sheets++;
        if (s.t === 'prematch') await pg.click('.sheet [data-act=kick][data-id=none]');
        else await pg.evaluate(() => { const b = [...document.querySelectorAll('.veil .sheet [data-act]')].find(x => !x.disabled && !['snd', 'demoend', 'retire', 'reroll'].includes(x.dataset.act)); b.click(); });
        CONFIRM.has(s.t) ? c.confirm++ : c.decide++; c.by = c.by || {}; c.by[s.t] = (c.by[s.t] || 0) + 1;
      } else { await pg.click(mode === 'run' ? '[data-act=run]' : '[data-act=next]'); c.progress++; }
      await pg.waitForTimeout(25);
    }
    const out = { c, st: await pg.evaluate(ST), errs: pg.errs.slice(), total: c.progress + c.confirm + c.decide + c.skip };
    await ctx.close(); return out;
  }
  // 검사용 저장: 1군 주전, 처음 안내가 끝남, 시즌 첫 달, 뜬 창 없음
  const mk = await open(browser, sNew.url);
  const raws = await mk.pg.evaluate(n => { const out = []; for (let k = 0; out.length < n && k < 40; k++) { localStorage.clear(); localStorage.setItem('pg_tut_v1', '1'); PG._seen(); PG.seed(500 + k); PG.newGame({ nick: '실측' + k, region: ['kr', 'cn', 'eu', 'na'][k % 4], role: ['van', 'rov', 'core', 'gun', 'sup'][k % 5], trait: 'brain' }); let i = 0; while (i++ < 30000 && !PG.state().over && !(PG.state().squad === 'first' && PG.isStarter() && PG.state().tut.done && !PG.scene() && PG.state().m === 0 && PG.state().age <= 26)) PG.autoStep(); if (!PG.state().over && PG.state().squad === 'first' && !PG.scene()) { PG.save(); out.push(localStorage.getItem('pg_career_v1')); } } return out; }, NS);
  await mk.ctx.close();
  R.ok(raws.length === NS, `검사용 저장 ${raws.length}개`);
  const sum = { old: null, one: null, run: null }, add = (k, r) => { sum[k] = sum[k] || { progress: 0, confirm: 0, decide: 0, skip: 0, total: 0 }; for (const f of ['progress', 'confirm', 'decide', 'skip']) sum[k][f] += r.c[f]; sum[k].total += r.total; };
  for (let i = 0; i < raws.length; i++) {
    const a = await season(sOld.url, raws[i], 9000 + i, 'next'), b = await season(sNew.url, raws[i], 9000 + i, 'next'), c = await season(sNew.url, raws[i], 9000 + i, 'run');
    R.ok(a.st === b.st && a.st === c.st, `시드 ${i}: 세 경로의 시즌 끝 상태가 다름(진행 방식이 결과를 바꿈)`);
    R.ok(!a.errs.length && !b.errs.length && !c.errs.length, `스크립트 오류 ${a.errs} ${b.errs} ${c.errs}`);
    R.ok(a.c.decide === b.c.decide && a.c.decide === c.c.decide, `시드 ${i}: 직접 고른 선택의 수가 다름 ${a.c.decide}/${b.c.decide}/${c.c.decide}`);
    add('old', a); add('one', b); add('run', c); const by = x => Object.keys(x.c.by || {}).sort().map(k => k + ' ' + x.c.by[k]).join(', ');
    console.log(`    창 종류 — v0.11.0: ${by(a)} | 지금: ${by(c)}`);
    console.log(`  시즌 ${i + 1}: v0.11.0 ${a.total}번(진행 ${a.c.progress} · 확인만 ${a.c.confirm} · 선택 ${a.c.decide} · 관전 건너뛰기 ${a.c.skip}) | N월 진행만 ${b.total}번(진행 ${b.c.progress} · 확인만 ${b.c.confirm} · 선택 ${b.c.decide}) | 다음 중요한 순간 ${c.total}번(진행 ${c.c.progress} · 확인만 ${c.c.confirm} · 선택 ${c.c.decide})`);
  }
  const n = raws.length, av = (k, f) => (sum[k][f] / n).toFixed(1), cut = (k, f) => Math.round((1 - sum[k][f] / sum.old[f]) * 100);
  console.log(`1군 한 시즌 평균(${n}시즌): v0.11.0 ${av('old', 'total')}번 | "N월 진행"만 ${av('one', 'total')}번(${cut('one', 'total')}% 감소) | "다음 중요한 순간" ${av('run', 'total')}번(${cut('run', 'total')}% 감소)`);
  console.log(`  그중 고를 것 없이 확인만 누른 횟수: ${av('old', 'confirm')}번 → ${av('one', 'confirm')}번(${cut('one', 'confirm')}% 감소) | 진행 버튼: ${av('old', 'progress')}번 → ${av('one', 'progress')}번 / ${av('run', 'progress')}번 | 직접 고른 선택: ${av('old', 'decide')}번(세 경로 같음)`);
  R.ok(sum.run.total <= sum.old.total * .7 && sum.one.confirm <= sum.old.confirm * .5, '누름 횟수가 기대만큼 줄지 않음(전체 30% 이상, 확인만 누르는 횟수 50% 이상)');
  await browser.close(); await sOld.close(); await sNew.close();
  for (const f of R.fails) console.log('  실패: ' + f);
  console.log(`확인 ${R.n}개, 실패 ${R.fails.length}개`); process.exit(R.fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
