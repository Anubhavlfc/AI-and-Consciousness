/* Section reveals: blocks of the essay fade up as they enter the viewport.
   Paragraph-level only, never word by word. Anything already on screen at
   load is shown at once, and nothing is hidden without IntersectionObserver. */
(function () {
  'use strict';
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var SELECTOR = [
    '.chapter > *',
    '.chapter .progression .ladder-wrap',
    'figure.plate',
    '.question'
  ].join(',');

  var blocks = Array.prototype.filter.call(document.querySelectorAll(SELECTOR), function (el) {
    return !el.classList.contains('progression'); // its ladder reveals on its own
  });
  var vh = window.innerHeight;
  var pending = blocks.filter(function (el) { return el.getBoundingClientRect().top > vh * 0.92; });
  if (!pending.length) return;

  document.documentElement.classList.add('xp-reveal');
  blocks.forEach(function (el) {
    el.classList.add('rv');
    if (pending.indexOf(el) === -1) el.classList.add('is-in');
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
  pending.forEach(function (el) { io.observe(el); });

  // a jump far down the page (contents link, shared #anchor) should not leave
  // blocks above the landing point waiting for a scroll that never comes
  window.addEventListener('hashchange', function () {
    pending.forEach(function (el) {
      if (el.getBoundingClientRect().bottom < 0) { el.classList.add('is-in'); io.unobserve(el); }
    });
  });
})();

/* The Bridge: once the ape-to-robot transformation has played, offer to play it again. */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var fig = document.querySelector('.bridge-fig');
  var btn = fig && fig.querySelector('.bf-replay');
  if (!btn) return;
  var root = document.documentElement, timer, armed = false;
  var DURATION = 12500; // matches --bf-robot + --bf-morph + the label fade in reading.css

  function arm() {
    btn.hidden = true;
    clearTimeout(timer);
    timer = setTimeout(function () { btn.hidden = false; }, DURATION);
  }
  function check() {
    if (!armed && root.classList.contains('xp-reveal') && fig.classList.contains('is-in')) { armed = true; arm(); }
  }
  // no staged reveal on this load (figure was already on screen): it shows complete, so offer a play
  if (!root.classList.contains('xp-reveal')) btn.hidden = false;
  new MutationObserver(check).observe(fig, { attributes: true, attributeFilter: ['class'] });
  check();

  btn.addEventListener('click', function () {
    root.classList.add('xp-reveal');
    fig.classList.remove('is-in');
    void fig.offsetWidth; // restart the CSS animations
    fig.classList.add('is-in');
    arm();
  });
})();
