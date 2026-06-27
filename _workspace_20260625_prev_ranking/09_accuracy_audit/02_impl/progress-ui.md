# 09_accuracy_audit — Lane B (TS/UI/신규 페이지) 구현 진행

구현자: sk-implementer · 시작·완료: 2026-06-11

## 체크박스

- [x] **B1. 환율 SoT 일원화** (CRITICAL 조건부)
  - `lib/currency.ts`: KRW rate를 `NEXT_PUBLIC_KRW_USD_RATE → KRW_USD_RATE → 1450` 순으로 통일, `getKrwRate()` export, 운영 주석 추가
  - `lib/format.ts`: 하드코딩 `const KRW_RATE = 1450` 제거 → `getKrwRate()` import 사용
- [x] **B2. money-flow 라벨 정직화** (HIGH)
  - flow-summary 상단 부제, flow-card 방향 배지 title 툴팁, money-flow-page-content 섹션 부제 정정
  - industry-money-flow-card 헤더 부제, market-pulse-strip "가장 큰 자금 이동" KpiCard hint 툴팁
  - glossary-data inflow/outflow "평가액 증가 포함, 순매수 아님" 보강 + MFI "당일 종가 일중 위치 기준(표준 Wilder와 다름)" 보강
  - 주: §1 판정 반영(자금흐름=기간 시총 변화액, 거래대금 아님). glossary 기존 "시총 증감" 정의 유지·보강
- [x] **B3. 데이터 기준일 표기** (HIGH)
  - money-flow / price-changes / statistics 페이지 main 상단에 "YYYY-MM-DD 기준" 1줄(기존 dateRange.end 재사용, 가산 필드 불필요 — 응답에 이미 존재)
- [x] **B4. priceChange 개명** (MEDIUM)
  - `app/api/statistics/price-changes/route.ts`: `priceChange`(USD 절댓값 차) → `priceChangeAbs`
  - `types/index.ts` PriceChangeItem 동기화. 클라 사용처 전수 grep 결과 소비처 0건(카드는 percentChange만 사용) — 무회귀 확인
- [x] **B5. formatKrw 부호** (MEDIUM)
  - `lib/format.ts` formatKrw에 `options?.signed` 추가(음수 시 `-` 접두)
  - 호출부 flow-summary netFlow / industry-money-flow-card netFlow에 `{ signed: true }` 적용
- [x] **B6. 점유율 소표본 인라인** (MEDIUM)
  - sector-position 점유율 라인에 `(섹터 {peerCount}개 종목 기준)` 병기
- [x] **B7. "74일" 하드코딩 동적화** (MEDIUM)
  - score-trend-chart 빈상태 문구 `{n}/74일` → `현재 {n}거래일`(중립 문구)
  - insights route ALLOWED_RANGES 주석을 "클램프 상한, 정확히 74 보장 안 함"으로 정정. RANGE 화이트리스트 값 74 자체 유지
- [x] **B8. /guide 신규 페이지** (핵심)
  - `app/guide/page.tsx` Server Component + metadata + FAQPage JSON-LD
  - `components/guide/`: guide-toc, guide-section, service-intro, number-glossary, number-glossary-data, screen-guide, honest-limits
  - 섹션 A(3계층·미국/한국·1일 2회 갱신) / B(숫자 10항목 — #7 자금흐름=기간 시총 변화액·평가액 포함·순매수 아님 + MFI 별도) / C(화면별) / D(audit-theory 한계 8항목 그대로 + 투자권유 아님)
  - 각 숫자 항목 "직접 보러 가기" 실링크(기본 산업 tech) + /methodology 딥링크
  - 진입점: GlobalTopBar NAV_ITEMS `{ /guide, 이용 안내, BookOpen }`, footer "이용 안내" 링크, app/sitemap.ts staticPages(priority 0.7, monthly)
  - footer 갱신주기 문구 "매일 00:00 KST" → "1일 2회(KST 16:30 / 익일 07:00)" (§1 판정 정합)
  - lucide만 사용·이모지 0, a11y(nav aria-label, h2 id scroll-mt, 아이콘 aria-hidden)

## 검증 결과
- `pnpm exec tsc --noEmit`: **exit 0**
- `pnpm build`: **exit 0** (`○ /guide` 정적 라우트 등록 확인). searchParams 동적 라우트 로그는 기존 정상 동작(MEMORY: build warnings expected)
- `pnpm lint`: 신규/수정 코드 lint 이슈 0. 잔존 error는 모두 기존 기술부채(particle Math.random, news preview 따옴표) — 본 작업 미관여 파일

## 블로커
없음.
