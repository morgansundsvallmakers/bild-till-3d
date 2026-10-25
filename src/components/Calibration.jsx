import { useState } from 'react';
import { getSize } from '../utils/geometry.js';
export default function Calibration({ candidate, scale, setScale }) {
  const [distance, setDistance] = useState('');
  const [points, setPoints] = useState([]);
  const size = candidate ? getSize(candidate, scale) : null;
  function addPoint(e) {
    const svg = e.currentTarget, rect = svg.getBoundingClientRect();
    const b = svg.viewBox.baseVal;
    const p = { x: (e.clientX - rect.left) * b.width / rect.width + b.x, y: (e.clientY - rect.top) * b.height / rect.height + b.y };
    setPoints(old => old.length === 2 ? [p] : [...old,p]);
  }
  function apply() {
    if (points.length !== 2 || Number(distance) <= 0) return;
    const px = Math.hypot(points[0].x-points[1].x, points[0].y-points[1].y);
    if (px) setScale(Number(distance) / px);
  }
  if (!candidate) return null;
  const xs = candidate.points.map(p=>p.x), ys=candidate.points.map(p=>p.y);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const w=Math.max(1,maxX-minX), h=Math.max(1,maxY-minY);
  const path = ps => ps.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' ')+' Z';
  return <section className="panel">
    <h2>3. Mått (valfritt)</h2>
    <p>Klicka på två punkter som du känner avståndet mellan och ange avståndet i millimeter. Du kan även ändra skalfaktorn direkt.</p>
    <svg className="calibration-svg" viewBox={`${minX-w*.04} ${minY-h*.04} ${w*1.08} ${h*1.08}`} onClick={addPoint}>
      <path d={[path(candidate.points),...(candidate.holes||[]).map(path)].join(' ')} fill="#d3e9ee" fillRule="evenodd" stroke="#236078" strokeWidth={Math.max(w,h)/260}/>
      {points.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={Math.max(w,h)/85} fill="#d45521" />)}
      {points.length===2 && <line x1={points[0].x} x2={points[1].x} y1={points[0].y} y2={points[1].y} stroke="#d45521" strokeWidth={Math.max(w,h)/180}/>}
    </svg>
    <div className="controls"><label>Avstånd (mm)<input type="number" min="0.001" step="any" value={distance} onChange={e=>setDistance(e.target.value)} /></label>
      <button type="button" disabled={points.length!==2 || Number(distance)<=0} onClick={apply}>Kalibrera</button>
      <label>Skala (mm per bildpunkt)<input type="number" min="0.000001" step="any" value={scale} onChange={e=>{if(Number(e.target.value)>0)setScale(Number(e.target.value));}} /></label></div>
    <p className="hint">Modellens storlek: {size.width.toFixed(2)} × {size.height.toFixed(2)} mm. Utan kalibrering används aktuell skalfaktor.</p>
  </section>;
}
