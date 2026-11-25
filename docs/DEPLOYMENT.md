# Production Deployment Guide — Karma Fire Protection Platform

This guide outlines deployment options for hosting the frontend static website and backend Node.js CRM server with SQLite persistence.

---

## Architecture Summary

- **Frontend:** Pure HTML5, CSS3, Vanilla JS. Can be served by the Node.js backend directly or hosted on GitHub Pages, Cloudflare Pages, Netlify, or Vercel.
- **Backend:** Express.js + SQLite (`node:sqlite`). Requires Node.js >= 22.5.
- **Persistent Storage:** SQLite database file (`leads.db`) must reside on a persistent volume so that restarts or container redeployments do not delete customer enquiries.

---

## Deployment Option 1: Docker / Docker Compose (Recommended for VPS / Cloud VMs)

Ideal for Ubuntu/Debian VPS on DigitalOcean, Linode, AWS EC2, or Hetzner.

### 1. Prerequisites
- Docker Engine & Docker Compose installed.

### 2. Steps
1. Clone the repository on your server:
   ```bash
   git clone https://github.com/ns-matrix/karma-fire-protection.git
   cd karma-fire-protection
   ```
2. Create production `.env` in `backend/telegram-leads/.env`:
   ```bash
   cp backend/telegram-leads/.env.example backend/telegram-leads/.env
   nano backend/telegram-leads/.env
   ```
   *Fill in your real `ADMIN_PASSWORD`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, and SMTP settings.*

3. Start container with Docker Compose:
   ```bash
   docker compose up -d --build
   ```

4. Verify health and logs:
   ```bash
   docker compose ps
   curl http://localhost:3000/api/health
   docker compose logs -f
   ```

*The `karma-db-data` named volume automatically preserves `leads.db` across all container restarts and rebuilds.*

---

## Deployment Option 2: Render.com / Railway.app / Fly.io

### Render.com Setup
1. Create a **New Web Service** pointing to your GitHub repository.
2. Root Directory: `backend/telegram-leads`
3. Environment: `Node` (Node version: `22` or `24` in Environment Variables: `NODE_VERSION=22.5.0`)
4. Build Command: `npm install`
5. Start Command: `node server.js`
6. **Important — Persistent Disk:**
   - Under **Disks**, add a Persistent Disk mounted at `/app/data` (size: 1 GB).
   - Set environment variable: `DB_PATH=/app/data/leads.db`.
7. Configure all environment variables from `.env.example`.

### Fly.io Setup
1. Mount a volume:
   ```bash
   fly volumes create karma_data --size 1
   ```
2. Configure `fly.toml`:
   ```toml
   [mounts]
     source = "karma_data"
     destination = "/app/data"
   ```

---

## Deployment Option 3: Traditional Linux VPS with PM2 & Nginx

1. **Install Node.js 22+:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo npm install -g pm2
   ```

2. **Clone & Setup:**
   ```bash
   cd /var/www/karma-fire-protection/backend/telegram-leads
   npm install --omit=dev
   cp .env.example .env
   # Edit .env with real credentials
   ```

3. **Start with PM2:**
   ```bash
   pm2 start server.js --name "karma-api"
   pm2 save
   pm2 startup
   ```

4. **Nginx Reverse Proxy Configuration:**
   ```nginx
   server {
       server_name karmafireprotection.com www.karmafireprotection.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }

       listen 443 ssl http2;
       # Certbot SSL certificates
   }
   ```

---

## Static Frontend Hosting + Separate Backend API

If you prefer keeping the frontend on GitHub Pages or Cloudflare Pages while hosting the API on Render/Railway:
1. In `contact.html`, update the form's `data-api` attribute:
   ```html
   <form id="lead-form" data-api="https://api.yourdomain.com/api/leads">
   ```
2. In `backend/telegram-leads/.env`, update `ALLOWED_ORIGINS`:
   ```env
   ALLOWED_ORIGINS=https://www.karmafireprotection.com,https://ns-matrix.github.io
   ```

---

## PostgreSQL Migration Guide (For Ephemeral Hosts)

If your cloud host cannot provide a persistent disk for SQLite, migrate to managed PostgreSQL (Supabase, Neon, AWS RDS, Render Postgres):

1. Provision PostgreSQL database.
2. In `package.json`, install `pg`:
   ```bash
   npm install pg
   ```
3. Set `DATABASE_URL=postgres://user:pass@host:5432/dbname`.
4. In `db.js`, replace `DatabaseSync` queries with a `new Pool({ connectionString: process.env.DATABASE_URL })`.
