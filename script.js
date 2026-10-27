(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* 0. Theme toggle. Initial theme is set in <head> (saved choice, else system setting). */
  var root = document.documentElement, tbtn = $('.theme-toggle');
  var applyTheme = function (t, save) {
    root.setAttribute('data-theme', t);
    if (tbtn) { tbtn.setAttribute('aria-label', t === 'light' ? 'Switch to night mode' : 'Switch to day mode'); tbtn.setAttribute('aria-pressed', t === 'light'); }
    var m = $('meta[name="theme-color"]'); if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
    m.content = t === 'light' ? '#f6f8fc' : '#070b17';
    if (save) { try { localStorage.setItem('veridyn-theme', t); } catch (e) {} }
  };
  applyTheme(root.getAttribute('data-theme') || 'dark', false);
  if (tbtn) tbtn.addEventListener('click', function () {
    root.classList.add('theme-anim');
    applyTheme(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light', true);
    setTimeout(function () { root.classList.remove('theme-anim'); }, 500);
  });
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function (e) {
    var saved; try { saved = localStorage.getItem('veridyn-theme'); } catch (x) {}
    if (!saved) applyTheme(e.matches ? 'light' : 'dark', false);
  });

  /* 0b. Nav highlight: follows the section in view on the home page, and marks Work on project pages. */
  var navLinks = $$('.nav a[href*="#"]');
  var idOf = function (a) { return (a.getAttribute('href').split('#')[1] || ''); };
  var setActive = function (id) {
    navLinks.forEach(function (a) { var on = !!id && idOf(a) === id; a.classList.toggle('is-active', on); if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  };
  if (navLinks.length) {
    var secs = navLinks.map(function (a) { return document.getElementById(idOf(a)); }).filter(Boolean);
    if (!secs.length) { setActive('work'); }
    else {
      var ticking = false;
      var spy = function () {
        ticking = false; var line = window.innerHeight * 0.35, cur = '';
        secs.forEach(function (s) { if (s.getBoundingClientRect().top <= line) cur = s.id; });
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = secs[secs.length - 1].id;
        setActive(cur);
      };
      var queue = function () { if (!ticking) { ticking = true; requestAnimationFrame(spy); } };
      window.addEventListener('scroll', queue, { passive: true }); window.addEventListener('resize', queue);
      navLinks.forEach(function (a) { a.addEventListener('click', function () { setActive(idOf(a)); }); });
      spy();
    }
  }

  /* 1. Scroll reveal. Siblings stagger by 80ms (max 4 steps); class is removed afterwards so hover transforms work. */
  var items = $$('.reveal');
  if (!('IntersectionObserver' in window) || reduce) { items.forEach(function (el) { el.classList.remove('reveal'); }); }
  else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting && e.boundingClientRect.top < 0) { e.target.classList.remove('reveal', 'in'); io.unobserve(e.target); }
      });
      entries.filter(function (e) { return e.isIntersecting; }).forEach(function (e, i) {
        var el = e.target, sibs = $$(':scope > .reveal', el.parentElement), idx = Math.min(sibs.indexOf(el), 4);
        el.style.setProperty('--d', (Math.max(idx, i) * 0.08) + 's');
        el.classList.add('in'); io.unobserve(el);
        setTimeout(function () { el.classList.remove('reveal', 'in'); el.style.removeProperty('--d'); }, 1200);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });
    var settle; window.addEventListener('scroll', function () {
      clearTimeout(settle);
      settle = setTimeout(function () {
        items.forEach(function (el) { if (el.classList.contains('reveal') && el.getBoundingClientRect().bottom < 0) { el.classList.remove('reveal', 'in'); io.unobserve(el); } });
      }, 400);
    }, { passive: true });
  }

  /* 2. Image skeletons: shimmer until every image in the block has loaded. */
  $$('.gallery-item, .project-thumb').forEach(function (box) {
    var imgs = $$('img', box), pending = 0;
    imgs.forEach(function (img) {
      if (img.complete && img.naturalWidth) return;
      pending++;
      var done = function () { if (--pending === 0) box.classList.remove('is-loading'); };
      img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true });
    });
    if (pending) box.classList.add('is-loading');
  });

  /* 3. Project filter toggle. */
  var grid = $('.work-grid'), btns = $$('.filter-btn');
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      var f = b.getAttribute('data-filter'), shown = 0;
      btns.forEach(function (x) { var on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', on); });
      grid.classList.toggle('is-filtered', f !== 'all');
      $$('.project-card', grid).forEach(function (c) {
        var ok = f === 'all' || c.getAttribute('data-cat') === f;
        c.hidden = !ok; c.classList.remove('filter-in');
        if (ok) { c.style.setProperty('--d', (shown++ * 0.08) + 's'); void c.offsetWidth; c.classList.add('filter-in'); }
      });
    });
  });

  /* 4. Lightbox for project screenshots (click, arrows, Esc). */
  var shots = $$('.gallery-item img');
  if (shots.length) {
    var lb = document.createElement('div');
    lb.className = 'lightbox'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Screenshot viewer');
    lb.innerHTML = '<button class="lb-btn lb-close" aria-label="Close">\u00d7</button><button class="lb-btn lb-prev" aria-label="Previous">\u2039</button><figure><img alt=""><figcaption></figcaption></figure><button class="lb-btn lb-next" aria-label="Next">\u203a</button>';
    document.body.appendChild(lb);
    var cur = 0, img = $('img', lb), cap = $('figcaption', lb);
    var show = function (i) { cur = (i + shots.length) % shots.length; img.src = shots[cur].src; img.alt = shots[cur].alt; var s = $('span', shots[cur].parentElement); cap.textContent = (s ? s.textContent : '') + '  ' + (cur + 1) + '/' + shots.length; };
    var open = function (i) { show(i); lb.classList.add('is-open'); document.body.style.overflow = 'hidden'; $('.lb-close', lb).focus(); };
    var close = function () { lb.classList.remove('is-open'); document.body.style.overflow = ''; };
    shots.forEach(function (s, i) { s.addEventListener('click', function () { open(i); }); });
    $('.lb-close', lb).onclick = close; $('.lb-prev', lb).onclick = function () { show(cur - 1); }; $('.lb-next', lb).onclick = function () { show(cur + 1); };
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) { if (!lb.classList.contains('is-open')) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
  }

  /* 5. Contact form with a loading state. POSTs JSON if data-endpoint is set, otherwise opens a prefilled email. */
  var form = $('#brief-form');
  if (form) {
    var btn = $('button[type=submit]', form), label = $('.btn-label', btn), status = $('.form-status', form), idle = label.textContent;
    var setBusy = function (on, text) { btn.classList.toggle('is-loading', on); btn.disabled = on; btn.setAttribute('aria-busy', on); label.textContent = on ? text : idle; };
    form.addEventListener('submit', function (e) {
      e.preventDefault(); status.className = 'form-status'; status.textContent = '';
      var bad = $$('[required]', form).filter(function (f) { var v = !f.value.trim() || (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(f.value)); f.classList.toggle('is-invalid', v); return v; });
      if (bad.length) { bad[0].focus(); status.classList.add('is-error'); status.textContent = 'Please complete the highlighted fields.'; return; }
      var d = {}; new FormData(form).forEach(function (v, k) { d[k] = v; });
      var ep = form.getAttribute('data-endpoint'); setBusy(true, 'Sending');
      if (ep) {
        fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(d) })
          .then(function (r) { if (!r.ok) throw new Error(); form.reset(); status.textContent = 'Thanks, your brief was sent. We will reply by email.'; })
          .catch(function () { status.classList.add('is-error'); status.textContent = 'Could not send. Please email veridynsolutions@gmail.com instead.'; })
          .then(function () { setBusy(false); });
      } else {
        var body = 'Name: ' + d.name + '\nEmail: ' + d.email + '\nProject type: ' + d.type + '\n\n' + d.details;
        window.location.href = 'mailto:veridynsolutions@gmail.com?subject=' + encodeURIComponent('Project brief: ' + d.type) + '&body=' + encodeURIComponent(body);
        setTimeout(function () { setBusy(false); status.textContent = 'Your email app should open with the brief filled in.'; }, 900);
      }
    });
    $$('input, textarea', form).forEach(function (f) { f.addEventListener('input', function () { f.classList.remove('is-invalid'); }); });
  }
})();
