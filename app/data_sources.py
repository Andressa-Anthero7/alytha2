"""Source-specific adapters; keep historical maps and aggregate statistics distinct."""
import csv
import gzip
import io
import json
import math
import re
from datetime import datetime, timezone, timedelta
from urllib.request import Request, urlopen
from . import storage
from .catalog_search import extract_geometry, validate_date

CONAB_URL = 'https://portaldeinformacoes.conab.gov.br/downloads/arquivos/SerieHistoricaGraos.txt'
MAPBIOMAS_PAGE = 'https://brasil.mapbiomas.org/downloads/mapas-para-download-geotiff/'
MAPBIOMAS_URL = 'https://storage.googleapis.com/mapbiomas-public/initiatives/brasil/collection11/lulc/coverage/brazil_coverage/brazil_coverage-col11_{year}.tif'
SATVEG_URL = 'https://api.cnptia.embrapa.br/satveg/v2/seriespoligono'
CLASSES = {39: 'Soja', 20: 'Cana', 40: 'Arroz', 62: 'Algodão (beta)', 41: 'Outras lavouras temporárias', 46: 'Café', 47: 'Citrus', 35: 'Dendê', 48: 'Outras lavouras perenes'}

def read_bytes(url, payload=None, token=None):
    headers = {'User-Agent': 'Alytha-LotMonitoring/1.0'}
    if payload is not None: headers['Content-Type'] = 'application/json'
    if token: headers['Authorization'] = 'Bearer ' + token
    request = Request(url, data=json.dumps(payload).encode() if payload is not None else None, headers=headers)
    with urlopen(request, timeout=45) as response:
        body = response.read(30_000_001)
    if len(body) > 30_000_000: raise ValueError('Resposta da fonte excedeu o limite local.')
    return gzip.decompress(body) if body.startswith(b'\x1f\x8b') else body

def conab(uf, crop):
    if not re.fullmatch('[A-Z]{2}', uf) or crop not in {'SOJA', 'MILHO', 'SORGO'}:
        raise ValueError('Selecione UF e cultura válidas.')
    key = 'conab:graos:v1'
    snapshot = storage.source_snapshot(key)
    if not snapshot or datetime.now(timezone.utc) - datetime.fromisoformat(snapshot['fetched_at']) > timedelta(days=1):
        raw = read_bytes(CONAB_URL)
        try: content = raw.decode('utf-8-sig')
        except UnicodeDecodeError: content = raw.decode('cp1252')
        rows = list(csv.DictReader(io.StringIO(content), delimiter=';'))
        required = {'ano_agricola','uf','produto','area_plantada_mil_ha','producao_mil_t'}
        if not rows or not required.issubset(rows[0]): raise ValueError('Formato CONAB mudou; importação não realizada.')
        storage.source_snapshot(key, rows); snapshot = storage.source_snapshot(key)
    records = []
    for row in snapshot['result']:
        if row['uf'].strip() != uf or not row['produto'].strip().startswith(crop): continue
        def number(key, factor=1):
            text = row.get(key, '').strip()
            return float(text.replace(',', '.')) * factor if text else None
        records.append({'season': row['ano_agricola'].strip(), 'crop': row['produto'].strip(), 'phase': row.get('dsc_safra_previsao','').strip(), 'area_ha': number('area_plantada_mil_ha',1000), 'production_t': number('producao_mil_t',1000), 'yield_t_ha': number('produtividade_mil_ha_mil_t')})
    records.sort(key=lambda r: (r['season'], r['phase']))
    return {'source':'CONAB — Série Histórica Grãos', 'source_url':CONAB_URL, 'scope':'UF', 'uf':uf, 'crop':crop, 'fetched_at':snapshot['fetched_at'], 'records':records, 'note':'Dados agregados por UF; não são estimativas para o polígono selecionado.'}

def mapbiomas(data):
    try:
        import numpy as np
        import rasterio
        from rasterio.windows import from_bounds
        from rasterio.features import shapes
        from rasterio.warp import transform_geom
        from shapely.geometry import shape, mapping
    except ImportError as exc:
        raise ValueError('Instale requirements-geospatial.txt para processar MapBiomas.') from exc
    year, class_id = data.get('year',2025), data.get('class_id',39)
    if type(year) is not int or not 1985 <= year <= 2025 or type(class_id) is not int or class_id not in CLASSES:
        raise ValueError('Ano ou classe MapBiomas inválidos.')
    bounds = data.get('bounds')
    if not isinstance(bounds,list) or len(bounds)!=4 or any(type(v) not in (float,int) or not math.isfinite(v) for v in bounds):
        raise ValueError('Informe os limites da área visível no mapa.')
    west,south,east,north = bounds
    if not (-75<=west<east<=-30 and -35<=south<north<=6):
        raise ValueError('Escolha uma área no Brasil e aproxime o mapa.')
    municipal_geometry = None
    if data.get('municipality_code'):
        from .municipalities import boundary
        from shapely.ops import unary_union
        boundary_data = boundary(data['municipality_code'])
        municipal_geometry = unary_union([shape(f['geometry']) for f in boundary_data['features']])
    key = 'mapbiomas:v3:' + json.dumps([year,class_id,bounds,data.get('municipality_code')])
    cached = storage.source_snapshot(key)
    if cached: return cached['result']
    url = MAPBIOMAS_URL.format(year=year)
    features = []
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', GDAL_HTTP_TIMEOUT='30', GDAL_HTTP_MAX_RETRY='1', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif'):
        with rasterio.open(url) as ds:
            from rasterio.windows import Window
            from rasterio.enums import Resampling
            window = from_bounds(*bounds, ds.transform).round_offsets().round_lengths().intersection(Window(0,0,ds.width,ds.height))
            if window.width<1 or window.height<1: raise ValueError('Área visível pequena demais para pixels de 30 m.')
            factor = max(1, math.sqrt(window.width*window.height/1_000_000))
            width, height = max(1,int(window.width/factor)), max(1,int(window.height/factor))
            raster = ds.read(1,window=window,out_shape=(height,width),resampling=Resampling.nearest)
            raster_transform = ds.window_transform(window) * ds.transform.scale(window.width/width,window.height/height)
            resolution_m = round(30*max(window.width/width,window.height/height))
            overview = factor > 1
            mask = raster==class_id
            for geometry,value in shapes(np.where(mask,1,0).astype('uint8'), mask=mask, transform=raster_transform):
                if municipal_geometry is not None:
                    clipped = shape(geometry).intersection(municipal_geometry)
                    if clipped.is_empty or clipped.geom_type not in ('Polygon','MultiPolygon'): continue
                    geometry = mapping(clipped)
                area_ha = shape(transform_geom(ds.crs,'EPSG:6933',geometry)).area/10000
                if area_ha < 5: continue
                simplified = mapping(shape(geometry).simplify(ds.res[0],preserve_topology=True)) if municipal_geometry is None else geometry
                features.append({'type':'Feature','geometry':simplified,'properties':{'source':'MapBiomas','collection':11,'year':year,'class_id':class_id,'class_name':CLASSES[class_id],'resolution_m':resolution_m,'native_resolution_m':30,'overview':overview,'area_ha':round(area_ha,2),'source_url':url,'historical':True,'clipped_to_view':True}})
                if len(features)>=200: break
    result = {'type':'FeatureCollection','features':features,'source':'MapBiomas Brasil — Coleção 11','year':year,'class_name':CLASSES[class_id],'source_url':url,'attribution':'MapBiomas — CC BY 4.0','fetched_at':storage.now(),'limit':200,'note':'Manchas históricas recortadas pela área visível, mínimo 5 ha. Não representam limites cadastrais, titularidade ou cultura atual.'}
    result.update(overview=overview,resolution_m=resolution_m)
    storage.source_snapshot(key,result)
    return result

def municipal_landcover(boundary):
    """Count native pixels across the whole municipality in bounded memory tiles."""
    import numpy as np
    import rasterio
    from rasterio.features import geometry_mask
    from rasterio.windows import from_bounds, Window
    from rasterio.warp import transform
    from shapely.geometry import shape
    from shapely.ops import unary_union
    geometries=[f['geometry'] for f in boundary['features']]
    region=unary_union([shape(g) for g in geometries])
    totals={}; pixels=0
    url=MAPBIOMAS_URL.format(year=2025)
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',GDAL_HTTP_TIMEOUT='30',GDAL_HTTP_MAX_RETRY='1',CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif'):
        with rasterio.open(url) as ds:
            window=from_bounds(*region.bounds,ds.transform).round_offsets().round_lengths().intersection(Window(0,0,ds.width,ds.height))
            if window.width*window.height>350_000_000: raise ValueError('Município excede limite do piloto.')
            for row in range(0,int(window.height),512):
                for col in range(0,int(window.width),512):
                    tile=Window(window.col_off+col,window.row_off+row,min(512,int(window.width)-col),min(512,int(window.height)-row))
                    t=ds.window_transform(tile)
                    from shapely.geometry import box
                    if not region.intersects(box(t.c,t.f+t.e*tile.height,t.c+t.a*tile.width,t.f)): continue
                    values=ds.read(1,window=tile)
                    mask=geometry_mask(geometries,out_shape=values.shape,transform=t,invert=True)&(values!=0)
                    pixels+=int(mask.sum())
                    latitudes=[t.f+t.e*i for i in range(values.shape[0]+1)]
                    _,ys=transform(ds.crs,'EPSG:6933',[t.c]*len(latitudes),latitudes)
                    xs,_=transform(ds.crs,'EPSG:6933',[t.c,t.c+t.a],[0,0])
                    row_ha=np.abs(np.diff(ys))*abs(xs[1]-xs[0])/10000
                    for value in np.unique(values[mask]):
                        hectares=float(np.sum(np.sum(mask&(values==value),axis=1)*row_ha))
                        label=str(int(value)); totals[label]=totals.get(label,0)+hectares
    return {'source':'MapBiomas Coleção 11','source_url':url,'year':2025,'resolution_m':30,'scope':'municipality','valid_pixels':pixels,'classes':[{'class_id':int(k),'class_name':CLASSES.get(int(k),'Outra classe de cobertura'),'area_ha':round(v,2)} for k,v in sorted(totals.items(),key=lambda item:-item[1])],'fetched_at':storage.now(),'note':'Área estimada por pixels de 30 m dentro da malha simplificada IBGE; mapa histórico, não cadastro de talhões.'}

def satveg(data, token):
    if not token: raise ValueError('SATVeg aguarda token AgroAPI. Configure EMBRAPA_ACCESS_TOKEN no .env; nenhum dado foi simulado.')
    geometry = extract_geometry(data.get('geojson'))
    if geometry['type'] != 'Polygon' or len(geometry['coordinates'])!=1:
        raise ValueError('SATVeg nesta versão aceita um Polygon sem ilhas internas.')
    start,end = data.get('from'),data.get('to')
    if not isinstance(start,str) or not isinstance(end,str) or validate_date(end,'Data final')<validate_date(start,'Data inicial'):
        raise ValueError('Período SATVeg inválido.')
    ring=geometry['coordinates'][0]
    payload={'tipoPerfil':'ndvi','satelite':'comb','preFiltro':3,'todasEstatisticas':False,'poligono':','.join(f'{p[0]} {p[1]}' for p in ring)}
    result=json.loads(read_bytes(SATVEG_URL,payload,token))
    dates,values=result.get('listaDatas'),result.get('listaSerie')
    if not isinstance(dates,list) or not isinstance(values,list) or len(dates)!=len(values): raise ValueError('Resposta SATVeg inesperada.')
    points=[{'date':d[:10],'ndvi_mean':v} for d,v in zip(dates,values) if start<=d[:10]<=end and isinstance(v,(float,int)) and math.isfinite(v) and -1<=v<=1]
    return {'source':'Embrapa SATVeg MODIS','source_url':SATVEG_URL,'resolution_m':250,'aggregation_days':16,'points':points,'fetched_at':storage.now(),'note':'MODIS 250 m; não comparar diretamente seus valores com Sentinel-2 10 m.'}
