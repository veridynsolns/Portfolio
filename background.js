/* Backgrounds.
   Night: canvas with slow drifting light fields, fine dust and faint links (scroll and pointer parallax).
   Day: looping video (assets/video), loaded only when day mode is active; a still poster for reduced motion.
   Everything pauses when the tab is hidden. */
(function () {
  var cv = document.getElementById('bg-canvas');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d'), root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, dpr = 1, parts = [], raf = 0, t0 = performance.now(), last = 0;
  var oc = document.createElement('canvas'), octx = oc.getContext('2d'), Q = 4; /* light fields render at 1/4 resolution */
  var mx = 0, my = 0, tx = 0, ty = 0, sy = window.scrollY || 0, light = false;

  /* three-to-four large fields, each with its own path, period and scroll depth */
  var fields = [
    { c: [86, 229, 255],  lc: [14, 116, 144],  x: .18, y: .12, ax: .10, ay: .07, f: .0160, p: 0.0, r: .55, a: .15, d: .10 },
    { c: [60, 110, 255],  lc: [37, 99, 235],   x: .82, y: .30, ax: .09, ay: .10, f: .0120, p: 2.1, r: .62, a: .17, d: .16 },
    { c: [20, 184, 166],  lc: [56, 189, 248],  x: .50, y: .72, ax: .12, ay: .06, f: .0100, p: 4.0, r: .58, a: .11, d: .22 },
    { c: [30, 64, 175],   lc: [125, 211, 252], x: .10, y: .90, ax: .07, ay: .08, f: .0140, p: 5.3, r: .50, a: .14, d: .30 }
  ];

  function readTheme() { light = root.getAttribute('data-theme') === 'light'; }
  function seed() {
    var n = Math.round(Math.min(70, W * H / 26000)); if (W < 700) n = Math.min(n, 26);
    parts = [];
    for (var i = 0; i < n; i++) parts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .08, vy: -.04 - Math.random() * .10, r: .6 + Math.random() * 1.3, p: Math.random() * 6.28, d: .2 + Math.random() * .8 });
  }
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5); W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    oc.width = Math.ceil(W / Q); oc.height = Math.ceil(H / Q); seed(); draw(performance.now(), 16);
  }


  function draw(now, dt) {
    var t = (now - t0) / 1000, k = (dt || 16) / 16.7;
    mx += (tx - mx) * .04; my += (ty - my) * .04;
    if (light) { ctx.clearRect(0, 0, W, H); return; }
    octx.setTransform(1 / Q, 0, 0, 1 / Q, 0, 0); octx.clearRect(0, 0, W, H);
    octx.globalCompositeOperation = light ? 'source-over' : 'lighter';
    var big = Math.max(W, H);
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i], col = light ? f.lc : f.c, a = light ? f.a * .75 : f.a;
      var x = (f.x + f.ax * Math.sin(t * f.f * 6.28 + f.p)) * W + mx * 30 * f.d * 3;
      var y = (f.y + f.ay * Math.cos(t * f.f * 6.28 * .8 + f.p)) * H - sy * f.d + my * 30 * f.d * 3;
      var r = f.r * big, g = octx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(' + col.join(',') + ',' + a + ')'); g.addColorStop(1, 'rgba(' + col.join(',') + ',0)');
      octx.fillStyle = g; octx.fillRect(0, 0, W, H);
    }
    ctx.clearRect(0, 0, W, H); ctx.imageSmoothingEnabled = true; ctx.drawImage(oc, 0, 0, W, H);
    var pc = light ? '14,116,144' : '190,235,255', links = W >= 700;
    for (var j = 0; j < parts.length; j++) {
      var p = parts[j];
      if (!reduce) { p.x += p.vx * k; p.y += p.vy * k; if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; } if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10; }
      p.sx = p.x + mx * 14 * p.d; p.sy = p.y - sy * .05 * p.d + my * 14 * p.d;
      var tw = .55 + .45 * Math.sin(t * .9 + p.p), al = (light ? .22 : .5) * tw * (.4 + p.d * .6);
      ctx.fillStyle = 'rgba(' + pc + ',' + al + ')'; ctx.beginPath(); ctx.arc(p.sx, p.sy, p.r, 0, 6.283); ctx.fill();
    }
    if (links) {
      ctx.lineWidth = .6;
      for (var a2 = 0; a2 < parts.length; a2++) for (var b = a2 + 1; b < parts.length; b++) {
        var dx = parts[a2].sx - parts[b].sx, dy = parts[a2].sy - parts[b].sy, d2 = dx * dx + dy * dy;
        if (d2 < 12100) { ctx.strokeStyle = 'rgba(' + pc + ',' + ((light ? .10 : .16) * (1 - Math.sqrt(d2) / 110)) + ')'; ctx.beginPath(); ctx.moveTo(parts[a2].sx, parts[a2].sy); ctx.lineTo(parts[b].sx, parts[b].sy); ctx.stroke(); }
      }
    }
  }
  function loop(now) { raf = requestAnimationFrame(loop); if (now - last < 32) return; var dt = Math.min(now - last, 100); last = now; draw(now, dt); }
  function start() { if (!reduce && !raf && !document.hidden) raf = requestAnimationFrame(loop); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  /* Day-mode video sets. SHOW_COMPARE adds a small switcher in day mode so the designs can be compared.
     Set it to false (or delete the .bg-compare button code) for the final site. */
  var SHOW_COMPARE = true;
  var SETS = {
    lagoon: { label: 'Lagoon', files: [['lagoon-loop.webm', 'video/webm'], ['lagoon-loop.mp4', 'video/mp4']], sm: 'lagoon-loop-sm.mp4', poster: 'lagoon-poster.jpg' },
    silk: { label: 'Silk', files: [['day-loop.webm', 'video/webm'], ['day-loop.mp4', 'video/mp4']], sm: 'day-loop-sm.mp4', poster: 'day-poster.jpg' }
  };
  function pickSet() {
    var q = null; try { q = new URLSearchParams(window.location.search).get('bg'); } catch (e) {}
    if (q && SETS[q]) return q;
    try { var sv = localStorage.getItem('veridyn-bg'); if (sv && SETS[sv]) return sv; } catch (e) {}
    return 'lagoon';
  }
  var setName = pickSet(), wrap = null, vid = null, cmp = null;
  function applySet() {
    var S = SETS[setName];
    wrap.style.backgroundImage = 'url(assets/video/' + S.poster + ')';
    wrap.classList.remove('set-silk', 'set-lagoon', 'is-playing'); wrap.classList.add('set-' + setName);
    if (cmp) cmp.querySelector('b').textContent = S.label;
    if (!vid) return;
    vid.pause(); while (vid.firstChild) vid.removeChild(vid.firstChild);
    var list = window.innerWidth < 700 ? [[S.sm, 'video/mp4']] : S.files;
    list.forEach(function (x) { var el = document.createElement('source'); el.src = 'assets/video/' + x[0]; el.type = x[1]; vid.appendChild(el); });
    vid.load(); var pr = vid.play(); if (pr && pr.catch) pr.catch(function () {});
  }
  function ensureWrap() {
    if (wrap) return;
    wrap = document.createElement('div'); wrap.id = 'bg-video-wrap'; wrap.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(wrap, document.body.firstChild);
    if (!reduce) {
      vid = document.createElement('video'); vid.muted = true; vid.loop = true; vid.autoplay = true; vid.preload = 'auto'; vid.tabIndex = -1;
      vid.setAttribute('playsinline', ''); vid.setAttribute('muted', ''); vid.disablePictureInPicture = true;
      vid.addEventListener('playing', function () { wrap.classList.add('is-playing'); });
      wrap.appendChild(vid);
    }
    if (SHOW_COMPARE) {
      cmp = document.createElement('button'); cmp.type = 'button'; cmp.className = 'bg-compare';
      cmp.innerHTML = '<span>Background</span><b></b><i>tap to switch</i>';
      cmp.addEventListener('click', function () {
        var names = Object.keys(SETS); setName = names[(names.indexOf(setName) + 1) % names.length];
        try { localStorage.setItem('veridyn-bg', setName); } catch (e) {}
        applySet();
      });
      document.body.appendChild(cmp);
    }
    applySet();
  }
  function applyMode() {
    readTheme();
    if (light) { stop(); ctx.clearRect(0, 0, W, H); ensureWrap(); if (vid && !document.hidden) { var pr = vid.play(); if (pr && pr.catch) pr.catch(function () {}); } }
    else { if (vid) vid.pause(); start(); if (reduce) draw(performance.now(), 16); }
  }

  readTheme(); size();
  window.addEventListener('resize', function () { clearTimeout(size.t); size.t = setTimeout(size, 150); });
  window.addEventListener('scroll', function () { sy = window.scrollY; if (reduce) draw(performance.now()); }, { passive: true });
  window.addEventListener('pointermove', function (e) { tx = e.clientX / W - .5; ty = e.clientY / H - .5; }, { passive: true });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { stop(); if (vid) vid.pause(); } else applyMode(); });
  new MutationObserver(applyMode).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  applyMode();
})();
