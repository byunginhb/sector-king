# 통합 기획서 — 시장 범위 미국·한국 한정 + 신규 페이지 `/stock/[ticker]`

> 라운드: `07_market_scope` · 작성: 메인 오케스트레이터 · 2026-06-10
> 입력: data-model.md · ticker-curation.md · filter-chain.md · ui-plan.md (4개 병렬 기획 산출물)
> 상태: **승인 대기** (APPROVED 마커 없음)

---

## 1. 요약 — 무엇을, 왜

사용자 요구 3가지를 하나의 작업 라운드로 묶는다.

1. **시장 범위를 미국·한국으로 한정** — 비(非)US/KR 22개 티커(일본·홍콩·대만·유럽·호주) 제거.
2. **데이터 수집 기준 정립** — "어떤 종목을 가져올 것인가"를 시총 1순위 + 섹터 대표성 큐레이션 하이브리드로 표준화.
3. **신규 페이지 1개** — `/stock/[ticker]` 종목 전용 상세 라우트 신설(현재는 모달뿐 → 딥링크·공유·SEO 불가).

**왜 지금 한 라운드로 묶는가:** region 모델(KR/INTL)·필터 체인·시드·UI가 동시에 영향받는 교차 작업이고, 22개 제거가 섹터 대표성/랭킹/페이지에 연쇄로 작용하기 때문이다.

### 1.1 핵심 합의 (4개 에이전트 만장일치)

- **region 식별자 유지(옵션 A):** URL `?region=global`, DB `companies.region='INTL'` **그대로 둔다.** 비US/KR 제거 후 INTL이 "순수 미국"이 되므로 **의미만 재정의**. → 코드 로직 변경 0건(8 hook + 11 라우트 + queryKey 캐시 + 북마크 전부 하위호환). **바뀌는 건 UI 라벨 "해외→미국" 4개 파일 4라인뿐.**
- **신규 페이지 = `/stock/[ticker]`:** 기존 `CompanyDetail` 컴포넌트 + `/api/company/[ticker]` 거의 100% 재사용. 신규 API 불요.
- **데이터 수집:** 시총(USD 환산)이 1순위 정렬 신호, 최종 편입은 섹터 적합성 큐레이션. 자동 후보추출 + 수동 확정 하이브리드.

### 1.2 중요 정정 (ticker-curator 발견)

- `2454.TW`는 **TSMC가 아니라 MediaTek**(컨텍스트 오기). **TSMC의 미국 ADR `TSM`은 이미 DB에 존재**(foundry/asic/gpu) → TSMC 대표성은 손실 없음.
- `BABA`/`PDD`/`SONY`/`TSM`은 이미 미국 라인으로 DB 존재 → 해당 비미국 라인 제거해도 무손실.
- **정식 미국 거래소 ADR만 대체 채택**(MUFG, JD). OTC ADR(LVMUY/HESAY 등)은 yfinance 데이터 불안정 → 원칙 배제, 미국·한국 직상장으로 갭 보충.

---

## 2. 단계 정의 (입력 → 출력 → 변경 파일)

### 단계 1 — 데이터 모델 / 제거 마이그레이션
- **입력:** 제거 22개 티커 화이트리스트, FK 관계.
- **작업:**
  - 신규 `scripts/migrate-remove-non-us-kr.ts` (better-sqlite3 + 단일 트랜잭션 + `foreign_key_check`, 멱등).
  - 삭제 순서(자식→부모): `score_history`(876) → `daily_snapshots`(1185) → `company_scores`(22) → `company_profiles`(0) → `sector_companies`(22) → `companies`(22).
  - 실행 전 백업: `cp data/hegemony.db data/hegemony.db.bak.$(date +%s)`.
  - `package.json`에 `db:migrate:remove-non-us-kr` 추가.
- **출력:** 22개 티커 전 테이블 제거, FK 무결성 검증 통과.
- **rank gap:** 별도 재채번 마이그레이션 불필요 — 단계 3의 `update_data.py`(`scoring.py::update_sector_rankings`)가 점수순 1..N 재정렬로 흡수.

### 단계 2 — 티커 큐레이션 / 대체·보충 시드
- **입력:** ticker-curation.md 처리표.
- **작업:**
  - **ADR 대체(무손실):** `MUFG`→global_banks, `JD`→ecommerce 추가.
  - **섹터 붕괴 3곳 보충**(아래 §3 결정 의존):
    - `aircraft_mfg` → "항공·방산"으로 확장: BA + LMT/RTX/GD + 047810.KS(KAI).
    - `luxury_fashion` → "미국 럭셔리/액세서리"로 재정의: TPR/CPRI + EL/RL/NKE.
    - `luxury_auto` → TSLA + RACE 2종 유지(+ "미국 상장 한정" 안내).
  - **rank1 공백 보충(선택):** materials(LIN 승계 + ALB/동진쎄미켐), fast_fashion(TJX 승계 + ROST/BURL + 한국 비중↑).
  - 신규 `scripts/migrate-add-us-kr-replacements.ts` (INSERT OR IGNORE + region 자동 주입 + 백필).
  - `scripts/seed.ts`에서 좀비 부활 방지: `1810.HK`/`2454.TW`/`4063.T` 정의·매핑 제거.
- **출력:** 모든 섹터 ≥2종목(단일종목 섹터 0), 대표성 회복.

### 단계 3 — 데이터 수집 기준 / 점수·랭킹 재정렬
- **입력:** 수집 게이트 정의.
- **작업:**
  - 신규 `scripts/currency.py` — `lib/currency.ts`의 KRW 환율 미러(USD 환산 SoT 일치). 시총 정렬 전 `toUsd` 강제.
  - 신규 `scripts/suggest_candidates.py`(읽기 전용) — 섹터별 후보 추출: 시장 게이트 → 결측/최소시총/유동성/품질 게이트 → **USD 시총 DESC** 정렬 → 상위 N 출력(DB 미변경, 큐레이터 검토용).
  - `scripts/add_ticker.py`에 **시장 게이트** 추가(US/KR 접미사 외 거부 — 오염 재발 차단).
  - **수집 기준(확정안):** 시총 1순위 + 섹터 대표성. 섹터당 5~10종(KR≥2~3 가능 섹터, US≥3~5). 최소 시총 US≥$2B / KR≥₩1조, 유동성·데이터품질 게이트.
  - `update_data.py` 1회 실행 → 점수 + rank 1..N 재정렬(gap 소멸).
  - **(리스크 이슈) `scoring.py` 혼합통화 섹터 시총 합산 USD 보정** — 별도 트래킹.
- **출력:** 미국·한국 종목만 일관된 기준으로 수집·랭킹.

### 단계 4 — UI 적용
- **입력:** filter-chain.md 계약, ui-plan.md.
- **작업 (라벨):**
  - `components/region-toggle.tsx:35` — `label:'해외'→'미국'`, `ariaLabel`, `icon:Earth→DollarSign`.
  - `components/ui/empty-region-state.tsx:12` — `'해외'→'미국'`.
  - `components/money-flow/sector-company-list.tsx:243` — `'해외'→'미국'`.
  - `components/design-system/components-section.tsx` — hint `"국내/해외/전체"→"국내/미국/전체"`.
  - `lib/region.ts` JSDoc — "INTL=미국(비US/KR 제거 후)" 1줄 명시.
  - 빈 섹터 정책: money-flow/대시보드=숨김, 패권지도=노출.
- **작업 (신규 페이지 `/stock/[ticker]`):**
  - `app/stock/[ticker]/page.tsx`(Server: params 검증 `/^[A-Za-z0-9.\-]{1,12}$/` + `generateMetadata` + Suspense), `opengraph-image.tsx`, `not-found.tsx`(제거된 22개 티커 옛 링크 안내 분기).
  - `components/stock/` 하위로 `CompanyDetail` 내부 섹션 추출(PriceBanner/HegemonyBadges/ScoreAnalysis) → 모달·페이지 공유(200~400줄 규칙).
  - 재사용: `useCompany`, `/api/company/[ticker]`, `price-chart`, `watch-star-toggle`, `share-button`, `GlobalTopBar`.
  - `json-ld.tsx`에 `StockJsonLd`(Corporation + tickerSymbol, 가격은 toUsd 값), `sitemap.ts`에 active 티커 `/stock/${ticker}` 등록(제거 22개 제외).
  - 반응형 표준 헤더 패턴, lucide-react 아이콘, 이모지 금지, a11y 체크리스트(뒤로가기 aria-label 등).
- **출력:** "미국" 라벨 일관 + 딥링크/공유/SEO 가능한 종목 페이지.

---

## 3. 결정이 필요한 항목 (권장안 제시 — 승인 시 권장안 채택)

| # | 결정 | 권장안 | 대안 |
|---|------|--------|------|
| D1 | **섹터 붕괴 3곳 처리** | **재정의/확장**: aircraft_mfg→"항공·방산"(BA+LMT+RTX+GD+KAI), luxury_fashion→"미국 럭셔리"(TPR+CPRI+EL+RL), luxury_auto→TSLA+RACE 유지 | OTC ADR 채택(LVMUY 등)으로 명목 유지 — 데이터 불안정 위험 / 섹터 폐지 |
| D2 | **신규 페이지** | **`/stock/[ticker]` 종목 상세** (재사용 최대, SEO 가치 최대) | 스크리너 `/screener` / 비교 `/compare` / 랭킹 `/rankings` |
| D3 | **수집 최소 시총 임계** | US≥$2B, KR≥₩1조(≈$0.7B) — env 외부화 | 임계 없음(시총 상위 N만) / 임계 상향 |
| D4 | **region 라벨/아이콘** | "미국" + `DollarSign` 아이콘 | "해외" 유지 / `Earth` 유지 |
| D5 | **OTC ADR 정책** | 정식 미국 상장만 채택(MUFG/JD), OTC 배제 | 거래량 있는 일부 OTC 개별 채택 |

---

## 4. 위험과 완화

| 위험 | 심각도 | 완화 |
|------|:------:|------|
| 패권 1위 섹터(luxury_fashion 등) 대표성 상실 | 높음 | 단계 2 대체/보충을 **삭제와 같은 라운드**에 묶음(D1) |
| `companies.region` 백필 누락 → SQL↔메모리 경로 분기 | 중 | 삭제/대체 후 `assertRegionConsistency` 1회 실행(검증 단계) |
| 후보추출 toUsd 누락 → KR 편중 정렬 | 중 | `scripts/currency.py` 미러 + 정렬 전 USD 환산 강제 |
| scoring 혼합통화 섹터 시총 왜곡(잠재 기존 버그) | 중 | USD 환산 보정(별도 이슈로 트래킹, 이번 범위 명시) |
| 서버 캐시 stale(revalidate=3600) | 낮음 | 배포 직후 revalidate 또는 재배포 |
| `/stock` 옛 링크(제거 티커) 유입 | 낮음 | `not-found.tsx` 분기 안내 + sitemap 제외 |
| 데이터 손실 | 낮음 | 파일 백업 + 단일 트랜잭션 + foreign_key_check |

---

## 5. 수락 기준

- [ ] 비US/KR 접미사(.T/.HK/.TW/.PA/.DE/.SW/.MC/.AX) 잔존 0건 (`SELECT DISTINCT` 검증).
- [ ] 모든 섹터 종목 수 ≥ 1 (단계 2 후 붕괴 섹터 ≥2, 단일종목 섹터 신규 발생 0).
- [ ] MUFG/JD 등 대체 종목 스냅샷 존재(백필 완료).
- [ ] `?region=all|kr|global` 각각 정상 — global=미국, kr=한국, all=합산.
- [ ] 기존 URL/북마크(`?region=global`) 하위호환 동작(BC-1~BC-7).
- [ ] `/stock/AAPL`, `/stock/005930.KS` 정상 렌더 + 메타데이터/JSON-LD/OG + 404 분기.
- [ ] 시총 정렬·표시가 모두 USD 환산 후 수행(toUsd 체크리스트).
- [ ] `pnpm build` + `pnpm exec tsc --noEmit` + `pnpm lint` 통과.

---

## 6. 충돌 해결 로그

| 항목 | 충돌/차이 | 해결 |
|------|-----------|------|
| 2454.TW 정체 | 컨텍스트 "TSMC" vs 큐레이터 "MediaTek" | **큐레이터 실측 채택(MediaTek)**. TSM ADR은 이미 존재 → 대체 불요 |
| region 모델 A vs B | data-modeler가 A/B 비교 제시 | filter-architect·ui-planner 모두 **A(식별자 유지)** 지지 → **A 확정** |
| rank gap 압축 | 마이그레이션 내부(A) vs scoring 위임(B) | **B(scoring 위임)** 채택 — 중복 작업 제거 |
| ADR 채택 범위 | 광범위 OTC vs 정식만 | **정식 미국 상장만(MUFG/JD)** — yfinance 안정성 |
| 화이트리스트 vs suffix 게이트 삭제 | 22개 명시 vs 접미사 자동 | 1차 **명시 화이트리스트**(리뷰·롤백 용이), 추가 시점 게이트는 `add_ticker.py`에 |

---

## 7. 실행 순서 (런북 — 승인 후)

```
0) cp data/hegemony.db data/hegemony.db.bak.$(date +%s)         # 백업
1) pnpm db:migrate:remove-non-us-kr                             # 22개 삭제(멱등)
2) pnpm tsx scripts/migrate-add-us-kr-replacements.ts          # MUFG/JD + 섹터 보충
3) python scripts/update_data.py                               # 점수 + rank 재정렬
4) UI: region 라벨 4파일 + /stock/[ticker] 페이지 구현
5) pnpm build && pnpm exec tsc --noEmit && pnpm lint           # 검증
6) sk-verifier: 수락 기준 8항목 증거 수집
```

---

## 8. 신설/수정 파일 요약

**신설:** `scripts/migrate-remove-non-us-kr.ts`, `scripts/migrate-add-us-kr-replacements.ts`, `scripts/currency.py`, `scripts/suggest_candidates.py`, `scripts/verify-market-scope.ts`(선택), `app/stock/[ticker]/{page,opengraph-image,not-found}.tsx`, `components/stock/*`.

**수정:** `package.json`, `scripts/add_ticker.py`(시장 게이트), `scripts/scoring.py`(USD 합산 보정·리스크), `scripts/seed.ts`(좀비 제거), `lib/region.ts`(JSDoc), `components/region-toggle.tsx`·`empty-region-state.tsx`·`sector-company-list.tsx`·`design-system/components-section.tsx`(라벨), `components/company-detail.tsx`(섹션 추출), `json-ld.tsx`, `sitemap.ts`.
