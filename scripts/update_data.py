#!/usr/bin/env python3
"""Daily stock data update script using yfinance."""

import sqlite3
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

# Ensure sibling modules (scoring.py) are importable regardless of CWD
sys.path.insert(0, str(Path(__file__).parent))

import yfinance as yf

from scoring import calculate_hegemony_scores, update_sector_rankings

DB_PATH = Path(__file__).parent.parent / "data" / "hegemony.db"

# 실적 캘린더는 KST 확정값으로 저장한다(economic_events 와 동일 규약).
KST = timezone(timedelta(hours=9))

# Invalid tickers that should be skipped (e.g., wrong format in DB).
# CATL/ABB 등 좀비 종목은 09_accuracy_audit(A5) 마이그레이션으로 DB 에서 제거됨.
SKIP_TICKERS: set[str] = set()


def is_weekend(date_str: str) -> bool:
    """True if date_str (YYYY-MM-DD) falls on Saturday or Sunday.

    Markets are closed on weekends; yfinance .info still returns the last
    trading day's values, which produced carry-forward weekend rows (audit B4-b).
    We skip persisting snapshots/scores for weekend target dates.
    """
    try:
        return date.fromisoformat(date_str).weekday() >= 5  # 5=Sat, 6=Sun
    except ValueError:
        return False


def get_tickers_from_db(conn: sqlite3.Connection) -> list[str]:
    """Get all unique tickers from sector_companies table."""
    cursor = conn.execute(
        "SELECT DISTINCT ticker FROM sector_companies ORDER BY ticker"
    )
    tickers = [row[0] for row in cursor.fetchall() if row[0] not in SKIP_TICKERS]
    return tickers


def fetch_stock_data(ticker: str, target_date: str) -> dict | None:
    """Fetch stock data and fundamental metrics from yfinance.

    Returns snapshot data and fundamental metrics from the same .info call.
    No additional API calls needed for fundamental data.
    """
    try:
        stock = yf.Ticker(ticker)
        info = stock.info

        if not info or "marketCap" not in info:
            print(f"  Warning: No data for {ticker}")
            return None

        return {
            "ticker": ticker,
            "date": target_date,
            # Daily snapshot fields
            "market_cap": info.get("marketCap"),
            "price": info.get("currentPrice") or info.get("regularMarketPrice"),
            "price_change": info.get("regularMarketChangePercent"),
            "week_52_high": info.get("fiftyTwoWeekHigh"),
            "week_52_low": info.get("fiftyTwoWeekLow"),
            "day_high": info.get("dayHigh") or info.get("regularMarketDayHigh"),
            "day_low": info.get("dayLow") or info.get("regularMarketDayLow"),
            "volume": info.get("volume"),
            "avg_volume": info.get("averageVolume"),
            "pe_ratio": info.get("trailingPE"),
            "peg_ratio": info.get("pegRatio"),
            "forward_pe": info.get("forwardPE"),
            "price_to_book": info.get("priceToBook"),
            "ev_to_ebitda": info.get("enterpriseToEbitda"),
            # Fundamental metrics (from same .info dict, no extra API call)
            "revenue_growth": info.get("revenueGrowth"),
            "earnings_growth": info.get("earningsGrowth"),
            "operating_margin": info.get("operatingMargins"),
            "return_on_equity": info.get("returnOnEquity"),
            "recommendation_key": info.get("recommendationKey"),
            "analyst_count": info.get("numberOfAnalystOpinions"),
            "target_mean_price": info.get("targetMeanPrice"),
            "free_cashflow": info.get("freeCashflow"),
            "beta": info.get("beta"),
            "debt_to_equity": info.get("debtToEquity"),
            # 투자의견 분포 추이 (issue#33). quoteSummary 의 별도 모듈이라
            # .info 에 없다 → 티커당 호출 1회 추가. 실패해도 스냅샷은 살린다.
            "recommendation_trend": fetch_recommendation_trend(stock, ticker),
            # 실적발표 일정. 같은 .info dict 안에 있어 추가 호출 0.
            "earnings_dates": parse_earnings_dates(info),
        }
    except Exception as e:
        print(f"  Error fetching {ticker}: {e}")
        return None


def fetch_recommendation_trend(stock, ticker: str) -> list[dict]:
    """Fetch analyst recommendation distribution per period (0m ~ -3m).

    Yahoo returns strongBuy/buy/hold/sell/strongSell counts for relative
    periods. Returns [] on any failure — this is a nice-to-have panel, it must
    never fail the daily snapshot for a ticker.
    """
    try:
        df = stock.recommendations
        if df is None or df.empty or "period" not in df.columns:
            return []

        rows = []
        for row in df.to_dict("records"):
            period = row.get("period")
            if not period:
                continue
            counts = {
                col: int(row.get(col) or 0)
                for col in ("strongBuy", "buy", "hold", "sell", "strongSell")
            }
            # 전 등급 0 = 커버리지 없음. 빈 막대로 저장할 이유가 없다.
            if sum(counts.values()) == 0:
                continue
            rows.append({"period": period, **counts})
        return rows
    except Exception as e:
        print(f"  (recommendation trend unavailable for {ticker}: {e})", end=" ")
        return []


def parse_earnings_dates(info: dict) -> list[dict]:
    """Extract earnings dates (KST) from the .info dict we already fetched.

    Yahoo ships epoch seconds in the quote summary, so this costs no extra API
    call. Two keys matter:
      - earningsTimestamp      = most recent print (past, always confirmed)
      - earningsTimestampStart = next scheduled print (may be an estimate)
    Both are stored so the calendar has backward coverage from day one.

    The epoch is an absolute moment, so KST conversion is exact — and it MUST
    shift the date for US after-close prints (AAPL 16:00 ET -> 05:00 KST next
    day). That is the correct row for a KST calendar, not an off-by-one.
    """
    is_estimate = bool(info.get("isEarningsDateEstimate"))
    by_date: dict[str, dict] = {}
    # Order matters: on a collision the scheduled entry (2nd) wins so its
    # estimate flag is the one that survives.
    for key, estimate in (("earningsTimestamp", False), ("earningsTimestampStart", is_estimate)):
        ts = info.get(key)
        if not ts:
            continue
        try:
            dt = datetime.fromtimestamp(int(ts), tz=timezone.utc).astimezone(KST)
        except (TypeError, ValueError, OSError, OverflowError):
            continue
        by_date[dt.date().isoformat()] = {
            "date": dt.date().isoformat(),
            "time": dt.strftime("%H:%M"),
            "is_estimate": 1 if estimate else 0,
        }
    return list(by_date.values())


def upsert_earnings_calendar(conn: sqlite3.Connection, data: dict):
    """UPSERT earnings dates for one ticker.

    Keyed on (ticker, earnings_date) so past quarters accumulate instead of
    being overwritten when Yahoo rolls the schedule forward. A confirmed date
    replacing an estimate is just an is_estimate flip on the same row; a
    rescheduled date creates a new row and the stale estimate is filtered out
    at read time (see lib/earnings-calendar.ts).
    """
    for row in data.get("earnings_dates") or []:
        conn.execute(
            """
            INSERT INTO earnings_calendar
            (ticker, earnings_date, earnings_time, is_estimate, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'))
            ON CONFLICT(ticker, earnings_date) DO UPDATE SET
                earnings_time = excluded.earnings_time,
                is_estimate = excluded.is_estimate,
                updated_at = datetime('now')
        """,
            (data["ticker"], row["date"], row["time"], row["is_estimate"]),
        )


def upsert_snapshot(conn: sqlite3.Connection, data: dict):
    """UPSERT a daily_snapshots row (ON CONFLICT(ticker,date) DO UPDATE).

    Volume guard (audit B4-c): when an incoming fetch has volume 0 or NULL
    (common for KR tickers fetched outside their trading session), we must NOT
    overwrite an existing valid (>0) volume. NULLIF(excluded.volume, 0) maps an
    incoming 0 to NULL, then COALESCE falls back to the existing stored volume.
    For a brand-new row, storing NULL (no overwrite path) is more honest than 0.
    """
    conn.execute(
        """
        INSERT INTO daily_snapshots
        (ticker, date, market_cap, price, price_change, week_52_high,
         week_52_low, day_high, day_low, volume, avg_volume, pe_ratio, peg_ratio,
         forward_pe, price_to_book, ev_to_ebitda, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(ticker, date) DO UPDATE SET
            market_cap = excluded.market_cap,
            price = excluded.price,
            price_change = excluded.price_change,
            week_52_high = excluded.week_52_high,
            week_52_low = excluded.week_52_low,
            day_high = excluded.day_high,
            day_low = excluded.day_low,
            volume = COALESCE(NULLIF(excluded.volume, 0), daily_snapshots.volume),
            avg_volume = COALESCE(excluded.avg_volume, daily_snapshots.avg_volume),
            pe_ratio = excluded.pe_ratio,
            peg_ratio = excluded.peg_ratio,
            forward_pe = excluded.forward_pe,
            price_to_book = excluded.price_to_book,
            ev_to_ebitda = excluded.ev_to_ebitda,
            updated_at = datetime('now')
    """,
        (
            data["ticker"],
            data["date"],
            data["market_cap"],
            data["price"],
            data["price_change"],
            data["week_52_high"],
            data["week_52_low"],
            data["day_high"],
            data["day_low"],
            # NULLIF at write time: store NULL (not 0) for a fresh weekend/off-session
            # fetch so the column reads as "unknown" rather than a false 0.
            data["volume"] if data["volume"] else None,
            data["avg_volume"],
            data["pe_ratio"],
            data["peg_ratio"],
            data["forward_pe"],
            data["price_to_book"],
            data["ev_to_ebitda"],
        ),
    )


def upsert_company_scores(conn: sqlite3.Connection, data: dict):
    """UPSERT fundamental metrics into company_scores table."""
    conn.execute(
        """
        INSERT INTO company_scores (
            ticker, revenue_growth, earnings_growth, operating_margin,
            return_on_equity, recommendation_key, analyst_count,
            target_mean_price, free_cashflow, beta, debt_to_equity,
            metrics_updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(ticker) DO UPDATE SET
            revenue_growth = excluded.revenue_growth,
            earnings_growth = excluded.earnings_growth,
            operating_margin = excluded.operating_margin,
            return_on_equity = excluded.return_on_equity,
            recommendation_key = excluded.recommendation_key,
            analyst_count = excluded.analyst_count,
            target_mean_price = excluded.target_mean_price,
            free_cashflow = excluded.free_cashflow,
            beta = excluded.beta,
            debt_to_equity = excluded.debt_to_equity,
            metrics_updated_at = datetime('now')
    """,
        (
            data["ticker"],
            data["revenue_growth"],
            data["earnings_growth"],
            data["operating_margin"],
            data["return_on_equity"],
            data["recommendation_key"],
            data["analyst_count"],
            data["target_mean_price"],
            data["free_cashflow"],
            data["beta"],
            data["debt_to_equity"],
        ),
    )


def upsert_recommendation_trend(conn: sqlite3.Connection, data: dict):
    """UPSERT analyst recommendation distribution rows for one ticker.

    Yahoo periods are relative ('0m' = current month), so each run overwrites
    the same (ticker, period) keys — a rolling 4-month view, not a history log.
    An empty fetch leaves existing rows untouched rather than wiping a panel
    that was populated by the previous (successful) run.
    """
    for row in data.get("recommendation_trend") or []:
        conn.execute(
            """
            INSERT INTO analyst_recommendation_trend
            (ticker, period, strong_buy, buy, hold, sell, strong_sell, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(ticker, period) DO UPDATE SET
                strong_buy = excluded.strong_buy,
                buy = excluded.buy,
                hold = excluded.hold,
                sell = excluded.sell,
                strong_sell = excluded.strong_sell,
                updated_at = datetime('now')
        """,
            (
                data["ticker"],
                row["period"],
                row["strongBuy"],
                row["buy"],
                row["hold"],
                row["sell"],
                row["strongSell"],
            ),
        )


def ensure_score_tables(conn: sqlite3.Connection):
    """Create company_scores and score_history tables if they don't exist."""
    try:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS company_scores (
            ticker TEXT PRIMARY KEY REFERENCES companies(ticker),
            revenue_growth REAL,
            earnings_growth REAL,
            operating_margin REAL,
            return_on_equity REAL,
            recommendation_key TEXT,
            analyst_count INTEGER,
            target_mean_price REAL,
            free_cashflow INTEGER,
            beta REAL,
            debt_to_equity REAL,
            scale_score REAL DEFAULT 0,
            growth_score REAL DEFAULT 0,
            profitability_score REAL DEFAULT 0,
            sentiment_score REAL DEFAULT 0,
            raw_total_score REAL DEFAULT 0,
            smoothed_score REAL DEFAULT 0,
            data_quality REAL DEFAULT 0,
            metrics_updated_at TEXT,
            score_updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS score_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticker TEXT NOT NULL REFERENCES companies(ticker),
            date TEXT NOT NULL,
            raw_total_score REAL,
            smoothed_score REAL,
            scale_score REAL,
            growth_score REAL,
            profitability_score REAL,
            sentiment_score REAL,
            UNIQUE(ticker, date)
        );

        CREATE INDEX IF NOT EXISTS idx_score_history_ticker ON score_history(ticker);
        CREATE INDEX IF NOT EXISTS idx_score_history_date ON score_history(date);

        CREATE TABLE IF NOT EXISTS analyst_recommendation_trend (
            ticker TEXT NOT NULL REFERENCES companies(ticker),
            period TEXT NOT NULL,
            strong_buy INTEGER,
            buy INTEGER,
            hold INTEGER,
            sell INTEGER,
            strong_sell INTEGER,
            updated_at TEXT,
            PRIMARY KEY (ticker, period)
        );

        CREATE TABLE IF NOT EXISTS earnings_calendar (
            ticker TEXT NOT NULL REFERENCES companies(ticker),
            earnings_date TEXT NOT NULL,
            earnings_time TEXT,
            is_estimate INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT,
            PRIMARY KEY (ticker, earnings_date)
        );

        CREATE INDEX IF NOT EXISTS idx_earnings_calendar_date
            ON earnings_calendar(earnings_date);
    """)
    except sqlite3.Error as e:
        print(f"Error: Failed to ensure score tables: {e}")
        sys.exit(1)


def main():
    """Main function to update all stock data."""
    if not DB_PATH.exists():
        print(f"Error: Database not found at {DB_PATH}")
        sys.exit(1)

    if len(sys.argv) > 1 and sys.argv[1]:
        target_date = sys.argv[1]
    else:
        target_date = datetime.now().date().isoformat()

    # Weekend guard (audit B4-b): markets are closed Sat/Sun. Persisting a
    # snapshot here only duplicates Friday's values (carry-forward noise) and
    # writes weekend score_history rows. Skip the whole run for weekend dates.
    if is_weekend(target_date):
        print(f"Target date {target_date} is a weekend (market closed) — skipping update.")
        sys.exit(0)

    conn = sqlite3.connect(DB_PATH)

    # Switch from WAL to DELETE journal mode for CI compatibility.
    # WAL mode stores writes in a separate .db-wal file, but git only tracks
    # the main .db file. This causes data loss when CI commits without the WAL.
    journal_mode = conn.execute("PRAGMA journal_mode").fetchone()[0]
    if journal_mode.lower() == "wal":
        print("Converting journal mode from WAL to DELETE for git compatibility...")
        conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
        try:
            conn.execute("PRAGMA journal_mode=DELETE")
            print(f"Journal mode: {conn.execute('PRAGMA journal_mode').fetchone()[0]}")
        except sqlite3.OperationalError as e:
            print(f"Warning: Could not change journal mode (other readers?): {e}")
            print("Continuing with WAL mode - ensure WAL is checkpointed before git commit")

    ensure_score_tables(conn)

    tickers = get_tickers_from_db(conn)

    results = []
    failed = []

    print(f"Starting data update at {datetime.now().isoformat()}")
    print(f"Target date: {target_date}")
    print(f"Database: {DB_PATH}")
    print(f"Tickers to update: {len(tickers)} (from sector_companies)")
    if SKIP_TICKERS:
        print(f"Skipped tickers: {SKIP_TICKERS}")
    print("=" * 50)

    for ticker in tickers:
        print(f"Fetching {ticker}...", end=" ")
        data = fetch_stock_data(ticker, target_date)
        if data:
            upsert_snapshot(conn, data)
            upsert_company_scores(conn, data)
            upsert_recommendation_trend(conn, data)
            upsert_earnings_calendar(conn, data)
            results.append(ticker)
            print("OK")
        else:
            failed.append(ticker)
            print("FAILED")

    conn.commit()

    print("=" * 50)
    print(f"Updated: {len(results)} tickers")
    if failed:
        print(f"Failed: {failed}")

    if len(failed) > len(tickers) * 0.5:
        conn.close()
        print("Error: More than 50% of tickers failed")
        sys.exit(1)

    # Calculate hegemony scores and update rankings
    try:
        calculate_hegemony_scores(conn, target_date)
        conn.commit()

        update_sector_rankings(conn)
        conn.commit()
    except Exception as e:
        print(f"Score calculation failed (snapshots already saved): {e}")
        conn.rollback()

    # Ensure all data is written to the main DB file before git commit.
    # Without this, data may remain only in the WAL file and be lost.
    conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    conn.close()

    # Remove WAL/SHM files to ensure clean state for git
    wal_path = DB_PATH.with_suffix(".db-wal")
    shm_path = DB_PATH.with_suffix(".db-shm")
    for f in (wal_path, shm_path):
        if f.exists():
            f.unlink()

    print("\nData update completed successfully!")


if __name__ == "__main__":
    main()
