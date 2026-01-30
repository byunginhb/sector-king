#!/usr/bin/env python3
"""Daily stock data update script using yfinance."""

import sqlite3
import sys
from datetime import datetime
from pathlib import Path

import yfinance as yf

DB_PATH = Path(__file__).parent.parent / "data" / "hegemony.db"

# Invalid tickers that should be skipped (e.g., wrong format in DB)
SKIP_TICKERS = {
    "CATL",  # Invalid - should be 300750.SZ
}


def get_tickers_from_db(conn: sqlite3.Connection) -> list[str]:
    """Get all unique tickers from sector_companies table."""
    cursor = conn.execute(
        "SELECT DISTINCT ticker FROM sector_companies ORDER BY ticker"
    )
    tickers = [row[0] for row in cursor.fetchall() if row[0] not in SKIP_TICKERS]
    return tickers


def fetch_stock_data(ticker: str) -> dict | None:
    """Fetch stock data from yfinance."""
    try:
        stock = yf.Ticker(ticker)
        info = stock.info

        if not info or "marketCap" not in info:
            print(f"  Warning: No data for {ticker}")
            return None

        return {
            "ticker": ticker,
            "date": datetime.now().date().isoformat(),
            "market_cap": info.get("marketCap"),
            "price": info.get("currentPrice") or info.get("regularMarketPrice"),
            "price_change": info.get("regularMarketChangePercent"),
            "week_52_high": info.get("fiftyTwoWeekHigh"),
            "week_52_low": info.get("fiftyTwoWeekLow"),
            "volume": info.get("volume"),
            "avg_volume": info.get("averageVolume"),
            "pe_ratio": info.get("trailingPE"),
            "peg_ratio": info.get("pegRatio"),
        }
    except Exception as e:
        print(f"  Error fetching {ticker}: {e}")
        return None


def upsert_snapshot(conn: sqlite3.Connection, data: dict):
    """SQLite UPSERT (INSERT OR REPLACE)."""
    conn.execute(
        """
        INSERT OR REPLACE INTO daily_snapshots
        (ticker, date, market_cap, price, price_change, week_52_high,
         week_52_low, volume, avg_volume, pe_ratio, peg_ratio, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    """,
        (
            data["ticker"],
            data["date"],
            data["market_cap"],
            data["price"],
            data["price_change"],
            data["week_52_high"],
            data["week_52_low"],
            data["volume"],
            data["avg_volume"],
            data["pe_ratio"],
            data["peg_ratio"],
        ),
    )


def update_sector_rankings(conn: sqlite3.Connection):
    """Update sector company rankings based on latest market cap."""
    print("\n" + "=" * 50)
    print("Updating sector rankings...")

    # Get all sectors
    sectors = conn.execute("SELECT id, name FROM sectors").fetchall()

    updated_sectors = 0

    for sector_id, sector_name in sectors:
        # Get companies in this sector with their latest market cap
        companies = conn.execute(
            """
            SELECT sc.ticker, ds.market_cap
            FROM sector_companies sc
            LEFT JOIN (
                SELECT ticker, market_cap
                FROM daily_snapshots
                WHERE date = (SELECT MAX(date) FROM daily_snapshots)
            ) ds ON sc.ticker = ds.ticker
            WHERE sc.sector_id = ?
            ORDER BY COALESCE(ds.market_cap, 0) DESC
        """,
            (sector_id,),
        ).fetchall()

        if not companies:
            continue

        # Update ranks based on market cap order
        rank_changed = False
        for new_rank, (ticker, market_cap) in enumerate(companies, start=1):
            # Get current rank
            current = conn.execute(
                "SELECT rank FROM sector_companies WHERE sector_id = ? AND ticker = ?",
                (sector_id, ticker),
            ).fetchone()

            if current and current[0] != new_rank:
                rank_changed = True
                conn.execute(
                    "UPDATE sector_companies SET rank = ? WHERE sector_id = ? AND ticker = ?",
                    (new_rank, sector_id, ticker),
                )

        if rank_changed:
            updated_sectors += 1
            print(f"  {sector_name}: rankings updated")

    print(f"Updated rankings in {updated_sectors} sectors")


def main():
    """Main function to update all stock data."""
    if not DB_PATH.exists():
        print(f"Error: Database not found at {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)

    # Get tickers from DB (sector_companies table)
    tickers = get_tickers_from_db(conn)

    results = []
    failed = []

    print(f"Starting data update at {datetime.now().isoformat()}")
    print(f"Database: {DB_PATH}")
    print(f"Tickers to update: {len(tickers)} (from sector_companies)")
    if SKIP_TICKERS:
        print(f"Skipped tickers: {SKIP_TICKERS}")
    print("=" * 50)

    for ticker in tickers:
        print(f"Fetching {ticker}...", end=" ")
        data = fetch_stock_data(ticker)
        if data:
            upsert_snapshot(conn, data)
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

    # Exit with error if more than 50% of tickers failed
    if len(failed) > len(tickers) * 0.5:
        conn.close()
        print("Error: More than 50% of tickers failed")
        sys.exit(1)

    # Update sector rankings based on latest market cap
    update_sector_rankings(conn)
    conn.commit()
    conn.close()

    print("\nData update completed successfully!")


if __name__ == "__main__":
    main()
