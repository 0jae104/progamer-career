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
    { id: 'grinder', name: '노력형', desc: '모든 성장이 12% 빠르고 컨디션 소모가 적다. 한계는 평범하다.' },
    { id: 'brain', name: '두뇌형', desc: '판단력·숙련 폭 한계가 높고 노쇠가 늦게 온다.' },
  ];

  D.PLANS = [
    { id: 'solo', name: '솔로 랭크', desc: '피지컬·반응속도 성장. 컨디션과 손목 소모가 크다', g: { mech: .9, reflex: .7, pool: .2 }, cond: -9, wrist: -3 },
    { id: 'scrim', name: '팀 스크림', desc: '팀워크·판단력 성장. 감독 신뢰가 오른다', g: { team: .9, sense: .5, mental: .2 }, cond: -7, wrist: -2, trust: 2.5 },
    { id: 'review', name: '리플레이 분석', desc: '판단력·숙련 폭 성장. 소모가 적다', g: { sense: .8, pool: .8 }, cond: -3, wrist: 0 },
    { id: 'rest', name: '휴식', desc: '컨디션과 손목 회복. 멘탈이 조금 오른다', g: { mental: .4 }, cond: 24, wrist: 5, base: .5 },
    { id: 'stream', name: '개인 방송', desc: '인기와 수입. 성장은 더디다', g: {}, cond: -4, wrist: -1, fame: 1.5, base: .6 },
  ];

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
  for (const r in orgs) orgs[r].forEach((o, i) => D.ORGS.push({ id: r + i, region: r, name: o[0], tag: o[1], str: o[2], color: o[3] }));
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
  D.EVENTS = [
    { id: 'parents', when: s => isTr(s) && s.age <= 17, title: '부모님의 반대',
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
  D.PCT = [[95, 1], [93, 3], [83, 8], [74, 16], [65, 28], [57, 42], [50, 58], [44, 74], [38, 90]];

  root.PG_DATA = D;
  if (typeof module !== 'undefined') module.exports = D;
})(typeof window !== 'undefined' ? window : globalThis);
