/* Metamorphosis: a line-drawn caterpillar that becomes a butterfly as the
   essay is read. Its stage follows the reader's position in the essay's own
   chapters (not raw page percentage), and the same value tints the page
   atmosphere. On wide screens it lives in the right margin; on narrow ones it
   sits in the reader bar. It is decorative and never covers the text. */
(function () {
  'use strict';

  /* ===== Configuration: edit stages, timing and colours here ===== */
  var CONFIG = {
    // Where the reading line (a point down the viewport) maps to transformation
    // progress s. Selectors are essay landmarks; s runs 0 → 1.
    anchors: [
      { at: '#question', edge: 'top', s: 0.00 },
      { at: '#metamorphosis .metamorph:not([hidden]), #metamorphosis .mscene', edge: 'top', s: 0.22 },
      { at: '#metamorphosis', edge: 'bottom', s: 0.30 },
      { at: '#flesh', edge: 'top', s: 0.38 },
      { at: '#looking-back', edge: 'top', s: 0.50 },
      { at: '#simpler', edge: 'top', s: 0.60 },
      { at: '#improving', edge: 'top', s: 0.64 },
      { at: '.question', edge: 'top', s: 0.76 },
      { at: '#reversal', edge: 'top', s: 0.85 },
      { at: '.coda', edge: 'top', s: 1.00 }
    ],
    readingLine: 0.55,           // fraction of viewport height used as "where I am reading"
    stages: {                    // s ranges for each phase of the animation
      climb: [0.24, 0.38],       // caterpillar climbs and hangs in a J
      pupate: [0.38, 0.60],      // chrysalis forms around it
      emerge: [0.62, 0.84],      // chrysalis clears, wings unfold
      imago: 0.85                // butterfly takes flight
    },
    captions: [                  // shown under the creature in the margin
      { from: 0.00, text: 'larva' },
      { from: 0.30, text: 'the chrysalis' },
      { from: 0.62, text: 'emerging' },
      { from: 0.85, text: 'imago' }
    ],
    colors: {
      larva: '#a9c79a',
      silk: 'rgba(217, 220, 239, 0.45)',
      chrysalis: '#8fd0b5',
      gold: '#e8c27a',
      wing: '#c9b6ff',
      wingEdge: '#e6defc',
      teal: '#7fe3e0',
      amber: '#f2c68c'
    },
    flight: {
      loopSeconds: 70,           // one slow circuit of the margin
      flyFor: [7, 11],           // seconds of flight between pauses
      hoverFor: [2.5, 4.5],      // seconds spent hovering
      takeoffSeconds: 3.5,       // ease from the chrysalis into the flight path
      flapHz: 2.1,               // wingbeats per second in flight
      hoverFlapHz: 0.7
    },
    laneMinWidth: 1100,          // below this viewport width, dock into the reader bar
    stageScale: 1.75
  };

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var C = CONFIG.colors;
  var root = document.documentElement;
  var main = document.querySelector('main');
  var hero = document.querySelector('.hero');
  if (!main) return;

  /* ----- maths helpers ----- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function range(s, r) { return clamp((s - r[0]) / (r[1] - r[0]), 0, 1); }
  function rand(r) { return r[0] + Math.random() * (r[1] - r[0]); }
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  /* ----- build the drawing ----- */
  var wrap = document.createElement('div');
  wrap.className = 'metamorphosis';
  wrap.setAttribute('aria-hidden', 'true');
  var svg = el('svg', { class: 'mm-svg', focusable: 'false' });
  wrap.appendChild(svg);
  var caption = document.createElement('p');
  caption.className = 'mm-caption';
  wrap.appendChild(caption);

  var defs = el('defs', {}, svg);
  var g1 = el('linearGradient', { id: 'mm-chrysalis', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  el('stop', { offset: 0, 'stop-color': C.chrysalis, 'stop-opacity': 0.55 }, g1);
  el('stop', { offset: 1, 'stop-color': C.gold, 'stop-opacity': 0.25 }, g1);
  var g2 = el('linearGradient', { id: 'mm-wing', x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
  el('stop', { offset: 0, 'stop-color': C.teal, 'stop-opacity': 0.55 }, g2);
  el('stop', { offset: 0.6, 'stop-color': C.wing, 'stop-opacity': 0.45 }, g2);
  el('stop', { offset: 1, 'stop-color': C.amber, 'stop-opacity': 0.35 }, g2);
  var g3 = el('radialGradient', { id: 'mm-glow' }, defs);
  el('stop', { offset: 0, 'stop-color': C.wing, 'stop-opacity': 0.55 }, g3);
  el('stop', { offset: 1, 'stop-color': C.wing, 'stop-opacity': 0 }, g3);

  // stage: the 120 × 160 space where the caterpillar lives and pupates
  var stage = el('g', { class: 'mm-stage' }, svg);
  var silk = el('line', { x1: 60, y1: 6, x2: 60, y2: 34, stroke: C.silk, 'stroke-width': 0.8, pathLength: 1, 'stroke-dasharray': 1 }, stage);
  var glow = el('circle', { cx: 60, cy: 64, r: 38, fill: 'url(#mm-glow)', opacity: 0 }, stage);
  var chrysalis = el('g', {}, stage);
  var shell = el('path', {
    d: 'M60 30 C 75 40, 79 64, 70 86 C 66 95, 62 99, 60 102 C 58 99, 54 95, 50 86 C 41 64, 45 40, 60 30 Z',
    fill: 'url(#mm-chrysalis)', 'fill-opacity': 0, stroke: C.chrysalis, 'stroke-width': 1.1,
    pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1, 'stroke-linejoin': 'round'
  }, chrysalis);
  var crown = el('path', { d: 'M51 48 Q60 52 69 48', fill: 'none', stroke: C.gold, 'stroke-width': 0.9, opacity: 0 }, chrysalis);
  var dots = [52.5, 60, 67.5].map(function (x, i) {
    return el('circle', { cx: x, cy: i === 1 ? 51.6 : 50.4, r: 1.1, fill: C.gold, opacity: 0 }, chrysalis);
  });

  var SEG = 8;
  var segs = [];
  var body = el('g', { fill: 'rgba(169, 199, 154, 0.08)', stroke: C.larva, 'stroke-width': 1.1 }, stage);
  for (var i = SEG - 1; i >= 0; i--) segs[i] = el('circle', { r: 4 }, body);
  var antL = el('path', { fill: 'none', stroke: C.larva, 'stroke-width': 0.9, 'stroke-linecap': 'round' }, body);
  var antR = el('path', { fill: 'none', stroke: C.larva, 'stroke-width': 0.9, 'stroke-linecap': 'round' }, body);

  // butterfly: drawn around its own origin, facing up
  var fly = el('g', { class: 'mm-fly', opacity: 0 }, svg);
  var flyInner = el('g', {}, fly);
  function wing(side) {
    var w = el('g', {}, flyInner);
    var inner = el('g', { transform: 'scale(' + side + ',1)' }, w);
    var attrs = { fill: 'url(#mm-wing)', stroke: C.wingEdge, 'stroke-width': 0.8, 'stroke-linejoin': 'round' };
    // forewing: long and swept back; hindwing: rounder, with a short trailing lobe
    el('path', Object.assign({ d: 'M1 -2 C 5 -15, 19 -29, 35 -26 C 40 -24, 37 -12, 29 -5 C 22 0, 10 1, 1 1 Z' }, attrs), inner);
    el('path', Object.assign({ d: 'M1 3 C 11 2, 23 6, 24 15 C 25 22, 19 27, 13 24 C 11 28, 8 29, 7 26 C 4 20, 2 12, 1 6 Z' }, attrs), inner);
    el('path', { d: 'M2 -1 C 12 -11, 24 -21, 32 -23 M3 0 C 13 -4, 23 -9, 30 -9 M2 4 C 10 7, 18 12, 21 18', fill: 'none', stroke: C.wingEdge, 'stroke-width': 0.45, opacity: 0.55 }, inner);
    el('circle', { cx: 31, cy: -21, r: 1.5, fill: C.amber, opacity: 0.9 }, inner);
    el('circle', { cx: 18, cy: 19, r: 1.1, fill: C.teal, opacity: 0.8 }, inner);
    return w;
  }
  var wingL = wing(-1), wingR = wing(1);
  el('path', { d: 'M0 -9 C 1.6 -4, 1.6 8, 0 13 C -1.6 8, -1.6 -4, 0 -9 Z', fill: C.wingEdge, opacity: 0.9 }, flyInner);
  el('path', { d: 'M-0.6 -9 C -2 -14, -4 -18, -6 -21 M0.6 -9 C 2 -14, 4 -18, 6 -21', fill: 'none', stroke: C.wingEdge, 'stroke-width': 0.6, 'stroke-linecap': 'round' }, flyInner);

  document.body.appendChild(wrap);

  /* ----- geometry of the caterpillar through its stages ----- */
  var LINE_Y = 122;
  function larvaPoint(i, phase) {
    // a slow inchworm wave that travels from tail to head as the page scrolls
    var lift = Math.max(0, Math.sin(phase - i * 0.75));
    return { x: 92 - i * 8.6 + lift * 1.2, y: LINE_Y - lift * 4.2 };
  }
  function hangPoint(i) {
    var k = SEG - 1 - i;                     // 0 at the tail, which holds the silk
    if (k <= 5) return { x: 60, y: 34 + k * 8.6 };
    return k === 6 ? { x: 64.5, y: 85 } : { x: 71, y: 80 };
  }
  function radius(i) { return i === 0 ? 5.6 : 5.2 - i * 0.22; }

  /* ----- reading progress → s ----- */
  var anchorTops = [];
  function measure() {
    anchorTops = CONFIG.anchors.map(function (a) {
      var n = document.querySelector(a.at);
      if (!n) return null;
      var r = n.getBoundingClientRect();
      return { y: window.scrollY + (a.edge === 'bottom' ? r.bottom : r.top), s: a.s };
    }).filter(Boolean);
  }
  function progress() {
    var y = window.scrollY + window.innerHeight * CONFIG.readingLine;
    var a = anchorTops;
    if (!a.length) return 0;
    if (y <= a[0].y) return a[0].s;
    for (var i = 1; i < a.length; i++) {
      if (y < a[i].y) return lerp(a[i - 1].s, a[i].s, (y - a[i - 1].y) / Math.max(1, a[i].y - a[i - 1].y));
    }
    return a[a.length - 1].s;
  }
  function quantize(s) {
    // reduced motion: three still frames instead of a continuous morph
    if (s < CONFIG.stages.climb[0]) return 0.1;
    if (s < CONFIG.stages.imago) return CONFIG.stages.pupate[1];
    return 1;
  }

  /* ----- atmosphere shares the same progress ----- */
  var atmo = { earth: -1, dusk: -1, dawn: -1 };
  function setAtmo(s) {
    var v = {
      earth: 1 - smooth((s - 0.25) / 0.3),
      dusk: smooth((s - 0.25) / 0.25) * (1 - smooth((s - 0.7) / 0.2)),
      dawn: smooth((s - 0.65) / 0.3)
    };
    for (var k in v) {
      if (Math.abs(v[k] - atmo[k]) > 0.01) { atmo[k] = v[k]; root.style.setProperty('--atmo-' + k, v[k].toFixed(3)); }
    }
  }

  /* ----- layout: margin lane or docked in the reader bar ----- */
  var mode = '', lane = { x: 0, y: 0, w: 0, h: 0 }, anchor = { x: 0, y: 0 };
  var slot = document.querySelector('.rb-creature');
  var laneMQ = window.matchMedia('(min-width: ' + CONFIG.laneMinWidth + 'px)');
  function layout() {
    var wantLane = laneMQ.matches || !slot;
    var next = wantLane ? 'lane' : 'docked';
    if (next !== mode) {
      mode = next;
      wrap.dataset.mode = mode;
      (mode === 'lane' ? document.body : slot).appendChild(wrap);
    }
    if (mode === 'lane') {
      var col = document.querySelector('.chapter');
      var colRight = col ? col.getBoundingClientRect().right : window.innerWidth * 0.75;
      var x0 = colRight + 24, x1 = window.innerWidth - 24;
      lane = { x: x0, y: 0, w: Math.max(120, x1 - x0), h: window.innerHeight };
      wrap.style.left = lane.x + 'px';
      wrap.style.width = lane.w + 'px';
      svg.setAttribute('viewBox', '0 0 ' + lane.w + ' ' + lane.h);
      anchor = { x: lane.w / 2, y: lane.h * 0.46 };
      var k = Math.min(CONFIG.stageScale, lane.w / 120);
      stage.setAttribute('transform', 'translate(' + (anchor.x - 60 * k) + ',' + (anchor.y - 70 * k) + ') scale(' + k + ')');
      stage.k = k;
    } else {
      stage.setAttribute('transform', '');
      stage.k = 1;
      anchor = { x: 60, y: 64 };
    }
  }

  /* ----- flight along a slow loop inside the margin lane ----- */
  var flight = { u: 0.0, mix: 0, hovering: false, until: 0, heading: 0, flap: 0, last: 0 };
  function pathPoint(u) {
    // a closed loop of four cubic curves in lane-relative coordinates
    var P = [
      [0.50, 0.40], [0.80, 0.30], [0.86, 0.12], [0.60, 0.16],
      [0.30, 0.20], [0.14, 0.40], [0.26, 0.58],
      [0.40, 0.76], [0.80, 0.82], [0.76, 0.62],
      [0.72, 0.50], [0.30, 0.46], [0.50, 0.40]
    ];
    u = ((u % 1) + 1) % 1;
    var seg = Math.floor(u * 4), t = u * 4 - seg, b = seg * 3;
    var p0 = P[b], p1 = P[b + 1], p2 = P[b + 2], p3 = P[b + 3], mt = 1 - t;
    var x = mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0];
    var y = mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1];
    var pad = 34;
    return { x: pad + x * (lane.w - pad * 2), y: lane.h * 0.12 + y * lane.h * 0.72 };
  }

  /* ----- avoid sitting over wide text that leaves the column ----- */
  var avoid = Array.prototype.slice.call(document.querySelectorAll('.coda .words, .question, .hero > div'));
  function overText(px, py) {
    if (mode !== 'lane') return false;
    var X = lane.x + px, Y = py;
    for (var i = 0; i < avoid.length; i++) {
      var r = avoid[i].getBoundingClientRect();
      if (X > r.left - 40 && X < r.right + 40 && Y > r.top - 40 && Y < r.bottom + 40) return true;
    }
    return false;
  }

  /* ----- render one frame ----- */
  var lastS = -1, captionText = '';
  function render(now) {
    var s = progress();
    if (reduced) s = quantize(s);
    setAtmo(s);

    var visible = window.scrollY > (hero ? hero.offsetTop + hero.offsetHeight * 0.75 : 0);
    var st = CONFIG.stages;
    var t1 = smooth(range(s, st.climb));
    var t2 = smooth(range(s, st.pupate));
    var t3 = smooth(range(s, st.emerge));
    var imago = s >= st.imago;

    // caterpillar
    var phase = reduced ? 1.2 : window.scrollY * 0.016; // the caterpillar inches along only when the reader scrolls
    var cx = 0, cy = 0;
    for (var i = 0; i < SEG; i++) {
      var a = larvaPoint(i, phase), b = hangPoint(i);
      var x = lerp(a.x, b.x, t1), y = lerp(a.y, b.y, t1);
      // pupating: the body draws in toward the centre of the shell
      x = lerp(x, 60, t2 * 0.7); y = lerp(y, 64, t2 * 0.55);
      segs[i].setAttribute('cx', x.toFixed(2));
      segs[i].setAttribute('cy', y.toFixed(2));
      segs[i].setAttribute('r', (radius(i) * (1 - 0.45 * t2)).toFixed(2));
      if (i === 0) { cx = x; cy = y; }
    }
    antL.setAttribute('d', 'M' + (cx + 1.5).toFixed(2) + ' ' + (cy - 4.5).toFixed(2) + ' q 1.5 -5 5.5 -7');
    antR.setAttribute('d', 'M' + (cx + 4).toFixed(2) + ' ' + (cy - 2.5).toFixed(2) + ' q 3.5 -3 8 -3.5');
    body.setAttribute('opacity', (1 - smooth((t2 - 0.35) / 0.65)).toFixed(3));
    silk.setAttribute('stroke-dashoffset', (1 - t1).toFixed(3));
    silk.setAttribute('opacity', (1 - t3).toFixed(3));

    // chrysalis
    shell.setAttribute('stroke-dashoffset', (1 - t2).toFixed(3));
    shell.setAttribute('fill-opacity', (t2 * 0.9 * (1 - t3 * 0.6)).toFixed(3));
    var gold = smooth((t2 - 0.75) / 0.25) * (1 - t3);
    crown.setAttribute('opacity', gold.toFixed(3));
    dots.forEach(function (d) { d.setAttribute('opacity', gold.toFixed(3)); });
    chrysalis.setAttribute('opacity', (1 - smooth((t3 - 0.45) / 0.55)).toFixed(3));
    glow.setAttribute('opacity', (Math.sin(Math.PI * t3) * 0.9).toFixed(3));

    // butterfly: unfolds out of the shell, then flies
    var bornScale = lerp(0.35, 1, smooth((t3 - 0.3) / 0.5));
    var open = smooth((t3 - 0.55) / 0.45);
    var flyOpacity = smooth((t3 - 0.3) / 0.3);
    var k = stage.k || 1;
    var home = { x: anchor.x, y: anchor.y - (mode === 'lane' ? 6 * k : 2) };

    var dt = flight.last ? Math.min(0.05, (now - flight.last) / 1000) : 0;
    flight.last = now;
    var canFly = imago && mode === 'lane' && !reduced;
    flight.mix = clamp(flight.mix + (canFly ? dt : -dt * 1.5) / CONFIG.flight.takeoffSeconds, 0, 1);
    if (imago && !reduced && now > flight.until) {
      flight.hovering = !flight.hovering;
      flight.until = now + 1000 * rand(flight.hovering ? CONFIG.flight.hoverFor : CONFIG.flight.flyFor);
    }
    if (canFly) {
      {
      }
      var speed = flight.hovering ? 0 : 1 / CONFIG.flight.loopSeconds;
      flight.v = lerp(flight.v || 0, speed, Math.min(1, dt * 1.2));
      flight.u += flight.v * dt * smooth(flight.mix);
    }
    var p = pathPoint(flight.u);
    var m = smooth(flight.mix);
    var bob = flight.hovering && !reduced ? Math.sin(now / 900) * 2.5 * m : 0;
    var fx = lerp(home.x, p.x, m), fy = lerp(home.y, p.y, m) + bob;

    // face the direction of travel, but never tip over
    if (canFly && flight.prev) {
      var dx = fx - flight.prev.x, dy = fy - flight.prev.y;
      if (dx * dx + dy * dy > 0.0004) {
        var target = clamp(Math.atan2(dx, -dy) * 180 / Math.PI, -35, 35);
        flight.heading = lerp(flight.heading, target, Math.min(1, dt * 2));
      }
    } else {
      flight.heading = lerp(flight.heading, 0, Math.min(1, dt * 2 || 1));
    }
    flight.prev = { x: fx, y: fy };

    // in flight the wings beat; while hovering (or resting in the bar) they barely move
    var hz = flight.hovering ? CONFIG.flight.hoverFlapHz : CONFIG.flight.flapHz;
    flight.flap += dt * hz * Math.PI * 2;
    var depth = flight.hovering ? 0.25 : 0.65;
    var beat = reduced || !imago ? 1 : 1 - depth + depth * Math.abs(Math.cos(flight.flap));
    var spread = Math.max(0.08, open * beat);
    wingL.setAttribute('transform', 'scale(' + spread.toFixed(3) + ',1)');
    wingR.setAttribute('transform', 'scale(' + spread.toFixed(3) + ',1)');
    var size = (mode === 'lane' ? 0.8 * k : 0.85) * bornScale;
    fly.setAttribute('transform', 'translate(' + fx.toFixed(1) + ',' + fy.toFixed(1) + ') rotate(' + flight.heading.toFixed(1) + ') scale(' + size.toFixed(3) + ')');
    fly.setAttribute('opacity', flyOpacity.toFixed(3));

    // docked: keep whatever is on stage framed inside the small slot
    if (mode === 'docked') {
      var box = t3 > 0.3 ? { x: 24, y: 28, w: 72, h: 72 } : (t1 < 0.5 ? { x: 22, y: 100, w: 78, h: 34 } : { x: 34, y: 2, w: 52, h: 104 });
      svg.setAttribute('viewBox', box.x + ' ' + box.y + ' ' + box.w + ' ' + box.h);
    }

    // caption (lane only)
    var text = '';
    CONFIG.captions.forEach(function (c) { if (s >= c.from) text = c.text; });
    if (text !== captionText) { captionText = text; caption.textContent = text; }
    caption.style.opacity = mode === 'lane' ? (1 - m) * 0.9 : 0;
    caption.style.top = (anchor.y + 70 * k) + 'px';

    var dim = overText(fx, fy) ? 0.12 : 1;
    wrap.style.opacity = visible ? dim : 0;
    wrap.dataset.visible = String(visible);
    lastS = s;
    return canFly || flight.mix > 0 || (imago && !reduced); // keep animating while the butterfly is alive
  }

  /* ----- loop: run on scroll, and continuously only while the butterfly flies or flaps ----- */
  var raf = 0;
  function frame(now) {
    raf = 0;
    var alive = render(now);
    if (alive && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  layout(); measure(); kick();
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', function () { layout(); measure(); kick(); });
  if (laneMQ.addEventListener) laneMQ.addEventListener('change', function () { layout(); kick(); });
  document.addEventListener('visibilitychange', kick);
  window.addEventListener('load', function () { measure(); kick(); });
  // fonts and lazy images shift the landmarks once they arrive
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); kick(); });
  Array.prototype.forEach.call(document.images, function (img) { if (!img.complete) img.addEventListener('load', function () { measure(); kick(); }); });
})();
