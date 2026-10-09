"""Descriptive satellite learning, without management labels or accuracy claims."""
import argparse
import csv
import json
import math
import shutil
import threading
from datetime import date
from pathlib import Path
from . import ml_dataset, storage, municipalities

MODEL_ROOT = Path(__file__).resolve().parents[1] / 'data/models'
FEATURES = ['latest', 'mean', 'min', 'max', 'amplitude', 'slope_day', 'peak_drop', 'first_last_delta']
LOCK = threading.Lock()


def status(code='5107925'):
    municipalities.key(code)
    cached = storage.source_snapshot('ml:satellite:v1:' + code)
    return cached['result'] if cached else None


def fit(rows, as_of):
    import numpy as np
    from sklearn.cluster import KMeans
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler
    from threadpoolctl import threadpool_limits

    # One recent window per area: areas with more clear images cannot dominate.
    latest = {}
    end = date.fromisoformat(as_of)
    for row in rows:
        age = (end - date.fromisoformat(row['date_to'])).days
        vector = [float(row[key]) for key in FEATURES]
        if not 0 <= age <= 20 or not all(math.isfinite(v) for v in vector):
            continue
        if row['area_id'] not in latest or row['date_to'] > latest[row['area_id']]['date_to']:
            latest[row['area_id']] = row
    selected = [latest[key] for key in sorted(latest)]
    if len(selected) < 10:
        raise ValueError('Aguarde leituras recentes e suficientes em pelo menos 10 recortes de soja da cidade.')
    matrix = np.array([[float(row[key]) for key in FEATURES] for row in selected])
    unique = len(np.unique(np.round(matrix, 6), axis=0))
    if unique < 2:
        raise ValueError('As leituras ainda não apresentam diversidade suficiente para separar padrões.')
    scaler = StandardScaler()
    scaled = scaler.fit_transform(matrix)
    with threadpool_limits(limits=1):
        clusters = KMeans(n_clusters=min(4, unique), n_init=10, random_state=42).fit(scaled)
        detector = IsolationForest(n_estimators=150, contamination='auto', random_state=42, n_jobs=1).fit(scaled)
        scores = -detector.score_samples(scaled)
        atypical = detector.predict(scaled) == -1
    centers = scaler.inverse_transform(clusters.cluster_centers_)
    order = sorted(range(len(centers)), key=lambda group: centers[group][1])
    rank = {group: index + 1 for index, group in enumerate(order)}
    profiles = []
    for group in order:
        members = [row for row, label in zip(selected, clusters.labels_) if label == group]
        slope = centers[group][5]
        trend = 'ganhando vegetação' if slope > .002 else 'perdendo vegetação' if slope < -.002 else 'com vegetação relativamente estável'
        label = f'Perfil {rank[group]} · {trend}'
        profiles.append({'id':rank[group], 'label':label, 'areas':len(members),
                         'area_ha':sum(float(row['area_ha']) for row in members),
                         'mean_ndvi':float(centers[group][1])})
    results = [{'area_id':row['area_id'], 'date_to':row['date_to'], 'area_ha':float(row['area_ha']),
                'profile_id':rank[int(group)], 'atypical':bool(unusual), 'anomaly_score':float(score)}
               for row, group, unusual, score in zip(selected, clusters.labels_, atypical, scores)]
    return {'scaler':scaler, 'clusters':clusters, 'detector':detector, 'features':FEATURES}, profiles, results


def train(code='5107925', output_root=None, model_root=None):
    municipalities.key(code)
    with LOCK:
        exported = ml_dataset.export_dataset(code, output_root)
        folder = Path(exported['folder'])
        with (folder/'janelas_ml.csv').open(encoding='utf-8-sig', newline='') as stream:
            rows = list(csv.DictReader(stream))
        model, profiles, results = fit(rows, exported['period']['to'])
        import joblib
        root = Path(model_root or MODEL_ROOT)
        root.mkdir(parents=True, exist_ok=True)
        destination = root/f'satellite-{code}.joblib'
        temporary = destination.with_suffix('.joblib.tmp')
        joblib.dump(model, temporary)
        temporary.replace(destination)
        with (folder/'perfis_satelite.csv').open('w',encoding='utf-8-sig',newline='') as stream:
            writer = csv.DictWriter(stream,fieldnames=list(results[0]))
            writer.writeheader();writer.writerows(results)
        geometry = json.loads((folder/'areas.geojson').read_text(encoding='utf-8'))
        by_area = {row['area_id']:row for row in results}
        for feature in geometry['features']:
            feature['properties'].update(by_area.get(feature['properties']['area_id'], {'profile_id':None}))
        (folder/'perfis_satelite.geojson').write_text(json.dumps(geometry,ensure_ascii=False),encoding='utf-8')
        metadata = {'municipality_code':code, 'trained_at':storage.now(), 'period':exported['period'],
                    'collection_complete':exported['collection_complete'], 'candidate_areas':exported['candidate_areas'],
                    'areas':len(results), 'area_ha':sum(row['area_ha'] for row in results),
                    'observations':exported['observations'], 'profiles':profiles,
                    'atypical_areas':sum(row['atypical'] for row in results),
                    'requires_field_labels':False, 'features':FEATURES,
                    'folder':str(folder), 'archive':exported['archive'], 'model_path':str(destination),
                    'note':'Padrões exploratórios entre recortes de soja histórica, com leituras recentes suficientes. Não confirmam cultura atual, manejo, produtividade ou terras abandonadas. Não comparam safras. Pontuações de diferença não são probabilidades de acerto.'}
        (folder/'aprendizado_satelite.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
        shutil.make_archive(str(folder),'zip',folder)
        storage.source_snapshot('ml:satellite:v1:'+code,metadata)
        return metadata


def main():
    parser = argparse.ArgumentParser(description='Aprende padrões de satélite sem registros de campo.')
    parser.add_argument('--municipality',default='5107925')
    args = parser.parse_args()
    try: result = train(args.municipality)
    except ValueError as exc: parser.error(str(exc))
    print(json.dumps(result,ensure_ascii=True,indent=2))


if __name__ == '__main__':main()
