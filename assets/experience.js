/* Reading experience layer: starfield, reader bar, share sheet, quote sharing.
   Everything here is progressive enhancement; pages read fine without it. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('xp-js');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var ICONS = {
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.5h4V21H3V9.5Zm6.5 0h3.8v1.6h.06c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.77 2.65 4.77 6.1V21h-4v-5.2c0-1.24-.02-2.84-1.73-2.84-1.73 0-2 1.35-2 2.75V21h-4V9.5Z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>'
  };

  /* ---------- starfield ---------- */
  function starfield(canvas) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var stars = [], w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2), running = false, raf = 0;
    function resize() {
      var r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.round(Math.min(220, (w * h) / 5200));
      stars = [];
      for (var i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w, y: Math.random() * h,
          r: Math.random() < 0.08 ? 1.2 + Math.random() * 0.8 : 0.3 + Math.random() * 0.8,
          a: 0.25 + Math.random() * 0.6,
          tw: 0.4 + Math.random() * 1.6, ph: Math.random() * Math.PI * 2,
          vy: -(0.02 + Math.random() * 0.06),
          hue: Math.random() < 0.25 ? '185,164,255' : (Math.random() < 0.3 ? '127,227,224' : '235,236,255')
        });
      }
      draw(0);
    }
    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var alpha = reduced ? s.a : s.a * (0.55 + 0.45 * Math.sin(t / 1000 * s.tw + s.ph));
        if (!reduced) { s.y += s.vy; if (s.y < -2) { s.y = h + 2; s.x = Math.random() * w; } }
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + s.hue + ',' + alpha.toFixed(3) + ')';
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.r > 1.2) {
          ctx.fillStyle = 'rgba(' + s.hue + ',' + (alpha * 0.15).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    function loop(t) { draw(t); if (running) raf = requestAnimationFrame(loop); }
    resize();
    window.addEventListener('resize', resize);
    if (reduced || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (entries) {
      var vis = entries[0].isIntersecting;
      if (vis && !running) { running = true; raf = requestAnimationFrame(loop); }
      else if (!vis) { running = false; cancelAnimationFrame(raf); }
    }).observe(canvas);
  }
  Array.prototype.forEach.call(document.querySelectorAll('canvas.stars'), starfield);

  /* ---------- toast ---------- */
  var toastTimer;
  function toast(msg) {
    var el = document.querySelector('.xp-toast');
    if (el) el.remove();
    el = document.createElement('div');
    el.className = 'xp-toast'; el.setAttribute('role', 'status'); el.textContent = msg;
    document.body.appendChild(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.remove(); }, 2200);
  }

  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    }
    return Promise.resolve(false);
  }

  /* ---------- share sheet ---------- */
  var sheet = null, sheetOpener = null;
  function closeSheet() {
    if (!sheet) return;
    sheet.remove(); sheet = null;
    if (sheetOpener) { sheetOpener.setAttribute('aria-expanded', 'false'); sheetOpener.focus(); }
    sheetOpener = null;
  }
  function pageUrl(hash) { return location.href.split('#')[0] + (hash ? '#' + hash : ''); }
  function share(opener, opts) {
    var url = pageUrl(opts.hash);
    var title = document.title;
    var text = opts.quote ? '“' + opts.quote + '” (' + title + ')' : title;
    if (navigator.share && window.matchMedia('(hover: none)').matches) {
      navigator.share({ title: title, text: text, url: url }).catch(function () {});
      return;
    }
    if (sheet) { var same = sheetOpener === opener; closeSheet(); if (same) return; }
    sheet = document.createElement('div');
    sheet.className = 'xp-sheet'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', 'Share');
    var enc = encodeURIComponent;
    sheet.innerHTML =
      (opts.quote ? '<p>“' + opts.quote.replace(/</g, '&lt;') + '”</p>' : '') +
      '<button type="button" data-act="copy">' + ICONS.link + (opts.quote ? 'Copy quote and link' : 'Copy link') + '</button>' +
      '<a href="https://x.com/intent/post?text=' + enc(text) + '&url=' + enc(url) + '" target="_blank" rel="noopener">' + ICONS.x + 'Post on X</a>' +
      '<a href="https://www.linkedin.com/sharing/share-offsite/?url=' + enc(url) + '" target="_blank" rel="noopener">' + ICONS.linkedin + 'Share on LinkedIn</a>' +
      '<a href="mailto:?subject=' + enc(title) + '&body=' + enc(text + '\n\n' + url) + '">' + ICONS.mail + 'Send by email</a>';
    document.body.appendChild(sheet);
    var r = opener.getBoundingClientRect();
    if (!opener.closest('.readerbar')) {
      var top = Math.min(r.bottom + 8, window.innerHeight - sheet.offsetHeight - 16);
      if (r.bottom + sheet.offsetHeight + 24 > window.innerHeight) top = Math.max(16, r.top - sheet.offsetHeight - 8);
      sheet.style.top = top + 'px';
      sheet.style.left = Math.max(16, Math.min(r.left + r.width / 2 - sheet.offsetWidth / 2, window.innerWidth - sheet.offsetWidth - 16)) + 'px';
      sheet.style.right = 'auto';
    }
    sheetOpener = opener; opener.setAttribute('aria-expanded', 'true');
    sheet.querySelector('[data-act="copy"]').addEventListener('click', function () {
      copy(opts.quote ? text + '\n' + url : url).then(function (ok) {
        closeSheet(); toast(ok ? (opts.quote ? 'Quote copied' : 'Link copied') : url);
      });
    });
    sheet.querySelector('button, a').focus();
  }
  document.addEventListener('click', function (e) {
    if (sheet && !sheet.contains(e.target) && !(sheetOpener && sheetOpener.contains(e.target))) closeSheet();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeSheet(); closeToc(); } });
  window.addEventListener('scroll', function () { if (sheet && sheetOpener && !sheetOpener.closest('.readerbar')) closeSheet(); }, { passive: true });

  Array.prototype.forEach.call(document.querySelectorAll('[data-share]'), function (btn) {
    btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', function () { share(btn, {}); });
  });

  /* ---------- quote sharing ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.pull'), function (q) {
    var section = q.closest('section[id]');
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'xp-quote';
    b.innerHTML = ICONS.share + 'Share this line';
    b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-expanded', 'false');
    b.addEventListener('click', function () {
      share(b, { quote: q.querySelector('p').textContent.trim(), hash: section ? section.id : '' });
    });
    q.appendChild(b);
  });

  /* ---------- paintings settle as they arrive ---------- */
  var plates = document.querySelectorAll('figure.plate, .coda');
  if ('IntersectionObserver' in window) {
    var po = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('xp-in'); po.unobserve(en.target); } });
    }, { threshold: 0.2 });
    Array.prototype.forEach.call(plates, function (p) { po.observe(p); });
  } else {
    Array.prototype.forEach.call(plates, function (p) { p.classList.add('xp-in'); });
  }

  /* ---------- reader bar ---------- */
  var bar = document.getElementById('readerbar');
  var toc = document.getElementById('rb-toc');
  var chapterBtn = bar && bar.querySelector('.rb-chapter');
  function closeToc() {
    if (!toc || toc.hidden) return;
    toc.hidden = true; chapterBtn.setAttribute('aria-expanded', 'false');
  }
  if (!bar) return;

  var hero = document.querySelector('.hero');
  var main = document.querySelector('main');
  var fill = bar.querySelector('.rb-progress span');
  var numEl = bar.querySelector('.rb-num');
  var titleEl = bar.querySelector('.rb-title');
  var leftEl = bar.querySelector('.rb-left');
  var words = (main.textContent.match(/\S+/g) || []).length;
  var chapters = Array.prototype.map.call(document.querySelectorAll('.contents a'), function (a) {
    var s = a.querySelectorAll('span');
    return { id: a.getAttribute('href').slice(1), num: s[0].textContent, title: s[1].textContent };
  });
  var sections = chapters.map(function (c) { return document.getElementById(c.id); });

  toc.innerHTML = '<ol>' + chapters.map(function (c) {
    return '<li><a href="#' + c.id + '"><span>' + c.num + '</span><span>' + c.title + '</span></a></li>';
  }).join('') + '</ol>';
  toc.addEventListener('click', function (e) { if (e.target.closest('a')) closeToc(); });
  chapterBtn.addEventListener('click', function () {
    var open = toc.hidden;
    toc.hidden = !open; chapterBtn.setAttribute('aria-expanded', String(open));
  });

  var current = -1, ticking = false;
  function update() {
    ticking = false;
    var y = window.scrollY, vh = window.innerHeight;
    var heroEnd = hero ? hero.offsetTop + hero.offsetHeight * 0.75 : 0;
    var visible = y > heroEnd;
    if (bar.dataset.visible !== String(visible)) { bar.dataset.visible = String(visible); if (!visible) closeToc(); }

    var top = main.offsetTop, end = top + main.offsetHeight - vh;
    var p = Math.max(0, Math.min(1, (y - top) / Math.max(1, end - top)));
    fill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    var mins = Math.ceil((words * (1 - p)) / 210);
    leftEl.textContent = p >= 0.995 ? 'Finished' : mins + ' min left';

    var idx = 0;
    for (var i = 0; i < sections.length; i++) if (sections[i] && sections[i].getBoundingClientRect().top < vh * 0.35) idx = i;
    if (idx !== current) {
      current = idx;
      numEl.textContent = chapters[idx].num;
      titleEl.textContent = chapters[idx].title;
      Array.prototype.forEach.call(toc.querySelectorAll('a'), function (a, j) { a.setAttribute('aria-current', String(j === idx)); });
    }
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
