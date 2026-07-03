#!/usr/bin/env python3
"""One-time backfill: fill forward_pe / price_to_book / ev_to_ebitda on each
ticker's most-recent daily_snapshots row from yfinance .info.

이 지표들은 .info 의 현재값만 제공되므로 과거 날짜는 소급 불가 — 최신 스냅샷만 채운다.
이후는 update_data.py 가 매일 자동 수집. 값이 없는 티커는 NULL 로 남는다(UI 가 null 처리).
"""

import sqlite3
import sys
import time
from pathlib import Path

import yfinance as yf

DB_PATH = Path(__file__).parent.parent / "data" / "hegemony.db"


def latest_snapshot_per_ticker(conn: sqlite3.Connection) -> list[tuple[str, str]]:
    """(ticker, max_date) for every ticker that has at least one snapshot."""
    cursor = conn.execute(
        """
        SELECT ticker, MAX(date) AS d
        FROM daily_snapshots
        WHERE ticker IS NOT NULL
        GROUP BY ticker
        ORDER BY ticker
        """
    )
    return [(row[0], row[1]) for row in cursor.fetchall()]


def main():
    if not DB_PATH.exists():
        print(f"Error: Database not found at {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    rows = latest_snapshot_per_ticker(conn)
    print(f"Backfilling valuation metrics for {len(rows)} tickers...")

    updated = filled = 0
    for i, (ticker, date) in enumerate(rows, 1):
        try:
            info = yf.Ticker(ticker).info or {}
        except Exception as e:  # noqa: BLE001 — 개별 티커 실패는 건너뛰고 계속
            print(f"  [{i}/{len(rows)}] {ticker}: fetch 실패 ({e})")
            continue

        fwd = info.get("forwardPE")
        pbr = info.get("priceToBook")
        ev = info.get("enterpriseToEbitda")

        conn.execute(
            """
            UPDATE daily_snapshots
            SET forward_pe = ?, price_to_book = ?, ev_to_ebitda = ?,
                updated_at = datetime('now')
            WHERE ticker = ? AND date = ?
            """,
            (fwd, pbr, ev, ticker, date),
        )
        updated += 1
        if fwd is not None or pbr is not None or ev is not None:
            filled += 1
        if i % 25 == 0:
            conn.commit()
            print(f"  [{i}/{len(rows)}] ... (filled={filled})")
        time.sleep(0.15)  # yfinance rate-limit 완화

    conn.commit()

    # 커밋되는 DB 는 DELETE journal 모드 유지 (Vercel readonly FS 500 방지)
    conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    conn.execute("PRAGMA journal_mode = DELETE")
    conn.close()

    for suffix in (".db-wal", ".db-shm"):
        p = DB_PATH.with_suffix(suffix)
        if p.exists():
            p.unlink()

    print(f"\nDone. Updated {updated} rows, {filled} with at least one metric.")


if __name__ == "__main__":
    main()
