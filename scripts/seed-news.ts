/**
 * `app/samplenews.md` 의 구조를 JSONB 시드로 변환하여 `news_reports` 에 삽입.
 *
 * 실행: `pnpm tsx scripts/seed-news.ts`
 *
 * 멱등: report_date + title 기준으로 이미 존재하면 update, 없으면 insert.
 *
 * 의존:
 *   - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (또는 NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE)
 *   - 첫 admin profile 의 id 를 created_by 로 사용. 없으면 NULL.
 */
import { createClient } from '@supabase/supabase-js'
import type {
  ExpertView,
  NoviceView,
} from '../drizzle/supabase-schema'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE =
  process.env.SUPABASE_SERVICE_ROLE ??
  process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error(
    '[seed-news] 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE 필요'
  )
  process.exit(1)
}

const SAMPLE_TITLE = '오늘의 마켓 리포트'
const SAMPLE_REPORT_DATE = '2026-05-08'

const SAMPLE_ONE_LINE =
  'AI 투자는 계속되지만 돈은 실물로 이동 중이며, 호르무즈 해협이 시장의 천장과 바닥을 동시에 결정하고 있다.'

const SAMPLE_KEYWORDS = ['ai', 'energy', 'geopolitics', 'korea']

const EXPERT_VIEW: ExpertView = {
  thirtySecBrief:
    '오늘 시장은 **지정학 리스크(이란-미국 협상 불확실성)**와 섹터 로테이션(에너지/산업재 강세 vs. 빅테크 약세) 두 축으로 움직이고 있다. S&P 500은 좁은 박스권에서 등락 중이며, 이란의 호르무즈 해협 관련 새로운 요구사항 보도 후 약세 전환. AI 인프라 투자 테마는 여전히 유효하나, 밸류에이션 부담(Shiller P/E 41)과 스태그플레이션 우려가 공존. Block(XYZ)의 호실적 서프라이즈와 AT&T의 역사적 자사주매입 전환이 개별 종목 모멘텀을 형성 중.',
  headlines: [
    {
      index: 1,
      category: 'Trending Analysis',
      title: 'The AI Boom Powering Celestica',
      tickers: [{ symbol: 'CLS', exchange: 'NYSE', industryId: 'tech' }],
      core:
        'Celestica, FY2026 매출 가이던스를 $17B로 상향하며 $1B CapEx 가속화 발표. 그러나 실적 발표 후 주가 14% 하락.',
      point:
        'AI CapEx 수혜주임에도 주가 하락은 "실적 발표 후 차익실현" 패턴 — 저점 매수 기회인지 구조적 한계인지 판단 필요.',
      keywords: ['AI 인프라', 'CapEx', '하이퍼스케일러'],
    },
    {
      index: 2,
      category: 'Trending Analysis',
      title: "Uber's Earnings: The Case For 50% Upside",
      tickers: [{ symbol: 'UBER', exchange: 'NYSE' }],
      core:
        'Uber가 로보택시 위협론을 불식시키며 높은 확신의 실적 발표. 50% 추가 상승 가능성 분석.',
      point:
        '자율주행이 위협이 아닌 기회로 재해석되는 내러티브 전환 — 모빌리티 섹터 재평가 가능성.',
      keywords: ['로보택시', '모빌리티', '실적서프라이즈'],
    },
    {
      index: 3,
      category: 'Trending Analysis',
      title: 'AT&T Crossed A Historical Point: Buybacks Surpassed Dividends',
      tickers: [{ symbol: 'T', exchange: 'NYSE' }],
      core:
        'AT&T 역사상 처음으로 자사주매입이 배당을 초과. 총주주수익률(TSY) 8% 이상.',
      point:
        '전통 배당주에서 "성장+환원" 하이브리드로의 전환 — 통신섹터 밸류에이션 리레이팅 시그널.',
      keywords: ['자사주매입', '배당', '자본배분'],
    },
    {
      index: 4,
      category: 'Market News',
      title: 'Block (XYZ) Q1 Earnings Beat',
      tickers: [{ symbol: 'XYZ', exchange: 'NYSE' }],
      core:
        'Block, Q1 실적 대폭 상회 후 시간외 9.8% 급등. 2026 연간 Gross Profit 가이던스 상향($12.2B, 18% 성장).',
      point:
        '인력 40% 감축과 동시에 수익성 급개선 — 핀테크 섹터의 "효율성 혁명" 사례.',
      keywords: ['핀테크', '구조조정', '수익성'],
    },
    {
      index: 5,
      category: 'Trending Analysis',
      title: 'Microsoft: A Compelling Opportunity From The Downturn',
      tickers: [{ symbol: 'MSFT', exchange: 'NASDAQ', industryId: 'tech' }],
      core:
        '빅테크 조정장에서 Microsoft가 매력적 진입 기회로 부상. AI 플레이 Top 5 선정(Wedbush).',
      point:
        '테크 약세 국면에서 퀄리티 대형주로의 자금 이동 가능성 — MSFT가 "안전한 AI 베팅" 역할.',
      keywords: ['빅테크조정', 'AI플레이', '밸류에이션'],
    },
    {
      index: 6,
      category: 'Analysis',
      title: 'U.S. Inflation Measures Tell Two Different Stories',
      tickers: [],
      core: '미국 물가 지표가 상반된 신호 발송 — CPI vs. PCE 간 괴리 확대.',
      point:
        '호르무즈 폐쇄로 인한 에너지/운송비 상승이 "스태그플레이션" 내러티브 강화 중.',
      keywords: ['인플레이션', '스태그플레이션', '연준정책'],
    },
    {
      index: 7,
      category: 'Market News',
      title: 'Iran-US Negotiations Stall — 호르무즈 해협 리스크 재부각',
      tickers: [],
      core:
        '이란이 해협 통과 선박에 새 요건 부과 가능성 보도 + 미국 Project Freedom 재개 검토(WSJ).',
      point: '유가 $100 근방 고착화 시 글로벌 경기침체 리스크 아직 시장에 미반영.',
      keywords: ['지정학', '유가', '호르무즈'],
    },
    {
      index: 8,
      category: 'Stock Ideas',
      title: 'Best Small Cap Value Stocks May 2026',
      tickers: [{ symbol: 'VTWO' }],
      core:
        'Russell 2000 중 수익성 있는 기업이 YTD +8% vs. 적자기업 소폭 마이너스. 퀄리티 소형주 강세.',
      point:
        '소형주 로테이션이 "퀄리티" 중심으로 전개 — 맹목적 소형주 매수는 위험, 선별 필요.',
      keywords: ['스몰캡', '퀄리티', '로테이션'],
    },
    {
      index: 9,
      category: 'Analysis',
      title: 'Palantir Options Traders Brace for Double-Digit Move',
      tickers: [{ symbol: 'PLTR', exchange: 'NASDAQ', industryId: 'tech' }],
      core:
        'Palantir 실적 발표 앞두고 옵션시장이 ~10% 변동 가격 산정. 콜 옵션에 자금 집중.',
      point: 'AI 소프트웨어 대장주의 실적이 AI 테마 전체 방향성을 결정할 수 있음.',
      keywords: ['옵션', '실적변동성', 'AI소프트웨어'],
    },
    {
      index: 10,
      category: 'Market News',
      title: 'MercadoLibre Q1 Earnings Preview',
      tickers: [{ symbol: 'MELI', exchange: 'NASDAQ' }],
      core:
        '매출 40% 성장 예상($8.32B), 컨센서스 EPS $8.47. 라틴아메리카 이커머스 대장주.',
      point: '이머징마켓 소비 회복의 바로미터 — 핀테크+이커머스 듀얼 성장 스토리.',
      keywords: ['이머징', '이커머스', '라틴아메리카'],
    },
    {
      index: 11,
      category: 'Sector',
      title: 'Energy Sector — SM Energy 2026 생산 목표 420,000 BOE/d',
      tickers: [{ symbol: 'SM' }],
      core:
        'SM Energy, Q2 자사주매입 계획과 함께 생산량 목표 발표. 에너지 섹터 YTD +21%.',
      point:
        '에너지 섹터가 2026년 최대 수혜 섹터로 부상 — 지정학 프리미엄 + 실적 모멘텀.',
      keywords: ['에너지', '생산확대', '자사주매입'],
    },
    {
      index: 12,
      category: 'Analysis',
      title: '1999 Bubble Comparison — Shiller P/E at 41',
      tickers: [],
      core: '현재 Shiller P/E 41배는 인터넷 버블 이후 최고치. 밸류에이션 경고 신호.',
      point: '과거 이 수준에서 10년 연환산 수익률은 역사적으로 매우 낮았음 — 장기 투자자 주의.',
      keywords: ['밸류에이션', '버블', 'P/E'],
    },
  ],
  themeFlows: [
    {
      index: 1,
      title: '섹터 로테이션: 에너지·산업재 → 빅테크 OUT',
      evidence:
        '에너지 YTD +21%, 테크 YTD -3%, 2026 Most Violent Rotation: Buy Energy, Sell Software',
      interpretation:
        '시장은 "실물자산 + 현금창출력"을 선호하며, AI 투자 붐의 수혜가 하드웨어/에너지로 이전 중. 소프트웨어는 디레이팅 구간.',
      nextCheckpoint:
        'Q2 빅테크 실적(Meta, Google CapEx 가이던스), 유가 $100 돌파 지속 여부.',
    },
    {
      index: 2,
      title: '호르무즈 해협 / 지정학 리스크',
      evidence:
        'Iran says allies violated ceasefire, Strait of Hormuz 새 요건 부과, Project Freedom 재개',
      interpretation:
        "시장은 부분적 휴전 상태를 '정상'으로 가격 산정했으나, 재긴장 시 유가 스파이크($90→$100+)와 아시아 경제 타격 즉각 반영.",
      nextCheckpoint:
        '이란-미국 협상 진전 여부(우라늄 양도 조건), OPEC 긴급회의 소집 여부.',
    },
    {
      index: 3,
      title: 'AI CapEx 사이클 지속',
      evidence:
        'Celestica $17B 가이던스, 빅4 클라우드 합산 CapEx $700B, Palantir 실적 변동성',
      interpretation:
        "AI 인프라 투자는 구조적으로 지속되나, 수혜주가 '하드웨어 제조(CLS, ANET)' → '소프트웨어(PLTR, MSFT)'로 회전 중. 밸류에이션 선별 필수.",
      nextCheckpoint: 'PLTR/MELI 실적 발표(5/8~9), NVIDIA 다음 분기 가이던스.',
    },
    {
      index: 4,
      title: '핀테크 효율성 혁명',
      evidence:
        'Block 인력 40% 감축 + 가이던스 상향, XYZ 시간외 +9.8%',
      interpretation:
        '핀테크가 "성장 at all costs"에서 "수익성 + 성장"으로 전환 완료. 구조조정 후 마진 확대가 주가 재평가 동력.',
      nextCheckpoint: 'PayPal, SoFi 등 동종업체 실적 비교, 소비자 지출 데이터.',
    },
    {
      index: 5,
      title: '스몰캡 퀄리티 로테이션',
      evidence:
        'Best Small Cap Value May 2026, Russell 2000 수익성 기업 YTD +8%, 소형주 6개월간 QQQ 대비 double-digit 아웃퍼폼',
      interpretation:
        '금리 안정화 + 실적 개선으로 소형주가 구조적 강세 전환. 단, 수익성 기준으로 엄격한 선별 필요.',
      nextCheckpoint: '5월 FOMC 회의(금리 방향), Russell 2000 실적 beat rate 추이.',
    },
    {
      index: 6,
      title: '스태그플레이션 내러티브',
      evidence:
        '인플레 지표 상반된 스토리, 호르무즈 폐쇄 → 운송비/에너지비 상승, Shiller P/E 41',
      interpretation:
        '"성장 둔화 + 물가 상승"이 동시에 나타나면 연준이 진퇴양난. 현재는 \'우려\' 수준이나 유가가 장기 $100+ 고착 시 현실화.',
      nextCheckpoint: '5월 CPI 발표, 소비자신뢰지수, 고용 데이터.',
    },
  ],
  actions: [
    {
      label: 'watchlist',
      tickers: [{ symbol: 'CLS' }],
      body:
        'Watchlist 추가: CLS(Celestica) — 14% 하락 후 반등 가능성 검증. $17B 매출 가이던스 달성 확률과 AI CapEx 의존도 분석 필요.',
    },
    {
      label: 'report',
      tickers: [{ symbol: 'PLTR' }],
      body:
        '리포트 확인: PLTR(Palantir) 실적 발표(5/8 장후) 결과 확인 → 옵션 내재변동성 대비 실제 변동 비교. AI 소프트웨어 밸류에이션 방향 결정.',
    },
    {
      label: 'risk',
      body:
        '리스크 점검: 호르무즈 해협 관련 이란-미국 협상 뉴스 모니터링. 유가가 $105 돌파 시 포트폴리오 내 에너지 비중 재검토 + 아시아 수출주 하방 리스크 산정.',
    },
    {
      label: 'sector',
      body:
        '섹터 비교: 에너지(XLE) vs. 테크(XLK) YTD 수익률 갭 — 역사적 평균 회귀 시점 연구. 에너지 과열 여부 RSI/밸류에이션 체크.',
    },
    {
      label: 'dividend',
      tickers: [{ symbol: 'T' }, { symbol: 'VZ' }, { symbol: 'CMCSA' }],
      body:
        '배당/환원 전략 검증: AT&T(T) 자사주매입 전환 후 TSY 8% — 유사 전환 가능성 있는 통신/유틸리티 종목 스크리닝(VZ, CMCSA 등).',
    },
  ],
  scenarios: {
    bear: {
      kind: 'bear',
      body:
        '호르무즈 해협 협상 결렬로 유가 $120+ 스파이크 → 글로벌 스태그플레이션 현실화 → 연준 금리인하 불가 → 밸류에이션 멀티플 급격 축소(Shiller P/E 41→30). 소비 위축과 기업 마진 압축 동시 발생.',
      trigger: '이란의 해협 완전 봉쇄 선언 또는 미국의 군사작전 재개.',
    },
    base: {
      kind: 'base',
      body:
        '이란-미국 협상이 불안정하나 부분적 통항 유지 → 유가 $90~$100 박스권 → 섹터 로테이션 지속(에너지/산업재 강세, 테크 횡보) → S&P 500 연말까지 한자릿수 수익률. AI CapEx는 계속되나 수혜주 선별 심화.',
      trigger: "이란 협상 '현 상태 유지' + FOMC 금리 동결 지속.",
    },
    bull: {
      kind: 'bull',
      body:
        '이란-미국 핵합의 타결 → 유가 $70대 급락 → 인플레 해소 기대로 연준 금리인하 → 테크 + 소형주 동반 랠리 → S&P 500 사상최고치 경신. Shiller P/E 높지만 이익성장으로 정당화.',
      trigger: '이란 우라늄 해외이전 합의 + 호르무즈 완전 개방.',
    },
  },
  oneLiner: SAMPLE_ONE_LINE,
  fundFlow: {
    outflows: [
      {
        name: '기술주(Tech)',
        ytdPct: -3,
        note:
          'AI 투자붐에도 불구하고 밸류에이션 부담 + 실적 성장 둔화. 소프트웨어 중심으로 디레이팅.',
      },
      {
        name: '금융(Financials)',
        note: '시장 대비 부진. 금리 방향 불확실성이 은행 수익 전망 압박.',
      },
    ],
    inflows: [
      {
        name: '에너지(Energy)',
        ytdPct: 21,
        note: '호르무즈 지정학 프리미엄 + OPEC 감산 + 실적 호조.',
      },
      {
        name: '소재(Materials)',
        ytdPct: 17,
        note: '인프라 투자 + 원자재 가격 상승 수혜.',
      },
      {
        name: '산업재(Industrials)',
        ytdPct: 12,
        note: '리쇼어링/국방비 증가 수혜.',
      },
      {
        name: '필수소비재(Staples)',
        ytdPct: 15,
        note: '경기방어 선호 + 배당 매력.',
      },
      {
        name: '유틸리티(Utilities)',
        note: 'AI 데이터센터 전력 수요 + 방어적 포지셔닝.',
      },
    ],
    driver:
      '실물자산(에너지, 원자재)과 현금흐름이 안정적인 기업으로의 자금 이동이 2026년의 가장 뚜렷한 시장 트렌드. 이는 (1) 지정학 불확실성, (2) 인플레이션 헤지 수요, (3) 테크 밸류에이션 과열 피로감의 복합 작용.',
  },
  koreanStocks: [
    {
      index: 1,
      name: 'SK하이닉스',
      code: '000660',
      opinion: 'buy',
      rationale:
        '한국 KOSPI 75% 급등의 핵심 드라이버. AI 반도체 수요 구조적 확대(빅4 클라우드 CapEx $700B). HBM 공급 타이트닝 지속.',
      risk:
        '유가 상승 시 한국(순에너지 수입국) 경제 전반 타격 가능. 단, 반도체 수출 호조가 상쇄.',
      comment: '매수 유지. AI CapEx 사이클이 꺾이지 않는 한 구조적 강세.',
    },
    {
      index: 2,
      name: '삼성전자',
      code: '005930',
      opinion: 'buy_selective',
      rationale:
        '시가총액 $1T 돌파 임박. AI 메모리 수요 + KOSPI 비중 25%로 인덱스 자금 유입 수혜.',
      risk: '파운드리 사업 경쟁력 약화, 비메모리 부문 부진. 밸류에이션이 역사적 고점 근접.',
      comment:
        '선별적 매수. 메모리 사이클 피크 신호(재고 축적, ASP 하락) 모니터링 필요.',
    },
    {
      index: 3,
      name: 'HD현대중공업',
      code: '329180',
      opinion: 'buy',
      rationale:
        '호르무즈 해협 리스크로 해운/조선 수요 급증. 산업재 섹터 글로벌 강세(YTD +12%)와 동조. 미 해군 함정 발주 기대.',
      risk: '지정학 해소 시 프리미엄 소멸 가능.',
      comment: '매수. 중기적으로 선박 발주 사이클이 구조적으로 지지.',
    },
    {
      index: 4,
      name: '에코프로비엠',
      code: '247540',
      opinion: 'neutral',
      rationale:
        '소재 섹터 글로벌 강세(YTD +17%)지만, 2차전지 소재는 EV 수요 둔화와 중국 경쟁 심화로 차별화.',
      risk:
        "글로벌 소재 강세가 '배터리 소재'가 아닌 '산업용 원자재(구리, 알루미늄)' 중심. EV 보조금 정책 불확실성.",
      comment: '중립. 섹터 강세와 개별 실적 간 괴리 확인 후 진입.',
    },
    {
      index: 5,
      name: 'S-Oil',
      code: '010950',
      opinion: 'buy',
      rationale:
        '에너지 섹터 글로벌 최강세(YTD +21%). 호르무즈 지정학 프리미엄으로 정유 마진 확대. 한국 내 대표 에너지주.',
      risk: '이란 합의 시 유가 급락 → 정유마진 압축. 아람코 지분 구조상 배당 정책 변수.',
      comment: '매수. 단, 이란 협상 타결 시나리오에 대비한 손절 기준 설정 필요.',
    },
  ],
}

const NOVICE_VIEW: NoviceView = {
  oneLineSummary:
    '미국이랑 이란이 싸우고 있어서 기름값이 비싸고, 그래서 테크 주식보다 에너지/공장 관련 주식이 더 잘 나가는 중이야.',
  events: [
    {
      index: 1,
      title: 'AI 관련주는 여전히 핫해',
      body:
        'Celestica(CLS)라는 AI 서버 부품 만드는 회사가 올해 매출 목표를 확 올렸어. 근데 주가는 실적 발표 후 오히려 14% 떨어짐. 이미 많이 올랐으니까 차익실현한 거야.\n\nPalantir(PLTR)는 오늘 실적 발표하는데, 옵션시장에서 10% 이상 움직일 거라고 예상하고 있어.',
    },
    {
      index: 2,
      title: 'Uber 잘 나가',
      body:
        '"로보택시 때문에 Uber 망하는 거 아냐?" 걱정했는데, 오히려 실적이 좋아서 50% 더 오를 수 있다는 분석이 나왔어.',
    },
    {
      index: 3,
      title: 'Block(XYZ) 대박',
      body:
        '핀테크 회사인 Block이 직원 40% 자르고 수익을 확 끌어올렸어. 주가 시간외에서 거의 10% 뛰었어.',
    },
    {
      index: 4,
      title: 'AT&T가 역사를 만들었어',
      body:
        '원래 AT&T는 배당금으로 유명한 회사인데, 처음으로 자사주매입(회사가 자기 주식 사는 것)이 배당보다 더 많아짐. 주주한테 돌려주는 총 수익이 8% 넘어.',
    },
    {
      index: 5,
      title: '기름값 문제가 심각해',
      body:
        '이란이 호르무즈 해협(전세계 석유 25%가 지나가는 좁은 바닷길)을 위협하고 있어서, 기름값이 $100 근처에서 안 내려와. 이게 오래가면 경기침체 올 수도 있어.',
    },
    {
      index: 6,
      title: '돈의 흐름이 바뀌고 있어',
      body:
        '올해: 에너지 +21%, 소재 +17%, 산업재 +12%, 필수소비재 +15%\n반면 테크는 -3%\n쉽게 말하면 "진짜 물건 만드는 회사"로 돈이 몰리고, "소프트웨어/앱 회사"에서는 빠지는 중이야.',
    },
  ],
  stockTables: [
    {
      bucket: 'will_rise',
      rows: [
        {
          ticker: { symbol: 'XYZ', name: 'Block' },
          reason: '실적 대폭 상회 + 가이던스 상향. 모멘텀 강함',
        },
        {
          ticker: { symbol: 'UBER', name: 'Uber' },
          reason: '로보택시 우려 해소 + 실적 서프라이즈',
        },
        {
          ticker: { symbol: 'T', name: 'AT&T' },
          reason: '자사주매입 전환 → 밸류에이션 리레이팅',
        },
        {
          ticker: { symbol: 'SM', name: 'SM Energy' },
          reason: '에너지 섹터 강세 + 생산 확대 + 자사주매입',
        },
        {
          ticker: { symbol: 'MELI', name: 'MercadoLibre' },
          reason: '매출 40% 성장 예상. 이머징마켓 대장주',
        },
      ],
    },
    {
      bucket: 'will_fall',
      rows: [
        {
          ticker: { symbol: 'CLS', name: 'Celestica' },
          reason: '실적 발표 후 14% 하락. 추가 차익실현 가능',
        },
        {
          ticker: { symbol: 'XLK', name: '소프트웨어 섹터 전반' },
          reason: '섹터 로테이션으로 자금 유출 중',
        },
        {
          ticker: { symbol: 'SPX', name: '고P/E 테크주' },
          reason:
            'Shiller P/E 41 경고. 밸류에이션 부담 → 금리/인플레 악재에 취약',
        },
      ],
    },
    {
      bucket: 'buy_on_dip',
      rows: [
        {
          ticker: { symbol: 'MSFT', name: 'Microsoft' },
          reason: '조정 시 "안전한 AI 베팅". 퀄리티 대형주',
        },
        {
          ticker: { symbol: 'CLS', name: 'Celestica' },
          reason: 'AI CapEx $700B 수혜. 단기 낙폭 과대 시 매수 기회',
        },
        {
          ticker: { symbol: 'PLTR', name: 'Palantir' },
          reason: 'AI 소프트웨어 대장주. 실적 후 급락 시 장기 매수 관점',
        },
      ],
    },
  ],
  koreanStocks: [
    {
      index: 1,
      name: 'SK하이닉스',
      code: '000660',
      action: '사',
      body:
        'AI 반도체 수요가 미쳤어. 빅테크 4개 회사가 올해 서버에 $700B(약 1,000조원) 쓰겠다잖아. HBM 메모리 품귀 현상 계속될 거야.',
    },
    {
      index: 2,
      name: '삼성전자',
      code: '005930',
      action: '조심하면서 사',
      body:
        '시총 $1T(1조 달러) 찍을 뻔했어. 메모리는 좋은데, 파운드리가 좀 걱정. 너무 비싸지면 좀 기다려.',
    },
    {
      index: 3,
      name: 'HD현대중공업',
      code: '329180',
      action: '사',
      body:
        '호르무즈 해협 긴장 → 배 많이 필요 → 조선주 호황. 미국 해군 발주도 기대되고.',
    },
    {
      index: 4,
      name: '에코프로비엠',
      code: '247540',
      action: '지켜봐',
      body:
        '글로벌 소재 섹터 강세인 건 맞는데, 배터리 소재는 EV 수요 문제로 따로 놀아. 확실해질 때까지 관망.',
    },
    {
      index: 5,
      name: 'S-Oil',
      code: '010950',
      action: '사',
      body:
        '기름값 비쌀 때 정유회사가 돈을 벌어. 지금 에너지가 올해 제일 잘 나가는 섹터야(+21%). 다만 이란 협상 타결되면 빠질 수 있으니 손절라인은 정해놔.',
    },
  ],
  closing:
    'AI는 계속 돈을 쓰고, 기름값은 비싸고, 테크에서 실물경제로 돈이 이동 중. 반도체/에너지/조선이 핵심 키워드야.',
}

async function main() {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // 첫 admin profile id 조회 (없으면 NULL 로 진행)
  const { data: adminRows } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .limit(1)
  const createdBy = adminRows && adminRows.length > 0 ? adminRows[0].id : null

  // 멱등: report_date + title 으로 기존 행 조회
  const { data: existingRows, error: selErr } = await supabase
    .from('news_reports')
    .select('id')
    .eq('report_date', SAMPLE_REPORT_DATE)
    .eq('title', SAMPLE_TITLE)
    .limit(1)

  if (selErr) {
    console.error('[seed-news] select error:', selErr.message)
    process.exit(1)
  }

  const payload = {
    title: SAMPLE_TITLE,
    status: 'published' as const,
    report_date: SAMPLE_REPORT_DATE,
    one_line_conclusion: SAMPLE_ONE_LINE,
    cover_keywords: SAMPLE_KEYWORDS,
    expert_view: EXPERT_VIEW,
    novice_view: NOVICE_VIEW,
    published_at: new Date(`${SAMPLE_REPORT_DATE}T08:00:00.000Z`).toISOString(),
    created_by: createdBy,
  }

  if (existingRows && existingRows.length > 0) {
    const id = existingRows[0].id
    const { error } = await supabase
      .from('news_reports')
      .update(payload)
      .eq('id', id)
    if (error) {
      console.error('[seed-news] update error:', error.message)
      process.exit(1)
    }
    console.log(`[seed-news] updated existing report id=${id}`)
  } else {
    const { data, error } = await supabase
      .from('news_reports')
      .insert(payload)
      .select('id')
      .single()
    if (error) {
      console.error('[seed-news] insert error:', error.message)
      process.exit(1)
    }
    console.log(`[seed-news] inserted new report id=${data?.id}`)
  }

  console.log('[seed-news] done')
}

main().catch((e) => {
  console.error('[seed-news] unexpected error:', e)
  process.exit(1)
})
