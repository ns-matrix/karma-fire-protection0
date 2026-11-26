# Karma Fire Protection LLP — GitHub Pages + Supabase CRM

A static website and browser-based CRM. **The website and admin UI are hosted by GitHub Pages. There is no Node.js runtime or Express API in the deployment path.** Supabase provides shared PostgreSQL storage and secure email/password authentication.

## Public site
- GitHub Pages: https://ns-matrix.github.io/karma-fire-protection0/
- Admin: https://ns-matrix.github.io/karma-fire-protection0/backend/telegram-leads/admin/

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
   insert into public.admin_users(user_id,email)
   values ('YOUR-AUTH-USER-UUID','admin@your-company.com');
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
- Visitor analytics are not yet connected to the admin reporting dashboard in this release; dashboard reports are based on actual enquiries in the database.
- The Node.js backend, package manifests, Docker files, and custom-domain CNAME have been removed from this branch. The static GitHub Pages application has no Node runtime dependency.


## Role-based CRM and website content manager

The CRM has two database-enforced roles:

- **Super Admin** — can manage all CRM/content features and invite additional Admin accounts.
- **Admin** — can manage enquiries, social links, team members, product catalogue, and service catalogue, but cannot grant administrator access.

The initial verified account `ns077751@gmail.com` is provisioned as `super_admin`. The super-admin controls are intentionally not advertised in the public site navigation; actual authorization is enforced by Supabase RLS and the `invite-crm-admin` Edge Function.

The content manager writes to `team_members`, `products`, `services`, and `social_links`. Uploaded images are stored in the public `site-media` Storage bucket with admin-only upload/update/delete permissions. The home page renders published team, service, and product records from Supabase. Social links are loaded from Supabase on public pages.

Visitor-event analytics are collected only after the visitor explicitly accepts analytics consent. Extended traffic-source/page/session metrics are visible only to the super admin. The existing lead reports remain visible to both roles.

Edge Function source: `supabase/functions/invite-crm-admin/index.ts`.
