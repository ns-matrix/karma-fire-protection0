# Database Specification & ER Diagram — Karma Fire Protection

The platform utilizes a structured SQLite database (`leads.db`) managed via Node's built-in `node:sqlite` (`DatabaseSync`).

---

## Entity Relationship (ER) Diagram

```
+--------------------------+       1:N       +--------------------------+
|         visitors         | <-------------- |         sessions         |
+--------------------------+                 +--------------------------+
| PK id            INTEGER |                 | PK id            INTEGER |
| UQ visitor_uuid     TEXT | <----------+    | UQ session_uuid     TEXT |
|    first_seen       TEXT |            |    | FK visitor_uuid     TEXT |
|    last_seen        TEXT |            |    |    started_at       TEXT |
|    total_sessions INTEGER|            |    |    last_activity    TEXT |
|    consent_state    TEXT |            |    |    landing_page     TEXT |
|    created_at       TEXT |            |    |    referrer         TEXT |
+--------------------------+            |    |    source           TEXT |
             |                          |    |    medium           TEXT |
             | 1:N                      |    |    campaign         TEXT |
             v                          |    |    device_category  TEXT |
+--------------------------+            |    +--------------------------+
|        page_views        |            |                 |
+--------------------------+            |                 | 1:N
| PK id            INTEGER |            |                 |
| FK visitor_uuid     TEXT |            |                 |
| FK session_uuid     TEXT | <----------|-----------------+
|    page_path        TEXT |            |
|    page_title       TEXT |            |
|    referrer         TEXT |            |
|    timestamp        TEXT |            |
+--------------------------+            |
                                        | 1:N
+---------------------------------------+
|                 leads                 |
+---------------------------------------+
| PK id             INTEGER             |
| UQ lead_id        TEXT (KP-YYYY-XXXX) |
|    name           TEXT                |
|    phone          TEXT                |
|    email          TEXT                |
|    company        TEXT                |
|    building_type  TEXT                |
|    service        TEXT                |
|    location       TEXT                |
|    message        TEXT                |
|    contact_method TEXT                |
|    consent        INTEGER (0/1)       |
|    status         TEXT                |
|    source         TEXT                |
|    ip_hash        TEXT                |
| FK visitor_uuid   TEXT                |
| FK session_uuid   TEXT                |
|    landing_page   TEXT                |
|    medium         TEXT                |
|    campaign       TEXT                |
|    notes          TEXT                |
|    created_at     TEXT                |
|    updated_at     TEXT                |
+---------------------------------------+

+--------------------------+     +--------------------------+
|       rate_limits        |     |          admins          |
+--------------------------+     +--------------------------+
| PK bucket        TEXT    |     | PK id            INTEGER |
| PK window_start  INTEGER |     | UQ username         TEXT |
|    count         INTEGER |     |    password_hash    TEXT |
+--------------------------+     |    salt             TEXT |
                                 |    created_at       TEXT |
                                 |    last_login       TEXT |
                                 +--------------------------+
```

---

## Table Schemas

### 1. `visitors`
Stores unique anonymous first-party visitor records.
- `id` (INTEGER, PK, AUTOINCREMENT): Internal sequence ID.
- `visitor_uuid` (TEXT, NOT NULL, UNIQUE): Client-generated random UUID v4.
- `first_seen` (TEXT, NOT NULL, DEFAULT `(datetime('now'))`): Timestamp of first recorded hit.
- `last_seen` (TEXT, NOT NULL, DEFAULT `(datetime('now'))`): Timestamp of most recent visit.
- `total_sessions` (INTEGER, NOT NULL, DEFAULT 1): Count of distinct browsing sessions.
- `consent_state` (TEXT, NOT NULL, DEFAULT `'undecided'`): `'granted'`, `'necessary'`, `'denied'`, or `'undecided'`.
- `created_at` (TEXT, NOT NULL, DEFAULT `(datetime('now'))`).

### 2. `sessions`
Records individual browsing visits (sessions expire after 30 minutes of inactivity).
- `id` (INTEGER, PK, AUTOINCREMENT).
- `session_uuid` (TEXT, NOT NULL, UNIQUE): Unique session identifier.
- `visitor_uuid` (TEXT, NOT NULL): Links to visitor.
- `started_at` (TEXT, NOT NULL, DEFAULT `(datetime('now'))`).
- `last_activity` (TEXT, NOT NULL, DEFAULT `(datetime('now'))`).
- `landing_page` (TEXT): First URL visited in the session.
- `referrer` (TEXT): Originating external referrer URL or search engine.
- `source` (TEXT): Identified traffic source (e.g., `'Google Organic'`, `'LinkedIn'`, `'Direct'`).
- `medium` (TEXT): Attribution medium (e.g., `'organic'`, `'social'`, `'cpc'`).
- `campaign` (TEXT): `utm_campaign` value if present.
- `device_category` (TEXT): `'desktop'`, `'mobile'`, or `'tablet'`.

### 3. `page_views`
Stores individual page view events (deduplicated within 2 seconds for identical path & session).
- `id` (INTEGER, PK, AUTOINCREMENT).
- `visitor_uuid` (TEXT, NOT NULL).
- `session_uuid` (TEXT, NOT NULL).
- `page_path` (TEXT, NOT NULL): URL path (e.g., `/services.html`).
- `page_title` (TEXT): Browser document title.
- `referrer` (TEXT): Internal or external referring URL.
- `timestamp` (TEXT, NOT NULL, DEFAULT `(datetime('now'))`).

### 4. `leads`
Stores customer enquiries received through website quotation and consultation forms.
- `id` (INTEGER, PK, AUTOINCREMENT).
- `lead_id` (TEXT, NOT NULL, UNIQUE): Human-readable reference ID (e.g., `KP-2026-0001`).
- `name` (TEXT, NOT NULL): Customer name.
- `phone` (TEXT, NOT NULL): Phone number (validated and formatted).
- `email` (TEXT, NOT NULL): Valid email address.
- `company` (TEXT, NULLABLE): Organization or business name.
- `building_type` (TEXT, NULLABLE): Building categorization.
- `service` (TEXT, NOT NULL): Requested fire protection system.
- `location` (TEXT, NOT NULL): Site address or area.
- `message` (TEXT, NULLABLE): Project details or requirements.
- `contact_method` (TEXT, DEFAULT `'Phone Call'`).
- `consent` (INTEGER, NOT NULL): 1 if consent was verified.
- `status` (TEXT, NOT NULL, DEFAULT `'New'`): `'New'`, `'Contacted'`, `'Qualified'`, `'In Progress'`, `'Converted'`, `'Closed'`.
- `source` (TEXT, NOT NULL, DEFAULT `'Website'`): Traffic or marketing channel.
- `ip_hash` (TEXT, NULLABLE): Cryptographic SHA-256 hash of IP (no raw IP stored).
- `visitor_uuid` (TEXT, NULLABLE): Links to visitor analytics record.
- `session_uuid` (TEXT, NULLABLE): Links to session attribution record.
- `landing_page` (TEXT, NULLABLE): Entry URL for the session.
- `medium` (TEXT, NULLABLE): Marketing medium.
- `campaign` (TEXT, NULLABLE): Marketing campaign.
- `notes` (TEXT, NULLABLE): Internal CRM staff notes.
- `created_at` (TEXT, NOT NULL, DEFAULT `(datetime('now'))`).
- `updated_at` (TEXT, NOT NULL, DEFAULT `(datetime('now'))`).

### 5. `rate_limits`
Sliding window counters for API abuse prevention.
- `bucket` (TEXT, NOT NULL): Key such as `lead:<ip_hash>` or `track:<ip_hash>`.
- `window_start` (INTEGER, NOT NULL): Epoch seconds timestamp.
- `count` (INTEGER, NOT NULL): Request count within current window.

### 6. `admins`
Secure administrative users for `/admin/`.
- `id` (INTEGER, PK, AUTOINCREMENT).
- `username` (TEXT, NOT NULL, UNIQUE).
- `password_hash` (TEXT, NOT NULL): PBKDF2 with SHA-512 (100,000 iterations).
- `salt` (TEXT, NOT NULL): 16-byte random hex salt.
- `created_at` (TEXT, NOT NULL).
- `last_login` (TEXT, NULLABLE).

---

## Database Indexes

```sql
CREATE INDEX idx_leads_created_at  ON leads(created_at);
CREATE INDEX idx_leads_status      ON leads(status);
CREATE INDEX idx_leads_lead_id     ON leads(lead_id);
CREATE INDEX idx_leads_visitor     ON leads(visitor_uuid);
CREATE INDEX idx_leads_source      ON leads(source);

CREATE INDEX idx_visitors_uuid     ON visitors(visitor_uuid);
CREATE INDEX idx_visitors_last     ON visitors(last_seen);

CREATE INDEX idx_sessions_uuid     ON sessions(session_uuid);
CREATE INDEX idx_sessions_visitor  ON sessions(visitor_uuid);
CREATE INDEX idx_sessions_started  ON sessions(started_at);

CREATE INDEX idx_views_visitor     ON page_views(visitor_uuid);
CREATE INDEX idx_views_session     ON page_views(session_uuid);
CREATE INDEX idx_views_timestamp   ON page_views(timestamp);
CREATE INDEX idx_views_path        ON page_views(page_path);
```

---

## Migration Path to PostgreSQL

If hosting on a platform without persistent disk volumes (e.g. AWS Lambda, basic Heroku, Vercel Serverless), migrate from SQLite to PostgreSQL as follows:

1. Create equivalent tables in PostgreSQL using `SERIAL` or `BIGSERIAL` for auto-incrementing primary keys and `TIMESTAMPTZ` for timestamps.
2. In `db.js`, replace `DatabaseSync` queries with `pg` (`node-postgres`) pool connections using parameterized queries (`$1, $2, ...`).
3. Set the `DATABASE_URL=postgres://user:pass@host:5432/dbname` environment variable.
4. Run standard export/import via CSV (`getLeadsForExport()`) or SQL dump.
