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
  document.getElementById('panel-toggle').addEventListener('click',event=>{
    const ai=document.getElementById('ai-prompt-panel');
    if(matchMedia('(min-width:1000px)').matches && !ai.hidden) {
      event.stopImmediatePropagation();ai.hidden=true;
      document.getElementById('side-panel').classList.remove('closed');
      event.currentTarget.setAttribute('aria-expanded','true');
    }
  },true);
  for(const prefix of ['soy','ndvi'])document.getElementById(prefix+'-panel-close').addEventListener('click',()=>{
    document.getElementById(prefix==='soy'?'soy-activity-panel':'ndvi-panel').classList.remove('visible');
  });
});
