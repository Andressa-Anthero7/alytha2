"""Experimental evidence filter; low vigor does not establish an empty field."""
import hashlib
import json
import math
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from . import storage, data_sources
from .catalog_search import extract_geometry

POOL=ThreadPoolExecutor(max_workers=2,thread_name_prefix='inactive-soy')
LOCK=threading.Lock()
RUNNING=set()
LIMIT=10

def today(): return (datetime.now(timezone.utc)-timedelta(hours=3)).date()

def activity(data,end=None):
    """Recent activity evidence for a selected historical soybean polygon."""
    if not isinstance(data,dict): raise ValueError('Pedido inválido.')
    geometry=extract_geometry(data.get('geojson'))
    properties=data['geojson'].get('properties',{})
    if properties.get('source')!='MapBiomas' or properties.get('class_id')!=39 or properties.get('overview'):
        raise ValueError('Selecione uma área de soja histórica no mapa em detalhe.')
    end=end or today();first=end-timedelta(days=60)
    period={'from':first.isoformat(),'to':end.isoformat()}
    key='inactive-evidence:'+hashlib.sha256(json.dumps([geometry,period],sort_keys=True).encode()).hexdigest()
    cached=storage.source_snapshot(key)
    if cached: series=cached['result']
    else:
        from .web_app import request_ndvi_series
        series=request_ndvi_series(geometry,period['from'],period['to'])
        storage.source_snapshot(key,series)
    points=sorted(series['points'],key=lambda p:p['date'])
    timeline=[]
    for index,p in enumerate(points):
        as_of=min(end,date.fromisoformat(p['date'])+timedelta(days=4))
        timeline.append({**p,'activity_as_of':as_of.isoformat(),'activity':classify(points[:index+1],as_of)})
    return {'points':timeline,'summary':classify(points,end),'period':period,
            'source':'Sentinel-2 L2A','historical_year':properties.get('year'),
            'area_ha':properties.get('area_ha'),
            'note':'Pouca vegetação persistente pode indicar pós-colheita, preparo ou pousio. Não confirma terra parada, disponibilidade para plantio ou limite de talhão.'}

def classify(points,end):
    usable=[]
    for p in points:
        try:
            when=date.fromisoformat(p['date'])
            ndvi=p['ndvi_mean']; fraction=p.get('valid_fraction',0)
            if end-timedelta(days=60)<=when<=end and type(ndvi) in (int,float) and math.isfinite(ndvi) and -1<=ndvi<=1 and p.get('valid_pixels',0)>=50 and fraction>=0.5:
                usable.append(p)
        except (ValueError,TypeError,KeyError): continue
    usable=sorted({p['date']:p for p in usable}.values(),key=lambda p:p['date'])
    if len(usable)<3: return {'status':'unknown','reason':'Menos de três intervalos com cobertura suficiente.','points':usable}
    recent=usable[-3:]
    if (end-date.fromisoformat(recent[-1]['date'])).days>15:
        return {'status':'unknown','reason':'Última observação válida antiga demais.','points':recent}
    if (date.fromisoformat(recent[-1]['date'])-date.fromisoformat(recent[0]['date'])).days<10:
        return {'status':'unknown','reason':'Observações ainda não cobrem dez dias.','points':recent}
    match=all(p['ndvi_mean']<=0.25 for p in recent)
    return {'status':'possible_inactive' if match else 'not_matched','reason':'NDVI baixo persistente; pode indicar solo exposto, pós-colheita ou pousio.' if match else 'Os três intervalos recentes não têm NDVI persistentemente baixo.','points':recent,'latest_date':recent[-1]['date'],'latest_ndvi':recent[-1]['ndvi_mean']}

def start(data):
    if not isinstance(data,dict): raise ValueError('Pedido inválido.')
    year=data.get('year',min(2025,today().year-1))
    if type(year) is not int or not 1985<=year<=min(2025,today().year-1): raise ValueError('Selecione um ano histórico anterior ao atual.')
    # Validate bounds/class/dependencies synchronously before scheduling requests.
    historical=data_sources.mapbiomas({**data,'year':year,'class_id':39})
    if historical['overview']: raise ValueError('Para verificar lavoura ativa, aproxime o mapa até o detalhe de 30 m. A visão geral não delimita áreas com precisão suficiente.')
    params={'bounds':data.get('bounds'),'municipality_code':data.get('municipality_code'),'year':year,'as_of':today().isoformat(),'rule_version':1}
    job_id=hashlib.sha256(json.dumps(params,sort_keys=True).encode()).hexdigest()
    key='inactive-soy:'+job_id
    with LOCK:
        saved=storage.source_snapshot(key)
        if job_id not in RUNNING and (not saved or saved['result']['status']!='ready'):
            RUNNING.add(job_id)
            storage.source_snapshot(key,{'id':job_id,'status':'loading','parameters':params,'features':[],'assessed':[],'processed':0,'limit':LIMIT})
            POOL.submit(build,job_id,params,historical)
    return storage.source_snapshot(key)['result']

def get(job_id):
    if len(job_id)!=64 or any(c not in '0123456789abcdef' for c in job_id): raise ValueError('Consulta inválida.')
    saved=storage.source_snapshot('inactive-soy:'+job_id)
    if not saved: raise ValueError('Consulta não encontrada.')
    return saved['result']

def build(job_id,params,historical):
    from .web_app import request_ndvi_series
    end=date.fromisoformat(params['as_of']); start_date=end-timedelta(days=60)
    candidates=sorted(historical['features'],key=lambda f:f['properties']['area_ha'])[:LIMIT]
    result={'type':'FeatureCollection','id':job_id,'status':'loading','parameters':params,'features':[],'assessed':[],'processed':0,'total':len(candidates),'available':len(historical['features']),'limit':LIMIT,'class_name':'Soja histórica · possível ausência de lavoura ativa','year':params['year'],'resolution_m':30,'overview':False,'period':{'from':start_date.isoformat(),'to':end.isoformat()},'rule':{'ndvi_max':0.25,'minimum_intervals':3,'minimum_valid_pixels':50,'minimum_valid_fraction':0.5,'latest_max_age_days':15,'span_min_days':10},'note':'Triagem experimental, não validada agronomicamente. MapBiomas é anual, não confirma a safra passada. Pós-colheita, preparo e pousio podem ter o mesmo sinal. Áreas recortadas não são talhões cadastrais.'}
    def persist(): result['updated_at']=storage.now(); storage.source_snapshot('inactive-soy:'+job_id,result)
    try:
        persist()
        for index,feature in enumerate(candidates):
            cache_key='inactive-evidence:'+hashlib.sha256(json.dumps([feature['geometry'],result['period']],sort_keys=True).encode()).hexdigest()
            evidence=storage.source_snapshot(cache_key)
            try:
                series=evidence['result'] if evidence else request_ndvi_series(feature['geometry'],start_date.isoformat(),end.isoformat())
                if not evidence: storage.source_snapshot(cache_key,series)
                assessment=classify(series['points'],end)
            except ValueError:
                assessment={'status':'unknown','reason':'Área excede o limite de análise em detalhe; use um recorte menor.','points':[]}
            except Exception:
                assessment={'status':'unknown','reason':'Imagens indisponíveis para esta área.','points':[]}
            result['assessed'].append({'area_ha':feature['properties']['area_ha'],**assessment})
            if assessment['status']=='possible_inactive':
                result['features'].append({**feature,'properties':{**feature['properties'],'possible_inactive':True,'evidence':assessment,'observation_source':'Sentinel-2 L2A','observation_resolution_m':10}})
            result['processed']=index+1; persist()
        result['status']='ready'; persist()
    except Exception:
        result['status']='error';result['error']='Não foi possível concluir a triagem.';persist()
    finally:
        with LOCK: RUNNING.discard(job_id)
