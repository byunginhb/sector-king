#!/usr/bin/env python3
"""Backfill daily_snapshots for new tickers using yfinance historical data."""

import sqlite3
import sys
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import yfinance as yf

DB_PATH = Path(__file__).parent.parent / "data" / "hegemony.db"

SKIP_TICKERS = {
    "CATL",
}


def get_existing_dates(conn: sqlite3.Connection) -> list[str]:
    """Get business dates from existing daily_snapshots (tech data)."""
    cursor = conn.execute(
        "SELECT DISTINCT date FROM daily_snapshots ORDER BY date"
    )
    return [row[0] for row in cursor.fetchall()]


def get_tickers_to_backfill(conn: sqlite3.Connection) -> list[str]:
    """Get tickers in sector_companies that have NO daily_snapshots data."""
    cursor = conn.execute(
        """
        SELECT DISTINCT sc.ticker
        FROM sector_companies sc
        WHERE sc.ticker NOT IN (
            SELECT DISTINCT ticker FROM daily_snapshots
        )
        AND sc.ticker NOT IN ({})
        ORDER BY sc.ticker
        """.format(",".join(f"'{t}'" for t in SKIP_TICKERS))
    )
    return [row[0] for row in cursor.fetchall()]


def fetch_shares_outstanding(ticker: str) -> int | None:
    """Fetch shares outstanding from yfinance info."""
    try:
        info = yf.Ticker(ticker).info
        return info.get("sharesOutstanding")
    except Exception:
        return None


def backfill_ticker(
    conn: sqlite3.Connection,
    ticker: str,
    valid_dates: set[str],
    start_date: str,
    end_date: str,
) -> int:
    """Backfill daily_snapshots for a single ticker. Returns number of rows inserted."""
    try:
        hist = yf.download(
            ticker,
            start=start_date,
            end=end_date,
            progress=False,
            auto_adjust=True,
        )

        if hist.empty:
            print(f"  {ticker}: no historical data")
            return 0

        # Flatten multi-level columns if present (yfinance sometimes returns MultiIndex)
        if isinstance(hist.columns, pd.MultiIndex):
            hist.columns = hist.columns.get_level_values(0)

        shares = fetch_shares_outstanding(ticker)

        rows_inserted = 0
        prev_close = None

        for date_idx in hist.index:
            date_str = date_idx.strftime("%Y-%m-%d")

            if date_str not in valid_dates:
                continue

            close = float(hist.loc[date_idx, "Close"])
            high = float(hist.loc[date_idx, "High"])
            low = float(hist.loc[date_idx, "Low"])
            volume = int(hist.loc[date_idx, "Volume"])

            price_change = None
            if prev_close is not None and prev_close != 0:
                price_change = ((close - prev_close) / prev_close) * 100

            market_cap = None
            if shares is not None:
                market_cap = int(shares * close)

            # avg_volume: 20-day moving average (use available data)
            date_pos = hist.index.get_loc(date_idx)
            window_start = max(0, date_pos - 19)
            avg_vol_series = hist.iloc[window_start : date_pos + 1]["Volume"]
            avg_volume = int(avg_vol_series.mean()) if len(avg_vol_series) > 0 else None

            conn.execute(
                """
                INSERT OR REPLACE INTO daily_snapshots
                (ticker, date, market_cap, price, price_change, week_52_high,
                 week_52_low, day_high, day_low, volume, avg_volume, pe_ratio, peg_ratio, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                """,
                (
                    ticker,
                    date_str,
                    market_cap,
                    close,
                    price_change,
                    None,  # week_52_high (insufficient data)
                    None,  # week_52_low
                    high,
                    low,
                    volume,
                    avg_volume,
                    None,  # pe_ratio (not available for historical)
                    None,  # peg_ratio
                ),
            )
            rows_inserted += 1
            prev_close = close

        return rows_inserted

    except Exception as e:
        print(f"  {ticker}: ERROR - {e}")
        return 0


def main():
    if not DB_PATH.exists():
        print(f"Error: Database not found at {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)

    existing_dates = get_existing_dates(conn)
    if not existing_dates:
        print("Error: No existing dates found in daily_snapshots")
        conn.close()
        sys.exit(1)

    start_date = existing_dates[0]
    end_date = existing_dates[-1]

    # yfinance end date is exclusive, add 1 day
    end_dt = datetime.strptime(end_date, "%Y-%m-%d")
    end_date_exclusive = (end_dt + timedelta(days=1)).strftime("%Y-%m-%d")

    valid_dates = set(existing_dates)
    tickers = get_tickers_to_backfill(conn)

    print(f"Backfill started at {datetime.now().isoformat()}")
    print(f"Database: {DB_PATH}")
    print(f"Date range: {start_date} ~ {end_date} ({len(valid_dates)} business days)")
    print(f"Tickers to backfill: {len(tickers)}")
    if SKIP_TICKERS:
        print(f"Skipped: {SKIP_TICKERS}")
    print("=" * 60)

    success = []
    failed = []

    for i, ticker in enumerate(tickers, 1):
        print(f"[{i}/{len(tickers)}] {ticker}...", end=" ")
        rows = backfill_ticker(conn, ticker, valid_dates, start_date, end_date_exclusive)
        if rows > 0:
            success.append(ticker)
            print(f"OK ({rows} rows)")
        else:
            failed.append(ticker)
            print("FAILED")

        # Commit every 10 tickers
        if i % 10 == 0:
            conn.commit()

    conn.commit()

    print("=" * 60)
    print(f"Success: {len(success)} tickers")
    if failed:
        print(f"Failed: {failed}")

    if len(failed) > len(tickers) * 0.5:
        print("WARNING: More than 50% of tickers failed!")
        conn.close()
        sys.exit(1)

    conn.close()
    print("\nBackfill completed successfully!")


if __name__ == "__main__":
    main()
