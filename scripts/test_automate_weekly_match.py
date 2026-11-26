import copy
import json
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import Mock

from automate_weekly_match import discover, next_round


def at(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00'))


def template():
    return json.loads(Path('config/weekly-match-2026-11-30.json').read_text())


class AutomaticPlanningTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.settings = {'enabled': True, 'firstMonday': '2026-11-30'}

    def test_generates_one_future_week_without_inventing_prices(self):
        original = template()
        document = next_round(self.settings, original, at('2026-11-26T05:00:00Z'))
        self.assertEqual(document['round']['id'], 'kr-auto-2026-11-30')
        self.assertEqual(document['round']['baseDate'], '2026-11-27')
        self.assertEqual(document['round']['endDate'], '2026-12-04')
        self.assertEqual(document['round']['closesAt'], '2026-11-30T00:00:00Z')
        self.assertEqual(document['round']['left'], original['round']['left'])
        self.assertTrue(document['enabled'] and document['automatic'])
        self.assertFalse(any('close' in item for side in ('left', 'right') for item in document['round'][side]['tickers']))
        self.assertEqual(original, template())

    def test_cutoff_moves_to_next_week_instead_of_reopening_current(self):
        before = next_round(self.settings, template(), at('2026-11-29T23:59:59Z'))
        after = next_round(self.settings, template(), at('2026-11-30T00:00:00Z'))
        self.assertEqual(before['round']['id'], 'kr-auto-2026-11-30')
        self.assertEqual(after['round']['id'], 'kr-auto-2026-12-07')
        self.assertEqual(after['round']['baseDate'], '2026-12-04')
        self.assertEqual(after['round']['endDate'], '2026-12-11')

    def test_first_week_and_year_rollover_are_deterministic(self):
        early = next_round(self.settings, template(), at('2026-11-01T09:00:00Z'))
        self.assertEqual(early['round']['id'], 'kr-auto-2026-11-30')
        new_year = next_round(self.settings, template(), at('2026-12-31T09:00:00Z'))
        self.assertEqual(new_year['round']['id'], 'kr-auto-2027-01-04')
        self.assertEqual(new_year['round']['baseDate'], '2027-01-01')

    def test_pending_round_survives_new_week_and_frozen_roster_change(self):
        pending = copy.deepcopy(next_round(self.settings, template(), at('2026-11-26T05:00:00Z'))['round'])
        pending.pop('calendarSource')
        pending.pop('calendarVerifiedAt')
        pending['settlement'] = None
        pending['left']['tickers'][0]['name'] = 'Frozen historical name'
        read = Mock(return_value=[pending])
        plan = discover(self.settings, template(), [], self.directory, at('2026-12-04T10:00:00Z'), read=read)
        self.assertEqual({entry['key'] for entry in plan}, {'kr-auto-2026-11-30', 'kr-auto-2026-12-07'})
        saved = json.loads(Path(next(entry['manifest'] for entry in plan if entry['key'] == pending['id'])).read_text())
        self.assertEqual(saved['round']['left']['tickers'][0]['name'], 'Frozen historical name')

    def test_same_round_is_not_generated_twice_and_final_rounds_are_excluded(self):
        document = next_round(self.settings, template(), at('2026-11-26T05:00:00Z'))
        public = {**document['round'], 'settlement': None}
        plan = discover(self.settings, template(), [], self.directory, at('2026-11-26T05:00:00Z'), read=lambda: [public])
        self.assertEqual(len(plan), 1)
        other = self.directory / 'next'
        plan = discover(self.settings, template(), [], other, at('2026-11-26T05:00:00Z'), read=lambda: [{**public, 'settlement': {'outcome': 'void'}}])
        self.assertEqual(plan, [])

    def test_pause_switch_stops_automatic_work_but_keeps_unsettled_manual_round(self):
        manual = template()
        manual['enabled'] = True
        manual['round']['id'] = 'kr-manual-test'
        self.settings['enabled'] = False
        plan = discover(self.settings, template(), [manual], self.directory, at('2026-11-26T05:00:00Z'), read=lambda: [])
        self.assertEqual([entry['key'] for entry in plan], ['kr-manual-test'])
        saved = json.loads(Path(plan[0]['manifest']).read_text())
        self.assertNotIn('automatic', saved)

    def test_bad_ids_and_unknown_outcomes_cannot_drive_files_or_skip_work(self):
        for row in ({'id': 'kr-auto-../../escape', 'settlement': None}, {'id': 'kr-auto-2026-11-30', 'settlement': {'outcome': 'unknown'}}):
            with self.subTest(row=row), self.assertRaises(ValueError):
                discover(self.settings, template(), [], self.directory, at('2026-11-26T05:00:00Z'), read=lambda: [row])


if __name__ == '__main__':
    unittest.main()
