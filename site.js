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
