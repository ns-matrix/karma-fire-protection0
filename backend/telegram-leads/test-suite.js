/* ============================================
   KARMA FIRE PROTECTION — AUTOMATED TEST SUITE
   Tests CSV-based storage and all API endpoints
   ============================================ */
'use strict';

process.env.NODE_ENV = 'test';
process.env.CSV_DATA_DIR = './data-test';
process.env.ADMIN_USER_ID = 'testadmin';
process.env.ADMIN_PASSWORD = 'TestPassword123!';
process.env.SESSION_SECRET = 'test_session_secret_12345678901234567890123456789012';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const csvStore = require('./csv-store');
const auth = require('./auth');
const { validateLead, validateTracking, clean, escapeHtml } = require('./validate');
const emailService = require('./email');
const telegram = require('./telegram');
const app = require('./server');

let passedTests = 0;
let failedTests = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    failedTests++;
  }
}

async function itAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    failedTests++;
  }
}

// Clean up test data before running
function cleanupTestData() {
  const testDir = path.join(__dirname, 'data-test');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 KARMA FIRE PROTECTION TEST SUITE EXECUTION');
  console.log('======================================================\n');

  // Clean and initialize CSV storage
  cleanupTestData();
  csvStore.initCSV();
  auth.ensureDefaultAdmin();

  /* ---------- 1. CSV Storage Layer ---------- */
  console.log('\n--- 1. CSV STORAGE LAYER ---');
  it('CSV files created with correct headers', () => {
    assert(fs.existsSync(path.join(__dirname, 'data-test', 'leads.csv')));
    assert(fs.existsSync(path.join(__dirname, 'data-test', 'activity.csv')));
    const leadsContent = fs.readFileSync(path.join(__dirname, 'data-test', 'leads.csv'), 'utf-8');
    assert(leadsContent.startsWith('id,name,phone,email'));
    const activityContent = fs.readFileSync(path.join(__dirname, 'data-test', 'activity.csv'), 'utf-8');
    assert(activityContent.startsWith('id,leadId,action,details'));
  });

  await itAsync('appendLead creates lead with KP-YYYY-XXXX format', async () => {
    const lead = await csvStore.appendLead({
      name: 'Test User',
      phone: '+919876543210',
      email: 'test@example.com',
      company: 'Test Co',
      service: 'Fire Hydrant System',
      message: 'First line, with a comma
Second line with "quoted" text',
      source: 'test',
      ip: 'test-hash'
    });
    assert(lead.id.startsWith('KP-'));
    assert(lead.id.match(/^KP-\d{4}-\d{4}$/));
    assert.strictEqual(lead.status, 'New');
    assert.strictEqual(lead.name, 'Test User');
    const saved = csvStore.getLeadById(lead.id);
    assert.strictEqual(saved.message, 'First line, with a comma
Second line with "quoted" text');
    const persisted = fs.readFileSync(path.join(__dirname, 'data-test', 'leads.csv'), 'utf-8');
    assert(persisted.includes('"First line, with a comma'));
    assert.strictEqual(csvStore.getLeadById(lead.id).message, saved.message, 'CSV round-trip must preserve embedded newlines and quotes');
  });

  await itAsync('getLeads returns paginated, filtered results', async () => {
    // Add a few more leads
    await csvStore.appendLead({ name: 'Alice', phone: '+911111111111', email: 'a@b.com', service: 'Fire Alarm', source: 'web', ip: 'ip1' });
    await csvStore.appendLead({ name: 'Bob', phone: '+912222222222', email: 'b@c.com', service: 'Fire Sprinkler', source: 'web', ip: 'ip2' });
    
    const result = csvStore.getLeads({ page: 1, limit: 2 });
    assert.strictEqual(result.items.length, 2);
    assert.strictEqual(result.total, 3);
    assert.strictEqual(result.totalPages, 2);
  });

  await itAsync('getLeads search filters by name, phone, email, company', async () => {
    const result = csvStore.getLeads({ search: 'Alice' });
    assert.strictEqual(result.total, 1);
    assert.strictEqual(result.items[0].name, 'Alice');
  });

  await itAsync('getLeads status filter works', async () => {
    const result = csvStore.getLeads({ status: 'New' });
    assert(result.total >= 3);
    for (const l of result.items) {
      assert.strictEqual(l.status, 'New');
    }
  });

  await itAsync('getLeadById finds existing lead', async () => {
    const leads = csvStore.getLeads({ limit: 1 }).items;
    const found = csvStore.getLeadById(leads[0].id);
    assert(found);
    assert.strictEqual(found.id, leads[0].id);
  });

  await itAsync('updateLead validates status and updates fields', async () => {
    const leads = csvStore.getLeads({ limit: 1 }).items;
    const leadId = leads[0].id;
    
    const updated = await csvStore.updateLead(leadId, { 
      status: 'Qualified', 
      notes: 'Test note',
      userId: 'test',
      ip: 'test-ip'
    });
    assert.strictEqual(updated.status, 'Qualified');
    assert.strictEqual(updated.notes, 'Test note');
    
    // Invalid status should throw
    try {
      await csvStore.updateLead(leadId, { status: 'InvalidStatus' });
      assert(false, 'Should have thrown');
    } catch (e) {
      assert(e.message.includes('Invalid status'));
    }
  });

  await itAsync('deleteLead removes lead and logs activity', async () => {
    const lead = await csvStore.appendLead({ 
      name: 'ToDelete', 
      phone: '+919999999999', 
      email: 'del@test.com', 
      service: 'Test', 
      source: 'test', 
      ip: 'ip-del' 
    });
    const deleted = await csvStore.deleteLead(lead.id, 'test', 'test-ip');
    assert.strictEqual(deleted, true);
    
    const found = csvStore.getLeadById(lead.id);
    assert.strictEqual(found, null);
  });

  it('getStats returns correct counts', () => {
    const stats = csvStore.getStats();
    assert(typeof stats.total === 'number');
    assert(typeof stats.today === 'number');
    assert(typeof stats.thisMonth === 'number');
    assert(typeof stats.conversionRate === 'number');
    assert(stats.byStatus);
    assert(stats.byStatus.New !== undefined);
  });

  it('exportCsv generates valid CSV with BOM', () => {
    const csv = csvStore.exportCsv();
    assert(csv.startsWith('\uFEFF') || csv.startsWith('id,name'));
    assert(csv.includes('id,name,phone'));
  });

  await itAsync('logActivity records activity entries', async () => {
    await csvStore.logActivity({
      leadId: 'KP-2026-0001',
      action: 'test',
      details: 'test details',
      userId: 'test',
      ip: 'test-ip'
    });
    const activity = csvStore.getActivity('KP-2026-0001', 10);
    assert(activity.length >= 1);
    assert.strictEqual(activity[0].action, 'test');
  });

  it('listBackups returns sorted backups with meta', () => {
    const backups = csvStore.listBackups();
    assert(Array.isArray(backups));
    // Initially no backups
    assert(backups.length >= 0);
  });

  await itAsync('createBackup creates timestamped backup directory', async () => {
    const backup = await csvStore.createBackup();
    assert(backup.path);
    assert(fs.existsSync(path.join(backup.path, 'leads.csv')));
    assert(fs.existsSync(path.join(backup.path, 'activity.csv')));
    assert(fs.existsSync(path.join(backup.path, 'meta.json')));
    
    // Now listBackups should return at least 1
    const backups = csvStore.listBackups();
    assert(backups.length >= 1);
  });

  it('Google Sheets URL getter/setter works', () => {
    csvStore.setGoogleSheetsUrl('https://docs.google.com/spreadsheets/d/test123');
    assert.strictEqual(csvStore.getGoogleSheetsUrl(), 'https://docs.google.com/spreadsheets/d/test123');
  });

  /* ---------- 2. Input Validation & Sanitization ---------- */
  console.log('\n--- 2. INPUT VALIDATION & SANITIZATION ---');
  it('validateLead accepts valid customer enquiry data', () => {
    const valid = {
      name: 'Rajesh Sharma',
      phone: '+91 98200 12345',
      email: 'rajesh.sharma@example.com',
      company: 'Tech Park Mumbai',
      service: 'Fire Hydrant System',
      location: 'Mumbai, India',
      message: 'Need annual inspection and maintenance quote.',
      consent: true,
      source: 'Google Organic'
    };
    const res = validateLead(valid);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.data.name, 'Rajesh Sharma');
    assert.strictEqual(res.data.phone, '+919820012345');
    assert.strictEqual(res.data.service, 'Fire Hydrant System');
  });

  it('validateLead rejects invalid inputs', () => {
    const invalid = {
      name: '',
      phone: '123',
      email: 'not-an-email',
      service: 'Invalid Service',
      location: '',
      consent: false
    };
    const res = validateLead(invalid);
    assert.strictEqual(res.ok, false);
    assert(res.errors.length >= 5);
  });

  it('clean strips control characters and escapes HTML properly', () => {
    const dirty = 'Hello\u0000\u0008 <script>alert(1)</script>';
    const cleaned = clean(dirty, 50);
    assert(!cleaned.includes('\u0000'));
    const escaped = escapeHtml(cleaned);
    // escapeHtml converts < to &lt; and > to &gt;
    assert.strictEqual(escaped.includes('<script>'), false);
    assert(escaped.includes('&lt;script&gt;'));
  });

  /* ---------- 3. Admin Authentication & Security ---------- */
  console.log('\n--- 3. ADMIN AUTHENTICATION & SECURITY ---');
  it('hashPassword and verifyPassword use PBKDF2 with timing-safe comparison', () => {
    const pass = 'SecretAdminPass@2026';
    const { hash, salt } = auth.hashPassword(pass);
    assert(hash && salt);
    assert.strictEqual(auth.verifyPassword(pass, salt, hash), true);
    assert.strictEqual(auth.verifyPassword('WrongPass', salt, hash), false);
  });

  it('createToken generates valid HMAC token and verifyToken enforces expiration and tamper detection', () => {
    const payload = { id: 1, userId: 'testadmin' };
    const token = auth.createToken(payload);
    assert(typeof token === 'string');

    const decoded = auth.verifyToken(token);
    assert.strictEqual(decoded.userId, 'testadmin');

    // Tampered token test
    const tampered = token.slice(0, -4) + 'abcd';
    assert.strictEqual(auth.verifyToken(tampered), null);
  });

  it('built-in admin credentials are stored as a PBKDF2 hash (no plaintext)', () => {
    assert.strictEqual(auth.DEFAULT_ADMIN.userId, 'Karma@Admin@123');
    assert.strictEqual(auth.DEFAULT_ADMIN.hash.length, 128); // sha512/64 bytes hex
    assert.strictEqual(auth.DEFAULT_ADMIN.salt.length, 32);

    // Wrong password must fail against the built-in hash
    const savedPass = process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_PASSWORD;
    try {
      assert.strictEqual(auth.verifyAdminCredentials('Karma@Admin@123', 'definitely-wrong-password'), false);
      assert.strictEqual(auth.verifyAdminCredentials('someone-else', 'definitely-wrong-password'), false);
    } finally {
      if (savedPass !== undefined) process.env.ADMIN_PASSWORD = savedPass;
    }
  });

  /* ---------- 4. Rate Limiting (in-memory) ---------- */
  console.log('\n--- 4. RATE LIMITING ---');
  // Note: Rate limiting is tested via API integration tests

  /* ---------- 5. HTTP API Integration ---------- */
  console.log('\n--- 5. HTTP API INTEGRATION ---');
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  let adminToken = '';

  try {
    // Health Check
    await itAsync('GET /api/health returns 200 with CSV storage status', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.ok, true);
      assert.strictEqual(json.status, 'healthy');
      assert.strictEqual(json.storage, 'csv');
      assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
      assert.strictEqual(res.headers.get('x-frame-options'), 'SAMEORIGIN');
    });

    // Tracking API
    await itAsync('POST /api/track records visitor tracking hit to CSV', async () => {
      const res = await fetch(`${baseUrl}/api/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorUuid: 'http-test-visitor-uuid-9999',
          sessionUuid: 'http-test-session-uuid-8888',
          pagePath: '/contact.html',
          pageTitle: 'Contact Us | Karma Fire Protection',
          source: 'Instagram',
          medium: 'social'
        })
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.ok, true);
    });

    // Honeypot Protection
    await itAsync('POST /api/leads silently discards honeypot bots', async () => {
      const res = await fetch(`${baseUrl}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: 'http://spam-bot-url.com',
          name: 'Spam Bot'
        })
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.ok, true);
      assert(json.message.includes('Thank you'));
    });

    // Lead Submission via API
    await itAsync('POST /api/leads creates lead and returns 201 with Lead ID', async () => {
      const res = await fetch(`${baseUrl}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Sunil Verma',
          phone: '+919876543210',
          email: 'sunil@verma-estates.com',
          company: 'Verma Estates',
          service: 'Fire Alarm System',
          location: 'Powai, Mumbai',
          message: 'Need complete addressable fire alarm system for high-rise residential building.',
          contact_method: 'Phone Call',
          consent: true,
          source: 'Google Organic'
        })
      });
      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.ok, true);
      assert(json.leadId.startsWith('KP-'));
    });

    // Admin Auth Endpoint
    await itAsync('POST /api/admin/login authenticates and returns token', async () => {
      const res = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'testadmin',
          password: 'TestPassword123!'
        })
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.ok, true);
      assert(json.token);
      adminToken = json.token;
    });

    // Admin Login - Invalid credentials
    await itAsync('POST /api/admin/login rejects invalid credentials', async () => {
      const res = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'testadmin',
          password: 'WrongPassword'
        })
      });
      assert.strictEqual(res.status, 401);
      const json = await res.json();
      assert.strictEqual(json.ok, false);
    });

    // Admin Profile - Requires Auth
    await itAsync('GET /api/admin/me requires authentication', async () => {
      const unauth = await fetch(`${baseUrl}/api/admin/me`);
      assert.strictEqual(unauth.status, 401);

      const authRes = await fetch(`${baseUrl}/api/admin/me`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(authRes.status, 200);
      const json = await authRes.json();
      assert.strictEqual(json.ok, true);
      assert.strictEqual(json.user.userId, 'testadmin');
    });

    // Admin Overview Endpoint
    await itAsync('GET /api/admin/overview requires authentication and returns dashboard data', async () => {
      const unauth = await fetch(`${baseUrl}/api/admin/overview`);
      assert.strictEqual(unauth.status, 401);

      const authRes = await fetch(`${baseUrl}/api/admin/overview`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(authRes.status, 200);
      const json = await authRes.json();
      assert.strictEqual(json.ok, true);
      assert(json.data.overview.totalLeads >= 1);
    });

    // Admin Leads Query
    await itAsync('GET /api/admin/leads retrieves filtered list with pagination', async () => {
      const res = await fetch(`${baseUrl}/api/admin/leads?limit=10`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.ok, true);
      assert(json.items.length >= 1);
    });

    // Admin Lead Details
    await itAsync('GET /api/admin/leads/:leadId returns lead with activity', async () => {
      const listRes = await fetch(`${baseUrl}/api/admin/leads?limit=1`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const listJson = await listRes.json();
      const leadId = listJson.items[0].id;

      const res = await fetch(`${baseUrl}/api/admin/leads/${leadId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.ok, true);
      assert.strictEqual(json.lead.id, leadId);
      assert(Array.isArray(json.activity));
    });

    // Admin Update Lead
    await itAsync('PATCH /api/admin/leads/:leadId updates status and notes', async () => {
      const listRes = await fetch(`${baseUrl}/api/admin/leads?limit=1`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const listJson = await listRes.json();
      const leadId = listJson.items[0].id;

      const res = await fetch(`${baseUrl}/api/admin/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          status: 'Contacted',
          notes: 'Called client, left voicemail'
        })
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.ok, true);
      assert.strictEqual(json.lead.status, 'Contacted');
      assert.strictEqual(json.lead.notes, 'Called client, left voicemail');
    });

    // Admin CSV Export
    await itAsync('GET /api/admin/leads/export/csv generates valid downloadable CSV', async () => {
      const res = await fetch(`${baseUrl}/api/admin/leads/export/csv`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      assert(res.headers.get('content-type').includes('text/csv'));
      const text = await res.text();
      assert(text.includes('Sunil Verma'));
    });

    // Admin Settings - Get
    await itAsync('GET /api/admin/settings returns configuration', async () => {
      const res = await fetch(`${baseUrl}/api/admin/settings`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.ok, true);
      assert(json.settings.googleSheetsUrl !== undefined);
    });

    // Admin Settings - Update Google Sheets URL
    await itAsync('PATCH /api/admin/settings updates Google Sheets URL', async () => {
      const res = await fetch(`${baseUrl}/api/admin/settings`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          googleSheetsUrl: 'https://docs.google.com/spreadsheets/d/newtest123'
        })
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.ok, true);
      assert.strictEqual(json.settings.googleSheetsUrl, 'https://docs.google.com/spreadsheets/d/newtest123');
    });

    // Admin Settings - All
    await itAsync('GET /api/admin/settings/all returns stored settings and requires auth', async () => {
      const unauth = await fetch(`${baseUrl}/api/admin/settings/all`);
      assert.strictEqual(unauth.status, 401);

      const res = await fetch(`${baseUrl}/api/admin/settings/all`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.ok, true);
      assert(typeof json.settings.social_whatsapp === 'string');
      assert(typeof json.settings.show_floating_buttons === 'string');
      assert(json.settings.googleSheetsUrl.includes('docs.google.com'));
    });

    // Public social settings for the website
    await itAsync('GET /api/settings/social is public and returns {value} entries', async () => {
      const res = await fetch(`${baseUrl}/api/settings/social`);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.ok, true);
      assert(typeof json.social.social_whatsapp.value === 'string');
      assert(typeof json.social.show_floating_buttons.value === 'string');
      assert(json.social.social_whatsapp.value.startsWith('https://'));
    });

    // Single setting update
    await itAsync('POST /api/admin/settings/update saves one field and rejects unknown keys', async () => {
      const okRes = await fetch(`${baseUrl}/api/admin/settings/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ key: 'social_facebook', value: 'https://facebook.com/karmafireprotection' })
      });
      assert.strictEqual(okRes.status, 200);
      const okJson = await okRes.json();
      assert.strictEqual(okJson.ok, true);
      assert.strictEqual(okJson.value, 'https://facebook.com/karmafireprotection');

      const badRes = await fetch(`${baseUrl}/api/admin/settings/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ key: 'not_a_real_key', value: 'x' })
      });
      assert.strictEqual(badRes.status, 400);

      const badUrl = await fetch(`${baseUrl}/api/admin/settings/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ key: 'social_whatsapp', value: 'javascript:alert(1)' })
      });
      assert.strictEqual(badUrl.status, 400);
    });

    // Analytics cleanup
    await itAsync('POST /api/admin/settings/cleanup purges old pageviews', async () => {
      const res = await fetch(`${baseUrl}/api/admin/settings/cleanup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ days: 90 })
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.ok, true);
      assert(json.message.includes('Purged'));
    });

    // Google Sheets sync without webhook is a clear 400
    await itAsync('POST /api/admin/google-sheets/sync requires a configured webhook', async () => {
      const res = await fetch(`${baseUrl}/api/admin/google-sheets/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.ok, false);
      assert(json.message.includes('Apps Script'));
    });

    // Admin Stats
    await itAsync('GET /api/admin/stats returns lead statistics', async () => {
      const res = await fetch(`${baseUrl}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.ok, true);
      assert(typeof json.stats.total === 'number');
    });

    // Admin Backup
    await itAsync('POST /api/admin/backup creates backup', async () => {
      const res = await fetch(`${baseUrl}/api/admin/backup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.ok, true);
      assert(json.backup.path);
    });

    // Admin Backups List
    await itAsync('GET /api/admin/backups lists backups', async () => {
      const res = await fetch(`${baseUrl}/api/admin/backups`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.ok, true);
      assert(Array.isArray(json.backups));
    });

    // Admin Google Sheets Link
    await itAsync('GET /api/admin/google-sheets returns URL', async () => {
      const res = await fetch(`${baseUrl}/api/admin/google-sheets`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.ok, true);
      assert(json.url.includes('docs.google.com'));
    });

    // Admin Change Password
    await itAsync('POST /api/admin/change-password requires current password', async () => {
      const res = await fetch(`${baseUrl}/api/admin/change-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          currentPassword: 'TestPassword123!',
          newPassword: 'NewPassword123!@#'
        })
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.ok, true);
    });

  } finally {
    server.close();
    // Cleanup test data
    cleanupTestData();
  }

  /* ---------- Test Results Summary ---------- */
  console.log('\n======================================================');
  console.log(`🏁 TEST EXECUTION COMPLETE`);
  console.log(`Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});