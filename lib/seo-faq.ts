/**
 * 가시 FAQ와 JSON-LD가 공유하는 질문·답변. 검색 노출·인용을 보장하지 않는다.
 */
import { PICK_PROFILES, PICK_PROFILE_META, PICK_WEIGHTS } from '@/lib/pick-profile'

const profileWeights = PICK_PROFILES.map((profile) => {
  const weights = PICK_WEIGHTS[profile]
  return `${PICK_PROFILE_META[profile].label} 성향은 ${weights.short * 100}%·${weights.long * 100}%·${weights.dcf * 100}%`
}).join(', ')

export const RANKINGS_FAQ = [
  {
    question: '섹터킹 픽이 무엇인가요?',
    answer:
      `단기·장기·DCF 점수를 투자 성향별로 가중평균해 상위 종목을 보여줍니다. 단기·장기·DCF 순서로 ${profileWeights}를 반영합니다. 산출되지 않은 점수의 가중치는 나머지 유효 점수에 재분배합니다. 표의 단기·장기 점수 정렬과 픽 종합점수는 별개이며, 점수는 투자 권유가 아닙니다.`,
  },
  {
    question: '단기 점수는 어떻게 계산하나요?',
    answer:
      '최근 점수 흐름, 52주 가격 범위에서의 현재 위치, 시장 심리를 합쳐 0~100점으로 매깁니다. "지금 분위기·흐름이 좋은가"를 나타냅니다.',
  },
  {
    question: '장기 점수는 어떻게 계산하나요?',
    answer:
      '수익성·성장성·규모와 목표가까지 남은 상승 여력을 합쳐 0~100점으로 매깁니다. "오래 묵힐 만한 가치가 있나"를 나타냅니다.',
  },
  {
    question: '투자의견과 목표주가는 무엇인가요?',
    answer:
      '증권사 애널리스트들의 평균 투자의견과 목표 주가의 평균값입니다. 참고용 정보이며 투자 권유가 아닙니다.',
  },
]

export const INDICES_FAQ = [
  {
    question: '세계 주요 지수 페이지는 어떤 나라를 보여주나요?',
    answer:
      '미국(S&P 500·나스닥), 한국(코스피), 일본(닛케이 225), 중국(상하이 종합), 홍콩(항셍), 인도(니프티 50), 대만(가권), 독일(DAX), 영국(FTSE 100), 프랑스(CAC 40), 브라질(보베스파) 대표 지수를 보여줍니다.',
  },
  {
    question: '52주 위치는 무엇인가요?',
    answer:
      '최근 1년 가격 범위에서 현재 지수가 어디쯤인지 0~100%로 나타낸 값입니다. 고점 근처인지 저점권인지 한눈에 알 수 있습니다.',
  },
  {
    question: '지수 데이터 출처와 갱신 주기는 어떻게 되나요?',
    answer:
      '각국 대표 주가지수 종가를 Yahoo Finance에서 받아오며, 매 거래일 갱신합니다.',
  },
]
