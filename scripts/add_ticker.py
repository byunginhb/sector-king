#!/usr/bin/env python3
"""CLI to add a new ticker to a sector with automatic data population.

Usage:
    python add_ticker.py TICKER SECTOR_ID [--name-ko "한글명"] [--no-backfill]
    python add_ticker.py --list-sectors
    python add_ticker.py --remove TICKER SECTOR_ID

Examples:
    python add_ticker.py NVDA gpu
    python add_ticker.py 005930.KS dram --name-ko "삼성전자"
    python add_ticker.py --list-sectors
    python add_ticker.py --remove IONQ quantum
"""

import argparse
import sqlite3
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Ensure sibling modules (scoring.py) are importable regardless of CWD
sys.path.insert(0, str(Path(__file__).parent))

import pandas as pd
import yfinance as yf

from scoring import calculate_hegemony_scores, update_sector_rankings

DB_PATH = Path(__file__).parent.parent / "data" / "hegemony.db"


def list_sectors(conn: sqlite3.Connection):
    """Print all available sectors grouped by category."""
    rows = conn.execute(
        """
        SELECT s.id, s.name, c.name as category_name
        FROM sectors s
        LEFT JOIN categories c ON s.category_id = c.id
        ORDER BY c.name, s.name
    """
    ).fetchall()

    current_category = None
    for sector_id, sector_name, category_name in rows:
        if category_name != current_category:
            current_category = category_name
            print(f"\n[{category_name}]")
        count = conn.execute(
            "SELECT COUNT(*) FROM sector_companies WHERE sector_id = ?", (sector_id,)
        ).fetchone()[0]
        print(f"  {sector_id:30s} {sector_name} ({count} companies)")


def validate_ticker(ticker: str) -> dict | None:
    """Validate ticker exists in yfinance and return info."""
    try:
        info = yf.Ticker(ticker).info
        if not info or "marketCap" not in info:
            return None
        return info
    except Exception:
        return None


def add_ticker(
    conn: sqlite3.Connection,
    ticker: str,
    sector_id: str,
    name_ko: str | None = None,
    no_backfill: bool = False,
):
    """Add a ticker to a sector with full data pipeline."""

    # 1. Validate sector exists
    sector = conn.execute(
        "SELECT id, name FROM sectors WHERE id = ?", (sector_id,)
    ).fetchone()
    if not sector:
        print(f"Error: Sector '{sector_id}' not found. Use --list-sectors to see options.")
        return False

    # 2. Check if already mapped
    existing = conn.execute(
        "SELECT id FROM sector_companies WHERE sector_id = ? AND ticker = ?",
        (sector_id, ticker),
    ).fetchone()
    if existing:
        print(f"Error: {ticker} is already in sector '{sector_id}'")
        return False

    # 3. Validate ticker
    print(f"Validating {ticker}...", end=" ")
    info = validate_ticker(ticker)
    if not info:
        print("FAILED - Invalid ticker or no data available")
        return False
    print(f"OK ({info.get('shortName', 'Unknown')})")

    # 4. UPSERT company
    company_name = info.get("shortName") or info.get("longName") or ticker
    conn.execute(
        """
        INSERT INTO companies (ticker, name, name_ko)
        VALUES (?, ?, ?)
        ON CONFLICT(ticker) DO UPDATE SET
            name = CASE WHEN excluded.name != '' THEN excluded.name ELSE companies.name END,
            name_ko = CASE WHEN excluded.name_ko IS NOT NULL THEN excluded.name_ko ELSE companies.name_ko END
    """,
        (ticker, company_name, name_ko),
    )
    print(f"  Company: {company_name} ({name_ko or 'no Korean name'})")

    # 5. Get next rank for sector
    max_rank = conn.execute(
        "SELECT COALESCE(MAX(rank), 0) FROM sector_companies WHERE sector_id = ?",
        (sector_id,),
    ).fetchone()[0]
    new_rank = max_rank + 1

    conn.execute(
        "INSERT INTO sector_companies (sector_id, ticker, rank) VALUES (?, ?, ?)",
        (sector_id, ticker, new_rank),
    )
    print(f"  Sector mapping: {sector[1]} (rank #{new_rank})")

    # 6. UPSERT company_scores with fundamental metrics
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
            ticker,
            info.get("revenueGrowth"),
            info.get("earningsGrowth"),
            info.get("operatingMargins"),
            info.get("returnOnEquity"),
            info.get("recommendationKey"),
            info.get("numberOfAnalystOpinions"),
            info.get("targetMeanPrice"),
            info.get("freeCashflow"),
            info.get("beta"),
            info.get("debtToEquity"),
        ),
    )
    print("  Fundamental metrics saved")

    # 7. UPSERT company profile
    conn.execute(
        """
        INSERT INTO company_profiles (ticker, sector, industry, country,
            employees, revenue, net_income, description, website, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(ticker) DO UPDATE SET
            sector = excluded.sector,
            industry = excluded.industry,
            country = excluded.country,
            employees = excluded.employees,
            revenue = excluded.revenue,
            net_income = excluded.net_income,
            description = excluded.description,
            website = excluded.website,
            updated_at = datetime('now')
    """,
        (
            ticker,
            info.get("sector"),
            info.get("industry"),
            info.get("country"),
            info.get("fullTimeEmployees"),
            info.get("totalRevenue"),
            info.get("netIncomeToCommon"),
            info.get("longBusinessSummary"),
            info.get("website"),
        ),
    )
    print("  Company profile saved")

    # 8. Insert today's snapshot
    today = datetime.now().date().isoformat()
    conn.execute(
        """
        INSERT OR REPLACE INTO daily_snapshots
        (ticker, date, market_cap, price, price_change, week_52_high,
         week_52_low, day_high, day_low, volume, avg_volume, pe_ratio, peg_ratio, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    """,
        (
            ticker,
            today,
            info.get("marketCap"),
            info.get("currentPrice") or info.get("regularMarketPrice"),
            info.get("regularMarketChangePercent"),
            info.get("fiftyTwoWeekHigh"),
            info.get("fiftyTwoWeekLow"),
            info.get("dayHigh") or info.get("regularMarketDayHigh"),
            info.get("dayLow") or info.get("regularMarketDayLow"),
            info.get("volume"),
            info.get("averageVolume"),
            info.get("trailingPE"),
            info.get("pegRatio"),
        ),
    )
    print(f"  Today's snapshot saved ({today})")

    conn.commit()

    # 9. Backfill historical data
    if not no_backfill:
        print("  Backfilling historical data...")
        backfill_count = backfill_ticker(conn, ticker)
        if backfill_count > 0:
            print(f"  Backfilled {backfill_count} historical snapshots")
        else:
            print("  No historical data to backfill")
        conn.commit()

    # 10. Calculate scores and update rankings
    latest_date = conn.execute(
        "SELECT MAX(date) FROM daily_snapshots"
    ).fetchone()[0]

    calculate_hegemony_scores(conn, latest_date)
    conn.commit()

    update_sector_rankings(conn)
    conn.commit()

    # Print final result
    score = conn.execute(
        "SELECT smoothed_score, data_quality FROM company_scores WHERE ticker = ?",
        (ticker,),
    ).fetchone()
    rank = conn.execute(
        "SELECT rank FROM sector_companies WHERE sector_id = ? AND ticker = ?",
        (sector_id, ticker),
    ).fetchone()

    print(f"\n  Done! {ticker} added to '{sector[1]}'")
    print(f"  Hegemony Score: {score[0]:.2f}/100 (DQ: {score[1]:.2f})")
    print(f"  Rank: #{rank[0]}")

    return True


def backfill_ticker(conn: sqlite3.Connection, ticker: str) -> int:
    """Backfill historical snapshots for a ticker using existing date range."""
    existing_dates = conn.execute(
        "SELECT DISTINCT date FROM daily_snapshots ORDER BY date"
    ).fetchall()
    if not existing_dates:
        return 0

    valid_dates = {row[0] for row in existing_dates}
    start_date = existing_dates[0][0]
    end_date = existing_dates[-1][0]

    end_dt = datetime.strptime(end_date, "%Y-%m-%d")
    end_date_exclusive = (end_dt + timedelta(days=1)).strftime("%Y-%m-%d")

    try:
        hist = yf.download(
            ticker, start=start_date, end=end_date_exclusive,
            progress=False, auto_adjust=True,
        )
        if hist.empty:
            return 0

        if isinstance(hist.columns, pd.MultiIndex):
            hist.columns = hist.columns.get_level_values(0)

        shares = None
        try:
            shares = yf.Ticker(ticker).info.get("sharesOutstanding")
        except Exception:
            pass

        rows_inserted = 0
        prev_close = None

        for date_idx in hist.index:
            date_str = date_idx.strftime("%Y-%m-%d")
            if date_str not in valid_dates:
                prev_close = float(hist.loc[date_idx, "Close"])
                continue

            # Skip if already exists
            existing = conn.execute(
                "SELECT id FROM daily_snapshots WHERE ticker = ? AND date = ?",
                (ticker, date_str),
            ).fetchone()
            if existing:
                prev_close = float(hist.loc[date_idx, "Close"])
                continue

            close = float(hist.loc[date_idx, "Close"])
            high = float(hist.loc[date_idx, "High"])
            low = float(hist.loc[date_idx, "Low"])
            volume = int(hist.loc[date_idx, "Volume"])

            price_change = None
            if prev_close is not None and prev_close != 0:
                price_change = ((close - prev_close) / prev_close) * 100

            market_cap = int(shares * close) if shares else None

            date_pos = hist.index.get_loc(date_idx)
            window_start = max(0, date_pos - 19)
            avg_vol_series = hist.iloc[window_start : date_pos + 1]["Volume"]
            avg_volume = int(avg_vol_series.mean()) if len(avg_vol_series) > 0 else None

            conn.execute(
                """
                INSERT OR IGNORE INTO daily_snapshots
                (ticker, date, market_cap, price, price_change, week_52_high,
                 week_52_low, day_high, day_low, volume, avg_volume, pe_ratio, peg_ratio, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """,
                (
                    ticker, date_str, market_cap, close, price_change,
                    None, None, high, low, volume, avg_volume, None, None,
                ),
            )
            rows_inserted += 1
            prev_close = close

        return rows_inserted
    except Exception as e:
        print(f"  Backfill error: {e}")
        return 0


def remove_ticker(conn: sqlite3.Connection, ticker: str, sector_id: str):
    """Remove a ticker from a sector."""
    existing = conn.execute(
        "SELECT id FROM sector_companies WHERE sector_id = ? AND ticker = ?",
        (sector_id, ticker),
    ).fetchone()
    if not existing:
        print(f"Error: {ticker} is not in sector '{sector_id}'")
        return False

    conn.execute(
        "DELETE FROM sector_companies WHERE sector_id = ? AND ticker = ?",
        (sector_id, ticker),
    )

    # Check if ticker is still in any sector
    remaining = conn.execute(
        "SELECT COUNT(*) FROM sector_companies WHERE ticker = ?", (ticker,)
    ).fetchone()[0]

    if remaining == 0:
        conn.execute("DELETE FROM company_scores WHERE ticker = ?", (ticker,))
        conn.execute("DELETE FROM score_history WHERE ticker = ?", (ticker,))
        print(f"  {ticker} removed from all sectors, scores cleaned up")
    else:
        print(f"  {ticker} removed from '{sector_id}' (still in {remaining} other sectors)")

    conn.commit()

    # Re-rank the sector
    update_sector_rankings(conn)
    conn.commit()

    print(f"  Done! Rankings updated.")
    return True


def main():
    parser = argparse.ArgumentParser(description="Add or remove a ticker from a sector")
    parser.add_argument("ticker", nargs="?", help="Stock ticker (e.g., NVDA, 005930.KS)")
    parser.add_argument("sector_id", nargs="?", help="Sector ID (e.g., gpu, dram)")
    parser.add_argument("--name-ko", help="Korean company name")
    parser.add_argument("--no-backfill", action="store_true", help="Skip historical data backfill")
    parser.add_argument("--list-sectors", action="store_true", help="List all available sectors")
    parser.add_argument("--remove", action="store_true", help="Remove ticker from sector")

    args = parser.parse_args()

    if not DB_PATH.exists():
        print(f"Error: Database not found at {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)

    if args.list_sectors:
        list_sectors(conn)
        conn.close()
        return

    if not args.ticker or not args.sector_id:
        parser.print_help()
        conn.close()
        sys.exit(1)

    ticker = args.ticker.upper()

    if args.remove:
        success = remove_ticker(conn, ticker, args.sector_id)
    else:
        success = add_ticker(
            conn, ticker, args.sector_id,
            name_ko=args.name_ko,
            no_backfill=args.no_backfill,
        )

    conn.close()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
