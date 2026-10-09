let agriculturalLayer, agriculturalFeatures = [], cropRequest = 0;
let inactivePoll;
// Product palette shared by filters, map layers and municipal indicators.
const CROP_COLORS = {39:'#d6a316',20:'#269b65',40:'#3b82f6',62:'#a855f7',46:'#a66b44',47:'#f97316',35:'#db2777',41:'#14b8a6',48:'#64748b'};
function cropColor(classId) { return CROP_COLORS[classId] || '#64748b'; }
function featureColor(properties) { return properties.possible_inactive ? '#e76f51' : cropColor(properties.class_id); }
const cropDataCache = new Map();
function cropData(payload) {
  const key = JSON.stringify(payload);
  if (!cropDataCache.has(key)) {
    const request = fetch('/api/sources/mapbiomas', {method:'POST',headers:{'Content-Type':'application/json'},body:key,signal:AbortSignal.timeout(90000)})
      .then(async response => { const result=await response.json(); if(!response.ok) throw new Error(result.error || 'Não foi possível carregar a cultura.'); return result; })
      .catch(error => { cropDataCache.delete(key); throw error; });
    cropDataCache.set(key,request);
    if(cropDataCache.size>40) cropDataCache.delete(cropDataCache.keys().next().value);
  }
  return cropDataCache.get(key);
}

function clearAgriculturalResults() {
  cropRequest++;
  clearTimeout(inactivePoll);
  if (mapReady) removeMapLayer(agriculturalLayer);
  agriculturalLayer = null; agriculturalFeatures = [];
  const select = document.getElementById('mapbiomas-candidates');
  select.replaceChildren(new Option('Marque uma cultura para visualizar áreas','')); select.disabled = true;
}

function useAgriculturalArea(index) {
  const feature = agriculturalFeatures[index];
  if (!feature || drawingArea) return;
  const p = feature.properties, name = `${p.class_name} · mapa ${p.year} · ${p.area_ha} ha`;
  selectAnalysisArea(feature, name);
  selectedAreaProvenance = { ...p };
  if(p.class_id===39 && !p.overview) document.dispatchEvent(new CustomEvent('alytha-soy-selected',{detail:feature}));
  document.getElementById('area-name').value = name;
  document.getElementById('area-crop').value = 'Não confirmada';
  document.getElementById('area-season').value = 'Não confirmada';
  document.getElementById('area-details').textContent = `${name}. MapBiomas histórico · ${p.resolution_m} m.${p.overview ? ' Visão geral aproximada; aproxime o mapa para selecionar uma área em detalhe.' : ''} Confirme cultura e safra antes de salvar.`;
  if(p.evidence) {
    document.getElementById('selected-area-tools').open=true;
    document.getElementById('area-details').textContent=`${p.area_ha} ha · última observação ${p.evidence.latest_date} · NDVI ${p.evidence.latest_ndvi.toFixed(3)}. ${p.evidence.reason}`;
    renderNdvi(p.evidence.points); document.getElementById('ndvi-panel').classList.add('visible');
    document.querySelector('#ndvi-panel .analysis-subtitle').textContent='Três leituras recentes da vegetação, cada uma com pelo menos metade da área avaliada. Confira a situação no campo.';
    setNdviStatus('Possível ausência de lavoura ativa. Não confirma área vazia ou disponibilidade para plantio.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const el = id => document.getElementById(id);
  el('inactive-soy-filter').checked=false;
  document.querySelectorAll('input[name="map-crop"]').forEach(input => { input.checked = false; input.closest('label').style.setProperty('--crop-color',cropColor(input.value)); });
  for (let year = 2025; year >= 1985; year--) el('mapbiomas-year').add(new Option(year, year));
  async function run(button, status, task, revision) {
    if(button) button.disabled = true;
    status.setAttribute('aria-busy','true'); status.textContent = 'Buscando dados…';
    try { await task(); } catch (error) { if (revision === undefined || revision === cropRequest) status.textContent = error.message; }
    finally { if (revision === undefined || revision === cropRequest) { if(button) button.disabled = false; status.setAttribute('aria-busy','false'); } }
  }
  function updateCropMap() {
    clearTimeout(inactivePoll);
    const revision = ++cropRequest;
    return run(null, el('mapbiomas-status'), async () => {
    if (!mapReady || drawingArea) throw new Error('Aguarde o mapa e conclua o desenho primeiro.');
    const classes = [...document.querySelectorAll('input[name="map-crop"]:checked')].map(input => Number(input.value));
    if (!classes.length) { el('mapbiomas-status').textContent = 'Marque uma cultura para visualizar suas áreas.'; return; }
    const b = map.getBounds(), sw = b.getSouthWest(), ne = b.getNorthEast();
    const bounds = openMap ? [sw.lng,sw.lat,ne.lng,ne.lat] : [sw.lng(),sw.lat(),ne.lng(),ne.lat()];
    if(el('inactive-soy-filter').checked) {
      const job=await storageJson('/api/inactive-soy',{bounds,municipality_code:el('municipality-select').value || undefined,year:Number(el('mapbiomas-year').value)});
      if(revision===cropRequest) pollInactive(job,revision);
      return;
    }
    const results = [];
    let pending = classes.length;
    const tasks = classes.map(async class_id => {
      const result = await cropData({bounds,municipality_code:el('municipality-select').value || undefined,year:Number(el('mapbiomas-year').value),class_id});
      results.push(result); pending--;
      if (revision === cropRequest) renderCropResults(results,pending);
    });
    const settled = await Promise.allSettled(tasks);
    if (revision !== cropRequest) return;
    if(results.length) renderCropResults(results,0);
    const failures=settled.filter(item => item.status === 'rejected');
    if(failures.length) el('mapbiomas-status').textContent += ' ' + failures.map(item => item.reason.message).join(' ');
    }, revision);
  }
  function renderCropResults(results,pending) {
    const result = {type:'FeatureCollection', features:results.flatMap(item => item.features), year:results[0].year, class_name:results.map(item => item.class_name).join(', '), overview:results.some(item => item.overview), resolution_m:Math.max(...results.map(item => item.resolution_m))};
    removeMapLayer(agriculturalLayer); agriculturalFeatures = result.features;
    agriculturalFeatures.forEach((feature,index) => feature.properties.candidate_index = index);
    if (openMap) agriculturalLayer = L.geoJSON(result, { style:feature => ({color:featureColor(feature.properties),fillColor:featureColor(feature.properties),weight:2,fillOpacity:0.28}), onEachFeature:(feature,layer) => layer.on('click', () => useAgriculturalArea(agriculturalFeatures.indexOf(feature))) }).addTo(map);
    else {
      agriculturalLayer = new google.maps.Data({map}); agriculturalLayer.addGeoJson(result);
      agriculturalLayer.setStyle(feature => ({strokeColor:featureColor({class_id:feature.getProperty('class_id'),possible_inactive:feature.getProperty('possible_inactive')}),strokeWeight:2,fillColor:featureColor({class_id:feature.getProperty('class_id'),possible_inactive:feature.getProperty('possible_inactive')}),fillOpacity:0.28}));
      agriculturalLayer.addListener('click', event => {
        if (drawingArea) { drawingPoints.push([event.latLng.lng(),event.latLng.lat()]); redrawSketch(); return; }
        useAgriculturalArea(event.feature.getProperty('candidate_index'));
      });
    }
    el('mapbiomas-candidates').replaceChildren(new Option('Selecione ou clique em uma mancha no mapa',''));
    result.features.forEach((feature,index) => el('mapbiomas-candidates').add(new Option(`${feature.properties.class_name} · ${feature.properties.area_ha} ha`, index)));
    el('mapbiomas-candidates').disabled = !result.features.length;
    el('mapbiomas-status').textContent = `${result.features.length} áreas · ${result.class_name} · ${result.year}${result.overview ? ` · visão geral (${result.resolution_m} m)` : ' · detalhe de 30 m'}`;
    el('mapbiomas-detail-status').textContent = `Recorte visível${document.getElementById('municipality-select').value ? ' dentro do município' : ''}. Classificação histórica; não confirma a cultura atual.${results.some(item => item.features.length >= 200) ? ' Limite de áreas atingido; aproxime o mapa.' : ''}${result.overview ? ' Visualização aproximada: áreas pequenas podem não aparecer. Aproxime o mapa para o detalhe de 30 m.' : ''}`;
    if(pending) el('mapbiomas-status').textContent += ` / Carregando ${pending} cultura(s)...`;
  }
  function pollInactive(job,revision) {
    if(revision!==cropRequest || !el('inactive-soy-filter').checked) return;
    if(job.type==='FeatureCollection') renderCropResults([job],0);
    const unknown=(job.assessed || []).filter(item=>item.status==='unknown').length;
    el('mapbiomas-status').textContent=`${job.features.length} possíveis áreas inativas · ${job.processed}/${job.total ?? job.limit} verificadas${unknown ? ` · ${unknown} sem evidência suficiente` : ''}${job.status==='loading' ? ' · analisando…' : ''}`;
    el('mapbiomas-detail-status').textContent=`Área identificada como soja no mapa de ${job.parameters.year}; a cultura atual precisa ser conferida. A busca avalia até 10 áreas menores na parte do mapa exibida. Em coral: pouco sinal recente de vegetação, sem confirmação de área livre para plantio. A triagem exige três leituras recentes com pelo menos metade da área observada. Pós-colheita, preparo e pousio podem apresentar sinais parecidos; confirme o manejo no campo.`;
    const output=el('inactive-soy-evidence'); output.replaceChildren();
    (job.assessed || []).forEach(item=>{const p=document.createElement('p');p.textContent=`${item.area_ha} ha · ${item.status==='possible_inactive' ? 'possível inatividade' : item.status==='unknown' ? 'inconclusivo' : 'não corresponde'}${item.latest_date ? ` · ${item.latest_date} · NDVI ${item.latest_ndvi.toFixed(3)}` : ''}. ${item.reason}`;output.append(p);});
    if(job.status==='loading') inactivePoll=setTimeout(async()=>{
      try { const result=await storageJson(`/api/inactive-soy/${job.id}`);pollInactive(result,revision); }
      catch(error) { if(revision===cropRequest) el('mapbiomas-status').textContent=error.message; }
    },2500);
    if(job.status==='error') el('mapbiomas-status').textContent=job.error;
  }
  el('mapbiomas-candidates').addEventListener('change', event => { if (event.target.value !== '') useAgriculturalArea(Number(event.target.value)); });
  let layersHidden=false;
  el('clear-mapbiomas').addEventListener('click', () => { layersHidden=true; clearAgriculturalResults(); el('mapbiomas-status').setAttribute('aria-busy','false'); el('mapbiomas-status').textContent = 'Camada oculta. Marque uma cultura para voltar a exibir.'; });
  function filterChanged() {
    layersHidden=false;
    clearAgriculturalResults();
    el('inactive-soy-evidence').replaceChildren();
    if (selectedAreaProvenance.source === 'MapBiomas' &&
        (!document.querySelector(`input[name="map-crop"][value="${selectedAreaProvenance.class_id}"]:checked`) || selectedAreaProvenance.year !== Number(el('mapbiomas-year').value))) clearAnalysisArea();
    el('mapbiomas-status').textContent = 'Filtro alterado. Atualizando áreas…';
    updateCropMap();
  }
  document.querySelectorAll('input[name="map-crop"]').forEach(input => input.addEventListener('change',filterChanged));
  el('mapbiomas-year').addEventListener('change',filterChanged);
  el('inactive-soy-filter').addEventListener('change',event=>{
    document.querySelectorAll('input[name="map-crop"]').forEach(input=>{input.disabled=event.target.checked; if(event.target.checked) input.checked=input.value==='39';});
    filterChanged();
  });
  let viewportTimer, boundMap;
  function bindViewportUpdates() {
    if(!mapReady || boundMap===map) return;
    boundMap=map;
    const changed=()=>{
      clearTimeout(viewportTimer);
      viewportTimer=setTimeout(()=>{
        if(!layersHidden && !drawingArea && document.querySelector('input[name="map-crop"]:checked')) updateCropMap();
      },650);
    };
    if(openMap) map.on('moveend',changed); else map.addListener('idle',changed);
  }
  document.addEventListener('alytha-map-ready',bindViewportUpdates);
  if(mapReady) bindViewportUpdates();
  for (const id of ['state-select','municipality-select']) el(id).addEventListener('change',() => { layersHidden=false; clearTimeout(viewportTimer); clearAgriculturalResults(); el('mapbiomas-status').setAttribute('aria-busy','false'); el('mapbiomas-status').textContent='As culturas selecionadas serão exibidas ao carregar a localidade.'; });
  el('load-conab').addEventListener('click', event => run(event.currentTarget, el('conab-status'), async () => {
    const uf = el('conab-uf').value.trim().toUpperCase(), crop = el('conab-crop').value;
    const result = await storageJson(`/api/sources/conab?uf=${encodeURIComponent(uf)}&crop=${crop}`);
    const table = document.createElement('table'); table.style.fontSize = '10px';
    const row = values => { const tr = document.createElement('tr'); values.forEach(value => { const td = document.createElement('td'); td.textContent = value; td.style.padding = '4px'; tr.append(td); }); table.append(tr); };
    row(['Safra / produto / fase','Área (ha)','Produção (t)','Rendimento (t/ha)']);
    const format = value => value === null ? '—' : value.toLocaleString('pt-BR',{maximumFractionDigits:3});
    result.records.slice(-10).reverse().forEach(record => row([`${record.season} · ${record.crop} · ${record.phase}`,format(record.area_ha),format(record.production_t),format(record.yield_t_ha)]));
    el('conab-results').replaceChildren(table);
    el('conab-status').textContent = `${result.records.length} registros de ${uf}; exibindo os 10 últimos. ${result.note} Importado em ${new Date(result.fetched_at).toLocaleString('pt-BR')}.`;
    const link = document.createElement('a'); link.href = result.source_url; link.textContent = 'Arquivo oficial CONAB'; link.target = '_blank'; link.rel = 'noopener'; el('conab-results').append(link);
  }));
  storageJson('/api/sources/status').then(result => {
    el('load-satveg').disabled = !result.satveg_configured;
    el('satveg-status').textContent = result.satveg_configured ? 'Histórico de vegetação disponível para consulta. Resolução de 250 m; intervalos de 16 dias.' : 'Histórico Embrapa indisponível no momento. Você pode consultar o NDVI Sentinel-2 pela linha do tempo.';
  }).catch(error => el('satveg-status').textContent = error.message);
  el('load-satveg').addEventListener('click', event => run(event.currentTarget, el('satveg-status'), async () => {
    if (!fieldLoaded || drawingArea) throw new Error('Selecione uma área primeiro.');
    const result = await storageJson('/api/sources/satveg', {geojson:await fieldGeojson(),from:dateFrom.value,to:dateTo.value});
    renderNdvi(result.points,{aggregationDays:16}); el('ndvi-panel').classList.add('visible');
    document.querySelector('#ndvi-panel .analysis-subtitle').textContent = 'Histórico Embrapa · cada leitura reúne 16 dias. A imagem é menos detalhada que a do Sentinel-2; evite comparar os valores diretamente.';
    setNdviStatus(`${result.source}: ${result.points.length} observações. ${result.note}`);
    el('satveg-status').textContent = `${result.points.length} observações. ${result.note}`;
  }));
});
