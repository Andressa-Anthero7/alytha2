import csv
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from app import satellite_learning, storage


def rows():
    return [{'area_id':f'area-{i:02}', 'date_to':'2026-10-08', 'area_ha':10,
             'latest':.15+i*.025, 'mean':.15+i*.025, 'min':.1+i*.025,
             'max':.2+i*.025, 'amplitude':.1, 'slope_day':-.004 if i<10 else .004,
             'peak_drop':.05, 'first_last_delta':-.1 if i<10 else .1,
             'target_stage':'', 'automatic_signal':'unknown'} for i in range(20)]


class SatelliteLearningTests(unittest.TestCase):
    def test_no_labels_required_and_labels_never_affect_patterns(self):
        data=rows()
        first=satellite_learning.fit(data,'2026-10-08')
        second=satellite_learning.fit([{**row,'target_stage':'plantio','automatic_signal':'possible_inactive'} for row in data],'2026-10-08')
        self.assertEqual(first[1:],second[1:])
        self.assertGreater(len(first[1]),1)
        self.assertEqual(sum(p['areas'] for p in first[1]),20)
        self.assertEqual(first[0]['features'],satellite_learning.FEATURES)

    def test_each_area_has_one_recent_window_and_future_is_excluded(self):
        data=rows()
        extra=[{**data[0],'date_to':'2026-09-01','latest':.99},
               {**data[0],'date_to':'2026-10-09','latest':.99},
               {**data[0],'date_to':'2026-10-07','latest':.99}]
        baseline=satellite_learning.fit(data,'2026-10-08')
        actual=satellite_learning.fit(data+extra,'2026-10-08')
        self.assertEqual(baseline[1:],actual[1:])

    def test_insufficient_or_uniform_data_is_rejected(self):
        with self.assertRaises(ValueError):satellite_learning.fit(rows()[:9],'2026-10-08')
        uniform=[{**rows()[0],'area_id':str(i)} for i in range(20)]
        with self.assertRaises(ValueError):satellite_learning.fit(uniform,'2026-10-08')

    def test_model_and_descriptive_outputs_are_saved_separately_from_labels(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);folder=root/'export';folder.mkdir()
            data=rows()
            with (folder/'janelas_ml.csv').open('w',encoding='utf-8-sig',newline='') as stream:
                writer=csv.DictWriter(stream,fieldnames=list(data[0]));writer.writeheader();writer.writerows(data)
            (folder/'areas.geojson').write_text(json.dumps({'type':'FeatureCollection','features':[{'type':'Feature','geometry':None,'properties':{'area_id':row['area_id']}} for row in data]}),encoding='utf-8')
            exported={'folder':str(folder),'archive':str(folder)+'.zip','period':{'from':'2026-08-09','to':'2026-10-08'},'collection_complete':False,'candidate_areas':25,'observations':200}
            with patch.object(ml_dataset_module(),'export_dataset',return_value=exported), patch.object(storage,'DB_PATH',root/'test.sqlite3'):
                result=satellite_learning.train(model_root=root/'models')
                self.assertFalse(result['requires_field_labels'])
                self.assertFalse(result['collection_complete'])
                self.assertEqual(result['areas'],20)
                self.assertEqual(satellite_learning.status()['areas'],20)
                self.assertTrue(Path(result['archive']).is_file())
                import joblib
                saved=joblib.load(result['model_path'])
                self.assertEqual(saved['features'],satellite_learning.FEATURES)
                self.assertTrue((folder/'perfis_satelite.geojson').is_file())


def ml_dataset_module():return satellite_learning.ml_dataset


if __name__=='__main__':unittest.main()
