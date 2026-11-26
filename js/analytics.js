/* ============================================
   KARMA FIRE PROTECTION — FIRST-PARTY ANALYTICS & ATTRIBUTION
   Lightweight, privacy-first, non-invasive visitor tracking
   ============================================ */
'use strict';

(function (window, document) {
  const STORAGE_PREFIX = 'karma_';
  const VISITOR_KEY = STORAGE_PREFIX + 'visitor_uuid';
  const SESSION_KEY = STORAGE_PREFIX + 'session_uuid';
  const SESSION_TIME_KEY = STORAGE_PREFIX + 'session_last_active';
  const LANDING_KEY = STORAGE_PREFIX + 'landing_page';
  const ATTR_KEY = STORAGE_PREFIX + 'attribution';
  const CONSENT_KEY = STORAGE_PREFIX + 'analytics_consent';

  const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes inactivity

  // Generate safe RFC4122 v4 UUID
  function generateUuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Device detection
  function detectDeviceCategory() {
    const ua = navigator.userAgent || '';
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
      return 'mobile';
    }
    if (window.innerWidth <= 768) {
      return 'mobile';
    }
    return 'desktop';
  }

  // Consent Management
  function getConsentState() {
    return localStorage.getItem(CONSENT_KEY) || 'undecided';
  }

  function setConsentState(state) {
    if (state === 'granted' || state === 'necessary') {
      localStorage.setItem(CONSENT_KEY, state);
    } else {
      localStorage.removeItem(CONSENT_KEY);
    }
    const banner = document.getElementById('karma-consent-banner');
    if (banner) banner.remove();
  }

  // Visitor Identification
  function getOrCreateVisitorUuid() {
    let visitorId = null;
    try {
      visitorId = localStorage.getItem(VISITOR_KEY);
    } catch (_) {}

    if (!visitorId) {
      visitorId = generateUuid();
      try {
        localStorage.setItem(VISITOR_KEY, visitorId);
      } catch (_) {}
    }
    return visitorId;
  }

  // Session Management
  function getOrCreateSessionUuid() {
    const now = Date.now();
    let sessionId = null;
    let lastActive = 0;

    try {
      sessionId = sessionStorage.getItem(SESSION_KEY);
      lastActive = parseInt(sessionStorage.getItem(SESSION_TIME_KEY), 10) || 0;
    } catch (_) {}

    if (!sessionId || now - lastActive > SESSION_TIMEOUT_MS) {
      sessionId = generateUuid();
      try {
        sessionStorage.setItem(SESSION_KEY, sessionId);
        sessionStorage.setItem(LANDING_KEY, window.location.pathname + window.location.search);
      } catch (_) {}
    }

    try {
      sessionStorage.setItem(SESSION_TIME_KEY, String(now));
    } catch (_) {}

    return sessionId;
  }

  // Traffic Source & UTM Attribution Engine
  function determineAttribution() {
    try {
      const stored = sessionStorage.getItem(ATTR_KEY);
      if (stored) return JSON.parse(stored);
    } catch (_) {}

    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source');
    const utmMedium = params.get('utm_medium');
    const utmCampaign = params.get('utm_campaign');
    const utmContent = params.get('utm_content');
    const utmTerm = params.get('utm_term');

    let source = 'Direct';
    let medium = null;
    let campaign = utmCampaign || null;

    if (utmSource) {
      source = utmSource;
      medium = utmMedium || 'campaign';
    } else if (document.referrer) {
      try {
        const refUrl = new URL(document.referrer);
        const host = refUrl.hostname.toLowerCase();

        if (host === window.location.hostname) {
          source = 'Direct';
        } else if (/google\.(com|[a-z]{2})/i.test(host)) {
          source = 'Google Organic';
          medium = 'organic';
        } else if (/bing\.com/i.test(host)) {
          source = 'Bing Organic';
          medium = 'organic';
        } else if (/yahoo\.(com|[a-z]{2})/i.test(host)) {
          source = 'Yahoo Organic';
          medium = 'organic';
        } else if (/duckduckgo\.com/i.test(host)) {
          source = 'DuckDuckGo';
          medium = 'organic';
        } else if (/facebook\.com|fb\.me/i.test(host)) {
          source = 'Facebook';
          medium = 'social';
        } else if (/instagram\.com/i.test(host)) {
          source = 'Instagram';
          medium = 'social';
        } else if (/linkedin\.com/i.test(host)) {
          source = 'LinkedIn';
          medium = 'social';
        } else if (/t\.co|twitter\.com|x\.com/i.test(host)) {
          source = 'Twitter / X';
          medium = 'social';
        } else if (/youtube\.com/i.test(host)) {
          source = 'YouTube';
          medium = 'social';
        } else {
          source = 'Referral: ' + host;
          medium = 'referral';
        }
      } catch (_) {
        source = 'Referral';
      }
    }

    const attribution = {
      source,
      medium,
      campaign,
      content: utmContent,
      term: utmTerm
    };

    try {
      sessionStorage.setItem(ATTR_KEY, JSON.stringify(attribution));
    } catch (_) {}

    return attribution;
  }

  // Send Tracking Hit
  function trackPageView() {
    try {
      const visitorUuid = getOrCreateVisitorUuid();
      const sessionUuid = getOrCreateSessionUuid();
      const attribution = determineAttribution();
      const landingPage = sessionStorage.getItem(LANDING_KEY) || window.location.pathname;
      const consentState = getConsentState();

      const payload = {
        visitorUuid,
        sessionUuid,
        pagePath: window.location.pathname,
        pageTitle: document.title,
        landingPage,
        referrer: document.referrer || null,
        source: attribution.source,
        medium: attribution.medium,
        campaign: attribution.campaign,
        deviceCategory: detectDeviceCategory(),
        consentState
      };

      // Visitor event collection is disabled until a consent-aware Supabase analytics module is configured.
      // Collect only after explicit analytics consent; never send identifying form data.
      if (consentState !== 'granted') return;
      const eventKey = 'karma_event_' + window.location.pathname;
      try { if (sessionStorage.getItem(eventKey) === sessionUuid) return; } catch (_) {}
      import('https://esm.sh/@supabase/supabase-js@2').then(function (sdk) {
        const cfg = window.KARMA_SUPABASE || {};
        if (!cfg.url || !cfg.anonKey) return;
        const client = sdk.createClient(cfg.url, cfg.anonKey);
        return client.from('visitor_events').insert({
          visitor_uuid: payload.visitorUuid,
          session_uuid: payload.sessionUuid,
          page_path: payload.pagePath,
          page_title: payload.pageTitle,
          referrer: payload.referrer,
          source: payload.source,
          medium: payload.medium,
          campaign: payload.campaign,
          device_category: payload.deviceCategory,
          consent_state: payload.consentState
        }).then(function (result) {
          if (!result.error) { try { sessionStorage.setItem(eventKey, sessionUuid); } catch (_) {} }
        });
      }).catch(function () {});

    } catch (err) {
      // Analytics failures must never affect page functionality
    }
  }

  // Consent Banner UI
  function initConsentBanner() {
    if (getConsentState() !== 'undecided') return;

    const banner = document.createElement('div');
    banner.id = 'karma-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie and analytics consent');
    banner.innerHTML = `
      <div class="consent-container">
        <div class="consent-text">
          <strong>Privacy &amp; Analytics Notice:</strong> We use minimal, privacy-friendly first-party cookies to measure website performance and remember your preferences. No personal information is sold or shared.
          <a href="/privacy-policy.html" class="consent-link">Read our Privacy Policy</a>.
        </div>
        <div class="consent-buttons">
          <button type="button" class="btn-consent accept" id="btn-consent-accept">Accept All</button>
          <button type="button" class="btn-consent decline" id="btn-consent-decline">Essential Only</button>
        </div>
      </div>
      <style>
        #karma-consent-banner {
          position: fixed;
          bottom: 20px;
          left: 20px;
          right: 20px;
          max-width: 860px;
          margin: 0 auto;
          background: #171717;
          color: #f3f4f6;
          padding: 16px 24px;
          border-radius: 8px;
          border: 1px solid #333;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          z-index: 99999;
          font-family: inherit;
          font-size: 13.5px;
          line-height: 1.5;
        }
        .consent-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }
        .consent-text { flex: 1; min-width: 260px; }
        .consent-link { color: #d9232d; text-decoration: underline; margin-left: 4px; }
        .consent-buttons { display: flex; gap: 10px; align-items: center; }
        .btn-consent {
          padding: 8px 18px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          font-family: inherit;
          transition: opacity 0.2s;
        }
        .btn-consent.accept { background: #d9232d; color: #fff; }
        .btn-consent.accept:hover { opacity: 0.9; }
        .btn-consent.decline { background: #2a2a2a; color: #d1d5db; border: 1px solid #444; }
        .btn-consent.decline:hover { background: #383838; }
        @media (max-width: 600px) {
          #karma-consent-banner { bottom: 10px; left: 10px; right: 10px; padding: 14px 16px; }
          .consent-buttons { width: 100%; justify-content: flex-end; }
        }
      </style>
    `;

    document.body.appendChild(banner);

    document.getElementById('btn-consent-accept').addEventListener('click', function () {
      setConsentState('granted');
      trackPageView();
    });

    document.getElementById('btn-consent-decline').addEventListener('click', function () {
      setConsentState('necessary');
    });
  }

  // Public API
  window.KarmaAnalytics = {
    getVisitorUuid: getOrCreateVisitorUuid,
    getSessionUuid: getOrCreateSessionUuid,
    getAttribution: function () {
      const attr = determineAttribution();
      return {
        visitorUuid: getOrCreateVisitorUuid(),
        sessionUuid: getOrCreateSessionUuid(),
        landingPage: sessionStorage.getItem(LANDING_KEY) || window.location.pathname,
        source: attr.source,
        medium: attr.medium,
        campaign: attr.campaign,
        content: attr.content,
        term: attr.term
      };
    },
    getConsent: getConsentState,
    setConsent: setConsentState,
    trackPageView: trackPageView
  };

  // Auto-track on load
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    trackPageView();
    initConsentBanner();
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      trackPageView();
      initConsentBanner();
    });
  }
})(window, document);
