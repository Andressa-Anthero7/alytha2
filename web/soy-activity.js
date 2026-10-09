/* Municipal scope follows the selected city, independently of a drawn field. */
document.addEventListener('DOMContentLoaded',()=>{
  const el=id=>document.getElementById(id);
  const panel=el('soy-activity-panel'),toggle=el('soy-expand-toggle');
  let code='',revision=0,loading=false,poll,hasResult=false,mapSearch=null;
  const ha=value=>(value || 0).toLocaleString('pt-BR',{maximumFractionDigits:1})+' ha';
  function cityCode() {return mapSearch!==null ? mapSearch.municipality_code : el('municipality-select').value || new URL(location.href).searchParams.get('municipio') || '';}
  function cityName() {
    if(mapSearch!==null)return mapSearch.municipality_name;
    return el('municipality-select').value===code ? el('municipality-select').selectedOptions[0]?.textContent || code : 'Município '+code;
  }
  function labels() {
    el('soy-area-label').textContent=code ? `${cityName()} · áreas de soja histórica da cidade pesquisada no mapa.` : mapSearch!==null ? `${cityName()} · não foi possível identificar o município desta pesquisa. O gráfico anterior foi limpo.` : 'Pesquise ou selecione uma cidade no mapa para acompanhar suas áreas de soja.';
  }
  function resetChart() {
    revision++;clearTimeout(poll);loading=false;hasResult=false;
    document.dispatchEvent(new Event('alytha-soy-context-cleared'));
    renderNdvi([],{prefix:'soy',activity:true});
    el('soy-point-detail').textContent='Distribuição da área de soja histórica por classe de atividade vegetativa no município pesquisado.';
    el('soy-status').textContent='Baixo vigor vegetativo pode ocorrer em pós-colheita, preparo do solo ou pousio, sem identificação conclusiva do manejo.';
    labels();
  }
  async function watch(job,current) {
    if(current!==revision)return;
    document.dispatchEvent(new CustomEvent('alytha-soy-job-updated',{detail:job}));
    if(job.points?.length) {renderNdvi(job.points,{prefix:'soy',activity:true,municipal:true});hasResult=true;}
    if(job.phase==='mapping') el('soy-status').textContent='Identificando as áreas históricas de soja em toda a cidade…';
    else {
      el('soy-status').textContent=`${job.processed}/${job.total} recortes consultados · soja histórica de 2025${job.status==='loading'?' · leitura parcial, em andamento.':' · consulta concluída.'}`;
      if(job.total_soy_ha===0)el('soy-status').textContent='Não foram encontradas áreas de soja no mapa histórico de 2025 dentro desta cidade.';
    }
    if(job.status==='error')el('soy-status').textContent=job.error;
    if(job.status==='loading') {
      poll=setTimeout(async()=>{
        try {await watch(await storageJson(`/api/soy-activity/municipality/${job.id}`),current);}
        catch(error) {if(current===revision){loading=false;el('soy-status').textContent=error.message;labels();}}
      },3000);
    } else {loading=false;labels();}
  }
  async function load() {
    if(loading || !code)return;
    const current=++revision;clearTimeout(poll);loading=true;labels();
    el('soy-status').textContent='Preparando a análise da cidade pesquisada no mapa…';
    try {
      const job=await storageJson('/api/soy-activity/municipality',{municipality_code:code});
      await watch(job,current);
    } catch(error) {if(current===revision){loading=false;el('soy-status').textContent=error.message;labels();}}
  }
  function syncCity() {
    const next=cityCode();
    if(next===code){labels();return;}
    code=next;
    resetChart();
    if(code && panel.classList.contains('visible'))load();
  }
  document.addEventListener('alytha-map-search',event=>{mapSearch=event.detail;syncCity();});
  document.addEventListener('alytha-region-ready',syncCity);
  el('municipality-select').addEventListener('change',()=>{mapSearch=null;syncCity();});
  el('state-select').addEventListener('change',()=>{mapSearch=null;syncCity();});
  window.addEventListener('popstate',()=>{mapSearch=null;setTimeout(syncCity,0);});
  toggle.addEventListener('click',()=>{
    const expanded=panel.classList.toggle('visible');
    if(expanded) {
      el('ndvi-panel').classList.remove('visible');syncCity();
      if(matchMedia('(max-width:760px)').matches) {el('side-panel').classList.add('closed');el('panel-toggle').setAttribute('aria-expanded','false');}
      if(!hasResult)load();
    }
  });
  new MutationObserver(()=>{
    const expanded=panel.classList.contains('visible');
    toggle.setAttribute('aria-expanded',String(expanded));
    toggle.setAttribute('aria-label',expanded?'Recolher atividade da soja':'Abrir atividade da soja');
    toggle.title=toggle.getAttribute('aria-label');
  }).observe(panel,{attributes:true,attributeFilter:['class']});
  code=cityCode();labels();
});
