/* ============================================
   SERVER-SIDE VALIDATION & SANITISATION
   Never trust frontend input.
   ============================================ */
'use strict';

const PATTERNS = {
  name: /^[A-Za-z][A-Za-z .'\-]{1,60}$/,
  phone: /^\+?[0-9][0-9 \-]{6,18}[0-9]$/,
  email: /^[^\s@]{1,64}@[^\s@]{1,190}\.[A-Za-z]{2,20}$/,
  uuid: /^[a-zA-Z0-9_\-]{8,64}$/
};

const ALLOWED_SERVICES = [
  'Fire Hydrant System',
  'Fire Alarm System',
  'Fire Sprinkler System',
  'Fire Suppression System',
  'Installation',
  'Maintenance',
  'Inspection',
  'Other'
];

const ALLOWED_BUILDING_TYPES = [
  'Commercial Building',
  'Industrial / Factory',
  'Residential Society',
  'Hospital / Healthcare',
  'Hotel / Restaurant',
  'Warehouse / Logistics',
  'Educational Institution',
  'Other'
];

const ALLOWED_CONTACT_METHODS = ['Phone Call', 'WhatsApp', 'Email'];

/* Strip control chars, collapse whitespace, trim, cap length */
function clean(value, maxLen) {
  if (typeof value !== 'string') return '';
  const out = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return out.slice(0, maxLen);
}

/* Escape for Telegram HTML parse mode & web display */
function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function validateLead(raw) {
  const errors = [];

  const name = clean(raw.name, 60);
  const phoneRaw = clean(raw.phone, 25);
  const phone = phoneRaw.replace(/[\s\-]/g, '');
  const email = clean(raw.email, 100).toLowerCase();
  const company = clean(raw.company, 80);
  const buildingType = clean(raw.building_type, 60);
  const service = clean(raw.service, 60);
  const location = clean(raw.location, 120);
  const message = clean(raw.message, 2000);
  const contactMethod = clean(raw.contact_method, 20);
  const consent = raw.consent === true || raw.consent === 'yes' || raw.consent === 'true' || raw.consent === 1;

  // Attribution parameters
  const visitorUuid = clean(raw.visitor_uuid || raw.visitorUuid, 64);
  const sessionUuid = clean(raw.session_uuid || raw.sessionUuid, 64);
  const landingPage = clean(raw.landing_page || raw.landingPage, 500);
  const medium = clean(raw.medium, 100);
  const campaign = clean(raw.campaign, 100);
  const source = clean(raw.source, 100);

  if (!name || !PATTERNS.name.test(name)) errors.push({ field: 'name', message: 'Please enter a valid name.' });
  if (!phone || !PATTERNS.phone.test(phone) || phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15) {
    errors.push({ field: 'phone', message: 'Please enter a valid phone number.' });
  }
  if (!email || !PATTERNS.email.test(email)) errors.push({ field: 'email', message: 'Please enter a valid email address.' });
  if (!service || !ALLOWED_SERVICES.includes(service)) errors.push({ field: 'service', message: 'Please choose a valid service.' });
  if (!location || location.length < 3) errors.push({ field: 'location', message: 'Please enter the project location.' });
  if (buildingType && !ALLOWED_BUILDING_TYPES.includes(buildingType)) {
    errors.push({ field: 'building_type', message: 'Please choose a valid building type.' });
  }
  if (contactMethod && !ALLOWED_CONTACT_METHODS.includes(contactMethod)) {
    errors.push({ field: 'contact_method', message: 'Please choose a valid contact method.' });
  }
  if (!consent) errors.push({ field: 'consent', message: 'Consent is required to be contacted.' });

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name,
      phone,
      email,
      company: company || null,
      building_type: buildingType || null,
      service,
      location,
      message: message || null,
      contact_method: contactMethod || 'Phone Call',
      consent: true,
      source: source || 'Website',
      visitor_uuid: PATTERNS.uuid.test(visitorUuid) ? visitorUuid : null,
      session_uuid: PATTERNS.uuid.test(sessionUuid) ? sessionUuid : null,
      landing_page: landingPage || null,
      medium: medium || null,
      campaign: campaign || null
    }
  };
}

function validateTracking(raw) {
  const visitorUuid = clean(raw.visitorUuid || raw.visitor_uuid, 64);
  const sessionUuid = clean(raw.sessionUuid || raw.session_uuid, 64);
  const pagePath = clean(raw.pagePath || raw.page_path, 500);
  const pageTitle = clean(raw.pageTitle || raw.page_title, 200);
  const landingPage = clean(raw.landingPage || raw.landing_page, 500);
  const referrer = clean(raw.referrer, 500);
  const source = clean(raw.source, 100);
  const medium = clean(raw.medium, 100);
  const campaign = clean(raw.campaign, 100);
  const deviceCategory = ['desktop', 'mobile', 'tablet'].includes(raw.deviceCategory) ? raw.deviceCategory : 'desktop';
  const consentState = ['granted', 'denied', 'necessary', 'undecided'].includes(raw.consentState) ? raw.consentState : 'undecided';

  if (!visitorUuid || !sessionUuid || !pagePath) {
    return { ok: false, message: 'Missing required visitorUuid, sessionUuid, or pagePath' };
  }

  return {
    ok: true,
    data: {
      visitorUuid,
      sessionUuid,
      pagePath,
      pageTitle: pageTitle || null,
      landingPage: landingPage || pagePath,
      referrer: referrer || null,
      source: source || 'Direct',
      medium: medium || null,
      campaign: campaign || null,
      deviceCategory,
      consentState
    }
  };
}

module.exports = {
  validateLead,
  validateTracking,
  clean,
  escapeHtml,
  ALLOWED_SERVICES,
  ALLOWED_BUILDING_TYPES,
  ALLOWED_CONTACT_METHODS,
  PATTERNS
};
