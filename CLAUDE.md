# sector-king

Next.js 15 + TypeScript + Drizzle/SQLite + React Query + framer-motion + recharts 기반의 멀티 산업 주식 대시보드.

## 패키지 매니저

`pnpm`만 사용. `pnpm-lock.yaml` 외 lockfile 생성 금지.

## 통화 정규화 규칙 (필수)

**`dailySnapshots` 와 `companyScores` 의 가격성 필드는 네이티브 통화로 저장된다.** 클라이언트는 모든 응답을 USD($)로 표시하므로, **API 응답 직전 반드시 `toUsd(value, ticker)` 로 변환**해야 한다. 누락 시 .KS/.KQ/.T/.TW/.HK/.PA 티커가 raw 원·엔·NT달러 값으로 노출되어 `$1.82M` 같은 이중 환산 버그가 발생한다(2026-05-09, 2026-05-18 두 번 재발).

**변환 필수 필드:**
- `dailySnapshots`: `price`, `marketCap`, `week52High`, `week52Low`, `dayHigh`, `dayLow`, `firstPrice`, `latestPrice`, `priceChange`(절댓값 차이일 때만 — 원 컬럼 `daily_snapshots.price_change` 는 %라 변환 불요)
- `companyScores`: `targetMeanPrice`, `freeCashflow`
- 위 값들로 파생 계산하는 가격 차/합도 USD 변환 후 계산

**변환 불요 필드 (통화 무관):**
- 비율·퍼센트: `percentChange`, `priceChange`(dailySnapshots 컬럼 = %), `revenueGrowth`, `earningsGrowth`, `operatingMargin`, `returnOnEquity`
- 무차원: `volume`, `peRatio`, `pegRatio`, `beta`, `debtToEquity`, score 값
- 클라이언트 표시용 KRW: `formatKrw(usd)` 가 USD를 받아 ×환율 → 원화 표기 (절대 원값을 넘기지 말 것)

**체크리스트 (모든 신규/수정 API 라우트에서):**
- [ ] 응답에 가격·시총 필드가 있는가?
- [ ] 해당 필드를 `toUsd(value, ticker)` 로 감쌌는가?
- [ ] 두 가격을 빼서 차액을 만든다면, 양쪽을 USD 로 변환 후 빼는가?
- [ ] 같은 통화의 두 가격을 나눠 비율을 구한다면(같은 ticker 한정), 변환은 선택 — 단 출력 시 USD로 변환된 값을 응답해야 함

**SoT:** `lib/currency.ts` (`toUsd`, `TICKER_SUFFIX_CURRENCY`). 새 거래소 접미사 추가 시 여기 한 곳만 수정.

## 하네스: sector-king domain harness

**목표:** 산업/섹터/티커 데이터 모델, 필터 체인(`lib/industry.ts`), API 라우트, UI 페이지가 동시에 영향받는 작업을 안전하게 조율한다.

**트리거:** 다음 영역에 걸치는 작업 요청 시 `sk-orchestrator` 스킬을 사용한다.
- 산업/섹터/티커 데이터 모델 변경, 시드/마이그레이션
- region(전체/국내/해외) 필터 도입·확장
- 섹터별 누락 티커 보완
- 산업 대시보드/money-flow/price-changes/statistics/hegemony-map의 동시 변경
- 위 영역의 재실행, 수정, 보완

단순 질문·단일 파일 편집은 직접 응답한다.

**에이전트 (`.claude/agents/`):** sk-data-modeler, sk-ticker-curator, sk-filter-architect, sk-ui-planner, sk-implementer, sk-verifier

**작업 디렉토리:** `_workspace/01_plan/`, `_workspace/02_impl/`, `_workspace/03_verify/` (gitignore 권장)

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-05-09 | 초기 하네스 구성 | 전체 | region 필터(전체/국내/해외) + 누락 티커 보완 작업 시작 |
| 2026-05-09 | S1~S5 완료 — region 토글 + 티커 보완 출시 | DB 스키마, lib/region, API 8개, hook 8개, UI 5개 페이지 | 통합 기획서 수락 기준 14개 코드 검증 통과 |
| 2026-06-10 | 07_market_scope 완료 — 시장 미국·한국 한정 + `/stock/[ticker]` 신규 | DB(비US/KR 22개 제거, MUFG/JD 등 대체), scripts(remove/add 마이그레이션·currency.py·suggest_candidates), region 라벨 4파일, app/stock·components/stock | INTL=미국 재정의(식별자 유지), 시총+섹터대표성 수집기준, 종목 전용 상세 라우트. 수락기준 8개 CONDITIONAL→PASS(좀비소스 정리 후) |
| 2026-06-10 | 08_stock_insights 완료 — `/stock/[ticker]` 인사이트 페이지 격상 | API base 가산확장 + 신규 `/api/company/[ticker]/insights`, components/stock/insights/* 7개, lib/stock-signals·chart-colors, use-company-insights | 모달=스냅샷/페이지=시계열·peer·룰시그널 차별화. score_history 74일·시총점유율(USD집계)·밸류에이션 percentile 활용. 수락기준 15개 PASS(모달 무회귀, toUsd 집계 실증) |
| 2026-06-11 | 09_accuracy_audit 완료 — 유료화 대비 정합성 수정 + `/guide` 신규 | scoring.py(USD 합산), backfill_score_history.py(EMA 재체인), update_data.py(주말 skip·KR volume 가드), 주말행 10,422행·깨진티커 15종 정리(XYZ/PSKY 대체), lib/currency·format(환율 SoT), money-flow 라벨·기준일 표기, app/guide+components/guide | 혼합통화 scale 왜곡(MU 0.03%→29.77%) 해소, 자금흐름=기간 시총 변화액 정의 확정, 검증 12/12 PASS·EMA 407/407 재현 |
| 2026-06-14 | 10_currency_toggle 완료 — 통화 표시 토글(기본 ₩ + 원/달러 전역) | 신규 hooks/use-currency·use-currency-format·components/currency-toggle, lib/format(4함수 통화인지), providers·layout(inline script), 표시지점 28파일 전수 전환 | 순수 표시 레이어(DB/API/캐시 무변경). Context+localStorage(next-themes 패턴), queryKey 미포함, 이중표기 단일화, 양방향 환산. 검증 14/14 PASS·신규 lint 회귀 0 |
| 2026-06-14 | 시총 KPI 정확화 + 일자별 드릴다운 | API industries.market(dedup), 신규 /api/statistics/market-cap·use-market-cap-history·market-cap-detail-modal, market-pulse-strip(라벨·클릭), lib/format(경 단위) | "전체 시가총액" 멀티산업 중복 1.7배 제거→"추적 종목 시총", 169179.7조원→9.7경원, 카드 클릭 시 일자별 차트+표 모달. 검증 7/7 PASS(region kr+global=all 실증) |
| 2026-06-27 | 11_kr_top200 — KR 시총 상위 200 누락 운영기업 99개 적재 + 노출 배선 | DB(KR 79→178, 신규 섹터 14·카테고리 4·industry 연결 4, rank cap ≤10→≤30), scripts/migrate-add-kr-top200-sectors.ts, _workspace/research/batch*.csv·run_batch.sh | ETF/우선주 제외 운영기업만 add_ticker.py로 적재(yfinance 자동, LLM 0). 통신·해운·지주 등 신규 섹터 industry 연결로 대시보드/지도/머니플로우/통계 전면 노출. score_history는 시스템 기본대로 forward-only. 빌드 standalone DB에 KR 178 번들 확인. seed.ts는 폐기된 tech 부트스트랩이라 미동기화—taxonomy SoT는 누적 마이그레이션+커밋 DB |
| 2026-06-28 | 12_us_top250 — US 시총 상위 250 누락 운영기업 94개 적재 | DB(US 330→424, 신규 섹터 17개 전부 기존 카테고리에 편입→배선 불필요), scripts/migrate-add-us-top250-sectors.ts·backfill_new_ticker_score_history.py, _workspace/research/us_all.csv | 갭 96개 중 MDLN(상장 미확정)·MMC(Yahoo 데이터 공급 문제) 제외. 철도/미드스트림/정유/지역은행/담배/아날로그반도체/산업재유통/의약품유통 등 비테크 클러스터. US는 native USD라 toUsd 불요. score_history 백필로 단기점수 100 붕괴 방지(신규 종목 65행 생성). journal=delete 보장(WAL 500 방지). 빌드 standalone DB에 US 424 번들 확인 |
| 2026-06-28 | 12_dcf_score — /rankings 에 DCF 점수(0~100)+상승예측% 독립 보조 지표 추가 | 신규 lib/dcf.ts(순수함수·통화무지)·__tests__/unit/dcf.test.ts(13), app/api/rankings/route.ts(freeCashflow 배선+company_profiles sector leftJoin+computeDcf+sortKey dcf/dcfUpside), hooks/use-rankings.ts, components/rankings/ranking-table·ranking-card-list·rankings-page, components/guide/number-glossary-data.ts·app/methodology(섹션6) | 표준 2단계 DCF(예측 10년+TV). FCF는 네이티브 유지·주당 내재가치만 1회 toUsd(intrinsicToUsd 주입). g0=clamp(revenueGrowth,-5%,15%), r=베타·부채(/100)·규모(USD기준) 가산 6~12%. 가드: FCF≤0→negativeFcf, 금융주→finance, 자료부족→missing, NaN 명시 차단. 기존 단기·장기·combinedScore·topPicks·애널리스트 upsidePct 무회귀. 한계: company_profiles 약 1/3만 보유→sector 기반 금융주 제외 일부만 작동(FCF≤0 가드가 주 방어선) |
| 2026-07-07 | issue#8 시장 규모 — 단독 페이지 `/market-size`(버블+트리맵 시각화) 신규 | 신규 app/market-size·app/api/market-size/route.ts·hooks/use-market-size·components/market-size/*(page·bubble·treemap·explainer), types(MarketSize*), global-top-bar(PieChart 탭)·sitemap 배선 | 카테고리(클릭→섹터 드릴다운) 버블: X=시총가중 revenueGrowth, Y=시총가중 목표주가 상승여력((target−price)/price 동일통화 상쇄), 크기=시총, 색=대표산업. 트리맵=카테고리 시총비율(성장률 청록→보라 시퀀셜). 시총·매출 toUsd 후 집계 실증(KR 반도체 $4.06e12 raw KRW÷1450). 매출 보조(185/602 커버 라벨). 카테고리 M:N 중복(합 $220T≈추적×2)이라 그랜드 토탈 미표기·비율만. 최신 스냅샷 기준. 접이식 설명 패널. build/tsc/lint(신규 회귀 0) PASS |
| 2026-07-07 | 시장 규모 성장 전망 UX 개편 — 버블 차트 → 지표 분리 막대 | 버블 제거(market-size-bubble-chart 삭제), 신규 market-size-metric-bars(재사용 수평 div 막대), market-size-page(2열 grid·모바일 스택)·explainer 갱신 | 사용자 피드백("버블 보기 불편"): 매출 성장률·목표주가 상승여력을 각각 랭킹 막대로 분리. 데스크탑 lg:grid-cols-2·모바일 세로. 지표 desc 정렬 상위12, null 제외, 소프트 캡(상위85%×1.2·최소40%)으로 극단값(지주회사 성장 193%)이 다른 막대 안 눌리게—라벨은 실제%. 양수 emerald/음수 rose, recharts 미사용(경량). API·트리맵 무변경 재활용(멀티에이전트 설계·데이터 검증). build/tsc/lint(신규 회귀 0) PASS |
| 2026-07-09 | 성장 전망 PC 뷰 토글 — 막대 ↔ 버블 | market-size-bubble-chart 복원(git 5de50ce), market-size-page(viewMode state·`hidden lg:inline-flex` 토글·반응형 조건부 렌더), explainer 갱신 | 모바일=막대 고정, PC(lg+)만 상단 토글로 막대/버블 전환(기본 막대). 모바일 블록은 버블 미마운트(recharts 경량 유지). 버블 뷰 산업색·groups 계산 복구. build/tsc/lint(신규 회귀 0) PASS |
| 2026-07-10 | 메인 대문 개편 — 히어로 한 줄 슬로건 + 자금흐름/Market Pulse 상단 (issue#29 1번) | industry-dashboard(히어로 축소·메일 CTA·Market Pulse→자금흐름 상단·자금흐름 중복 헤더 제거), layout·globals(Nanum Myeongjo 800 한글 디스플레이 폰트) | 한글 히어로가 Fraunces(라틴 전용) 폴백으로 밋밋 → `--font-display` 스택에 명조 삽입(subsets:['latin']이 KR unicode-range 서빙). 크기 3xl/5xl/6xl→2xl/4xl/5xl. 커밋 fc052d6 |
| 2026-07-16 | 시장 규모 트리맵 → Finviz 스타일 산업·섹터 시총 지도 | 신규 lib/treemap.ts(squarify·textUnits)+`__tests__/unit/treemap.test.ts`(11), 신규 components/market-size/market-size-industry-map, market-size-page(트리맵 카드 교체·섹터 모달 배선), market-size-treemap 삭제, sector-company-list(flowDirection optional+neutral 톤) | 카테고리 평면 트리맵(상위 30개) → 산업 9개 그룹 안에 섹터 143개 중첩. 섹터 클릭 시 기존 SectorCompanyList 모달로 종목 표. **API 무변경** — `/api/market-size` 가 이미 카테고리별 `industryId`+중첩 `sectors[]` 를 반환해 산업 그룹핑은 클라이언트 useMemo 로 파생(카테고리의 대표 산업 기준). recharts Treemap 은 그룹 헤더 공간을 못 빼서 자체 squarify+절대배치 div 로 대체(한글 라벨·클릭·title 툴팁 확보). 좁은 화면은 min-w-46rem+overflow-x-auto 로 가로 팬(페이지 본문은 미넘침 실증). ResizeObserver 는 콜백 ref 로 부착(조건부 마운트 시 관측 누락 방지). 색=매출 성장률 유지(신규 데이터 불요). build/tsc/lint 회귀 0 |
| 2026-07-16 | 시총 지도 종목 드릴다운 — 팝업 제거, 지도 자체가 종목 타일로 전환 | market-size-industry-map(MapTile/MapGroup 범용화·colorScale growth\|change·href 앵커), market-size-page(drillSector state+useSectorCompanies 재사용, SectorCompanyList 모달 제거), sector-company-list 원복(neutral 톤 되돌림 — 미사용 유연성 제거) | 사용자 피드백("팝업 말고 차트가 변해서"): 섹터 클릭 → 같은 카드에서 종목 타일 트리맵 + "전체 산업" 뒤로. 데이터는 기존 `/api/statistics/money-flow/[sectorId]/companies`(marketCap 이미 toUsd) 재사용 → **API 무변경**. 색은 레벨별 분리: 섹터=매출 성장률 시퀀셜(청록→보라), 종목=14일 등락률 발산(rose↔slate↔emerald, 이상치 방어 위해 \|v\| p85 캡). 종목 타일은 Link 앵커(`/stock/[ticker]`)라 새 탭·복사 기본동작 유지. 실화면 검증: 자율주행 6종목(엔비디아 +6.4% 녹/테슬라 -6.9% 적), 앵커 href 6개 실측, 뒤로가기 복귀. build/tsc/lint 회귀 0·treemap 유닛 11/11 |
| 2026-07-16 | 시총 지도 중복 집계 수정 — 다중 소속 종목 시총 균등 배분 | app/api/market-size/route.ts(sectorCountByTicker 분모·share 배분·NodeAccum 을 Set 기반으로 전환), market-size-page/explainer 캡션 | **버그**: 종목이 여러 섹터에 속하면 시총이 중복 합산돼 트리맵(부모=자식 합 전제)이 거짓. 구글 10섹터 → $4.5T가 $44.8T. 테크만 3.4배($186.9T 표시 vs 실제 $54.7T), 전체 $222.7T(전세계 주식시장 $120T의 2배로 불가능). 다른 산업은 1.0~1.1배라 테크만 과대. **수정**: 시총·매출을 소속 섹터 수로 균등 배분(분모=필터 무관 전체 섹터 수 — 필터 통과분으로 나누면 같은 산업이 전체/필터 뷰에서 다른 값). 부수 수정: 카테고리 acc 가 건수 기반이라 다중섹터 종목의 tickerCount·가중평균이 중복 반영되던 것을 Set 으로 종목당 1회 처리. 가중평균 가중치는 배분 전 시총 유지(대표성; 배분값 쓰면 다중섹터 종목만 영향력 삭감). 검증: API totalMarketCap=카테고리 합=섹터 합=$79.5T 로 SQL 실측과 정확히 일치(배분 무손실). 테크 84%→64.6%. 드릴다운은 배분 전 전체 시총 유지(종목 실제 크기)라 섹터 타일과 기준 다름 — 캡션 명시. 데이터 무변경 |
| 2026-07-11 | 14_econ_calendar — 경제 캘린더 MVP(매크로 지표) 메인 신규 (issue#32) | 신규 Supabase `economic_events`(RLS 5정책·supabase/migrations/0008), 공개 `/api/economic-calendar`+use-economic-calendar+lib/econ-calendar, components/calendar/*(월그리드·주리스트·필터·이벤트pill·상세모달)+dashboard/economic-calendar-section(메인 마운트), 어드민 `/admin/economic-calendar`+CRUD API+lib/economic-calendar(schema·dto), 자동수집 lib/economic-calendar/fred+`/api/cron/economic-calendar-sync`+.github/workflows/update-economic-calendar.yml | 저장소=Supabase(런타임 어드민 CRUD 필요→커밋 SQLite 불가, 뉴스 패턴 미러). 미국=FRED releases/dates 자동(퍼블릭도메인·무료, limit≤1000)+지표별 표준 ET시각 상수→KST(DST-aware). 수동 시드=FRED 미커버(FOMC)+한국 전량. 충돌정책 is_hidden(소프트삭제)+is_locked(수동고정, 재수집이 값 미갱신). 필터=캘린더 로컬(국가 all/kr/us·카테고리·주/월), region 전역과 분리. 실적/이벤트 탭 "준비 중". 라이브 검증: 마이그레이션 psql(Session pooler aws-1-ap-northeast-1) 적용·시드→FRED 수집 fetched7/upserted7 멱등·공개 API 11건 중복0. fred 유닛 5/5·build/tsc/lint 회귀0. 5에이전트 병렬 기획(data-source·model·filter·ui·admin) |
