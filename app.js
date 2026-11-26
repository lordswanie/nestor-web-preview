/* Nestor Analytics web — page behaviour on the Baseten-style system. */
(function () {
  'use strict';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const NS = 'http://www.w3.org/2000/svg';
  const ICONS = window.NA_ICONS, ICOL = window.NA_ICOL;

  /* ---------- content (from the current nestoranalytics.hu copy) ---------- */
  const WORK = [
    ['Egyedi szoftvertervezés és -fejlesztés', 'Tervezés', 'Fejlesztés · üzemeltetés',
      'Az egészet mi visszük, a tervezéstől az üzemeltetésig. Az Interceptet is ugyanez a csapat építette és tartja karban, a forrásfigyeléstől a mobilappig.',
      ['architektúra', 'adatmodellezés', 'code review', 'CI/CD'], 'code'],
    ['Backend és elosztott rendszerek', 'Backend', 'Pipeline · API',
      'Üzenetsorokra épülő, aszinkron feldolgozórendszereket tervezünk, amelyek nagy forgalom mellett is kiszámíthatóan működnek. Egy hibás feladat nem állítja meg a többit, és később újra lehet futtatni. Az Intercept is így dolgozza fel a beérkező anyagot, éjjel-nappal.',
      ['eseményvezérelt architektúra', 'idempotens feldolgozás', 'backpressure', 'PostgreSQL'], 'server'],
    ['Nyelvi modellek éles üzemben', 'LLM', 'Integráció · költség',
      'Nyelvi modelleket építünk be éles rendszerekbe úgy, hogy a költség és a válaszidő kézben maradjon. A modell cserélhető, a hívások költsége műveletenként mérhető, és a drága modell csak oda kerül, ahol tényleg szükség van rá. Hosszan, önállóan futó ágenseket is fejlesztünk.',
      ['LLM-integráció', 'költségkontroll', 'modellfüggetlenség', 'ágensek'], 'chat'],
    ['Gépi tanulás és adatelemzés', 'ML', 'Modellek · mérés',
      'Saját adatokon tanított modelleket fejlesztünk, és mérjük, mennyire pontosak. A tanítás elkülönítve fut az éles adatoktól. Új modellt vagy promptot csak akkor teszünk élesbe, ha valódi adaton jobbnak bizonyult a réginél.',
      ['osztályozás', 'kiértékelés', 'embeddingek', 'adatelemzés'], 'bars'],
    ['Keresés és adatgyűjtés', 'Adat', 'Keresés · scraping',
      'Több százezer forrásból gyűjtünk adatot, olyan oldalakról is, amelyeket nehéz automatikusan feldolgozni. Hangot és videót is szöveggé alakítunk. A keresőink a kulcsszavas és a jelentés szerinti keresést kombinálják.',
      ['web scraping', 'hibrid keresés', 'vektoradatbázis', 'beszédfelismerés'], 'search']
  ];
  /* hero slides, short lines */
  const HERO = [
    ['Backend és elosztott rendszerek', 'Aszinkron feldolgozás, ami nagy forgalom mellett is kiszámítható.'],
    ['Nyelvi modellek éles üzemben', 'Modellek éles rendszerben, kézben tartott költséggel és válaszidővel.'],
    ['Gépi tanulás és adatelemzés', 'Saját adaton tanított modellek, amelyeket élesítés előtt mérünk.'],
    ['Keresés és adatgyűjtés', 'Adat több százezer forrásból, kulcsszavas és jelentés szerinti kereséssel.'],
    ['Web- és mobilalkalmazások', 'Webes felület és natív iOS- és Android-app, a push értesítésig.']
  ];
  const P = [
    ['Amit mi nem használnánk,', 'azt nem adjuk át.', 'Egy megrendelő projektjén ugyanazokkal az eszközökkel és ugyanolyan alaposan dolgozunk, mint a saját termékünkön.'],
    ['Aki megírja,', 'az üzemelteti is.', 'Nálunk nincs külön csapat, amelyik átveszi a kódot a fejlesztőtől. Aki egy részt megír, az telepíti és figyeli, és őt keressük, ha valami elromlik. Ettől mindenki olyan kódot ír, amit később ő maga is szívesen javít.'],
    ['Az egyszerű megoldással', 'kezdünk.', 'Előbb azt építjük meg, ami a legkevesebb mozgó alkatrésszel működik, és csak akkor bonyolítjuk, ha a mérések szerint kell. Egy jól megírt lekérdezés sokszor többet ér egy új szolgáltatásnál.'],
    ['Minden', 'visszakereshető.', 'Az általunk épített rendszerek naplózzák, mi történt, mikor és miért. Ha valami elromlik vagy lelassul, a naplókból és a mérésekből kiderül, hol akadt el, és nem kell találgatni.'],
    ['Kis', 'csapat.', 'A megrendelő közvetlenül a fejlesztőkkel beszél, nincs köztünk több réteg. A kérdésekre így gyorsan jön válasz, olyantól, aki ismeri a rendszert.'],
    ['Élesben is', 'működnie kell.', 'Egy funkciót akkor tekintünk késznek, ha azt is megoldottuk, mi történik hibánál, forgalmi csúcsnál vagy lassulásnál. Az Intercept is így fut nap mint nap.']
  ];
  const ROM = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const CARD = ['c-blue', 'c-cyan', 'c-ink', 'c-lav', 'c-b7', 'c-blue'];
  const VIS = ['twin', 'loop', 'simple', 'log', 'direct', 'peak'];
  const LABEL = { twin: 'Ugyanaz a mérce', loop: 'Egy kézben', simple: 'Kevesebb mozgó alkatrész', log: 'Napló', direct: 'Közvetlen út', peak: 'Csúcsterhelés' };

  /* ---------- pixel icons ---------- */
  function iconCanvas(name) {
    const c = document.createElement('canvas'); c.width = c.height = 12;
    const x = c.getContext('2d');
    (ICONS[name] || []).forEach((row, y) => [...row].forEach((ch, i) => { if (ICOL[ch]) { x.fillStyle = ICOL[ch]; x.fillRect(i, y, 1, 1); } }));
    c.setAttribute('aria-hidden', 'true'); return c;
  }
  /* area tile: the same 5×5 pattern as the area's cube face, light cells on a deep shade of the area colour
     (the reference uses its product tile in tabs, cards and the menu) */
  function areaTile(i) {
    const L = (window.NA_CUBE_DATA || { LOOKS: [] }).LOOKS[i]; if (!L) return iconCanvas('code');
    const rgb = L.color.match(/\w\w/g).map(h => parseInt(h, 16)), mix = (t, to) => `rgb(${rgb.map(v => Math.round(v + (to - v) * t)).join(',')})`;
    const c = document.createElement('canvas'); c.width = c.height = 7; c.className = 'atile';
    const x = c.getContext('2d'), cells = L.pattern.replace(/\s+/g, '');
    x.fillStyle = mix(.42, 0); x.fillRect(0, 0, 7, 7);
    x.fillStyle = mix(.72, 255);
    for (let k = 0; k < 25; k++) if (cells[k] === '1') x.fillRect(1 + k % 5, 1 + Math.floor(k / 5), 1, 1);
    c.setAttribute('aria-hidden', 'true'); return c;
  }
  window.NA_areaTile = areaTile;
  $$('[data-nicon]').forEach(el => {
    const w = el.closest('[data-work]');
    el.appendChild(w ? areaTile(+w.dataset.work) : iconCanvas(el.dataset.nicon));
  });

  /* ---------- pixel wordmark (original mark + nestor + pixel ANALYTICS) ---------- */
  const G = {
    A: ['01110', '10001', '10001', '11111', '10001', '10001'], N: ['10001', '11001', '10101', '10011', '10001', '10001'],
    L: ['10000', '10000', '10000', '10000', '10000', '11111'], Y: ['10001', '10001', '01010', '00100', '00100', '00100'],
    T: ['11111', '00100', '00100', '00100', '00100', '00100'], I: ['111', '010', '010', '010', '010', '111'],
    C: ['01111', '10000', '10000', '10000', '10000', '01111'], S: ['01111', '10000', '01110', '00001', '00001', '11110']
  };
  const MARK = [], RING = [];
  for (let x = 0; x < 6; x++) RING.push([x, 0]); for (let y = 1; y < 6; y++) RING.push([5, y]);
  for (let x = 4; x >= 0; x--) RING.push([x, 5]); for (let y = 4; y > 0; y--) RING.push([0, y]);
  RING.forEach(([x, y]) => MARK.push([x, y, 1, 'ring'])); MARK.push([6, 6, 2, 'tail']); MARK.push([8, 5, 1, 'emit']);
  function cellsFor(word) {
    const out = []; let x = 0;
    for (const ch of word) { const g = G[ch]; g.forEach((row, y) => [...row].forEach((b, i) => { if (b === '1') out.push([x + i, y, 1]); })); x += g[0].length + 1; }
    return { cells: out, w: x - 1, h: 6 };
  }
  function drawCells(svg, cells, w, h) {
    cells.forEach(([x, y, s, c]) => {
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', x - .03); r.setAttribute('y', y - .03); r.setAttribute('width', s + .06); r.setAttribute('height', s + .06);
      if (c) r.classList.add(c); svg.appendChild(r);
    });
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }
  const AN = cellsFor('ANALYTICS');
  $$('.word').forEach(wd => { drawCells($('.pm', wd), MARK, 9, 8); drawCells($('.pa', wd), AN.cells, AN.w, AN.h); });
  const CL = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'], pickC = () => CL[Math.random() * CL.length | 0];
  const light = (r, ms) => { CL.forEach(c => r.classList.remove(c)); r.classList.add(pickC(), 'hot'); requestAnimationFrame(() => r.classList.remove('hot')); clearTimeout(r._t); r._t = setTimeout(() => CL.forEach(c => r.classList.remove(c)), ms); };
  function hoverLight(area, word) {
    const svgs = $$('svg', word);
    area.addEventListener('pointermove', e => {
      for (const svg of svgs) {
        const b = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, k = vb.width / b.width;
        if (e.clientX < b.left - 60 || e.clientX > b.right + 60 || e.clientY < b.top - 60 || e.clientY > b.bottom + 60) continue;
        const ux = (e.clientX - b.left) * k, uy = (e.clientY - b.top) * k;
        $$('rect:not(.tail)', svg).forEach(r => {
          const w = +r.getAttribute('width'), dx = +r.getAttribute('x') + w / 2 - ux, dy = +r.getAttribute('y') + w / 2 - uy, d2 = dx * dx + dy * dy;
          if (d2 < 7.5 && (d2 < 2.5 || Math.random() < .55)) light(r, 380 + Math.random() * 520);
        });
      }
    });
  }
  const giant = $('#giantWord');
  hoverLight($('.foot'), giant); hoverLight($('.brand'), $('.brand'));
  if (!RM) {
    const pool = $$('rect:not(.tail)', giant); let on = false;
    new IntersectionObserver(es => { on = es[0].isIntersecting; }).observe(giant);
    (function tick() { if (on && !document.hidden) { light(pool[Math.random() * pool.length | 0], 600); if (Math.random() < .35) light(pool[Math.random() * pool.length | 0], 600); } setTimeout(tick, 420 + Math.random() * 700); })();
  }

  /* header: see nav.js */
  window.NA_iconCanvas = iconCanvas;

  /* ---------- scenes ---------- */
  const S = window.ICScenes;
  let hero, cubes, booted = false;
  const picks = $$('.pick'), card = $('#heroCard'), tag = $('#hcTag'), timer = $('.pick-timer');
  const boot = () => {
    if (booted) return; booted = true;
    hero = window.ICHero($('#heroCanvas'), {
      onProgress(pv) { timer.style.transform = `scaleX(${pv})`; },
      onSelect(i) {
        timer.style.background = hero ? hero.colors[i].color === '#121213' ? '#121213' : hero.colors[i].color : '#3208EC';
        timer.style.transform = 'scaleX(0)';
        picks.forEach((p, j) => p.setAttribute('aria-selected', j === i));
        tag.textContent = HERO[i][0];
      },
      onCard(show, i) {
        if (show) { $('#hcTitle').textContent = HERO[i][0]; $('#hcText').textContent = HERO[i][1]; card.classList.remove('switching'); }
        else card.classList.add('switching');
      }
    });
    /* tab icons: 5×5 pixel tiles in the slide's dark and light shade, like the reference (1 = light cell) */
    picks.forEach((p, j) => {
      const c = hero.colors[j], cells = c.pattern.replace(/\s+/g, '');
      let r = '';
      for (let k = 0; k < 25; k++) r += `<rect x="${(k % 5) * 4}" y="${Math.floor(k / 5) * 4}" width="4.05" height="4.05" fill="${cells[k] === '1' ? c.light : c.dark}"/>`;
      $('.pick-ic', p).innerHTML = r;
      p.style.setProperty('--tb', c.tab);
    });
    cubes = window.NACubes($('#prodCanvas'), { onPick: i => setWork(i) });
    window.NABricks($('#ribbon'));
    requestAnimationFrame(() => document.body.classList.add('ready'));
  };
  document.fonts.ready.then(boot); setTimeout(boot, 1500);
  picks.forEach(p => p.addEventListener('click', () => hero && hero.select(+p.dataset.i)));
  card.addEventListener('pointerenter', () => hero && hero.pause(true));
  card.addEventListener('pointerleave', () => hero && hero.pause(false));

  /* ---------- development tabs ---------- */
  const ptabs = $('#ptabs'), pd = $('#pDetail');
  WORK.forEach(([t, , , , , ic], i) => {
    const b = document.createElement('button');
    b.className = 'ptab'; b.setAttribute('role', 'tab'); b.dataset.i = i;
    b.innerHTML = `<span><span class="n">${String(i + 1).padStart(2, '0')}</span>${t}</span><i></i>`;
    $('i', b).innerHTML = '<span class="adot"></span>'; $('i', b).appendChild(areaTile(i));
    b.addEventListener('click', () => setWork(i));
    ptabs.appendChild(b);
  });
  function setWork(i) {
    $$('.ptab', ptabs).forEach((t, j) => t.setAttribute('aria-selected', j === i));
    const [t, k, m, d, stack, ic] = WORK[i];
    $('#pdTitle').innerHTML = t.replace(/ -(\S+)/, ' <span class="nw">-$1</span>');   // keep '-fejlesztés' on one line with its hyphen
    const pi = $('#pdIcon'); pi.textContent = ''; pi.appendChild(areaTile(i));
    $('#pdText').textContent = d;
    $('#pdMeta').textContent = `${k} · ${m}`;
    $('#pdStack').innerHTML = stack.map(x => `<span>${x}</span>`).join('');
    pd.classList.remove('swap'); void pd.offsetWidth; pd.classList.add('swap');
    cubes && cubes.setProduct(i);
  }
  setWork(0);

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  $$('.rv').forEach(el => io.observe(el));

  /* ---------- statement: words light up with scroll ---------- */
  const rt = $('#revealText');
  const HOT = new Set(['Interceptet', 'éjjel-nappal.', 'magunk']);
  rt.innerHTML = rt.textContent.trim().split(/\s+/).map(w => `<span class="w${HOT.has(w) ? ' h' : ''}">${w}</span>`).join(' ');
  const words = $$('.w', rt);
  function revealWords() {
    const r = rt.getBoundingClientRect(), vh = innerHeight;
    const p = RM ? 1 : Math.max(0, Math.min(1, (vh * .82 - r.top) / (r.height + vh * .32)));
    const n = Math.round(p * words.length);
    words.forEach((w, i) => { w.classList.toggle('on', i < n); w.classList.toggle('hot', i < n && w.classList.contains('h')); });
  }
  addEventListener('scroll', revealWords, { passive: true }); revealWords();

  /* ---------- principles: tabbed like the reference "Outcomes" block ----------
     rail with tabs (click to switch, no autoplay) · ruled heading + text swap · panel fades in over 0.3 s.
     Every sentence on the cards is taken from the existing Nestor copy. */
  const PR = [
    { tab: 'Saját mérce', area: WORK[0][0], card: 0, rel: [0, 2, 1], link: ['Az Intercept', '#intercept'],
      intro: 'Az Intercept felülete és mobilappja is nálunk készül.',
      big: 'Az Interceptet is ugyanez a csapat építette és tartja karban, a forrásfigyeléstől a mobilappig.',
      metrics: [['Architektúra', 'Tervezés'], ['CI/CD', 'Fejlesztés']] },
    { tab: 'Felelősség', area: WORK[0][0], card: 6, rel: [1, 0, 4], link: ['Fejlesztés', '#megoldasok', 0],
      intro: 'Az egészet mi visszük, a tervezéstől az üzemeltetésig.',
      big: 'Az infrastruktúrát kódként kezeljük, a telepítés automatizált, és leállás nélkül frissítünk.',
      metrics: [['Infrastructure as code', 'DevOps'], ['Zero-downtime deploy', 'Frissítés']] },
    { tab: 'Egyszerűség', area: WORK[2][0], card: 2, rel: [2, 1, 3], link: ['Fejlesztés', '#megoldasok', 2],
      intro: 'Nyelvi modelleket építünk be éles rendszerekbe úgy, hogy a költség és a válaszidő kézben maradjon.',
      big: 'A modell cserélhető, a hívások költsége műveletenként mérhető, és a drága modell csak oda kerül, ahol tényleg szükség van rá.',
      metrics: [['Költségkontroll', 'LLM'], ['Modellfüggetlenség', 'LLM']] },
    { tab: 'Visszakereshetőség', area: WORK[3][0], card: 3, rel: [3, 1, 2], link: ['Fejlesztés', '#megoldasok', 3],
      intro: 'Saját monitorozást üzemeltetünk, így minden szolgáltatás állapota, sebessége és hibái egy helyen látszanak.',
      big: 'Új modellt vagy promptot csak akkor teszünk élesbe, ha valódi adaton jobbnak bizonyult a réginél.',
      metrics: [['Megfigyelhetőség', 'DevOps'], ['Kiértékelés', 'ML']] },
    { tab: 'Kis csapat', area: 'Tanácsadás', card: 4, rel: [0, 2, 4], link: ['Tanácsadás', '#tanacsadas'],
      intro: 'Egyórás egyeztetés valakivel a csapatból, aki ilyen rendszereket épít.',
      big: '1 munkanapon belül válaszolunk.',
      metrics: [['1 munkanapon belül', 'Válaszidő'], ['250 € / óra', 'Tanácsadás']] },
    { tab: 'Éles üzem', area: WORK[1][0], card: 1, rel: [1, 4, 0], link: ['Fejlesztés', '#megoldasok', 1],
      intro: 'Egy hibás feladat nem állítja meg a többit, és később újra lehet futtatni.',
      big: 'Üzenetsorokra épülő, aszinkron feldolgozórendszereket tervezünk, amelyek nagy forgalom mellett is kiszámíthatóan működnek.',
      metrics: [['Eseményvezérelt', 'Architektúra'], ['Idempotens', 'Feldolgozás']] }
  ];
  const CUBE_COL = ['#859DFE', '#3208EC', '#3CF2FF', '#E92CB3', '#FF9139', '#CBC3D5', '#A5E21F'];
  const CUBE_BG = ['#EBEFFF', '#E0E7FF', '#BEF4F6', '#FFDDF0', '#FFE1CF', '#EDEAF2', '#DEEFC8'];
  const LIGHT_CARD = new Set([0, 2, 4, 5, 6]);
  const ARROW = '<svg width="13" height="14" viewBox="0 0 13 14" aria-hidden="true"><path class="ap1" d="M10 7L5 2L5 7Z" fill="currentColor"/><path class="ap2" d="M10 7L5 7L5 12Z" fill="currentColor"/></svg>';
  /* one colour ramp per principle, taken from its card colour, so the drawing on the left and the card on the
     right read as one piece: deep (text, nodes), main, soft body, pale track, hot (the moving / flagged element) */
  const ramp = cc => {
    const hex = CUBE_COL[cc], light = LIGHT_CARD.has(cc), c = hex.match(/\w\w/g).map(h => parseInt(h, 16));
    const m = (t, to) => '#' + c.map(v => Math.round(v + (to - v) * t).toString(16).padStart(2, '0')).join('');
    return { deep: m(.7, 0), main: light ? m(.38, 0) : hex, soft: m(.45, 255), pale: m(.68, 255), track: m(.78, 255), hot: light ? hex : m(.4, 255), light };
  };
  const markSVG = () => { const r = []; RING.forEach(([x, y]) => r.push(`<rect x="${x}" y="${y}" width="1.04" height="1.04"/>`)); r.push('<rect x="6" y="6" width="2.04" height="2.04"/><rect class="emit" x="8" y="5" width="1.04" height="1.04"/>'); return `<svg class="pr-mark" viewBox="0 0 9 8" aria-hidden="true">${r.join('')}</svg>`; };
  const prTabs = $('#prTabs'), prContent = $('#prContent'), prHead = $('#prHead'), prText = $('#prText');
  PR.forEach((p, i) => {
    const [a, b, body] = P[i], cc = p.card, light = LIGHT_CARD.has(cc);
    prTabs.insertAdjacentHTML('beforeend', `<button type="button" class="pr-tab" role="tab" id="prt${i}" aria-controls="prp${i}" aria-selected="false" tabindex="-1"><span>${p.tab}</span><span class="pr-arrow">${ARROW}</span></button>`);
    const rel = p.rel.map(j => {
      const [t, k, m, , , ic] = WORK[j];
      return `<li><a class="pr-res" href="#megoldasok" data-work="${j}"><span class="pr-res-media" style="--rb:${CUBE_BG[j]}"><i data-res-icon="${ic}"></i></span><span class="pr-res-title">${t}</span><span class="pr-res-meta">${k} · ${m}</span></a></li>`;
    }).join('');
    prContent.insertAdjacentHTML('beforeend', `
      <div class="pr-panel" role="tabpanel" id="prp${i}" aria-labelledby="prt${i}" hidden>
        <div class="pr-intro">
          <div class="pr-intro-head"><h3>${LABEL[VIS[i]]}</h3><span class="pr-num">${String(i + 1).padStart(2, '0')} / 06</span></div>
          <div class="pr-vis" data-pv="${VIS[i]}" data-cc="${cc}"><canvas></canvas></div>
          <p>${p.intro}</p>
        </div>
        <figure class="pr-quote">
          <figcaption class="pr-qhead"><span><b>Nestor Analytics</b>, <span>${p.area}</span></span><a class="pr-qlink" href="${p.link[1]}"${p.link[2] != null ? ` data-work="${p.link[2]}"` : ''}>${p.link[0]} <i class="tri" aria-hidden="true"></i></a></figcaption>
          <div class="pr-inner${light ? ' light' : ''}" style="--qc:${CUBE_COL[cc]};--qd:${ramp(cc).deep};--qt:${ramp(cc).pale}">
            <blockquote>${p.big}</blockquote>
            <div class="pr-bottom">
              <dl class="pr-metrics">${p.metrics.map(([v, l]) => `<div><dt>${l}</dt><dd>${v}</dd></div>`).join('')}</dl>
              ${markSVG()}
            </div>
          </div>
        </figure>
        <div class="pr-resources">
          <span class="eyebrow soft pr-res-eyebrow">Kapcsolódó fejlesztési területek</span>
          <ul class="pr-res-list">${rel}</ul>
        </div>
      </div>`);
    prContent.lastElementChild.dataset.head = `${a}\n${b}`;
    prContent.lastElementChild.dataset.text = body;
  });
  $$('[data-res-icon]', prContent).forEach(el => el.appendChild(areaTile(+el.closest('[data-work]').dataset.work)));
  let prActive = -1;
  function setPrinciple(i, focus) {
    if (i === prActive) return; prActive = i;
    $$('.pr-tab', prTabs).forEach((t, j) => { const on = j === i; t.classList.toggle('active', on); t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    $$('.pr-panel', prContent).forEach((p, j) => { p.hidden = j !== i; });
    const pnl = $(`#prp${i}`);
    prHead.textContent = pnl.dataset.head; prText.textContent = pnl.dataset.text;
    startVis($('.pr-vis', pnl));
  }
  $$('.pr-tab', prTabs).forEach((t, i) => t.addEventListener('click', () => setPrinciple(i)));
  prTabs.addEventListener('keydown', e => {
    const n = PR.length, map = { ArrowDown: (prActive + 1) % n, ArrowUp: (prActive + n - 1) % n, Home: 0, End: n - 1 };
    if (map[e.key] != null) { e.preventDefault(); setPrinciple(map[e.key], true); }
  });
  /* links that open a development area: select its tab and scroll there */
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-work]'); if (!a) return;
    setWork(+a.dataset.work);
  });

  /* principle illustrations: pixel drawings on a 8 px grid, running while visible */
  let C = { ink: '#121213', blue: '#3208EC', cyan: '#3CF2FF', b3: '#C2B5F9', b5: '#9984F6', g: '#CBC3D5', g2: '#E3DDEB', w: '#FFFFFF' };
  const DRAW = {
    twin(x, W, H, t) {
      const cs = 10, cols = 5, rows = 9, gx = W / 2;
      [W * .25, W * .75].forEach((cx, side) => {
        const x0 = Math.round(cx - cols * cs / 2), y0 = H - 34;
        const lvl = Math.floor((t * 2.2) % (rows + 4));
        for (let r = 0; r < Math.min(lvl, rows); r++) for (let c = 0; c < cols; c++) {
          x.fillStyle = r === lvl - 1 ? C.cyan : (r % 3 === 0 ? C.blue : C.b5);
          x.fillRect(x0 + c * cs, y0 - (r + 1) * cs, cs - 2, cs - 2);
        }
        x.fillStyle = C.ink; x.font = '400 10px "IBM Plex Mono"'; x.textAlign = 'center';
        x.fillText(side ? 'MEGRENDELŐ' : 'SAJÁT TERMÉK', cx, H - 12);
      });
      x.fillStyle = C.g; for (let y = 10; y < H - 30; y += 8) x.fillRect(gx, y, 1, 4);
    },
    loop(x, W, H, t) {
      const st = ['MEGÍRJA', 'TELEPÍTI', 'FIGYELI', 'JAVÍTJA'], cx = W / 2, cy = H / 2 - 6, rx = Math.min(W * (W < 500 ? .2 : .34), 130), ry = Math.min(H * .3, 90);
      const pts = [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]];
      const per = 96, pos = (t * 26) % (per * 4);
      for (let i = 0; i < 4; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % 4];
        for (let s = 0; s < per; s += 4) { const k = s / per; x.fillStyle = C.g; x.fillRect(Math.round(ax + (bx - ax) * k), Math.round(ay + (by - ay) * k), 3, 3); }
      }
      const seg = Math.floor(pos / per), k = (pos % per) / per, [ax, ay] = pts[seg], [bx, by] = pts[(seg + 1) % 4];
      for (let tr = 0; tr < 6; tr++) { const kk = Math.max(0, k - tr * .035); x.fillStyle = tr ? C.b5 : C.cyan; x.globalAlpha = 1 - tr * .15; x.fillRect(Math.round(ax + (bx - ax) * kk) - 4, Math.round(ay + (by - ay) * kk) - 4, 8, 8); }
      x.globalAlpha = 1;
      pts.forEach(([px, py], i) => {
        const on = i === seg || i === (seg + 1) % 4 && k > .92;
        x.fillStyle = on ? C.blue : C.ink; x.fillRect(px - 7, py - 7, 14, 14);
        x.font = '400 10px "IBM Plex Mono"'; x.textAlign = i === 1 ? 'left' : i === 3 ? 'right' : 'center';
        x.fillStyle = C.ink; x.fillText(st[i], px + (i === 1 ? 14 : i === 3 ? -14 : 0), py + (i === 0 ? -14 : i === 2 ? 24 : 4));
      });
      x.textAlign = 'center'; x.fillStyle = C.blue; x.font = '400 10px "IBM Plex Mono"'; x.fillText('UGYANAZ AZ EMBER', cx, cy + 4);
    },
    simple(x, W, H, t) {
      const ph = (t * .35) % 2, k = ph < 1 ? Math.min(1, ph * 1.4) : Math.max(0, 1 - (ph - 1) * 1.4), cs = 22;
      const many = [[.18, .25], [.38, .18], [.6, .26], [.82, .2], [.25, .55], [.5, .5], [.75, .58], [.35, .8], [.65, .82]];
      const few = [[.36, .5], [.64, .5]];
      many.forEach(([u, v], i) => {
        const tgt = few[i % 2], px = (u + (tgt[0] - u) * k) * W, py = (v + (tgt[1] - v) * k) * (H - 30);
        x.globalAlpha = i < 2 ? 1 : 1 - k * .92;
        x.fillStyle = i < 2 ? (i ? C.blue : C.ink) : C.b5; x.fillRect(Math.round(px - cs / 2), Math.round(py - cs / 2), cs, cs);
      });
      x.globalAlpha = 1;
      x.fillStyle = C.ink; x.font = '400 10px "IBM Plex Mono"'; x.textAlign = 'center';
      x.fillText(k > .6 ? '2 ALKATRÉSZ' : '9 ALKATRÉSZ', W / 2, H - 12);
      if (k > .6) { x.fillStyle = C.cyan; for (let px = W * .36 + 14; px < W * .64 - 14; px += 6) x.fillRect(Math.round(px), Math.round(.5 * (H - 30)) - 1, 3, 3); }
    },
    log(x, W, H, t) {
      const L = ['12:04:01  feladat beérkezett', '12:04:01  feldolgozás indul', '12:04:02  lekérdezés 38 ms', '12:04:02  válasz elküldve', '12:04:07  feladat beérkezett', '12:04:07  lekérdezés 2 410 ms', '12:04:09  időtúllépés: újrapróbálás', '12:04:10  sikeres', '12:04:12  feladat beérkezett', '12:04:12  válasz elküldve'];
      x.font = '400 11px "IBM Plex Mono"'; x.textAlign = 'left';
      const lh = 19, off = RM ? 0 : (t * 14) % (L.length * lh);
      for (let i = 0; i < L.length * 2; i++) {
        const y = 14 + i * lh - off; if (y < -lh || y > H) continue;
        const ln = L[i % L.length], hot = /2 410|időtúllépés/.test(ln);
        if (hot) { x.fillStyle = C.ink; x.fillRect(0, y - 4, W, lh - 2); x.fillStyle = C.cyan; } else x.fillStyle = C.ink;
        x.globalAlpha = hot ? 1 : .78; x.fillText(ln, 8, y + 9); x.globalAlpha = 1;
      }
    },
    direct(x, W, H, t) {
      const y = H / 2 - 10, ax = W * .16, bx = W * .84;
      ['RÉTEG', 'RÉTEG', 'RÉTEG'].forEach((s, i) => {
        const px = W * (.32 + i * .18); x.globalAlpha = .45; x.fillStyle = C.g; x.fillRect(px - 9, y - 9 - 34, 18, 18);
        x.globalAlpha = .6; x.fillStyle = C.ink; x.font = '400 8.5px "IBM Plex Mono"'; x.textAlign = 'center'; x.fillText(s, px, y - 52);
        x.strokeStyle = C.ink; x.lineWidth = 1.2; x.beginPath(); x.moveTo(px - 9, y - 43); x.lineTo(px + 9, y - 25); x.stroke();
      });
      x.globalAlpha = 1;
      for (let px = ax + 14; px < bx - 14; px += 6) { x.fillStyle = C.b3; x.fillRect(Math.round(px), Math.round(y) - 1, 3, 3); }
      const p1 = ((t * .45) % 1), p2 = ((t * .45 + .5) % 1);
      x.fillStyle = C.cyan; x.fillRect(Math.round(ax + (bx - ax) * p1) - 4, y - 4, 8, 8);
      x.fillStyle = C.blue; x.fillRect(Math.round(bx - (bx - ax) * p2) - 4, y - 4, 8, 8);
      [[ax, 'MEGRENDELŐ', C.ink], [bx, 'FEJLESZTŐ', C.blue]].forEach(([px, s, c]) => {
        x.fillStyle = c; x.fillRect(px - 12, y - 12, 24, 24);
        x.fillStyle = C.ink; x.font = '400 10px "IBM Plex Mono"'; x.textAlign = 'center'; x.fillText(s, px, y + 32);
      });
    },
    peak(x, W, H, t) {
      const n = 46, cw = (W - 16) / n, base = H - 30, cap = base - (H - 60) * .78;
      x.fillStyle = C.g; for (let px = 8; px < W - 8; px += 6) x.fillRect(Math.round(px), Math.round(cap), 3, 1);
      x.fillStyle = C.ink; x.font = '400 10px "IBM Plex Mono"'; x.textAlign = 'right'; x.fillText('KAPACITÁS', W - 8, cap - 6);
      for (let i = 0; i < n; i++) {
        const ph = (i + t * 6) % n, spike = Math.exp(-Math.pow((ph - 30) / 2.6, 2));
        const v = .18 + .1 * Math.sin(i * .9 + t) + .62 * spike, hgt = Math.round(v * (base - cap) / .95);
        const over = v > .8;
        x.fillStyle = over ? C.cyan : spike > .3 ? C.blue : C.b5;
        x.fillRect(Math.round(8 + i * cw), base - Math.min(hgt, base - cap + 6), Math.max(2, cw - 2), Math.min(hgt, base - cap + 6));
      }
      x.fillStyle = C.ink; x.textAlign = 'left'; x.fillText('FORGALOM', 8, H - 12);
      x.textAlign = 'right'; x.fillStyle = C.blue; x.fillText('SORBA ÁLL, NEM ÁLL LE', W - 8, H - 12);
    }
  };
  let visRun = null;
  function startVis(el) {
    if (visRun) visRun.stop = true;
    const kind = el.dataset.pv, cv = $('canvas', el), x = cv.getContext('2d');
    if (el.dataset.cc != null) { const R = ramp(+el.dataset.cc); C = { ink: R.deep, blue: R.main, cyan: R.hot, b3: R.pale, b5: R.soft, g: R.track, g2: R.track, w: '#FFFFFF' }; }
    const run = { stop: false }; visRun = run;
    let vis = true, W = 0, H = 0, dpr = 1; const t0 = performance.now();
    const fit = () => { const r = cv.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; };
    const ro = new ResizeObserver(fit); ro.observe(cv); fit();
    const io2 = new IntersectionObserver(es => { vis = es[0].isIntersecting; }, { rootMargin: '40px' }); io2.observe(el);
    let first = true;
    const frame = now => {
      if (run.stop) { ro.disconnect(); io2.disconnect(); return; }
      requestAnimationFrame(frame);
      if ((!vis || document.hidden) && !first) return; first = false;
      if (!W) fit();
      const t = RM ? 1.2 : (now - t0) / 1000;
      x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
      DRAW[kind](x, W, H, t);
    };
    requestAnimationFrame(frame);
  }
  setPrinciple(0);

  /* ---------- "és még sokan mások" pixel field ---------- */
  (function () {
    const f = $('.pfield'); if (!f) return;
    const ROWS = 7; let cells = [];
    function build() {
      const tile = f.parentElement, txt = $('.mtxt', tile);
      const narrow = innerWidth <= 820;
      const avail = narrow ? tile.clientWidth - 32 : tile.clientWidth - 48 - txt.offsetWidth - 24;
      const rows = narrow ? 5 : Math.max(4, Math.min(ROWS, Math.floor((tile.clientHeight - 24 + 4) / 10)));
      const cols = Math.max(8, Math.floor((avail + 4) / 10));
      f.style.gridTemplateColumns = `repeat(${cols},6px)`; f.textContent = ''; cells = [];
      let seed = 7; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < cols * rows; i++) { const c = document.createElement('i'); const v = R(); c.className = v < .6 ? '' : v < .85 ? 't1' : v < .97 ? 't2' : 't3'; f.appendChild(c); cells.push(c); }
    }
    build(); let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(build, 150); });
    if (RM) return;
    let vis = false; new IntersectionObserver(e => { vis = e[0].isIntersecting; }).observe(f);
    (function tick() { if (vis && !document.hidden && cells.length) { const c = cells[Math.random() * cells.length | 0], k = Math.random() < .25 ? 'sig' : 'on'; c.classList.add(k); setTimeout(() => c.classList.remove(k), 700); } setTimeout(tick, 300 + Math.random() * 600); })();
  })();

  /* ---------- consulting: wandering strands converge into one line (pixel SVG) ---------- */
  (function () {
    const svg = $('.route'); if (!svg) return;
    const W = 34, H = 15, MID = 7, SPLIT = 20;
    const strands = [{ a: 5.5, f: .33, p: 0, c: 't1' }, { a: 4.5, f: .41, p: 2.2, c: 't2' }, { a: 6, f: .27, p: 4.4, c: '' }];
    let t = 0, dot = 0;
    const put = (x, y, c) => { const r = document.createElementNS(NS, 'rect'); r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', 1.02); r.setAttribute('height', 1.02); if (c) r.setAttribute('class', c); svg.appendChild(r); };
    function draw() {
      svg.textContent = '';
      strands.forEach(st => { for (let x = 0; x < SPLIT; x++) { const k = Math.pow(1 - x / SPLIT, 1.25); const y = Math.round(MID + st.a * k * Math.sin(st.f * x + st.p + t)); put(x, Math.max(0, Math.min(H - 1, y)), st.c); } });
      for (let x = SPLIT; x < W - 1; x++) put(x, MID, 'ln');
      [[W - 1, MID], [W - 2, MID - 1], [W - 2, MID + 1], [W - 3, MID - 2], [W - 3, MID + 2]].forEach(([x, y]) => put(x, y, 'ln'));
      if (!RM) put(SPLIT + (dot % (W - 1 - SPLIT)), MID, 'dot');
    }
    draw(); if (!RM) setInterval(() => { if (document.hidden) return; t += .12; dot++; draw(); }, 140);
  })();

  /* ---------- Intercept block: tile field on Blue ---------- */
  (function () {
    const cv = $('.ix-field'); if (!cv) return;
    const ctx = cv.getContext('2d'), T = 20, GP = 2, SZ = T + GP; let w, h, cols, rows, seed = [], t = 0, dpr = 1;
    function size() { const r = cv.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); w = r.width; h = r.height; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); cols = Math.ceil(w / SZ) + 1; rows = Math.ceil(h / SZ) + 1; seed = []; for (let i = 0; i < cols * rows; i++) seed.push(Math.random() * 6.28); }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const p = seed[y * cols + x];
        const a = .03 + .05 * (.5 + .5 * Math.sin(x * .18 + y * .11 + t * .6)) + .04 * (.5 + .5 * Math.sin(p + t * .9));
        const hot = x > cols * .72 && y > rows * .38 && y < rows * .52 && Math.sin(p * 3 + t * .5) > .93;
        ctx.fillStyle = hot ? 'rgba(60,242,255,.85)' : `rgba(255,255,255,${a.toFixed(3)})`;
        ctx.fillRect(x * SZ, y * SZ, T, T);
      }
    }
    new ResizeObserver(() => { size(); draw(); }).observe(cv); size(); draw();
    if (RM) return;
    let vis = false; new IntersectionObserver(e => { vis = e[0].isIntersecting; }).observe(cv);
    let last = 0; (function loop(ts) { requestAnimationFrame(loop); if (!vis || ts - last < 60) return; last = ts; t += .03; draw(); })(0);
  })();

  /* ---------- statement: fit the type so the rag stays tight (reference look, left-aligned) ----------
     Hungarian has long words (adatfeldolgozást, mobilalkalmazást) that leave deep gaps at a fixed size, so on
     desktop the size is searched within ±15 % of 3.4vw for the smallest worst-line gap, allowing at most one
     hyphen in words of 12+ letters. Phones keep the CSS size. */
  (function fitStatement() {
    const p = document.getElementById('revealText'); if (!p) return;
    const gaps = () => {
      const R = p.getBoundingClientRect(), r = document.createRange(); r.selectNodeContents(p);
      const rows = {}; [...r.getClientRects()].forEach(c => { const k = Math.round(c.top); rows[k] = Math.max(rows[k] || 0, c.right); });
      return Object.values(rows).map(x => R.right - x);
    };
    const hyphens = () => [...p.querySelectorAll('.w')].filter(w => w.getClientRects().length > 1).length;
    let lastW = 0;
    function fit() {
      const vw = innerWidth; if (vw === lastW) return; lastW = vw;
      if (vw < 821) { p.style.fontSize = ''; return; }
      const base = Math.min(64, vw * .034); let best = [Infinity, base];
      for (let f = base * .85; f <= Math.min(66, base * 1.15); f += .25) {
        p.style.fontSize = f + 'px';
        const g = gaps(), fill = 1 - g[g.length - 1] / p.getBoundingClientRect().width;
        if (fill < .3 || g.length > 6) continue;                     // no one-word last line, no tall block
        const score = Math.max(...g.slice(0, -1)) / f + .6 * hyphens();
        if (score < best[0]) best = [score, f];
      }
      p.style.fontSize = best[1].toFixed(2) + 'px';
    }
    let t = 0;
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(fit);
    addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fit, 120); });
  })();
})();
