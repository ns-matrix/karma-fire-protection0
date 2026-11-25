=============================================================================
KARMA FIRE PROTECTION LLP - RUN PROGRAM (run.bat)
=============================================================================

Location: karma-fire-protection/run.bat
File size: 5,732 bytes
Created: 2026-11-21

=============================================================================
PROGRAM FUNCTIONS
============================================================================

This batch file automates the complete Karma Fire Protection LLP website
development workflow. It performs the following:

  [1] Checks Node.js installation
  [2] Verifies backend dependencies
  [3] Starts Express backend server (port 3000)
  [4] Starts frontend HTTP server (port 8080)
  [5] Displays connection URLs and test instructions

============================================================================
TELEGRAM CONFIGURATION (already set in .env)
============================================================================

TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID= (USER NEEDS TO SET THIS)
ADMIN_TELEGRAM_IDS= (USER NEEDS TO SET THIS)
PORT=3000

NOTE: Telegram notifications will be DISABLED until CHAT_ID is set.
      Admin commands (/latest, /leads, /stats, etc.) will also be disabled.

============================================================================
USAGE
============================================================================

  run.bat

  -> Starts both backend and frontend servers automatically
  -> Displays URLs and test instructions
  -> Press Ctrl+C or close window to stop

============================================================================
MANUAL CONTROL (alternative to run.bat)
============================================================================

  To setup:   run-project.bat setup
  To run:     run-bat              (this file)
  To stop:    Run Ctrl+C in the window, or:
              taskkill /F /IM node.exe

  Status:     run-project.bat status
  Logs:       run-project.bat logs

============================================================================
CURRENT SERVER STATUS
============================================================================

  Backend:  http://localhost:3000  ✅ RUNNING
    Health:  http://localhost:3000/api/health
    API:     POST /api/leads  (lead submission with validation)

  Frontend: http://localhost:8080  ✅ RUNNING
    (Python http.serve or npx serve)

  Test lead submission:
    curl -X POST http://localhost:3000/api/leads ^
      -H "Content-Type: application/json" ^
      -d "{\"name\":\"Amit Roy\",\"phone\":\"+919876543210\",\"email\":\"amit@example.com\",\"service\":\"Fire Alarm System\",\"location\":\"Kolkata\",\"message\":\"Office fire safety check\",\"consent\":true}"

  Expected response:
    {"ok":true,"leadId":"KP-2026-000X","message":"Thank you! Your request has been received."}

============================================================================
TELEGRAM ENABLEMENT CHECKLIST
============================================================================

  □ TELEGRAM_BOT_TOKEN  → Already set: your_telegram_bot_token_here
  □ TELEGRAM_CHAT_ID     → Get from @userinfobot or @getmyid_bot
  □ ADMIN_TELEGRAM_IDS   → Comma-separated admin user IDs (get from @userinfobot)

  After adding CHAT_ID + ADMIN_IDS to .env:
    • Restart the server
    • Submit contact form → Telegram notification arrives
    • Use /latest, /stats, /today commands in Telegram

============================================================================
PROJECT FILE STRUCTURE
============================================================================

karma-fire-protection/
├── run.bat                ← This file (starts backend + frontend)
├── run-project.bat        ← Project manager (setup, status, stop)
├── AUDIT_REPORT.md        ← Full audit report
├── PROJECT_SUMMARY.md     ← This documentation
├── config/.env.example    ← Environment template (used)
├── backend/telegram-leads/
│   ├── .env               ← ✅ Has bot token (CHAT_ID + ADMIN_IDS needed)
│   ├── server.js          ← Express + SQLite + Telegram bot
│   ├── db.js              ← Database operations
│   ├── validate.js        ← Form validation
│   ├── telegram.js        ← Telegram Bot API
│   └── package.json       ← npm dependencies
├── assets/                ← 18 reused images/icons
├── css/                   ← 6 modular stylesheets
├── js/                    ← 4 JS modules
├── *.html                 ← 5 pages (index, about, services, projects, contact)
├── robots.txt, sitemap.xml← SEO files
└── Frontend: ✅ Complete
   Backend: ✅ Ready (API working, needs Chat ID for Telegram)

============================================================================
VALIDATION PATTERNS (for lead submissions)
============================================================================

  Name:       ^[A-Za-z][A-Za-z .'\-]{1,60}$  (starts with letter, allows spaces)
  Phone:      ^\+?[0-9][0-9 \-]{6,18}[0-9]$  ( +919876543210 format)
  Email:      ^[^\s@]{1,64}@[^\s@]{1,190}\.[A-Za-z]{2,20}$
  Services:   Fire Hydrant System, Fire Alarm System, Fire Sprinkler System,
              Fire Suppression System, Installation, Maintenance, Inspection, Other
  Location:   Minimum 3 characters

============================================================================