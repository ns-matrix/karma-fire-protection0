# Karma Fire Protection — unified role-based admin

## Entry point

Use one shared portal:

`backend/telegram-leads/admin-v2/index.html`

The legacy `super-admin.html` URL redirects to the same portal. After Supabase Authentication, the application calls the role resolver and builds the dashboard/navigation for that role. It does not use separate login forms or separate dashboards.

## Roles and visibility

- `super_admin`: one shared dashboard with system-control analytics, standard-admin directory, employee directory and security audit trail.
- `admin`: operational modules plus standard-admin and employee management. Admin invitations always create the standard `admin` role.
- Departmental roles: module access is derived from `user_roles`, `role_permissions`, `app_roles` and `app_permissions`; own/assigned/department/all scopes are enforced by RLS.
- Super Admin identities are excluded from `admin_directory`, employee profiles and user-role listings. The role resolver returns only a role code. A private SECURITY DEFINER predicate protects Super Admin identity checks from caller-side RLS filtering, including employee profiles matched by either Auth UUID or email. The UI never displays the Super Admin email or personal profile.
- No browser cookies, passwords, access tokens or session secrets are read into audit records.

## Provisioned database areas

The additive migrations provision:
- Identity, departments, employee profiles, role catalogue, permissions and user-role assignments.
- Customers, sites and customer contacts.
- Survey templates, site surveys and checklist responses.
- Quotations, BOQ line items and approval records.
- Projects, milestones and project tasks.
- AMC contracts, service visits and defects.
- Equipment/assets.
- Suppliers, warehouses, inventory items, purchase orders, purchase-order items and stock movements.
- Compliance documents, tasks, task comments, record attachments and audit events.

All 41 public tables currently have RLS enabled. The migration also creates an inventory balance view, an append-only stock ledger, quotation line-total calculations and guards that prevent changes to issued quotation snapshots.

## Secure server functions

- `invite-crm-admin`: Admin or Super Admin may invite a standard Admin; it never promotes an account to Super Admin.
- `invite-crm-employee`: Admin or Super Admin may invite an employee with a selected department and standard employee role.
- `admin-audit-event`: records sign-in/sign-out and selected security actions using request metadata.

Database triggers record authenticated operational changes. Audit records include actor ID, action, module, timestamp and (when supplied by the trusted request gateway) IP address and user-agent/device category. The audit UI is Super Admin-only. Retention metadata defaults to 90 days; an automated purge schedule still needs to be configured.

## Rollout status

| Phase | Module | Database / RLS |
|---|---|---|
| 1 | Identity, departments, RBAC and audit | Provisioned |
| 2 | Customers & Sites | Provisioned |
| 3 | Surveys & Audits | Provisioned |
| 4 | Quotations & BOQ | Provisioned |
| 5 | Projects | Provisioned |
| 5 | Tasks & Calendar | Provisioned |
| 6 | Service & AMC | Provisioned |
| 7 | Equipment & Assets | Provisioned |
| 7 | Inventory & Procurement | Provisioned |
| 8 | Compliance & Documents | Provisioned |

The shared UI includes generic list/create/edit workflows for the main records and supporting sub-records. The database foundation is live, but this is not a claim that every business workflow has passed end-to-end acceptance testing. Still-required acceptance work includes private document upload/download policies, quotation PDF generation and customer acceptance, automatic project creation from accepted quotations, AMC visit schedule generation, notification/reminder scheduling, and full mobile field-work testing.

## Deployment and testing

1. Serve the repository over HTTP (not `file://`).
2. Verify `js/supabase-config.js` contains only the project URL and publishable key.
3. Sign in with an existing authorized account.
4. Test customer/site creation, survey records, quotation/BOQ calculation, project milestones, AMC/service records, asset records, stock receipt/issue, compliance metadata and tasks.
5. Verify normal Admin cannot read Super Admin identity rows or audit events.
6. Verify staff accounts can access only their assigned/department-scoped records.
7. Never put the Supabase service-role/secret key in browser code, GitHub source, GitHub Actions artifacts or documentation. Keep function secrets in Supabase Edge Function secrets.

## Known configuration warning

Supabase Security Advisor still reports **Leaked Password Protection Disabled**. Enable it in Supabase Dashboard → Authentication → Security and Protection. This is an Auth project setting and is not changed by the SQL migrations.
