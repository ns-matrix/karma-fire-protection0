/* ============================================
   KARMA FIRE PROTECTION — INTELLIGENCE & CRM SERVER
   Serves static website + API endpoints for
   Visitor Analytics, CRM Leads, Admin Dashboard & Telegram
   CSV-based storage (no SQLite)
   ============================================ */
'use strict';

require('dotenv').config();

const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');

const csvStore = require('./csv-store');
const { validateLead, validateTracking, escapeHtml } = require('./validate');
const telegram = require('./telegram');
const emailService = require('./email');
const auth = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_ROOT = path.join(__dirname, '..', '..');
const ADMIN_ROOT = path.join(__dirname, 'admin');

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/* ---------- Security Middleware ---------- */

// CORS: allow configured origins or same-origin requests with no Origin header
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      return res.status(403).json({ ok: false, message: 'Origin not allowed.' });
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Hardening HTTP headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https:;"
  );
  next();
});

// Body parsing with size limit
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));

// Request logging (PII-free)
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  }
  next();
});

/* ---------- Helper for IP Hashing (No raw IPs stored) ---------- */
function getIpHash(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.socket.remoteAddress || 'unknown';
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

/* ---------- Google Sheets sync (Apps Script webhook) ----------
   The sheet itself cannot be written to directly without Google API
   credentials, so leads are POSTed to a Google Apps Script web app
   bound to the sheet (one-time setup — see docs/GOOGLE_SHEETS.md).
   Failures never block lead saving. */
const SHEET_HEADERS = ['Lead ID', 'Name', 'Phone', 'Email', 'Company', 'Service', 'Message', 'Source', 'Status', 'Created At'];

function leadToSheetRow(lead) {
  return [
    lead.id, lead.name, lead.phone, lead.email, lead.company || '',
    lead.service, lead.message || '', lead.source || '', lead.status, lead.createdAt
  ];
}

async function pushToGoogleSheets(rows) {
  const webhook = csvStore.getSettings().googleSheetsWebhook;
  if (!webhook || !webhook.startsWith('https://script.google.com/')) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headers: SHEET_HEADERS, rows }),
      signal: controller.signal
    });
    return res.ok;
  } catch (err) {
    console.error('Google Sheets sync error:', err.message);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- Rate Limiting (in-memory, per-process) ---------- */
const rateLimitStore = new Map();

function checkRateLimit(key, max, windowSec) {
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const entry = rateLimitStore.get(key);
  if (!entry || now - entry.resetAt > windowMs) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) {
    return false;
  }
  entry.count++;
  return true;
}

/* ---------- Static Frontends ---------- */

// Serve admin dashboard at /admin
app.use('/admin', express.static(ADMIN_ROOT, {
  index: ['index.html'],
  setHeaders(res) {
    res.setHeader('Cache-Control', 'no-cache');
  }
}));

// Serve static website
app.use(
  express.static(SITE_ROOT, {
    index: ['index.html'],
    maxAge: '1h',
    setHeaders(res, filePath) {
      if (/\.(html)$/.test(filePath)) res.setHeader('Cache-Control', 'no-cache');
    }
  })
);

/* ---------- Health check ---------- */
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    status: 'healthy',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    storage: 'csv',
    csvFiles: {
      leads: csvStore.LEAD_HEADERS.length,
      activity: csvStore.ACTIVITY_HEADERS.length
    }
  });
});

/* ---------- Public site settings (social links for the website) ---------- */
app.get('/api/settings/social', (req, res) => {
  try {
    const settings = csvStore.getSettings();
    const social = {};
    for (const key of csvStore.SETTING_KEYS) {
      if (key.startsWith('social_') || key === 'show_floating_buttons') {
        social[key] = { value: settings[key] };
      }
    }
    res.json({ ok: true, social });
  } catch (err) {
    console.error('Social settings error:', err);
    res.status(500).json({ ok: false, message: 'Failed to load social settings.' });
  }
});

/* ============================================================
   PHASE 2: WEBSITE VISITOR ANALYTICS
   POST /api/track
   ============================================================ */
app.post('/api/track', (req, res) => {
  try {
    const ipHash = getIpHash(req);

    // Rate limit: max 60 tracking hits per minute per IP hash
    if (!checkRateLimit(`track:${ipHash}`, 60, 60)) {
      return res.status(429).json({ ok: false, message: 'Too many tracking requests.' });
    }

    const validation = validateTracking(req.body || {});
    if (!validation.ok) {
      return res.status(400).json({ ok: false, message: validation.message });
    }

    // Store tracking data in CSV activity log
    csvStore.logActivity({
      leadId: '',
      action: 'pageview',
      details: JSON.stringify(validation.data),
      userId: 'anonymous',
      ip: ipHash
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Tracking API error:', err);
    // Analytics failures must never break client or leak internal details
    return res.status(200).json({ ok: true });
  }
});

/* ============================================================
   PHASE 3 & 4: CONTACT FORM CRM & NOTIFICATIONS
   POST /api/leads
   ============================================================ */
app.post('/api/leads', async (req, res) => {
  try {
    const body = req.body || {};

    // 1) Honeypot: silently pretend success for bots
    if (typeof body.website === 'string' && body.website.trim() !== '') {
      console.warn('Honeypot triggered — bot submission discarded.');
      return res.status(200).json({
        ok: true,
        message: 'Thank you! Your request has been received. We will get back to you shortly.'
      });
    }

    // 2) Rate limiting: per-IP, max 5 submissions per 10 minutes
    const ipHash = getIpHash(req);
    if (!checkRateLimit(`lead:${ipHash}`, 5, 600)) {
      return res.status(429).json({
        ok: false,
        message: 'Too many requests. Please wait a few minutes and try again.'
      });
    }

    // 3) Server-side validation & sanitization
    const result = validateLead(body);
    if (!result.ok) {
      return res.status(400).json({
        ok: false,
        message: 'Please check the form fields and try again.',
        errors: result.errors
      });
    }

    // 4) Save lead to CSV
    const lead = await csvStore.appendLead({ ...result.data, ip: ipHash });
    console.log(`✅ Lead saved: ${lead.id}`);

    // 5) Telegram notification (failure must not invalidate the saved lead)
    try {
      await telegram.notifyNewLead(lead);
    } catch (err) {
      console.error('Telegram notification error:', err.message);
    }

    // 6) Email notification (failure must not invalidate the saved lead)
    try {
      await emailService.sendNewLeadEmail(lead);
    } catch (err) {
      console.error('Email notification error:', err.message);
    }

    // 7) Google Sheets sync (fire-and-forget, never blocks the response)
    pushToGoogleSheets([leadToSheetRow(lead)]).catch(() => {});

    return res.status(201).json({
      ok: true,
      leadId: lead.id,
      message: 'Thank you! Your request has been received. We will get back to you shortly.'
    });
  } catch (err) {
    console.error('Lead submission error:', err);
    return res.status(500).json({
      ok: false,
      message: 'Something went wrong on our side. Please try again or call +91 95949 67751.'
    });
  }
});

/* ============================================================
   PHASE 6: ADMIN AUTHENTICATION & CRM DASHBOARD APIS
   ============================================================ */

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const ipHash = getIpHash(req);

  // Rate limit login attempts: max 5 attempts per 15 minutes
  if (!checkRateLimit(`login:${ipHash}`, 5, 900)) {
    return res.status(429).json({
      ok: false,
      message: 'Too many failed login attempts. Please wait 15 minutes.'
    });
  }

  const { userId, password } = req.body || {};
  if (!userId || !password) {
    return res.status(400).json({ ok: false, message: 'User ID and password are required.' });
  }

  // Verify against built-in hashed credentials (or .env override if configured)
  if (!auth.verifyAdminCredentials(userId, password)) {
    return res.status(401).json({ ok: false, message: 'Invalid user ID or password.' });
  }

  const token = auth.createToken({ id: 1, userId });

  res.setHeader(
    'Set-Cookie',
    `admin_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  );

  return res.json({
    ok: true,
    token,
    user: { id: 1, userId }
  });
});

// Admin Logout
app.post('/api/admin/logout', (req, res) => {
  res.setHeader(
    'Set-Cookie',
    `admin_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
  );
  res.json({ ok: true, message: 'Logged out successfully.' });
});

// Admin Profile - Get current user
app.get('/api/admin/me', auth.requireAdminAuth, (req, res) => {
  res.json({ ok: true, user: req.admin });
});

// Admin Change Password
app.post('/api/admin/change-password', auth.requireAdminAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ ok: false, message: 'Current and new password required.' });
  }

  const adminUserId = req.admin.userId;
  if (!auth.verifyAdminCredentials(adminUserId, currentPassword)) {
    return res.status(401).json({ ok: false, message: 'Current password is incorrect.' });
  }

  if (newPassword.length < 12) {
    return res.status(400).json({ ok: false, message: 'New password must be at least 12 characters.' });
  }

  try {
    auth.changePassword(adminUserId, newPassword);
    res.json({ ok: true, message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ ok: false, message: 'Failed to update password.' });
  }
});

// Admin Overview Metrics & Charts
app.get('/api/admin/overview', auth.requireAdminAuth, (req, res) => {
  try {
    const stats = csvStore.getStats();
    const recentLeads = csvStore.getLeads({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }).items;

    res.json({
      ok: true,
      data: {
        overview: {
          totalLeads: stats.total,
          todayLeads: stats.today,
          thisMonthLeads: stats.thisMonth,
          conversionRate: stats.conversionRate
        },
        charts: {
          dailyVisitors: [],
          dailyEnquiries: []
        },
        leadStats: stats.byStatus,
        sources: [],
        topPages: [],
        recentLeads
      }
    });
  } catch (err) {
    console.error('Admin overview error:', err);
    res.status(500).json({ ok: false, message: 'Failed to load dashboard overview.' });
  }
});

// Admin Leads (Paginated & Filtered)
app.get('/api/admin/leads', auth.requireAdminAuth, (req, res) => {
  try {
    const { status, service, source, search, from, to, page, limit, sortBy, sortOrder } = req.query;
    const result = csvStore.getLeads({
      status, service, source, search, from, to,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 25,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc'
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('Admin leads query error:', err);
    res.status(500).json({ ok: false, message: 'Failed to retrieve leads.' });
  }
});

// Admin Lead Details (with Activity Journey)
app.get('/api/admin/leads/:leadId', auth.requireAdminAuth, (req, res) => {
  try {
    const lead = csvStore.getLeadById(req.params.leadId);
    if (!lead) return res.status(404).json({ ok: false, message: 'Lead not found.' });

    const activity = csvStore.getActivity(lead.id, 50);

    res.json({ ok: true, lead, activity });
  } catch (err) {
    console.error('Lead details error:', err);
    res.status(500).json({ ok: false, message: 'Failed to retrieve lead details.' });
  }
});

// Admin Update Lead Status & Notes
app.patch('/api/admin/leads/:leadId', auth.requireAdminAuth, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { status, notes, assignedTo } = req.body || {};

    let lead = csvStore.getLeadById(leadId);
    if (!lead) return res.status(404).json({ ok: false, message: 'Lead not found.' });

    const updates = { userId: req.admin.userId, ip: getIpHash(req) };
    if (status && csvStore.VALID_STATUSES.includes(status)) {
      updates.status = status;
    }
    if (typeof notes === 'string') {
      updates.notes = notes.trim();
    }
    if (typeof assignedTo === 'string') {
      updates.assignedTo = assignedTo.trim();
    }

    lead = await csvStore.updateLead(leadId, updates);
    res.json({ ok: true, lead });
  } catch (err) {
    console.error('Lead update error:', err);
    res.status(500).json({ ok: false, message: 'Failed to update lead.' });
  }
});

// Admin Delete Lead
app.delete('/api/admin/leads/:leadId', auth.requireAdminAuth, (req, res) => {
  try {
    const { leadId } = req.params;
    const deleted = csvStore.deleteLead(leadId, req.admin.userId, getIpHash(req));
    if (!deleted) return res.status(404).json({ ok: false, message: 'Lead not found.' });
    res.json({ ok: true, message: 'Lead deleted successfully.' });
  } catch (err) {
    console.error('Lead delete error:', err);
    res.status(500).json({ ok: false, message: 'Failed to delete lead.' });
  }
});

// Admin CSV Export
app.get('/api/admin/leads/export/csv', auth.requireAdminAuth, (req, res) => {
  try {
    const ipHash = getIpHash(req);
    if (!checkRateLimit(`export:${ipHash}`, 5, 300)) {
      return res.status(429).json({ ok: false, message: 'Export rate limit reached. Please wait.' });
    }

    const { status, service, source, from, to } = req.query;
    const result = csvStore.getLeads({ status, search: '', page: 1, limit: 10000 });
    let rows = result.items;

    // Additional filtering
    if (service) rows = rows.filter(r => r.service === service);
    if (source) rows = rows.filter(r => r.source === source);
    if (from) rows = rows.filter(r => r.createdAt >= from);
    if (to) rows = rows.filter(r => r.createdAt <= to);

    const csv = csvStore.exportCsv();

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="karma-leads-export-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(`\uFEFF${csv}`);
  } catch (err) {
    console.error('CSV export error:', err);
    res.status(500).json({ ok: false, message: 'Failed to generate CSV export.' });
  }
});

// Admin Activity Log
app.get('/api/admin/activity', auth.requireAdminAuth, (req, res) => {
  try {
    const { leadId, limit } = req.query;
    const activity = csvStore.getActivity(leadId, parseInt(limit, 10) || 100);
    res.json({ ok: true, activity });
  } catch (err) {
    console.error('Activity log error:', err);
    res.status(500).json({ ok: false, message: 'Failed to retrieve activity log.' });
  }
});

// Admin Stats
app.get('/api/admin/stats', auth.requireAdminAuth, (req, res) => {
  try {
    const stats = csvStore.getStats();
    res.json({ ok: true, stats });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ ok: false, message: 'Failed to retrieve stats.' });
  }
});

// Admin Settings - Get
app.get('/api/admin/settings', auth.requireAdminAuth, (req, res) => {
  res.json({
    ok: true,
    settings: {
      ...csvStore.getSettings(),
      telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      emailConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),
      csvStorage: 'active',
      nodeVersion: process.version,
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'production'
    }
  });
});

// Admin Settings - All stored key/value settings (social links, sheets, etc.)
app.get('/api/admin/settings/all', auth.requireAdminAuth, (req, res) => {
  res.json({ ok: true, settings: csvStore.getSettings() });
});

// Admin Settings - Update Google Sheets URL / webhook
app.patch('/api/admin/settings', auth.requireAdminAuth, (req, res) => {
  try {
    const { googleSheetsUrl, googleSheetsWebhook } = req.body || {};
    if (googleSheetsUrl !== undefined) {
      if (googleSheetsUrl && !googleSheetsUrl.startsWith('https://docs.google.com/spreadsheets/')) {
        return res.status(400).json({ ok: false, message: 'Invalid Google Sheets URL format.' });
      }
      csvStore.updateSetting('googleSheetsUrl', googleSheetsUrl || '');
    }
    if (googleSheetsWebhook !== undefined) {
      if (googleSheetsWebhook && !googleSheetsWebhook.startsWith('https://script.google.com/')) {
        return res.status(400).json({ ok: false, message: 'Sync URL must be a Google Apps Script web app (https://script.google.com/...).' });
      }
      csvStore.updateSetting('googleSheetsWebhook', googleSheetsWebhook || '');
    }
    res.json({ ok: true, settings: csvStore.getSettings() });
  } catch (err) {
    console.error('Settings update error:', err);
    res.status(500).json({ ok: false, message: 'Failed to update settings.' });
  }
});

// Admin Settings - Update a single setting (individual per-field save)
const SOCIAL_URL_KEYS = ['social_whatsapp', 'social_instagram', 'social_facebook', 'social_youtube', 'social_linkedin'];
app.post('/api/admin/settings/update', auth.requireAdminAuth, (req, res) => {
  try {
    const { key, value } = req.body || {};
    if (!key || !csvStore.SETTING_KEYS.includes(key)) {
      return res.status(400).json({ ok: false, message: 'Unknown setting key.' });
    }
    const str = String(value == null ? '' : value).trim();

    if (SOCIAL_URL_KEYS.includes(key) && str && !str.startsWith('https://')) {
      return res.status(400).json({ ok: false, message: 'Link must start with https://' });
    }
    if (key === 'social_email' && str) {
      const email = str.replace(/^mailto:/i, '');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ ok: false, message: 'Enter a valid email address.' });
      }
      csvStore.updateSetting(key, `mailto:${email}`);
      return res.json({ ok: true, key, value: `mailto:${email}`, message: 'Setting saved.' });
    }
    if (key === 'show_floating_buttons' && !['true', 'false'].includes(str)) {
      return res.status(400).json({ ok: false, message: 'Value must be true or false.' });
    }

    csvStore.updateSetting(key, str);
    res.json({ ok: true, key, value: str, message: 'Setting saved.' });
  } catch (err) {
    console.error('Setting update error:', err);
    res.status(500).json({ ok: false, message: 'Failed to update setting.' });
  }
});

// Admin Settings - Purge analytics older than N days
app.post('/api/admin/settings/cleanup', auth.requireAdminAuth, (req, res) => {
  try {
    const days = Math.max(1, parseInt(req.body?.days, 10) || 90);
    const removed = csvStore.purgeActivity(days);
    res.json({ ok: true, message: `Purged ${removed} analytics record(s) older than ${days} days.` });
  } catch (err) {
    console.error('Cleanup error:', err);
    res.status(500).json({ ok: false, message: 'Failed to purge analytics data.' });
  }
});

// Admin Backup - Create
app.post('/api/admin/backup', auth.requireAdminAuth, async (req, res) => {
  try {
    const backup = await csvStore.createBackup();
    res.json({ ok: true, message: 'Backup created successfully.', backup });
  } catch (err) {
    console.error('Backup error:', err);
    res.status(500).json({ ok: false, message: 'Failed to create backup.' });
  }
});

// Admin Backup - List
app.get('/api/admin/backups', auth.requireAdminAuth, (req, res) => {
  try {
    const backups = csvStore.listBackups();
    res.json({ ok: true, backups });
  } catch (err) {
    console.error('List backups error:', err);
    res.status(500).json({ ok: false, message: 'Failed to list backups.' });
  }
});

// Admin Backup - Download
app.get('/api/admin/backups/:backupId/download', auth.requireAdminAuth, (req, res) => {
  try {
    const { backupId } = req.params;
    const backups = csvStore.listBackups();
    const backup = backups.find(b => b.id === backupId);
    if (!backup) return res.status(404).json({ ok: false, message: 'Backup not found.' });

    const backupDir = path.join(__dirname, 'data', 'backups', backupId);
    const zipPath = path.join(backupDir, 'leads.csv');

    if (!fs.existsSync(zipPath)) {
      return res.status(404).json({ ok: false, message: 'Backup file not found.' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${backupId}.zip"`);
    
    // Simple: just send the leads.csv for now
    // In production, create a proper zip with both CSV files
    const leadsCsv = fs.readFileSync(path.join(backupDir, 'leads.csv'));
    const activityCsv = fs.readFileSync(path.join(backupDir, 'activity.csv'));
    
    // Create a simple tar-like concatenation (for demo)
    // Real implementation would use a proper zip library
    res.send(leadsCsv);
  } catch (err) {
    console.error('Download backup error:', err);
    res.status(500).json({ ok: false, message: 'Failed to download backup.' });
  }
});

// Google Sheets Link - Get URL
app.get('/api/admin/google-sheets', auth.requireAdminAuth, (req, res) => {
  res.json({ ok: true, url: csvStore.getGoogleSheetsUrl() });
});

// Google Sheets Link - Update URL
app.patch('/api/admin/google-sheets', auth.requireAdminAuth, (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || !url.startsWith('https://docs.google.com/spreadsheets/')) {
      return res.status(400).json({ ok: false, message: 'Invalid Google Sheets URL.' });
    }
    csvStore.setGoogleSheetsUrl(url);
    res.json({ ok: true, url: csvStore.getGoogleSheetsUrl() });
  } catch (err) {
    console.error('Google Sheets update error:', err);
    res.status(500).json({ ok: false, message: 'Failed to update Google Sheets URL.' });
  }
});

// Google Sheets - Sync all existing leads to the sheet (via Apps Script webhook)
app.post('/api/admin/google-sheets/sync', auth.requireAdminAuth, async (req, res) => {
  try {
    const webhook = csvStore.getSettings().googleSheetsWebhook;
    if (!webhook) {
      return res.status(400).json({
        ok: false,
        message: 'No sync URL configured. Deploy the Apps Script (docs/GOOGLE_SHEETS.md) and paste its /exec URL in Settings.'
      });
    }
    const leads = csvStore.getLeads({ limit: 100000 }).items;
    const rows = leads.map(leadToSheetRow);
    const success = await pushToGoogleSheets(rows);
    if (!success) {
      return res.status(502).json({ ok: false, message: 'Could not reach the Google Sheets sync endpoint.' });
    }
    res.json({ ok: true, message: `Synced ${rows.length} lead(s) to Google Sheets.` });
  } catch (err) {
    console.error('Sheets sync error:', err);
    res.status(500).json({ ok: false, message: 'Failed to sync leads to Google Sheets.' });
  }
});

/* ---------- 404 handler for API ---------- */
app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, message: 'API endpoint not found.' });
});

/* ---------- Server Startup & Graceful Shutdown ---------- */
let serverInstance = null;

if (require.main === module) {
  // Initialize CSV storage
  csvStore.initCSV();
  
  // Ensure default admin exists (uses env vars)
  auth.ensureDefaultAdmin();

  serverInstance = app.listen(PORT, () => {
    console.log(`🚀 Karma Fire Protection CRM & Lead API listening on port ${PORT}`);
    console.log(`🌐 Website: http://localhost:${PORT}`);
    console.log(`🔐 Admin:   http://localhost:${PORT}/admin`);
    telegram.startBot();
  });

  const shutdown = () => {
    console.log('Shutting down server gracefully...');
    telegram.stopBot();
    if (serverInstance) {
      serverInstance.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

module.exports = app;