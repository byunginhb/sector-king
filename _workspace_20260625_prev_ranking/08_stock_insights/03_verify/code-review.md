# 코드 리뷰 — 07_market_scope + 08_stock_insights + 가격차트 버그픽스

리뷰 대상: 미커밋 변경분 전체 (tracked 21파일 + untracked 23파일).
리뷰 일자: 2026-06-11. 리뷰어: code-reviewer (senior).

검증 환경 실측:
- `daily_snapshots` distinct date = 129, `score_history` distinct date = 74 (range 화이트리스트 상한과 일치).
- 비 US/KR 접미사 잔존 = 0건 (DB 실측). region 일치 확인.
- `score_history` 는 전용 테이블이며 `companies.ticker` FK 보유 → 삭제 순서 정합.

---

## CRITICAL

없음.

통화 규칙·회귀·마이그레이션 FK 안전성 등 blocker 후보 항목을 전부 추적했으나 머지를 막을 결함은 발견되지 않았다. 주요 확인 근거:

- base `/api/company/[ticker]/route.ts`: 가산 확장 필드가 전부 toUsd 처리됨. `dayHigh`/`dayLow`/`freeCashflow`=toUsd, `targetMeanPriceUsd`/`currentPriceUsd` 둘 다 toUsd 후 비율(`upsidePct`) 계산, `week52Position`은 동일 ticker 비율이라 변환 불요(주석과 일치). `beta`/`debtToEquity`/`avgVolume`=무차원 비변환 정당.
- `insights/route.ts`: peer 시총을 **행별 `toUsd(p.marketCap, peerTicker)` 후 메모리 집계**(reduce/sort). SQL `SUM`/`ORDER BY market_cap` 없음. `marketSharePct`/`medianMarketCapUsd` 모두 USD 환산값 기반. CLAUDE.md 혼합통화 규칙 준수.
- `migrate-remove-non-us-kr.ts`: 단일 트랜잭션 + `foreign_keys=ON` + 사후 `foreign_key_check`(실패 시 throw→자동 ROLLBACK). DELETE_ORDER 자식→부모(score_history→…→companies) FK 안전. 전부 `WHERE ticker IN (...)` 멱등.

---

## HIGH

없음.

회귀 위험(모달 무손상)·range 폴백 안전성을 집중 확인했고 모두 통과:

- `company-detail.tsx`(모달): `useCompany(ticker)`를 range 없이 호출 → queryKey `['company', ticker]` 불변, 응답 가산 필드는 전부 옵셔널이라 모달 렌더 경로 무영향. 공용 `StockDetailSections`로 추출되어 동작 동일.
- region 식별자 불변: `region-toggle.tsx`의 `value: 'global'` 유지(라벨만 '미국'), `lib/region.ts` `RegionFilter` 타입 불변. URL/캐시/북마크 하위호환 보존.
- `?range=` 폴백: `resolveRange`가 화이트리스트 외/NaN/누락 시 fallback 반환. base HISTORY_RANGES `[30,60,90,129]`가 DB 실측 최대 129일과 일치. insights ALLOWED `[30,60,74,120]` — 120은 보유 74 초과지만 `historyRows.slice` 클램프로 안전 처리(appliedRange=실제 반환수).
- `PriceChartSection` RANGE_OPTIONS `[30,90,129]` ⊂ base HISTORY_RANGES → 폴백 무반응 버그 없음(주석의 "30/60/90/129"와 옵션은 부분집합으로 정합). range=30은 `ticker=''`로 쿼리 비활성(`enabled:!!ticker`) → 추가 fetch 0, 초기 history 재사용.
- 입력 검증: `isValidTicker`(`/^[A-Za-z0-9.\-]{1,12}$/`)로 라우트 param 검증, insights 라우트도 `ticker.length>20` 가드. 에러 메시지는 클라에 generic, 서버는 `console.error` 상세 로깅.
- 0 나눗셈 가드: `upsidePct`(currentPriceUsd>0), `marketSharePct`(total>0), `week52Position`(high>low), `deltaPct`(first!==0), SectorPosition share(total>0) 전부 분모 검사.
- 불변성: `[...arr].sort()` 패턴 일관 적용(insights median, verify rank, primary 정렬). Math.random 렌더 호출 없음.

---

## MEDIUM

- `app/stock/[ticker]/opengraph-image.tsx:11-27` — `loadFont()`가 매 OG 요청마다 Google Fonts CSS+폰트를 외부 fetch. 외부 의존 실패 시 `throw new Error('Font URL not found')`가 OG 라우트 전체를 깨뜨림(이미지 미생성). 권고: 폰트를 로컬 `public`/`assets`에 번들하거나 `cache()`/모듈 스코프 메모이즈로 1회만 로드, fetch 실패 시 폰트 없이 렌더하는 폴백 추가.
- `lib/stock-signals.ts:156` — `marketSharePct >= 30` 매직 넘버가 상단 상수 블록(UPSIDE_STRONG 등)과 달리 인라인 하드코딩. 권고: `MARKET_SHARE_LEAD = 30` 상수로 추출해 임계 SoT 일관.
- `insights/route.ts:244-247` vs `MIN_PEER_SAMPLE` — `marketSharePct`/`marketCapTotalUsd`는 `hasSample`(N≥4) 무관하게 항상 계산되어 응답된다(median/percentile만 표본 게이트 적용). `SectorPosition`은 `marketSharePct`를 그대로 노출하므로 peer 2~3개 소형 섹터에서도 "점유율 X%"가 표시됨. 의도된 설계로 보이나(점유율은 표본 적어도 의미 있음), 소표본에서 점유율 신뢰도 주석/툴팁 보강 고려.
- `components/price-chart.tsx:32-33` — `Math.min(...data.map())` 스프레드는 history가 매우 길 때(현재 최대 129) 스택 한계 무관하나, 빈 배열 외 단일 원소(`length===1`)일 때 `priceChange` 분기는 0 처리되어 색상이 항상 emerald. 기능상 무해하나 단일 포인트 차트의 색 의미 모호. 우선순위 낮음.
- `migrate-add-us-kr-replacements.ts:149-159` — `tempRank>10`일 때 `cappedRank=10`으로 INSERT. 같은 섹터에 캡 대상이 2개 이상이면 rank=10 중복 INSERT 시도 → `sector_companies` PK/UNIQUE 제약에 따라 두 번째는 IGNORE(누락) 가능. 현재 MAPPINGS는 섹터당 캡 도달이 없어 실무 영향 없으나, 향후 대량 보충 시 잠재 누락. 권고: 캡 경로도 update_data 재정렬 위임을 신뢰하되 중복 캡 발생 시 경고 로그 보강.

---

## LOW

- `scripts/scoring.py:189` — `sector_total_mc = sum((row[1] or 0) * weight)`가 여전히 native(KRW raw) 합산. 혼합통화 섹터 시총 비중 왜곡 리스크를 **주석으로만** 트래킹(로직 변경 보류, 범위 밖 명시). 의도된 보류이나 별도 이슈 추적 필요(integrated-plan.md §4 참조됨).
- `lib/chart-colors.ts` — recharts hex 리터럴 SoT 통합은 적절. 단 `CHART_TOOLTIP_CONTENT_STYLE`의 `backgroundColor:'white'`가 라이트 테마 고정이라 다크 모드 시 가독성 저하 가능(기존 차트 동작 답습이므로 회귀 아님).
- `stock-detail-sections.tsx:31` — "30일 가격 추이" 텍스트가 하드코딩. 모달은 항상 30일이라 정확하나, 향후 모달 range 변경 시 라벨 불일치 소지.
- `app/stock/[ticker]/not-found.tsx:15-16` — POPULAR_TICKERS에 `005930.KS`/`000660.KS` URL 사용. `isValidTicker` 정규식(`.`,`-` 허용, 12자 이내)과 sitemap `encodeURIComponent`로 안전하나, CLAUDE.md URL 설계 원칙(경로 param에 ID 권장)과는 결이 다름 — 티커는 ASCII 안전 식별자라 예외 허용 범위로 판단(한국어 slug 아님).
- 이모지: 신규 components/stock·app/stock·lib/stock-signals·chart-colors에서 **진짜 이모지 0건**(grep 히트는 한글/화살표 `→` 오탐). `hooks/use-region.ts`의 `⚠️`는 본 변경분 외 기존 파일이라 대상 아님.
- console: 신규 라우트의 `console.error`만 존재(에러 핸들러 내, 규칙 허용). `console.log`는 마이그레이션/시드 스크립트 한정(콘솔 전용, 예외 허용).
- JSON-LD: `StockJsonLd`가 `marketCapUsd`에 `Number.isFinite` 가드 + `currency:'USD'` 명시. toUsd 값 사용으로 통화 규칙 준수.

---

## 종합

- 통화 규칙: base/insights 양쪽 모두 toUsd 변환·행별 메모리 집계·USD 출력 일관. 클라 재변환 없음(`formatKrw(usd)`는 이미 USD인 snapshot.price/marketCap 수신 — 정합).
- 회귀: 모달 무손상, region 식별자 불변, range 화이트리스트 폴백 안전 — 전부 확인.
- 마이그레이션: 트랜잭션·멱등·FK 안전·좀비 소스(seed/fill-gaps) 정리 정합.
- 규칙: 이모지 0, 입력검증·시크릿 없음·에러처리·파일/함수 크기 양호(최대 ~234줄, 함수 <50줄 대체로 준수).

MEDIUM 5건은 머지를 막지 않으며, 특히 OG 폰트 외부 fetch 폴백(MEDIUM 1)은 후속 개선 권장. CRITICAL/HIGH blocker 부재.

커밋 판정: OK(blocker 없음)
