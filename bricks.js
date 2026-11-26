/* Nestor web — closing "bricks" ribbon.
   Behaviour modelled on the reference closing scene (measured 2026-11-26):
   - orthographic camera looking down -z, frustum height 8, zoom 2.55
   - 25 bricks 0.3 × 0.6 × 1.5, spaced 0.55 along -x from (3.54, 0.34); brick i has Euler (30° + 12°·i, 33°, 0)
   - the whole row spins about its own x axis at 18°/s, so the dark face travels along the row
   - face colours by local normal: ±z and +x light, ±y lightest, −x dark
   - pointer: bricks within 2.2 grow to 1.35× and take an accent colour; bricks within 5.2 are pushed sideways
     (0.24) and tilt up to 45°; damped with the reference rates.
   Canvas 2D, linear-light colour mixing, painter's order per run of same-facing bricks. */
(function () {
  'use strict';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const toLin = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const toSrgb = c => c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  const lin = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => toLin(parseInt(h.slice(i, i + 2), 16) / 255)); };
  const css = l => `rgb(${l.map(v => Math.round(Math.max(0, Math.min(1, toSrgb(v))) * 255))})`;
  const mixL = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const D2R = Math.PI / 180;
  const smoothstep = (x, a, b) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  /* Nestor colours in the reference roles */
  const BASE_Z = lin('#C2B5F9'), BASE_Y = lin('#F1EEFD'), BASE_XP = lin('#C2B5F9'), BASE_XN = lin('#3208EC'), HOVER_XP = lin('#1E0E7A');
  const HOVER_DARK = ['#3208EC', '#00A9B8', '#7052F2', '#9984F6', '#1E0E7A'].map(lin);
  const HOVER_LIGHT = ['#3CF2FF', '#D6CEFB', '#9984F6', '#F4F1F8', '#C2B5F9'].map(lin);

  const CFG = { count: 25, spacing: .55, rot: { x: 30, y: 33 }, incX: 12, offset: { x: 3.54, y: .34 }, speed: 18, threshold: 2.2, cursorLerp: 10 };
  const REP = { threshold: 5.2, strength: .24, rotation: 45, scale: 1.35 };
  const RATE = -Math.log(.05) / .15, RATE_C = RATE / 2;
  const SIZE = [.3, .6, 1.5];

  // local box: 8 corners, 6 faces with their local normal and colour role
  const HX = SIZE[0] / 2, HY = SIZE[1] / 2, HZ = SIZE[2] / 2;
  const CORN = [[-HX, -HY, -HZ], [HX, -HY, -HZ], [HX, HY, -HZ], [-HX, HY, -HZ], [-HX, -HY, HZ], [HX, -HY, HZ], [HX, HY, HZ], [-HX, HY, HZ]];
  const FACES = [
    { v: [4, 5, 6, 7], n: [0, 0, 1], role: 'z' }, { v: [1, 0, 3, 2], n: [0, 0, -1], role: 'z' },
    { v: [3, 7, 6, 2], n: [0, 1, 0], role: 'y' }, { v: [0, 1, 5, 4], n: [0, -1, 0], role: 'y' },
    { v: [1, 2, 6, 5], n: [1, 0, 0], role: 'xp' }, { v: [0, 4, 7, 3], n: [-1, 0, 0], role: 'xn' }
  ];

  // 3×3 matrices (row-major arrays)
  const mul3 = (a, b) => { const r = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]; return r; };
  const app = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
  const rx = a => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
  const ry = a => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };

  function Bricks(cv) {
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, visible = true, last = performance.now() / 1000, group = 0, cursor, mouse = null;
    const state = Array.from({ length: CFG.count }, () => [0, 0, 0]);   // hover scale, hover colour, repulsion
    const fit = () => { const r = cv.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); };
    new ResizeObserver(fit).observe(cv); fit();
    new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; }), { rootMargin: '60px' }).observe(cv);
    // the canvas sits under the metrics, so listen on its section
    const host = cv.closest('section') || cv;
    host.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); mouse = [e.clientX - r.left, e.clientY - r.top, e.clientY >= r.top && e.clientY <= r.bottom && e.clientX >= r.left && e.clientX <= r.right]; });
    host.addEventListener('pointerleave', () => { mouse = null; });

    function frame(ts) {
      requestAnimationFrame(frame);
      const tn = ts / 1000, dt = Math.min(.05, tn - last); last = tn;
      if (!visible || document.hidden || !W) return;
      draw(dt);
    }
    function draw(dt) {
      const k = H * 2.55 / 8, cx0 = W / 2, cy0 = H / 2;
      if (!RM) group += CFG.speed * D2R * dt;
      // pointer → local x on the brick row
      const inside = mouse && mouse[2] ? 1 : 0;
      if (inside) { const lx = (mouse[0] - cx0) / k - CFG.offset.x; cursor = cursor === undefined ? lx : cursor + (lx - cursor) * (1 - Math.exp(-CFG.cursorLerp * dt)); }
      const r = 1 - Math.exp(-RATE * dt), rc = 1 - Math.exp(-RATE_C * dt);
      for (let i = 0; i < CFG.count; i++) {
        const o = Math.abs((cursor ?? 0) + i * CFG.spacing);
        const a = inside * (1 - smoothstep(o, 0, CFG.threshold)), n = inside * (1 - smoothstep(o, 0, REP.threshold));
        const s = state[i]; s[0] += (a - s[0]) * r; s[1] += (a - s[1]) * rc; s[2] += (n - s[2]) * r;
      }
      const cur = cursor ?? 0, G = rx(group);
      const bricks = [];
      for (let i = 0; i < CFG.count; i++) {
        const [hs, hc, hr] = state[i], ix = -i * CFG.spacing;
        const offset = ix - cur;
        const dir = Math.max(-1, Math.min(1, offset / Math.max(REP.threshold * .2, 1e-4)));
        const env = 1 - smoothstep(Math.abs(Math.max(-1, Math.min(1, offset / REP.threshold))), 0, 1);
        const tilt = rx(Math.min(hr, env) * REP.rotation * D2R);
        const inst = mul3(rx((CFG.rot.x + i * CFG.incX) * D2R), ry(CFG.rot.y * D2R));     // Euler XYZ = Rx·Ry
        const M = mul3(G, mul3(inst, tilt));
        const sc = 1 + (REP.scale - 1) * hs, tx = ix + dir * hr * REP.strength;
        const center = app(G, [tx, 0, 0]);                                                   // translation is on the x axis, unaffected by Rx
        const pts = CORN.map(c => { const p = app(M, [c[0] * sc, c[1] * sc, c[2] * sc]); return [p[0] + center[0] + CFG.offset.x, p[1] + center[1] + CFG.offset.y, p[2] + center[2]]; });
        const thin = app(M, [1, 0, 0]);                                                      // slab normal
        const faces = [];
        FACES.forEach(f => {
          const n = app(M, f.n); if (n[2] <= 1e-4) return;
          let base, hov;
          if (f.role === 'y') { base = BASE_Y; hov = HOVER_LIGHT[i % 5]; }
          else if (f.role === 'xp') { base = BASE_XP; hov = HOVER_XP; }
          else if (f.role === 'xn') { base = BASE_XN; hov = HOVER_LIGHT[i % 5]; }
          else { base = BASE_Z; hov = HOVER_DARK[i % 5]; }
          faces.push({ q: f.v.map(j => pts[j]), col: css(mixL(base, hov, hc)), z: f.v.reduce((s, j) => s + pts[j][2], 0) / 4 });
        });
        bricks.push({ i, x: center[0] + CFG.offset.x, faces, side: thin[0] / (thin[2] || 1e-6) });
      }
      // painter's order: within a run of bricks facing the same way the farther slab goes first
      const order = [];
      let run = [bricks[0]];
      const flush = () => { const s = run[0].side; run.sort((a, b) => s > 0 ? a.x - b.x : b.x - a.x); order.push(...run); };
      for (let i = 1; i < bricks.length; i++) { if (Math.sign(bricks[i].side) === Math.sign(run[0].side)) run.push(bricks[i]); else { flush(); run = [bricks[i]]; } }
      flush();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      order.forEach(b => {
        b.faces.sort((p, q) => p.z - q.z).forEach(f => {
          ctx.beginPath();
          f.q.forEach((p, j) => { const X = cx0 + p[0] * k, Y = cy0 - p[1] * k; j ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
          ctx.closePath(); ctx.fillStyle = f.col; ctx.fill();
          ctx.strokeStyle = f.col; ctx.lineWidth = .6; ctx.stroke();   // hide hairline seams between faces
        });
      });
    }
    requestAnimationFrame(frame);
    window.__bricksDraw = dt => draw(dt || 0);
  }
  window.NABricks = Bricks;
})();
