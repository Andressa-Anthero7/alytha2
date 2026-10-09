import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from app import municipalities as m, storage, data_sources

BOUNDARY={'type':'FeatureCollection','features':[{'type':'Feature','properties':{},'geometry':{'type':'Polygon','coordinates':[[[-55.2,-12.5],[-55.195,-12.5],[-55.195,-12.49],[-55.2,-12.49],[-55.2,-12.5]]]}}]}

class MunicipalTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(); self.db=patch.object(storage,'DB_PATH',Path(self.temp.name)/'db.sqlite3'); self.db.start()
    def tearDown(self): self.db.stop(); self.temp.cleanup()
    def test_build_cache_source_scope_and_reuse(self):
        def ibge(path):
            if '/malhas/' in path: return BOUNDARY
            if '/estados?' in path: return [{'id':51,'sigla':'MT'}]
            return {'nome':'Sorriso'}
        with patch.object(m,'fetch_ibge',side_effect=ibge),patch.object(data_sources,'conab',return_value={'scope':'UF'}),patch.object(data_sources,'municipal_landcover',return_value={'year':2025}) as land:
            m.build('5107925'); result=m.request('5107925')
            self.assertEqual(result['status'],'ready'); self.assertEqual(result['uf'],'MT')
            self.assertEqual(result['sources']['conab']['scope'],'UF'); self.assertEqual(m.boundary('5107925'),BOUNDARY)
            land.assert_called_once()
    def test_failure_preserves_boundary_and_conab(self):
        def ibge(path):
            if '/malhas/' in path: return BOUNDARY
            if '/estados?' in path: return [{'id':51,'sigla':'MT'}]
            return {'nome':'Sorriso'}
        with patch.object(m,'fetch_ibge',side_effect=ibge),patch.object(data_sources,'conab',return_value={'scope':'UF'}),patch.object(data_sources,'municipal_landcover',side_effect=RuntimeError()):
            m.build('5107925'); result=storage.source_snapshot(m.key('5107925'))['result']
            self.assertEqual(result['status'],'partial'); self.assertIn('conab',result); self.assertEqual(result['boundary'],BOUNDARY)
    def test_invalid_id(self):
        with self.assertRaises(ValueError): m.request('../bad')
    def test_native_summary_and_clipping(self):
        try:
            import rasterio
            import numpy as np
            from rasterio.transform import from_origin
        except ImportError: self.skipTest('Optional geospatial dependencies absent')
        file=Path(self.temp.name)/'fixture.tif'
        with rasterio.open(file,'w',driver='GTiff',height=40,width=40,count=1,dtype='uint8',crs='EPSG:4326',transform=from_origin(-55.2,-12.49,.00025,.00025)) as ds: ds.write(np.full((40,40),39,dtype='uint8'),1)
        original=rasterio.open
        storage.source_snapshot(m.key('5107925'),{'boundary':BOUNDARY})
        with patch.object(rasterio,'open',side_effect=lambda url:original(file)):
            result=data_sources.municipal_landcover(BOUNDARY)
            self.assertEqual(result['valid_pixels'],800)
            clipped=data_sources.mapbiomas({'bounds':[-55.2,-12.5,-55.19,-12.49],'municipality_code':'5107925'})
            from shapely.geometry import shape
            self.assertTrue(shape(BOUNDARY['features'][0]['geometry']).covers(shape(clipped['features'][0]['geometry'])))

if __name__=='__main__': unittest.main()
