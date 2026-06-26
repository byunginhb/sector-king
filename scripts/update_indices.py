"""주요 국가 대표 지수 수집 → market_indices(스냅샷) + market_index_history(시계열) UPSERT.

실행: `python scripts/update_indices.py` (또는 `pnpm db:update-indices`)

- 개별 종목(US/KR 한정) 모델과 분리된 별도 테이블. 국가 지수는 종목이 아니므로
  통화 환산(toUsd)·섹터 매핑과 무관하다. 지수 레벨(포인트)은 그대로 저장한다.
- yfinance 5년 일별 종가를 받아 시계열(history)을 백필하고, 그로부터 현재 레벨·
  1일 등락률·52주 고저(스냅샷)를 산출한다.
- 멱등: symbol/(symbol,date) 기준 UPSERT — 매일 재실행하면 새 거래일만 추가된다.

# ponytail: 매 실행마다 5년치를 재요청·UPSERT 한다(단순·자기치유). 지수 12개·~15k행이라
#           부하 무시 가능. 종목 수가 크게 늘면 period='5d' 증분 + 1회 백필로 분리.
"""

import sqlite3
from pathlib import Path
from datetime import datetime, timezone

import pandas as pd
import yfinance as yf

DB_PATH = Path(__file__).parent.parent / "data" / "hegemony.db"

HISTORY_PERIOD = "5y"  # 차트 최대 범위(5년)
WEEK52_WINDOW = 252    # 52주 ≈ 252 거래일

# 주요 국가 대표 지수 (국가, 표시명, yfinance 심볼) — 표시 순서대로.
# 신흥국(인도·브라질) 포함, 선진/주요 시장 선별.
INDICES = [
    ("미국", "S&P 500", "^GSPC"),
    ("미국", "나스닥 종합", "^IXIC"),
    ("한국", "코스피", "^KS11"),
    ("일본", "닛케이 225", "^N225"),
    ("중국", "상하이 종합", "000001.SS"),
    ("홍콩", "항셍", "^HSI"),
    ("인도", "니프티 50", "^NSEI"),
    ("대만", "가권", "^TWII"),
    ("독일", "DAX", "^GDAXI"),
    ("영국", "FTSE 100", "^FTSE"),
    ("프랑스", "CAC 40", "^FCHI"),
    ("브라질", "보베스파", "^BVSP"),
]


def ensure_tables(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS market_indices (
            symbol TEXT PRIMARY KEY,
            country TEXT NOT NULL,
            name TEXT NOT NULL,
            price REAL,
            change_percent REAL,
            week_52_high REAL,
            week_52_low REAL,
            as_of_date TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS market_index_history (
            symbol TEXT NOT NULL,
            date TEXT NOT NULL,
            close REAL NOT NULL,
            PRIMARY KEY (symbol, date)
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_index_history_symbol ON market_index_history(symbol)"
    )
    # 기간별 등락 컬럼(기존 테이블에 없으면 추가) — change_percent 는 1일 등락.
    existing = {r[1] for r in conn.execute("PRAGMA table_info(market_indices)").fetchall()}
    for col in ("change_1w", "change_1m", "change_1y"):
        if col not in existing:
            conn.execute(f"ALTER TABLE market_indices ADD COLUMN {col} REAL")
    conn.commit()


def pct_change_since(close: "pd.Series", days: int) -> float | None:
    """최신 종가 대비 약 `days` 일 전(달력 기준) 종가의 % 변화."""
    if len(close) < 2:
        return None
    target = close.index[-1] - pd.Timedelta(days=days)
    past = close[close.index <= target]
    if len(past) == 0:
        return None
    base = float(past.iloc[-1])
    if base == 0:
        return None
    return round((float(close.iloc[-1]) - base) / base * 100, 2)


def upsert_snapshot(conn: sqlite3.Connection, row: dict) -> None:
    conn.execute(
        """
        INSERT INTO market_indices
            (symbol, country, name, price, change_percent, week_52_high, week_52_low,
             as_of_date, sort_order, updated_at, change_1w, change_1m, change_1y)
        VALUES
            (:symbol, :country, :name, :price, :change_percent, :week_52_high, :week_52_low,
             :as_of_date, :sort_order, :updated_at, :change_1w, :change_1m, :change_1y)
        ON CONFLICT(symbol) DO UPDATE SET
            country=excluded.country,
            name=excluded.name,
            price=excluded.price,
            change_percent=excluded.change_percent,
            week_52_high=excluded.week_52_high,
            week_52_low=excluded.week_52_low,
            as_of_date=excluded.as_of_date,
            sort_order=excluded.sort_order,
            updated_at=excluded.updated_at,
            change_1w=excluded.change_1w,
            change_1m=excluded.change_1m,
            change_1y=excluded.change_1y
        """,
        row,
    )


def upsert_history(conn: sqlite3.Connection, symbol: str, points: list[tuple[str, float]]) -> None:
    conn.executemany(
        """
        INSERT INTO market_index_history (symbol, date, close)
        VALUES (?, ?, ?)
        ON CONFLICT(symbol, date) DO UPDATE SET close=excluded.close
        """,
        [(symbol, d, c) for d, c in points],
    )


def fetch(country: str, name: str, symbol: str, order: int):
    """(snapshot dict, history points) 반환. 데이터 없으면 (None, [])."""
    hist = yf.Ticker(symbol).history(period=HISTORY_PERIOD)
    if hist is None or len(hist) == 0:
        return None, []
    close = hist["Close"].dropna()
    if len(close) == 0:
        return None, []

    points = [(idx.strftime("%Y-%m-%d"), round(float(v), 2)) for idx, v in close.items()]

    price = float(close.iloc[-1])
    prev = float(close.iloc[-2]) if len(close) >= 2 else price
    change_percent = ((price - prev) / prev * 100) if prev else 0.0
    recent = close.tail(WEEK52_WINDOW)
    snapshot = {
        "symbol": symbol,
        "country": country,
        "name": name,
        "price": round(price, 2),
        "change_percent": round(change_percent, 2),
        "week_52_high": round(float(recent.max()), 2),
        "week_52_low": round(float(recent.min()), 2),
        "as_of_date": close.index[-1].strftime("%Y-%m-%d"),
        "sort_order": order,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "change_1w": pct_change_since(close, 7),
        "change_1m": pct_change_since(close, 30),
        "change_1y": pct_change_since(close, 365),
    }
    return snapshot, points


def main() -> None:
    conn = sqlite3.connect(str(DB_PATH))
    ensure_tables(conn)
    ok = 0
    for i, (country, name, symbol) in enumerate(INDICES):
        try:
            snapshot, points = fetch(country, name, symbol, i)
            if snapshot:
                upsert_snapshot(conn, snapshot)
                upsert_history(conn, symbol, points)
                ok += 1
                print(
                    f"  {country} {name}: {snapshot['price']:,} "
                    f"({snapshot['change_percent']:+.2f}%) · {len(points)} pts"
                )
            else:
                print(f"  SKIP {country} {name} ({symbol}) — no data")
        except Exception as exc:  # noqa: BLE001
            print(f"  ERR {country} {name} ({symbol}): {str(exc)[:80]}")
    conn.commit()
    conn.close()
    print(f"[update_indices] done: {ok}/{len(INDICES)}")


if __name__ == "__main__":
    main()
