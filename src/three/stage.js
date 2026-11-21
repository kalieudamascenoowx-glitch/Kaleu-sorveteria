import * as THREE from 'three';
import gsap from 'gsap';
import { maxDpr, makeRenderer, makeEnvironment, addStudioLights, disposeObject } from './icecream.js';

/**
 * Minimal render stage:
 *  - DPR capped at 2, resizes with its container (ResizeObserver)
 *  - renders only while its section is on screen and the tab is visible
 *  - cleans up every listener / GPU resource on dispose()
 */
export class Stage {
  constructor(canvas, { fov = 30, observe = canvas.parentElement } = {}) {
    this.canvas = canvas;
    this.container = canvas.parentElement;
    this.renderer = makeRenderer(canvas);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
    this.elapsed = 0;
    this._last = 0;
    this.inView = false;
    this.running = false;
    this.disposed = false;
    this.lost = false;
    this.w = 1; this.h = 1;
    this._tick = this._tick.bind(this);

    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(this.container);

    this._io = new IntersectionObserver(([e]) => {
      this.inView = e.isIntersecting;
      this._sync();
    }, { rootMargin: '80px 0px' });
    this._io.observe(observe);

    this._onVis = () => this._sync();
    document.addEventListener('visibilitychange', this._onVis);

    this._onLost = (e) => {
      e.preventDefault();
      this.lost = true;
      this._sync();
      document.documentElement.classList.add('no-webgl');
    };
    canvas.addEventListener('webglcontextlost', this._onLost);
  }

  async setupLighting(opts) {
    this.scene.environment = await makeEnvironment(this.renderer);
    this.scene.environmentIntensity = 0.55;
    this.lights = addStudioLights(this.scene, opts);
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h || (w === this.w && h === this.h)) return;
    this.w = w; this.h = h;
    this.renderer.setPixelRatio(maxDpr());
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.ready) {
      this.layout?.(w, h);
      if (!this.running) this.render();
    }
  }

  /** world-space size of the view at a given distance from the camera */
  viewSize(dist) {
    const h = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * dist;
    return { w: h * this.camera.aspect, h };
  }

  _sync() {
    const should = this.inView && !document.hidden && !this.lost && !this.disposed && this.ready;
    if (should && !this.running) {
      this.running = true;
      this._last = performance.now();
      gsap.ticker.add(this._tick);
    } else if (!should && this.running) {
      this.running = false;
      gsap.ticker.remove(this._tick);
    }
  }

  start() { this.ready = true; this.w = this.h = 0; this.resize(); this._sync(); this.render(); }

  _tick() {
    const now = performance.now();
    const dt = Math.min((now - this._last) / 1000, 1 / 20);
    this._last = now;
    this.elapsed += dt;
    this.update?.(dt, this.elapsed);
    this.render();
  }

  render() { if (!this.lost) this.renderer.render(this.scene, this.camera); }

  dispose() {
    this.disposed = true;
    this._sync();
    this._ro.disconnect();
    this._io.disconnect();
    document.removeEventListener('visibilitychange', this._onVis);
    this.canvas.removeEventListener('webglcontextlost', this._onLost);
    disposeObject(this.scene);
    this.scene.environment?.dispose();
    this.renderer.dispose();
  }
}

export { webglAvailable } from './gl-check.js';
