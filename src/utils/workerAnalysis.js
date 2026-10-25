// Bildanalysen körs separat så att gränssnittet inte blockeras.
let worker=null, readyPromise=null, serial=0, pending=new Map();
export function startAnalysis(onStatus) {
  if (readyPromise) return readyPromise;
  readyPromise=new Promise((resolve,reject)=>{
    worker=new Worker(new URL('../workers/opencv.worker.js',import.meta.url));
    const timeout=setTimeout(()=>{
      onStatus?.('Tidsgräns: bildanalysen svarade inte inom 30 sekunder.');
      stopAnalysis();
      reject(new Error('Bildanalysen svarade inte inom 30 sekunder. Worker stoppad.'));
    },30000);
    worker.onmessage = event=>{
      const data=event.data;
      if(data.type==='status') onStatus?.(data.message);
      if(data.type==='ready'){clearTimeout(timeout);resolve(true);}
      if(data.type==='fatal'){
        clearTimeout(timeout);
        onStatus?.('Worker-fel: '+data.message);
        reject(new Error(data.message));stopAnalysis();
      }
      if(data.type==='result' || data.type==='failure'){
        const task=pending.get(data.id);
        if(!task)return;
        pending.delete(data.id);
        if(data.type==='result')task.resolve(data.candidates);
        else task.reject(new Error(data.message));
      }
    };
    worker.onerror=event=>{
      clearTimeout(timeout);
      onStatus?.('Worker-JavaScript-fel: '+event.message);
      reject(new Error(event.message||'Worker kunde inte starta'));
      stopAnalysis();
    };
  });
  return readyPromise;
}
export async function findContoursAsync(canvas,threshold,invert,minArea) {
  if(!worker)throw new Error('Worker saknas.');
  const context=canvas.getContext('2d',{willReadFrequently:true});
  const image=context.getImageData(0,0,canvas.width,canvas.height);
  const pixels=image.data.buffer;
  const id=++serial;
  return new Promise((resolve,reject)=>{
    pending.set(id,{resolve,reject});
    worker.postMessage({type:'analyze',id,pixels,width:canvas.width,height:canvas.height,threshold,invert,minArea},[pixels]);
  });
}
export function stopAnalysis(){
  if(worker)worker.terminate();
  worker=null;readyPromise=null;
  for(const task of pending.values())task.reject(new Error('Bildanalysen avbröts.'));
  pending.clear();
}
