/* ============================================
   ADMIN AUTHENTICATION MODULE
   PBKDF2 hashing, timing-safe equality, HMAC token signing
   Built-in node:crypto (zero external dependencies)
   ============================================ */
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

/* Session secret: prefer .env, otherwise random per boot (no forgeable default in source) */
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_HOURS = 24;

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, salt, storedHash) {
  try {
    const calcHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    const a = Buffer.from(calcHash, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function createToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (TOKEN_TTL_HOURS * 3600);
  const data = Buffer.from(JSON.stringify({ ...payload, iat: now, exp })).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(`${header}.${data}`).digest('base64url');
  return `${header}.${data}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, data, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(`${header}.${data}`).digest('base64url');

  try {
    const a = Buffer.from(signature, 'utf8');
    const b = Buffer.from(expectedSignature, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

function requireAdminAuth(req, res, next) {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.headers.cookie) {
    const match = req.headers.cookie.match(/admin_token=([^;]+)/);
    if (match) token = match[1];
  }

  if (!token) {
    return res.status(401).json({ ok: false, message: 'Authentication required. Please log in.' });
  }

  const payload = verifyToken(token);
  if (!payload || !payload.userId) {
    return res.status(401).json({ ok: false, message: 'Invalid or expired session. Please log in again.' });
  }

  req.admin = payload;
  next();
}

/* Built-in default admin credentials (PBKDF2 hash — safe to commit to GitHub).
   Override anytime via ADMIN_USER_ID / ADMIN_PASSWORD in .env,
   or through the dashboard (stored hashed in data/admin-credentials.json) */
const DEFAULT_ADMIN = {
  userId: 'Karma@Admin@123',
  salt: 'a3f8c2e19b7d4f6051e2a8c7b9d3f0e1',
  hash: '2bf4af495cc33d2bfb4618331b5dddf9f14e01dccafe2d5ca0eb84c6f1b50074028521f62ab4fe109a609b1030cc6fea57fd1610c1e40772bb3f631cbed3abd0'
};

const CREDENTIALS_FILE = path.join(process.env.CSV_DATA_DIR || path.join(__dirname, 'data'), 'admin-credentials.json');

function readCredentialOverride() {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const stored = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf-8'));
      if (stored && stored.userId && stored.salt && stored.hash) return stored;
    }
  } catch {
    /* fall through to defaults */
  }
  return null;
}

/* Verify login: .env override (if set) > saved dashboard password > built-in hashed default */
function verifyAdminCredentials(userId, password) {
  if (typeof userId !== 'string' || typeof password !== 'string') return false;

  if (process.env.ADMIN_PASSWORD) {
    const envUserId = process.env.ADMIN_USER_ID || DEFAULT_ADMIN.userId;
    return userId === envUserId && password === process.env.ADMIN_PASSWORD;
  }

  const override = readCredentialOverride();
  if (override) {
    return userId === override.userId && verifyPassword(password, override.salt, override.hash);
  }

  if (userId !== DEFAULT_ADMIN.userId) return false;
  return verifyPassword(password, DEFAULT_ADMIN.salt, DEFAULT_ADMIN.hash);
}

/* Persist a new password (hashed) from the admin dashboard */
function changePassword(userId, newPassword) {
  const { hash, salt } = hashPassword(newPassword);
  fs.mkdirSync(path.dirname(CREDENTIALS_FILE), { recursive: true });
  fs.writeFileSync(
    CREDENTIALS_FILE,
    JSON.stringify({ userId, salt, hash, updatedAt: new Date().toISOString() }, null, 2),
    'utf-8'
  );
  return true;
}

function ensureDefaultAdmin() {
  const userId = process.env.ADMIN_USER_ID || DEFAULT_ADMIN.userId;
  console.log(`🔐 Admin user configured: ${userId} (${process.env.ADMIN_PASSWORD ? '.env credentials' : 'built-in hashed credentials'})`);
}

module.exports = {
  hashPassword,
  verifyPassword,
  verifyAdminCredentials,
  changePassword,
  createToken,
  verifyToken,
  requireAdminAuth,
  ensureDefaultAdmin,
  DEFAULT_ADMIN
};
