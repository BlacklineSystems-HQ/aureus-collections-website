/* ============================================================================
   AUREUS COLLECTIONS — main.js
   Nav, menu, cursor, reveals, scroll depth (GSAP), contact form.
   All motion: transform + opacity only.
   ============================================================================ */
(function () {
  'use strict';

  var CONFIG = {
    // Get a free key at https://web3forms.com — deliveries go to the email
    // the key is registered to (lukeapplebt@gmail.com).
    WEB3FORMS_ACCESS_KEY: 'REPLACE_WITH_WEB3FORMS_ACCESS_KEY',
    // Optional: Make.com webhook for the future SMS relay. Leave as-is to disable.
    SMS_WEBHOOK_URL: 'REPLACE_WITH_MAKE_WEBHOOK_URL'
  };

  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- custom cursor ------------------------------------------------------ */
  (function () {
    if (matchMedia('(hover: none), (pointer: coarse)').matches) return;
    var ring = document.querySelector('.cursor'), dot = document.querySelector('.cursor-dot');
    if (!ring || !dot) return;
    var rx = innerWidth / 2, ry = innerHeight / 2, dx = rx, dy = ry;
    ring.style.opacity = '0'; dot.style.opacity = '0'; // hidden until the mouse moves
    addEventListener('mousemove', function (e) {
      dx = e.clientX; dy = e.clientY;
      ring.style.opacity = ''; dot.style.opacity = '';
      dot.style.transform = 'translate(' + dx + 'px,' + dy + 'px) translate(-50%,-50%)';
    }, { passive: true });
    (function loop() {
      rx += (dx - rx) * 0.18; ry += (dy - ry) * 0.18;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
      requestAnimationFrame(loop);
    })();
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest('a,button,input,select,textarea,.work-tile')) ring.classList.add('grow');
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest('a,button,input,select,textarea,.work-tile')) ring.classList.remove('grow');
    });
  })();

  /* ---- nav scrolled state -------------------------------------------------- */
  (function () {
    var nav = document.getElementById('nav');
    if (!nav) return;
    addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', scrollY > 40);
    }, { passive: true });
  })();

  /* ---- mobile menu ----------------------------------------------------------- */
  (function () {
    var btn = document.getElementById('menuBtn'), overlay = document.getElementById('menuOverlay');
    if (!btn || !overlay) return;
    function set(open) {
      btn.classList.toggle('open', open);
      overlay.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      overlay.setAttribute('aria-hidden', String(!open));
      document.body.style.overflow = open ? 'hidden' : '';
    }
    btn.addEventListener('click', function () { set(!overlay.classList.contains('open')); });
    overlay.addEventListener('click', function (e) {
      if (e.target.closest('a') || e.target === overlay) set(false);
    });
    addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
  })();

  /* ---- section reveals --------------------------------------------------------- */
  (function () {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    function arm() {
      document.querySelectorAll('.reveal:not(.in)').forEach(function (el) { io.observe(el); });
    }
    // Hero reveals fire when the intro releases the page; everything else on scroll.
    if (document.body.classList.contains('ready')) arm();
    else addEventListener('aureus:introdone', arm, { once: true });
    // Belt and suspenders if the intro was removed before this script ran.
    setTimeout(arm, 4500);
  })();

  /* ---- scroll depth (GSAP) -------------------------------------------------------- */
  (function () {
    if (reduced || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    // Hero layers drift at different speeds — background slowest.
    document.querySelectorAll('[data-depth]').forEach(function (el) {
      var depth = parseFloat(el.getAttribute('data-depth')) || 0.5;
      gsap.to(el, {
        yPercent: -22 * (1 - depth),
        opacity: depth < 0.5 ? 1 : 0.35,
        ease: 'none',
        scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    });

    // Images get a subtle counter-drift inside their frames.
    document.querySelectorAll('[data-parallax-img] img').forEach(function (img) {
      gsap.fromTo(img, { yPercent: -6, scale: 1.12 }, {
        yPercent: 6,
        scale: 1.12,
        ease: 'none',
        scrollTrigger: { trigger: img.closest('figure'), start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    // Display headings ease up slightly faster than their sections — depth cue.
    document.querySelectorAll('h2.display').forEach(function (h) {
      gsap.fromTo(h, { yPercent: 14 }, {
        yPercent: -6,
        ease: 'none',
        scrollTrigger: { trigger: h, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  })();

  /* ---- hero video (desktop only; photo is the fallback) ------------------------ */
  (function () {
    var v = document.getElementById('heroVideo');
    var btn = document.getElementById('soundBtn');
    var hero = document.getElementById('hero');
    if (!v || reduced || matchMedia('(max-width: 768px)').matches) return;
    v.preload = 'auto';
    v.src = './assets/hero-loop.mp4';
    // Fade in only once frames are actually rendering; the photo stays otherwise.
    v.addEventListener('playing', function () {
      v.classList.add('on');
      if (btn) { btn.hidden = false; requestAnimationFrame(function () { btn.classList.add('show'); }); }
    }, { once: true });
    function setBtn() {
      if (!btn) return;
      btn.textContent = v.muted ? 'Sound On' : 'Sound Off';
      btn.setAttribute('aria-pressed', String(!v.muted));
    }

    // Try sound-on autoplay first. Browsers only allow it for engaged/returning
    // visitors; everyone else gets muted playback, then sound enables itself on
    // the first click, tap, or keypress anywhere on the page.
    v.muted = false;
    v.volume = 1;
    var p = v.play();
    if (p && p.then) {
      p.then(setBtn).catch(function () {
        v.muted = true;
        setBtn();
        var retry = v.play();
        if (retry && retry.catch) retry.catch(function () { /* photo remains */ });
        var unmute = function (e) {
          removeEventListener('pointerdown', unmute);
          removeEventListener('keydown', unmute);
          removeEventListener('touchend', unmute);
          // If the first interaction IS the sound button, let its own handler decide.
          if (e && e.target && e.target.closest && e.target.closest('#soundBtn')) return;
          v.muted = false;
          v.volume = 1;
          setBtn();
        };
        addEventListener('pointerdown', unmute);
        addEventListener('keydown', unmute);
        addEventListener('touchend', unmute);
      });
    }

    if (btn) {
      setBtn();
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        v.muted = !v.muted;
        if (!v.muted) v.volume = 1;
        setBtn();
      });
    }

    // Pause and mute when the hero scrolls out of view; resume on return.
    if (hero && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { v.play().catch(function () {}); }
          else { v.pause(); v.muted = true; setBtn(); }
        });
      }, { threshold: 0.2 }).observe(hero);
    }
  })();

  /* ---- contact form ------------------------------------------------------------------ */
  (function () {
    var form = document.getElementById('contactForm');
    var success = document.getElementById('formSuccess');
    var label = document.getElementById('submitLabel');
    var note = document.getElementById('formNote');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      label.textContent = 'Sending…';

      var keyed = CONFIG.WEB3FORMS_ACCESS_KEY && CONFIG.WEB3FORMS_ACCESS_KEY.indexOf('REPLACE') !== 0;
      var jobs = [];

      if (keyed) {
        jobs.push(fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(Object.assign({
            access_key: CONFIG.WEB3FORMS_ACCESS_KEY,
            subject: 'New Aureus inquiry — ' + (data.name || '') + ' (' + (data.project_type || '') + ')',
            from_name: 'Aureus Collections Website'
          }, data))
        }).then(function (r) { return r.ok; }));
      }
      if (CONFIG.SMS_WEBHOOK_URL && CONFIG.SMS_WEBHOOK_URL.indexOf('REPLACE') !== 0) {
        jobs.push(fetch(CONFIG.SMS_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(function (r) { return r.ok; }).catch(function () { return false; }));
      }

      if (!jobs.length) {
        // No delivery key configured yet — be honest, route to direct contact.
        label.textContent = 'Send to Luke';
        note.textContent = 'Form delivery isn’t live yet — call or text (209) 410-2304 instead.';
        note.classList.add('error');
        return;
      }

      Promise.all(jobs).then(function (results) {
        if (results.some(Boolean)) {
          form.hidden = true;
          success.hidden = false;
          success.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
        } else { throw new Error('delivery failed'); }
      }).catch(function () {
        label.textContent = 'Send to Luke';
        note.textContent = 'Something went sideways. Call or text (209) 410-2304 — it goes to the same place.';
        note.classList.add('error');
      });
    });
  })();
})();
