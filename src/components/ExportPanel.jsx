import { exportSTL, exportSVG } from '../utils/exportFiles.js';
export default function ExportPanel({ candidate, geometry, scale }) {
  return <section className="panel">
    <h2>Export</h2><p>STL för 3D-utskrift, SVG för exempelvis Inkscape och Carbide Create.</p>
    <div className="row wrap">
      <button className="primary" disabled={!geometry} onClick={()=>exportSTL(geometry)}>Ladda ner STL</button>
      <button disabled={!candidate} onClick={()=>exportSVG(candidate,scale)}>Ladda ner SVG</button>
    </div><p className="hint">STL saknar lagrade måttenheter. Modellen är avsedd att tolkas som millimeter i din slicer. Kontrollera måtten före tillverkning.</p>
  </section>;
}
