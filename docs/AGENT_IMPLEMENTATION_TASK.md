# Agent Task: Repair and Finish Karma Fire Protection Website + CSV CRM

Repository: https://github.com/ns-matrix/karma-fire-protection0
Branch: main

## Objective
Audit and repair the EXISTING project. Do not create a second/parallel website or duplicate CRM. Preserve current website pages, branding, SEO, existing useful integrations, and functionality. Implement only necessary corrections. Keep data submission persistent in CSV files and provide a secure, unlinked admin login/dashboard.

## Existing components already in the repository (inspect them before writing)
- Public website pages: index.html, about.html, services.html, projects.html, contact.html, privacy-policy.html
- Frontend scripts: js/forms.js, js/validation.js, js/analytics.js, js/main.js, js/navigation.js, js/social-links.js
- Backend: backend/telegram-leads/server.js
- CSV storage: backend/telegram-leads/csv-store.js
- Authentication: backend/telegram-leads/auth.js
- Admin UI: backend/telegram-leads/admin/index.html
- Email + Telegram notifications: backend/telegram-leads/email.js and telegram.js
- Docs: docs/ and project config files
- Node/Express API and CSV storage already exist. Admin is currently served by the backend at /admin.

## Working rules
1. Inspect the complete repo and its scripts/dependencies first; inspect relevant server, CSV, auth, dashboard, form, validation, deployment and documentation files.
2. Do not blindly delete features, assets, files, or dependencies. Make an evidence-based KEEP / FIX / REMOVE list and record it in docs/PROJECT_AUDIT.md.
3. Work in the current repo. No unrelated redesigns, no duplicate endpoints, no mock data, no demo-only buttons.
4. Do not push/deploy from local tooling if a deployment action is available; code changes on this repo are requested, but explain exactly what is committed and do not deploy.
5. Never store or commit secrets, real passwords, tokens, session secrets, lead/customer CSVs, admin credential JSON, backups, or local environment files.
6. Do not use GitHub Pages as the API or CSV data host. CSV persistence requires a running backend with persistent disk/volume.
7. Test locally if the environment is available. If tests cannot be run, state precisely what remains unverified.

## Admin URL and security
- Admin interface lives at backend/telegram-leads/admin/index.html and the Express server mounts it at /admin.
- When the backend is running, the admin entry is: http://localhost:PORT/admin (or deployed backend host + /admin).
- Admin must not be linked in public navigation or sitemap. Do not mistake obscurity for authentication.
- Admin APIs must be authenticated on server side. Direct requests to admin API endpoints without a valid session must return 401.
- Do not put credentials in admin HTML, JS, README, public environment examples, or Git.
- Remove/disable unsafe default credentials from production configuration. Require explicit initial credentials via environment/config setup, or use a safe first-run bootstrap that is accessible only locally and forces password change. Never expose a plaintext default password in public repo.
- Use a strong password hash, secure session signing secret, HttpOnly cookie, SameSite protection, Secure cookies in production, expiry, login rate limiting, CSRF protection for cookie-authenticated state changes, and logout/session invalidation. Validate origin/host carefully. Avoid leaking auth tokens in JSON or logs if cookie auth is sufficient.
- Admin change-password must be authenticated and validate current password/new password. Never display passwords after setup.

## Lead form and data capture
- Ensure public contact/quote forms submit to POST /api/leads, actually save to CSV, and only show success when the backend confirms saved.
- Preserve the fields used by the actual website forms; validate and normalize server-side. Fields should include name, phone, email, optional company, requested service, message, source and marketing attribution fields where the website already provides them.
- Provide clear submission/error/loading feedback, prevent duplicate submission, enforce server-side rate limiting, honeypot spam filtering, and avoid storing raw IP addresses (hashed or omit).
- Confirm form fetch URL works in same-origin production and local development; configure CORS allow-list only when cross-origin is genuinely required.
- Never allow submitted user data to inject HTML into admin views.
- Ensure CSV export mitigates spreadsheet formula injection (values beginning with =, +, -, @, tab, CR, etc. must be safely neutralized for spreadsheet exports).

## CSV storage correctness (critical)
- Primary persistent records are CSV under backend data directory (default backend/telegram-leads/data or configured CSV_DATA_DIR).
- Keep data files outside public static roots and protect from HTTP serving.
- CSV parser must correctly handle RFC4180 quoted commas, quotes, CRLF and multiline cells; don't parse CSV using naive split('
') if quoted fields may contain newline.
- Writes must be serialized without busy-wait loops. Avoid blocking spin-locks; use an async queue or reliable locking pattern.
- Generate lead IDs without collisions even when records are deleted or requests arrive concurrently. Do not use current row-count as the sole sequence source. Use a collision-resistant ID or persisted counter.
- Atomic writes and backup before risky bulk mutations. Preserve timestamps and IDs on edits.
- CSV header/schema validation, UTF-8, escaping, consistent column order and recovery/error behavior.
- Ensure app initializes missing CSV files on startup; confirm restart persistence.
- Activity log entries for create/update/delete/status/notes/export/settings changes where feasible, but never log secrets.

## Admin dashboard functionality
Reuse and repair existing dashboard; do not add a second dashboard.
- Secure login with configured admin User ID + password; no public registration.
- Stats are derived from actual CSV data, not hardcoded demo data.
- Search by name/phone/email/company/ID; filters by status and service; pagination; newest-first default.
- View detail; edit customer contact fields; update status and priority; add private admin notes; delete with confirm; export CSV; download backups.
- Status options should match server validation and UI. Keep consistency across front and back end.
- Make all controls functional and error states visible.
- Responsive layout and accessibility for desktop/mobile.
- Avoid HTML injection; render data safely using textContent or safe templates.
- Ensure dashboard shows clear logged-in admin identity and logout.
- If admin page is loaded directly from GitHub Pages (static host), it must not falsely suggest the backend/auth/data functions work; show backend-unavailable status and link to deployment docs.

## Google Sheets settings
- Existing backend settings support Google Sheets URL/webhook; inspect how dashboard saves/loads these settings.
- Add/edit a Google Sheets URL in the admin settings area and persist it server-side.
- Provide Open Sheet action only when the URL is valid.
- Clearly distinguish a saved sheet URL from automated synchronization. Do not claim auto-sync unless configured and tested.
- If a webhook/Apps Script sync is present, validate the URL and request payload, set timeout, log non-sensitive failures, and ensure lead CSV save succeeds even if sheet sync fails.

## Scope reduction
- Keep the essentials: public website, form, lead API, CSV storage, authenticated admin, activity audit, export/backups, optional Sheets link/sync, and currently configured notification integrations if valid and useful.
- Remove duplicate/abandoned code only after checking references. Update package scripts/dependencies only if actually needed.
- Do not leave outdated documentation claiming SQLite when the active implementation is CSV. Align README, env example, setup/admin/deployment docs and health endpoint with actual behavior.

## Validation checklist (must actually execute and report)
1. npm install (in backend/telegram-leads) if appropriate; do not alter lockfile without reason.
2. Run npm test and fix failing tests.
3. Run server and check /api/health.
4. Submit a valid lead via POST /api/leads and verify it appears in CSV.
5. Test CSV with commas, quote characters, Unicode and multiline message.
6. Restart server and confirm record persists.
7. Confirm unauthenticated /api/admin/* calls return 401.
8. Login with configured admin and verify admin page loads authenticated data.
9. Test search, filter, pagination, edits, status, notes, delete, export and backup.
10. Verify admin settings Google Sheets URL is saved and survives restart.
11. Verify no CSV/customer data, .env, tokens or credential files are tracked by Git.
12. Check public forms/pages for broken API URLs and console errors.
13. If you cannot run any step, mark it NOT TESTED; don't fabricate results.

## Final report
Provide concise, evidence-based:
- Repo audit findings and files changed
- Unnecessary files removed (with rationale) and retained functionality
- Current admin route and backend host needed
- CSV file location, schema and persistence/backup behavior
- Admin credential initialization (instructions, never disclose credentials)
- Google Sheets link/sync status
- Tests run with pass/fail details
- Remaining risks and exact deployment steps

Make the actual fixes in this repository. Do not stop at writing an implementation plan.
