/* ============================================
   NAVIGATION: sticky header, mobile menu,
   active link, smooth scroll, back-to-top
   ============================================ */

(function () {
  'use strict';

  const header = document.querySelector('.site-header');
  const navToggle = document.querySelector('.nav-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const menuClose = document.querySelector('.menu-close');
  const backToTop = document.querySelector('.float-top');

  /* ---------- Sticky header ---------- */
  function onScroll() {
    const y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('scrolled', y > 40);
    if (backToTop) backToTop.classList.toggle('visible', y > 500);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  function setMenu(open) {
    if (!mobileMenu || !navToggle) return;
    mobileMenu.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    mobileMenu.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('menu-open', open);
    if (open) {
      const first = mobileMenu.querySelector('a, button');
      if (first) first.focus();
    } else {
      navToggle.focus();
    }
  }

  if (navToggle) {
    navToggle.addEventListener('click', function () {
      setMenu(navToggle.getAttribute('aria-expanded') !== 'true');
    });
  }

  if (menuClose) {
    menuClose.addEventListener('click', function () { setMenu(false); });
  }

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mobileMenu && mobileMenu.classList.contains('open')) {
      setMenu(false);
    }
  });

  // Close menu when a link inside is clicked
  if (mobileMenu) {
    mobileMenu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
  }

  /* ---------- Smooth scroll for same-page anchors ---------- */
  document.addEventListener('click', function (e) {
    const link = e.target.closest('a[href*="#"]');
    if (!link) return;
    const url = new URL(link.href, window.location.href);
    if (url.pathname !== window.location.pathname || !url.hash) return;
    const target = document.querySelector(url.hash);
    if (!target) return;
    e.preventDefault();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const offset = (header ? header.offsetHeight : 80) + 10;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
    history.pushState(null, '', url.hash);
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  /* ---------- Active nav link ---------- */
  function markActive() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.main-nav a, .mobile-menu nav a').forEach(function (a) {
      const href = a.getAttribute('href');
      if (!href) return;
      const file = href.split('/').pop().split('#')[0];
      if (file === path) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      }
    });
  }
  markActive();
})();
