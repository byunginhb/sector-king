# 검증: "추적 종목 시총" KPI 일자별 드릴다운 모달

- 검증일: 2026-06-14
- 검증자: sk-verifier (증거 기반 독립 검증)
- 대상 브랜치: main (HEAD=288e459 기준 working tree 변경분)
- 방식: 코드 정밀 검토 + DB 재현(`data/hegemony.db`) + tsc/build/eslint. dev 서버 미기동(포트 3000 점유 가능성).

## 변경 파일 (HEAD 대비)
| 파일 | 상태 |
|------|------|
| `app/api/statistics/market-cap/route.ts` | 신규 |
| `hooks/use-market-cap-history.ts` | 신규 |
| `components/dashboard/market-cap-detail-modal.tsx` | 신규 |
| `components/dashboard/market-pulse-strip.tsx` | 수정 (+57/-8, 가산적) |
| `types/index.ts` | 수정 (+17, 가산적) |

---

## 전체 판정: **PASS** (7/7 항목 PASS, 경미 관찰 2건)

| # | 항목 | 판정 |
|---|------|------|
| 1 | 데이터 정확성 (dedup + toUsd 일자별 합) | **PASS** |
| 2 | range/region (clamp, region 분기, queryKey) | **PASS** |
| 3 | 모달 UX (enabled/로딩/에러/빈상태/차트통화/표) | **PASS** |
| 4 | 카드 클릭 a11y (button/aria/focus/중첩없음) | **PASS** |
| 5 | 회귀 (KPI 4종 무변경, types 가산적) | **PASS** |
| 6 | 이모지 0 / 통화 무관 오변환 0 | **PASS** |
| 7 | 빌드 (tsc/build/lint 회귀) | **PASS** |

---

## 항목 1: 데이터 정확성 — PASS

API 로직(`route.ts:52-94`)을 DB로 그대로 재현(range=30, 최신일 2026-06-12):

```
ALL    : tickers=407  latest=$67.23T  (= 9.75경원 @1450)
KR     : tickers=78   latest=$3.68T
GLOBAL : tickers=329  latest=$63.55T
KR+GLOBAL 합 = $67.23T   diff vs ALL = $0.0000B   ← region 일관성 완벽
tickerCount: KR(78)+GLOBAL(329)=407 = ALL(407)   ← 정확 일치
```

- **메인 주장 재현 확인**: range30 최신 = $67.2T = 9.75경원, region kr+global=all diff≈0 — 모두 실증됨.
- **dedup(중복 제거) 검증** (핵심): `sector_companies` 행 534개 vs distinct ticker 407개 → 멀티산업 중복 **127개**. API는 `tickerSet = new Set<string>()` (`route.ts:62-65`)로 distinct ticker만 집계하므로 중복 합산 안 함. 만약 산업 합산(534행)을 답습했다면 값이 부풀려졌을 것 → **산업 합산 중복을 답습하지 않음 확인.**
- `toUsd(s.marketCap || 0, s.ticker)` (`route.ts:80`)로 가격성 필드 USD 정규화 적용.

증거: tsc/DB 재현 (better-sqlite3 readonly).

## 항목 2: range/region — PASS

- **clampIntParam(7~120)**: `route.ts:29-33` fallback=90, min=7, max=120. `lib/api-helpers.ts:103-111` 구현 = `Math.max(min, Math.min(parsed, max))`, 파싱 실패→fallback. 동작 정상.
- **region=all 시 키 생략**: hook `use-market-cap-history.ts:31` `if (region !== 'all') params.set('region', region)` — all일 때 쿼리에 region 키 미포함. 라우트는 `regionFilterToValue('all')=null`(`lib/region.ts:154-158`) → JOIN 없이 전체 sector_companies 조회(`route.ts:59-61`).
- **kr/global 시 SQL join 필터**: `route.ts:53-58` `innerJoin(companies) where region = regionValue`. regionValue = 'KR'|'INTL'.
- **queryKey currency 미포함**: `use-market-cap-history.ts:28` `['market-cap-history', region, range]` — currency 없음. 통화는 표시 전용(클라이언트 fmt)이라 캐시 키 불필요. 정확.

## 항목 3: 모달 UX — PASS

`market-cap-detail-modal.tsx` 기준:
- **enabled:open** (line 51): 모달 열릴 때만 fetch. 닫힌 상태 네트워크 호출 없음.
- **로딩 스켈레톤 aria-busy** (line 119-123): `<div aria-busy="true">` + Skeleton 2개.
- **에러 role=alert** (line 112-118): `<div role="alert">` 분기.
- **빈 상태 분기** (line 124-127): `history.length === 0` → "표시할 추이 데이터가 없습니다." (DB 재현상 all/kr/global 모두 history=99일이라 실제 빈상태 미발생 — 분기는 안전망으로 존재).
- **분기 우선순위**: error → isLoading → empty → 정상. 합리적 순서.
- **차트 통화 인지**: YAxis `tickFormatter={(v) => fmt.marketCap(v)}` (line 154), Tooltip formatter도 fmt.marketCap (line 160). YAxis `width={fmt.currency === 'KRW' ? 72 : 56}` (line 157) — KRW 라벨이 길어 폭 분기. 정확.
- **표 최신순(reverse)**: `[...history].reverse().map()` (line 197) — 불변 복사 후 역순(SoT history는 오래된→최신). 표 첫 행=최신(2026-06-12) 재현 확인.
- **전일 대비 색/부호/null**: line 208-219, `changePct === null ? '—' (muted)` / `>= 0 ? text-success` / else `text-danger`, 값은 `formatPriceChange`. DB 재현상 첫 포인트만 chg=null(1건) 정상.

## 항목 4: 카드 클릭 a11y — PASS

`market-pulse-strip.tsx` KpiCard onClick 경로(line 301-314):
- `<button type="button">` ✓
- `aria-haspopup="dialog"` ✓ (line 306)
- `aria-label={actionLabel ?? label}` = "일자별 추이 보기" ✓ (line 307)
- focus-visible ring: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2` ✓ (line 308)
- `ChevronRight` affordance `aria-hidden` ✓ (line 292-297)
- **중첩 인터랙티브 요소 없음**: 카드1 블록 내 `<button|a|input|select|textarea>` 0건. children = icon(svg)/p/ChevronRight(svg)/CountUpMcap(span)/MiniSparkline(svg, 인터랙티브 없음)/p/span. 버튼 내부 인터랙티브 중첩 없음 → 접근성/HTML 검증 위반 없음.

## 항목 5: 회귀 — PASS

- `market-pulse-strip.tsx` HEAD 대비 diff = **완전 가산적**: useState import, ChevronRight import, 모달 import/렌더, 카드1에만 onClick/actionLabel, KpiCard에 onClick 분기 추가.
- KpiCard 리팩토링: header를 변수로 추출했으나 div 경로(onClick 없음) 마크업 동일(헤더 구조 보존). 다른 3개 KPI(전일대비/핫섹터/가장큰자금이동)는 onClick 미지정 → 기존 `<div>` 렌더 유지.
- `↑ inflow / ↓ outflow` (line 247)는 HEAD에 이미 존재(기존 코드, grep -c=1), 이번 변경 아님.
- types: `MarketCapHistoryPoint`/`MarketCapHistoryResponse` 신규 인터페이스만 추가. 기존 타입 미수정 → 가산적.

## 항목 6: 이모지 0 / 통화 무관 오변환 0 — PASS

- **픽토그램 이모지 0건**: `\p{Extended_Pictographic}` 정밀 검사 결과 5파일 0건. (광범위 정규식이 잡은 →/↑/↓는 화살표 텍스트로 이모지 정책 대상 아님; lucide 아이콘 사용 대상은 시각 픽토그램. UI는 Layers/ChevronRight 등 lucide-react 사용.)
- **통화 무관 오변환 0**: 응답 필드 검사 — `marketCapUsd`=toUsd 적용(가격성, 필수)✓, `changePct`=비율(%) 변환 안 함✓, `tickerCount`=무차원 변환 안 함✓. 다른 가격성 필드(price/week52 등) 응답에 없어 누락 변환 위험 없음. CLAUDE.md 통화 정규화 규칙 준수.

## 항목 7: 빌드 — PASS

| 명령 | exit code | 결과 |
|------|-----------|------|
| `pnpm exec tsc --noEmit` | **0** | 타입 에러 0줄 |
| `pnpm build` | **0** | 성공, `ƒ /api/statistics/market-cap` 동적 라우트 등록 |
| `pnpm exec eslint <신규5파일>` | **0** | 신규/수정 파일 에러·경고 0건 |
| `pnpm lint` (전체) | 1 | **신규 회귀 0 — 전부 사전 존재 에러** |

- **lint exit 1 상세**: 에러는 전부 기존 파일(flow-river, flow-card, global-top-bar, global-search, ticker-tape, industry-money-flow-card, recently-viewed-row 등 — 대부분 React Compiler "Cannot call impure function during render" 규칙). **신규/수정 4파일은 lint 출력에 단 1건도 없음.** 타겟 eslint exit 0으로 재확인. → HEAD 대비 신규 lint 회귀 0.
- build 로그의 "Dynamic server usage / searchParams" 메시지는 searchParams 사용 라우트의 정상 빌드 출력(프로젝트 메모리: "build warnings are expected"). 에러 아님.

---

## 경미 관찰 (FAIL 아님, 정보성)

1. **range=N 요청 시 history N+1 포인트 반환**: `route.ts:35-40`이 전일대비 계산용으로 range+1 거래일을 가져온 뒤, `route.ts:84-94`가 datesAsc 전체(N+1)를 history로 반환. 즉 "30일" 요청 시 31행 표시(첫 행 chg=null). 기능 버그는 아니나 라벨-행수 미세 불일치. 의도된 동작이면 무시 가능.
2. **range max=120 vs 실제 보유 99일**: DB 보유 거래일 99일. range=120(모달 "전체") 요청 시 `selectDistinct.limit(121)`이 99개만 반환 → history 99일. DB limit이 자연 클램프 역할(라우트 주석 "보유 99일 내에서 클램프"와 일치). 정상 동작.

---

## 반환 요약

- **전체 판정: PASS** (검증 항목 7/7 PASS)
- **FAIL 목록: 없음**
- exit codes: tsc=0, build=0, eslint(신규5파일)=0, pnpm lint(전체)=1(전부 사전 존재 에러, 신규 회귀 0)
- 핵심 실증: dedup 127중복 제거 확인, region kr+global=all diff $0.0000B, range30 최신=$67.23T=9.75경원
