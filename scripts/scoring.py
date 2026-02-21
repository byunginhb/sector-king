#!/usr/bin/env python3
"""Hegemony Score calculation engine.

4 dimensions, 100 points total:
- Scale (35): market cap share + volume ratio
- Growth (30): revenue growth + earnings growth
- Profitability (20): operating margin + ROE
- Sentiment (15): analyst recommendation + target upside

Uses EMA smoothing (alpha=0.3) for rank stability.
"""

import sqlite3
from datetime import datetime, timedelta

RECOMMENDATION_SCORES = {
    "strong_buy": 8,
    "buy": 6,
    "hold": 4,
    "underperform": 2,
    "sell": 1,
    "none": 4,
}

# Number of fundamental metric fields used for data quality calculation
FUNDAMENTAL_FIELDS = [
    "revenue_growth",
    "earnings_growth",
    "operating_margin",
    "return_on_equity",
    "recommendation_key",
    "analyst_count",
    "target_mean_price",
]

# IMPORTANT: These constants must stay in sync with lib/scoring-methodology.ts
EMA_ALPHA = 0.3
SCORE_HISTORY_RETENTION_DAYS = 90


def normalize(
    value: float | None, min_val: float, max_val: float, max_score: float
) -> float:
    """Normalize a value to [0, max_score] range with clamping."""
    if value is None:
        return max_score * 0.5
    if max_val == min_val:
        return max_score * 0.5
    clamped = max(min_val, min(max_val, value))
    return ((clamped - min_val) / (max_val - min_val)) * max_score


def calculate_scale_score(
    market_cap: int | None,
    volume: int | None,
    avg_volume: int | None,
    sector_total_market_cap: int,
) -> tuple[float, float]:
    """Calculate scale score (max 35 points).

    Returns (market_cap_share_score, volume_ratio_score).
    """
    # Market cap share (max 20 points)
    # 50%+ share = full score; linear scale below that
    if market_cap and sector_total_market_cap > 0:
        share = market_cap / sector_total_market_cap
        mc_score = min(share / 0.5, 1.0) * 20
    else:
        mc_score = 10.0

    # Volume ratio (max 15 points)
    if volume and avg_volume and avg_volume > 0:
        ratio = min(volume / avg_volume, 3.0)
        vol_score = (ratio / 3.0) * 15
    else:
        vol_score = 7.5

    return mc_score, vol_score


def calculate_growth_score(
    revenue_growth: float | None, earnings_growth: float | None
) -> tuple[float, float]:
    """Calculate growth score (max 30 points).

    Returns (revenue_growth_score, earnings_growth_score).
    """
    rev_score = normalize(revenue_growth, -0.5, 1.0, 15)
    earn_score = normalize(earnings_growth, -1.0, 2.0, 15)
    return rev_score, earn_score


def calculate_profitability_score(
    operating_margin: float | None, return_on_equity: float | None
) -> tuple[float, float]:
    """Calculate profitability score (max 20 points).

    Returns (operating_margin_score, roe_score).
    """
    om_score = normalize(operating_margin, -0.2, 0.5, 10)
    roe_score = normalize(return_on_equity, -0.2, 0.6, 10)
    return om_score, roe_score


def calculate_sentiment_score(
    recommendation_key: str | None,
    target_mean_price: float | None,
    current_price: float | None,
) -> tuple[float, float]:
    """Calculate sentiment score (max 15 points).

    Returns (recommendation_score, target_upside_score).
    """
    rec_key = (recommendation_key or "none").lower()
    rec_score = float(RECOMMENDATION_SCORES.get(rec_key, 4))

    if target_mean_price and current_price and current_price > 0:
        upside = (target_mean_price - current_price) / current_price
        upside_score = normalize(upside, -0.3, 0.6, 7)
    else:
        upside_score = 3.5

    return rec_score, upside_score


def calculate_data_quality(row: dict) -> float:
    """Calculate data quality as ratio of non-null fundamental fields."""
    available = sum(1 for f in FUNDAMENTAL_FIELDS if row.get(f) is not None)
    return available / len(FUNDAMENTAL_FIELDS)


def calculate_hegemony_scores(conn: sqlite3.Connection, target_date: str):
    """Calculate hegemony scores for all companies and update company_scores."""
    print("\n" + "=" * 50)
    print("Calculating hegemony scores...")

    # Get all sectors and their companies
    sectors = conn.execute("SELECT id FROM sectors").fetchall()

    all_scores = {}

    max_date = conn.execute("SELECT MAX(date) FROM daily_snapshots").fetchone()[0]
    if not max_date:
        print("No snapshot data available, skipping score calculation")
        return

    for (sector_id,) in sectors:
        companies = conn.execute(
            """
            SELECT sc.ticker, ds.market_cap, ds.volume, ds.avg_volume, ds.price,
                   cs.revenue_growth, cs.earnings_growth, cs.operating_margin,
                   cs.return_on_equity, cs.recommendation_key, cs.analyst_count,
                   cs.target_mean_price, cs.free_cashflow, cs.beta, cs.debt_to_equity
            FROM sector_companies sc
            LEFT JOIN (
                SELECT ticker, market_cap, volume, avg_volume, price
                FROM daily_snapshots
                WHERE date = ?
            ) ds ON sc.ticker = ds.ticker
            LEFT JOIN company_scores cs ON sc.ticker = cs.ticker
            WHERE sc.sector_id = ?
        """,
            (max_date, sector_id),
        ).fetchall()

        if not companies:
            continue

        col_names = [
            "ticker",
            "market_cap",
            "volume",
            "avg_volume",
            "price",
            "revenue_growth",
            "earnings_growth",
            "operating_margin",
            "return_on_equity",
            "recommendation_key",
            "analyst_count",
            "target_mean_price",
            "free_cashflow",
            "beta",
            "debt_to_equity",
        ]

        sector_total_mc = sum(
            (row[1] or 0) for row in companies
        )

        for row in companies:
            data = dict(zip(col_names, row))
            ticker = data["ticker"]

            mc_score, vol_score = calculate_scale_score(
                data["market_cap"],
                data["volume"],
                data["avg_volume"],
                sector_total_mc,
            )

            rev_score, earn_score = calculate_growth_score(
                data["revenue_growth"], data["earnings_growth"]
            )

            om_score, roe_score = calculate_profitability_score(
                data["operating_margin"], data["return_on_equity"]
            )

            rec_score, upside_score = calculate_sentiment_score(
                data["recommendation_key"],
                data["target_mean_price"],
                data["price"],
            )

            scale = mc_score + vol_score
            growth = rev_score + earn_score
            profitability = om_score + roe_score
            sentiment = rec_score + upside_score
            raw_total = scale + growth + profitability + sentiment

            dq = calculate_data_quality(data)

            # A ticker can appear in multiple sectors.
            # Keep the highest score (best sector context).
            if ticker not in all_scores or raw_total > all_scores[ticker]["raw_total"]:
                all_scores[ticker] = {
                    "scale": scale,
                    "growth": growth,
                    "profitability": profitability,
                    "sentiment": sentiment,
                    "raw_total": raw_total,
                    "data_quality": dq,
                }

    # Apply EMA smoothing and update DB
    updated = 0
    for ticker, scores in all_scores.items():
        prev = conn.execute(
            "SELECT smoothed_score FROM company_scores WHERE ticker = ?", (ticker,)
        ).fetchone()

        prev_smoothed = prev[0] if prev and prev[0] is not None else scores["raw_total"]
        smoothed = EMA_ALPHA * scores["raw_total"] + (1 - EMA_ALPHA) * prev_smoothed

        conn.execute(
            """
            UPDATE company_scores SET
                scale_score = ?,
                growth_score = ?,
                profitability_score = ?,
                sentiment_score = ?,
                raw_total_score = ?,
                smoothed_score = ?,
                data_quality = ?,
                score_updated_at = datetime('now')
            WHERE ticker = ?
        """,
            (
                scores["scale"],
                scores["growth"],
                scores["profitability"],
                scores["sentiment"],
                scores["raw_total"],
                smoothed,
                scores["data_quality"],
                ticker,
            ),
        )

        # Record history
        conn.execute(
            """
            INSERT OR REPLACE INTO score_history
            (ticker, date, raw_total_score, smoothed_score,
             scale_score, growth_score, profitability_score, sentiment_score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                ticker,
                target_date,
                scores["raw_total"],
                smoothed,
                scores["scale"],
                scores["growth"],
                scores["profitability"],
                scores["sentiment"],
            ),
        )

        updated += 1

    # Cleanup old history (retain 90 days)
    cutoff = (
        datetime.now() - timedelta(days=SCORE_HISTORY_RETENTION_DAYS)
    ).strftime("%Y-%m-%d")
    conn.execute("DELETE FROM score_history WHERE date < ?", (cutoff,))

    print(f"Calculated scores for {updated} companies")


def update_sector_rankings(conn: sqlite3.Connection):
    """Update sector company rankings based on smoothed hegemony score.

    Ranks are assigned strictly by score order (descending).
    Falls back to market cap if no scores exist yet.
    EMA smoothing on scores already prevents volatile rank changes.
    """
    print("\n" + "=" * 50)
    print("Updating sector rankings...")

    sectors = conn.execute("SELECT id, name FROM sectors").fetchall()

    updated_sectors = 0

    for sector_id, sector_name in sectors:
        companies = conn.execute(
            """
            SELECT sc.ticker, sc.rank as old_rank,
                   COALESCE(cs.smoothed_score, 0) as score,
                   COALESCE(ds.market_cap, 0) as mc
            FROM sector_companies sc
            LEFT JOIN company_scores cs ON sc.ticker = cs.ticker
            LEFT JOIN (
                SELECT ticker, market_cap
                FROM daily_snapshots
                WHERE date = (SELECT MAX(date) FROM daily_snapshots)
            ) ds ON sc.ticker = ds.ticker
            WHERE sc.sector_id = ?
            ORDER BY score DESC, mc DESC
        """,
            (sector_id,),
        ).fetchall()

        if not companies:
            continue

        # Build new ranking (score-ordered)
        new_ranking = [
            (row[0], i + 1, row[1])  # (ticker, new_rank, old_rank)
            for i, row in enumerate(companies)
        ]

        # Check if any rank actually changed
        any_change = any(new_rank != old_rank for _, new_rank, old_rank in new_ranking)
        if not any_change:
            continue

        # Apply all rank changes
        for ticker, new_rank, old_rank in new_ranking:
            if new_rank != old_rank:
                conn.execute(
                    "UPDATE sector_companies SET rank = ? WHERE sector_id = ? AND ticker = ?",
                    (new_rank, sector_id, ticker),
                )

        updated_sectors += 1
        print(f"  {sector_name}: rankings updated")

    print(f"Updated rankings in {updated_sectors} sectors")
