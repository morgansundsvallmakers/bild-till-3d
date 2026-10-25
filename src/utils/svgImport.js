import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { signedArea, pointInPolygon } from './geometry.js';

// Tolkar fyllda slutna SVG-former. Komplexa masker, filter och text stöds inte.
export async function importSVG(file) {
  const text = await file.text();
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  if (doc.querySelector('parsererror')) throw new Error('SVG-filen kunde inte läsas.');
  const root = doc.documentElement;
  if (root.localName !== 'svg') throw new Error('Filen är inte en SVG.');
  const loader = new SVGLoader(), data = loader.parse(text);
  const paths = [];
  for (const path of data.paths) {
    const shapes = SVGLoader.createShapes(path);
    for (const shape of shapes) {
      const outer = shape.extractPoints(16);
      const points = outer.shape.map(v => ({ x: v.x, y: v.y }));
      const holes = outer.holes.map(h => h.map(v => ({ x: v.x, y: v.y })));
      if (points.length >= 3 && Math.abs(signedArea(points)) > 1) {
        paths.push({ points, holes, area: Math.abs(signedArea(points)) });
      }
    }
  }
  if (!paths.length) throw new Error('Inga användbara slutna konturer hittades i SVG-filen.');
  const viewBox = root.getAttribute('viewBox')?.trim().split(/[ ,]+/).map(Number);
  const lengthMM = str => {
    if (!str) return null;
    const m = str.trim().match(/^([\d.]+)(mm|cm|in|px)?$/);
    if (!m) return null;
    const num = Number(m[1]);
    return num * ({ mm: 1, cm: 10, in: 25.4, px: 25.4 / 96 }[m[2] || 'px']);
  };
  const widthMM = lengthMM(root.getAttribute('width'));
  const suggestedScale = viewBox?.length === 4 && viewBox[2] > 0 && widthMM ? widthMM / viewBox[2] : 1;
  return { candidates: paths.sort((a, b) => b.area - a.area).map((p, i) => ({ ...p, id: i })), suggestedScale };
}
