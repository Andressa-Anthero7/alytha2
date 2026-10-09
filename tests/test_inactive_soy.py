import copy
import tempfile
import unittest
from pathlib import Path
from datetime import date,timedelta
from unittest.mock import patch
from app import inactive_soy as inactive, storage, web_app

class InactiveTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(); self.db=patch.object(storage,'DB_PATH',Path(self.temp.name)/'db.sqlite3');self.db.start()
        self.end=date(2026,10,8)
        self.points=[{'date':(self.end-timedelta(days=offset)).isoformat(),'ndvi_mean':0.2,'valid_pixels':100,'valid_fraction':0.8} for offset in (15,10,5)]
    def tearDown(self): self.db.stop();self.temp.cleanup()
    def test_persistent_low_vigor_is_only_possible_inactivity(self):
        result=inactive.classify(self.points,self.end)
        self.assertEqual(result['status'],'possible_inactive');self.assertIn('pós-colheita',result['reason'])
    def test_cloud_gaps_stale_and_single_observation_are_inconclusive(self):
        self.assertEqual(inactive.classify(self.points[:1],self.end)['status'],'unknown')
        low_quality=copy.deepcopy(self.points);low_quality[-1]['valid_fraction']=0.1
        self.assertEqual(inactive.classify(low_quality,self.end)['status'],'unknown')
        self.assertEqual(inactive.classify(self.points,self.end+timedelta(days=20))['status'],'unknown')
        self.assertEqual(inactive.classify([],self.end)['status'],'unknown')
    def test_growth_is_not_classified_as_inactive(self):
        self.points[-1]['ndvi_mean']=0.6
        self.assertEqual(inactive.classify(self.points,self.end)['status'],'not_matched')
    def test_worker_preserves_evidence_and_cache(self):
        geometry={'type':'Polygon','coordinates':[[[-55,-12],[-54.99,-12],[-54.99,-11.99],[-55,-12]]]}
        historical={'features':[{'type':'Feature','geometry':geometry,'properties':{'class_id':39,'area_ha':10,'year':2025}}]}
        params={'year':2025,'as_of':self.end.isoformat()}
        with patch.object(web_app,'request_ndvi_series',return_value={'points':self.points}) as api:
            inactive.build('a'*64,params,historical)
            result=inactive.get('a'*64)
            self.assertEqual(result['status'],'ready'); self.assertEqual(len(result['features']),1)
            self.assertTrue(result['features'][0]['properties']['possible_inactive'])
            inactive.build('b'*64,params,historical);api.assert_called_once()
    def test_overview_is_rejected_before_ndvi_request(self):
        with patch.object(inactive.data_sources,'mapbiomas',return_value={'overview':True}),patch.object(web_app,'request_ndvi_series') as api:
            with self.assertRaisesRegex(ValueError,'30 m'):inactive.start({'year':2025})
            api.assert_not_called()
    def test_ndvi_masks_are_counted_as_excluded(self):
        import json
        import io
        payload={'data':[{'geometryPixelCount':100,'interval':{'from':'2026-10-01'},'outputs':{'ndvi':{'bands':{'B0':{'stats':{'mean':0.2,'sampleCount':200,'noDataCount':120}}}}}}]}
        with patch.object(web_app,'get_cdse_access_token',return_value='test'),patch.object(web_app,'urlopen',return_value=io.BytesIO(json.dumps(payload).encode())):
            result=web_app.request_ndvi_series({'type':'Polygon','coordinates':[[[-55,-12],[-54.99,-12],[-54.99,-11.99],[-55,-12]]]},'2026-10-01','2026-10-08')
        self.assertEqual(result['points'][0]['valid_pixels'],80)
        self.assertEqual(result['points'][0]['valid_fraction'],0.8)

if __name__=='__main__': unittest.main()
