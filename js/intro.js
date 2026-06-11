/* ============================================================================
   AUREUS COLLECTIONS — intro.js
   Laser-engrave opening. The wordmark etches onto the screen left to right
   with a hot leading edge, blooms once, settles, releases the page.
   - completes in ~2.3s (mobile ~1.9s)
   - first visit per tab only (sessionStorage)
   - reduced-motion or any failure → clean fade, hard 4s failsafe
   ============================================================================ */
(function () {
  'use strict';
  document.body.classList.add('js');

  var intro = document.getElementById('intro');
  var canvas = document.getElementById('engraveCanvas');

  function release() {
    if (!intro || intro.classList.contains('done')) return;
    intro.classList.add('done');
    document.body.classList.remove('intro-locked');
    document.body.classList.add('ready');
    window.dispatchEvent(new CustomEvent('aureus:introdone'));
    setTimeout(function () { intro.remove(); }, 700);
  }

  // Hard failsafe — nothing may hold the page hostage.
  var failsafe = setTimeout(release, 4000);

  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seen = false;
  try { seen = sessionStorage.getItem('aureus_intro') === '1'; } catch (e) {}

  if (!intro || !canvas || !canvas.getContext || seen || reduced) {
    // Skip path: brief beat of black, then fade in.
    setTimeout(function () { clearTimeout(failsafe); release(); }, seen ? 80 : 500);
    return;
  }
  try { sessionStorage.setItem('aureus_intro', '1'); } catch (e) {}

  var ctx = canvas.getContext('2d');
  var MOBILE = matchMedia('(max-width: 768px), (pointer: coarse)').matches;
  var DPR = Math.min(window.devicePixelRatio || 1, MOBILE ? 1.5 : 2);
  var W = 0, H = 0;

  var CREAM = '#eef1f4', STEEL = '#c4c9d0';
  var ETCH = MOBILE ? 1450 : 1700;   // ms etching
  var BLOOM = 350;                   // ms settle/bloom
  var art = document.createElement('canvas');
  var actx = art.getContext('2d');
  var comp = { left: 0, right: 0, midY: 0 };

  function size() {
    W = innerWidth; H = innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    art.width = W * DPR; art.height = H * DPR;
    actx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function drawTracked(c, text, cx, y, font, tracking, color) {
    c.font = font; c.fillStyle = color; c.textBaseline = 'alphabetic';
    var widths = [], total = 0, i;
    for (i = 0; i < text.length; i++) { widths[i] = c.measureText(text[i]).width; total += widths[i]; }
    total += tracking * (text.length - 1);
    var x = cx - total / 2;
    for (i = 0; i < text.length; i++) { c.fillText(text[i], x, y); x += widths[i] + tracking; }
    return { left: cx - total / 2, right: cx + total / 2 };
  }

  function paintArt() {
    actx.clearRect(0, 0, W, H);
    var cx = W / 2, cy = H / 2;
    var S = Math.min(W * 0.115, H * 0.17, 112);
    actx.textAlign = 'left';
    var f1 = '500 ' + S + 'px "Playfair Display", serif';
    var b1 = drawTracked(actx, 'Aureus', cx, cy, f1, S * 0.01, CREAM);
    var capS = Math.max(S * 0.145, 11);
    var f2 = '400 ' + capS + 'px "Jost", sans-serif';
    var b2 = drawTracked(actx, 'COLLECTIONS', cx, cy + S * 0.42, f2, capS * 0.62, STEEL);
    comp.left = Math.min(b1.left, b2.left) - 10;
    comp.right = Math.max(b1.right, b2.right) + 10;
    comp.midY = cy - S * 0.18;
  }

  // spark particles (desktop only)
  var sparks = [];
  function spawnSparks(x, y) {
    for (var i = 0; i < 2; i++) {
      sparks.push({ x: x, y: y + (Math.random() - 0.5) * 36, vx: -(0.4 + Math.random() * 1.4), vy: (Math.random() - 0.5) * 1.6, life: 1 });
    }
    if (sparks.length > 60) sparks.splice(0, sparks.length - 60);
  }

  var BANDS = 6;
  var jitterSeed = [];
  for (var j = 0; j < BANDS; j++) jitterSeed[j] = Math.random() * 1000;

  function frame(t0, now) {
    var t = now - t0;
    var p = Math.min(t / ETCH, 1);
    var ease = 1 - Math.pow(1 - p, 2.2);
    var edgeX = comp.left + (comp.right - comp.left) * ease;

    ctx.clearRect(0, 0, W, H);

    // etched portion — jagged leading edge via horizontal bands
    var bandH = H / BANDS;
    for (var b = 0; b < BANDS; b++) {
      var jit = p < 1 ? Math.sin(now * 0.02 + jitterSeed[b]) * 7 + Math.random() * 3 : 0;
      var ex = Math.max(0, edgeX + jit);
      ctx.drawImage(art, 0, b * bandH * DPR, ex * DPR, bandH * DPR, 0, b * bandH, ex, bandH);
    }

    if (p < 1) {
      // hot leading edge: re-draw a narrow strip of glyphs, additive
      var stripW = 46;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.rect(edgeX - stripW, 0, stripW, H);
      ctx.clip();
      ctx.drawImage(art, 0, 0, W, H);
      ctx.restore();

      // glow point trailing the etch
      var g = ctx.createRadialGradient(edgeX, comp.midY, 0, edgeX, comp.midY, MOBILE ? 50 : 90);
      g.addColorStop(0, 'rgba(238,241,244,.85)');
      g.addColorStop(0.25, 'rgba(200,204,210,.30)');
      g.addColorStop(1, 'rgba(200,204,210,0)');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.fillRect(edgeX - 100, comp.midY - 100, 200, 200);
      ctx.restore();

      if (!MOBILE) spawnSparks(edgeX, comp.midY);
    }

    // sparks
    if (sparks.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (var i = sparks.length - 1; i >= 0; i--) {
        var s = sparks[i];
        s.x += s.vx; s.y += s.vy; s.vy += 0.02; s.life -= 0.035;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        ctx.globalAlpha = s.life * 0.8;
        ctx.fillStyle = '#e8ebef';
        ctx.fillRect(s.x, s.y, 1.6, 1.6);
      }
      ctx.restore();
    }

    if (p >= 1) {
      // bloom + settle
      var bp = Math.min((t - ETCH) / BLOOM, 1);
      var pulse = Math.sin(bp * Math.PI);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = pulse * 0.22;
      ctx.drawImage(art, 0, 0, W, H);
      ctx.restore();
      if (bp >= 1 && !sparks.length) {
        clearTimeout(failsafe);
        release();
        return;
      }
    }
    requestAnimationFrame(function (n) { frame(t0, n); });
  }

  function start() {
    size();
    paintArt();
    requestAnimationFrame(function (n) { frame(n, n); });
  }

  addEventListener('resize', function () {
    if (!intro.classList.contains('done')) { size(); paintArt(); }
  });

  // Wait for the two display fonts, but never longer than 900ms. If they
  // arrive after the etch has started, repaint the artwork mid-animation —
  // correct glyphs beat a perfectly smooth wrong wordmark.
  var started = false;
  function go() { if (!started) { started = true; start(); } }
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('500 100px "Playfair Display"'),
      document.fonts.load('400 20px "Jost"')
    ]).then(go, go);
    setTimeout(go, 900);
    document.fonts.ready.then(function () {
      if (started && !intro.classList.contains('done')) paintArt();
    });
  } else {
    setTimeout(go, 250);
  }
})();
