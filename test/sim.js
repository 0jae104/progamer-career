// 자동 커리어 시뮬레이션: 오류와 밸런스 확인용.  node test/sim.js [횟수]
const G = require('../js/engine.js');
const N = +process.argv[2] || 500, scores = [], grades = {}, stat = { first: 0, world: 0, poy: 0, yrs: 0, peak: 0, g: 0 };
const ageOvr = {};
for (let i = 0; i < N; i++) {
  G.newGame({ nick: 'T' + i, region: ['kr', 'cn', 'eu', 'na'][i % 4], role: ['van', 'rov', 'core', 'gun', 'sup'][i % 5], trait: ['genius', 'grinder', 'brain'][i % 3] });
  let guard = 0, lastYear = 0;
  while (!G.state().over) {
    G.autoStep(); if (++guard > 20000) throw new Error('멈춤: ' + JSON.stringify(G.scene()));
    const s = G.state();
    if (s.year !== lastYear) { lastYear = s.year; (ageOvr[s.age] = ageOvr[s.age] || []).push(G.ovr()); }
    for (const k in s.stats) if (!isFinite(s.stats[k])) throw new Error('NaN ' + k);
  }
  const r = G.scene(); scores.push(r.score); grades[r.grade] = (grades[r.grade] || 0) + 1;
  if (r.g > 0) stat.first++; if (r.titles.some(t => t.tier === 'world')) stat.world++; if (r.awards.some(a => a.name === '올해의 선수')) stat.poy++;
  stat.yrs += r.years; stat.peak += r.peak; stat.g += r.g;
}
scores.sort((a, b) => b - a);
console.log('커리어', N, '| 1군 데뷔', stat.first, '| 월드 우승 경험', stat.world, '| 올해의 선수', stat.poy);
console.log('평균 선수 생활', (stat.yrs / N).toFixed(1), '년 | 평균 최고 OVR', (stat.peak / N).toFixed(1), '| 평균 1군 경기', (stat.g / N).toFixed(0));
console.log('등급', grades);
console.log('나이별 평균 OVR', Object.keys(ageOvr).map(a => a + ':' + (ageOvr[a].reduce((x, y) => x + y, 0) / ageOvr[a].length).toFixed(0) + '(' + ageOvr[a].length + ')').join(' '));
console.log('PCT', JSON.stringify([1, 3, 8, 16, 28, 42, 58, 74, 90].map(p => [scores[Math.floor(N * p / 100)], p])));
