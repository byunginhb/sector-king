"""글로벌 자금 지도(/global-flow) 데이터 수집.

실행: `python scripts/update_global_flow.py` (update-data.yml 이 update_indices 다음에 호출)

테이블 (ensure_tables 가 생성 — db-snapshot 이 SoT 라 별도 마이그레이션 없음):
  global_asset_history(symbol, date, close)  자산군 가격 이력(yfinance, 배당 조정 종가)
  macro_series(series_id, date, value)       매크로·자금 통로 시계열

수집 소스 (전부 무료·무키, 상세는 docs/wiki/features/global-flow/data-sources.md):
  1. yfinance   자산 가격 2년 + BTC/ETH 유통량 + ETF 좌수(추정)
  2. FRED       fredgraph.csv (키 불요, 시리즈당 1회 — 여러 개 묶으면 ZIP 이 온다)
  3. DefiLlama  스테이블코인 총발행량
  4. 네이버 증권 고객예탁금 · 외국인 순매수(KOSPI+KOSDAQ)

소스별로 격리한다 — 하나가 실패해도 나머지는 적재된다.
market_index_history 를 쓰지 않는 이유: /indices 의 기간 cutoff 가 그 테이블의 max(date) 를
쓰는데, 주말에도 행이 있는 크립토가 섞이면 cutoff 가 토요일로 밀린다.
"""

import csv
import io
import json
import sqlite3
import time
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import yfinance as yf

DB_PATH = Path(__file__).parent.parent / "data" / "hegemony.db"

HISTORY_PERIOD = "5y"  # 1년 비교 + RRG 여유분 + 규모 기준일(2024-12-31) 커버
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"

# lib/global-flow/assets.ts 의 symbol 과 일치해야 한다.
ASSET_SYMBOLS = [
    "^GSPC", "^KS11", "ACWX",          # 주식
    "IEF", "TLT", "LQD", "HYG",        # 채권
    "GC=F", "CL=F", "HG=F",            # 원자재
    "BTC-USD", "ETH-USD",              # 크립토
    "BIL",                             # 현금(T-bill)
    "DX-Y.NYB", "KRW=X",               # 잣대
]

# 유통량 → 크립토 규모(유통량 × 가격)
SUPPLY_SYMBOLS = {"BTC-USD": "BTC_SUPPLY", "ETH-USD": "ETH_SUPPLY"}

# ETF 순설정 추정용. sharesOutstanding 이 없는 ETF 가 많아 AUM/가격으로 좌수를 추정한다.
ETF_SYMBOLS = ["SPY", "EWY", "ACWX", "IEF", "TLT", "LQD", "HYG", "GLD", "IAU", "IBIT", "BIL"]

# FRED 시리즈 — 단위가 제각각이라 원값 그대로 저장하고 lib/global-flow 에서 환산한다.
FRED_SERIES = ["WALCL", "WTREGEN", "RRPONTSYD", "M2SL", "WRMFNS", "MMMFFAQ027S"]


def ensure_tables(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS global_asset_history (
            symbol TEXT NOT NULL,
            date TEXT NOT NULL,
            close REAL NOT NULL,
            PRIMARY KEY (symbol, date)
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS macro_series (
            series_id TEXT NOT NULL,
            date TEXT NOT NULL,
            value REAL NOT NULL,
            PRIMARY KEY (series_id, date)
        )
        """
    )
    conn.commit()


def upsert_asset(conn, symbol: str, points: list[tuple[str, float]]) -> int:
    conn.executemany(
        "INSERT INTO global_asset_history (symbol, date, close) VALUES (?, ?, ?) "
        "ON CONFLICT(symbol, date) DO UPDATE SET close = excluded.close",
        [(symbol, d, v) for d, v in points],
    )
    return len(points)


def upsert_series(conn, series_id: str, points: list[tuple[str, float]]) -> int:
    conn.executemany(
        "INSERT INTO macro_series (series_id, date, value) VALUES (?, ?, ?) "
        "ON CONFLICT(series_id, date) DO UPDATE SET value = excluded.value",
        [(series_id, d, v) for d, v in points],
    )
    return len(points)


def http_get(url: str, headers: dict | None = None) -> bytes:
    """3회 재시도. 마지막 실패는 그대로 raise.

    User-Agent 는 기본(Python-urllib)으로 둔다 — FRED(Akamai)는 브라우저 UA 를 단 비브라우저
    요청을 응답 없이 붙잡아 타임아웃시킨다(실측). 브라우저 UA 가 필요한 네이버만 headers 로 넘긴다.
    """
    req = urllib.request.Request(url, headers=headers or {})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                return res.read()
        except Exception:  # noqa: BLE001
            if attempt == 2:
                raise
            time.sleep(2 * (attempt + 1))
    raise RuntimeError("unreachable")


# ─── 1. yfinance ────────────────────────────────────────────────


def collect_assets(conn) -> None:
    for symbol in ASSET_SYMBOLS:
        try:
            # 기본 auto_adjust=True → 배당·이자 포함 총수익 종가(BIL/TLT 는 이게 맞다).
            # 조정 종가는 소급 변경되므로 매번 2년치를 다시 UPSERT 해 자기치유한다.
            close = yf.Ticker(symbol).history(period=HISTORY_PERIOD)["Close"].dropna()
            points = [(idx.strftime("%Y-%m-%d"), round(float(v), 6)) for idx, v in close.items()]
            n = upsert_asset(conn, symbol, points)
            print(f"  asset {symbol}: {n} pts (last {points[-1] if points else None})")
        except Exception as exc:  # noqa: BLE001
            print(f"  ERR asset {symbol}: {str(exc)[:100]}")


def collect_supply_and_etfs(conn) -> None:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    for symbol, series_id in SUPPLY_SYMBOLS.items():
        try:
            supply = yf.Ticker(symbol).info.get("circulatingSupply")
            if supply:
                upsert_series(conn, series_id, [(today, float(supply))])
                print(f"  supply {series_id}: {supply:,.0f}")
        except Exception as exc:  # noqa: BLE001
            print(f"  ERR supply {symbol}: {str(exc)[:100]}")

    for symbol in ETF_SYMBOLS:
        try:
            info = yf.Ticker(symbol).info
            # 날짜는 수집일이 아니라 시세 기준 거래일 — 주말 수집이 가짜 행을 만들지 않게.
            ts = info.get("regularMarketTime")
            day = datetime.fromtimestamp(ts, timezone.utc).strftime("%Y-%m-%d") if ts else today
            shares = info.get("sharesOutstanding")
            aum = info.get("totalAssets")
            price = info.get("navPrice") or info.get("previousClose")
            if not shares and aum and price:
                # ponytail: AUM/가격 추정 좌수. AUM 갱신이 가격보다 늦으면 하루 단위로 출렁이지만
                #           기간 합계에서는 상쇄된다. 발행사 일별 좌수 CSV 가 정답(업그레이드 경로).
                shares = aum / price
            if shares:
                upsert_series(conn, f"ETF_SHARES:{symbol}", [(day, float(shares))])
            if aum:
                upsert_series(conn, f"ETF_AUM:{symbol}", [(day, float(aum))])
            print(f"  etf {symbol}: {day} shares={shares and round(shares):,} aum={aum and round(aum):,}")
        except Exception as exc:  # noqa: BLE001
            print(f"  ERR etf {symbol}: {str(exc)[:100]}")


# ─── 2. FRED ────────────────────────────────────────────────────


def parse_fred_csv(text: str) -> list[tuple[str, float]]:
    """fredgraph.csv → [(date, value)]. 결측('.' 또는 빈 칸)은 건너뛴다."""
    rows = csv.reader(io.StringIO(text))
    header = next(rows, None)
    if not header or header[0] != "observation_date":
        raise ValueError(f"unexpected FRED header: {header}")
    out = []
    for row in rows:
        if len(row) < 2 or row[1] in ("", "."):
            continue
        out.append((row[0], float(row[1])))
    return out


def collect_fred(conn) -> None:
    start = (date.today() - timedelta(days=365 * 3)).isoformat()
    for sid in FRED_SERIES:
        try:
            raw = http_get(f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}&cosd={start}")
            points = parse_fred_csv(raw.decode("utf-8"))
            n = upsert_series(conn, f"FRED:{sid}", points)
            print(f"  fred {sid}: {n} pts (last {points[-1] if points else None})")
        except Exception as exc:  # noqa: BLE001
            print(f"  ERR fred {sid}: {str(exc)[:100]}")


# ─── 3. DefiLlama ───────────────────────────────────────────────


def collect_stablecoins(conn) -> None:
    try:
        data = json.loads(http_get("https://stablecoins.llama.fi/stablecoincharts/all"))
        cutoff = (date.today() - timedelta(days=365 * 2)).isoformat()
        points = []
        for row in data:
            d = datetime.fromtimestamp(int(row["date"]), timezone.utc).strftime("%Y-%m-%d")
            v = (row.get("totalCirculatingUSD") or {}).get("peggedUSD")
            if d >= cutoff and v:
                points.append((d, float(v)))
        n = upsert_series(conn, "STABLECOIN_USD", points)
        print(f"  stablecoin: {n} pts (last {points[-1] if points else None})")
    except Exception as exc:  # noqa: BLE001
        print(f"  ERR stablecoin: {str(exc)[:100]}")


# ─── 4. 네이버 증권 ──────────────────────────────────────────────

NAVER = "https://stock.naver.com/api/domestic/market"
# KRX 투자자 구분 코드: 9000 외국인, 9001 기타외국인 (네이버 화면의 "외국인" = 두 합)
FOREIGN_CODES = {"9000", "9001"}


def naver_json(path: str) -> dict:
    return json.loads(http_get(f"{NAVER}{path}", {"User-Agent": UA, "Referer": "https://stock.naver.com/"}))


def ymd(bizdate: str) -> str:
    return f"{bizdate[:4]}-{bizdate[4:6]}-{bizdate[6:]}"


def collect_kr_deposit(conn) -> None:
    """고객예탁금(억원) → 원 단위로 저장. startIdx 는 페이지 번호, pageSize 최대 200."""
    try:
        points = []
        for page in (0, 1):
            content = naver_json(f"/trendDeposit?startIdx={page}&pageSize=200").get("content") or []
            points += [(ymd(r["bizdate"]), float(r["customerDeposit"]) * 1e8) for r in content]
        n = upsert_series(conn, "KR_CUSTOMER_DEPOSIT", points)
        print(f"  kr deposit: {n} pts")
    except Exception as exc:  # noqa: BLE001
        print(f"  ERR kr deposit: {str(exc)[:100]}")


def foreign_net_by_day(market: str) -> dict[str, float]:
    bizdate = datetime.now(timezone(timedelta(hours=9))).strftime("%Y%m%d")
    out: dict[str, float] = {}
    for page in (0, 1):
        content = naver_json(
            f"/trend/daily?tradeType=KRX&marketType={market}&bizdate={bizdate}&startIdx={page}&pageSize=200"
        ).get("content") or []
        for r in content:
            net = sum(float(a["diffValue"]) for a in r["netAmounts"] if a["investorGubun"] in FOREIGN_CODES)
            out[ymd(r["bizdate"])] = net
    return out


def collect_kr_foreign(conn) -> None:
    """외국인 순매수(원) — KOSPI + KOSDAQ 합."""
    try:
        kospi = foreign_net_by_day("KOSPI")
        kosdaq = foreign_net_by_day("KOSDAQ")
        points = sorted((d, kospi.get(d, 0.0) + kosdaq.get(d, 0.0)) for d in kospi.keys() | kosdaq.keys())
        n = upsert_series(conn, "KR_FOREIGN_NET", points)
        print(f"  kr foreign net: {n} pts")
    except Exception as exc:  # noqa: BLE001
        print(f"  ERR kr foreign: {str(exc)[:100]}")


def main() -> None:
    conn = sqlite3.connect(str(DB_PATH))
    ensure_tables(conn)
    for step in (
        collect_assets,
        collect_supply_and_etfs,
        collect_fred,
        collect_stablecoins,
        collect_kr_deposit,
        collect_kr_foreign,
    ):
        step(conn)
        conn.commit()
    conn.close()
    print("[update_global_flow] done")


if __name__ == "__main__":
    main()
