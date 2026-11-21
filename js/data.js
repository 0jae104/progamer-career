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

  // 포지션. id 는 저장 데이터에 들어가므로 바꾸지 않는다(van·rov·core·gun·sup). 화면에 보이는 이름과 설명만 0.9.0에서 바꿨다.
  //   w: OVR 계산에 쓰는 능력치 비중(0.8.0과 같음) / easy: 처음 보는 사람을 위한 한 줄 / good·care: 장점과 주의점
  D.ROLES = [
    { id: 'van', name: '탑', en: 'TOP', desc: '위쪽 길을 혼자 맡는다. 버티고, 필요할 때 팀에 합류한다', easy: '혼자 한 길을 책임지는 자리. 일대일 싸움과 "언제 팀에 합류할지"가 중요하다.', good: '팀워크·판단력이 고르게 쓰여 기복이 적다', care: '혼자 있는 시간이 길어 불리한 라인전을 버텨야 할 때가 많다', w: { mech: .2, reflex: .12, sense: .2, team: .22, mental: .16, pool: .1 } },
    { id: 'rov', name: '정글', en: 'JUNGLE', desc: '길 사이를 돌며 기습하고 오브젝트 싸움을 이끈다', easy: '정해진 길 없이 맵을 돌아다니는 자리. 어디로 갈지 고르는 판단이 전부다.', good: '판단력 비중이 가장 커서 나이가 들어도 오래 간다', care: '손보다 머리로 하는 자리라 피지컬만 올려서는 OVR이 잘 오르지 않는다', w: { mech: .16, reflex: .16, sense: .28, team: .16, mental: .1, pool: .14 } },
    { id: 'core', name: '미드', en: 'MID', desc: '가운데 길에서 주도권을 잡고 교전의 중심이 된다', easy: '맵 한가운데를 맡는 팀의 중심. 일대일 실력과 옆 길을 돕는 움직임이 모두 필요하다.', good: '경기에 미치는 영향이 크다. 잘하면 팀이 이긴다', care: '피지컬·반응속도 비중이 커서 20대 중반부터 노쇠가 먼저 온다', w: { mech: .26, reflex: .18, sense: .2, team: .1, mental: .12, pool: .14 } },
    { id: 'gun', name: '원딜', en: 'ADC', desc: '멀리서 꾸준히 때리는 후반 화력. 살아남는 자리 잡기가 핵심', easy: '"원거리 딜러"의 줄임말. 약하지만 가장 많이 때리는 자리라, 죽지 않는 위치 선정이 중요하다.', good: '경기 영향력이 가장 크고 경기 MVP·개인상을 받기 쉽다', care: '피지컬·반응속도에 가장 많이 기대는 자리. 노쇠를 가장 먼저 맞는다', w: { mech: .3, reflex: .24, sense: .14, team: .12, mental: .12, pool: .08 } },
    { id: 'sup', name: '서폿', en: 'SUPPORT', desc: '시야를 밝히고, 싸움을 열고, 아군을 지킨다', easy: '"서포터"의 줄임말. 직접 잡기보다 팀이 싸우기 좋게 만들어 주는 자리다.', good: '팀워크·판단력으로 뛰어 선수 생활이 가장 길다', care: '혼자서 경기를 뒤집기는 어렵다. 킬은 적고 어시스트가 많다', w: { mech: .1, reflex: .1, sense: .26, team: .28, mental: .12, pool: .14 } },
  ];
  // 0.8.0까지의 포지션 이름 → 지금 이름. 예전 기록에 글자로 저장된 포지션을 "보여 줄 때만" 바꾼다. 저장된 값은 고치지 않는다.
  D.ROLE_OLD = { '선봉': 'van', '유격': 'rov', '코어': 'core', '사수': 'gun', '지원': 'sup' };

  D.TRAITS = [
    { id: 'genius', name: '천재형', desc: '피지컬·반응속도 한계가 높고 10대 성장이 빠르다. 멘탈은 약하게 시작한다.' },
    { id: 'grinder', name: '노력형', desc: '모든 성장이 18% 빠르고 컨디션 소모가 적다. 한계는 평범하다.' },
    { id: 'brain', name: '두뇌형', desc: '판단력·숙련 폭 한계가 높고 노쇠가 늦게 온다.' },
  ];

  // 경기 전 전략 3종(0.11.0). 문장은 화면에 그대로 나온다. 수치는 D.BAL.tac.
  D.TACTICS = [
    { id: 'press', name: '강하게 압박한다', good: '앞서거나 동률인 세트에서 강하다. 컨디션이 좋을수록 더.', bad: '세트를 내줘 뒤지면 무리수가 된다.' },
    { id: 'steady', name: '안정적으로 운영한다', good: '전력이 앞서는 상대에게 꾸준히 유리하다.', bad: '전력이 밀리는 상대에게는 말려 들어간다.' },
    { id: 'wait', name: '상대 실수를 노린다', good: '전력이 밀릴 때, 세트를 뒤지고 있을 때 받아친다.', bad: '전력이 앞서는데 기다리면 주도권을 내준다.' },
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
    // 포지션별 경기 영향력. 원딜(gun)·미드(core)는 전성기에 승패와 평점을 크게 움직이지만 반응속도 노쇠를 가장 먼저 맞고,
    // 서폿(sup)은 영향이 작은 대신 오래 뛴다. impact 와 평점의 OVR 차이 항에 곱해진다. (0.8.0과 같은 값)
    carry: { gun: 1.45, core: 1.3, rov: 1, van: 1.1, sup: .8 },
    // 경기 MVP 기준 평점(이긴 경기에서 이 평점 이상이면 절반 확률로 MVP). 기본 8.0.
    // carry 가 가장 작은 서폿은 평균 평점이 같아도 8을 넘는 경기가 드물어 MVP가 적었다(0.8.0, 시드 1·2: 서폿 3.87%·3.55%, 원딜 4.44%·4.34%).
    // 서폿만 기준을 0.1 낮춘다. 다른 포지션과 평점 계산식은 그대로다.
    mvpAt: { sup: 7.9 },
    // 승부처: 내 포지션 전용 상황이 후보에 있을 때 그것을 고를 확률(나머지는 공통 상황)
    roleMoment: .6,
    momentMemory: 8,   // 최근 이 개수의 승부처 상황은 다시 나오지 않는다(0.9.0까지 6. 포지션당 전용 상황이 10종이 되어 늘렸다)
    // 경기 전 전략(0.11.0): 세트마다 팀 전력에 더하는 보정. 전력 1은 승률 50% 근처에서 약 3.6%p. cap 이 절댓값 상한이다(약 ±6%p).
    //   press  [기본, 컨디션 나눗수, 하한, 상한, 뒤질 때]: 앞서거나 동률이면 기본 + (컨디션 − 60) / 나눗수, 뒤지면 '뒤질 때' 값
    //   steady [우세, 비슷, 열세]: 시리즈 시작 전력으로 본 세트 승률이 fav 이상이면 우세, 1 − fav 이하면 열세
    //   wait   [뒤질 때, 동률, 앞설 때, 전력 열세일 때(뒤지지 않은 세트)]
    tac: { cap: 1.6, fav: .55, press: [.5, 20, -.5, 1.5, -1.2], steady: [1, .3, -.8], wait: [1.6, -.4, -.9, .8] },
    // ── 이벤트 ──
    // 자동 관리(0.11.1): keep = 남겨 둘 돈의 기본값(만원. 심리 상담 + 물리치료 한 달 치보다 조금 많게), keeps·caps = 고를 수 있는 값(cap 0 = 제한 없음),
    //   physioBelow = 손목이 이 값보다 높으면 물리치료를 자동으로 사지 않는다.
    auto: { keep: 500, keeps: [0, 500, 2000, 5000], caps: [0, 500, 2000, 5000], physioBelow: 75 },
    // 진행 래퍼(0.11.1): "다음 중요한 순간까지"가 한 번에 넘기는 달 수의 상한, 시간 상한(ms), 멈추는 컨디션·손목 기준
    run: { max: 12, ms: 1500, cond: 40, wrist: 30 },
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
    // ── 포지션 전용 상황(0.9.0). role 이 내 포지션과 같을 때만 후보가 된다. 수치 범위는 공통 상황과 같다:
    //    과감한 선택 기본 20~30·세트 승률 +8~10/−6~8, 판단형 34~40·+6~7/−4~5, 안전형 42~50·+3~4/−2~3. cond: 컨디션이 확률에 들어간다(과감한 선택만) ──
    { id: 'top_side', role: 'van', sit: 'any', title: '사이드 압박', text: '상대 탑이 반대편 길을 깊게 밀고 있다. 막으러 가면 본대는 넷이서 싸워야 한다.',
      c: [
        { label: '혼자 가서 일대일로 막아 세운다', chk: { base: 24, mech: .8, reflex: .4, cond: 1 }, s: [9, -7], ok: '혼자 막아 냈다. 상대의 사이드 운영이 그대로 멈췄다.', no: '일대일에서 밀렸다. 포탑과 함께 무너졌다.' },
        { label: '사이드는 버리고 본대에 합류한다', chk: { base: 36, sense: .6, team: .5 }, s: [6, -4], ok: '다섯이 넷을 덮쳤다. 사이드에서 잃은 것보다 얻은 것이 컸다.', no: '합류가 늦어 사이드도 교전도 놓쳤다.' },
        { label: '포탑을 끼고 시간만 번다', chk: { base: 48, mental: .5, pool: .3 }, s: [3, -2], ok: '포탑 아래에서 버텨 본대가 움직일 시간을 벌었다.', no: '조금씩 깎이다 결국 포탑 하나를 내줬다.' },
      ] },
    { id: 'top_solo', role: 'van', sit: 'any', title: '솔로킬 기회', text: '맞상대의 체력이 절반이다. 지금 들어가면 잡을 수도 있고, 거꾸로 잡힐 수도 있다.',
      c: [
        { label: '지금 들어간다', chk: { base: 22, mech: .9, reflex: .5, cond: 1 }, s: [10, -8], ok: '혼자서 잡아냈다. 탑 길이 통째로 내 것이 됐다.', no: '상대가 기다리고 있었다. 내가 먼저 쓰러졌다.' },
        { label: '정글을 불러 확실하게 잡는다', chk: { base: 38, team: .7, sense: .3 }, s: [6, -4], ok: '정글과 호흡이 맞았다. 깔끔하게 잡았다.', no: '부르는 사이 상대가 눈치를 채고 빠졌다.' },
        { label: '잡지 않고 이득만 굳힌다', chk: { base: 50, pool: .4, sense: .3 }, s: [3, -2], ok: '무리하지 않고 포탑을 깎았다.', no: '망설이는 사이 상대가 체력을 채우고 돌아왔다.' },
      ] },
    { id: 'top_join', role: 'van', sit: 'any', title: '합류 타이밍', text: '반대편에서 교전이 열리려 한다. 지금 내 길을 버리고 넘어갈지 정해야 한다.',
      c: [
        { label: '교전 한복판으로 바로 넘어간다', chk: { base: 26, reflex: .6, sense: .6, cond: 1 }, s: [8, -7], ok: '도착하자마자 교전이 뒤집혔다.', no: '도착했을 때는 이미 끝나 있었다. 내 길만 비웠다.' },
        { label: '한 박자 늦게 상대 뒤를 잡는다', chk: { base: 34, sense: .8, mental: .2 }, s: [7, -5], ok: '빠져나가던 상대의 퇴로를 끊었다.', no: '뒤를 잡으러 가다 혼자 고립됐다.' },
        { label: '넘어가지 않고 내 길의 이득을 챙긴다', chk: { base: 46, pool: .5, mental: .3 }, s: [3, -2], ok: '교전은 비겼고 나는 포탑을 얻었다.', no: '넷이 싸운 본대가 조금 밀렸다.' },
      ] },
    { id: 'top_weak', role: 'van', sit: 'elim', title: '불리한 라인전', text: '지면 탈락인데 맞상대와의 상성부터 불리하다. 상대는 쉬지 않고 압박해 온다.',
      c: [
        { label: '불리해도 맞받아친다', chk: { base: 22, mech: .8, mental: .5, cond: 1 }, s: [9, -7], ok: '상성을 손으로 뒤집었다. 상대가 당황했다.', no: '상성은 상성이었다. 격차가 더 벌어졌다.' },
        { label: '버티며 정글이 와 주기를 기다린다', chk: { base: 40, mental: .7, team: .3 }, s: [5, -3], ok: '끝까지 버텼고, 정글이 왔을 때 판이 바뀌었다.', no: '버티기만 하다 성장이 한참 밀렸다.' },
        { label: '라인전을 포기하고 교전에서 값을 한다', chk: { base: 34, team: .6, sense: .4 }, s: [6, -4], ok: '라인은 졌지만 교전마다 내가 먼저 도착했다.', no: '교전에서도 한 발 늦었다.' },
      ] },
    { id: 'top_front', role: 'van', sit: 'match', title: '앞라인', text: '한 세트만 더 이기면 끝난다. 마지막 교전에서 누가 먼저 맞을지 정해야 한다.',
      c: [
        { label: '내가 가장 앞에서 길을 연다', chk: { base: 28, mech: .5, team: .6, cond: 1 }, s: [8, -6], ok: '내가 다 받아 내는 동안 뒤에서 화력이 쏟아졌다.', no: '너무 깊이 들어갔다. 뒤가 따라오지 못했다.' },
        { label: '상대가 들어오는 것을 받아 내고 반격한다', chk: { base: 36, sense: .6, mental: .5 }, s: [6, -4], ok: '상대의 진입을 그대로 받아쳤다.', no: '받아 내기에는 상대 화력이 셌다.' },
        { label: '우리 화력 옆을 지킨다', chk: { base: 48, team: .5 }, s: [3, -2], ok: '화력을 지켜 냈고 교전은 무난히 이겼다.', no: '지키느라 앞이 비었다.' },
      ] },
    { id: 'jg_steal', role: 'rov', sit: 'any', title: '오브젝트 스틸', text: '상대가 큰 오브젝트를 거의 다 잡았다. 우리 쪽 시야는 없다.',
      c: [
        { label: '뛰어들어 마지막 한 방을 노린다', chk: { base: 20, reflex: .9, mech: .4, cond: 1 }, s: [10, -8], ok: '마지막 한 방이 내 것이었다. 경기장이 뒤집혔다.', no: '한 박자 늦었다. 오브젝트도 나도 잃었다.' },
        { label: '오브젝트는 주고, 빠져나오는 상대를 문다', chk: { base: 36, sense: .7, team: .3 }, s: [6, -4], ok: '오브젝트는 줬지만 돌아가던 둘을 잡았다.', no: '상대는 다른 길로 빠져나갔다.' },
        { label: '반대편 자원으로 손해를 메운다', chk: { base: 48, pool: .5, sense: .3 }, s: [3, -2], ok: '반대편에서 비슷한 값을 챙겼다.', no: '메운 쪽이 조금 가벼웠다.' },
      ] },
    { id: 'jg_counter', role: 'rov', sit: 'any', title: '카운터 정글', text: '상대 정글의 동선이 읽힌다. 지금 들어가면 상대 구역을 통째로 비울 수 있다.',
      c: [
        { label: '깊숙이 들어가 상대 정글과 싸운다', chk: { base: 24, mech: .7, reflex: .5, cond: 1 }, s: [9, -7], ok: '상대 정글을 자기 구역에서 잡아냈다.', no: '상대 라인이 먼저 도착했다. 내가 갇혔다.' },
        { label: '시야만 깔고 다음 동선을 훔친다', chk: { base: 38, sense: .8 }, s: [6, -4], ok: '상대 정글이 갈 곳마다 내가 먼저 가 있었다.', no: '상대가 동선을 바꿨다. 헛걸음이었다.' },
        { label: '내 구역을 지키며 성장한다', chk: { base: 50, pool: .4, mental: .3 }, s: [3, -2], ok: '손해 없이 성장했다.', no: '그사이 상대 정글이 라인 하나를 풀어 줬다.' },
      ] },
    { id: 'jg_gank', role: 'rov', sit: 'any', title: '갱킹 선택', text: '세 길 모두 도와 달라고 한다. 갈 수 있는 곳은 하나다.',
      c: [
        { label: '가장 어려운 길을 뚫어 준다', chk: { base: 26, mech: .6, sense: .5, cond: 1 }, s: [8, -7], ok: '지던 길이 살아났다. 팀 전체가 편해졌다.', no: '지던 길에서 같이 쓰러졌다.' },
        { label: '이기고 있는 길을 더 크게 벌린다', chk: { base: 36, sense: .6, team: .5 }, s: [6, -4], ok: '이기던 길이 완전히 터졌다.', no: '상대 정글이 같은 생각으로 먼저 와 있었다.' },
        { label: '상대 기습을 받아칠 자리에서 기다린다', chk: { base: 42, sense: .5, mental: .4 }, s: [4, -2.5], ok: '기습하러 온 상대 정글을 되받아쳤다.', no: '상대 정글은 오지 않았다. 시간만 썼다.' },
      ] },
    { id: 'jg_dark', role: 'rov', sit: 'elim', title: '시야 없는 구역', text: '지면 탈락이다. 다음 오브젝트 앞 수풀에 시야가 하나도 없다.',
      c: [
        { label: '내가 먼저 들어가 확인한다', chk: { base: 24, reflex: .7, mental: .5, cond: 1 }, s: [9, -7], ok: '숨어 있던 상대를 먼저 발견하고 빠져나왔다. 팀이 그대로 덮쳤다.', no: '다섯이 기다리고 있었다.' },
        { label: '다섯이 뭉쳐 천천히 밀고 들어간다', chk: { base: 38, team: .8 }, s: [6, -4], ok: '흩어지지 않고 구역을 통째로 밀어냈다.', no: '뭉친 채로 광역 스킬을 맞았다.' },
        { label: '오브젝트를 포기하고 반대편을 민다', chk: { base: 44, sense: .5, pool: .4 }, s: [4, -3], ok: '오브젝트 대신 포탑 둘을 얻었다.', no: '포탑 하나와 오브젝트를 맞바꿨다. 손해였다.' },
      ] },
    { id: 'jg_tempo', role: 'rov', sit: 'match', title: '속도전', text: '매치 포인트. 상대 정글이 방금 반대편에서 모습을 보였다.',
      c: [
        { label: '곧바로 오브젝트를 친다', chk: { base: 30, team: .6, reflex: .4, cond: 1 }, s: [8, -6], ok: '상대가 오기 전에 끝냈다.', no: '생각보다 상대가 빨리 왔다. 싸움이 꼬였다.' },
        { label: '모습을 보인 쪽 반대편 길을 덮친다', chk: { base: 34, sense: .8, mech: .2 }, s: [7, -5], ok: '도와줄 정글이 없는 길을 그대로 무너뜨렸다.', no: '모습을 보인 것 자체가 미끼였다.' },
        { label: '시야를 넓히고 다음 기회를 본다', chk: { base: 50, sense: .4, pool: .2 }, s: [3, -2], ok: '맵이 밝아지자 상대가 움직이지 못했다.', no: '기회는 한 번 지나갔다.' },
      ] },
    { id: 'mid_prio', role: 'core', sit: 'any', title: '라인 주도권', text: '가운데 길을 먼저 밀어 넣으면 우리 정글이 움직일 길이 열린다. 상대도 같은 생각이다.',
      c: [
        { label: '맞받아치며 힘으로 밀어낸다', chk: { base: 24, mech: .9, reflex: .4, cond: 1 }, s: [9, -7], ok: '맞싸움에서 이겼다. 가운데가 열렸다.', no: '맞싸움에서 졌다. 포탑 아래에 갇혔다.' },
        { label: '상대 스킬을 빼고 그 틈에 민다', chk: { base: 36, sense: .6, reflex: .5 }, s: [6, -4], ok: '스킬이 빠진 틈을 놓치지 않았다.', no: '스킬을 빼려다 내 체력이 먼저 빠졌다.' },
        { label: '안전하게 받으며 정글을 부른다', chk: { base: 46, team: .5, mental: .3 }, s: [3, -2], ok: '정글이 와서 주도권을 가져왔다.', no: '정글이 오는 길이 막혀 있었다.' },
      ] },
    { id: 'mid_roam', role: 'core', sit: 'any', title: '로밍', text: '가운데 길을 밀어 놨다. 옆 길에서 싸움이 날 것 같다.',
      c: [
        { label: '바로 내려가 수적 우위를 만든다', chk: { base: 28, sense: .7, reflex: .4, cond: 1 }, s: [8, -6], ok: '셋이 둘을 잡았다. 옆 길이 터졌다.', no: '가는 동안 싸움이 끝났다. 가운데 포탑만 깎였다.' },
        { label: '가는 척만 하고 상대 미드를 끌어낸다', chk: { base: 34, sense: .6, mental: .5 }, s: [6, -4], ok: '따라 나온 상대 미드를 정글과 함께 잡았다.', no: '상대는 속지 않았다.' },
        { label: '가지 않고 포탑을 깎는다', chk: { base: 48, mech: .3, pool: .4 }, s: [3, -2], ok: '포탑 하나를 확실히 챙겼다.', no: '옆 길 싸움에서 조금 밀렸다.' },
      ] },
    { id: 'mid_engage', role: 'core', sit: 'any', title: '교전 진입', text: '양 팀이 강가에서 대치한다. 내 스킬이 먼저 들어가면 교전이 열린다.',
      c: [
        { label: '상대 화력을 향해 먼저 들어간다', chk: { base: 22, mech: .8, reflex: .6, cond: 1 }, s: [10, -8], ok: '상대 화력을 먼저 지웠다. 교전은 그걸로 끝났다.', no: '들어가는 순간 집중 공격을 받았다.' },
        { label: '상대가 들어오는 것을 보고 받아친다', chk: { base: 38, sense: .6, mental: .4 }, s: [6, -4], ok: '먼저 들어온 상대를 차례로 받아냈다.', no: '기다리다 좋은 자리를 내줬다.' },
        { label: '거리를 두고 스킬만 던진다', chk: { base: 50, mech: .3, pool: .3 }, s: [3, -2], ok: '조금씩 깎아 상대가 물러났다.', no: '깎는 것만으로는 부족했다.' },
      ] },
    { id: 'mid_dodge', role: 'core', sit: 'last', title: '핵심 스킬', text: '마지막 세트. 상대의 핵심 스킬 하나만 피하면 교전을 이긴다. 맞으면 내가 먼저 사라진다.',
      c: [
        { label: '피하고 그대로 받아친다', chk: { base: 24, reflex: 1, mech: .4, cond: 1 }, s: [9, -8], ok: '종이 한 장 차이로 피했다. 중계석이 소리를 질렀다.', no: '반 박자 늦었다. 그대로 맞았다.' },
        { label: '그 스킬이 빠질 때까지 들어가지 않는다', chk: { base: 40, mental: .7, sense: .4 }, s: [5, -3], ok: '끝까지 참았고, 스킬이 빠지자 들어갔다.', no: '참는 동안 팀이 먼저 무너졌다.' },
        { label: '동료가 대신 맞게 순서를 짠다', chk: { base: 36, team: .8 }, s: [6, -4], ok: '탑이 대신 맞아 줬다. 약속한 그대로였다.', no: '순서가 엇갈려 둘 다 맞았다.' },
      ] },
    { id: 'mid_roll', role: 'core', sit: 'match', title: '이득 굴리기', text: '매치 포인트. 초반에 얻은 이득이 내 손에 있다.',
      c: [
        { label: '상대 정글 구역까지 들어가 숨통을 죈다', chk: { base: 28, mech: .6, sense: .5, cond: 1 }, s: [8, -6], ok: '상대는 자기 구역에서도 숨을 쉬지 못했다.', no: '깊이 들어갔다가 이득을 그대로 돌려줬다.' },
        { label: '옆 길에 이득을 나눠 준다', chk: { base: 38, team: .6, sense: .4 }, s: [6, -4], ok: '세 길이 모두 앞서기 시작했다.', no: '나눠 주러 간 사이 내 길이 밀렸다.' },
        { label: '실수만 하지 않는다', chk: { base: 50, mental: .5 }, s: [3, -2], ok: '이득을 지킨 채 그대로 끝냈다.', no: '조금 굳어 있었다.' },
      ] },
    { id: 'adc_dive', role: 'gun', sit: 'any', title: '나만 노린다', text: '상대 암살자가 교전마다 나만 노린다. 이번에도 수풀에서 보이지 않는다.',
      c: [
        { label: '들어오는 순간 되받아친다', chk: { base: 22, reflex: .9, mech: .6, cond: 1 }, s: [10, -8], ok: '들어온 암살자가 먼저 쓰러졌다.', no: '반응하기도 전에 끝났다.' },
        { label: '서폿 옆을 벗어나지 않는다', chk: { base: 40, team: .7, mental: .3 }, s: [5, -3], ok: '서폿이 막아 줬고 나는 끝까지 때렸다.', no: '둘이 같이 물렸다.' },
        { label: '한 발 뒤에서 늦게 합류한다', chk: { base: 46, sense: .5, mental: .3 }, s: [4, -2.5], ok: '암살자가 스킬을 다 쓴 뒤에 들어갔다.', no: '늦게 들어가니 때릴 상대가 남아 있지 않았다. 교전은 이미 기울어 있었다.' },
      ] },
    { id: 'adc_pos', role: 'gun', sit: 'any', title: '딜 위치', text: '교전이 열렸다. 한 걸음 나가면 더 많이 때릴 수 있지만 상대 스킬에도 닿는다.',
      c: [
        { label: '앞으로 나가 화력을 쏟는다', chk: { base: 24, mech: .9, reflex: .5, cond: 1 }, s: [9, -7], ok: '스킬 사이를 걸어 다니며 전부 때렸다.', no: '한 걸음이 너무 깊었다.' },
        { label: '앞라인 뒤에서 가까운 상대부터 때린다', chk: { base: 38, sense: .6, team: .4 }, s: [6, -4], ok: '앞에서부터 차례로 녹였다.', no: '앞라인이 먼저 무너져 설 자리가 없었다.' },
        { label: '닿을 수 있는 가장 먼 거리에서만 때린다', chk: { base: 50, mental: .4, reflex: .2 }, s: [3, -2], ok: '한 대도 맞지 않고 끝까지 때렸다.', no: '안전했지만 화력이 모자랐다.' },
      ] },
    { id: 'adc_late', role: 'gun', sit: 'last', title: '후반 교전', text: '마지막 세트, 긴 경기 끝. 이 교전에서 내가 쓰러지면 진다.',
      c: [
        { label: '"내가 다 때릴게. 지켜 줘"', chk: { base: 24, mech: .8, reflex: .5, mental: .3, cond: 1 }, s: [10, -8], ok: '넷이 나를 지켰고, 나는 다섯을 쓰러뜨렸다.', no: '지켜 줄 틈도 없이 내가 먼저 쓰러졌다.' },
        { label: '상대의 진입 스킬이 빠진 뒤에 들어간다', chk: { base: 36, sense: .7, mental: .4 }, s: [7, -4], ok: '스킬이 빠진 것을 세고 들어갔다. 막을 것이 없었다.', no: '세는 사이 앞라인이 버티지 못했다.' },
        { label: '큰 싸움을 피하고 길을 민다', chk: { base: 44, pool: .5, team: .3 }, s: [4, -3], ok: '싸우지 않고 포탑으로 이겼다.', no: '피하다가 오브젝트를 내줬다.' },
      ] },
    { id: 'adc_duo', role: 'gun', sit: 'any', title: '서폿과 호흡', text: '아래쪽 길 2대2. 서폿이 들어가자는 신호를 보낸다.',
      c: [
        { label: '신호와 동시에 같이 들어간다', chk: { base: 28, team: .7, reflex: .5, cond: 1 }, s: [8, -6], ok: '둘이 한 몸처럼 움직였다. 2대0이었다.', no: '내가 반 박자 늦었다. 서폿만 쓰러졌다.' },
        { label: '한 번 빼고 다음 스킬 타이밍에 맞춘다', chk: { base: 38, sense: .6, team: .4 }, s: [6, -4], ok: '상대 스킬이 빠진 다음 들어갔다. 깔끔했다.', no: '다음 타이밍은 오지 않았다.' },
        { label: '이번에는 받기만 하자고 한다', chk: { base: 50, mental: .4, pool: .3 }, s: [3, -2], ok: '무리하지 않고 성장을 챙겼다.', no: '서폿의 좋은 기회를 흘려보냈다.' },
      ] },
    { id: 'adc_behind', role: 'gun', sit: 'elim', title: '뒤처진 성장', text: '지면 탈락이다. 초반에 두 번 잡혀 성장이 밀렸다.',
      c: [
        { label: '교전마다 앞에 서서 따라잡는다', chk: { base: 22, mech: .8, mental: .5, cond: 1 }, s: [9, -7], ok: '밀린 성장을 손으로 메웠다.', no: '밀린 채로 앞에 섰다가 또 잡혔다.' },
        { label: '혼자 옆길에서 성장할 시간을 번다', chk: { base: 38, pool: .5, sense: .5 }, s: [6, -4], ok: '조용히 따라잡았고, 다음 교전은 달랐다.', no: '혼자 있다가 끊겼다.' },
        { label: '팀 뒤에서 할 수 있는 만큼만 한다', chk: { base: 46, team: .5, mental: .4 }, s: [4, -2.5], ok: '적은 화력이지만 끝까지 살아서 보탰다.', no: '보탠 것이 너무 적었다.' },
      ] },
    { id: 'sup_vision', role: 'sup', sit: 'any', title: '시야 싸움', text: '다음 오브젝트까지 1분. 상대 구역에 시야가 하나도 없다.',
      c: [
        { label: '혼자 깊숙이 들어가 시야를 심는다', chk: { base: 26, sense: .6, reflex: .6, cond: 1 }, s: [8, -7], ok: '들키지 않고 다녀왔다. 상대 움직임이 전부 보였다.', no: '돌아오는 길에 잡혔다.' },
        { label: '정글과 함께 길목부터 밝힌다', chk: { base: 38, team: .7, sense: .3 }, s: [6, -4], ok: '둘이서 길목을 하나씩 밝혔다.', no: '밝히는 사이 상대가 먼저 자리를 잡았다.' },
        { label: '우리 쪽 입구만 지킨다', chk: { base: 50, sense: .4 }, s: [3, -2], ok: '들어오는 상대는 전부 보였다.', no: '안쪽 사정은 끝내 알 수 없었다.' },
      ] },
    { id: 'sup_open', role: 'sup', sit: 'any', title: '싸움을 여는 자리', text: '상대 진형이 잠깐 벌어졌다. 내가 들어가면 교전이 열린다.',
      c: [
        { label: '바로 들어가 교전을 연다', chk: { base: 24, reflex: .7, sense: .6, cond: 1 }, s: [9, -7], ok: '내 스킬이 셋을 묶었다. 그걸로 끝났다.', no: '나만 들어갔다. 뒤가 따라오지 않았다.' },
        { label: '동료 스킬이 준비됐는지 확인하고 연다', chk: { base: 36, team: .8, sense: .2 }, s: [7, -4], ok: '확인하고 열었다. 연계가 전부 들어갔다.', no: '확인하는 사이 상대 진형이 다시 닫혔다.' },
        { label: '들어가지 않고 상대가 오기를 기다린다', chk: { base: 46, mental: .5, sense: .3 }, s: [3, -2], ok: '먼저 들어온 상대를 받아냈다.', no: '상대도 들어오지 않았다. 기회만 지나갔다.' },
      ] },
    { id: 'sup_guard', role: 'sup', sit: 'any', title: '원딜 보호', text: '상대 둘이 우리 원딜에게 달려든다. 내 스킬은 하나 남았다.',
      c: [
        { label: '달려드는 쪽에 스킬을 맞혀 끊는다', chk: { base: 28, reflex: .8, mech: .4, cond: 1 }, s: [8, -6], ok: '정확히 맞혔다. 원딜은 한 대도 맞지 않았다.', no: '스킬이 빗나갔다.' },
        { label: '원딜에게 붙어 몸으로 막는다', chk: { base: 40, team: .7, mental: .3 }, s: [5, -3], ok: '내가 대신 맞았고 원딜은 끝까지 때렸다.', no: '둘이 같이 쓰러졌다.' },
        { label: '원딜은 맡겨 두고 상대 화력을 문다', chk: { base: 30, sense: .8 }, s: [7, -6], ok: '상대 화력이 먼저 사라졌다. 맞바꾼 값이 컸다.', no: '원딜만 잃었다.' },
      ] },
    { id: 'sup_rescue', role: 'sup', sit: 'elim', title: '구조', text: '지면 탈락이다. 교전 한가운데 우리 주력이 고립됐다.',
      c: [
        { label: '뛰어들어 꺼내 온다', chk: { base: 24, reflex: .7, team: .6, cond: 1 }, s: [9, -7], ok: '주력을 꺼내 왔다. 살아 돌아온 주력이 교전을 끝냈다.', no: '꺼내러 갔다가 같이 갇혔다.' },
        { label: '뒤에서 살릴 수 있는 한 명만 살린다', chk: { base: 40, sense: .7, mental: .3 }, s: [5, -3], ok: '한 명을 확실히 살렸고, 그 한 명이 버텼다.', no: '누구를 살릴지 고르는 사이 늦었다.' },
        { label: '구하지 않고 남은 넷으로 빠진다', chk: { base: 46, mental: .6, team: .2 }, s: [4, -3], ok: '넷이 온전히 빠져 다음 교전을 이겼다.', no: '넷으로는 다음 교전이 버거웠다.' },
      ] },
    { id: 'sup_call', role: 'sup', sit: 'match', title: '콜', text: '매치 포인트. 다음 오브젝트를 칠지 말지, 팀이 내 말을 기다린다.',
      c: [
        { label: '"지금 쳐. 오는 건 내가 막을게"', chk: { base: 28, team: .6, mental: .5, cond: 1 }, s: [8, -6], ok: '말한 대로 막았고, 오브젝트는 우리 것이 됐다.', no: '막지 못했다. 오브젝트 앞에서 무너졌다.' },
        { label: '상대 정글 위치를 확인하고 친다', chk: { base: 38, sense: .8 }, s: [6, -4], ok: '위치를 확인하고 쳤다. 방해는 없었다.', no: '확인이 길어져 때를 놓쳤다.' },
        { label: '"안 쳐. 다음에 하자"', chk: { base: 50, mental: .4, sense: .2 }, s: [3, -2], ok: '무리하지 않았고 다음 기회가 왔다.', no: '다음 기회는 상대에게 먼저 갔다.' },
      ] },
    // ── 포지션 전용 상황 추가분(0.10.0): 포지션마다 5종 더. 같은 수치 범위 안에서 선택지의 짜임을 다르게 했다
    //    (과감한 선택이 둘인 상황, 감독 신뢰(trust)를 쓰는 선택, 컨디션이 들어가지 않는 상황) ──
    { id: 'top_wave', role: 'van', sit: 'any', title: '라인 관리', text: '내 길의 병력이 상대 포탑 앞까지 밀려 있다. 이대로 두면 내가 기습에 그대로 드러난다.',
      c: [
        { label: '더 밀어 넣고 포탑을 노린다', chk: { base: 26, mech: .6, reflex: .5, cond: 1 }, s: [8, -7], ok: '기습이 오기 전에 포탑을 깼다.', no: '기습이 먼저 왔다. 깊이 들어가 있던 내가 잡혔다.' },
        { label: '병력을 끌어당겨 안전한 곳에서 받는다', chk: { base: 40, sense: .6, pool: .4 }, s: [5, -3], ok: '상대가 깊이 들어와야 했고, 우리 정글이 그것을 물었다.', no: '끌어당기다 병력을 꽤 잃었다.' },
        { label: '병력은 두고 주변 시야부터 확인한다', chk: { base: 50, sense: .4, mental: .2 }, s: [3, -2], ok: '숨어 있던 상대 정글을 먼저 봤다.', no: '확인하는 동안 병력 손해가 쌓였다.' },
      ] },
    { id: 'top_split', role: 'van', sit: 'any', title: '갈라 밀기', text: '본대가 가운데에서 대치하는 동안 나는 반대편 끝에 혼자 있다. 상대 둘이 나를 막으러 온다.',
      c: [
        { label: '둘을 상대로 버티며 계속 민다', chk: { base: 22, mech: .8, mental: .5, cond: 1 }, s: [10, -8], ok: '둘을 붙잡아 둔 사이 본대가 넷 대 셋으로 이겼다.', no: '둘에게 잡혔다. 본대는 넷이서 다섯을 상대했다.' },
        { label: '둘이 오는 것을 보고 바로 본대로 돌아간다', chk: { base: 36, sense: .7, team: .3 }, s: [6, -4], ok: '나는 돌아왔고 상대 둘은 아직 반대편이었다. 수가 맞지 않았다.', no: '돌아오는 길이 한 박자 늦었다.' },
        { label: '감독이 정해 준 대로 움직인다', chk: { base: 42, trust: 1, team: .3 }, s: [5, -3], ok: '약속된 움직임이었다. 팀 전체가 같은 그림을 보고 있었다.', no: '약속과 상황이 달랐다. 어정쩡하게 서 있었다.' },
      ] },
    { id: 'top_turn', role: 'van', sit: 'last', title: '역전 교전', text: '마지막 세트, 뒤지고 있다. 상대가 승기를 굳히려고 뭉쳐서 들어온다.',
      c: [
        { label: '옆에서 파고들어 뒤쪽 화력을 덮친다', chk: { base: 22, mech: .7, reflex: .6, cond: 1 }, s: [10, -8], ok: '상대 뒤쪽이 순식간에 무너졌다. 경기가 뒤집혔다.', no: '파고드는 길이 읽혔다.' },
        { label: '좁은 길목에서 받아 낸다', chk: { base: 36, sense: .6, team: .5 }, s: [7, -5], ok: '좁은 길에서 상대는 수를 살리지 못했다.', no: '상대는 길목을 돌아서 들어왔다.' },
        { label: '싸우지 않고 시간을 끈다', chk: { base: 44, mental: .7 }, s: [4, -3], ok: '조급해진 상대가 먼저 실수했다.', no: '시간은 상대 편이었다.' },
      ] },
    { id: 'top_swap', role: 'van', sit: 'any', title: '둘이 온다', text: '상대가 선수 배치를 바꿨다. 내 길에 둘이 서 있다.',
      c: [
        { label: '둘을 상대로 버텨 본다', chk: { base: 26, mental: .7, mech: .5, cond: 1 }, s: [8, -7], ok: '둘을 상대로 잃은 것이 거의 없었다.', no: '버티지 못하고 포탑을 일찍 내줬다.' },
        { label: '나도 다른 길로 자리를 바꾼다', chk: { base: 38, pool: .6, sense: .4 }, s: [6, -4], ok: '낯선 길에서도 할 일을 했다.', no: '바꾼 자리가 손에 익지 않았다.' },
        { label: '정글 옆에 붙어 같이 움직인다', chk: { base: 46, team: .6 }, s: [4, -2.5], ok: '정글과 둘이서 다른 곳에서 이득을 봤다.', no: '둘이 붙어 다니느라 내 성장이 늦었다.' },
      ] },
    { id: 'top_flank', role: 'van', sit: 'match', title: '돌아가는 길', text: '매치 포인트. 상대가 오브젝트 앞에 모였다. 뒤로 돌아가는 길이 비어 있다.',
      c: [
        { label: '뒤로 돌아 한꺼번에 덮친다', chk: { base: 26, sense: .6, reflex: .6, cond: 1 }, s: [9, -7], ok: '앞뒤로 갇힌 상대가 그대로 무너졌다.', no: '돌아가는 사이 정면이 먼저 터졌다.' },
        { label: '정면에서 팀과 함께 들어간다', chk: { base: 40, team: .8 }, s: [5, -3], ok: '다섯이 한 번에 들어갔다. 흔들림이 없었다.', no: '정면 힘 싸움에서 조금 밀렸다.' },
        { label: '싸움은 두고 빈 길의 포탑을 민다', chk: { base: 46, pool: .4, mental: .3 }, s: [4, -3], ok: '상대가 오브젝트를 치는 동안 포탑 둘이 사라졌다.', no: '포탑보다 오브젝트의 값이 컸다.' },
      ] },
    { id: 'jg_trade', role: 'rov', sit: 'any', title: '오브젝트 교환', text: '상대가 위쪽 오브젝트를 치기 시작했다. 아래쪽 오브젝트는 비어 있다.',
      c: [
        { label: '위로 달려가 싸움을 건다', chk: { base: 24, mech: .6, team: .6, cond: 1 }, s: [9, -7], ok: '치던 상대를 덮쳤다. 오브젝트도 싸움도 가져왔다.', no: '도착했을 때 상대는 이미 자리를 잡고 있었다.' },
        { label: '아래쪽을 가져가 맞바꾼다', chk: { base: 42, sense: .6, pool: .3 }, s: [5, -3], ok: '하나씩 나눠 가졌다. 손해는 없었다.', no: '상대 쪽 오브젝트가 조금 더 값졌다.' },
        { label: '둘 다 두고 상대 정글 구역을 비운다', chk: { base: 34, sense: .7, mech: .2 }, s: [6, -5], ok: '상대 정글이 돌아왔을 때 남은 것이 없었다.', no: '오브젝트 둘을 다 내준 셈이 됐다.' },
      ] },
    { id: 'jg_path', role: 'rov', sit: 'any', title: '첫 동선', text: '세트 시작. 어느 쪽부터 도느냐에 따라 첫 3분이 정해진다.',
      c: [
        { label: '상대 정글과 마주치는 쪽으로 돈다', chk: { base: 26, mech: .7, reflex: .5, cond: 1 }, s: [8, -7], ok: '첫 만남에서 이겼다. 상대 정글의 초반이 꼬였다.', no: '첫 만남에서 졌다. 내 초반이 꼬였다.' },
        { label: '상대가 예상하지 못할 쪽으로 돈다', chk: { base: 34, pool: .7, sense: .5 }, s: [7, -5], ok: '상대가 준비한 시야가 전부 헛것이 됐다.', no: '낯선 동선에 내가 먼저 느려졌다.' },
        { label: '감독과 준비한 동선 그대로 돈다', chk: { base: 44, trust: 1, team: .2 }, s: [4, -2.5], ok: '준비한 대로 흘러갔다.', no: '상대도 그 동선을 알고 있었다.' },
      ] },
    { id: 'jg_cover', role: 'rov', sit: 'any', title: '받아치는 기습', text: '상대 정글이 우리 미드를 노리고 있다는 느낌이 든다. 확실하지는 않다.',
      c: [
        { label: '미드 옆 수풀에 미리 숨는다', chk: { base: 34, sense: .9 }, s: [7, -5], ok: '느낌이 맞았다. 기습하러 온 상대가 거꾸로 잡혔다.', no: '상대 정글은 반대편에 있었다. 시간만 썼다.' },
        { label: '반대편 길을 먼저 덮쳐 손해를 맞춘다', chk: { base: 28, mech: .6, reflex: .5, cond: 1 }, s: [8, -6], ok: '우리 미드는 잡혔지만 나는 반대편에서 둘을 잡았다.', no: '미드도 잃고 반대편에서도 얻은 것이 없었다.' },
        { label: '미드에게 조심하라고만 한다', chk: { base: 50, team: .5 }, s: [3, -2], ok: '미드가 미리 물러나 있었다.', no: '말은 했지만 미드는 깊이 들어가 있었다.' },
      ] },
    { id: 'jg_five', role: 'rov', sit: 'last', title: '다섯이 함께', text: '마지막 세트 시작 전. 다섯이 상대 구역에 함께 들어가 초반을 흔들 수 있다.',
      c: [
        { label: '다섯이 함께 들어간다', chk: { base: 26, team: .8, mech: .3, cond: 1 }, s: [9, -8], ok: '시작하자마자 하나를 잡았다. 상대의 계획이 통째로 틀어졌다.', no: '상대가 기다리고 있었다. 시작부터 하나를 잃었다.' },
        { label: '들어가는 척하고 반대편 자원을 챙긴다', chk: { base: 36, sense: .7, pool: .3 }, s: [6, -4], ok: '상대가 막으러 모인 사이 반대편을 비웠다.', no: '상대는 속지 않았다.' },
        { label: '평소대로 시작한다', chk: { base: 50, mental: .5 }, s: [3, -2], ok: '평소대로 했고 평소만큼 풀렸다.', no: '조금 굳은 채로 시작했다.' },
      ] },
    { id: 'jg_side', role: 'rov', sit: 'elim', title: '무너지는 길', text: '지면 탈락이다. 한쪽 길이 계속 잡히고 있다. 그 길의 동료가 도와 달라고 한다.',
      c: [
        { label: '그 길에 계속 붙어 준다', chk: { base: 34, team: .7, mental: .4 }, s: [6, -5], ok: '무너지던 길이 버텼다. 그것으로 충분했다.', no: '붙어 있는 동안 다른 두 길이 밀렸다.' },
        { label: '그 길은 두고 이기는 쪽에 힘을 싣는다', chk: { base: 36, sense: .8 }, s: [7, -5], ok: '이기던 쪽이 크게 터졌다. 진 길의 손해를 덮고도 남았다.', no: '버린 길에서 생긴 구멍이 너무 컸다.' },
        { label: '내가 대신 성장해 후반을 본다', chk: { base: 28, mech: .6, pool: .5, cond: 1 }, s: [8, -6], ok: '후반 교전에서 내 성장이 차이를 만들었다.', no: '후반까지 가지 못했다.' },
      ] },
    { id: 'mid_wave', role: 'core', sit: 'any', title: '큰 병력', text: '큰 병력이 밀려온다. 다 받으면 성장하지만 그동안 옆 길을 도울 수 없다.',
      c: [
        { label: '빠르게 지우고 바로 움직인다', chk: { base: 28, mech: .8, reflex: .4, cond: 1 }, s: [8, -6], ok: '병력도 받고 옆 길 싸움에도 제때 도착했다.', no: '지우는 데 시간이 걸려 둘 다 놓쳤다.' },
        { label: '병력을 포기하고 먼저 움직인다', chk: { base: 36, sense: .7, team: .3 }, s: [6, -5], ok: '먼저 도착해 싸움을 이겼다. 병력보다 값졌다.', no: '싸움은 일어나지 않았다. 병력만 잃었다.' },
        { label: '다 받고 성장에 집중한다', chk: { base: 50, pool: .4, mental: .2 }, s: [3, -2], ok: '성장에서 한 걸음 앞섰다.', no: '옆 길이 수에서 밀려 조금 손해를 봤다.' },
      ] },
    { id: 'mid_new', role: 'core', sit: 'any', title: '낯선 상대', text: '상대 미드가 준비해 온 것은 한 번도 상대해 본 적 없는 방식이다.',
      c: [
        { label: '보이는 대로 맞서 본다', chk: { base: 24, reflex: .8, mech: .5, cond: 1 }, s: [9, -7], ok: '처음 보는 것이었지만 손이 먼저 답을 찾았다.', no: '모르는 것에 그대로 당했다.' },
        { label: '비슷한 경우를 떠올려 대응한다', chk: { base: 36, pool: .9 }, s: [6, -4], ok: '비슷한 상대를 해 본 경험이 그대로 통했다.', no: '비슷해 보였지만 다른 것이었다.' },
        { label: '정글에게 자주 와 달라고 한다', chk: { base: 44, team: .6, trust: .3 }, s: [4, -3], ok: '정글이 올 때마다 상대가 물러났다.', no: '정글이 묶여 다른 길이 손해를 봤다.' },
      ] },
    { id: 'mid_bait', role: 'core', sit: 'any', title: '미끼', text: '상대 미드의 체력이 낮아 보인다. 그런데 상대 정글이 한참 보이지 않는다.',
      c: [
        { label: '함정이어도 잡을 수 있다. 들어간다', chk: { base: 22, mech: .9, reflex: .5, cond: 1 }, s: [10, -8], ok: '함정이었지만 둘 다 잡았다.', no: '함정이었다. 그대로 걸렸다.' },
        { label: '들어가는 척하다 빠져 상대 정글을 끌어낸다', chk: { base: 34, sense: .7, mental: .4 }, s: [7, -5], ok: '숨어 있던 정글이 먼저 튀어나왔다. 우리 팀이 기다리고 있었다.', no: '끌어내지 못했다. 상대 미드만 체력을 채웠다.' },
        { label: '들어가지 않는다', chk: { base: 52, mental: .4 }, s: [3, -2], ok: '들어가지 않았고, 잠시 뒤 수풀에서 상대 정글이 나왔다.', no: '함정이 아니었다. 잡을 수 있는 기회였다.' },
      ] },
    { id: 'mid_alone', role: 'core', sit: 'elim', title: '나밖에 없다', text: '지면 탈락이다. 우리 팀에서 지금 무언가를 만들 수 있는 것은 나뿐이다.',
      c: [
        { label: '혼자 상대 화력을 노린다', chk: { base: 22, mech: .8, reflex: .6, cond: 1 }, s: [10, -8], ok: '혼자 들어가 상대 화력을 지웠다. 벤치가 일어섰다.', no: '혼자서는 닿지 않았다.' },
        { label: '옆 길로 내려가 다른 길부터 살린다', chk: { base: 36, sense: .6, team: .5 }, s: [6, -4], ok: '살아난 길이 다음 교전에서 값을 했다.', no: '내려간 사이 가운데 포탑이 깎였다.' },
        { label: '버티며 내 성장이 따라잡기를 기다린다', chk: { base: 42, mental: .6, pool: .3 }, s: [5, -3], ok: '버틴 끝에 힘이 맞춰졌다.', no: '기다리는 동안 격차가 더 벌어졌다.' },
      ] },
    { id: 'mid_side', role: 'core', sit: 'any', title: '옆길 병력', text: '경기 중반. 가운데는 동료에게 맡기고 내가 옆길 병력을 받으러 갈 수 있다.',
      c: [
        { label: '옆길 깊숙이 들어가 받는다', chk: { base: 30, sense: .5, reflex: .5, cond: 1 }, s: [7, -6], ok: '깊은 곳의 병력까지 다 챙겼다. 성장이 한 단계 앞섰다.', no: '깊이 들어갔다가 끊겼다.' },
        { label: '안전한 곳까지만 받는다', chk: { base: 44, sense: .5, mental: .3 }, s: [4, -2.5], ok: '무리 없이 필요한 만큼 챙겼다.', no: '반쯤만 받아 애매해졌다.' },
        { label: '가지 않고 가운데에서 팀과 뭉친다', chk: { base: 40, team: .7 }, s: [5, -3], ok: '뭉쳐 있던 덕에 갑자기 열린 교전을 이겼다.', no: '교전은 없었고 옆길 병력만 사라졌다.' },
      ] },
    { id: 'adc_kite', role: 'gun', sit: 'any', title: '거리 재기', text: '상대 앞라인이 나를 향해 걸어온다. 뒤로 빠지며 때릴 수 있는 길은 좁다.',
      c: [
        { label: '끝까지 물러나며 때린다', chk: { base: 26, mech: .9, reflex: .4, cond: 1 }, s: [9, -7], ok: '한 대도 맞지 않고 앞라인을 녹였다.', no: '물러날 곳이 먼저 끝났다.' },
        { label: '먼저 자리를 옮기고 나서 때린다', chk: { base: 38, sense: .7, reflex: .3 }, s: [6, -4], ok: '넓은 쪽으로 옮긴 뒤에는 쉬웠다.', no: '옮기는 사이 때릴 시간을 잃었다.' },
        { label: '앞라인은 두고 팀 뒤로 빠진다', chk: { base: 48, team: .4, mental: .3 }, s: [3, -2], ok: '팀이 앞라인을 대신 막았다.', no: '빠진 만큼 화력이 비었다.' },
      ] },
    { id: 'adc_lead', role: 'gun', sit: 'any', title: '라인전 우위', text: '아래쪽 길에서 앞서고 있다. 상대 둘이 포탑 아래에 붙어 있다.',
      c: [
        { label: '포탑 아래까지 들어가 잡는다', chk: { base: 22, mech: .7, team: .6, cond: 1 }, s: [10, -8], ok: '포탑 아래에서 둘을 다 잡았다.', no: '포탑에 맞으며 둘 다 쓰러졌다.' },
        { label: '포탑만 꾸준히 깎는다', chk: { base: 44, pool: .4, mech: .3 }, s: [4, -2.5], ok: '포탑이 일찍 무너졌다.', no: '깎는 속도가 느려 우위가 줄었다.' },
        { label: '서폿을 다른 길로 보내 이득을 나눈다', chk: { base: 36, sense: .6, team: .4 }, s: [6, -4], ok: '서폿이 간 길도 앞서기 시작했다.', no: '혼자 남은 내가 압박을 받았다.' },
      ] },
    { id: 'adc_build', role: 'gun', sit: 'any', title: '성장의 방향', text: '다음 교전 전에 화력과 생존 가운데 하나를 먼저 갖춰야 한다.',
      c: [
        { label: '화력부터 갖춘다', chk: { base: 30, mech: .8, cond: 1 }, s: [8, -7], ok: '먼저 때려서 먼저 끝냈다.', no: '때리기 전에 쓰러졌다.' },
        { label: '생존부터 갖춘다', chk: { base: 44, mental: .5, sense: .3 }, s: [4, -2.5], ok: '끝까지 살아서 할 만큼 했다.', no: '살아는 있었지만 화력이 모자랐다.' },
        { label: '상대 구성을 보고 정한다', chk: { base: 36, pool: .8, sense: .3 }, s: [6, -4], ok: '상대에게 꼭 맞는 선택이었다.', no: '읽은 것과 상대의 실제 움직임이 달랐다.' },
      ] },
    { id: 'adc_chase', role: 'gun', sit: 'match', title: '쫓을 것인가', text: '매치 포인트 교전. 상대 넷이 쓰러졌고 하나가 도망친다. 잡으면 그대로 끝낼 수도 있다.',
      c: [
        { label: '끝까지 쫓아가 잡는다', chk: { base: 30, reflex: .7, mech: .5, cond: 1 }, s: [8, -6], ok: '마지막 하나까지 잡았다. 그대로 끝냈다.', no: '쫓다가 시간을 다 썼다. 상대가 되살아났다.' },
        { label: '쫓지 않고 오브젝트를 친다', chk: { base: 44, team: .5, sense: .3 }, s: [5, -3], ok: '오브젝트를 가져갔다. 다음 교전은 더 쉬웠다.', no: '오브젝트를 치는 사이 상대가 정비를 마쳤다.' },
        { label: '쫓지 않고 포탑을 민다', chk: { base: 48, pool: .4 }, s: [4, -2], ok: '포탑 둘이 무너졌다.', no: '포탑 하나에 그쳤다.' },
      ] },
    { id: 'adc_bare', role: 'gun', sit: 'any', title: '앞이 무너졌다', text: '교전이 시작되자마자 우리 앞라인이 쓰러졌다. 상대 셋이 나에게 온다.',
      c: [
        { label: '물러서지 않고 셋을 상대한다', chk: { base: 20, mech: .9, reflex: .6, cond: 1 }, s: [10, -8], ok: '셋을 차례로 쓰러뜨렸다. 중계석이 말을 잇지 못했다.', no: '셋은 너무 많았다.' },
        { label: '포탑까지 물러나며 시간을 번다', chk: { base: 40, sense: .6, mental: .4 }, s: [5, -3], ok: '포탑 아래에서 동료들이 돌아올 때까지 버텼다.', no: '포탑까지 가지 못했다.' },
        { label: '혼자 빠져 다음 교전을 본다', chk: { base: 48, mental: .5 }, s: [3, -2.5], ok: '나라도 살아서 다음 교전을 치렀다.', no: '다음 교전은 수가 모자랐다.' },
      ] },
    { id: 'sup_roam', role: 'sup', sit: 'any', title: '자리 비우기', text: '아래쪽 길은 조용하다. 내가 가운데로 올라가면 수적 우위가 생긴다. 원딜은 혼자 남는다.',
      c: [
        { label: '올라가서 가운데 싸움을 연다', chk: { base: 28, sense: .7, reflex: .4, cond: 1 }, s: [8, -6], ok: '가운데에서 하나를 잡고 돌아왔다. 원딜은 무사했다.', no: '가운데는 빈손이었고 원딜이 그사이 잡혔다.' },
        { label: '올라가는 척만 하고 돌아온다', chk: { base: 40, sense: .5, mental: .4 }, s: [5, -3], ok: '내가 사라진 것만으로 상대 미드가 물러났다.', no: '아무도 속지 않았다.' },
        { label: '원딜 곁을 지킨다', chk: { base: 48, team: .5 }, s: [3, -2], ok: '둘이서 조용히 성장했다.', no: '가운데가 수에서 밀렸다.' },
      ] },
    { id: 'sup_stop', role: 'sup', sit: 'any', title: '싸움을 말린다', text: '우리 탑이 혼자 싸움을 걸려고 한다. 지금 싸우면 수가 모자란다.',
      c: [
        { label: '"멈춰" 하고 스킬로 길을 막는다', chk: { base: 36, team: .6, mental: .5 }, s: [6, -4], ok: '탑이 멈췄다. 십 초 뒤, 수가 맞춰지고 나서 싸움을 이겼다.', no: '말이 늦었다. 탑은 이미 들어가 있었다.' },
        { label: '어쩔 수 없다. 같이 들어간다', chk: { base: 26, reflex: .6, mech: .4, cond: 1 }, s: [9, -8], ok: '모자란 수로 이겼다. 탑이 옳았다.', no: '모자란 수는 모자란 수였다.' },
        { label: '따라가지 않고 뒤에서 퇴로만 연다', chk: { base: 46, sense: .5 }, s: [4, -3], ok: '탑이 살아서 돌아왔다.', no: '퇴로를 열었지만 탑은 돌아오지 못했다.' },
      ] },
    { id: 'sup_swap', role: 'sup', sit: 'any', title: '맞바꾸기', text: '상대 주력이 스킬을 다 썼다. 내가 몸을 던지면 잡을 수 있다. 나는 살아 나오지 못한다.',
      c: [
        { label: '내 목숨과 맞바꾼다', chk: { base: 34, mental: .6, reflex: .5 }, s: [7, -6], ok: '나는 쓰러졌고 상대 주력도 쓰러졌다. 남는 장사였다.', no: '나만 쓰러졌다.' },
        { label: '잡는 것은 원딜에게 맡기고 길만 막는다', chk: { base: 38, team: .8 }, s: [6, -4], ok: '도망칠 길을 막았고 원딜이 마무리했다.', no: '원딜의 화력이 조금 모자랐다.' },
        { label: '무리하지 않는다', chk: { base: 50, mental: .3, sense: .2 }, s: [3, -2], ok: '다음 기회에 더 싸게 잡았다.', no: '그런 기회는 다시 오지 않았다.' },
      ] },
    { id: 'sup_dark', role: 'sup', sit: 'last', title: '마지막 시야', text: '마지막 세트, 마지막 오브젝트. 상대 시야를 지울 수단이 하나 남았다. 어디에 쓸지 정해야 한다.',
      c: [
        { label: '상대가 들어올 길을 어둡게 만든다', chk: { base: 30, sense: .8, reflex: .3, cond: 1 }, s: [8, -7], ok: '보이지 않는 길로 들어오던 상대를 먼저 덮쳤다.', no: '상대는 다른 길로 들어왔다.' },
        { label: '오브젝트 주변을 밝힌다', chk: { base: 42, sense: .5, team: .4 }, s: [5, -3], ok: '오브젝트 앞 싸움이 전부 보였다.', no: '밝힌 곳 바깥에서 싸움이 났다.' },
        { label: '감독이 미리 정해 준 자리에 쓴다', chk: { base: 44, trust: 1 }, s: [4, -2.5], ok: '준비한 자리가 정확히 그 자리였다.', no: '준비한 것과 상황이 달랐다.' },
      ] },
    { id: 'sup_two', role: 'sup', sit: 'any', title: '갈린 콜', text: '교전 직전, 두 사람이 서로 다른 콜을 했다. 3초 안에 하나로 정리해야 한다.',
      c: [
        { label: '내가 정한다. "들어가"', chk: { base: 28, team: .6, mental: .5, cond: 1 }, s: [8, -7], ok: '다섯이 한 번에 들어갔다. 망설임이 없었다.', no: '반은 들어가고 반은 멈췄다.' },
        { label: '내가 정한다. "빠져"', chk: { base: 42, mental: .6, sense: .3 }, s: [4, -2.5], ok: '다 같이 빠졌다. 잃은 것이 없었다.', no: '빠지는 뒤를 잡혔다.' },
        { label: '형세를 더 잘 읽은 쪽의 콜을 따른다', chk: { base: 36, sense: .9 }, s: [6, -4], ok: '옳은 콜을 골랐다.', no: '고른 콜이 틀린 쪽이었다.' },
      ] },
  ];

  /* 팬 반응 문장 틀 (5단계). 그 달의 실제 경기 기록에서 확인된 사실에만 붙는다.
     분류(키)마다 붙을 수 있는 조건은 엔진의 fanFacts 가 정한다. 여기서는 문장과 말투만 관리한다.
       v: c 응원 / x 쓴소리 / a 분석 / h 기대
       tier: 1 이면 1군 경기에만, 2 이면 2군 경기에만 쓴다
       if: 추가 조건 — L 그 달에 진 경기가 있음, gt 내 평점이 라이벌보다 높음, lt 낮음, behind 통산 전적에서 뒤짐, r6 그 경기 평점 6.0 이상, r6- 6.0 미만
     바뀌는 말: {nick} 내 아이디, {opp} 상대 팀, {rival} 라이벌 아이디, {r} 내 평점, {rr} 라이벌 평점, {score} 시리즈 스코어, {label} 경기 단계,
               {n} 연승·연패 수, {w}{l} 그 달 승·패, {avg} 그 달 평균 평점, {hw}{hl} 라이벌 상대 통산 승·패
     이름 뒤 조사는 받침에 따라 달라지지 않는 꼴만 쓴다: "{nick}의, {nick}에게, {nick}도, {nick}만, {opp}전, {rival} 상대로, {rival} 쪽". */
  D.FAN_VOICE = { c: '응원', x: '쓴소리', a: '분석', h: '기대' };
  D.FAN = {
    month_good: [
      { v: 'c', t: '이번 달 {w}승 {l}패. {nick} 경기는 챙겨 볼 맛이 난다.' },
      { v: 'c', t: '{nick} 폼이 올라온 게 맞다. 이번 달 {w}승.' },
      { v: 'a', t: '{w}승 {l}패. 초반 운영이 안정되면서 {nick}에게 자원이 제때 들어갔다.' },
      { v: 'a', t: '이긴 경기들을 보면 {nick}의 자리 잡기가 한 박자씩 빨랐다.' },
      { v: 'h', t: '이 흐름이면 다음 달 순위 싸움도 해 볼 만하다.' },
      { v: 'h', t: '{nick}, 이대로만 가자. 다음 달 일정표부터 찾아봤다.' },
      { v: 'x', if: 'L', t: '{w}승이긴 한데 진 경기 내용은 짚고 넘어가야 한다.' },
      { v: 'c', tier: 2, t: '넥스트 리그 중계 채팅에 {nick} 이름이 자주 보이기 시작했다.' },
      { v: 'h', tier: 2, t: '{nick}, 1군에서 보고 싶다는 글이 올라왔다.' },
      { v: 'a', t: '{nick}의 이번 달 평균 평점 {avg}. 이긴 경기에서는 늘 중심에 있었다.' },
      { v: 'c', t: '요즘 {nick} 경기 보는 재미로 산다는 글이 올라왔다.' },
      { v: 'h', t: '{w}승 {l}패. 이 성적이 한 달 더 이어지면 평가가 달라질 것이다.' },
      { v: 'x', t: '성적은 좋지만 방심은 이르다. 다음 달이 진짜다.' },
      { v: 'a', t: '교전을 여는 순간마다 {nick}의 판단이 빨랐다. {w}승이 그냥 나온 것이 아니다.' },
    ],
    month_bad: [
      { v: 'x', t: '{w}승 {l}패. {nick}, 이번 달은 변명하기 어렵다.' },
      { v: 'x', t: '진 경기마다 비슷한 장면에서 무너졌다. 준비가 부족해 보였다.' },
      { v: 'a', t: '{l}패 가운데 초반에 벌어진 경기가 많았다. 첫 교전 설계부터 다시 봐야 한다.' },
      { v: 'a', t: '{nick}에게 자원이 몰린 판에서 결과가 나오지 않았다. 팀이 다른 답을 찾을 수도 있다.' },
      { v: 'c', t: '성적은 아쉬워도 {nick}의 경기는 끝까지 봤다. 다음 달에 갚자.' },
      { v: 'c', t: '지금이 바닥이라고 믿는다. {nick} 응원 글은 그래도 꾸준히 올라온다.' },
      { v: 'h', t: '다음 달에는 달라진 모습을 보여 줄 차례다.' },
      { v: 'x', tier: 2, t: '넥스트 리그에서 이 성적이면 콜업 이야기는 당분간 어렵다.' },
      { v: 'h', tier: 2, t: '2군 성적표는 금방 바뀐다. {nick}의 다음 달을 보자.' },
      { v: 'a', t: '{nick}의 이번 달 평균 평점 {avg}. 팀이 흔들릴 때 중심을 잡아 주지 못했다.' },
      { v: 'x', t: '이길 수 있던 판을 놓친 것이 아프다. {w}승 {l}패.' },
      { v: 'c', t: '{nick}, 결과는 나빴지만 포기하는 플레이는 없었다.' },
      { v: 'h', t: '한 달로 선수를 판단하지는 않는다. {nick}의 반등을 기다린다.' },
      { v: 'a', t: '길어진 경기에서 집중력 차이가 났다. 후반 운영을 다시 봐야 한다.' },
    ],
    month_even: [
      { v: 'a', t: '{w}승 {l}패, 딱 반반. 이긴 판과 진 판의 차이가 컸다.' },
      { v: 'c', t: '기복은 있어도 {nick}의 좋은 날은 확실히 좋았다.' },
      { v: 'x', t: '잘한 날과 못한 날이 너무 다르다. 꾸준함이 숙제다.' },
      { v: 'h', t: '반반이면 다음 달에 방향이 갈린다. 지켜볼 만하다.' },
      { v: 'a', t: '{nick}의 이번 달 평균 평점 {avg}. 팀 성적과 거의 같이 움직였다.' },
    ],
    form_hi: [
      { v: 'c', t: '이번 달 평균 평점 {avg}. {nick}, 지금 손꼽히는 폼이다.' },
      { v: 'a', t: '평균 평점 {avg}. 그냥 나온 숫자가 아니다. 교전마다 가장 먼저 반응했다.' },
      { v: 'h', t: '이 폼이 큰 경기까지 이어지면 무서울 것이다.' },
      { v: 'c', t: '{nick} 하이라이트만 모은 영상이 벌써 올라왔다.' },
      { v: 'a', t: '{nick}에게 압박이 몰렸는데도 실수가 거의 없었다.' },
      { v: 'h', tier: 1, t: '연말 시상식 이야기가 조금씩 나온다. 아직 이르지만 기대는 된다.' },
    ],
    form_lo: [
      { v: 'x', t: '평균 평점 {avg}. 기대에 못 미친 한 달이었다.' },
      { v: 'x', t: '{nick}, 교전마다 반 박자씩 늦었다. 컨디션 문제로 보인다.' },
      { v: 'a', t: '무리한 진입이 여러 번 끊겼다. 상대가 {nick}의 습관을 읽은 것 같다.' },
      { v: 'c', t: '누구에게나 이런 달은 있다. {nick}, 쉬어 갈 때는 쉬어 가자.' },
      { v: 'h', t: '평점은 바닥을 찍었다. 이제 올라갈 일만 남았다.' },
      { v: 'a', if: 'L', t: '평균 평점 {avg}. 진 경기에서 특히 존재감이 없었다.' },
    ],
    mvp: [
      { v: 'c', t: '{opp}전 MVP는 당연히 {nick}. 평점 {r}.' },
      { v: 'c', t: 'MVP 인터뷰에 나선 {nick}의 표정이 오늘은 밝았다.' },
      { v: 'a', t: '{opp}전 MVP 장면을 다시 보면 {nick}의 판단이 상대보다 두 수 앞섰다.' },
      { v: 'h', t: 'MVP를 받는 날이 생긴다. 시즌 끝에 무엇이 걸려 있을지 궁금하다.' },
      { v: 'a', t: '평점 {r}. MVP 투표가 갈릴 이유가 없는 {opp}전이었다.' },
      { v: 'c', t: '{nick}에게 MVP가 돌아간 {opp}전은 두 번 돌려 봤다.' },
      { v: 'x', t: 'MVP는 받았지만 더 잘할 수 있는 선수다. 초반 실수는 짚어야 한다.' },
      // 포지션별(0.9.0). role 이 맞을 때만 쓰인다. {kl}·{de}·{as}·{ka} 는 그 경기의 실제 킬·데스·어시스트·킬+어시스트
      { v: 'a', role: 'van', t: '{opp}전 MVP는 탑 {nick}. {kl}킬 {de}데스 {as}어시스트, 평점 {r}.' },
      { v: 'a', role: 'rov', t: '{opp}전 MVP는 정글 {nick}. 킬과 어시스트를 합쳐 {ka}번 관여했다. 평점 {r}.' },
      { v: 'c', role: 'core', t: '미드 {nick}, {opp}전 {kl}킬에 평점 {r}. MVP가 다른 데로 갈 수 없었다.' },
      { v: 'c', role: 'gun', t: '원딜 {nick}, {opp}전 {kl}킬 {de}데스. MVP 받을 만했다.' },
      { v: 'c', role: 'sup', t: '서폿이 MVP를 받았다. {opp}전 {nick}, 어시스트 {as}개에 평점 {r}.' },
    ],
    carry_l: [
      { v: 'c', t: '{opp}전은 졌지만 {nick} 혼자 평점 {r}. 할 만큼 했다.' },
      { v: 'a', t: '{opp}전 평점 {r}. {nick}만으로는 부족했다. 다른 자리에서 벌어진 격차가 컸다.' },
      { v: 'x', t: '{nick}에게만 기대는 운영이 문제다. {opp}전이 그것을 보여 줬다.' },
      { v: 'c', t: '진 경기에서 가장 빛난 이름이 {nick}. 마음이 복잡하다.' },
      { v: 'h', t: '{nick}에게서 이런 경기력이 계속 나오면 팀 성적도 따라올 것이다.' },
      { v: 'a', t: '{opp}전 패배 속에서도 {nick}의 교전 기여는 팀에서 가장 높았다.' },
      { v: 'a', role: 'van', t: '{opp}전은 졌지만 탑 {nick}의 평점은 {r}. {de}데스로 버틴 경기였다.' },
      { v: 'a', role: 'rov', t: '진 {opp}전에서도 정글 {nick}의 관여는 {ka}번. 평점 {r}.' },
      { v: 'c', role: 'core', t: '미드 {nick}, 진 경기에서 {kl}킬에 평점 {r}. 혼자서는 모자랐다.' },
      { v: 'c', role: 'gun', t: '원딜 {nick}, {opp}전에서 {kl}킬을 하고도 졌다. 평점 {r}.' },
      { v: 'a', role: 'sup', t: '{opp}전 패배. 서폿 {nick}의 어시스트 {as}개와 평점 {r}, 기록으로 남는다.' },
    ],
    pass_w: [
      { v: 'x', t: '{opp}전은 이겼지만 {nick}의 평점은 {r}. 묻어간 경기였다.' },
      { v: 'a', t: '승리에 가려졌을 뿐 {opp}전에서 {nick}의 실수는 여러 번 나왔다. 평점 {r}.' },
      { v: 'c', t: '못한 날에도 팀이 이겨 준다. {nick}에게는 다행인 {opp}전.' },
      { v: 'h', t: '이긴 날 못한 것은 금방 잊힌다. 다음 경기에서 갚으면 된다.' },
      { v: 'x', t: '{nick}, {opp}전 같은 경기력으로는 강팀을 넘기 어렵다.' },
      { v: 'a', t: '{opp}전 승리는 동료들의 몫이 컸다. {nick}도 알 것이다.' },
    ],
    streak_w: [
      { v: 'c', t: '{n}연승. {nick}의 팀이 나오는 날은 마음이 편하다.' },
      { v: 'a', t: '{n}연승 동안 {nick}의 초반 실수가 거의 없었다.' },
      { v: 'h', t: '{n}연승. 어디까지 가는지 보자.' },
      { v: 'c', t: '연승 숫자가 {n}까지 올랐다. 분위기가 좋다.' },
      { v: 'x', t: '{n}연승에 취할 때가 아니다. 진짜 시험은 강팀을 만났을 때다.' },
      { v: 'a', t: '{n}연승의 중심에 {nick}의 꾸준한 경기력이 있다.' },
      { v: 'h', t: '{n}연승. 이 팀이 어디까지 올라갈지 궁금해졌다.' },
      { v: 'c', t: '{n}연승 중. {nick}의 표정에서 여유가 보인다.' },
    ],
    streak_l: [
      { v: 'x', t: '{n}연패. {nick}도 책임에서 자유롭지 않다.' },
      { v: 'x', t: '연패가 {n}까지 늘었다. 뭔가 바꿔야 한다.' },
      { v: 'a', t: '{n}연패 내내 비슷한 방식으로 졌다. 준비한 전략이 읽히고 있다.' },
      { v: 'c', t: '{n}연패여도 응원은 계속한다. {nick}, 고개 들자.' },
      { v: 'h', t: '{n}연패. 한 번만 이기면 흐름은 바뀐다.' },
      { v: 'a', t: '{n}연패. 팀이 가라앉는 동안 {nick}에게도 뾰족한 답이 없었다.' },
      { v: 'h', t: '{n}연패. 바닥을 확인했으니 올라갈 일만 남았다.' },
      { v: 'c', t: '{n}연패 중에도 경기장을 찾는 팬들이 있다. {nick}, 그 사람들을 보자.' },
      { v: 'x', t: '{n}연패. 같은 방식으로 같은 결과를 반복하고 있다.' },
    ],
    rv_w: [
      { v: 'c', t: '{rival} 상대로 이겼다. {nick} 팬들에게는 이번 달 최고의 경기.' },
      { v: 'a', if: 'gt', t: '라이벌전 평점은 {nick} {r}, {rival} {rr}. 숫자가 말해 준다.' },
      { v: 'a', if: 'lt', t: '평점은 {rival} 쪽이 더 높았다({rr}). 그래도 웃은 것은 {nick}의 팀이었다.' },
      { v: 'c', t: '{rival}에게 한 방 먹였다. 통산 전적은 {hw}승 {hl}패.' },
      { v: 'h', t: '{rival}전이 가장 기다려지는 대진이 됐다.' },
      { v: 'x', t: '이긴 것은 이긴 것이고, {rival} 쪽은 다음에 더 준비해 올 것이다.' },
      { v: 'c', t: '라이벌전 승리. {nick} 이름이 커뮤니티 인기 글에 올랐다.' },
    ],
    rv_l: [
      { v: 'x', t: '{rival}에게 졌다. {nick}, 이 대진만큼은 지면 안 됐다.' },
      { v: 'a', t: '라이벌전 패배. 평점은 {rival} {rr}, {nick} {r}.' },
      { v: 'c', t: '{rival}에게 졌어도 {nick}의 다음 맞대결을 기다린다.' },
      { v: 'h', t: '통산 {hw}승 {hl}패. 다음 {rival}전에서 갚을 차례다.' },
      { v: 'a', t: '{rival} 쪽이 {nick}의 초반 움직임을 정확히 읽고 나왔다.' },
      { v: 'x', if: 'behind', t: '{rival} 앞에서 작아진다는 말이 나온다. 통산 {hw}승 {hl}패.' },
      { v: 'c', t: '졌지만 라이벌전다운 경기였다. {nick}도 {rival}도 잘했다.' },
    ],
    clutch_ok: [
      { v: 'c', t: '{label} 승부처에서 {nick}의 선택이 통했다. 소름이 돋았다.' },
      { v: 'a', t: '승부처 판단이 정확했다. 큰 경기에서 {nick}에게 콜이 가는 이유다.' },
      { v: 'h', t: '저런 승부처를 넘기는 선수는 큰 무대에서 다시 해낸다.' },
      { v: 'c', t: '{nick}의 승부처 장면 클립이 벌써 수십 번 돌았다.' },
      { v: 'a', t: '승부처에서 {nick}의 선택은 위험했지만 근거가 있었다.' },
      { v: 'x', t: '승부처는 넘겼지만 그 상황까지 몰린 것부터 돌아봐야 한다.' },
      { v: 'c', t: '승부처 "{mt}"에서 {nick}의 선택이 맞았다.' },
      { v: 'a', role: 'van', t: '승부처 "{mt}". 탑 {nick}의 판단 하나가 세트를 가져왔다.' },
      { v: 'a', role: 'rov', t: '승부처 "{mt}". 정글 {nick}의 선택이 그 세트의 흐름을 정했다.' },
      { v: 'a', role: 'core', t: '승부처 "{mt}". 미드 {nick}에게 맡긴 것이 옳았다.' },
      { v: 'a', role: 'gun', t: '승부처 "{mt}". 원딜 {nick}의 선택이 통했다.' },
      { v: 'a', role: 'sup', t: '승부처 "{mt}". 서폿 {nick}의 선택 덕에 팀이 살았다.' },
    ],
    clutch_no: [
      { v: 'x', t: '{label} 승부처에서 {nick}의 선택이 빗나갔다. 그 장면이 계속 생각난다.' },
      { v: 'a', t: '승부처 실패. 선택 자체보다 실행이 반 박자 늦었다.' },
      { v: 'c', t: '승부처에서 틀릴 수도 있다. 과감했던 {nick}의 선택을 탓하고 싶지 않다.' },
      { v: 'h', t: '다음 승부처에서는 {nick}의 선택이 맞을 것이다.' },
      { v: 'x', t: '큰 경기 승부처에서 흔들렸다는 글이 올라왔다.' },
      { v: 'a', t: '승부처에서 {nick}의 선택이 막히면서 팀이 어려운 싸움을 했다.' },
      { v: 'x', t: '승부처 "{mt}"에서 {nick}의 선택이 통하지 않았다.' },
      { v: 'x', role: 'van', t: '승부처 "{mt}". 탑 {nick}의 선택이 빗나갔다.' },
      { v: 'x', role: 'rov', t: '승부처 "{mt}". 정글 {nick}의 선택이 이번에는 틀렸다.' },
      { v: 'x', role: 'core', t: '승부처 "{mt}". 미드 {nick}의 선택이 막혔다.' },
      { v: 'x', role: 'gun', t: '승부처 "{mt}". 원딜 {nick}의 선택이 통하지 않았다.' },
      { v: 'c', role: 'sup', t: '승부처 "{mt}"는 넘지 못했다. 그래도 서폿 {nick}의 선택에는 이유가 있었다.' },
    ],
    po_w: [
      { v: 'c', t: '{label} 통과. {score}. {nick}의 팀이 한 걸음 더 간다.' },
      { v: 'a', t: '{opp} 상대 {label}, {score}. 세트마다 초반 설계가 달랐다.' },
      { v: 'h', t: '{label} 통과. 다음 상대가 누구든 해 볼 만하다.' },
      { v: 'c', t: '{opp} 꺾고 올라간다. {nick}의 시리즈 평점 {r}.' },
      { v: 'x', t: '올라가긴 했지만 내용은 불안했다. 다음 라운드가 걱정이다.' },
    ],
    po_l: [
      { v: 'x', t: '{label} 탈락. {opp} 상대 {score}. 이번 대회는 여기까지다.' },
      { v: 'a', t: '{opp} 쪽이 시리즈 내내 한 수 위였다. {score}.' },
      { v: 'c', t: '{label}에서 멈췄지만 여기까지 온 것도 {nick}의 힘이다.' },
      { v: 'h', t: '이번 탈락이 다음 대회의 약이 될 것이다.' },
      { v: 'a', t: '{nick}의 시리즈 평점 {r}. 팀 전체가 {opp}의 속도를 따라가지 못했다.' },
    ],
    final_w: [
      { v: 'c', t: '결승 승리! {nick}, 결승 평점 {r}. 오늘은 잠 못 잔다.' },
      { v: 'c', t: '결승 {score}. {nick}의 이름이 트로피에 새겨진다.' },
      { v: 'a', t: '결승에서 {nick}의 팀은 {opp}의 강점을 세트마다 하나씩 지웠다.' },
      { v: 'h', t: '정상에 서 본 팀은 다시 오르는 법을 안다. 다음 대회가 기다려진다.' },
      { v: 'c', t: '결승 무대에서 {nick} 응원 소리가 가장 컸다.' },
      { v: 'a', t: '결승 {score}, {nick}의 평점 {r}. 기록으로 남을 시리즈다.' },
    ],
    final_l: [
      { v: 'x', t: '결승 {score} 패배. 마지막 한 걸음이 모자랐다.' },
      { v: 'c', t: '결승까지 온 것만으로도 대단하다. {nick}, 고개 숙이지 말자.' },
      { v: 'a', t: '결승에서는 {opp} 쪽이 준비를 더 잘해 왔다. {score}.' },
      { v: 'h', t: '결승까지 온 팀이다. 다음에는 한 걸음 더 갈 수 있다.' },
      { v: 'a', t: '{nick}의 결승 평점 {r}. 시리즈가 길어질수록 차이가 드러났다.' },
      { v: 'c', t: '시상식에서 {nick}의 얼굴이 계속 화면에 잡혔다. 다음에는 웃자.' },
    ],
    debut: [
      { v: 'c', t: '{nick}, 1군 데뷔전을 치렀다. 첫 경기 평점 {r}.' },
      { v: 'h', t: '새 얼굴 {nick}. 몇 경기 더 보고 싶다.' },
      { v: 'a', if: 'r6', t: '데뷔전 평점 {r}. 긴장한 티는 났지만 할 일은 했다.' },
      { v: 'a', if: 'r6-', t: '데뷔전 평점 {r}. 1군의 속도에 적응이 필요해 보였다.' },
    ],
    bench: [
      { v: 'h', t: '이번 달 출전 명단에서 {nick}의 이름을 찾는 글이 올라왔다.' },
      { v: 'x', tier: 1, t: '{nick}에게 기회를 주지 않을 거면 왜 올렸느냐는 말이 나온다.' },
      { v: 'c', t: '벤치에 있어도 {nick} 응원은 계속된다.' },
      { v: 'a', t: '지금 주전의 폼이 좋아 {nick}에게 자리가 나기 어렵다.' },
      { v: 'h', t: '{nick}, 한 번만 나오면 보여 줄 것이라 믿는다.' },
      { v: 'a', t: '벤치에서 보낸 한 달. 스크림 평가가 올라야 기회가 온다.' },
    ],
  };

  // NPC 선수 아이디 생성용 음절 (창작)
  D.SYL_A = ['Ka', 'Zu', 'Mo', 'Ri', 'Ten', 'Vo', 'Lu', 'Sha', 'Nix', 'Dro', 'Py', 'Qua', 'El', 'Jin', 'Bo', 'Tae', 'Mir', 'Oz', 'Cru', 'Hex', 'Yu', 'Sol'];
  D.SYL_B = ['ro', 'ven', 'mi', 'zen', 'ka', 'lo', 'rin', 'dus', 'pa', 'nyx', 'bit', 'han', 'so', 'ty', 'gon', 'wi'];

  // 은퇴 점수 → 상위 % (자동 시뮬레이션 커리어 분포 기준. test/sim.js 로 갱신)
  D.PCT = [[99, 1], [94, 3], [75, 8], [55, 16], [43, 28], [34, 42], [28, 58], [22, 74], [11, 90]];

  // 도전 과제: 수집 요소. 경기·능력치·연봉에는 영향이 없다. 판정식은 engine.js 의 ACHV(같은 id).
  D.ACH = [
    { id: 'debut', name: '1군 데뷔', desc: '1군 선수가 된다' },
    { id: 'win1', name: '첫 승', desc: '1군 공식전에서 처음 이긴다' },
    { id: 'mvp1', name: '오늘의 주인공', desc: '경기 MVP에 처음 뽑힌다' },
    { id: 'g100', name: '백 경기', desc: '한 커리어에서 1군 100경기에 출전한다' },
    { id: 't_second', name: '2군 정상', desc: '2군 리그에서 우승한다' },
    { id: 't_dom', name: '리그 우승', desc: '자국 1군 리그에서 우승한다' },
    { id: 't_mid', name: '미드시즌 컵', desc: '미드시즌 컵에서 우승한다' },
    { id: 't_nations', name: '나라의 이름으로', desc: '네이션스컵에서 우승한다' },
    { id: 't_world', name: '세계 정상', desc: '월드 파이널에서 우승한다' },
    { id: 'rookie', name: '신인상', desc: '신인상을 받는다' },
    { id: 'poy', name: '올해의 선수', desc: '올해의 선수에 뽑힌다' },
    { id: 'rv_win', name: '동기를 넘어서', desc: '공식전에서 라이벌이 뛴 팀을 이긴다' },
    { id: 'rv_10', name: '천적', desc: '한 커리어에서 같은 라이벌을 10번 이긴다' },
    { id: 'fin1', name: '첫 은퇴', desc: '커리어 하나를 은퇴까지 마친다' },
    { id: 'fin3', name: '세 번의 인생', desc: '커리어 세 개를 은퇴까지 마친다' },
    { id: 'fin10', name: '열 번의 인생', desc: '커리어 열 개를 은퇴까지 마친다' },
    { id: 'no_title', name: '무관의 끝', desc: '1군에서 뛰었지만 1군 우승 없이 은퇴한다' },
    { id: 'no_debut', name: '닿지 못한 무대', desc: '1군에 데뷔하지 못하고 은퇴한다' },
    { id: 'age30', name: '롱런', desc: '서른 살 이후에 은퇴한다' },
    { id: 'grade_a', name: '리그의 간판', desc: 'A등급 이상으로 은퇴한다' },
    { id: 'grade_s', name: '전설', desc: 'S등급 이상으로 은퇴한다' },
  ];

  (root.PG_VER = root.PG_VER || {}).data = '0.11.1';   // 파일 버전(여섯 곳이 같아야 한다. sw.js 머리말 참고)
  root.PG_DATA = D;
  if (typeof module !== 'undefined') module.exports = D;
})(typeof window !== 'undefined' ? window : globalThis);
