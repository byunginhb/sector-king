"""주요 국가 대표 지수 수집 → market_indices 테이블 UPSERT.

실행: `python scripts/update_indices.py` (또는 `pnpm db:update-indices`)

- 개별 종목(US/KR 한정) 모델과 분리된 별도 테이블. 국가 지수는 종목이 아니므로
  통화 환산(toUsd)·섹터 매핑과 무관하다. 지수 레벨(포인트)은 그대로 저장한다.
- yfinance 1y 종가로 현재 레벨·1일 등락률·52주 고저를 산출한다.
- 멱등: symbol 기준 UPSERT.
"""

import sqlite3
from pathlib import Path
from datetime import datetime, timezone

import yfinance as yf

DB_PATH = Path(__file__).parent.parent / "data" / "hegemony.db"

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


def ensure_table(conn: sqlite3.Connection) -> None:
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
    conn.commit()


def upsert(conn: sqlite3.Connection, row: dict) -> None:
    conn.execute(
        """
        INSERT INTO market_indices
            (symbol, country, name, price, change_percent, week_52_high, week_52_low,
             as_of_date, sort_order, updated_at)
        VALUES
            (:symbol, :country, :name, :price, :change_percent, :week_52_high, :week_52_low,
             :as_of_date, :sort_order, :updated_at)
        ON CONFLICT(symbol) DO UPDATE SET
            country=excluded.country,
            name=excluded.name,
            price=excluded.price,
            change_percent=excluded.change_percent,
            week_52_high=excluded.week_52_high,
            week_52_low=excluded.week_52_low,
            as_of_date=excluded.as_of_date,
            sort_order=excluded.sort_order,
            updated_at=excluded.updated_at
        """,
        row,
    )


def fetch(country: str, name: str, symbol: str, order: int) -> dict | None:
    hist = yf.Ticker(symbol).history(period="1y")
    if hist is None or len(hist) == 0:
        return None
    close = hist["Close"].dropna()
    if len(close) == 0:
        return None
    price = float(close.iloc[-1])
    prev = float(close.iloc[-2]) if len(close) >= 2 else price
    change_percent = ((price - prev) / prev * 100) if prev else 0.0
    return {
        "symbol": symbol,
        "country": country,
        "name": name,
        "price": round(price, 2),
        "change_percent": round(change_percent, 2),
        "week_52_high": round(float(close.max()), 2),
        "week_52_low": round(float(close.min()), 2),
        "as_of_date": close.index[-1].strftime("%Y-%m-%d"),
        "sort_order": order,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def main() -> None:
    conn = sqlite3.connect(str(DB_PATH))
    ensure_table(conn)
    ok = 0
    for i, (country, name, symbol) in enumerate(INDICES):
        try:
            row = fetch(country, name, symbol, i)
            if row:
                upsert(conn, row)
                ok += 1
                print(f"  {country} {name}: {row['price']:,} ({row['change_percent']:+.2f}%)")
            else:
                print(f"  SKIP {country} {name} ({symbol}) — no data")
        except Exception as exc:  # noqa: BLE001
            print(f"  ERR {country} {name} ({symbol}): {str(exc)[:80]}")
    conn.commit()
    conn.close()
    print(f"[update_indices] done: {ok}/{len(INDICES)}")


if __name__ == "__main__":
    main()
