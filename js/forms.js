/* Supabase-backed public enquiry form. No Node API required. */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
(function () {
  'use strict';
  const form = document.getElementById('lead-form');
  if (!form) return;
  const cfg = window.KARMA_SUPABASE || {};
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.url || '') &&
    cfg.anonKey && !String(cfg.anonKey).includes('YOUR_');
  const supabase = configured ? createClient(cfg.url, cfg.anonKey) : null;
  const submitBtn = form.querySelector('button[type="submit"]');
  const statusEl = form.querySelector('.form-status');
  const RATE_KEY = 'karma_lead_last_submit';
  const COOLDOWN_MS = 45000;

  function status(type, message) {
    if (!statusEl) return;
    statusEl.className = 'form-status ' + type;
    statusEl.textContent = message;
    statusEl.setAttribute('role', type === 'success' ? 'status' : 'alert');
  }
  function safeStorageGet(key) { try { return sessionStorage.getItem(key); } catch (_) { return null; } }
  function safeStorageSet(key, value) { try { sessionStorage.setItem(key, value); } catch (_) {} }

  if (window.KarmaValidation) window.KarmaValidation.attachLiveValidation(form);
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (submitBtn && submitBtn.disabled) return;
    if (window.KarmaValidation && !window.KarmaValidation.validateForm(form)) {
      status('error', 'Please correct the highlighted fields and try again.');
      return;
    }
    if (!form.reportValidity()) return;
    const honeypot = form.querySelector('[name="website"]');
    if (honeypot && honeypot.value) return;
    if (!supabase) {
      status('error', 'The enquiry service is being configured. Please call +91 95949 67751 or email karmafireprotectionllp@gmail.com.');
      return;
    }
    const last = Number(safeStorageGet(RATE_KEY) || 0);
    if (Date.now() - last < COOLDOWN_MS) {
      status('error', 'Please wait before submitting another enquiry.');
      return;
    }
    const data = Object.fromEntries(new FormData(form).entries());
    const attr = window.KarmaAnalytics && window.KarmaAnalytics.getAttribution
      ? window.KarmaAnalytics.getAttribution() : {};
    const payload = {
      name: String(data.name || '').trim(),
      phone: String(data.phone || '').trim(),
      email: String(data.email || '').trim().toLowerCase(),
      company: String(data.company || '').trim() || null,
      building_type: String(data.building_type || ''),
      service: String(data.service || ''),
      location: String(data.location || '').trim(),
      message: String(data.message || '').trim() || null,
      contact_method: String(data.contact_method || 'Phone Call'),
      consent: data.consent === 'yes',
      source: attr.source || 'Website',
      medium: attr.medium || null,
      campaign: attr.campaign || null,
      landing_page: attr.landingPage || location.pathname,
      visitor_uuid: attr.visitorUuid || null,
      session_uuid: attr.sessionUuid || null
    };
    if (!payload.consent) { status('error', 'Please provide consent before submitting.'); return; }
    if (submitBtn) submitBtn.disabled = true;
    status('', 'Submitting your enquiry…');
    try {
      const { error } = await supabase.from('leads').insert(payload);
      if (error) throw error;
      safeStorageSet(RATE_KEY, String(Date.now()));
      status('success', 'Thank you. Your enquiry has been received. Our team will contact you shortly.');
      form.reset();
      form.querySelectorAll('.form-group').forEach(group => {
        group.classList.remove('invalid');
        const err = group.querySelector('.field-error');
        if (err) err.textContent = '';
      });
      window.dispatchEvent(new CustomEvent('karma_lead_submitted')); 
    } catch (error) {
      console.error('Karma lead submission failed:', error);
      status('error', 'We could not submit your enquiry right now. Please call +91 95949 67751 or try again later.');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
})();
