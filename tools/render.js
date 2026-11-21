// Dev-only: renders still images of the 3D kit (used to generate default photos).
import '@fontsource/dm-serif-display/400.css';
import '@fontsource-variable/dm-sans';
import * as THREE from 'three';
import { createSundae, createScoop, createCone, createStrawberry, addStudioLights, makeRenderer, makeEnvironment, radialShadowTex } from '../src/three/icecream.js';

const q = new URLSearchParams(location.search);
const what = q.get('what') || 'sundae';
const W = +(q.get('w') || 1024), H = +(q.get('h') || 1024);
const canvas = document.getElementById('c');
await document.fonts.ready;
const renderer = makeRenderer(canvas);
renderer.setPixelRatio(1);
renderer.setSize(W, H);
const scene = new THREE.Scene();
scene.environment = await makeEnvironment(renderer);
scene.environmentIntensity = 0.55;
addStudioLights(scene);
const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);

function shadow(s = 3) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ map: radialShadowTex(), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; return m;
}
if (what === 'sundae') {
  const s = createSundae();
  scene.add(s.root);
  cam.position.set(0, 3.4, 7.6); cam.lookAt(0, 1.2, 0);
} else if (what.startsWith('scoop-')) {
  const f = what.slice(6);
  const g = createScoop(f, +(q.get('seed') || 4));
  g.position.y = 0.5; g.rotation.y = +(q.get('ry') || 0.6);
  const sh = shadow(3); sh.position.y = 0.02;
  scene.add(g, sh);
  cam.position.set(0, 2.2, 5.2); cam.lookAt(0, 0.55, 0);
} else if (what === 'cones') {
  const pairs = [['fresa', -0.8, 0.16, 3], ['vainilla', 0.8, -0.16, 6]];
  for (const [f, x, rz, seed] of pairs) {
    const g = new THREE.Group();
    const c = createCone(); g.add(c);
    const s = createScoop(f, seed, { drizzle: false }); s.scale.setScalar(0.78); s.position.y = 0.62; g.add(s);
    g.position.set(x, 0.3, 0); g.rotation.z = rz;
    scene.add(g);
  }
  cam.position.set(0, 0.9, 10.5); cam.lookAt(0, -0.55, 0);
} else if (what === 'strawberry') {
  const s = createStrawberry(1); s.rotation.set(0.4, 0, Math.PI + 0.3); s.position.y = 0.6; scene.add(s);
  cam.position.set(0, 0.4, 3.5); cam.lookAt(0, 0, 0);
}
renderer.render(scene, cam);
window.__done = true;
