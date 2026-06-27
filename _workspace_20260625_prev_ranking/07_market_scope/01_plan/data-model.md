# 07_market_scope — 데이터 모델 · 마이그레이션 · 데이터 수집 기준 (sk-data-modeler)

> 작성: sk-data-modeler · 근거: `drizzle/schema.ts`, `lib/region.ts`, `lib/currency.ts`,
> `scripts/update_data.py`, `scripts/add_ticker.py`, `scripts/scoring.py`,
> `scripts/migrate-*.ts` 실제 코드 + `data/hegemony.db` 직접 조회(2026-06-10).
> 모든 수치는 추측이 아닌 DB 쿼리 결과.

---

## 0. 현황 분석 (실측)

### 0.1 테이블 관계 (제거에 관련된 부분만)

```
companies (ticker PK, region 'KR'|'INTL')
   │  1:N (ticker)
   ├── sector_companies (sector_id→sectors, ticker→companies, rank CHECK 1..10, UNIQUE(sector_id,ticker))
   ├── daily_snapshots   (ticker→companies, date, UNIQUE(ticker,date))   ← native 통화
   ├── company_scores    (ticker PK→companies)                            ← native 통화 일부
   ├── score_history     (ticker NOT NULL→companies, date, UNIQUE(ticker,date))
   └── company_profiles  (ticker PK→companies)
```

- 모든 자식 테이블이 `companies.ticker` 를 FK 로 참조. `companies` 가 부모(루트).
- **실제 DB 의 `foreign_keys` PRAGMA = `0`(OFF)**, `journal_mode = delete`.
  → FK 는 선언만 되어 있고 강제되지 않음. 따라서 삭제 시 FK ON 으로 켜고 `foreign_key_check` 로
  무결성을 *검증*하는 것이 안전(고아 행 탐지). better-sqlite3 마이그레이션에서 명시적으로 ON.

### 0.2 제거 대상 22개 티커 — 테이블별 영향 행수 (실측)

| 테이블 | 22개 티커 관련 행수 |
|--------|------|
| `sector_companies` | **22** (티커당 정확히 1행 — 다중 섹터 매핑 없음) |
| `companies` | **22** |
| `daily_snapshots` | **1,185** |
| `company_scores` | **22** |
| `score_history` | **876** |
| `company_profiles` | **0** (프로필 백필이 안 돼 있음 — 삭제 무관) |

→ 22개 티커는 각각 단일 섹터에만 속함. dedup/중복 매핑 케이스 없음 → 삭제 로직 단순.

### 0.3 rank CHECK 제약 (실측)

`sector_companies` 실제 정의:
```sql
rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 10)
```
- `migrate-relax-rank-check.ts` 가 이미 적용되어 ≤10. **삭제는 rank 를 늘리지 않으므로 CHECK 위반 없음.**
- 단, **삭제는 rank 연속성(gap)을 깬다.** 예: `luxury_fashion` 은 rank 1(RMS.PA), 2(MC.PA) 가 제거되어
  남는 행이 rank 3,4,5 로 시작 → rank 1,2 공백.

### 0.4 삭제 후 rank gap 이 생기는 대표 섹터 (실측)

| sector_id | 제거 전 rank/ticker (제거 대상 ★) | 제거 후 잔여 rank |
|-----------|-----------------------------------|-------------------|
| `luxury_fashion` | 1★RMS.PA 2★MC.PA 3 TPR 4★CFR.SW 5 CPRI 6★KER.PA | 3,5 (gap 1,2,4,6) |
| `luxury_auto` | 1 TSLA 2 RACE 3★BMW.DE 4★MBG.DE 5★P911.DE | 1,2 (gap 3,4,5) |
| `fast_fashion` | 1★9983.T 2 383220.KS 3 TJX 4 105630.KS 5★ITX.MC | 2,3,4 (gap 1,5) |
| `aircraft_mfg` | 1 BA 2★AIR.PA | 1 (gap 2 → 잔여 1종목) |

### 0.5 삭제 후 종목 수 위험 (실측)

- **종목 0개가 되는 섹터: 없음.** (22개가 분산되어 있어 전멸 섹터는 0)
- **잔여 1종목 섹터(신규 발생): `aircraft_mfg`(BA 만 남음).**
  - 참고: 이미 잔여 1종목인 섹터가 다수 존재(`electrical_equip`, `logistics_reit` 등) → 1종목 자체는
    기존에도 허용되는 상태. 단 `aircraft_mfg` 는 이번 삭제로 새로 1종목이 됨.
- **잔여 2종목으로 떨어지는 섹터(이번 삭제 기인): `luxury_auto`, `luxury_fashion`, `materials`** 등.
- 패권 1위가 빠지는 섹터: `luxury_fashion`(RMS.PA=Hermès, rank1), `materials`(4063.T 신에쓰, rank1),
  `equipment`(8035.T 도쿄일렉트론, rank1), `global_banks`(8306.T 미쓰비시UFJ, rank1),
  `rare_earth`(LYC.AX 라이너스, rank1), `fast_fashion`(9983.T 유니클로, rank1).
  → **단순 삭제 시 해당 섹터의 글로벌 1위가 사라짐. ticker-curator 의 ADR/미국·한국 대체가 핵심 의존.**

### 0.6 rank 재정렬은 별도 마이그레이션 불필요 — `scoring.py` 가 흡수

`scripts/scoring.py::update_sector_rankings()` (실측 L306-364):
- 섹터별로 `smoothed_score DESC, weighted_mc DESC` 로 **rank 를 1..N 으로 재부여**.
- 즉 삭제 후 이 함수를 1회 실행하면 gap(1,2,4,6…) 이 자동으로 1,2,3… 으로 압축됨.
- **결론: 별도 "rank renumber" 마이그레이션을 쓰지 말고, 삭제 마이그레이션 말미에
  `update_sector_rankings` 를 재실행하거나, 삭제 직후 `update_data.py` 정규 사이클을 1회 돌려 정렬을 위임한다.**
  마이그레이션은 TS(better-sqlite3), 재정렬은 Python(scoring) 이므로, 마이그레이션 스크립트 안에서
  rank gap 만 멱등하게 압축하는 보조 단계를 둘지(아래 §1.3) 선택.

---

## 1. 비 US/KR 종목 제거 마이그레이션 설계

### 1.1 삭제 순서 (FK = 부모 마지막)

`companies` 가 루트 부모이므로 **자식 → 부모** 순. 22개 티커 집합을 `T` 라 할 때:

```
1) score_history      DELETE WHERE ticker IN T   (876행)
2) daily_snapshots    DELETE WHERE ticker IN T   (1185행)
3) company_scores     DELETE WHERE ticker IN T   (22행)
4) company_profiles   DELETE WHERE ticker IN T   (0행, no-op)
5) sector_companies   DELETE WHERE ticker IN T   (22행)
6) companies          DELETE WHERE ticker IN T   (22행)  ← 마지막
```

근거: `daily_snapshots/company_scores/score_history/company_profiles/sector_companies` 전부
`companies.ticker` 만 참조하고 서로 참조 없음 → 위 순서면 충돌 없음. FK ON 으로 켜고 단계마다 진행해도 안전.

### 1.2 멱등 마이그레이션 스크립트 (`scripts/migrate-remove-non-us-kr.ts`)

`migrate-add-region.ts` / `migrate-relax-rank-check.ts` 패턴(better-sqlite3 + transaction +
`foreign_key_check`)을 그대로 따른다.

**시그니처/구조(설계):**

```ts
// scripts/migrate-remove-non-us-kr.ts
// 실행: pnpm db:migrate:remove-non-us-kr
// 멱등성: 2회차 실행 시 모든 DELETE changes=0 (대상 티커 부재).
// 안전: 실행 전 cp data/hegemony.db data/hegemony.db.bak.$(date +%s)

import Database from 'better-sqlite3'
import path from 'path'
import { getRegionFromTicker } from '../lib/region'

const DB_PATH = path.join(process.cwd(), 'data', 'hegemony.db')

// SoT: ticker-curation.md §"제거 대상" 과 동기화. 22개 명시 화이트리스트.
// (suffix 기반 자동 도출도 가능하나, US/KR 외 접미사 = .T/.PA/.HK/.TW/.DE/.SW/.MC/.AX 를
//  "비 US/KR" 로 판정하는 것이 더 견고 — 아래 §1.4 참고. 1차는 명시 리스트 권장.)
const TICKERS_TO_REMOVE = [
  '1810.HK','2454.TW','4063.T','6752.T','6954.T','8035.T','8306.T','9618.HK',
  '9697.T','9983.T','AIR.PA','BMW.DE','CFR.SW','ITX.MC','KER.PA','LYC.AX',
  'MBG.DE','MC.PA','MUV2.DE','OR.PA','P911.DE','RMS.PA',
] as const

// 자식→부모 순 (FK 안전)
const DELETE_ORDER = [
  'score_history', 'daily_snapshots', 'company_scores',
  'company_profiles', 'sector_companies', 'companies',
] as const

async function migrate() {
  const sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')   // 기존 마이그레이션 관례
  sqlite.pragma('foreign_keys = ON')    // 삭제 무결성 강제 검증

  try {
    // (선택) dry-run 카운트 로깅: 삭제 전 각 테이블 매칭 행수 출력
    const placeholders = TICKERS_TO_REMOVE.map(() => '?').join(',')

    const tx = sqlite.transaction(() => {
      for (const table of DELETE_ORDER) {
        const stmt = sqlite.prepare(
          `DELETE FROM ${table} WHERE ticker IN (${placeholders})`
        )
        const res = stmt.run(...TICKERS_TO_REMOVE)
        console.log(`[del] ${table}: ${res.changes}행 삭제`)
      }

      // 무결성 사후 검사 — 고아 행 없는지
      const fk = sqlite.prepare('PRAGMA foreign_key_check').all()
      if (fk.length > 0) {
        console.error('FK 무결성 위반:', fk)
        throw new Error('foreign_key_check 실패 — 자동 ROLLBACK')
      }
    })
    tx()

    // 잔존 비 US/KR 가드 — getRegionFromTicker 가 INTL 이라도 접미사가 US/KR 가 아닌 잔재 점검
    const leftover = sqlite.prepare(`
      SELECT ticker FROM companies
      WHERE ticker LIKE '%.T' OR ticker LIKE '%.PA' OR ticker LIKE '%.HK'
         OR ticker LIKE '%.TW' OR ticker LIKE '%.DE' OR ticker LIKE '%.SW'
         OR ticker LIKE '%.MC' OR ticker LIKE '%.AX'
    `).all() as { ticker: string }[]
    if (leftover.length > 0) {
      console.warn('[warn] 비 US/KR 접미사 잔존:', leftover.map(r => r.ticker))
    }
  } catch (e) {
    console.error('마이그레이션 실패:', e)
    throw e
  } finally {
    sqlite.close()
  }
}
migrate().catch((e) => { console.error(e); process.exit(1) })
```

**package.json 추가:**
```json
"db:migrate:remove-non-us-kr": "tsx scripts/migrate-remove-non-us-kr.ts"
```

**멱등성:** 모든 DELETE 가 `WHERE ticker IN (...)` 라 2회차엔 changes=0. ALTER/CREATE 없음 → 완전 멱등.

### 1.3 rank gap 압축 (마이그레이션 vs 위임)

두 가지 옵션 — **권장은 옵션 B(위임)**.

- **옵션 A (마이그레이션 내부에서 압축):** 삭제 트랜잭션 직후, 영향받은 섹터에 대해
  `ROW_NUMBER() OVER (PARTITION BY sector_id ORDER BY rank)` 로 1..N 재부여.
  SQLite 3.25+ 윈도우 함수 사용:
  ```sql
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY sector_id ORDER BY rank) AS rn
    FROM sector_companies
  )
  UPDATE sector_companies SET rank = (SELECT rn FROM ranked WHERE ranked.id = sector_companies.id);
  ```
  장점: TS 한 곳에서 완결. 단점: scoring.py 가 다음 사이클에 어차피 재정렬하므로 중복 작업.
- **옵션 B (scoring 에 위임, 권장):** 삭제 마이그레이션은 rank 를 건드리지 않고, 직후
  `python scripts/update_data.py`(또는 scoring 만) 1회 실행 → `update_sector_rankings` 가
  점수순 1..N 재부여. gap 자동 소멸 + 점수도 최신화.
  - **단, 삭제~재정렬 사이에 임시로 rank gap 이 존재**하므로, UI 가 rank 를 키로 가정하지 않는지 확인 필요
    (filter-architect 와 합의). 통상 rank 는 정렬용이라 gap 허용.
  - 운영 순서: ① 백업 → ② 삭제 마이그레이션 → ③ ticker-curator 의 ADR/대체 종목 `add_ticker.py` 추가
    → ④ `update_data.py` 1회(점수+rank 재정렬) → ⑤ 검증.

### 1.4 (대안) 화이트리스트 vs suffix-게이트 삭제

- 1차 작업은 **명시 22개 화이트리스트** 권장(투명·리뷰 용이·롤백 단순).
- 장기 데이터 오염 방지용으로는 **"US/KR 접미사가 아닌 모든 티커" 게이트**가 더 견고
  (예: `.KS/.KQ` 또는 접미사 없음(=US) 외 전부 비대상). `lib/currency.ts::TICKER_SUFFIX_CURRENCY`
  의 키(`.T/.TW/.HK/.PA`) + `.DE/.SW/.MC/.AX` 가 "외화" 접미사 집합 ≈ 제거 대상.
  → 단 US 티커 중 점(.)이 포함된 정상 케이스(예: `BRK.B`)가 있으면 오탐 위험 → 화이트리스트가 안전.

### 1.5 롤백 전략

1. **파일 백업(필수, 모든 마이그레이션 공통 관례):**
   `cp data/hegemony.db data/hegemony.db.bak.$(date +%s)` — `migrate-add-region.ts`/`relax-rank` 주석과 동일.
   journal_mode=delete 라 단일 `.db` 파일만 백업하면 충분(WAL 사이드카 없음).
2. **트랜잭션:** 6개 DELETE + `foreign_key_check` 를 단일 `sqlite.transaction()` 으로 묶음 →
   중간 실패 시 better-sqlite3 가 자동 ROLLBACK(`relax-rank` 와 동일 패턴).
3. **복구:** 잘못됐을 경우 백업 파일을 원위치 복사.
   ```bash
   cp data/hegemony.db.bak.<ts> data/hegemony.db
   ```
4. **git:** `data/hegemony.db` 가 커밋 추적 대상(daily update 커밋 존재)이므로,
   삭제 커밋 전 `git stash`/브랜치로 격리하면 git revert 로도 복구 가능.

---

## 2. region 모델 재정의 검토

### 2.1 현황 (실측 사용처)

- DB 컬럼 `companies.region`: `'KR' | 'INTL'` (대문자 2값). 인덱스 `idx_companies_region`.
- URL/UI/API 쿼리 `?region=`: `'all' | 'kr' | 'global'`. 매핑 SoT = `regionFilterToValue`
  (`'global' → 'INTL'`).
- `'global'`/`'INTL'` 사용처(실측 grep): **API 라우트 10+개**
  (`statistics/movers`, `price-changes`, `companies`, `money-flow/*`, `sector-trend`, `industries`, `map`),
  `lib/money-flow-helpers.ts`, `components/region-toggle.tsx`(라벨 "해외"),
  `components/hegemony-map.tsx`, `components/ui/empty-region-state.tsx`("해외"),
  `components/design-system/patterns-section.tsx`.

### 2.2 옵션 비교

| | 옵션 A: 값 유지(INTL=미국으로 의미만 변경) | 옵션 B: INTL→US 리네이밍 |
|--|--|--|
| 코드 변경 | 거의 없음 (라벨 카피만) | 광범위: DB 컬럼 값 백필 + `lib/region.ts` 타입/매핑 + 10+ API + 컴포넌트 |
| 마이그레이션 | 불필요 | `UPDATE companies SET region='US' WHERE region='INTL'` + 인덱스 영향 |
| 위험 | 낮음. "INTL" 이 내부적으로 의미 미스매치(미국인데 INTL) | 높음. 누락 한 곳이라도 있으면 region 필터 침묵 실패 |
| 가독성 | DB 값이 의미와 불일치(부채) | 명확 |

### 2.3 권장안: **옵션 A (값 유지) + UI 라벨만 재정의**

근거:
1. `lib/region.ts` 가 명시적으로 "DB 컬럼 값과 URL/UI 값의 표기 분리"를 SoT 규약으로 둠(L26-30).
   즉 **DB 값(`INTL`)은 내부 식별자, 사용자 표기는 별도**라는 설계가 이미 존재 → 라벨만 바꾸면 정합.
2. 옵션 B 는 10+ 라우트 + 매핑 함수 + 타입(`RegionValue = 'KR' | 'INTL'`) 전부를 건드려야 하고,
   `getRegionFromTicker`(SoT) 반환값까지 바꿔야 함 → region 일관성 위반 위험.
3. 비용 대비 효용 낮음: 사용자에게 보이는 건 라벨("해외" → "미국")이지 DB 값이 아님.

**구체 변경(라벨만, ui-planner 와 합의):**
- `components/region-toggle.tsx:35`: `label: '해외'` → `'미국'`, `ariaLabel: '해외 종목만 보기'` → `'미국 종목만 보기'`, `icon: Earth` → 미국 의미 아이콘(예: `Flag`) 검토.
- `components/ui/empty-region-state.tsx:12`: `region === 'global' ? '해외'` → `'미국'`.
- URL 파라미터 값 `'global'` 자체는 **유지**(라우팅/캐시키 안정성). 단 의미 주석 갱신.
  - 대안(ui-planner 판단): URL 값도 `'us'` 로 바꾸고 `'global'` 은 하위호환 alias 로 `resolveRegion` 에서 흡수.
    → 코드영향 커서 비권장. 1차는 라벨만.
- 문서/주석: `lib/region.ts` 의 `'global' → 'INTL'` 매핑 주석에 "INTL = 미국(비 US/KR 제거 후)" 명기.

### 2.4 `getRegionFromTicker` 가드 필요성

현재 `getRegionFromTicker` 는 `.KS/.KQ` → KR, **그 외 전부 → INTL**. 비 US/KR 접미사(.T/.PA…)도
INTL 로 분류됨. 제거 후에는 그런 티커가 DB 에 없어야 정상.

- **권장: 신규 데이터 유입 게이트는 "추가 시점"(add_ticker.py / 수집 스크립트)에 둔다.**
  `getRegionFromTicker` 자체는 KR|INTL 2분류 결정 함수이므로 시그니처를 바꾸지 않음(여러 곳 의존).
- **추가 시점 가드(권장 신설):** `add_ticker.py` 와 신규 후보 추출 스크립트에서
  "허용 접미사(없음=US, .KS, .KQ) 외 접미사면 거부"하는 화이트리스트 검증 추가.
  ```python
  ALLOWED_SUFFIXES = ('.KS', '.KQ')  # + 접미사 없음(US)
  def is_us_or_kr(ticker: str) -> bool:
      if ticker.endswith(ALLOWED_SUFFIXES):
          return True
      return '.' not in ticker  # 접미사 없음 → US (단 BRK.B 류 예외는 별도 화이트리스트)
  ```
- **선택(dev 가드):** `assertRegionConsistency`(이미 존재) 외에, "허용 시장 외 접미사" 점검 헬퍼를
  `lib/region.ts` 에 추가해 dev/health 에서 비 US/KR 잔재를 가시화(필터-architect 와 합의).

---

## 3. 데이터 수집 기준 정의 (사용자 핵심 질문)

> "미국·한국 종목을 어떤 기준으로 가져오는 게 가장 좋은가?"

### 3.1 1순위 = 시가총액, 단 "섹터 대표성" 보정 필수

- **시총 1순위가 맞다.** 이미 `scoring.py` 의 Scale(35점) 중 marketCap share(20점)가 핵심이고,
  `update_sector_rankings` 가 점수(시총 비중 반영)로 rank 를 매김 → 시총은 자연스러운 1순위 신호.
- **트레이드오프:** 순수 시총 상위만 담으면 "대형주 편중"으로 섹터 정체성이 흐려짐
  (예: `rare_earth` 에 시총 큰 일반 소재 대기업이 들어오면 희토류 대표성 상실).
  → **시총은 후보 풀(pool) 정렬 기준, 최종 편입은 "섹터 적합성" 큐레이션.** (자동+수동 하이브리드, §3.5)

### 3.2 섹터당 종목 수 정책 + US/KR 균형

- 현 제약: `rank CHECK 1..10` → 섹터당 최대 10. 현실 분포는 1~10 혼재(실측: aircraft_mfg 1, gaming 10).
- **권장 정책(시드 규칙으로 문서화):**
  - 섹터당 목표 **6~10종목**(최소 5 권장, 1~2종목 섹터는 보완 큐레이션 대상).
  - **US/KR 균형은 "섹터 성격별 정책"으로 차등.** 단일 글로벌 컬럼으로 강제하기보다
    `categories.region_scope`(이미 존재: `'ANY'|'KR'|'INTL'`)를 활용:
    - `region_scope='KR'` 카테고리(korea_bio, korea_banks 등): KR 종목 위주.
    - `region_scope='ANY'`: US 대표 N개 + KR 대표 M개를 시드 큐레이션에서 명시(예: US 최소 3 + KR 최소 1).
  - **모델로 "강제"하기보다 시드/큐레이션 규칙으로 권고**하는 것이 현실적.
    DB CHECK 로 "섹터당 KR≥1" 같은 제약은 SQLite 로 표현 어렵고(트리거 필요) 데이터 가용성에 따라 깨짐.
    → ticker-curator 산출물에 "섹터별 US/KR 목표 배분 표"를 두고, 검증 스크립트로 사후 점검(아래).
- **신설 가능한 경량 정규화(선택):** `sectors` 에 `region_scope`(카테고리와 동일 의미) 또는
  `min_companies` 컬럼을 추가해 "이 섹터는 KR 전용/혼합" 메타를 명시 → 검증 스크립트가 활용.
  단 현재 `categories.region_scope` 로 충분하면 컬럼 추가는 보류(YAGNI).

### 3.3 수집 필터링 게이트 (후보 편입 전)

신규 수집/후보 추출 시 아래 게이트를 **순서대로** 적용(스크립트 관점):

1. **시장 게이트(필수):** 접미사 ∈ {없음=US, .KS, .KQ} 만 통과(§2.4). 그 외 거부.
2. **데이터 결측 게이트:** `yfinance .info` 에 `marketCap` 존재(현 `validate_ticker` 가 이미 `marketCap` 부재 시 거부 — 재사용).
   추가로 `currentPrice|regularMarketPrice` 존재 권장.
3. **최소 시총 임계값:** **USD 환산 후** 비교. 권장 기본값:
   - US: ≥ **$2B**(중형주 이상), KR: ≥ **₩1조(≈$0.7B)** — KR 시장 규모 감안해 별도 임계.
   - 임계는 env 또는 스크립트 상수로 외부화(`MIN_MARKETCAP_US`, `MIN_MARKETCAP_KR`).
4. **유동성(거래량) 게이트:** `averageVolume` ≥ 임계(예: US 50만주, KR 10만주) — 상폐임박/저유동 배제.
5. **데이터 품질 게이트:** scoring 의 `data_quality`(펀더멘털 7필드 비결측 비율) ≥ 0.4 권장.
   극단적 결측 종목은 점수 신뢰도 낮음 → 후보에서 후순위.

> 임계값은 1차 가이드. ticker-curator 가 섹터별로 조정. 모든 시총 비교는 **반드시 USD 환산 후**(§4).

### 3.4 yfinance 한계와 대응

- **KR 종목 `.info` 결측:** `.KS/.KQ` 는 `revenueGrowth/earningsGrowth/targetMeanPrice/recommendationKey`
  등 애널리스트 필드가 자주 비어 있음 → `data_quality` 낮음. scoring 의 `normalize(None,…)` 이
  중앙값(max_score*0.5)으로 폴백하므로 점수는 산출되나 신뢰도 주의.
  - 대응: KR 종목은 `analyst_count`/`targetMeanPrice` 결측을 정상으로 간주하고, 시총·성장·수익성 위주로 평가.
  - `data_quality` 임계(§3.3-5)를 KR 은 완화(예: ≥0.3).
- **ADR 통화/표기:** ADR(예: TSM, JD, LVMUY)은 **미국 상장 → 접미사 없음 → USD 표기 → toUsd 변환 불요**(rate=1).
  ticker-curator 가 비 US/KR 패권주를 ADR 로 대체할 때, **거래소 기준(미국 상장) 이므로 region=INTL(=미국)** 로
  자연 분류됨(`lib/region.ts` 의 "거래소 기준" 규약 L13-17과 일치). 본사 국적과 무관.
  - 단 OTC-only(.PK)·저유동 ADR(LVMUY 등 Pink)은 yfinance 데이터 빈약 가능 → §3.3 게이트로 사후 판정.
- **티커 포맷 함정:** `update_data.py::SKIP_TICKERS` 에 `CATL`(→300750.SZ) 사례 존재 — 중국 본토(.SZ)는
  이번 정책상 어차피 제외. 잘못된 포맷 티커는 수집 단계에서 거부.

### 3.5 자동 랭킹 + 수동 큐레이션 하이브리드 (스크립트 설계)

**워크플로우:** 시총 상위 후보 자동 추출 → 큐레이터가 섹터 적합성으로 최종 선택 → `add_ticker.py` 로 편입.

신규 스크립트 제안 **`scripts/suggest_candidates.py`**(읽기 전용, DB 변경 없음):

```
입력:  --sector <sector_id>  [--region us|kr|all]  [--limit 20]
       [--min-mcap-us 2e9] [--min-mcap-kr 7e8]
처리:
  1) 후보 유니버스 로드 — 옵션:
       (a) 사전 정의된 시장 인덱스 구성종목 CSV(S&P500/나스닥100/KOSPI200) 캐시, 또는
       (b) yfinance 로 후보 티커 리스트의 .info 일괄 조회
  2) §3.3 게이트 적용(시장/결측/최소시총(USD 환산)/거래량/품질)
  3) USD 환산 시총 DESC 정렬 → 상위 N 출력 (티커, 이름, 시총USD, 거래량, data_quality, 이미 편입 여부)
출력:  표/JSON. DB 변경 없음 — 큐레이터가 검토 후 add_ticker.py 수동 실행.
```

- **자동 = 후보 추출/정렬(시총·게이트), 수동 = 섹터 적합성 최종 결정.** 자동이 DB 를 직접 바꾸지 않음 →
  대표성 왜곡 방지 + 리뷰 가능.
- `add_ticker.py` 는 그대로 재사용(이미 region 자동 분류 + 백필 + 점수/rank 갱신).
  단 §2.4 시장 게이트를 `add_ticker.py::add_ticker` 진입부에 추가(비 US/KR 접미사 거부)하면
  실수로 비대상 시장 티커가 다시 들어오는 것을 방지(데이터 오염 재발 차단).
- **검증 스크립트(선택) `scripts/verify-market-scope.ts`:** 멱등 점검 — (a) 비 US/KR 접미사 잔재 0건,
  (b) 섹터별 종목수/US·KR 배분이 목표 표와 부합, (c) rank 1..N 연속성. CI/사후 검증에 사용.

---

## 4. 통화 정규화 영향 (toUsd 누락 위험 지점)

CLAUDE.md 통화 규칙: `daily_snapshots`/`company_scores` 가격성 필드는 **native 통화 저장**,
**API 응답 직전 `toUsd(value, ticker)`**.

이번 작업에서 **시총 비교/랭킹** 이 새로 추가되므로 누락 위험 신규 지점:

1. **후보 추출 시 시총 정렬(§3.3-3, §3.5):** KR 종목 `marketCap` 은 KRW raw.
   US 종목은 USD. **정렬·임계 비교 전 반드시 `toUsd(marketCap, ticker)`.**
   누락 시 ₩(1450배 큰 값)가 US 보다 항상 위로 올라가 **KR 편중 오정렬**.
   - Python 측엔 `toUsd` 가 없음(현재 `lib/currency.ts` TS 전용). 신규 Python 스크립트는
     `lib/currency.ts::TICKER_SUFFIX_CURRENCY`/`CURRENCY_RATES` 와 **동일 환율 테이블을 미러링**해야 함.
     → **권장: `scripts/` 에 `currency.py` 동등 모듈 신설**(getRegionFromTicker 가 add_ticker.py 에 미러된 것과 동일 패턴).
     KRW 외 통화는 어차피 제거되므로 KR(KRW)만 미러해도 충분(KRW rate 1개). 단 SoT 일치 주석 필수.
2. **scoring.py 의 sector_total_market_cap(L189-191):** 동일 섹터 내 비중 계산이라
   *동일 통화끼리* 비교면 비율은 보존됨. 그러나 **혼합 통화 섹터**(US+KR 종목 공존)에서는
   raw marketCap 합산 시 KR 종목이 과대평가 → scale_score 왜곡.
   - **현재도 잠재 버그**(혼합 섹터에서 KRW raw 합산). 비 US/KR 제거 후에도 US+KR 혼합 섹터는 남으므로
     **scoring.py 의 marketCap 을 USD 환산 후 합산/비중 계산하도록 보정 권장**(Python currency 미러 활용).
     → executor/verifier 와 별도 이슈로 트래킹(이번 범위 밖이면 리스크로 명시).
3. **API 응답:** company 상세·랭킹 응답에 시총 노출 시 `toUsd` 적용 — 기존 라우트는 적용돼 있으나
   신규 랭킹/스크리너 페이지(ui-planner) 추가 시 체크리스트 재확인.

**체크리스트(신규/수정 지점):**
- [ ] 후보 추출 정렬·임계 비교: `marketCap` → USD 환산 후 비교했는가?
- [ ] Python 환율 테이블이 `lib/currency.ts` 와 동일한가?(KRW=1450 등)
- [ ] scoring 의 섹터 시총 합산이 혼합 통화에서 USD 기준인가?(리스크)
- [ ] 신규 페이지 API 응답의 시총/가격 필드에 `toUsd` 적용?

---

## 5. 다른 기획 영역과의 의존/충돌

| 상대 | 의존/충돌 내용 | 합의 필요 결정 |
|------|----------------|----------------|
| **sk-ticker-curator** | 제거되는 22개 중 섹터 패권주(RMS.PA/MC.PA/4063.T/8035.T/8306.T/LYC.AX/9983.T 등)의 **ADR·미국·한국 대체 종목 확정**. 대체 종목 시드 형식(ticker, sector_id, name_ko, rank)과 §3.3 게이트 통과 여부. | 섹터별 대체 매핑 표 + US/KR 목표 배분. ADR 없는 섹터는 "갭 수용 + 잔여 종목으로 운영" 합의(예: aircraft_mfg=BA 단독). 삭제→대체 추가 순서(§1.3 운영 순서). |
| **sk-filter-architect** | region 라벨/값 결정(옵션 A) → `'global'` URL 값 유지·라벨만 "미국". rank gap 임시 존재 시 필터·정렬이 rank 를 키로 가정하지 않는지. `categories.region_scope` 활용한 KR 전용 카테고리 노출 규칙. | URL 값 `'global'` 유지 vs `'us'` alias 도입 최종 결정. region 필터 SQL/메모리 양 경로 정합 유지(§2). |
| **sk-ui-planner** | region-toggle 라벨 "해외"→"미국", empty-state 카피, 아이콘(Earth→Flag?). 신규 페이지(스크리너/랭킹)가 시총을 노출하면 toUsd 체크리스트 적용. | 토글 3값 유지(all/kr/us-라벨) vs 2값 축소. 신규 페이지에서 "시총 기준" 노출 방식. |

---

## 부록 A. 실행 순서 요약 (런북)

```
0) cp data/hegemony.db data/hegemony.db.bak.$(date +%s)        # 백업
1) pnpm db:migrate:remove-non-us-kr                            # 22개 삭제(멱등, 트랜잭션)
2) (ticker-curator 확정안) python scripts/add_ticker.py <ADR/대체> <sector_id> ...  # 대체 편입
3) python scripts/update_data.py                              # 점수+rank 재정렬(gap 소멸)
4) pnpm tsx scripts/verify-market-scope.ts                    # (신설) 사후 검증
5) UI 라벨 변경(해외→미국) + 커밋
```

## 부록 B. 신설/수정 파일 목록

- 신설: `scripts/migrate-remove-non-us-kr.ts`, `scripts/currency.py`(toUsd 미러),
  `scripts/suggest_candidates.py`(후보 추출), `scripts/verify-market-scope.ts`(검증, 선택).
- 수정: `package.json`(db:migrate:remove-non-us-kr 스크립트),
  `scripts/add_ticker.py`(시장 게이트 추가), `scripts/scoring.py`(섹터 시총 USD 합산 보정 — 리스크 이슈),
  `components/region-toggle.tsx` / `components/ui/empty-region-state.tsx`(라벨, ui-planner 소관),
  `lib/region.ts`(주석: INTL=미국 의미 명기 / 선택적 시장 게이트 헬퍼).
- **시드 영향:** `scripts/seed.ts`(섹터별 시드 종목에서 22개 제거 + 대체 종목 반영 — ticker-curator 확정 후),
  `scripts/migrate-fill-ticker-gaps.ts`(과거 gap 채움 로직에 비 US/KR 가 포함됐는지 점검).

## 부록 C. 리스크 요약

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| 패권 1위 섹터(luxury_fashion 등) 대표성 상실 | 높음 | ticker-curator ADR/대체 선편입 후 삭제 운영, 갭 섹터 명시 |
| `aircraft_mfg` 잔여 1종목(BA) | 중 | 대체(다른 US 방산/항공기) 편입 또는 1종목 수용 |
| scoring 혼합통화 섹터 시총 합산 왜곡(잠재 기존 버그) | 중 | scoring.py USD 환산 보정(별도 이슈) |
| 신규 Python 후보추출의 toUsd 누락 → KR 편중 정렬 | 중 | currency.py 미러 + 정렬 전 USD 환산 강제 |
| 삭제~재정렬 사이 rank gap 임시 노출 | 낮음 | scoring 즉시 재실행, UI 가 rank 를 키로 안 씀 확인 |
| 데이터 손실 | 낮음 | 파일 백업 + 단일 트랜잭션 + foreign_key_check |
```
