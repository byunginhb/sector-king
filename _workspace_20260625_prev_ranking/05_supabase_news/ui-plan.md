# sector-king · 인증/관리자/뉴스 도입 UI 기획 (sk-ui-planner)

> Scope: IA·동선·우선순위·접근성. 디자인 토큰/시각 디테일은 sk-design-system 영역.
> 입력 가정: Supabase Auth (이메일+OAuth 또는 매직링크), `profiles.role ∈ {user, admin}`, `news_posts` 테이블, sk-news-architect의 "오늘의 마켓 리포트" 카드 위치 권장.

---

## 1. 헤더 UI

### 1.1 현행 (참조: `components/industry-dashboard.tsx:41`)
```
[Logo] [Sector King · 산업별 ...]            [Region] [Share] [Search] [Help] [Theme]
```
- sticky, `z-50`, `bg-background/80 backdrop-blur-sm`
- 모바일에서 도구 아이콘이 줄바꿈 됨

### 1.2 신규 헤더 — 비로그인
```
desktop  ─────────────────────────────────────────────────────────────────
[Logo] Sector King      [전체|국내|해외]   [News] [Share] [Search] [?] [☾] [로그인]
mobile  ─────────────────────────────────────
[Logo] Sector King                       [≡]
        ↳ 햄버거 시트: Region / News / Share / Search / Help / Theme / [로그인]
```

### 1.3 신규 헤더 — 로그인 (일반/관리자 공통)
```
desktop  ─────────────────────────────────────────────────────────────────
[Logo] Sector King      [전체|국내|해외]   [News] [Share] [Search] [?] [☾] [Avatar▾]
                                                                              │
                                                                       ┌──────┴────────┐
                                                                       │  user@x.com   │
                                                                       │  ─────────    │
                                                                       │  프로필        │
                                                                       │  관리자 페이지 │ ← role=admin 시
                                                                       │  ─────────    │
                                                                       │  로그아웃      │
                                                                       └───────────────┘
mobile  ─────────────────────────────────────
[Logo] Sector King                  [Avatar] [≡]
        ↳ 시트 상단에 사용자 정보 + 메뉴 항목 (프로필 / 관리자 / 로그아웃)
```

### 1.4 우선순위 / 가시성 규칙
- 로그인 버튼은 데스크탑에서 항상 노출 (CTA), 모바일은 햄버거 내부.
- 아바타는 32×32, 이니셜 fallback (lucide `User` 아이콘) — 이모지 금지.
- News 진입점은 헤더 도구 그룹 좌측 (가장 왼쪽 아이콘) — 콘텐츠성 강조.
- `Region` 토글은 기존 위치 유지 (페이지 헤더 좌측~중앙).

---

## 2. 사용자 드롭다운 메뉴

| 항목 | 아이콘 (lucide) | 노출 조건 | 동작 |
|------|----------------|----------|------|
| 이메일 헤더 | — | 항상 | 비활성 라벨 |
| 프로필 | `User` | 항상 | `/profile` 이동 |
| 관리자 페이지 | `ShieldCheck` | `role === 'admin'` | `/admin` 이동 |
| 구분선 | — | 항상 | — |
| 로그아웃 | `LogOut` | 항상 | `signOut()` → `/` redirect |

- `Radix DropdownMenu` 사용 (이미 `components/ui/`에 패턴 존재 가정, 없으면 신규).
- 트리거: 아바타 + `chevron-down`.
- 키보드: `Tab`로 진입, `↑/↓` 이동, `Enter` 선택, `Esc` 닫기 (Radix 기본 제공).

---

## 3. 메인 화면 IA 변경

### 3.1 현행
```
Header (sticky)
└─ MarketPulseStrip            ← 하루치 핵심 KPI
└─ 산업별 자금 흐름 (industry money flow grid)
└─ 산업 패권 지도 (9 카드)
└─ 시장 동향 요약 (2 카드)
Footer
```

### 3.2 신규 (권장)
```
Header (sticky · 로그인 상태 반영)
└─ MarketPulseStrip
└─ 오늘의 마켓 리포트 카드      ★ 신규 — MarketPulseStrip 바로 아래
└─ 산업별 자금 흐름
└─ 산업 패권 지도 (9 카드)
└─ 시장 동향 요약 (2 카드)
Footer (News 진입점 보강)
```

### 3.3 권장 위치 사유 (MarketPulseStrip 바로 아래)
1. **시선 흐름**: KPI(숫자) → 내러티브(뉴스) → 상세 데이터(그리드)로 자연스러운 사용자 동선.
2. **콘텐츠 성격**: 뉴스 카드는 "오늘의 요약"으로 KPI와 의미적 페어링. 자금 흐름/패권 지도는 분석 도구이므로 그 다음 단계.
3. **모바일 우선**: 첫 스크린에 KPI + 뉴스 1개가 들어가도록 — 가장 빠르게 가치 전달.
4. **빈 상태 친화**: 뉴스 미발행 시 카드를 숨겨도 레이아웃이 깨지지 않음.

대안 검토:
- (탈락) MarketPulseStrip 위 — KPI가 메인 hero인 현 디자인 토큰을 깸.
- (탈락) 자금 흐름 사이 삽입 — 분석 컨텍스트를 끊음.
- (탈락) 페이지 하단 — 발견성 낮음.

---

## 4. 글로벌 네비 — `/news` 진입점

### 4.1 결정: **헤더 아이콘 + Footer 링크 동시 배치**

| 위치 | 이유 |
|------|------|
| 헤더 도구 그룹 (lucide `Newspaper`) | 발견성·즉시 접근, 모든 페이지에서 동일 위치 |
| Footer 링크 (텍스트 "뉴스") | SEO/크롤러용, 풋터 사이트맵 일관성 |
| 메인 카드 "전체 보기 →" | 콘텐츠 컨텍스트에서의 자연스러운 진입 |

별도 nav bar는 도입하지 않음 — sector-king은 헤더+페이지 단일 구조이며 nav bar 추가 시 sticky 영역이 두 줄이 되어 모바일 가시 영역을 침해함.

---

## 5. 관리자 라우트 구조 + 보호 패턴

### 5.1 라우트 트리
```
/admin                    — 대시보드: KPI(뉴스 N개, 마지막 업데이트, 발행 예정 N개)
/admin/news               — 목록 (테이블: 제목/상태/발행일/작성자/액션)
/admin/news/new           — 작성 (제목/요약/본문/발행일/태그/상태[draft|published])
/admin/news/[id]/edit     — 수정 (UUID)
/admin/news/[id]          — (선택) 미리보기 — 또는 edit 페이지에 preview 토글로 흡수
```

URL은 ID(UUID) 기반. slug는 절대 라우팅 파라미터로 쓰지 않음 (`rules/coding-style.md` URL 설계 원칙 준수).

### 5.2 보호 계층 (3중)
1. **middleware.ts**: `/admin/**` 진입 시 세션 검증 → 비로그인이면 `/login?redirect=/admin/...`로 redirect.
2. **layout.tsx (`app/admin/layout.tsx`)**: 서버에서 `profiles.role` 조회 → admin 아니면 `notFound()` 또는 403 페이지.
3. **API 라우트 (`/api/admin/**`)**: 모든 mutation에서 role 재검증 (서버 신뢰 경계).

### 5.3 비권한 사용자 진입 시 동작
| 상태 | 동작 | 사유 |
|------|------|------|
| 비로그인 | `/login?redirect=...`로 302 | 일반적 SaaS 패턴, 로그인 후 자연스럽게 복귀 |
| 로그인 + role=user | **403 페이지** (별도 라우트, "권한이 없습니다 + 메인으로") | 존재 자체를 노출해도 무방 (보안상 민감 정보 아님). 404 위장보다 명료성 우선. |
| 로그인 + role=admin | 정상 진입 | — |

---

## 6. 로그인 진입 — 라우트 vs 모달

### 6.1 결정: **`/login` 전용 라우트 + 헤더 버튼은 직접 이동**

권장 사유:
- `redirect` 쿼리 처리가 단순 (`/login?redirect=/admin`).
- Supabase Auth OAuth 콜백은 라우트 기반이 표준 (`/auth/callback`).
- 모바일에서 모달은 키보드와 충돌, 접근성 처리 비용 큼.
- SEO/공유 가능 (관리자 안내 등).

추가:
- `/signup`은 **도입하지 않음** — 관리자가 Supabase에서 직접 추가, 일반 사용자는 OAuth(구글) 자동 가입 1경로만.
- `/login`은 매우 가벼운 카드 (이메일+OAuth 버튼 2개), 헤더/풋터 공유.
- 로그인 후: `redirect` 파라미터 있으면 그곳, 없으면 `/`.

---

## 7. 빈 상태 / 미발행 처리

| 상황 | 처리 |
|------|------|
| 메인 "오늘의 마켓 리포트" — 발행된 뉴스 0건 | **카드 자체 미노출** (DOM에서 제외) |
| 메인 카드 — published 있으나 오늘 자 없음 | 가장 최근 1건 노출 + "최근 리포트" 라벨 |
| `/news` 목록 페이지 — 0건 | 빈 상태 일러스트 + "곧 첫 리포트가 발행됩니다" |
| `/admin` 대시보드 — 뉴스 0건 | "첫 리포트 작성하기" CTA 버튼 (→ `/admin/news/new`) |

placeholder를 메인에 노출하지 않는 이유: 일반 사용자에게 "준비 중" 상태는 신뢰도를 떨어뜨림. 데이터가 있을 때만 등장.

---

## 8. 모바일 + 접근성

### 8.1 모바일
- 헤더 햄버거(`Menu` lucide) 시트:
  - Radix `Sheet` 또는 기존 `accessibility/` 패턴 재사용.
  - 슬라이드 인: 우측 → 좌측, `vh-100`, `z-60`.
  - 항목: Region 토글 / News / Share / Search / Help / Theme / 사용자 메뉴.
- 로그인 시 시트 상단에 사용자 카드(아바타+이메일).
- 관리자 페이지는 모바일 가능하지만 우선순위 낮음 — 테이블은 카드 리스트로 자동 변환 (반응형 표준 패턴 활용).

### 8.2 a11y 체크리스트
- [ ] 드롭다운 트리거 `aria-haspopup="menu"`, `aria-expanded`
- [ ] 드롭다운 항목 `role="menuitem"`, 화살표 키 탐색 (Radix 기본)
- [ ] 모바일 시트 포커스 트랩 (Radix `Dialog` 기반)
- [ ] 시트 닫기 시 트리거로 포커스 복귀
- [ ] 로그인 버튼 `aria-label="로그인"` (아이콘 단독일 경우)
- [ ] News 아이콘 `aria-label="뉴스"`
- [ ] 403 페이지 `role="alert"` + 메인으로 이동 링크 1순위 포커스
- [ ] 관리자 테이블 `<caption>` + `scope` 속성
- [ ] 폼: `<label for>`, 에러 메시지 `aria-describedby`, `aria-invalid`
- [ ] 키보드 단축키: `Esc` 모달/시트 닫기, `Tab` 순서 자연스러움

---

## 9. 협업 의존 사항

| 영역 | 담당 | 필요 항목 |
|------|------|----------|
| 인증 클라이언트 / 세션 훅 | sk-supabase-architect | `useSession()`, `useProfile()`, role 판별 |
| middleware 및 layout 가드 | sk-supabase-architect / sk-implementer | `/admin/**` 보호 |
| 뉴스 카드 디자인 | sk-news-architect | 카드 컴포넌트 props (title, summary, publishedAt, href) |
| DropdownMenu / Sheet 토큰 | sk-design-system | 색·간격·shadow |
| API 계약 | sk-filter-architect 류 | `/api/news` 목록·상세, `/api/admin/news` mutation |

## 10. 후속 단계 권장 순서
1. middleware + `/login` + 헤더 사용자 메뉴 (인증 골격)
2. `/admin` 대시보드 + 보호 (관리자 진입)
3. `/admin/news` CRUD (콘텐츠 입력)
4. 메인 "오늘의 마켓 리포트" 카드 + `/news` 페이지 (노출)
5. 모바일 시트 + a11y 마감
