/* Intercept web — hero scene.
   Behaviour modelled on the reference hero (measured 2026-11-26):
   - true isometric orthographic camera from (-x, +y, +z), panned (.25 right, .2 up), zoom 2.4 on a 6-unit frustum
   - floor = grid of 3:1 cells (0.35 × 169/56) with hairline grid; cell colours are hashed per slide:
     cells inside the "core" around the volumes take the active colour, 45 % of the rest take other palette colours,
     60 % are lightened, 5 % darkened, resting cells sit 30 % lighter than under the pointer trail
   - slide change: floor shimmers over 1.34 s (each cell fades out, then in, with its own hashed delay),
     the four volumes sink into the floor (power2.in, 40 ms stagger), the formation swaps, they rise again
     (power2.out, 0.5 s, 40 ms stagger) while the camera breathes out to 0.85 and back
   - volumes are one cell in footprint; the main one carries the title on top and the icon on its narrow face
   - 8 s autoplay, paused while a volume or the card is hovered; hovered volumes lift by 0.2 cell.
   Canvas 2D, no libraries. */
(function () {
  'use strict';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const S2 = Math.SQRT2, S6 = Math.sqrt(6);
  const CW = 0.35 * 169 / 56, CD = 0.35, BASE = 0.2 * CD;
  const HEIGHTS = [CW / (1920 / 2180), CW / (1920 / 730), CW / (1920 / 1240), CW / (1920 / 900)];
  const FORMS = [
    [[-1, 1], [0, 3], [-1, -4], [1, 0]],
    [[-1, 0], [-1, -5], [1, 1], [-1, 3]],
    [[-1, 2], [-1, -5], [1, 2], [0, -3]],
    [[-1, 1], [1, 3], [1, 0], [-1, -5]]
  ];
  const G = 0.5 + 0.04 * 3, FLOOR_DUR = G + 0.1 + G, AUTOPLAY = 8;
  /* the reference holds the empty, recoloured floor while its face videos load; a fixed beat stands in for that */
  const HOLD = 0.25;
  const CORE_FEATHER = 2, OUTER_DENSITY = 0.5, LIGHT_VARIANT = 0.5, DARK_VARIANT = 0.95,
    LIGHTEN = 0.4, DARKEN = 0.45, RESTING_LIGHTEN = 0.2, SHIMMER_DELAY = 0.65, SHIMMER_DUR = 0.35;

  /* ---------- colour, in linear light like a WebGL pipeline ---------- */
  const toLin = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const toSrgb = c => c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  const lin = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => toLin(parseInt(h.slice(i, i + 2), 16) / 255)); };
  const css = l => `rgb(${l.map(v => Math.round(Math.max(0, Math.min(1, toSrgb(v))) * 255)).join(',')})`;
  const mixL = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const WHITE = [1, 1, 1];

  /* product palette (order = product order on the page) */
  /* Pentadic palette in OKLCH, anchored on the Nestor blue (hue 271.5°): five hues 72° apart.
     The brand cyan (202°) already sits on the pentad (199°); the other three are magenta (343°),
     amber (55°) and lime (127°). Floor tints share one lightness/chroma (L .72, C .16) so no hue
     dominates; icon shades are L .40 / .86, tab backgrounds L .955. */
  const PRODUCTS = [
    { color: '#3208EC', floor: '#859DFE', tab: '#EBF0FF', dark: '#2C399C', light: '#C1CFFF', pattern: '00000 01110 00000 01110 00000' },
    { color: '#3CF2FF', floor: '#04BBC1', tab: '#D6F8F9', dark: '#005255', light: '#49EBF1', pattern: '00000 01110 01110 01000 00000' },
    { color: '#E92CB3', floor: '#E778BF', tab: '#FEE9F5', dark: '#7C0F5E', light: '#FFB8E2', pattern: '00000 00010 00110 01110 00000' },
    { color: '#FF9139', floor: '#EF852E', tab: '#FEECE1', dark: '#6E3602', light: '#FFC29A', pattern: '00000 01100 01100 00010 00000' },
    { color: '#A5E21F', floor: '#89B638', tab: '#EAF5DC', dark: '#395102', light: '#BAE181', pattern: '00000 00100 00100 00100 00000' }
  ];
  const PAL = PRODUCTS.map(p => lin(p.color));          // volume colours
  const FPAL = PRODUCTS.map(p => lin(p.floor || p.color)); // floor colours (ink is too heavy as a floor tint)
  const FLOOR = lin('#F5F2F9'), GRID = '#B7AECB', TRAIL_N = lin('#DCD5EA');
  const ICON_NAMES = ['server', 'chat', 'bars', 'search', 'phone'];

  /* face copy (illustrative) */
  const n0 = v => Math.round(v).toLocaleString('hu-HU').replace(/\u00a0/g, ' ');
  /* each slide is its own small ops panel, like the reference: the tall volume carries the headline metric and
     chart, the three others show the instruments that matter for that area (slots, lists, gates, timers...) */
  const ms = v => n0(v) + ' ms';
  const FACES = [
    { title: 'Backend', main: { head: ['QUEUE', 'LIVE'], label: 'MSG / S', vals: [1840, 2210, 1960, 2400], fmt: n0, chart: 'line' },
      w: [{ type: 'slots', head: ['WORKERS', '4/4 UP'], n: 4 },
          { type: 'queue', head: 'QUEUE DEPTH' },
          { type: 'log', lines: ['ack 7f3c consumer-2', 'ack 7f3d consumer-1', 'retry 1/3 timeout 5s', 'ack 7f3e consumer-4', 'dlq 7f2a schema', 'ack 7f3f consumer-3'] }] },
    { title: 'Nyelvi modellek', main: { head: ['ROUTER', 'LIVE'], label: 'P95 LATENCY', vals: [820, 640, 910, 700], fmt: ms, chart: 'line' },
      w: [{ type: 'tokens', head: ['STREAM', '412 TOK'] },
          { type: 'shares', head: 'ROUTING', rows: [['small', .71], ['large', .18], ['cache', .11]] },
          { type: 'num', head: 'COST / CALL', vals: [31, 29, 33, 30], fmt: v => '$0.00' + Math.round(v) }] },
    { title: 'Gépi tanulás', main: { head: ['EVAL', 'EPOCH 12/12'], label: 'F1 HOLDOUT', vals: [0.928, 0.934, 0.931, 0.936], fmt: v => v.toFixed(3).replace('.', ','), chart: 'loss' },
      w: [{ type: 'cells', head: 'FOLDS', n: 5 },
          { type: 'gate', head: 'RELEASE GATE', rows: [['CAND', .912], ['PROD', .897]] },
          { type: 'timer', head: 'ELAPSED', base: 42 * 60 + 10 }] },
    { title: 'Adatgyűjtés', main: { head: ['CRAWL', 'LIVE'], label: 'PAGES / MIN', vals: [312, 388, 341, 420], fmt: n0, chart: 'bars' },
      w: [{ type: 'blink', head: ['FETCHERS', '8/8 UP'], n: 8 },
          { type: 'jobs', head: 'SOURCES', rows: [['rss', 1.4], ['html', .9], ['video', .45]] },
          { type: 'store', head: 'INDEX', base: 3.21 }] },
    { title: 'Web és mobil', main: { head: ['RELEASE', 'LIVE'], label: 'CRASH-FREE', vals: [99.6, 99.7, 99.5, 99.8], fmt: v => v.toFixed(1).replace('.', ',') + '%', chart: 'line' },
      w: [{ type: 'checks', head: 'TARGETS', items: ['WEB', 'IOS', 'ANDROID'] },
          { type: 'vbars', head: 'P75 LCP · 7 NAP', vals: [1.4, 1.2, 1.3, 1.1, 1.0, 1.1, .9] },
          { type: 'pipe', head: 'DEPLOY', steps: ['BUILD', 'TEST', 'SHIP'] }] }
  ];

  /* ---------- hashing / floor styles ---------- */
  function cellHash(i, j, seed, salt) {
    const x = i + seed * 19.19 + salt * 7.73, y = j + seed * 3.17 - salt * 11.13;
    const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return v - Math.floor(v);
  }
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function coreOf(form) {
    const xs = form.map(c => c[0]), zs = form.map(c => c[1]), [l, r] = form[0];
    return [Math.min(Math.min(...xs) + 1, l), Math.min(Math.min(...zs) + 1, r), Math.max(Math.max(...xs) - 1, l), Math.max(Math.max(...zs) - 1, r)];
  }
  function influence(i, j, core) {
    const out = Math.max(core[0] - i, i - core[2], core[1] - j, j - core[3], 0);
    return 1 - smooth(0.5, CORE_FEATHER + 0.5, out);
  }
  function cellStyle(i, j, slide) {
    if (slide.index < 0) return [FLOOR, TRAIL_N];
    const inf = influence(i, j, slide.core);
    if (cellHash(i, j, slide.seed, 0) >= OUTER_DENSITY + (1 - OUTER_DENSITY) * inf) return [FLOOR, TRAIL_N];
    let idx = slide.index;
    if (cellHash(i, j, slide.seed, 1) >= inf) {
      const other = Math.floor(cellHash(i, j, slide.seed, 2) * (PAL.length - 1));
      idx = other + (other >= slide.index ? 1 : 0);
    }
    let c = FPAL[idx];
    const v = cellHash(i, j, slide.seed, 3);
    if (v < LIGHT_VARIANT) c = mixL(c, WHITE, LIGHTEN);
    else if (v >= DARK_VARIANT) c = c.map(x => x * DARKEN);
    return [mixL(c, WHITE, RESTING_LIGHTEN), c];
  }

  /* ---------- easing / tweens ---------- */
  const E = {
    in2: t => t * t,
    out2: t => 1 - (1 - t) * (1 - t),
    sine: t => -(Math.cos(Math.PI * t) - 1) / 2,
    lin: t => t
  };

  function Hero(cv, opts) {
    opts = opts || {};
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, k = 100, ox = 0, oy = 0, visible = true, mobile = false;
    const cam = { zoom: 1 };
    let tweens = [], events = [], now = 0, last = performance.now() / 1000;

    /* timeline-style tweens: several can be queued on one property (sink, then rise);
       when one starts it takes over from whatever was running on that property (GSAP "auto" overwrite) */
    function tween(o, key, to, dur, ease, delay) {
      const t0 = now + (delay || 0);
      tweens = tweens.filter(t => !(t.o === o && t.k === key && t.t0 >= t0));
      tweens.push({ o, k: key, from: null, to, d: Math.max(0.0001, dur), e: ease, t0 });
    }
    function at(delay, fn, tag) { events.push({ t: now + delay, fn, tag }); }
    function runTweens() {
      tweens = tweens.filter(t => {
        if (now < t.t0) return true;
        if (t.from === null) {
          t.from = t.o[t.k];
          tweens.forEach(u => { if (u !== t && u.o === t.o && u.k === t.k && u.from !== null) u.dead = true; });
        }
        if (t.dead) return false;
        const p = Math.min(1, (now - t.t0) / t.d);
        t.o[t.k] = t.from + (t.to - t.from) * t.e(p);
        return p < 1;
      }).filter(t => !t.dead);
      const due = events.filter(e => now >= e.t); events = events.filter(e => now < e.t);
      due.forEach(e => e.fn());
    }

    /* ---------- state ---------- */
    let active = 0, shown = 0, form = 0, transitioning = true, progress = 0, paused = false, seq = 0, bag = [];
    let seedCounter = 0, shownAt = .7;
    let prevSlide = { index: -1, seed: 0, core: coreOf(FORMS[0]) };
    let nextSlide = { index: 0, seed: 0, core: coreOf(FORMS[0]) };
    const floorT = { v: 0 };
    let floorRun = null, floorQueued = null;
    const vols = HEIGHTS.map((h, i) => ({ i, h, rootY: -h, lift: 0, hovered: false, cell: FORMS[0][i], seed: Math.random() * 100, series: Array.from({ length: 24 }, (_, j) => .45 + .25 * Math.sin(j * .7 + i) + Math.random() * .2) }));

    function floorTo(index, core) {
      if (floorRun) { floorRun.speed = 3; floorQueued = { index, core }; return; }
      seedCounter = (seedCounter + 1) % 10000;
      nextSlide = { index, seed: seedCounter, core };
      floorT.v = 0;
      floorRun = { speed: 1 };
    }
    function floorTick(dt) {
      if (!floorRun) return;
      floorT.v += dt * floorRun.speed / FLOOR_DUR;
      if (floorT.v >= 1) {
        prevSlide = nextSlide; floorT.v = 0; floorRun = null;
        if (floorQueued) { const q = floorQueued; floorQueued = null; floorTo(q.index, q.core); }
      }
    }
    const screenOrder = f => vols.map((v, i) => ({ v, x: (FORMS[f][i][0] + .5) * CW + (FORMS[f][i][1] + .5) * CD })).sort((a, b) => a.x - b.x).map(o => o.v);
    function rise(f, delay) {
      screenOrder(f).forEach((v, o) => tween(v, 'rootY', 0, 0.5, E.out2, delay + 0.04 * o));
    }
    function place(f) { vols.forEach((v, i) => { v.cell = FORMS[f][i]; }); }
    function emit(name, ...a) { opts[name] && opts[name](...a); }

    function select(i) {
      if (i === active && !transitioning) return;
      const my = ++seq;
      tweens = tweens.filter(t => t.o !== cam && !vols.includes(t.o));
      events = events.filter(e => e.tag !== 'tl');
      if (!bag.length) bag = FORMS.map((_, j) => j).filter(j => j !== form);
      const nf = bag.splice(Math.floor(Math.random() * bag.length), 1)[0];
      floorTo(i, coreOf(FORMS[nf]));
      active = i; transitioning = true; progress = 0;
      emit('onSelect', i); emit('onCard', false, i); emit('onProgress', 0);
      vols.forEach(v => { v.hovered = false; tween(v, 'lift', 0, 0.3, E.out2, 0); });
      let a = 0;
      screenOrder(form).filter(v => v.rootY > -v.h).forEach((v, o) => {
        const d = 0.5 * (1 + v.rootY / v.h);
        a = Math.max(a, 0.04 * o + d);
        tween(v, 'rootY', -v.h, d, E.in2, 0.04 * o);
      });
      const n = a + 0.1 + HOLD, s = n + G;
      at(a, () => { if (my !== seq) return; form = nf; place(form); shown = i; shownAt = now + n - a + .35; emit('onShown', i); }, 'tl');
      rise(nf, n);
      at(n, () => { if (my === seq) emit('onCard', true, i); }, 'tl');
      at(n + 0.5 + 0.04 * 3, () => { if (my === seq) { transitioning = false; progress = 0; } }, 'tl');
      tween(cam, 'zoom', 0.85, s / 2, E.sine, 0);
      events.push({ t: now + s / 2, tag: 'tl', fn: () => { if (my === seq) tween(cam, 'zoom', 1, s / 2, E.sine, 0); } });
    }

    /* ---------- geometry ---------- */
    function fit() {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      mobile = window.innerWidth < 768;
    }
    new ResizeObserver(fit).observe(cv); fit();
    new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; }), { rootMargin: '60px' }).observe(cv);

    function camera() {
      const zoom = mobile ? 1.2 : 2.4;
      k = (mobile ? Math.max(H * zoom / 6, W * .27) : H * zoom / 6) * cam.zoom;
      const pan = mobile ? [0.25, 0] : [0.25, 0.2];
      ox = W / 2 - pan[0] * k; oy = H / 2 + pan[1] * k;
    }
    const P = (x, y, z) => [ox + k * (x + z) / S2, oy + k * (-x - 2 * y + z) / S6];
    function floorAt(X, Y) { const u = (X - ox) / k * S2, v = (Y - oy) / k * S6; return [(u - v) / 2, (u + v) / 2]; }
    function path(pts) { ctx.beginPath(); pts.forEach((p, i) => { const q = P(p[0], p[1], p[2]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); }
    /* face transforms in centi-units (1 world unit = 100) */
    function faceFront(x0, yTop, z1) { const o = P(x0, yTop, z1), s = k / 100 * dpr; ctx.setTransform(s / S2, -s / S6, 0, 2 * s / S6, o[0] * dpr, o[1] * dpr); }
    function faceSide(x0, yTop, z0) { const o = P(x0, yTop, z0), s = k / 100 * dpr; ctx.setTransform(s / S2, s / S6, 0, 2 * s / S6, o[0] * dpr, o[1] * dpr); }
    function faceTop(x0, y, z0) { const o = P(x0, y, z0), s = k / 100 * dpr; ctx.setTransform(s / S2, -s / S6, s / S2, s / S6, o[0] * dpr, o[1] * dpr); }
    const resetT = () => ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* ---------- pointer: trail on the floor + volume hover ---------- */
    let mouse = null;
    const trail = new Map();
    cv.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); mouse = [e.clientX - r.left, e.clientY - r.top]; });
    cv.addEventListener('pointerleave', () => { mouse = null; });
    function pickVolume() {
      if (!mouse || transitioning) return null;
      let hit = null;
      vols.forEach(v => {
        const yb = Math.max(0, v.rootY + v.lift - BASE), yt = v.rootY + v.lift + v.h;
        if (yt <= 0) return;
        const x0 = v.cell[0] * CW, z0 = v.cell[1] * CD, x1 = x0 + CW, z1 = z0 + CD;
        const hull = [[x0, yb, z0], [x0, yb, z1], [x1, yb, z1], [x1, yt, z1], [x1, yt, z0], [x0, yt, z0]];
        resetT(); path(hull);
        if (ctx.isPointInPath(mouse[0] * dpr, mouse[1] * dpr)) hit = v;
      });
      return hit;
    }

    /* ---------- drawing ---------- */
    function drawFloor(dt) {
      const corners = [floorAt(0, 0), floorAt(W, 0), floorAt(0, H), floorAt(W, H)];
      const i0 = Math.floor(Math.min(...corners.map(c => c[0])) / CW) - 1, i1 = Math.ceil(Math.max(...corners.map(c => c[0])) / CW) + 1;
      const j0 = Math.floor(Math.min(...corners.map(c => c[1])) / CD) - 1, j1 = Math.ceil(Math.max(...corners.map(c => c[1])) / CD) + 1;
      // pointer trail
      const decay = Math.exp(-dt * 1.4);
      trail.forEach((v, key) => { const nv = v * decay; nv < 0.01 ? trail.delete(key) : trail.set(key, nv); });
      if (mouse) {
        const f = floorAt(mouse[0], mouse[1]), R = 0.62;
        for (let i = Math.floor((f[0] - R) / CW); i <= Math.floor((f[0] + R) / CW); i++)
          for (let j = Math.floor((f[1] - R) / CD); j <= Math.floor((f[1] + R) / CD); j++) {
            const dx = (i + .5) * CW - f[0], dz = (j + .5) * CD - f[1], d = Math.sqrt(dx * dx * .55 + dz * dz);
            if (d < R) { const key = i + ',' + j, s = (1 - d / R); trail.set(key, Math.max(trail.get(key) || 0, Math.min(1, s * 1.6))); }
          }
      }
      const T = floorT.v, tr = floorRun !== null;
      resetT();
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const a = P(i * CW, 0, j * CD), c = P((i + 1) * CW, 0, (j + 1) * CD);
        const b = P((i + 1) * CW, 0, j * CD), d = P(i * CW, 0, (j + 1) * CD);
        if (Math.max(a[0], b[0], c[0], d[0]) < 0 || Math.min(a[0], b[0], c[0], d[0]) > W || Math.max(a[1], b[1], c[1], d[1]) < 0 || Math.min(a[1], b[1], c[1], d[1]) > H) continue;
        let rest, trl;
        const nx = cellStyle(i, j, nextSlide);
        if (tr) {
          const pv = cellStyle(i, j, prevSlide);
          const delay = cellHash(i, j, nextSlide.seed, 4) * SHIMMER_DELAY;
          const cp = smooth(delay, delay + SHIMMER_DUR, T), fo = smooth(0, .5, cp), fi = smooth(.5, 1, cp);
          rest = mixL(mixL(pv[0], FLOOR, fo), nx[0], fi);
          trl = mixL(mixL(pv[1], FLOOR, fo), nx[1], fi);
        } else { rest = (prevSlide === nextSlide ? nx : cellStyle(i, j, prevSlide))[0]; trl = (prevSlide === nextSlide ? nx : cellStyle(i, j, prevSlide))[1]; }
        const tv = trail.get(i + ',' + j) || 0;
        const col = tv ? mixL(rest, trl, tv) : rest;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath();
        ctx.fillStyle = css(col); ctx.fill();
      }
      // hairline grid
      ctx.strokeStyle = GRID; ctx.lineWidth = 0.75; ctx.globalAlpha = .9; ctx.beginPath();
      for (let i = i0; i <= i1 + 1; i++) { const p = P(i * CW, 0, j0 * CD), q = P(i * CW, 0, (j1 + 1) * CD); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
      for (let j = j0; j <= j1 + 1; j++) { const p = P(i0 * CW, 0, j * CD), q = P((i1 + 1) * CW, 0, j * CD); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
      ctx.stroke(); ctx.globalAlpha = 1;
    }

    function pixIcon(name, x, y, size, col) {
      const bm = (window.NA_ICONS || {})[name]; if (!bm) return;
      const n = bm.length, c = size / n; ctx.fillStyle = col;
      for (let r = 0; r < n; r++) for (let q = 0; q < n; q++) if (bm[r][q] !== '.') ctx.fillRect(x + q * c, y + r * c, c + .05, c + .05);
    }

    function drawVolume(v, t) {
      const yb = Math.max(0, v.rootY + v.lift - BASE), yt = v.rootY + v.lift + v.h;
      if (yt <= 0.0005) return;
      const x0 = v.cell[0] * CW, z0 = v.cell[1] * CD, x1 = x0 + CW, z1 = z0 + CD;
      const c = PAL[shown], top = mixL(c, WHITE, .42), dark = c.map(q => q * .45);
      const faceBg = mixL(dark, top, .34), darkC = css(dark);
      const lum = faceBg[0] * .2126 + faceBg[1] * .7152 + faceBg[2] * .0722;
      const topC = lum > .3 ? css(dark.map(q => q * .7)) : css(top), ink = lum > .3 ? css(PAL[0]) : css(mixL(top, WHITE, .25));
      const topFace = css(top);
      const F = FACES[shown];
      // -x face
      resetT(); path([[x0, yb, z0], [x0, yb, z1], [x0, yt, z1], [x0, yt, z0]]); ctx.fillStyle = css(c); ctx.fill();
      if (v.i === 0) {
        ctx.save(); path([[x0, yb, z0], [x0, yb, z1], [x0, yt, z1], [x0, yt, z0]]); ctx.clip();
        faceSide(x0, yt, z0);
        // the same 5×5 tile as the slide's tab icon (1 = light cell, 0 = dark cell)
        const P0 = PRODUCTS[shown], cells = P0.pattern.replace(/\s+/g, '');
        // one dark square, then all light cells as a single path: drawing 25 separate cells on the skewed face
        // left antialiased seams of uneven width between neighbours
        ctx.fillStyle = P0.dark; ctx.fillRect(5, 5, 25, 25);
        ctx.beginPath();
        for (let k = 0; k < 25; k++) if (cells[k] === '1') ctx.rect(5 + (k % 5) * 5, 5 + Math.floor(k / 5) * 5, 5, 5);
        ctx.fillStyle = P0.light; ctx.fill();
        ctx.restore();
      }
      // +z face (the "screen")
      resetT(); path([[x0, yb, z1], [x1, yb, z1], [x1, yt, z1], [x0, yt, z1]]); ctx.fillStyle = css(faceBg); ctx.fill();
      ctx.save(); path([[x0, yb, z1], [x1, yb, z1], [x1, yt, z1], [x0, yt, z1]]); ctx.clip();
      faceFront(x0, yt, z1);
      const w = CW * 100, h = v.h * 100;
      ctx.textBaseline = 'top'; ctx.fillStyle = topC; ctx.strokeStyle = topC;
      const mono = s => `400 ${s}px "IBM Plex Mono"`, disp = s => `400 ${s}px "TASA Orbiter"`;
      const ts = RM ? 99 : Math.max(0, t - shownAt);           // seconds since this slide's volumes rose
      const dim = a => { ctx.globalAlpha = a; }, solid = () => { ctx.globalAlpha = 1; };
      const head = (l, r, y = 5.5) => {
        ctx.font = mono(4.6); ctx.fillText(l, 6, y);
        if (r) { const tw = ctx.measureText(r).width; ctx.fillText(r, w - 6 - tw, y); }
      };
      const cycle = (vals, period) => {
        const vi = Math.floor(t / period) % vals.length, vt = Math.min(1, (t % period) / .7), p = vals[(vi + vals.length - 1) % vals.length];
        return p + (vals[vi] - p) * E.out2(vt);
      };
      const tick = (x, y, s) => { ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(x, y + s * .5); ctx.lineTo(x + s * .38, y + s * .85); ctx.lineTo(x + s, y + s * .1); ctx.stroke(); };
      const hsh = q => { const x = Math.sin(q * 127.1 + v.i * 31.7) * 43758.5453; return x - Math.floor(x); };
      if (v.i === 0) {
        const M = F.main;
        head(M.head[0], M.head[1], 7); dim(.9); ctx.fillRect(7, 15, w - 14, .35); solid();
        ctx.font = mono(4.6); dim(.8); ctx.fillText(M.label, 7, h * .38); solid();
        ctx.font = disp(17); ctx.fillText(M.fmt(cycle(M.vals, 2.6)), 7, h * .38 + 7);
        const sx0 = 7, sx1 = w - 7, sy0 = h * .68, sy1 = h - 7;
        if (M.chart === 'loss') {
          // training loss falling towards the holdout floor, drawn as the epochs run; dashed line = the production model
          const reveal = Math.min(1, ts / 2.4), N = 40;
          dim(.55); ctx.setLineDash([1.6, 1.6]); ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(sx0, sy1 - (sy1 - sy0) * .2); ctx.lineTo(sx1, sy1 - (sy1 - sy0) * .2); ctx.stroke(); ctx.setLineDash([]); solid();
          ctx.lineWidth = .9; ctx.beginPath();
          for (let j = 0; j <= N * reveal; j++) { const x = j / N, y = .14 + .8 * Math.exp(-x * 2.3) + .03 * Math.sin(j * 2.1) * (1 - x); const X = sx0 + (sx1 - sx0) * x, Y = sy1 - (sy1 - sy0) * y; j ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
          ctx.stroke();
        } else if (M.chart === 'bars') {
          if (!RM && Math.floor(t * 1.5) !== v._tick) { v._tick = Math.floor(t * 1.5); v.series.shift(); v.series.push(.2 + Math.random() * .7); }
          const n = v.series.length, bw = (sx1 - sx0) / n;
          v.series.forEach((q, j) => { dim(j === n - 1 ? 1 : .55); ctx.fillRect(sx0 + j * bw, sy1 - (sy1 - sy0) * q, bw * .62, (sy1 - sy0) * q); });
          solid();
        } else {
          if (!RM && Math.floor(t * 1.5) !== v._tick) { v._tick = Math.floor(t * 1.5); v.series.shift(); v.series.push(.2 + Math.random() * .7); }
          ctx.lineWidth = .9; ctx.beginPath();
          v.series.forEach((q, j) => { const X = sx0 + (sx1 - sx0) * j / (v.series.length - 1), Y = sy1 - (sy1 - sy0) * q; j ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
          ctx.stroke();
        }
        dim(.45); ctx.fillRect(sx0, sy1 + 1.5, sx1 - sx0, .35); solid();
      } else {
        const W2 = F.w[v.i - 1];
        if (W2.type === 'slots') {                      // workers: each slot flashes while it handles a message
          head(W2.head[0], W2.head[1]);
          const n = W2.n, gap = 3, cw = (w - 12 - gap * (n - 1)) / n, ch = h - 19;
          for (let q = 0; q < n; q++) {
            const lit = Math.min(1, Math.max(0, (ts - q * .25) * 4)), busy = !RM && hsh(q + Math.floor(t * 2.2) * 7) > .55;
            dim(.28); ctx.fillRect(6 + q * (cw + gap), 13, cw, ch);
            dim(lit * (busy ? 1 : .7)); ctx.fillStyle = busy ? ink : topC; ctx.fillRect(6 + q * (cw + gap) + 1.6, 14.6, cw - 3.2, ch - 3.2);
            solid(); ctx.fillStyle = topC;
          }
        } else if (W2.type === 'queue') {               // messages slide towards the consumers on the left
          const depth = Math.round(10 + 3 * Math.sin(t * .7));
          head(W2.head, String(depth));
          const s = 7, gap = 2.6, y = h - 6 - s, x0 = 14, span = w - 6 - x0, speed = RM ? 0 : 9;
          dim(.9); ctx.fillRect(6, y - 1.5, 1.2, s + 3); solid();
          for (let q = 0; q < 14; q++) {
            let x = x0 + ((q * (s + gap) - t * speed) % (span + s + gap) + span + s + gap) % (span + s + gap) - s - gap;
            if (x < x0 - s || x > w - 6 - s) continue;
            const a = Math.min(1, (x - x0 + s) / (s * 1.5)) * (q < depth ? 1 : .25);
            dim(Math.max(0, a)); ctx.fillRect(Math.max(x, x0), y, s - Math.max(0, x0 - x), s);
          }
          solid();
          ctx.font = mono(4.2); dim(.7); ctx.fillText('consumer-group: workers', 6, 14.5); solid();
        } else if (W2.type === 'log') {                 // log tail scrolling up
          ctx.font = mono(4.6);
          const lh = 7.2, n = W2.lines.length, sp = RM ? 0 : (t * .5) % n;
          for (let q = 0; q < n + 9; q++) {
            const y = 6 + (q - sp) * lh; if (y < -lh || y > h) continue;
            dim(q % n === n - 1 ? 1 : .72); ctx.fillText('› ' + W2.lines[q % n], 6, y);
          }
          solid();
        } else if (W2.type === 'tokens') {             // a streamed answer: tokens arrive left to right, two lines, then restart
          head(W2.head[0], W2.head[1]);
          const total = 26, per = .09, k0 = RM ? total : Math.floor((ts % (total * per + 1.2)) / per);
          let x = 6, y = 15;
          for (let q = 0; q < Math.min(total, k0); q++) {
            const tw = 3 + hsh(q) * 7; if (x + tw > w - 6) { x = 6; y += 7; }
            if (y > h - 9) break;
            dim(q === k0 - 1 ? 1 : .6); ctx.fillRect(x, y, tw, 4.2); x += tw + 1.6;
          }
          solid();
        } else if (W2.type === 'shares' || W2.type === 'jobs') {   // labelled bars: routing shares, or crawl jobs looping
          head(W2.head, W2.type === 'jobs' ? 'RUNNING' : null);
          W2.rows.forEach(([lab, val], q) => {
            const y = 15 + q * 16, grow = Math.min(1, Math.max(0, (ts - q * .2) / .9));
            const f = W2.type === 'shares' ? val * E.out2(grow) : (RM ? .6 : ((t * val * .35 + q * .37) % 1));
            ctx.font = mono(4.4); dim(.85); ctx.fillText(lab, 6, y);
            const r = W2.type === 'shares' ? Math.round(val * 100 * E.out2(grow)) + '%' : n0(1200 + Math.floor((t * val * 40 + q * 300) % 900));
            const tw = ctx.measureText(r).width; ctx.fillText(r, w - 6 - tw, y);
            dim(.25); ctx.fillRect(6, y + 6.5, w - 12, 3); dim(1); ctx.fillRect(6, y + 6.5, (w - 12) * f, 3);
          });
          solid();
        } else if (W2.type === 'num') {               // single figure with a small trend
          head(W2.head);
          ctx.font = disp(13); ctx.fillText(W2.fmt(cycle(W2.vals, 3.1)), 6, 16);
          const n = 9, bx0 = w * .58, bw = (w * .36) / n;
          for (let q = 0; q < n; q++) { const p = .3 + .55 * hsh(q + Math.floor(t / 3.1)); dim(q === n - 1 ? 1 : .5); ctx.fillRect(bx0 + q * bw, h - 6 - p * (h - 22), bw * .6, p * (h - 22)); }
          solid();
        } else if (W2.type === 'cells') {              // cross-validation folds complete one after another
          const n = W2.n, done = RM ? n : Math.min(n, Math.floor(ts / .55));
          head(W2.head, done + '/' + n);
          const gap = 3, cw = (w - 12 - gap * (n - 1)) / n, ch = h - 19;
          for (let q = 0; q < n; q++) {
            const x = 6 + q * (cw + gap);
            dim(.28); ctx.fillRect(x, 13, cw, ch); solid();
            if (q < done) { ctx.fillRect(x + 1.4, 14.4, cw - 2.8, ch - 2.8); ctx.strokeStyle = css(faceBg); tick(x + cw / 2 - 3, 13 + ch / 2 - 3, 6); ctx.strokeStyle = topC; }
          }
        } else if (W2.type === 'gate') {               // candidate vs production on the holdout set
          const grow = Math.min(1, ts / 1.1), pass = ts > 1.4;
          head(W2.head, pass ? 'PASS' : '…');
          W2.rows.forEach(([lab, val], q) => {
            const y = 16 + q * 17, f = (val - .85) / .1 * E.out2(grow);
            ctx.font = mono(4.4); dim(.85); ctx.fillText(lab, 6, y);
            const r = (val * E.out2(grow)).toFixed(3).replace('.', ','), tw = ctx.measureText(r).width; ctx.fillText(r, w - 6 - tw, y);
            dim(.25); ctx.fillRect(6, y + 6.5, w - 12, 3); dim(q ? .55 : 1); ctx.fillRect(6, y + 6.5, (w - 12) * f, 3);
          });
          solid();
        } else if (W2.type === 'timer') {              // training clock ticking, epoch segments below
          head(W2.head, 'RUN 42');
          const sec = Math.floor(W2.base + (RM ? 0 : ts)), hh = Math.floor(sec / 3600), mm = Math.floor(sec / 60) % 60, ss = sec % 60;
          ctx.font = disp(13); ctx.fillText(`${hh}h ${String(mm).padStart(2, '0')}m ${String(ss).padStart(2, '0')}s`, 6, 15);
          const n = 12, gap = 1.6, sw = (w - 12 - gap * (n - 1)) / n, on = RM ? n : Math.min(n, 4 + Math.floor(ts / .8) % (n - 3));
          for (let q = 0; q < n; q++) { dim(q < on ? 1 : .25); ctx.fillRect(6 + q * (sw + gap), h - 9, sw, 3.4); }
          solid();
        } else if (W2.type === 'blink') {              // fetchers: a cell lights up for each page fetched
          head(W2.head[0], W2.head[1]);
          const n = W2.n, gap = 2.4, cw = (w - 12 - gap * (n - 1)) / n, ch = h - 19;
          for (let q = 0; q < n; q++) {
            const ph = (t * (1.1 + hsh(q) * 1.4) + hsh(q + 9)) % 1, on = RM ? .7 : Math.max(.35, 1 - ph * 2.2);
            dim(.25); ctx.fillRect(6 + q * (cw + gap), 13, cw, ch);
            dim(on); ctx.fillRect(6 + q * (cw + gap) + 1.2, 14.2, cw - 2.4, ch - 2.4);
          }
          solid();
        } else if (W2.type === 'store') {              // index size growing, capacity as squares
          head(W2.head, 'DOCS');
          const val = W2.base + (RM ? 0 : ts * .0004);
          ctx.font = disp(13); ctx.fillText(val.toFixed(2).replace('.', ',') + ' M', 6, 15);
          const n = 10, gap = 1.8, sw = (w - 12 - gap * (n - 1)) / n, fill = 6.4 + (RM ? 0 : (Math.sin(t * .4) + 1) * .3);
          for (let q = 0; q < n; q++) { dim(q < Math.floor(fill) ? 1 : q < fill ? .6 : .25); ctx.fillRect(6 + q * (sw + gap), h - 6 - sw * .8, sw, sw * .8); }
          solid();
        } else if (W2.type === 'checks') {             // build targets turn green one by one
          const n = W2.items.length, done = RM ? n : Math.min(n, Math.floor(ts / .5));
          head(W2.head, done + '/' + n);
          const cw = (w - 12) / n;
          W2.items.forEach((it, q) => {
            const x = 6 + q * cw, y = h - 15;
            ctx.lineWidth = .6; dim(.6); ctx.strokeRect(x + .3, y + .3, 7, 7); solid();
            if (q < done) { ctx.fillRect(x, y, 7.6, 7.6); ctx.strokeStyle = css(faceBg); tick(x + 1.6, y + 1.6, 4.4); ctx.strokeStyle = topC; }
            ctx.font = mono(4.2); dim(q < done ? 1 : .6); ctx.fillText(it, x + 10, y + 1.6); solid();
          });
        } else if (W2.type === 'vbars') {              // one bar per day, today highlighted
          const vals = W2.vals, last = vals[vals.length - 1];
          head(W2.head, last.toFixed(1).replace('.', ',') + ' s');
          const n = vals.length, x0 = 6, bw = (w - 12) / n, base = h - 6, top = 19, grow = E.out2(Math.min(1, ts / .9));
          for (let q = 0; q < n; q++) { const p = vals[q] / 1.6 * grow; dim(q === n - 1 ? 1 : .5); ctx.fillRect(x0 + q * bw + bw * .2, base - (base - top) * p, bw * .6, (base - top) * p); }
          solid(); dim(.45); ctx.fillRect(6, base + .8, w - 12, .35); solid();
        } else if (W2.type === 'pipe') {               // build → test → ship, running in a loop
          const n = W2.steps.length, cyc = RM ? n : (ts % (n * .9 + 1.2)) / .9;
          head(W2.head, cyc >= n ? 'LIVE' : 'v1.42');
          const gap = 2.4, sw = (w - 12 - gap * (n - 1)) / n;
          W2.steps.forEach((st, q) => {
            const x = 6 + q * (sw + gap), f = Math.max(0, Math.min(1, cyc - q));
            dim(.25); ctx.fillRect(x, h - 10, sw, 4); dim(1); ctx.fillRect(x, h - 10, sw * f, 4);
            ctx.font = mono(4.2); dim(f >= 1 ? 1 : .6); ctx.fillText(st, x, h - 19); solid();
          });
        }
      }
      ctx.restore();
      // top face
      resetT(); path([[x0, yt, z0], [x1, yt, z0], [x1, yt, z1], [x0, yt, z1]]); ctx.fillStyle = topFace; ctx.fill();
      if (v.i === 0) {
        faceTop(x0, yt, z0);
        ctx.fillStyle = darkC; ctx.font = disp(12); ctx.textBaseline = 'middle';
        const maxW = w - 8 - 5, words = F.title.replace('­', ' ').split(/\s+/), lines = [];
        words.forEach(wd => { const tryL = lines.length ? lines[lines.length - 1] + ' ' + wd : wd; if (lines.length && ctx.measureText(tryL).width <= maxW) lines[lines.length - 1] = tryL; else lines.push(wd); });
        const lh = 12, cy = CD * 100 / 2 - (lines.length - 1) * lh / 2;
        lines.forEach((ln, q) => ctx.fillText(ln, 8, cy + q * lh));
      }
      resetT();
    }

    /* ---------- loop ---------- */
    let hoverVol = null;
    function frame(ts) {
      requestAnimationFrame(frame);
      const tnow = ts / 1000, dt = Math.min(0.05, tnow - last) * (window.__heroTimeScale || 1); last = tnow;
      if (window.__heroManual || !visible || document.hidden) return;
      step(dt);
    }
    /* debug: window.__heroManual = true; window.__heroAdvance(sec) steps the scene deterministically */
    window.__heroAdvance = sec => { for (let t = 0; t < sec - 1e-6; t += 1 / 60) step(1 / 60); };
    function step(dt) {
      now += dt;
      runTweens(); floorTick(dt);
      camera();
      // hover
      const hv = pickVolume();
      if (hv !== hoverVol) {
        if (hoverVol) tween(hoverVol, 'lift', 0, .3, E.out2, 0);
        if (hv) tween(hv, 'lift', BASE, .3, E.out2, 0);
        hoverVol = hv; cv.style.cursor = hv ? 'pointer' : '';
      }
      if (!transitioning && !paused && !hoverVol && !RM) {
        progress += dt / AUTOPLAY; emit('onProgress', Math.min(1, progress));
        if (progress >= 1) select((active + 1) % PAL.length);
      }
      resetT(); ctx.fillStyle = css(FLOOR); ctx.fillRect(0, 0, W, H);
      drawFloor(dt);
      // back to front: far = large x, small z
      vols.slice().sort((a, b) => (a.cell[1] - a.cell[0] * CW / CD) - (b.cell[1] - b.cell[0] * CW / CD)).forEach(v => drawVolume(v, now));
    }

    /* intro: floor fades in from blank, volumes rise */
    seedCounter = 0; floorRun = { speed: 1 }; floorT.v = 0;
    nextSlide = { index: 0, seed: 0, core: coreOf(FORMS[0]) };
    emit('onSelect', 0); emit('onShown', 0); emit('onCard', true, 0);
    if (RM) { prevSlide = nextSlide; floorRun = null; vols.forEach(v => { v.rootY = 0; }); transitioning = false; }
    else {
      rise(0, 0.35);
      events.push({ t: 0.35 + 0.5 + 0.12, fn: () => { transitioning = false; }, tag: 'intro' });
    }
    requestAnimationFrame(frame);

    return {
      select(i) { select(i); },
      pause(p) { paused = p; },
      colors: PRODUCTS
    };
  }

  window.ICHero = Hero;
})();
