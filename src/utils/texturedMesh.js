import * as THREE from 'three';
import { bounds } from './geometry.js';

// Geometry coordinates are mm, with image Y inverted and origin at the contour bounds.
export function createModelMesh(geometry, candidate, scale, raster, sideColor = '#808080') {
  const solid = new THREE.MeshStandardMaterial({ color: '#7de0d0', metalness: 0.12, roughness: 0.5, side: THREE.DoubleSide });
  if (!raster || !candidate) return { mesh: new THREE.Mesh(geometry, solid), dispose: () => solid.dispose() };
  solid.dispose();
  const geo = geometry.clone();
  const pos = geo.getAttribute('position');
  const bb = bounds(candidate.points);
  const uv = new Float32Array(pos.count * 2);
  geo.computeBoundingBox();
  const top = geo.boundingBox.max.z;
  // ExtrudeGeometry is non-indexed. Split cap groups so only the top cap is textured.
  geo.clearGroups();
  let start = 0, last = -1;
  for (let i = 0; i < pos.count; i += 3) {
    const material = [i,i+1,i+2].every(j => Math.abs(pos.getZ(j)-top) < 1e-6) ? 0 : 1;
    if (material !== last) {
      if (i > start) geo.addGroup(start, i-start, last);
      start = i; last = material;
    }
    for (let j=i;j<i+3;j++) {
      uv[2*j] = (bb.minX + pos.getX(j)/scale)/raster.width;
      uv[2*j+1] = 1 - (bb.maxY - pos.getY(j)/scale)/raster.height;
    }
  }
  if (pos.count > start) geo.addGroup(start,pos.count-start,last);
  geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  const texture = new THREE.CanvasTexture(raster.canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.MeshStandardMaterial({map:texture,color:0xffffff,roughness:1,metalness:0});
  const side = new THREE.MeshStandardMaterial({color:sideColor,roughness:0.8,metalness:0});
  return {mesh:new THREE.Mesh(geo,[face,side]),dispose:()=>{geo.dispose();texture.dispose();face.dispose();side.dispose();}};
}
