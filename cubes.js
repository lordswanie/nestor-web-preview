/* Nestor web — "Fejlesztés" cube carousel.
   Behaviour modelled on the reference products scene (measured 2026-11-26):
   - orthographic iso camera from (-x, +y, +z), zoom 2.5 on a 6-unit frustum, unit cubes on a floor at y = -0.5
   - one row of cubes along +x, 1.5 apart, three copies of the product list; the row slides so the active cube sits
     in the middle (nearest copy), 0.6 s sine.inOut, while the camera dips to 0.93 zoom and back
   - the active product's cubes turn to rotation 0 (code face on the left, grid face on the right); all others sit at -90°
   - active cube full colour, the rest at 10 % brightness; the +X face is always 0.6
   - grid face: 5×5 white cells on the cube colour, the product's pattern cells are dark holes whose depth breathes
     with noise; the pointer presses a disc into the white cells
   - a translucent beam (back faces of the cube stretched 7× along z, 20 % opacity) runs through the active cube
   - floor = product background with a white 0.5-unit grid that travels with the row.
   Canvas 2D, linear-light colour mixing. */
(function () {
  'use strict';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const S2 = Math.SQRT2, S6 = Math.sqrt(6);
  const toLin = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const toSrgb = c => c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  const lin = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => toLin(parseInt(h.slice(i, i + 2), 16) / 255)); };
  const css = (l, a) => { const c = l.map(v => Math.round(Math.max(0, Math.min(1, toSrgb(v))) * 255)); return a == null ? `rgb(${c})` : `rgba(${c},${a})`; };
  const mixL = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const WHITE = [1, 1, 1], DARK = lin('#0E0E10'), NIGHT = lin('#1A0F4A');
  const sine = t => -(Math.cos(Math.PI * t) - 1) / 2;
  const sineOut = t => Math.sin(t * Math.PI / 2);

  /* one look per development area: cube colour, floor background, 5×5 hole pattern */
  /* same OKLCH pentad as the hero (anchored on the Nestor blue, hues 72° apart); the umbrella area takes the
     blue's lighter tint, so each of the five areas keeps one colour across the page */
  const LOOKS = [
    { color: '#859DFE', bg: '#EBEFFF', pattern: '00000 01110 01010 01110 00001' },   // the Nestor mark: frame + tail
    { color: '#3208EC', bg: '#E0E7FF', pattern: '00000 01110 00000 01110 00000' },
    { color: '#3CF2FF', bg: '#BEF4F6', pattern: '00000 01110 01110 01000 00000' },
    { color: '#E92CB3', bg: '#FFDDF0', pattern: '00000 00010 00110 01110 00000' },
    { color: '#FF9139', bg: '#FFE1CF', pattern: '00000 01100 01100 00010 00000' }
  ].map(l => ({ ...l, c: lin(l.color), b: lin(l.bg), holes: l.pattern.replace(/\s+/g, '').split('').map(Number) }));

  /* real snippets, one per area: file name, then code (≤ 34 columns) */
  const TERM = [["Makefile", [".PHONY: check release", "", "check:", "  ruff check .", "  mypy --strict src", "  pytest -q --cov=src", "", "release: check", "  git tag v$(VERSION)", "  ./deploy.sh --wait-healthy"]],
    ["consumer.py", ["async def handle(msg):", "    if not await claim(msg.id):", "        return await msg.ack()", "    try:", "        await process(msg.body)", "    except Transient:", "        await release(msg.id)", "        return await msg.nack()", "    except Exception:", "        return await to_dlq(msg)", "    await msg.ack()"]],
    ["summarize.py", ["@metered(unit=\"call\")", "async def summarize(doc: str):", "    model = route(tokens(doc))", "    out = await model.complete(", "        system=PROMPT,", "        user=doc,", "        max_tokens=400,", "        timeout=30,", "    )", "    return out.text"]],
    ["release_gate.py", ["new = evaluate(cand, holdout)", "old = evaluate(prod, holdout)", "", "if new.f1 <= old.f1:", "    raise Rejected(new, old)", "", "promote(cand)", "log.info(\"f1 %.3f -> %.3f\",", "         old.f1, new.f1)"]],
    ["search.sql", ["SELECT id, title,", "  ts_rank(tsv, q) AS rank", "FROM docs,", "  websearch_to_tsquery(", "    'hungarian', $1) AS q", "WHERE tsv @@ q", "  AND published > now() - $2", "ORDER BY rank DESC", "LIMIT 50;"]]];

  const GAP = 0.03, SQ = (1 - GAP * 6) / 5, STRIDE = SQ + GAP, COPIES = 3, SPACING = 1.5, BEAM = 7;

  function Cubes(cv, opts) {
    opts = opts || {};
    const ctx = cv.getContext('2d'), L = LOOKS.length;
    let W = 0, H = 0, dpr = 1, k = 100, ox = 0, oy = 0, visible = true, last = performance.now() / 1000, now = 0;
    const fit = () => { const r = cv.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); };
    new ResizeObserver(fit).observe(cv); fit();
    new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; }), { rootMargin: '80px' }).observe(cv);

    const slot = (i, copy = 1) => copy * L + i;
    let active = 0, slotActive = slot(0);
    const cubes = [];
    for (let c = 0; c < COPIES; c++) for (let i = 0; i < L; i++) cubes.push({ i, s: slot(i, c), rot: i === active ? 0 : -Math.PI / 2, beam: 0 });
    cubes.find(q => q.s === slotActive).beam = 1;
    const prog = LOOKS.map((_, i) => ({ p: i === active ? 1 : 0, h: i === active ? 1 : 0 }));
    const state = { gx: -SPACING * slotActive, zoom: 1, floor: LOOKS[active].b.slice() };
    let anim = null, typedAt = 0;

    /* ---------- projection ---------- */
    function camera() {
      const base = Math.min(H * 2.5 / 6, W * (W < 700 ? .5 : .42));
      k = base * state.zoom; ox = W / 2; oy = H / 2;
    }
    const P = (x, y, z) => [ox + k * (x + z) / S2, oy + k * (-x - 2 * y + z) / S6];
    const floorAt = (X, Y) => { const u = (X - ox) / k * S2, v = (Y - oy) / k * S6 + 2 * -.5 * 0; return [(u - v) / 2, (u + v) / 2]; };
    const rotY = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; };
    const TOCAM = [-1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)];
    function path(pts) { ctx.beginPath(); pts.forEach((p, j) => { const q = P(p[0], p[1], p[2]); j ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); }
    /* affine transform for a face: origin o, unit vectors U (across) and V (down), in world units; local coordinates in 1/100 units */
    function faceT(o, U, V) {
      const a = P(...o), b = P(o[0] + U[0], o[1] + U[1], o[2] + U[2]), c = P(o[0] + V[0], o[1] + V[1], o[2] + V[2]), s = dpr / 100;
      ctx.setTransform((b[0] - a[0]) * s, (b[1] - a[1]) * s, (c[0] - a[0]) * s, (c[1] - a[1]) * s, a[0] * dpr, a[1] * dpr);
    }
    const resetT = () => ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* ---------- pointer: white holes on the active grid face, click to pick ---------- */
    /* the pointer is kept in viewport coordinates and re-read against the canvas every frame, so scrolling
       never leaves a stale position behind; it only counts when the canvas itself is the topmost element
       under it (the tab list and the detail card sit on top of the scene) */
    let mouse = null, hoverCube = null, client = null;
    const dent = { u: .5, v: .5, r: 0, on: false }, DENT_R = .34;
    addEventListener('pointermove', e => { client = e.pointerType === 'touch' ? null : [e.clientX, e.clientY]; }, { passive: true });
    document.addEventListener('pointerleave', () => { client = null; });
    function readPointer() {
      if (!client) { mouse = null; return; }
      const el = document.elementFromPoint(client[0], client[1]);
      if (el !== cv) { mouse = null; return; }
      const r = cv.getBoundingClientRect(); mouse = [client[0] - r.left, client[1] - r.top];
    }
    cv.addEventListener('click', () => { if (hoverCube && hoverCube.i !== active) { opts.onPick ? opts.onPick(hoverCube.i) : select(hoverCube.i); } });

    /* ---------- transition ---------- */
    function select(i) {
      if (i === active && !anim) return;
      // re-centre the row on the middle copy first, so the slide is always the short way
      const tPos = -state.gx / SPACING, wrapped = slot(0) + ((Math.round(tPos) % L) + L) % L, shift = wrapped - Math.round(tPos);
      if (shift) { state.gx -= shift * SPACING; cubes.forEach(q => { q.beam = 0; }); const c0 = cubes.find(q => q.s === slotActive + shift); slotActive += shift; if (c0) c0.beam = 1; }
      const pos = -state.gx / SPACING;
      const target = [0, 1, 2].map(c => slot(i, c)).reduce((a, b) => Math.abs(b - pos) < Math.abs(a - pos) ? b : a);
      const from = { gx: state.gx, zoom: state.zoom, floor: state.floor.slice(), rot: cubes.map(q => q.rot), beam: cubes.map(q => q.beam), prog: prog.map(p => ({ ...p })) };
      const oldSlot = slotActive;
      anim = { t0: now, from, to: i, target, oldSlot };
      active = i; slotActive = target; typedAt = now + .25;
    }
    function stepAnim() {
      if (!anim) return;
      const t = now - anim.t0, D = 0.6, k1 = Math.min(1, t / D), e = sine(k1);
      const f = anim.from, i = anim.to;
      state.gx = f.gx + (-SPACING * anim.target - f.gx) * e;
      state.floor = mixL(f.floor, LOOKS[i].b, e);
      state.zoom = t < .3 ? f.zoom + (.93 - f.zoom) * sine(Math.min(1, t / .3)) : .93 + (1 - .93) * sine(Math.min(1, (t - .3) / .3));
      cubes.forEach((q, j) => {
        q.rot = f.rot[j] + ((q.i === i ? 0 : -Math.PI / 2) - f.rot[j]) * e;
        if (q.s === anim.oldSlot && q.s !== anim.target) q.beam = f.beam[j] * (1 - e);
        else if (q.s === anim.target) q.beam = f.beam[j] + (1 - f.beam[j]) * sine(Math.max(0, Math.min(1, (t - .12) / .48)));
        else q.beam = f.beam[j] * (1 - e);
      });
      prog.forEach((p, j) => {
        const to = j === i ? 1 : 0;
        p.p = f.prog[j].p + (to - f.prog[j].p) * e;
        p.h = f.prog[j].h + (to - f.prog[j].h) * sine(Math.max(0, Math.min(1, (t - .2) / .4)));
      });
      if (t >= D) anim = null;
    }

    /* ---------- drawing ---------- */
    function drawFloor() {
      resetT(); ctx.fillStyle = css(state.floor); ctx.fillRect(0, 0, W, H);
      // grid on the plane y = -0.5, spacing 0.5, travelling with the row
      const corners = [[0, 0], [W, 0], [0, H], [W, H]].map(([X, Y]) => {
        const u = (X - ox) / k * S2, v = (Y - oy) / k * S6 - 2 * .5;   // y = -0.5 lifts v by 1 (2y term)
        return [(u - v) / 2, (u + v) / 2];
      });
      const xs = corners.map(c => c[0]), zs = corners.map(c => c[1]);
      const x0 = Math.min(...xs) - 1, x1 = Math.max(...xs) + 1, z0 = Math.min(...zs) - 1, z1 = Math.max(...zs) + 1;
      ctx.strokeStyle = 'rgba(255,255,255,.62)'; ctx.lineWidth = 1; ctx.beginPath();
      const off = ((state.gx % .5) + .5) % .5;
      for (let x = Math.floor(x0 / .5) * .5 + off; x <= x1; x += .5) { const a = P(x, -.5, z0), b = P(x, -.5, z1); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
      for (let z = Math.floor(z0 / .5) * .5; z <= z1; z += .5) { const a = P(x0, -.5, z), b = P(x1, -.5, z); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
      ctx.stroke();
    }

    // faces of a unit cube in local space: normal, 4 corners, and the face frame (origin, across, down)
    const FACES = {
      nx: { n: [-1, 0, 0], q: [[-.5, -.5, -.5], [-.5, -.5, .5], [-.5, .5, .5], [-.5, .5, -.5]], o: [-.5, .5, -.5], U: [0, 0, 1], V: [0, -1, 0] },
      px: { n: [1, 0, 0], q: [[.5, -.5, .5], [.5, -.5, -.5], [.5, .5, -.5], [.5, .5, .5]], o: [.5, .5, .5], U: [0, 0, -1], V: [0, -1, 0] },
      pz: { n: [0, 0, 1], q: [[-.5, -.5, .5], [.5, -.5, .5], [.5, .5, .5], [-.5, .5, .5]], o: [-.5, .5, .5], U: [1, 0, 0], V: [0, -1, 0] },
      nz: { n: [0, 0, -1], q: [[.5, -.5, -.5], [-.5, -.5, -.5], [-.5, .5, -.5], [.5, .5, -.5]], o: [.5, .5, -.5], U: [-1, 0, 0], V: [0, -1, 0] },
      py: { n: [0, 1, 0], q: [[-.5, .5, -.5], [.5, .5, -.5], [.5, .5, .5], [-.5, .5, .5]], o: [-.5, .5, -.5], U: [1, 0, 0], V: [0, 0, 1] },
      ny: { n: [0, -1, 0], q: [[-.5, -.5, .5], [.5, -.5, .5], [.5, -.5, -.5], [-.5, -.5, -.5]], o: [-.5, -.5, .5], U: [1, 0, 0], V: [0, 0, -1] }
    };
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

    function drawBeam(q, cx) {
      if (q.beam < .005) return;
      const L0 = LOOKS[q.i], sz = 1 + (BEAM - 1) * q.beam;
      ctx.fillStyle = css(L0.c, .2);
      Object.values(FACES).forEach(f => {
        const n = rotY(f.n, q.rot);
        if (dot(n, TOCAM) >= 0) return;   // back faces only
        const pts = f.q.map(p => add(rotY([p[0], p[1], p[2] * sz], q.rot), [cx, 0, 0]));
        resetT(); path(pts); ctx.fill();
      });
    }

    function holeNoise(i, cell, t) {
      return Math.sin(t * .9 + cell * 1.7 + i * 2.3) * .55 + Math.sin(t * 1.37 + cell * .61 + i) * .45;
    }

    function drawCube(q, cx, t) {
      const L0 = LOOKS[q.i], pr = prog[q.i], bright = .1 + .9 * Math.max(0, Math.min(1, pr.p));
      // inactive cubes drop to 10 % like the reference, pulled towards a deep Nestor violet so every
      // hue darkens into the brand family instead of muddy teal or grey
      const dim = 1 - Math.max(0, Math.min(1, pr.p)), night = c => mixL(mul(c, bright), mul(NIGHT, .9), .3 * dim);
      const base = night(L0.c), dark = mul(DARK, bright), cellC = night(WHITE);
      const dn = q.i === active && dent.r > .004 ? dent : null;
      Object.entries(FACES).forEach(([name, f]) => {
        const n = rotY(f.n, q.rot);
        if (dot(n, TOCAM) <= 0.0001) return;
        const pts = f.q.map(p => add(rotY(p, q.rot), [cx, 0, 0]));
        const shade = name === 'px' ? .6 : 1;
        const o = add(rotY(f.o, q.rot), [cx, 0, 0]), U = rotY(f.U, q.rot), V = rotY(f.V, q.rot);
        if (name === 'nx') {
          // code face: text in the cube colour on black
          resetT(); path(pts); ctx.fillStyle = css(mul(DARK, shade)); ctx.fill();
          ctx.save(); resetT(); path(pts); ctx.clip();
          faceT(o, U, V);
          const [file, lines] = TERM[q.i];
          ctx.textBaseline = 'top';
          // size the type so the widest line (34 columns) always fits inside the face with an 8-unit margin
          ctx.font = '400 10px "IBM Plex Mono"';
          const cw = ctx.measureText('M').width / 10, cols = Math.max(...lines.map(l => l.length), 26);
          const fs = Math.min(5.4, (100 - 16) / (cols * cw)), lh = fs * 1.55;
          ctx.font = `400 ${fs}px "IBM Plex Mono"`;
          const base = c => css(mixL(mul(c, shade * bright), mul(NIGHT, .5), .5 * dim));
          const C_TXT = base(mixL(L0.c, WHITE, .62)), C_KEY = base(mixL(L0.c, WHITE, .12)), C_STR = base(mixL(L0.c, WHITE, .88)), C_DIM = base(mixL(L0.c, WHITE, .35));
          const KW = /^(async|def|await|return|if|not|try|except|raise|for|in|import|from|class|SELECT|FROM|WHERE|AND|ORDER|BY|LIMIT|AS|DESC|FROM|WORKDIR|COPY|RUN|USER|EXPOSE|CMD|const|let|new|function|\.PHONY)$/;
          // file name line
          ctx.fillStyle = C_DIM; ctx.fillText(file, 8, 7);
          ctx.fillRect(8, 7 + fs + 2.2, 84, .25);
          const top = 7 + fs + 5.5, avail = 100 - top - 6;
          const typed = (RM || q.i !== active) ? 1e9 : (now - typedAt) * 70;
          const scroll = RM ? 0 : Math.max(0, lines.length * lh - avail) * ((Math.sin(t * .22) + 1) / 2);
          ctx.save(); ctx.beginPath(); ctx.rect(0, top - 1, 100, 100 - top + 1); ctx.clip();
          let used = 0;
          lines.forEach((ln, j) => {
            const vis = Math.max(0, Math.min(ln.length, typed - used)); used += ln.length + 4;
            const y = top + j * lh - scroll, shown = ln.slice(0, vis);
            let x = 8;
            // tokens: strings, words, everything else
            const toks = shown.match(/"[^"]*"?|'[^']*'?|[A-Za-z_.][A-Za-z0-9_.]*|#.*|\s+|./g) || [];
            toks.forEach(tk => {
              ctx.fillStyle = /^["']/.test(tk) ? C_STR : /^#/.test(tk) ? C_DIM : KW.test(tk) ? C_KEY : /^\d/.test(tk) ? C_KEY : C_TXT;
              ctx.fillText(tk, x, y); x += ctx.measureText(tk).width;
            });
            if (vis > 0 && vis < ln.length) { ctx.fillStyle = css(mul(L0.c, bright)); ctx.fillRect(x + .5, y, fs * .55, fs); }
          });
          ctx.restore();
          ctx.restore();
        } else if (name === 'pz') {
          // grid face
          resetT(); path(pts); ctx.fillStyle = css(mul(base, shade)); ctx.fill();
          const hp = Math.max(0, Math.min(1, pr.h));
          for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
            const idx = r * 5 + c, hole = L0.holes[idx] === 1;
            const u0 = GAP + c * STRIDE, v0 = GAP + r * STRIDE;
            const corner = (uu, vv, d) => add(add(add(o, mul(U, uu)), mul(V, vv)), mul(n, -d));
            const cell = [corner(u0, v0, 0), corner(u0 + SQ, v0, 0), corner(u0 + SQ, v0 + SQ, 0), corner(u0, v0 + SQ, 0)];
            const wall = (w0, w1) => {
              resetT(); path(cell); ctx.fillStyle = css(mul(mixL(base, dark, w0), shade)); ctx.fill();
              // darker upper-right half of the wall (split along the top-left → bottom-right diagonal)
              path([cell[0], cell[1], cell[2]]); ctx.fillStyle = css(mul(mixL(base, dark, w1), shade)); ctx.fill();
            };
            if (hole) {
              const depth = (.5 + holeNoise(q.i, idx, t) * .35) * hp * SQ;
              // turned-away cubes keep their pattern: the holes read as flat dark cells (as on the reference)
              const minD = .06 * SQ * Math.max(0, Math.min(1, pr.p + .4)), dd = Math.max(depth, minD);
              if (dd < .002) { resetT(); path(cell); ctx.fillStyle = css(mul(dark, shade)); ctx.fill(); continue; }
              wall(.45, .85);
              ctx.save(); path(cell); ctx.clip();
              path([corner(u0, v0, dd), corner(u0 + SQ, v0, dd), corner(u0 + SQ, v0 + SQ, dd), corner(u0, v0 + SQ, dd)]);
              ctx.fillStyle = css(mul(dark, shade)); ctx.fill(); ctx.restore();
              continue;
            }
            // white cell: flush, unless the pointer's disc presses part of it in
            resetT(); path(cell); ctx.fillStyle = css(mul(cellC, shade)); ctx.fill();
            if (!dn) continue;
            const nu = Math.max(u0, Math.min(u0 + SQ, dn.u)), nv = Math.max(v0, Math.min(v0 + SQ, dn.v));
            if ((nu - dn.u) ** 2 + (nv - dn.v) ** 2 > dn.r * dn.r) continue;
            const D = SQ * .8 * Math.min(1, dn.r / DENT_R), disc = (dd) => { faceT(add(o, mul(n, -dd)), U, V); ctx.beginPath(); ctx.arc(dn.u * 100, dn.v * 100, dn.r * 100, 0, Math.PI * 2); resetT(); };
            ctx.save();
            path(cell); ctx.clip(); disc(0); ctx.clip();          // the opening: cell ∩ disc on the surface
            wall(.25, .5);
            path([corner(u0, v0, D), corner(u0 + SQ, v0, D), corner(u0 + SQ, v0 + SQ, D), corner(u0, v0 + SQ, D)]); ctx.clip();
            disc(D); ctx.fillStyle = css(mul(cellC, shade)); ctx.fill();   // the pressed tile: cell ∩ disc, one depth back
            ctx.restore();
          }
        } else {
          resetT(); path(pts); ctx.fillStyle = css(mul(base, shade)); ctx.fill();
        }
      });
    }

    function pick() {
      if (!mouse) return null;
      let hit = null, best = -1e9;
      visibleCubes.forEach(({ q, cx }) => {
        // hull of the visible faces
        Object.values(FACES).forEach(f => {
          const n = rotY(f.n, q.rot); if (dot(n, TOCAM) <= 0) return;
          resetT(); path(f.q.map(p => add(rotY(p, q.rot), [cx, 0, 0])));
          if (ctx.isPointInPath(mouse[0] * dpr, mouse[1] * dpr)) { const d = -cx; if (d > best) { best = d; hit = q; } }
        });
      });
      return hit;
    }
    /* the disc follows the pointer across the active grid face with exponential smoothing and grows / shrinks
       in and out, so it never jumps; anywhere else on the cube (or off it) it simply closes */
    function updateDent(dt) {
      let target = null;
      const q = hoverCube;
      if (q && q.i === active && mouse && !anim) {
        const cx = (q.s * SPACING) + state.gx, f = FACES.pz, n = rotY(f.n, q.rot);
        if (dot(n, TOCAM) > .2) {
          const o = add(rotY(f.o, q.rot), [cx, 0, 0]), U = rotY(f.U, q.rot), V = rotY(f.V, q.rot);
          const a = P(...o), b = P(...add(o, U)), c = P(...add(o, V));
          const m00 = b[0] - a[0], m01 = c[0] - a[0], m10 = b[1] - a[1], m11 = c[1] - a[1], det = m00 * m11 - m01 * m10;
          const dx = mouse[0] - a[0], dy = mouse[1] - a[1];
          const u = (dx * m11 - dy * m01) / det, v = (m00 * dy - m10 * dx) / det;
          if (u >= 0 && u <= 1 && v >= 0 && v <= 1) target = [u, v];
        }
      }
      const kc = 1 - Math.exp(-dt * 14), kr = 1 - Math.exp(-dt * (target ? 9 : 6));
      if (target) {
        if (dent.r < .01) { dent.u = target[0]; dent.v = target[1]; }   // a fresh disc opens where the pointer is
        dent.u += (target[0] - dent.u) * kc; dent.v += (target[1] - dent.v) * kc;
      }
      dent.r += ((target && !RM ? DENT_R : 0) - dent.r) * kr;
      if (dent.r < .002) dent.r = 0;
    }

    let visibleCubes = [];
    function frame(ts) {
      requestAnimationFrame(frame);
      const tn = ts / 1000, dt = Math.min(.05, tn - last) * (window.__cubesTimeScale || 1); last = tn;
      if (window.__cubesManual || !visible || document.hidden) return;
      step(dt);
    }
    function step(dt) {
      now += dt;
      stepAnim(); camera();
      drawFloor();
      visibleCubes = cubes.map(q => ({ q, cx: q.s * SPACING + state.gx })).filter(({ cx }) => {
        const a = P(cx, 0, 0); return a[0] > -k * 2 && a[0] < W + k * 2;
      }).sort((a, b) => b.cx - a.cx);   // far (larger x) first
      visibleCubes.forEach(({ q, cx }) => drawBeam(q, cx));
      readPointer();
      const hv = pick();
      if (hv !== hoverCube) { hoverCube = hv; cv.style.cursor = hv && hv.i !== active ? 'pointer' : ''; }
      updateDent(dt);
      visibleCubes.forEach(({ q, cx }) => drawCube(q, cx, now));
      resetT();
    }
    window.__cubesAdvance = sec => { for (let t = 0; t < sec - 1e-6; t += 1 / 60) step(1 / 60); };
    requestAnimationFrame(frame);
    return { setProduct: select };
  }

  window.NACubes = Cubes;
  window.NA_CUBE_DATA = { LOOKS, TERM };
})();
