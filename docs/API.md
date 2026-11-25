# API Documentation — Karma Fire Protection Platform

Base URL: `https://your-domain.com` (or `http://localhost:3000`)

---

## Public Endpoints

### 1. Health Check
`GET /api/health`

Returns service health, database connectivity status, and server uptime.

**Response (200 OK):**
```json
{
  "ok": true,
  "status": "healthy",
  "uptime": 12450,
  "timestamp": "2026-11-25T10:00:00.000Z",
  "database": "connected"
}
```

---

### 2. Visitor Analytics Tracking
`POST /api/track`

Receives non-invasive first-party tracking hits from `js/analytics.js`.

**Rate limit:** 60 requests per minute per IP hash.

**Request Body:**
```json
{
  "visitorUuid": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "sessionUuid": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "pagePath": "/services.html",
  "pageTitle": "Fire Hydrant, Alarm, Sprinkler & Suppression Services | Karma Fire Protection LLP",
  "landingPage": "/services.html",
  "referrer": "https://www.google.com",
  "source": "Google Organic",
  "medium": "organic",
  "campaign": null,
  "deviceCategory": "mobile",
  "consentState": "granted"
}
```

**Response (200 OK):**
```json
{
  "ok": true
}
```

---

### 3. Lead Submission
`POST /api/leads`

Submits an enquiry or quotation request. Validates fields, saves to database, triggers instant Telegram and Email notifications, and returns the assigned `leadId`.

**Rate limit:** 5 submissions per 10 minutes per IP hash.

**Request Body:**
```json
{
  "name": "Vikram Patel",
  "phone": "+91 98200 55443",
  "email": "vikram@example.com",
  "company": "Patel Logistics Hub",
  "building_type": "Warehouse / Logistics",
  "service": "Fire Hydrant System",
  "location": "Bhiwandi / Thane, Mumbai",
  "message": "Looking for complete hydrant line installation for 40,000 sq ft warehouse.",
  "contact_method": "Phone Call",
  "consent": true,
  "website": "",
  "visitor_uuid": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "session_uuid": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "landing_page": "/services.html",
  "source": "Google Organic",
  "medium": "organic",
  "campaign": null
}
```

*Note: `website` is a honeypot field. If populated, the system discards the bot submission silently and returns a dummy success response.*

**Response (201 Created):**
```json
{
  "ok": true,
  "leadId": "KP-2026-0004",
  "message": "Thank you! Your request has been received. We will get back to you shortly."
}
```

**Validation Error Response (400 Bad Request):**
```json
{
  "ok": false,
  "message": "Please check the form fields and try again.",
  "errors": [
    { "field": "phone", "message": "Please enter a valid phone number." }
  ]
}
```

---

## Admin Endpoints (Protected)

Authentication is provided via `Authorization: Bearer <token>` or HTTP-only `admin_token` cookie.

### 4. Admin Login
`POST /api/admin/login`

**Rate limit:** 5 attempts per 15 minutes per IP hash.

**Request Body:**
```json
{
  "username": "admin",
  "password": "YourStrongPassword"
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin"
  }
}
```

---

### 5. Admin Overview Metrics
`GET /api/admin/overview`

Returns dashboard summary cards, 14-day daily charts, top services, and recent enquiries.

---

### 6. Admin Leads List (Filtered & Paginated)
`GET /api/admin/leads?page=1&limit=20&status=Qualified&service=Fire+Hydrant+System&search=Patel`

**Query Parameters:**
- `page` (default 1)
- `limit` (default 20, max 100)
- `status`: `'New'`, `'Contacted'`, `'Qualified'`, `'In Progress'`, `'Converted'`, `'Closed'`
- `service`: filter by service name
- `source`: filter by traffic source
- `search`: search query matched against `name`, `phone`, `email`, `lead_id`, `company`, or `location`
- `from`, `to`: date bounds (YYYY-MM-DD)

---

### 7. Lead Details & Visitor Journey
`GET /api/admin/leads/:leadId`

Returns the full lead record, internal notes, and links the visitor's past session history and page view timeline.

---

### 8. Update Lead Status & Notes
`PATCH /api/admin/leads/:leadId`

**Request Body:**
```json
{
  "status": "In Progress",
  "notes": "Site inspection scheduled for 28th Nov with Chief Safety Officer."
}
```

---

### 9. Export Leads CSV
`GET /api/admin/leads/export/csv`

Generates an RFC4180 UTF-8 CSV file containing all filtered leads.

---

### 10. Visitor Analytics View
`GET /api/admin/analytics/visitors`

Returns recent visitors with their total sessions, first/last seen, entry landing page, device category, and consent status.

---

### 11. Traffic Sources View
`GET /api/admin/analytics/sources?days=30`

Returns percentage breakdown of organic search, direct traffic, social referrals, and campaigns.

---

### 12. Top Visited Pages
`GET /api/admin/analytics/pages?days=30`

Returns view counts and unique session counts per page path.

---

### 13. System Settings & Retention Maintenance
- `GET /api/admin/settings`: View database integrity, Telegram bot status, and SMTP configuration.
- `POST /api/admin/settings/cleanup`: `{ "days": 90 }` purges analytics older than specified days.
- `POST /api/admin/settings/backup`: Triggers an atomic SQLite database snapshot file.
