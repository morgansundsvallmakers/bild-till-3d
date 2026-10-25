// OpenCV hämtas på begäran. Status skickas till gränssnittet för felsökning.
let cvLoadPromise;
let listeners = new Set();
function report(message) {
  for (const listener of listeners) listener(message);
}
export function loadOpenCV(onStatus = () => {}) {
  listeners.add(onStatus);
  if (cvLoadPromise) return cvLoadPromise;
  report('Startar hämtning av OpenCV.js');
  cvLoadPromise = new Promise((resolve, reject) => {
    let finished = false;
    const script = document.createElement('script');
    const started = Date.now();
    const timer = setTimeout(() => {
      const cv = window.cv;
      finish(new Error('Tidsgräns efter 30 s. window.cv: ' + typeof cv +
        ', Mat: ' + typeof cv?.Mat + ', then: ' + typeof cv?.then));
    }, 30000);
    const check = setInterval(() => {
      if (finished) return;
      const cv = window.cv;
      if (cv && typeof cv.Mat === 'function' && typeof cv.findContours === 'function') {
        finish(null, cv);
      }
    }, 250);
    function finish(error, cv) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      clearInterval(check);
      window.removeEventListener('error', onError, true);
      if (error) {
        report('Fel: ' + (error.message || String(error)));
        reject(error);
      } else {
        report('OpenCV är redo (' + ((Date.now() - started) / 1000).toFixed(1) + ' s)');
        resolve(cv);
      }
    }
    function onError(event) {
      const message = event.message || event.error?.message || String(event.error || 'Okänt skriptfel');
      report('JavaScript-fel: ' + message);
    }
    window.addEventListener('error', onError, true);
    script.onerror = () => finish(new Error('Nedladdning av opencv.js misslyckades'));
    script.onload = () => {
      const cv = window.cv;
      report('Skript hämtat. cv=' + typeof cv + ', Mat=' + typeof cv?.Mat +
        ', then=' + typeof cv?.then);
      if (cv && typeof cv.then === 'function') {
        Promise.resolve(cv).then(result => {
          report('OpenCV-Promise klar. Mat=' + typeof result?.Mat);
          if (result && typeof result.Mat === 'function') finish(null, result);
        }).catch(err => finish(new Error('OpenCV-Promise: ' + String(err))));
      } else if (cv && typeof cv.Mat === 'function') {
        finish(null, cv);
      }
      // Äldre versioner kan bli färdiga via runtime efter onload.
    };
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
