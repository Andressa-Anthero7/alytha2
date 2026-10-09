"""Quality-controlled, seasonal comparisons of one fixed area using pandas."""
import calendar
from datetime import date, timedelta


def prepare(history, cutoff):
    import pandas as pd
    end=date.fromisoformat(cutoff)
    as_of=date.fromisoformat(history['parameters']['as_of'])
    if end>as_of:
        raise ValueError('A comparação não pode ultrapassar a data final do histórico.')
    rows=[]
    for point in history.get('points',[]):
        if not isinstance(point,dict): continue
        try:
            when=date.fromisoformat(point['date'])
        except (KeyError,TypeError,ValueError): continue
        # History comes from annual queries of five-day composites. The value
        # is not available on the first day printed on the composite.
        available=min(when+timedelta(days=4),date(when.year,12,31),as_of)
        if when.year<max(2018,history['parameters'].get('start_year',2018)) or available>end or when>as_of: continue
        row={'date':pd.Timestamp(when),'available':pd.Timestamp(available)}
        for key in ('ndvi_mean','valid_fraction','valid_pixels'):
            value=point.get(key)
            row[key]=None if isinstance(value,bool) else value
        rows.append(row)
    frame=pd.DataFrame(rows,columns=['date','available','ndvi_mean','valid_fraction','valid_pixels'])
    for key in ('ndvi_mean','valid_fraction','valid_pixels'):
        frame[key]=pd.to_numeric(frame[key],errors='coerce')
    usable=frame['ndvi_mean'].between(-1,1) & frame['valid_fraction'].between(.5,1) & frame['valid_pixels'].between(50,1e12)
    quality_rejected=int((~usable).sum())
    frame=frame.loc[usable].sort_values(['date','valid_fraction','valid_pixels','ndvi_mean'])
    duplicates=int(frame.duplicated('date').sum())
    frame=frame.drop_duplicates('date',keep='last').sort_values('date').reset_index(drop=True)
    return frame,{'observations_available_as_of':len(rows),'usable_observations_as_of':len(frame),
                  'quality_rejected_as_of':quality_rejected,'duplicate_dates_removed':duplicates}


def period_summary(frame, end):
    import pandas as pd
    start=end-timedelta(days=29)
    observations=frame.loc[(frame['date']>=pd.Timestamp(start)) & (frame['available']<=pd.Timestamp(end))]
    result={'from':start.isoformat(),'to':end.isoformat(),'observations':len(observations),'usable':False}
    if observations.empty:
        result['reason']='Sem acompanhamento aproveitável nesse período.'
        return result
    days=(observations['date']-pd.Timestamp(start)).dt.days.astype(float)
    values=observations['ndvi_mean']
    span=int((observations['date'].iloc[-1]-observations['date'].iloc[0]).days)
    age=int((pd.Timestamp(end)-observations['available'].iloc[-1]).days)
    timeline=[pd.Timestamp(start),*observations['date'].tolist(),pd.Timestamp(end)]
    max_gap=max(int((right-left).days) for left,right in zip(timeline,timeline[1:]))
    result.update(span_days=span,last_observation=observations['available'].iloc[-1].date().isoformat(),
                  longest_gap_days=max_gap,mean_observed_fraction=round(float(observations['valid_fraction'].mean()),4))
    if len(observations)<3 or span<10 or age>15 or max_gap>15:
        result['reason']='Poucas observações ou lacunas grandes para comparar este período.'
        return result
    slope=float(((days-days.mean())*(values-values.mean())).sum()/((days-days.mean())**2).sum())
    # This is a descriptive trend in measured vegetation, not a crop stage.
    trend='aumento' if slope>=.002 else 'redução' if slope<=-.002 else 'sem mudança acentuada'
    result.update(usable=True,mean_ndvi=round(float(values.mean()),5),median_ndvi=round(float(values.median()),5),
                  latest_ndvi=round(float(values.iloc[-1]),5),amplitude=round(float(values.max()-values.min()),5),
                  slope_day=round(slope,6),trend=trend)
    return result


def compare(history, cutoff=None):
    end=date.fromisoformat(cutoff or history['parameters']['as_of'])
    frame,quality=prepare(history,end.isoformat())
    current=period_summary(frame,end)
    historical=[]
    for year in range(max(2018,history['parameters'].get('start_year',2018)),end.year):
        day=min(end.day,calendar.monthrange(year,end.month)[1])
        historical.append({'year':year,**period_summary(frame,date(year,end.month,day))})
    comparable=[item for item in historical if item['usable']]
    result={'method':'pandas · comparação sazonal de períodos de 30 dias','status':'inconclusive',
            'scope':'mesmo recorte ao longo dos anos; não representa todo o município',
            'dataset_id':history['id'],'as_of':end.isoformat(),'quality':quality,'current':current,
            'historical_periods':historical,'comparable_years':[item['year'] for item in comparable],
            'note':'Comparação de vegetação, não produtividade ou área plantada. A cultura e o manejo de cada ano não estão identificados. Sem preenchimento de períodos ausentes. Cada ano tem o mesmo peso.'}
    if not current['usable']:
        result['reading']='O acompanhamento recente ainda não permite comparar a condição da área com os anos anteriores.'
        return result
    if len(comparable)<3:
        result['reading']='Há tendência recente de vegetação, mas faltam pelo menos três anos comparáveis para uma referência histórica.'
        return result
    import pandas as pd
    annual=pd.Series([item['mean_ndvi'] for item in comparable],dtype=float)
    median=float(annual.median());low=float(annual.quantile(.25));high=float(annual.quantile(.75))
    position='abaixo' if current['mean_ndvi']<low else 'acima' if current['mean_ndvi']>high else 'dentro'
    trend_reading={'aumento':'aumento da vegetação','redução':'redução da vegetação','sem mudança acentuada':'estabilidade da vegetação'}[current['trend']]
    result.update(status='ready',reference={'median_ndvi':round(median,5),'central_range_ndvi':[round(low,5),round(high,5)],
                  'difference_from_median':round(current['mean_ndvi']-median,5),'years':len(comparable)},position=position,
                  reading=f'A presença média de vegetação está {position} da faixa central observada no mesmo período de {len(comparable)} anos anteriores. O período recente apresenta {trend_reading}. Isso não indica, por si só, atraso de plantio ou perda de produção.')
    return result


def training_rows(history):
    """Produce dated features using only evidence available at each cutoff."""
    frame,_=prepare(history,history['parameters']['as_of'])
    rows=[]
    for available in frame['available'].drop_duplicates():
        result=compare(history,available.date().isoformat())
        current=result['current']
        if not current['usable']:continue
        reference=result.get('reference',{})
        rows.append({'dataset_id':history['id'],'area_key':history['parameters'].get('area_key'),
                     'as_of':result['as_of'],'period_from':current['from'],'observations':current['observations'],
                     'mean_ndvi':current['mean_ndvi'],'latest_ndvi':current['latest_ndvi'],
                     'amplitude':current['amplitude'],'slope_day':current['slope_day'],
                     'mean_observed_fraction':current['mean_observed_fraction'],
                     'historical_years':len(result['comparable_years']),
                     'historical_median_ndvi':reference.get('median_ndvi'),
                     'difference_from_median':reference.get('difference_from_median')})
    return rows


def export(history):
    import json
    import pandas as pd
    from pathlib import Path
    from uuid import uuid4
    folder=Path(__file__).resolve().parents[1]/'data/outputs/historical'/f'{history["id"][:12]}-{history["parameters"]["as_of"]}-{uuid4().hex[:8]}'
    folder.mkdir(parents=True)
    frame,quality=prepare(history,history['parameters']['as_of'])
    frame.to_csv(folder/'observacoes_tratadas.csv',index=False,date_format='%Y-%m-%d',encoding='utf-8-sig')
    rows=training_rows(history)
    pd.DataFrame(rows,columns=['dataset_id','area_key','as_of','period_from','observations','mean_ndvi','latest_ndvi','amplitude','slope_day','mean_observed_fraction','historical_years','historical_median_ndvi','difference_from_median']).to_csv(folder/'janelas_historicas_ml.csv',index=False,encoding='utf-8-sig')
    (folder/'comparacao_atual.json').write_text(json.dumps(compare(history),ensure_ascii=False,indent=2,allow_nan=False),encoding='utf-8')
    manifest={'dataset_id':history['id'],'area_key':history['parameters'].get('area_key'),'as_of':history['parameters']['as_of'],
              'scope':'recorte específico; não representa toda a cidade','quality':quality,'training_windows':len(rows),
              'targets_available':False,'schema_version':1,'note':'Cada janela usa somente observações e anos anteriores disponíveis na sua data de corte. Não contém rótulos confirmados de cultura, manejo ou produtividade.'}
    (folder/'manifesto.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    return {'folder':str(folder),'windows':len(rows),'observations':len(frame)}


if __name__=='__main__':
    import argparse
    import json
    from . import research,storage
    parser=argparse.ArgumentParser(description='Exportar comparação sazonal e características históricas para ML.')
    parser.add_argument('--dataset-id',help='Histórico carregado; padrão: referência do piloto Sorriso.')
    args=parser.parse_args()
    dataset_id=args.dataset_id
    if not dataset_id:
        pilot=storage.source_snapshot('research:sorriso:pilot')
        if not pilot:parser.error('Carregue primeiro o histórico do piloto Sorriso.')
        dataset_id=pilot['result']['dataset_id']
    print(json.dumps(export(research.dataset(dataset_id)),ensure_ascii=False))
