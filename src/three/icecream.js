// Procedural ice-cream kit: scoops, bowl, cone, toppings.
// Everything is generated in code (no model files), shared by every 3D scene.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/* ---------------- quality tier ---------------- */
// Phones/tablets get cheaper materials (no sheen/clearcoat lobes) and lighter meshes.
export const LOW_Q = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
const Mat = (opts) => {
  if (!LOW_Q) return new THREE.MeshPhysicalMaterial(opts);
  const { sheen, sheenColor, sheenRoughness, clearcoat, clearcoatRoughness, transmission, ior, ...rest } = opts;
  return new THREE.MeshStandardMaterial(rest);
};

/* ---------------- noise ---------------- */
function hash3(x, y, z) {
  let h = x * 374761393 + y * 668265263 + z * 2147483647;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h & 0xffff) / 0xffff;
}
const fade = (t) => t * t * (3 - 2 * t);
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), xf), l(c(0, 1, 0), c(1, 1, 0), xf), yf),
    l(l(c(0, 0, 1), c(1, 0, 1), xf), l(c(0, 1, 1), c(1, 1, 1), xf), yf),
    zf
  ) * 2 - 1;
}
function fbm(x, y, z, oct = 4) {
  let a = 0.5, f = 1, s = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, z * f); f *= 2.03; a *= 0.5; }
  return s;
}
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/* ---------------- textures ---------------- */
const texCache = new Map();
function canvasTex(key, w, h, draw, srgb = true) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}
function creamBump() {
  return canvasTex('cream-bump', 512, 256, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const n = fbm(x / 9, y / 9, 3.3, 3) * 0.6 + fbm(x / 2.5, y / 2.5, 9.1, 2) * 0.4;
      const v = 128 + n * 110;
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, false);
}
function waffleTex(bump = false) {
  return canvasTex('waffle' + bump, 512, 512, (g, w, h) => {
    g.fillStyle = bump ? '#808080' : '#d89a55';
    g.fillRect(0, 0, w, h);
    if (!bump) {
      const grd = g.createLinearGradient(0, 0, w, h);
      grd.addColorStop(0, 'rgba(160,90,30,.35)'); grd.addColorStop(1, 'rgba(255,220,150,.2)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    }
    g.strokeStyle = bump ? '#202020' : 'rgba(120,60,15,.85)';
    g.lineWidth = bump ? 14 : 10;
    const step = 64;
    for (let i = -w; i < w * 2; i += step) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke();
      g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke();
    }
    if (!bump) {
      g.strokeStyle = 'rgba(255,225,170,.35)'; g.lineWidth = 3;
      for (let i = -w; i < w * 2; i += step) {
        g.beginPath(); g.moveTo(i + 6, 0); g.lineTo(i + h + 6, h); g.stroke();
      }
    }
  }, !bump);
}
function seedsTex() {
  return canvasTex('strawberry', 512, 512, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#e2283a'); grd.addColorStop(0.7, '#c4142a'); grd.addColorStop(1, '#8e0a1c');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    const r = rng(7);
    for (let i = 0; i < 260; i++) {
      const x = r() * w, y = r() * h * 0.92 + 20;
      g.fillStyle = 'rgba(120,0,10,.55)';
      g.beginPath(); g.ellipse(x, y, 7, 9, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#f3d27a';
      g.beginPath(); g.ellipse(x, y, 2.6, 4, 0, 0, Math.PI * 2); g.fill();
    }
  });
}
function bowlLabelTex() {
  return canvasTex('bowl-label', 2048, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#5a3a2a';
    g.textAlign = 'center';
    g.font = '400 112px "DM Serif Display", Georgia, serif';
    g.fillText('SCOOPÉ', w / 2, 120);
    g.font = '600 26px "DM Sans Variable", Arial, sans-serif';
    g.letterSpacing = '8px';
    g.fillText('D Í A S   M Á S   D U L C E S', w / 2, 178);
  });
}
export function radialShadowTex() {
  return canvasTex('shadow', 256, 256, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grd.addColorStop(0, 'rgba(60,25,15,.55)');
    grd.addColorStop(0.45, 'rgba(60,25,15,.25)');
    grd.addColorStop(1, 'rgba(60,25,15,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  });
}

/* ---------------- flavors ---------------- */
export const FLAVORS = {
  fresa: { color: '#ec8b9b', sheen: '#ffc6d0', bits: 'strawberry', drizzle: '#a30d26' },
  pistacho: { color: '#9ea35c', sheen: '#cdd29c', bits: 'pistachio' },
  chocolate: { color: '#43200f', sheen: '#8a4a30', bits: 'chocolate' },
  vainilla: { color: '#f4e6c8', sheen: '#fff7e6', bits: 'vanilla' },
  turron: { color: '#e0bf8f', sheen: '#f7e2c0', bits: 'almond' },
  mango: { color: '#f6b54a', sheen: '#ffe0a0', bits: 'mango' },
};

/* ---------------- scoop ---------------- */
// Surface radius for a unit direction. Exposed so toppings can sit on the surface.
function scoopRadius(dir, seed) {
  const s = seed * 1.7;
  let d = 0.075 * fbm(dir.x * 2.1 + s, dir.y * 2.1, dir.z * 2.1 - s);
  d += 0.022 * fbm(dir.x * 7 + s, dir.y * 7, dir.z * 7);
  const ang = Math.atan2(dir.z, dir.x);
  // scooper streaks on the upper half
  d += 0.03 * Math.max(0, dir.y) * Math.sin(ang * 3 + dir.y * 5 + s);
  return 1 + d;
}

const geoCache = new Map();
export function createScoopGeometry(seed = 1, detail = 1) {
  const key = 'scoop' + seed + ':' + detail;
  if (geoCache.has(key)) return geoCache.get(key);
  const geo = new THREE.SphereGeometry(1, Math.round(80 * detail), Math.round(60 * detail));
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const dir = v.clone().normalize();
    let r = scoopRadius(dir, seed);
    let y = dir.y * r;
    let hx = dir.x * r, hz = dir.z * r;
    // frilly flared lip at the base, flattened bottom
    const ang = Math.atan2(dir.z, dir.x);
    if (dir.y < -0.15) {
      const t = Math.min(1, (-0.15 - dir.y) / 0.45);
      const ruffle = 0.55 + 0.45 * Math.sin(ang * 9 + seed * 3 + fbm(dir.x * 4, seed, dir.z * 4) * 4);
      const flare = 1 + 0.2 * Math.sin(t * Math.PI * 0.9) * ruffle;
      hx *= flare; hz *= flare;
      if (y < -0.5) y = -0.5 + (y + 0.5) * 0.22;
      y += 0.05 * ruffle * t;
    }
    pos.setXYZ(i, hx, y, hz);
  }
  geo.computeVertexNormals();
  geo.userData.seed = seed;
  geoCache.set(key, geo);
  return geo;
}

const matCache = new Map();
export function scoopMaterial(flavor) {
  if (matCache.has(flavor)) return matCache.get(flavor);
  const f = FLAVORS[flavor];
  const bump = creamBump();
  const m = Mat({
    color: f.color,
    roughness: flavor === 'chocolate' ? 0.48 : 0.6,
    bumpMap: bump,
    bumpScale: 7,
    sheen: 0.7,
    sheenColor: new THREE.Color(f.sheen),
    sheenRoughness: 0.45,
    clearcoat: flavor === 'chocolate' ? 0.35 : 0.12,
    clearcoatRoughness: 0.5,
  });
  matCache.set(flavor, m);
  return m;
}

const bitMats = {};
function bitMaterial(kind) {
  if (bitMats[kind]) return bitMats[kind];
  const map = {
    strawberry: { color: '#a3162d', roughness: 0.35, clearcoat: 0.6 },
    pistachio: { color: '#6f8a2a', roughness: 0.6 },
    pistachioSkin: { color: '#7a4a35', roughness: 0.8 },
    chocolate: { color: '#2e170f', roughness: 0.42, clearcoat: 0.3 },
    vanilla: { color: '#2a1a12', roughness: 0.9 },
    almond: { color: '#c78d52', roughness: 0.75 },
    mango: { color: '#f08a1a', roughness: 0.4, clearcoat: 0.4 },
  };
  bitMats[kind] = Mat(map[kind]);
  return bitMats[kind];
}

function bitGeometry(kind, r) {
  let g;
  if (kind === 'chocolate') g = new RoundedBoxGeometry(0.16, 0.05 + r() * 0.04, 0.12, 2, 0.015);
  else if (kind === 'vanilla') g = new THREE.SphereGeometry(0.012, 6, 4);
  else g = new THREE.IcosahedronGeometry(0.06 + r() * 0.04, kind === 'strawberry' || kind === 'mango' ? 1 : 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(i, p.getX(i) * (0.8 + r() * 0.4), p.getY(i) * (0.7 + r() * 0.5), p.getZ(i) * (0.8 + r() * 0.4));
  }
  g.computeVertexNormals();
  return g;
}

/** A full scoop: creamy body + inclusions (+ optional syrup drizzle). Unit radius ≈ 1. */
export function createScoop(flavor, seed = 1, { detail = 1, drizzle = true } = {}) {
  const group = new THREE.Group();
  group.name = 'scoop-' + flavor;
  const geo = createScoopGeometry(seed, detail);
  const body = new THREE.Mesh(geo, scoopMaterial(flavor));
  group.add(body);
  const f = FLAVORS[flavor];
  const r = rng(seed * 97 + 13);
  const count = f.bits === 'vanilla' ? 70 : f.bits === 'chocolate' ? 10 : 14;
  const dir = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    // random direction on the upper ~70% of the sphere
    const y = -0.2 + r() * 1.15;
    const a = r() * Math.PI * 2;
    const rr = Math.sqrt(Math.max(0, 1 - Math.min(1, y) ** 2));
    dir.set(Math.cos(a) * rr, Math.min(1, y), Math.sin(a) * rr).normalize();
    const R = scoopRadius(dir, seed) - (f.bits === 'vanilla' ? 0.005 : 0.03);
    const kind = f.bits === 'pistachio' && r() > 0.6 ? 'pistachioSkin' : f.bits;
    const m = new THREE.Mesh(bitGeometry(f.bits, r), bitMaterial(kind));
    m.position.copy(dir).multiplyScalar(R);
    m.lookAt(dir.clone().multiplyScalar(3));
    m.rotateZ(r() * Math.PI);
    group.add(m);
  }
  if (drizzle && f.drizzle) group.add(createDrizzle(seed, f.drizzle, detail));
  return group;
}

/* ---------------- syrup drizzle ---------------- */
export function createDrizzle(seed, color, detail = 1) {
  // A sauce "cap" that hugs the top of the scoop and runs down in drips. Geometry is cached per seed.
  const key = 'drizzle' + seed + ':' + detail;
  const cached = geoCache.get(key);
  const mat = Mat({ color, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04 });
  if (cached) { const m = new THREE.Mesh(cached, mat); m.name = 'drizzle'; return m; }
  const geo = new THREE.SphereGeometry(1, Math.round(128 * detail), Math.round(88 * detail));
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const r = rng(seed * 31 + 7);
  const drips = Array.from({ length: 9 }, () => ({ a: r() * Math.PI * 2, w: 0.05 + r() * 0.05, len: 0.15 + r() * 0.45 }));
  const tip = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const ang = Math.atan2(v.z, v.x);
    // edge latitude (in dir.y units): wavy rim, pulled down where drips run
    let edge = 0.74 + 0.07 * Math.sin(ang * 3 + seed) + 0.05 * fbm(Math.cos(ang) * 2, seed, Math.sin(ang) * 2);
    let dripT = 0;
    for (const d of drips) {
      let da = Math.abs(((ang - d.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      const k = Math.exp(-(da * da) / (2 * d.w * d.w));
      edge -= d.len * k;
      dripT = Math.max(dripT, k);
    }
    const inside = v.y - edge; // >0 = covered
    const t = THREE.MathUtils.smoothstep(inside, -0.035, 0.06);
    // drops bulge at drip tips
    const bulge = dripT > 0.6 ? Math.exp(-((inside - 0.03) ** 2) / 0.002) * 0.035 * dripT : 0;
    const R = scoopRadius(v, seed);
    const rr = inside < -0.15 ? R * 0.6 : R - 0.02 + 0.052 * t + bulge;
    pos.setXYZ(i, v.x * rr, v.y * rr, v.z * rr);
  }
  geo.computeVertexNormals();
  geoCache.set(key, geo);
  const m = new THREE.Mesh(geo, mat);
  m.name = 'drizzle';
  return m;
}

/* ---------------- bowl ---------------- */
export function createBowl({ label = true } = {}) {
  const group = new THREE.Group();
  group.name = 'bowl';
  const outer = [
    [0.001, 0], [0.62, 0], [0.68, 0.04], [0.66, 0.1], [0.6, 0.14],
    [0.7, 0.18], [0.95, 0.32], [1.18, 0.55], [1.34, 0.82], [1.42, 1.06],
  ];
  const rim = [[1.45, 1.12], [1.43, 1.16], [1.38, 1.16], [1.35, 1.12]];
  const inner = [[1.3, 1.02], [1.18, 0.78], [0.95, 0.52], [0.6, 0.34], [0.001, 0.28]];
  const profile = [...outer, ...rim, ...inner].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(profile, 128);
  geo.computeVertexNormals();
  const mat = Mat({
    color: '#efe4d3', roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.25, sheen: 0.3, sheenColor: '#fff',
  });
  const bowl = new THREE.Mesh(geo, mat);
  group.add(bowl);
  // speckles band (rim) for ceramic character
  const rimMat = new THREE.MeshStandardMaterial({ color: '#d9c7ad', roughness: 0.5 });
  const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(1.425, 0.035, 12, 160), rimMat);
  rimMesh.rotation.x = Math.PI / 2;
  rimMesh.position.y = 1.14;
  group.add(rimMesh);
  if (label) {
    const band = outer.slice(5).map(([x, y]) => new THREE.Vector2(x * 1.004, y));
    const lg = new THREE.LatheGeometry(band, 128, -Math.PI * 0.5, Math.PI);
    const lm = new THREE.Mesh(lg, new THREE.MeshStandardMaterial({
      map: bowlLabelTex(), transparent: true, roughness: 0.5, depthWrite: false,
    }));
    lm.name = 'label';
    group.add(lm);
  }
  return group;
}

/* ---------------- cone ---------------- */
export function createCone() {
  const group = new THREE.Group();
  const profile = [[0.001, -2.3], [0.07, -2.18], [0.66, 0], [0.73, 0.04], [0.74, 0.2], [0.68, 0.24], [0.6, 0.2], [0.001, 0.2]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(profile, 72);
  const t = waffleTex(); t.repeat.set(3, 2.5);
  const b = waffleTex(true); b.repeat.set(3, 2.5);
  const mat = new THREE.MeshStandardMaterial({ map: t, bumpMap: b, bumpScale: 4, roughness: 0.75 });
  group.add(new THREE.Mesh(geo, mat));
  return group;
}

/* ---------------- toppings ---------------- */
export function createWaferFan() {
  const shape = new THREE.Shape();
  const R = 1.1, a0 = -0.42, a1 = 0.42;
  shape.moveTo(0, 0);
  for (let i = 0; i <= 24; i++) {
    const a = a0 + (a1 - a0) * (i / 24) + Math.PI / 2;
    const rr = R + 0.04 * Math.sin(i * Math.PI); // scalloped edge
    shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  shape.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 8 });
  const t = waffleTex(); const b = waffleTex(true);
  t.repeat.set(1.4, 1.4); b.repeat.set(1.4, 1.4);
  const mat = new THREE.MeshStandardMaterial({ map: t, bumpMap: b, bumpScale: 3, roughness: 0.7 });
  // ExtrudeGeometry UVs are in shape units; fine for a repeating grid.
  const m = new THREE.Mesh(geo, mat);
  m.name = 'wafer';
  return m;
}

export function createMintLeaf(seed = 1) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.22, 0.12, 0.26, 0.42, 0, 0.7);
  s.bezierCurveTo(-0.26, 0.42, -0.22, 0.12, 0, 0);
  const geo = new THREE.ShapeGeometry(s, 10);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, -x * x * 1.2 + Math.sin(y * 4 + seed) * 0.03);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, Mat({
    color: '#4f7a2c', roughness: 0.45, clearcoat: 0.5, side: THREE.DoubleSide, sheen: 0.5, sheenColor: '#b8e07a',
  }));
  m.name = 'mint';
  return m;
}

export function createChocoChunk(seed = 1) {
  const r = rng(seed);
  const g = new RoundedBoxGeometry(0.34 + r() * 0.2, 0.22 + r() * 0.12, 0.3 + r() * 0.15, 2, 0.025);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + p.getX(i) * (r() - 0.5) * 0.3);
  g.computeVertexNormals();
  return new THREE.Mesh(g, bitMaterial('chocolate'));
}

export function createStrawberry(seed = 1) {
  const group = new THREE.Group();
  const prof = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24; // 0 tip -> 1 top
    const r = Math.sin(Math.pow(t, 0.8) * Math.PI * 0.62) * 0.48 * (1 - Math.pow(t, 6) * 0.35);
    prof.push(new THREE.Vector2(Math.max(0.001, r), t * 1.05));
  }
  prof.push(new THREE.Vector2(0.001, 1.07));
  const geo = new THREE.LatheGeometry(prof, 40);
  const body = new THREE.Mesh(geo, Mat({ map: seedsTex(), roughness: 0.28, clearcoat: 0.7, clearcoatRoughness: 0.2 }));
  group.add(body);
  const leafMat = new THREE.MeshStandardMaterial({ color: '#3f6b22', roughness: 0.6, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.quadraticCurveTo(0.1, 0.12, 0, 0.32); s.quadraticCurveTo(-0.1, 0.12, 0, 0);
    const lf = new THREE.Mesh(new THREE.ShapeGeometry(s, 6), leafMat);
    lf.position.y = 1.03;
    lf.rotation.set(-Math.PI / 2 + 0.5, (i / 7) * Math.PI * 2, 0, 'YXZ');
    group.add(lf);
  }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.18, 6), leafMat);
  stem.position.y = 1.14;
  group.add(stem);
  group.rotation.z = Math.PI; // tip up looks odd; caller orients
  return group;
}

/* ---------------- lighting ---------------- */
export function addStudioLights(scene, { warm = '#ffe6cf', rim = '#ff9fb0' } = {}) {
  scene.add(new THREE.HemisphereLight('#fff4e8', '#6b3a2a', 0.9));
  const key = new THREE.DirectionalLight(warm, 2.6);
  key.position.set(3, 6, 5);
  scene.add(key);
  const rimL = new THREE.DirectionalLight(rim, 2.2);
  rimL.position.set(-5, 3, -4);
  scene.add(rimL);
  const fill = new THREE.PointLight('#fff', 8, 20, 2);
  fill.position.set(-2, 1, 5);
  scene.add(fill);
  return { key, rim: rimL, fill };
}

/* ---------------- full sundae ---------------- */
// Scoop resting positions inside the bowl (bowl rim ≈ y 1.1, radius ≈ 1.4)
export const SUNDAE_LAYOUT = [
  { flavor: 'fresa', pos: [-0.62, 1.42, 0.22], scale: 0.78, rot: [0.1, 0.4, -0.12], seed: 3 },
  { flavor: 'pistacho', pos: [0.28, 1.36, 0.55], scale: 0.74, rot: [0.08, 1.2, 0.1], seed: 8 },
  { flavor: 'chocolate', pos: [0.62, 1.6, -0.38], scale: 0.76, rot: [-0.05, 2.2, 0.12], seed: 5 },
];

export function createSundae({ detail = 1 } = {}) {
  const root = new THREE.Group();
  root.name = 'sundae';
  const bowl = createBowl();
  root.add(bowl);
  const scoops = SUNDAE_LAYOUT.map((L) => {
    const s = createScoop(L.flavor, L.seed, { detail });
    s.position.set(...L.pos);
    s.rotation.set(...L.rot);
    s.scale.setScalar(L.scale);
    s.userData.rest = { pos: new THREE.Vector3(...L.pos), scale: L.scale };
    root.add(s);
    return s;
  });
  const wafer = createWaferFan();
  wafer.position.set(-0.05, 1.55, -0.75);
  wafer.rotation.set(-0.25, 0.25, 0.35);
  wafer.userData.rest = { pos: wafer.position.clone(), rot: wafer.rotation.clone() };
  root.add(wafer);
  const chunks = [0, 1, 2].map((i) => {
    const c = createChocoChunk(i + 2);
    const ps = [[0.95, 2.12, -0.2], [0.55, 2.2, -0.05], [-0.25, 1.95, 0.55]][i];
    c.position.set(...ps);
    c.rotation.set(i, i * 2, i * 0.5);
    c.scale.setScalar(0.5);
    c.userData.rest = { pos: c.position.clone(), scale: 0.5 };
    root.add(c);
    return c;
  });
  const leaves = [0, 1].map((i) => {
    const l = createMintLeaf(i + 1);
    l.position.set(i ? 0.15 : -0.45, i ? 1.98 : 2.0, i ? 0.62 : 0.5);
    l.rotation.set(-0.9, i ? -0.6 : 0.7, i ? -0.3 : 0.4);
    l.scale.setScalar(0.8);
    l.userData.rest = { pos: l.position.clone(), scale: 0.8 };
    root.add(l);
    return l;
  });
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 4.6),
    new THREE.MeshBasicMaterial({ map: radialShadowTex(), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.005;
  shadow.renderOrder = -1;
  root.add(shadow);
  return { root, bowl, scoops, wafer, chunks, leaves, shadow };
}

/* ---------------- renderer helper ---------------- */
// DPR cap: 2 on desktop, 1.75 on touch devices (big fill-rate win on phones, visually identical)
export const maxDpr = () => Math.min(window.devicePixelRatio || 1, window.matchMedia('(pointer: coarse)').matches ? 1.75 : 2);

export function makeRenderer(canvas, { alpha = true } = {}) {
  // MSAA is wasted work on retina screens: the extra pixels already smooth the edges.
  const antialias = (window.devicePixelRatio || 1) < 1.5;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias, alpha, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  renderer.setPixelRatio(maxDpr());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.setClearColor(0x000000, 0);
  return renderer;
}

export async function makeEnvironment(renderer) {
  const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  pm.dispose();
  return env;
}

export function disposeObject(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => m.dispose());
    }
  });
}
