import gzip
import hashlib
import json
import tempfile
import unittest
import urllib.error
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

from weekly_match_checks import _all_pages, _decode, _document_text, _kind_document, check_calendar, parse_dart_page, parse_kind_page, parse_notice_page, risk_reason, review_round

NOW = datetime(2026, 11, 26, 5, 45, tzinfo=timezone.utc)


def round_input():
    return {"id": "kr-auto-2026-11-30", "baseDate": "2026-11-27", "endDate": "2026-12-04",
            "opensAt": "2026-11-27T09:00:00Z", "closesAt": "2026-11-30T00:00:00Z", "endsAt": "2026-12-04T09:00:00Z",
            "left": {"tickers": [{"ticker": "105560.KS", "name": "KB금융"}]},
            "right": {"tickers": [{"ticker": "009540.KS", "name": "HD한국조선해양"}]}}


def kind_page(rows="", total=0, page=1, pages=1):
    return f'<caption>목록</caption><tbody>{rows}</tbody>전체 <em>{total}</em>건 : <strong>{page}</strong>/{pages}'


def dart_page(rows="", total=0, page=1, pages=1):
    return ('<caption>공시서류검색 목록</caption><tbody>' + rows + '</tbody>'
            + (f'<div class="pageInfo">[{page}/{pages}] [총 {total}건]</div>' if total else '조회 결과가 없습니다.'))


class WeeklyMatchChecksTests(unittest.TestCase):
    def test_xkrx_holidays_and_year_end_are_not_weekday_assumptions(self):
        self.assertEqual(check_calendar(round_input()), [])
        document = round_input()
        document.update(baseDate="2026-12-18", endDate="2026-12-25", closesAt="2026-12-21T00:00:00Z")
        self.assertTrue(any("HOLIDAY:2026-12-25" in item for item in check_calendar(document)))
        document.update(baseDate="2026-12-24", endDate="2026-12-31", closesAt="2026-12-28T00:00:00Z")
        self.assertTrue(any("HOLIDAY:2026-12-31" in item for item in check_calendar(document)))
        with tempfile.TemporaryDirectory() as temporary, patch('weekly_match_checks.fetch') as source:
            result = review_round(document, Path(temporary)/'review', NOW)
            self.assertFalse(result['approved'])
            self.assertTrue(all(reason.startswith('HOLIDAY:') for reason in result['reasons']))
            source.assert_not_called()

    def test_empty_dart_and_kind_lists_are_valid_only_with_explicit_evidence(self):
        self.assertEqual(parse_dart_page(dart_page(), 1), ([], 0, 1))
        self.assertEqual(parse_kind_page(kind_page(), 1), ([], 0, 1))
        for text, parser in [('<html>maintenance</html>', parse_dart_page), ('<caption>목록</caption>', parse_kind_page)]:
            with self.subTest(parser=parser), self.assertRaises(ValueError):
                parser(text, 1)
        with self.assertRaises(ValueError):
            parse_dart_page(dart_page(), 2)

    def test_dart_duplicate_missing_rows_wrong_page_and_issuer_are_rejected(self):
        row = '<tr><td><a onclick="openCorpInfoNew(\'00000001\')">KB</a></td><td><a href="/dsaf001/main.do?rcpNo=20261126000001" id="r_20261126000001">주식분할결정</a></td><td>2026.11.26</td></tr>'
        rows, total, pages = parse_dart_page(dart_page(row, 1), 1, '00000001')
        self.assertEqual((rows[0]['id'], total, pages), ('20261126000001', 1, 1))
        for body, page, issuer in [(dart_page(row * 2, 2), 1, '00000001'), (dart_page(row, 2), 1, '00000001'),
                                   (dart_page(row, 1), 2, '00000001'), (dart_page(row, 1), 1, '00000002')]:
            with self.subTest(page=page, issuer=issuer), self.assertRaises(ValueError):
                parse_dart_page(body, page, issuer)

    def test_kind_duplicates_wrong_page_and_missing_rows_are_rejected(self):
        row = '<tr><td>1</td><td>2026-11-26 10:00</td><td>KB금융</td><td><a onclick="openDisclsViewer(\'20261126000001\',\'\')" title=\'주식분할결정\'>주식분할결정</a></td></tr>'
        rows, _, _ = parse_kind_page(kind_page(row, 1), 1)
        self.assertEqual(rows[0]['title'], '주식분할결정')
        for body, page in [(kind_page(row * 2, 2), 1), (kind_page(row, 2), 1), (kind_page(row, 1), 2)]:
            with self.subTest(page=page), self.assertRaises(ValueError):
                parse_kind_page(body, page)
        with self.assertRaisesRegex(ValueError, 'ISSUER_MISMATCH'):
            parse_kind_page(kind_page(row, 1), 1, '105560')

    def test_pagination_checks_global_duplicate_ids_and_total_drift(self):
        def row(index):
            report = f'20261126{index:06d}'
            return f'<tr><td><a href="?rcpNo={report}" id="r_{report}">사업보고서</a></td><td>2026.11.26</td></tr>'
        pages = [dart_page(''.join(row(i) for i in range(100)), 101, 1, 2), dart_page(row(100), 101, 2, 2)]
        def read(_url, params, _label): return pages[int(params['currentPage']) - 1].encode()
        self.assertEqual(len(_all_pages(read, 'https://dart.fss.or.kr', {}, parse_dart_page, 'test', 'currentPage')), 101)
        pages[1] = dart_page(row(0), 101, 2, 2)
        with self.assertRaisesRegex(ValueError, 'DUPLICATE_PAGE'):
            _all_pages(read, 'https://dart.fss.or.kr', {}, parse_dart_page, 'test', 'currentPage')

    def test_notice_pagination_is_complete_and_has_unique_continuous_rows(self):
        raw = {"output": [{"rn": "101", "totCnt": "101", "noti_no": "notice", "title": "거래시간", "noti_dd": "2026/11/26"}]}
        self.assertEqual(parse_notice_page(raw, 2)[1], 101)
        for invalid in [{}, {"output": None}, {"output": [{**raw['output'][0], 'rn': '1'}]}]:
            with self.assertRaises(ValueError):
                parse_notice_page(invalid, 2)

    def test_known_harmless_events_and_derivative_notices_do_not_block_equity_round(self):
        for title in ['주식소각결정', '현금ㆍ현물배당결정', '기업설명회(IR) 개최', '주식선물 가격제한폭 확대', '자회사의 주요경영사항(합병)']:
            self.assertIsNone(risk_reason(title, '', round_input(), NOW.date()))

    def test_effective_date_not_latest_document_date_controls_corporate_action(self):
        self.assertIsNone(risk_reason('회사합병결정', '합병기일 2025년 12월 01일 최근 보고서 2026년 11월 30일', round_input(), NOW.date()))
        self.assertIsNone(risk_reason('주식분할결정', '매매거래정지기간 2026-12-10 ~ 2026-12-12', round_input(), NOW.date()))
        self.assertIn('CORPORATE_ACTION', risk_reason('주식분할결정', '매매거래정지기간 2026-11-26 ~ 2026-12-05', round_input(), NOW.date()))
        self.assertIn('AMBIGUOUS', risk_reason('회사합병결정', '확인할 수 없는 일정', round_input(), NOW.date()))
        self.assertIn('AMBIGUOUS', risk_reason('회사합병결정', '합병기일 해당없음 최근 보고서 2025년 11월 30일', round_input(), NOW.date()))
        self.assertIn('CORPORATE_ACTION', risk_reason('무상증자결정', '신주배정기준일 2026.11.30', round_input(), NOW.date()))
        self.assertIsNone(risk_reason('추가상장(주식교환)', '발행일 2026년08월11일 상장일 : 2026년08월31일', round_input(), NOW.date()))
        self.assertIsNone(risk_reason('유상증자 또는 주식관련사채 등의 발행결과(자율공시)', '납입일 2026-05-04', round_input(), NOW.date()))

    def test_halt_period_needs_both_ordered_dates_and_handles_korean_range_suffixes(self):
        self.assertEqual(risk_reason('주식분할결정', '매매거래정지기간 2026년 11월 20일부터 2026년 12월 1일까지', round_input(), NOW.date()), 'CORPORATE_ACTION')
        for text in [
            '매매거래정지기간 시작일 2026년 11월 20일 종료일 미정',
            '매매거래정지기간 2026년 11월 20일',
            '매매거래정지기간 미정',
            '매매거래정지기간 2026년 11월 20일 to 2026년 12월 1일',
            '매매거래정지기간 2026년 11월 20일 ~ 2026년 11월 10일',
        ]:
            with self.subTest(text=text):
                self.assertEqual(risk_reason('주식분할결정', text, round_input(), NOW.date()), 'AMBIGUOUS_CORPORATE_ACTION')
        self.assertIsNone(risk_reason('주식분할결정', '매매거래정지기간 2026년 11월 1일부터 2026년 11월 10일까지', round_input(), NOW.date()))

    def test_known_past_event_does_not_erase_an_additional_unknown_event(self):
        for text in ['합병기일 2025년 12월 1일 변경상장일 미정',
                     '납입일 2026년 5월 4일 매매거래정지기간 시작일 2026년 11월 20일 종료일 미정']:
            with self.subTest(text=text):
                self.assertEqual(risk_reason('회사합병결정', text, round_input(), NOW.date()), 'AMBIGUOUS_CORPORATE_ACTION')

    def test_only_explicit_table_na_is_ignored_and_a_core_date_is_still_required(self):
        table = '''<table><tr><td>매매거래정지예정기간</td><td>시작일</td><td>-</td></tr>
          <tr><td>종료일</td><td>-</td></tr><tr><td>교환ㆍ이전일자</td><td>2026년 08월 11일</td></tr></table>
          <p>주식교환일 현재 주주명부에 기재된 주주들에게 지급합니다.</p>'''
        self.assertIsNone(risk_reason('주식교환ㆍ이전 결정', _document_text(table), round_input(), NOW.date()))
        partial = table.replace('<td>시작일</td><td>-</td>', '<td>시작일</td><td>2026년 11월 20일</td>')
        self.assertEqual(risk_reason('주식교환ㆍ이전 결정', _document_text(partial), round_input(), NOW.date()), 'AMBIGUOUS_CORPORATE_ACTION')
        no_core = '<table><tr><td>합병기일</td><td>-</td></tr><tr><td>납입일</td><td>2025년 12월 1일</td></tr></table>'
        self.assertEqual(risk_reason('회사합병결정', _document_text(no_core), round_input(), NOW.date()), 'AMBIGUOUS_CORPORATE_ACTION')
        unknown = '<table><tr><td>합병기일</td><td>2025년 12월 1일</td></tr><tr><td>변경상장일</td><td>미정</td></tr></table>'
        self.assertEqual(risk_reason('회사합병결정', _document_text(unknown), round_input(), NOW.date()), 'AMBIGUOUS_CORPORATE_ACTION')
        all_na = '<table><tr><td>합병기일</td><td>-</td></tr></table>'
        self.assertEqual(risk_reason('회사합병결정', _document_text(all_na), round_input(), NOW.date()), 'AMBIGUOUS_CORPORATE_ACTION')

    def test_notice_timing_is_checked_and_undated_change_blocks(self):
        self.assertIsNone(risk_reason('대학수학능력시험일(11.19) 증권시장 등 거래시간 임시 변경', '', round_input(), NOW.date()))
        self.assertIn('MARKET_NOTICE', risk_reason('2026.11.30 증권시장 임시휴장', '', round_input(), NOW.date()))
        self.assertIn('AMBIGUOUS', risk_reason('증권시장 거래시간 임시 변경', '', round_input(), NOW.date()))
        self.assertIsNone(risk_reason('유가증권시장 1단계 Circuit Breakers(매매거래중단) 발동', '', round_input(), NOW.date()))

    def test_mislabeled_kind_encoding_does_not_change_korean_evidence(self):
        text = '<meta charset=euc-kr>공시뷰어'
        self.assertEqual(_decode(text.encode('utf-8')), text)
        self.assertEqual(_decode(text.encode('euc-kr')), text)

    def test_kind_uses_current_correction_and_rejects_external_document_hosts(self):
        viewer = '<h1>우리금융지주 (316140)</h1><select id="mainDoc"><option value="20260424001329|N" selected>원본</option><option value="20260514002671|Y">정정</option></select>'
        for host in ['kind.krx.co.kr', 'attacker.example']:
            calls = []
            def read(url, params, label):
                calls.append(url)
                if label == 'kind-viewer': return viewer.encode()
                if label == 'kind-contents':
                    self.assertIn('docNo=20260514002671', url)
                    return ("parent.setPath('','https://" + host + "/external/2026/doc.htm','');").encode()
                return ('<html>' + '본문' * 300 + '</html>').encode()
            if host == 'kind.krx.co.kr':
                self.assertIn('본문', _kind_document(read, {'url': 'https://kind.krx.co.kr/viewer'}, '316140'))
            else:
                with self.assertRaisesRegex(ValueError, 'UNTRUSTED'):
                    _kind_document(read, {'url': 'https://kind.krx.co.kr/viewer'}, '316140')
                self.assertEqual(len(calls), 2)

    def fake_fetch(self, url, data=None):
        if 'OPN99000001' in url:
            return b'{"output":[]}'
        if 'SearchCompanyIR3_M' in url:
            return b'<input id="textCrpCik" value="00000001">'
        if 'search.ax' in url:
            return dart_page().encode()
        if 'searchdisclosurebycorp.do' in url:
            return kind_page().encode()
        if 'tradinghaltissue.do' in url:
            return ('2026년 11월 26일 현재 ' + kind_page()).encode()
        raise AssertionError(url)

    def test_review_success_preserves_original_bytes_hash_and_request_provenance(self):
        with tempfile.TemporaryDirectory() as temporary, patch('weekly_match_checks.fetch', side_effect=self.fake_fetch):
            directory = Path(temporary) / 'review'
            result = review_round(round_input(), directory, NOW)
            self.assertTrue(result['approved'], result)
            self.assertEqual(json.loads((directory/'review.json').read_text()), result)
            self.assertTrue(result['sources'])
            for source in result['sources']:
                raw = gzip.decompress((directory/source['file']).read_bytes())
                self.assertEqual(hashlib.sha256(raw).hexdigest(), source['sha256'])
                self.assertTrue(source['url'].startswith('https://'))

    def test_network_or_parser_failure_is_audited_without_leaking_exception_text(self):
        with tempfile.TemporaryDirectory() as temporary, patch('weekly_match_checks.fetch', side_effect=urllib.error.URLError('secret-value')):
            directory = Path(temporary) / 'review'
            result = review_round(round_input(), directory, NOW)
            self.assertFalse(result['approved'])
            self.assertTrue((directory/'review.json').exists())
            self.assertNotIn('secret-value', json.dumps(result))
            self.assertEqual(result['errorCode'], 'SOURCE_REVIEW_FAILED')
        with tempfile.TemporaryDirectory() as temporary, patch('weekly_match_checks.fetch', return_value=b'<html>maintenance</html>'):
            result = review_round(round_input(), Path(temporary)/'review', NOW)
            self.assertFalse(result['approved'])
            self.assertEqual(len(result['sources']), 1)
        with tempfile.TemporaryDirectory() as temporary, patch('weekly_match_checks.fetch', side_effect=ValueError('SOURCE_COUNT_CHANGED')):
            result = review_round(round_input(), Path(temporary)/'review', NOW)
            self.assertEqual(result['errorCode'], 'SOURCE_COUNT_CHANGED')

    def test_current_trading_halt_and_stale_halt_page_block_publication(self):
        for day, rows, total in [('2026년 11월 26일 현재', '<tr><td>1</td><td>KB금융</td><td>거래정지</td></tr>', 1),
                                 ('2026년 11월 25일 현재', '', 0)]:
            def read(url, data=None):
                return (day + kind_page(rows, total)).encode() if 'tradinghaltissue.do' in url else self.fake_fetch(url, data)
            with self.subTest(day=day), tempfile.TemporaryDirectory() as temporary, patch('weekly_match_checks.fetch', side_effect=read):
                result = review_round(round_input(), Path(temporary)/'review', NOW)
                self.assertFalse(result['approved'])

    def test_naive_time_invalid_round_and_reused_audit_directory_fail_closed(self):
        for now, document in [(NOW.replace(tzinfo=None), round_input()), (NOW, {**round_input(), 'baseDate': 'not-a-date'})]:
            with tempfile.TemporaryDirectory() as temporary:
                result = review_round(document, Path(temporary)/'review', now)
                self.assertFalse(result['approved'])
        with tempfile.TemporaryDirectory() as temporary, patch('weekly_match_checks.fetch', side_effect=self.fake_fetch):
            directory = Path(temporary)/'review'
            self.assertTrue(review_round(round_input(), directory, NOW)['approved'])
            before = (directory/'review.json').read_bytes()
            self.assertFalse(review_round(round_input(), directory, NOW)['approved'])
            self.assertEqual((directory/'review.json').read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
