/**
 * 30초 브리핑(thirtySecBrief) 표시용 파서.
 *
 * 저장 데이터는 개행 없는 한 덩어리 문자열(맨 앞에 `[수집방법: ...]` 메타 프리픽스가
 * 섞이기도 함)이라 그대로 렌더하면 가독성이 나쁘다. 표시 레이어에서:
 *   1) 선두 `[...]` 메타 블록을 분리(각주로 렌더),
 *   2) 본문을 문장 단위로 분리(개행이 있으면 개행 우선).
 * 데이터 자체는 변경하지 않으므로 과거 리포트에도 소급 적용된다.
 */

export interface ParsedBrief {
  /** 선두 `[...]` 메타 텍스트 (괄호 제거, 없으면 null) — 예: "수집방법: WebSearch 멀티쿼리 ..." */
  meta: string | null
  /** 문장 단위 분리 결과. 본문이 비어 있으면 빈 배열(에디터 프리뷰 등). */
  sentences: string[]
}

/** 선두 메타 블록: `[ ... ]` + 뒤따르는 공백. 본문 중간의 대괄호는 건드리지 않는다. */
const LEADING_META_RE = /^\[([^\]]{2,120})\]\s*/

/**
 * 문장 경계: 마침표 뒤 공백.
 * 소수점(예: "4.2% YoY", "-0.48%,")은 마침표 뒤에 공백이 오지 않아 분리되지 않는다.
 * lookbehind 미사용 — 클라이언트 번들에 포함되므로 Safari < 16.4 에서도 파싱돼야 한다.
 * 마침표는 split 시 소실되므로 마지막 조각 외에는 다시 붙인다.
 */
const SENTENCE_SPLIT_RE = /\.\s+/

/** 이 길이 미만의 조각은 직전 문장에 합친다(번호·약어 오분리 방어). */
const MIN_SENTENCE_LENGTH = 10

function splitSentences(body: string): string[] {
  if (body.includes('\n')) {
    // 명시적 개행이 있으면 작성자 의도 우선
    return body.split(/\n+/)
  }
  const parts = body.split(SENTENCE_SPLIT_RE)
  // split 으로 사라진 마침표 복원 (마지막 조각은 원문 그대로)
  return parts.map((s, i) => (i < parts.length - 1 ? `${s}.` : s))
}

export function parseBrief(raw: string): ParsedBrief {
  const trimmed = raw.trim()

  const metaMatch = trimmed.match(LEADING_META_RE)
  const meta = metaMatch ? metaMatch[1].trim() : null
  const body = metaMatch ? trimmed.slice(metaMatch[0].length).trim() : trimmed

  if (body.length === 0) {
    // 메타만 있거나 빈 입력(에디터 프리뷰 기본값 등) — 빈 본문 박스 렌더 방지
    return { meta, sentences: [] }
  }

  const sentences = splitSentences(body)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .reduce<string[]>((acc, seg) => {
      if (seg.length < MIN_SENTENCE_LENGTH && acc.length > 0) {
        return [...acc.slice(0, -1), `${acc[acc.length - 1]} ${seg}`]
      }
      return [...acc, seg]
    }, [])

  return {
    meta,
    sentences: sentences.length > 0 ? sentences : [body],
  }
}
