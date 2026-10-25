import * as THREE from 'three';

export function signedArea(points) {
  return points.reduce((sum, p, i) => {
    const q = points[(i + 1) % points.length];
    return sum + p.x * q.y - q.x * p.y;
  }, 0) / 2;
}
export function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) &&
      point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
export function bounds(points) {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}
export function toShape(candidate, scale = 1) {
  const outer = candidate.points;
  const bb = bounds(outer);
  const convert = p => new THREE.Vector2((p.x - bb.minX) * scale, (bb.maxY - p.y) * scale);
  const shape = new THREE.Shape(convertOrdered(outer, convert));
  for (const hole of candidate.holes || []) {
    if (hole.length >= 3) shape.holes.push(new THREE.Path(convertOrdered(hole, convert)));
  }
  return shape;
}
function convertOrdered(points, convert) { return points.map(convert); }
export function createGeometry(candidate, scale, thickness) {
  if (!candidate || candidate.points.length < 3 || !Number.isFinite(scale) || scale <= 0 ||
      !Number.isFinite(thickness) || thickness <= 0) throw new Error('Ogiltiga mått eller konturer.');
  const geometry = new THREE.ExtrudeGeometry(toShape(candidate, scale), {
    depth: thickness, steps: 1, bevelEnabled: false, curveSegments: 24
  });
  geometry.computeVertexNormals();
  return geometry;
}
export function getSize(candidate, scale) {
  const b = bounds(candidate.points);
  return { width: (b.maxX - b.minX) * scale, height: (b.maxY - b.minY) * scale };
}
