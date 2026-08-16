/**
 * 기능(페이지) 검색 — 검색창의 두 축 중 하나. 순수 함수만.
 *
 * ────────────────────────────────────────────────────────────────────
 *  왜 별도 목록인가 (`lib/permissions/features.ts` 의 PAGES 를 안 쓰는 이유)
 * ────────────────────────────────────────────────────────────────────
 *
 * `PAGES` 는 **권한 카탈로그**다 — 관리자 라우트와 동적 세그먼트
 * (`/stock/[ticker]`)까지 담아 "잠글 수 있는 면"을 빠짐없이 세는 것이 목적이라,
 * 사용자가 "갈 수 있는 곳" 과 목록이 다르다. 그걸 검색에 물리면 권한 카탈로그를
 * 손질할 때마다 검색 결과가 따라 흔들리고, 반대로 검색에 넣고 싶은 항목을 위해
 * 권한 카탈로그에 가짜 행을 만들게 된다. 두 목록은 목적이 다르므로 따로 둔다.
 *
 * 산업(테크·헬스케어…)은 DB 에 있으므로 여기 두지 않고 호출부가 합친다
 * (`buildIndustryEntries`). 산업을 추가하는 일이 코드 수정을 부르면 안 된다.
 *
 * ────────────────────────────────────────────────────────────────────
 *  매칭 규칙
 * ────────────────────────────────────────────────────────────────────
 *
 * 한글 검색은 형태소 분석 없이 부분 문자열이면 충분하다 — 항목이 20여 개라
 * 정확도보다 "빠뜨리지 않는 것" 이 중요하다. 대신 **어디가 맞았는지로 순위를
 * 매긴다**: 이름 시작 > 이름 포함 > 별칭 포함. 별칭(`keywords`)은 사용자가 쓰는
 * 다른 말("주가", "차트", "구독")을 담는다 — 라벨만으로는 안 걸리는 검색어가
 * 실제로 가장 많다.
 */

/** 검색 가능한 기능 1건. */
export type FeatureEntry = {
  /** 결과에 표시할 이름. */
  label: string
  href: string
  /** 한 줄 설명. 결과 목록의 보조 텍스트. */
  description: string
  /** 라벨에 없는 동의어·구어. 매칭에만 쓰이고 화면에 나오지 않는다. */
  keywords?: readonly string[]
}

export type FeatureMatch = FeatureEntry & { score: number }

/**
 * 정적 기능 목록.
 *
 * 로그인·법적 문서는 넣지 않는다 — 검색으로 찾는 대상이 아니고, 넣으면 실제로
 * 찾는 것(종목·데이터 화면)을 밀어낸다. `/me/*` 도 제외한다: 비로그인 사용자가
 * 검색 결과에서 접근 거부 화면으로 착지하면 그것대로 사고다.
 */
export const SEARCHABLE_FEATURES: readonly FeatureEntry[] = [
  {
    label: '홈',
    href: '/',
    description: '자금 흐름·시장 요약 한눈에',
    keywords: ['메인', '대시보드', '첫화면'],
  },
  {
    label: '섹터킹 픽',
    href: '/rankings',
    description: '점수 랭킹 · 단기/장기/DCF',
    keywords: ['랭킹', '순위', '점수', '추천', '픽', 'ranking'],
  },
  {
    label: '시장 규모',
    href: '/market-size',
    description: '산업·섹터 시가총액 지도와 성장 전망',
    keywords: ['시총', '시가총액', '지도', '트리맵', '규모'],
  },
  {
    label: '섹터 목록',
    href: '/sectors',
    description: '섹터별 대표 종목과 시총',
    keywords: ['섹터', '업종', '분야'],
  },
  {
    label: '애널리스트 성적표',
    href: '/analysts',
    description: '증권사 애널리스트 목표주가 적중률',
    keywords: ['애널리스트', '목표주가', '적중률', '증권사', '리포트', '컨센서스'],
  },
  {
    label: '세계 지수',
    href: '/indices',
    description: '주요국 증시 지수 추이',
    keywords: ['지수', '코스피', '나스닥', 's&p', '다우', '인덱스'],
  },
  {
    label: '마켓 리포트',
    href: '/news',
    description: '경제 뉴스 해설과 월간 전망',
    keywords: ['뉴스', '리포트', '해설', '전망', '기사'],
  },
  {
    label: '용어 가이드',
    href: '/guide',
    description: '지표 읽는 법과 숫자 용어 정리',
    keywords: ['가이드', '용어', '설명', '도움말', '초보', '공부'],
  },
  {
    label: '자금 흐름 읽는 법',
    href: '/guide/how-to-read-money-flow',
    description: '자금 흐름 지표의 정의와 한계',
    keywords: ['자금', '흐름', '머니플로우', 'mfi'],
  },
  {
    label: '섹터 로테이션',
    href: '/guide/sector-rotation',
    description: '자금이 산업 사이를 옮겨 다니는 패턴',
    keywords: ['로테이션', '순환', '섹터'],
  },
  {
    label: '시총 변화와 순매수',
    href: '/guide/market-cap-change-vs-net-buying',
    description: '시가총액 변화액이 거래대금과 다른 이유',
    keywords: ['순매수', '거래대금', '시총변화'],
  },
  {
    label: '계산 방법',
    href: '/methodology',
    description: '점수·지표의 산출 방식',
    keywords: ['방법론', '산출', '공식', '계산', '기준'],
  },
  {
    label: '데이터 출처',
    href: '/data-sources',
    description: '어떤 데이터를 어디서 가져오는지',
    keywords: ['출처', '데이터', '소스', '갱신', '주기'],
  },
  {
    label: '구독 안내',
    href: '/pricing',
    description: '요금제와 제공 범위',
    keywords: ['요금', '가격', '구독', '결제', '플랜', 'pro'],
  },
  {
    label: '서비스 소개',
    href: '/about',
    description: '섹터킹이 무엇을 하는 서비스인지',
    keywords: ['소개', '어바웃', '회사'],
  },
  {
    label: '문의하기',
    href: '/contact',
    description: '제보·제휴·오류 신고',
    keywords: ['문의', '연락', '제보', '피드백', '오류'],
  },
]

/** 산업 하위 화면 — 산업 하나당 이 조합으로 펼쳐진다. */
const INDUSTRY_VIEWS: readonly {
  suffix: string
  labelSuffix: string
  description: string
  keywords: readonly string[]
}[] = [
  {
    suffix: '',
    labelSuffix: '',
    description: '산업 대시보드',
    keywords: ['산업', '대시보드'],
  },
  {
    suffix: '/money-flow',
    labelSuffix: ' 자금 흐름',
    description: '섹터별 자금 유입·유출',
    keywords: ['자금', '흐름', '머니플로우'],
  },
  {
    suffix: '/price-changes',
    labelSuffix: ' 등락율',
    description: '기간 등락률 순위',
    keywords: ['등락', '상승', '하락', '수익률'],
  },
  {
    suffix: '/statistics',
    labelSuffix: ' 통계',
    description: '산업 통계와 추이',
    keywords: ['통계', '추이', '차트'],
  },
]

/**
 * 산업 목록(DB) → 검색 항목.
 *
 * 산업 9개 × 화면 4개 = 36항목이라 그대로 두면 검색 결과를 도배한다. 그래서
 * **산업 이름이 검색어에 맞을 때만** 하위 화면까지 펼치고, 그렇지 않으면
 * 대시보드 1건만 후보에 남긴다 — `matchFeatures` 의 점수 규칙이 그 일을 한다
 * (하위 화면은 산업명이 라벨 앞에 붙어 있어 산업명이 안 맞으면 점수가 낮다).
 */
export function buildIndustryEntries(
  industries: readonly { id: string; name: string }[]
): FeatureEntry[] {
  const out: FeatureEntry[] = []
  for (const industry of industries) {
    for (const view of INDUSTRY_VIEWS) {
      out.push({
        label: `${industry.name}${view.labelSuffix}`,
        href: `/${industry.id}${view.suffix}`,
        description: view.description,
        keywords: [industry.id, ...view.keywords],
      })
    }
  }
  return out
}

/** 매칭 점수. 값이 클수록 위. */
const SCORE = {
  labelPrefix: 100,
  labelIncludes: 60,
  descriptionIncludes: 30,
  keywordIncludes: 20,
} as const

function scoreEntry(entry: FeatureEntry, q: string): number {
  const label = entry.label.toLowerCase()
  if (label.startsWith(q)) return SCORE.labelPrefix
  if (label.includes(q)) return SCORE.labelIncludes
  if (entry.description.toLowerCase().includes(q)) return SCORE.descriptionIncludes
  if (entry.keywords?.some((k) => k.toLowerCase().includes(q))) {
    return SCORE.keywordIncludes
  }
  return 0
}

/**
 * 기능 검색.
 *
 * 동점은 **입력 순서**로 갈린다(`Array.prototype.sort` 는 안정 정렬). 목록이
 * 중요도 순으로 적혀 있으므로, 같은 점수면 더 자주 쓰는 화면이 위로 온다.
 */
export function matchFeatures(
  entries: readonly FeatureEntry[],
  query: string,
  limit = 6
): FeatureMatch[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  return entries
    .map((entry) => ({ ...entry, score: scoreEntry(entry, q) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
