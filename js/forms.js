/* ============================================
   LEAD FORM SUBMISSION
   Posts to backend /api/leads (no secrets here)
   ============================================ */

(function () {
  'use strict';

  const FORM_ID = 'lead-form';
  const form = document.getElementById(FORM_ID);
  if (!form || !window.KarmaValidation) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const statusEl = form.querySelector('.form-status');
  const queryApi = new URLSearchParams(window.location.search).get('api');
  const savedApi = localStorage.getItem('karma_api_base') || '';
  const configuredApi = (queryApi || savedApi).trim().replace(/\/+$/, '');
  if (queryApi) localStorage.setItem('karma_api_base', configuredApi);
  const isGitHubPages = window.location.hostname.endsWith('github.io');
  const configuredPath = form.dataset.api || '/api/leads';
  const API_URL = configuredApi ? configuredApi + (configuredPath.startsWith('/') ? configuredPath : '/' + configuredPath) :
    (isGitHubPages ? '' : configuredPath);

  const RATE_KEY = 'karma_lead_last_submit';
  const COOLDOWN_MS = 45000; // 45s between submissions from same browser

  window.KarmaValidation.attachLiveValidation(form);

  function setStatus(type, message) {
    if (!statusEl) return;
    statusEl.className = 'form-status ' + type;
    statusEl.textContent = message;
    statusEl.setAttribute('role', type === 'success' ? 'status' : 'alert');
    statusEl.setAttribute('aria-live', type === 'success' ? 'polite' : 'assertive');
  }

  function setLoading(loading) {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    submitBtn.classList.toggle('loading', loading);
  }

  function getPayload() {
    const data = new FormData(form);
    const payload = {};
    data.forEach(function (value, key) {
      payload[key] = typeof value === 'string' ? value.trim() : value;
    });
    return payload;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Duplicate submission prevention
    if (submitBtn && submitBtn.disabled) return;

    // Client-side validation (UX only; server re-validates)
    if (!window.KarmaValidation.validateForm(form)) {
      setStatus('error', 'Please fix the highlighted fields and try again.');
      return;
    }

    // Honeypot check
    const honeypot = form.querySelector('input[name="website"]');
    if (honeypot && honeypot.value) {
      // Silently pretend success for bots
      setStatus('success', 'Thank you! Your request has been received. We will get back to you shortly.');
      form.reset();
      return;
    }

    // Simple rate limiting (client-side hint only)
    const last = Number(sessionStorage.getItem(RATE_KEY) || 0);
    if (Date.now() - last < COOLDOWN_MS) {
      setStatus('error', 'Please wait a moment before submitting another request.');
      return;
    }

    const payload = getPayload();

    // Attach first-party visitor intelligence & marketing attribution
    if (window.KarmaAnalytics && typeof window.KarmaAnalytics.getAttribution === 'function') {
      const attr = window.KarmaAnalytics.getAttribution();
      payload.visitor_uuid = attr.visitorUuid;
      payload.session_uuid = attr.sessionUuid;
      payload.landing_page = attr.landingPage;
      payload.source = attr.source || 'Website';
      payload.medium = attr.medium;
      payload.campaign = attr.campaign;
    } else {
      payload.source = 'Website';
    }

    setLoading(true);
    setStatus('success', '');

    try {
      if (!API_URL) {
        throw new Error('The enquiry service is not connected yet. The website is hosted on GitHub Pages, which cannot run the Node.js API. Please configure the deployed backend URL before accepting enquiries.');
      }
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        await res.text();
        throw new Error('The enquiry API returned a webpage instead of JSON (HTTP ' + res.status + '). Check the backend URL and deployment.');
      }
      const result = await res.json();

      if (!res.ok || !result.ok) {
        throw new Error(result.message || 'Submission failed. Please try again.');
      }

      sessionStorage.setItem(RATE_KEY, String(Date.now()));
      setStatus('success', result.message || 'Thank you! Your request has been received. We will get back to you shortly.');
      form.reset();
      form.querySelectorAll('.form-group').forEach(function (g) {
        g.classList.remove('invalid');
        const err = g.querySelector('.field-error');
        if (err) err.textContent = '';
      });

      if (result.leadId) {
        console.info('Lead saved:', result.leadId);
        // Dispatch custom analytics conversion event (for GA4 / tag managers)
        try {
          if (window.dataLayer && Array.isArray(window.dataLayer)) {
            window.dataLayer.push({
              event: 'generate_lead',
              lead_id: result.leadId,
              service: payload.service
            });
          }
          window.dispatchEvent(new CustomEvent('karma_lead_submitted', { detail: { leadId: result.leadId } }));
        } catch (_) {}
      }
    } catch (err) {
      setStatus('error', err.message || 'Something went wrong. Please try again or call us directly.');
    } finally {
      setLoading(false);
    }
  });
})();
