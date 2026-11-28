# Karma Fire Protection LLP — ZIP Reference Website & Admin Portal

The active website and admin portal have been rebuilt from the supplied ZIP design references. The public and admin layouts use the desktop design as the responsive base and the supplied mobile layouts as the mobile navigation and compact-layout reference. Existing media files under `assets/` are reused locally.

## Application URLs

- **Public website:** https://ns-matrix.github.io/karma-fire-protection0/
- **Admin panel login:** https://ns-matrix.github.io/karma-fire-protection0/backend/telegram-leads/admin-v2/index.html
- **GitHub repository:** https://github.com/ns-matrix/karma-fire-protection0
- **Admin source:** https://github.com/ns-matrix/karma-fire-protection0/tree/main/backend/telegram-leads/admin-v2

The links above use GitHub Pages and GitHub. The admin panel uses Supabase email/password authentication; there are no demo login credentials in the source.

## Current application structure

- `index.html` — public multi-page website shell (Home, About, Services, Projects, Contact and Privacy).
- `css/zip-website.css` — mobile and local layout refinements.
- `js/zip-public-app.js` — public Supabase content loader, enquiry submission, review submission, site settings, map and published CMS loader.
- `backend/telegram-leads/admin-v2/index.html` — ZIP Website Admin Portal.
- `backend/telegram-leads/admin-v2/assets/zip-portal.css` — responsive admin styling and mobile navigation.
- `backend/telegram-leads/admin-v2/js/zip-admin.js` — Supabase authentication, role-aware navigation, website content CRUD, request management, CMS versioning, analytics and settings.
- `assets/images/` and `assets/logos/` — existing local media assets reused by the new layouts.
- `design-reference-extracted/` — extracted source layouts and design-system reference from the supplied ZIP.

Legacy public URLs (`about.html`, `services.html`, `projects.html`, `contact.html`, `privacy-policy.html`) now route into the public app. Legacy admin sub-pages route into the new unified admin portal.

## Admin roles

- **Super Admin / Admin:** requests, reviews, services, products, projects, team, CMS, analytics and website settings.
- **Website Editor:** website content, reviews, CMS and website settings. CRM requests and visitor analytics remain unavailable to this role.
- Database RLS enforces the same split. Hiding a tab in the browser is not the security boundary.

Sign in with an existing authorised Supabase Auth account. The role is resolved from the database; an ordinary Auth account without an allowed admin role cannot enter the portal.

## Website ↔ Supabase data flow

| Website/admin feature | Supabase source |
|---|---|
| Public enquiry form → Admin Requests | `public.leads` |
| Services | `public.services` |
| Product catalogue | `public.products` |
| Team profiles | `public.team_members` |
| Projects | `public.public_portfolio_projects` |
| Public reviews and moderation | `public.public_testimonials` |
| Phone, email, address, map and opening hours | `public.website_site_settings` |
| WhatsApp, phone and email links | `public.social_links` |
| Page drafts, publishing and version restore | `website_cms_drafts`, `website_cms_published`, `website_cms_versions` |
| Consent-gated visitor events and audit insights | `analytics_events`, `website_consent_records`, `website_audit_insights` |

The public enquiry form inserts directly into `public.leads` with consent and validation. The public review form inserts a pending, unpublished review. Only approved and active reviews are rendered on the website. Analytics stores event metadata only; it does not record form field values or keystrokes.

## Supabase demo content

The current Supabase project now contains editable website content:

- 5 active service records using the existing local media.
- 3 active demo product records, visibly labelled as demo on the public website.
- 3 active demo team profiles, visibly labelled as demo on the public website.
- 2 active demo project records, visibly labelled as demo on the public website.
- 2 active demo review records, visibly labelled as demo; replace them with genuine customer-approved feedback before removing the demo flag.
- 3 active contact links (WhatsApp, phone and email).
- 1 website settings record with the existing Vikhroli West address and map.
- 6 editable CMS drafts (Home, About, Services, Projects, Contact and Privacy).

Demo rows are marked with `is_demo = true` where supported. Demo records are active to populate the new design and are clearly labelled as demo on the public website. The admin editor lets you edit, deactivate or convert each record. Replace sample names, specifications, client details and testimonials with verified information, then clear the demo flag before presenting the content as genuine. Replace sample names, specifications, client details and testimonials with verified information, then clear the demo flag before presenting the content as genuine. The five active service descriptions are general service descriptions, not product certification claims.

The website settings use the existing location data:
- **Address:** Police Station, 04, near Surya Nagar, Suryanagar No. 2, Surya Nagar, HMPL Surya Nagar, Vikhroli West, Mumbai, Maharashtra 400083.
- **Map coordinates:** 19.119105, 72.922702.
- **Phone:** +91 95949 67751.
- **Email:** karmafireprotectionllp@gmail.com.

## Data preservation and cleanup

The rebuild removed only the two identified placeholder rows from the old website catalogue/review tables. Existing enquiries, visitor analytics, audit history and authorised Supabase Auth/admin accounts were retained. Do not use a broad table truncate or reset against the live project.

## Supabase configuration and migration

The browser uses only the Supabase publishable key in `js/supabase-config.js`. Never put a service-role or secret key in this repository.

The rebuild migration is:

`supabase/migrations/20261128120000_zip_website_admin_portal.sql`

It adds the website settings table, content-management permissions, review moderation fields and demo website content. The migration SQL has been applied directly to the connected Supabase project and the live role/RLS behaviour was checked; this new migration has not yet been registered in the remote migration history. Its seed inserts use conflict-do-nothing semantics so a future re-run will not overwrite admin-edited content. The repository and remote migration history had a pre-existing timestamp/name mismatch, so reconcile `supabase migration list` and mark/reconcile the applied version before running `supabase db push`. Do not blindly replay the entire historical migration set against the existing production project.

For a new development project, configure the project URL and publishable key in `js/supabase-config.js`, apply the schema/migrations in order, and set the Supabase Auth Site URL and Redirect URLs to:

`https://ns-matrix.github.io/karma-fire-protection0/**`

## Verification

The rebuild includes static contract tests for:

- ZIP desktop/mobile public and admin entry points.
- Local media references and removal of the embedded fake website/admin datasets.
- Supabase authentication, role resolution, website CRUD, CMS publishing/version restore and public form wiring.
- Public map/contact settings and GitHub Pages URLs.
- Demo seed content, RLS boundaries and preservation of operational data.

A real password login and browser-based end-to-end workflow still require an authorised account session. No passwords or service-role keys are stored in this repository.
