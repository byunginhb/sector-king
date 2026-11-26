"""Fail-closed public-source checks for automatic Korean sector matches."""

import gzip
import hashlib
import html
import json
import math
import re
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import holidays

KST = ZoneInfo('Asia/Seoul')
CALENDAR_SOURCE = 'https://global.krx.co.kr/contents/GLB/06/0602/0602020204/GLB0602020204T1.jsp'
BOARD_URL = 'https://open.krx.co.kr/contents/OPN/99/OPN99000001.jspx'
KIND_URL = 'https://kind.krx.co.kr/disclosure/searchdisclosurebycorp.do'
DART_URL = 'https://dart.fss.or.kr/dsab001/search.ax'
HALTS_URL = 'https://kind.krx.co.kr/investwarn/tradinghaltissue.do'
PAGE_SIZE = 100
MAX_PAGES = 20
LOOKBACK_DAYS = 366
RISK = re.compile(r'주식분할|주식병합|주권병합|주권분할|회사분할|분할합병|회사합병|합병결정|합병계약|감자|무상증자|유상증자|상장폐지|정리매매|주권매매거래정지|매매거래정지|주식교환|주식이전|변경상장')
MARKET = re.compile(r'휴장|거래시간|시장\s*운영|거래중단|임시휴업')
EVENT_LABEL = re.compile(r'합병기일|분할기일|(?:주식)?교환[ㆍ·]이전일자|주식교환일|주식이전일|신주배정기준일|감자기준일|신주상장예정일|변경상장일|상장일|납입일|매매거래정지기간|매매거래정지\s*예정기간|매매거래정지일|상장폐지일|정리매매기간|효력발생일')
FULL_DATE = re.compile(r'(20\d{2})\s*[년./-]\s*(\d{1,2})\s*[월./-]\s*(\d{1,2})\s*일?')


def fetch(url, data=None):
    request = urllib.request.Request(url, data=data, headers={'User-Agent': 'SectorKing/weekly-match-review'})
    with urllib.request.urlopen(request, timeout=20) as response:
        body = response.read(2_000_001)
    if len(body) > 2_000_000:
        raise ValueError('SOURCE_TOO_LARGE')
    return body


def plain(value):
    value = re.sub(r'<(script|style)\b.*?</\1>', '', value, flags=re.I | re.S)
    return ' '.join(html.unescape(re.sub(r'<[^>]+>', ' ', value)).split())


def _decode(body):
    try:
        return body.decode('utf-8')
    except UnicodeDecodeError:
        return body.decode('euc-kr')


def _rows(text):
    return re.findall(r'<tr\b[^>]*>.*?</tr>', text, re.S | re.I)


def _document_text(document):
    rows = [[plain(cell) for cell in re.findall(r'<td\b[^>]*>(.*?)</td>', row, re.S | re.I)] for row in _rows(document)]
    fields, found = [], False
    for index, cells in enumerate(rows):
        if not cells:
            continue
        label = re.sub(r'^\d+[.)]\s*', '', cells[0])
        if not EVENT_LABEL.fullmatch(label):
            continue
        found = True
        value = ' '.join(cells[1:])
        if '기간' in label:
            next_row = rows[index + 1] if index + 1 < len(rows) else []
            if len(cells) == 3 and cells[1] == '시작일' and len(next_row) == 2 and next_row[0] == '종료일':
                if cells[2] == '-' and next_row[1] == '-':
                    continue
                value += ' ' + ' '.join(next_row)
        elif cells[1:] == ['-']:
            continue
        fields.append(label + ' ' + value)
    return '\n'.join(fields) if found else plain(document)


def _page_count(total):
    pages = max(1, math.ceil(total / PAGE_SIZE))
    if pages > MAX_PAGES:
        raise ValueError('SOURCE_PAGE_LIMIT')
    return pages


def parse_dart_page(text, page, issuer=None):
    if '공시서류검색 목록' not in text:
        raise ValueError('DART_STRUCTURE_CHANGED')
    clean = plain(text)
    footer = re.search(r'\[(\d+)/(\d+)\]\s*\[총\s*([\d,]+)건\]', clean)
    if not footer:
        if page == 1 and '조회 결과가 없습니다.' in clean and not re.search(r'id="r_\d+"', text):
            return [], 0, 1
        raise ValueError('DART_COUNT_MISSING')
    actual_page, pages, total = (int(value.replace(',', '')) for value in footer.groups())
    if actual_page != page or pages != _page_count(total):
        raise ValueError('DART_PAGE_MISMATCH')
    found = []
    for row in _rows(text):
        report = re.search(r'id="r_(\d{14})"[^>]*>(.*?)</a>', row, re.S)
        if not report:
            continue
        if issuer and not re.search(r"openCorpInfoNew\('" + re.escape(issuer) + r"'", row):
            raise ValueError('DART_ISSUER_MISMATCH')
        stamp = re.search(r'<td[^>]*>\s*(\d{4}\.\d{2}\.\d{2})\s*</td>', row)
        if not stamp:
            raise ValueError('DART_DATE_MISSING')
        found.append({'id': report[1], 'title': plain(report[2]), 'date': stamp[1].replace('.', '-'),
                      'url': 'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=' + report[1]})
    expected = min(PAGE_SIZE, total - PAGE_SIZE * (page - 1))
    if len(found) != expected or len({row['id'] for row in found}) != len(found):
        raise ValueError('DART_ROWS_INCOMPLETE')
    return found, total, pages


def _kind_footer(text, page):
    if '<caption>목록</caption>' not in text:
        raise ValueError('KIND_STRUCTURE_CHANGED')
    footer = re.search(r'전체\s*([\d,]+)\s*건\s*:\s*(\d+)\s*/\s*(\d+)', plain(text))
    if not footer:
        raise ValueError('KIND_COUNT_MISSING')
    total, actual_page, pages = (int(value.replace(',', '')) for value in footer.groups())
    if actual_page != page or pages != _page_count(total):
        raise ValueError('KIND_PAGE_MISMATCH')
    return total, pages


def parse_kind_page(text, page, code=None):
    total, pages = _kind_footer(text, page)
    found = []
    for row in _rows(text):
        disclosure = re.search(r"openDisclsViewer\('([0-9]{14})'.*?title=['\"]([^'\"]+)['\"]", row, re.S)
        if not disclosure:
            continue
        if code and not re.search(r"companysummary_open\('" + re.escape(code[:5]) + r"'\)", row):
            raise ValueError('KIND_ISSUER_MISMATCH')
        stamp = re.search(r'\b(20\d{2}-\d{2}-\d{2})\b', plain(row))
        if not stamp:
            raise ValueError('KIND_DATE_MISSING')
        found.append({'id': disclosure[1], 'title': html.unescape(disclosure[2]), 'date': stamp[1],
                      'url': 'https://kind.krx.co.kr/common/disclsviewer.do?method=search&acptno=' + disclosure[1]})
    expected = min(PAGE_SIZE, total - PAGE_SIZE * (page - 1))
    if len(found) != expected or len({row['id'] for row in found}) != len(found):
        raise ValueError('KIND_ROWS_INCOMPLETE')
    return found, total, pages


def parse_notice_page(raw, page):
    if not isinstance(raw, dict) or not isinstance(raw.get('output'), list):
        raise ValueError('KRX_STRUCTURE_CHANGED')
    rows = raw['output']
    if not rows:
        if page == 1:
            return [], 0, 1
        raise ValueError('KRX_PAGE_MISSING')
    total = int(rows[0]['totCnt'])
    pages = _page_count(total)
    expected = list(range((page - 1) * PAGE_SIZE + 1, min(page * PAGE_SIZE, total) + 1))
    if ([int(row['rn']) for row in rows] != expected
            or any(int(row['totCnt']) != total for row in rows)
            or len({row['noti_no'] for row in rows}) != len(rows)):
        raise ValueError('KRX_ROWS_INCOMPLETE')
    for row in rows:
        if not isinstance(row.get('title'), str) or not isinstance(row.get('noti_dd'), str):
            raise ValueError('KRX_NOTICE_INVALID')
    return rows, total, pages


def check_calendar(round_data):
    base, end = (date.fromisoformat(round_data[key]) for key in ('baseDate', 'endDate'))
    cutoff = datetime.fromisoformat(round_data['closesAt'].replace('Z', '+00:00'))
    if cutoff.tzinfo is None or base >= end or (end - base).days > 14:
        raise ValueError('ROUND_DATES_INVALID')
    cutoff = cutoff.astimezone(KST).date()
    if not base < cutoff < end:
        raise ValueError('ROUND_CUTOFF_INVALID')
    calendar = holidays.financial_holidays('XKRX', years=range(base.year, end.year + 1), observed=True)
    dates = [base] + [cutoff + timedelta(days=offset) for offset in range((end - cutoff).days + 1)]
    return [f'HOLIDAY:{day.isoformat()}:{calendar.get(day, "weekend")}' for day in dates
            if day.weekday() >= 5 or day in calendar]


def _dates(value):
    found = []
    for match in FULL_DATE.finditer(value):
        found.append(date(*(int(part) for part in match.groups())))
    return found


def risk_reason(title, text, round_data, published):
    if re.search(r'주식선물|파생상품|야간시장|자회사', title):
        return None
    base, end = (date.fromisoformat(round_data[key]) for key in ('baseDate', 'endDate'))
    if MARKET.search(title) and re.search(r'시장|증권', title):
        dates = _dates(title + ' ' + text)
        if not dates and re.search(r'Circuit\s*Breakers?|서킷브레이커|사이드카', title, re.I) and re.search(r'발동|해제', title):
            dates = [published]
        if not dates:
            for month, day in re.findall(r'(?<!\d)(\d{1,2})\s*[./월]\s*(\d{1,2})\s*일?(?!\d)', title):
                month, day = int(month), int(day)
                year = published.year + (month + 6 < published.month)
                if 1 <= month <= 12 and 1 <= day <= 31:
                    dates.append(date(year, month, day))
        if not dates:
            return 'AMBIGUOUS_MARKET_NOTICE'
        if min(dates) <= end and max(dates) >= base:
            return 'MARKET_NOTICE'
        return None
    if not RISK.search(title):
        return None
    if '상장' in title:
        core_label = r'상장일|상장예정일|상장폐지일|정리매매기간'
    elif '합병' in title or '분할' in title or '병합' in title:
        core_label = r'합병기일|분할기일|효력발생일|매매거래정지|상장일'
    elif '교환' in title or '이전' in title:
        core_label = r'교환|이전'
    elif '감자' in title:
        core_label = r'감자기준일|효력발생일|상장일|매매거래정지'
    elif '증자' in title:
        core_label = r'신주배정기준일|납입일|상장일|상장예정일'
    else:
        core_label = r'매매거래정지|정리매매기간'
    dates = []
    core_found = False
    for match in EVENT_LABEL.finditer(text):
        value = text[match.end():match.end() + 130]
        prefix = r'(?:\s|[:：~∼〜()\-]|예정|시작일|종료일|시작|종료)*'
        first = re.match(prefix + FULL_DATE.pattern, value)
        if not first:
            return 'AMBIGUOUS_CORPORATE_ACTION'
        beginning = _dates(first[0])[0]
        core_found = core_found or bool(re.search(core_label, match[0]))
        if '기간' in match[0]:
            last = re.match(r'(?:부터)?' + prefix + FULL_DATE.pattern, value[first.end():])
            if not last:
                return 'AMBIGUOUS_CORPORATE_ACTION'
            ending = _dates(last[0])[0]
            if ending < beginning:
                return 'AMBIGUOUS_CORPORATE_ACTION'
            dates.extend([beginning, ending])
        else:
            dates.append(beginning)
    if not dates or not core_found:
        return 'AMBIGUOUS_CORPORATE_ACTION'
    return 'CORPORATE_ACTION' if min(dates) <= end and max(dates) >= base else None


def _all_pages(read, url, params, parser, label, field):
    result, seen, expected_total, pages, page = [], set(), None, 1, 1
    while page <= pages:
        body = read(url, {**params, field: str(page)}, f'{label}-{page}')
        rows, total, current_pages = parser(_decode(body), page)
        if expected_total is not None and total != expected_total:
            raise ValueError('SOURCE_COUNT_CHANGED')
        expected_total, pages = total, current_pages
        for row in rows:
            if row['id'] in seen:
                raise ValueError('SOURCE_DUPLICATE_PAGE')
            seen.add(row['id'])
        result.extend(rows)
        page += 1
    if len(result) != expected_total:
        raise ValueError('SOURCE_ROWS_INCOMPLETE')
    return result


def _dart_document(read, row):
    source = _decode(read(row['url'], None, 'dart-document'))
    literal = re.search(r'viewDoc\("(\d+)", "(\d+)", "(\d+)", "(\d+)", "(\d+)", "([^"]+)"', source)
    if literal:
        query = dict(zip(['rcpNo', 'dcmNo', 'eleId', 'offset', 'length', 'dtd'], literal.groups()))
    else:
        nodes = re.findall(r'var node1 = \{\};(.*?)treeData.push\(node1\);', source, re.S)
        if not nodes:
            raise ValueError('DART_DOCUMENT_UNAVAILABLE')
        query = {}
        for key in ['rcpNo', 'dcmNo', 'eleId', 'offset', 'length', 'dtd']:
            match = re.search(r"node1\['" + key + r"'\] = \"([^\"]*)\"", nodes[-1])
            if not match:
                raise ValueError('DART_DOCUMENT_STRUCTURE_CHANGED')
            query[key] = match[1]
    if query['rcpNo'] != row['id']:
        raise ValueError('DART_DOCUMENT_ID_MISMATCH')
    url = 'https://dart.fss.or.kr/report/viewer.do?' + urllib.parse.urlencode(query)
    document = read(url, None, 'dart-body')
    if len(document) < 500:
        raise ValueError('DART_DOCUMENT_INCOMPLETE')
    return _document_text(_decode(document))


def _kind_document(read, row, code):
    viewer = _decode(read(row['url'], None, 'kind-viewer'))
    header = re.search(r'<h1\b[^>]*>(.*?)</h1>', viewer, re.S)
    if not header or f'({code})' not in plain(header[1]):
        raise ValueError('KIND_DOCUMENT_ISSUER_MISMATCH')
    selector = re.search(r'<select\b[^>]*id=[\'"]mainDoc[\'"][^>]*>(.*?)</select>', viewer, re.S)
    if not selector:
        raise ValueError('KIND_DOCUMENT_SELECTOR_MISSING')
    options = re.findall(r'<option\b([^>]*)>', selector[1])
    current = [option for option in options if re.search(r'value=[\'"][0-9]{14}\|Y[\'"]', option)]
    if len(current) != 1:
        raise ValueError('KIND_DOCUMENT_SELECTION_AMBIGUOUS')
    # KIND can select an obsolete original (N); Y identifies the current correction.
    document = re.search(r'value=[\'"]([0-9]{14})\|Y[\'"]', current[0])
    if not document:
        raise ValueError('KIND_DOCUMENT_ID_MISSING')
    contents_url = 'https://kind.krx.co.kr/common/disclsviewer.do?method=searchContents&docNo=' + document[1]
    contents = _decode(read(contents_url, None, 'kind-contents'))
    paths = re.findall(r"parent\.setPath\([^,]*,\s*['\"]([^'\"]+)['\"]", contents)
    if len(paths) != 1:
        raise ValueError('KIND_DOCUMENT_PATH_MISSING')
    parsed = urllib.parse.urlsplit(paths[0])
    if parsed.scheme != 'https' or parsed.netloc != 'kind.krx.co.kr' or not parsed.path.startswith('/external/'):
        raise ValueError('KIND_DOCUMENT_PATH_UNTRUSTED')
    body = read(paths[0], None, 'kind-body')
    if len(body) < 500:
        raise ValueError('KIND_DOCUMENT_INCOMPLETE')
    return _document_text(_decode(body))


def review_round(round_data, directory, now=None):
    directory = Path(directory)
    now = now or datetime.now(timezone.utc)
    checked_at = now.astimezone(timezone.utc).isoformat() if now.tzinfo else now.isoformat()
    report = {'approved': False, 'checkedAt': checked_at, 'calendarSource': CALENDAR_SOURCE,
              'reasons': [], 'sources': [], 'disclosureLookbackDays': LOOKBACK_DAYS}
    directory.mkdir(parents=True, exist_ok=True)
    if (directory / 'review.json').exists():
        return {**report, 'reasons': ['AUDIT_ALREADY_EXISTS']}

    def read(url, params, label):
        data = urllib.parse.urlencode(params).encode() if params is not None else None
        body = fetch(url, data)
        if not isinstance(body, bytes) or len(body) > 2_000_000:
            raise ValueError('SOURCE_TOO_LARGE')
        filename = f'{len(report["sources"]):03d}-{label}.body.gz'
        with (directory / filename).open('xb') as stream:
            stream.write(gzip.compress(body, mtime=0))
        report['sources'].append({'url': url, 'params': params, 'retrievedAt': datetime.now(timezone.utc).isoformat(),
                                  'sha256': hashlib.sha256(body).hexdigest(), 'file': filename, 'bytes': len(body)})
        return body

    try:
        if now.tzinfo is None:
            raise ValueError('TIMEZONE_REQUIRED')
        today = now.astimezone(KST).date()
        report['reasons'].extend(check_calendar(round_data))
        quotes = round_data['left']['tickers'] + round_data['right']['tickers']
        if not quotes or len({quote['ticker'] for quote in quotes}) != len(quotes):
            raise ValueError('INVALID_UNIVERSE')
        if any(not re.fullmatch(r'[0-9]{6}\.KS', quote['ticker']) or not quote.get('name') for quote in quotes):
            raise ValueError('UNSUPPORTED_UNIVERSE')
        if report['reasons']:
            with (directory / 'review.json').open('x', encoding='utf-8') as stream:
                json.dump(report, stream, ensure_ascii=False, indent=2, allow_nan=False)
                stream.write('\n')
            return report
        start = min(date.fromisoformat(round_data['baseDate']), today) - timedelta(days=LOOKBACK_DAYS)
        page, pages, notices, expected_total = 1, 1, [], None
        while page <= pages:
            params = {'bld': 'OPN/05/05000000/opn05000000t1_01', 'sch_tp': 'title', 'sch_word': '',
                      'fromdate': start.strftime('%Y%m%d'), 'todate': today.strftime('%Y%m%d'),
                      'pagePath': '/contents/OPN/05/05000000/OPN05000000T1.jsp', 'pageSize': str(PAGE_SIZE), 'curPage': str(page)}
            rows, total, pages = parse_notice_page(json.loads(read(BOARD_URL, params, f'krx-notices-{page}')), page)
            if expected_total is not None and total != expected_total:
                raise ValueError('KRX_COUNT_CHANGED')
            expected_total = total
            notices.extend(rows)
            page += 1
        if len(notices) != expected_total or len({row['noti_no'] for row in notices}) != len(notices):
            raise ValueError('KRX_ROWS_INCOMPLETE')
        for row in notices:
            if MARKET.search(row['title']):
                reason = risk_reason(row['title'], plain(row.get('contn', '')), round_data, date.fromisoformat(row['noti_dd'].replace('/', '-')))
                if reason:
                    report['reasons'].append(f'{reason}:KRX:{row["noti_no"]}')
        halt_params = {'method': 'searchTradingHaltIssueSub', 'forward': 'tradinghaltissue_sub',
                       'currentPageSize': str(PAGE_SIZE), 'pageIndex': '1', 'marketType': '1'}
        halt_text = _decode(read(HALTS_URL, halt_params, 'kind-halts'))
        total, pages = _kind_footer(halt_text, 1)
        if pages != 1 or f'{today.year}년 {today.month}월 {today.day}일 현재' not in plain(halt_text):
            raise ValueError('HALT_LIST_STALE_OR_TRUNCATED')
        halt_rows = [re.findall(r'<td\b[^>]*>(.*?)</td>', row, re.S) for row in _rows(halt_text)]
        halt_rows = [row for row in halt_rows if len(row) == 3]
        if len(halt_rows) != total:
            raise ValueError('HALT_LIST_INCOMPLETE')
        if {int(plain(row[0])) for row in halt_rows} != set(range(1, total + 1)):
            raise ValueError('HALT_LIST_DUPLICATED_OR_MISSING')
        halted_names = {plain(row[1]) for row in halt_rows}
        for quote in quotes:
            if quote['name'] in halted_names:
                report['reasons'].append('TRADING_HALT:' + quote['ticker'])
            code = quote['ticker'][:6]
            issuer_html = _decode(read('https://dart.fss.or.kr/html/search/SearchCompanyIR3_M.html?textCrpNM=' + code, None, 'dart-issuer'))
            issuer = re.search(r'id="textCrpCik"[^>]+value="(\d{8})"', issuer_html)
            if not issuer:
                raise ValueError('DART_ISSUER_UNAVAILABLE')
            dart_params = {'maxResults': str(PAGE_SIZE), 'maxLinks': '10', 'sort': 'date', 'series': 'desc',
                           'textCrpCik': issuer[1], 'textCrpNm': quote['name'], 'pageGubun': 'corp',
                           'startDate': start.strftime('%Y%m%d'), 'endDate': today.strftime('%Y%m%d'), 'finalReport': 'recent'}
            dart = _all_pages(read, DART_URL, dart_params, lambda text, page: parse_dart_page(text, page, issuer[1]), 'dart-' + code, 'currentPage')
            kind_params = {'method': 'searchDisclosureByCorpSub', 'forward': 'searchdisclosurebycorp_sub',
                           'currentPageSize': str(PAGE_SIZE), 'repIsuSrtCd': 'A' + code, 'searchCodeType': 'char',
                           'searchCorpName': quote['name'], 'fromDate': start.isoformat(), 'toDate': today.isoformat(), 'orderIndex': '1'}
            kind = _all_pages(read, KIND_URL, kind_params, lambda text, page: parse_kind_page(text, page, code), 'kind-' + code, 'pageIndex')
            for provider, rows in [('DART', dart), ('KIND', kind)]:
                for row in rows:
                    if not start <= date.fromisoformat(row['date']) <= today:
                        raise ValueError('DISCLOSURE_DATE_OUTSIDE_REQUEST')
                    if not RISK.search(row['title']) or re.search(r'주식선물|파생상품|야간시장|자회사', row['title']):
                        continue
                    text = _dart_document(read, row) if provider == 'DART' else _kind_document(read, row, code)
                    reason = risk_reason(row['title'], text, round_data, date.fromisoformat(row['date']))
                    if reason:
                        report['reasons'].append(f'{reason}:{provider}:{quote["ticker"]}:{row["id"]}')
        report['approved'] = not report['reasons']
    except (OSError, ValueError, KeyError, TypeError, AttributeError, ImportError) as error:
        # Public source failures must not leak request headers or arbitrary error strings.
        code = str(error)
        if isinstance(error, ValueError) and re.fullmatch(r'[A-Z][A-Z0-9_]{0,79}', code):
            report['errorCode'] = code
            report['reasons'].append(code)
        else:
            report['errorCode'] = 'SOURCE_REVIEW_FAILED'
            report['reasons'].append('SOURCE_REVIEW_FAILED:' + type(error).__name__)
    with (directory / 'review.json').open('x', encoding='utf-8') as stream:
        json.dump(report, stream, ensure_ascii=False, indent=2, allow_nan=False)
        stream.write('\n')
    return report
