import * as THREE from 'three';
import gsap from 'gsap';
import { Stage } from './stage.js';
import { SundaeRig } from './rig.js';
import { createStrawberry, createChocoChunk, rng } from './icecream.js';

const isTouch = () => window.matchMedia('(hover: none)').matches;

export class HeroScene extends Stage {
  constructor(canvas, { reduced = false } = {}) {
    super(canvas, { fov: 30, observe: canvas.closest('section') });
    this.reduced = reduced;
    this.pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    this.scrollP = 0;
    this.target = new THREE.Vector3(0, 1.25, 0);
    this.camera.position.set(0, 3.1, 10.5);
  }

  async init() {
    await this.setupLighting();
    const mobile = window.innerWidth < 760;
    this.rig = new SundaeRig({ detail: mobile ? 0.7 : 1 });
    this.scene.add(this.rig.pivot);

    // still-life props around the bowl (like the reference photo)
    const props = new THREE.Group();
    const sb1 = createStrawberry(1); sb1.position.set(-1.75, 0.38, 0.9); sb1.rotation.set(0.2, 0.4, Math.PI / 2 + 0.25); sb1.scale.setScalar(0.62);
    const sb2 = createStrawberry(2); sb2.position.set(-2.15, 0.32, -0.1); sb2.rotation.set(-0.3, 1.4, Math.PI / 2 - 0.1); sb2.scale.setScalar(0.55);
    const ch1 = createChocoChunk(7); ch1.position.set(1.8, 0.12, 0.8); ch1.rotation.set(0.1, 0.6, 0.15); ch1.scale.setScalar(0.85);
    const ch2 = createChocoChunk(9); ch2.position.set(2.15, 0.16, -0.15); ch2.rotation.set(0.5, 1.1, 0.4); ch2.scale.setScalar(1.05);
    props.add(sb1, sb2, ch1, ch2);
    this.props = props;
    this.rig.root.add(props);

    // floating bits (instanced: one draw call per kind)
    const r = rng(11);
    const makeField = (geo, mat, n, spread) => {
      const mesh = new THREE.InstancedMesh(geo, mat, n);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.userData.items = Array.from({ length: n }, () => ({
        p: new THREE.Vector3((r() - 0.5) * spread.x, 0.4 + r() * spread.y, (r() - 0.5) * spread.z - 0.5),
        rot: new THREE.Euler(r() * 6, r() * 6, r() * 6),
        spin: (r() - 0.5) * 0.8, bob: r() * Math.PI * 2, depth: 0.4 + r() * 0.9, s: 0.6 + r() * 0.7,
      }));
      return mesh;
    };
    const chocoMat = new THREE.MeshStandardMaterial({ color: '#3a1c10', roughness: 0.35 });
    const berryMat = new THREE.MeshStandardMaterial({ color: '#c2263c', roughness: 0.25 });
    const pistMat = new THREE.MeshStandardMaterial({ color: '#8a9a3a', roughness: 0.6 });
    const n = mobile ? 5 : 8;
    this.fields = [
      makeField(new THREE.BoxGeometry(0.16, 0.06, 0.12), chocoMat, n, { x: 6, y: 2.9, z: 3 }),
      makeField(new THREE.IcosahedronGeometry(0.08, 1), berryMat, n, { x: 6, y: 2.9, z: 3 }),
      makeField(new THREE.IcosahedronGeometry(0.06, 0), pistMat, n, { x: 6, y: 2.9, z: 3 }),
    ];
    this.fields.forEach((f) => this.scene.add(f));
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3();

    // pointer (mouse + touch). Passive listeners, removed in dispose().
    this._onPointer = (e) => {
      this.pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', this._onPointer, { passive: true });

    this.baseRotY = -0.35;
    // compile() skips invisible objects: warm up with everything visible, then hide for the intro
    this.rig.setAll(1);
    this.updateFields(0);
    await this.warm();
    this.rig.setAll(this.reduced ? 1 : 0);
    this.start();
  }

  layout(w, h) {
    const aspect = w / h;
    const dist = this.camera.position.distanceTo(this.target);
    const view = this.viewSize(dist);
    let scale, x, y;
    if (aspect > 1.05) {
      scale = Math.min(view.h * 0.58 / 2.6, view.w * 0.5 / 4.8);
      x = view.w * (0.73 - 0.5) / 1;
      y = -0.55 * scale + 0.2;
    } else {
      scale = Math.min(view.w * 0.98 / 4.8, view.h * 0.4 / 2.6);
      x = 0;
      // put the bowl in the lower part of the screen, under the copy
      y = this.target.y - view.h * 0.5 + view.h * 0.1;
    }
    this.layoutState = { x, y, scale, mobile: aspect <= 1.05 };
    this.rig.pivot.position.set(x, y, 0);
    this.rig.pivot.scale.setScalar(scale);
    this.fieldScale = scale;
  }

  /** Intro: bowl rises, scoops drop one by one, toppings pop. */
  intro() {
    if (this.reduced) return gsap.timeline();
    const st = this.rig.state;
    const tl = gsap.timeline({ onUpdate: () => this.rig.apply() });
    tl.to(st, { bowl: 1, duration: 1.2, ease: 'power3.out' })
      .to(st, { s0: 1, duration: 0.8, ease: 'none' }, 0.45)
      .to(st, { s1: 1, duration: 0.8, ease: 'none' }, 0.7)
      .to(st, { s2: 1, duration: 0.8, ease: 'none' }, 0.95)
      .to(st, { sauce: 1, duration: 0.9, ease: 'power2.out' }, 1.55)
      .to(st, { chunks: 1, duration: 0.9, ease: 'none' }, 1.6)
      .to(st, { wafer: 1, duration: 0.9, ease: 'power3.out' }, 1.75)
      .to(st, { leaves: 1, duration: 0.7, ease: 'none' }, 1.95);
    return tl;
  }

  setScroll(p) { this.scrollP = p; }

  updateFields(t) {
    const L = this.layoutState || { x: 0, y: 0, scale: 1 };
    const px = this.pointer.x, py = this.pointer.y;
    for (const f of this.fields) {
      f.userData.items.forEach((it, i) => {
        const spread = 1 + this.scrollP * 1.6;
        this._p.set(
          L.x + it.p.x * spread * (L.mobile ? 0.6 : 1) * (L.scale || 1) + px * it.depth * 0.35,
          L.y + it.p.y * (L.scale || 1) * (L.mobile ? 1.3 : 1) + Math.sin(t * 0.8 + it.bob) * 0.12 - py * it.depth * 0.2 + this.scrollP * it.depth * 2,
          it.p.z
        );
        this._q.setFromEuler(this._e.set(it.rot.x + t * it.spin, it.rot.y + t * it.spin * 0.7, it.rot.z)); // reused: no per-frame garbage
        const k = it.s * (L.mobile ? 0.8 : 1) * (this.rig.state.chunks > 0.5 || this.reduced ? 1 : this.rig.state.chunks * 2);
        this._s.setScalar(Math.max(0.0001, k));
        this._m.compose(this._p, this._q, this._s);
        f.setMatrixAt(i, this._m);
      });
      f.instanceMatrix.needsUpdate = true;
    }
  }

  update(dt, t) {
    const P = this.pointer;
    const k = 1 - Math.pow(0.002, dt); // frame-rate independent smoothing
    P.x += (P.tx - P.x) * k;
    P.y += (P.ty - P.y) * k;
    const touch = isTouch();
    const sway = this.reduced ? 0 : Math.sin(t * 0.45) * 0.12;
    const piv = this.rig.pivot;
    piv.rotation.y = this.baseRotY + sway + P.x * (touch ? 0.25 : 0.45) + this.scrollP * 1.6;
    piv.rotation.x = P.y * 0.08 + this.scrollP * 0.25;
    this.props.scale.setScalar(Math.max(0.0001, Math.min(1, this.rig.state.bowl)));
    const L = this.layoutState;
    if (L) piv.position.y = L.y - this.scrollP * 1.8;
    this.camera.position.x = P.x * 0.35;
    this.camera.position.y = 3.1 - P.y * 0.2;
    this.camera.lookAt(this.target);
    if (!this.reduced) this.updateFields(t);
  }

  dispose() {
    window.removeEventListener('pointermove', this._onPointer);
    super.dispose();
  }
}
