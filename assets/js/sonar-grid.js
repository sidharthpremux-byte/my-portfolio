/**
 * SonarGrid — vanilla port of the React decorative dot field.
 * Mounts on [data-sonar-grid]; children render above the canvas.
 */
(function () {
  'use strict';

  var MAX_DPR = 2;
  var TAU = Math.PI * 2;

  var DEFAULTS = {
    spacing: 28,
    dotRadius: 1.4,
    baseOpacity: 0.15,
    color: '#00E5FF',
    pingEvery: 2.5,
    speed: 260,
    ringWidth: 90,
    amplitude: 2.0,
    interactive: true,
    maxRings: 6,
    seedPing: true,
    pingArea: [0.15, 0.2, 0.85, 0.8],
  };

  function mount(host) {
    var canvas = host.querySelector('.sonar-grid-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var opts = Object.assign({}, DEFAULTS);
    if (window.matchMedia('(max-width: 768px)').matches) {
      opts.baseOpacity = 0.05;
      opts.interactive = false;
    }
    var rings = [];
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var width = 0;
    var height = 0;
    var raf = 0;
    var timer = 0;
    var visible = true;
    var seeded = false;
    var stroke = opts.color;
    var nextPing = performance.now() + opts.pingEvery * 1000;

    function addRing(x, y, born) {
      rings.push({ x: x, y: y, born: born });
      while (rings.length > opts.maxRings) rings.shift();
    }

    function draw(now) {
      var o = opts;
      var lifetime = (Math.hypot(width, height) + o.ringWidth) / o.speed;
      rings = rings.filter(function (r) {
        return (now - r.born) / 1000 < lifetime;
      });
      var live = rings.map(function (r) {
        var age = (now - r.born) / 1000;
        var radius = age * o.speed;
        return {
          x: r.x,
          y: r.y,
          radius: radius,
          reach: radius + o.ringWidth,
          fade: 1 - age / lifetime,
        };
      });

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = stroke;

      var cols = Math.ceil(width / o.spacing) + 1;
      var rows = Math.ceil(height / o.spacing) + 1;
      var offsetX = (width - (cols - 1) * o.spacing) / 2;
      var offsetY = (height - (rows - 1) * o.spacing) / 2;

      var hot = [];
      ctx.globalAlpha = o.baseOpacity;
      ctx.beginPath();
      for (var i = 0; i < cols; i++) {
        var cx = offsetX + i * o.spacing;
        for (var j = 0; j < rows; j++) {
          var cy = offsetY + j * o.spacing;
          var energy = 0;
          for (var n = 0; n < live.length; n++) {
            var r = live[n];
            if (Math.abs(cx - r.x) > r.reach || Math.abs(cy - r.y) > r.reach) continue;
            var dist = Math.abs(Math.hypot(cx - r.x, cy - r.y) - r.radius);
            if (dist >= o.ringWidth) continue;
            var t = 1 - dist / o.ringWidth;
            var k = t * t * (3 - 2 * t) * r.fade;
            if (k > energy) energy = k;
          }
          if (energy < 0.01) {
            ctx.moveTo(cx + o.dotRadius, cy);
            ctx.arc(cx, cy, o.dotRadius, 0, TAU);
          } else {
            hot.push(cx, cy, energy);
          }
        }
      }
      ctx.fill();

      for (var h = 0; h < hot.length; h += 3) {
        var e = hot[h + 2] || 0;
        ctx.globalAlpha = o.baseOpacity + (1 - o.baseOpacity) * e;
        ctx.beginPath();
        ctx.arc(hot[h] || 0, hot[h + 1] || 0, o.dotRadius * (1 + o.amplitude * e), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function resize() {
      var rect = host.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      var dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!seeded) {
        seeded = true;
        var area = opts.pingArea;
        if (opts.seedPing && !reduceMotion.matches) {
          addRing(
            width * (area[0] + (area[2] - area[0]) * 0.68),
            height * (area[1] + (area[3] - area[1]) * 0.34),
            performance.now() - 500
          );
        }
      }
      draw(performance.now());
    }

    function scheduleIdle(delay) {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        tick(performance.now());
      }, Math.max(16, delay));
    }

    function tick(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      if (reduceMotion.matches) {
        rings = [];
        draw(now);
        return;
      }
      var o = opts;
      if (o.pingEvery > 0 && now >= nextPing) {
        var area = o.pingArea;
        addRing(
          width * (area[0] + Math.random() * (area[2] - area[0])),
          height * (area[1] + Math.random() * (area[3] - area[1])),
          now
        );
        nextPing = now + o.pingEvery * 1000;
      }
      draw(now);
      if (rings.length > 0) raf = requestAnimationFrame(tick);
      else if (o.pingEvery > 0) scheduleIdle(nextPing - now);
    }

    function wake() {
      if (!raf) {
        window.clearTimeout(timer);
        raf = requestAnimationFrame(tick);
      }
    }

    function onDown(e) {
      if (!opts.interactive || reduceMotion.matches) return;
      var rect = host.getBoundingClientRect();
      addRing(e.clientX - rect.left, e.clientY - rect.top, performance.now());
      wake();
    }

    function onVisibility() {
      if (!document.hidden) wake();
    }

    var ro = new ResizeObserver(resize);
    var io = new IntersectionObserver(
      function (entries) {
        visible = entries[0] ? entries[0].isIntersecting : true;
        if (visible) wake();
      },
      { threshold: 0 }
    );

    stroke = opts.color;
    resize();
    ro.observe(host);
    io.observe(host);
    host.addEventListener('pointerdown', onDown);
    document.addEventListener('visibilitychange', onVisibility);
    if (typeof reduceMotion.addEventListener === 'function') {
      reduceMotion.addEventListener('change', wake);
    } else if (typeof reduceMotion.addListener === 'function') {
      reduceMotion.addListener(wake);
    }
    wake();
  }

  function init() {
    var hosts = document.querySelectorAll('[data-sonar-grid]');
    for (var i = 0; i < hosts.length; i++) mount(hosts[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
