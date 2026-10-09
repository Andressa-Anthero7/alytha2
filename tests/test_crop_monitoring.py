import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from app import crop_monitoring as monitoring,research,storage,assistant


class MonitoringTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.db=patch.object(storage,'DB_PATH',Path(self.temp.name)/'db.sqlite3');self.db.start()
        geometry={'type':'Polygon','coordinates':[[[-55,-12],[-54.99,-12],[-54.99,-11.99],[-55,-11.99],[-55,-12]]]}
        self.history={'id':'a'*64,'parameters':{'geometry':geometry,'area_key':research.fingerprint(geometry),'as_of':'2026-10-08','municipality_code':'5107925'}}
        current={'usable':True,'from':'2026-09-09','mean_ndvi':.2,'latest_ndvi':.21,'amplitude':.1,'slope_day':.001,'mean_observed_fraction':.8,'observations':4}
        self.analysis={'historical_comparison':{'reading':'Abaixo da referência histórica.','current':current,'reference':{'years':6,'difference_from_median':-.1}},
                       'vegetation_patterns':{'groups':[{'id':0,'mean_ndvi':.2},{'id':1,'mean_ndvi':.7}],'current_group':0,'windows':80}}
        self.job={'id':'b'*64,'parameters':{'area_id':self.history['parameters']['area_key'],'as_of':'2026-10-08','algorithm_version':2},
                  'status':'ready','periods':[{'from':'2026-09-18','to':'2026-09-22'},{'from':'2026-09-23','to':'2026-09-27'},{'from':'2026-10-03','to':'2026-10-07'}],
                  'analysis_area_ha':10,'observed_area_ha':8,'unobserved_area_ha':2,'common_coverage':.8,
                  'persistent_low_ha':5,'vegetation_gain_ha':2,'vegetation_loss_ha':0,
                  'ml_features':{'common_coverage':.8,'persistent_low_fraction':.625,'vegetation_gain_fraction':.25},
                  'change_geojson':{'type':'FeatureCollection','features':[]}}
        self.dataset=patch.object(research,'dataset',return_value=self.history);self.dataset.start()
        self.analyze=patch.object(research,'analyze',return_value=self.analysis);self.analyze.start()
    def tearDown(self):
        self.analyze.stop();self.dataset.stop();self.db.stop();self.temp.cleanup()
    def save(self,job):storage.source_snapshot('cv:job:'+job['id'],job)
    def test_integrates_same_area_and_keeps_dates_and_features_auditable(self):
        self.save(self.job)
        result=monitoring.report({'dataset_id':self.history['id']})
        self.assertEqual(result['status'],'ready')
        self.assertIn('ganho',result['priority'])
        self.assertEqual(result['learned_profile']['rank'],1)
        self.assertEqual(result['combined_features']['spatial_vegetation_gain_fraction'],.25)
        self.assertEqual(result['combined_features']['spatial_to'],'2026-10-07')
        self.assertEqual(result['combined_features']['temporal_from'],'2026-09-09')
        self.assertNotIn('geojson',monitoring.evidence(result))
        json.dumps(result,allow_nan=False)
    def test_other_area_future_stale_or_old_algorithm_is_not_merged(self):
        for update in ({'area_id':'different'},{'as_of':'2026-10-09'},{'algorithm_version':1}):
            job=copy.deepcopy(self.job);job['parameters'].update(update);self.save(job)
            self.assertEqual(monitoring.report({'dataset_id':self.history['id']})['spatial']['status'],'unavailable')
            with self.assertRaises(ValueError):monitoring.report({'dataset_id':self.history['id'],'spatial_job_id':job['id']})
        job=copy.deepcopy(self.job);job['periods']=[{'from':'2026-08-01','to':'2026-08-05'}];self.save(job)
        self.assertEqual(monitoring.report({'dataset_id':self.history['id']})['status'],'partial')
    def test_future_period_is_not_used_even_if_job_date_is_earlier(self):
        job=copy.deepcopy(self.job);job['periods'][-1]['to']='2026-10-09';self.save(job)
        with self.assertRaises(ValueError):monitoring.report({'dataset_id':self.history['id'],'spatial_job_id':job['id']})
    def test_inconclusive_spatial_result_does_not_invent_changes(self):
        job=copy.deepcopy(self.job);job['status']='inconclusive';self.save(job)
        result=monitoring.report({'dataset_id':self.history['id']})
        self.assertEqual(result['status'],'partial')
        self.assertEqual(result['geojson']['features'],[])
        self.assertNotIn('spatial_vegetation_gain_fraction',result['combined_features'])
    def test_reduction_gets_monitoring_priority_without_management_label(self):
        job=copy.deepcopy(self.job);job['vegetation_loss_ha']=1;self.save(job)
        result=monitoring.report({'dataset_id':self.history['id']})
        self.assertIn('redução',result['priority'])
        self.assertIn('ainda não identifica',result['next_signal'])
    def test_export_contains_combined_features_without_training_targets(self):
        self.save(self.job)
        with patch.object(monitoring,'OUTPUT_ROOT',Path(self.temp.name)/'outputs'):
            result=monitoring.create({'dataset_id':self.history['id']})
            folder=Path(self.temp.name)/'outputs'/result['id']
            csv=(folder/'caracteristicas_combinadas_ml.csv').read_text(encoding='utf-8-sig')
            self.assertIn('temporal_mean_ndvi',csv)
            self.assertIn('spatial_common_coverage',csv)
            self.assertNotIn('target',csv)
    def test_date_cannot_exceed_history_end(self):
        with self.assertRaises(ValueError):monitoring.report({'dataset_id':self.history['id'],'date':'2026-10-09'})
    def test_assistant_rejects_history_from_another_selected_area(self):
        another=copy.deepcopy(self.history['parameters']['geometry'])
        another['coordinates'][0][0][0]= -55.001
        with self.assertRaisesRegex(ValueError,'outro recorte'):
            assistant.context({'dataset_id':self.history['id'],'area_geojson':another})


if __name__=='__main__':unittest.main()
