# Role-aware dashboard acceptance checklist

## Automated checks
- Run `node --experimental-default-type=module --test backend/telegram-leads/admin-v2/tests/dashboard-rules.test.mjs`.
- Run `node --check` on `dashboard-rules.js`, `role-dashboard.js`, and `admin.js`.
- The GitHub Actions workflow runs these checks for dashboard changes.

## Super Admin
- Sign in using the existing Super Admin account.
- Confirm system-wide operational metrics load from Supabase.
- Confirm the System Control section and security audit feed are visible.
- Confirm the audit feed is not rendered for a standard Admin or Team Member.
- Confirm the privileged account's email/profile identity is not displayed in the Team/Admin directory.

## Admin
- Sign in using a standard Admin account.
- Confirm operational metrics, team directory and permitted team-management actions are available.
- Confirm the System Control navigation item and audit feed are absent.
- Confirm the standard Admin directory never includes Super Admin identities.
- Attempt direct reads of Super Admin identity/audit records; the database must deny or return no restricted rows.

## Team Member
- Sign in using a department role with assigned/department-scoped permissions.
- Confirm only metrics and shortcuts for modules with read permission appear.
- Confirm task, survey, project and service records are limited by the existing Supabase RLS scope.
- Confirm no team administration, global settings, system control or audit interface is available.
- Confirm write-only grants do not expose read dashboards.

## Responsive checks
- Desktop: persistent left navigation, 3-column KPI grid, 2-column work panels.
- Tablet: KPI grid collapses to 2 columns; quick actions remain readable.
- Mobile: drawer navigation opens/closes, backdrop blocks the page, cards become single-column where needed, and tables retain horizontal scrolling.

## Production acceptance limitation
The automated tests validate role mapping and dashboard visibility rules. A full authenticated end-to-end acceptance run still requires test credentials for one Super Admin, one Admin and one Team Member account, plus a deployed preview URL. Do not merge to the production branch until those three account flows and direct RLS access attempts have been verified.
