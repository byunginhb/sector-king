# 📊 TechThrone (투자 패권 지도)
## Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** 2026-01-23  
**Author:** Ben (with Claude)  
**Status:** Draft  

---

## 1. Executive Summary

### 1.1 프로젝트 개요
**TechThrone**은 미키피디아의 "투자 패권 지도" 컨셉을 기반으로, **실제 금융 데이터를 활용한 인터랙티브 웹 시각화 서비스**를 구축한다. 테크 산업의 각 섹터별 시장 지배력 순위를 한눈에 파악할 수 있는 대시보드를 제공하며, 하루 1회 자동 업데이트되는 실시간성 있는 데이터를 기반으로 한다.

### 1.2 핵심 가치 제안
- **한눈에 파악**: 복잡한 테크 산업 구조를 직관적인 지도 형태로 시각화
- **실제 데이터**: 시가총액, 매출, 시장점유율 등 실제 금융 데이터 기반
- **최신성 유지**: 하루 1회 자동 업데이트로 항상 최신 정보 제공
- **인터랙티브**: 클릭 시 상세 정보(주가 차트, 재무 지표) 확인 가능

### 1.3 목표 사용자
- 테크 산업에 관심있는 개인 투자자
- 산업 동향을 파악하고자 하는 애널리스트
- 테크 기업 생태계를 이해하고자 하는 일반 사용자

---

## 2. 시스템 아키텍처

### 2.1 전체 구조
```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Hegemony Map│  │ Detail Modal│  │  Sector Navigation     │  │
│  │  (Grid View)│  │ (Chart/Info)│  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend API (Next.js API Routes)            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ /api/map    │  │/api/company │  │ /api/update (cron)      │  │
│  │ GET map data│  │GET details  │  │ Daily data refresh      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Database (SQLite - Local File)              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  sectors    │  │  companies  │  │    daily_snapshots      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                                                                  │
│  📁 /data/hegemony.db (Git에 포함하여 배포)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              External Data Sources (Daily Batch)                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  yfinance   │  │     FMP     │  │   Alpha Vantage (opt)   │  │
│  │  (Primary)  │  │ (Secondary) │  │     (Backup)            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 데이터 흐름
1. **Daily GitHub Actions (KST 09:00)**: 미국 장 마감 후 데이터 수집 Cron 실행
2. **Data Collection**: Python 스크립트가 yfinance로 시가총액, 주가, 재무 데이터 수집
3. **SQLite Update**: 로컬 `data/hegemony.db` 파일 업데이트
4. **Git Commit & Push**: 변경된 DB 파일을 자동으로 커밋/푸시
5. **Vercel Auto-Deploy**: Git 푸시 감지하여 자동 재배포 (최신 DB 포함)
6. **API Serve**: 프론트엔드 요청 시 SQLite에서 직접 읽기
7. **Client Render**: 인터랙티브 지도 렌더링

> **장점**: 외부 DB 서비스 의존성 없음, 비용 $0, 단순한 아키텍처
> **단점**: 실시간 업데이트 불가 (하루 1회), DB 파일 크기 제한 (Git LFS 필요할 수 있음)

---

## 3. 데이터 모델

### 3.1 Sector/Category 구조 (큐레이션 기반)

```typescript
// 카테고리 → 섹터 → 기업 계층 구조
interface Category {
  id: string;           // 'computing', 'internet', 'mobile', 'media', 'ai', 'future_tech'
  name: string;         // '컴퓨터', '인터넷', '모바일', '미디어', 'AI', '미래기술'
  nameEn: string;       // 'Computing', 'Internet', 'Mobile', 'Media', 'AI', 'Future Tech'
  order: number;        // 표시 순서
}

interface Sector {
  id: string;           // 'cpu', 'gpu', 'search', 'social_media' 등
  categoryId: string;   // FK to Category
  name: string;         // 'CPU', 'GPU', '검색', '소셜미디어'
  nameEn: string;       // 영문명
  order: number;        // 카테고리 내 순서
  description?: string; // 섹터 설명
}

interface Company {
  ticker: string;       // 'AAPL', 'NVDA', 'GOOGL'
  name: string;         // 'Apple Inc.'
  nameKo?: string;      // '애플' (한글명)
  logoUrl?: string;     // 로고 이미지 URL
}

interface SectorCompany {
  sectorId: string;     // FK to Sector
  ticker: string;       // FK to Company
  rank: number;         // 1, 2, 3 (순위)
  notes?: string;       // 특이사항 ('ARM 기반 포함' 등)
}
```

### 3.2 실시간 데이터 스키마

```typescript
interface DailySnapshot {
  id: number;
  ticker: string;
  date: Date;           // 스냅샷 날짜
  
  // 시장 데이터
  marketCap: number;    // 시가총액 (USD)
  price: number;        // 현재가
  priceChange: number;  // 전일 대비 변동률 (%)
  
  // 52주 데이터
  week52High: number;
  week52Low: number;
  
  // 거래량
  volume: number;
  avgVolume: number;
  
  // 밸류에이션
  peRatio?: number;     // P/E
  pegRatio?: number;    // PEG
  
  // 메타
  updatedAt: Date;
}

interface CompanyProfile {
  ticker: string;
  
  // 기본 정보
  sector: string;       // Yahoo Finance 섹터
  industry: string;     // Yahoo Finance 산업
  country: string;
  employees?: number;
  
  // 재무 (연간)
  revenue?: number;     // 매출
  netIncome?: number;   // 순이익
  
  // 설명
  description?: string;
  website?: string;
  
  updatedAt: Date;
}
```

### 3.3 초기 데이터 (미키김 패권 지도 기반)

```typescript
const HEGEMONY_MAP_DATA = {
  categories: [
    { id: 'computing', name: '컴퓨터', order: 1 },
    { id: 'internet', name: '인터넷', order: 2 },
    { id: 'mobile', name: '모바일', order: 3 },
    { id: 'media', name: '미디어', order: 4 },
    { id: 'ai', name: 'AI', order: 5 },
    { id: 'future_tech', name: '미래기술', order: 6 },
  ],
  
  sectors: [
    // 컴퓨터
    { id: 'os', categoryId: 'computing', name: '컴퓨터 O.S.', order: 1 },
    { id: 'cpu', categoryId: 'computing', name: 'CPU', order: 2 },
    { id: 'ddr', categoryId: 'computing', name: 'DDR', order: 3 },
    
    // 인터넷
    { id: 'search', categoryId: 'internet', name: '검색', order: 1 },
    { id: 'online_ads', categoryId: 'internet', name: '온라인 광고 플랫폼', order: 2 },
    { id: 'ecommerce', categoryId: 'internet', name: '온라인 커머스', order: 3 },
    
    // 모바일
    { id: 'mobile_os', categoryId: 'mobile', name: '모바일 O.S. & 마켓', order: 1 },
    { id: 'mobile_device', categoryId: 'mobile', name: '모바일 디바이스', order: 2 },
    { id: 'ap', categoryId: 'mobile', name: 'A.P. (Application Processor)', order: 3 },
    
    // 미디어
    { id: 'social_media', categoryId: 'media', name: '소셜미디어', order: 1 },
    { id: 'online_video', categoryId: 'media', name: '온라인 비디오', order: 2 },
    
    // AI
    { id: 'data_center', categoryId: 'ai', name: '데이터 센터', order: 1 },
    { id: 'ai_model', categoryId: 'ai', name: 'A.I. 모델', order: 2 },
    { id: 'gpu', categoryId: 'ai', name: 'GPU', order: 3 },
    { id: 'asic', categoryId: 'ai', name: 'ASIC', order: 4 },
    { id: 'hbm', categoryId: 'ai', name: 'HBM', order: 5 },
    { id: 'blockchain', categoryId: 'ai', name: '블록체인', order: 6 },
    { id: 'robot', categoryId: 'ai', name: '로봇', order: 7 },
    
    // 미래기술
    { id: 'autonomous', categoryId: 'future_tech', name: '자율주행', order: 1 },
    { id: 'quantum', categoryId: 'future_tech', name: '양자컴퓨터', order: 2 },
    { id: 'space', categoryId: 'future_tech', name: '우주', order: 3 },
  ],
  
  // 섹터별 기업 (rank: 1=1위, 2=2위, 3=3위)
  sectorCompanies: [
    // 컴퓨터 O.S.
    { sectorId: 'os', ticker: 'MSFT', rank: 1 },
    { sectorId: 'os', ticker: 'AAPL', rank: 2 },
    
    // CPU
    { sectorId: 'cpu', ticker: 'INTC', rank: 1 },
    { sectorId: 'cpu', ticker: 'AMD', rank: 2 },
    { sectorId: 'cpu', ticker: 'AAPL', rank: 3, notes: '애플 등 ARM 기반' },
    
    // DDR
    { sectorId: 'ddr', ticker: '005930.KS', rank: 1 },  // 삼성전자
    { sectorId: 'ddr', ticker: '000660.KS', rank: 2 },  // SK하이닉스
    { sectorId: 'ddr', ticker: 'MU', rank: 3 },         // 마이크론
    
    // 검색
    { sectorId: 'search', ticker: 'GOOGL', rank: 1 },
    
    // 온라인 광고
    { sectorId: 'online_ads', ticker: 'GOOGL', rank: 1 },
    { sectorId: 'online_ads', ticker: 'META', rank: 2 },
    { sectorId: 'online_ads', ticker: 'AMZN', rank: 3 },
    
    // 온라인 커머스
    { sectorId: 'ecommerce', ticker: 'AMZN', rank: 1 },
    { sectorId: 'ecommerce', ticker: 'WMT', rank: 2 },
    { sectorId: 'ecommerce', ticker: 'BABA', rank: 3, notes: '알리바바, 테무 등' },
    
    // 모바일 OS
    { sectorId: 'mobile_os', ticker: 'AAPL', rank: 1 },
    { sectorId: 'mobile_os', ticker: 'GOOGL', rank: 2 },
    
    // 모바일 디바이스
    { sectorId: 'mobile_device', ticker: 'AAPL', rank: 1 },
    { sectorId: 'mobile_device', ticker: '005930.KS', rank: 2 },  // 삼성전자
    { sectorId: 'mobile_device', ticker: '1810.HK', rank: 3 },    // 샤오미
    
    // A.P.
    { sectorId: 'ap', ticker: '2454.TW', rank: 1 },     // 미디어텍
    { sectorId: 'ap', ticker: 'QCOM', rank: 2 },
    { sectorId: 'ap', ticker: 'AAPL', rank: 3 },
    
    // 소셜미디어
    { sectorId: 'social_media', ticker: 'META', rank: 1 },
    { sectorId: 'social_media', ticker: 'SNAP', rank: 2, notes: '틱톡 (비상장)' },
    { sectorId: 'social_media', ticker: 'SNAP', rank: 3, notes: '스냅챗, X' },
    
    // 온라인 비디오
    { sectorId: 'online_video', ticker: 'GOOGL', rank: 1 },
    { sectorId: 'online_video', ticker: 'NFLX', rank: 2 },
    { sectorId: 'online_video', ticker: 'DIS', rank: 3 },
    
    // 데이터 센터
    { sectorId: 'data_center', ticker: 'AMZN', rank: 1 },
    { sectorId: 'data_center', ticker: 'MSFT', rank: 2 },
    { sectorId: 'data_center', ticker: 'GOOGL', rank: 3 },
    
    // AI 모델
    { sectorId: 'ai_model', ticker: 'MSFT', rank: 1, notes: '오픈AI (비상장)' },
    { sectorId: 'ai_model', ticker: 'GOOGL', rank: 2 },
    { sectorId: 'ai_model', ticker: 'META', rank: 3, notes: '그 외 다수' },
    
    // GPU
    { sectorId: 'gpu', ticker: 'NVDA', rank: 1 },
    { sectorId: 'gpu', ticker: 'AMD', rank: 2 },
    { sectorId: 'gpu', ticker: 'TSM', rank: 3 },
    
    // ASIC
    { sectorId: 'asic', ticker: 'GOOGL', rank: 1, notes: '구글 등' },
    { sectorId: 'asic', ticker: 'AVGO', rank: 2, notes: '브로드컴 등' },
    { sectorId: 'asic', ticker: 'TSM', rank: 3 },
    
    // HBM
    { sectorId: 'hbm', ticker: '000660.KS', rank: 1 },  // SK하이닉스
    { sectorId: 'hbm', ticker: '005930.KS', rank: 2 },  // 삼성전자
    { sectorId: 'hbm', ticker: 'MU', rank: 3 },
    
    // 블록체인
    { sectorId: 'blockchain', ticker: 'COIN', rank: 1 },
    { sectorId: 'blockchain', ticker: 'USDC', rank: 2, notes: '서클 (비상장)' },
    { sectorId: 'blockchain', ticker: 'COIN', rank: 3, notes: '업비트 등' },
    
    // 로봇
    { sectorId: 'robot', ticker: 'TSLA', rank: 1 },
    { sectorId: 'robot', ticker: 'NVDA', rank: 2 },
    { sectorId: 'robot', ticker: '005380.KS', rank: 3, notes: '현대차 등 보스톤 다이나믹스' },
    
    // 자율주행
    { sectorId: 'autonomous', ticker: 'TSLA', rank: 1 },
    { sectorId: 'autonomous', ticker: 'GOOGL', rank: 2 },
    { sectorId: 'autonomous', ticker: 'NVDA', rank: 3, notes: '엔비디아, BYD' },
    
    // 양자컴퓨터
    { sectorId: 'quantum', ticker: 'IONQ', rank: 1, notes: '아이온큐, IBM 등' },
    { sectorId: 'quantum', ticker: 'MSFT', rank: 2 },
    { sectorId: 'quantum', ticker: 'GOOGL', rank: 3 },
    
    // 우주
    { sectorId: 'space', ticker: 'RKLB', rank: 1, notes: '스페이스X (비상장)' },
    { sectorId: 'space', ticker: 'RKLB', rank: 2 },
    { sectorId: 'space', ticker: 'AMZN', rank: 3, notes: '블루 오리진 등' },
  ],
};
```

---

## 4. 기술 스택

### 4.1 Frontend
| 기술 | 용도 | 선정 이유 |
|-----|------|----------|
| **Next.js 14+** | 프레임워크 | App Router, SSR/ISR 지원 |
| **TypeScript** | 언어 | 타입 안정성 |
| **Tailwind CSS** | 스타일링 | 빠른 개발, 반응형 |
| **shadcn/ui** | UI 컴포넌트 | 복사 방식으로 번들 최소화, 커스터마이징 자유도 |
| **Recharts** | 차트 | 주가 차트 시각화 |
| **Framer Motion** | 애니메이션 | 인터랙션 효과 |
| **React Query (TanStack Query)** | 상태관리 | 서버 상태 캐싱 |

### 4.1.1 shadcn/ui 컴포넌트 목록

```bash
# 초기 설정
npx shadcn@latest init

# 필요한 컴포넌트
npx shadcn@latest add card          # 카테고리/섹터 카드
npx shadcn@latest add dialog        # 기업 상세 모달
npx shadcn@latest add badge         # 순위 뱃지 (1위, 2위, 3위)
npx shadcn@latest add tabs          # 카테고리 탭 네비게이션
npx shadcn@latest add tooltip       # 기업 호버 정보
npx shadcn@latest add skeleton      # 로딩 상태
npx shadcn@latest add table         # 섹터별 테이블 뷰 (선택)
npx shadcn@latest add button        # 버튼
npx shadcn@latest add input         # 검색 입력
npx shadcn@latest add scroll-area   # 모바일 스크롤 영역
npx shadcn@latest add separator     # 구분선
npx shadcn@latest add dropdown-menu # 필터 드롭다운
```

### 4.1.2 반응형 브레이크포인트

```typescript
// Tailwind 기본 브레이크포인트 활용
const breakpoints = {
  'sm': '640px',   // 모바일 가로
  'md': '768px',   // 태블릿
  'lg': '1024px',  // 작은 데스크톱
  'xl': '1280px',  // 데스크톱
  '2xl': '1536px', // 큰 데스크톱
};

// 패권 지도 그리드 반응형 전략
// - 모바일: 1열 (세로 스크롤)
// - 태블릿: 2열
// - 데스크톱: 3열 (좌: 기존산업, 중: AI, 우: 미래기술)
```

### 4.2 Backend
| 기술 | 용도 | 선정 이유 |
|-----|------|----------|
| **Next.js API Routes** | API 서버 | Vercel 배포 최적화 |
| **SQLite + better-sqlite3** | 데이터베이스 | 서버리스 친화적, 단일 파일, 설정 불필요 |
| **Drizzle ORM** | ORM | 타입 안전, SQLite 지원 우수 |
| **GitHub Actions** | 스케줄러 | 일일 배치 작업 + DB 커밋 |

### 4.3 Data Sources
| 소스 | 용도 | 제한사항 |
|-----|------|---------|
| **yfinance** | Primary | 무료, Python 라이브러리 |
| **FMP API** | Secondary/Backup | Free: 500MB/30일, 250 calls/day |
| **Alpha Vantage** | Backup | Free: 25 calls/day |

### 4.4 배포
| 플랫폼 | 용도 |
|-------|------|
| **Vercel** | Frontend + API (SQLite 파일 포함) |
| **GitHub Actions** | CI/CD, 데이터 수집 → DB 업데이트 → Git 커밋 |

> **SQLite 배포 전략**: GitHub Actions에서 데이터 수집 후 `data/hegemony.db` 파일을 커밋. Vercel 배포 시 DB 파일이 함께 배포되어 API에서 읽기 전용으로 사용.

---

## 5. API 설계

### 5.1 엔드포인트

```typescript
// GET /api/map
// 전체 패권 지도 데이터 반환
interface MapResponse {
  categories: Category[];
  sectors: Sector[];
  sectorCompanies: (SectorCompany & { 
    company: Company;
    snapshot: DailySnapshot;
  })[];
  lastUpdated: string;  // ISO date
}

// GET /api/company/:ticker
// 개별 기업 상세 정보
interface CompanyDetailResponse {
  company: Company;
  profile: CompanyProfile;
  snapshot: DailySnapshot;
  history: {            // 최근 30일 주가
    date: string;
    price: number;
    volume: number;
  }[];
  sectors: {            // 이 기업이 속한 모든 섹터
    sector: Sector;
    rank: number;
  }[];
}

// GET /api/sector/:sectorId
// 섹터별 상세 정보
interface SectorDetailResponse {
  sector: Sector;
  category: Category;
  companies: (SectorCompany & {
    company: Company;
    snapshot: DailySnapshot;
  })[];
  marketCapTotal: number;  // 섹터 내 총 시총
}

// POST /api/update (Cron only)
// 일일 데이터 업데이트 (인증 필요)
interface UpdateResponse {
  success: boolean;
  updated: number;       // 업데이트된 기업 수
  failed: string[];      // 실패한 티커
  timestamp: string;
}
```

### 5.2 데이터 수집 로직 (Python)

```python
# scripts/update_data.py
import yfinance as yf
import sqlite3
from datetime import datetime
from pathlib import Path

# 프로젝트 루트 기준 DB 경로
DB_PATH = Path(__file__).parent.parent / 'data' / 'hegemony.db'

TICKERS = [
    # US Stocks
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSM', 'AMD', 
    'INTC', 'QCOM', 'AVGO', 'NFLX', 'DIS', 'WMT', 'BABA', 'TSLA',
    'COIN', 'SNAP', 'IONQ', 'RKLB', 'MU',
    # Korean Stocks
    '005930.KS',  # Samsung
    '000660.KS',  # SK Hynix
    '005380.KS',  # Hyundai Motor
    # Other
    '1810.HK',    # Xiaomi
    '2454.TW',    # MediaTek
]

def fetch_stock_data(ticker: str) -> dict | None:
    """yfinance로 주식 데이터 수집"""
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        
        return {
            'ticker': ticker,
            'date': datetime.now().date().isoformat(),
            'market_cap': info.get('marketCap'),
            'price': info.get('currentPrice') or info.get('regularMarketPrice'),
            'price_change': info.get('regularMarketChangePercent'),
            'week_52_high': info.get('fiftyTwoWeekHigh'),
            'week_52_low': info.get('fiftyTwoWeekLow'),
            'volume': info.get('volume'),
            'avg_volume': info.get('averageVolume'),
            'pe_ratio': info.get('trailingPE'),
            'peg_ratio': info.get('pegRatio'),
            'sector': info.get('sector'),
            'industry': info.get('industry'),
            'name': info.get('longName') or info.get('shortName'),
        }
    except Exception as e:
        print(f"Error fetching {ticker}: {e}")
        return None

def upsert_snapshot(conn: sqlite3.Connection, data: dict):
    """SQLite UPSERT (INSERT OR REPLACE)"""
    conn.execute('''
        INSERT OR REPLACE INTO daily_snapshots 
        (ticker, date, market_cap, price, price_change, week_52_high, 
         week_52_low, volume, avg_volume, pe_ratio, peg_ratio, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ''', (
        data['ticker'], data['date'], data['market_cap'], data['price'],
        data['price_change'], data['week_52_high'], data['week_52_low'],
        data['volume'], data['avg_volume'], data['pe_ratio'], data['peg_ratio']
    ))

def main():
    conn = sqlite3.connect(DB_PATH)
    
    results = []
    failed = []
    
    for ticker in TICKERS:
        print(f"Fetching {ticker}...")
        data = fetch_stock_data(ticker)
        if data:
            upsert_snapshot(conn, data)
            results.append(ticker)
        else:
            failed.append(ticker)
    
    conn.commit()
    conn.close()
    
    print(f"\n✅ Updated: {len(results)}")
    if failed:
        print(f"❌ Failed: {failed}")

if __name__ == '__main__':
    main()
```

### 5.3 GitHub Actions Workflow

```yaml
# .github/workflows/update-data.yml
name: Daily Data Update

on:
  schedule:
    # KST 09:00 (UTC 00:00) - 미국 장 마감 후
    - cron: '0 0 * * *'
  workflow_dispatch:  # 수동 실행 허용

jobs:
  update:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install yfinance
      
      - name: Run data update
        run: python scripts/update_data.py
      
      - name: Commit and push if changed
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add data/hegemony.db
          git diff --staged --quiet || git commit -m "chore: daily data update $(date +'%Y-%m-%d')"
          git push
```

---

## 6. UI/UX 설계

### 6.1 반응형 레이아웃 전략

#### 데스크톱 (lg 이상: 1024px+)
```
┌─────────────────────────────────────────────────────────────────────┐
│  🗺️ TechThrone - 투자 패권 지도                      [검색] [필터] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐ │
│  │     컴퓨터        │ │        AI         │ │     미래기술      │ │
│  │  ┌─────────────┐  │ │  ┌─────────────┐  │ │  ┌─────────────┐  │ │
│  │  │ 컴퓨터 O.S. │  │ │  │ 데이터 센터 │  │ │  │  자율주행   │  │ │
│  │  │ MSFT AAPL   │  │ │  │ AMZN MSFT   │  │ │  │ TSLA GOOGL  │  │ │
│  │  └─────────────┘  │ │  └─────────────┘  │ │  └─────────────┘  │ │
│  │  ┌─────────────┐  │ │  ┌─────────────┐  │ │  ┌─────────────┐  │ │
│  │  │    CPU      │  │ │  │   AI 모델   │  │ │  │ 양자컴퓨터  │  │ │
│  │  └─────────────┘  │ │  └─────────────┘  │ │  └─────────────┘  │ │
│  │       ...         │ │       ...         │ │       ...         │ │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘ │
│                                                                     │
│  ┌───────────────────┐ ┌───────────────────┐                       │
│  │     인터넷        │ │      모바일       │                       │
│  └───────────────────┘ └───────────────────┘                       │
└─────────────────────────────────────────────────────────────────────┘
```

#### 태블릿 (md: 768px ~ 1023px)
```
┌─────────────────────────────────────────┐
│  🗺️ TechThrone            [검색] [필터] │
├─────────────────────────────────────────┤
│  ┌─────────────────┐ ┌─────────────────┐│
│  │     컴퓨터      │ │       AI        ││
│  │  ┌───────────┐  │ │  ┌───────────┐  ││
│  │  │ O.S.      │  │ │  │데이터센터 │  ││
│  │  │ MSFT AAPL │  │ │  │ AMZN MSFT │  ││
│  │  └───────────┘  │ │  └───────────┘  ││
│  │      ...        │ │      ...        ││
│  └─────────────────┘ └─────────────────┘│
│  ┌─────────────────┐ ┌─────────────────┐│
│  │    인터넷       │ │    미래기술     ││
│  └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────┘
```

#### 모바일 (sm 이하: ~767px)
```
┌─────────────────────────┐
│  🗺️ TechThrone    [≡]   │
├─────────────────────────┤
│  [컴퓨터|AI|미래기술|...] │  ← 가로 스크롤 탭
├─────────────────────────┤
│  ┌─────────────────────┐│
│  │     컴퓨터 O.S.     ││
│  │  ┌─────┐ ┌─────┐   ││
│  │  │MSFT │ │AAPL │   ││
│  │  │ 1위 │ │ 2위 │   ││
│  │  └─────┘ └─────┘   ││
│  └─────────────────────┘│
│  ┌─────────────────────┐│
│  │        CPU          ││
│  │  INTC  AMD  AAPL    ││
│  └─────────────────────┘│
│           ...            │
│     [세로 스크롤]        │
└─────────────────────────┘
```

### 6.2 컴포넌트 구조 (shadcn/ui 기반)

```tsx
// src/components/hegemony-map.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export function HegemonyMap({ data }: { data: MapData }) {
  return (
    <div className="container mx-auto px-4 py-6">
      {/* 모바일: 탭 네비게이션 */}
      <div className="block lg:hidden">
        <Tabs defaultValue="computing">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex">
              {data.categories.map((cat) => (
                <TabsTrigger key={cat.id} value={cat.id}>
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          
          {data.categories.map((cat) => (
            <TabsContent key={cat.id} value={cat.id}>
              <CategoryCard category={cat} sectors={...} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
      
      {/* 데스크톱: 그리드 레이아웃 */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-6">
        {data.categories.map((cat) => (
          <CategoryCard key={cat.id} category={cat} sectors={...} />
        ))}
      </div>
    </div>
  );
}
```

```tsx
// src/components/company-badge.tsx
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const rankStyles = {
  1: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
  2: "bg-orange-100 text-orange-800 hover:bg-orange-200",
  3: "bg-pink-100 text-pink-800 hover:bg-pink-200",
};

export function CompanyBadge({ company, rank }: CompanyBadgeProps) {
  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Badge 
              className={cn(
                "cursor-pointer transition-all",
                "text-xs md:text-sm",           // 반응형 폰트
                "px-2 py-1 md:px-3 md:py-1.5",  // 반응형 패딩
                rankStyles[rank as keyof typeof rankStyles]
              )}
            >
              {company.nameKo || company.ticker}
            </Badge>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>{company.name}</p>
          <p className="text-xs text-muted-foreground">
            시총: ${formatMarketCap(company.snapshot?.marketCap)}
          </p>
        </TooltipContent>
      </Tooltip>
      
      <DialogContent className="sm:max-w-[600px]">
        <CompanyDetail ticker={company.ticker} />
      </DialogContent>
    </Dialog>
  );
}
```

```tsx
// src/components/sector-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SectorCard({ sector, companies }: SectorCardProps) {
  return (
    <Card className="mb-3">
      <CardHeader className="py-2 px-3 md:py-3 md:px-4">
        <CardTitle className="text-sm md:text-base font-medium">
          {sector.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2 px-3 md:py-3 md:px-4">
        <div className="flex flex-wrap gap-1.5 md:gap-2">
          {companies.map((sc) => (
            <CompanyBadge 
              key={sc.ticker} 
              company={sc.company} 
              rank={sc.rank} 
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 6.3 메인 화면 (패권 지도) - 데스크톱 상세

```
┌────────────────────────────────────────────────────────────────────────┐
│  🗺️ 투자 패권 지도 - 2026년 테크 산업편                    [Last: 01/23] │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────┐  ┌──────────────────────────────────┐   │
│  │      컴퓨터               │  │         AI                       │   │
│  │ ┌────────────────────┐   │  │  ┌──────────────────────────┐    │   │
│  │ │ 컴퓨터 O.S.         │   │  │  │ 데이터 센터               │    │   │
│  │ │ [MSFT🟢][AAPL🟠]    │   │  │  │ [AMZN🟢][MSFT🟠][GOOGL🔴]│    │   │
│  │ └────────────────────┘   │  │  └──────────────────────────┘    │   │
│  │ ┌────────────────────┐   │  │  ┌──────────────────────────┐    │   │
│  │ │ CPU                 │   │  │  │ AI 모델                   │    │   │
│  │ │ [INTC🟢][AMD🟠]     │   │  │  │ [OpenAI🟢][GOOGL🟠]       │    │   │
│  │ │ [AAPL🔴]            │   │  │  └──────────────────────────┘    │   │
│  │ └────────────────────┘   │  │  ┌──────────────────────────┐    │   │
│  │ ┌────────────────────┐   │  │  │ GPU                       │    │   │
│  │ │ DDR                 │   │  │  │ [NVDA🟢][AMD🟠][TSM🔴]   │    │   │
│  │ │ [삼성🟢][SK🟠][MU🔴]│   │  │  └──────────────────────────┘    │   │
│  │ └────────────────────┘   │  │  ...                              │   │
│  └──────────────────────────┘  └──────────────────────────────────┘   │
│                                                                        │
│  ┌──────────────────────────┐  ┌──────────────────────────────────┐   │
│  │      인터넷               │  │         미래기술                  │   │
│  │  ...                      │  │  ...                              │   │
│  └──────────────────────────┘  └──────────────────────────────────┘   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

🟢 1위  🟠 2위  🔴 3위
```

### 6.4 기업 상세 모달 (Dialog)

```
┌─────────────────────────────────────────────────────────────┐
│  × │ NVIDIA Corporation (NVDA)                    [차트보기] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            주가 차트 (30일)                          │   │
│  │     ╱╲                                               │   │
│  │   ╱    ╲    ╱╲                                      │   │
│  │ ╱        ╲╱    ╲                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  시가총액     $3.2T          |  52주 최고   $152.89        │
│  현재가       $142.50 (+2.3%)  |  52주 최저   $47.32        │
│  P/E         65.2            |  거래량      52.3M          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  📍 패권 영역                                               │
│  • GPU: 1위                                                 │
│  • ASIC: 2위 (브로드컴과 경쟁)                              │
│  • 로봇: 2위                                                │
│  • 자율주행: 3위                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.5 색상 체계 (Tailwind + CSS Variables)

```typescript
// 순위별 색상 (Tailwind 클래스)
const RANK_STYLES = {
  1: {
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    hover: "hover:bg-emerald-200",
    label: '1위'
  },
  2: {
    badge: "bg-orange-100 text-orange-800 border-orange-200",
    hover: "hover:bg-orange-200",
    label: '2위'
  },
  3: {
    badge: "bg-pink-100 text-pink-800 border-pink-200",
    hover: "hover:bg-pink-200",
    label: '3위'
  },
} as const;

// 카테고리별 카드 배경색
const CATEGORY_STYLES = {
  computing: "bg-blue-50 border-blue-100",
  internet: "bg-green-50 border-green-100",
  mobile: "bg-amber-50 border-amber-100",
  media: "bg-purple-50 border-purple-100",
  ai: "bg-cyan-50 border-cyan-100",
  future_tech: "bg-slate-50 border-slate-100",
} as const;

// 주가 변동 색상
const PRICE_CHANGE_STYLES = {
  positive: "text-emerald-600",  // 상승
  negative: "text-red-600",       // 하락
  neutral: "text-gray-500",       // 보합
} as const;
```

```css
/* globals.css - shadcn/ui 테마 커스터마이징 */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;      /* 브랜드 컬러 */
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --muted: 210 40% 96.1%;
    --accent: 210 40% 96.1%;
    --border: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }
  
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* 다크모드 변수들... */
  }
}
```

---

## 7. 개발 로드맵

### Phase 1: MVP (2주)
- [ ] 프로젝트 초기 설정 (Next.js, TypeScript, Tailwind)
- [ ] Supabase DB 스키마 생성
- [ ] 정적 데이터 기반 패권 지도 UI 구현
- [ ] 기업 클릭 시 기본 정보 모달

### Phase 2: 데이터 연동 (1주)
- [ ] yfinance 데이터 수집 스크립트
- [ ] Vercel Cron 또는 GitHub Actions 설정
- [ ] API 엔드포인트 구현
- [ ] 실시간 데이터 표시

### Phase 3: 인터랙션 강화 (1주)
- [ ] 주가 차트 (Recharts)
- [ ] 기업별 상세 페이지
- [ ] 섹터별 필터링
- [ ] 검색 기능

### Phase 4: 고도화 (선택)
- [ ] 패권 변동 히스토리 (시계열)
- [ ] 알림 기능 (순위 변동 시)
- [ ] 다크 모드
- [ ] PWA 지원
- [ ] 한/영 언어 전환

---

## 8. 비기능 요구사항

### 8.1 성능
- 초기 로딩: 3초 이내 (LCP)
- API 응답: 200ms 이내
- ISR revalidate: 1시간

### 8.2 가용성
- 데이터 수집 실패 시 이전 데이터 유지
- Fallback API (FMP → Alpha Vantage)

### 8.3 보안
- API Rate Limiting
- CORS 설정
- Environment Variables 관리

---

## 9. 데이터 소스 상세

### 9.1 yfinance (Primary)
```python
# 사용 가능한 데이터
stock.info['marketCap']           # 시가총액
stock.info['currentPrice']        # 현재가
stock.info['sector']              # 섹터
stock.info['industry']            # 산업
stock.info['fiftyTwoWeekHigh']    # 52주 최고
stock.info['fiftyTwoWeekLow']     # 52주 최저
stock.info['trailingPE']          # P/E
stock.history(period='1mo')       # 과거 주가
```

### 9.2 FMP API (Secondary)
```bash
# Company Profile
GET https://financialmodelingprep.com/api/v3/profile/{ticker}?apikey=KEY

# Stock Quote
GET https://financialmodelingprep.com/api/v3/quote/{ticker}?apikey=KEY

# Stock Screener (섹터별 기업 탐색)
GET https://financialmodelingprep.com/api/v3/stock-screener?
    sector=Technology&
    marketCapMoreThan=1000000000&
    apikey=KEY
```

### 9.3 비상장 기업 처리
| 기업 | 처리 방법 |
|-----|----------|
| OpenAI | notes에 "(비상장)" 표시, MSFT로 대체 표시 |
| TikTok (ByteDance) | notes에 "(비상장)" 표시, SNAP으로 대체 |
| SpaceX | notes에 "(비상장)" 표시, RKLB로 대체 |
| Circle (USDC) | notes에 "(비상장)" 표시 |

---

## 10. 참고 자료

### 10.1 원본 영상
- 미키피디아 - "인사이트 넘치는 미키김의 투자 패권 지도! 2026년 테크 산업편"
- URL: https://www.youtube.com/watch?v=R34QK-ycYzA

### 10.2 API 문서
- yfinance: https://pypi.org/project/yfinance/
- FMP: https://site.financialmodelingprep.com/developer/docs
- Alpha Vantage: https://www.alphavantage.co/documentation/

### 10.3 디자인 참고
- 미키김 패권 지도 원본 이미지 (영상 10:43 타임스탬프)

---

## 11. 부록: 환경 설정

### 11.1 프로젝트 구조
```
tech-throne/
├── data/
│   └── hegemony.db              # SQLite 데이터베이스 (Git 포함)
├── scripts/
│   ├── update_data.py           # 일일 데이터 수집
│   ├── init_db.py               # DB 초기화 & 시드 데이터
│   └── requirements.txt         # Python 의존성 (yfinance)
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx             # 메인 패권 지도
│   │   ├── globals.css          # Tailwind + shadcn 테마
│   │   └── api/
│   │       ├── map/route.ts     # GET /api/map
│   │       └── company/[ticker]/route.ts
│   ├── components/
│   │   ├── ui/                  # shadcn/ui 컴포넌트 (자동 생성)
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── table.tsx
│   │   │   └── tooltip.tsx
│   │   ├── hegemony-map.tsx     # 메인 지도 컴포넌트
│   │   ├── category-card.tsx    # 카테고리 카드
│   │   ├── sector-card.tsx      # 섹터 카드
│   │   ├── company-badge.tsx    # 기업 뱃지
│   │   ├── company-detail.tsx   # 기업 상세 모달 내용
│   │   ├── price-chart.tsx      # Recharts 주가 차트
│   │   └── providers.tsx        # React Query Provider 등
│   ├── lib/
│   │   ├── db.ts                # SQLite 연결 (better-sqlite3)
│   │   ├── utils.ts             # cn() 유틸리티 (shadcn)
│   │   └── format.ts            # 숫자 포맷팅 (시총, 주가 등)
│   ├── hooks/
│   │   ├── use-map-data.ts      # React Query 훅
│   │   └── use-company.ts
│   └── types/
│       └── index.ts             # TypeScript 타입 정의
├── drizzle/
│   └── schema.ts                # Drizzle ORM 스키마 (선택)
├── .github/
│   └── workflows/
│       └── update-data.yml      # 일일 업데이트 Cron
├── components.json              # shadcn/ui 설정
├── tailwind.config.ts
├── next.config.js
├── package.json
└── tsconfig.json
```

### 11.2 환경 변수
```env
# .env.local
# SQLite는 환경 변수 불필요 (로컬 파일 사용)

# 선택적 외부 API (백업용)
FMP_API_KEY=xxx           # Financial Modeling Prep
ALPHA_VANTAGE_KEY=xxx     # 백업용

# Cron 보안 (로컬 실행 시 불필요)
CRON_SECRET=xxx
```

### 11.3 DB 초기화 스크립트

```python
# scripts/init_db.py
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / 'data' / 'hegemony.db'

def init_database():
    # data 디렉토리 생성
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Categories
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            name_en TEXT,
            "order" INTEGER NOT NULL
        )
    ''')
    
    # Sectors
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sectors (
            id TEXT PRIMARY KEY,
            category_id TEXT REFERENCES categories(id),
            name TEXT NOT NULL,
            name_en TEXT,
            "order" INTEGER NOT NULL,
            description TEXT
        )
    ''')
    
    # Companies
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS companies (
            ticker TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            name_ko TEXT,
            logo_url TEXT
        )
    ''')
    
    # Sector-Company Relations
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sector_companies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sector_id TEXT REFERENCES sectors(id),
            ticker TEXT REFERENCES companies(ticker),
            rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 5),
            notes TEXT,
            UNIQUE(sector_id, ticker)
        )
    ''')
    
    # Daily Snapshots
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS daily_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticker TEXT REFERENCES companies(ticker),
            date TEXT NOT NULL,
            market_cap INTEGER,
            price REAL,
            price_change REAL,
            week_52_high REAL,
            week_52_low REAL,
            volume INTEGER,
            avg_volume INTEGER,
            pe_ratio REAL,
            peg_ratio REAL,
            updated_at TEXT DEFAULT (datetime('now')),
            UNIQUE(ticker, date)
        )
    ''')
    
    # Company Profiles
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS company_profiles (
            ticker TEXT PRIMARY KEY REFERENCES companies(ticker),
            sector TEXT,
            industry TEXT,
            country TEXT,
            employees INTEGER,
            revenue INTEGER,
            net_income INTEGER,
            description TEXT,
            website TEXT,
            updated_at TEXT DEFAULT (datetime('now'))
        )
    ''')
    
    # Indexes
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_snapshots_ticker_date ON daily_snapshots(ticker, date DESC)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_sector_companies_sector ON sector_companies(sector_id)')
    
    conn.commit()
    print("✅ Database initialized successfully!")
    
    # Seed data 삽입
    seed_data(conn)
    
    conn.close()

def seed_data(conn):
    """초기 시드 데이터 삽입"""
    cursor = conn.cursor()
    
    # Categories
    categories = [
        ('computing', '컴퓨터', 'Computing', 1),
        ('internet', '인터넷', 'Internet', 2),
        ('mobile', '모바일', 'Mobile', 3),
        ('media', '미디어', 'Media', 4),
        ('ai', 'AI', 'AI', 5),
        ('future_tech', '미래기술', 'Future Tech', 6),
    ]
    cursor.executemany(
        'INSERT OR IGNORE INTO categories (id, name, name_en, "order") VALUES (?, ?, ?, ?)',
        categories
    )
    
    # Sectors (일부 예시)
    sectors = [
        ('os', 'computing', '컴퓨터 O.S.', 'Computer OS', 1, None),
        ('cpu', 'computing', 'CPU', 'CPU', 2, None),
        ('ddr', 'computing', 'DDR', 'DDR Memory', 3, None),
        ('search', 'internet', '검색', 'Search', 1, None),
        ('online_ads', 'internet', '온라인 광고 플랫폼', 'Online Ads', 2, None),
        ('ecommerce', 'internet', '온라인 커머스', 'E-Commerce', 3, None),
        ('gpu', 'ai', 'GPU', 'GPU', 3, None),
        ('hbm', 'ai', 'HBM', 'High Bandwidth Memory', 5, None),
        ('data_center', 'ai', '데이터 센터', 'Data Center', 1, None),
        ('ai_model', 'ai', 'A.I. 모델', 'AI Models', 2, None),
        ('autonomous', 'future_tech', '자율주행', 'Autonomous Driving', 1, None),
        ('quantum', 'future_tech', '양자컴퓨터', 'Quantum Computing', 2, None),
        ('space', 'future_tech', '우주', 'Space', 3, None),
    ]
    cursor.executemany(
        'INSERT OR IGNORE INTO sectors (id, category_id, name, name_en, "order", description) VALUES (?, ?, ?, ?, ?, ?)',
        sectors
    )
    
    # Companies
    companies = [
        ('AAPL', 'Apple Inc.', '애플', None),
        ('MSFT', 'Microsoft Corporation', '마이크로소프트', None),
        ('GOOGL', 'Alphabet Inc.', '구글', None),
        ('AMZN', 'Amazon.com Inc.', '아마존', None),
        ('META', 'Meta Platforms Inc.', '메타', None),
        ('NVDA', 'NVIDIA Corporation', '엔비디아', None),
        ('TSM', 'Taiwan Semiconductor', 'TSMC', None),
        ('AMD', 'Advanced Micro Devices', 'AMD', None),
        ('INTC', 'Intel Corporation', '인텔', None),
        ('005930.KS', 'Samsung Electronics', '삼성전자', None),
        ('000660.KS', 'SK Hynix Inc.', 'SK하이닉스', None),
        ('MU', 'Micron Technology', '마이크론', None),
        ('TSLA', 'Tesla Inc.', '테슬라', None),
        ('NFLX', 'Netflix Inc.', '넷플릭스', None),
        ('DIS', 'The Walt Disney Company', '디즈니', None),
        ('WMT', 'Walmart Inc.', '월마트', None),
        ('BABA', 'Alibaba Group', '알리바바', None),
        ('QCOM', 'Qualcomm Inc.', '퀄컴', None),
        ('AVGO', 'Broadcom Inc.', '브로드컴', None),
        ('COIN', 'Coinbase Global', '코인베이스', None),
        ('SNAP', 'Snap Inc.', '스냅', None),
        ('IONQ', 'IonQ Inc.', '아이온큐', None),
        ('RKLB', 'Rocket Lab USA', '로켓랩', None),
    ]
    cursor.executemany(
        'INSERT OR IGNORE INTO companies (ticker, name, name_ko, logo_url) VALUES (?, ?, ?, ?)',
        companies
    )
    
    # Sector-Company mappings (일부 예시)
    sector_companies = [
        ('os', 'MSFT', 1, None),
        ('os', 'AAPL', 2, None),
        ('cpu', 'INTC', 1, None),
        ('cpu', 'AMD', 2, None),
        ('cpu', 'AAPL', 3, '애플 등 ARM 기반'),
        ('ddr', '005930.KS', 1, None),
        ('ddr', '000660.KS', 2, None),
        ('ddr', 'MU', 3, None),
        ('gpu', 'NVDA', 1, None),
        ('gpu', 'AMD', 2, None),
        ('gpu', 'TSM', 3, None),
        ('hbm', '000660.KS', 1, None),
        ('hbm', '005930.KS', 2, None),
        ('hbm', 'MU', 3, None),
        ('data_center', 'AMZN', 1, None),
        ('data_center', 'MSFT', 2, None),
        ('data_center', 'GOOGL', 3, None),
        ('search', 'GOOGL', 1, None),
    ]
    cursor.executemany(
        'INSERT OR IGNORE INTO sector_companies (sector_id, ticker, rank, notes) VALUES (?, ?, ?, ?)',
        sector_companies
    )
    
    conn.commit()
    print("✅ Seed data inserted!")

if __name__ == '__main__':
    init_database()
```

### 11.4 Next.js에서 SQLite 사용

```typescript
// src/lib/db.ts
import Database from 'better-sqlite3';
import path from 'path';

// Vercel 배포 시에도 작동하도록 경로 설정
const dbPath = path.join(process.cwd(), 'data', 'hegemony.db');

// 싱글톤 패턴으로 DB 연결 관리
let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath, { readonly: true }); // 읽기 전용
    db.pragma('journal_mode = WAL');
  }
  return db;
}

// 타입 정의
export interface Category {
  id: string;
  name: string;
  name_en: string | null;
  order: number;
}

export interface Sector {
  id: string;
  category_id: string;
  name: string;
  name_en: string | null;
  order: number;
  description: string | null;
}

export interface Company {
  ticker: string;
  name: string;
  name_ko: string | null;
  logo_url: string | null;
}

export interface DailySnapshot {
  ticker: string;
  date: string;
  market_cap: number | null;
  price: number | null;
  price_change: number | null;
  week_52_high: number | null;
  week_52_low: number | null;
  volume: number | null;
  pe_ratio: number | null;
}
```

```typescript
// src/app/api/map/route.ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  
  const categories = db.prepare('SELECT * FROM categories ORDER BY "order"').all();
  const sectors = db.prepare('SELECT * FROM sectors ORDER BY "order"').all();
  
  const sectorCompanies = db.prepare(`
    SELECT 
      sc.*,
      c.name, c.name_ko, c.logo_url,
      ds.market_cap, ds.price, ds.price_change
    FROM sector_companies sc
    JOIN companies c ON sc.ticker = c.ticker
    LEFT JOIN daily_snapshots ds ON sc.ticker = ds.ticker 
      AND ds.date = (SELECT MAX(date) FROM daily_snapshots WHERE ticker = sc.ticker)
    ORDER BY sc.sector_id, sc.rank
  `).all();
  
  // 최신 업데이트 날짜
  const lastUpdated = db.prepare(
    'SELECT MAX(date) as last_date FROM daily_snapshots'
  ).get() as { last_date: string } | undefined;
  
  return NextResponse.json({
    categories,
    sectors,
    sectorCompanies,
    lastUpdated: lastUpdated?.last_date || null,
  });
}
```

### 11.5 Drizzle ORM 스키마 (선택적)

```typescript
// drizzle/schema.ts
import { sqliteTable, text, integer, real, unique } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  nameEn: text('name_en'),
  order: integer('order').notNull(),
});

export const sectors = sqliteTable('sectors', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').references(() => categories.id),
  name: text('name').notNull(),
  nameEn: text('name_en'),
  order: integer('order').notNull(),
  description: text('description'),
});

export const companies = sqliteTable('companies', {
  ticker: text('ticker').primaryKey(),
  name: text('name').notNull(),
  nameKo: text('name_ko'),
  logoUrl: text('logo_url'),
});

export const sectorCompanies = sqliteTable('sector_companies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sectorId: text('sector_id').references(() => sectors.id),
  ticker: text('ticker').references(() => companies.ticker),
  rank: integer('rank').notNull(),
  notes: text('notes'),
}, (table) => ({
  uniqueSectorTicker: unique().on(table.sectorId, table.ticker),
}));

export const dailySnapshots = sqliteTable('daily_snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ticker: text('ticker').references(() => companies.ticker),
  date: text('date').notNull(),
  marketCap: integer('market_cap'),
  price: real('price'),
  priceChange: real('price_change'),
  week52High: real('week_52_high'),
  week52Low: real('week_52_low'),
  volume: integer('volume'),
  avgVolume: integer('avg_volume'),
  peRatio: real('pe_ratio'),
  pegRatio: real('peg_ratio'),
  updatedAt: text('updated_at'),
}, (table) => ({
  uniqueTickerDate: unique().on(table.ticker, table.date),
}));
```

---

