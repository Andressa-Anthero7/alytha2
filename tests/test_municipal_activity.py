import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from datetime import date,timedelta
from unittest.mock import patch
from app import municipal_activity as activity,storage,data_sources,inactive_soy

class MunicipalActivityTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.db=patch.object(storage,'DB_PATH',Path(self.temp.name)/'test.sqlite3');self.db.start()
        self.end=date(2026,10,8)
    def tearDown(self):
        self.db.stop();self.temp.cleanup()
    def test_municipal_totals_preserve_failures_and_unassessed_hectares(self):
        features=[{'properties':{'area_ha':value}} for value in (10,20,30)]
        points=[{'date':(self.end-timedelta(days=offset)).isoformat(),'activity_as_of':(self.end-timedelta(days=offset)+timedelta(days=4)).isoformat(),'ndvi_mean':.2,'valid_pixels':100,'valid_fraction':.8} for offset in (15,10,5)]
        high=copy.deepcopy(points)
        for p in high:p['ndvi_mean']=.6
        replies=[{'points':points,'summary':{'status':'possible_inactive'}},{'points':high,'summary':{'status':'not_matched'}},RuntimeError('No imagery')]
        with patch.object(data_sources,'municipal_soy_areas',return_value={'features':features,'total_soy_ha':62}),patch.object(inactive_soy,'activity',side_effect=replies):
            activity.build('a'*64,{'municipality_code':'5107925','as_of':self.end.isoformat()})
        result=activity.get('a'*64)
        self.assertEqual(result['status'],'ready')
        self.assertEqual(result['processed'],3)
        self.assertEqual(result['summary'],{'possible_inactive_ha':10,'not_matched_ha':20,'unknown_ha':30,'pending_ha':2})
        for p in result['points']:
            self.assertAlmostEqual(sum(p[key] for key in ('possible_inactive_ha','not_matched_ha','unknown_ha','pending_ha')),62)
        self.assertEqual(result['points'][0]['possible_inactive_ha'],0)
        self.assertEqual(result['points'][-1]['possible_inactive_ha'],10)
    def test_interrupted_municipal_job_resumes_once(self):
        job={'id':'b'*64,'parameters':{'municipality_code':'5107925'},'status':'loading'}
        storage.source_snapshot('municipal-activity:'+job['id'],job)
        try:
            with patch.object(activity.POOL,'submit') as submit:
                activity.get(job['id']);activity.get(job['id'])
                submit.assert_called_once_with(activity.build,job['id'],job['parameters'])
        finally:activity.RUNNING.discard(job['id'])
    def test_invalid_municipality_never_schedules_work(self):
        with patch.object(activity.POOL,'submit') as submit:
            with self.assertRaises(ValueError):activity.start({'municipality_code':'51'})
            submit.assert_not_called()
    def seed_map_job(self):
        features=[]
        for index,hectares in enumerate((10,20,30,40)):
            west=-55+index*.01
            features.append({'type':'Feature','geometry':{'type':'Polygon','coordinates':[[[west,-12],[west+.005,-12],[west+.005,-11.995],[west,-11.995],[west,-12]]]},'properties':{'area_ha':hectares,'year':2025,'source':'MapBiomas','class_id':39}})
        historical={'features':features,'total_soy_ha':102}
        storage.source_snapshot('municipal-soy:v1:5107925',historical)
        job={'id':'d'*64,'parameters':{'municipality_code':'5107925','as_of':self.end.isoformat()},'status':'loading','processed':3,'total':4,
             'points':[{'date':'2026-09-24','possible_inactive_ha':0,'not_matched_ha':0,'unknown_ha':60,'pending_ha':42,'total_soy_ha':102},
                       {'date':self.end.isoformat(),'possible_inactive_ha':10,'not_matched_ha':20,'unknown_ha':30,'pending_ha':42,'total_soy_ha':102}]}
        storage.source_snapshot('municipal-activity:'+job['id'],job)
        period={'from':(self.end-timedelta(days=60)).isoformat(),'to':self.end.isoformat()}
        for index in (0,1,3):
            geometry=features[index]['geometry']
            key='inactive-evidence:'+hashlib.sha256(json.dumps([geometry,period],sort_keys=True).encode()).hexdigest()
            points=[{'date':(self.end-timedelta(days=offset)).isoformat(),'ndvi_mean':.2 if index!=1 else .6,'valid_pixels':100,'valid_fraction':.8} for offset in (15,10,5)]
            storage.source_snapshot(key,{'points':points})
        return job,features
    def test_map_uses_chart_dates_and_keeps_unprocessed_cached_areas_pending(self):
        job,features=self.seed_map_job()
        with patch.object(inactive_soy,'activity') as downloads:
            result=activity.map_assessment(job['id'])
            downloads.assert_not_called()
        self.assertEqual(result['states'],[['unknown','possible_inactive'],['unknown','not_matched'],['unknown','unknown'],['pending','pending']])
        self.assertEqual(len(result['geojson']['features']),4)
        for feature,original in zip(result['geojson']['features'],features):
            self.assertEqual(feature['properties']['area_ha'],original['properties']['area_ha'])
        totals={state:0 for state in ('possible_inactive','not_matched','unknown','pending')}
        for feature,states in zip(features,result['states']):totals[states[-1]]+=feature['properties']['area_ha']
        for state in ('possible_inactive','not_matched','unknown'):self.assertEqual(totals[state],job['points'][-1][state+'_ha'])
        self.assertEqual(totals['pending']+2,job['points'][-1]['pending_ha'])
    def test_map_progress_can_refresh_without_resending_geometry(self):
        job,_=self.seed_map_job()
        initial=activity.map_assessment(job['id'])
        update=activity.map_assessment(job['id'],False)
        self.assertNotIn('geojson',update)
        self.assertEqual(update['states'],initial['states'])
        self.assertEqual(update['dates'],initial['dates'])
    def test_map_can_match_an_earlier_chart_snapshot_during_collection(self):
        job,_=self.seed_map_job()
        result=activity.map_assessment(job['id'],False,1)
        self.assertEqual(result['processed'],1)
        self.assertEqual(result['states'][0][-1],'possible_inactive')
        self.assertTrue(all(states==['pending','pending'] for states in result['states'][1:]))
        self.assertEqual(result['summary_by_date'][-1]['possible_inactive_ha'],10)
        self.assertEqual(result['summary_by_date'][-1]['not_matched_ha'],0)
        self.assertEqual(result['summary_by_date'][-1]['pending_ha'],92)
        with self.assertRaises(ValueError):activity.map_assessment(job['id'],False,4)
    def test_mapping_failure_is_not_reported_as_a_completed_city(self):
        with patch.object(data_sources,'municipal_soy_areas',side_effect=ValueError('Too large')):
            activity.build('c'*64,{'municipality_code':'5107925','as_of':self.end.isoformat()})
        result=activity.get('c'*64)
        self.assertEqual(result['status'],'error');self.assertEqual(result['points'],[])
    def test_native_municipal_mapping_includes_more_than_viewport_cap(self):
        import numpy as np
        import rasterio
        from rasterio.transform import from_origin
        from app import municipalities
        file=Path(self.temp.name)/'soy.tif'
        values=np.zeros((100,100),dtype='uint8')
        for row in range(0,100,5):
            for col in range(0,100,5):values[row:row+3,col:col+3]=39
        values[99,99]=39  # A small area stays in the total, without being an analysis candidate.
        with rasterio.open(file,'w',driver='GTiff',height=100,width=100,count=1,dtype='uint8',crs='EPSG:4326',transform=from_origin(-55.2,-12.4,.001,.001)) as ds:ds.write(values,1)
        boundary={'type':'FeatureCollection','features':[{'type':'Feature','geometry':{'type':'Polygon','coordinates':[[[-55.2,-12.5],[-55.1,-12.5],[-55.1,-12.4],[-55.2,-12.4],[-55.2,-12.5]]]}}]}
        storage.source_snapshot(municipalities.key('5107925'),{'boundary':boundary})
        original=rasterio.open
        with patch.object(rasterio,'open',side_effect=lambda url:original(file)) as source:
            result=data_sources.municipal_soy_areas('5107925')
            self.assertEqual(len(result['features']),400)
            self.assertGreater(result['total_soy_ha'],result['candidate_ha'])
            data_sources.municipal_soy_areas('5107925');source.assert_called_once()

if __name__=='__main__':unittest.main()
