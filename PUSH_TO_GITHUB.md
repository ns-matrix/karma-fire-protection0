=============================================================================
PUSHING KARMA FIRE PROTECTION TO GITHUB
=============================================================================

This guide shows how to push the Karma Fire Protection LLP website code
to a GitHub repository.

============================================================================
PREREQUISITES
============================================================================

1. Install Git for Windows:
   Download from: https://git-scm.com/download/win
   During install: "Use Git from the Windows Command Prompt"

2. Create a GitHub account (if you don't have one):
   https://github.com/signup

3. Create a new repository on GitHub:
   New Repository → Name: "karma-fire-protection"
   → Description: "Karma Fire Protection LLP website"
   → Private or Public (your choice)
   → Do NOT initialize with README/.gitignore/.license (we'll push existing)

============================================================================
STEP-BY-STEP: GIT INIT & FIRST COMMIT
============================================================================

Open Command Prompt (cmd.exe) as administrator or normal user:

  cd C:\Users\ns077\Downloads\sample\sample\karma-fire-protection
  git init
  git add .
  git commit -m "Initial commit: Karma Fire Protection LLP website"

============================================================================
STEP-BY-STEP: CONNECT TO GITHUB
============================================================================

1. Go to https://github.com/new
2. Repository name: "karma-fire-protection"
3. Description: "Karma Fire Protection LLP - Fire Protection Website"
4. Click "Create repository"
5. Copy the remote URL (it will look like:
   https://github.com/your-username/karma-fire-protection.git
   OR git@github.com:your-username/karma-fire-protection.git)

6. In your Command Prompt:
   git remote add origin https://github.com/your-username/karma-fire-protection.git
   git branch -M main
   git push -u origin main

============================================================================
FILES TO INCLUDE (your project structure)
============================================================================

karma-fire-protection/
├── run.bat                ← Project runner (5,732 bytes) ✅
├── run-project.bat        ← Project manager ✅
├── run-project.ps1        ← PowerShell version ✅
├── AUDIT_REPORT.md        ← Full audit report ✅
├── PROJECT_SUMMARY.md     ← This documentation ✅
├── config/.env.example    ← Environment template ✅
├── assets/                ← 18 images/icons ✅
├── css/                   ← 6 modular stylesheets ✅
├── js/                    ← 4 JS modules ✅
├── *.html                 ← 5 pages (index, about, services, projects, contact) ✅
├── robots.txt             ← SEO ✅
├── sitemap.xml            ← SEO ✅
└── backend/telegram-leads/
    ├── .env               ← Add your Telegram credentials ✅ (gitignored)
    ├── server.js          ← Express + SQLite + Telegram bot ✅
    ├── db.js              ← Database operations ✅
    ├── validate.js        ← Form validation ✅
    ├── telegram.js        ← Telegram Bot API ✅
    └── package.json       ← npm dependencies ✅

============================================================================
GITIGNORE (already configured)
============================================================================

The .gitignore should exclude:
  node_modules/
  *.env
  *.log
  backend/telegram-leads/.env
  backend/telegram-leads/backend.db
  test_output.txt
  *.txt (temporary files)

Your .gitignore should look like:
  # Dependencies
  node_modules/
  
  # Environment variables
  *.env
  backend/telegram-leads/.env
  
  # Logs
  *.log
  backend/telegram-leads/backend.log
  frontend.log
  
  # Temp files
  test_output.txt
  *.tmp

============================================================================
AFTER PUSHING TO GITHUB
============================================================================

1. Add Telegram credentials to GitHub Secrets (if using GitHub Actions):
   Repository → Settings → Secrets and variables → Actions
   Add: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, ADMIN_TELEGRAM_IDS

2. Deploy options:
   - Frontend: GitHub Pages (serve from /root folder)
   - Backend:  Node.js hosting (Heroku, Render, Railway, VPS)
   - Combined: Use run-bat on your hosting server

3. Future updates:
   git add .
   git commit -m "Describe your changes"
   git push

============================================================================
QUICK COMMANDS SUMMARY
============================================================================

:: Open Command Prompt
:: cd to your project
cd C:\Users\ns077\Downloads\sample\sample\karma-fire-protection

:: Initialize git
git init

:: Add all files
git add .

:: Commit
git commit -m "Initial: Karma Fire Protection LLP website"

:: Add GitHub remote (replace with your URL)
git remote add origin https://github.com/your-username/karma-fire-protection.git

:: Rename branch to main
git branch -M main

:: Push to GitHub
git push -u origin main

============================================================================
NOTES
============================================================================

⚠️  NEVER commit .env files with real credentials!
    - .env is already in .gitignore
    - Keep Telegram tokens secret
    - Use GitHub Secrets for CI/CD

⚠️  node_modules/ is large (57KB+ of nested files)
    - git add . will include it
    - Make sure .gitignore excludes node_modules/
    - Or use: git add --exclude node_modules/

⚠️  .gitignore should be created at project root
    - Already covered in the project structure

============================================================================