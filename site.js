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

/* Dark theme only: a few warm comets crossing the starfield, each on its own straight course */
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var root = document.documentElement;
  var canvas = document.createElement('canvas');
  canvas.className = 'comets';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  var ctx = canvas.getContext('2d');

  var COUNT = 8, GLOW = 14, CORE = 1.6, COLOR = '255, 201, 140', FADE = 3;  // FADE: seconds to appear or vanish
  var w = 0, h = 0, flies = [], frame = 0, last = 0;

  var sprite = document.createElement('canvas');
  sprite.width = sprite.height = GLOW * 2;
  var sctx = sprite.getContext('2d');
  var g = sctx.createRadialGradient(GLOW, GLOW, 0, GLOW, GLOW, GLOW);
  g.addColorStop(0, 'rgba(' + COLOR + ', .55)');
  g.addColorStop(.25, 'rgba(' + COLOR + ', .18)');
  g.addColorStop(1, 'rgba(' + COLOR + ', 0)');
  sctx.fillStyle = g;
  sctx.fillRect(0, 0, GLOW * 2, GLOW * 2);

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  var OUT = 120;   // how far past the edge a comet starts and is dropped: room for the longest tail

  // fromEdge: start just outside a random edge, already at full brightness, aimed at a random point on screen
  function spawn(fromEdge) {
    var f = {
      x: Math.random() * w, y: Math.random() * h, dir: Math.random() * Math.PI * 2,
      // heading and pace are set once and never change; slow ones are common, fast ones rare
      speed: 3 + Math.pow(Math.random(), 2) * 37,   // px per second
      size: .7 + Math.random() * .6,
      opacity: .45 + Math.random() * .5,
      // steady brightness for its whole life, then it fades out for good; a new one flies in from an edge.
      // Life only runs once the comet is on screen, so a slow one can't fade before it arrives
      life: 15 + Math.random() * 30,          // seconds
      age: FADE,
      shown: !fromEdge
    };
    if (fromEdge) {
      var r = reach(f), p = Math.random() * 2 * (w + h);
      if (p < w) { f.x = p; f.y = -r; }
      else if (p < 2 * w) { f.x = p - w; f.y = h + r; }
      else if (p < 2 * w + h) { f.x = -r; f.y = p - 2 * w; }
      else { f.x = w + r; f.y = p - 2 * w - h; }
      f.dir = Math.atan2(Math.random() * h - f.y, Math.random() * w - f.x);
    }
    return f;
  }
  // a drop: the front half of the glow stays round, the back half is stretched by the speed
  function shape(f) {
    var d = GLOW * 2 * f.size;
    var thick = d * (1 - .25 * Math.min(f.speed / 40, 1));
    return { thick: thick, back: thick / 2 * (1 + Math.min(f.speed / 6, 5)) };
  }
  // just far enough past the edge that no part of the glow shows yet
  function reach(f) { return shape(f).back + 1; }

  function draw(t) {
    var dt = Math.min((t - (last || t)) / 1000, .1);
    last = t;
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < flies.length; i++) {
      var f = flies[i];
      f.x += Math.cos(f.dir) * f.speed * dt;
      f.y += Math.sin(f.dir) * f.speed * dt;
      if (!f.shown) f.shown = f.x >= 0 && f.x <= w && f.y >= 0 && f.y <= h;
      else f.age += dt;
      if (f.age >= f.life || f.x < -OUT || f.x > w + OUT || f.y < -OUT || f.y > h + OUT) f = flies[i] = spawn(true);
      var a = f.opacity * Math.min(f.age / FADE, (f.life - f.age) / FADE, 1);
      var sh = shape(f), thick = sh.thick, back = sh.back;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.dir);
      ctx.globalAlpha = a;
      ctx.drawImage(sprite, GLOW, 0, GLOW, GLOW * 2, 0, -thick / 2, thick / 2, thick);
      ctx.drawImage(sprite, 0, 0, GLOW, GLOW * 2, -back, -thick / 2, back, thick);
      ctx.beginPath();
      ctx.arc(0, 0, CORE * f.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgb(' + COLOR + ')';
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    frame = requestAnimationFrame(draw);
  }

  function sync() {
    var on = root.dataset.theme === 'dark';
    if (on && !frame) {
      if (!flies.length) for (var i = 0; i < COUNT; i++) {
        var f = spawn(false);
        f.age = FADE + Math.random() * (f.life - FADE);   // mid-life, so they don't all fade at once
        flies.push(f);
      }
      last = 0;
      frame = requestAnimationFrame(draw);
    } else if (!on && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }

  resize();
  addEventListener('resize', resize);
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  sync();
})();
