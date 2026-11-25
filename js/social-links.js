/* ============================================
   KARMA FIRE PROTECTION — SOCIAL LINKS LOADER
   Renders the floating social buttons from the
   admin panel settings (GET /api/settings/social).
   Falls back to the hardcoded buttons when the
   API is unavailable (e.g. static hosting).
   ============================================ */
(function () {
  'use strict';

  var ICONS = {
    social_whatsapp: '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.14-.14.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.22 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.42-.08-.12-.27-.2-.57-.34M12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.89 9.89-9.89 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.43 9.89-9.88 9.89m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45h.01c6.55 0 11.89-5.34 11.89-11.9 0-3.17-1.24-6.16-3.48-8.41"/></svg>',
    social_instagram: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
    social_facebook: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6c-.29-.04-1.27-.13-2.41-.13-2.39 0-4.03 1.46-4.03 4.13v2.3H7.5V13h2.76v8h3.24z"/></svg>',
    social_youtube: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23 12s0-3.85-.5-5.6a2.9 2.9 0 0 0-2.05-2.06C18.6 3.85 12 3.85 12 3.85s-6.6 0-8.45.49A2.9 2.9 0 0 0 1.5 6.4C1 8.15 1 12 1 12s0 3.85.5 5.6a2.9 2.9 0 0 0 2.05 2.06c1.85.49 8.45.49 8.45.49s6.6 0 8.45-.49A2.9 2.9 0 0 0 22.5 17.6C23 15.85 23 12 23 12zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>',
    social_linkedin: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.94 8.5H3.56V21h3.38V8.5zM5.25 3A1.96 1.96 0 1 0 5.25 6.92 1.96 1.96 0 0 0 5.25 3zM21 13.7c0-3.32-1.77-4.87-4.13-4.87-1.9 0-2.75 1.05-3.22 1.78V8.5H10.3V21h3.35v-6.57c0-1.73.9-2.75 2.27-2.75 1.3 0 1.96.92 1.96 2.75V21H21v-7.3z"/></svg>',
    social_email: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm9 7.5L20 7H4l8 5.5zM4 9.2V18h16V9.2l-8 5.5-8-5.5z"/></svg>'
  };

  var META = {
    social_whatsapp: { label: 'WhatsApp', aria: 'Chat with us on WhatsApp', order: 1 },
    social_instagram: { label: 'Instagram', aria: 'Follow us on Instagram', order: 2 },
    social_facebook: { label: 'Facebook', aria: 'Follow us on Facebook', order: 3 },
    social_youtube: { label: 'YouTube', aria: 'Watch us on YouTube', order: 4 },
    social_linkedin: { label: 'LinkedIn', aria: 'Connect with us on LinkedIn', order: 5 },
    social_email: { label: 'Email', aria: 'Email us', order: 6 }
  };

  function valueOf(entry) {
    if (!entry) return '';
    if (typeof entry === 'string') return entry.trim();
    return String(entry.value || '').trim();
  }

  function buildButton(key, href) {
    var meta = META[key];
    var isMail = key === 'social_email';
    var link = isMail && href.indexOf('mailto:') !== 0 ? 'mailto:' + href : href;
    return (
      '<a class="float-btn float-' + key.replace('social_', '') + '" href="' + link + '"' +
      (isMail ? '' : ' target="_blank" rel="noopener noreferrer"') +
      ' aria-label="' + meta.aria + '" data-tip="' + meta.label + '">' +
      ICONS[key] +
      '</a>'
    );
  }

  async function init() {
    var container = document.querySelector('.float-actions');
    if (!container) return;

    var data;
    try {
      var res = await fetch('/api/settings/social');
      data = await res.json();
    } catch (e) {
      return; // Static hosting / API down: keep the hardcoded fallback buttons
    }
    if (!data || !data.ok || !data.social) return;

    var social = data.social;

    // Admin toggle: hide all social buttons (back-to-top stays)
    if (valueOf(social.show_floating_buttons) === 'false') {
      Array.prototype.forEach.call(container.querySelectorAll('.float-btn:not(.float-top)'), function (el) {
        el.remove();
      });
      return;
    }

    var keys = Object.keys(META)
      .filter(function (key) { return valueOf(social[key]); })
      .sort(function (a, b) { return META[a].order - META[b].order; });
    if (!keys.length) return;

    // Rebuild: configured social buttons first, back-to-top button kept last
    var topBtn = container.querySelector('.float-top');
    Array.prototype.forEach.call(container.querySelectorAll('.float-btn:not(.float-top)'), function (el) {
      el.remove();
    });
    var html = keys.map(function (key) { return buildButton(key, valueOf(social[key])); }).join('');
    if (topBtn) {
      topBtn.insertAdjacentHTML('beforebegin', html);
    } else {
      container.insertAdjacentHTML('beforeend', html);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
