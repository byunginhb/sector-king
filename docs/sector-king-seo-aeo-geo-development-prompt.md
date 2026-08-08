# 섹터킹 SEO·AEO·GEO 개선 개발 프롬프트

아래 내용을 개발 에이전트에게 그대로 전달한다. 이 프롬프트의 목표는 보고서 작성이 아니라 **실제 코드 수정, 테스트, 배포 전 검증 자료 작성**이다.

---

## 개발 에이전트에게 전달할 프롬프트

당신은 Next.js 기반 금융 데이터 서비스의 테크니컬 SEO, 정보 구조, 서버 렌더링, 구조화 데이터, AEO/GEO를 담당하는 시니어 엔지니어다.

대상 서비스는 **Sector King(섹터킹)**이며 운영 도메인은 `https://sector-king.com`이다. 저장소를 먼저 조사한 뒤 아래 작업을 실제로 구현하고 검증하라. 분석이나 계획만 제출하고 멈추지 말고, 안전하게 구현할 수 있는 범위는 코드 변경과 테스트까지 완료하라.

### 1. 최종 목표

다음과 같은 비브랜드 질문에서 섹터킹의 관련 페이지가 검색되고, 답변 엔진과 생성형 검색이 섹터킹을 신뢰할 수 있는 후보 또는 출처로 이해할 가능성을 높인다.

- 주식 종목을 섹터별로 정리해서 볼 수 있는 서비스 있어?
- 시장의 돈의 흐름을 쉽게 볼 수 있는 사이트는?
- 한국 주식 섹터별 정리 사이트 추천
- 국내 주식 섹터 맵 또는 섹터 히트맵
- 주식 섹터 로테이션을 확인하는 방법
- 반도체·방산·AI·원전 섹터의 대표 종목은?
- 외국인·기관 순매수와 섹터 시가총액 변화의 차이는?
- 섹터킹은 어떤 서비스이며 데이터는 믿을 만한가?
- 섹터킹과 TradingView·FINVIZ 등은 용도가 어떻게 다른가?

목표를 “특정 AI 답변에 무조건 노출”로 정의하지 마라. 검색·추천·인용은 외부 시스템의 결정이므로 보장할 수 없다. 대신 아래의 측정 가능한 결과를 만든다.

- 핵심 페이지가 크롤링·렌더링·색인 가능한 상태
- 비브랜드 검색 의도마다 실제 답을 제공하는 고유 URL
- 초기 HTML만 읽어도 서비스·데이터·기준일·한계를 이해할 수 있는 페이지
- 정확한 canonical, sitemap, 내부 링크, structured data
- 검색용 AI bot의 정상 접근과 학습용 bot 정책의 분리
- 출처·방법론·작성자·수정 이력이 확인되는 금융 콘텐츠
- Google, Bing, Naver 및 AI referral/citation을 추적하는 측정 체계

### 2. 중요한 원칙

Google의 공식 입장상 AEO/GEO는 SEO를 대체하는 별도 기술 체계가 아니다. AI 검색에도 기존 검색 기본기, 색인 가능성, 유용하고 독창적인 콘텐츠, 텍스트로 제공되는 핵심 정보, 화면과 일치하는 structured data가 우선이다. `llms.txt`, AI 전용 schema, 인위적인 문단 분할은 핵심 요구사항이 아니다.

이 프로젝트에서는 다음처럼 용어를 사용한다.

- **SEO:** 크롤링, 렌더링, 색인, 검색 의도 충족, 내부·외부 발견성
- **AEO:** 질문에 대한 직접 답, 명확한 정의, 표·요약·근거처럼 답을 추출하기 쉬운 구성
- **GEO:** 생성형 검색이 사실을 검증하고 인용하기 쉬운 출처·방법론·고유 데이터·브랜드 신호와 측정

세 분야를 하나의 개선 프로그램으로 구현하되, 우선순위는 `기술적 발견 가능성 → 유용한 페이지 → 신뢰와 출처 → 배포와 측정` 순서다.

다음을 하지 마라.

- 키워드 또는 브랜드명 반복, 숨은 텍스트, bot에게만 다른 콘텐츠를 주는 cloaking
- 질문 변형별로 내용이 거의 같은 AI 문서를 대량 생성
- 허위 저자, 검수자, 후기, 평점, 출처, 수정일
- 돈을 주고 무관한 backlink나 mention을 대량 구매
- FAQ schema나 `llms.txt` 하나로 AI 인용을 보장한다고 주장
- 허가하지 않은 데이터의 재배포 또는 라이선스가 불명확한 다운로드/API 제공
- 사용자 경험과 성능을 훼손하는 SEO용 텍스트 덩어리

### 3. 작업 시작 절차

1. 저장소의 `AGENTS.md`, README, package scripts, 라우팅, 데이터 패칭, 인증, 배포 방식을 확인한다.
2. 현재 변경사항을 보존하고 관련 없는 코드는 수정하지 않는다.
3. 운영 사이트와 로컬 구현을 비교해 아래 사전 감사 결과를 재현한다. 운영 상태가 바뀌었으면 실제 결과를 기준으로 조정하고 차이를 보고한다.
4. 변경 전 대표 URL의 HTTP status, initial HTML, canonical, title, description, H1, robots meta, JSON-LD, 내부 링크, sitemap 포함 여부를 snapshot으로 남긴다.
5. P0부터 순서대로 구현하고 자동 테스트를 추가한다.
6. 구현 후 동일한 방법으로 변경 전후 결과를 비교한다.

### 4. 현재 운영 사이트에서 확인된 사전 감사 결과

반드시 직접 재검증하되, 다음 항목을 출발점으로 사용한다.

#### 이미 갖춘 기반

- Next.js/Vercel 기반이며 `robots.txt`와 sitemap이 존재한다.
- sitemap에는 다수의 종목 URL과 9개 산업 및 하위 페이지가 있다.
- 홈에는 `WebSite`와 `Organization`, 뉴스 상세에는 `NewsArticle`과 `BreadcrumbList`, 일부 순위 페이지에는 `ItemList` JSON-LD가 있다.
- `/guide`, `/methodology`, `/about`, 뉴스 상세 페이지는 의미 있는 서버 HTML을 제공한다.
- 뉴스 목록에서 상세 기사로 이동하는 crawlable link가 존재한다.
- 테스트 당시 Googlebot, OAI-SearchBot, GPTBot, PerplexityBot user-agent에 운영 서버가 200을 응답했다.

#### P0로 고쳐야 하는 문제

1. `robots.txt`가 `/_next/static/`과 `/_next/data/`를 막고 있다. 렌더링에 필요한 JavaScript/CSS를 차단하지 마라.
2. `/`, `/tech`, 산업 및 산업 하위 페이지, `/rankings`, `/market-size`의 initial HTML에 핵심 데이터와 설명이 거의 없고 H1도 없다.
3. 종목 상세 initial HTML은 회사명·ticker와 “종목 데이터를 불러오는 중입니다” 정도만 제공하며 핵심 정보는 client API 이후에 나타난다.
4. `/news`, `/about`, `/methodology`, `/contact`, `/terms`, `/privacy`의 canonical이 자기 URL이 아니라 홈페이지를 가리킨다.
5. 종목 상세 title에 `Sector King | Sector King`처럼 브랜드가 중복된다.
6. 일부 metadata가 하루 2회 갱신 서비스에 “실시간”이라는 표현을 사용한다.
7. sitemap의 모든 URL이 같은 배포 시각을 `lastmod`로 사용한다. 실제 콘텐츠 변경 시각만 기록해야 한다.
8. sitemap에 `/about`, `/methodology`, `/contact`와 뉴스 상세 URL들이 빠져 있다.
9. 사이트 문구의 “120+개 기업”과 실제 sitemap의 약 600개 종목 URL처럼 수치가 서로 다른 부분이 있다.
10. 검색 가능한 고유 섹터 상세 URL이 부족하다. 산업 utility URL과 별개로 반도체, AI, 방산, 원전 등 안정적인 `/sectors/{slug}` 정보 구조가 필요하다.

### 5. P0 — 크롤링·SSR·canonical·sitemap

#### 5.1 robots와 검색용 bot 접근

- 공개 페이지와 렌더링 필수 asset을 일반 검색 bot이 가져갈 수 있게 한다.
- `/_next/static/` 전체를 차단하지 않는다. client rendering에 필요한 경로를 확인해 허용한다.
- `/admin/`, `/me/`, 인증 callback, 비공개 사용자 데이터와 같이 검색 가치가 없거나 민감한 경로는 차단하거나 `noindex` 처리한다.
- `/api/`를 차단하더라도 공개 페이지 initial HTML은 API 호출 없이 핵심 답과 데이터 snapshot을 포함해야 한다.
- user-agent 문자열만 신뢰하지 말고 CDN/WAF log와 각 업체의 공식 IP 검증 방식을 사용한다.

검색 목적 bot과 학습 목적 bot을 정책상 분리한다.

| 역할 | 대표 bot | 기본 제안 |
|---|---|---|
| 검색·인용 | `OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`, Googlebot, Bingbot, Naver Yeti | 공개 페이지 허용 및 WAF 정상 응답 확인 |
| 사용자 요청 URL fetch | `ChatGPT-User`, `Claude-User`, `Perplexity-User` | 공개 페이지 허용을 우선 검토 |
| 모델 학습 제어 | `GPTBot`, `ClaudeBot`, `Google-Extended` | 서비스 운영자의 별도 정책·법무 판단을 설정값으로 반영 |

학습 bot을 차단해도 검색 bot까지 묶어서 차단하지 않게 group을 구성한다. 업체별 최신 공식 문서에서 정확한 user-agent와 IP 범위를 다시 확인한다.

#### 5.2 핵심 페이지의 서버 렌더링

다음 페이지 유형을 SSR, SSG 또는 ISR로 바꿔 **초기 HTTP 응답 HTML에** 핵심 콘텐츠가 포함되게 한다.

- 홈
- 한국·미국 등 시장 landing
- 산업 및 섹터 상세
- 자금 흐름, 가격 변화, 통계, 순위, 시가총액 페이지
- 종목 상세
- 가이드, 방법론, 데이터 출처, 회사 소개

각 핵심 initial HTML에는 최소한 다음이 있어야 한다.

- 고유하고 설명적인 H1 하나
- 질문에 바로 답하는 2~4문장 요약
- 데이터 기준 시각과 갱신 주기
- 지표 정의와 오해 가능성이 큰 한계
- 핵심 표 또는 상위 항목의 의미 있는 HTML snapshot
- 데이터 출처
- 상위·하위·관련 페이지로 가는 실제 `<a href>` 링크
- JavaScript가 꺼져도 이해 가능한 기본 정보

인터랙티브 차트와 정렬·필터링은 hydration 이후에 제공해도 되지만, 빈 shell 또는 “불러오는 중”만 initial HTML로 보내지 마라. 차트의 핵심 값은 접근 가능한 HTML table이나 요약으로도 제공한다.

#### 5.3 metadata와 canonical

- 모든 indexable 고유 페이지에 self-referential canonical을 넣는다.
- `/news`, `/about`, `/methodology`, `/contact`, `/terms`, `/privacy`의 홈페이지 canonical 문제를 수정한다.
- sitemap에 선언한 canonical과 HTML canonical이 충돌하지 않게 한다.
- 페이지마다 고유한 title, meta description, H1을 제공한다.
- framework의 title template과 개별 title을 함께 적용할 때 브랜드가 중복되지 않게 한다.
- “실시간” 대신 실제 운영 주기인 평일 하루 2회와 데이터 기준 시각을 정확히 표현한다. 운영 주기가 설정값이나 데이터에 따라 바뀐다면 metadata도 같은 단일 원천을 사용한다.
- redirect, trailing slash, protocol, `www` 정책을 하나로 통일한다.
- 존재하지 않는 페이지는 soft 404가 아니라 실제 404를 반환한다.

#### 5.4 sitemap

- 규모에 맞으면 sitemap index를 만들고 `static`, `markets-industries-sectors`, `stocks`, `news-guides` 등으로 분리한다.
- 200 응답, canonical, indexable URL만 넣는다.
- `/about`, `/methodology`, `/contact` 등 공개 신뢰 페이지와 모든 공개 뉴스 상세 URL을 포함한다.
- `lastmod`는 실제 본문·데이터가 의미 있게 변경된 시각만 사용한다. 모든 URL에 build/deploy 시각을 일괄 입력하지 않는다.
- 삭제·병합된 URL은 sitemap에서 제거하고 적절한 301 또는 404/410을 적용한다.
- 일반 sitemap에 모든 뉴스 상세를 넣고, 필요하다면 최근 48시간 기사용 Google News sitemap을 별도로 제공한다.
- URL 수, 기업 수, 산업 수 등 공개 수치를 실제 데이터에서 생성해 사이트 전체에서 일치시킨다.

#### 5.5 내부 링크와 정보 구조

다음 경로가 crawlable anchor로 연결되게 한다.

`홈 → 시장 → 산업 → 섹터 → 종목`

그리고 각 페이지에서 방법론, 지표 정의, 데이터 출처, 관련 가이드로 연결한다. click handler만 있고 `href`가 없는 카드나 client-side 필터에만 의존하지 마라.

반도체, AI, 방산, 원전 등 실제 분류 데이터가 있는 섹터에는 안정적인 `/sectors/{slug}` canonical URL을 만든다. 같은 데이터 조합의 filter URL을 무한히 색인시키지 말고, 가치 있는 조합만 고유 landing으로 만든다.

### 6. P1 — 검색 의도 콘텐츠와 금융 서비스 신뢰

#### 6.1 핵심 landing·guide

데이터와 운영 사실을 먼저 확인한 후 다음 콘텐츠를 작성하거나 기존 페이지를 확장한다. URL은 현재 라우팅에 맞게 조정할 수 있으나 의도별 canonical URL은 하나여야 한다.

1. `주식 종목을 섹터별로 볼 수 있는 서비스` 가이드
   - 섹터킹, TradingView, FINVIZ, KRX, 네이버증권 등을 동일한 검증 기준으로 비교
   - 시장 범위, 분류 방식, 갱신 주기, 시각화, 순매수 제공 여부, 주요 용도를 사실대로 표시
   - 타 서비스를 깎아내리거나 검증하지 못한 우위를 주장하지 않음
   - 비교 기준일과 공식 출처 링크 명시
2. `시장의 돈 흐름을 읽는 방법`
3. `시가총액 변화와 실제 순매수의 차이`
4. `섹터 로테이션을 보는 방법`
5. `섹터킹이란 무엇인가` 또는 강화된 `/about`
6. `/data-sources`, `/editorial-policy`, `/corrections`, `/disclaimer`
7. 핵심 용어 glossary: 섹터, 산업, 시가총액 변화, 거래대금, 순매수, MFI 등
8. 실제 데이터가 존재하는 주요 `/sectors/{slug}` 페이지 10~20개부터 시작

처음부터 수백 개의 얇은 페이지를 만들지 말고, 핵심 질문 10~20개를 완전히 해결한 뒤 Search Console과 citation 데이터를 보고 확장한다.

#### 6.2 페이지 공통 구성

산업·섹터·종목·순위·가이드 페이지에는 내용에 맞게 다음 요소를 사용한다.

1. 고유 H1
2. 질문에 대한 2~4문장 직접 답변
3. 데이터 기준일·기준 시각·갱신 주기
4. 핵심 표와 상위 기여 종목
5. 사용자가 이 수치를 어떻게 해석할지
6. 이 수치가 **의미하지 않는 것**
7. 산식·분류·방법론 링크
8. 데이터 출처와 필요한 라이선스 표기
9. 작성자, 데이터 검수자 또는 편집 검수자와 최근 수정일
10. 관련 산업·섹터·종목·가이드 내부 링크

문장은 답변 엔진을 위한 인위적 chunk가 아니라 사람이 빠르게 이해할 수 있는 명확한 단락, heading, 표로 구성한다. 통계와 주장은 가능하면 1차 출처에 가까운 링크로 뒷받침한다.

#### 6.3 “자금 흐름”의 정확성

현재 섹터킹의 “자금 흐름”은 선택 기간의 **섹터 시가총액 변화 기반 지표이며 실제 외국인·기관 순매수 자체가 아니다.** 또한 서비스의 MFI가 통상적인 Wilder MFI와 다르다면 그 차이를 명확히 밝힌다.

이 설명을 가이드에만 숨겨두지 말고 홈, 자금 흐름, 산업·섹터, 관련 title/description, 차트 도움말에 일관되게 노출한다. UI 명칭은 다음처럼 오해 가능성을 줄이는 방향을 검토한다.

- `시가총액 변화(자금 흐름 프록시)`
- `섹터 시가총액 변화 기반 흐름`

제품 문구 변경은 기존 사용자의 이해와 화면 공간을 고려해 운영자와 합의하되, 검색 snippet이나 AI 답변이 “실제 매수 자금”으로 오해하도록 두지 마라.

#### 6.4 작성자·출처·편집 투명성

- `/about`에 실제 운영 주체, 서비스 목적, 연락 방법을 명확히 제공한다.
- 뉴스·분석에는 실제 작성자 또는 책임 편집팀을 표시하고, 작성자/팀 profile에 전문 영역과 역할을 설명한다.
- 데이터 자동 생성, AI 보조, 사람 검수 여부를 사실대로 설명한다.
- editorial policy, corrections policy, 이해상충, 투자 권유가 아니라는 고지를 공개한다.
- 뉴스와 분석의 수치·사실에는 가능한 범위에서 본문 인접 위치 또는 명확한 Sources 영역에 1차 출처를 연결한다.
- 잘못된 수치를 수정하면 수정 시각과 핵심 변경 내용을 기록한다.

#### 6.5 고유한 인용 자산

검색엔진이 다른 사이트 대신 섹터킹을 인용할 이유를 만든다.

- 고유 분류 체계와 방법론 설명
- 기준 시각이 명확한 섹터별 표와 변화 요인
- “상승/하락을 만든 상위 기여 종목” 분석
- 주간 섹터 리포트와 변경 이력
- 출처·산식·한계가 포함된 공유 가능한 차트와 표
- 라이선스가 허용할 경우에만 CSV, API, embed 기능

복사한 시장 뉴스나 일반적인 사전식 설명보다 섹터킹만 계산·정리할 수 있는 데이터와 해설을 우선한다.

### 7. structured data 설계

JSON-LD는 화면에 보이는 정보와 정확히 일치해야 하며, markup 자체가 노출을 보장하지 않는다. 실제 페이지 종류에 맞는 최소 schema만 사용한다.

| 페이지 | 권장 schema |
|---|---|
| 홈 | `WebSite`, `Organization` |
| 회사 소개 | `AboutPage`, 필요 시 동일 `Organization` entity 참조 |
| 산업·섹터 목록/상세 | `CollectionPage`, visible 목록의 `ItemList`, `BreadcrumbList` |
| 종목 상세 | `WebPage`의 `mainEntity`로 실제 `Corporation` 또는 적합한 조직 유형, `tickerSymbol`, `BreadcrumbList` |
| 순위 | 화면에 실제 표시된 항목의 `ItemList` |
| 가이드 | `Article` 또는 실제 형식에 맞는 article subtype, `BreadcrumbList` |
| 뉴스 | `NewsArticle`, `BreadcrumbList`, 실제 author/publisher/date |
| 데이터셋 페이지 | 실제 dataset 설명, coverage, 변수, 갱신 주기, 출처, license, 배포/다운로드가 있을 때만 `Dataset` |

- 조직명, 로고, canonical domain, 실제로 운영하는 `sameAs` profile을 일관되게 사용한다.
- 존재하지 않는 review/rating를 만들지 않는다.
- FAQ 본문은 사용자에게 유용하면 유지할 수 있지만, FAQ rich result를 핵심 성과로 삼지 않는다.
- schema validator와 Google Rich Results Test에서 오류를 확인하고 결과를 남긴다.

### 8. P2 — AEO/GEO 배포와 측정

#### 8.1 검색엔진 등록과 신선도

- Google Search Console, Bing Webmaster Tools, Naver Search Advisor 등록·소유권 확인·sitemap 제출 절차를 문서화한다.
- 계정 로그인이나 소유권 확인처럼 운영자 작업이 필요한 항목은 정확한 수동 단계와 확인 화면을 TODO로 남긴다.
- IndexNow를 구현해 생성·중요 업데이트·삭제된 URL만 batch로 전송한다. 매 build마다 변경되지 않은 모든 URL을 재전송하지 않는다.
- IndexNow key와 endpoint를 환경 설정으로 관리하고 응답 log, retry, rate limit을 처리한다.
- 뉴스가 지속적으로 발행되면 RSS 또는 Atom feed를 제공한다.

#### 8.2 `llms.txt`

P0/P1 완료 전에는 만들지 않는다. 낮은 비용의 실험으로 도입할 수 있으나 Google 검색이나 AI 노출에 효과가 입증된 요구사항이라고 표현하지 않는다.

도입한다면 서비스 요약, canonical 핵심 페이지, 지표 정의, 데이터 기준과 갱신 주기, 인용 시 주의사항 정도만 간결하게 담고 SSR·sitemap·robots를 대체하지 않게 한다. 자동 생성 시 실제 URL·주기와 어긋나지 않는 테스트를 추가한다.

#### 8.3 crawler와 referral 측정

- CDN/server log에서 bot별 `2xx`, `3xx`, `403`, `429`, `5xx`, 요청 URL, sitemap fetch를 집계한다.
- UA와 공식 IP 정보를 함께 검증하고 bot impersonation을 구분한다.
- GA4 또는 현재 분석 도구에서 `utm_source=chatgpt.com`, 확인 가능한 Perplexity·Copilot·Claude referral, landing page, 가입·재방문·watchlist·전환을 추적한다.
- Bing Webmaster Tools의 AI Performance가 제공되면 total citations, cited pages, grounding queries, citation share 추이를 기록한다.
- Google의 생성형 AI performance report가 계정에 제공되면 page/country/date/device 기준으로 기록하되, 제공되지 않는 경우 임의 수치로 대체하지 않는다.

#### 8.4 고정 질문 benchmark

핵심 한국어 질문 20~30개와 필요한 영어 질문을 version-controlled fixture로 만든다. 월 1~2회 같은 지역·언어·로그인 조건에서 다음을 수동 또는 약관상 허용된 API로 기록한다.

- 서비스 언급 여부
- 출처 인용 여부와 인용 URL
- 섹터킹에 대한 설명의 정확성
- 경쟁 서비스와 함께 언급되는 맥락
- referral과 제품 전환

개인화, query rewriting, 모델 변경 때문에 단일 시점의 “순위”를 절대값으로 보지 말고 추세를 본다. 각 서비스 약관을 위반하는 자동 scraping은 구현하지 않는다.

### 9. 자연스러운 외부 발견성

사이트 내부 수정만으로 범주 추천이 보장되지는 않는다. 구현과 별도로 운영팀이 실행할 수 있는 배포 checklist를 만든다.

- 고유 데이터가 있는 주간 섹터 리포트 발행
- 차트와 표를 canonical 출처 링크와 함께 공유할 수 있는 기능
- 서비스 출시·대규모 업데이트를 실제 사용자 커뮤니티와 미디어에 알림
- 금융·데이터 관련 커뮤니티에서 질문에 도움이 되는 자료를 제공하고 출처를 투명하게 표시
- 실제 고객 사례, 전문가 인터뷰, 데이터 방법론 검토 등 독립적인 신뢰 신호 확보
- 공식 프로필에서 `Sector King`, `섹터킹`, `sector-king.com`, 로고, 서비스 설명을 일관되게 사용

가짜 계정, 광고성 도배, 유료 링크 농장, 검증되지 않은 추천 문구는 사용하지 않는다.

### 10. 자동 테스트와 인수 기준

대표 URL fixture를 만들고 가능한 항목을 CI에서 자동 검증한다.

#### 크롤링·HTML

- `Googlebot`, `OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot` UA로 공개 대표 URL 요청 시 정상적인 200 응답
- 각 응답 HTML에 고유 H1, 직접 답변, 데이터 기준 시각, 출처, 핵심 표/항목, crawlable link가 존재
- 핵심 페이지 initial HTML에 “불러오는 중”만 존재하지 않음
- 렌더링 필수 JS/CSS asset이 robots나 WAF에 막히지 않음
- 비공개·인증 URL은 의도한 차단 또는 noindex 정책을 따름

#### metadata·URL

- 모든 indexable 대표 페이지의 self canonical
- homepage canonical을 가리키는 고유 콘텐츠 페이지가 없음
- title, description, H1의 템플릿 중복이 없음
- 종목 title에 브랜드가 두 번 붙지 않음
- redirect chain, soft 404, 잘못된 200이 없음

#### sitemap

- sitemap의 모든 URL이 200, canonical, indexable
- 모든 공개 뉴스 상세와 핵심 신뢰 페이지가 sitemap에 포함
- `lastmod`가 실제 데이터/콘텐츠 변경에만 바뀜
- canonical URL이 아닌 redirect/noindex/404 URL이 없음

#### structured data

- JSON 파싱 및 schema 형태 자동 테스트 통과
- 화면에 없는 item, author, rating, update date가 JSON-LD에 없음
- canonical과 JSON-LD URL이 일치
- 대표 페이지가 validator에서 critical error 없이 통과

#### 품질·성능

- 기존 제품 기능, 인증, 데이터 갱신, 차트 interaction 회귀 테스트 통과
- 모바일 접근성과 표의 keyboard/screen-reader 사용성 확인
- 중요한 성능 회귀가 없음
- 가능하면 대표 페이지 Lighthouse SEO 95 이상
- 가능한 범위에서 LCP 2.5초 이하, CLS 0.1 이하, INP 200ms 이하를 목표로 측정하되 측정 환경과 결과를 함께 기록

### 11. 완료 시 제출할 산출물

최종 답변에 다음을 포함한다.

1. 발견한 문제와 원인 요약
2. 변경 파일 목록과 각 변경의 목적
3. 변경 전후 대표 URL audit 표
4. 실제 실행한 build, lint, unit/integration/E2E 명령과 결과
5. robots, sitemap index/하위 sitemap, canonical, JSON-LD의 대표 snapshot
6. 대표 URL 10개의 initial HTML 검증 결과
7. bot별 200/403/429 점검 결과와 공식 IP 검증 방법
8. Search Console, Bing Webmaster Tools, Naver Search Advisor에서 운영자가 수행할 수동 단계
9. IndexNow 요청 예시와 응답/재시도 정책
10. 아직 남은 위험, 데이터 라이선스 확인 항목, 운영자 결정이 필요한 사항
11. 배포 후 2주·4주·8주 측정 계획

실제 실행하지 않은 테스트나 외부 도구 등록을 완료했다고 쓰지 마라. 로그인·배포 권한 때문에 실행할 수 없는 항목은 명확히 분리하라.

### 12. 구현 우선순위와 90일 운영안

#### 즉시/P0

- `/_next/static/` robots 차단 제거
- 홈·시장·산업·섹터·종목 핵심 initial HTML SSR/SSG/ISR
- H1, 직접 답변, 기준 시각, 출처, 한계, crawlable links
- 잘못된 homepage canonical과 title 중복 수정
- 정확한 sitemap URL 및 `lastmod`, 누락된 뉴스·신뢰 페이지 추가
- “실시간”, 기업 수, 갱신 주기 등 사실 불일치 수정

#### 0~30일

- crawler/WAF/status/canonical/sitemap 전수 점검
- Search Console, Bing, Naver 등록 및 sitemap 제출
- OAI/Claude/Perplexity 검색 bot 접근 확인
- IndexNow hook
- About, Methodology, Data Sources, Disclaimer, Corrections 완성

#### 31~60일

- 시장·산업·섹터 template 서버 렌더링 완성
- 핵심 섹터 상세 10~20개
- 비브랜드 질문 guide 10~20개
- 출처·작성자·검수·방법론 체계
- 구조화 데이터 검증

#### 61~90일

- 주간 고유 데이터 리포트와 공유 가능한 표/차트
- AI citation/referral 및 crawler dashboard
- 고정 질문 benchmark
- 성과가 확인된 query/page를 깊게 보강
- 효과 없는 얇은 페이지의 통합·정리

---

## 개발 판단의 기준이 되는 공식 자료

- [Google: Generative AI 검색 최적화 가이드](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Google: JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google: People-first content, Who·How·Why와 YMYL](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google: Sitemap 작성](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google: Structured data 기본 원칙](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
- [OpenAI: 검색·학습 bot 안내](https://developers.openai.com/api/docs/bots)
- [OpenAI: Publisher and developer FAQ](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq)
- [Anthropic: Claude bot 안내](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)
- [Perplexity: 공식 crawler 안내](https://docs.perplexity.ai/docs/resources/perplexity-crawlers)
- [Bing: AI Performance](https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c)
- [IndexNow 공식 문서](https://www.indexnow.org/documentation)
- [Naver Search Advisor: robots.txt와 검색로봇](https://searchadvisor.naver.com/guide/seo-basic-robots)
- [Naver Search Advisor: IndexNow](https://searchadvisor.naver.com/guide/request-feed)
- [Schema.org](https://schema.org/)
- [GEO 원 논문](https://arxiv.org/abs/2311.09735) — 실험 연구이며 실제 엔진 노출 보장 근거로 사용하지 말 것

