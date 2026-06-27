#!/usr/bin/env python3
"""신규 편입 종목의 score_history 생성 — 단기 점수 모멘텀 복구.

배경:
    add_ticker.py 는 daily_snapshots(가격)만 과거까지 백필하고 score_history(점수 시계열)는
    당일 1행만 남긴다. 단기 점수의 모멘텀 컴포넌트는 score_history.smoothed_score 의 15거래일 Δ
    를 쓰므로(lib/ranking-score.ts MOMENTUM_LOOKBACK=15), 시계열이 1행뿐인 신규 종목은
    모멘텀=null → 가중치 재배분 → 52주 위치(거의 신고가)가 지배 → 단기 점수가 ~100 으로 붕괴하고
    "추세 데이터 짧음" 으로 표기된다.

해법:
    기존 종목과 동일한 score_history 날짜축(현재 3/30~6/26)에 신규 종목의 과거 점수를 생성한다.
    - scale: backfill_score_history.recompute_scale_for_date 로 날짜별 섹터 상대 scale 산출(엔진 동일).
    - growth/profitability/sentiment: 시점별 과거값이 없으므로 현재 company_scores 값을 상수로 사용.
      → 모멘텀은 smoothed 의 "Δ(차이)"만 쓰므로 상수 펀더멘털은 빼기에서 상쇄, Δ 는 가격/시총 추세만
        반영한다(근사 아닌 정확). 장기 점수는 company_scores 직접 사용이라 무영향.
    - EMA(α=0.3) 체인 후 INSERT. 마지막 날 값으로 company_scores 동기화 + 랭킹 갱신.

안전:
    - 기존 종목(score_history 충분)은 절대 건드리지 않는다. 대상은 행수 < THRESHOLD 인 신규 종목뿐.
    - 멱등: 1회 실행 후 신규 종목은 ~60행이 되어 THRESHOLD 초과 → 재실행 시 재대상 아님(no-op).

실행 전 백업: cp data/hegemony.db data/hegemony.db.bak.$(date +%s)
실행: .venv/bin/python scripts/backfill_new_ticker_score_history.py
"""

import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from scoring import EMA_ALPHA, update_sector_rankings  # noqa: E402
from backfill_score_history import (  # noqa: E402
    get_history_dates,
    recompute_scale_for_date,
)

DB_PATH = Path(__file__).parent.parent / "data" / "hegemony.db"

# 이 행수 미만이면 "신규 편입"으로 보고 대상에 포함(모멘텀 lookback 15 보다 넉넉히 위).
THRESHOLD = 20


def main() -> int:
    conn = sqlite3.connect(DB_PATH)
    try:
        targets = [
            r[0]
            for r in conn.execute(
                """
                SELECT c.ticker FROM companies c
                WHERE (SELECT COUNT(*) FROM score_history sh WHERE sh.ticker = c.ticker) < ?
                """,
                (THRESHOLD,),
            ).fetchall()
        ]
        if not targets:
            print("대상 신규 종목 없음 — 이미 모두 충분한 score_history 보유. no-op")
            return 0

        # 현재 펀더멘털(성장/수익성/심리)을 상수로 사용
        fund: dict[str, tuple[float, float, float]] = {}
        for t in targets:
            row = conn.execute(
                "SELECT growth_score, profitability_score, sentiment_score FROM company_scores WHERE ticker = ?",
                (t,),
            ).fetchone()
            g, p, s = (row or (0.0, 0.0, 0.0))
            fund[t] = (g or 0.0, p or 0.0, s or 0.0)

        dates = get_history_dates(conn)
        if not dates:
            print("score_history 날짜축이 비어 생성 불가")
            return 2
        print(f"대상 신규 종목 {len(targets)}개 · 날짜축 {len(dates)}일 ({dates[0]} ~ {dates[-1]})")

        prev_smoothed: dict[str, float] = {}
        inserted = 0
        for d in dates:
            scale_by_ticker = recompute_scale_for_date(conn, d)
            for t in targets:
                scale = scale_by_ticker.get(t)
                if scale is None:
                    # 그 날짜에 스냅샷/섹터 컨텍스트 없음 → 건너뜀(시계열 공백 허용)
                    continue
                g, p, s = fund[t]
                raw = scale + g + p + s
                prev = prev_smoothed.get(t)
                smoothed = raw if prev is None else EMA_ALPHA * raw + (1 - EMA_ALPHA) * prev
                prev_smoothed[t] = smoothed
                conn.execute(
                    """
                    INSERT OR REPLACE INTO score_history
                    (ticker, date, raw_total_score, smoothed_score, scale_score,
                     growth_score, profitability_score, sentiment_score)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (t, d, raw, smoothed, scale, g, p, s),
                )
                inserted += 1

        # 마지막 날 값으로 company_scores 동기화(대상 종목만)
        last = dates[-1]
        synced = 0
        for t in targets:
            row = conn.execute(
                "SELECT scale_score, raw_total_score, smoothed_score FROM score_history WHERE ticker = ? AND date = ?",
                (t, last),
            ).fetchone()
            if row:
                conn.execute(
                    """
                    UPDATE company_scores SET
                        scale_score = ?, raw_total_score = ?, smoothed_score = ?,
                        score_updated_at = datetime('now')
                    WHERE ticker = ?
                    """,
                    (row[0], row[1], row[2], t),
                )
                synced += 1

        conn.commit()
        update_sector_rankings(conn)
        conn.commit()

        # prod(Vercel readonly FS) 대비 delete 저널 모드 보장
        conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
        conn.execute("PRAGMA journal_mode=DELETE")

        # 사후 통계: 대상 종목 행수 분포
        min_rows = conn.execute(
            f"""
            SELECT MIN(cnt) FROM (
              SELECT (SELECT COUNT(*) FROM score_history sh WHERE sh.ticker = t.ticker) cnt
              FROM (SELECT ? AS ticker) t
            )
            """,
            (targets[0],),
        ).fetchone()[0]
        print("=" * 50)
        print(f"생성 완료: INSERT {inserted}행 · company_scores 동기화 {synced}개")
        print(f"예시 대상({targets[0]}) score_history 행수: {min_rows}")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
