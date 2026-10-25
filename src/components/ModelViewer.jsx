import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
export default function ModelViewer({ geometry }) {
  const host = useRef(null);
  useEffect(() => {
    if (!geometry || !host.current) return;
    const node = host.current, width = node.clientWidth || 600, height = 360;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#152a38');
    const camera = new THREE.PerspectiveCamera(45, width/height, 0.01, 100000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(width, height); node.appendChild(renderer.domElement);
    const material = new THREE.MeshStandardMaterial({ color: '#7de0d0', metalness: 0.12, roughness: 0.5, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material); scene.add(mesh);
    const box = new THREE.Box3().setFromObject(mesh), center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    mesh.position.sub(center);
    const largest = Math.max(size.x,size.y,size.z,1);
    camera.position.set(largest*1.25, -largest*1.7, largest*1.35);
    camera.lookAt(0,0,0); camera.near=Math.max(0.001,largest/1000);camera.far=largest*100;camera.updateProjectionMatrix();
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping=true;
    scene.add(new THREE.AmbientLight('#ffffff',1.3));
    const light = new THREE.DirectionalLight('#ffffff',2); light.position.set(3,5,8);scene.add(light);
    let frame, stopped=false;
    function draw(){ if(stopped)return;frame=requestAnimationFrame(draw);controls.update();renderer.render(scene,camera); }
    draw();
    const observer=new ResizeObserver(()=>{if(!node.isConnected)return; const w=node.clientWidth||600;camera.aspect=w/360;camera.updateProjectionMatrix();renderer.setSize(w,360);});
    observer.observe(node);
    return ()=>{stopped=true;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();renderer.dispose();material.dispose();renderer.domElement.remove();};
  },[geometry]);
  return <section className="panel"><h2>4. 3D-modell</h2><p>Dra för att rotera och använd mushjulet eller två fingrar för att zooma.</p>
    <div className="viewer" ref={host}>{!geometry && <p>Välj en kontur för att se modellen.</p>}</div></section>;
}
