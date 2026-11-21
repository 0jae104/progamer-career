// 화면 명령(data-act) 정적 검사: 같은 이름의 case 가 두 번 나오거나, 화면에 있는 명령을 처리하는 곳이 없으면 실패한다.
// 0.11.1에서 'auto'가 자동 관리 스위치와 승부처 "감독 판단" 두 곳에 쓰여 뒤쪽이 눌리지 않던 문제의 재발 방지.
//   node test/static.js
const fs = require('fs'), path = require('path');
const ui = fs.readFileSync(path.join(__dirname, '..', 'js', 'ui.js'), 'utf8');
const i0 = ui.indexOf("app.addEventListener('click'"), body = ui.slice(i0);
const cases = [...body.matchAll(/case '([a-z0-9-]+)':/gi)].map(m => m[1]);
const dup = cases.filter((c, i) => cases.indexOf(c) !== i);
const early = [...body.slice(0, body.indexOf('switch (a)')).matchAll(/a === '([a-z0-9-]+)'/gi)].map(m => m[1]);
const used = new Set([...ui.matchAll(/data-act="([a-z0-9-]+)"/gi)].map(m => m[1]));
const handled = new Set([...cases, ...early]);
const missing = [...used].filter(a => !handled.has(a)), unused = [...new Set(cases)].filter(c => !used.has(c));
console.log(`화면 명령 ${used.size}종 | 처리하는 case ${new Set(cases).size}종 | 중복 case ${dup.length ? dup.join(', ') : '없음'} | 처리하는 곳이 없는 명령 ${missing.length ? missing.join(', ') : '없음'} | 화면에 없는 case ${unused.length ? unused.join(', ') : '없음'}`);
if (dup.length || missing.length) { console.log('실패'); process.exit(1); }
console.log('통과');
