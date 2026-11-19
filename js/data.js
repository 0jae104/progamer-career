/* 프로게이머 키우기 — 게임 데이터
   이 파일의 리그·구단·선수·대회 이름은 모두 창작이며 실제 단체와 관계가 없습니다. */
(function (root) {
  const D = {};

  D.STATS = [
    { id: 'mech', name: '피지컬', tip: '손 빠르기와 정확도' },
    { id: 'reflex', name: '반응속도', tip: '순간 대응. 20대 중반부터 가장 먼저 꺾인다' },
    { id: 'sense', name: '판단력', tip: '판을 읽는 눈. 나이가 들어도 는다' },
    { id: 'team', name: '팀워크', tip: '콜과 호흡' },
    { id: 'mental', name: '멘탈', tip: '큰 무대와 연패를 버티는 힘' },
    { id: 'pool', name: '숙련 폭', tip: '다룰 수 있는 전략의 폭' },
  ];

  D.ROLES = [
    { id: 'van', name: '선봉', desc: '맨 앞에서 싸움을 여는 자리', w: { mech: .2, reflex: .12, sense: .2, team: .22, mental: .16, pool: .1 } },
    { id: 'rov', name: '유격', desc: '맵 전체를 누비며 판을 흔든다', w: { mech: .16, reflex: .16, sense: .28, team: .16, mental: .1, pool: .14 } },
    { id: 'core', name: '코어', desc: '팀의 중심에서 교전을 이끈다', w: { mech: .26, reflex: .18, sense: .2, team: .1, mental: .12, pool: .14 } },
    { id: 'gun', name: '사수', desc: '후반을 책임지는 최종 화력', w: { mech: .3, reflex: .24, sense: .14, team: .12, mental: .12, pool: .08 } },
    { id: 'sup', name: '지원', desc: '시야와 보호로 팀을 살린다', w: { mech: .1, reflex: .1, sense: .26, team: .28, mental: .12, pool: .14 } },
  ];

  D.TRAITS = [
    { id: 'genius', name: '천재형', desc: '피지컬·반응속도 한계가 높고 10대 성장이 빠르다. 멘탈은 약하게 시작한다.' },
    { id: 'grinder', name: '노력형', desc: '모든 성장이 18% 빠르고 컨디션 소모가 적다. 한계는 평범하다.' },
    { id: 'brain', name: '두뇌형', desc: '판단력·숙련 폭 한계가 높고 노쇠가 늦게 온다.' },
  ];

  D.PLANS = [
    { id: 'solo', name: '솔로 랭크', desc: '피지컬·반응속도 성장. 컨디션과 손목 소모가 크다', g: { mech: .9, reflex: .7, pool: .2 }, cond: -9, wrist: -3 },
    { id: 'scrim', name: '팀 스크림', desc: '팀워크·판단력 성장. 감독 신뢰가 오른다', g: { team: .9, sense: .5, mental: .2 }, cond: -7, wrist: -2, trust: 2.5 },
    { id: 'review', name: '리플레이 분석', desc: '판단력·숙련 폭 성장. 소모가 적다', g: { sense: .8, pool: .8 }, cond: -3, wrist: 0 },
    { id: 'rest', name: '휴식', desc: '컨디션과 손목 회복. 멘탈이 조금 오른다', g: { mental: .4 }, cond: 24, wrist: 5, base: .5 },
    { id: 'stream', name: '개인 방송', desc: '인기와 수입. 성장은 더디다', g: {}, cond: -4, wrist: -1, fame: 1.5, base: .6 },
  ];

  /* 밸런스 상수. 난이도와 커리어 길이를 정하는 숫자는 여기에 모아 둔다.
     바꾼 뒤에는 `node test/sim.js 3000 --seed=1` 로 target 범위와 비교한다(자동 진행 기준이며 사람은 더 잘한다). */
  D.BAL = {
    // ── 재능과 성장 ──
    talentSd: 8,       // 선수마다 다른 숨은 재능(모든 능력치 한계에 더해지는 값)의 표준편차. 클수록 커리어 간 격차가 커진다
    talentGrow: .1,    // 같은 재능이 성장 속도에 주는 영향(표준편차 1 만큼 재능이 높으면 성장이 이 비율만큼 빠르다)
    capBase: 64,       // 능력치 한계 = capBase + 재능 + 0~capRand 무작위 + 포지션 비중 × capRole
    capRand: 12,
    capRole: 22,
    growBase: .4,      // 계획과 상관없이 모든 능력치가 매달 오르는 기본량
    grinderGrow: 1.18, // 노력형의 성장 배율
    ageGrow: [[17, 1.35], [19, 1.15], [21, .85], [23, .55], [25, .3], [99, .15]],   // [이 나이까지, 성장 배율]
    // ── 리그 수준 ──
    orgShift: 5,       // 모든 구단 전력에 더하는 값. 올리면 데뷔·우승이 어려워지고 은퇴가 빨라진다
    // ── 승격과 강등 ──
    toSecondGap: 26,   // 2군 콜업: OVR 이 (구단 전력 − 이 값) 이상
    toSecondMonths: 5, //            입단 후 이 개월 수 이상
    toSecondTrust: 40, //            코치 평가가 이 값 이상
    toFirstGap: 2,     // 1군 콜업 심사 자격: OVR 이 (구단 전력 − 이 값) 이상
    toFirstTrust: 55,  //                      감독 신뢰가 이 값 이상
    slotBase: .1,      // 자격을 딱 채웠을 때 1군에 자리가 날 확률(심사 1회당)
    slotPerOvr: .07,   // 기준보다 OVR 1 높을 때마다 더해지는 확률
    slotMax: .9,
    demoteTrust: 25, demoteGap: 12,   // 1군에서 신뢰가 이 값 미만이고 OVR 이 (전력 − demoteGap) 미만이면 2군행
    traineeMaxAge: 19, // 이 나이의 스토브리그까지 2군에 못 오른 연습생은 방출
    secondMaxAge: 22,  // 이 나이의 스토브리그까지 1군에 못 오른 2군 선수는 방출
    secondRenewAge: 21,// 2군 재계약은 이 나이까지
    // ── 계약 제안 ──
    offerGap: 5,          // 1군 경력자: OVR 이 (구단 전력 − 이 값) 이상이면 1군 제안
    offerGapUnproven: -6,  // 1군 경력이 없는 선수에게는 더 엄격하다
    provenGames: 20,      // 1군 경기 수가 이 이상이면 경력자
    ageFrom: 24,          // 이 나이를 넘으면 한 살마다 요구 OVR 이 ageSlope 씩 오른다(제안·재계약 공통)
    ageSlope: 4,
    secondOfferAge: 21, secondOfferGap: 26,   // 2군 제안: 이 나이 이하, OVR 이 (전력 − 값) 이상
    traineeOfferAge: 18, traineeOfferGap: 42,
    tryoutBase: 30, tryoutPerOvr: 2, tryoutOvr: 58, tryoutAgeFrom: 22, tryoutAgeSlope: 9,   // 공개 테스트 합격 확률(%)
    retryMax: 1,          // 공개 테스트에 떨어져도 아카데미 재입단으로 다시 도전할 수 있는 횟수
    retryMaxAge: 23,
    // ── 노쇠 ──
    fadeFrom: 23,      // 이 나이를 넘으면 매년 능력치와 한계가 함께 내려간다(두뇌형 +1, 대기만성 +2)
    fadeReflex: [1.15, .8],   // 반응속도: (넘은 햇수 × 앞 값) + 뒤 값
    fadeMech: [.95, .4],    // 피지컬: 1년 늦게 시작
    fadeOther: 1.3,         // 나머지: 3년 늦게 시작, 매년 이 값
    fadeOtherDelay: 2,
    wristAge: .3,      // 24세를 넘으면 한 살마다 매달 손목이 이만큼 더 닳는다
    // ── 경기 ──
    impact: .26,       // 내가 출전했을 때 (내 OVR − 팀 전력) 이 팀 전력에 반영되는 비율
    // 포지션별 경기 영향력. 사수·코어는 전성기에 승패와 평점을 크게 움직이지만 반응속도 노쇠를 가장 먼저 맞고,
    // 지원은 영향이 작은 대신 오래 뛴다. impact 와 평점의 OVR 차이 항에 곱해진다.
    carry: { gun: 1.45, core: 1.3, rov: 1, van: 1.1, sup: .8 },
    // ── 이벤트 ──
    eventChance: .5,        // 매달 선택 이벤트가 나올 확률
    eventChanceTrainee: .5, // 경기가 없는 연습생 기간
    eventMemory: 7,          // 최근 이 개수의 이벤트는 다시 나오지 않는다
    // ── 라이벌(OVR 하나로 가볍게 진행한다) ──
    rivalGrow: .68,        // 매달 성장량의 기본값(나이 배율과 한계 대비 감속은 선수와 같은 식)
    rivalFade: .5,         // 노쇠: fadeFrom 을 넘은 햇수 × 이 값만큼 매년 OVR 이 내려간다
    rivalGapUnproven: 0,   // 1군 경력이 없는 라이벌이 다른 구단 1군에 가려면 OVR 이 (구단 전력 − 이 값) 이상(유망주라 선수 기준보다 너그럽다)
    rivalInjury: .006,     // 2군·1군 라이벌이 한 달에 부상을 당할 확률
    rivalSlump: .08,       // 1군 라이벌이 한 해 부진에 빠질 확률
    rivalAmbition: .15,     // 1군 라이벌이 스토브리그에 더 강한 팀으로 옮길 확률(갈 수 있는 팀이 있을 때)
    rivalNewsShare: .6,    // 라이벌에게 방금 일어난 일(콜업, 이적, 맞대결 결과, 부진, 복귀, 은퇴)에 대한 이벤트가 있을 때 그것을 고를 확률
    rivalEventShare: .3,   // 이벤트가 나올 때 라이벌 이벤트를 고를 확률(조건이 맞는 라이벌 이벤트가 있을 때)
    // ── 은퇴 등급: 커리어 점수가 이 값 이상이면 그 등급(자동 진행 분포에서 대략 상위 3, 7, 16, 31, 58, 85%) ──
    grades: [['S+', 93], ['S', 75], ['A', 55], ['B', 40], ['C', 28], ['D', 15], ['F', 0]],
    // ── 목표 범위(자동 진행 3000회 기준). test/sim.js 가 결과 옆에 충족 여부를 표시한다 ──
    target: { debut: [80, 90], retireAge: [28, 30], roleSpread: [0, 5], titles: [1.6, 2.4], poy: [0, 10] },
  };

  D.REGIONS = [
    { id: 'kr', name: '한국', lg: 'KGL', lgName: '코리아 그랜드 리그', pay: 1, nat: 86, natThr: 82 },
    { id: 'cn', name: '중국', lg: 'CGL', lgName: '차이나 그랜드 리그', pay: 1.5, nat: 85, natThr: 82 },
    { id: 'eu', name: '유럽', lg: 'ECL', lgName: '유럽 컨티넨탈 리그', pay: 1.15, nat: 79, natThr: 77 },
    { id: 'na', name: '북미', lg: 'NAC', lgName: '노스 아메리카 서킷', pay: 1.35, nat: 76, natThr: 74 },
  ];

  const orgs = {
    kr: [['한강 스펙터', 'HGS', 88, '#ff4d6d'], ['미리내 게이밍', 'MRN', 85, '#7c8cff'], ['청룡 유니온', 'CRU', 82, '#2fd3c4'], ['블랙 매그파이', 'BMP', 79, '#c9cde6'],
      ['문타이거즈', 'MTG', 76, '#ffb347'], ['새벽 이스포츠', 'SBE', 73, '#b98cff'], ['제로백 스쿼드', 'ZBS', 70, '#6fe07a'], ['솔트앤스틸', 'SNS', 67, '#8fb8d8']],
    cn: [['홍련 게이밍', 'HRG', 87, '#ff5a4d'], ['철판다 클럽', 'IPC', 84, '#e6e6e6'], ['구름용 이스포츠', 'CDE', 81, '#62e4ff'], ['진주강 워리어즈', 'PRW', 78, '#f5d0a9'],
      ['만리 가디언즈', 'MLG', 75, '#d8a657'], ['붉은등 게이밍', 'RLG', 72, '#ff8fa3'], ['황하 타이드', 'YRT', 69, '#e8c547'], ['비취 식스', 'JD6', 66, '#58d6a0']],
    eu: [['노르드 레이븐즈', 'NRV', 83, '#9fb4ff'], ['아틀라스 게이밍', 'ATL', 80, '#ffcf5c'], ['그레이울프 클럽', 'GWC', 77, '#aab2bd'], ['솔라리스 EC', 'SOL', 74, '#ff9f43'],
      ['블루 랜턴즈', 'BLT', 71, '#4da3ff'], ['아이언 튤립', 'IRT', 68, '#ff7ab8'], ['코발트 킹즈', 'CBK', 65, '#5c7cff'], ['미스트랄 식스', 'MS6', 63, '#8ee3f5']],
    na: [['레드우드 자이언츠', 'RWG', 81, '#d9534f'], ['썬더 바이슨', 'TBS', 78, '#f0ad4e'], ['네온 코요테', 'NCY', 75, '#e056fd'], ['메이플 가드', 'MPG', 72, '#ff6b5c'],
      ['데저트 호크스', 'DHK', 69, '#e1b382'], ['퍼시픽 웨이브', 'PCW', 67, '#48c9e5'], ['스틸 래쿤즈', 'STR', 64, '#95a5a6'], ['미드나잇 다이너', 'MND', 62, '#a29bfe']],
  };
  D.ORGS = [];
  for (const r in orgs) orgs[r].forEach((o, i) => D.ORGS.push({ id: r + i, region: r, name: o[0], tag: o[1], str: o[2] + D.BAL.orgShift, color: o[3] }));
  D.ORG = {}; D.ORGS.forEach(o => D.ORG[o.id] = o);
  D.REGION = {}; D.REGIONS.forEach(r => D.REGION[r.id] = r);

  D.SHOP = [
    { id: 'gear', name: '장비 세팅', desc: '피지컬·반응속도 성장 +5% (단계당)', cost: [200, 600, 1500, 4000, 9000] },
    { id: 'coach', name: '개인 코치', desc: '판단력·팀워크·숙련 폭 성장 +5% (단계당)', cost: [300, 900, 2200, 5500, 12000] },
    { id: 'care', name: '식단·수면 관리', desc: '매달 컨디션 +1.5 (단계당)', cost: [250, 700, 1800, 4500, 10000] },
    { id: 'physio', name: '손목 물리치료', desc: '손목 +25. 한 달에 한 번', once: true, cost: [180] },
    { id: 'counsel', name: '심리 상담', desc: '멘탈 +1, 컨디션 +12. 한 달에 한 번', once: true, cost: [220] },
  ];

  // r: 0 일반, 1 희귀, 2 영웅, 3 전설
  D.RARITY = ['일반', '희귀', '영웅', '전설'];
  D.CARDS = [
    { id: 'c_mech', r: 0, name: '반복 숙달', desc: '피지컬 +2', fx: { mech: 2 } },
    { id: 'c_reflex', r: 0, name: '순발력 드릴', desc: '반응속도 +2', fx: { reflex: 2 } },
    { id: 'c_sense', r: 0, name: '리플레이 노트', desc: '판단력 +2', fx: { sense: 2 } },
    { id: 'c_team', r: 0, name: '합숙 훈련', desc: '팀워크 +2', fx: { team: 2 } },
    { id: 'c_mental', r: 0, name: '명상 루틴', desc: '멘탈 +2', fx: { mental: 2 } },
    { id: 'c_pool', r: 0, name: '서브 전략 연습', desc: '숙련 폭 +2', fx: { pool: 2 } },
    { id: 'p_steel', r: 1, name: '강철 손목', desc: '손목 소모가 절반으로 줄어든다', perk: 'steel' },
    { id: 'p_star', r: 1, name: '스타 기질', desc: '인기 상승 +50%', perk: 'star' },
    { id: 'p_grind', r: 1, name: '연습벌레', desc: '솔로 랭크 훈련 효과 +30%', perk: 'grind' },
    { id: 'p_glue', r: 1, name: '팀의 접착제', desc: '감독 신뢰 상승 +30%', perk: 'glue' },
    { id: 'c_cap', r: 1, name: '한계 확장', desc: '모든 능력치 한계 +2', fx: { cap: 2 } },
    { id: 'c_duo', r: 1, name: '비시즌 특훈', desc: '피지컬 +2, 판단력 +2', fx: { mech: 2, sense: 2 } },
    { id: 'p_clutch', r: 2, name: '클러치 본능', desc: '플레이오프·국제전 평점 +0.4', perk: 'clutch' },
    { id: 'p_late', r: 2, name: '대기만성', desc: '노쇠가 2년 늦게 시작된다', perk: 'late' },
    { id: 'p_nerve', r: 2, name: '강심장', desc: '모든 선택의 성공 확률 +8%', perk: 'nerve' },
    { id: 'c_all', r: 2, name: '전천후', desc: '모든 능력치 +1, 한계 +2', fx: { all: 1, cap: 2 } },
    { id: 'p_form', r: 3, name: '불멸의 폼', desc: '컨디션이 55 아래로 떨어지지 않는다', perk: 'form' },
    { id: 'p_dynasty', r: 3, name: '왕조의 설계자', desc: '내가 출전하면 팀 전력 +2', perk: 'dynasty' },
    { id: 'c_gift', r: 3, name: '시대의 재능', desc: '모든 한계 +4, 피지컬·반응속도 +3', fx: { cap: 4, mech: 3, reflex: 3 } },
  ];

  /* 이벤트. chk: { base, 능력치: 계수, trust: 계수 } 가 있으면 확률 판정, 없으면 확정 결과(ok). */
  const isTr = s => s.squad === 'trainee', isPro = s => s.squad !== 'trainee', isFirst = s => s.squad === 'first';
  // 라이벌 이벤트용: 활동 중인 라이벌, 같은 구단 여부, 스쿼드 순서
  const act = s => (s.rivals || []).filter(r => !r.retired), mate = (s, r) => r.org === s.org, RQ = { trainee: 0, second: 1, first: 2 };
  // 알림 표시(일어난 연차)가 올해나 지난해 것일 때만 소식으로 다룬다. 오래된 일을 방금 일어난 것처럼 말하지 않게 한다.
  const fresh = (s, y) => !!y && y >= s.year - 1;
  D.EVENTS = [
    { id: 'parents', once: true, when: s => isTr(s) && s.age <= 17, title: '부모님의 반대',
      text: '성적표를 본 부모님이 연습을 그만두고 공부하라고 하신다.',
      c: [
        { label: '다음 평가 결과로 증명하겠다고 약속한다', chk: { base: 45, mental: .6, mech: .3 },
          ok: { t: '평가전에서 눈에 띄는 플레이를 보여 드렸다. 한 시즌 더 지켜보기로 하셨다.', fx: { mental: 2, cond: 5 } },
          no: { t: '평가전을 망쳤다. 집안 분위기가 무겁다.', fx: { mental: -2, cond: -8 } } },
        { label: '공부도 병행하겠다고 타협한다', ok: { t: '잠을 줄여 둘 다 해내기로 했다.', fx: { sense: 1, cond: -6 } } },
      ] },
    { id: 'pcbang', when: s => s.age <= 18, title: '동네 대회',
      text: 'PC방 사장님이 주말 아마추어 대회 포스터를 건넨다. 상금도 있다.',
      c: [
        { label: '출전해서 우승을 노린다', chk: { base: 50, mech: .8, reflex: .3 },
          ok: { t: '결승에서 역전승. 동네에서 이름이 돌기 시작했다.', fx: { fame: 2, money: 50, mental: 1 } },
          no: { t: '4강에서 대학생 팀에 막혔다.', fx: { mental: -1 } } },
        { label: '연습 일정을 지킨다', ok: { t: '평소처럼 연습실로 갔다.', fx: { mech: .5 } } },
      ] },
    { id: 'evalmatch', when: isTr, title: '월말 평가전',
      text: '코치진이 지켜보는 연습생 평가전. 어떤 모습을 보여 줄까.',
      c: [
        { label: '과감한 개인기로 눈도장을 찍는다', chk: { base: 40, mech: .8, reflex: .4 },
          ok: { t: '하이라이트 장면을 만들었다. 코치가 이름을 물어봤다.', fx: { trust: 10, fame: 1 } },
          no: { t: '무리한 진입으로 판을 그르쳤다.', fx: { trust: -5 } } },
        { label: '안정적인 팀플레이에 집중한다', chk: { base: 60, team: .6, sense: .3 },
          ok: { t: '실수 없는 경기. 성실하다는 평가를 받았다.', fx: { trust: 5 } },
          no: { t: '존재감이 없었다는 피드백을 들었다.', fx: { trust: -2 } } },
      ] },
    { id: 'clash', when: isPro, title: '전략 회의에서의 충돌',
      text: '감독이 내놓은 전략에 구멍이 보인다. 회의실이 조용하다.',
      c: [
        { label: '근거를 들어 다른 안을 제시한다', chk: { base: 35, sense: .9, trust: .5 },
          ok: { t: '감독이 고개를 끄덕였다. 내 안이 채택됐다.', fx: { trust: 8, sense: 1 } },
          no: { t: '"네 자리 일이나 잘해." 분위기만 싸해졌다.', fx: { trust: -8 } } },
        { label: '일단 따른다', ok: { t: '입을 다물었다. 찜찜함은 남았다.', fx: { trust: 2, mental: -1 } } },
      ] },
    { id: 'ladder', when: () => true, title: '랭킹 1위 도전',
      text: '솔로 랭크 1위까지 몇 판 남지 않았다. 지금 새벽 두 시다.',
      c: [
        { label: '오늘 밤 끝장을 본다', chk: { base: 30, mech: .8, reflex: .5 },
          ok: { t: '새벽 다섯 시, 랭킹 1위. 커뮤니티가 떠들썩하다.', fx: { fame: 5, mech: 1, cond: -10 } },
          no: { t: '연패에 빠져 점수만 잃었다.', fx: { cond: -15, mental: -1 } } },
        { label: '내일을 위해 잔다', ok: { t: '푹 잤다. 몸이 가볍다.', fx: { cond: 5 } } },
      ] },
    { id: 'hate', when: s => isFirst(s) && s.fame >= 15, title: '악성 댓글',
      text: '패배 직후 커뮤니티가 내 이름으로 도배됐다.',
      c: [
        { label: '전부 읽어 본다', chk: { base: 25, mental: 1 },
          ok: { t: '비난 속에서 쓸 만한 지적을 골라냈다.', fx: { mental: 3, sense: 1 } },
          no: { t: '밤새 휴대폰을 놓지 못했다.', fx: { mental: -3, cond: -10 } } },
        { label: '휴대폰을 끄고 연습실로 간다', ok: { t: '손이 기억하는 대로 연습했다.', fx: { mech: .5, cond: -3 } } },
        { label: '팬들에게 사과 글을 올린다', ok: { t: '응원 댓글이 조금씩 달렸다.', fx: { fame: 2, mental: -1 } } },
      ] },
    { id: 'patch', when: isPro, title: '대격변 패치',
      text: '시즌 중 대형 패치. 주력으로 쓰던 전략이 통째로 바뀌었다.',
      c: [
        { label: '새 메타를 처음부터 파고든다', chk: { base: 40, pool: .9, sense: .4 },
          ok: { t: '남들보다 먼저 답을 찾았다. 당분간 한발 앞선다.', fx: { pool: 3, buff: [.3, 2] } },
          no: { t: '갈피를 못 잡고 시간만 썼다.', fx: { cond: -8, buff: [-.3, 1] } } },
        { label: '익숙한 플레이를 고수한다', ok: { t: '효율은 떨어졌지만 흔들리지는 않았다.', fx: { mental: 1, buff: [-.15, 1] } } },
      ] },
    { id: 'conflict', when: isPro, title: '팀 내 불화',
      text: '스크림 도중 동료 둘이 언성을 높였다. 헤드셋 너머가 싸늘하다.',
      c: [
        { label: '중재에 나선다', chk: { base: 40, team: .9, mental: .3 },
          ok: { t: '둘 다 한발씩 물러섰다. 팀이 나를 다시 봤다.', fx: { trust: 6, team: 2 } },
          no: { t: '"넌 빠져." 불똥이 튀었다.', fx: { trust: -4, mental: -1 } } },
        { label: '모른 척한다', ok: { t: '어색한 분위기가 며칠 이어졌다.', fx: { team: -1 } } },
      ] },
    { id: 'ad', when: s => s.fame >= 30, title: '광고 촬영 제의',
      text: '게이밍 기어 브랜드에서 모델 제의가 왔다. 촬영은 이틀이 걸린다.',
      c: [
        { label: '수락한다', ok: { t: '촬영은 길었지만 통장은 든든해졌다.', fx: { money: 'ad', fame: 3, cond: -10 } } },
        { label: '시즌에 집중하겠다고 거절한다', ok: { t: '감독이 그 얘기를 전해 들었다.', fx: { trust: 3 } } },
      ] },
    { id: 'rival', when: isFirst, title: '라이벌의 도발',
      text: '상대 팀 에이스가 인터뷰에서 나를 지목했다. "그 선수, 과대평가됐죠."',
      c: [
        { label: '인터뷰로 맞받아친다', chk: { base: 45, mech: .5, mental: .6 },
          ok: { t: '말한 대로 경기에서 눌러 버렸다. 팬들이 열광한다.', fx: { fame: 6, buff: [.4, 1] } },
          no: { t: '큰소리친 경기에서 완패했다.', fx: { fame: -2, mental: -2, buff: [-.3, 1] } } },
        { label: '"경기로 답하겠다"고만 한다', ok: { t: '담담하게 준비했다.', fx: { mental: 1, fame: 1 } } },
      ] },
    { id: 'wrist', when: s => s.wrist < 60, title: '손목 통증',
      text: '마우스를 쥘 때마다 손목이 시큰거린다.',
      c: [
        { label: '병원에서 정밀 검사를 받는다 (150만)', need: 150, ok: { t: '초기에 잡았다. 치료와 스트레칭을 처방받았다.', fx: { money: -150, wrist: 22, cond: 5 } } },
        { label: '참고 뛴다', chk: { base: 50, mental: .5 },
          ok: { t: '티 내지 않고 버텼다. 감독은 투지를 높이 샀다.', fx: { trust: 4, wrist: -4 } },
          no: { t: '통증이 심해졌다.', fx: { wrist: -20, cond: -10 } } },
      ] },
    { id: 'rookie', when: s => isFirst(s) && s.age >= 22, title: '무서운 신인',
      text: '2군에서 올라온 열일곱 살이 내 자리를 노린다. 스크림 성적이 심상치 않다.',
      c: [
        { label: '맞대결 스크림을 제안한다', chk: { base: 45, mech: .6, sense: .5 },
          ok: { t: '경험의 차이를 보여 줬다.', fx: { trust: 8 } },
          no: { t: '신인의 손이 더 빨랐다.', fx: { trust: -10, mental: -1 } } },
        { label: '내 노하우를 가르쳐 준다', ok: { t: '팀은 강해졌고, 나는 선배가 됐다.', fx: { team: 2, trust: 3, fame: 1 } } },
      ] },
    { id: 'bootcamp', when: s => isPro(s) && s.money >= 500, title: '해외 부트캠프',
      text: '비시즌 강팀들이 모이는 해외 부트캠프. 개인 참가비는 500만이다.',
      c: [
        { label: '자비로 참가한다 (500만)', need: 500, ok: { t: '세계 정상급과 2주를 부딪쳤다.', fx: { money: -500, mech: 1, sense: 1, pool: 1, cond: -8 } } },
        { label: '국내에서 훈련한다', ok: { t: '익숙한 연습실에서 시간을 보냈다.', fx: { cond: 3 } } },
      ] },
    { id: 'collab', when: s => s.fame >= 10, title: '합동 방송 제의',
      text: '유명 스트리머가 합동 방송을 제안했다. 시청자가 몇만 명은 될 것이다.',
      c: [
        { label: '출연한다', ok: { t: '채팅창이 터졌다. 감독은 썩 좋아하지 않았다.', fx: { fame: 4, money: 'collab', cond: -5, trust: -2 } } },
        { label: '거절한다', ok: { t: '연습 일정을 지켰다.', fx: { trust: 1 } } },
      ] },
    { id: 'bench', when: s => isFirst(s) && s.trust < 45, title: '벤치의 시간',
      text: '오늘도 출전 명단에 내 이름이 없다.',
      c: [
        { label: '감독에게 면담을 요청한다', chk: { base: 35, mental: .5, trust: .6 },
          ok: { t: '"다음 경기, 준비해." 기회를 약속받았다.', fx: { trust: 10 } },
          no: { t: '"기회는 내가 정한다."', fx: { trust: -5 } } },
        { label: '솔로 랭크 성적으로 증명한다', chk: { base: 40, mech: .8 },
          ok: { t: '랭킹 최상위권을 찍었다. 코치진이 술렁인다.', fx: { trust: 7, fame: 2 } },
          no: { t: '조급함에 점수만 잃었다.', fx: { cond: -8 } } },
        { label: '2군 경기 출전을 자청한다', ok: { t: '경기 감각을 지켰다.', fx: { sense: 1, team: 1, trust: 2 } } },
      ] },
    { id: 'slump', when: s => isPro(s) && s.car.g + s.car.g2 > 20, title: '슬럼프',
      text: '뭘 해도 안 풀린다. 손이 머리를 못 따라간다.',
      c: [
        { label: '기본기부터 다시 다진다', chk: { base: 45, mental: .8 },
          ok: { t: '지루한 반복 끝에 감각이 돌아왔다.', fx: { mech: 1, mental: 2 } },
          no: { t: '오히려 생각이 많아졌다.', fx: { cond: -10, mental: -1 } } },
        { label: '며칠 쉬고 온다', ok: { t: '바다를 보고 왔다.', fx: { cond: 15, trust: -3 } } },
      ] },
    { id: 'interview', when: s => isFirst(s) && s.car.g > 5, title: '방송 인터뷰',
      text: '승리 팀 인터뷰. 마이크가 내 앞으로 왔다.',
      c: [
        { label: '팀원들에게 공을 돌린다', ok: { t: '동료들이 뒤에서 웃고 있다.', fx: { trust: 4, team: 1 } } },
        { label: '"우승은 우리 겁니다"라고 선언한다', ok: { t: '클립이 퍼졌다. 감독은 한숨을 쉬었다.', fx: { fame: 4, trust: -2 } } },
      ] },
    { id: 'fanletter', when: s => s.fame >= 20, title: '팬레터',
      text: '숙소로 손편지 한 통이 왔다. "선수님 경기 보고 다시 힘냈어요."',
      c: [
        { label: '답장을 쓴다', ok: { t: '내가 왜 이 일을 하는지 떠올랐다.', fx: { mental: 2, fame: 1, cond: -2 } } },
        { label: '마음만 받고 연습한다', ok: { t: '편지는 모니터 옆에 붙여 뒀다.', fx: { mech: .5, mental: 1 } } },
      ] },
    /* ── 연습생·2군 구간 이벤트 (3단계) ── once: 커리어에 한 번만 나온다 */
    { id: 'roommate', when: isTr, title: '잠들지 않는 숙소',
      text: '같은 방 연습생이 새벽 네 시까지 키보드를 두드린다. 벌써 일주일째다.',
      c: [
        { label: '나도 일어나 같이 연습한다', ok: { t: '둘이서 새벽 랭크를 돌렸다. 손은 빨라졌고 눈 밑은 검어졌다.', fx: { mech: 1, reflex: .5, cond: -10 } } },
        { label: '숙소 규칙을 정하자고 말을 꺼낸다', chk: { base: 50, team: .7, mental: .3 },
          ok: { t: '자정 이후에는 연습실을 쓰기로 했다. 사이도 나빠지지 않았다.', fx: { team: 1.5, cond: 6 } },
          no: { t: '"불만이면 방을 바꾸든가." 서먹해졌다.', fx: { team: -1, cond: -4 } } },
        { label: '귀마개를 산다', ok: { t: '잠은 지켰다.', fx: { cond: 4 } } },
      ] },
    { id: 'mentor', when: isTr, title: '1군 선배의 한마디',
      text: '복도에서 마주친 1군 주전이 내 평가전 영상을 봤다고 한다. "시간 되면 같이 볼래?"',
      c: [
        { label: '지금 바로 따라간다', ok: { t: '한 시간 동안 실수 스무 개를 짚어 줬다. 아프지만 전부 맞는 말이었다.', fx: { sense: 1.5, pool: .5, mental: -1 } } },
        { label: '질문을 준비해서 내일 찾아간다', chk: { base: 55, sense: .6, mental: .3 },
          ok: { t: '준비해 간 질문에 선배가 놀랐다. 코치 귀에도 들어갔다.', fx: { sense: 2, trust: 5 } },
          no: { t: '다음 날 선배는 원정을 떠나고 없었다.', fx: { mental: -1 } } },
      ] },
    { id: 'cut', when: s => isTr(s) && s.monthsInOrg >= 3, title: '중간 심사',
      text: '코치가 공지를 붙였다. 이번 달 심사에서 연습생 열두 명 중 넷이 나간다.',
      c: [
        { label: '남은 기간 가장 약한 부분만 판다', ok: { t: '약점이 눈에 띄게 줄었다는 평가를 받았다.', fx: { weak: 2, trust: 3, cond: -6 } } },
        { label: '가장 자신 있는 무기를 더 날카롭게 간다', chk: { base: 45, mech: .6, reflex: .4 },
          ok: { t: '심사 경기에서 그 무기 하나로 판을 끝냈다.', fx: { trust: 9, mech: 1 } },
          no: { t: '무기는 통했지만 약점도 그대로 드러났다.', fx: { trust: -3 } } },
        { label: '같이 남고 싶은 동료와 호흡을 맞춘다', chk: { base: 50, team: .8 },
          ok: { t: '둘 다 남았다.', fx: { trust: 6, team: 1.5 } },
          no: { t: '나는 남았고 동료는 짐을 쌌다.', fx: { trust: 2, mental: -2 } } },
      ] },
    { id: 'subcall', when: isTr, title: '2군 스크림 대타',
      text: '2군 선수 하나가 몸살로 빠졌다. 코치가 연습생 방 문을 연다. "지금 들어올 수 있는 사람?"',
      c: [
        { label: '손을 든다', chk: { base: 42, reflex: .5, team: .5, mental: .3 },
          ok: { t: '형들 사이에서 제 몫을 했다. 2군 코치가 이름을 적어 갔다.', fx: { trust: 9, sense: 1 } },
          no: { t: '속도를 따라가지 못했다. 그래도 손을 든 것은 기억해 줄 것이다.', fx: { trust: -2, mental: -1, sense: .5 } } },
        { label: '아직 이르다. 뒤에서 지켜본다', ok: { t: '2군의 속도를 눈에 담았다.', fx: { sense: .5 } } },
      ] },
    { id: 'homesick', once: true, when: s => isTr(s) && s.age <= 17, title: '집 생각',
      text: '엄마가 저녁상 사진을 보냈다. 숙소 생활 몇 달째, 주말 외출은 평가에 반영된다는 소문이 있다.',
      c: [
        { label: '주말에 집에 다녀온다', ok: { t: '집밥을 먹고 푹 잤다. 코치는 아무 말도 하지 않았다.', fx: { cond: 16, mental: 1, trust: -2 } } },
        { label: '영상 통화만 하고 연습실에 남는다', chk: { base: 50, mental: .9 },
          ok: { t: '통화를 끊고 나니 오히려 마음이 단단해졌다.', fx: { mental: 2, trust: 2 } },
          no: { t: '연습이 손에 잡히지 않았다.', fx: { cond: -8, mental: -1 } } },
      ] },
    { id: 'sleep', when: s => !isFirst(s) && s.cond < 70, title: '수면 기록',
      text: '트레이너가 내 수면 기록을 보고 고개를 젓는다. "이대로면 반응속도부터 떨어진다."',
      c: [
        { label: '한 달간 자정 전에 눕는다', ok: { t: '아침 연습의 집중력이 달라졌다.', fx: { cond: 14, reflex: .5 } } },
        { label: '새벽 연습은 포기 못 한다', ok: { t: '연습량은 지켰다. 손목이 조금 뻐근하다.', fx: { mech: 1, cond: -6, wrist: -4 } } },
      ] },
    { id: 'debut2', once: true, when: s => s.squad === 'second' && s.car.g2 < 4, title: '첫 공식전',
      text: '넥스트 리그 데뷔전. 관중석은 듬성듬성하지만 중계 카메라는 돌아간다. 손에 땀이 찬다.',
      c: [
        { label: '첫 교전부터 과감하게 간다', chk: { base: 42, mech: .6, mental: .5 },
          ok: { t: '첫 득점을 올리자 긴장이 사라졌다.', fx: { buff: [.4, 1], trust: 4, fame: 1 } },
          no: { t: '첫 교전에서 잘렸다. 한동안 손이 굳었다.', fx: { buff: [-.3, 1], mental: -1 } } },
        { label: '콜을 잘 듣고 실수 없이 간다', chk: { base: 58, team: .6 },
          ok: { t: '눈에 띄지는 않았지만 실수도 없었다.', fx: { trust: 3, buff: [.15, 1] } },
          no: { t: '콜을 놓쳐 한 번 크게 잘렸다.', fx: { trust: -2 } } },
      ] },
    { id: 'watch', when: s => s.squad === 'second', title: '1군 감독의 참관',
      text: '오늘 2군 경기에 1군 감독이 와 있다. 다들 평소보다 말이 없다.',
      c: [
        { label: '눈에 띄는 장면을 만든다', chk: { base: 38, mech: .7, reflex: .4 },
          ok: { t: '감독이 수첩에 무언가를 적었다.', fx: { trust: 10, fame: 1 } },
          no: { t: '무리한 플레이가 두 번. 감독은 일찍 자리를 떴다.', fx: { trust: -5 } } },
        { label: '팀이 이기는 플레이를 한다', chk: { base: 52, team: .5, sense: .5 },
          ok: { t: '"저 친구, 판을 볼 줄 아네." 그 말이 전해졌다.', fx: { trust: 7 } },
          no: { t: '무난했다. 기억에 남지는 않았을 것이다.', fx: { trust: 1 } } },
      ] },
    { id: 'scout', once: true, when: s => s.squad === 'second' && s.yr && s.yr.g >= 12 && s.yr.rs / s.yr.g >= 6.8, title: '낯선 번호',
      text: '다른 구단 스카우터라는 사람이 연락해 왔다. "우리 1군에 자리가 날 수도 있습니다. 관심 있습니까?"',
      c: [
        { label: '관심 있다고 답한다', ok: { t: '스토브리그에 다시 이야기하기로 했다. 다만 소문은 금방 돈다.', fx: { flag: 'scout', trust: -4 } } },
        { label: '감독에게 먼저 알린다', ok: { t: '감독이 고개를 끄덕였다. "말해 줘서 고맙다."', fx: { trust: 6 } } },
      ] },
    { id: 'vet2', when: s => s.squad === 'second', title: '2군에 내려온 베테랑',
      text: '지난 시즌까지 1군 주전이던 선배가 2군 연습실에 앉아 있다. 나와 같은 포지션이다.',
      c: [
        { label: '옆자리에 앉아 배운다', ok: { t: '화면을 보는 순서부터 달랐다.', fx: { sense: 1.5, pool: 1 } } },
        { label: '스크림에서 정면으로 붙어 본다', chk: { base: 40, mech: .7, reflex: .5 },
          ok: { t: '내가 이겼다. 코치진의 눈빛이 달라졌다.', fx: { trust: 8, mental: 1 } },
          no: { t: '노련함에 말렸다. 그래도 배운 것은 있다.', fx: { trust: -2, sense: 1 } } },
      ] },
    { id: 'duo', when: s => !isFirst(s), title: '우연한 매칭',
      text: '솔로 랭크에서 우리 구단 1군 주전과 같은 팀이 됐다. 상대는 내 아이디를 모른다.',
      c: [
        { label: '평소대로 내 플레이를 한다', chk: { base: 48, mech: .6, sense: .4 },
          ok: { t: '경기 뒤 친구 신청이 왔다. "너 우리 팀 소속이라며?"', fx: { trust: 6, fame: 1 } },
          no: { t: '긴장해서 경기를 그르쳤다. 채팅창이 조용했다.', fx: { mental: -1 } } },
        { label: '주전의 움직임에 맞춰 준다', chk: { base: 58, team: .8 },
          ok: { t: '"받쳐 주는 거 좋네." 한 줄 칭찬을 받았다.', fx: { trust: 4, team: 1 } },
          no: { t: '맞추려다 내 플레이가 사라졌다.', fx: { mental: -.5 } } },
      ] },
    /* ── 라이벌 이벤트 (4단계) ──
       rv(s, H): 이 사건의 상대가 될 라이벌을 고른다. 없으면 사건이 나오지 않는다. H 는 엔진이 주는 도우미(이번 달 상대 구단 등).
       make: 라이벌이 없는 커리어(예전 저장)에서 리그의 맞수를 새로 만든다.
       문구의 {r} 은 라이벌 아이디, {org} 는 라이벌의 소속 구단으로 바뀐다. 조사가 받침에 따라 달라지지 않게 "{r}의, {r}에게, {r}도, {r} 쪽" 꼴만 쓴다.
       news: 방금 일어난 일에 대한 반응이라 제때 나오도록 우선한다. max: 한 커리어에서 이 사건이 나오는 최대 횟수. rel: [경쟁심 변화, 존중 변화]. shown(s, r): 사건이 화면에 나올 때 한 번 실행(알림 표시를 지운다). */
    { id: 'rv_rank', max: 2, rv: s => isTr(s) && act(s).find(r => mate(s, r) && r.squad === 'trainee'), title: '순위표',
      text: '이번 달 평가전 순위표가 붙었다. 내 이름 가까이에 {r}의 이름이 있다. 동기들은 벌써 둘을 묶어서 부른다.',
      c: [
        { label: '{r}에게 같이 리플레이를 보자고 한다', ok: { t: '서로의 실수를 번갈아 짚었다. 생각보다 말이 잘 통했다.', fx: { sense: 1 }, rel: [0, 8] } },
        { label: '다음 달 목표를 "{r}보다 위"로 잡는다', chk: { base: 45, mech: .5, mental: .5 },
          ok: { t: '다음 평가전에서 한 칸 위에 이름을 올렸다. {r}의 표정이 굳었다.', fx: { trust: 5, mental: 1 }, rel: [8, 0] },
          no: { t: '의식할수록 손이 굳었다. 순위는 그대로였다.', fx: { mental: -1 }, rel: [5, 0] } },
      ] },
    { id: 'rv_cut', max: 1, rv: s => isTr(s) && s.monthsInOrg >= 3 && act(s).find(r => mate(s, r) && r.squad === 'trainee'), title: '둘 중 하나',
      text: '중간 심사 마지막 경기에서 {r}도 같은 팀에 배정됐다. 코치가 말했다. "이 팀에서는 한 명만 눈여겨본다."',
      c: [
        { label: '{r}의 플레이가 살도록 받쳐 준다', chk: { base: 50, team: .8 },
          ok: { t: '둘 다 좋은 평가를 받았다. {r} 쪽에서 먼저 주먹을 내밀었다.', fx: { trust: 5, team: 1 }, rel: [0, 10] },
          no: { t: '{r}만 돋보였다. 고맙다는 말은 들었다.', fx: { trust: -2 }, rel: [2, 6] } },
        { label: '내가 돋보이는 플레이를 한다', chk: { base: 45, mech: .6, reflex: .4 },
          ok: { t: '코치의 눈은 내 쪽에 머물렀다. {r}도 말없이 헤드셋을 벗었다.', fx: { trust: 9 }, rel: [10, -5] },
          no: { t: '욕심이 판을 그르쳤다. {r}의 눈빛이 차갑다.', fx: { trust: -3 }, rel: [6, -6] } },
      ] },
    { id: 'rv_night', max: 2, rv: s => !isFirst(s) && act(s).find(r => mate(s, r) && r.squad === s.squad && r.rv >= 25), title: '새벽 연습실',
      text: '새벽 두 시, 연습실에 불이 켜져 있다. {r}의 자리다. 눈이 마주치자 턱짓을 한다. "한 판 할래?"',
      c: [
        { label: '받아들인다 (연습이라 전적에는 남지 않는다)', chk: { base: 45, mech: .6, reflex: .5 },
          ok: { t: '세 판을 내리 이겼다. {r}의 입에서 "한 판 더"가 나왔다.', fx: { mech: 1, mental: 1, cond: -6 }, rel: [6, 4] },
          no: { t: '내리 졌다. 분해서 잠이 오지 않았다.', fx: { mech: .5, cond: -8 }, rel: [8, 2] } },
        { label: '옆자리에 앉아 각자 연습한다', ok: { t: '말은 없었지만 둘 다 해가 뜰 때까지 남았다.', fx: { mech: .5, cond: -5 }, rel: [2, 5] } },
      ] },
    { id: 'rv_favor', max: 1, rv: s => !isFirst(s) && act(s).find(r => mate(s, r) && r.squad === s.squad && r.rs >= 30), title: '{r}의 부탁',
      text: '{r}에게서 메시지가 왔다. "손목이 좀 안 좋아. 내일 평가 경기 순서 좀 바꿔 줄 수 있어? 코치님한테는 말하지 말고."',
      c: [
        { label: '순서를 바꿔 준다', ok: { t: '{r}에게 하루를 벌어 줬다. 내 컨디션 조절은 조금 꼬였다.', fx: { cond: -5 }, rel: [-3, 10] } },
        { label: '코치에게 알린다', ok: { t: '코치는 고맙다고 했다. {r}의 답장은 오지 않았다.', fx: { trust: 4 }, rel: [8, -10] } },
        { label: '거절하고 스트레칭 영상을 보내 준다', ok: { t: '"…고맙다." 짧은 답장이 왔다.', fx: {}, rel: [0, 4] } },
      ] },
    { id: 'rv_ahead', news: true, rv: s => act(s).find(r => fresh(s, r.f.ahead) && RQ[r.squad] > RQ[s.squad]), shown: (s, r) => { r.f.ahead = 0; }, title: '먼저 간 사람',
      text: (s, r) => r.squad === 'first' ? '{r}의 1군 콜업 소식이 올라왔다. 나는 아직 ' + (s.squad === 'second' ? '2군 숙소' : '연습생 방') + '에 있다.' : '{r}의 2군 콜업이 발표됐다. 같은 날 입단했는데, 방을 먼저 옮긴 것은 저쪽이다.',
      c: [
        { label: '축하 메시지를 보낸다', ok: { t: '"금방 올라와. 기다린다." 답장이 왔다.', fx: { mental: 1 }, rel: [0, 8] } },
        { label: '말없이 연습량을 늘린다', ok: { t: '한 달 동안 연습실 불을 가장 늦게 껐다.', fx: { mech: 1, cond: -8 }, rel: [8, 0] } },
        { label: '"금방 따라간다"고 보낸다', chk: { base: 50, mental: .8 },
          ok: { t: '보내고 나니 오히려 마음이 가벼워졌다.', fx: { mental: 2 }, rel: [6, 3] },
          no: { t: '보내 놓고 며칠을 초조해했다.', fx: { mental: -2 }, rel: [6, 0] } },
      ] },
    { id: 'rv_scrim', max: 2, rv: s => s.squad === 'second' && act(s).find(r => !mate(s, r) && r.squad !== 'trainee' && !r.out), title: '스크림 상대',
      text: '오늘 스크림 상대는 {org}. 상대 로스터에 낯익은 아이디가 있다. {r}.',
      c: [
        { label: '전력으로 누른다 (스크림이라 전적에는 남지 않는다)', chk: { base: 45, mech: .5, sense: .5 },
          ok: { t: '연습 경기였지만 봐주지 않았다. 감독이 고개를 끄덕였다.', fx: { trust: 5 }, rel: [6, 0] },
          no: { t: '오늘은 {r} 쪽이 한 수 위였다.', fx: { trust: -2 }, rel: [5, 2] } },
        { label: '끝나고 서로의 플레이를 이야기한다', ok: { t: '소속은 달라도 보는 눈은 비슷했다.', fx: { sense: 1 }, rel: [0, 8] } },
      ] },
    { id: 'rv_seat', max: 2, rv: s => s.squad === 'second' && act(s).find(r => mate(s, r) && r.squad === 'second' && r.role === s.role), title: '한 자리',
      text: '1군에 내 포지션 자리가 하나 난다는 소문이 돈다. 후보는 둘이다. 나, 그리고 {r}.',
      c: [
        { label: '스크림 성적으로 증명한다', chk: { base: 42, mech: .6, sense: .4 },
          ok: { t: '이번 주 스크림 지표는 내가 앞섰다.', fx: { trust: 8 }, rel: [8, 0] },
          no: { t: '지표는 {r} 쪽이 좋았다.', fx: { trust: -4 }, rel: [8, 0] } },
        { label: '다른 역할도 맡을 수 있다고 보여 준다', chk: { base: 50, pool: .8 },
          ok: { t: '감독이 메모를 했다. "쓸모가 많네."', fx: { trust: 6, pool: 1 }, rel: [3, 0] },
          no: { t: '어설픈 시도는 역효과였다.', fx: { trust: -2 }, rel: [3, 0] } },
        { label: '{r}에게 "누가 올라가든 축하하자"고 한다', ok: { t: '{r}도 웃었다. "그래도 내가 간다."', fx: { mental: 1 }, rel: [2, 8] } },
      ] },
    { id: 'rv_moved', news: true, rv: (s, H) => isFirst(s) && act(s).find(r => fresh(s, r.f.moved) && H.inLeague(r)), shown: (s, r) => { r.f.moved = 0; }, title: '이적 소식',
      text: '{r}의 {org} 이적이 발표됐다. 이제 같은 리그에서 서로를 상대한다.',
      c: [
        { label: '"리그에서 보자"고 보낸다', ok: { t: '"봐주지 않는다." 답이 왔다.', fx: {}, rel: [3, 6] } },
        { label: '인터뷰에서 "이제는 적"이라고 말한다', ok: { t: '기사 제목이 됐다. 다음 맞대결 표가 빨리 팔렸다고 한다.', fx: { fame: 2 }, rel: [10, -2] } },
      ] },
    { id: 'rv_eve', max: 4, rv: (s, H) => H.starter && act(s).find(r => H.facing(r)), title: '맞대결 전날',
      text: '이번 달 일정에 {org}전이 있다. {r} 상대 공식전이다. 기자가 소감을 묻는다.',
      c: [
        { label: '"이번에는 내가 이긴다"', chk: { base: 45, mental: .8 },
          ok: { t: '말에 힘이 실렸다. 연습실 공기도 달라졌다.', fx: { fame: 2, buff: [.3, 1] }, rel: [10, 0] },
          no: { t: '말해 놓고 부담이 됐다.', fx: { mental: -1, buff: [-.2, 1] }, rel: [8, 0] } },
        { label: '"좋은 선수다. 좋은 경기가 될 것"', ok: { t: '{r}도 같은 말을 했다는 기사가 났다.', fx: { mental: 1 }, rel: [0, 8] } },
        { label: '말을 아끼고 상대 영상을 본다', ok: { t: '{r}의 습관 몇 가지를 적어 뒀다.', fx: { sense: .5, buff: [.15, 1] }, rel: [2, 2] } },
      ] },
    { id: 'rv_won', max: 3, news: true, rv: (s, H) => H.last && H.last.win && act(s).find(r => r.id === H.last.id), shown: s => { s.flags.rvLast.used = 1; }, title: '경기 뒤 복도',
      text: '이긴 경기가 끝나고, 복도에서 {r}에게 붙잡혔다. "다음에는 다를 거다."',
      c: [
        { label: '손을 내민다', ok: { t: '{r}도 손을 잡았다. 힘이 꽤 들어가 있었다.', fx: {}, rel: [0, 8] } },
        { label: '"다음에도 내가 이긴다"', ok: { t: '{r}의 입꼬리가 올라갔다. "두고 보자."', fx: { fame: 1 }, rel: [8, 0] } },
      ] },
    { id: 'rv_lost', max: 3, news: true, rv: (s, H) => H.last && !H.last.win && act(s).find(r => r.id === H.last.id), shown: s => { s.flags.rvLast.used = 1; }, title: '진 날 밤',
      text: '진 경기가 끝났다. 대기실 화면에 {r}의 승리 인터뷰가 나오고 있다.',
      c: [
        { label: '그 경기 리플레이를 끝까지 본다', ok: { t: '어디서 졌는지 알았다. 인정할 것은 인정했다.', fx: { sense: 1 }, rel: [2, 5] } },
        { label: '그날 밤 연습실에 남는다', ok: { t: '새벽까지 손을 풀었다.', fx: { mech: 1, cond: -8 }, rel: [8, 0] } },
        { label: '{r}에게 "잘하더라"고 보낸다', ok: { t: '"다음에 또 붙자." 답이 왔다.', fx: { mental: 1 }, rel: [0, 8] } },
      ] },
    { id: 'rv_slump', max: 2, news: true, rv: s => act(s).find(r => r.f.slump && r.slump), shown: (s, r) => { r.f.slump = 0; }, title: '{r}의 부진',
      text: '{r}에 대한 기사가 좋지 않다. 주전에서 밀렸다는 이야기도 들린다.',
      c: [
        { label: '연락해서 밥을 산다', ok: { t: '경기 이야기는 한마디도 하지 않았다. 헤어질 때 {r}에게서 "고맙다"는 말을 들었다.', fx: { mental: 1, cond: -2 }, rel: [-2, 10] } },
        { label: '지켜만 본다', ok: { t: '알아서 올라올 선수다.', fx: {}, rel: [0, 1] } },
      ] },
    { id: 'rv_back', max: 2, news: true, rv: s => act(s).find(r => fresh(s, r.f.back) && !r.slump && !r.out), shown: (s, r) => { r.f.back = 0; }, title: '돌아온 {r}',
      text: '{r}의 복귀전 하이라이트가 돌고 있다. 손은 여전했다.',
      c: [
        { label: '"늦었다"고 보낸다', ok: { t: '"기다렸냐?" 바로 답이 왔다.', fx: {}, rel: [5, 5] } },
        { label: '다음 맞대결을 준비한다', ok: { t: '{r}의 복귀전을 두 번 돌려 봤다.', fx: { sense: .5 }, rel: [5, 0] } },
      ] },
    { id: 'rv_retire', news: true, rv: s => (s.rivals || []).find(r => r.retired && fresh(s, r.f.retired)), shown: (s, r) => { r.f.retired = 0; }, title: '{r}의 은퇴',
      text: (s, r) => !r.debut ? '{r}에게서 긴 메시지가 왔다. 선수 생활을 그만둔다고 한다. 1군 무대는 끝내 밟지 못했다.'
        : r.origin === 'trainee' ? '{r}의 은퇴 발표가 났다. 같은 날 연습실 문을 열었던 사람이 먼저 헤드셋을 내려놓는다.' : '{r}의 은퇴 발표가 났다. 오랫동안 대진표에서 가장 먼저 찾던 이름이다.',
      c: [
        { label: '직접 찾아간다', ok: { t: '둘이서 오래 걸었다. "네 경기는 계속 볼 거다."', fx: { mental: 2, cond: -3 }, rel: [0, 15] } },
        { label: '긴 답장을 쓴다', ok: { t: '쓰다 보니 지난 이야기가 길어졌다.', fx: { mental: 1 }, rel: [0, 8] } },
        { label: '마음속으로만 보낸다', ok: { t: '연습실로 돌아갔다. 한동안 손이 무거웠다.', fx: { mental: -1 }, rel: [0, 0] } },
      ] },
    { id: 'rv_old', rv: s => s.age >= 26 && isFirst(s) && act(s).find(r => r.squad === 'first' && r.w + r.l >= 6 && !r.f.old), shown: (s, r) => { r.f.old = 1; }, title: '가장 기억에 남는 상대',
      text: '시즌 특집 인터뷰. "선수 생활에서 가장 기억에 남는 상대는 누구입니까?" {r}의 얼굴이 먼저 떠오른다.',
      c: [
        { label: '{r}의 이름을 댄다', ok: { t: '{r}도 같은 질문에 내 이름을 댔다고 한다.', fx: { fame: 2 }, rel: [0, 12] } },
        { label: '"특별히 없습니다"', ok: { t: '기사를 본 {r}에게서 메시지가 왔다. "서운한데."', fx: {}, rel: [5, -6] } },
      ] },
    { id: 'rv_mate', max: 2, rv: s => isFirst(s) && act(s).find(r => mate(s, r) && r.squad === 'first'), title: '같은 유니폼',
      text: (s, r) => r.origin === 'trainee' ? '{r}도 같은 유니폼을 입고 있다. 연습생 방에서 순위를 다투던 둘이 이제 한 팀의 1군이다.' : '{r}도 같은 유니폼을 입게 됐다. 상대 팀에서만 보던 아이디가 이제 내 옆자리에 있다.',
      c: [
        { label: '둘만의 연계를 연습한다', chk: { base: 55, team: .7 },
          ok: { t: '눈빛만으로 통하는 연계가 하나 생겼다.', fx: { team: 1.5, trust: 3 }, rel: [0, 8] },
          no: { t: '서로 주도하려다 엇박자가 났다.', fx: {}, rel: [4, 0] } },
        { label: '팀의 중심이 나라는 것을 보여 준다', chk: { base: 42, mech: .6, mental: .4 },
          ok: { t: '콜이 내 쪽으로 모이기 시작했다.', fx: { trust: 6 }, rel: [8, -3] },
          no: { t: '콜은 {r}에게 더 모였다.', fx: { trust: -3 }, rel: [8, 0] } },
      ] },
    { id: 'rv_new', make: true, once: true, when: s => (s.rivals || []).length === 0 && isFirst(s) && s.car.g >= 10 && !!s.lg && s.lg.tier === 'first', title: '눈에 밟히는 이름',
      text: '{org} 경기를 볼 때마다 한 선수에게 눈이 간다. 나와 동갑이고 같은 포지션이다. 아이디는 {r}.',
      c: [
        { label: '그 선수의 경기를 찾아본다', ok: { t: '볼수록 닮은 데가 있다. 저쪽도 내 경기를 본다는 이야기를 들었다.', fx: { sense: .5 }, rel: [5, 8] } },
        { label: '신경 쓰지 않기로 한다', ok: { t: '그래도 대진표에서 그 팀부터 찾게 된다.', fx: {}, rel: [5, 0] } },
      ] },
  ];

  /* 승부처: 플레이오프·국제전의 중요한 세트에서 나오는 경기 중 선택.
     sit: any 아무 때나 / last 마지막 세트 / match 우리가 매치 포인트 / elim 우리가 탈락 위기
     chk: 성공 확률 계산식(이벤트와 같은 방식). s: [성공 시, 실패 시] 그 세트의 팀 전력 보정.
     선택지는 순서대로 개인 기량(피지컬·반응속도) / 판단(판단력·멘탈) / 조직력(팀워크·숙련 폭) 성격이며,
     보정이 클수록 기본 확률이 낮다. 용어는 모두 이 게임의 창작 용어다. */
  D.MOMENTS = [
    { id: 'base', sit: 'any', title: '본진 앞 대치', text: '양 팀 모두 본진 방어선이 하나씩 남았다. 다음 교전이 이 세트를 끝낸다.',
      c: [
        { label: '내가 먼저 파고든다', chk: { base: 26, mech: .7, reflex: .5 }, s: [9, -7], ok: '순간 진입이 상대 진형을 둘로 갈랐다.', no: '진입이 읽혔다. 내가 먼저 쓰러졌다.' },
        { label: '상대의 실수를 기다린다', chk: { base: 38, sense: .6, mental: .5 }, s: [6, -4], ok: '조급해진 상대가 먼저 들어왔고, 그대로 받아쳤다.', no: '기다리는 사이 좋은 자리를 내줬다.' },
        { label: '약속해 둔 연계를 건다', chk: { base: 44, team: .6, pool: .3 }, s: [4, -2.5], ok: '연습한 그대로 연계가 이어졌다.', no: '반 박자가 어긋났다.' },
      ] },
    { id: 'objective', sit: 'any', title: '중앙 거점 쟁탈', text: '상대가 중앙 거점을 점령하기 시작했다. 넘어가면 세트가 기운다.',
      c: [
        { label: '난입해서 점령을 끊는다', chk: { base: 20, reflex: .9, mech: .4 }, s: [10, -8], ok: '마지막 순간에 끊어 냈다. 경기장이 뒤집혔다.', no: '한 박자 늦었다. 거점도 나도 잃었다.' },
        { label: '돌아가는 길목에서 기다린다', chk: { base: 36, sense: .7, team: .3 }, s: [6, -4], ok: '거점은 줬지만 돌아가던 둘을 잡았다.', no: '상대는 다른 길로 빠져나갔다.' },
        { label: '반대편 거점과 맞바꾼다', chk: { base: 48, pool: .5, sense: .3 }, s: [3, -2], ok: '손해 없이 맞바꿨다.', no: '맞바꾼 쪽이 조금 가벼웠다.' },
      ] },
    { id: 'cliff', sit: 'elim', title: '벼랑 끝', text: '지면 탈락이다. 이번 세트도 불리하게 시작했고, 헤드셋 너머가 조용하다.',
      c: [
        { label: '"내가 뒤집을게"라고 말한다', chk: { base: 23, mech: .6, mental: .6 }, s: [9, -7], ok: '말한 대로 해냈다. 동료들의 목소리가 살아났다.', no: '혼자 무리하다 격차만 벌어졌다.' },
        { label: '버티며 후반을 본다', chk: { base: 40, mental: .6, pool: .4 }, s: [5, -3], ok: '버티고 버텨 후반 힘 싸움으로 끌고 갔다.', no: '버티기만 하다 주도권을 다 내줬다.' },
        { label: '한 번의 교전에 전부 건다', chk: { base: 33, team: .7, sense: .3 }, s: [7, -5], ok: '다섯 명이 동시에 들어갔다. 완벽했다.', no: '진입 신호가 엇갈렸다.' },
      ] },
    { id: 'pick', sit: 'any', title: '전략 선택', text: '세트 시작 전, 감독이 나를 본다. "네가 편한 걸로 가자. 뭘 할래?"',
      c: [
        { label: '가장 손에 익은 주력 전략', chk: { base: 38, mech: .6, mental: .3 }, s: [5, -3], ok: '손이 먼저 움직였다.', no: '상대가 내 주력을 정확히 준비해 왔다.' },
        { label: '상대 전략의 약점을 찌르는 카드', chk: { base: 32, sense: .8, mental: .2 }, s: [7, -5], ok: '예상이 맞았다. 상대는 초반부터 꼬였다.', no: '상대가 한 수 더 읽고 있었다.' },
        { label: '아무도 예상 못 할 깜짝 전략', chk: { base: 23, pool: 1, team: .3 }, s: [9, -7], ok: '상대 벤치가 술렁였다. 대응이 늦었다.', no: '우리가 먼저 낯설어했다.' },
      ] },
    { id: 'ambush', sit: 'any', title: '끊긴 시야', text: '시야가 끊긴 길목. 상대 주력이 혼자 지나갈 것 같다.',
      c: [
        { label: '혼자 끊으러 간다', chk: { base: 24, mech: .8, reflex: .4 }, s: [8, -7], ok: '소리도 없이 잡아냈다.', no: '함정이었다. 세 명이 기다리고 있었다.' },
        { label: '함정일 수 있다. 시야부터 잡는다', chk: { base: 50, sense: .6 }, s: [3, -1.5], ok: '숨어 있던 상대를 먼저 발견했다.', no: '확인하는 사이 기회는 지나갔다.' },
        { label: '동료를 불러 확실하게 잡는다', chk: { base: 40, team: .8 }, s: [5, -3], ok: '둘이서 깔끔하게 끊었다.', no: '모이는 움직임을 들켰다.' },
      ] },
    { id: 'tilt', sit: 'any', title: '흔들리는 팀', text: '앞 세트를 역전당했다. 동료들의 말이 짧고 날카로워졌다.',
      c: [
        { label: '말 대신 플레이로 보여 준다', chk: { base: 28, mech: .7, reflex: .3 }, s: [7, -6], ok: '초반 득점 하나가 분위기를 바꿨다.', no: '무리한 플레이가 불안을 키웠다.' },
        { label: '웃으며 "한 세트 남았잖아" 한다', chk: { base: 38, mental: .7, team: .3 }, s: [5, -3], ok: '누군가 피식 웃었다. 어깨가 풀렸다.', no: '아무도 대답하지 않았다.' },
        { label: '내가 콜을 맡겠다고 한다', chk: { base: 30, team: .5, sense: .6 }, s: [7, -5], ok: '콜이 하나로 모이자 팀이 다시 움직였다.', no: '콜이 겹쳐 더 어수선해졌다.' },
      ] },
    { id: 'close', sit: 'match', title: '마무리', text: '한 세트만 더 이기면 끝난다. 상대는 무리한 승부수를 던질 것이다.',
      c: [
        { label: '숨 돌릴 틈 없이 몰아붙인다', chk: { base: 30, mech: .5, reflex: .5 }, s: [8, -6], ok: '상대는 승부수를 꺼내 보지도 못했다.', no: '서두르다 역습을 맞았다.' },
        { label: '승부수를 예측하고 받아친다', chk: { base: 36, sense: .8, mental: .3 }, s: [6, -4], ok: '예상한 자리에 상대가 들어왔다.', no: '승부수는 다른 곳에서 나왔다.' },
        { label: '평소 하던 대로 한다', chk: { base: 48, team: .4, mental: .4 }, s: [3, -2], ok: '흔들림 없이 운영했다.', no: '조금 굳어 있었다.' },
      ] },
    { id: 'duel', sit: 'any', title: '에이스 맞대결', text: '상대 에이스와 일대일로 마주쳤다. 관중석이 숨을 죽인다.',
      c: [
        { label: '정면으로 붙는다', chk: { base: 23, mech: .9, reflex: .5 }, s: [9, -8], ok: '반응 하나 차이로 이겼다. 중계석이 소리를 질렀다.', no: '손이 반 박자 느렸다.' },
        { label: '심리전으로 실수를 끌어낸다', chk: { base: 33, sense: .5, mental: .6 }, s: [6, -4], ok: '참지 못한 상대가 먼저 움직였다.', no: '내 수가 먼저 읽혔다.' },
        { label: '물러나 팀과 합류한다', chk: { base: 53, team: .5 }, s: [2, -1.5], ok: '손해 없이 빠졌다.', no: '빠지다가 조금 맞았다.' },
      ] },
    { id: 'pause', sit: 'any', title: '경기 중단', text: '장비 문제로 경기가 십 분 멈췄다. 직전까지 흐름은 상대 쪽이었다.',
      c: [
        { label: '손이 식지 않게 계속 움직인다', chk: { base: 38, mech: .4, reflex: .5 }, s: [5, -3], ok: '재개 직후 교전에서 손이 살아 있었다.', no: '오히려 힘이 들어갔다.' },
        { label: '눈을 감고 호흡을 고른다', chk: { base: 46, mental: .8 }, s: [4, -2], ok: '머리가 맑아졌다.', no: '생각이 더 많아졌다.' },
        { label: '상대 움직임을 정리해 팀에 전한다', chk: { base: 34, sense: .6, team: .5 }, s: [7, -4], ok: '재개하자마자 상대 동선을 끊었다.', no: '정리가 길어 다들 흘려들었다.' },
      ] },
    { id: 'read', sit: 'any', title: '읽힌 전략', text: '준비한 전략이 초반부터 읽혔다. 계획을 바꿔야 한다.',
      c: [
        { label: '개인 기량으로 뚫는다', chk: { base: 26, mech: .8, reflex: .4 }, s: [8, -7], ok: '전략이 막히자 손으로 풀었다.', no: '혼자서는 뚫리지 않았다.' },
        { label: '손해를 줄이며 길게 본다', chk: { base: 44, mental: .5, sense: .4 }, s: [4, -2.5], ok: '큰 손해 없이 중반으로 넘어갔다.', no: '조금씩 계속 밀렸다.' },
        { label: '즉석에서 다른 전략으로 바꾼다', chk: { base: 24, pool: .9, team: .5 }, s: [9, -6], ok: '준비 안 한 전략이 오히려 통했다.', no: '어설픈 전환이 틈을 만들었다.' },
      ] },
    { id: 'crowd', sit: 'any', title: '원정 관중', text: '상대 팀 응원이 경기장을 울린다. 헤드셋을 뚫고 들어온다.',
      c: [
        { label: '함성을 조용하게 만들 장면을 노린다', chk: { base: 24, reflex: .7, mech: .6 }, s: [9, -7], ok: '한 장면에 경기장이 조용해졌다.', no: '함성은 더 커졌다.' },
        { label: '화면만 본다', chk: { base: 40, mental: .9 }, s: [5, -3], ok: '소리는 멀어지고 화면만 남았다.', no: '자꾸 귀가 쏠렸다.' },
        { label: '콜을 짧고 크게 맞춘다', chk: { base: 40, team: .8 }, s: [5, -3], ok: '짧은 콜이 정확히 오갔다.', no: '콜이 함성에 묻혔다.' },
      ] },
    { id: 'final', sit: 'last', title: '마지막 세트', text: '끝까지 왔다. 손끝이 차갑다. 이 세트로 모든 것이 정해진다.',
      c: [
        { label: '"나한테 몰아 줘. 내가 끝낼게"', chk: { base: 22, mech: .7, reflex: .5, mental: .3 }, s: [10, -8], ok: '팀이 믿고 맡겼고, 그 믿음에 답했다.', no: '몰아 준 자원이 내 손에서 사라졌다.' },
        { label: '긴 싸움으로 끌고 간다', chk: { base: 38, mental: .6, sense: .4 }, s: [5, -3], ok: '먼저 지친 쪽은 상대였다.', no: '끌려간 쪽은 우리였다.' },
        { label: '다섯 명이 한 몸처럼 움직인다', chk: { base: 34, team: .8, pool: .3 }, s: [7, -4], ok: '다섯 명의 화면이 하나처럼 움직였다.', no: '한 명이 늦었다. 나였을지도 모른다.' },
      ] },
    { id: 'lead', sit: 'any', title: '초반 우위', text: '첫 교전을 크게 이겼다. 굴릴 것인가, 지킬 것인가.',
      c: [
        { label: '쉬지 않고 압박한다', chk: { base: 32, mech: .5, reflex: .5 }, s: [7, -6], ok: '상대는 숨 쉴 틈이 없었다.', no: '깊이 들어갔다가 우위를 돌려줬다.' },
        { label: '거점부터 하나씩 챙긴다', chk: { base: 44, sense: .6, mental: .2 }, s: [5, -2.5], ok: '우위가 차곡차곡 쌓였다.', no: '느린 운영에 상대가 따라붙었다.' },
        { label: '동료 쪽으로 이득을 나눈다', chk: { base: 40, team: .6, pool: .3 }, s: [5, -3], ok: '팀 전체가 고르게 강해졌다.', no: '나눈 이득이 흩어졌다.' },
      ] },
    { id: 'chance', sit: 'any', title: '단 한 번의 기회', text: '크게 밀리던 세트. 방심한 상대가 깊이 들어왔다.',
      c: [
        { label: '지금이다. 먼저 뛰어든다', chk: { base: 26, reflex: .8, mech: .5 }, s: [10, -7], ok: '한 번의 교전으로 세트를 뒤집었다.', no: '뛰어든 건 나 혼자였다.' },
        { label: '가장 위협적인 한 명만 노린다', chk: { base: 34, sense: .7, mental: .3 }, s: [7, -5], ok: '핵심 한 명이 쓰러지자 상대는 물러났다.', no: '노린 상대가 끝내 살아 나갔다.' },
        { label: '진형을 지키며 받아친다', chk: { base: 42, team: .6, pool: .3 }, s: [5, -3], ok: '들어온 만큼 그대로 돌려줬다.', no: '진형이 먼저 무너졌다.' },
      ] },
  ];

  // NPC 선수 아이디 생성용 음절 (창작)
  D.SYL_A = ['Ka', 'Zu', 'Mo', 'Ri', 'Ten', 'Vo', 'Lu', 'Sha', 'Nix', 'Dro', 'Py', 'Qua', 'El', 'Jin', 'Bo', 'Tae', 'Mir', 'Oz', 'Cru', 'Hex', 'Yu', 'Sol'];
  D.SYL_B = ['ro', 'ven', 'mi', 'zen', 'ka', 'lo', 'rin', 'dus', 'pa', 'nyx', 'bit', 'han', 'so', 'ty', 'gon', 'wi'];

  // 은퇴 점수 → 상위 % (자동 시뮬레이션 커리어 분포 기준. test/sim.js 로 갱신)
  D.PCT = [[99, 1], [94, 3], [75, 8], [55, 16], [43, 28], [34, 42], [28, 58], [22, 74], [11, 90]];

  root.PG_DATA = D;
  if (typeof module !== 'undefined') module.exports = D;
})(typeof window !== 'undefined' ? window : globalThis);
