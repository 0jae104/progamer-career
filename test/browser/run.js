// 화면 자동 검사 실행기
//   node test/browser/run.js            전체
//   node test/browser/run.js flow pwa   고른 묶음만 (flow, layout, records, mobile, positions, security, play, auto, match, tabs, pwa)
// 준비: npm install  →  npx playwright install chromium  (이미 깔린 크롬을 쓰려면 PG_CHROME=실행파일경로)
const { ROOT, serve, launch, reporter } = require('./lib');
const SUITES = { flow: '처음 안내·우승 연출·예전 저장', layout: '배치·키보드 초점', records: '커리어 카드·명예의 전당·백업·실패 경로', mobile: '폰 화면 크기 6종의 주요 화면·버튼 닿기·접근성·두 번 눌림', positions: '포지션 안내·전용 승부처·계약 설명·예전 기록 표시', security: '문자열 삽입·손상 데이터 그리기', play: '플레이 화면(할 일 1탭·자산·요약)', auto: '자동진행·명령 충돌 회귀', match: '경기 한 판(전략·관전·소리·체험전)', tabs: '여러 탭 동시 사용·보관본과 저장의 분리', pwa: '오프라인 보관·버전 갱신' };
(async () => {
  const want = process.argv.slice(2).filter(a => SUITES[a]), list = want.length ? want : Object.keys(SUITES);
  const t0 = Date.now(), srv = await serve(ROOT); let browser;
  try { browser = await launch(); } catch (e) { console.error(e.message); await srv.close(); process.exit(2); }
  console.log(`브라우저 ${browser.version()} | 주소 ${srv.url}`);
  const results = [];
  for (const name of list) {
    const R = reporter(name), t = Date.now();
    console.log(`\n[${name}] ${SUITES[name]}`);
    try { await require('./' + name)(browser, srv.url, R, {}); } catch (e) { R.fails.push('검사 도중 중단: ' + (e.stack || e.message).split('\n').slice(0, 4).join(' | ')); console.log('  중단: ' + e.message.split('\n')[0]); }
    R.sec = ((Date.now() - t) / 1000).toFixed(1); results.push(R);
    console.log(`  → 확인 ${R.n}개, 실패 ${R.fails.length}개, ${R.sec}초`);
  }
  await browser.close(); await srv.close();
  console.log('\n요약');
  for (const R of results) console.log(`  ${R.fails.length ? '실패' : '통과'}  ${R.name.padEnd(9)} 확인 ${R.n}개, 실패 ${R.fails.length}개, ${R.sec}초`);
  for (const R of results) for (const f of R.fails) console.log(`  - [${R.name}] ${f}`);
  console.log(`전체 ${((Date.now() - t0) / 1000).toFixed(1)}초`);
  process.exit(results.some(R => R.fails.length) ? 1 : 0);
})();
