/* ============================================
   CSV Storage Layer — Replaces SQLite
   Atomic writes, RFC 4180 compliant, concurrent-safe
   ============================================ */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

function getDataDir() {
  return process.env.CSV_DATA_DIR || path.join(__dirname, 'data');
}
function getLeadsCsv() {
  return path.join(getDataDir(), 'leads.csv');
}
function getActivityCsv() {
  return path.join(getDataDir(), 'activity.csv');
}
function getBackupsDir() {
  return path.join(getDataDir(), 'backups');
}

const LEAD_HEADERS = [
  'id', 'name', 'phone', 'email', 'company', 'service',
  'message', 'source', 'ip', 'userAgent', 'referrer', 'utmSource',
  'utmMedium', 'utmCampaign', 'status', 'notes', 'assignedTo',
  'createdAt', 'updatedAt'
];

const ACTIVITY_HEADERS = [
  'id', 'leadId', 'action', 'details', 'userId', 'ip', 'createdAt'
];

const VALID_STATUSES = ['New', 'Contacted', 'Qualified', 'In Progress', 'Converted', 'Closed', 'Won', 'Rejected'];
const STATUS_ORDER = { 'New': 1, 'Contacted': 2, 'Qualified': 3, 'In Progress': 4, 'Converted': 5, 'Won': 6, 'Closed': 7, 'Rejected': 8 };

let writeQueue = Promise.resolve();
const fileLocks = new Map();

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function readCsv(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
  const records = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '"') {
      if (inQuotes && content[i + 1] === '"') { field += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      row.push(field); field = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && content[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(value => value !== '')) records.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length) { row.push(field); if (row.some(value => value !== '')) records.push(row); }
  if (records.length <= 1) return [];
  const headers = records[0];
  return records.slice(1).map(values => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i] === undefined ? '' : values[i]);
    return obj;
  });
}

function writeCsvAtomic(filePath, headers, rows) {
  const tempPath = filePath + '.tmp.' + randomBytes(6).toString('hex');
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escapeCsv(row[h])).join(','));
  }
  fs.writeFileSync(tempPath, lines.join('\n') + '\n', 'utf-8');
  fs.renameSync(tempPath, filePath);
}

function acquireLock(filePath) {
  // Writes are serialized through writeQueue; fail fast if a lock is unexpectedly held.
  if (fileLocks.get(filePath)) throw new Error('CSV file is already being modified: ' + path.basename(filePath));
  fileLocks.set(filePath, true);
}

function releaseLock(filePath) {
  fileLocks.delete(filePath);
}

function generateLeadId() {
  const year = new Date().getFullYear();
  const prefix = `KP-${year}-`;
  const leads = readCsv(getLeadsCsv());
  const maxSeq = leads.reduce((max, lead) => {
    if (!lead.id.startsWith(prefix)) return max;
    const seq = Number(lead.id.slice(prefix.length));
    return Number.isInteger(seq) && seq > max ? seq : max;
  }, 0);
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

function generateActivityId() {
  return 'ACT-' + randomBytes(8).toString('hex');
}

function getCurrentTimestamp() {
  return new Date().toISOString();
}

function initCSV() {
  fs.mkdirSync(getDataDir(), { recursive: true });
  fs.mkdirSync(getBackupsDir(), { recursive: true });

  if (!fs.existsSync(getLeadsCsv())) {
    writeCsvAtomic(getLeadsCsv(), LEAD_HEADERS, []);
  }
  if (!fs.existsSync(getActivityCsv())) {
    writeCsvAtomic(getActivityCsv(), ACTIVITY_HEADERS, []);
  }
}

function appendLead(leadData) {
  return new Promise((resolve, reject) => {
    writeQueue = writeQueue.catch(() => {}).then(() => {
      acquireLock(getLeadsCsv());
      try {
        const leads = readCsv(getLeadsCsv());
        const now = getCurrentTimestamp();
        const newLead = {
          id: generateLeadId(),
          name: leadData.name || '',
          phone: leadData.phone || '',
          email: leadData.email || '',
          company: leadData.company || '',
          service: leadData.service || '',
          message: leadData.message || '',
          source: leadData.source || 'website',
          ip: leadData.ip || '',
          userAgent: leadData.userAgent || '',
          referrer: leadData.referrer || '',
          utmSource: leadData.utmSource || '',
          utmMedium: leadData.utmMedium || '',
          utmCampaign: leadData.utmCampaign || '',
          status: 'New',
          notes: '',
          assignedTo: '',
          createdAt: now,
          updatedAt: now
        };
        leads.push(newLead);
        writeCsvAtomic(getLeadsCsv(), LEAD_HEADERS, leads);
        logActivity({
          leadId: newLead.id,
          action: 'created',
          details: `Lead created from ${newLead.source}`,
          userId: 'system',
          ip: newLead.ip
        });
        releaseLock(getLeadsCsv());
        resolve(newLead);
      } catch (err) {
        releaseLock(getLeadsCsv());
        reject(err);
      }
    });
  });
}

function getLeads(options = {}) {
  const { search = '', status = '', service = '', source = '', from = '', to = '' } = options;
  const page = Math.max(1, Number.parseInt(options.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(options.limit, 10) || 25));
  const allowedSort = new Set(['createdAt', 'updatedAt', 'name', 'company', 'status', 'service']);
  const sortBy = allowedSort.has(options.sortBy) ? options.sortBy : 'createdAt';
  const sortOrder = options.sortOrder === 'asc' ? 'asc' : 'desc';
  let leads = readCsv(getLeadsCsv());

  if (search) {
    const s = String(search).toLowerCase();
    leads = leads.filter(l =>
      String(l.name || '').toLowerCase().includes(s) ||
      String(l.phone || '').includes(s) ||
      String(l.email || '').toLowerCase().includes(s) ||
      String(l.company || '').toLowerCase().includes(s) ||
      String(l.id || '').toLowerCase().includes(s)
    );
  }
  if (status) leads = leads.filter(l => l.status === status);
  if (service) leads = leads.filter(l => String(l.service || '').toLowerCase() === String(service).toLowerCase());
  if (source) leads = leads.filter(l => String(l.source || '').toLowerCase() === String(source).toLowerCase());
  if (from) leads = leads.filter(l => String(l.createdAt || '').slice(0, 10) >= String(from).slice(0, 10));
  if (to) leads = leads.filter(l => String(l.createdAt || '').slice(0, 10) <= String(to).slice(0, 10));

  leads.sort((a, b) => {
    let av = a[sortBy] || '';
    let bv = b[sortBy] || '';
    if (sortBy === 'status') { av = STATUS_ORDER[av] || 99; bv = STATUS_ORDER[bv] || 99; }
    if (av < bv) return sortOrder === 'asc' ? -1 : 1;
    if (av > bv) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const total = leads.length;
  const start = (page - 1) * limit;
  return { items: leads.slice(start, start + limit), total, page, limit, totalPages: Math.ceil(total / limit) };
}

function getLeadById(id) {
  const leads = readCsv(getLeadsCsv());
  return leads.find(l => l.id === id) || null;
}

function updateLead(id, updates) {
  return new Promise((resolve, reject) => {
    writeQueue = writeQueue.then(() => {
      acquireLock(getLeadsCsv());
      try {
        const leads = readCsv(getLeadsCsv());
        const idx = leads.findIndex(l => l.id === id);
        if (idx === -1) {
          releaseLock(getLeadsCsv());
          resolve(null);
          return;
        }
        const oldLead = { ...leads[idx] };
        const allowed = ['name', 'phone', 'email', 'company', 'service', 'message', 'status', 'notes', 'assignedTo'];
        for (const key of allowed) {
          if (updates[key] !== undefined) {
            if (key === 'status' && !VALID_STATUSES.includes(updates[key])) {
              releaseLock(getLeadsCsv());
              reject(new Error(`Invalid status: ${updates[key]}`));
              return;
            }
            leads[idx][key] = updates[key];
          }
        }
        leads[idx].updatedAt = getCurrentTimestamp();
        writeCsvAtomic(getLeadsCsv(), LEAD_HEADERS, leads);
        const changes = [];
        for (const key of allowed) {
          if (updates[key] !== undefined && oldLead[key] !== leads[idx][key]) {
            changes.push(`${key}: "${oldLead[key]}" → "${leads[idx][key]}"`);
          }
        }
        if (changes.length) {
          logActivity({
            leadId: id,
            action: 'updated',
            details: changes.join('; '),
            userId: updates.userId || 'admin',
            ip: updates.ip || ''
          });
        }
        releaseLock(getLeadsCsv());
        resolve(leads[idx]);
      } catch (err) {
        releaseLock(getLeadsCsv());
        reject(err);
      }
    });
  });
}

function deleteLead(id, userId = 'admin', ip = '') {
  return new Promise((resolve, reject) => {
    writeQueue = writeQueue.then(() => {
      acquireLock(getLeadsCsv());
      try {
        const leads = readCsv(getLeadsCsv());
        const idx = leads.findIndex(l => l.id === id);
        if (idx === -1) {
          releaseLock(getLeadsCsv());
          resolve(false);
          return;
        }
        const lead = leads[idx];
        leads.splice(idx, 1);
        writeCsvAtomic(getLeadsCsv(), LEAD_HEADERS, leads);
        logActivity({
          leadId: id,
          action: 'deleted',
          details: `Deleted lead: ${lead.name} (${lead.phone})`,
          userId,
          ip
        });
        releaseLock(getLeadsCsv());
        resolve(true);
      } catch (err) {
        releaseLock(getLeadsCsv());
        reject(err);
      }
    });
  });
}

function getStats() {
  const leads = readCsv(getLeadsCsv());
  const byStatus = {};
  for (const s of VALID_STATUSES) byStatus[s] = 0;
  for (const l of leads) {
    if (byStatus[l.status] !== undefined) byStatus[l.status]++;
  }
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().slice(0, 7);
  return {
    total: leads.length,
    byStatus,
    today: leads.filter(l => l.createdAt.startsWith(today)).length,
    thisMonth: leads.filter(l => l.createdAt.startsWith(thisMonth)).length,
    conversionRate: leads.length ? Math.round((byStatus.Converted + byStatus.Won) / leads.length * 100) : 0
  };
}

function exportCsv() {
  const leads = readCsv(getLeadsCsv());
  const lines = [LEAD_HEADERS.join(',')];
  for (const lead of leads) {
    lines.push(LEAD_HEADERS.map(h => escapeCsv(lead[h])).join(','));
  }
  return '\uFEFF' + lines.join('\n');
}

function logActivity(data) {
  return new Promise((resolve, reject) => {
    writeQueue = writeQueue.then(() => {
      acquireLock(getActivityCsv());
      try {
        const activities = readCsv(getActivityCsv());
        const activity = {
          id: generateActivityId(),
          leadId: data.leadId || '',
          action: data.action || '',
          details: data.details || '',
          userId: data.userId || '',
          ip: data.ip || '',
          createdAt: getCurrentTimestamp()
        };
        activities.push(activity);
        writeCsvAtomic(getActivityCsv(), ACTIVITY_HEADERS, activities);
        releaseLock(getActivityCsv());
        resolve(activity);
      } catch (err) {
        releaseLock(getActivityCsv());
        reject(err);
      }
    });
  });
}

function getActivity(leadId, limit = 50) {
  const activities = readCsv(getActivityCsv());
  let filtered = leadId ? activities.filter(a => a.leadId === leadId) : activities;
  filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return filtered.slice(0, limit);
}

function createBackup() {
  return new Promise((resolve, reject) => {
    writeQueue = writeQueue.then(() => {
      acquireLock(getLeadsCsv());
      acquireLock(getActivityCsv());
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(getBackupsDir(), `backup-${timestamp}`);
        fs.mkdirSync(backupDir, { recursive: true });
        fs.copyFileSync(getLeadsCsv(), path.join(backupDir, 'leads.csv'));
        fs.copyFileSync(getActivityCsv(), path.join(backupDir, 'activity.csv'));
        const meta = {
          createdAt: new Date().toISOString(),
          leadsCount: readCsv(getLeadsCsv()).length,
          activitiesCount: readCsv(getActivityCsv()).length
        };
        fs.writeFileSync(path.join(backupDir, 'meta.json'), JSON.stringify(meta, null, 2));
        releaseLock(getLeadsCsv());
        releaseLock(getActivityCsv());
        resolve({ path: backupDir, meta });
      } catch (err) {
        releaseLock(getLeadsCsv());
        releaseLock(getActivityCsv());
        reject(err);
      }
    });
  });
}

function listBackups() {
  const backupsDir = getBackupsDir();
  if (!fs.existsSync(backupsDir)) return [];
  return fs.readdirSync(backupsDir)
    .filter(d => d.startsWith('backup-'))
    .map(d => {
      const metaPath = path.join(backupsDir, d, 'meta.json');
      let meta = {};
      if (fs.existsSync(metaPath)) meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      return { id: d, ...meta };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* ---------- Persistent Settings (data/settings.json) ---------- */
const SETTINGS_FILE = path.join(getDataDir(), 'settings.json');

const DEFAULT_SETTINGS = {
  googleSheetsUrl: 'https://docs.google.com/spreadsheets/d/1s7bl4P5QSSL6NKptLF1gSldYzhQGUJg87fY04uy_kAo/edit?usp=sharing',
  googleSheetsWebhook: '',
  social_whatsapp: 'https://wa.me/919594967751',
  social_instagram: 'https://www.instagram.com/karmafireprotection/',
  social_facebook: '',
  social_youtube: '',
  social_linkedin: '',
  social_email: 'mailto:karmafireprotectionllp@gmail.com',
  show_floating_buttons: 'true'
};

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);

function getSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const stored = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      return { ...DEFAULT_SETTINGS, ...stored };
    }
  } catch (err) {
    console.error('Settings read error:', err.message);
  }
  return { ...DEFAULT_SETTINGS };
}

function updateSetting(key, value) {
  if (!SETTING_KEYS.includes(key)) {
    throw new Error(`Unknown setting: ${key}`);
  }
  const settings = getSettings();
  settings[key] = String(value == null ? '' : value);
  fs.mkdirSync(getDataDir(), { recursive: true });
  const tempPath = SETTINGS_FILE + '.tmp.' + randomBytes(6).toString('hex');
  fs.writeFileSync(tempPath, JSON.stringify(settings, null, 2), 'utf-8');
  fs.renameSync(tempPath, SETTINGS_FILE);
  return settings[key];
}

function getGoogleSheetsUrl() {
  return getSettings().googleSheetsUrl || process.env.GOOGLE_SHEETS_URL || '';
}

function setGoogleSheetsUrl(url) {
  return updateSetting('googleSheetsUrl', url);
}

/* Purge analytics (pageview) activity rows older than `days` days.
   Returns number of rows removed. */
function purgeActivity(days) {
  const filePath = getActivityCsv();
  if (!fs.existsSync(filePath)) return 0;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) return 0;

  const kept = [lines[0]];
  let removed = 0;
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const isPageview = cells[2] === 'pageview';
    const ts = Date.parse(cells[6] || '');
    if (isPageview && Number.isFinite(ts) && ts < cutoff) {
      removed++;
      continue;
    }
    kept.push(line);
  }
  if (removed > 0) {
    fs.writeFileSync(filePath, kept.join('\n') + '\n', 'utf-8');
  }
  return removed;
}

initCSV();

module.exports = {
  initCSV,
  appendLead,
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
  getStats,
  exportCsv,
  logActivity,
  getActivity,
  createBackup,
  listBackups,
  getSettings,
  updateSetting,
  purgeActivity,
  getGoogleSheetsUrl,
  setGoogleSheetsUrl,
  VALID_STATUSES,
  SETTING_KEYS,
  LEAD_HEADERS,
  ACTIVITY_HEADERS
};