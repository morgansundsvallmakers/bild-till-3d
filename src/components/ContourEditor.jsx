import { useRef, useState } from 'react';

export default function ContourEditor({ raster, candidates, chosen, onChoose, threshold, setThreshold,
  minArea, setMinArea, showImage, setShowImage, svgMode }) {
  const [zoom, setZoom] = useState(1), [offset, setOffset] = useState({ x: 0, y: 0 });
  const pointer = useRef(null);
  const viewW = raster?.width || 900, viewH = raster?.height || 650;
  const draw = p => p.map((v, i) => `${i === 0 ? 'M' : 'L'}${v.x},${v.y}`).join(' ') + ' Z';
  const all = item => [draw(item.points), ...(item.holes || []).map(draw)].join(' ');
  const panStart = e => { if (e.button === 1 || e.altKey) { pointer.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }; e.currentTarget.setPointerCapture(e.pointerId); } };
  const panMove = e => { if (!pointer.current) return; setOffset({ x: pointer.current.ox + (e.clientX - pointer.current.x) * viewW / e.currentTarget.clientWidth, y: pointer.current.oy + (e.clientY - pointer.current.y) * viewH / e.currentTarget.clientHeight }); };
  return <section className="panel">
    <h2>2. Konturer</h2>
    {!svgMode && raster && <div className="controls">
      <label>Tröskelvärde <output>{threshold}</output><input type="range" min="0" max="255" value={threshold} onChange={e => setThreshold(Number(e.target.value))} /></label>
      <label>Minsta detalj <output>{minArea} px²</output><input type="range" min="10" max="3000" step="10" value={minArea} onChange={e => setMinArea(Number(e.target.value))} /></label>
      <label className="check"><input type="checkbox" checked={showImage} onChange={e => setShowImage(e.target.checked)} /> Visa originalbild</label>
    </div>}
    <div className="canvas-wrap">
      <svg viewBox={`0 0 ${viewW} ${viewH}`} aria-label="Välj kontur" role="img"
        onPointerDown={panStart} onPointerMove={panMove} onPointerUp={() => pointer.current = null}
        onWheel={e => { if (e.ctrlKey) setZoom(z => Math.max(1, Math.min(8, z + (e.deltaY > 0 ? -0.2 : 0.2)))); }}
        className="contour-svg">
        <g transform={`translate(${offset.x} ${offset.y}) scale(${zoom})`}>
          {raster && showImage && <image href={raster.url} width={viewW} height={viewH} />}
          {candidates.map((c, i) => <path key={c.id ?? i} d={all(c)} fillRule="evenodd"
            fill={chosen === i ? '#21c9b733' : '#69aaff22'}
            stroke={chosen === i ? '#00d7bc' : '#60a6e6'} strokeWidth={Math.max(1, 2 / zoom)}
            onClick={() => onChoose(i)} className="click-contour" />)}
        </g>
      </svg>
    </div>
    <div className="row wrap"><button type="button" onClick={() => { setZoom(1); setOffset({x:0,y:0}); }}>Återställ vy</button>
      <span className="hint">{candidates.length} konturer · klicka på den du vill använda · Alt+dra för panorering</span></div>
    <div className="candidate-list">{candidates.map((c,i) => <button type="button" key={c.id ?? i}
      className={chosen===i?'selected':''} onClick={() => onChoose(i)}>Kontur {i+1} · {c.holes?.length||0} hål</button>)}</div>
  </section>;
}
