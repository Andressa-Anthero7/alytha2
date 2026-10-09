import csv
import hashlib
import json
import tempfile
import unittest
from datetime import date,timedelta
from pathlib import Path
from unittest.mock import patch
from app import storage,research,ml_dataset

class DatasetTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
        self.db=patch.object(storage,'DB_PATH',self.root/'test.sqlite3');self.db.start()
        self.geometry={'type':'Polygon','coordinates':[[[-55,-12],[-54.99,-12],[-54.99,-11.99],[-55,-12]]]}
        self.end=date(2026,10,8)
        self.period={'from':(self.end-timedelta(days=60)).isoformat(),'to':self.end.isoformat()}
        feature={'type':'Feature','geometry':self.geometry,'properties':{'area_ha':10,'class_id':39,'year':2025,'source':'MapBiomas'}}
        job={'id':'a'*64,'status':'loading','parameters':{'municipality_code':'5107925','as_of':self.end.isoformat()}}
        storage.source_snapshot('municipal-activity:'+job['id'],job)
        storage.source_snapshot('municipal-soy:v1:5107925',{'features':[feature],'total_soy_ha':10})
        self.key='inactive-evidence:'+hashlib.sha256(json.dumps([self.geometry,self.period],sort_keys=True).encode()).hexdigest()
        points=[{'date':(self.end-timedelta(days=40-i*5)).isoformat(),'ndvi_mean':.2,'valid_pixels':100,'valid_fraction':.8} for i in range(8)]
        storage.source_snapshot(self.key,{'points':points})
    def tearDown(self):self.db.stop();self.temp.cleanup()
    def test_partial_export_never_uses_automatic_signals_as_labels(self):
        result=ml_dataset.export_dataset(output_root=self.root/'exports')
        self.assertFalse(result['collection_complete'])
        self.assertGreater(result['usable_feature_windows'],0)
        self.assertEqual(result['field_labeled_windows'],0)
        with (Path(result['folder'])/'janelas_ml.csv').open(encoding='utf-8-sig',newline='') as file:rows=list(csv.DictReader(file))
        self.assertTrue(all(not r['target_stage'] for r in rows))
        self.assertTrue(any(r['automatic_signal']=='possible_inactive' for r in rows))
        self.assertTrue(Path(result['archive']).is_file())
    def test_missing_series_remains_uncollected(self):
        with storage.connect() as db:db.execute('DELETE FROM source_snapshots WHERE cache_key=?',(self.key,))
        result=ml_dataset.export_dataset(output_root=self.root/'exports')
        self.assertEqual(result['observations'],0)
        self.assertEqual(result['areas_without_cached_series'],1)
        self.assertEqual(result['usable_feature_windows'],0)
    def test_labels_require_matching_geometry_and_period(self):
        with storage.connect() as db:
            db.execute('INSERT INTO field_events(dataset_id,area_key,date_from,date_to,stage,note,created_at) VALUES(?,?,?,?,?,?,?)',('fixture',research.fingerprint(self.geometry),'2026-09-01','2026-10-08','pousio','Reference fixture',storage.now()))
        result=ml_dataset.export_dataset(output_root=self.root/'exports')
        self.assertGreater(result['field_labeled_windows'],0)
        self.assertFalse(result['supervised_training_ready'])
    def test_future_observation_does_not_enter_export_or_features(self):
        series=storage.source_snapshot(self.key)['result']
        series['points'].append({'date':'2026-12-01','ndvi_mean':.9,'valid_pixels':100,'valid_fraction':.8})
        storage.source_snapshot(self.key,series)
        result=ml_dataset.export_dataset(output_root=self.root/'exports')
        self.assertEqual(result['observations'],8)

if __name__=='__main__':unittest.main()
