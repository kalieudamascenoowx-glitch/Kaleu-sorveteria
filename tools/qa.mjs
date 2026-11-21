// QA: node tools/qa.mjs [url] [outdir]  -> screenshots + console errors, desktop & mobile
import { createRequire } from 'module';
const require = createRequire((process.env.NODE_PATH || '').split(':')[0] + '/');
const { chromium, devices } = require('playwright');
const url = process.argv[2] || 'http://localhost:5173/';
const out = process.argv[3] || '/tmp/claude-0/shots';
const only = process.argv[4];
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const configs = [
  ['desk', { viewport: { width: 1440, height: 900 } }],
  ['mob', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }],
];
for (const [name, cfg] of configs) {
  if (only && only !== name) continue;
  const ctx = await b.newContext({ ...cfg, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errs.push(m.type() + ': ' + m.text()));
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__scoopeReady, null, { timeout: 30000 });
  await p.waitForTimeout(3200);
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  const vh = cfg.viewport.height;
  const hscroll = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(name, 'height', H, 'horizontal overflow px:', hscroll);
  const stops = (process.env.STOPS || '0,0.08,0.14,0.2,0.26,0.32,0.38,0.46,0.55,0.66,0.78,0.9,1').split(',').map(Number);
  for (const f of stops) {
    const y = Math.round(f * (H - vh));
    await p.evaluate((y) => window.scrollTo(0, y), y);
    await p.waitForTimeout(1400);
    await p.screenshot({ path: `${out}/${name}-${String(Math.round(f * 100)).padStart(3, '0')}.png` });
  }
  // scroll back up through the pinned section (reversibility)
  for (const f of [0.3, 0.2, 0]) {
    await p.evaluate((y) => window.scrollTo(0, y), Math.round(f * (H - vh)));
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${out}/${name}-back-${Math.round(f * 100)}.png` });
  }
  console.log(name, 'console:', errs.length ? errs : 'clean');
  await ctx.close();
}
await b.close();
