/* ============================================
   CLIENT-SIDE VALIDATION HELPERS
   Note: server re-validates everything — this
   only improves UX (never trusted alone).
   ============================================ */

(function (window) {
  'use strict';

  const patterns = {
    name: /^[A-Za-z][A-Za-z .'-]{1,60}$/,
    // Indian + international friendly phone: optional +, digits, 7-15 total
    phone: /^\+?[0-9]{7,15}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
  };

  const messages = {
    name: 'Please enter a valid name (2–60 characters).',
    phone: 'Please enter a valid phone number (7–15 digits, + optional).',
    email: 'Please enter a valid email address.',
    required: 'This field is required.',
    select: 'Please choose an option.',
    consent: 'Please tick the box so we can contact you.',
    tooLong: 'This entry is too long.'
  };

  function clean(value) {
    return (value || '').toString().trim();
  }

  function validateField(field) {
    const type = field.type;
    const value = clean(field.value);
    let error = '';

    if (field.hasAttribute('required') || type === 'checkbox') {
      if (type === 'checkbox' && !field.checked) {
        error = messages.consent;
      } else if (type !== 'checkbox' && value === '') {
        error = field.tagName === 'SELECT' ? messages.select : messages.required;
      }
    }

    if (!error && value !== '') {
      if (field.name === 'name' && !patterns.name.test(value)) error = messages.name;
      else if (field.name === 'phone' && !patterns.phone.test(value.replace(/[\s-]/g, ''))) error = messages.phone;
      else if (field.type === 'email' && !patterns.email.test(value)) error = messages.email;
      else if (field.maxLength && field.maxLength > 0 && value.length > field.maxLength) error = messages.tooLong;
    }

    return error;
  }

  function showError(field, message) {
    const group = field.closest('.form-group');
    if (!group) return;
    group.classList.toggle('invalid', Boolean(message));
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    const errEl = group.querySelector('.field-error');
    if (errEl) errEl.textContent = message || '';
  }

  function validateForm(form) {
    let firstInvalid = null;
    form.querySelectorAll('.form-control').forEach(function (field) {
      if (field.name === 'website' || field.type === 'hidden') return; // honeypot
      const error = validateField(field);
      showError(field, error);
      if (error && !firstInvalid) firstInvalid = field;
    });
    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }

  // Live validation on blur
  function attachLiveValidation(form) {
    form.querySelectorAll('.form-control').forEach(function (field) {
      field.addEventListener('blur', function () {
        if (field.value.trim() === '' && !field.hasAttribute('required')) return;
        showError(field, validateField(field));
      });
      field.addEventListener('input', function () {
        const group = field.closest('.form-group');
        if (group && group.classList.contains('invalid')) {
          showError(field, validateField(field));
        }
      });
    });
  }

  window.KarmaValidation = {
    patterns: patterns,
    messages: messages,
    validateField: validateField,
    validateForm: validateForm,
    attachLiveValidation: attachLiveValidation,
    showError: showError
  };
})(window);
