/* Resize the map's viewport when notebook docks open or close. */
document.addEventListener('DOMContentLoaded',()=>{
  const canvas=document.getElementById('map');
  let frame;
  function resizeMap() {
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>{
      if(!mapReady)return;
      if(openMap)map.invalidateSize({pan:false,debounceMoveend:true});
      else if(window.google?.maps?.event) {
        const center=map.getCenter();google.maps.event.trigger(map,'resize');
        if(center)map.setCenter(center);
      }
    });
  }
  new ResizeObserver(resizeMap).observe(canvas);
  document.addEventListener('alytha-map-ready',resizeMap);
  document.getElementById('panel-toggle').setAttribute('aria-expanded',String(!document.getElementById('side-panel').classList.contains('closed')));
  if(matchMedia('(min-width:1000px)').matches)document.getElementById('crop-layers-panel').open=false;
  let searchedCity=null,municipalJob=null,selectedDate='',contextRevision=0;
  const citySelect=document.getElementById('municipality-select');
  function assistantContext() {
    const code=searchedCity!==null ? searchedCity.municipality_code : citySelect.value || new URL(location.href).searchParams.get('municipio') || '';
    const name=searchedCity!==null ? searchedCity.municipality_name : citySelect.value===code && code ? citySelect.selectedOptions[0]?.textContent : code ? 'Município '+code : 'Localidade não selecionada';
    const job=municipalJob?.parameters?.municipality_code===code ? municipalJob : null;
    return {municipality_code:code,municipal_job_id:job?.id,map_date:job ? selectedDate || job.parameters.as_of : undefined,name,revision:contextRevision};
  }
  window.agriAssistantContext=assistantContext;
  function updateContext() {
    const context=assistantContext();
    const parts=[context.name];
    if(context.map_date)parts.push('avaliação em '+context.map_date.split('-').reverse().join('/'));
    parts.push(context.municipal_job_id ? 'soja histórica · leitura municipal' : 'panorama da cidade; histórico de uma área quando disponível');
    document.getElementById('ai-map-context').textContent=parts.join(' · ');
  }
  document.addEventListener('alytha-map-search',event=>{searchedCity=event.detail;contextRevision++;updateContext();});
  for(const id of ['municipality-select','state-select'])document.getElementById(id).addEventListener('change',()=>{searchedCity=null;contextRevision++;updateContext();});
  window.addEventListener('popstate',()=>{searchedCity=null;contextRevision++;setTimeout(updateContext,0);});
  document.addEventListener('alytha-region-ready',updateContext);
  document.addEventListener('alytha-soy-job-updated',event=>{municipalJob=event.detail;updateContext();});
  document.addEventListener('alytha-soy-context-cleared',()=>{municipalJob=null;selectedDate='';contextRevision++;updateContext();});
  document.addEventListener('alytha-soy-date-selected',event=>{if(selectedDate!==event.detail.date)contextRevision++;selectedDate=event.detail.date;updateContext();});
  for(const type of ['alytha-area-selected','alytha-area-cleared'])document.addEventListener(type,()=>{contextRevision++;updateContext();});
  document.querySelectorAll('[data-ai-question]').forEach(button=>button.addEventListener('click',()=>{
    document.getElementById('ai-prompt').value=button.dataset.aiQuestion;
    document.getElementById('ai-prompt').focus();
  }));
  document.getElementById('ai-prompt').addEventListener('keydown',event=>{
    if(event.key==='Enter' && (event.ctrlKey || event.metaKey)) {event.preventDefault();document.getElementById('ai-prompt-submit').click();}
  });
  updateContext();
  for(const prefix of ['soy','ndvi'])document.getElementById(prefix+'-panel-close').addEventListener('click',()=>{
    document.getElementById(prefix==='soy'?'soy-activity-panel':'ndvi-panel').classList.remove('visible');
  });
});
