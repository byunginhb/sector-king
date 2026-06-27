# 통합 기획서 v2 — 디자인 + UX/IA 리뉴얼

> 입력: `_workspace/04_ux_plan/ux-plan.md` (448줄), `design-vision.md` (466줄)
> 작성: sk-orchestrator (메인 통합)
> 일자: 2026-05-09
> 상태: **사용자 승인 대기 중**

---

## 1. 한 줄 요약
"Bloomberg의 정보 밀도를 Linear의 절제된 톤으로 풀어낸, 한국 투자자를 위한 산업 패권 지도" — 메인 진입 한 화면에서 시장 맥박을 보고, 산업 카드의 미니 인사이트로 흥미를 잡고, 4탭 드릴다운으로 종목·섹터까지 자연스럽게 도달.

---

## 2. UX/IA 재설계 (ux-plan 핵심)

### 2.1 메인 화면 새 구조 (위→아래)
1. **MarketPulseStrip** — 헤로 KPI 4카드: 전체 시총·전일 대비·핫 섹터·가장 큰 자금 이동
2. **산업 카드 그리드 (9개)** — 카드당 미니 인사이트 행 추가 (등락 1위 섹터 / 자금 유입 1위 회사 / 14일 sparkline)
3. **핫 종목/핫 섹터 띠 (TickerTape)** — 가로 스크롤 또는 Top 5 카드
4. **산업별 자금 흐름 카드** (현재 위치 유지, 디자인 업그레이드)
5. **시장 동향 요약** (회사 통계 + 가격 변화)

### 2.2 산업 페이지 4탭 통일
모든 산업 컨텍스트(`/[industryId]/`)에서 동일한 4탭:
- **패권 지도** — 카테고리 × 섹터 그리드 (현재 메인)
- **자금 흐름** — 섹터별 자금 흐름
- **등락율** — 종목 등락률
- **기업·섹터 트렌드** ← `/statistics` 라벨 변경

### 2.3 페이지 폐기·통합 (사용자 결정 필요)
| 현재 | 변경 | 사유 |
|------|------|------|
| `/industry-money-flow` | `/money-flow`(canonical)로 이동 + 301 redirect | 의미 중복 |
| `/money-flow` (루트, 전 종목) | **폐기 → 301 redirect → 메인 핫 종목 모듈** | 메인이 흡수 |
| `/price-changes` (루트) | **폐기 → 301 redirect → 메인 핫 종목** | 동일 |
| `/statistics` (루트) | **폐기 → 301 redirect → 메인 시장 동향** | 동일 |

### 2.4 글로벌 네비 + 산업 컨텍스트 바
- **Top Bar (글로벌)**: 로고 / 자금흐름 / 핫 종목 / 방법론 / 검색 / Region / Theme
- **산업 컨텍스트 바** (산업 페이지에서만): 브레드크럼(`산업 > 테크`) + 4탭 + Region + Period
- 모바일: 햄버거 메뉴

### 2.5 종목 모달 cross-link
회사 상세 모달 하단에 "섹터·카테고리·산업으로 이동" 링크 → 드릴업 동선 신설

### 2.6 인사이트 동선 시나리오 (Job-to-be-Done)
1. **"오늘 가장 핫한 게 뭐야?"** → 메인 → MarketPulseStrip의 "핫 섹터" 클릭 → 해당 산업 패권 지도
2. **"AI 섹터 자금 들어오는 회사?"** → 메인 → 테크 산업 카드 클릭 → 자금 흐름 탭
3. **"방산은 지금 좋은 진입 시점?"** → 메인 → 방산 카드의 14일 sparkline · 미니 인사이트 → 산업 패권 지도

---

## 3. 디자인 비전 (design-vision 핵심)

### 3.1 비전 한 문장
"Bloomberg 정보 밀도 + Linear 절제된 톤"

### 3.2 컬러 토큰 업그레이드
| 항목 | Before | After |
|------|--------|-------|
| 다크 베이스 | warm gray | `slate-950` 블루 그레이 |
| 라이트 베이스 | white | `stone-50` warm off-white |
| 강조색 | blue / sky | **단일 `amber`** (골드) |
| 상승 | emerald 채도 ↑ | emerald 채도 다운 |
| 하락 | rose 강함 | rose 채도 다운 |
| 신규 토큰 | — | `--surface-1/2/3`, `--success/danger/warning/info`, `--chart-1..8`, `--border-subtle` |

### 3.3 타이포
- 숫자 전역 `font-feature 'tnum'` (tabular numerals — 정렬 일관)
- 카드 헤더·KPI·캡션 위계 정리

### 3.4 카드 디자인 토큰
- `rounded-xl` → `rounded-2xl`
- `p-4` → `p-5`
- hover: `translate-y-[-1px]` + `border-color` (그림자 변동 X — 차분한 톤)
- `border-subtle` 1px hairline 위계

### 3.5 신규 모듈
- **MarketPulseStrip** (KPI 헤로 띠, 카운트업 애니메이션)
- **MiniSparkline** (산업 카드용 14일 트렌드)
- **TickerTape** (핫 섹터/종목 가로 marquee)
- **데이터 테이블 표준** (zebra·sticky header·정렬 인디케이터)

### 3.6 마이크로인터랙션
- hover 200ms ease — 절제
- KPI 카운트업 (framer-motion)
- 페이지 전환 fade (과도한 모션 자제)

---

## 4. 데이터 영향
- `/api/industries` 응답에 산업당 top1 회사·섹터 옵셔널 필드 추가 검토 → 신규 DB 컬럼 불필요, 기존 데이터로 계산 가능
- 14일 sparkline은 daily_snapshots에서 산업 단위 집계
- TickerTape용 hot 섹터/종목 — 등락률 또는 자금 이동 기준 정렬

---

## 5. 단계별 구현 (Phase 1·2·3)

### Phase 1 — 기반 토큰 + 메인 헤로 (5~7일)
- [ ] 디자인 토큰 업그레이드 (`globals.css`/`tailwind.config`)
- [ ] 카드 토큰 (rounded·padding·hover) 일괄 갱신
- [ ] 숫자 tnum 적용
- [ ] **MarketPulseStrip** 신규 컴포넌트
- [ ] 산업 카드에 **MiniSparkline** + 미니 인사이트 행 추가
- [ ] `/api/industries` top1 회사·섹터 응답 추가

### Phase 2 — IA 재구성 (3~5일)
- [ ] 글로벌 Top Bar + 산업 컨텍스트 바 도입
- [ ] 산업 페이지 4탭 통일, `/statistics` → "기업·섹터 트렌드" 라벨
- [ ] **TickerTape** 핫 종목 모듈
- [ ] 종목 모달 cross-link
- [ ] 페이지 폐기·redirect (`/industry-money-flow` → `/money-flow`, 루트 3개 폐기)

### Phase 3 — 마감 (3~4일)
- [ ] 데이터 테이블 표준화
- [ ] 스켈레톤·빈 상태 톤 정련
- [ ] 페이지 전환·hover 마이크로인터랙션
- [ ] 모바일 햄버거 메뉴 + 반응형 검수
- [ ] axe-core a11y 검수

---

## 6. 위험 / 완화

| 위험 | 가능성 | 영향 | 완화 |
|------|--------|------|------|
| 페이지 폐기로 SEO 회귀 | 중 | 중 | 301 영구 redirect, sitemap 갱신 |
| 디자인 토큰 일괄 변경으로 회귀 | 중 | 높음 | Phase 1 토큰 변경 후 `/design-system` 페이지에서 시각 검수 |
| TickerTape marquee 모션 멀미 | 낮음 | 낮음 | hover 시 정지 + 모바일에서는 정적 카드 |
| MarketPulseStrip 데이터 비싼 집계 | 중 | 중 | API 응답 캐시 + 필요 시 background job |
| 카운트업 애니메이션 성능 | 낮음 | 낮음 | 한 번만 실행, replay 없음 |

---

## 7. 사용자 결정 필요 항목

### Q1. 페이지 폐기·redirect
- **A. 권장 — 폐기** — `/money-flow`, `/price-changes`, `/statistics` 루트 3개 폐기 → 메인 흡수 (정보 중복 제거, IA 명확화). `/industry-money-flow` → `/money-flow`로 이동
- B. 폐기 보류 — 모두 유지 (SEO 보호, 점진 마이그레이션)

### Q2. MarketPulseStrip 메트릭 4종
- **A. 권장 (시장 거시)** — 전체 시총 / 전일 대비 % / 핫 섹터(자금) / 큰 자금 이동(섹터→섹터)
- B. 종목 중심 — 시총 / 등락 1위 / 거래량 1위 / 신규 IPO
- C. 산업 중심 — 시총 / 산업 1위 / 산업 등락 / 산업 자금

### Q3. 디자인 톤
- **A. 권장 — Bloomberg + Linear** (slate-950 다크 + stone-50 라이트 + amber 단일 강조)
- B. 현재 유지 + 미세 정련 (위험 최소)
- C. 더 현대적 — 더 밝은 다크 / 다양한 강조색 (Stripe 대시보드 스타일)

### Q4. 산업 카드 sparkline
- **A. 권장 — 14일 sparkline + 미니 인사이트 1줄** (등락 1위 / 자금 1위)
- B. sparkline만
- C. 미니 인사이트만 (sparkline 미적용)

### Q5. Phase 진행 방식
- **A. 권장 — Phase 1만 먼저 구현 후 평가** (디자인 토큰 + 메인 헤로 — 5~7일)
- B. Phase 1+2 묶어 한 번에
- C. Phase 1·2·3 모두 한 번에 (큰 PR)

---

## 8. 부록

### 산출물 위치
- `_workspace/04_ux_plan/ux-plan.md` (448줄, 페르소나·IA·페이지별 변경안)
- `_workspace/04_ux_plan/design-vision.md` (466줄, 토큰·모듈·와이어프레임·Phase별 우선순위)

### 변경 이력
| 날짜 | 작성자 | 내용 |
|------|--------|------|
| 2026-05-09 | sk-orchestrator | 초안 통합 (UX/IA + 디자인 비전 → v2 통합 기획서) |
