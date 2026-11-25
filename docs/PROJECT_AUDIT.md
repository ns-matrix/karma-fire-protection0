# KARMA FIRE PROTECTION — PROJECT AUDIT

**Generated:** 2026-11-25  
**Auditor:** Senior Full-Stack Engineer  
**Repository:** karma-fire-protection-main  

---

## EXECUTIVE SUMMARY

The repository contains **three complete implementations** of the same website:
1. **Node.js/Express + SQLite** (primary, in `backend/telegram-leads/`) — **KEEP as primary stack**
2. **PHP** (in `php-website/`) — **REMOVE** (duplicate)
3. **WordPress Theme** (in `wordpress-theme/`) — **REMOVE** (duplicate)

The Node.js implementation is production-ready with:
- 24 passing automated tests
- Complete CRM with Telegram bot integration
- Admin dashboard SPA
- SEO-optimized public website (5 pages)
- First-party analytics

**Primary Issue:** Admin authentication middleware exists but is **BYPASSSED** on all admin API routes in `server.js`.

---

## CATEGORIZATION

### ✅ KEEP — Production-Ready, Well-Designed

#### Public Website (Root Level)
| File | Purpose | Notes |
|------|---------|-------|
| `index.html` | Homepage | Hero, services preview, process, CTA — **Excellent** |
| `about.html` | About Us | Company profile, expertise, maintenance — **Excellent** |
| `services.html` | Services | 4 systems + installation/maintenance — **Excellent** |
| `projects.html` | Projects | Placeholder for client content — **Keep structure** |
| `contact.html` | Contact/Quote | Full form with validation, honeypot — **Excellent** |
| `privacy-policy.html` | Privacy Policy | GDPR-compliant, detailed — **Excellent** |
| `sitemap.xml` | SEO | Complete with priorities — **Keep** |
| `robots.txt` | SEO | Standard — **Keep** |
| `CNAME` | Domain | `www.karmafireprotection.com` — **Keep** |

#### Frontend Assets (`assets/`)
| Category | Files | Status |
|----------|-------|--------|
| Logos | `logo-light.webp`, `logo-dark.webp` | **KEEP** — Brand identity |
| Icons | 7 SVG icons (alarm, email, finger-1, finger-2, hydrant, location, phone, sprinkler) | **KEEP** — Used across site |
| Images | 11 WebP images (hero, services, about, CTA, footer) | **KEEP** — Optimized, referenced |

#### CSS (`css/`) — Modular, Well-Organized
| File | Purpose | Status |
|------|---------|--------|
| `style.css` | Core variables, typography, layout | **KEEP** |
| `navigation.css` | Header, dropdown, mobile menu | **KEEP** |
| `components.css` | Cards, buttons, forms, grids | **KEEP** |
| `forms.css` | Form-specific styles | **KEEP** |
| `footer.css` | Footer layout | **KEEP** |
| `animations.css` | Scroll reveal, transitions | **KEEP** |
| `responsive.css` | Breakpoints 320-1920px | **KEEP** |

#### JavaScript (`js/`) — Vanilla ES6 Modules
| File | Purpose | Status |
|------|---------|--------|
| `main.js` | Preloader, scroll reveal, UI | **KEEP** |
| `navigation.js` | Mobile menu, dropdown | **KEEP** |
| `validation.js` | Client-side form validation | **KEEP** — UX only |
| `forms.js` | Lead submission, attribution | **KEEP** — **IMPROVE**: API URL |
| `analytics.js` | First-party tracking | **KEEP** |

#### Backend — Core (`backend/telegram-leads/`)
| File | Purpose | Status |
|------|---------|--------|
| `server.js` | Express app, all API routes | **KEEP** — **IMPROVE**: Enforce auth middleware |
| `auth.js` | PBKDF2 + HMAC JWT auth | **KEEP** — **Excellent security** |
| `validate.js` | Server-side validation | **KEEP** — Comprehensive |
| `telegram.js` | Bot notifications + CRM commands | **KEEP** — Feature-rich |
| `email.js` | Nodemailer SMTP service | **KEEP** — **IMPROVE**: Add rate limiting |
| `test-suite.js` | 24 automated tests | **KEEP** — **Run after changes** |
| `package.json` | Dependencies (express, nodemailer, dotenv, supabase) | **KEEP** — **REMOVE**: `@supabase/supabase-js` (unused) |
| `.env.example` | Env template | **KEEP** — **IMPROVE**: Add CSV, Google Sheets vars |
| `admin/index.html` | Admin dashboard SPA | **KEEP** — **IMPROVE**: Connect to CSV API |

#### Backend — Data (`backend/telegram-leads/data/`)
| File | Purpose | Status |
|------|---------|--------|
| `leads.db` | SQLite database (WAL mode) | **REPLACE** with CSV |

#### Documentation (`docs/`)
| File | Status |
|------|--------|
| `ADMIN_GUIDE.md` | **KEEP** — Update for CSV |
| `API.md` | **KEEP** — Update endpoints |
| `ARCHITECTURE.md` | **KEEP** — Update diagram |
| `DATABASE.md` | **REPLACE** — New CSV schema doc |
| `DEPLOYMENT.md` | **KEEP** — Update for CSV |
| `PRIVACY.md` | **KEEP** |
| `SEO_GUIDE.md` | **KEEP** |

#### Configuration (`config/`)
| File | Status |
|------|--------|
| `.env.example` | **KEEP** — Sync with backend version |

---

### 🔧 IMPROVE — Functional But Needs Changes

| Item | Issue | Required Change |
|------|-------|-----------------|
| **Admin Auth Middleware** | `requireAdminAuth` imported but **never used** on 18 admin routes in `server.js` | Apply middleware to all `/api/admin/*` routes |
| **Data Storage** | SQLite (`db.js`) — Must migrate to CSV | Replace `db.js` with `csv-store.js` |
| **Lead ID Format** | `KP-YYYY-XXXX` from SQLite | Keep format, generate in CSV |
| **Admin Dashboard** | Currently reads from SQLite via API | Update to call new CSV-backed endpoints |
| **`.env.example`** | Missing CSV, Google Sheets, session config | Add: `CSV_DATA_DIR`, `GOOGLE_SHEETS_URL`, `SESSION_SECRET`, `ADMIN_USER_ID`, `ADMIN_PASSWORD` |
| **Rate Limiting** | Only on `/api/leads` | Add to `/api/admin/login` |
| **CSRF Protection** | Not implemented | Add for state-changing admin actions |
| **Google Sheets Link** | Not implemented | Add settings endpoint + UI in admin |
| **Activity Log** | Not implemented | Create `activity.csv` + logging middleware |
| **Backup System** | Not implemented | Auto-backup before writes + download endpoint |
| **Phone Validation** | Server allows intl, frontend expects Indian | Align: Accept Indian (+91) + intl |
| **`@supabase/supabase-js`** | Listed in deps, never used | **Remove from package.json** |

---

### 🔴 REMOVE — Duplicate/Dead/Unused

#### Entire Directories
| Path | Reason |
|------|--------|
| `php-website/` | Complete duplicate PHP implementation — 21 files |
| `wordpress-theme/` | Complete duplicate WordPress theme — 36+ files |
| `backend/telegram-leads/data/leads.db` | SQLite file — Replace with CSV |
| `backend/telegram-leads/data/backups/` | Empty — Will recreate for CSV |

#### Unused Dependencies
| Package | Location | Reason |
|---------|----------|--------|
| `@supabase/supabase-js` | `backend/telegram-leads/package.json` | Never imported/used |

#### Dead Code in `server.js`
| Line(s) | Code | Reason |
|---------|------|--------|
| ~259, 264, 295, 316, 334, 358, 382, 393, 405, 417, 432, 443, 454, 464, 476, 491, 502, 513, 532 | `// requireAdminAuth,` commented out | Auth bypassed — **Must enforce** |

---

### 🔄 REPLACE — Core Architecture Changes

| Component | Current | New |
|-----------|---------|-----|
| **Database Layer** | `db.js` (SQLite, node:sqlite) | `csv-store.js` (CSV, fs/promises) |
| **Lead Storage** | `leads.db` (SQLite) | `server/data/leads.csv` |
| **Activity Log** | None | `server/data/activity.csv` |
| **Backups** | None | `server/data/backups/*.csv` |
| **Admin Auth Config** | `ADMIN_USERNAME`, `ADMIN_PASSWORD` in `.env` | `ADMIN_USER_ID`, `ADMIN_PASSWORD` (hashed on init) |
| **Session Secret** | `JWT_SECRET` | `SESSION_SECRET` (for HMAC tokens) |
| **Google Sheets** | Not configured | `GOOGLE_SHEETS_URL` in settings + admin UI |

---

## MIGRATION PLAN

### Phase 1: Audit & Setup (Current)
- [x] Create `docs/PROJECT_AUDIT.md`
- [ ] Create `server/data/` directory structure
- [ ] Create `.env.example` with all required vars

### Phase 2: CSV Storage Layer
- [ ] Write `backend/telegram-leads/csv-store.js` replacing `db.js`
- [ ] Implement: `initCSV()`, `appendLead()`, `getLeads()`, `updateLead()`, `deleteLead()`, `getStats()`, `exportCSV()`, `logActivity()`, `backup()`
- [ ] Atomic writes with temp file + rename
- [ ] Proper CSV escaping (RFC 4180)
- [ ] Concurrent write protection (file locking or queue)

### Phase 3: Backend API Updates
- [ ] Update `server.js` to use `csv-store.js` instead of `db.js`
- [ ] Enforce `requireAdminAuth` on all `/api/admin/*` routes
- [ ] Add `/api/admin/login`, `/api/admin/logout`, `/api/admin/me`, `/api/admin/change-password`
- [ ] Add `/api/admin/settings` (GET/PATCH) for Google Sheets URL
- [ ] Add `/api/admin/export.csv`, `/api/admin/backup`
- [ ] Add rate limiting on `/api/admin/login`
- [ ] Add CSRF token for admin state changes

### Phase 4: Admin Dashboard Integration
- [ ] Update `admin/index.html` API calls to new endpoints
- [ ] Add Google Sheets link section in Settings tab
- [ ] Connect Export/Backup buttons
- [ ] Test all CRUD operations

### Phase 5: Cleanup
- [ ] Remove `php-website/` directory
- [ ] Remove `wordpress-theme/` directory
- [ ] Remove `@supabase/supabase-js` from package.json
- [ ] Remove `db.js` (or keep as reference)
- [ ] Remove SQLite `leads.db`

### Phase 6: Documentation & Testing
- [ ] Update `README.md` with new setup
- [ ] Create `docs/SETUP.md` (installation, env, run)
- [ ] Create `docs/ADMIN_GUIDE.md` (CSV, dashboard, Google Sheets)
- [ ] Create `docs/DEPLOYMENT.md` (backend hosting requirements)
- [ ] Run `npm test` — Fix any failures
- [ ] Manual E2E test: form → CSV → admin → export

---

## CRITICAL SECURITY FINDINGS

| Severity | Issue | Location |
|----------|-------|----------|
| **HIGH** | Admin auth middleware bypassed on 18 routes | `server.js` lines 259-532 |
| **HIGH** | No CSRF protection on admin mutations | `server.js` |
| **MEDIUM** | No rate limiting on `/api/admin/login` | `server.js` |
| **MEDIUM** | SQLite file in `data/` could be exposed if static serving misconfigured | `server.js` static config |
| **LOW** | `JWT_SECRET` has fallback default | `auth.js` line 11 |

---

## FILES TO CREATE

```
backend/telegram-leads/
├── csv-store.js              # NEW - CSV storage layer
├── .env.example              # UPDATE - Add CSV, Sheets, Session vars
├── server.js                 # UPDATE - Use csv-store, enforce auth
├── auth.js                   # KEEP - Minor: rename JWT_SECRET → SESSION_SECRET
├── validate.js               # KEEP
├── telegram.js               # KEEP - Update DB calls
├── email.js                  # KEEP
├── test-suite.js             # UPDATE - Test CSV store
├── package.json              # UPDATE - Remove @supabase/supabase-js
├── data/
│   ├── leads.csv             # NEW - Auto-created
│   ├── activity.csv          # NEW - Auto-created
│   └── backups/              # NEW - Auto-created
└── admin/
    └── index.html            # UPDATE - Connect to new API
```

---

## ENVIRONMENT VARIABLES (Required for Production)

```env
# Server
PORT=3000
NODE_ENV=production
PUBLIC_SITE_URL=https://www.karmafireprotection.com

# Admin Auth
ADMIN_USER_ID=change_this_admin_id
ADMIN_PASSWORD=change_this_to_a_strong_password
SESSION_SECRET=generate_a_long_random_secret_64_chars_min

# CSV Storage
CSV_DATA_DIR=./data

# Google Sheets (Optional - Link Only)
GOOGLE_SHEETS_URL=https://docs.google.com/spreadsheets/d/your_sheet_id

# Telegram (Optional)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
ADMIN_TELEGRAM_IDS=

# Email (Optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM="Karma Fire Protection" <leads@karmafireprotection.com>
EMAIL_TO=karmafireprotectionllp@gmail.com

# Analytics (Optional)
GA4_MEASUREMENT_ID=
ALLOWED_ORIGINS=https://www.karmafireprotection.com
```

---

## TESTING CHECKLIST (Post-Migration)

- [ ] `npm test` — All 24 tests pass
- [ ] `npm start` — Server starts without errors
- [ ] `GET /api/health` — Returns 200 with CSV status
- [ ] `POST /api/leads` — Valid submission creates lead in CSV
- [ ] `POST /api/leads` — Invalid data rejected with 400
- [ ] `POST /api/leads` — Honeypot bot returns fake success
- [ ] `POST /api/leads` — Rate limit blocks after 5/min
- [ ] `POST /api/admin/login` — Valid credentials return token
- [ ] `POST /api/admin/login` — Invalid credentials return 401
- [ ] `POST /api/admin/login` — Rate limit after 5 attempts
- [ ] `GET /api/admin/leads` — Requires auth, returns paginated leads
- [ ] `GET /api/admin/leads?search=` — Search works
- [ ] `GET /api/admin/leads?status=` — Filter works
- [ ] `PATCH /api/admin/leads/:id` — Updates status/notes in CSV
- [ ] `DELETE /api/admin/leads/:id` — Deletes lead, logs activity
- [ ] `GET /api/admin/stats` — Returns real counts from CSV
- [ ] `GET /api/admin/export.csv` — Downloads valid CSV
- [ ] `GET /api/admin/backup` — Downloads timestamped backup
- [ ] `GET /api/admin/settings` — Returns Google Sheets URL
- [ ] `PATCH /api/admin/settings` — Updates Google Sheets URL
- [ ] Admin Dashboard — Login works, all tabs load data
- [ ] Admin Dashboard — Search, filter, pagination work
- [ ] Admin Dashboard — Edit lead modal saves to CSV
- [ ] Admin Dashboard — Export/Backup buttons download files
- [ ] Admin Dashboard — Google Sheets link opens in new tab
- [ ] Server restart — CSV data persists
- [ ] Concurrent submissions — No data corruption

---

## KNOWN LIMITATIONS (Post-Migration)

1. **No real Google Sheets sync** — Only link management; manual export/import required
2. **File-based locking** — CSV writes use temp-file rename; not fully ACID under extreme concurrency
3. **No horizontal scaling** — Single-server CSV storage; not suitable for load-balanced deployments without shared volume
4. **No automated scheduled backups** — Only on-demand via admin or before bulk ops
5. **Telegram bot uses old DB calls** — Must update `telegram.js` to use CSV store

---

## DEPLOYMENT NOTES

**⚠️ GitHub Pages / Netlify / Vercel (Static Only) WILL NOT WORK** — They cannot:
- Run Node.js backend
- Persist CSV files
- Handle authenticated admin dashboard
- Execute Telegram bot polling

**Required:** VPS, Render, Railway, Fly.io, or any platform supporting:
- Long-running Node.js process
- Persistent filesystem (`server/data/`)
- Environment variable management
- HTTPS termination

---

## SIGN-OFF

| Role | Name | Date | Status |
|------|------|------|--------|
| Senior Engineer | — | 2026-11-25 | Audit Complete |
| Security Review | — | — | Pending |
| QA Lead | — | — | Pending |
| Product Owner | — | — | Pending |