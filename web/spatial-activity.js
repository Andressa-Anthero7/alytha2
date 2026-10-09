/* Spatial results follow the selected area, with explicit reference scope. */
document.addEventListener('DOMContentLoaded',()=>{
  const el=id=>document.getElementById(id);
  let revision=0,poll,layer=null,result=null,geometry=null,downloadUrl=null;
  const ha=value=>value.toLocaleString('pt-BR',{maximumFractionDigits:1})+' ha';
  const date=value=>value.split('-').reverse().join('/');
  function removeLayer() {
    if(layer && mapReady)removeMapLayer(layer);
    layer=null;el('clear-spatial-analysis').hidden=true;
  }
  function clear() {
    revision++;clearTimeout(poll);result=null;removeLayer();
    if(downloadUrl)URL.revokeObjectURL(downloadUrl);downloadUrl=null;
    el('start-spatial-analysis').disabled=false;
    el('spatial-results').replaceChildren();
    el('spatial-status').textContent='Pronto para comparar três períodos de imagens. Nuvens e áreas sem leitura ficam fora da conclusão.';
  }
  function draw() {
    removeLayer();
    if(!mapReady || !result?.geojson.features.length)return;
    if(openMap) {
      layer=L.geoJSON(result.geojson,{style:{color:'#b66c2e',weight:2,fillColor:'#dfab66',fillOpacity:.28},onEachFeature:(feature,polygon)=>{
        const text=document.createElement('span');text.textContent=`Pouca vegetação persistente · ${ha(feature.properties.area_ha)} · três períodos. Não confirma terra parada.`;
        polygon.bindPopup(text);
      }}).addTo(map);
    } else {
      layer=new google.maps.Data({map});layer.addGeoJson(result.geojson);
      layer.setStyle({strokeColor:'#b66c2e',strokeWeight:2,fillColor:'#dfab66',fillOpacity:.28});
    }
    el('clear-spatial-analysis').hidden=false;
  }
  async function watch(job,current) {
    if(current!==revision)return;
    if(job.status==='loading') {
      el('spatial-status').textContent=job.phase==='dates' ? 'Buscando três períodos recentes com imagens úteis…' : `${job.processed}/3 períodos obtidos. Comparando os mesmos pixels da área…`;
      poll=setTimeout(async()=>{
        try {await watch(await storageJson('/api/spatial-activity/'+job.id),current);}
        catch(error){if(current===revision){el('spatial-status').textContent=error.message;el('start-spatial-analysis').disabled=false;}}
      },2000);return;
    }
    el('start-spatial-analysis').disabled=false;
    if(job.status==='error'){el('spatial-status').textContent=job.error;return;}
    result=job;draw();
    el('spatial-status').textContent=job.status==='inconclusive' ? 'Sem conclusão: faltou observar pelo menos metade do recorte nos três períodos. Não foram marcadas manchas.' : `${job.patches} manchas de pouca vegetação persistente · ${ha(job.persistent_low_ha)}. Não confirma terra parada.`;
    el('spatial-scope').textContent=job.parameters.scope;
    el('spatial-results').replaceChildren();
    for(const text of [`Períodos: ${job.periods.map(p=>date(p.from)+' a '+date(p.to)).join(' · ')}.`,
      `Mesmos pontos observados nos três períodos: ${(job.common_coverage*100).toLocaleString('pt-BR',{maximumFractionDigits:1})}% do recorte (${ha(job.observed_area_ha)}).`,
      `Sem leitura comum suficiente: ${ha(job.unobserved_area_ha)}.`,
      ...(job.status==='ready'?[`Regiões menores que 1 ha, fora dos contornos: ${ha(job.small_low_regions_ha)}. Características espaciais salvas para exploração com ML.`]:[])]) {
      const line=document.createElement('p');line.textContent=text;el('spatial-results').append(line);
    }
    if(job.status==='ready') {
      const link=document.createElement('a');link.textContent='Baixar contornos GeoJSON';
      downloadUrl=URL.createObjectURL(new Blob([JSON.stringify(job.geojson)],{type:'application/geo+json'}));link.href=downloadUrl;
      link.download='manchas-vegetacao-'+job.periods.at(-1).to+'.geojson';
      el('spatial-results').append(link);
    }
    if(!geometry && mapReady)fitGeojson({type:'Feature',properties:{},geometry:job.parameters.geometry});
  }
  el('start-spatial-analysis').addEventListener('click',async()=>{
    clear();const current=revision;el('start-spatial-analysis').disabled=true;
    el('spatial-status').textContent='Preparando a análise espacial…';
    try {
      if(drawingArea)throw Error('Conclua o desenho da área antes de analisar suas manchas.');
      const payload=fieldLoaded && !drawingArea ? {geojson:await fieldGeojson()} : {municipality_code:el('municipality-select').value || new URL(location.href).searchParams.get('municipio') || '5107925'};
      await watch(await storageJson('/api/spatial-activity',payload),current);
    } catch(error){if(current===revision){el('spatial-status').textContent=error.message;el('start-spatial-analysis').disabled=false;}}
  });
  el('clear-spatial-analysis').addEventListener('click',removeLayer);
  document.addEventListener('alytha-area-selected',event=>{clear();geometry=event.detail.geojson;el('spatial-scope').textContent=`Recorte selecionado: ${event.detail.name}. Não representa o município inteiro.`;});
  document.addEventListener('alytha-area-cleared',()=>{clear();geometry=null;el('spatial-scope').textContent='Sem recorte selecionado: a análise usa a referência de Sorriso, somente uma amostra.';});
  document.addEventListener('alytha-map-search',()=>{clear();});
  document.addEventListener('alytha-region-ready',()=>{clear();});
  document.addEventListener('alytha-map-ready',draw);
});
