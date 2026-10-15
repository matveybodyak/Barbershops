/* script.js — [SHOP NAME] barbershop. Vanilla JS, no dependencies. */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---- Footer year ---- */
  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---- Mobile menu: toggle, focus trap, Escape, scroll lock ---- */
  var menuBtn = $('.menu-btn');
  var panel = $('#mobileMenu');
  if (menuBtn && panel) {
    var lastFocus = null;
    var panelLinks = $$('a', panel);

    function openMenu() {
      lastFocus = document.activeElement;
      panel.hidden = false;
      menuBtn.setAttribute('aria-expanded', 'true');
      menuBtn.classList.add('is-open');
      $('.menu-txt', menuBtn).textContent = 'Close';
      document.documentElement.classList.add('lock');
      document.addEventListener('keydown', trap);
      if (panelLinks.length) panelLinks[0].focus();
    }
    function closeMenu() {
      panel.hidden = true;
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.classList.remove('is-open');
      $('.menu-txt', menuBtn).textContent = 'Menu';
      document.documentElement.classList.remove('lock');
      document.removeEventListener('keydown', trap);
      if (lastFocus) lastFocus.focus();
    }
    function trap(e) {
      if (e.key === 'Escape') { closeMenu(); return; }
      if (e.key !== 'Tab') return;
      var f = [menuBtn].concat(panelLinks);
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    menuBtn.addEventListener('click', function () {
      panel.hidden ? openMenu() : closeMenu();
    });
    panelLinks.forEach(function (a) { a.addEventListener('click', closeMenu); });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 960 && !panel.hidden) closeMenu();
    });
  }

  /* ---- Hours: highlight today + live Open/Closed status ---- */
  var now = new Date();
  var todayLi = $('.hours [data-day="' + now.getDay() + '"]');
  if (todayLi) {
    todayLi.classList.add('is-today');
    var dayName = $('.h-day', todayLi);
    if (dayName) dayName.textContent += ' · today';
  }

  /* [PLACEHOLDER: shop hours] Fill each day as [openMinutes, closeMinutes], e.g.:
     1: [540, 1020]  = Monday 9:00 AM – 5:00 PM.  Keep null for closed days.
     The "Open now" pill stays hidden while every day is null. */
  var SHOP_HOURS = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
  var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function fmtTime(m) {
    var h = Math.floor(m / 60), mm = m % 60;
    var ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + (mm ? ':' + (mm < 10 ? '0' : '') + mm : '') + ' ' + ap;
  }

  var pill = $('#openStatus');
  if (pill && Object.keys(SHOP_HOURS).some(function (k) { return SHOP_HOURS[k]; })) {
    var nowM = now.getHours() * 60 + now.getMinutes();
    var today = SHOP_HOURS[now.getDay()];
    if (today && nowM >= today[0] && nowM < today[1]) {
      pill.textContent = 'Open now — until ' + fmtTime(today[1]);
    } else {
      pill.textContent = 'Closed';
      for (var i = 0; i < 7; i++) {
        var di = (now.getDay() + i) % 7;
        var r = SHOP_HOURS[di];
        if (r && (i > 0 || nowM < r[0])) {
          var label = i === 0 ? 'today' : (i === 1 ? 'tomorrow' : DAY_NAMES[di]);
          pill.textContent = 'Closed — opens ' + label + ' at ' + fmtTime(r[0]);
          break;
        }
      }
    }
    pill.hidden = false;
  }

  /* ---- Broken-image fallback: hide <img>, show the labeled placeholder
         on the [data-ph] frame ONLY when the photo actually failed ---- */
  function markMissing(img) {
    img.classList.add('is-missing');
    var holder = img.closest('[data-ph]');
    if (holder) holder.classList.add('ph-empty');
  }
  $$('img').forEach(function (img) {
    // the image may have failed before this script ran (cache / slow network)
    if (img.complete && img.naturalWidth === 0) { markMissing(img); return; }
    img.addEventListener('error', function () { markMissing(img); }, { once: true });
  });

  /* ---- Reveal on scroll (skipped under prefers-reduced-motion) ---- */
  var revealEls = $$('[data-reveal]');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---- Booking form (Formspree, enhanced with fetch) ---- */
  var form = $('#bookForm');
  if (form) {
    var status = $('#formStatus');
    var done = $('#formDone');
    var dateInput = $('#f-date');
    if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }

      var btn = $('button[type="submit"]', form);
      btn.disabled = true;
      btn.textContent = 'Sending…';
      status.className = 'form-status';
      status.textContent = '';

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      }).then(function (res) {
        if (res.ok) {
          form.hidden = true;
          done.hidden = false;
          done.focus();
        } else {
          throw new Error('bad response');
        }
      }).catch(function () {
        status.className = 'form-status err';
        status.textContent = 'Hmm — that didn’t go through. Call us and we’ll sort it out right away.';
        btn.disabled = false;
        btn.textContent = 'Send booking request';
      });
    });
  }
})();
