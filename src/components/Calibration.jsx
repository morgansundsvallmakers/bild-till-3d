import { useRef, useState } from 'react';
import { getSize } from '../utils/geometry.js';

export default function Calibration({ candidate, scale, setScale }) {
  const [distance, setDistance] = useState('');
  const [points, setPoints] = useState([]);
  const [selected, setSelected] = useState(0);
  const drag = useRef(null);
  const svgRef = useRef(null);
  if (!candidate) return null;

  const size = getSize(candidate, scale);
  const xs = candidate.points.map(p => p.x), ys = candidate.points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = Math.max(1, maxX - minX), h = Math.max(1, maxY - minY);
  const lineSize = Math.max(w, h) / 230;
  const path = ps => ps.map((p,i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ') + ' Z';

  // getScreenCTM tar hänsyn till skalning, marginaler och SVG:s aspect ratio.
  function position(event) {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  }
  function movePoint(index, event) {
    const p = position(event);
    if (!p) return;
    setPoints(current => current.map((old,i) => i === index ? p : old));
  }
  function onBackgroundDown(event) {
    if (event.target !== svgRef.current && event.target.dataset.background !== 'true') return;
    const p = position(event);
    if (!p) return;
    if (points.length < 2) {
      setPoints(current => [...current, p]);
      setSelected(points.length);
    } else {
      setPoints(current => current.map((old,i) => i === selected ? p : old));
    }
  }
  function onPointDown(index,event) {
    event.preventDefault();
    event.stopPropagation();
    drag.current = index;
    setSelected(index);
    event.currentTarget.setPointerCapture(event.pointerId);
    movePoint(index,event);
  }
  function onPointMove(index,event) {
    if (drag.current === index) movePoint(index,event);
  }
  function onPointUp(event) {
    if (drag.current !== null && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    drag.current = null;
  }
  function apply() {
    if(points.length !== 2 || Number(distance) <= 0) return;
    const px = Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);
    if (px > 0) setScale(Number(distance)/px);
  }
  return <section className="panel">
    <h2>3. Mått (valfritt)</h2>
    <p>Markera två punkter och dra dem sedan till rätt läge. Du kan också välja en punkt nedan och klicka på dess nya plats i bilden.</p>
    <svg ref={svgRef} className="calibration-svg"
      style={{ touchAction: 'none' }}
      viewBox={`${minX-w*.04} ${minY-h*.04} ${w*1.08} ${h*1.08}`}
      onPointerDown={onBackgroundDown}>
      <rect data-background="true" x={minX-w*.04} y={minY-h*.04} width={w*1.08} height={h*1.08} fill="transparent" />
      <path data-background="true"
        d={[path(candidate.points),...(candidate.holes||[]).map(path)].join(' ')}
        fill="#d3e9ee" fillRule="evenodd" stroke="#236078" strokeWidth={lineSize}
        style={{pointerEvents:'none'}} />
      {points.length === 2 && <line x1={points[0].x} y1={points[0].y} x2={points[1].x} y2={points[1].y}
        stroke="#d45521" strokeWidth={lineSize*1.3} pointerEvents="none"/>}
      {points.map((p,i) => <g key={i} transform={`translate(${p.x} ${p.y})`}
        onPointerDown={e => onPointDown(i,e)}
        onPointerMove={e => onPointMove(i,e)}
        onPointerUp={onPointUp} onPointerCancel={onPointUp}
        style={{cursor:'grab',touchAction:'none'}}>
        <circle r={lineSize*10} fill="transparent"/>
        <circle r={lineSize*4.5} fill={selected===i?'#d45521':'#ef8442'} stroke="white" strokeWidth={lineSize}/>
        <text y={-lineSize*9} fontSize={lineSize*9} textAnchor="middle" fill="#8b3518" fontWeight="bold" pointerEvents="none">{i+1}</text>
      </g>)}
    </svg>
    <div className="row wrap" style={{justifyContent:'flex-start', marginTop:'12px'}}>
      {[0,1].map(i => <button key={i} type="button" className={selected===i?'selected':''}
        onClick={()=>setSelected(i)}>Flytta punkt {i+1}</button>)}
      <button type="button" onClick={()=>{setPoints([]);setSelected(0);}}>Rensa punkter</button>
    </div>
    <div className="controls">
      <label>Avstånd (mm)<input type="number" min="0.001" step="any" value={distance}
        onChange={e=>setDistance(e.target.value)}/></label>
      <button type="button" disabled={points.length!==2 || Number(distance)<=0} onClick={apply}>Kalibrera</button>
      <label>Skala (mm per bildpunkt)<input type="number" min="0.000001" step="any" value={scale}
        onChange={e=>{if(Number(e.target.value)>0)setScale(Number(e.target.value));}} /></label>
    </div>
    <p className="hint">Modellens storlek: {size.width.toFixed(2)} × {size.height.toFixed(2)} mm. Kalibrering är valfri.</p>
  </section>;
}
