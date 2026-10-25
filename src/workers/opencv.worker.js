/* Klassisk Worker: OpenCV:s distribuerade skript använder importScripts. */
let cvInstance;
function status(message) { self.postMessage({ type: 'status', message }); }
function analyse({ id, pixels, width, height, threshold, invert, minArea }) {
  const cv = cvInstance;
  const src = cv.matFromImageData(new ImageData(new Uint8ClampedArray(pixels), width, height));
  const gray = new cv.Mat(), mask = new cv.Mat();
  const contours = new cv.MatVector(), hierarchy = new cv.Mat();
  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.threshold(gray, mask, threshold, 255, invert ? cv.THRESH_BINARY_INV : cv.THRESH_BINARY);
    cv.findContours(mask, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);
    const nodes = [];
    for (let i=0; i<contours.size();i++) {
      const contour = contours.get(i), approx = new cv.Mat();
      try {
        const area = Math.abs(cv.contourArea(contour));
        cv.approxPolyDP(contour, approx, Math.max(0.7, cv.arcLength(contour,true)*0.002), true);
        const points=[];
        for(let j=0;j<approx.rows;j++) {
          const p=approx.intPtr(j,0);
          points.push({x:p[0],y:p[1]});
        }
        nodes.push({i, parent:hierarchy.intPtr(0,i)[3],points,area});
      } finally {contour.delete();approx.delete();}
    }
    const byId = new Map(nodes.map(n=>[n.i,n]));
    const candidates=nodes.filter(n=>n.points.length>=3 && n.area>=minArea &&
      n.area<width*height*0.97 &&
      (n.parent===-1 || !byId.has(n.parent) || byId.get(n.parent).area>width*height*0.97))
      .map(n=>({id:n.i,points:n.points,area:n.area,
        holes:nodes.filter(h=>h.parent===n.i && h.points.length>=3 && h.area>=minArea).map(h=>h.points)}))
      .sort((a,b)=>b.area-a.area).slice(0,30);
    self.postMessage({type:'result',id,candidates});
  } finally {src.delete();gray.delete();mask.delete();contours.delete();hierarchy.delete();}
}
self.onmessage = event => {
  const data=event.data;
  if(data.type==='analyze') {
    if(!cvInstance){self.postMessage({type:'failure',id:data.id,message:'OpenCV är inte redo.'});return;}
    try {analyse(data);}catch(error){self.postMessage({type:'failure',id:data.id,message:String(error?.message||error)});}
  }
};
(async function boot(){
  try {
    status('Worker startad – hämtar OpenCV.js');
    importScripts('https://docs.opencv.org/4.x/opencv.js');
    status('OpenCV-skriptet hämtat. cv=' + typeof self.cv + ', then=' + typeof self.cv?.then);
    let loaded=self.cv;
    if(loaded && typeof loaded.then==='function') loaded=await loaded;
    if(!loaded || typeof loaded.Mat!=='function' || typeof loaded.findContours!=='function')
      throw new Error('OpenCV har inte tillgängliga bildbehandlingsfunktioner.');
    cvInstance=loaded;
    status('OpenCV redo i Worker');
    self.postMessage({type:'ready'});
  } catch(error) {
    self.postMessage({type:'fatal',message:String(error?.message||error)});
  }
})();
