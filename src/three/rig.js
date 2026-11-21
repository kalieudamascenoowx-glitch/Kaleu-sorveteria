import * as THREE from 'three';
import { createSundae } from './icecream.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const backOut = (t, s = 1.8) => { const u = t - 1; return 1 + (s + 1) * u * u * u + s * u * u; };
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/**
 * The sundae as a pure function of a state object (all values 0..1).
 * Anything (an intro timeline or a scrubbed ScrollTrigger) can tween `state`;
 * apply() maps it to the scene, so every animation is deterministic and reversible.
 */
export class SundaeRig {
  constructor({ detail = 1 } = {}) {
    const s = createSundae({ detail });
    Object.assign(this, s);
    this.pivot = new THREE.Group();
    this.pivot.add(this.root);
    this.drizzle = this.scoops[0].getObjectByName('drizzle');
    this.state = { bowl: 1, s0: 1, s1: 1, s2: 1, sauce: 1, chunks: 1, wafer: 1, leaves: 1 };
    this.bowlRest = this.bowl.position.clone();
  }

  apply() {
    const st = this.state;
    // bowl rises from below and settles
    const b = easeOut(clamp01(st.bowl));
    this.bowl.position.y = this.bowlRest.y + (1 - b) * -3.4;
    this.bowl.rotation.y = (1 - b) * -1.4;
    this.bowl.visible = st.bowl > 0.001;
    this.shadow.material.opacity = b;
    this.shadow.scale.setScalar(0.6 + b * 0.4);

    // scoops: fall (accelerating) then squash & recover on landing
    this.scoops.forEach((sc, i) => {
      const s = clamp01(st['s' + i]);
      const rest = sc.userData.rest;
      sc.visible = s > 0.001;
      let y = rest.pos.y, sx = 1, sy = 1;
      if (s < 0.75) {
        const p = s / 0.75;
        y += (1 - p * p) * 6;
        sy = 1.1; sx = 0.94;
      } else {
        const q = (s - 0.75) / 0.25;
        const k = Math.sin(q * Math.PI) * (1 - q * 0.5);
        sy = 1 - 0.2 * k; sx = 1 + 0.12 * k;
        y -= 0.12 * k;
      }
      sc.position.y = y;
      sc.scale.set(rest.scale * sx, rest.scale * sy, rest.scale * sx);
    });

    // sauce grows out of the strawberry scoop (hidden inside at 0.9)
    if (this.drizzle) {
      const d = clamp01(st.sauce);
      this.drizzle.scale.setScalar(0.9 + 0.1 * easeOut(d));
      this.drizzle.visible = d > 0.001;
    }

    this.chunks.forEach((c, i) => {
      const t = clamp01((st.chunks - i * 0.2) / 0.6);
      const rest = c.userData.rest;
      c.visible = t > 0.001;
      c.position.y = rest.pos.y + (1 - t * t) * 4.5;
      c.rotation.x = i + (1 - t) * 5;
    });

    const w = clamp01(st.wafer);
    const ew = easeOut(w);
    const wr = this.wafer.userData.rest;
    this.wafer.visible = w > 0.001;
    this.wafer.position.set(wr.pos.x - (1 - ew) * 2.4, wr.pos.y + (1 - ew) * 3, wr.pos.z);
    this.wafer.rotation.set(wr.rot.x, wr.rot.y, wr.rot.z + (1 - ew) * 1.8);

    this.leaves.forEach((l, i) => {
      const t = clamp01((st.leaves - i * 0.3) / 0.7);
      l.visible = t > 0.001;
      l.scale.setScalar(l.userData.rest.scale * Math.max(0.0001, backOut(t)));
    });
  }

  setAll(v) { for (const k in this.state) this.state[k] = v; this.apply(); }
}
