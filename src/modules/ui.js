import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------------- smooth anchor navigation ---------------- */
export function initAnchors(lenis, { closeMenu } = {}) {
  const onClick = (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    closeMenu?.();
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.5, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else target.scrollIntoView({ behavior: 'smooth' });
    history.replaceState(null, '', id);
  };
  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}

/* ---------------- nav: shrink, hide on scroll down, active link ---------------- */
export function initNav() {
  const nav = $('#nav');
  const links = $$('.nav__links a');
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate(self) {
      const y = self.scroll();
      nav.classList.toggle('is-scrolled', y > 30);
      const hide = self.direction === 1 && y > window.innerHeight * 0.7 && !document.documentElement.classList.contains('menu-open');
      nav.classList.toggle('is-hidden', hide);
    },
  });
  const setActive = (id) => links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === '#' + id));
  ['inicio', 'sabores', 'historia', 'ingredientes', 'encuentranos'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    ScrollTrigger.create({ trigger: el, start: 'top 45%', end: 'bottom 45%', onToggle: (s) => s.isActive && setActive(id) });
  });
  // the pinned cup section belongs to "Sabores" visually
  ScrollTrigger.create({ trigger: '#copa', start: 'top 45%', end: 'bottom 45%', onToggle: (s) => s.isActive && setActive('sabores') });
}

/* ---------------- mobile menu ---------------- */
export function initMobileMenu(lenis) {
  const html = document.documentElement;
  const burger = $('.burger');
  const menu = $('#mobileMenu');
  const set = (open) => {
    html.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.setAttribute('aria-hidden', String(!open));
    if (open) { lenis?.stop(); $('#nav').classList.remove('is-hidden'); } else lenis?.start();
  };
  burger.addEventListener('click', () => set(!html.classList.contains('menu-open')));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && html.classList.contains('menu-open')) set(false); });
  const mq = window.matchMedia('(min-width: 1101px)');
  mq.addEventListener('change', () => mq.matches && set(false));
  return () => html.classList.contains('menu-open') && set(false);
}

/* ---------------- custom cursor + magnetic buttons ---------------- */
export function initCursor() {
  if (!finePointer()) return;
  document.documentElement.classList.add('has-cursor');
  const c = $('.cursor');
  const xTo = gsap.quickTo(c, 'x', { duration: 0.25, ease: 'power3' });
  const yTo = gsap.quickTo(c, 'y', { duration: 0.25, ease: 'power3' });
  window.addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY); }, { passive: true });
  document.addEventListener('pointerover', (e) => c.classList.toggle('is-hover', !!e.target.closest('a, button, input, .fcard__inner')));
  window.addEventListener('pointerdown', () => c.classList.add('is-down'));
  window.addEventListener('pointerup', () => c.classList.remove('is-down'));
  document.addEventListener('mouseleave', () => gsap.to(c, { opacity: 0, duration: 0.2 }));
  document.addEventListener('mouseenter', () => gsap.to(c, { opacity: 1, duration: 0.2 }));

  $$('.magnetic').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * 0.25);
      y((e.clientY - r.top - r.height / 2) * 0.35);
    });
    el.addEventListener('pointerleave', () => { x(0); y(0); });
  });
}

/* ---------------- 3D tilt cards ---------------- */
export function initTilt() {
  if (!finePointer()) return;
  $$('.tilt').forEach((card) => {
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3' });
    gsap.set(card, { transformPerspective: 900 });
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      ry((px - 0.5) * 16); rx((0.5 - py) * 14);
      card.style.setProperty('--gx', px * 100 + '%');
      card.style.setProperty('--gy', py * 100 + '%');
    });
    card.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });
}

/* ---------------- carousel: native scroll-snap + drag + buttons ---------------- */
export function initCarousel() {
  const root = $('[data-carousel]');
  if (!root) return;
  const track = $('.carousel__track', root);
  const prev = $('[data-carousel-prev]');
  const next = $('[data-carousel-next]');
  const bar = $('.carousel__progress span');
  const step = () => {
    const card = track.children[0];
    return card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0);
  };
  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    const p = max > 0 ? track.scrollLeft / max : 1;
    bar.style.transform = `scaleX(${0.15 + p * 0.85})`;
    prev.disabled = track.scrollLeft < 4;
    next.disabled = track.scrollLeft > max - 4;
  };
  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();

  // mouse drag (touch uses native scrolling)
  let down = false, moved = false, sx = 0, sl = 0;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    down = true; moved = false; sx = e.clientX; sl = track.scrollLeft;
  });
  window.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - sx;
    if (!moved && Math.abs(dx) > 6) { moved = true; track.classList.add('is-dragging'); }
    if (moved) track.scrollLeft = sl - dx;
  });
  const end = () => {
    if (!down) return;
    down = false;
    if (!moved) return;
    track.classList.remove('is-dragging');
    const s = step();
    track.scrollTo({ left: Math.round(track.scrollLeft / s) * s, behavior: 'smooth' });
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
  track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev.click(); }
  });
  track.tabIndex = 0;
  track.setAttribute('aria-label', 'Carrusel de sabores, usa las flechas para navegar');
}

/* ---------------- velocity-reactive marquees ---------------- */
export function initMarquees(reduced) {
  $$('[data-marquee]').forEach((m) => {
    const dir = Number(m.dataset.marquee) || 1;
    const track = $('.marquee__track', m);
    const unit = track.innerHTML;
    const unitW = track.scrollWidth || 600;
    const reps = Math.max(1, Math.ceil((window.innerWidth * 1.3) / unitW));
    track.innerHTML = unit.repeat(reps);
    track.innerHTML += track.innerHTML; // two identical halves -> seamless -50%
    if (reduced) return;
    const tween = gsap.fromTo(track, { xPercent: dir > 0 ? 0 : -50 }, { xPercent: dir > 0 ? -50 : 0, duration: 26 * reps, ease: 'none', repeat: -1 });
    // Velocity boost without allocating tweens on every scroll event:
    // scroll only writes a target; one ticker callback eases timeScale toward it.
    let target = 1, current = 1, dirSign = 1;
    const st = ScrollTrigger.create({
      trigger: m, start: 'top bottom', end: 'bottom top',
      onToggle: (s) => {
        if (s.isActive) { tween.play(); gsap.ticker.add(tick); } else { tween.pause(); gsap.ticker.remove(tick); }
      },
      onUpdate(self) {
        if (self.direction) dirSign = self.direction;
        target = dirSign * Math.max(1, Math.min(6, Math.abs(self.getVelocity()) / 250));
      },
    });
    function tick() {
      target += (dirSign - target) * 0.04;          // boost decays back to cruise speed
      current += (target - current) * 0.12;
      tween.timeScale(current);
    }
    if (st.isActive) gsap.ticker.add(tick);
  });
}

/* ---------------- counters ---------------- */
export function initCounters() {
  $$('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const o = { v: 0 };
    const render = () => { el.textContent = Math.round(o.v).toLocaleString('es-ES') + suffix; };
    render();
    ScrollTrigger.create({
      trigger: el, start: 'top 88%',
      onEnter: () => gsap.to(o, { v: end, duration: 2, ease: 'power3.out', overwrite: true, onUpdate: render }),
      onLeaveBack: () => gsap.to(o, { v: 0, duration: 0.4, overwrite: true, onUpdate: render }),
    });
  });
}

/* ---------------- live opening hours (Europe/Madrid) ---------------- */
export function initOpenStatus() {
  const el = $('#openStatus');
  if (!el) return;
  const hours = { 0: [11, 22], 1: [12, 22], 2: [12, 22], 3: [12, 22], 4: [12, 22], 5: [12, 24], 6: [12, 24] };
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const refresh = () => {
    let day, h, m;
    try {
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      const get = (t) => parts.find((p) => p.type === t)?.value;
      day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
      h = Number(get('hour')); m = Number(get('minute'));
    } catch { const d = new Date(); day = d.getDay(); h = d.getHours(); m = d.getMinutes(); }
    const now = h + m / 60;
    const [o, c] = hours[day];
    const fmt = (x) => (x === 24 ? '00:00' : String(x).padStart(2, '0') + ':00');
    const txt = $('.txt', el);
    el.classList.remove('is-open', 'is-closed');
    if (now >= o && now < c) { el.classList.add('is-open'); txt.textContent = `Abierto ahora · cierra a las ${fmt(c)}`; }
    else if (now < o) { el.classList.add('is-closed'); txt.textContent = `Cerrado · abrimos hoy a las ${fmt(o)}`; }
    else { const n = (day + 1) % 7; el.classList.add('is-closed'); txt.textContent = `Cerrado · abrimos el ${days[n]} a las ${fmt(hours[n][0])}`; }
    $$('.hours tr').forEach((tr) => tr.classList.toggle('is-today', tr.dataset.days.split(',').map(Number).includes(day)));
  };
  refresh();
  setInterval(refresh, 60000);
}

/* ---------------- newsletter (demo, no backend) ---------------- */
export function initNewsletter() {
  const form = $('#joinForm');
  const input = $('#joinEmail');
  const msg = $('#joinMsg');
  if (!form) return;
  const valid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value.trim();
    form.classList.remove('is-error');
    msg.classList.remove('is-error');
    if (!valid(v)) {
      void form.offsetWidth; // restart shake animation
      form.classList.add('is-error');
      msg.classList.add('is-error');
      msg.textContent = 'Introduce un correo válido, por favor.';
      input.focus();
      return;
    }
    msg.textContent = '¡Bienvenid@ al Sweet Circle! Revisa tu bandeja de entrada 🍓';
    form.reset();
    burst(form.querySelector('button'));
  });
  input.addEventListener('input', () => { form.classList.remove('is-error'); msg.classList.remove('is-error'); if (msg.textContent.startsWith('Introduce')) msg.textContent = ''; });
}

function burst(el) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r = el.getBoundingClientRect();
  const colors = ['#e8a3ab', '#f2b33d', '#8f2436', '#c9c993', '#5b3324'];
  for (let i = 0; i < 22; i++) {
    const s = document.createElement('i');
    Object.assign(s.style, { position: 'fixed', left: r.left + r.width / 2 + 'px', top: r.top + r.height / 2 + 'px', width: '8px', height: '14px', borderRadius: '4px', background: colors[i % colors.length], zIndex: 9995, pointerEvents: 'none' });
    document.body.appendChild(s);
    const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 90;
    gsap.to(s, { x: Math.cos(a) * d, y: Math.sin(a) * d - 40, rotation: Math.random() * 540, opacity: 0, duration: 1 + Math.random() * 0.5, ease: 'power3.out', onComplete: () => s.remove() });
  }
}

/* ---------------- menu dialog (search + filters) ---------------- */
const MENU = [
  { n: 'Fresa Bliss', d: 'Fresas de Huelva y sirope de frutos rojos', p: 3.9, t: ['fruta'], c: '#e9a3ad' },
  { n: 'Sueño de Pistacho', d: 'Pistacho tostado de Bronte', p: 4.2, t: ['crema'], c: '#c9c993' },
  { n: 'Obsesión de Chocolate', d: 'Cacao 70 % de Ecuador', p: 4.2, t: ['crema'], c: '#5b3324' },
  { n: 'Vainilla Bourbon', d: 'Vaina de Madagascar infusionada 24 h', p: 3.9, t: ['crema'], c: '#efe0c3' },
  { n: 'Turrón de Jijona', d: 'Almendra tostada y miel de azahar', p: 4.5, t: ['crema'], c: '#dcbb8b' },
  { n: 'Mango & Maracuyá', d: 'Sorbete tropical 100 % fruta', p: 3.9, t: ['fruta', 'vegano'], c: '#f2b44f' },
  { n: 'Limón & Albahaca', d: 'Limón de Murcia con albahaca fresca', p: 3.6, t: ['fruta', 'vegano'], c: '#e9e39a' },
  { n: 'Dulce de Leche', d: 'Caramelizado lento, con un toque de sal', p: 4.2, t: ['crema'], c: '#c98a4b' },
  { n: 'Stracciatella', d: 'Fior di latte con virutas de chocolate', p: 3.9, t: ['crema'], c: '#f4ede1' },
  { n: 'Frambuesa Negra', d: 'Sorbete intenso de frambuesa y mora', p: 3.9, t: ['fruta', 'vegano'], c: '#8f2436' },
  { n: 'Café de Especialidad', d: 'Espresso de Colombia, sin amargor', p: 4.2, t: ['crema'], c: '#7a4a33' },
  { n: 'Coco & Lima', d: 'Leche de coco cremosa, vegano', p: 3.9, t: ['vegano'], c: '#f3f1ea' },
];
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function initMenuDialog(lenis) {
  const dlg = $('#menuDialog');
  const list = $('#menuList');
  const input = $('#menuSearch');
  const empty = $('#menuEmpty');
  const chips = $$('.chip', dlg);
  let filter = 'all';
  const eur = (v) => v.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
  list.innerHTML = MENU.map((f) => `
    <li class="menu-item" data-name="${norm(f.n + ' ' + f.d)}" data-tags="${f.t.join(' ')}" data-title="${f.n}">
      <span class="menu-item__dot" style="--c:${f.c}"></span>
      <div><h3>${f.n}<span class="menu-item__tags">${f.t.map((t) => `<span>${t === 'fruta' ? 'Frutal' : t === 'crema' ? 'Cremoso' : 'Vegano'}</span>`).join('')}</span></h3><p>${f.d}</p></div>
      <span class="menu-item__price">${eur(f.p)}</span>
    </li>`).join('');
  const items = $$('.menu-item', list);
  const apply = () => {
    const q = norm(input.value.trim());
    let shown = 0;
    items.forEach((li) => {
      const ok = (!q || li.dataset.name.includes(q)) && (filter === 'all' || li.dataset.tags.includes(filter));
      li.hidden = !ok;
      if (ok) shown++;
    });
    empty.hidden = shown > 0;
  };
  input.addEventListener('input', apply);
  chips.forEach((c) => c.addEventListener('click', () => {
    filter = c.dataset.filter;
    chips.forEach((x) => { const on = x === c; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', String(on)); });
    apply();
  }));

  const open = (flavor) => {
    if (typeof dlg.showModal !== 'function') return;
    input.value = ''; filter = 'all';
    chips.forEach((x) => { const on = x.dataset.filter === 'all'; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', String(on)); });
    apply();
    items.forEach((li) => li.classList.toggle('is-hl', li.dataset.title === flavor));
    lenis?.stop();
    dlg.showModal();
    list.scrollTop = 0;
    if (flavor) {
      const hl = items.find((li) => li.dataset.title === flavor);
      if (hl) requestAnimationFrame(() => { list.scrollTop = hl.offsetTop - list.offsetTop - 10; });
    } else if (finePointer()) input.focus();
  };
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open-menu]');
    if (t) { e.preventDefault(); open(t.dataset.flavor); }
  });
  $('[data-close-menu]', dlg).addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }); // backdrop
  dlg.addEventListener('close', () => lenis?.start());
}

/* ---------------- torn paper polygon for the hero blob ---------------- */
export function tornShape(el, seed = 3) {
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const pts = [];
  const edge = (x0, y0, x1, y1, n, amp, nx, ny) => {
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const j = (r() - 0.5) * amp;
      pts.push(`${(x0 + (x1 - x0) * t + nx * j).toFixed(2)}% ${(y0 + (y1 - y0) * t + ny * j).toFixed(2)}%`);
    }
  };
  edge(6, 0, 100, 0, 1, 0, 0, 0);
  edge(100, 0, 100, 94, 1, 0, 0, 0);
  edge(100, 94, 0, 100, 46, 2.2, 0, 1);
  edge(0, 100, 6, 0, 46, 2.2, 1, 0);
  el.style.setProperty('--torn-shape', `polygon(${pts.join(',')})`);
}
