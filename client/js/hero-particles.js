// ===========================
// hero-particles.js — gold dust falling through the home hero
// ===========================
// One canvas, clipped to the hero. Runs only while the hero is on screen and the
// tab is visible; off entirely for prefers-reduced-motion.
(function () {
  'use strict';

  var hero = document.getElementById('hero');
  if (!hero || !window.requestAnimationFrame) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Tunables
  var AREA_PER_PARTICLE = 14000; // px² of hero per particle
  var MAX_PARTICLES = 90;
  var MIN_SPEED = 18;            // px/s
  var MAX_SPEED = 55;
  var COLORS = ['232, 196, 106', '201, 162, 39', '255, 236, 179']; // gold shades (rgb)

  var wrap = document.createElement('div');
  wrap.className = 'hero-particles';
  wrap.setAttribute('aria-hidden', 'true');
  var canvas = document.createElement('canvas');
  wrap.appendChild(canvas);
  hero.insertBefore(wrap, hero.firstChild);

  var ctx = canvas.getContext('2d');
  var width = 0, height = 0, dpr = 1;
  var particles = [];
  var running = false, visible = true, last = 0, raf = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function spawn(p, fromTop) {
    p.x = rand(0, width);
    // On entry the dust starts above the hero and falls in; later ones respawn just above the top edge
    p.y = fromTop ? rand(-height, -10) : rand(-40, -10);
    p.r = rand(0.6, 2.2);
    p.vy = rand(MIN_SPEED, MAX_SPEED) * (0.6 + p.r / 2.2 * 0.4); // bigger falls a bit faster
    p.sway = rand(6, 18);
    p.phase = rand(0, Math.PI * 2);
    p.freq = rand(0.4, 1.1);
    p.alpha = rand(0.25, 0.85);
    p.color = COLORS[(Math.random() * COLORS.length) | 0];
    return p;
  }

  function resize() {
    var rect = hero.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var target = Math.min(MAX_PARTICLES, Math.round(width * height / AREA_PER_PARTICLE));
    while (particles.length < target) particles.push(spawn({}, true));
    particles.length = target;
  }

  function frame(now) {
    var dt = Math.min((now - last) / 1000, 0.05); // clamp after a hidden tab / long frame
    last = now;
    ctx.clearRect(0, 0, width, height);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.y += p.vy * dt;
      p.phase += p.freq * dt;
      if (p.y - p.r > height) spawn(p, false);
      var x = p.x + Math.sin(p.phase) * p.sway;

      // Soft halo + bright core (cheaper than shadowBlur)
      ctx.fillStyle = 'rgba(' + p.color + ',' + (p.alpha * 0.18) + ')';
      ctx.beginPath();
      ctx.arc(x, p.y, p.r * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(' + p.color + ',' + p.alpha + ')';
      ctx.beginPath();
      ctx.arc(x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  }

  function update() {
    var shouldRun = visible && !document.hidden;
    if (shouldRun === running) return;
    running = shouldRun;
    if (running) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    } else {
      cancelAnimationFrame(raf);
    }
  }

  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(hero);
  else window.addEventListener('resize', resize);

  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      update();
    }).observe(hero);
  }
  document.addEventListener('visibilitychange', update);
  update();
  wrap.classList.add('is-on');
})();
