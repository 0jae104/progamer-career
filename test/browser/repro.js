// 0.11.5 의 "자동진행 중 보유 자금 줄이 달마다 쌓이는" 결함을 옛 코드로 재현한다(0.11.6).
//   node test/browser/repro.js            저장소 이력에서 v0.11.5(cb31d1a)를 꺼내 실행한다 → 결함이 보여야 통과
// 같은 측정을 지금 코드로 하는 것은 test/browser/apdom.js (node test/browser/run.js apdom).
const { execSync } = require('child_process');
const { ROOT, serve, launch, tmpDir, open } = require('./lib');
const { run, digest, SAVE } = require('./apdom');
(async () => {
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
