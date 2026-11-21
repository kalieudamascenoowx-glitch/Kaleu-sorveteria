import '@fontsource/dm-serif-display/latin-400.css';
import '@fontsource/dm-serif-display/latin-400-italic.css';
import '@fontsource/caveat/latin-600.css';
import '@fontsource-variable/dm-sans';
import './styles/main.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import {
  initAnchors, initNav, initMobileMenu, initCursor, initTilt, initCarousel,
  initMarquees, initCounters, initOpenStatus, initNewsletter, initMenuDialog, tornShape,
} from './modules/ui.js';
import { webglAvailable } from './three/gl-check.js';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const html = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasGL = webglAvailable();
if (reduced) html.classList.add('reduced');
if (!hasGL) html.classList.add('no-webgl');
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

/* ---------------- smooth scroll (Lenis ↔ ScrollTrigger) ---------------- */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1, autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop(); // until the loader is gone
}
// always start at the top (pinned sections + restored scroll = jumpy on Safari)
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

/* ---------------- UI ---------------- */
tornShape($('.hero__blob'));
const closeMenu = initMobileMenu(lenis);
initAnchors(lenis, { closeMenu });
initCursor();
initTilt();
initCarousel();
initMarquees(reduced);
initOpenStatus();
initNewsletter();
initMenuDialog(lenis);
$('#year').textContent = new Date().getFullYear();

/* ---------------- 3D scenes ---------------- */
let hero = null;
const buildState = { bowl: 0, s0: 0, s1: 0, s2: 0, sauce: 0, chunks: 0, wafer: 0, leaves: 0, spin: 0, cam: 0 };
if (reduced) Object.keys(buildState).forEach((k) => (buildState[k] = k === 'spin' || k === 'cam' ? 0 : 1));

async function initHero() {
  if (!hasGL) return;
  try {
    const { HeroScene } = await import('./three/hero-scene.js');
    hero = new HeroScene($('#heroCanvas'), { reduced });
    await hero.init();
  } catch (err) {
    console.warn('[hero] WebGL fallback', err);
    html.classList.add('no-webgl');
    hero = null;
  }
}

function initBuildLazy() {
  if (!hasGL) return;
  const section = $('#copa');
  let started = false;
  // Build the cup scene while the browser is idle right after the intro (never mid-scroll).
  // The IntersectionObserver is only a safety net if someone scrolls there instantly.
  const start = async () => {
    if (started) return;
    started = true;
    io.disconnect();
    try {
      const { BuildScene } = await import('./three/build-scene.js');
      const scene = new BuildScene($('#buildCanvas'), { state: buildState, reduced });
      await scene.init();
    } catch (err) {
      console.warn('[build] WebGL fallback', err);
      html.classList.add('no-webgl');
    }
  };
  const io = new IntersectionObserver(([e]) => e.isIntersecting && start(), { rootMargin: '200% 0px' });
  io.observe(section);
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
  setTimeout(() => idle(start, { timeout: 1500 }), 2200);
}

/* ---------------- scroll choreography ---------------- */
function setupScroll() {
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    /* hero: content drifts up and fades; 3D sinks & rotates; parallax layers */
    ScrollTrigger.create({
      trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true,
      onUpdate: (s) => hero?.setScroll(s.progress),
    });
    gsap.to('.hero__content', { yPercent: -18, opacity: 0.1, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    $$('.hero [data-depth]').forEach((el) => {
      const d = Number(el.dataset.depth);
      gsap.to(el, { y: () => -window.innerHeight * 0.35 * d, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
    });

    /* headings: masked line reveals (reversible) */
    $$('.split-lines').forEach((h) => {
      gsap.fromTo(h.querySelectorAll('.line > span'), { yPercent: 110, y: 0 }, {
        yPercent: 0, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.09,
        scrollTrigger: { trigger: h, start: 'top 86%', toggleActions: 'play none none reverse' },
      });
    });
    /* body copy (outside the hero) */
    ScrollTrigger.batch($$('main .reveal-up').filter((el) => !el.closest('.hero')), {
      start: 'top 90%',
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, overwrite: true }),
      onLeaveBack: (els) => gsap.to(els, { opacity: 0, y: 26, duration: 0.4, overwrite: true }),
    });

    /* flavor cards rise in */
    gsap.from('.fcard', { y: 80, opacity: 0, rotate: 3, duration: 1.1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.carousel', start: 'top 85%', toggleActions: 'play none none reverse' } });
    gsap.to('.stamp', { rotate: 200, ease: 'none', scrollTrigger: { trigger: '.flavors', start: 'top bottom', end: 'bottom top', scrub: true } });

    /* story: mask opens, cones parallax */
    // transform-only (composited) instead of an animated clip-path, which repaints every frame on Safari
    gsap.fromTo('.story__mask', { scale: 0.8, rotate: -2 }, { scale: 1, rotate: 0, ease: 'none', scrollTrigger: { trigger: '.story__media', start: 'top 95%', end: 'center 55%', scrub: true } });
    gsap.fromTo('.story__mask img', { yPercent: 18, rotate: -6, scale: 1.12 }, { yPercent: -6, rotate: 2, scale: 1, ease: 'none', scrollTrigger: { trigger: '.story__media', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.story__caption', { opacity: 0, x: -30, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.story__media', start: 'top 60%', toggleActions: 'play none none reverse' } });
    gsap.from('.story__motto', { opacity: 0, rotate: -20, scale: 0.8, duration: 1, ease: 'back.out(2)', scrollTrigger: { trigger: '.story', start: 'top 60%', toggleActions: 'play none none reverse' } });

    /* ingredients: winding line draws with scroll, icons draw in */
    const path = $('.ingredients__path path');
    const len = path.getTotalLength();
    gsap.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.ingredients', start: 'top 80%', end: 'bottom 60%', scrub: true } });
    $$('.ing').forEach((card, i) => {
      const paths = card.querySelectorAll('.draw path');
      paths.forEach((p) => { const l = p.getTotalLength(); gsap.set(p, { strokeDasharray: l + 1, strokeDashoffset: l + 1 }); });
      const tl = gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 88%', toggleActions: 'play none none reverse' } });
      tl.from(card, { y: 60, opacity: 0, duration: 0.9, ease: 'expo.out', delay: (i % 4) * 0.06 })
        .to(paths, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut', stagger: 0.12 }, '-=0.5');
    });

    /* map: route draws, pin drops */
    const route = $('.map__route');
    const rl = route.getTotalLength();
    const mtl = gsap.timeline({ scrollTrigger: { trigger: '.map', start: 'top 75%', toggleActions: 'play none none reverse' } });
    mtl.fromTo(route, { strokeDasharray: rl, strokeDashoffset: rl }, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' })
      .from('.map__pin', { y: -60, opacity: 0, duration: 0.8, ease: 'bounce.out' }, '-=0.3')
      .from('.map__card', { y: 20, opacity: 0, duration: 0.6, ease: 'power3.out' }, '-=0.4');

    /* newsletter scoop floats */
    gsap.fromTo('.join__img img', { yPercent: 30, rotate: -14 }, { yPercent: 8, rotate: -4, ease: 'none', scrollTrigger: { trigger: '.join', start: 'top bottom', end: 'bottom bottom', scrub: true } });

    /* ===== Monta tu copa: pinned, scrubbed, fully reversible ===== */
    const steps = $$('.bstep');
    const priceEl = $('#buildPrice');
    const bar = $('.build__progress span');
    const section = $('#copa');
    const prices = [2.5, 3.7, 4.9, 6.1, 6.9];
    const price = { v: 2.5 };
    let current = -1;
    const setStep = (i) => {
      if (i === current) return;
      current = i;
      steps.forEach((s, k) => { s.classList.toggle('is-active', k === i); s.classList.toggle('is-done', k < i); });
      gsap.to(price, { v: prices[i], duration: 0.6, ease: 'power2.out', overwrite: true, onUpdate: () => { priceEl.textContent = price.v.toFixed(2).replace('.', ','); } });
    };
    setStep(0);
    const tl = gsap.timeline({ defaults: { ease: 'none' } });
    tl.to(buildState, { bowl: 1, duration: 0.7 }, 0.05)
      .to(buildState, { s0: 1, duration: 0.7 }, 0.95)
      .to(buildState, { s1: 1, duration: 0.7 }, 1.95)
      .to(buildState, { s2: 1, duration: 0.7 }, 2.95)
      .to(buildState, { sauce: 1, duration: 0.5 }, 3.9)
      .to(buildState, { chunks: 1, duration: 0.6 }, 4.0)
      .to(buildState, { wafer: 1, duration: 0.5 }, 4.2)
      .to(buildState, { leaves: 1, duration: 0.4 }, 4.45)
      .to(buildState, { cam: 1, duration: 5 }, 0)
      .to(buildState, { spin: 1, duration: 5 }, 0)
      .fromTo('.build__bgword', { xPercent: -42 }, { xPercent: -58, duration: 5 }, 0);
    ScrollTrigger.create({
      trigger: section,
      pin: '.build__pin',
      start: 'top top',
      end: () => '+=' + window.innerHeight * 4,
      scrub: 0.6,
      animation: tl,
      invalidateOnRefresh: true,
      onUpdate(self) {
        const p = self.progress;
        bar.style.transform = `scaleX(${p})`;
        setStep(Math.min(4, Math.floor(p * 5 + 0.08)));
        section.classList.toggle('is-complete', p > 0.92);
      },
    });
    return () => { current = -1; };
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    $$('.bstep').forEach((s) => s.classList.add('is-active'));
    $('#buildPrice').textContent = '6,90';
    $('#copa').classList.add('is-complete');
  });
}

/* ---------------- loader + intro ---------------- */
function heroIntro() {
  const tl = gsap.timeline();
  if (reduced) return tl;
  tl.from('.nav', { yPercent: -100, duration: 1, ease: 'expo.out' }, 0)
    .fromTo('.hero__title .line > span', { yPercent: 110, y: 0 }, { yPercent: 0, y: 0, duration: 1.3, ease: 'expo.out', stagger: 0.12 }, 0.1)
    .to('.hero .reveal-up', { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.1 }, 0.35)
    .from('.hero__blob', { scale: 0.8, opacity: 0, rotate: -4, transformOrigin: '80% 20%', duration: 1.6, ease: 'expo.out' }, 0)
    .from('.leaf', { scale: 0, rotate: '-=60', opacity: 0, duration: 1.4, ease: 'back.out(1.6)', stagger: 0.12 }, 0.3)
    .from('.badge-cookie', { scale: 0, rotate: -180, duration: 1.2, ease: 'back.out(1.8)' }, 0.9)
    .from('.hero__note', { opacity: 0, y: 20, duration: 1, ease: 'power3.out' }, 1.2)
    .from('.marquee', { xPercent: 10, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1 }, 0.6);
  if (hero) tl.add(hero.intro(), 0.15);
  return tl;
}

async function boot() {
  const loader = $('#loader');
  const countEl = $('#loaderCount');
  const fill = $('.loader__fill');
  const prog = { v: 0 };
  const show = () => { countEl.textContent = Math.round(prog.v); gsap.set(fill, { scaleY: prog.v / 100 }); };
  const minTime = reduced ? 0 : 900;
  const t0 = performance.now();

  if (!reduced) gsap.to(prog, { v: 70, duration: 1.4, ease: 'power2.out', onUpdate: show });
  const fontsReady = (document.fonts?.ready || Promise.resolve()).catch(() => {});
  const timeout = new Promise((r) => setTimeout(r, 4500));
  await Promise.race([Promise.all([fontsReady, initHero()]), timeout]);
  const wait = Math.max(0, minTime - (performance.now() - t0));
  await new Promise((r) => setTimeout(r, wait));

  setupScroll();
  // created after the pin so their positions include the pin spacing
  initNav();
  initCounters();
  initBuildLazy();

  const done = () => {
    document.body.classList.remove('is-loading');
    loader?.remove();
    window.__scoopeReady = true;
    lenis?.start();
    ScrollTrigger.refresh();
  };

  if (reduced || !loader) { done(); return; }
  gsap.timeline()
    .to(prog, { v: 100, duration: 0.45, ease: 'power2.out', onUpdate: show })
    .to('.loader__inner', { y: -30, opacity: 0, duration: 0.5, ease: 'power2.in' })
    .to(loader, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.9, ease: 'expo.inOut' }, '-=0.15')
    .add(() => { heroIntro(); }, '-=0.6')
    .add(done);
}

window.scrollTo(0, 0);
boot();

// fonts can shift layouts: re-measure triggers once everything has loaded
window.addEventListener('load', () => ScrollTrigger.refresh());
