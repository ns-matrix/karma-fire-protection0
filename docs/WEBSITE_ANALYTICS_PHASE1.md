# Website Analytics Phase 1

This branch adds a consent-gated event analytics collector and Website Analytics admin page to the existing Karma Fire Protection website and Supabase Operations Console.

Tracked after opt-in: page views; page-exit active time; button/link clicks; scroll threshold crossings (25/50/75/90); form-start and submit events (form ID/name only); tel/mail/WhatsApp clicks; generic JavaScript error events. Random pseudonymous visitor/session IDs are used. Referrer values are reduced to origin and path, without query strings. Event labels mask common email and phone patterns. Form field values, keystrokes, password inputs and pointer coordinates are not collected.

## Admin dashboard
Use Website Analytics in Operations Console or open backend/telegram-leads/admin-v2/website-analytics.html after signing in. It verifies admin/super_admin through resolve_current_role and relies on analytics_events RLS. It summarizes 30 days (up to 10,000 rows).

## Setup
1. Apply supabase/migrations/20261127120000_website_analytics_events.sql.
2. Verify the daily pg_cron job. If unavailable, schedule public.purge_expired_website_analytics() daily.
3. Deploy. Test in a clean profile: accept analytics, browse, click, scroll, submit a test enquiry, then check the admin page. Repeat with Essential Only and verify analytics_events is not populated.

## Limits
This is event analytics, not click-position heatmaps/session replay. Website Manager remains the existing structured-content editor; visual section editing, draft preview, publishing and version rollback are not part of this phase. Existing operational staff roles remain; this phase does not migrate them out.
