# Karma Fire Protection LLP — GitHub Pages + Supabase CRM

A static website and browser-based CRM. **The website and admin UI are hosted by GitHub Pages. There is no Node.js runtime or Express API in the deployment path.** Supabase provides shared PostgreSQL storage and secure email/password authentication.

## Application URLs (GitHub Pages)

- **Public website:** https://ns-matrix.github.io/karma-fire-protection0/
- **Admin panel login:** https://ns-matrix.github.io/karma-fire-protection0/backend/telegram-leads/admin-v2/index.html
- **GitHub repository:** https://github.com/ns-matrix/karma-fire-protection0
- **Admin panel source:** https://github.com/ns-matrix/karma-fire-protection0/tree/main/backend/telegram-leads/admin-v2

Both application URLs use the GitHub Pages host. The admin panel has one shared sign-in screen; the authenticated role determines which dashboard and modules are shown.

## Architecture
- HTML/CSS/vanilla JavaScript: public website and admin UI.
- Supabase Auth: admin sign-in.
- Supabase Postgres: enquiries and page-view events.
- Row Level Security (RLS): public visitors can only INSERT enquiries; only allow-listed admin users can read/update/delete CRM data.
- Browser uses only the Supabase publishable/anon key. Never expose a service-role key.

## One-time Supabase setup
1. Create a Supabase project.
2. Open SQL Editor and run all of `supabase/schema.sql`.
3. In Authentication → Users, create the admin user with a strong password.
4. Copy that user's UUID and email. Run:
   ```sql
   insert into public.admin_users(user_id,email,role,display_name)
   values ('YOUR-AUTH-USER-UUID','OWNER-EMAIL','super_admin',null);
   ```
5. Open Project Settings → API. Copy Project URL and the publishable key (or legacy anon key).
6. Edit `js/supabase-config.js`:
   ```js
   window.KARMA_SUPABASE = {
     url: "https://YOUR_PROJECT_REF.supabase.co",
     anonKey: "YOUR_PUBLISHABLE_OR_ANON_KEY"
   };
   ```
7. Commit the config file. The publishable/anon key is designed for browser use; RLS is the security boundary. **Never use service_role/secret keys in this repository.**
8. In Supabase Authentication → URL Configuration, set Site URL to the GitHub Pages URL and add it to Redirect URLs:
   `https://ns-matrix.github.io/karma-fire-protection0/**`

## CRM capabilities
- Admin email/password authentication and database allow-list check.
- Dashboard totals: all, new, current month, converted.
- Enquiry search, status and date filters.
- Enquiry details, status changes, assignment and internal notes.
- Delete enquiry with confirmation.
- CSV export of the current filtered result set.
- Reports grouped by lead status and requested service.

## Deployment
GitHub Pages publishes the static files from the configured branch/folder. No build command, npm install, Node server, or environment secrets are required. After changing the Supabase config, allow Pages to finish publishing and hard-refresh the site.

## Important limits and operational notes
- Supabase setup is separate from GitHub Pages. Until the project URL/key and SQL schema are configured, enquiry submission and admin sign-in remain intentionally disabled with a clear setup message.
- Anonymous public inserts are protected by RLS validation but public browser forms cannot provide the same abuse resistance as a server-side CAPTCHA/rate-limiter. Configure Supabase Auth/abuse controls and add CAPTCHA/Edge Function validation before high-volume production use.
- Website Analytics and Visitor Audit are separate authenticated admin screens backed by Supabase analytics events, consent records, audit insights and role-gated RPCs. The public collector records only consented event metadata, not form values or keystrokes.
- The CMS editor saves drafts, previews content, publishes versioned sections and restores a prior version to draft. It adds CMS-managed sections to existing pages; it does not rewrite the original page markup or form handlers.
- Legacy server-runner instructions are not part of the active application. The deployed app is static HTML/CSS/JavaScript with Supabase as its backend; no Node.js server or SQLite runtime is required.


## Unified role-based admin portal

The admin experience uses one shared sign-in and dashboard:
- **Super Admin:** system oversight, full operational visibility, standard-admin/employee directories and security audit history.
- **Admin:** operational management, standard-admin invitations and employee management. Super Admin identity/profile rows and audit history are not available to Admin accounts.
- **Departmental roles:** assigned/department-scoped access is enforced by PostgreSQL RLS, not just hidden navigation.

Super Admin identity data is deliberately excluded from the admin directory, employee profiles and role listings. The identity resolver returns only the caller's role code. Normal Admins cannot edit the role catalogue, permission grants, or assign privileged roles.

The single portal login is:
`https://ns-matrix.github.io/karma-fire-protection0/backend/telegram-leads/admin-v2/index.html`
The previous `/backend/telegram-leads/admin/` URL redirects to it.

The operational schema includes Customers & Sites, Surveys & Audits, Quotations & BOQ, Projects, Service & AMC, Equipment & Assets, Inventory & Procurement, Compliance, and Tasks & Calendar. At the latest live schema check (2026-11-28), all 50 public tables had RLS enabled.

**Credential handling:** the browser config contains only the Supabase URL and publishable/anon key (which is designed to be public). Supabase service-role/secret keys remain in Supabase Edge Function secrets and must never be committed to GitHub or embedded in browser code. Environment files are excluded by `.gitignore`.

## Deployment and security checks

GitHub Pages hosts the static HTML/CSS/JavaScript. Supabase provides authentication, PostgreSQL, RLS and Edge Functions. The `invite-crm-admin` and `invite-crm-employee` functions validate the caller on the server; employee invitations accept only approved operational roles.

Full workflow acceptance remains ongoing for private document storage, quotation PDFs/customer acceptance, automated project/AMC scheduling, reminders and mobile field-work. The UI and schema contracts are being checked against the live Supabase project; browser-based end-to-end acceptance still requires a real admin test session.
