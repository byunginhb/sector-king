#!/usr/bin/env python3
"""Daily stock data update script using yfinance."""

import sqlite3
import sys
from datetime import datetime
from pathlib import Path

# Ensure sibling modules (scoring.py) are importable regardless of CWD
sys.path.insert(0, str(Path(__file__).parent))

import yfinance as yf

from scoring import calculate_hegemony_scores, update_sector_rankings

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
        }
    except Exception as e:
        print(f"  Error fetching {ticker}: {e}")
        return None


def upsert_snapshot(conn: sqlite3.Connection, data: dict):
    """SQLite UPSERT (INSERT OR REPLACE) for daily_snapshots."""
    conn.execute(
        """
        INSERT OR REPLACE INTO daily_snapshots
        (ticker, date, market_cap, price, price_change, week_52_high,
         week_52_low, day_high, day_low, volume, avg_volume, pe_ratio, peg_ratio, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
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
            data["volume"],
            data["avg_volume"],
            data["pe_ratio"],
            data["peg_ratio"],
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


def main():
    """Main function to update all stock data."""
    if not DB_PATH.exists():
        print(f"Error: Database not found at {DB_PATH}")
        sys.exit(1)

    if len(sys.argv) > 1 and sys.argv[1]:
        target_date = sys.argv[1]
    else:
        target_date = datetime.now().date().isoformat()

    conn = sqlite3.connect(DB_PATH)

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

    conn.close()

    print("\nData update completed successfully!")


if __name__ == "__main__":
    main()
