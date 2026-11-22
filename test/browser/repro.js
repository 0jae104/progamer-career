// 0.11.5 의 "자동진행 중 보유 자금 줄이 달마다 쌓이는" 결함을 옛 코드로 재현한다(0.11.6).
//   node test/browser/repro.js            저장소 이력에서 v0.11.5(cb31d1a)를 꺼내 실행한다 → 결함이 보여야 통과
// 같은 측정을 지금 코드로 하는 것은 test/browser/apdom.js (node test/browser/run.js apdom).
const { execSync } = require('child_process');
const { ROOT, serve, launch, tmpDir, open } = require('./lib');
const { run, digest, SAVE } = require('./apdom');
/* 0.11.8: node test/browser/repro.js plan — v0.11.7(41c2caf)에서 "자동진행 중 자동 휴식에 들어가도 홈의 이번 달 할 일이 그대로"인 결함을 재현한다 */
async function planRepro() {
  const dir = tmpDir('repro-plan'); execSync(`git -C "${ROOT}" archive 41c2caf | tar -x -C "${dir}"`, { stdio: 'pipe', shell: '/bin/sh' });
  const srv = await serve(dir), browser = await launch();
  const mk = await open(browser, srv.url), raw = await mk.pg.evaluate(SAVE, [3, 'first']), ver = await mk.pg.evaluate(() => PG.VERSION); await mk.ctx.close();
  const r = await run(browser, srv.url, raw, { w: 390, h: 844, want: 8, plan: 'scrim', rest: true, seed: 21, script: [{ at: 1, cond: 22, wrist: 90 }, { at: 3, cond: 96, wrist: 90 }, { at: 6, cond: 90, wrist: 24 }] }), d = digest(r.log), m = r.log.filter(x => x.k && !x.stop && x.on);
  console.log(`v${ver} 390×844 자동진행 ${d.months}개월(스크림에서 시작, 컨디션·손목을 정해 둔 값으로 낮춤): 화면의 이번 달 할 일이 실제와 다른 달 ${d.badPlan}개 · 라이벌전 줄이 이번 달 대진과 다른 달 ${d.badRv}개`);
  for (const x of m.filter(x => x.planOk !== true).slice(0, 4)) console.log(`  ${x.ym}: 실제 ${x.planNow}(돌아갈 일 ${x.back || '-'}) / 화면에 눌린 버튼 ${x.pressed} / 설명 "${x.planTxt}"`);
  await browser.close(); await srv.close();
  console.log(d.badPlan > 0 ? `재현됨: v${ver}에서는 자동 휴식에 들어가도 화면의 할 일이 바뀌지 않는다` : `재현되지 않음(v${ver})`);
  process.exit(d.badPlan > 0 ? 0 : 1);
}
(async () => {
  if (process.argv[2] === 'plan') return planRepro();
  const REV = process.argv[2] || 'cb31d1a', dir = tmpDir('repro');
  execSync(`git -C "${ROOT}" archive ${REV} | tar -x -C "${dir}"`, { stdio: 'pipe', shell: '/bin/sh' });
  const srv = await serve(dir), browser = await launch();
  const mk = await open(browser, srv.url), raw = await mk.pg.evaluate(SAVE, [3, 'first']), ver = await mk.pg.evaluate(() => PG.VERSION); await mk.ctx.close();
  let bad = 0;
  for (const [w, h, want] of [[390, 844, 12], [320, 568, 12]]) {
    const r = await run(browser, srv.url, raw, { w, h, want, seed: 11 }), d = digest(r.log), m = r.log.filter(x => x.k && !x.stop && x.on);
    console.log(`v${ver} ${w}×${h} 자동진행 ${d.months}개월: 보유 자금 줄 최대 ${d.maxRows}개(달마다 ${m.slice(0, 8).map(x => x.rows).join('→')}…) · 위쪽 선수 정보 칸의 높이 ${d.minMainH}→${d.maxMainH}px · 이번 달 할 일 칸의 위치 ${d.plan0}→${d.plan1}px(화면 높이 ${h}) · 이어서 밀린 달 ${d.growRun} · 첫 줄의 금액이 낡은 달 ${d.staleMoney}개 · 상태 영역 ${d.maxHstat}개`);
    console.log(`  달마다 줄 수 / 첫 줄에 적힌 금액 / 실제 자금: ${m.slice(0, 5).map(x => `${x.rows}개 / ${x.first} / ${x.want}`).join(' | ')}`);
    if (d.maxRows > 1 && d.plan1 > d.plan0 + 100) bad++;
  }
  await browser.close(); await srv.close();
  console.log(bad === 2 ? `재현됨: v${ver}에서는 자동진행이 한 달 넘어갈 때마다 보유 자금 줄이 하나씩 늘어난다` : `재현되지 않음(v${ver})`);
  process.exit(bad === 2 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
