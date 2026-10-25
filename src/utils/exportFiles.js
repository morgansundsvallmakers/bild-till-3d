import * as THREE from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { bounds, getSize } from './geometry.js';

function download(data, name, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportSTL(geometry) {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
  const binary = new STLExporter().parse(mesh, { binary: true });
  download(binary, 'bild-till-3d.stl', 'model/stl');
}
export function exportSVG(candidate, scale) {
  const bb = bounds(candidate.points), size = getSize(candidate, scale);
  const pt = p => `${((p.x - bb.minX) * scale).toFixed(4)},${((p.y - bb.minY) * scale).toFixed(4)}`;
  const path = points => 'M ' + points.map(pt).join(' L ') + ' Z';
  const d = [path(candidate.points), ...(candidate.holes || []).map(path)].join(' ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width.toFixed(3)}mm" height="${size.height.toFixed(3)}mm" viewBox="0 0 ${size.width.toFixed(4)} ${size.height.toFixed(4)}"><path d="${d}" fill="black" fill-rule="evenodd"/></svg>`;
  download(svg, 'bild-till-3d.svg', 'image/svg+xml');
}
