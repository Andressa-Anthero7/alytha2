// Simulate a slow raster source without waiting 90 real seconds.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../web/sources.js'),'utf8');
const payload={bounds:[-55.2,-12.5,-55.19,-12.49],year:2025,class_id:39};
const id='a'.repeat(64),result={type:'FeatureCollection',features:[]};
function harness(fetch) {
  let elapsed=0;
  const signals=[];
  const context=vm.createContext({fetch,document:{addEventListener(){}},Date:{now:()=>elapsed},TypeError,
    setTimeout(callback,ms){elapsed+=ms;queueMicrotask(callback);},
    AbortSignal:{timeout(ms){signals.push(ms);return {};}}});
  vm.runInContext(source,context);
  return {load:()=>vm.runInContext(`cropData(${JSON.stringify(payload)})`,context),elapsed:()=>elapsed,signals};
}
const response=(body,ok=true)=>({ok,json:async()=>body});
(async()=>{
  let starts=0,polls=0;
  const slow=harness(async(url,options)=>{
    if(options.method==='POST'){starts++;return response({id,status:'loading'});}
    assert.equal(url,'/api/sources/mapbiomas/jobs/'+id);
    return response(++polls<70 ? {id,status:'loading'} : {id,status:'ready',result});
  });
  const [first,second]=await Promise.all([slow.load(),slow.load()]);
  assert.equal(starts,1);assert.equal(first,result);assert.equal(second,result);
  assert.ok(slow.elapsed()>90000);assert.ok(slow.signals.every(ms=>ms===15000));
  assert.equal(await slow.load(),result);assert.equal(starts,1);

  let calls=0;
  const timeout=harness(async()=>{
    if(++calls===1){const error=new Error('signal timed out');error.name='TimeoutError';throw error;}
    return response({id,status:'ready',result});
  });
  await assert.rejects(timeout.load(),error=>!error.message.includes('signal timed out') && error.message.includes('retomar'));
  assert.equal(await timeout.load(),result);assert.equal(calls,2);

  const failed=harness(async()=>response({id,status:'error',error:'A fonte de culturas não respondeu.'}));
  await assert.rejects(failed.load(),/fonte de culturas/);
  const invalid=harness(async()=>response({id:'invalid',status:'loading'}));
  await assert.rejects(invalid.load(),/acompanhar/);
  const never=harness(async()=>response({id,status:'loading'}));
  await assert.rejects(never.load(),/mesma consulta/);
  assert.ok(never.elapsed()>=600000);
  console.log('PASS: slow map beyond 90s, shared load/cache, friendly timeout/retry, failed jobs and bounded polling.');
})().catch(error=>{console.error(error);process.exitCode=1;});
