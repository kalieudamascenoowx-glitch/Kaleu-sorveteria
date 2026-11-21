import * as THREE from 'three';
import { Stage } from './stage.js';
import { SundaeRig } from './rig.js';
import { rng } from './icecream.js';

/** "Monta tu copa": the sundae is assembled by a scrubbed timeline that tweens rig.state. */
export class BuildScene extends Stage {
  constructor(canvas, { state, reduced = false } = {}) {
    super(canvas, { fov: 30, observe: canvas.closest('section') });
    this.reduced = reduced;
    this.extState = state; // shared object tweened by ScrollTrigger (exists before the scene)
    this.target = new THREE.Vector3(0, 1.3, 0);
    this.camera.position.set(0, 3.6, 11);
    this.pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  }

  async init() {
    await this.setupLighting({ warm: '#ffd9a8', rim: '#ff8fa6' });
    this.lights.key.intensity = 3.2;
    this.lights.rim.intensity = 3.4;
    this.scene.environmentIntensity = 0.35;
    const mobile = window.innerWidth < 760;
    this.rig = new SundaeRig({ detail: mobile ? 0.7 : 1 });
    this.scene.add(this.rig.pivot);

    // warm dust in the spotlight
    const n = mobile ? 90 : 180;
    const r = rng(21);
    const pos = new Float32Array(n * 3);
    this.dust = Array.from({ length: n }, (_, i) => {
      const d = { x: (r() - 0.5) * 9, y: r() * 6 - 1, z: (r() - 0.5) * 5, v: 0.08 + r() * 0.2, ph: r() * 6 };
      pos.set([d.x, d.y, d.z], i * 3);
      return d;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,220,160,1)'); grd.addColorStop(1, 'rgba(255,220,160,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    this.points = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.09, map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.7 }));
    this.scene.add(this.points);

    this._onPointer = (e) => {
      this.pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', this._onPointer, { passive: true });
    // render the finished cup once while off-screen so every shader/texture is ready before the user arrives
    this.rig.setAll(1);
    await this.warm();
    this.start();
  }

  layout(w, h) {
    const aspect = w / h;
    const dist = this.camera.position.distanceTo(this.target);
    const view = this.viewSize(dist);
    let scale, x, y;
    if (aspect > 1.05) {
      scale = Math.min(view.h * 0.52 / 2.8, view.w * 0.36 / 3.4);
      x = view.w * 0.08;
      y = this.target.y - view.h * 0.5 + view.h * 0.2;
    } else {
      scale = Math.min(view.w * 0.8 / 3.6, view.h * 0.3 / 2.8);
      x = 0;
      y = this.target.y - view.h * 0.5 + view.h * 0.3;
    }
    this.rig.pivot.position.set(x, y, 0);
    this.rig.pivot.scale.setScalar(scale);
  }

  update(dt, t) {
    const st = this.extState;
    Object.assign(this.rig.state, st);
    this.rig.apply();
    const P = this.pointer;
    const k = 1 - Math.pow(0.002, dt);
    P.x += (P.tx - P.x) * k; P.y += (P.ty - P.y) * k;
    this.rig.pivot.rotation.y = 0.35 - st.spin * 0.7 + P.x * 0.25 + (this.reduced ? 0 : Math.sin(t * 0.4) * 0.06);
    this.rig.pivot.rotation.x = P.y * 0.06;
    this.camera.position.z = 11 - st.cam * 0.7;
    this.camera.position.y = 3.6 - st.cam * 0.3;
    this.camera.position.x = P.x * 0.3;
    this.camera.lookAt(this.target);
    if (!this.reduced) {
      const a = this.points.geometry.attributes.position;
      this.dust.forEach((d, i) => {
        let y = d.y + ((t * d.v) % 7);
        if (y > 5) y -= 7;
        a.setXYZ(i, d.x + Math.sin(t * 0.5 + d.ph) * 0.2, y, d.z);
      });
      a.needsUpdate = true;
    }
  }

  dispose() {
    window.removeEventListener('pointermove', this._onPointer);
    super.dispose();
  }
}
