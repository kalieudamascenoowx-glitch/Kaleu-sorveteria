// Interaction QA: node tools/interact.mjs [url]
import { createRequire } from 'module';
const require = createRequire((process.env.NODE_PATH || '').split(':')[0] + '/');
const { chromium, devices } = require('playwright');
const url = process.argv[2] || 'http://localhost:5173/';
const out = process.argv[3] || '/tmp/claude-0/shots';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ok = (c, m) => console.log((c ? '  ✓ ' : '  ✗ FAIL ') + m);
const errsOf = (p) => { const e = []; p.on('pageerror', (x) => e.push(x.message)); p.on('console', (m) => m.type() === 'error' && e.push(m.text())); return e; };
const ready = (p) => p.waitForFunction(() => window.__scoopeReady, null, { timeout: 30000 });

{ // ---- mobile
  console.log('MOBILE 390x844');
  const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); const errs = errsOf(p);
  await p.goto(url); await ready(p); await p.waitForTimeout(2500);
  await p.tap('.burger'); await p.waitForTimeout(900);
  ok(await p.evaluate(() => document.documentElement.classList.contains('menu-open')), 'burger opens menu');
  await p.screenshot({ path: out + '/i-mob-menu.png' });
  await p.tap('.mobile-menu a[href="#encuentranos"]'); await p.waitForTimeout(2600);
  ok(!(await p.evaluate(() => document.documentElement.classList.contains('menu-open'))), 'menu closes on link');
  const top = await p.evaluate(() => document.querySelector('#encuentranos').getBoundingClientRect().top);
  ok(Math.abs(top) < 80, 'anchor scrolled to #encuentranos (top=' + Math.round(top) + ')');
  await p.screenshot({ path: out + '/i-mob-visit.png' });
  // carousel swipe via scrollLeft
  await p.evaluate(() => document.querySelector('#sabores').scrollIntoView()); await p.waitForTimeout(1500);
  await p.tap('[data-carousel-next]'); await p.waitForTimeout(900);
  ok(await p.evaluate(() => document.querySelector('.carousel__track').scrollLeft > 100), 'carousel next button scrolls');
  await p.screenshot({ path: out + '/i-mob-carousel.png' });
  // dialog from card
  await p.tap('.fcard:nth-child(2) [data-open-menu]'); await p.waitForTimeout(700);
  ok(await p.evaluate(() => document.querySelector('#menuDialog').open), 'card opens menu dialog');
  ok(await p.evaluate(() => document.querySelector('.menu-item.is-hl')?.dataset.title === 'Sueño de Pistacho'), 'flavor highlighted');
  await p.screenshot({ path: out + '/i-mob-dialog.png' });
  await p.tap('[data-close-menu]'); await p.waitForTimeout(400);
  ok(!(await p.evaluate(() => document.querySelector('#menuDialog').open)), 'dialog closes');
  const hs = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ok(hs <= 0, 'no horizontal scroll (' + hs + ')');
  ok(errs.length === 0, 'console clean ' + JSON.stringify(errs));
  await ctx.close();
}
{ // ---- desktop
  console.log('DESKTOP 1440x900');
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = errsOf(p);
  await p.goto(url); await ready(p); await p.waitForTimeout(2000);
  await p.click('[data-open-menu]'); await p.waitForTimeout(500);
  await p.fill('#menuSearch', 'limon');
  const n = await p.evaluate(() => [...document.querySelectorAll('.menu-item')].filter((li) => !li.hidden).length);
  ok(n === 1, 'search "limon" (no accent) -> 1 result: ' + n);
  await p.fill('#menuSearch', 'zzz'); ok(await p.isVisible('#menuEmpty'), 'empty state shows');
  await p.fill('#menuSearch', ''); await p.click('.chip[data-filter="vegano"]');
  const v = await p.evaluate(() => [...document.querySelectorAll('.menu-item')].filter((li) => !li.hidden).length);
  ok(v === 4, 'vegan filter -> 4: ' + v);
  await p.screenshot({ path: out + '/i-desk-dialog.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok(!(await p.evaluate(() => document.querySelector('#menuDialog').open)), 'Esc closes dialog');
  await p.mouse.wheel(0, 600); await p.waitForTimeout(800);
  ok(await p.evaluate(() => scrollY > 300), 'wheel scroll works after dialog close (lenis restarted)');
  // newsletter
  await p.click('a[href="#encuentranos"]'); await p.waitForTimeout(2500);
  await p.evaluate(() => document.querySelector('.join').scrollIntoView()); await p.waitForTimeout(1200);
  await p.fill('#joinEmail', 'nope'); await p.click('#joinForm button'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelector('#joinMsg').classList.contains('is-error')), 'invalid email rejected');
  await p.fill('#joinEmail', 'hola@ejemplo.com'); await p.click('#joinForm button'); await p.waitForTimeout(600);
  ok((await p.textContent('#joinMsg')).includes('Bienvenid'), 'valid email accepted');
  await p.screenshot({ path: out + '/i-desk-join.png' });
  // hover tilt
  await p.evaluate(() => document.querySelector('#sabores').scrollIntoView()); await p.waitForTimeout(1500);
  const box = await p.locator('.fcard__inner').first().boundingBox();
  await p.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.2); await p.waitForTimeout(700);
  ok(await p.evaluate(() => /rotate/.test(document.querySelector('.fcard__inner').style.transform)), 'card tilts on hover');
  await p.screenshot({ path: out + '/i-desk-tilt.png' });
  ok(errs.length === 0, 'console clean ' + JSON.stringify(errs));
  await p.close();
}
{ // ---- reduced motion
  console.log('REDUCED MOTION');
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); const errs = errsOf(p);
  await p.goto(url); await ready(p); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.hero__title .line > span')).transform === 'none'), 'title visible without animation');
  await p.evaluate(() => document.querySelector('#copa').scrollIntoView()); await p.waitForTimeout(1500);
  ok((await p.textContent('#buildPrice')) === '6,90', 'cup shows final state');
  await p.screenshot({ path: out + '/i-reduced-build.png' });
  ok(errs.length === 0, 'console clean ' + JSON.stringify(errs));
  await ctx.close();
}
{ // ---- no WebGL
  console.log('NO WEBGL');
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = errsOf(p);
  await p.addInitScript(() => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/.test(t) ? null : g.call(this, t, ...a); }; });
  await p.goto(url); await ready(p); await p.waitForTimeout(2500);
  ok(await p.evaluate(() => document.documentElement.classList.contains('no-webgl')), 'no-webgl class set');
  ok(await p.isVisible('.hero__fallback'), 'hero fallback image visible');
  await p.screenshot({ path: out + '/i-nogl-hero.png' });
  ok(errs.length === 0, 'console clean ' + JSON.stringify(errs));
  await p.close();
}
await b.close();
