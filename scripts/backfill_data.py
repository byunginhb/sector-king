#!/usr/bin/env python3
"""Backfill daily_snapshots using yfinance historical data.

두 가지 모드:
  (기본)   스냅샷이 아예 없는 신규 티커를, 기존 보유 거래일에 맞춰 채운다.
  --start  보유 기간보다 과거 구간을 모든 티커에 대해 채운다(이력 확장).
           예: python scripts/backfill_data.py --start 2025-07-01
           종료일은 기존 최소 date 하루 전(겹침 없음). 재실행 멱등.
"""

import argparse
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


def get_tickers_to_backfill(
    conn: sqlite3.Connection,
    all_tickers: bool = False,
    gap_window: tuple[str, str] | None = None,
) -> list[str]:
    """Get target tickers in sector_companies.

    gap_window=(start, end) → 그 구간에 행이 하나도 없는 티커만(구멍 메우기).
    all_tickers=True        → 전부(이력 확장 모드).
    기본                    → 스냅샷이 전혀 없는 티커만.
    """
    if gap_window:
        cond = "AND sc.ticker NOT IN (SELECT DISTINCT ticker FROM daily_snapshots WHERE date >= ? AND date < ?)"
        params: tuple = gap_window
    elif all_tickers:
        cond, params = "", ()
    else:
        cond, params = "AND sc.ticker NOT IN (SELECT DISTINCT ticker FROM daily_snapshots)", ()
    cursor = conn.execute(
        """
        SELECT DISTINCT sc.ticker
        FROM sector_companies sc
        WHERE sc.ticker NOT IN ({})
        {}
        ORDER BY sc.ticker
        """.format(",".join(f"'{t}'" for t in SKIP_TICKERS), cond),
        params,
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
    valid_dates: set[str] | None,
    start_date: str,
    end_date: str,
) -> int:
    """Backfill daily_snapshots for a single ticker. Returns number of rows inserted.

    valid_dates=None → yfinance 가 준 거래일 전부 사용(이력 확장 모드).
    """
    try:
        # auto_adjust=False: update_data.py 가 저장하는 currentPrice(무보정 현물)와
        # 기준을 맞춤. 단 Yahoo 는 액면분할·분사·증자를 과거에 소급 보정하므로
        # 그런 종목은 경계에서 값이 튄다 → 아래 연속성 가드로 통째 skip.
        hist = yf.download(
            ticker,
            start=start_date,
            end=end_date,
            progress=False,
            auto_adjust=False,
        )

        if hist.empty:
            print(f"  {ticker}: no historical data")
            return 0

        # Flatten multi-level columns if present (yfinance sometimes returns MultiIndex)
        if isinstance(hist.columns, pd.MultiIndex):
            hist.columns = hist.columns.get_level_values(0)

        # 연속성 가드(이력 확장 모드): 백필 마지막 종가 vs 기존 최초 스냅샷가.
        # 20% 넘게 벌어지면 기업행위 소급 보정 계열 → 가짜 급등락을 심지 않도록 skip.
        # end_date 는 yfinance exclusive 종료일 = 기존 보유 구간의 첫날.
        # 재실행해도 자기 자신이 아니라 항상 기존 구간 첫 행과 비교된다.
        boundary = conn.execute(
            "SELECT price FROM daily_snapshots WHERE ticker=? AND price>0 AND date>=? ORDER BY date LIMIT 1",
            (ticker, end_date),
        ).fetchone()
        if boundary:
            last_close = float(hist["Close"].iloc[-1])
            gap = abs(boundary[0] - last_close) / last_close
            if gap > 0.2:
                print(f"  {ticker}: SKIP — 경계 불연속 {last_close:,.0f} → {boundary[0]:,.0f} ({gap:.0%})")
                return 0

        shares = fetch_shares_outstanding(ticker)

        rows_inserted = 0
        prev_close = None

        for date_idx in hist.index:
            date_str = date_idx.strftime("%Y-%m-%d")

            if valid_dates is not None and date_str not in valid_dates:
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
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--start",
        help="이력 확장 모드: 이 날짜(YYYY-MM-DD)부터 기존 최소 date 전날까지 전 티커 백필",
    )
    parser.add_argument(
        "--end",
        help="--start 와 함께 주면 구멍 메우기 모드: [start, end) 구간에 행이 없는 티커만 채운다",
    )
    args = parser.parse_args()
    if args.end and not args.start:
        parser.error("--end 는 --start 와 함께 써야 합니다")

    if not DB_PATH.exists():
        print(f"Error: Database not found at {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)

    existing_dates = get_existing_dates(conn)
    if not existing_dates:
        print("Error: No existing dates found in daily_snapshots")
        conn.close()
        sys.exit(1)

    if args.start and args.end:
        # 구멍 메우기: [start, end) 에 행이 하나도 없는 티커만
        start_date = args.start
        end_date_exclusive = args.end
        end_date = (
            datetime.strptime(args.end, "%Y-%m-%d") - timedelta(days=1)
        ).strftime("%Y-%m-%d")
        valid_dates = None
        tickers = get_tickers_to_backfill(conn, gap_window=(args.start, args.end))
    elif args.start:
        # 이력 확장: 기존 최소 date 전날까지(겹침 없음), 거래일 gate 없음, 전 티커
        if args.start >= existing_dates[0]:
            print(f"Error: --start must be earlier than {existing_dates[0]}")
            conn.close()
            sys.exit(1)
        start_date = args.start
        end_date_exclusive = existing_dates[0]  # yfinance end 는 exclusive
        end_date = (
            datetime.strptime(existing_dates[0], "%Y-%m-%d") - timedelta(days=1)
        ).strftime("%Y-%m-%d")
        valid_dates = None
        tickers = get_tickers_to_backfill(conn, all_tickers=True)
    else:
        start_date = existing_dates[0]
        end_date = existing_dates[-1]
        # yfinance end date is exclusive, add 1 day
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        end_date_exclusive = (end_dt + timedelta(days=1)).strftime("%Y-%m-%d")
        valid_dates = set(existing_dates)
        tickers = get_tickers_to_backfill(conn)

    print(f"Backfill started at {datetime.now().isoformat()}")
    print(f"Database: {DB_PATH}")
    gate = f"{len(valid_dates)} business days" if valid_dates is not None else "all trading days"
    print(f"Date range: {start_date} ~ {end_date} ({gate})")
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
