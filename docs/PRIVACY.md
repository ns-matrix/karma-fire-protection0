# Privacy, Data Retention & Consent Architecture

This document describes the privacy-preserving mechanisms, consent models, data retention sweeps, and security precautions implemented across the Karma Fire Protection platform.

---

## 1. Principles of Data Collection

1. **First-Party Anonymous Tracking:** No third-party ad networks, trackers, or pixel brokers are injected into the client experience.
2. **Zero Invasive Fingerprinting:** We do not compute canvas hashes, audio context fingerprints, WebGL identifiers, or font enumerations.
3. **No Raw IP Storage:** Incoming IP addresses are hashed using SHA-256 with a truncated 32-character digest for sliding window abuse prevention. Raw IP addresses are discarded after each HTTP request lifecycle.
4. **Consent-Aware Operation:** When a visitor clicks "Essential Only" on the consent banner, non-essential tracking is turned off.

---

## 2. Data Types & Storage Breakdown

| Data Type | Table | Retention Period | Description |
| :--- | :--- | :--- | :--- |
| **Visitor UUID** | `visitors` | 90 days (inactive) | Random anonymous v4 UUID stored in browser storage. |
| **Session Journey** | `sessions` | 90 days | Session duration, landing page, referrer, and UTM campaign. |
| **Page Views** | `page_views` | 90 days | Visited URL path, title, and timestamp. Deduplicated within 2s. |
| **Leads & Enquiries**| `leads` | Permanent (Archive) | Customer name, phone, email, service, location, and message. |
| **Rate Limit Counters**| `rate_limits` | 24 hours | Sliding window request counts for spam protection. |

---

## 3. Data Retention & Automatic Cleanup

To comply with privacy best practices and prevent database bloat, the backend includes a database retention method:

```javascript
db.cleanOldAnalytics(retentionDays = 90);
```

- Deletes page view records older than 90 days.
- Deletes session records with last activity older than 90 days.
- Cleans rate-limiting buckets older than 24 hours.

This cleanup can be triggered:
1. Via Admin Dashboard (`Settings > Purge Analytics Older Than 90 Days`).
2. Programmatically via `POST /api/admin/settings/cleanup`.
3. Through a scheduled cron job or system timer.

---

## 4. User Rights & Data Deletion

Under standard privacy practices, visitors and clients have the right to request:
- Access to all recorded enquiry records associated with their email or phone.
- Complete deletion of their lead entries from SQLite storage.

Requests can be submitted directly to `karmafireprotectionllp@gmail.com` or via phone at `+91 95949 67751`. Administrators can update status to `Closed` or delete records using standard database queries.
