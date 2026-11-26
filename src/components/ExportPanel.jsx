import { useState } from 'react';
import { exportSTL, exportSVG, exportGLB } from '../utils/exportFiles.js';
export default function ExportPanel({ candidate, geometry, scale, raster, sideColor }) {
  const [busy,setBusy]=useState(false), [error,setError]=useState('');
  async function saveGLB(){setBusy(true);setError('');try{await exportGLB(geometry,candidate,scale,raster,sideColor);}catch(err){setError(err.message||String(err));}finally{setBusy(false);}}
  return <section className="panel">
    <h2>Export</h2><p>STL för 3D-utskrift, SVG för exempelvis Inkscape och Carbide Create.</p>
    <div className="row wrap">
      <button className="primary" disabled={!geometry} onClick={()=>exportSTL(geometry)}>Ladda ner STL</button>
      <button disabled={!candidate} onClick={()=>exportSVG(candidate,scale)}>Ladda ner SVG</button>
    <button disabled={!geometry||busy} onClick={saveGLB}>{busy?'Skapar GLB…':'Ladda ner GLB'}</button>
    </div>{error&&<p role="alert">GLB-export: {error}</p>}<p className="hint">GLB använder meter och kan innehålla en inbäddad bildtextur.</p><p className="hint">STL saknar lagrade måttenheter. Modellen är avsedd att tolkas som millimeter i din slicer. Kontrollera måtten före tillverkning.</p>
  </section>;
}
