# System Architecture — Karma Fire Protection Platform

This document describes the high-level architecture, subsystem interactions, security boundaries, and data flows of the Karma Fire Protection platform.

## High-Level Architecture Overview

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|                                                                                   |
|   +------------------------------------+    +---------------------------------+   |
|   |   Static Website Frontend          |    |   Admin CRM Dashboard           |   |
|   |   (HTML5, CSS3, Vanilla JS)        |    |   (/admin/ SPA)                 |   |
|   |   - js/analytics.js (First-party)  |    |   - Session Auth (Bearer/Cookie)|   |
|   |   - js/forms.js (Lead capture)     |    |   - Analytics & CRM tables      |   |
|   |   - Consent Banner (Privacy UI)    |    |   - Real-time lead management   |   |
|   +-----------------+------------------+    +----------------+----------------+   |
+---------------------|----------------------------------------|--------------------+
                      | HTTPS (REST / JSON)                    |
                      v                                        v
+-----------------------------------------------------------------------------------+
|                         NODE.JS / EXPRESS BACKEND LAYER                           |
|                                                                                   |
|   +---------------------------------------------------------------------------+   |
|   | Middleware: CORS | Helmet Headers (CSP, HSTS) | Rate Limiting | Size Cap  |   |
|   +---------------------------------------------------------------------------+   |
|                                                                                   |
|   +------------------+  +------------------+  +-------------------------------+   |
|   | Analytics Engine |  | Lead Submission  |  | Admin Auth & API Service      |   |
|   | POST /api/track  |  | POST /api/leads  |  | /api/admin/* (RBAC, PBKDF2)   |   |
|   +--------+---------+  +--------+---------+  +---------------+---------------+   |
|            |                     |                            |                   |
+------------|---------------------|----------------------------|-------------------+
             |                     |                            |
             v                     v                            v
+-----------------------------------------------------------------------------------+
|                               STORAGE LAYER (SQLite)                              |
|   - node:sqlite DatabaseSync (WAL mode, foreign keys, synchronous NORMAL)         |
|   - visitors | sessions | page_views | leads | rate_limits | admins               |
+----------------------------------+------------------------------------------------+
                                   |
                                   | (Asynchronous Background Tasks)
                                   v
+-----------------------------------------------------------------------------------+
|                             EXTERNAL NOTIFICATION LAYER                           |
|                                                                                   |
|   +---------------------------------------+  +--------------------------------+   |
|   | Telegram CRM Bot Service              |  | Email Notification Service     |   |
|   | - Polling / Webhook                   |  | - Nodemailer SMTP              |   |
|   | - Interactive callback status buttons |  | - HTML & text templates        |   |
|   | - Admin-whitelisted CRM commands      |  | - Fail-safe background dispatch|   |
|   +---------------------------------------+  +--------------------------------+   |
+-----------------------------------------------------------------------------------+
```

---

## Subsystems Description

### 1. Frontend Client Layer
- **Pages**: `index.html`, `about.html`, `services.html`, `projects.html`, `contact.html`, `privacy-policy.html`.
- **First-Party Analytics (`js/analytics.js`)**: Generates an anonymous, persistent `visitor_uuid` and `session_uuid` (30-minute inactivity timeout). Captures landing page, referrer domain, and UTM query parameters (`utm_source`, `utm_medium`, `utm_campaign`).
- **Attribution & Form Submission (`js/forms.js`)**: Seamlessly binds visitor analytics and marketing attribution into enquiry submissions without any friction for the user.
- **Privacy & Consent Banner**: Non-intrusive cookie/analytics consent bar allowing users to grant or decline non-essential analytics cookies.

### 2. Express Backend Layer (`backend/telegram-leads/`)
- Built on Node.js (>=22.5, using built-in `node:sqlite` and `node:crypto`).
- Zero heavy dependencies; fast, lightweight, and resilient.
- Hardened with security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy`).
- IP rate limiting backed by SQLite sliding windows.
- Cryptographic SHA-256 IP hashing (raw customer IP addresses are never stored in leads or analytics tables).

### 3. SQLite Storage Layer (`db.js`)
- Runs in **WAL (Write-Ahead Logging)** mode for concurrent readers and sequential writer performance.
- Database integrity checks (`PRAGMA integrity_check`) executed on healthcheck and settings requests.
- Automatic database migrations ensure existing columns and tables are never destroyed or broken.

### 4. Telegram CRM Bot (`telegram.js`)
- Instant alerts to business owners with clickable telephone links and project details.
- Interactive inline buttons (`st:<lead_id>:<Status>`) allowing one-click status transitions (`Contacted`, `Qualified`, `In Progress`, `Converted`, `Closed`).
- Role-based command access restricted to authorized `ADMIN_TELEGRAM_IDS`.

### 5. Email Notification Service (`email.js`)
- Standard SMTP transport via Nodemailer.
- Professional, brand-aligned HTML email templates.
- Fails safe: An SMTP or network failure will log a warning but will never discard or invalidate a successfully saved lead.
