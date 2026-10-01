/* The living metamorphosis in chapter III. When the drawing scrolls into view a
   caterpillar crawls along a twig, hangs, forms a chrysalis and emerges as a
   butterfly. The butterfly then leaves the drawing, flies a slow loop around
   the page and lands back where it emerged. Readers with reduced motion (or no
   JavaScript) keep the original still drawing. */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var still = document.querySelector('#metamorphosis .metamorph');
  if (!still) return;

  /* ===== Configuration ===== */
  var T = {                      // one cycle, in seconds; the scene loops on its own
    crawl: [0, 3.2],
    hang: [3.2, 4.0],
    pupate: [4.0, 5.2],
    ripen: [5.2, 5.8],           // chrysalis turns clear and the wings show through
    emerge: [5.8, 7.0],          // shell splits, wings pump open
    fly: [7.2, 9.4],             // a lap around the page and back to the same spot
    fade: [9.7, 10.0],           // the scene dims before it starts again
    cycle: 10
  };
  var COLORS = {
    twig: '#5d5a6e', leaf: 'rgba(118, 156, 112, 0.35)',
    bodyLight: '#c5ddb0', bodyDark: '#6e9a6c', band: 'rgba(40, 52, 44, 0.55)', head: '#262a33',
    jade: '#86c9a9', jadeDark: '#4d8c75', gold: '#e8c27a',
    wingA: '#7fe3e0', wingB: '#b9a4ff', wingC: '#f2c68c', vein: '#1c1d38', edge: '#f4f2ff'
  };
  var VB = { w: 600, h: 240 };
  var N = 11, SPACING = 10.5, R = 7.2;
  var HANG_X = 372;

  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { t = clamp(t, 0, 1); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function phase(t, r) { return clamp((t - r[0]) / (r[1] - r[0]), 0, 1); }
  function twigY(x) { return 74 + 5 * Math.sin(x / 95) + 2 * Math.sin(x / 31); }

  /* ----- butterfly drawing, shared by the scene and the flyer ----- */
  var uid = 0;
  function butterfly(parent) {
    var id = 'bf' + (++uid);
    var defs = el('defs', {}, parent);
    var gw = el('linearGradient', { id: id + 'w', x1: 0, y1: 1, x2: 1, y2: 0 }, defs);
    el('stop', { offset: 0, 'stop-color': COLORS.wingA }, gw);
    el('stop', { offset: 0.55, 'stop-color': COLORS.wingB }, gw);
    el('stop', { offset: 1, 'stop-color': COLORS.wingC }, gw);
    var g = el('g', {}, parent);
    function wing(side) {
      var w = el('g', {}, g);
      var s = el('g', { transform: 'scale(' + side + ',1)' }, w);
      // forewing: dark border with a row of pale spots, coloured cells, dark veins
      el('path', { d: 'M1 -2 C 6 -17, 20 -31, 37 -28 C 43 -26, 41 -14, 33 -6 C 25 1, 11 2, 1 1 Z', fill: COLORS.vein }, s);
      el('path', { d: 'M3 -3 C 8 -15, 20 -26, 33 -24 C 37 -22, 35 -14, 29 -8 C 22 -2, 11 -1, 3 -1 Z', fill: 'url(#' + id + 'w)', opacity: 0.95 }, s);
      el('path', { d: 'M3 -2 C 12 -11, 22 -19, 32 -22 M4 -1 C 13 -6, 22 -10, 31 -11 M5 0 C 13 -2, 20 -4, 27 -4', fill: 'none', stroke: COLORS.vein, 'stroke-width': 0.9, opacity: 0.8 }, s);
      [[36, -24], [38, -18], [35, -11], [31, -6]].forEach(function (p) { el('circle', { cx: p[0], cy: p[1], r: 0.9, fill: COLORS.edge, opacity: 0.85 }, s); });
      // hindwing
      el('path', { d: 'M1 3 C 12 1, 25 5, 26 15 C 27 23, 20 28, 13 25 C 9 28, 5 27, 4 22 C 2 15, 1 9, 1 4 Z', fill: COLORS.vein }, s);
      el('path', { d: 'M3 4 C 12 3, 22 7, 23 15 C 23 21, 18 24, 13 22 C 9 24, 6 22, 5 19 C 4 13, 3 8, 3 5 Z', fill: 'url(#' + id + 'w)', opacity: 0.85 }, s);
      el('path', { d: 'M3 5 C 10 9, 16 14, 19 20 M3 6 C 7 11, 9 16, 10 22', fill: 'none', stroke: COLORS.vein, 'stroke-width': 0.8, opacity: 0.75 }, s);
      [[24, 18], [20, 24], [14, 26]].forEach(function (p) { el('circle', { cx: p[0], cy: p[1], r: 0.8, fill: COLORS.edge, opacity: 0.8 }, s); });
      return w;
    }
    var L = wing(-1), Rw = wing(1);
    el('ellipse', { cx: 0, cy: 2, rx: 1.9, ry: 11, fill: '#2a2c3d' }, g);
    el('ellipse', { cx: 0, cy: -9.5, rx: 2.2, ry: 2.2, fill: '#2a2c3d' }, g);
    el('path', { d: 'M-1 -11 C -3 -17, -6 -21, -8 -24 M1 -11 C 3 -17, 6 -21, 8 -24', fill: 'none', stroke: '#2a2c3d', 'stroke-width': 0.8, 'stroke-linecap': 'round' }, g);
    el('circle', { cx: -8, cy: -24, r: 1.1, fill: COLORS.edge }, g);
    el('circle', { cx: 8, cy: -24, r: 1.1, fill: COLORS.edge }, g);
    return { g: g, L: L, R: Rw, set: function (open) { var s = 'scale(' + Math.max(0.04, open).toFixed(3) + ',1)'; L.setAttribute('transform', s); Rw.setAttribute('transform', s); } };
  }

  /* ----- build the scene ----- */
  var wrap = document.createElement('figure');
  wrap.className = 'mscene';
  wrap.setAttribute('aria-label', 'A caterpillar crawls along a twig, becomes a chrysalis, and emerges as a butterfly');
  var svg = el('svg', { viewBox: '0 0 ' + VB.w + ' ' + VB.h, role: 'img', 'aria-hidden': 'true' });
  wrap.appendChild(svg);

  var defs = el('defs', {}, svg);
  var gb = el('radialGradient', { id: 'ms-body', cx: 0.4, cy: 0.35, r: 0.7 }, defs);
  el('stop', { offset: 0, 'stop-color': COLORS.bodyLight }, gb);
  el('stop', { offset: 1, 'stop-color': COLORS.bodyDark }, gb);
  var gj = el('linearGradient', { id: 'ms-jade', x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
  el('stop', { offset: 0, 'stop-color': COLORS.jade }, gj);
  el('stop', { offset: 1, 'stop-color': COLORS.jadeDark }, gj);
  var gg = el('radialGradient', { id: 'ms-glow' }, defs);
  el('stop', { offset: 0, 'stop-color': COLORS.wingB, 'stop-opacity': 0.5 }, gg);
  el('stop', { offset: 1, 'stop-color': COLORS.wingB, 'stop-opacity': 0 }, gg);

  // twig and leaves
  var d = 'M8 ' + twigY(8).toFixed(1);
  for (var x = 20; x <= 592; x += 12) d += ' L' + x + ' ' + twigY(x).toFixed(1);
  el('path', { d: d, fill: 'none', stroke: COLORS.twig, 'stroke-width': 3.2, 'stroke-linecap': 'round' }, svg);
  el('path', { d: 'M520 ' + twigY(520).toFixed(1) + ' q 18 -30 52 -34 q -8 30 -52 34 Z', fill: COLORS.leaf, stroke: 'rgba(169,199,154,0.5)', 'stroke-width': 0.8 }, svg);
  el('path', { d: 'M96 ' + twigY(96).toFixed(1) + ' q -10 -26 -44 -30 q 6 30 44 30 Z', fill: COLORS.leaf, stroke: 'rgba(169,199,154,0.5)', 'stroke-width': 0.8 }, svg);

  var glow = el('circle', { cx: HANG_X, cy: twigY(HANG_X) + 46, r: 60, fill: 'url(#ms-glow)', opacity: 0 }, svg);

  // chrysalis
  var hy = twigY(HANG_X);
  var pupa = el('g', { transform: 'translate(' + HANG_X + ',' + (hy + 4) + ')' }, svg);
  var pupaInner = el('g', {}, pupa);
  el('line', { x1: 0, y1: -3, x2: 0, y2: 3, stroke: '#3b3a45', 'stroke-width': 2 }, pupaInner);
  var clip = el('clipPath', { id: 'ms-clip' }, defs);
  var clipRect = el('rect', { x: -30, y: 80, width: 60, height: 0 }, clip);
  var shellG = el('g', { 'clip-path': 'url(#ms-clip)' }, pupaInner);
  var SHELL = 'M0 3 C 15 9, 21 33, 15 55 C 11 67, 5 73, 0 75 C -5 73, -11 67, -15 55 C -21 33, -15 9, 0 3 Z';
  var shell = el('path', { d: SHELL, fill: 'url(#ms-jade)', stroke: '#a7e0c4', 'stroke-width': 0.8 }, shellG);
  var inside = el('g', { opacity: 0 }, shellG);   // wings seen through the ripe chrysalis
  el('path', { d: 'M-1 12 C -12 22, -13 44, -4 60 L -1 30 Z', fill: COLORS.wingB, opacity: 0.8 }, inside);
  el('path', { d: 'M1 12 C 12 22, 13 44, 4 60 L 1 30 Z', fill: COLORS.wingC, opacity: 0.7 }, inside);
  var goldG = el('g', {}, shellG);
  el('path', { d: 'M-12 24 Q 0 29 12 24', fill: 'none', stroke: COLORS.gold, 'stroke-width': 1.3 }, goldG);
  [[-9, 27.5], [-3, 29], [3, 29], [9, 27.5], [-5, 63], [5, 63], [0, 8]].forEach(function (p) { el('circle', { cx: p[0], cy: p[1], r: 1.2, fill: COLORS.gold }, goldG); });
  var husk = el('path', { d: SHELL, fill: 'rgba(200, 220, 210, 0.08)', stroke: 'rgba(200, 220, 210, 0.4)', 'stroke-width': 0.8, 'stroke-dasharray': '3 2', opacity: 0 }, pupaInner);

  // caterpillar: body segments, legs, head
  var cat = el('g', {}, svg);
  var legs = el('g', { stroke: '#2b3030', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, cat);
  var legEls = [], segEls = [], bandEls = [], dotEls = [];
  for (var i = 0; i < N; i++) legEls.push(el('line', {}, legs));
  for (i = 0; i < N; i++) {
    var sg = el('g', {}, cat);
    segEls.push(el('circle', { r: i === N - 1 ? R + 0.6 : R - (i < 2 ? (2 - i) * 1.1 : 0), fill: i === N - 1 ? COLORS.head : 'url(#ms-body)' }, sg));
    bandEls.push(el('path', { fill: 'none', stroke: COLORS.band, 'stroke-width': 1.4, 'stroke-linecap': 'round' }, sg));
    dotEls.push(el('circle', { r: 0.9, fill: '#f4f2ff', opacity: 0.85 }, sg));
  }
  var antennae = el('path', { fill: 'none', stroke: '#2b3030', 'stroke-width': 1.2, 'stroke-linecap': 'round' }, cat);
  var eye = el('circle', { r: 1.1, fill: '#f4f2ff', opacity: 0.8 }, cat);

  // butterfly inside the scene (emerging and resting)
  var bfHome = { x: HANG_X, y: hy + 112 };
  var sceneBf = butterfly(el('g', { transform: 'translate(' + bfHome.x + ',' + bfHome.y + ')', opacity: 0 }, svg));
  var sceneBfWrap = sceneBf.g.parentNode;

  still.setAttribute('hidden', '');
  still.style.display = 'none';   // SVG ignores the hidden attribute without a stylesheet rule
  still.parentNode.insertBefore(wrap, still.nextSibling);

  /* ----- the flyer: a page-level copy of the butterfly for the flight ----- */
  var flyer = document.createElement('div');
  flyer.className = 'mscene-flyer';
  flyer.setAttribute('aria-hidden', 'true');
  var fsvg = el('svg', { viewBox: '-46 -46 92 92' });
  flyer.appendChild(fsvg);
  var flyBf = butterfly(fsvg);
  document.body.appendChild(flyer);

  /* ----- caterpillar geometry ----- */
  var STRIDE = 22, CYCLE = 0.6, MOVE = 0.42;   // a step every CYCLE seconds; each segment moves for MOVE of it
  var START_X = 150;
  function crawlPose(t) {
    // the classic travelling wave: the tail lifts first and the hump rolls forward to the head
    var pts = [];
    var w = (CYCLE - MOVE * CYCLE) / (N - 1);
    for (var i = 0; i < N; i++) {
      var local = t - i * w;
      var steps = Math.max(0, Math.floor(local / CYCLE));
      var u = local < 0 ? 0 : clamp((local - steps * CYCLE) / (MOVE * CYCLE), 0, 1);
      var x = START_X + i * SPACING + STRIDE * (steps + ease(u));
      var lift = Math.sin(Math.PI * u) * 7;
      var y = twigY(x) - R - 1.2 - lift;
      pts.push({ x: x, y: y, lift: lift });
    }
    return pts;
  }
  function hangPose() {
    var pts = [], y0 = hy + 6;
    for (var i = 0; i < N; i++) {
      if (i < 8) pts.push({ x: HANG_X + Math.sin(i * 0.4) * 1.5, y: y0 + i * SPACING * 0.95, lift: 0 });
    }
    pts.push({ x: HANG_X + 6, y: y0 + 8 * SPACING * 0.95 + 3, lift: 0 });
    pts.push({ x: HANG_X + 14, y: y0 + 8 * SPACING * 0.95 - 1, lift: 0 });
    pts.push({ x: HANG_X + 19, y: y0 + 8 * SPACING * 0.95 - 9, lift: 0 });
    return pts;
  }
  var crawlEnd = null;

  function drawCaterpillar(pts, shrink, alpha) {
    cat.setAttribute('opacity', alpha.toFixed(3));
    for (var i = 0; i < N; i++) {
      var p = pts[i];
      var c = segEls[i];
      c.setAttribute('cx', p.x.toFixed(2));
      c.setAttribute('cy', p.y.toFixed(2));
      var r0 = parseFloat(c.getAttribute('r0') || c.getAttribute('r'));
      if (!c.getAttribute('r0')) c.setAttribute('r0', r0);
      var r = r0 * shrink;
      c.setAttribute('r', r.toFixed(2));
      if (i < N - 1) {
        // a dark band across each segment and a pale breathing pore on its side
        var n = pts[i + 1], ang = Math.atan2(n.y - p.y, n.x - p.x) + Math.PI / 2;
        var bx = Math.cos(ang) * r * 0.85, by = Math.sin(ang) * r * 0.85;
        bandEls[i].setAttribute('d', 'M' + (p.x - bx).toFixed(2) + ' ' + (p.y - by).toFixed(2) + ' L' + (p.x + bx * 0.2).toFixed(2) + ' ' + (p.y + by * 0.2).toFixed(2));
        dotEls[i].setAttribute('cx', (p.x + bx * 0.45).toFixed(2));
        dotEls[i].setAttribute('cy', (p.y + by * 0.45).toFixed(2));
      } else {
        bandEls[i].setAttribute('d', '');
        dotEls[i].setAttribute('opacity', 0);
      }
      // true legs behind the head, prolegs along the back half; they grip the twig while crawling
      var hasLeg = i <= 4 || (i >= N - 4 && i < N - 1);
      var L = legEls[i];
      if (hasLeg && shrink > 0.7) {
        var gripY = twigY(p.x) - 1;
        var footY = Math.min(gripY, p.y + r + 3);
        L.setAttribute('x1', p.x.toFixed(2)); L.setAttribute('y1', (p.y + r * 0.6).toFixed(2));
        L.setAttribute('x2', (p.x + (i >= N - 4 ? 1.5 : 0)).toFixed(2)); L.setAttribute('y2', footY.toFixed(2));
        L.setAttribute('opacity', crawlEnd ? 0 : 1);
      } else L.setAttribute('opacity', 0);
    }
    var h = pts[N - 1], prev = pts[N - 2];
    var dir = Math.atan2(h.y - prev.y, h.x - prev.x);
    var ax = Math.cos(dir), ay = Math.sin(dir), nx = -ay, ny = ax;
    var tipx = h.x + ax * 9, tipy = h.y + ay * 9;
    antennae.setAttribute('d', 'M' + (h.x + ax * 4 - nx * 4).toFixed(2) + ' ' + (h.y + ay * 4 - ny * 4).toFixed(2) + ' Q ' + (tipx - nx * 7).toFixed(2) + ' ' + (tipy - ny * 7).toFixed(2) + ' ' + (tipx - nx * 10 + ax * 4).toFixed(2) + ' ' + (tipy - ny * 10 + ay * 4).toFixed(2) +
      ' M' + (h.x + ax * 5 - nx * 2).toFixed(2) + ' ' + (h.y + ay * 5 - ny * 2).toFixed(2) + ' Q ' + (tipx + ax * 3 - nx * 3).toFixed(2) + ' ' + (tipy + ay * 3 - ny * 3).toFixed(2) + ' ' + (tipx + ax * 7 - nx * 5).toFixed(2) + ' ' + (tipy + ay * 7 - ny * 5).toFixed(2));
    antennae.setAttribute('stroke-width', (1.2 * shrink).toFixed(2));
    eye.setAttribute('cx', (h.x + ax * 3 - nx * 2).toFixed(2));
    eye.setAttribute('cy', (h.y + ay * 3 - ny * 2).toFixed(2));
    eye.setAttribute('opacity', (0.8 * shrink).toFixed(2));
  }

  /* ----- timeline ----- */
  var state = 'idle', t0 = 0, raf = 0, flight = null;

  function renderScene(t) {
    // crawl → hang
    if (t < T.hang[0]) {
      crawlEnd = null;
      drawCaterpillar(crawlPose(t - T.crawl[0]), 1, 1);
    } else if (t < T.pupate[1]) {
      if (!crawlEnd) crawlEnd = crawlPose(T.hang[0]);
      var h = phase(t, T.hang), target = hangPose();
      var pts = crawlEnd.map(function (p, i) {
        var k = ease(clamp(h * 1.4 - (i / N) * 0.4, 0, 1)); // the tail anchors first
        return { x: lerp(p.x, target[i].x, k), y: lerp(p.y, target[i].y, k) };
      });
      var pu = phase(t, T.pupate);
      if (pu > 0) {
        var cx = HANG_X, cy = hy + 44;
        pts = pts.map(function (p) { return { x: lerp(p.x, cx, pu * 0.6), y: lerp(p.y, cy, pu * 0.45) }; });
      }
      drawCaterpillar(pts, 1 - pu * 0.35, 1 - ease((pu - 0.55) / 0.45));
    } else {
      cat.setAttribute('opacity', 0);
    }

    // chrysalis grows up from the bottom while it wriggles, then ripens
    var pu2 = phase(t, T.pupate), rp = phase(t, T.ripen), em = phase(t, T.emerge);
    clipRect.setAttribute('y', (78 - 80 * ease(pu2)).toFixed(2));
    clipRect.setAttribute('height', (80 * ease(pu2) + 2).toFixed(2));
    var wiggle = pu2 > 0 && pu2 < 1 ? Math.sin(t * 9) * 5 * Math.sin(Math.PI * pu2) : 0;
    pupaInner.setAttribute('transform', 'rotate(' + wiggle.toFixed(2) + ')');
    shell.setAttribute('fill-opacity', (1 - rp * 0.65).toFixed(3));
    inside.setAttribute('opacity', (rp * 0.9 * (1 - em)).toFixed(3));
    goldG.setAttribute('opacity', (1 - rp * 0.7).toFixed(3));
    shellG.setAttribute('opacity', (1 - ease((em - 0.1) / 0.4)).toFixed(3));
    husk.setAttribute('opacity', (ease((em - 0.1) / 0.4) * 0.9).toFixed(3));
    glow.setAttribute('opacity', (Math.sin(Math.PI * clamp((t - T.ripen[0]) / (T.emerge[1] - T.ripen[0]), 0, 1)) * 0.8).toFixed(3));

    // the butterfly unfolds below its empty case, pumping its wings open
    if (state !== 'flying' && state !== 'resting') {
      var born = ease((em - 0.2) / 0.5);
      var pump = em < 1 ? 0.15 + 0.85 * ease((em - 0.45) / 0.55) * (0.7 + 0.3 * Math.sin(t * 3)) : restOpen(t);
      sceneBf.set(pump);
      sceneBfWrap.setAttribute('opacity', born.toFixed(3));
      sceneBfWrap.setAttribute('transform', 'translate(' + bfHome.x + ',' + (bfHome.y - 6 * (1 - born)) + ') scale(' + (0.35 + 0.65 * born).toFixed(3) + ')');
    }
  }
  function restOpen(t) {
    // at rest a butterfly opens and closes its wings slowly every few seconds
    var c = (t % 4.2) / 4.2;
    return c < 0.25 ? lerp(1, 0.25, ease(c / 0.25)) : c < 0.5 ? lerp(0.25, 1, ease((c - 0.25) / 0.25)) : 1;
  }

  /* ----- flight around the page ----- */
  function homeOnScreen() {
    var m = svg.getScreenCTM();
    if (!m) return { x: -100, y: -100, s: 1 };
    var pt = svg.createSVGPoint(); pt.x = bfHome.x; pt.y = bfHome.y;
    var p = pt.matrixTransform(m);
    return { x: p.x, y: p.y, s: m.a };
  }
  function catmull(p0, p1, p2, p3, t) {
    var t2 = t * t, t3 = t2 * t;
    return {
      x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
    };
  }
  function startFlight() {
    var vw = window.innerWidth, vh = window.innerHeight, h = homeOnScreen();
    var side = h.x > vw / 2 ? -1 : 1;
    var frac = [[0.5 + 0.32 * side, 0.24], [0.5 + 0.1 * side, 0.78], [0.5 - 0.34 * side, 0.5], [0.5 - 0.05 * side, 0.16]];
    flight = {
      from: h, heading: 0, flap: 0, last: performance.now(), prev: null, scrollY0: window.scrollY,
      way: frac.map(function (f) { return { x: f[0] * vw, y: f[1] * vh }; })
    };
    state = 'flying';
    sceneBfWrap.setAttribute('opacity', 0);
    flyer.style.opacity = 1;
  }
  function flightFrame(now, u) {
    var f = flight, dt = Math.min(0.05, (now - f.last) / 1000); f.last = now;
    var h = homeOnScreen();
    // waypoints are screen positions; the start and the landing spot move with the page
    var dy = window.scrollY - f.scrollY0;
    var pts = [{ x: f.from.x, y: f.from.y - dy }].concat(f.way, [h]);
    var segs = pts.length - 1;
    var x = u * segs, i = Math.min(segs - 1, Math.floor(x)), t = x - i;
    var p = catmull(pts[Math.max(0, i - 1)], pts[i], pts[i + 1], pts[Math.min(segs, i + 2)], t);
    if (f.prev) {
      var vx = p.x - f.prev.x, vy = p.y - f.prev.y;
      if (vx * vx + vy * vy > 0.01) f.heading = lerp(f.heading, clamp(Math.atan2(vx, -vy) * 180 / Math.PI, -70, 70), Math.min(1, dt * 4));
    }
    f.prev = p;
    var nearHome = clamp((1 - u) / 0.08, 0, 1);
    f.flap += dt * 6 * Math.PI * 2;
    flyBf.set(lerp(1, 0.2 + 0.8 * Math.abs(Math.cos(f.flap)), nearHome));
    // the flyer is a little larger mid-flight, as if closer to the reader
    var s = h.s * (1 + 0.25 * Math.sin(Math.PI * u));
    flyer.style.transform = 'translate(' + (p.x - 46).toFixed(1) + 'px,' + (p.y - 46).toFixed(1) + 'px) rotate(' + (f.heading * nearHome).toFixed(1) + 'deg) scale(' + s.toFixed(3) + ')';
  }
  function land() {
    state = 'resting';
    flyer.style.opacity = 0;
    sceneBfWrap.setAttribute('opacity', 1);
    sceneBfWrap.setAttribute('transform', 'translate(' + bfHome.x + ',' + bfHome.y + ')');
  }

  /* ----- loop: crawl, pupate, emerge, fly a lap, land, fade, again ----- */
  function loop(now) {
    raf = 0;
    var t = (now - t0) / 1000;
    if (t >= T.cycle) { t0 += T.cycle * 1000; t -= T.cycle; state = 'playing'; flyer.style.opacity = 0; }
    if (t < T.fly[0]) {
      state = 'playing';
      renderScene(Math.min(t, T.emerge[1]));
    } else if (t < T.fly[1]) {
      if (state !== 'flying') { renderScene(T.emerge[1]); startFlight(); }
      // eased so it lifts off and settles gently
      flightFrame(now, ease(phase(t, T.fly)));
    } else {
      if (state !== 'resting') land();
      sceneBf.set(restOpen(t - T.fly[1]));
    }
    var fadeIn = clamp(t / 0.3, 0, 1), fadeOut = 1 - phase(t, T.fade);
    svg.style.opacity = Math.min(fadeIn, fadeOut).toFixed(3);
    if (!document.hidden && (visible || state === 'flying')) raf = requestAnimationFrame(loop);
    else pausedAt = now;
  }
  function resume() {
    if (raf || state === 'idle') return;
    t0 += performance.now() - pausedAt;
    raf = requestAnimationFrame(loop);
  }

  renderScene(0);
  var visible = false, pausedAt = 0;
  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    if (visible && state === 'idle') { state = 'playing'; t0 = performance.now(); raf = requestAnimationFrame(loop); }
    else if (visible) resume();
    // off screen it holds still (unless the butterfly is mid-flight) and picks up where it left off
  }, { threshold: 0.6 }).observe(wrap);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && visible) resume(); });
})();
