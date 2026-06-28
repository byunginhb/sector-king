import {
  Crown,
  DollarSign,
  Percent,
  Gauge,
  Trophy,
  PieChart,
  Activity,
  Scale,
  TrendingUp,
  Target,
  type LucideIcon,
} from 'lucide-react'

/** 산업 의존 경로는 기본 산업(tech)으로 안전 연결한다. */
const DEFAULT_INDUSTRY = 'tech'

export interface GlossaryLink {
  label: string
  href: string
}

export interface NumberGlossaryEntry {
  id: string
  icon: LucideIcon
  term: string
  english?: string
  /** 한 줄 정의 */
  definition: string
  /** 이렇게 읽으세요 */
  howToRead: string
  /** 비유/예시 */
  analogy: string
  /** 직접 보러 가기(실링크) */
  links: GlossaryLink[]
  /** /methodology 딥링크 (선택) */
  methodologyHref?: string
  /** 한계 고지로의 주의 1줄(선택) */
  caution?: string
}

/**
 * /guide 섹션 B "숫자 사전" 데이터 (뷰와 분리).
 * 문구는 09_accuracy_audit §1 판정 반영:
 *  - 자금 흐름 = 기간 시가총액 변화액(평가액 증가 포함, 순매수 아님)
 *  - 시장평가 점수 = 애널리스트 기대(목표주가) 중심
 */
export const NUMBER_GLOSSARY: NumberGlossaryEntry[] = [
  {
    id: 'hegemony-score',
    icon: Crown,
    term: '패권 점수',
    english: '0~100점',
    definition: '회사의 시장 지배력을 4가지로 채점한 종합 점수입니다.',
    howToRead: '높을수록 그 섹터의 "왕"에 가깝습니다.',
    analogy: '학생 성적표(국·영·수·과 합산)처럼 여러 과목 점수를 합친 값.',
    links: [
      { label: '대시보드에서 보기', href: '/' },
      { label: '트렌드에서 보기', href: `/${DEFAULT_INDUSTRY}/statistics` },
    ],
    methodologyHref: '/methodology#scoring',
  },
  {
    id: 'score-axes',
    icon: Scale,
    term: '점수의 4개 축',
    english: '규모35 · 성장30 · 수익성20 · 시장평가15',
    definition:
      '규모(시가총액), 성장(매출·EPS 성장률), 수익성(마진), 시장평가(애널리스트 기대) 네 가지로 나눠 채점합니다.',
    howToRead:
      '같은 90점이라도 큰 회사형과 빠르게 크는 회사형은 점수 구성이 다릅니다.',
    analogy: '4과목의 비중이 서로 다른 시험과 같습니다.',
    links: [],
    methodologyHref: '/methodology#scoring',
    caution:
      '시장평가 점수는 애널리스트 평균 목표주가 대비 현재가(기대치) 중심으로 산출됩니다.',
  },
  {
    id: 'market-cap',
    icon: DollarSign,
    term: '시가총액',
    english: '₩ / $',
    definition: '주가 × 발행주식수 = 회사 전체에 매겨진 가격표입니다.',
    howToRead:
      '회사의 "덩치". 기본은 원화(₩)로 보여주며, 상단 통화 토글로 달러($) 표시로 바꿀 수 있습니다.',
    analogy:
      '원화는 조원·억원 단위, 달러는 T=1조 달러·B=10억 달러·M=100만 달러로 표기합니다.',
    links: [{ label: '대시보드에서 보기', href: '/' }],
    methodologyHref: '/methodology#scoring',
    caution: '달러 표시는 고정 환율(약 1,450원)로 환산합니다.',
  },
  {
    id: 'price-change',
    icon: Percent,
    term: '등락률',
    english: '%',
    definition: '이전 시점 대비 주가가 얼마나 변했는지를 나타내는 비율입니다.',
    howToRead: '+면 올랐고, −면 내렸다는 뜻입니다.',
    analogy: '+2.3% = 100원이 102.3원이 된 것.',
    links: [
      { label: '등락 화면에서 보기', href: `/${DEFAULT_INDUSTRY}/price-changes` },
    ],
  },
  {
    id: 'week52-position',
    icon: Gauge,
    term: '52주 위치',
    definition: '최근 1년 최고가와 최저가 사이에서 현재 주가의 위치입니다.',
    howToRead: '100%에 가까우면 1년 신고가권, 0%에 가까우면 저점권입니다.',
    analogy: '0~100 막대 위에 현재 가격이 찍힌 점.',
    links: [
      { label: '트렌드에서 보기', href: `/${DEFAULT_INDUSTRY}/statistics` },
    ],
  },
  {
    id: 'sector-rank',
    icon: Trophy,
    term: '섹터 순위',
    definition: '한 섹터 안에서 패권 점수로 매긴 등수입니다.',
    howToRead: '1위 = 그 분야의 대장주.',
    analogy: '반에서 1등.',
    links: [{ label: '대시보드에서 보기', href: '/' }],
  },
  {
    id: 'market-share',
    icon: PieChart,
    term: '시총 점유율',
    english: '%',
    definition: '섹터 전체 시가총액 중 이 회사가 차지하는 몫입니다.',
    howToRead: '높을수록 그 섹터를 강하게 장악하고 있습니다.',
    analogy: '시장이라는 케이크에서 이 회사가 가져간 한 조각.',
    links: [{ label: '종목 상세에서 보기', href: '/' }],
    caution:
      '섹터에 속한 종목 수가 적으면 점유율 수치가 거칠게 나타날 수 있습니다.',
  },
  {
    id: 'money-flow',
    icon: Activity,
    term: '자금 흐름',
    definition:
      '선택한 기간 동안 섹터 전체 시가총액이 늘거나 줄어든 변화액입니다.',
    howToRead:
      '"유입"은 시총이 늘었다는 뜻일 뿐, 실제로 돈이 순수하게 들어온 것은 아닙니다.',
    analogy:
      '가게에 손님이 북적이는 것(주가 상승)과 실제 매출 순증(순매수)은 다릅니다.',
    links: [
      { label: '자금 흐름 화면에서 보기', href: `/${DEFAULT_INDUSTRY}/money-flow` },
    ],
    caution:
      '주가 상승에 의한 평가액 증가를 포함하며, 실제 순매수 자금이 아닙니다. 함께 표시되는 MFI(매수압력 지수)는 당일 종가의 일중 위치를 기준으로 계산하며 표준 Wilder MFI와 다릅니다.',
  },
  {
    id: 'per-peg',
    icon: TrendingUp,
    term: 'PER / PEG',
    definition:
      '이익 대비 주가가 비싼지(PER), 성장까지 감안하면 비싼지(PEG)를 봅니다.',
    howToRead: '낮을수록 상대적으로 싼 편이지만 업종마다 기준이 다릅니다.',
    analogy: 'PER 10 = 지금 이익으로 10년이면 주가만큼 번다는 뜻.',
    links: [
      { label: '트렌드에서 보기', href: `/${DEFAULT_INDUSTRY}/statistics` },
    ],
    caution:
      'PER은 과거 12개월(TTM) 기준, PEG는 Forward 기반이라 기준 시점이 다릅니다.',
  },
  {
    id: 'roe',
    icon: Target,
    term: 'ROE',
    english: '%',
    definition: '자기자본으로 한 해 동안 얼마나 벌었는지를 나타내는 비율입니다.',
    howToRead: '높을수록 가진 돈을 효율적으로 굴려 수익을 낸다는 뜻입니다.',
    analogy: '100만 원 자본으로 15만 원을 벌면 ROE 15%.',
    links: [{ label: '종목 상세에서 보기', href: '/' }],
  },
  {
    id: 'upside',
    icon: TrendingUp,
    term: '목표주가 상승여력',
    english: '%',
    definition:
      '애널리스트 평균 목표주가와 현재가의 차이를 비율로 나타낸 값입니다.',
    howToRead: '+면 더 오를 것이라는 시장의 기대가 있다는 뜻입니다.',
    analogy: '현재 $100, 목표 $120이면 상승여력 +20%.',
    links: [{ label: '종목 상세에서 보기', href: '/' }],
    caution:
      '애널리스트의 12개월 전망치에 근거하며, 실제 주가를 보장하지 않습니다.',
  },
  {
    id: 'dcf-score',
    icon: TrendingUp,
    term: '가치 점수 (DCF)',
    english: '0~100점 · %',
    definition:
      '회사가 앞으로 벌어들일 현금(잉여현금흐름)을 추정해 적정 가치를 환산하고, 현재가가 그보다 싼지를 0~100점과 상승예측 %로 나타낸 값입니다.',
    howToRead:
      '점수·상승예측이 높을수록 내재가치 대비 현재가가 싸다는 뜻입니다. 애널리스트 목표주가 상승여력과는 다른, 현금흐름 기반의 독립 추정치입니다.',
    analogy:
      '미래에 받을 용돈을 현재 가치로 당겨 계산해 "지금 값이 적당한가"를 따지는 것과 같습니다.',
    links: [{ label: '점수 랭킹에서 보기', href: '/rankings' }],
    caution:
      '보수적으로 계산하기 때문에, 빠르게 성장하거나 현재 이익 대비 비싸게 거래되는 인기주(예: 대표 AI·반도체주)는 점수가 낮게 나오는 경향이 있습니다. 장기 점수는 높은데 가치 점수가 낮다면 "좋은 기업이지만 성장 기대가 주가에 이미 반영된 상태"로 읽으면 됩니다. 미래 성장·할인율 가정이 바뀌면 결과가 크게 달라지고, 현금흐름이 마이너스이거나 자료가 부족한 종목·은행·보험 등은 제외됩니다. 미래 수익을 보장하지 않는 참고용 정보입니다.',
  },
]

/** FAQ JSON-LD 생성을 위한 Q/A 평탄화. */
export function toFaqEntries(): { question: string; answer: string }[] {
  return NUMBER_GLOSSARY.map((e) => ({
    question: `${e.term}이(가) 무엇인가요?`,
    answer: [e.definition, e.howToRead, e.caution].filter(Boolean).join(' '),
  }))
}
