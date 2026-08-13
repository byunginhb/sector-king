#!/usr/bin/env python3
"""공모주(IPO) 캘린더 수집 — 38커뮤니케이션.

왜 여기(update_data.py 편승)인가:
  실적발표(earnings_calendar)와 같은 이유다. 커밋 SQLite(db-snapshot)가 SoT 이고
  런타임 write 가 필요 없는 자동수집 데이터라 Supabase 를 쓸 이유가 없다.
  경제지표(economic_events)만 어드민 CRUD 때문에 Supabase 에 있다.

왜 38커뮤니케이션인가:
  KRX KIND 의 공모기업현황 엔드포인트는 현재 404(페이지 오류)를 반환하고,
  DART OpenAPI 는 인증키 + 증권신고서 *본문* 파싱이 필요해 비용이 크다.
  38 은 청약일·공모가밴드·확정공모가·경쟁률·주간사가 한 표에 정규화돼 있다.

주의: 페이지 인코딩이 euc-kr 이다(UTF-8 로 읽으면 종목명이 전부 깨진다).
"""

import re
import sqlite3
import ssl
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser

KST = timezone(timedelta(hours=9))

BASE = "https://www.38.co.kr/html/fund/index.htm"
SUBSCRIPTION_URL = f"{BASE}?o=k"   # 공모주 청약일정
LISTING_URL = f"{BASE}?o=nw"       # 신규상장(상장일)
DETAIL_BASE = "https://www.38.co.kr/html/fund/"

# 종목명 앞에 붙는 공백/불릿 제거용.
_WS = re.compile(r"\s+")
_SUB_DATE = re.compile(r"^(\d{4})\.(\d{2})\.(\d{2})(?:\s*~\s*(?:(\d{4})\.)?(\d{2})\.(\d{2}))?$")
_LIST_DATE = re.compile(r"^(\d{4})/(\d{2})/(\d{2})$")


class _TableRows(HTMLParser):
    """<tr> 단위로 (셀 텍스트 목록, 첫 링크 href) 를 뽑는 최소 파서.

    38 페이지는 레이아웃용 table 이 중첩돼 있어 정규식으로 표를 통째로 떼어내면
    greedy 매칭이 어긋난다. 행 단위로만 훑으면 중첩과 무관하게 안정적이다.
    """

    def __init__(self):
        super().__init__()
        self.rows: list[tuple[list[str], str | None]] = []
        self._cur: list[str] | None = None
        self._cell: list[str] | None = None
        self._href: str | None = None

    def handle_starttag(self, tag, attrs):
        attr = dict(attrs)
        if tag == "tr":
            self._cur, self._href = [], None
        elif tag in ("td", "th"):
            self._cell = []
        elif tag == "a" and self._href is None and "href" in attr:
            self._href = attr["href"]

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self._cell is not None and self._cur is not None:
            text = _WS.sub(" ", "".join(self._cell)).replace("\xa0", " ").strip()
            self._cur.append(text)
            self._cell = None
        elif tag == "tr" and self._cur is not None:
            self.rows.append((self._cur, self._href))
            self._cur = None

    def handle_data(self, data):
        if self._cell is not None:
            self._cell.append(data)


def parse_subscription_dates(raw: str) -> tuple[str, str] | None:
    """'2026.09.16~09.17' → ('2026-09-16', '2026-09-17').

    종료일에는 연도가 없다. 시작일 연도를 물려주되, 그렇게 만든 종료일이 시작일보다
    앞서면 연말을 넘긴 청약(12.30~01.02)이므로 +1년 한다.
    단일 날짜('2026.09.16')면 시작=종료.
    """
    m = _SUB_DATE.match(raw.replace(" ", ""))
    if not m:
        return None
    y, mo, d, end_y, end_mo, end_d = m.groups()
    start = f"{y}-{mo}-{d}"
    if not end_mo:
        return start, start
    end = f"{end_y or y}-{end_mo}-{end_d}"
    if end < start:
        end = f"{int(end_y or y) + 1}-{end_mo}-{end_d}"
    return start, end


def _detail_url(href: str | None) -> str | None:
    """행의 상대 링크('./?o=v&no=2286&l=' 또는 '/html/fund/?o=v&no=…')를 절대 URL 로."""
    if not href:
        return None
    m = re.search(r"[?&]no=(\d+)", href)
    return f"{DETAIL_BASE}?o=v&no={m.group(1)}" if m else None


def _clean_name(raw: str) -> str:
    return raw.replace("\xa0", " ").strip()


def parse_subscription(html: str) -> list[dict]:
    """공모청약일정 표 → 이벤트 목록.

    열: 종목명 | 공모주일정 | 확정공모가 | 희망공모가 | 청약경쟁률 | 주간사
    """
    parser = _TableRows()
    parser.feed(html)
    events = []
    for cells, href in parser.rows:
        if len(cells) < 6:
            continue
        dates = parse_subscription_dates(cells[1])
        if not dates:
            continue
        start, end = dates
        events.append(
            {
                "name": _clean_name(cells[0]),
                "event_type": "subscription",
                "event_date": start,
                "end_date": end,
                "offer_price": _dash_to_none(cells[2]),
                "price_band": _dash_to_none(cells[3]),
                "competition": _dash_to_none(cells[4]),
                "underwriter": _dash_to_none(cells[5]),
                "detail_url": _detail_url(href),
            }
        )
    return events


def parse_listing(html: str) -> list[dict]:
    """신규상장 표 → 이벤트 목록. 열: 종목명 | 상장일 | 현재가 | 등락률 | 공모가 | …"""
    parser = _TableRows()
    parser.feed(html)
    events = []
    for cells, href in parser.rows:
        if len(cells) < 5:
            continue
        m = _LIST_DATE.match(cells[1].replace(" ", ""))
        if not m:
            continue
        y, mo, d = m.groups()
        events.append(
            {
                "name": _clean_name(cells[0]),
                "event_type": "listing",
                "event_date": f"{y}-{mo}-{d}",
                "end_date": None,
                "offer_price": _dash_to_none(cells[4]),
                "price_band": None,
                "competition": None,
                "underwriter": None,
                "detail_url": _detail_url(href),
            }
        )
    return events


def _dash_to_none(value: str) -> str | None:
    v = (value or "").strip()
    return None if v in ("", "-", "0") else v


def _ssl_context() -> ssl.SSLContext:
    """38 서버는 OpenSSL 3 기본 보안수준(SECLEVEL=2)이 거부하는 약한 키교환을 쓴다.

    기본 컨텍스트로는 SSLV3_ALERT_HANDSHAKE_FAILURE 로 즉사한다(curl 은 성공하는데
    파이썬만 실패하는 전형적인 증상). 인증서 검증·호스트명 확인은 그대로 두고
    암호군 보안수준만 1 로 낮춘다 — verify 를 끄는 것과는 다르다.
    """
    ctx = ssl.create_default_context()
    ctx.set_ciphers("DEFAULT@SECLEVEL=1")
    return ctx


def _fetch(url: str, attempts: int = 3) -> str:
    """38 서버는 간헐적으로 20초를 넘긴다(실측 3회 중 1회 timeout) — 짧게 재시도."""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; SectorKing/1.0)"})
    for i in range(attempts):
        try:
            with urllib.request.urlopen(req, timeout=20, context=_ssl_context()) as res:
                # euc-kr 고정. 깨진 바이트 하나로 전체 수집이 죽지 않게 replace.
                return res.read().decode("euc-kr", errors="replace")
        except Exception:
            if i == attempts - 1:
                raise
            time.sleep(2)
    raise RuntimeError("unreachable")


def fetch_ipo_events() -> list[dict]:
    """두 페이지를 긁어 이벤트 목록으로. 한 쪽이 실패해도 다른 쪽은 살린다."""
    events: list[dict] = []
    for idx, (url, parse) in enumerate(((SUBSCRIPTION_URL, parse_subscription), (LISTING_URL, parse_listing))):
        if idx:
            time.sleep(1)  # 연속 요청 간격(서버 배려)
        try:
            rows = parse(_fetch(url))
        except Exception as e:  # 네트워크/차단/구조변경
            print(f"  IPO fetch failed ({url}): {e}")
            continue
        if not rows:
            # 표 구조가 바뀌면 0건이 된다. 0건을 정상으로 취급하면 조용히 갱신이 멎는다.
            print(f"  Warning: no rows parsed from {url} (page structure changed?)")
        events.extend(rows)
    return events


def upsert_ipo_calendar(conn: sqlite3.Connection, events: list[dict]) -> int:
    """(name, event_type) 키로 UPSERT.

    PK 에 날짜를 넣지 않는 이유: 청약/상장일은 정정신고로 자주 밀린다. 날짜가 키면
    옛 날짜 행이 유령으로 남아 실적 캘린더가 겪은 문제를 그대로 반복한다.
    한 종목의 청약·상장은 각각 1회뿐이라 (name, event_type) 이면 충분하다.
    """
    now = datetime.now(KST).isoformat(timespec="seconds")
    for e in events:
        conn.execute(
            """
            INSERT INTO ipo_calendar
            (name, event_type, event_date, end_date, offer_price, price_band,
             competition, underwriter, detail_url, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(name, event_type) DO UPDATE SET
                event_date  = excluded.event_date,
                end_date    = excluded.end_date,
                offer_price = COALESCE(excluded.offer_price, ipo_calendar.offer_price),
                price_band  = COALESCE(excluded.price_band, ipo_calendar.price_band),
                competition = COALESCE(excluded.competition, ipo_calendar.competition),
                underwriter = COALESCE(excluded.underwriter, ipo_calendar.underwriter),
                detail_url  = COALESCE(excluded.detail_url, ipo_calendar.detail_url),
                updated_at  = excluded.updated_at
            """,
            (
                e["name"], e["event_type"], e["event_date"], e["end_date"],
                e["offer_price"], e["price_band"], e["competition"],
                e["underwriter"], e["detail_url"], now,
            ),
        )
    return len(events)


def sync_ipo_calendar(conn: sqlite3.Connection) -> int:
    """수집 → 적재. 실패해도 예외를 밖으로 던지지 않는다(주가 수집이 우선)."""
    try:
        events = fetch_ipo_events()
        if not events:
            print("IPO calendar: 0 events fetched — skipping upsert")
            return 0
        count = upsert_ipo_calendar(conn, events)
        print(f"IPO calendar: {count} events upserted")
        return count
    except Exception as e:
        print(f"Warning: IPO calendar sync failed: {e}")
        return 0


if __name__ == "__main__":
    # 날짜 파싱 self-check (가장 깨지기 쉬운 순수 로직).
    assert parse_subscription_dates("2026.09.16~09.17") == ("2026-09-16", "2026-09-17")
    assert parse_subscription_dates("2026.09.16") == ("2026-09-16", "2026-09-16")
    assert parse_subscription_dates("2026.12.30~01.02") == ("2026-12-30", "2027-01-02")
    assert parse_subscription_dates("2026.08.31 ~ 09.01") == ("2026-08-31", "2026-09-01")
    assert parse_subscription_dates("2026/09/16") is None
    assert parse_subscription_dates("") is None
    assert _detail_url("./?o=v&no=2286&l=") == f"{DETAIL_BASE}?o=v&no=2286"
    assert _detail_url(None) is None
    print("self-check OK")

    for e in fetch_ipo_events():
        print(e)
