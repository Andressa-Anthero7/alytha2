let researchHistory=null, researchPoll, researchRevision=0, researchAnalysisRevision=0;

document.addEventListener('DOMContentLoaded',()=>{
  const el=id=>document.getElementById(id);
  function satelliteStatus(model) {
    el('satellite-model-status').textContent=model ? `${model.areas.toLocaleString('pt-BR')} recortes com leituras recentes suficientes · ${model.profiles.length} perfis de vegetação · ${model.atypical_areas.toLocaleString('pt-BR')} recortes com comportamento diferente do conjunto. ${model.collection_complete ? 'Coleta concluída.' : 'Leitura parcial: atualize os padrões quando a coleta terminar.'} Base até ${model.period.to.split('-').reverse().join('/')}.` : 'O aprendizado usa somente as imagens já coletadas da cidade. Não precisa preencher registros de campo.';
    el('satellite-profiles').replaceChildren();
    (model?.profiles || []).forEach(profile=>{
      const line=document.createElement('p');
      line.textContent=`${profile.label}: ${profile.areas.toLocaleString('pt-BR')} recortes · ${profile.area_ha.toLocaleString('pt-BR',{maximumFractionDigits:0})} ha. ${profile.id===1 ? 'Grupo com menor presença média de vegetação no conjunto.' : profile.id===model.profiles.length ? 'Grupo com maior presença média de vegetação no conjunto.' : ''}`;
      el('satellite-profiles').append(line);
    });
  }
  async function modelStatus() {
    const status=await storageJson('/api/research/status'),ml=status.ml;
    satelliteStatus(status.satellite);
    el('model-status').textContent=ml.model ? `A análise também usa ${ml.model.events} situações de manejo confirmadas. Ainda precisa ser conferida em outras áreas antes de apoiar decisões de manejo.` : `Recurso opcional para quem possui informações de manejo: ${ml.events} situações confirmadas em ${ml.areas} áreas. Este modelo exige 30 situações em 3 áreas, com 2 etapas diferentes e 5 exemplos de cada etapa. A leitura e o aprendizado por satélite funcionam sem esses registros.`;
    el('train-management-model').disabled=ml.events<30 || ml.areas<3;
    el('ai-prompt-status').textContent=status.assistant?.configured ? `Assistente ${status.assistant.provider} configurado. Faça uma pergunta sobre as evidências disponíveis.` : `Assistente ${status.assistant?.provider || ''} aguardando conexão. O histórico e as regras temporais já podem ser usados.`;
    return status;
  }
  async function analysis(date) {
    if(!researchHistory) return;
    const revision=researchRevision,id=researchHistory.id,analysisRevision=++researchAnalysisRevision;
    const result=await storageJson('/api/research/analyze',{dataset_id:id,date});
    if(revision!==researchRevision || researchHistory?.id!==id || analysisRevision!==researchAnalysisRevision) return;
    const readings={
      inconclusivo:'Ainda não há leitura suficiente para interpretar o manejo da área.',
      emergencia:'A vegetação aumentou depois de um período com pouco verde. Pode ser início do desenvolvimento da cultura, rebrota ou plantas espontâneas.',
      desenvolvimento:'A área apresentou aumento do vigor da vegetação, compatível com desenvolvimento vegetal.',
      colheita:'O vigor caiu depois de um período com mais vegetação. Pode estar relacionado à colheita ou a outro evento de perda de vegetação.',
      solo_exposto:'A área manteve pouco sinal de vegetação. Pode haver solo exposto, pós-colheita ou pousio; o satélite sozinho não diferencia essas situações.'
    };
    el('research-analysis').textContent=`${readings[result.baseline.stage] || result.baseline.label} ${result.model_prediction ? `A análise baseada nos registros de campo sugere ${result.model_prediction.label.toLowerCase()}, ainda sem confirmação.` : ''} Compare a sequência de imagens e o mesmo período nos anos anteriores disponíveis.`;
    el('research-analysis-method').textContent=`${result.baseline.reason}${result.vegetation_patterns ? ` O histórico foi separado em ${result.vegetation_patterns.groups.length} grupos de comportamento da vegetação. Esses grupos não identificam etapas de manejo.` : ''}${result.model_prediction ? ` Resultado experimental do modelo: ${result.model_prediction.label}; pontuação ${(result.model_prediction.probability_uncalibrated*100).toLocaleString('pt-BR',{maximumFractionDigits:0})}%, que não representa uma chance comprovada de acerto.` : ' A interpretação utiliza somente a evolução observada pelo satélite; as hipóteses de manejo não são confirmações.'}`;
  }
  function chartYear() {
    if(!researchHistory) return;
    const year=el('research-year').value;
    const points=researchHistory.points.filter(p=>p.date.startsWith(year));
    renderNdvi(points);el('ndvi-panel').classList.add('visible');
    document.querySelector('#ndvi-panel .analysis-subtitle').textContent=`Sorriso · vegetação em ${year} · cada leitura reúne até 5 dias de imagens. Períodos sem leitura não foram estimados.`;
    setNdviStatus(`${points.length} leituras do satélite. Compare os períodos de aumento e queda da vegetação com os outros anos disponíveis.`);
    const cutoff=points.length ? points[points.length-1].date : `${year}-12-31`;
    analysis(cutoff).catch(error=>el('research-analysis').textContent=error.message);
  }
  async function watch(history,revision) {
    if(revision!==researchRevision) return;
    researchHistory=history;
    const previous=el('research-year').value;
    el('research-year').replaceChildren();
    (history.years || []).filter(y=>y.status==='ready').forEach(y=>el('research-year').add(new Option(`${y.year} · ${y.observations} leituras`,y.year)));
    el('research-year').disabled=!el('research-year').options.length;
    if([...el('research-year').options].some(o=>o.value===previous)) el('research-year').value=previous;
    else if(el('research-year').options.length) el('research-year').selectedIndex=el('research-year').options.length-1;
    el('research-status').textContent=`${history.processed}/${history.total} anos consultados · ${history.points.length} leituras da vegetação${history.status==='loading' ? ' · carregando…' : history.status==='partial' ? ' · alguns anos indisponíveis' : ''}`;
    if(history.points.length) chartYear();
    if(history.status==='loading') researchPoll=setTimeout(async()=>{
      try {await watch(await storageJson(`/api/research/history/${history.id}`),revision);}catch(error){if(revision===researchRevision)el('research-status').textContent=error.message;}
    },3000);
    else if(history.error) el('research-status').textContent=history.error;
  }
  async function start(button,pilot) {
    button.disabled=true;clearTimeout(researchPoll);const revision=++researchRevision;
    el('research-status').textContent='Preparando o histórico de Sorriso…';
    try {
      if(!pilot && (!fieldLoaded || drawingArea)) throw Error('Selecione ou conclua uma área em Sorriso primeiro.');
      const history=await storageJson(pilot?'/api/research/pilot':'/api/research/history',pilot ? {start_year:2018} : {geojson:await fieldGeojson(),start_year:Number(el('research-start-year').value)});
      if(revision!==researchRevision)return;
      if(pilot) {
        const ready=new Promise(resolve=>{
          const listener=event=>{if(event.detail.kind==='municipalities' && event.detail.id==='5107925'){clearTimeout(timeout);document.removeEventListener('alytha-region-ready',listener);resolve();}};
          const timeout=setTimeout(()=>{document.removeEventListener('alytha-region-ready',listener);resolve();},20000);
          document.addEventListener('alytha-region-ready',listener);
        });
        const url=new URL(location.href);url.searchParams.delete('estado');url.searchParams.set('municipio','5107925');historyPush(url);
        await ready;
        if(mapReady && revision===researchRevision) selectAnalysisArea({type:'Feature',properties:{},geometry:history.parameters.geometry},'Referência do piloto Sorriso');
      }
      localStorage.setItem('cropsense-research-history',history.id);
      await watch(history,revision);
    } catch(error) {if(revision===researchRevision)el('research-status').textContent=error.message;}
    finally {button.disabled=false;}
  }
  function historyPush(url) {window.history.pushState({},'',url);window.dispatchEvent(new PopStateEvent('popstate'));}
  el('start-sorriso-pilot').addEventListener('click',event=>start(event.currentTarget,true));
  el('start-area-history').addEventListener('click',event=>start(event.currentTarget,false));
  el('research-year').addEventListener('change',chartYear);
  el('learn-satellite-patterns').addEventListener('click',async event=>{
    const button=event.currentTarget;button.disabled=true;
    el('satellite-model-status').textContent='Comparando as leituras de Sorriso e aprendendo padrões de vegetação…';
    try {satelliteStatus(await storageJson('/api/research/satellite-learning',{municipality_code:'5107925'}));}
    catch(error){el('satellite-model-status').textContent=error.message;}
    finally{button.disabled=false;}
  });
  el('save-field-event').addEventListener('click',async event=>{
    const button=event.currentTarget;button.disabled=true;
    try {
      if(!researchHistory) throw Error('Carregue o histórico da área primeiro.');
      await storageJson('/api/research/events',{dataset_id:researchHistory.id,from:el('event-from').value,to:el('event-to').value,stage:el('event-stage').value,note:el('event-note').value});
      el('event-status').textContent='Registro de campo salvo.';await modelStatus();
    }catch(error){el('event-status').textContent=error.message;}finally{button.disabled=false;}
  });
  el('train-management-model').addEventListener('click',async event=>{
    const button=event.currentTarget;button.disabled=true;el('model-status').textContent='Treinando e validando por área…';
    try{await storageJson('/api/research/train',{});await modelStatus();if(researchHistory)await analysis();}
    catch(error){el('model-status').textContent=error.message;}finally{button.disabled=false;}
  });
  el('ai-prompt-submit').textContent='Consultar assistente';
  el('ai-prompt-submit').addEventListener('click',async event=>{
    const button=event.currentTarget;button.disabled=true;el('ai-prompt-status').textContent='Consultando evidências…';
    try {
      const result=await storageJson('/api/assistant',{prompt:el('ai-prompt').value,municipality_code:el('municipality-select').value || '5107925',dataset_id:researchHistory?.id});
      el('ai-prompt-status').textContent=`${result.answer}\n${result.limitations.join(' ')}\nFontes: ${result.sources.map(s=>s.source).join(', ') || 'sem evidências locais suficientes'}`;
      if(result.action.kind==='filter_crops') {
        const inactive=el('inactive-soy-filter');if(inactive.checked){inactive.checked=false;inactive.dispatchEvent(new Event('change'));}
        document.querySelectorAll('input[name="map-crop"]').forEach(input=>input.checked=result.action.class_ids.includes(Number(input.value)));
        document.querySelector('input[name="map-crop"]').dispatchEvent(new Event('change'));
      }
      if(result.action.kind==='show_history') {el('research-panel').open=true;if(researchHistory)chartYear();}
      if(result.action.kind==='view_sorriso') {const url=new URL(location.href);url.searchParams.set('municipio','5107925');url.searchParams.delete('estado');historyPush(url);}
    }catch(error){el('ai-prompt-status').textContent=error.message;}finally{button.disabled=false;}
  });
  const initialRevision=researchRevision;
  modelStatus().then(async status=>{
    if(researchRevision!==initialRevision) return;
    const id=localStorage.getItem('cropsense-research-history') || status.pilot?.dataset_id;
    if(id)try{await watch(await storageJson(`/api/research/history/${id}`),++researchRevision);}catch{localStorage.removeItem('cropsense-research-history');}
  }).catch(error=>el('model-status').textContent=error.message);
});
