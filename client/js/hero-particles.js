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
  var AREA_PER_PARTICLE = 6500;  // px² of hero per particle
  var MAX_PARTICLES = 190;
  var MIN_SPEED = 35;            // px/s
  var MAX_SPEED = 95;
  var GLOW_SIZE = 64;            // px of the pre-rendered glow sprite
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

  // One soft radial glow per color, drawn once and then stamped with drawImage
  // (far cheaper than shadowBlur on every particle, every frame)
  var sprites = {};
  COLORS.forEach(function (c) {
    var s = document.createElement('canvas');
    s.width = s.height = GLOW_SIZE;
    var g = s.getContext('2d');
    var grad = g.createRadialGradient(GLOW_SIZE / 2, GLOW_SIZE / 2, 0, GLOW_SIZE / 2, GLOW_SIZE / 2, GLOW_SIZE / 2);
    grad.addColorStop(0, 'rgba(255, 250, 230, 1)');
    grad.addColorStop(0.12, 'rgba(' + c + ', 0.95)');
    grad.addColorStop(0.35, 'rgba(' + c + ', 0.35)');
    grad.addColorStop(1, 'rgba(' + c + ', 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, GLOW_SIZE, GLOW_SIZE);
    sprites[c] = s;
  });

  function spawn(p, fromTop) {
    p.x = rand(0, width);
    // On entry the dust starts above the hero and falls in; later ones respawn just above the top edge
    p.y = fromTop ? rand(-height, -10) : rand(-40, -10);
    p.r = rand(0.6, 2.2);
    p.vy = rand(MIN_SPEED, MAX_SPEED) * (0.6 + p.r / 2.2 * 0.4); // bigger falls a bit faster
    p.sway = rand(6, 18);
    p.phase = rand(0, Math.PI * 2);
    p.freq = rand(0.4, 1.1);
    p.alpha = rand(0.35, 0.95);
    p.color = COLORS[(Math.random() * COLORS.length) | 0];
    // Twinkle: each particle pulses at its own speed
    p.tw = rand(1.5, 4.5);
    p.twPhase = rand(0, Math.PI * 2);
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
    ctx.globalCompositeOperation = 'lighter'; // overlapping glows add up like light

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.y += p.vy * dt;
      p.phase += p.freq * dt;
      p.twPhase += p.tw * dt;
      if (p.y - p.r > height) spawn(p, false);
      var x = p.x + Math.sin(p.phase) * p.sway;
      var size = p.r * 9;

      ctx.globalAlpha = p.alpha * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(p.twPhase)));
      ctx.drawImage(sprites[p.color], x - size / 2, p.y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
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
