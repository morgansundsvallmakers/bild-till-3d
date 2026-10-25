// Ladda OpenCV först när en rasterbild ska analyseras.
let cvLoadPromise;
export function loadOpenCV() {
  if (cvLoadPromise) return cvLoadPromise;
  cvLoadPromise = new Promise((resolve, reject) => {
    let settled = false;
    const script = document.createElement('script');
    const timer = setTimeout(() => finish(new Error('OpenCV kunde inte initieras inom 30 sekunder.')), 30000);
    function finish(err, cv) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err) reject(err);
      else resolve(cv);
    }
    function ready(cv) {
      if (cv && typeof cv.Mat === 'function' && typeof cv.findContours === 'function') {
        finish(null, cv);
        return true;
      }
      return false;
    }
    // OpenCV kan exponeras som ett färdigt objekt, en Promise eller
    // ett Emscripten-objekt med onRuntimeInitialized.
    script.onload = () => {
      const cv = window.cv;
      if (ready(cv)) return;
      if (cv && typeof cv.then === 'function') {
        cv.then(result => { if (!ready(result)) finish(new Error('OpenCV saknar nödvändiga funktioner.')); })
          .catch(err => finish(err));
      } else if (cv) {
        const prior = cv.onRuntimeInitialized;
        cv.onRuntimeInitialized = () => {
          if (typeof prior === 'function') prior();
          ready(window.cv);
        };
        // För kompatibilitet med äldre OpenCV.js, där initieringen kan
        // ske strax efter att skriptets onload har avfyrats.
        const check = setInterval(() => {
          if (settled || ready(window.cv)) clearInterval(check);
        }, 100);
        setTimeout(() => clearInterval(check), 30000);
      } else {
        finish(new Error('OpenCV-skriptet laddades men skapade inget cv-objekt.'));
      }
    };
    script.onerror = () => finish(new Error('OpenCV-filen kunde inte hämtas från servern.'));
    script.async = true;
    script.src = 'https://docs.opencv.org/4.x/opencv.js';
    document.head.appendChild(script);
  }).catch(err => { cvLoadPromise = null; throw err; });
  return cvLoadPromise;
}
export async function readRaster(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = objectUrl;
    await img.decode();
    const canvas = document.createElement('canvas');
    const limit = 1800, reduction = Math.min(1, limit / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width = Math.round(img.naturalWidth * reduction);
    canvas.height = Math.round(img.naturalHeight * reduction);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { canvas, url: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
  } finally { URL.revokeObjectURL(objectUrl); }
}
export function detectContours(cv, canvas, threshold = 130, invert = false, minArea = 80, simplify = 0.002) {
  const src = cv.imread(canvas), gray = new cv.Mat(), mask = new cv.Mat();
  const contours = new cv.MatVector(), hierarchy = new cv.Mat();
  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.threshold(gray, mask, threshold, 255, invert ? cv.THRESH_BINARY_INV : cv.THRESH_BINARY);
    cv.findContours(mask, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);
    const nodes = [];
    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i), approx = new cv.Mat();
      try {
        const area = Math.abs(cv.contourArea(c));
        cv.approxPolyDP(c, approx, Math.max(0.7, cv.arcLength(c, true) * simplify), true);
        const pts = [];
        for (let j = 0; j < approx.rows; j++) pts.push({ x: approx.intPtr(j, 0)[0], y: approx.intPtr(j, 0)[1] });
        // hierarchy: next, previous, firstChild, parent
        const parent = hierarchy.intPtr(0, i)[3];
        nodes.push({ i, parent, points: pts, area });
      } finally { c.delete(); approx.delete(); }
    }
    // Fyller inte hela bakgrunden av misstag; endast konturer med relevant area.
    const byId = new Map(nodes.map(n => [n.i, n]));
    return nodes.filter(n => n.points.length >= 3 && n.area >= minArea &&
      n.area < canvas.width * canvas.height * 0.97 &&
      (n.parent === -1 || !byId.has(n.parent) || byId.get(n.parent).area > canvas.width * canvas.height * 0.97))
      .map(n => ({
        id: n.i, points: n.points, area: n.area,
        holes: nodes.filter(h => h.parent === n.i && h.points.length >= 3 && h.area >= minArea).map(h => h.points)
      })).sort((a, b) => b.area - a.area).slice(0, 30);
  } finally { src.delete(); gray.delete(); mask.delete(); contours.delete(); hierarchy.delete(); }
}
