# Administrator & CRM User Guide — Karma Fire Protection

## 1. Accessing the Admin Dashboard

- **URL:** `https://your-domain.com/admin/` (or `http://localhost:3000/admin/`)
- **Default Username:** `admin`
- **Default Credentials:** Built into the app and stored only as a PBKDF2 hash (`Karma@Admin@123` / see README). Optionally override via `ADMIN_USER_ID` and `ADMIN_PASSWORD` in your `.env` file, or change the password from **Settings → Change Password** in the dashboard.

> **Security Notice:** Change your admin password in your `.env` file immediately upon deploying to production.

---

## 2. Dashboard Navigation

### 📊 Overview
- **Metric Cards:**
  - *Visitors Today:* Active visitor sessions detected today.
  - *Total Unique Visitors:* Count of distinct devices/browsers tracked.
  - *Page Views Today:* Total hits across all services and pages.
  - *Enquiries & Conversion:* Total received enquiries and calculated conversion rate `(Total Enquiries / Unique Visitors) * 100`.
- **Daily Visitors Chart:** 14-day interactive visual trend showing traffic fluctuations.
- **Recent Enquiries:** Quick glance at the latest incoming quotes with instant status badges.

---

### 📋 Leads CRM
- **Search Bar:** Real-time search across Client Name, Phone Number, Email, Lead ID (e.g. `KP-2026-0001`), Company, and Location.
- **Status Filter:** Filter by lifecycle state:
  - `New`: Unprocessed enquiry.
  - `Contacted`: Initial call or WhatsApp follow-up made.
  - `Qualified`: Verified fire protection project with budget and scope.
  - `In Progress`: Site visit, CAD layout, or quotation preparation underway.
  - `Converted`: Contract signed / work order received.
  - `Closed`: Not interested, lost, or project cancelled.
- **Direct Status Dropdown:** Change any lead's status directly from the table without reloading.
- **Lead Details Modal:** Click "Details" on any lead to view:
  - Full client requirements and preferred contact method.
  - Originating traffic source, landing page, and UTM campaign.
  - Internal administrative notes textarea (save client follow-up notes).
- **CSV Export:** Click "Export CSV" to download an Excel-ready spreadsheet of your leads.

---

### 👁 Visitor Analytics
- Inspect recent anonymous visitor journeys.
- Review entry landing page, device category (Mobile, Desktop, Tablet), and cookie consent status.

---

### 🎯 Traffic Sources
- Review marketing acquisition channels:
  - Google Organic
  - Bing Organic
  - Direct Traffic
  - Social (LinkedIn, Instagram, Facebook, YouTube)
  - Custom UTM Campaigns

---

### ⚙️ Settings & System Maintenance
- **Integrity Check:** Live report from SQLite `PRAGMA integrity_check`.
- **Telegram & Email Status:** Real-time indicators of whether the notification bots and SMTP relays are functioning.
- **Purge Old Analytics:** Run a single-click cleanup to delete tracking logs older than 90 days.
- **Database Backup:** Create an instantaneous backup snapshot of `leads.db`.
