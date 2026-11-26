# Karma Fire Protection Admin v2 upgrade bundle

## What this package contains
- `index.html`: redesigned operations admin workspace.
- `super-admin.html`: separate restricted Super Admin control plane.
- `assets/admin.css`: responsive visual system.
- `js/admin.js`: Supabase auth, existing enquiry workflow, CSV export, existing website content CRUD, phased module navigation.
- `js/super-admin.js`: Super Admin role gate, system counts, administrator directory and protected admin invitations.

## Install locally first
1. Keep the current `backend/telegram-leads/admin/` directory unchanged.
2. Open the new admin at `backend/telegram-leads/admin-v2/index.html`.
3. The existing `js/supabase-config.js` is loaded from `../../../js/supabase-config.js`.
4. Serve the repository using a local static server (not `file://`) and test login, enquiry updates, CSV export, website content CRUD, admin invitation and role denial.
5. Only after local testing, decide whether to replace the old admin entry point.

## Important scope and safety notes
- No Supabase database changes are included.
- No service-role or secret key is used in browser code.
- The normal Admin page checks `admin_users` and exposes the Super Admin link only to `super_admin`.
- The Super Admin page independently verifies `admin_users.role === 'super_admin'`; a hidden link is not treated as authorization.
- The invite workflow calls the existing `invite-crm-admin` Edge Function. It only invites standard Admin accounts.
- New operations modules are explicitly marked as not activated because the live schema currently lacks their tables. They do not fabricate records or write to localStorage.
- This bundle does not implement full departmental RBAC, MFA enforcement, audit logging, quotations, projects, AMC, inventory or compliance workflows. Those require the approved additive Supabase migrations and server-side policies.

## Recommended next database phase
Reconcile repository migrations against the live Supabase schema. Then implement the identity/departments/permissions migration, test it against a disposable environment, and only then activate departmental module access.
