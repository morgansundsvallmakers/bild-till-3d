import { useEffect, useMemo, useState } from 'react';
import ImageUpload from './components/ImageUpload.jsx';
import ContourEditor from './components/ContourEditor.jsx';
import Calibration from './components/Calibration.jsx';
import ModelViewer from './components/ModelViewer.jsx';
import ExportPanel from './components/ExportPanel.jsx';
import { waitForOpenCV, readRaster, detectContours } from './utils/imageProcessing.js';
import { importSVG } from './utils/svgImport.js';
import { createGeometry } from './utils/geometry.js';

const STEPS = ['Bild','Kontur','Mått','3D'];
export default function App() {
  const [step,setStep] = useState(0), [fileName,setFileName]=useState('');
  const [raster,setRaster]=useState(null), [svgMode,setSvgMode]=useState(false), [svgCandidates,setSvgCandidates]=useState([]);
  const [candidates,setCandidates]=useState([]), [chosen,setChosen]=useState(0);
  const [threshold,setThreshold]=useState(130),[invert,setInvert]=useState(true),[minArea,setMinArea]=useState(80);
  const [showImage,setShowImage]=useState(true), [scale,setScale]=useState(1), [thickness,setThickness]=useState(5);
  const [cv,setCv]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{let live=true;waitForOpenCV().then(x=>{if(live)setCv(x)}).catch(()=>{});return ()=>{live=false;};},[]);
  async function importFile(file) {
    setBusy(true);setError('');
    try {
      if (/\.svg$/i.test(file.name) || file.type==='image/svg+xml') {
        const result=await importSVG(file);
        setSvgMode(true);setRaster(null);setSvgCandidates(result.candidates);setCandidates(result.candidates);
        setScale(result.suggestedScale);setChosen(0);
      } else {
        if (!['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error('Filformatet stöds inte.');
        const img=await readRaster(file);
        setRaster(img);setSvgMode(false);setSvgCandidates([]);setScale(1);setChosen(0);
      }
      setFileName(file.name);setStep(1);
    } catch(err){setError(err.message||String(err));}
    finally{setBusy(false);}
  }
  useEffect(()=>{
    if(svgMode){setCandidates(svgCandidates);return;}
    if(!raster)return;
    if(!cv){setError('OpenCV laddas fortfarande. Kontrollerar anslutningen …');return;}
    try {const found=detectContours(cv,raster.canvas,threshold,invert,minArea);
      setCandidates(found);setChosen(0);setError(found.length?'':'Inga konturer hittades. Prova invertering eller ett annat tröskelvärde.');
    } catch(e){setError('Bildanalysen misslyckades: '+e.message);}
  },[raster,svgMode,svgCandidates,cv,threshold,invert,minArea]);
  const candidate=candidates[chosen]||null;
  const geometry=useMemo(()=>{if(!candidate)return null;try{return createGeometry(candidate,scale,thickness);}catch{return null;}},[candidate,scale,thickness]);
  useEffect(()=>()=>{geometry?.dispose();},[geometry]);
  return <div className="app">
    <header><div><p className="eyebrow">MAKERSPACE · 2,5D</p><h1>Bild till 3D</h1><p>Från bild till utskrivbar modell – direkt i webbläsaren.</p></div>
    <div className="status">{cv?'Bildanalys redo':'Laddar OpenCV …'}</div></header>
    <nav className="steps" aria-label="Arbetssteg">{STEPS.map((name,i)=><button key={name} className={step===i?'active':''} onClick={()=>setStep(i)} disabled={i>0&&!fileName}>{i+1}. {name}</button>)}</nav>
    {fileName&&<div className="filebar">Fil: <strong>{fileName}</strong> <button onClick={()=>setStep(0)}>Byt bild</button></div>}
    {error&&<div className="notice" role="status">{error}</div>}
    {step===0&&<ImageUpload onFile={importFile} busy={busy}/>}
    {step===1&&<ContourEditor raster={raster} candidates={candidates} chosen={chosen} onChoose={setChosen}
      threshold={threshold} setThreshold={setThreshold} invert={invert} setInvert={setInvert}
      minArea={minArea} setMinArea={setMinArea} showImage={showImage} setShowImage={setShowImage} svgMode={svgMode}/>}
    {step===2&&<Calibration candidate={candidate} scale={scale} setScale={setScale}/>}
    {step===3&&<><section className="panel"><h2>Modellens tjocklek</h2>
      <label className="inline-label">Tjocklek i mm <input type="number" min="0.01" step="0.5" value={thickness} onChange={e=>setThickness(Number(e.target.value))}/></label></section>
      <ModelViewer geometry={geometry}/><ExportPanel candidate={candidate} geometry={geometry} scale={scale}/></>}
    {fileName&&<footer className="row navfoot"><button disabled={step===0} onClick={()=>setStep(s=>Math.max(0,s-1))}>Föregående</button>
      {step<3?<button className="primary" onClick={()=>setStep(s=>Math.min(3,s+1))}>Nästa: {STEPS[step+1]}</button>:
      <span className="hint">Kontrollera alltid storleken i din slicer.</span>}</footer>}
    <p className="footer-note">Prototyp: enkla plana föremål och slutna konturer. Filerna bearbetas lokalt, men OpenCV-biblioteket hämtas från internet.</p>
  </div>;
}
