// node tools/shoot.mjs what outfile [w h]
import { createRequire } from 'module';
const require = createRequire(process.env.NODE_PATH.split(':')[0] + '/');
const { chromium } = require('playwright');
const [what, out, w = 1024, h = 1024] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
p.on('console', (m) => m.type() === 'error' && console.log('ERR', m.text()));
p.on('pageerror', (e) => console.log('PAGEERR', e.message));
await p.goto(`http://localhost:5173/tools/render.html?what=${what}&w=${w}&h=${h}`);
await p.waitForFunction(() => window.__done, null, { timeout: 60000 });
const data = await p.evaluate(() => {
  // re-render isn't needed; read pixels via toDataURL requires preserveDrawingBuffer, so screenshot element instead
  return true;
});
await p.locator('canvas').screenshot({ path: out, omitBackground: true });
await b.close();
