/* Nestor web — header and mega menu, modelled on the reference navigation (measured 2026-11-26):
   12-column bar · links dim when one is hovered or open · panel spans 10 columns, slides 0.5 rem and fades
   (0.3 s opacity, 0.4 s cubic-bezier(.22,1,.36,1)) · page below blurs (10 px) and darkens (33 %) ·
   cards: tile header with icon, name and a two-line description, then a 156 px image that zooms 5 % on hover ·
   below 1025 px a full-height panel with accordion rows and two buttons. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const hdr = $('.nh'); if (!hdr) return;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop = () => innerWidth >= 1025;
  const fine = matchMedia('(hover: hover) and (pointer: fine)');

  /* header height drives the overlay and the mobile panel */
  const setH = () => document.documentElement.style.setProperty('--nh-h', hdr.getBoundingClientRect().height + 'px');
  new ResizeObserver(setH).observe(hdr); setH();
  /* like the reference, the bar does not follow the page: it slides away while scrolling down and comes back
     as soon as the reader scrolls up; it never hides while a menu or the mobile panel is open */
  let lastY = scrollY;
  const onScroll = () => {
    const y = Math.max(0, scrollY), dy = y - lastY, hh = hdr.offsetHeight;
    hdr.classList.toggle('scrolled', y > 4);
    if (current || mobileOpen || y <= hh) hdr.classList.remove('nh-hidden');
    else if (dy > 6) hdr.classList.add('nh-hidden');
    else if (dy < -6) hdr.classList.remove('nh-hidden');
    if (Math.abs(dy) > 6 || y <= hh) lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true });
  hdr.addEventListener('focusin', () => hdr.classList.remove('nh-hidden'));

  /* ---------- desktop mega menu ---------- */
  const overlay = $('.nh-overlay');
  const items = $$('.nh-links > li[data-menu]').map(li => ({ li, btn: $('.nh-trigger', li), panel: $('.nh-panel', li) }));
  let current = null, closeT = 0, openT = 0;
  function open(it, viaHover) {
    clearTimeout(closeT);
    if (current === it) return;
    const switched = !!current;
    if (current) shut(current, true);
    current = it;
    hdr.classList.toggle('switched', switched);
    it.btn.setAttribute('aria-expanded', 'true');
    it.panel.inert = false; it.panel.classList.add('open');
    overlay.classList.add('open'); hdr.classList.add('menu-open');
    drawThumbs(it.panel);
  }
  function shut(it, keepOverlay) {
    it.btn.setAttribute('aria-expanded', 'false');
    it.panel.classList.remove('open'); it.panel.inert = true;
    if (!keepOverlay) { overlay.classList.remove('open'); hdr.classList.remove('menu-open', 'switched'); current = null; }
  }
  const closeAll = () => { if (current) shut(current); };
  items.forEach(it => {
    it.btn.addEventListener('click', () => { current === it ? shut(it) : open(it); });
    it.li.addEventListener('pointerenter', e => {
      if (e.pointerType !== 'mouse' || !desktop()) return;
      clearTimeout(closeT); clearTimeout(openT);
      openT = setTimeout(() => open(it, true), current ? 0 : 90);
    });
    it.li.addEventListener('pointerleave', e => {
      if (e.pointerType !== 'mouse' || !desktop()) return;
      clearTimeout(openT);
      closeT = setTimeout(() => { if (current === it) shut(it); }, 180);
    });
    $$('a', it.panel).forEach(a => a.addEventListener('click', () => shut(it)));
  });
  // moving onto another top-level link while a menu is open closes it
  $$('.nh-links > li:not([data-menu])').forEach(li => li.addEventListener('pointerenter', e => {
    if (e.pointerType === 'mouse' && current) { clearTimeout(openT); closeT = setTimeout(closeAll, 120); }
  }));
  overlay.addEventListener('click', closeAll);
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (current) { const b = current.btn; closeAll(); b.focus(); }
    if (mobileOpen) toggleMobile(false);
  });
  document.addEventListener('click', e => { if (current && !hdr.contains(e.target)) closeAll(); });
  addEventListener('resize', () => { if (!desktop()) closeAll(); });

  /* ---------- card images: the area's cube, drawn once ---------- */
  const S2 = Math.SQRT2, S6 = Math.sqrt(6);
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const rgb = c => `rgb(${c.map(v => Math.round(Math.max(0, Math.min(255, v)))).join(',')})`;
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  /* each area gets its own background scene behind the cube, like the reference menu:
     0 floating blocks · 1 message streams · 2 halftone token planes · 3 metric skyline · 4 source tiles */
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const rgba = (c, a) => `rgba(${c.map(v => Math.round(Math.max(0, Math.min(255, v)))).join(',')},${a})`;
  function drawCube(ctx, W, H, look, term, idx) {
    const C = hex(look.color), BG = hex(look.bg), K = [14, 14, 16], WHITE = [255, 255, 255];
    const k = H * .6, cx = W * .5, cy = H * .68;
    const P = (x, y, z) => [cx + k * (x + z) / S2, cy + k * (-x - 2 * y + z) / S6];
    const path = pts => { ctx.beginPath(); pts.forEach((p, i) => { const q = P(...p); i ? ctx.lineTo(...q) : ctx.moveTo(...q); }); ctx.closePath(); };
    const poly = (pts, col) => { path(pts); ctx.fillStyle = col; ctx.fill(); };
    // visible faces of an axis-aligned box: top (+y), left (−x), right (+z)
    const box = (x, y, z, sx, sy, sz, top, left, right, stroke) => {
      const f = [
        [[x, y + sy, z], [x + sx, y + sy, z], [x + sx, y + sy, z + sz], [x, y + sy, z + sz]],
        [[x, y, z], [x, y, z + sz], [x, y + sy, z + sz], [x, y + sy, z]],
        [[x, y, z + sz], [x + sx, y, z + sz], [x + sx, y + sy, z + sz], [x, y + sy, z + sz]]];
      [top, left, right].forEach((c, i) => { if (c) poly(f[i], c); if (stroke) { path(f[i]); ctx.strokeStyle = stroke; ctx.lineWidth = .8; ctx.stroke(); } });
    };
    const R = rng(17 + idx * 101);
    ctx.fillStyle = rgb(BG); ctx.fillRect(0, 0, W, H);
    const BG_SCENES = [
      () => { // floating blocks: solid ones in the area colour, white glass ones outlined
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; ctx.beginPath();
        for (let v = -6; v <= 6; v += 1) { let p = P(v, -.5, -6), q = P(v, -.5, 6); ctx.moveTo(...p); ctx.lineTo(...q); p = P(-6, -.5, v); q = P(6, -.5, v); ctx.moveTo(...p); ctx.lineTo(...q); }
        ctx.stroke();
        // place blocks by screen position (u across, w down) so they land around the cube, not off-canvas
        const bl = [];
        for (let i = 0; i < 60 && bl.length < 24; i++) {
          const u = -1.7 + R() * 3.4, w = -3 + R() * 4.2, y = -.4 + R() * 1.8, s = .1 + R() * .26;
          if (Math.abs(u) < .95 && w > -2.3) continue;   // keep the cube's silhouette clear
          const d = w + 2 * y, x = (u - d) / 2, z = (u + d) / 2;
          bl.push({ x, y, z, s, solid: R() < .42 });
        }
        bl.sort((a, b) => (a.z - a.x + a.y) - (b.z - b.x + b.y)).forEach(b => b.solid
          ? box(b.x, b.y, b.z, b.s, b.s, b.s, rgb(mix(C, WHITE, .3)), rgb(mix(C, K, .3)), rgb(C))
          : box(b.x, b.y, b.z, b.s, b.s, b.s, 'rgba(255,255,255,.5)', 'rgba(255,255,255,.22)', 'rgba(255,255,255,.36)', 'rgba(255,255,255,.95)'));
      },
      () => { // message streams: lanes along x with packets and acks in flight
        for (let i = 0; i < 34; i++) {
          const y = -.4 + R() * 2.2, z = -3.6 + R() * 5.4, a = P(-5, y, z), b = P(5, y, z);
          ctx.strokeStyle = rgba(mix(C, WHITE, .2), .12 + R() * .2); ctx.lineWidth = R() < .2 ? 1.4 : .7;
          ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
          const n = 1 + Math.floor(R() * 4);
          for (let j = 0; j < n; j++) {
            const x0 = -4 + R() * 8, len = .12 + R() * .4, p = P(x0, y, z), q = P(x0 + len, y, z);
            ctx.strokeStyle = R() < .25 ? '#fff' : rgb(C); ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(...p); ctx.lineTo(...q); ctx.stroke();
            if (R() < .5) { ctx.fillStyle = rgb(C); ctx.beginPath(); ctx.arc(q[0], q[1], 1.6 + R() * 1.4, 0, 7); ctx.fill(); }
          }
        }
        for (let i = 0; i < 40; i++) { ctx.fillStyle = rgba(C, .25 + R() * .5); ctx.beginPath(); ctx.arc(R() * W, R() * H, .6 + R() * 1.2, 0, 7); ctx.fill(); }
      },
      () => { // halftone field and stacked translucent planes (context windows)
        const g = 6;
        for (let y = g / 2; y < H; y += g) for (let x = g / 2; x < W; x += g) {
          const t = Math.max(0, Math.min(1, (x / W + (1 - y / H)) * .7 - .2));
          ctx.fillStyle = rgba(mix(C, K, .35), .32); ctx.beginPath(); ctx.arc(x, y, .35 + t * 1.25, 0, 7); ctx.fill();
        }
        const planes = [[[-3.2, -.5, -2.6], [1, 0, 0], 3.6, 2.3], [[-3.0, -.5, -1.7], [1, 0, 0], 2.6, 1.7], [[1.25, -.5, -3.2], [0, 0, 1], 3.0, 2.0]];
        planes.forEach(([o, u, w, h]) => {
          const pts = [o, [o[0] + u[0] * w, o[1], o[2] + u[2] * w], [o[0] + u[0] * w, o[1] + h, o[2] + u[2] * w], [o[0], o[1] + h, o[2]]];
          poly(pts, 'rgba(255,255,255,.42)'); path(pts); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1; ctx.stroke();
          ctx.save(); path(pts); ctx.clip();
          for (let a = .15; a < w; a += .16) for (let b = .15; b < h; b += .16) {
            const q = P(o[0] + u[0] * a, o[1] + b, o[2] + u[2] * a);
            ctx.fillStyle = rgba(C, R() < .12 ? .95 : .35); ctx.beginPath(); ctx.arc(q[0], q[1], .9, 0, 7); ctx.fill();
          }
          ctx.restore();
        });
      },
      () => { // metric skyline: a field of bars whose heights follow two smooth peaks
        const cells = [];
        for (let x = -3.5; x <= 2.5; x += .5) for (let z = -3.5; z <= 2.5; z += .5) {
          if (x > -1.1 && x < .6 && z > -1.1 && z < .6) continue;
          const f = Math.exp(-((x + 1.8) ** 2 + (z + 1.6) ** 2) / 2.2) + .7 * Math.exp(-((x - 1.5) ** 2 + (z + .4) ** 2) / 1.4);
          cells.push({ x, z, h: .05 + f * 1.3 + R() * .08, f });
        }
        cells.sort((a, b) => (a.z - a.x) - (b.z - b.x)).forEach(c => {
          const t = Math.min(1, c.f);
          box(c.x, -.5, c.z, .42, c.h, .42, rgb(mix(C, WHITE, .75 - t * .5)), rgb(mix(C, WHITE, .55 - t * .35)), rgb(mix(C, WHITE, .65 - t * .4)));
        });
      },
      () => { // source tiles: an iso floor of pages, some raised, some flagged
        const tiles = [];
        for (let x = -5; x <= 3; x += .5) for (let z = -5; z <= 3; z += .5) tiles.push({ x, z, r: R(), m: R() });
        tiles.sort((a, b) => (a.z - a.x) - (b.z - b.x)).forEach(t => {
          const G = .05, s = .5 - G;
          if (t.r < .16) box(t.x + G / 2, -.5, t.z + G / 2, s, .14, s, rgb(mix(C, WHITE, .25)), rgb(mix(C, K, .12)), rgb(C));
          else {
            poly([[t.x + G / 2, -.5, t.z + G / 2], [t.x + G / 2 + s, -.5, t.z + G / 2], [t.x + G / 2 + s, -.5, t.z + G / 2 + s], [t.x + G / 2, -.5, t.z + G / 2 + s]], rgb(mix(BG, WHITE, .55)));
            for (let a = 1; a < 3; a++) for (let b = 1; b < 3; b++) { const q = P(t.x + a * .166, -.5, t.z + b * .166); ctx.fillStyle = rgba(C, .55); ctx.fillRect(q[0] - .6, q[1] - .6, 1.2, 1.2); }
            if (t.m < .14) { const m = .07, c = [t.x + .25, -.5, t.z + .25]; poly([[c[0] - m, -.5, c[2]], [c[0], -.5, c[2] - m], [c[0] + m, -.5, c[2]], [c[0], -.5, c[2] + m]], rgb(K)); }
          }
        });
      }
    ];
    (BG_SCENES[idx] || BG_SCENES[0])();
    const T = (o, U, V) => { const a = P(...o), b = P(o[0] + U[0], o[1] + U[1], o[2] + U[2]), c = P(o[0] + V[0], o[1] + V[1], o[2] + V[2]); ctx.setTransform((b[0] - a[0]) / 100 * dpr, (b[1] - a[1]) / 100 * dpr, (c[0] - a[0]) / 100 * dpr, (c[1] - a[1]) / 100 * dpr, a[0] * dpr, a[1] * dpr); };
    const reset = () => ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // top
    poly([[-.5, .5, -.5], [.5, .5, -.5], [.5, .5, .5], [-.5, .5, .5]], rgb(C));
    // code face (−x)
    poly([[-.5, -.5, -.5], [-.5, -.5, .5], [-.5, .5, .5], [-.5, .5, -.5]], rgb(K));
    ctx.save(); T([-.5, .5, -.5], [0, 0, 1], [0, -1, 0]);
    ctx.beginPath(); ctx.rect(0, 0, 100, 100); ctx.clip();
    ctx.font = '400 7px "IBM Plex Mono"'; ctx.textBaseline = 'top';
    ctx.fillStyle = rgb(mix(C, WHITE, .35)); ctx.fillText('$ cat ' + term[0], 8, 8);
    term[1].slice(0, 8).forEach((ln, i) => { ctx.fillStyle = rgb(mix(C, WHITE, i % 3 ? .7 : .2)); ctx.fillText(ln, 8, 20 + i * 10); });
    ctx.restore(); reset();
    // grid face (+z): 5×5 white cells, pattern cells are dark holes
    poly([[-.5, -.5, .5], [.5, -.5, .5], [.5, .5, .5], [-.5, .5, .5]], rgb(C));
    const GAP = .03, SQ = (1 - GAP * 6) / 5;
    const holes = look.pattern.replace(/\s+/g, '');
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
      const u0 = -.5 + GAP + c * (SQ + GAP), v0 = .5 - GAP - r * (SQ + GAP);
      const cell = [[u0, v0, .5], [u0 + SQ, v0, .5], [u0 + SQ, v0 - SQ, .5], [u0, v0 - SQ, .5]];
      if (holes[r * 5 + c] === '1') {
        poly(cell, rgb(mix(C, K, .45)));
        poly([cell[0], cell[1], cell[2]], rgb(mix(C, K, .85)));
        const d = SQ * .5;
        ctx.save(); path(cell); ctx.clip();
        poly(cell.map(p => [p[0], p[1], p[2] - d]), rgb(K)); ctx.restore();
      } else poly(cell, '#fff');
    }
  }
  let dpr = 1;
  function drawThumbs(scope) {
    const data = window.NA_CUBE_DATA;
    $$('.mc-thumb', scope).forEach(cv => {
      const r = cv.getBoundingClientRect(); if (!r.width) return;
      dpr = Math.min(2, devicePixelRatio || 1);
      if (cv._w === r.width) return; cv._w = r.width;
      cv.width = r.width * dpr; cv.height = r.height * dpr;
      const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (data) { const i = +cv.dataset.area; drawCube(ctx, r.width, r.height, data.LOOKS[i], data.TERM[i], i); }
    });
  }

  /* ---------- mobile panel ---------- */
  const burger = $('.nh-burger'), mobile = $('.nh-mobile');
  let mobileOpen = false;
  function toggleMobile(on) {
    mobileOpen = on;
    burger.setAttribute('aria-expanded', on); mobile.classList.toggle('open', on); mobile.inert = !on;
    document.documentElement.classList.toggle('nh-lock', on);
  }
  burger.addEventListener('click', () => toggleMobile(!mobileOpen));
  onScroll();
  $$('.mm-row[aria-controls]', mobile).forEach(b => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-expanded') !== 'true';
    b.setAttribute('aria-expanded', on); $('#' + b.getAttribute('aria-controls')).classList.toggle('expanded', on);
  }));
  $$('a', mobile).forEach(a => a.addEventListener('click', () => toggleMobile(false)));
  addEventListener('resize', () => { if (desktop() && mobileOpen) toggleMobile(false); });
})();
