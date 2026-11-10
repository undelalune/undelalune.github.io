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
