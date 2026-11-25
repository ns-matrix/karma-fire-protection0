/* ============================================
   MAIN: preloader, scroll reveal, WhatsApp
   prefill, year stamp, service param
   ============================================ */

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Preloader ---------- */
  const preloader = document.querySelector('.preloader');
  function hidePreloader() {
    if (preloader) preloader.classList.add('hidden');
  }
  if (preloader) {
    window.addEventListener('load', function () {
      setTimeout(hidePreloader, reduceMotion ? 0 : 250);
    });
    // Failsafe: never block content
    setTimeout(hidePreloader, 2500);
  }

  /* ---------- Scroll reveal (IntersectionObserver) ---------- */
  const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('revealed'); });
  } else {
    const io = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- WhatsApp prefilled message ---------- */
  const whatsappBtn = document.querySelector('.float-whatsapp');
  if (whatsappBtn) {
    const params = new URLSearchParams(window.location.search);
    const service = (params.get('service') || '').trim();
    let msg = 'Hello, I would like to know more about your fire protection services.';
    if (service) {
      msg = 'Hello, I am interested in your ' + service + ' service. Please share details.';
    }
    const base = whatsappBtn.getAttribute('href').split('?')[0];
    whatsappBtn.setAttribute('href', base + '?text=' + encodeURIComponent(msg));
  }

  /* ---------- Copyright year ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
