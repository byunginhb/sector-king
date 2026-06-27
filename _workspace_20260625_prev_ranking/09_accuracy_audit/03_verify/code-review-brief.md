# 코드 리뷰 — 30초 브리핑 가독성 개선

대상: 신규 `lib/news/brief.ts`, 수정 `components/news/expert-report-view.tsx` (미커밋)
리뷰일: 2026-06-11

## 요약
파서·컴포넌트 모두 견고하고 불변성·a11y·디자인 톤을 잘 지켰다. 다만 lookbehind 정규식의 클라이언트 번들 브라우저 호환성(HIGH) 1건과 빈 문자열 폴백(MEDIUM) 1건을 확인 권고.

---

## CRITICAL
없음

## HIGH

### H1. lookbehind 정규식 브라우저 호환성 — 클라이언트 번들 크래시 위험
`lib/news/brief.ts:25` — `SENTENCE_SPLIT_RE = /(?<=\.)\s+/`
- 이 모듈은 `'use client'` 컴포넌트(`expert-report-view.tsx`)에서 import되어 **클라이언트 번들에 포함**된다.
- `tsconfig.json` target = `ES2017`. lookbehind는 **ES2018** 문법이며 정규식은 트랜스파일되지 않고 런타임 그대로 실행된다. 즉 빌드는 통과하나 구형 엔진에서 `SyntaxError` 발생 → 모듈 로드 시 전체 컴포넌트 트리 크래시.
- 미지원: Safari < 16.4 (iOS 16.3 이하 포함), 구형 Android WebView. 모바일 주식 대시보드 특성상 iOS Safari 비중이 높아 실사용 노출 가능성 있음.
- 권고: 타깃 브라우저를 16.4+로 명시 확정하거나, lookbehind 없이 동등 처리. 예:
  ```ts
  // 마침표+공백을 split하되 마침표를 보존
  const SENTENCE_SPLIT_RE = /\.\s+/
  // ... body.split(SENTENCE_SPLIT_RE) 후 마지막 외 조각에 '.' 재부착
  ```
  또는 `\.(\s+)` 캡처 후 재조립. browserslist에 16.4+ 합의가 있다면 코드에 주석으로 근거 남기고 HIGH→ACCEPT 가능.

## MEDIUM

### M1. 빈/공백 입력 시 빈 문자열 1개 반환 (프리뷰 경로)
`lib/news/brief.ts:54` — `sentences: sentences.length > 0 ? sentences : [body]`
- `raw=""` 또는 공백만 → `trimmed=""`, `body=""`, `segments` 필터 후 비어 `sentences=[""]`. 폴백 분기로 `<p>` 안에 빈 문자열 렌더(빈 보더 박스만 노출).
- 저장 데이터는 zod `min(1)`로 보호되나, `lib/news/dto.ts:28`·`components/news/admin/news-editor.tsx:30`이 `thirtySecBrief: ''`를 기본값으로 두고 **에디터 프리뷰**(`news-editor.tsx:316`)에서 그대로 `ExpertReportView`에 전달 → 빈 카드 노출.
- 권고: 빈 본문이면 빈 카드 대신 처리(원문 그대로 반환 또는 호출측에서 `raw.trim()` 가드). 치명적이지 않아 MEDIUM.

### M2. 메타만 있고 본문 없는 경우 본문에 메타 누수
`lib/news/brief.ts:35,54` — `[수집방법: ...]` 만 있고 본문이 없으면 `body=""` → `sentences: [body]=[""]`. meta 각주는 정상 렌더되나 본문 영역에 빈 `<p>`가 함께 렌더된다.
- 발생 확률 낮으나(메타 뒤 본문이 거의 항상 존재) M1과 동일 가드로 함께 해소 권고.

## LOW

### L1. `**markdown**` 미렌더 (회귀 아님)
`scripts/seed-news.ts:41` 샘플 본문에 `**지정학 리스크**` 등 마크다운 볼드가 있으나 렌더러가 없어 `**` 리터럴 노출. 단 기존 `whitespace-pre-line` 코드도 동일했으므로 **회귀 아님**. 향후 개선 후보로만 기록.

### L2. `key={i}` 인덱스 키
`expert-report-view.tsx:172` — 정적·비재정렬 리스트(렌더 후 항목 추가/삭제/순서변경 없음)라 인덱스 키 허용. 문제 없음.

### L3. 문장 경계 한국어/약어 오분리 방어 부분적
`SENTENCE_SPLIT_RE`는 `. ` 기준이라 소수점("4.2% YoY")은 뒤에 공백이 없어 안전(주석대로 정확). 약어("U.S. ")는 `MIN_SENTENCE_LENGTH=10` reduce 병합으로 일부 방어되나 "U.S." 단독은 4자라 다음 조각과 합쳐짐 → 의도대로 동작. URL("https://a.b/ c") 내부 `. ` 가능성은 낮으나 존재. 실데이터 한국어 본문 특성상 위험 낮음. 정보성 기록.

### L4. reduce 첫 조각이 짧을 때
`brief.ts:46` — 첫 조각 길이<10이고 `acc.length===0`이면 병합 안 하고 그대로 push(조건 `acc.length>0`). 짧은 첫 문장은 단독 유지 → 합리적 동작, 불변성(`slice`/스프레드) 준수. 문제 없음.

## 확인된 정상 항목 (PASS)
- 불변성: `.map/.filter/.reduce`+스프레드만 사용, 입력 미변경. PASS
- a11y: `ul/li` 시맨틱 + 마커 `aria-hidden`, `Info` 아이콘 `aria-hidden`. PASS
- 이모지 0, lucide-react `Info` 아이콘 사용. PASS
- 폴백(sentences.length===1) 경로에서 `whitespace-pre-line` 보존. PASS (회귀 없음)
- meta 각주는 폴백 분기에서도 렌더(컴포넌트 하단 `{meta && ...}`가 분기 밖). 메타+단일문장 케이스 정상. PASS
- ExpertView 타입 호환: `report.thirtySecBrief: string` → `raw: string` 일치. PASS
- 다른 사용처 영향: parseBrief는 이 컴포넌트 단독, thirtySecBrief 표시도 이 경로뿐. PASS
- 파일 크기(56줄)·네이밍(`parseBrief`,`ParsedBrief`,`LEADING_META_RE`)·주석(근거·재발방지 명시) 적절. PASS
- 정규식 `LEADING_META_RE` 2~120자 범위로 본문 중간 `[` 보호, `]` 없는 `[` 시작은 매치 실패→본문 유지. PASS
- 3000자(zod max) 긴 입력: split/reduce 선형, 성능 무이슈. PASS

---

커밋 판정: BLOCK(1) | (H1 lookbehind 호환성 확인/해소 후 OK)

---

## 해소 기록 (메인 오케스트레이터, 2026-06-11)

- **H1 (BLOCK) 해소**: `SENTENCE_SPLIT_RE`를 lookbehind 없는 `/\.\s+/`로 교체, split로 소실되는 마침표는 마지막 조각 외 재부착(`splitSentences`). 재조립==원문 PASS 검증. `grep "(?<=" lib/news/brief.ts` → 0건.
- **M1·M2 해소**: 빈/공백/메타만 입력 → `sentences: []` 반환. 컴포넌트는 본문·메타 모두 없으면 `null`, 메타만 있으면 각주만(빈 `<p>`·border 미렌더).
- 재검증: 실제 텍스트 5문장+메타 분리 정상, 엣지 8케이스 통과, tsc exit 0, build exit 0.

최종 판정: **OK (blocker 0)**
