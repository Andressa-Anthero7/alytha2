"""Load historical crop maps without holding browser connections open."""
import hashlib
import json
import re
import threading
from concurrent.futures import ThreadPoolExecutor
from . import data_sources, storage

POOL = ThreadPoolExecutor(max_workers=2, thread_name_prefix='crop-map')
LOCK = threading.Lock()
RUNNING = set()
MAX_PENDING = 8


def start(data):
    params = data_sources.mapbiomas_parameters(data)
    job_id = hashlib.sha256(json.dumps(params, sort_keys=True).encode()).hexdigest()
    with LOCK:
        saved = storage.source_snapshot('crop-map:v1:' + job_id)
        if job_id in RUNNING or (saved and saved['result']['status'] == 'ready'):
            return saved['result']
        return _schedule(job_id, params)


def get(job_id):
    if not isinstance(job_id, str) or not re.fullmatch(r'[a-f0-9]{64}', job_id):
        raise ValueError('Consulta de culturas inválida.')
    with LOCK:
        saved = storage.source_snapshot('crop-map:v1:' + job_id)
        if not saved: raise ValueError('Consulta de culturas não encontrada. Envie o pedido novamente.')
        job = saved['result']
        # A server restart should resume pending work, not poll forever.
        if job['status'] == 'loading' and job_id not in RUNNING:
            return _schedule(job_id, job['parameters'])
        return job


def _schedule(job_id, params):
    if len(RUNNING) >= MAX_PENDING:
        raise ValueError('Há consultas de culturas em andamento. Aguarde um instante e tente novamente.')
    job = {'id':job_id,'status':'loading','parameters':params}
    storage.source_snapshot('crop-map:v1:' + job_id, job)
    RUNNING.add(job_id)
    try:
        POOL.submit(_build, job_id, params)
    except Exception:
        RUNNING.discard(job_id)
        job.update(status='error', error='Não foi possível iniciar a consulta de culturas. Tente novamente.')
        storage.source_snapshot('crop-map:v1:' + job_id, job)
        raise ValueError(job['error']) from None
    return job


def _build(job_id, params):
    job = {'id':job_id,'parameters':params}
    try:
        result = data_sources.mapbiomas(params)
        job.update(status='ready', result=result)
    except ValueError as exc:
        job.update(status='error', error=str(exc))
    except Exception:
        job.update(status='error', error='A fonte do mapa de culturas não respondeu. Tente novamente em instantes.')
    finally:
        try:
            storage.source_snapshot('crop-map:v1:' + job_id, job)
        finally:
            with LOCK: RUNNING.discard(job_id)
