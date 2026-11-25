# Karma Fire Protection LLP — Website Intelligence & CRM Platform

Official production repository for **Karma Fire Protection LLP** (Mumbai, India). Complete platform combining a high-performance static website, first-party privacy-preserving visitor analytics, automated lead capture and CRM, Telegram bot notifications, email alerts, and a secure administrative dashboard.

[![Tests](https://img.shields.io/badge/tests-44%20passed-success)](backend/telegram-leads/test-suite.js)
[![Node](https://img.shields.io/badge/node-%3E%3D22.5-blue)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/database-SQLite%20WAL-lightgrey)](docs/DATABASE.md)
[![License](https://img.shields.io/badge/license-Proprietary-red)](#)

---

## 🌟 Key Features

- **High-Performance Static Frontend:** Modern, accessible, fully responsive HTML5/CSS3 frontend with scroll reveal animations, accessible forms, WhatsApp pre-fills, and verified business schemas.
- **First-Party Visitor Intelligence:** Privacy-first tracking module (`POST /api/track`, `js/analytics.js`) capturing anonymous visitor UUIDs, sessions, landing pages, referrers, device categories, and marketing campaign attribution without invasive fingerprinting.
- **Contact Form CRM Engine:** Client and server-side validation, honeypot spam protection, sliding-window rate limiting, sequential Lead IDs (`KP-YYYY-XXXX`), and lead status lifecycle management.
- **Instant Dual Notifications:**
  - **Telegram CRM Bot:** Real-time lead notifications with inline status change buttons, plus admin commands (`/latest`, `/today`, `/leads`, `/stats`, `/visitors`, `/sources`, `/search`, `/status`, `/export`).
  - **Email Alerts:** Reusable Nodemailer SMTP notification service delivering responsive HTML and plain text lead summaries.
- **Secure Admin CRM Dashboard (`/admin/`):** Password-protected administrative portal featuring real-time overview metrics, 14-day traffic trend charts, search, status filtering, lead detail modal with visitor journeys, CSV export, and database integrity maintenance.
- **Complete SEO Architecture:** Validated JSON-LD schemas (`LocalBusiness`, `Service`, `BreadcrumbList`, `ContactPage`, `AboutPage`), optimized `sitemap.xml`, canonical links, Open Graph tags, and verified geographic details for Mumbai, Thane, and Navi Mumbai.
- **Production Security:** Zero exposed tokens, parameterized queries, PBKDF2 password hashing with timing-safe verification, HMAC token signing, strict CORS policies, and security headers.

---

## 🏗 System Architecture

```
+-------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                 |
|   Frontend Static Pages (HTML5/CSS3)    |   Admin CRM Dashboard (/admin/)     |
|   - js/analytics.js (First-party)       |   - Bearer / Cookie Session Auth    |
|   - js/forms.js (Attribution binding)   |   - Interactive Charts & Filters    |
|   - Cookie & Analytics Consent Banner   |   - Lead Management & CSV Export    |
+---------------------------------------+---------------------------------------+
                                        |
                         HTTPS REST API |
                                        v
+-------------------------------------------------------------------------------+
|                       NODE.JS / EXPRESS BACKEND LAYER                         |
|   - Security Headers (CSP, Nosniff, HSTS) | Strict CORS Whitelist             |
|   - Sliding Window Rate Limiting          | Honeypot Bot Filtering            |
|   - Visitor Analytics API (/api/track)    | CRM Lead API (/api/leads)         |
|   - Admin REST API (/api/admin/*)         | Health Check (/api/health)        |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                            STORAGE LAYER (SQLite WAL)                         |
|   - visitors | sessions | page_views | leads | rate_limits | admins           |
+---------------------------------------+---------------------------------------+
                                        |
                                        | (Background Fail-Safe Tasks)
                                        v
+-------------------------------------------------------------------------------+
|                          EXTERNAL NOTIFICATION LAYER                          |
|   - Telegram CRM Bot (Polling, inline keyboard status updates, CSV document)  |
|   - Email Alerts (Nodemailer SMTP with responsive HTML templates)             |
+-------------------------------------------------------------------------------+
```

---

## 📂 Project Structure

```
.
├── index.html                  # Homepage (Hero, Services, Process, CTA)
├── about.html                  # About Us & Company Information
├── services.html               # Fire Protection Services & Systems
├── projects.html               # Track Record & Project References
├── contact.html                # Consultation & Quotation Form
├── privacy-policy.html         # Privacy Policy & Consent Notice
├── sitemap.xml                 # XML Sitemap with priority & lastmod
├── robots.txt                  # Robots exclusion & sitemap pointer
├── CNAME                       # Production custom domain
├── docker-compose.yml          # Container orchestration with volume mount
│
├── assets/                     # Icons, logos, and WebP images
├── css/                        # Modular CSS stylesheets
├── js/
│   ├── analytics.js            # First-party visitor tracking & attribution
│   ├── forms.js                # Lead form handler & GA4 conversion trigger
│   ├── main.js                 # Preloader, scroll reveal & UI handlers
│   ├── navigation.js           # Header navigation & mobile menu
│   └── validation.js           # Client-side form validation UX
│
├── backend/telegram-leads/
│   ├── server.js               # Express API & static server
│   ├── db.js                   # SQLite database & query engine (node:sqlite)
│   ├── auth.js                 # PBKDF2 password & HMAC token service
│   ├── validate.js             # Input validation & sanitization
│   ├── telegram.js             # Telegram CRM notification & command bot
│   ├── email.js                # Reusable Nodemailer SMTP service
│   ├── test-suite.js           # Automated end-to-end test suite
│   ├── Dockerfile              # Production container build definition
│   ├── .env.example            # Environment variables template
│   └── admin/
│       └── index.html          # Responsive single-page Admin CRM Dashboard
│
└── docs/
    ├── ARCHITECTURE.md         # Detailed architectural design & data flow
    ├── DATABASE.md             # SQLite ER diagram & table specifications
    ├── API.md                  # Complete REST API reference documentation
    ├── ADMIN_GUIDE.md          # Admin portal user manual & workflow
    ├── SEO_GUIDE.md            # On-page SEO, GSC, GA4, & GBP setup
    ├── DEPLOYMENT.md           # Docker, Render, Railway & VPS guides
    └── PRIVACY.md              # Privacy principles, retention & deletion
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js version **22.5.0 or higher** (tested with Node 24).
- Git.

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/ns-matrix/karma-fire-protection.git
cd karma-fire-protection/backend/telegram-leads
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and configure your credentials:
```env
PORT=3000
NODE_ENV=development
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourSecurePassword123!
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_CHAT_ID=your_chat_id
ADMIN_TELEGRAM_IDS=your_telegram_user_id
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 3. Run the Automated Test Suite
```bash
npm test
```
All 24 automated tests should pass:
```
======================================================
🏁 TEST EXECUTION COMPLETE
Passed: 24 | Failed: 0
======================================================
```

### 4. Start the Application
```bash
npm start
```
- 🌐 **Website:** [http://localhost:3000](http://localhost:3000)
- 🔐 **Admin Dashboard:** [http://localhost:3000/admin](http://localhost:3000/admin)
- 🩺 **Health Check:** [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

## 🤖 Telegram Bot CRM Commands

Once configured with `TELEGRAM_BOT_TOKEN` and `ADMIN_TELEGRAM_IDS`, the bot provides instant CRM controls directly within Telegram:

| Command | Action |
| :--- | :--- |
| `/start` or `/help` | Welcome menu and command listing |
| `/latest` | Displays the 5 most recent website enquiries |
| `/today` | Displays all leads received today |
| `/leads` | Summary overview with breakdown by lifecycle status |
| `/stats` | Aggregate totals and top service interest metrics |
| `/visitors` | Live visitor counts, active sessions, and top viewed pages |
| `/sources` | Traffic acquisition sources (organic, direct, social, campaigns) |
| `/search <query>` | Search leads by client name, phone number, company, or Lead ID |
| `/status <LeadID> <Status>` | Update lead status (`Contacted`, `Qualified`, `Converted`, etc.) |
| `/export` | Generates and sends a downloadable `.csv` file in chat |
| `/settings` | System diagnostics and database integrity check |

---

## 🚢 Docker Deployment

Deploy in production using Docker Compose with persistent disk storage:

```bash
docker compose up -d --build
```
The named volume `karma-db-data` automatically maps `/app/data` to ensure `leads.db` persists across container restarts, updates, and rebuilds.

For detailed deployment instructions on Render, Railway, Fly.io, or Ubuntu VPS with Nginx and PM2, refer to [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## 🏢 Business Details (Verified)

- **Company Name:** Karma Fire Protection LLP
- **Phone:** `+91 95949 67751`
- **Email:** `karmafireprotectionllp@gmail.com`
- **Address:** Police Station, 04, near Surya Nagar, Suryanagar No. 2, Surya Nagar, HMPL Surya Nagar, Vikhroli West, Mumbai, Maharashtra 400083
- **Primary Service Locations:** Mumbai, Thane, Navi Mumbai, Powai, Kandivali, Vasai.
# karma-fire-protection0
