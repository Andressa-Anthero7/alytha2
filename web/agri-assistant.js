/* Session conversation stays with the current map area and period. */
document.addEventListener('DOMContentLoaded',()=>{
  const el=id=>document.getElementById(id),output=el('ai-prompt-status'),input=el('ai-prompt'),send=el('ai-prompt-submit');
  let conversation=[],generation=0,scopeKey=null;
  function scope() {
    const context=window.agriAssistantContext?.();
    return JSON.stringify([context?.municipality_code,context?.map_date,researchHistory?.id]);
  }
  function reset() {generation++;conversation=[];output.replaceChildren();send.disabled=false;scopeKey=scope();}
  function sync() {if(scopeKey!==scope())reset();}
  for(const type of ['alytha-area-selected','alytha-area-cleared','alytha-map-search'])document.addEventListener(type,reset);
  for(const type of ['alytha-soy-date-selected','alytha-region-ready','alytha-soy-context-cleared','alytha-history-ready'])document.addEventListener(type,()=>queueMicrotask(sync));
  for(const id of ['municipality-select','state-select'])el(id).addEventListener('change',()=>queueMicrotask(sync));
  window.addEventListener('popstate',()=>queueMicrotask(sync));

  function turn(label,text,kind) {
    const article=document.createElement('article'),name=document.createElement('span'),message=document.createElement('p');
    article.className='ai-turn ai-turn-'+kind;name.className='ai-turn-name';name.textContent=label;message.textContent=text;
    article.append(name,message);return article;
  }
  function followups(result) {
    output.querySelectorAll('.ai-followups').forEach(row=>row.remove());
    const row=document.createElement('div');row.className='ai-followups';row.setAttribute('aria-label','Continuar a conversa');
    const choices=[['O que priorizar?','Do que acabamos de analisar, o que merece prioridade e por quê?'],['E na próxima leitura?','Qual sinal devemos observar na próxima leitura para acompanhar essa situação?']];
    if(result.sources.some(source=>source.id==='historical_comparison'))choices.push(['Compare com o histórico','Como essa situação se compara ao mesmo período dos anos anteriores neste recorte?']);
    for(const [label,question] of choices) {
      const button=document.createElement('button');button.type='button';button.textContent=label;
      button.addEventListener('click',()=>{input.value=question;input.focus();});row.append(button);
    }
    return row;
  }
  send.addEventListener('click',async()=>{
    if(send.disabled)return;
    sync();const prompt=input.value.trim(),context=window.agriAssistantContext(),current=generation;
    if(!prompt){input.focus();return;}
    if(!context.municipality_code) {output.replaceChildren(turn('Alytha','Pesquise ou selecione uma cidade no mapa para começarmos a leitura.','assistant'));return;}
    send.disabled=true;
    const question=turn('Você',prompt,'user'),reply=turn('Alytha','Estou olhando o acompanhamento desta área…','assistant');
    reply.setAttribute('aria-busy','true');output.querySelectorAll('.ai-followups').forEach(row=>row.remove());output.append(question,reply);input.value='';
    while(output.querySelectorAll('.ai-turn').length>8)output.firstElementChild.remove();
    try {
      const monitoring=window.cropMonitoringContext?.();
      const history=monitoring?.municipality_code===context.municipality_code ? monitoring : researchHistory;
      const dataset=history?.parameters?.municipality_code || history?.municipality_code || '5107925';
      const result=await storageJson('/api/assistant',{prompt,conversation:conversation.slice(-3),municipality_code:context.municipality_code,municipal_job_id:context.municipal_job_id,map_date:context.map_date,dataset_id:dataset===context.municipality_code ? history?.dataset_id || history?.id : undefined,area_geojson:fieldLoaded && !drawingArea ? await fieldGeojson() : undefined});
      if(current!==generation)return;
      if(window.agriAssistantContext().revision!==context.revision)throw Error('O acompanhamento do mapa mudou durante a consulta. Pergunte novamente para considerar os dados atuais.');
      reply.querySelector('p').textContent=result.answer;
      if(result.limitations.length) {const note=document.createElement('p');note.className='ai-turn-limits';note.textContent=result.limitations.join(' ');reply.append(note);}
      const sources=document.createElement('details'),summary=document.createElement('summary'),text=document.createElement('p');
      summary.textContent='Bases do acompanhamento';text.textContent=result.sources.map(source=>source.source).join(', ') || 'Sem evidências locais suficientes.';
      sources.append(summary,text);reply.append(sources,followups(result));
      conversation.push({question:prompt,answer:result.answer.slice(0,3000)});conversation=conversation.slice(-3);
      if(result.action.kind==='filter_crops') {
        const inactive=el('inactive-soy-filter');if(inactive.checked){inactive.checked=false;inactive.dispatchEvent(new Event('change'));}
        document.querySelectorAll('input[name="map-crop"]').forEach(input=>input.checked=result.action.class_ids.includes(Number(input.value)));
        document.querySelector('input[name="map-crop"]').dispatchEvent(new Event('change'));
      }
      if(result.action.kind==='show_history')document.dispatchEvent(new Event('alytha-show-history'));
      if(result.action.kind==='view_sorriso') {const url=new URL(location.href);url.searchParams.set('municipio','5107925');url.searchParams.delete('estado');window.history.pushState({},'',url);window.dispatchEvent(new PopStateEvent('popstate'));}
    } catch(error) {
      if(current===generation){reply.querySelector('p').textContent=error.message;if(!input.value)input.value=prompt;}
    } finally {
      reply.removeAttribute('aria-busy');if(current===generation)send.disabled=false;
    }
  });
});
