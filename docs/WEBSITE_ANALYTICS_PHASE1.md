# Website Analytics Phase 1

This branch adds a consent-gated event analytics collector and Website Analytics admin page to the existing Karma Fire Protection website and Supabase Operations Console.

## Events recorded after opt-in
Page views, page-exit active-time, button/link clicks, scroll thresholds (25/50/75/90%), form-start and form-submit (form ID/name only), tel/mail/WhatsApp click actions, and generic JS error events. Visitor/session identifiers are random pseudonymous IDs. Referrer records are reduced to origin + path (query removed). Common email and phone patterns in event labels are masked. No form field values, keystrokes, password inputs, or pointer coordinates are collected.

## Admin dashboard
Use the Website Analytics link in Operations Console, or open backend/telegram-leads/admin-v2/website-analytics.html after signing in. It checks the current role via resolve_current_role and queries analytics_events under RLS. It summarizes the last 30 days, capped at 10,000 rows.

## Setup
1. Apply supabase/migrations/20261127120000_website_analytics_events.sql.
2. Verify the daily pg_cron retention schedule exists. If pg_cron is unavailable, schedule public.purge_expired_website_analytics() daily in Supabase.
3. Deploy the branch. In a fresh profile, accept analytics and browse/click/scroll/submit a test enquiry. Check the admin dashboard. Repeat using Essential Only and verify that analytics events are not written.

## Limits
This is event-based analytics, not click-coordinate heatmaps or session replay. Website Manager remains the current structured-content editor; a visual page-section CMS with drafts, preview, publishing, and version rollback is not part of this analytics phase. Existing operational staff roles are not removed in this phase; the top-level admin roles remain Super Admin/Admin while legacy staff operational permissions remain until a separate migration is planned and tested.
