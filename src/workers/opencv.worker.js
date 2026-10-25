/* Marching Squares med linjär interpolation.
   Ingen Gaussian blur och inget OpenCV krävs för konturextraktionen. */
function status(message) { self.postMessage({ type: 'status', message }); }

function grayAt(data, width, x, y) {
  const i = (y * width + x) * 4;
  return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
}
function interp(a, b, va, vb, t) {
  const d = vb - va;
  const u = Math.abs(d) < 1e-9 ? 0.5 : Math.max(0, Math.min(1, (t - va) / d));
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}
function key(p) { return Math.round(p.x * 10000) + ':' + Math.round(p.y * 10000); }
function area(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}
function pointInPolygon(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) &&
      p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
function stitch(segments) {
  const adjacency = new Map();
  const pointByKey = new Map();
  function add(a, b) {
    const ka = key(a), kb = key(b);
    pointByKey.set(ka, a); pointByKey.set(kb, b);
    if (!adjacency.has(ka)) adjacency.set(ka, []);
    if (!adjacency.has(kb)) adjacency.set(kb, []);
    adjacency.get(ka).push(kb); adjacency.get(kb).push(ka);
  }
  for (const [a,b] of segments) add(a,b);

  const used = new Set(), loops = [];
  const edgeKey = (a,b) => a < b ? a + '|' + b : b + '|' + a;
  for (const [start, neighbours] of adjacency) {
    for (const first of neighbours) {
      if (used.has(edgeKey(start, first))) continue;
      const loop = [pointByKey.get(start)];
      let prev = start, cur = first;
      used.add(edgeKey(prev, cur));
      let guard = 0;
      while (guard++ < segments.length * 2) {
        loop.push(pointByKey.get(cur));
        if (cur === start) break;
        const nexts = adjacency.get(cur) || [];
        const next = nexts.find(n => n !== prev && !used.has(edgeKey(cur,n))) ??
                     nexts.find(n => n === start);
        if (!next) break;
        prev = cur; cur = next;
        used.add(edgeKey(prev, cur));
      }
      if (loop.length >= 4 && key(loop[0]) === key(loop[loop.length - 1])) {
        loop.pop();
        loops.push(loop);
      }
    }
  }
  return loops;
}

function marchingSquares(data, width, height, threshold, invert) {
  const segments = [];
  const inside = v => invert ? v < threshold : v >= threshold;
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const v0 = grayAt(data,width,x,y);
      const v1 = grayAt(data,width,x+1,y);
      const v2 = grayAt(data,width,x+1,y+1);
      const v3 = grayAt(data,width,x,y+1);
      const b0=inside(v0)?1:0,b1=inside(v1)?1:0,b2=inside(v2)?1:0,b3=inside(v3)?1:0;
      const code = b0 | (b1<<1) | (b2<<2) | (b3<<3);
      if (code===0 || code===15) continue;
      const p0={x,y}, p1={x:x+1,y}, p2={x:x+1,y:y+1}, p3={x,y:y+1};
      const e0=()=>interp(p0,p1,v0,v1,threshold);
      const e1=()=>interp(p1,p2,v1,v2,threshold);
      const e2=()=>interp(p3,p2,v3,v2,threshold);
      const e3=()=>interp(p0,p3,v0,v3,threshold);
      const pair=(a,b)=>segments.push([a(),b()]);
      switch(code){
        case 1: pair(e3,e0); break;
        case 2: pair(e0,e1); break;
        case 3: pair(e3,e1); break;
        case 4: pair(e1,e2); break;
        case 5: {
          const center=(v0+v1+v2+v3)/4, c=inside(center);
          if (c) { pair(e0,e1); pair(e2,e3); } else { pair(e3,e0); pair(e1,e2); }
          break;
        }
        case 6: pair(e0,e2); break;
        case 7: pair(e3,e2); break;
        case 8: pair(e2,e3); break;
        case 9: pair(e2,e0); break;
        case 10: {
          const center=(v0+v1+v2+v3)/4, c=inside(center);
          if (c) { pair(e3,e0); pair(e1,e2); } else { pair(e0,e1); pair(e2,e3); }
          break;
        }
        case 11: pair(e2,e1); break;
        case 12: pair(e1,e3); break;
        case 13: pair(e1,e0); break;
        case 14: pair(e0,e3); break;
      }
    }
  }
  return stitch(segments);
}
function buildCandidates(loops, minArea) {
  const items = loops.map((points,id) => ({
    id, points, area: Math.abs(area(points))
  })).filter(x => x.points.length >= 3 && x.area >= minArea)
    .sort((a,b)=>b.area-a.area);

  for (const item of items) {
    item.depth = items.filter(other => other.area > item.area && pointInPolygon(item.points[0], other.points)).length;
  }
  const outers = items.filter(x => x.depth % 2 === 0);
  for (const outer of outers) {
    const holes = items.filter(h => h.depth === outer.depth + 1 &&
      h.area < outer.area && pointInPolygon(h.points[0], outer.points));
    outer.holes = holes.map(h => h.points);
  }
  return outers.map(({id,points,area,holes})=>({id,points,area,holes})).slice(0,30);
}
function analyse({ id, pixels, width, height, threshold, invert, minArea }) {
  const data = new Uint8ClampedArray(pixels);
  const loops = marchingSquares(data,width,height,threshold,invert);
  const candidates = buildCandidates(loops,minArea);
  self.postMessage({ type:'result', id, candidates });
}
self.onmessage = event => {
  const data = event.data;
  if (data.type === 'analyze') {
    try { analyse(data); }
    catch (error) { self.postMessage({ type:'failure', id:data.id, message:String(error?.message||error) }); }
  }
};
status('Worker startad – Marching Squares redo');
self.postMessage({ type:'ready' });
