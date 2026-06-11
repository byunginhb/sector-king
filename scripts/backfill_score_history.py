#!/usr/bin/env python3
"""score_history backfill — 혼합통화 수정(A1) 반영 재계산.

배경 (09_accuracy_audit A2):
    scoring.py 의 sector_total_mc/weighted_mc 가 native 통화를 그대로 합산하던 버그(X1)를
    USD 환산으로 고쳤다(A1). 그러나 score_history 에 이미 저장된 과거 일자들은 옛(잘못된)
    scale_score 로 계산돼 있어, 수정 당일에만 점프(계단)가 생긴다. 이를 없애기 위해
    과거 전 일자를 올바른 산식으로 재계산하고 EMA(α=0.3) 체인을 처음부터 다시 돌린다.

산식 (scoring.py 와 동일 — 함수 재사용):
    각 (ticker, date):
      1) 당시 daily_snapshots(market_cap→to_usd, volume/avg_volume) + sector_companies
         revenue_weight·소속으로 scoring.compute_sector_company_scores() 를 섹터별 실행 →
         원본 엔진과 동일하게 raw_total 최대 섹터를 택해 그 섹터의 scale 컴포넌트를 취함.
      2) 저장된 growth/profitability/sentiment_score(원래 펀더멘털 시점 반영)는 그대로 두고
         새 scale 과 합산해 raw_total_score 를 갱신.
      3) 날짜 오름차순으로 EMA: smoothed = α·raw + (1-α)·prev_smoothed,
         초기값 prev_smoothed = 첫 raw_total.
    마지막 날 값으로 company_scores.scale_score/raw_total_score/smoothed_score 동기화 후
    update_sector_rankings 재실행.

결측 폴백:
    scoring.py 의 기존 규칙 그대로(market_cap NULL → mc_score=10.0, volume/avg_volume 결측 →
    vol_score=7.5). 과거 입력이 구조적으로 부족(스냅샷 자체 없음)하면 scale 폴백으로 흡수.

실행 순서 (반드시 준수):
    1) cp data/hegemony.db data/hegemony.db.bak.<ts>      # 백업
    2) pnpm tsx scripts/migrate-clean-weekend-rows.ts     # 주말행 제거 (선행 필수 —
       주말 carry-forward 행이 남으면 EMA 체인에 잡음 1틱이 섞임)
    3) .venv/bin/python scripts/backfill_score_history.py # 본 스크립트
    4) pnpm db:verify:accuracy                            # 사후 검증(주말 0·EMA 정합)

폴백(forward-only):
    입력이 신뢰 불가할 만큼 부족하다고 판단되면 backfill 을 중단·롤백하고 종료코드 2 로
    빠져나간다(오케스트레이터가 forward-only=오늘부터만 정상 산식으로 폴백).

실행 전 백업 필수:
    cp data/hegemony.db data/hegemony.db.bak.audit.$(date +%s)
실행: pnpm db:backfill:score-history   (또는 .venv/bin/python scripts/backfill_score_history.py)
"""

import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from scoring import (  # noqa: E402
    EMA_ALPHA,
    compute_sector_company_scores,
    fetch_sector_companies,
    update_sector_rankings,
)

DB_PATH = Path(__file__).parent.parent / "data" / "hegemony.db"

# backfill 신뢰 가능 최소 기준 — 스냅샷 매칭률이 이 값 미만이면 forward-only 폴백.
MIN_SNAPSHOT_COVERAGE = 0.5


def get_history_dates(conn: sqlite3.Connection) -> list[str]:
    """score_history 의 distinct 날짜를 오름차순으로 반환."""
    rows = conn.execute(
        "SELECT DISTINCT date FROM score_history ORDER BY date ASC"
    ).fetchall()
    return [r[0] for r in rows]


def assess_coverage(conn: sqlite3.Connection) -> float:
    """score_history 행 중 같은 (ticker,date) 스냅샷이 존재하는 비율."""
    total = conn.execute("SELECT COUNT(*) FROM score_history").fetchone()[0]
    if total == 0:
        return 0.0
    matched = conn.execute(
        """
        SELECT COUNT(*) FROM score_history sh
        JOIN daily_snapshots ds ON ds.ticker = sh.ticker AND ds.date = sh.date
        """
    ).fetchone()[0]
    return matched / total


def recompute_scale_for_date(conn: sqlite3.Connection, snapshot_date: str) -> dict:
    """해당 날짜 스냅샷으로 전 섹터 점수를 계산, ticker→winning sector 의 scale 을 반환.

    원본 엔진과 동일하게 raw_total 최대 섹터를 채택한다(scale 만 추출해 사용).
    """
    sectors = conn.execute("SELECT id FROM sectors").fetchall()
    best: dict = {}  # ticker -> {"scale": float, "raw_total": float}

    for (sector_id,) in sectors:
        companies = fetch_sector_companies(conn, sector_id, snapshot_date)
        if not companies:
            continue
        sector_scores = compute_sector_company_scores(companies)
        for ticker, s in sector_scores.items():
            if ticker not in best or s["raw_total"] > best[ticker]["raw_total"]:
                best[ticker] = {"scale": s["scale"], "raw_total": s["raw_total"]}

    return {t: v["scale"] for t, v in best.items()}


def backfill(conn: sqlite3.Connection) -> dict:
    """score_history 전 일자 재계산 + EMA 체인 재실행. 통계 dict 반환."""
    dates = get_history_dates(conn)
    if not dates:
        raise RuntimeError("score_history 가 비어 backfill 대상이 없음")

    coverage = assess_coverage(conn)
    print(f"스냅샷 매칭 커버리지: {coverage:.1%} (임계 {MIN_SNAPSHOT_COVERAGE:.0%})")
    if coverage < MIN_SNAPSHOT_COVERAGE:
        raise RuntimeError(
            f"커버리지 {coverage:.1%} < {MIN_SNAPSHOT_COVERAGE:.0%} — 입력 부족, forward-only 폴백 권고"
        )

    print(f"재계산 대상: {len(dates)}일 ({dates[0]} ~ {dates[-1]})")

    # EMA 상태: ticker -> prev_smoothed
    prev_smoothed: dict[str, float] = {}
    rows_updated = 0
    scale_changed = 0

    for d in dates:
        scale_by_ticker = recompute_scale_for_date(conn, d)

        # 이 날짜의 기존 score_history 행(저장된 growth/profit/sentiment 보존)
        existing = conn.execute(
            """
            SELECT ticker, scale_score, growth_score, profitability_score, sentiment_score
            FROM score_history WHERE date = ?
            """,
            (d,),
        ).fetchall()

        for ticker, old_scale, growth, profit, sentiment in existing:
            new_scale = scale_by_ticker.get(ticker)
            if new_scale is None:
                # 해당 날짜에 섹터/스냅샷 컨텍스트가 없으면 기존 scale 유지(결측 폴백).
                new_scale = old_scale if old_scale is not None else 0.0
            else:
                if old_scale is None or abs(new_scale - old_scale) > 1e-9:
                    scale_changed += 1

            growth = growth or 0.0
            profit = profit or 0.0
            sentiment = sentiment or 0.0
            raw_total = new_scale + growth + profit + sentiment

            prev = prev_smoothed.get(ticker)
            if prev is None:
                smoothed = raw_total  # 체인 시작: 첫 raw = smoothed
            else:
                smoothed = EMA_ALPHA * raw_total + (1 - EMA_ALPHA) * prev
            prev_smoothed[ticker] = smoothed

            conn.execute(
                """
                UPDATE score_history SET
                    scale_score = ?,
                    raw_total_score = ?,
                    smoothed_score = ?
                WHERE ticker = ? AND date = ?
                """,
                (new_scale, raw_total, smoothed, ticker, d),
            )
            rows_updated += 1

    last_date = dates[-1]
    # company_scores 를 마지막 날 값으로 동기화
    synced = conn.execute(
        """
        UPDATE company_scores AS cs SET
            scale_score = sh.scale_score,
            raw_total_score = sh.raw_total_score,
            smoothed_score = sh.smoothed_score,
            score_updated_at = datetime('now')
        FROM (SELECT ticker, scale_score, raw_total_score, smoothed_score
              FROM score_history WHERE date = ?) AS sh
        WHERE cs.ticker = sh.ticker
        """,
        (last_date,),
    ).rowcount

    return {
        "dates": len(dates),
        "first": dates[0],
        "last": last_date,
        "rows_updated": rows_updated,
        "scale_changed": scale_changed,
        "company_scores_synced": synced,
        "coverage": coverage,
    }


def main() -> None:
    if not DB_PATH.exists():
        print(f"Error: Database not found at {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")

    print("=" * 60)
    print("score_history backfill 시작 (혼합통화 수정 반영)")
    print("=" * 60)

    try:
        stats = backfill(conn)
    except RuntimeError as e:
        conn.rollback()
        conn.close()
        print(f"\n[FALLBACK] backfill 중단·롤백: {e}")
        print("forward-only 폴백: 다음 update_data 실행부터 정상 산식 적용됨.")
        sys.exit(2)
    except Exception as e:
        conn.rollback()
        conn.close()
        print(f"\nError: backfill 실패(롤백): {e}")
        sys.exit(1)

    conn.commit()

    print("\nupdate_sector_rankings 재실행...")
    try:
        update_sector_rankings(conn)
        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        print(f"Error: rank 재계산 실패(롤백): {e}")
        sys.exit(1)

    conn.close()

    print("\n" + "=" * 60)
    print("backfill 완료")
    print(f"  재계산 일수      : {stats['dates']} ({stats['first']} ~ {stats['last']})")
    print(f"  갱신 행수        : {stats['rows_updated']}")
    print(f"  scale 변동 행수  : {stats['scale_changed']}")
    print(f"  company_scores 동기화: {stats['company_scores_synced']}")
    print(f"  스냅샷 커버리지  : {stats['coverage']:.1%}")
    print("=" * 60)


if __name__ == "__main__":
    main()
