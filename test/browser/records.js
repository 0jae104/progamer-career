// 커리어 카드, 명예의 전당, 도전 과제, 백업·복원, 실패 경로, 새 화면들의 배치
const fs = require('fs'), path = require('path'), os = require('os');
const { open, career, snap, auditor } = require('./lib');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const OLD_HALL = Array.from({ length: 30 }, (_, i) => ({ nick: i === 0 ? '가나다라마바사아자차' : 'Old' + i, role: '코어', score: 90 - i * 3, grade: 'A', ep: '리그의 간판', peak: 88 - i, titles: i % 4, years: 10 + i % 3 }));
const SEED_HALL = `if(!localStorage.getItem('__seeded')){localStorage.setItem('__seeded','1');localStorage.setItem('pg_hall_v1',${JSON.stringify(JSON.stringify(OLD_HALL))})}`;
const cardReady = async pg => {
  await pg.waitForSelector('.cardimg', { timeout: 10000 });
  return pg.evaluate(async () => {
    const im = document.querySelector('.cardimg'); await im.decode();
    const c = document.createElement('canvas'); c.width = 108; c.height = 135; const x = c.getContext('2d'); x.drawImage(im, 0, 0, 108, 135);
    const d = x.getImageData(0, 0, 108, 135).data, s = new Set(); for (let i = 0; i < d.length; i += 4) s.add(d[i] << 16 | d[i + 1] << 8 | d[i + 2]);
    const buf = new Uint8Array(await (await fetch(im.src)).arrayBuffer()); let h = 0; for (const v of buf) h = (h * 31 + v) >>> 0;
    return { w: im.naturalWidth, h: im.naturalHeight, colors: s.size, bytes: buf.length, hash: h };
  });
};
const toEnd = pg => pg.evaluate(() => { let n = 0; while (!PG.state().over && n++ < 20000) PG.autoStep(); });
const openBackup = async pg => { await pg.click('[data-act=hall]'); await pg.click('[data-act=vt][data-id=backup]'); };
const pngSize = b => (b.slice(0, 8).toString('hex') === '89504e470d0a1a0a' ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null);

module.exports = async function records(browser, url, R) {
  const out = path.join(__dirname, 'out'); fs.mkdirSync(out, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pg-rec-')), bpath = path.join(tmp, 'backup.json');
  let bk = null;

  // A. 은퇴 → 카드 생성 → PNG 저장. 공유를 지원하지 않는 환경에서는 안내로 대체
  {
    // 파일 공유를 지원하지 않는 환경을 명시적으로 만든다(윈도 크롬처럼 지원하는 브라우저에서 돌려도 같은 조건이 되게: 외부 검수에서 지적)
    const { ctx, pg } = await open(browser, url, { init: 'try{Object.defineProperty(Navigator.prototype,"canShare",{value:undefined,configurable:true,writable:true});Object.defineProperty(Navigator.prototype,"share",{value:undefined,configurable:true,writable:true});}catch(e){}' }); await career(pg, 'Haneul');
    R.ok(await pg.locator('.retire').count() === 1 && (await pg.innerText('.retire')).includes('명예의 전당에 기록했다'), 'A: 은퇴 화면에 기록 완료 표시가 없음');
    const s0 = await snap(pg);
    await pg.locator('[data-act=endcard]').first().click();
    R.ok(await pg.locator('.cardwait, .cardimg').count() === 1, 'A: 생성 중 표시가 없음');
    const c1 = await cardReady(pg);
    R.ok(c1.w === 1080 && c1.h === 1350 && c1.colors >= 8 && c1.bytes > 20000, `A: 카드가 올바르지 않음 ${JSON.stringify(c1)}`);
    R.ok(await pg.locator('[data-act=cardshare]').count() === 0 && (await pg.innerText('.vault')).includes('공유를 지원하지 않는다'), 'A: 공유 미지원 환경의 안내가 없음');
    const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('[data-act=cardsave]')]);
    const file = path.join(out, 'card.png'); await dl.saveAs(file); const dim = pngSize(fs.readFileSync(file));
    R.note('PNG 저장', `${dl.suggestedFilename()}, ${fs.statSync(file).size}바이트, ${dim && dim.join('x')}`);
    R.ok(dim && dim[0] === 1080 && dim[1] === 1350 && dl.suggestedFilename() === 'progamer-career-Haneul.png', 'A: 내려받은 PNG가 올바르지 않음');
    R.ok((await pg.innerText('.cardst')).includes('저장을 시작했다'), 'A: 저장 뒤 안내 문구가 없음');
    await pg.click('[data-act=back]'); R.ok(await pg.locator('.retire').count() === 1 && same(await snap(pg), s0), 'A: 카드를 만들고 저장하자 게임 데이터가 바뀜');
    await pg.locator('[data-act=endcard]').first().click(); const c2 = await cardReady(pg);
    await pg.reload(); await pg.waitForTimeout(200); await pg.click('[data-act=continue]'); await pg.locator('[data-act=endcard]').first().click(); const c3 = await cardReady(pg);
    await pg.click('[data-act=back]'); await pg.click('[data-act=hall]'); await pg.click('.hmain'); await pg.click('[data-act=card]'); const c4 = await cardReady(pg);
    R.ok(c1.hash === c2.hash && c2.hash === c3.hash && c3.hash === c4.hash, 'A: 같은 기록인데 그림이 다름');
    R.note('같은 기록으로 네 번 생성', c1.hash === c4.hash ? '그림 바이트 동일' : '다름');
    R.ok(await pg.evaluate(() => { PG.seed(77); const a = PG.rand(); PG.seed(77); PG_CARD.draw(document.createElement('canvas'), PG.hall()[0], {}); const b = PG.rand(); PG.seed(null); return a === b; }), 'A: 카드 그리기가 게임 난수를 소비함');
    R.ok(!pg.errs.length, `A: 스크립트 오류 ${pg.errs}`); await ctx.close();
  }
  // B. 공유를 지원하는 환경(흉내): 성공, 취소, 실패
  for (const [name, init, want] of [
    ['성공', 'navigator.canShare=d=>!!(d&&d.files&&d.files.length);navigator.share=d=>{window.__shared={n:d.files.length,type:d.files[0].type,name:d.files[0].name,size:d.files[0].size};return Promise.resolve()};', '공유 창으로 넘겼다'],
    ['취소', "navigator.canShare=d=>true;navigator.share=d=>Promise.reject(new DOMException('x','AbortError'));", '공유를 취소했다'],
    ['실패', "navigator.canShare=d=>true;navigator.share=d=>Promise.reject(new Error('boom'));", '공유 창을 열지 못했다']]) {
    const { ctx, pg } = await open(browser, url, { init }); await career(pg, 'Share'); const s0 = await snap(pg);
    await pg.locator('[data-act=endcard]').first().click(); await cardReady(pg);
    R.ok(await pg.locator('[data-act=cardshare]').count() === 1, `B ${name}: 공유 버튼이 없음`);
    await pg.click('[data-act=cardshare]'); await pg.waitForTimeout(200);
    R.ok((await pg.innerText('.cardst')).includes(want), `B ${name}: 안내 문구가 다름`);
    if (name === '성공') { const sh = await pg.evaluate(() => window.__shared); R.note('공유(흉내)', sh); R.ok(sh && sh.n === 1 && sh.type === 'image/png' && sh.size > 20000, 'B: 공유로 넘긴 파일이 올바르지 않음'); }
    await pg.click('[data-act=back]'); R.ok(await pg.locator('.retire').count() === 1 && same(await snap(pg), s0), `B ${name}: 공유 뒤 게임 상태가 달라짐`);
    R.ok(!pg.errs.length, `B ${name}: 스크립트 오류 ${pg.errs}`); await ctx.close();
  }
  // C. 카드 극단값: 긴 한글 이름, 특수문자·이모지, 넓은 글자, 요약만 있는 기록, 값이 거의 없는 기록
  {
    const { ctx, pg } = await open(browser, url);
    const res = await pg.evaluate(async () => {
      const base = { id: 't1', src: 'play', at: 1, nick: '가나다라마바사아자차카타', role: '코어', age: 29, years: 13, score: 88, grade: 'S+', ep: '시대를 풍미한 스타', pct: 3, g: 412, w: 260, avg: 7.13, mvp: 55, peak: 93, big: 7, earn: 123456,
        titles: Array.from({ length: 9 }, (_, i) => ({ y: i + 2, name: '코리아 그랜드 리그 서머 플레이오프 우승 기념 대회 ' + i, tier: i % 2 ? 'dom' : 'world' })), awards: [{ y: 5, name: '올해의 선수' }], orgs: Array.from({ length: 8 }, (_, i) => '아주 긴 이름의 구단 ' + i), rv: [] };
      const recs = [base, Object.assign({}, base, { nick: 'W&"\'`A<b>😀𝒳' }), Object.assign({}, base, { nick: 'WWWWWWWWWWWW', grade: 'F', ep: '끝내 닿지 못한 무대', titles: [], awards: [], orgs: [], g: 0, w: 0, big: 0 }),
        { id: 'h1', src: 'hall1', at: null, nick: 'Old', role: '코어', score: 40, grade: 'B', ep: '믿음직한 주전', peak: 70, big: 2, years: 9 }, { id: 'h2', src: 'hall1', at: null, nick: 'Bare', role: '', score: 0, grade: '', ep: '' }];
      const o = [];
      for (const r of recs) {
        const cv = document.createElement('canvas'); PG_CARD.draw(cv, r, {}); const x = cv.getContext('2d'); let bad = 0, none = 0; const texts = [];
        for (const op of PG_CARD.plan(r, (s, f) => { x.font = f; return x.measureText(s).width; })) {
          if (op.t !== 'text') continue; x.font = op.font; const w = x.measureText(op.s).width, L = op.align === 'right' ? op.x - w : op.align === 'center' ? op.x - w / 2 : op.x;
          if (L < 20 || L + w > 1060 || op.y < 40 || op.y > 1340) bad++; if (op.s === '기록 없음') none++; texts.push(op.s);
        }
        const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
        o.push({ nick: r.nick, w: cv.width, h: cv.height, bad, none, size: blob.size, junk: texts.some(t => /undefined|NaN|null/.test(t)) });
      }
      return o;
    });
    R.note('카드 극단값', res.map(x => `${x.nick}: 넘친 글자 ${x.bad}, 기록 없음 ${x.none}칸`).join(' / '));
    for (const x of res) R.ok(x.w === 1080 && x.h === 1350 && x.bad === 0 && x.size > 10000 && !x.junk, `C: 카드 극단값 실패 ${JSON.stringify(x)}`);
    R.ok(res[3].none >= 3 && res[4].none >= 5, 'C: 없는 기록이 "기록 없음"으로 표시되지 않음'); await ctx.close();
  }
  // D. 예전 명예의 전당 30명 → 보관소. 정렬, 비교, 상세, 삭제 확인, 되돌리기
  {
    const raw = JSON.stringify(OLD_HALL), { ctx, pg } = await open(browser, url, { init: SEED_HALL });
    await pg.click('[data-act=hall]');
    R.ok(await pg.locator('.hmain').count() === 30 && await pg.evaluate(() => localStorage.getItem('pg_hall_v1')) === raw, 'D: 예전 30명이 모두 보이지 않거나 원본이 바뀜');
    const leg = JSON.parse(await pg.evaluate(() => localStorage.getItem('pg_legacy_v1')));
    R.ok(leg.v === 1 && leg.recs.length === 30 && new Set(leg.recs.map(r => r.id)).size === 30 && leg.recs.every(r => r.src === 'hall1' && r.at === null && !('g' in r) && !('titles' in r)), 'D: 옮긴 기록에 없는 값이 채워졌거나 ID가 겹침');
    await pg.reload(); await pg.waitForTimeout(200); await pg.click('[data-act=hall]'); R.ok(await pg.locator('.hmain').count() === 30, 'D: 다시 열자 수가 달라짐');
    R.ok((await pg.locator('.hmain').first().innerText()).includes('미드') && !(await pg.innerText('.hlist')).includes('코어') && leg.recs.every(r => r.role === '코어'), 'D: 예전 포지션 이름(코어)이 화면에서는 미드로 보이고 저장은 그대로여야 함');
    await pg.click('[data-act=sort][data-id=titles]'); R.ok((await pg.locator('.hmain').first().innerText()).includes('우승 3'), 'D: 우승순 정렬이 아님');
    await pg.click('[data-act=sort][data-id=recent]'); await pg.click('[data-act=sort][data-id=score]'); R.ok((await pg.locator('.hmain').first().innerText()).includes('가나다라마바사아자차'), 'D: 점수순 정렬이 아님');
    for (const i of [0, 1, 2]) await pg.locator('.hcmp').nth(i).click();
    R.ok(await pg.locator('.hcmp[aria-pressed=true]').count() === 2, 'D: 비교는 두 명까지여야 함');
    await pg.click('[data-act=compare]'); const t = await pg.innerText('.cmp'); R.ok(t.includes('기록 없음') && t.includes('Old1') && t.includes('Old2'), 'D: 비교 화면 내용'); await pg.click('[data-act=back]');
    await pg.locator('.hmain').first().click(); const d = await pg.innerText('.vault');
    R.ok(d.includes('예전 버전의 명예의 전당에서 옮긴 기록') && d.split('기록 없음').length - 1 >= 6, 'D: 상세 화면의 없는 기록 표시');
    await pg.click('[data-act=askdel]');
    R.ok(await pg.locator('[role=alertdialog]').count() === 1 && await pg.evaluate(() => document.activeElement.getAttribute('role') === 'alertdialog' && document.querySelector('section.page').inert), 'D: 삭제 확인 창의 초점 또는 뒤 화면 비활성');
    await pg.click('[data-act=canceldlg]'); R.ok(await pg.locator('[role=alertdialog]').count() === 0, 'D: 취소');
    await pg.click('[data-act=askdel]'); await pg.keyboard.press('Tab'); await pg.keyboard.press('Enter');
    R.ok(await pg.locator('.hmain').count() === 29 && await pg.evaluate(() => document.activeElement.dataset.act) === 'undo', 'D: 키보드 삭제 또는 되돌리기 버튼으로의 초점 이동');
    await pg.reload(); await pg.waitForTimeout(200); await pg.click('[data-act=hall]'); R.ok(await pg.locator('.hmain').count() === 29, 'D: 삭제가 새로 고침 뒤 유지되지 않음');
    await pg.evaluate(() => PG.hallUndo(PG.hallTrash()[0].id)); await pg.click('[data-act=sort][data-id=score]');
    R.ok(await pg.locator('.hmain').count() === 30 && await pg.evaluate(() => localStorage.getItem('pg_hall_v1')) === raw, 'D: 되돌리기 실패 또는 예전 원본 변경');
    await pg.click('[data-act=back]'); await career(pg, 'NewOne');
    const n = await pg.evaluate(() => [PG.hall().length, JSON.parse(localStorage.getItem('pg_hall_v1')).length, PG.hall().filter(r => r.src === 'play').length]);
    R.note('예전 명예의 전당', `30명 이관·원본 불변, 새 은퇴 뒤 보관소 ${n[0]}명 / 예전 키 ${n[1]}명`); R.ok(same(n, [31, 30, 1]), `D: 새 은퇴 뒤 기록 수 ${n}`);
    R.ok(!pg.errs.length, `D: 스크립트 오류 ${pg.errs}`); await ctx.close();
  }
  // E. 중복 방지
  {
    const { ctx, pg } = await open(browser, url); await career(pg, 'Dup');
    for (let i = 0; i < 3; i++) { await pg.reload(); await pg.waitForTimeout(150); await pg.click('[data-act=continue]'); }
    const count = () => pg.evaluate(() => [PG.hall().length, PG.achInfo().runs, Object.keys(JSON.parse(localStorage.getItem('pg_ach_v1')).got).length]);
    const e1 = await count(); await pg.evaluate(() => { for (let i = 0; i < 5; i++) { PG.load(); PG.save(); } }); const e2 = await count();
    R.ok(e1[0] === 1 && e1[1] === 1 && same(e1, e2), `E: 반복 불러오기로 기록·과제가 늘어남 ${e1} ${e2}`);
    await pg.evaluate(() => { const s = JSON.parse(localStorage.getItem('pg_career_v1')); delete s.cid; delete s.q[0].rid; delete s.q[0].at; localStorage.setItem('pg_career_v1', JSON.stringify(s)); localStorage.removeItem('pg_legacy_v1'); localStorage.removeItem('pg_ach_v1'); });
    for (let i = 0; i < 2; i++) { await pg.reload(); await pg.waitForTimeout(150); await pg.click('[data-act=continue]'); }
    const e3 = await pg.evaluate(() => [PG.hall().length, PG.hall()[0].src, PG.hall()[0].at, PG.achInfo().runs]);
    R.ok(same(e3, [1, 'play', null, 1]), `E: 예전 은퇴 저장이 한 건으로 합쳐지지 않음 ${e3}`);
    await pg.evaluate(() => PG.hallDel(PG.hall()[0].id)); await pg.reload(); await pg.waitForTimeout(150); await pg.click('[data-act=continue]');
    R.ok(await pg.evaluate(() => PG.hall().length) === 0, 'E: 지운 기록이 은퇴 저장을 열자 되살아남');
    R.note('중복 방지', `새로 고침 3회 + 불러오기 5회 뒤 명예의 전당 ${e2[0]}건, 완주 ${e2[1]}회`); R.ok(!pg.errs.length, `E: 스크립트 오류 ${pg.errs}`); await ctx.close();
  }
  // F. 백업: 내려받기 → 새 브라우저에서 미리보기·취소·복원 → 일치. 잘못된 파일은 거부
  {
    let { ctx, pg } = await open(browser, url, { init: SEED_HALL });
    await career(pg, 'First'); await pg.click('[data-act=again]'); await pg.fill('#nick', 'Second'); await pg.click('[data-act=cstep]'); await pg.click('[data-act=start]');
    await pg.evaluate(() => { for (let i = 0; i < 150 && !PG.state().over; i++) PG.autoStep(); });
    await pg.reload(); await pg.waitForTimeout(200); const src = await snap(pg);
    await openBackup(pg);
    const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('[data-act=export]')]); await dl.saveAs(bpath); bk = JSON.parse(fs.readFileSync(bpath, 'utf8'));
    R.note('백업 파일', `${dl.suggestedFilename()}, ${fs.statSync(bpath).size}바이트, payload 키 ${Object.keys(bk.payload)}`);
    R.ok(bk.format === 'progamer-career-backup' && bk.version === 1 && !!bk.exportedAt && same(Object.keys(bk.payload).sort(), ['achievements', 'career', 'careerBackup', 'hall', 'legacy', 'tutorialDone']), 'F: 백업 파일 형식');
    R.ok(!JSON.stringify(bk).includes('__seeded') && (await pg.innerText('.vault')).includes('내려받기를 시작했다'), 'F: 게임 밖의 저장소 값이 백업에 들어갔거나 안내 문구가 없음');
    await ctx.close();
    ({ ctx, pg } = await open(browser, url)); await openBackup(pg); const fresh = await snap(pg);
    await pg.setInputFiles('#impfile', bpath); await pg.waitForSelector('.impbox');
    const pv = await pg.innerText('.impbox'); R.ok(pv.includes('Second') && pv.includes('31명') && pv.includes('진행 중') && pv.includes('모두 지워지고'), 'F: 미리보기 내용 또는 덮어쓰기 고지');
    R.ok(same(await snap(pg), fresh), 'F: 확인 전에 데이터가 바뀜');
    await pg.click('[data-act=impcancel]'); R.ok(await pg.locator('.impbox').count() === 0 && same(await snap(pg), fresh), 'F: 취소');
    await pg.setInputFiles('#impfile', bpath); await pg.waitForSelector('.impbox'); await pg.click('[data-act=impok]');
    R.ok((await pg.innerText('.title')).includes('백업을 복원했다'), 'F: 복원 완료 안내가 없음');
    const dst = await snap(pg), eq = src.map((a, i) => (a && dst[i] && a[0] !== '1' ? same(JSON.parse(a), JSON.parse(dst[i])) || sameSorted(a, dst[i]) : a === dst[i]));
    R.note('복원 일치(커리어, 시즌 사본, 예전 전당, 보관소, 도전 과제, 안내 표시)', eq); R.ok(eq.every(Boolean) && src[0] === dst[0] && src[1] === dst[1], `F: 복원한 데이터가 원본과 다름 ${eq}`);
    await pg.click('[data-act=continue]'); const st = await pg.evaluate(() => [PG.state().nick, PG.hall().length, PG.achInfo().n]); R.ok(st[0] === 'Second' && st[1] === 31 && st[2] > 0, `F: 복원 뒤 상태 ${st}`);
    await toEnd(pg); R.ok(await pg.evaluate(() => PG.state().over && PG.hall().length === 32 && PG.achInfo().runs === 2), 'F: 복원한 커리어를 은퇴까지 진행하지 못함');
    await pg.reload(); await pg.waitForTimeout(200); const keep = await snap(pg);
    const variant = f => { const x = JSON.parse(JSON.stringify(bk)); f(x); return JSON.stringify(x); };
    const bad = {
      '깨진 JSON': fs.readFileSync(bpath, 'utf8').slice(0, 500), '빈 파일': '', '다른 형식': '{"hello":1}', '배열': '[1,2,3]',
      '다른 format': variant(x => { x.format = 'other-game'; }), '미래 버전(2)': variant(x => { x.version = 2; }), '버전 0': variant(x => { x.version = 0; }), '버전 문자열': variant(x => { x.version = '1'; }),
      'payload 없음': variant(x => { delete x.payload; }), '커리어가 문자열': variant(x => { x.payload.career = 'x'; }), '능력치가 문자열': variant(x => { x.payload.career.stats.mech = '99'; }),
      '능력치 범위 밖': variant(x => { x.payload.career.stats.mech = 500; }), '나이 범위 밖': variant(x => { x.payload.career.age = -3; }), '없는 구단': variant(x => { x.payload.career.org = 'nope'; }),
      '저장 버전 다름': variant(x => { x.payload.career.v = 9; }), '없는 장면': variant(x => { x.payload.career.q = [{ type: 'hack' }]; }), '내용이 빠진 장면': variant(x => { x.payload.career.q = [{ type: 'info' }]; }),
      '우승 기록 손상': variant(x => { x.payload.career.car.titles = [{ y: 1, name: 'x', tier: 'galaxy' }]; }), '명예의 전당이 객체': variant(x => { x.payload.hall = { a: 1 }; }), '명예의 전당 31명': variant(x => { x.payload.hall = OLD_HALL.concat(OLD_HALL.slice(0, 1)); }),
      '보관소 버전 다름': variant(x => { x.payload.legacy.v = 7; }), '보관소 기록 손상': variant(x => { x.payload.legacy.recs = [{ nick: 5 }]; }), '도전 과제 버전 다름': variant(x => { x.payload.achievements.v = 3; }),
      '3MB 초과': variant(x => { x.payload.pad = 'x'.repeat(3 * 1024 * 1024 + 10); }), '너무 깊은 구조': variant(x => { let o = x.payload.career.flags; for (let i = 0; i < 40; i++) o = o.d = {}; }),
    };
    let rej = 0; const fp = path.join(tmp, 'bad.json');
    for (const name in bad) {
      fs.writeFileSync(fp, bad[name]); await openBackup(pg); await pg.setInputFiles('#impfile', fp); await pg.waitForTimeout(150);
      if (await pg.locator('.impbox').count() === 0 && await pg.locator('.vault [role=alert]').count() === 1 && same(await snap(pg), keep)) rej++; else R.ok(false, `F: 잘못된 파일 "${name}" 이 거부되지 않았거나 데이터가 바뀜`);
      await pg.click('[data-act=back]');
    }
    R.note('잘못된 백업 파일', `${Object.keys(bad).length}종 가운데 ${rej}종 거부, 기기 데이터 불변`); R.ok(rej === Object.keys(bad).length, 'F: 거부되지 않은 파일이 있음');
    R.ok(!pg.errs.length, `F: 스크립트 오류 ${pg.errs}`); await ctx.close();
  }
  // G. 실패 경로
  {
    const quota = key => `const si=Storage.prototype.setItem;window.__blk=${key ? 'true' : 'false'};Storage.prototype.setItem=function(k,v){if(window.__blk&&k==='${key || 'pg_ach_v1'}'){const e=new Error('q');e.name='QuotaExceededError';throw e}return si.call(this,k,v)};`;
    let { ctx, pg } = await open(browser, url, { init: quota('pg_legacy_v1') }); await career(pg, 'Quota');
    R.ok((await pg.innerText('.retire')).includes('명예의 전당에 기록하지 못했다') && await pg.evaluate(() => !!localStorage.getItem('pg_career_v1') && !PG.saveFailed() && PG.hallInfo().failed), 'G1: 보관소 쓰기 실패 경고 또는 커리어 저장');
    await pg.locator('[data-act=endcard]').first().click(); R.ok((await cardReady(pg)).w === 1080, 'G1: 기록 실패 상태에서 카드 생성'); await ctx.close();
    ({ ctx, pg } = await open(browser, url, { init: quota('') })); await career(pg, 'Keep'); await pg.reload(); await pg.waitForTimeout(200); const keep = await snap(pg);
    await openBackup(pg); await pg.setInputFiles('#impfile', bpath); await pg.waitForSelector('.impbox');
    await pg.evaluate(() => { window.__blk = true; }); await pg.click('[data-act=impok]'); await pg.waitForTimeout(100); await pg.evaluate(() => { window.__blk = false; });
    R.ok(same(await snap(pg), keep) && (await pg.innerText('.vault')).includes('원래대로 남아 있다'), 'G2: 복원 도중 쓰기 실패 뒤 원래 데이터가 아님');
    await pg.click('[data-act=back]'); await pg.click('[data-act=continue]'); R.ok(await pg.evaluate(() => PG.state().nick) === 'Keep', 'G2: 실패 뒤 기존 커리어가 열리지 않음'); await ctx.close();
    ({ ctx, pg } = await open(browser, url, { init: "Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError')}});" }));
    R.ok((await pg.innerText('.title')).includes('저장이 되지 않는다'), 'G3: 저장 차단 경고가 없음');
    await pg.evaluate(() => { PG.newGame({ nick: 'NoStore', region: 'kr', role: 'core', trait: 'brain' }); let n = 0; while (!PG.state().over && n++ < 20000) PG.autoStep(); });
    await pg.click('[data-act=hall]'); await pg.click('[data-act=back]'); await pg.click('[data-act=continue]'); await pg.waitForTimeout(100);
    R.ok(await pg.locator('.retire').count() === 1 && (await pg.innerText('.retire')).includes('기록하지 못했다'), 'G3: 저장 차단 상태의 은퇴 화면');
    await pg.locator('[data-act=endcard]').first().click(); R.ok((await cardReady(pg)).w === 1080, 'G3: 저장 차단 상태에서 카드 생성');
    await pg.click('[data-act=back]'); await openBackup(pg); await pg.setInputFiles('#impfile', bpath); await pg.waitForSelector('.impbox'); await pg.click('[data-act=impok]');
    R.ok((await pg.innerText('.vault')).includes('복원하지 못했다'), 'G3: 저장 차단 상태에서 복원이 성공으로 표시됨'); R.ok(!pg.errs.length, `G3: 스크립트 오류 ${pg.errs}`); await ctx.close();
    ({ ctx, pg } = await open(browser, url, { init: 'HTMLCanvasElement.prototype.toBlob=function(cb){cb(null)};' })); await career(pg, 'NoBlob'); const s0 = await snap(pg);
    await pg.locator('[data-act=endcard]').first().click(); await pg.waitForSelector('.cardwait.fail', { timeout: 10000 });
    R.ok(await pg.locator('[data-act=cardsave][disabled]').count() === 1 && await pg.locator('[data-act=cardretry]').count() === 1, 'G4: 카드 실패 표시');
    await pg.click('[data-act=back]'); R.ok(await pg.locator('.retire').count() === 1 && same(await snap(pg), s0), 'G4: 카드 실패 뒤 게임 상태'); await ctx.close();
    ({ ctx, pg } = await open(browser, url, { init: 'HTMLAnchorElement.prototype.click=function(){throw new Error("blocked")};' })); await career(pg, 'NoDl');
    await pg.locator('[data-act=endcard]').first().click(); await cardReady(pg); await pg.click('[data-act=cardsave]');
    R.ok((await pg.innerText('.cardst')).includes('파일 저장을 시작하지 못했다'), 'G5: 내려받기 시작 실패 안내');
    await pg.click('[data-act=back]'); await openBackup(pg); await pg.click('[data-act=export]'); R.ok((await pg.innerText('.vault')).includes('내려받기를 시작하지 못했다'), 'G5: 백업 내려받기 시작 실패 안내');
    R.ok(!pg.errs.length, `G5: 스크립트 오류 ${pg.errs}`); await ctx.close();
    R.note('실패 경로', '보관소 쓰기 실패 / 복원 도중 쓰기 실패 / 저장소 차단 / 그림 생성 실패 / 내려받기 시작 실패 — 모두 안내가 나오고 게임은 계속됨');
  }
  // H. 도전 과제 알림과 목록
  {
    const { ctx, pg } = await open(browser, url); await pg.click('[data-act=create]'); await pg.fill('#nick', 'Ach'); await pg.click('[data-act=cstep]'); await pg.click('[data-act=start]');
    await pg.evaluate(() => { let n = 0; while (!PG.state().car.debut && !PG.state().over && n++ < 20000) PG.autoStep(); });
    // 새로 고치지 않고 그 자리에서 다시 그린다. (새로 고치면 타이틀 화면에서 알림이 먼저 떠 버려, 아래의 '창이 열려 있는 동안 미룬다'를 볼 수 없다.
    //  예전에는 새로 고친 뒤 확인했는데, 이어하기 직후 창이 열려 있는 경우에만 실패하는 불안정한 확인이었다.)
    R.ok(await pg.evaluate(() => PG.achFresh().length > 0), 'H: 데뷔까지 진행했는데 알릴 도전 과제가 없음');
    await pg.evaluate(() => { for (let i = 0; i < 24 && !PG.scene() && !PG.state().over; i++) PG.next(); PG_UI.render(); }); await pg.waitForTimeout(150);   // 한 달 진행해 창을 연 상태로 그린다
    // 창이 열려 있는 동안에는 알림을 미룬다(창의 윗부분을 가리지 않게). 창을 닫으면 그때 뜬다.
    R.ok(await pg.locator('.veil').count() > 0 || await pg.evaluate(() => PG.state().over), 'H: 진행했는데 창이 열리지 않음(알림을 미루는지 볼 수 없음)');   // 데뷔 전에 은퇴한 드문 커리어는 창 없이 은퇴 화면이다
    if (await pg.locator('.veil').count()) R.ok(await pg.evaluate(() => !document.getElementById('toast') || !document.getElementById('toast').classList.contains('on')) && await pg.evaluate(() => PG.achFresh().length > 0), 'H: 창이 열려 있는데 알림이 떴거나 알림 대기가 사라짐');
    for (let i = 0; i < 12 && await pg.locator('.veil').count(); i++) { await pg.evaluate(() => PG.resolve(PG.scene().type === 'offers' ? 'stay' : PG.scene().type === 'stove' ? 'stay' : ['event', 'cards', 'moment', 'pickOrg'].includes(PG.scene().type) ? 0 : undefined)); await pg.evaluate(() => PG_UI.render()); }
    const toast = await pg.evaluate(() => { const t = document.getElementById('toast'); return t ? [t.classList.contains('on'), t.textContent, t.getAttribute('role')] : null; }), got = await pg.evaluate(() => PG.achInfo().n);
    R.ok(got > 0 && toast && toast[0] && toast[1].includes('도전 과제 달성') && toast[2] === 'status', `H: 달성 알림 ${toast}`);
    await pg.reload(); await pg.waitForTimeout(200); await pg.click('[data-act=continue]'); await pg.waitForTimeout(100);
    R.ok(await pg.evaluate(() => !document.getElementById('toast') || !document.getElementById('toast').classList.contains('on')), 'H: 같은 달성이 다시 알림으로 뜸');
    await pg.goto(url); await pg.waitForTimeout(200); await pg.click('[data-act=hall]');
    R.ok(await pg.evaluate(() => document.activeElement.tagName) === 'H2', 'H: 기록실을 열 때 제목으로 초점이 가지 않음');
    await pg.click('[data-act=vt][data-id=ach]'); R.ok(await pg.locator('.achs li').count() === 21 && await pg.locator('.achs li.got').count() === got, 'H: 도전 과제 목록');
    R.ok(!pg.errs.length, `H: 스크립트 오류 ${pg.errs}`); await ctx.close();
  }
  // I. 새 화면들의 배치
  for (const [w, h] of [[320, 568], [390, 844], [768, 1024], [1280, 800]]) {
    const { ctx, pg } = await open(browser, url, { w, h, init: SEED_HALL }), m = auditor(pg);
    await career(pg, '가나다라마바사아자차'); await pg.waitForTimeout(150); await m('은퇴');
    await pg.locator('[data-act=endcard]').first().click(); await m('카드 생성 중'); await cardReady(pg); await m('카드'); await pg.screenshot({ path: path.join(out, `card-${w}.png`) });
    await pg.click('[data-act=back]'); await pg.click('[data-act=hall]'); await m('명예의 전당'); await pg.screenshot({ path: path.join(out, `hall-${w}.png`) });
    await pg.locator('.hcmp').nth(0).click(); await m('비교 1명'); await pg.locator('.hcmp').nth(1).click(); await m('비교 2명'); await pg.click('[data-act=compare]'); await m('비교'); await pg.click('[data-act=back]');
    for (const i of [0, 5]) { await pg.locator('.hmain').nth(i).click(); await m('상세'); await pg.click('[data-act=askdel]'); await m('삭제 확인'); await pg.click('[data-act=del]'); await m('되돌리기 안내'); await pg.click('[data-act=undo]'); await m('되돌린 뒤'); }
    await pg.click('[data-act=vt][data-id=ach]'); await m('도전 과제'); await pg.click('[data-act=vt][data-id=backup]'); await m('백업');
    await pg.setInputFiles('#impfile', bpath); await pg.waitForSelector('.impbox'); await m('복원 미리보기'); await pg.screenshot({ path: path.join(out, `import-${w}.png`), fullPage: true });
    fs.writeFileSync(path.join(tmp, 'bad.json'), 'x'); await pg.setInputFiles('#impfile', path.join(tmp, 'bad.json')); await pg.waitForTimeout(120); await m('복원 오류');
    await pg.evaluate(() => { const t = document.getElementById('toast') || Object.assign(document.body.appendChild(document.createElement('div')), { id: 'toast' }); t.textContent = '도전 과제 달성 — 1군 데뷔, 첫 승, 오늘의 주인공, 리그 우승, 세계 정상'; t.classList.add('on'); }); await pg.waitForTimeout(350); await m('알림');
    R.note(`${w}x${h}`, m.line()); R.ok(m.clean() && !pg.errs.length, `I ${w}x${h}: 배치 문제 — ${m.line()} ${pg.errs}`);
    await ctx.close();
  }
};
function sameSorted(a, b) { const c = v => (Array.isArray(v) ? v.map(c) : v && typeof v === 'object' ? Object.keys(v).sort().reduce((o, k) => { o[k] = c(v[k]); return o; }, {}) : v); try { return JSON.stringify(c(JSON.parse(a))) === JSON.stringify(c(JSON.parse(b))); } catch (e) { return false; } }
