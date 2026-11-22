// 실제 예전 버전에서 올라오는 갱신 검사: v0.6.0 → v0.7.0 → v0.8.0 → v0.9.0 → v0.10.0 → v0.10.1 → v0.10.2 → v0.11.0 → 지금 버전
//   node test/browser/update-chain.js
// 저장소 이력에서 예전 버전을 꺼내 HTTPS(자체 서명 인증서)로 띄운다. 예전 버전은 HTTPS 에서만 서비스 워커를 켜기 때문이다.
// git 이력(전체 복제)과 openssl 이 필요하다. 없으면 건너뛴다. 배포 서버(GitHub Pages)의 캐시 동작까지 흉내 내지는 않는다.
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const { ROOT, serve, copySite, tmpDir, launch, reporter, open, RUNTIME } = require('./lib');
const REV = { '0.6.0': 'c3b5a73', '0.7.0': 'c8da66c', '0.8.0': 'c95209c', '0.9.0': '68eb987', '0.10.0': 'd02c088', '0.10.1': 'b96d97d', '0.10.2': '857ea53', '0.11.0': 'e6086bc', '0.11.1': 'a3e1926', '0.11.2': '91090c1', '0.11.3': '0031727', '0.11.4': 'a39de95', '0.11.5': 'cb31d1a', '0.11.6': '4c14f12', '0.11.7': '41c2caf', '0.11.8': '80472df', '0.11.9': '92b32da', '0.11.10': 'bfc6d1d' };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const put = (dir, from) => { for (const f of RUNTIME) { const d = path.join(dir, f); if (fs.existsSync(path.join(from, f))) { fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(path.join(from, f), d); } else if (fs.existsSync(d)) fs.unlinkSync(d); } };
(async () => {
  const R = reporter('update-chain'), now = require(path.join(ROOT, 'package.json')).version, src = {};
  try {
    for (const v in REV) { src[v] = tmpDir('v' + v); execSync(`git -C "${ROOT}" archive ${REV[v]} | tar -x -C "${src[v]}"`, { stdio: 'pipe', shell: '/bin/sh' }); }
    src[now] = copySite(ROOT, tmpDir('now'));
    var certDir = tmpDir('cert'); execSync(`openssl req -x509 -newkey rsa:2048 -nodes -keyout "${certDir}/k.pem" -out "${certDir}/c.pem" -days 2 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost"`, { stdio: 'pipe' });
  } catch (e) { console.log('건너뜀: 예전 버전을 꺼내지 못했거나 openssl 이 없다 — ' + String(e.message).split('\n')[0]); process.exit(0); }
  const site = tmpDir('site'); put(site, src['0.6.0']);
  const srv = await serve(site, { tls: { key: fs.readFileSync(certDir + '/k.pem'), cert: fs.readFileSync(certDir + '/c.pem') } });
  const browser = await launch(['--ignore-certificate-errors']);
  const state = pg => pg.evaluate(async () => ({ caches: (await caches.keys()).sort(), ctl: !!navigator.serviceWorker.controller, ver: window.PG ? PG.VERSION : null, marks: window.PG_VER || null, mixed: window.PG_MIXED || null, title: !!document.querySelector('.title h1') }));
  const waitFor = async (pg, fn) => { const t = Date.now(); while (Date.now() - t < 10000) { if (await fn()) return true; await pg.waitForTimeout(200); } return false; };
  const keys = pg => pg.evaluate(() => ['pg_career_v1', 'pg_career_v1_bak', 'pg_hall_v1'].map(k => localStorage.getItem(k)));

  // 1) v0.6.0 설치, 데이터 만들기
  let { ctx, pg } = await open(browser, srv.url, { sw: true });
  R.ok(await waitFor(pg, async () => (await state(pg)).ctl || (await pg.evaluate(() => navigator.serviceWorker.ready.then(() => true)))), 'v0.6.0: 서비스 워커 설치');
  await pg.reload(); await pg.waitForTimeout(400);
  await pg.evaluate(() => { PG.newGame({ nick: 'Old1', region: 'kr', role: 'core', trait: 'brain' }); let n = 0; while (!PG.state().over && n++ < 20000) PG.autoStep(); PG.wipe(); PG.newGame({ nick: 'Old2', region: 'eu', role: 'sup', trait: 'grinder' }); for (let i = 0; i < 70; i++) PG.autoStep(); });
  await pg.reload(); await pg.waitForTimeout(400); let s = await state(pg);
  const d6 = await keys(pg), hall6 = JSON.parse(d6[2]);
  R.ok(s.ver === '0.6.0' && s.ctl && d6[0] && hall6.length === 1, `v0.6.0 준비 ${JSON.stringify(s)}`);
  // 2) v0.7.0 배포
  put(site, src['0.7.0']); await pg.reload(); await pg.waitForTimeout(600); s = await state(pg);
  R.ok(s.ver === '0.7.0' && !!(await pg.evaluate(() => window.PG_CARD)), `v0.6.0 → v0.7.0: 새 버전과 js/card.js 가 열리지 않음 ${JSON.stringify(s)}`);
  // v0.7.0 의 서비스 워커는 파일을 받을 때마다 보관하므로, 넘겨받은 직후에는 보관본이 비어 있을 수 있다. v0.6.0 보관본이 없어졌는지만 본다.
  R.ok(await waitFor(pg, async () => !(await state(pg)).caches.includes('pg-career-0.6.0')), 'v0.7.0: 예전 보관본 정리'); await pg.reload(); await pg.waitForTimeout(500);
  let d = await keys(pg); R.ok(d[0] === d6[0] && d[2] === d6[2], 'v0.7.0: 갱신만으로 저장이 달라짐');
  await pg.click('[data-act=continue]'); R.ok(await pg.evaluate(() => PG.state().nick === 'Old2' && PG.hall().length === 1 && PG.hall()[0].nick === 'Old1'), 'v0.7.0: 커리어 또는 명예의 전당');
  for (let i = 0; i < 10; i++) await pg.evaluate(() => PG.autoStep());
  await pg.reload(); await pg.waitForTimeout(400); const d7 = await pg.evaluate(() => ['pg_career_v1', 'pg_hall_v1', 'pg_legacy_v1', 'pg_ach_v1'].map(k => localStorage.getItem(k)));
  // 2-1) v0.8.0 배포(사전 보관 방식의 서비스 워커가 처음 들어온 버전)
  put(site, src['0.8.0']); await pg.reload(); await pg.waitForTimeout(600); s = await state(pg);
  R.ok(s.ver === '0.8.0' && s.marks && s.marks.ui === '0.8.0' && !s.mixed && s.title, `v0.7.0 → v0.8.0: 한 벌로 열리지 않음 ${JSON.stringify(s)}`);
  R.ok(await waitFor(pg, async () => same((await state(pg)).caches, ['pg-career-0.8.0'])), 'v0.8.0: 보관본 정리');
  R.ok(same(await pg.evaluate(() => ['pg_career_v1', 'pg_hall_v1', 'pg_legacy_v1', 'pg_ach_v1'].map(k => localStorage.getItem(k))), d7), 'v0.8.0: 갱신만으로 저장이 달라짐');
  // 2-2) v0.9.0 배포(포지션 이름이 바뀐 버전)
  put(site, src['0.9.0']); await pg.reload(); await pg.waitForTimeout(600); s = await state(pg);
  R.ok(s.ver === '0.9.0' && s.marks && s.marks.ui === '0.9.0' && !s.mixed && s.title, `v0.8.0 → v0.9.0: 한 벌로 열리지 않음 ${JSON.stringify(s)}`);
  R.ok(await waitFor(pg, async () => same((await state(pg)).caches, ['pg-career-0.9.0'])), 'v0.9.0: 보관본 정리');
  R.ok(same(await pg.evaluate(() => ['pg_career_v1', 'pg_hall_v1', 'pg_legacy_v1', 'pg_ach_v1'].map(k => localStorage.getItem(k))), d7), 'v0.9.0: 갱신만으로 저장이 달라짐');
  // 2-3) v0.10.0 배포(전용 승부처 50종). 지금 버전이 v0.10.0 이면 건너뛴다
  let oldTab = null;
  if (now !== '0.10.0') {
    put(site, src['0.10.0']); await pg.reload(); await pg.waitForTimeout(600); s = await state(pg);
    R.ok(s.ver === '0.10.0' && s.marks && s.marks.ui === '0.10.0' && !s.mixed && s.title, `v0.9.0 → v0.10.0: 한 벌로 열리지 않음 ${JSON.stringify(s)}`);
    R.ok(await waitFor(pg, async () => same((await state(pg)).caches, ['pg-career-0.10.0'])), 'v0.10.0: 보관본 정리');
    R.ok(same(await pg.evaluate(() => ['pg_career_v1', 'pg_hall_v1', 'pg_legacy_v1', 'pg_ach_v1'].map(k => localStorage.getItem(k))), d7), 'v0.10.0: 갱신만으로 저장이 달라짐');
    // 예전 버전(v0.10.0)의 탭을 게임 화면에 둔 채로 남겨 둔다. 아래 3-1에서 쓴다.
    oldTab = await ctx.newPage(); oldTab.errs = []; oldTab.on('pageerror', e => oldTab.errs.push(String(e.message || e)));
    await oldTab.goto(srv.url); await oldTab.waitForTimeout(300); await oldTab.click('[data-act=continue]');
    R.ok(await oldTab.evaluate(() => PG.VERSION === '0.10.0' && PG.state().nick === 'Old2'), '예전 탭 준비');
    R.ok(same(await pg.evaluate(() => ['pg_career_v1', 'pg_hall_v1', 'pg_legacy_v1', 'pg_ach_v1'].map(k => localStorage.getItem(k))), d7), '예전 탭을 열기만 했는데 저장이 달라짐');
  }
  // 2-4) v0.10.1 배포(다른 탭 보호). 예전 탭(v0.10.0)은 열어 둔 채로 둔다
  if (now !== '0.10.0' && now !== '0.10.1') {
    put(site, src['0.10.1']); await pg.reload(); await pg.waitForTimeout(600); s = await state(pg);
    R.ok(s.ver === '0.10.1' && s.marks && s.marks.ui === '0.10.1' && !s.mixed && s.title, `v0.10.0 → v0.10.1: 한 벌로 열리지 않음 ${JSON.stringify(s)}`);
    R.ok(await waitFor(pg, async () => same((await state(pg)).caches, ['pg-career-0.10.1'])), 'v0.10.1: 보관본 정리');
    R.ok(same(await pg.evaluate(() => ['pg_career_v1', 'pg_hall_v1', 'pg_legacy_v1', 'pg_ach_v1'].map(k => localStorage.getItem(k))), d7), 'v0.10.1: 갱신만으로 저장이 달라짐');
  }
  // 2-5) v0.10.2 배포(새 버전 안내)
  if (!['0.10.0', '0.10.1', '0.10.2'].includes(now)) {
    put(site, src['0.10.2']); await pg.reload(); await pg.waitForTimeout(600); s = await state(pg);
    R.ok(s.ver === '0.10.2' && s.marks && s.marks.ui === '0.10.2' && !s.mixed && s.title, `v0.10.1 → v0.10.2: 한 벌로 열리지 않음 ${JSON.stringify(s)}`);
    R.ok(await waitFor(pg, async () => same((await state(pg)).caches, ['pg-career-0.10.2'])), 'v0.10.2: 보관본 정리');
    R.ok(same(await pg.evaluate(() => ['pg_career_v1', 'pg_hall_v1', 'pg_legacy_v1', 'pg_ach_v1'].map(k => localStorage.getItem(k))), d7), 'v0.10.2: 갱신만으로 저장이 달라짐');
  }
  // 2-6) v0.11.0 배포(경기 한 판)
  if (!['0.10.0', '0.10.1', '0.10.2', '0.11.0'].includes(now)) {
    put(site, src['0.11.0']); await pg.reload(); await pg.waitForTimeout(600); s = await state(pg);
    R.ok(s.ver === '0.11.0' && s.marks && s.marks.ui === '0.11.0' && !s.mixed && s.title, `v0.10.2 → v0.11.0: 한 벌로 열리지 않음 ${JSON.stringify(s)}`);
    R.ok(await waitFor(pg, async () => same((await state(pg)).caches, ['pg-career-0.11.0'])), 'v0.11.0: 보관본 정리');
    R.ok(same(await pg.evaluate(() => ['pg_career_v1', 'pg_hall_v1', 'pg_legacy_v1', 'pg_ach_v1'].map(k => localStorage.getItem(k))), d7), 'v0.11.0: 갱신만으로 저장이 달라짐');
  }
  // 2-7) v0.11.1 배포(플레이 화면 하나·자동 관리)
  if (!['0.10.0', '0.10.1', '0.10.2', '0.11.0', '0.11.1'].includes(now)) {
    put(site, src['0.11.1']); await pg.reload(); await pg.waitForTimeout(600); s = await state(pg);
    R.ok(s.ver === '0.11.1' && s.marks && s.marks.ui === '0.11.1' && !s.mixed && s.title, `v0.11.0 → v0.11.1: 한 벌로 열리지 않음 ${JSON.stringify(s)}`);
    R.ok(await waitFor(pg, async () => same((await state(pg)).caches, ['pg-career-0.11.1'])), 'v0.11.1: 보관본 정리');
    R.ok(same(await pg.evaluate(() => ['pg_career_v1', 'pg_hall_v1', 'pg_legacy_v1', 'pg_ach_v1'].map(k => localStorage.getItem(k))), d7), 'v0.11.1: 갱신만으로 저장이 달라짐');
  }
  // 2-8) v0.11.2 배포(자동진행·가벼운 홈)
  if (!['0.10.0', '0.10.1', '0.10.2', '0.11.0', '0.11.1', '0.11.2'].includes(now)) {
    put(site, src['0.11.2']); await pg.reload(); await pg.waitForTimeout(600); s = await state(pg);
    R.ok(s.ver === '0.11.2' && s.marks && s.marks.ui === '0.11.2' && !s.mixed && s.title, `v0.11.1 → v0.11.2: 한 벌로 열리지 않음 ${JSON.stringify(s)}`);
    R.ok(await waitFor(pg, async () => same((await state(pg)).caches, ['pg-career-0.11.2'])), 'v0.11.2: 보관본 정리');
    R.ok(same(await pg.evaluate(() => ['pg_career_v1', 'pg_hall_v1', 'pg_legacy_v1', 'pg_ach_v1'].map(k => localStorage.getItem(k))), d7), 'v0.11.2: 갱신만으로 저장이 달라짐');
  }
  // 2-9) v0.11.3 배포(검수 수정)
  if (!['0.10.0', '0.10.1', '0.10.2', '0.11.0', '0.11.1', '0.11.2', '0.11.3'].includes(now)) {
    put(site, src['0.11.3']); await pg.reload(); await pg.waitForTimeout(600); s = await state(pg);
    R.ok(s.ver === '0.11.3' && s.marks && s.marks.ui === '0.11.3' && !s.mixed && s.title, `v0.11.2 → v0.11.3: 한 벌로 열리지 않음 ${JSON.stringify(s)}`);
    R.ok(await waitFor(pg, async () => same((await state(pg)).caches, ['pg-career-0.11.3'])), 'v0.11.3: 보관본 정리');
    R.ok(same(await pg.evaluate(() => ['pg_career_v1', 'pg_hall_v1', 'pg_legacy_v1', 'pg_ach_v1'].map(k => localStorage.getItem(k))), d7), 'v0.11.3: 갱신만으로 저장이 달라짐');
  }
  // 2-10) v0.11.4 배포(홈의 상태·자산 탭)
  if (!['0.10.0', '0.10.1', '0.10.2', '0.11.0', '0.11.1', '0.11.2', '0.11.3', '0.11.4'].includes(now)) {
    put(site, src['0.11.4']); await pg.reload(); await pg.waitForTimeout(600); s = await state(pg);
    R.ok(s.ver === '0.11.4' && s.marks && s.marks.ui === '0.11.4' && !s.mixed && s.title, `v0.11.3 → v0.11.4: 한 벌로 열리지 않음 ${JSON.stringify(s)}`);
    R.ok(await waitFor(pg, async () => same((await state(pg)).caches, ['pg-career-0.11.4'])), 'v0.11.4: 보관본 정리');
    R.ok(same(await pg.evaluate(() => ['pg_career_v1', 'pg_hall_v1', 'pg_legacy_v1', 'pg_ach_v1'].map(k => localStorage.getItem(k))), d7), 'v0.11.4: 갱신만으로 저장이 달라짐');
  }
  // 2-11) v0.11.5 배포(시즌 목표·라이벌 서사)
  if (!['0.10.0', '0.10.1', '0.10.2', '0.11.0', '0.11.1', '0.11.2', '0.11.3', '0.11.4', '0.11.5'].includes(now)) {
    put(site, src['0.11.5']); await pg.reload(); await pg.waitForTimeout(600); s = await state(pg);
    R.ok(s.ver === '0.11.5' && s.marks && s.marks.ui === '0.11.5' && !s.mixed && s.title, `v0.11.4 → v0.11.5: 한 벌로 열리지 않음 ${JSON.stringify(s)}`);
    R.ok(await waitFor(pg, async () => same((await state(pg)).caches, ['pg-career-0.11.5'])), 'v0.11.5: 보관본 정리');
    R.ok(same(await pg.evaluate(() => ['pg_career_v1', 'pg_hall_v1', 'pg_legacy_v1', 'pg_ach_v1'].map(k => localStorage.getItem(k))), d7), 'v0.11.5: 갱신만으로 저장이 달라짐');
  }
  // 2-12) v0.11.6 배포(자금 줄 누적 수정)
  if (!['0.10.0', '0.10.1', '0.10.2', '0.11.0', '0.11.1', '0.11.2', '0.11.3', '0.11.4', '0.11.5', '0.11.6'].includes(now)) {
    put(site, src['0.11.6']); await pg.reload(); await pg.waitForTimeout(600); s = await state(pg);
    R.ok(s.ver === '0.11.6' && s.marks && s.marks.ui === '0.11.6' && !s.mixed && s.title, `v0.11.5 → v0.11.6: 한 벌로 열리지 않음 ${JSON.stringify(s)}`);
    R.ok(await waitFor(pg, async () => same((await state(pg)).caches, ['pg-career-0.11.6'])), 'v0.11.6: 보관본 정리');
    R.ok(same(await pg.evaluate(() => ['pg_career_v1', 'pg_hall_v1', 'pg_legacy_v1', 'pg_ach_v1'].map(k => localStorage.getItem(k))), d7), 'v0.11.6: 갱신만으로 저장이 달라짐');
  }
  // 2-13) v0.11.7 배포(목표를 자금 아래로)
  if (!['0.10.0', '0.10.1', '0.10.2', '0.11.0', '0.11.1', '0.11.2', '0.11.3', '0.11.4', '0.11.5', '0.11.6', '0.11.7'].includes(now)) {
    put(site, src['0.11.7']); await pg.reload(); await pg.waitForTimeout(600); s = await state(pg);
    R.ok(s.ver === '0.11.7' && s.marks && s.marks.ui === '0.11.7' && !s.mixed && s.title, `v0.11.6 → v0.11.7: 한 벌로 열리지 않음 ${JSON.stringify(s)}`);
    R.ok(await waitFor(pg, async () => same((await state(pg)).caches, ['pg-career-0.11.7'])), 'v0.11.7: 보관본 정리');
    R.ok(same(await pg.evaluate(() => ['pg_career_v1', 'pg_hall_v1', 'pg_legacy_v1', 'pg_ach_v1'].map(k => localStorage.getItem(k))), d7), 'v0.11.7: 갱신만으로 저장이 달라짐');
  }
  // 2-14) v0.11.8 배포(자동진행 중 할 일 표시, 라이벌전 한 줄)
  if (!['0.10.0', '0.10.1', '0.10.2', '0.11.0', '0.11.1', '0.11.2', '0.11.3', '0.11.4', '0.11.5', '0.11.6', '0.11.7', '0.11.8'].includes(now)) {
    put(site, src['0.11.8']); await pg.reload(); await pg.waitForTimeout(600); s = await state(pg);
    R.ok(s.ver === '0.11.8' && s.marks && s.marks.ui === '0.11.8' && !s.mixed && s.title, `v0.11.7 → v0.11.8: 한 벌로 열리지 않음 ${JSON.stringify(s)}`);
    R.ok(await waitFor(pg, async () => same((await state(pg)).caches, ['pg-career-0.11.8'])), 'v0.11.8: 보관본 정리');
    R.ok(same(await pg.evaluate(() => ['pg_career_v1', 'pg_hall_v1', 'pg_legacy_v1', 'pg_ach_v1'].map(k => localStorage.getItem(k))), d7), 'v0.11.8: 갱신만으로 저장이 달라짐');
  }
  // 2-15) v0.11.9 배포(성장 표시, 시즌 프로젝트)
  if (!['0.10.0', '0.10.1', '0.10.2', '0.11.0', '0.11.1', '0.11.2', '0.11.3', '0.11.4', '0.11.5', '0.11.6', '0.11.7', '0.11.8', '0.11.9'].includes(now)) {
    put(site, src['0.11.9']); await pg.reload(); await pg.waitForTimeout(600); s = await state(pg);
    R.ok(s.ver === '0.11.9' && s.marks && s.marks.ui === '0.11.9' && !s.mixed && s.title, `v0.11.8 → v0.11.9: 한 벌로 열리지 않음 ${JSON.stringify(s)}`);
    R.ok(await waitFor(pg, async () => same((await state(pg)).caches, ['pg-career-0.11.9'])), 'v0.11.9: 보관본 정리');
    R.ok(same(await pg.evaluate(() => ['pg_career_v1', 'pg_hall_v1', 'pg_legacy_v1', 'pg_ach_v1'].map(k => localStorage.getItem(k))), d7), 'v0.11.9: 갱신만으로 저장이 달라짐');
  }
  // 2-16) v0.11.10 배포(최근 진행 한 칸, 쉬운 설명)
  if (!['0.10.0', '0.10.1', '0.10.2', '0.11.0', '0.11.1', '0.11.2', '0.11.3', '0.11.4', '0.11.5', '0.11.6', '0.11.7', '0.11.8', '0.11.9', '0.11.10'].includes(now)) {
    put(site, src['0.11.10']); await pg.reload(); await pg.waitForTimeout(600); s = await state(pg);
    R.ok(s.ver === '0.11.10' && s.marks && s.marks.ui === '0.11.10' && !s.mixed && s.title, `v0.11.9 → v0.11.10: 한 벌로 열리지 않음 ${JSON.stringify(s)}`);
    R.ok(await waitFor(pg, async () => same((await state(pg)).caches, ['pg-career-0.11.10'])), 'v0.11.10: 보관본 정리');
    R.ok(same(await pg.evaluate(() => ['pg_career_v1', 'pg_hall_v1', 'pg_legacy_v1', 'pg_ach_v1'].map(k => localStorage.getItem(k))), d7), 'v0.11.10: 갱신만으로 저장이 달라짐');
  }
  // 3) 지금 버전 배포
  put(site, src[now]); await pg.reload(); await pg.waitForTimeout(600); s = await state(pg);
  R.ok(s.ver === now && s.marks && ['data', 'engine', 'card', 'ui'].every(k => s.marks[k] === now) && !s.mixed && s.title, `v${now}: 한 벌로 열리지 않음 ${JSON.stringify(s)}`);
  R.ok(await waitFor(pg, async () => same((await state(pg)).caches, ['pg-career-' + now])), `v${now}: 보관본 정리 ${JSON.stringify((await state(pg)).caches)}`);
  const d8 = await pg.evaluate(() => ['pg_career_v1', 'pg_hall_v1', 'pg_legacy_v1', 'pg_ach_v1'].map(k => localStorage.getItem(k)));
  R.ok(same(d8, d7), `v${now}: 갱신만으로 저장이 달라짐`);
  // 3-1) 예전 버전 탭과 새 버전 탭이 함께 열려 있는 경우.
  //      예전 탭(v0.10.0)에는 다른 탭 보호가 없어서 그 탭이 쓰는 것은 막을 수 없다. 확인할 것은
  //      (가) 예전 탭이 쓴 저장이 새 버전에서 그대로 열리는가(손상되지 않는가) (나) 새 탭이 그것을 알아채고 덮어쓰지 않는가.
  if (oldTab) {
    const notice = p => p.evaluate(() => { const v = document.querySelector('.veil .sheet'); return !!v && v.textContent.includes('다른 탭에서 진행됐다'); });
    R.ok(await oldTab.evaluate(() => PG.VERSION) === '0.10.0', '예전 탭이 새 배포 뒤에도 예전 코드로 돌고 있어야 이 검사가 성립함');
    await pg.click('[data-act=continue]'); await pg.evaluate(() => { for (let i = 0; i < 3; i++) PG.autoStep(); });
    const newer = await pg.evaluate(() => localStorage.getItem('pg_career_v1'));
    R.ok(newer !== d7[0], '새 탭이 진행하지 못함');
    await oldTab.evaluate(() => { PG.autoStep(); });                       // 예전 탭이 오래된 상태에서 한 번 진행(보호 없음 → 덮어쓴다)
    const older = await oldTab.evaluate(() => localStorage.getItem('pg_career_v1'));
    R.note('예전 탭', older !== newer ? 'v0.10.0 탭은 보호가 없어 새 탭의 진행(3번)을 덮어씀 — 알려진 한계. 예전 탭을 닫거나 새로 고치면 끝남' : 'v0.10.0 탭이 덮어쓰지 않음');
    R.ok(await waitFor(pg, () => notice(pg)), '예전 탭이 저장을 바꿨는데 새 탭에 안내가 뜨지 않음');
    await pg.evaluate(() => { PG.autoStep(); PG.save(); });
    R.ok(await pg.evaluate(() => localStorage.getItem('pg_career_v1')) === older, '새 탭이 예전 탭의 저장을 다시 덮어씀(두 탭이 서로 덮어쓰는 상태)');
    await oldTab.close();
    await Promise.all([pg.waitForNavigation(), pg.click('.veil [data-act=reload]')]); await pg.waitForTimeout(400); s = await state(pg);
    R.ok(s.ver === now && s.title && !(await notice(pg)), `예전 탭을 닫고 새로 고친 뒤 ${JSON.stringify(s)}`);
    R.ok(await pg.evaluate(() => { const r = PG.importCheck(JSON.stringify(PG.exportData())); return !!r && r.ok === true; }), '예전 탭이 쓴 저장이 새 버전의 백업 검사를 통과하지 못함');
    R.ok(same((await pg.evaluate(() => ['pg_hall_v1', 'pg_legacy_v1'].map(k => localStorage.getItem(k)))), [d7[1], d7[2]]), '두 탭을 쓰는 동안 명예의 전당이 달라짐');
  }
  await pg.click('[data-act=continue]');
  R.ok(await pg.evaluate(() => PG.state().nick === 'Old2' && PG.hall().length === 1 && PG.hall()[0].nick === 'Old1' && JSON.parse(localStorage.getItem('pg_hall_v1')).length === 1), `v${now}: 커리어 또는 명예의 전당`);
  if (typeof (await pg.evaluate(() => typeof PG.roleLabel)) === 'string' && await pg.evaluate(() => typeof PG.roleLabel === 'function'))
    R.ok(await pg.evaluate(() => { const r = PG.hall().find(x => x.nick === 'Old1'), raw = JSON.parse(localStorage.getItem('pg_hall_v1'))[0].role; return ['선봉', '유격', '코어', '사수', '지원'].includes(raw) && r.role === raw && PG.roleLabel(r.role, r.roleId) === '미드' && PG.state().role === 'sup'; }), `v${now}: v0.6.0에서 은퇴한 기록의 포지션 이름(저장은 예전 글자, 표시는 지금 이름)`);
  await pg.evaluate(() => { let n = 0; while (!PG.state().over && n++ < 20000) PG.autoStep(); });
  R.ok(await pg.evaluate(() => PG.state().over && PG.hall().length === 2 && !window.__pgRenderError), `v${now}: v0.6.0에서 시작한 커리어를 은퇴까지 진행`);
  srv.down = true; await pg.reload(); await pg.waitForTimeout(500); s = await state(pg);
  R.ok(s.ver === now && s.title && !s.mixed, `v${now}: 갱신 뒤 오프라인 실행 ${JSON.stringify(s)}`); srv.down = false;
  R.note('연속 갱신', `v0.6.0 → v0.7.0 → v0.8.0 → v0.9.0 → v0.10.0 → v0.10.1 → v0.10.2 → v0.11.0 → v${now}: 매번 새 버전 한 벌로 열림, 예전 보관본 삭제, 커리어·명예의 전당 유지, 오프라인 실행`);
  R.ok(!pg.errs.length, `스크립트 오류 ${pg.errs}`); await ctx.close();

  // 4) v0.7.0 사용 중, 갱신 도중 일부 파일을 받지 못한 경우(예전 서비스 워커는 예전 파일을 대신 준다): 섞인 채로 게임이 돌면 안 된다
  put(site, src['0.7.0']); ({ ctx, pg } = await open(browser, srv.url, { sw: true }));
  await waitFor(pg, async () => same((await state(pg)).caches, ['pg-career-0.7.0'])); await pg.reload(); await pg.waitForTimeout(400);
  await pg.evaluate(() => { PG.newGame({ nick: 'Mid', region: 'kr', role: 'core', trait: 'brain' }); for (let i = 0; i < 40; i++) PG.autoStep(); }); await pg.reload(); await pg.waitForTimeout(300);
  const before = await pg.evaluate(() => localStorage.getItem('pg_career_v1'));
  for (const fail of [/engine\.js/, /ui\.js/, /card\.js/, /data\.js/]) {
    put(site, src[now]); srv.fail = fail; await pg.reload(); await pg.waitForTimeout(600); s = await state(pg);
    const marks = s.marks || {}, vs = new Set(['data', 'engine', 'card', 'ui'].map(k => marks[k]));
    const guarded = !!s.mixed && !s.title && (await pg.innerText('#app')).includes('새로 고쳐 주세요'), whole = vs.size === 1 && !s.mixed && s.title;
    R.ok(guarded || whole, `${fail} 실패 시 버전이 섞인 채 게임이 열림 ${JSON.stringify(s)}`);
    R.ok(await pg.evaluate(() => localStorage.getItem('pg_career_v1')) === before, `${fail} 실패가 저장을 바꿈`);
    R.note(`갱신 도중 ${fail} 실패`, guarded ? '새로 고침 안내' : '한 버전으로 열림');
    srv.fail = null; put(site, src['0.7.0']); await pg.reload(); await pg.waitForTimeout(600);
  }
  put(site, src[now]); await pg.reload(); await pg.waitForTimeout(600); s = await state(pg);
  R.ok(s.ver === now && !s.mixed && s.title && await pg.evaluate(() => localStorage.getItem('pg_career_v1')) === before, `연결 복구 뒤 v${now} 로 열리지 않음 ${JSON.stringify(s)}`);
  await ctx.close(); await browser.close(); await srv.close();
  console.log(`확인 ${R.n}개, 실패 ${R.fails.length}개`); process.exit(R.fails.length ? 1 : 0);
})();
