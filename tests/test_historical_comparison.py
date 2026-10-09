import copy
import json
import unittest
from app.historical_comparison import compare, training_rows


class HistoricalComparisonTests(unittest.TestCase):
    def history(self):
        points=[]
        for year in range(2018,2027):
            for day,value in [(10,.6),(20,.6),(30,.6)]:
                points.append({'date':f'{year}-09-{day}','ndvi_mean':value if year<2026 else .3,'valid_pixels':500,'valid_fraction':.8})
        return {'id':'a'*64,'parameters':{'start_year':2018,'as_of':'2026-10-08'},'points':points}

    def test_same_season_comparison_uses_equal_weight_for_prior_years(self):
        result=compare(self.history())
        self.assertEqual(result['status'],'ready')
        self.assertEqual(result['comparable_years'],list(range(2018,2026)))
        self.assertEqual(result['position'],'abaixo')
        self.assertEqual(result['reference']['median_ndvi'],.6)
        self.assertEqual(result['reference']['difference_from_median'],-.3)
        self.assertNotIn(2026,result['comparable_years'])
        json.dumps(result,allow_nan=False)

    def test_rising_vegetation_can_still_be_below_historical_reference(self):
        history=self.history()
        for point,value in zip(history['points'][-3:],[.1,.2,.3]):point['ndvi_mean']=value
        result=compare(history)
        self.assertEqual(result['position'],'abaixo')
        self.assertEqual(result['current']['trend'],'aumento')

    def test_future_and_unfinished_five_day_composites_do_not_change_result(self):
        history=self.history();expected=compare(history)
        history['points'] += [{'date':'2027-09-10','ndvi_mean':.9,'valid_pixels':500,'valid_fraction':1},
                              {'date':'2026-10-07','ndvi_mean':.9,'valid_pixels':500,'valid_fraction':1}]
        # Oct 7 composite ends Oct 8 because this history was requested to Oct 8;
        # use an earlier cutoff to ensure its later value is unavailable.
        early=compare(self.history(),'2026-10-04')
        after=compare(history,'2026-10-04')
        self.assertEqual(early['current'],after['current'])
        self.assertEqual(early['reference'],after['reference'])

    def test_cloudy_invalid_and_duplicate_readings_do_not_inflate_observations(self):
        history=self.history()
        history['points'] += [copy.deepcopy(history['points'][-1]),
                             {'date':'2026-09-11','ndvi_mean':.99,'valid_pixels':500,'valid_fraction':.1},
                             {'date':'2026-09-12','ndvi_mean':float('inf'),'valid_pixels':500,'valid_fraction':1},
                             {'date':'bad','ndvi_mean':.9,'valid_pixels':500,'valid_fraction':1},
                             {'date':'2026-09-13','ndvi_mean':True,'valid_pixels':500,'valid_fraction':1}]
        result=compare(history)
        self.assertEqual(result['current']['observations'],3)
        self.assertEqual(result['quality']['duplicate_dates_removed'],1)
        self.assertEqual(result['quality']['quality_rejected_as_of'],3)
        self.assertEqual(result['current']['mean_ndvi'],.3)

    def test_no_interpolation_when_current_window_is_sparse(self):
        history=self.history();history['points']=history['points'][:-2]
        result=compare(history)
        self.assertEqual(result['status'],'inconclusive')
        self.assertNotIn('reference',result)

    def test_at_least_three_historical_years_are_required(self):
        history=self.history();history['points']=[p for p in history['points'] if p['date'][:4] in ('2024','2025','2026')]
        result=compare(history)
        self.assertEqual(result['status'],'inconclusive')
        self.assertEqual(result['comparable_years'],[2024,2025])

    def test_leap_day_is_aligned_to_february_28_in_non_leap_years(self):
        history={'id':'b'*64,'parameters':{'start_year':2018,'as_of':'2024-02-29'},'points':[]}
        for year in (2018,2019,2020,2021,2022,2023,2024):
            for day in (3,13,23):history['points'].append({'date':f'{year}-02-{day:02}','ndvi_mean':.4,'valid_pixels':500,'valid_fraction':.8})
        result=compare(history)
        self.assertEqual(result['status'],'ready')
        self.assertEqual(result['historical_periods'][0]['to'],'2018-02-28')
        self.assertEqual(result['historical_periods'][2]['to'],'2020-02-29')

    def test_cannot_compare_after_requested_history_end(self):
        with self.assertRaisesRegex(ValueError,'data final'):
            compare(self.history(),'2026-10-09')

    def test_training_features_do_not_change_when_later_readings_change(self):
        history=self.history();original=training_rows(history)
        for point in history['points']:
            if point['date']>'2025-12-31':point['ndvi_mean']=.95
        changed=training_rows(history)
        self.assertEqual([row for row in original if row['as_of']<'2026-01-01'],
                         [row for row in changed if row['as_of']<'2026-01-01'])
        self.assertTrue(all(row['historical_years']<=int(row['as_of'][:4])-2018 for row in original))


if __name__=='__main__':unittest.main()
