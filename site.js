(function () {
  var root = document.documentElement;
  var btn = document.querySelector('.theme-switch');
  var meta = document.querySelector('meta[name="theme-color"]');
  function apply(t) {
    root.dataset.theme = t;
    btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    meta.setAttribute('content', t === 'dark' ? '#0e0f11' : '#fafbfc');
  }
  apply(root.dataset.theme);
  btn.addEventListener('click', function () {
    var t = root.dataset.theme === 'dark' ? 'light' : 'dark';
    apply(t);
    try { localStorage.setItem('theme', t); } catch (e) {}
  });
})();

(function () {
  document.querySelectorAll('a.video[data-yt]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      var frame = document.createElement('iframe');
      frame.src = 'https://www.youtube-nocookie.com/embed/' + link.dataset.yt + '?autoplay=1';
      frame.allow = 'autoplay; encrypted-media; picture-in-picture';
      frame.allowFullscreen = true;
      frame.title = link.getAttribute('aria-label');
      var box = document.createElement('div');
      box.className = 'video playing';
      box.appendChild(frame);
      link.replaceWith(box);
      frame.focus();
    });
  });
})();

(function () {
  var smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.shots').forEach(function (strip) {
    var section = strip.closest('section');
    var h2 = section && section.querySelector('h2');
    if (!h2) return;

    var head = document.createElement('div');
    head.className = 'section-head';
    var nav = document.createElement('div');
    nav.className = 'shots-nav';
    nav.innerHTML =
      '<button type="button" data-dir="-1" aria-label="Previous screenshots">‹</button>' +
      '<button type="button" data-dir="1" aria-label="Next screenshots">›</button>';
    h2.replaceWith(head);
    head.append(h2, nav);
    var prev = nav.children[0], next = nav.children[1];

    function atStart() { return strip.scrollLeft <= 1; }
    function atEnd() { return strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 1; }
    function update() {
      nav.hidden = strip.scrollWidth <= strip.clientWidth + 1;
      prev.disabled = atStart();
      next.disabled = atEnd();
    }

    nav.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      strip.scrollBy({ left: btn.dataset.dir * strip.clientWidth * 0.8, behavior: smooth ? 'smooth' : 'auto' });
    });

    // A mouse wheel scrolls the strip sideways; at either end the page scrolls as usual.
    strip.addEventListener('wheel', function (e) {
      if (e.ctrlKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      if ((e.deltaY > 0 && atEnd()) || (e.deltaY < 0 && atStart())) return;
      e.preventDefault();
      strip.scrollBy({ left: e.deltaY, behavior: 'auto' });
    }, { passive: false });

    strip.addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    strip.querySelectorAll('img').forEach(function (img) { img.addEventListener('load', update); });
    update();
  });
})();

// Click a screenshot to open it full size; arrows, keys and swipes page through the set.
(function () {
  if (typeof HTMLDialogElement !== 'function') return;
  document.querySelectorAll('.shots').forEach(function (strip) {
    var shots = Array.prototype.slice.call(strip.querySelectorAll('img'));
    if (!shots.length) return;
    var i = 0;

    var dlg = document.createElement('dialog');
    dlg.className = 'viewer';
    dlg.setAttribute('aria-label', 'Screenshot viewer');
    dlg.tabIndex = -1;
    dlg.innerHTML =
      '<div class="viewer-top"><span class="viewer-count" aria-live="polite"></span>' +
      '<button type="button" class="viewer-close" aria-label="Close">×</button></div>' +
      '<div class="viewer-stage">' +
      '<button type="button" data-dir="-1" aria-label="Previous screenshot">‹</button>' +
      '<img alt="">' +
      '<button type="button" data-dir="1" aria-label="Next screenshot">›</button></div>' +
      '<p class="viewer-cap"></p>';
    document.body.appendChild(dlg);
    var big = dlg.querySelector('.viewer-stage img');
    var count = dlg.querySelector('.viewer-count');
    var cap = dlg.querySelector('.viewer-cap');
    var prev = dlg.querySelector('[data-dir="-1"]');
    var next = dlg.querySelector('[data-dir="1"]');

    function show(n) {
      i = Math.max(0, Math.min(shots.length - 1, n));
      var s = shots[i];
      big.src = s.currentSrc || s.src;
      big.alt = s.alt;
      count.textContent = (i + 1) + ' / ' + shots.length;
      cap.textContent = s.alt;
      prev.disabled = i === 0;
      next.disabled = i === shots.length - 1;
    }
    function open(n) {
      show(n);
      document.documentElement.classList.add('viewing');
      dlg.showModal();
      dlg.focus();   // keys work at once, and no focus ring lands on the close button
    }

    shots.forEach(function (img, n) {
      img.tabIndex = 0;
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', 'Open screenshot ' + (n + 1) + ': ' + img.alt);
      img.addEventListener('click', function () { open(n); });
      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(n); }
      });
    });

    dlg.addEventListener('click', function (e) {
      if (swiped) { swiped = false; return; }
      var btn = e.target.closest('button');
      if (btn && btn.dataset.dir) show(i + Number(btn.dataset.dir));
      else if (e.target !== big) dlg.close();   // the close button or the empty area around the picture
    });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(i - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); show(i + 1); }
      else if (e.key === 'Home') { e.preventDefault(); show(0); }
      else if (e.key === 'End') { e.preventDefault(); show(shots.length - 1); }
    });
    dlg.addEventListener('close', function () {
      document.documentElement.classList.remove('viewing');
      shots[i].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      shots[i].focus({ preventScroll: true });
    });

    // Horizontal swipe on touch screens.
    var x0 = null, y0 = 0, swiped = false;
    big.parentNode.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      x0 = e.clientX; y0 = e.clientY;
    });
    big.parentNode.addEventListener('pointerup', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0, dy = e.clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { swiped = true; setTimeout(function () { swiped = false; }, 0); show(i + (dx < 0 ? 1 : -1)); }
    });
    big.parentNode.addEventListener('pointercancel', function () { x0 = null; });
  });
})();
