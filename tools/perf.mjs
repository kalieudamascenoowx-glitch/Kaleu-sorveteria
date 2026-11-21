// Fast-scroll jank probe: node tools/perf.mjs [url] [gl|nogl] [mobile]
import { createRequire } from 'module';
const require = createRequire((process.env.NODE_PATH || '').split(':')[0] + '/');
const { chromium, devices } = require('playwright');
const url = process.argv[2] || 'http://localhost:4173/';
const gl = (process.argv[3] || 'gl') === 'gl';
const mobile = process.argv[4] === 'mobile';
const b = await chromium.launch({ args: gl ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [] });
const ctx = await b.newContext(mobile ? { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } } : { viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
if (!gl) await p.addInitScript(() => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/.test(t) ? null : g.call(this, t, ...a); }; });
await p.addInitScript(() => {
  window.__frames = []; window.__long = [];
  let last = performance.now();
  const loop = (t) => { window.__frames.push(t - last); last = t; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push({ t: Math.round(e.startTime), d: Math.round(e.duration) }))).observe({ type: 'longtask', buffered: true });
});
await p.goto(url); await p.waitForFunction(() => window.__scoopeReady, null, { timeout: 60000 }); await p.waitForTimeout(2500);
const t0 = await p.evaluate(() => { window.__frames = []; window.__long = []; return performance.now(); });
await p.mouse.move(700, 400);
const H = await p.evaluate(() => document.documentElement.scrollHeight);
for (let i = 0; i < 40; i++) { await p.mouse.wheel(0, H / 32); await p.waitForTimeout(60); }   // fast down
await p.waitForTimeout(800);
for (let i = 0; i < 40; i++) { await p.mouse.wheel(0, -H / 32); await p.waitForTimeout(60); } // fast up
await p.waitForTimeout(800);
const r = await p.evaluate((t0) => {
  const f = window.__frames.slice(2); const s = [...f].sort((a, b) => a - b);
  const pct = (q) => Math.round(s[Math.floor(s.length * q)]);
  return { frames: f.length, p50: pct(0.5), p95: pct(0.95), max: Math.round(s[s.length - 1]), over50: f.filter((x) => x > 50).length, long: window.__long.map((l) => ({ at: l.t - Math.round(t0), d: l.d })) };
}, t0);
console.log(JSON.stringify({ gl, mobile, ...r }));
await b.close();
