"""Whole-municipality job, preserving unassessed land instead of extrapolating a sample."""
import hashlib
import json
from datetime import date,timedelta
from . import storage,municipalities,data_sources,inactive_soy

POOL=inactive_soy.POOL
LOCK=inactive_soy.LOCK
RUNNING=set()

def start(data):
    code=data.get('municipality_code')
    municipalities.key(code)
    params={'municipality_code':code,'as_of':inactive_soy.today().isoformat(),'year':2025,'version':1}
    job_id=hashlib.sha256(json.dumps(params,sort_keys=True).encode()).hexdigest()
    with LOCK:
        saved=storage.source_snapshot('municipal-activity:'+job_id)
        if not saved:
            storage.source_snapshot('municipal-activity:'+job_id,{'id':job_id,'parameters':params,'status':'loading','phase':'mapping','processed':0,'total':0,'points':[]})
        if job_id not in RUNNING and (not saved or saved['result']['status']!='ready'):
            RUNNING.add(job_id)
            POOL.submit(build,job_id,params)
    return get(job_id,False)

def get(job_id,resume=True):
    if len(job_id)!=64 or any(c not in '0123456789abcdef' for c in job_id): raise ValueError('Consulta municipal inválida.')
    saved=storage.source_snapshot('municipal-activity:'+job_id)
    if not saved: raise ValueError('Consulta municipal não encontrada.')
    result=saved['result']
    if resume and result['status']=='loading':
        with LOCK:
            if job_id not in RUNNING:
                RUNNING.add(job_id);POOL.submit(build,job_id,result['parameters'])
    return result

def build(job_id,params):
    end=date.fromisoformat(params['as_of']);first=end-timedelta(days=60)
    cutoffs=[];cursor=first
    while cursor<=end:
        cutoffs.append(min(cursor+timedelta(days=4),end));cursor+=timedelta(days=5)
    result={'id':job_id,'parameters':params,'status':'loading','phase':'mapping','processed':0,'total':0,'points':[],
            'period':{'from':first.isoformat(),'to':end.isoformat()},'scope':'municipality','historical_year':2025,'source':'MapBiomas e Sentinel-2',
            'note':'Abrange o município selecionado. Hectares estimados em manchas de soja histórica, sem limites de talhões confirmados. Pouca vegetação não comprova terra parada.'}
    def persist():
        result['updated_at']=storage.now();storage.source_snapshot('municipal-activity:'+job_id,result)
    try:
        persist()
        historical=data_sources.municipal_soy_areas(params['municipality_code'])
        features=historical['features'];total_ha=historical['total_soy_ha']
        result.update(total=len(features),total_soy_ha=total_ha,assessed_ha=0,phase='images')
        result['points']=[{'date':when.isoformat(),'possible_inactive_ha':0,'not_matched_ha':0,'unknown_ha':0,'pending_ha':total_ha,'total_soy_ha':total_ha} for when in cutoffs]
        current={'possible_inactive_ha':0,'not_matched_ha':0,'unknown_ha':0,'pending_ha':total_ha}
        result['summary']=current
        persist()
        for feature in features:
            hectares=feature['properties']['area_ha']
            try:
                # This shares exactly the same geometry/period cache as the per-area chart.
                with_points=inactive_soy.activity({'geojson':feature},end=end)
                points=with_points['points']
                status=with_points['summary']['status']
            except Exception:
                points=[];status='unknown'
            for entry,cutoff in zip(result['points'],cutoffs):
                available=[p for p in points if date.fromisoformat(p.get('activity_as_of',p['date']))<=cutoff]
                state=inactive_soy.classify(available,cutoff)['status']
                entry[state+'_ha']+=hectares
                entry['pending_ha']=max(0,entry['pending_ha']-hectares)
            current[status+'_ha']+=hectares;current['pending_ha']=max(0,current['pending_ha']-hectares)
            result['assessed_ha']+=hectares;result['processed']+=1;persist()
        result['status']='ready';result['phase']='complete';persist()
    except Exception as exc:
        result['status']='error'
        result['error']=str(exc) if isinstance(exc,(ValueError,ImportError)) else 'Não foi possível concluir a análise municipal. Tente novamente.'
        persist()
    finally:
        with LOCK: RUNNING.discard(job_id)
