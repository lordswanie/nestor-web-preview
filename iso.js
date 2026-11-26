/* Intercept web — isometric canvas scenes (hero floor + boxes, product cubes, closing ribbon).
   Plain canvas 2D, no libraries. Each scene pauses while off-screen and draws a still frame
   under prefers-reduced-motion. */
(function () {
  'use strict';
  const C30 = Math.cos(Math.PI / 6), S30 = 0.5;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeBack = t => { const c = 1.45; t -= 1; return 1 + (c + 1) * t * t * t + c * t * t; };
  const hex = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
  const rgb = (c, a) => a == null ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  /* ---------------- palettes: one per product ---------------- */
  /* 7 palettes, one per development area, built from the Nestor colours */
  const mk = (ui, base, text, acc) => {
    const B = hex(base), W = [255, 255, 255], K = [40, 20, 110], h = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
    return { ui, tints: [h(mix(B, W, .88)), h(mix(B, W, .76)), h(mix(B, W, .66)), h(mix(B, W, .82))], top: h(mix(B, W, .45)), right: h(mix(B, W, .18)), left: h(mix(B, K, .12)), text, dim: 'rgba(255,255,255,.72)', acc };
  };
  const PAL = [
    mk('#3208EC', '#3208EC', '#FFFFFF', '#3CF2FF'),
    mk('#7052F2', '#7052F2', '#FFFFFF', '#3CF2FF'),
    mk('#00A9B8', '#3CF2FF', '#06323A', '#3208EC'),
    mk('#9984F6', '#9984F6', '#FFFFFF', '#3CF2FF'),
    mk('#121213', '#3D3846', '#3CF2FF', '#3CF2FF'),
    mk('#7A6BD8', '#B4A5F8', '#1C0396', '#3208EC'),
    mk('#3208EC', '#5A3BF0', '#FFFFFF', '#3CF2FF')
  ];
  const NEUTRAL = ['#F5F3F8', '#F0EDF4', '#F7F6FA', '#EEEBF2'];
  const CYAN = hex('#3CF2FF');

  /* scene copy painted on the boxes (illustrative, fictional) */
  const CONTENT = [
    { title: ['Hírfigyelés'], label: 'PONTSZÁM · ACME', val: [8.7, 9.1, 7.4, 8.2], fmt: v => v.toFixed(1).replace('.', ','),
      log: ['› cikk beérkezett', '› nyelv: szerb', '› fordítás kész', '› pontszám: 8,7', '› indoklás kész', '› riasztás elküldve'],
      mon: ['FORRÁSOK', 'AKTÍV'], met: ['FONTOS MA', 12, 48] },
    { title: ['Közösségi', 'média'], label: 'REAKCIÓK', val: [2400, 3100, 2800, 3900], fmt: v => (v / 1000).toFixed(1).replace('.', ',') + 'e',
      log: ['› új poszt: facebook', '› 214 komment', '› hangulat: romló', '› sztori elindult', '› megosztás: 1,1e', '› riasztás elküldve'],
      mon: ['PLATFORMOK', '6/6'], met: ['KOMMENT', 120, 420] },
    { title: ['Videó'], label: 'TALÁLAT', val: [58, 134, 412, 61], fmt: v => Math.floor(v / 60) + ':' + String(Math.round(v % 60)).padStart(2, '0'),
      log: ['› videó beérkezett', '› átirat: 42 perc', '› találat: 0:58', '› idézet kiemelve', '› link a perchez', '› riasztás elküldve'],
      mon: ['CSATORNÁK', 'ÉLŐ'], met: ['PERC ÁTIRAT', 300, 900] },
    { title: ['Jogszabály-', 'figyelő'], label: 'KÖZLÖNY', val: [214, 215, 216, 217], fmt: v => '2026/' + Math.round(v),
      log: ['› új közlöny', '› 38 oldal', '› kulcsszó: különadó', '› érintett: acme', '› parlament: T/961', '› riasztás elküldve'],
      mon: ['FORRÁSOK', '2/2'], met: ['JAVASLAT', 3, 14] },
    { title: ['Reggeli', 'riport'], label: 'ELKÉSZÜLT', val: [420, 420, 420, 420], fmt: () => '07:00',
      log: ['› 312 cikk átnézve', '› 14 fontos', '› 3 sztori', '› összefoglaló kész', '› források csatolva', '› kiküldve 07:00'],
      mon: ['FEJEZETEK', '5/5'], met: ['FORRÁS', 20, 60] }
  ];

  /* ---------------- shared iso helpers ---------------- */
  function setupCanvas(cv) {
    const st = { cv, ctx: cv.getContext('2d'), W: 0, H: 0, dpr: 1, visible: true };
    const fit = () => {
      const r = cv.getBoundingClientRect();
      st.dpr = Math.min(2, window.devicePixelRatio || 1);
      st.W = r.width; st.H = r.height;
      cv.width = Math.round(r.width * st.dpr); cv.height = Math.round(r.height * st.dpr);
      st.onresize && st.onresize();
    };
    new ResizeObserver(fit).observe(cv);
    new IntersectionObserver(es => es.forEach(e => { st.visible = e.isIntersecting; }), { rootMargin: '80px' }).observe(cv);
    fit();
    return st;
  }
  function makeProj(st) {
    return {
      s: 40, ox: 0, oy: 0,
      P(x, y, z) { return [this.ox + (x - y) * C30 * this.s, this.oy + (x + y) * S30 * this.s - z * this.s]; },
      inv(sx, sy) { const a = (sx - this.ox) / (C30 * this.s), b = (sy - this.oy) / (S30 * this.s); return [(a + b) / 2, (b - a) / 2]; }
    };
  }
  function poly(ctx, pr, pts, fill) {
    ctx.beginPath();
    pts.forEach((p, i) => { const q = pr.P(p[0], p[1], p[2]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  }
  /* face transforms: local units are screen px; u runs along the face, v runs down from the top edge */
  function faceT(st, pr, kind, x, y, w, d, h) {
    const k = st.dpr; let o, a, b, c, dd;
    if (kind === 'R') { o = pr.P(x + w, y + d, h); a = C30; b = -S30; c = 0; dd = 1; }        // x = x1 face, u runs to the back-right (text reads up-right)
    else if (kind === 'L') { o = pr.P(x, y + d, h); a = C30; b = S30; c = 0; dd = 1; }       // y = y1 face, u runs down-right
    else { o = pr.P(x, y, h); a = C30; b = S30; c = -C30; dd = S30; }                         // top face
    st.ctx.setTransform(a * k, b * k, c * k, dd * k, o[0] * k, o[1] * k);
  }
  function drawBoxShape(ctx, pr, x, y, w, d, h, cols, edge) {
    const x1 = x + w, y1 = y + d;
    poly(ctx, pr, [[x, y1, 0], [x1, y1, 0], [x1, y1, h], [x, y1, h]], cols.left);
    poly(ctx, pr, [[x1, y1, 0], [x1, y, 0], [x1, y, h], [x1, y1, h]], cols.right);
    poly(ctx, pr, [[x, y, h], [x1, y, h], [x1, y1, h], [x, y1, h]], cols.top);
    if (edge) {
      ctx.strokeStyle = edge; ctx.lineWidth = 1;
      const a = pr.P(x, y1, h), b = pr.P(x1, y1, h), c = pr.P(x1, y, h), e = pr.P(x1, y1, 0);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.moveTo(b[0], b[1]); ctx.lineTo(e[0], e[1]); ctx.stroke();
    }
  }
  function pixIcon(ctx, name, x, y, size, col) {
    const bm = (window.IC_ICONS || {})[name]; if (!bm) return;
    const n = bm.length, c = size / n; ctx.fillStyle = col;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (bm[j][i] === '#') ctx.fillRect(x + i * c, y + j * c, c - .35, c - .35);
  }

  /* ================================================================
     PRODUCTS: voxel cubes on a tinted ground
     ================================================================ */
  function Cubes(cv) {
    const st = setupCanvas(cv), ctx = st.ctx, pr = makeProj(st);
    let prod = 0, switchAt = -1e9, typedAt = 0;
    const CUBE = 3;
    const cubes = [
      { fx: .12, fy: 1.02, role: 'dark', seed: 1 },
      { fx: .42, fy: .80, role: 'main', seed: 2 },
      { fx: .66, fy: .46, role: 'dark', seed: 3 },
      { fx: .90, fy: .26, role: 'tint', seed: 4 },
      { fx: .02, fy: .40, role: 'tint', seed: 5 },
      { fx: .93, fy: 1.08, role: 'dark', seed: 6 }
    ];
    const mobPos = [[.05, 1.0], [.5, .78], [.86, .42], [1.1, .2], [-.2, .4], [1.1, 1.1]];
    const r = rng(11);
    cubes.forEach(c => { c.cells = { L: [], R: [], T: [] }; ['L', 'R', 'T'].forEach(f => { for (let i = 0; i < 16; i++) c.cells[f].push(r() < .22 ? 1 : 0); }); });
    let colsCur = PAL[0], colsFrom = PAL[0];
    const TERM = [
      ['projekt:', '  szakasz: tervezés', '  architektúra: kész', '  adatmodell: kész', 'fejlesztés:', '  code review: igen', '  ci_cd: igen', 'üzemeltetés:', '  ki_viszi: mi', '  átadás: nincs'],
      ['pipeline:', '  minta: eseményvezérelt', '  feldolgozás: idempotens', '  hibánál:', '    - újrapróbálás', '    - nem állítja meg', '      a többit', '  backpressure: igen', 'adatbázis: postgresql'],
      ['llm:', '  modell: cserélhető', '  költség: hívásonként', '  drága_modell: ha kell', '  válaszidő: mérve', 'ágens:', '  fut: hosszan', '  önállóan: igen', '  napló: igen'],
      ['modell:', '  tanítás: elkülönítve', '  adat: saját', 'kiértékelés:', '  valódi_adaton: igen', '  jobb_a_réginél: ?', 'élesítés:', '  csak_ha: jobb', 'embedding: igen'],
      ['gyűjtés:', '  forrás: több százezer', '  nehéz_oldal: igen', '  hang_videó: szöveg', 'keresés:', '  kulcsszó: igen', '  jelentés: igen', '  típus: hibrid', 'index: vektor'],
      ['infra:', '  kód: igen', '  telepítés: automatikus', '  leállás: nincs', 'monitorozás:', '  állapot: egy helyen', '  sebesség: mérve', '  hibák: naplózva', 'konténer: igen'],
      ['kliens:', '  web: igen', '  ios: natív', '  android: natív', 'push:', '  értesítés: igen', 'backend:', '  saját: igen', 'intercept_app: mi']
    ];
    st.onresize = () => {
      const W = st.W, H = st.H, mob = W < 700;
      pr.s = mob ? W / 12 : clamp(W / 22, 30, 72);
      pr.ox = W * .5; pr.oy = H * .5;
      cubes.forEach((c, i) => { const f = mob ? mobPos[i] : [c.fx, c.fy]; const w = pr.inv(f[0] * W, f[1] * H); c.x = w[0] - CUBE / 2; c.y = w[1] - CUBE / 2; });
    };
    st.onresize();

    function cellsFace(kind, x, y, w, d, h, base, light, hole, cells, acc, t, seed) {
      faceT(st, pr, kind, x, y, w, d, h);
      const s = pr.s, fw = (kind === 'L' ? w : d) * s, fh = (kind === 'T' ? d * s / S30 * S30 : h * s);
      const W = kind === 'T' ? w * s : fw, Hh = kind === 'T' ? d * s : fh;
      const n = 4, m = W * .06, g = W * .035, cw = (W - 2 * m - g * (n - 1)) / n, chh = (Hh - 2 * m - g * (n - 1)) / n;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const v = cells[j * n + i];
        const blink = !RM && ((Math.floor(t * .9 + seed * 7 + i * 3 + j * 5) % 23) === 0);
        ctx.fillStyle = v ? hole : (blink ? acc : light);
        ctx.fillRect(m + i * (cw + g), m + j * (chh + g), cw, chh);
      }
    }

    function frame(now) {
      requestAnimationFrame(frame);
      if (!st.visible || document.hidden) return;
      const t = now / 1000, k = clamp((now - switchAt) / 700, 0, 1), ek = easeOut(k);
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      const P = PAL[prod], F = colsFrom;
      const tint = i => rgb(mix(hex(F.tints[i]), hex(P.tints[i]), ek));
      ctx.fillStyle = tint(0); ctx.fillRect(0, 0, st.W, st.H);
      // ground: long diagonal strips, like a road network under the cubes
      const strips = [[-30, -2.2, 60, 5.2, 1], [-30, -14, 60, 3.2, 3], [-4.6, -30, 3.6, 60, 2], [8.5, -30, 2.2, 60, 3], [-30, 9.5, 60, 2.6, 2]];
      strips.forEach(sv => poly(ctx, pr, [[sv[0], sv[1], 0], [sv[0] + sv[2], sv[1], 0], [sv[0] + sv[2], sv[1] + sv[3], 0], [sv[0], sv[1] + sv[3], 0]], tint(sv[4])));
      // cubes, back to front
      cubes.slice().sort((a, b) => (a.x + a.y) - (b.x + b.y)).forEach(c => {
        const bob = RM ? 0 : Math.sin(t * .8 + c.seed * 1.7) * .06;
        let z = bob, h = CUBE;
        if (c.role === 'main') { const pop = k < 1 ? Math.sin(k * Math.PI) * .5 : 0; z += pop * .5; }
        let cols, light, hole, acc;
        if (c.role === 'main') {
          const m = (a, b) => rgb(mix(hex(a), hex(b), ek));
          cols = { top: m(F.top, P.top), left: m(F.left, P.left), right: m(F.right, P.right) };
          light = 'rgba(255,255,255,.5)'; hole = 'rgba(18,18,19,.5)'; acc = '#3CF2FF';
        } else if (c.role === 'dark') {
          cols = { top: '#5A4A8A', left: '#2E2350', right: '#3F3270' }; light = 'rgba(255,255,255,.22)'; hole = 'rgba(0,0,0,.55)'; acc = '#3CF2FF';
        } else {
          const m = (i, d) => rgb(mix(mix(hex(F.tints[i]), hex(P.tints[i]), ek), [70, 50, 130], d));
          cols = { top: m(1, .05), left: m(3, .28), right: m(2, .17) }; light = 'rgba(255,255,255,.55)'; hole = 'rgba(40,30,80,.35)'; acc = '#fff';
        }
        // lift the cube by drawing its box from z
        const x = c.x, y = c.y;
        const pz = (X, Y, Z) => [X, Y, Z + z];
        const x1 = x + CUBE, y1 = y + CUBE;
        poly(ctx, pr, [pz(x, y1, 0), pz(x1, y1, 0), pz(x1, y1, h), pz(x, y1, h)], cols.left);
        poly(ctx, pr, [pz(x1, y1, 0), pz(x1, y, 0), pz(x1, y, h), pz(x1, y1, h)], cols.right);
        poly(ctx, pr, [pz(x, y, h), pz(x1, y, h), pz(x1, y1, h), pz(x, y1, h)], cols.top);
        // shadow line on the ground for depth
        ctx.save();
        const oz = pr.oy; pr.oy -= z * pr.s;
        if (c.role === 'main') {
          // left face = terminal
          faceT(st, pr, 'L', x, y, CUBE, CUBE, h);
          const s = pr.s, fw = CUBE * s, fh = h * s;
          ctx.fillStyle = '#121213'; ctx.fillRect(0, 0, fw, fh);
          ctx.save(); ctx.beginPath(); ctx.rect(0, 0, fw, fh); ctx.clip();
          const lines = TERM[prod], lh = s * .3, typed = RM ? 1e9 : (now - typedAt) / 32;
          ctx.font = `400 ${s * .2}px "IBM Plex Mono"`; ctx.textBaseline = 'top';
          let used = 0;
          const scroll = RM ? 0 : Math.max(0, (lines.length * lh + s * .3) - fh) * ((Math.sin(t * .25) + 1) / 2);
          lines.forEach((ln, i) => {
            const vis = Math.max(0, Math.min(ln.length, typed - used)); used += ln.length + 4;
            ctx.fillStyle = ln.endsWith(':') ? P.ui === '#121213' ? '#3CF2FF' : rgb(mix(hex(P.top), [255, 255, 255], .2)) : '#E9E6EE';
            ctx.fillText(ln.slice(0, vis), s * .22, s * .25 + i * lh - scroll);
            if (vis < ln.length && vis > 0) { const w = ctx.measureText(ln.slice(0, vis)).width; ctx.fillStyle = '#3CF2FF'; ctx.fillRect(s * .22 + w + 1, s * .25 + i * lh - scroll, s * .11, s * .2); }
          });
          ctx.restore();
          cellsFace('R', x, y, CUBE, CUBE, h, cols.right, light, hole, c.cells.R, acc, t, c.seed);
        } else {
          cellsFace('L', x, y, CUBE, CUBE, h, cols.left, light, hole, c.cells.L, acc, t, c.seed);
          cellsFace('R', x, y, CUBE, CUBE, h, cols.right, light, hole, c.cells.R, acc, t, c.seed + 1);
        }
        cellsFace('T', x, y, CUBE, CUBE, h, cols.top, c.role === 'main' ? 'rgba(255,255,255,.62)' : light, hole, c.cells.T, acc, t, c.seed + 2);
        ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
        pr.oy = oz; ctx.restore();
      });
    }
    requestAnimationFrame(frame);
    return {
      setProduct(k) { if (k === prod) return; colsFrom = PAL[prod]; prod = k; switchAt = performance.now(); typedAt = switchAt + 200; },
      start() { typedAt = performance.now(); }
    };
  }

  /* ================================================================
     CLOSING: twisting ribbon of slabs
     ================================================================ */
  function Ribbon(cv) {
    const st = setupCanvas(cv), ctx = st.ctx;
    const N = 24;
    let scrollP = 0;
    const lavender = hex('#ECE7F1'), b300 = hex('#C2B5F9'), blue = hex('#3208EC'), ink = hex('#121213');
    const dirV = [-.55, 1, -.32];
    function colorAt(t) {
      if (t < .55) return mix(lavender, b300, t / .55);
      if (t < .8) return mix(b300, blue, (t - .55) / .25);
      return mix(blue, ink, (t - .8) / .2);
    }
    function frame(now) {
      requestAnimationFrame(frame);
      if (!st.visible || document.hidden) return;
      const r = cv.getBoundingClientRect(), vh = innerHeight;
      scrollP = clamp(1 - (r.top + r.height * .5) / vh, -1, 2);
      const W = st.W, H = st.H, t = RM ? 0 : now / 1000;
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const unit = Math.min(W / 30, 56), sp = (W * 1.02) / N;
      const faces = [];
      for (let i = 0; i < N; i++) {
        const tt = i / (N - 1);
        const th = -1.25 + tt * 1.9 + Math.sin(t * .7 - i * .3) * .28 + scrollP * .9;
        const ct = Math.cos(th), sn = Math.sin(th);
        const tx = unit * .26, dy = unit * 1.5, hz = unit * 2.9;
        const cx = -W * .02 + i * sp, cy = H * .46 + Math.sin(i * .3 + t * .5) * unit * .12;
        const V = [];
        for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) {
          const X = a * tx / 2, Y0 = b * dy / 2, Z0 = c * hz / 2;
          const Y = Y0 * ct - Z0 * sn, Z = Y0 * sn + Z0 * ct;
          V.push({ X, Y, Z, sx: cx + X + Y * .55, sy: cy - Z - Y * .32 });
        }
        const F = [[0, 1, 3, 2, [-1, 0, 0]], [4, 6, 7, 5, [1, 0, 0]], [0, 4, 5, 1, [0, -1, 0]], [2, 3, 7, 6, [0, 1, 0]], [0, 2, 6, 4, [0, 0, -1]], [1, 5, 7, 3, [0, 0, 1]]];
        const base = colorAt(tt), alpha = clamp(tt / .28, 0, 1);
        F.forEach(f => {
          const p = [V[f[0]], V[f[1]], V[f[2]], V[f[3]]];
          const area = (p[1].sx - p[0].sx) * (p[2].sy - p[0].sy) - (p[2].sx - p[0].sx) * (p[1].sy - p[0].sy);
          if (area >= 0) return;
          let n = f[4]; n = [n[0], n[1] * ct - n[2] * sn, n[1] * sn + n[2] * ct];
          const lit = .78 + .22 * (n[0] * -.4 + n[1] * -.5 + n[2] * .77);
          const depth = p.reduce((s, q) => s + q.X * dirV[0] + q.Y * dirV[1] + q.Z * dirV[2], 0) / 4 + i * 0;
          faces.push({ p, col: rgb(base.map(v => v * lit + (lit > 1 ? 0 : 0))), alpha, depth, i, edge: n[0] < -.5 });
        });
      }
      faces.sort((a, b) => (b.i - a.i) || (b.depth - a.depth));
      faces.forEach(f => {
        ctx.globalAlpha = f.alpha;
        ctx.beginPath(); f.p.forEach((q, j) => j ? ctx.lineTo(q.sx, q.sy) : ctx.moveTo(q.sx, q.sy)); ctx.closePath();
        ctx.fillStyle = f.col; ctx.fill();
        if (f.i === N - 7 && f.edge) { ctx.fillStyle = '#3CF2FF'; ctx.fill(); }
      });
      ctx.globalAlpha = 1;
      // soft fade into the panel on the left
      const g = ctx.createLinearGradient(0, 0, W * .22, 0); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W * .22, H);
    }
    requestAnimationFrame(frame);
  }

  window.ICScenes = { Cubes, Ribbon, PAL };
})();
