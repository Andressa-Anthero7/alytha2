import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from app import data_sources as sources, storage

class SourceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.patch = patch.object(storage, 'DB_PATH', Path(self.temp.name)/'db.sqlite3')
        self.patch.start()

    def tearDown(self):
        self.patch.stop(); self.temp.cleanup()

    def test_conab_units_filter_encoding_and_cache(self):
        text = 'ano_agricola;dsc_safra_previsao;uf;produto;area_plantada_mil_ha;producao_mil_t;produtividade_mil_ha_mil_t\n2024/25;1ª safra;MT;SOJA;12,5;40;3,2\n2024/25;Final;GO;SOJA;1;2;2\n'
        with patch.object(sources,'read_bytes',return_value=text.encode('cp1252')) as fetch:
            result = sources.conab('MT','SOJA')
            self.assertEqual(len(result['records']),1)
            self.assertEqual(result['records'][0]['area_ha'],12500)
            self.assertEqual(result['records'][0]['production_t'],40000)
            self.assertEqual(result['records'][0]['yield_t_ha'],3.2)
            sources.conab('MT','SOJA'); fetch.assert_called_once()

    def test_satveg_requires_token_without_network(self):
        with patch.object(sources,'read_bytes') as fetch:
            with self.assertRaisesRegex(ValueError,'token'): sources.satveg({},'')
            fetch.assert_not_called()

    def test_saved_area_preserves_historical_origin(self):
        geometry={'type':'Polygon','coordinates':[[[-55,-12],[-54.99,-12],[-54.99,-11.99],[-55,-12]]]}
        origin={'source':'MapBiomas','year':2025,'historical':True,'clipped_to_view':True}
        area=storage.save_area({'name':'Mapa histórico','municipality':'MT','crop':'Não confirmada','season':'Não confirmada','geojson':geometry,'provenance':origin})
        self.assertEqual(storage.get_area(area['id'])['provenance'],origin)

    def test_satveg_filters_dates_and_invalid_pixels(self):
        geometry={'type':'Polygon','coordinates':[[[-55,-12],[-54.99,-12],[-54.99,-11.99],[-55,-12]]]}
        response={'listaDatas':['2020-01-01','2020-01-17','2020-02-02'],'listaSerie':[0.5,-9999,0.8]}
        with patch.object(sources,'read_bytes',return_value=json.dumps(response).encode()) as fetch:
            result=sources.satveg({'geojson':geometry,'from':'2020-01-01','to':'2020-01-31'},'private-test-token')
            self.assertEqual(result['points'],[{'date':'2020-01-01','ndvi_mean':0.5}])
            self.assertTrue(fetch.call_args.args[1]['poligono'].startswith('-55 -12,'))
            self.assertNotIn('private-test-token',json.dumps(result))

    def test_mapbiomas_limits_and_historical_provenance(self):
        try:
            import numpy as np
            import rasterio
            from rasterio.transform import from_origin
        except ImportError: self.skipTest('Optional geospatial dependencies absent')
        file=Path(self.temp.name)/'fixture.tif'
        with rasterio.open(file,'w',driver='GTiff',height=40,width=40,count=1,dtype='uint8',crs='EPSG:4326',transform=from_origin(-55.2,-12.49,.00025,.00025)) as ds:
            ds.write(np.full((40,40),39,dtype='uint8'),1)
        original=rasterio.open
        with patch.object(rasterio,'open',side_effect=lambda url:original(file)):
            result=sources.mapbiomas({'bounds':[-55.2,-12.5,-55.19,-12.49]})
            self.assertEqual(len(result['features']),1)
            self.assertTrue(result['features'][0]['properties']['historical'])
            self.assertGreater(result['features'][0]['properties']['area_ha'],100)
            self.assertFalse(result['overview'])

    def test_municipal_map_reads_only_intersection_and_skips_outside_views(self):
        try:
            import numpy as np
            import rasterio
            from rasterio.transform import from_origin
        except ImportError: self.skipTest('Optional geospatial dependencies absent')
        from app import municipalities
        file=Path(self.temp.name)/'municipality.tif'
        with rasterio.open(file,'w',driver='GTiff',height=1200,width=1200,count=1,dtype='uint8',crs='EPSG:4326',transform=from_origin(-55.2,-12.2,.00025,.00025)) as ds:
            ds.write(np.full((1200,1200),39,dtype='uint8'),1)
        geometry={'type':'Polygon','coordinates':[[[-55.2,-12.21],[-55.19,-12.21],[-55.19,-12.2],[-55.2,-12.2],[-55.2,-12.21]]]}
        boundary={'type':'FeatureCollection','features':[{'type':'Feature','geometry':geometry,'properties':{}}]}
        original=rasterio.open
        params={'bounds':[-55.2,-12.5,-54.9,-12.2],'municipality_code':'5107925'}
        with patch.object(municipalities,'boundary',return_value=boundary), patch.object(rasterio,'open',side_effect=lambda url:original(file)) as read:
            result=sources.mapbiomas(params)
            self.assertFalse(result['overview'])
            self.assertEqual(result['resolution_m'],30)
            self.assertEqual(len(result['features']),1)
            read.assert_called_once()
            outside=sources.mapbiomas({**params,'bounds':[-56,-13,-55.9,-12.9]})
            self.assertEqual(outside['features'],[])
            read.assert_called_once()

    def test_large_map_uses_categorical_overview(self):
        try:
            import numpy as np
            import rasterio
            from rasterio.transform import from_origin
        except ImportError: self.skipTest('Optional geospatial dependencies absent')
        file=Path(self.temp.name)/'large.tif'
        with rasterio.open(file,'w',driver='GTiff',height=1200,width=1200,count=1,dtype='uint8',crs='EPSG:4326',transform=from_origin(-55.2,-12.2,.00025,.00025)) as ds:
            ds.write(np.full((1200,1200),39,dtype='uint8'),1)
        original=rasterio.open
        with patch.object(rasterio,'open',side_effect=lambda url:original(file)):
            result=sources.mapbiomas({'bounds':[-55.2,-12.5,-54.9,-12.2]})
        self.assertTrue(result['overview'])
        self.assertGreater(result['resolution_m'],30)
        self.assertEqual(result['features'][0]['properties']['native_resolution_m'],30)
        self.assertTrue(result['features'][0]['properties']['overview'])

if __name__=='__main__': unittest.main()
