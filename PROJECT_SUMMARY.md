=============================================================================
KARMA FIRE PROTECTION LLP - PROJECT RUNNER (run-project.bat)
=============================================================================

Location: karma-fire-protection/run-project.bat
File size: 9,940 bytes
Created: 2026-11-21

=============================================================================
COMMANDS
=============================================================================

  setup       Install dependencies and create .env from template
  run         Start backend (port 3000) and frontend (port 8080)
  stop        Stop all running servers
  status      Check server status
  logs        View recent server logs
  (no arg)    Show help/usage

=============================================================================
USAGE WORKFLOW
=============================================================================

  1. run-project.bat setup
      - Checks Node.js installation
      - Installs backend npm dependencies
      - Creates .env from config/.env.example template
      - Verifies required environment variables
      - Outputs: "Setup complete! Edit backend/telegram-leads\.env"

  2. Edit .env file:
      backend/telegram-leads/.env
      --------------------------------
      TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIjkLmNoPqRstU
      TELEGRAM_CHAT_ID=-1001234567890
      ADMIN_TELEGRAM_IDS=123456789
      PORT=3000

  3. run-project.bat run
      - Starts Express backend on http://localhost:3000
      - Starts Python http.server or npx serve on http://localhost:8080
      - Outputs server URLs and health check endpoint

  4. Test end-to-end:
      - Open http://localhost:8080 in browser
      - Submit contact form
      - Lead saved to SQLite database
      - Telegram notification sent (if .env configured)

  5. run-project.bat stop
      - Kills both backend and frontend processes

=============================================================================
PROJECT STRUCTURE
=============================================================================

karma-fire-protection/
├── run-project.bat              ← Project manager (this file)
├── AUDIT_REPORT.md              ← Full audit report
├── config/
│   └── .env.example             ← Environment template
├── assets/                      ← 18 reused images/icons
├── css/                         ← 6 modular stylesheets
├── js/                          ← 4 JS modules
├── *.html                       ← 5 pages (index, about, services, projects, contact)
├── backend/
│   └── telegram-leads/
│       ├── server.js            ← Express + SQLite + Telegram bot
│       ├── db.js                ← Database operations
│       ├── validate.js          ← Form validation
│       ├── telegram.js          ← Telegram Bot API
│       ├── package.json         ← npm dependencies
│       └── .env                 ← **Fill this in** (Telegram credentials)
├── robots.txt                   ← SEO
└── sitemap.xml                  ← SEO

=============================================================================
BACKEND FEATURES (when .env configured)
=============================================================================

  API Endpoints:
    GET  /api/health     → {"ok":true,"status":"up"}
    POST /api/leads      → Lead submission with validation

  Security:
    • CORS configuration (restricted to frontend origin)
    • Helmet.js HTTP headers
    • Rate limiting (5 requests per 15 minutes)
    • Honeypot field (blocks spam bots)
    • IP address hashing
    • Input sanitization

  Telegram Bot:
    • /latest     → Latest lead
    • /leads      → All leads (paginated)
    • /stats      → Lead statistics
    • /today      → Today's leads
    • /search     → Search leads by name/phone
    • /export     → Export leads as JSON
    • /status     → Bot status
    • Restricted to ADMIN_TELEGRAM_IDS only

=============================================================================
FRONTEND FEATURES
=============================================================================

  Pages (5):
    • index.html   → Homepage with hero, services, CTA
    • about.html   → Company info, branches, contact details
    • services.html → Service offerings
    • projects.html → Portfolio/gallery
    • contact.html → Contact form with validation

  Performance:
    • IntersectionObserver (replaced AOS)
    • Bootstrap 5 only (no heavy libraries)
    • 18 assets from original template
    • Custom CSS animations

  SEO / Accessibility:
    • schema.org Organization markup
    • Open Graph meta tags
    • robots.txt & sitemap.xml
    • ARIA labels, skip links
    • Semantic HTML5

=============================================================================
AFTER SETUP - NEXT STEPS
=============================================================================

  □ Run:  run-project.bat setup
  □ Edit: backend/telegram-leads\.env  (fill Telegram credentials)
  □ Run:  run-project.bat run
  □ Open: http://localhost:8080  (frontend)
  □ Open: http://localhost:3000/api/health  (backend health)
  □ Submit contact form → verify Telegram notification
  □ Run:  run-project.bat status  (verify servers)
  □ Run:  run-project.bat stop    (when done)

=============================================================================
NOTES
============================================================================-

  • Frontend: Vanilla HTML/CSS/JS — no build step required
  • Backend: Node.js/Express with SQLite (node:sqlite built-in)
  • Ports: Backend 3000, Frontend 8080 (configurable)
  • Required: Windows + Node.js 18+ installed
  • .env file: NEVER commit to version control (already .gitignore'd)
  • Telegram: Create bot via @BotFather, get Chat ID via @userinfobot

=============================================================================