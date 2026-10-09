/* Shared interactive time series for Sentinel-2 and SATVeg. */
function renderNdvi(input, options={}) {
  const prefix=options.prefix || 'ndvi';
  const svg=document.getElementById(prefix+'-chart');
  const detail=document.getElementById(prefix+'-point-detail');
  const technical=document.getElementById(prefix+'-technical-detail');
  const zoomIn=document.getElementById(prefix+'-zoom-in');
  const zoomOut=document.getElementById(prefix+'-zoom-out');
  const reset=document.getElementById(prefix+'-zoom-reset');
  const points=input.filter(p=>Number.isFinite(options.municipal?p.total_soy_ha:p.ndvi_mean) && Number.isFinite(Date.parse(p.date)))
    .slice().sort((a,b)=>a.date.localeCompare(b.date));
  svg.setAttribute('viewBox','0 0 640 260');
  const left=options.municipal?82:options.activity?174:48,right=614,top=28,bottom=216;
  const activityLabels={possible_inactive:'Pouca vegetação persistente',not_matched:'Sinal baixo não persistiu',unknown:'Sem leitura suficiente'};
  const activityY={possible_inactive:60,not_matched:126,unknown:192};
  const activityColor={possible_inactive:'#ce9352',not_matched:'#33816d',unknown:'#c5cdd2'};
  let start=0,end=points.length-1,selected=-1,drag=null;
  if(options.municipal && points.length) {
    const previous=svg.chartSelection;
    selected=previous ? points.findIndex(p=>p.date===previous.selectedDate) : end;
    if(selected<0)selected=end;
    if(previous && !previous.fullRange) {
      const from=points.findIndex(p=>p.date===previous.fromDate);
      const to=points.findIndex(p=>p.date===previous.toDate);
      if(from>=0 && to>=from) {start=from;end=to;}
    }
  }
  const node=(tag,attrs,text)=>{
    const element=document.createElementNS('http://www.w3.org/2000/svg',tag);
    Object.entries(attrs).forEach(([key,value])=>element.setAttribute(key,value));
    if(text!==undefined) element.textContent=text;
    svg.append(element);return element;
  };
  const formatDate=value=>new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(new Date(value));
  const time=i=>Date.parse(points[i].date);
  // Municipal snapshots are discrete assessments, not financial candles.
  // Equal-width date slots keep even adjacent assessment dates separate.
  const x=i=>options.municipal ? left+(i-start+.5)*(right-left)/(end-start+1) : time(start)===time(end) ? (left+right)/2 : left+(time(i)-time(start))/(time(end)-time(start))*(right-left);
  const low=Math.min(-.2,...points.map(p=>p.ndvi_mean));
  const y=value=>bottom-(Math.max(low,Math.min(1,value))-low)/(1-low)*(bottom-top);
  function paint() {
    svg.replaceChildren();
    zoomIn.disabled=points.length<3 || end-start<2;
    zoomOut.disabled=reset.disabled=!points.length || (start===0 && end===points.length-1);
    if(!points.length) {
      svg.chartSelection=null;
      node('text',{x:320,y:126,'text-anchor':'middle',fill:'#718078','font-size':14},'Sem observações válidas no período');
      detail.textContent='O satélite não conseguiu observar a vegetação neste período. Tente outra data.';
      technical.textContent='Sem dados disponíveis.';return;
    }
    if(options.municipal) svg.chartSelection={selectedDate:points[selected]?.date,fromDate:points[start].date,toDate:points[end].date,fullRange:start===0 && end===points.length-1};
    if(options.municipal) {
      const maximum=Math.max(1,...points.map(p=>p.total_soy_ha));
      const height=value=>value/maximum*(bottom-top);
      node('text',{x:left-12,y:14,'text-anchor':'end',fill:'#7b8892','font-size':11},'Hectares');
      [0,.25,.5,.75,1].forEach(fraction=>{
        node('line',{x1:left,x2:right,y1:bottom-fraction*(bottom-top),y2:bottom-fraction*(bottom-top),stroke:'#e8edf0','stroke-dasharray':fraction?'3 5':'none'});
        node('text',{x:left-12,y:bottom-fraction*(bottom-top)+4,'text-anchor':'end',fill:'#7b8892','font-size':12},(maximum*fraction).toLocaleString('pt-BR',{maximumFractionDigits:0}));
      });
      const slot=(right-left)/(end-start+1),width=Math.min(30,slot*.64);
      for(let i=start;i<=end;i++) {
        const p=points[i];let base=bottom;
        if(i===selected) node('rect',{x:x(i)-slot*.45,y:top-6,width:slot*.9,height:bottom-top+12,rx:5,fill:'#edf3f5','pointer-events':'none'});
        for(const [value,color] of [[p.possible_inactive_ha,activityColor.possible_inactive],[p.not_matched_ha,activityColor.not_matched],[p.unknown_ha+p.pending_ha,activityColor.unknown]]) {
          const h=height(value);base-=h;
          node('rect',{x:x(i)-width/2,y:base,width,height:h,fill:color,'data-chart-bar':i});
        }
      }
    } else if(options.activity) {
      Object.keys(activityLabels).forEach(status=>{
        node('line',{x1:left,x2:right,y1:activityY[status],y2:activityY[status],stroke:'#e4ebe6'});
        node('text',{x:4,y:activityY[status]+4,fill:'#50615e','font-size':10},activityLabels[status]);
      });
      for(let i=start;i<=end;i++) {
        const status=points[i].activity?.status || 'unknown';
        node('circle',{cx:x(i),cy:activityY[status],r:i===selected?7:5,fill:activityColor[status],stroke:i===selected?'#40534d':'none','stroke-width':2});
      }
    } else {
    [0,.25,.5,.75,1].forEach(value=>{
      node('line',{x1:left,x2:right,y1:y(value),y2:y(value),stroke:'#e4ebe6'});
      node('text',{x:8,y:y(value)+4,fill:'#718078','font-size':11},value.toFixed(2));
    });
    node('path',{d:points.slice(start,end+1).map((p,i)=>`${i?'L':'M'} ${x(start+i)} ${y(p.ndvi_mean)}`).join(' '),fill:'none',stroke:'#287a51','stroke-width':3,'stroke-linejoin':'round'});
    for(let i=start;i<=end;i++) if(i===selected || end-start<45 || points[i].valid_fraction<.5) node('circle',{cx:x(i),cy:y(points[i].ndvi_mean),r:i===selected?5:2.5,fill:i===selected?'#ce9352':points[i].valid_fraction<.5?'#9aa49d':'#287a51',stroke:'#fff','stroke-width':1});
    }
    if(selected>=0 && selected<points.length) {
      if(!options.municipal && selected>=start && selected<=end) node('line',{x1:x(selected),x2:x(selected),y1:top,y2:bottom,stroke:'#95a5ad','stroke-dasharray':'3 4','pointer-events':'none'});
      const p=points[selected];
      if(options.municipal) {
        const hectares=value=>value.toLocaleString('pt-BR',{maximumFractionDigits:1})+' ha';
        detail.replaceChildren();
        const date=document.createElement('span');date.className='chart-detail-date';date.textContent=`Situação em ${formatDate(p.date)}`;detail.append(date);
        const cards=document.createElement('span');cards.className='chart-metrics';
        for(const [label,value,color] of [['Pouca vegetação persistente',p.possible_inactive_ha,activityColor.possible_inactive],['Sinal baixo não persistiu',p.not_matched_ha,activityColor.not_matched],['Sem conclusão',p.unknown_ha+p.pending_ha,activityColor.unknown]]) {
          const card=document.createElement('span');card.className='chart-metric';card.style.setProperty('--metric-color',color);
          const title=document.createElement('span');title.textContent=label;
          const amount=document.createElement('strong');amount.textContent=hectares(value);
          card.append(title,amount);cards.append(card);
        }
        detail.append(cards);
        const note=document.createElement('span');note.className='chart-detail-note';note.textContent=`Sem conclusão: ${hectares(p.unknown_ha)} com leitura insuficiente e ${hectares(p.pending_ha)} ainda sem avaliação. Base histórica: ${hectares(p.total_soy_ha)}. Não confirma terra parada.`;detail.append(note);
        technical.textContent='Os hectares são somados nos recortes de soja MapBiomas 2025 dentro da malha do IBGE. Manchas grandes são divididas em recortes de processamento, que não representam limites de talhões. Cada recorte usa três leituras aproveitáveis recentes de baixo vigor. Recortes menores que 5 ha ficam sem avaliação; falhas ficam com leitura insuficiente. A média de um recorte pode misturar situações diferentes. Não há extrapolação de uma amostra para a cidade.';
      } else {
      const coverage=Number.isFinite(p.valid_fraction)?Math.max(0,Math.min(1,p.valid_fraction)):null;
      const limited=(coverage!==null && coverage<.5) || (Number.isFinite(p.valid_pixels) && p.valid_pixels<50);
      const vigor=p.ndvi_mean<=.25 ? 'Sinal de pouca vegetação na parte observada.' : 'Há sinal de vegetação na parte observada.';
      const observed=coverage===null ? 'A fonte não informou quanto da área foi observado.' : `O satélite conseguiu avaliar ${(coverage*100).toLocaleString('pt-BR',{maximumFractionDigits:1})}% da área${coverage<1 ? '; o restante ficou sem leitura aproveitável' : ''}.`;
      const interpretation=limited ? 'Leitura limitada: não use este ponto para concluir o manejo da área. Ele fica fora da análise automática de manejo.' : coverage===null ? 'Sem essa informação, não é possível avaliar se a leitura representa boa parte da área. Confira a situação no campo.' : 'Compare com as outras datas e com o que foi observado no campo. Esta leitura sozinha não confirma plantio, colheita ou condição da lavoura.';
      const lastDay=new Date(p.date);lastDay.setUTCDate(lastDay.getUTCDate()+(options.aggregationDays || 5)-1);
      detail.replaceChildren();
      for(const text of [`${formatDate(p.date)} a ${formatDate(lastDay.toISOString())}`,vigor,observed,interpretation]) {
        const line=document.createElement('span');line.textContent=text;detail.append(line);
      }
      technical.textContent=`Índice de vegetação (NDVI): ${p.ndvi_mean.toLocaleString('pt-BR',{minimumFractionDigits:3,maximumFractionDigits:3})}${Number.isFinite(p.valid_pixels)?` · ${p.valid_pixels.toLocaleString('pt-BR')} pixels aproveitados`:''}. O NDVI é calculado somente na parte da área com dados válidos. A indicação de pouca vegetação usa o limite experimental de 0,25 do piloto, sem confirmação agronômica.`;
      if(options.activity) {
        const status=p.activity?.status || 'unknown';
        const interpretation={possible_inactive:'As três leituras aproveitáveis mais recentes mantiveram pouca vegetação. Pode ser pós-colheita, preparo ou pousio; confira no campo.',not_matched:'As leituras recentes não mantiveram pouca vegetação. Isso sozinho não confirma lavoura implantada.',unknown:'Faltam leituras recentes e suficientes para interpretar a situação da área.'};
        detail.replaceChildren();
        for(const text of [`Situação avaliada até ${formatDate(p.activity_as_of || p.date)}`,activityLabels[status],interpretation[status],observed]) {
          const line=document.createElement('span');line.textContent=text;detail.append(line);
        }
        technical.textContent+=` Regra temporal: ${p.activity?.reason || 'Sem dados suficientes.'} Cada data usa somente as imagens disponíveis até ela, sem observações futuras.`;
      }
      }
    } else {
      detail.textContent=options.municipal ? 'Consulte uma data para ver os hectares no município. Coral: pouca vegetação persistente. Verde: sinal baixo não persistiu. Cinza: leitura insuficiente ou ainda sem avaliação.' : options.activity ? 'Passe o mouse ou toque nas datas. Coral indica pouca vegetação persistente; verde indica que esse sinal não persistiu; cinza indica leitura insuficiente.' : 'Passe o mouse ou toque no gráfico para ver o que o satélite observou na área. Pontos cinza indicam menos da metade da área avaliada.';
      technical.textContent='Selecione uma data para consultar o índice e os dados da imagem.';
    }
    const ticks=[...new Set([start,Math.round(start+(end-start)/3),Math.round(start+2*(end-start)/3),end])];
    ticks.forEach((i,index)=>node('text',{x:options.municipal?x(i):index===0?left:index===ticks.length-1?right:x(i),y:244,'text-anchor':options.municipal?'middle':index===0?'start':index===ticks.length-1?'end':'middle',fill:'#7b8892','font-size':12},formatDate(points[i].date).slice(0,5)));
  }
  function position(event) {
    const matrix=svg.getScreenCTM();
    return matrix ? new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse()).x : left;
  }
  function nearest(px) {
    let best=start;
    for(let i=start+1;i<=end;i++) if(Math.abs(x(i)-px)<Math.abs(x(best)-px)) best=i;
    if(selected!==best) {selected=best;paint();}
  }
  function zoom(factor) {
    if(points.length<2)return;
    const span=Math.max(1,Math.min(points.length-1,Math.round((end-start)*factor)));
    const center=selected>=start && selected<=end ? selected : (start+end)/2;
    start=Math.max(0,Math.min(points.length-1-span,Math.round(center-span/2)));
    end=start+span;paint();
  }
  zoomIn.onclick=()=>zoom(.6);
  zoomOut.onclick=()=>zoom(1/.6);
  reset.onclick=()=>{start=0;end=points.length-1;paint();};
  svg.onpointerdown=event=>{
    if(!points.length)return;
    svg.focus({preventScroll:true});
    nearest(position(event));
    drag={x:position(event),start,end};
    svg.setPointerCapture(event.pointerId);
  };
  svg.onpointermove=event=>{
    if(!points.length)return;
    if(drag) {
      const span=drag.end-drag.start;
      const shift=Math.round((drag.x-position(event))*span/(right-left));
      start=Math.max(0,Math.min(points.length-1-span,drag.start+shift));end=start+span;paint();
    } else nearest(position(event));
  };
  svg.onpointerup=svg.onpointercancel=()=>{drag=null;};
  svg.onkeydown=event=>{
    if(!points.length)return;
    if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
      event.preventDefault();
      selected=event.key==='Home'?0:event.key==='End'?points.length-1:Math.max(0,Math.min(points.length-1,(selected<0?start:selected)+(event.key==='ArrowLeft'?-1:1)));
      const span=end-start;
      if(selected<start) {start=selected;end=start+span;}
      if(selected>end) {end=selected;start=end-span;}
      paint();
    } else if(event.key==='+' || event.key==='=') {event.preventDefault();zoom(.6);}
    else if(event.key==='-') {event.preventDefault();zoom(1/.6);}
  };
  paint();
}
