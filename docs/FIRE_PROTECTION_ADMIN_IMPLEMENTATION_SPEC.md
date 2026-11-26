# Karma Fire Protection — Full Admin System Implementation Specification

**Status:** Approved architecture / implementation blueprint  
**Repository:** `ns-matrix/karma-fire-protection0`  
**Current deployment model:** GitHub Pages static frontend + Supabase Auth, Postgres, Storage and Edge Functions  
**Architecture decisions:** Full fire-protection management system; departmental permissions; Operations first; Developer Super Admin hidden from ordinary navigation.

---

## 1. Product objective

Evolve the current website CRM into a Fire Protection Operations Management System (FP-OMS). It must manage the complete commercial and service lifecycle:

`Enquiry → Qualification → Site Survey → Quotation / BOQ → Project → Installation → Testing & Commissioning → Handover → AMC → Scheduled Service → Defect Rectification → Renewal`

The system must retain the existing public website and current CRM records. Build incrementally around the existing Supabase project; do not replace the database or discard current lead/content data.

### Design principles

1. **Operational source of truth:** each customer, site, asset, contract, project, visit and document has a durable database record.
2. **One-time data entry:** convert an enquiry to a customer/site/project without retyping customer details.
3. **Traceability:** important changes are timestamped and attributable to the signed-in staff member.
4. **Departmental least privilege:** staff see only the modules and records needed for their job.
5. **Mobile field workflow:** surveys and service visits must work on phones, support photo uploads and save drafts.
6. **Real analytics:** metrics are computed from persisted operational records; no demo or fabricated numbers.
7. **Safe publishing:** website content has draft/published/archived states and preview before publication.
8. **Compliance support, not legal certification:** store evidence, due dates and approvals; do not automatically assert legal compliance.

---

## 2. Current repository and backend baseline

### Existing deployment

- Static website and admin UI are hosted by GitHub Pages.
- Supabase provides Auth, PostgreSQL, Storage and Edge Functions.
- Browser code must use only the Supabase publishable key.
- Service/secret keys remain in Supabase Edge Function secrets and must never enter GitHub Pages assets.
- Current admin entry point: `backend/telegram-leads/admin/`.
- Existing public content tables: `team_members`, `products`, `services`, `social_links`, `site_settings`.
- Existing operational/analytics tables: `leads`, `visitor_events`, `admin_users`.
- Existing Storage bucket: `site-media`.
- Existing Edge Function: `invite-crm-admin`.

### Current schema facts verified during planning

- `admin_users` has `user_id`, `email`, `role`, `display_name`, `created_by`, `created_at`; roles currently include `super_admin` and `admin`.
- `leads` has the current website enquiry fields, status, source/UTM fields, assigned_to, notes, created_at and updated_at.
- `visitor_events` stores consent-based page events.
- The current database schema has been applied directly to the hosted project in earlier work. The repository has `supabase/schema.sql`, but a complete, verified `supabase/migrations/` history has not yet been established.

**Migration warning:** Do not run a fresh baseline schema against the production project. First pull and reconcile the live schema/migration history. Do not recreate existing tables or reset production data.

---

## 3. Admin application information architecture

The regular admin application must have a persistent sidebar on desktop and a compact drawer/navigation on mobile. Each main item opens a separate route or page state, not one long scrolling document.

### Regular admin navigation

1. **Dashboard**
2. **Enquiries**
3. **Customers**
4. **Sites**
5. **Site Surveys & Audits**
6. **Quotations & BOQ**
7. **Projects**
8. **Service & AMC**
9. **Equipment & Assets**
10. **Inventory & Suppliers**
11. **Compliance & Documents**
12. **Employees & Teams**
13. **Tasks & Calendar**
14. **Reports**
15. **Website Manager**
16. **Notifications**
17. **My Profile**

Each module should provide:
- list view with search, filters, sort and pagination;
- detail view with linked records and activity timeline;
- create/edit forms with validation;
- status transitions and confirmation for destructive actions;
- attachment management where applicable;
- CSV/PDF export only where appropriate;
- empty, loading, error, permission-denied and offline states.

### Dashboard layout

**KPI cards:** new enquiries, qualified enquiries, quotations awaiting response, active projects, upcoming visits, overdue visits, open defects, AMC renewals due, and receivables/revenue only when invoice/payment data exists.

**Work queue:** tasks assigned to the current user, overdue follow-ups, today's visits, expiring contracts and high-priority defects.

**Charts:** enquiry funnel, enquiries by source/service, quotation acceptance, project stage, service completion, AMC renewal, technician workload and month-wise trends.

Dashboard widgets must be permission-aware and must not reveal restricted departmental data.

---

## 4. Departmental roles and permissions

Use database-backed permissions. Do not rely on hiding buttons in JavaScript as authorization.

### Initial role catalogue

| Role | Primary access |
|---|---|
| Owner / Developer Super Admin | Hidden system control plane, role administration, system-wide audit and security settings |
| Business Admin | Cross-department operational oversight, staff and business configuration; no developer controls |
| Sales Manager | Sales pipeline, customers, quotations, sales reports and team assignments |
| Sales Executive | Own/team enquiries, customer follow-ups and quotations |
| Survey Engineer | Assigned sites, surveys, audits, defects and survey reports |
| Project Manager | Projects, tasks, project teams, materials, milestones and handover |
| Project Engineer | Assigned project tasks, installation evidence and testing records |
| Service Manager | AMC contracts, visit schedules, service teams, defects and service reports |
| Service Technician | Assigned service visits, checklists, assets, photos and defect updates |
| Store / Inventory Manager | Inventory, suppliers, purchase orders and stock movements |
| Compliance Officer | Compliance documents, certificates, expiry dates, evidence and review queues |
| Accounts / Finance | Approved quotations, invoice/payment records and financial reports when finance module is enabled |
| Website Editor | Public website content only; no operational customer data unless separately granted |

A staff member may hold more than one role. Access should be the union of explicitly granted permissions, subject to record-level scope and explicit denials.

### Permission model

Create a normalized permission catalogue, rather than hard-coding role names throughout the frontend:

- `module`: e.g. `leads`, `customers`, `surveys`, `projects`, `amc`.
- `action`: `read`, `create`, `update`, `delete`, `assign`, `approve`, `export`, `publish`.
- `scope`: `own`, `assigned`, `department`, `all`.
- `role_permissions`: maps role to permission and scope.
- `user_roles`: maps Auth user to one or more roles.
- `employee_profiles`: staff identity, department and active status.
- `user_department_memberships`: department membership and optional manager relationship.

For example, a Service Technician can read assigned AMC visits and update their own visit checklist, but cannot edit contract pricing, approve a quotation or read another department's leads.

### Department catalogue

- Sales
- Survey & Audit
- Projects & Installation
- Service & AMC
- Stores & Procurement
- Compliance & Quality
- Accounts & Finance
- Website & Marketing
- Management

Department assignment is a data scope, not a substitute for permissions. RLS must enforce both.

### Authorization requirements

- Every exposed table has RLS enabled.
- Use `TO authenticated` plus explicit authorization predicates.
- UPDATE policies must include both `USING` and `WITH CHECK`.
- Avoid relying on user-editable Auth `user_metadata` for authorization.
- Role/permission changes must take effect on the next authorized request; do not rely on stale client-side role state.
- Sensitive cross-department operations should go through Edge Functions that re-check the caller's identity and permission.
- Never expose Supabase secret/service-role keys in browser code.
- All admin routes require a valid session and active employee/admin record.

---

## 5. Detailed module specifications

### 5.1 Enquiries / CRM

Retain the current `leads` table as the source of truth for existing enquiries. Extend it additively; do not rename or drop it during the first release.

Required functionality:
- capture website and manually entered enquiries;
- validate phone/email and consent;
- assign owner, department and priority;
- source attribution and campaign tracking;
- follow-up reminders and call/meeting notes;
- status pipeline: New → Contact Attempted → Qualified → Survey Required → Quotation in Progress → Quotation Sent → Negotiation → Won / Lost;
- convert qualified/won leads into customer and site records;
- preserve the original lead and link it to the converted records;
- deduplication warning for matching phone/email/company;
- full change/activity timeline.

Lost reasons should be structured (budget, timing, competitor, no response, scope mismatch, duplicate, other).

### 5.2 Customers and sites

A customer is the legal/business account. A customer can own multiple sites. A site can have several contacts and multiple installed systems.

Customer fields: legal name, display name, customer type, GSTIN (optional), billing address, primary email/phone, account owner, status and notes.

Site fields: customer_id, site name, site code, address, city, state, PIN, premises type, occupancy/use, approximate area/floors (optional), site contact, access instructions, operational status and risk/priority metadata.

Detail pages must show linked enquiries, surveys, quotations, projects, assets, AMC contracts, visits, defects and documents.

### 5.3 Site surveys and fire audits

Support configurable templates per survey type:
- initial site assessment;
- fire safety audit;
- pre-installation survey;
- AMC onboarding inspection;
- periodic maintenance inspection;
- post-installation testing.

Survey record:
- site, survey type, scheduled date, assigned engineer, status;
- checklist template/version;
- checklist responses with pass/fail/NA/not-inspected;
- observations and evidence photos;
- severity and recommended corrective action;
- customer representative acknowledgement;
- reviewer approval and PDF report.

A checklist response must retain the template version used at the time. Do not silently rewrite historical reports when templates change.

### 5.4 Quotations and BOQ

Support multiple revisions and approval workflow.

Quotation fields:
- quotation number, customer, site, lead, validity date;
- line items, item description, SKU/service code, quantity, unit, unit rate, tax rate, discount;
- labour, transport, installation and other charges;
- subtotal, tax total, grand total, currency;
- prepared_by, reviewed_by, approved_by;
- status: Draft, Internal Review, Approved, Sent, Accepted, Rejected, Expired, Superseded.

Store a frozen snapshot of item descriptions, tax and prices in each issued version. Historical sent/accepted quotations must not change when the product catalogue changes.

Generate a branded PDF and retain its Storage path, checksum/version and generated timestamp. Customer acceptance should record method, actor, timestamp and attachment/evidence.

### 5.5 Projects and installation

Create a project from an accepted quotation. Project fields include project code, customer/site, approved quotation, manager, start/target/end dates, budget, status and completion percentage.

Project tasks include owner, dependency, planned dates, actual dates, status, checklist, notes and attachments.

Project milestones:
- planning and kickoff;
- procurement;
- site readiness;
- installation;
- testing;
- commissioning;
- documentation;
- customer handover.

Record installed equipment as assets and link each asset to the site and, where applicable, project/quotation line.

### 5.6 Service and AMC

AMC contract fields:
- contract number, customer/site, start/end date;
- scope and included systems/assets;
- contract value and payment terms;
- visit frequency and planned visit count;
- response-time commitments where contractually defined;
- assigned service manager;
- renewal notice windows;
- status: Draft, Active, On Hold, Expiring, Expired, Renewed, Cancelled.

Service visit fields:
- contract/site, scheduled window, assigned technician/team;
- visit type and checklist template/version;
- arrival/departure timestamps where collected;
- checklist responses and readings;
- assets inspected;
- defects found and severity;
- corrective work and parts used;
- photos and customer acknowledgement;
- technician submission and supervisor review;
- service report PDF.

Support breakdown/call-out requests separately from scheduled visits but link them to the relevant site, asset and contract.

Do not hard-code one universal inspection interval. Schedule from contract terms, equipment requirements and approved maintenance policy.

### 5.7 Equipment assets and QR

An asset is an individual installed/maintained item, not just a catalogue product.

Asset fields:
- asset tag and QR token;
- product/model/manufacturer;
- serial number and batch;
- customer/site and exact location/zone;
- install/commission date;
- warranty end date;
- current condition/status;
- last inspection and next due date;
- linked project, AMC coverage and service history.

QR codes should resolve to a controlled asset detail view. Public QR scans must not expose customer contacts, site security details or internal reports. Use authenticated access or a minimal public verification view.

### 5.8 Inventory and procurement

Separate product catalogue from inventory balances.

Inventory:
- SKU, category, unit, reorder level;
- warehouse/bin;
- stock movement ledger (receipt, issue, transfer, adjustment, return);
- supplier and purchase order links;
- serial/batch/expiry where applicable.

Do not store only a mutable quantity. Maintain an append-only stock movement ledger and derive current balance. Material issue to a project or service visit must link to that source record.

Purchase order lifecycle: Draft → Approval → Sent → Partially Received → Received / Closed / Cancelled.

### 5.9 Compliance and document control

Document metadata:
- document type, reference number, customer/site/project/asset/contract relation;
- issue date, expiry/review date;
- issuing authority/issuer;
- file path, MIME type, file size and checksum;
- uploaded_by, reviewed_by, approval status;
- access classification and retention policy.

Track NOC, certificates, inspection/audit reports, commissioning records, AMC documents, training/drill records and other evidence as applicable.

Expiry reminders should be configurable and should create tasks/notifications. The application is a recordkeeping and workflow tool; compliance conclusions must be reviewed by an appropriately authorized professional.

### 5.10 Employees and tasks

Employee profile:
- Auth user link (nullable for non-login staff);
- employee code, name, photo, title, department;
- work email/phone;
- active/inactive status;
- skill tags, certifications and validity dates;
- manager and joining date.

Task records:
- title, description, task type;
- linked customer/site/lead/project/visit/defect;
- assignee, creator, due date, priority and status;
- completion evidence and activity history.

### 5.11 Website Manager

Keep website content isolated from internal operations. Existing tables remain:
- `team_members`
- `products`
- `services`
- `social_links`
- `site_settings`

Add draft/published/archived state, published_at, updated_by, SEO metadata and preview support in a later additive migration. Existing `is_active` fields must be mapped carefully to publication state; do not break the public website renderer.

### 5.12 Notifications and automation

Create in-app notifications and task/reminder records for:
- new enquiry assignment;
- follow-up due/overdue;
- survey scheduled;
- quotation awaiting approval/response;
- project milestone overdue;
- service visit due/overdue;
- critical defect;
- AMC/document expiry;
- stock below reorder level.

Use scheduled server-side jobs/Edge Functions for reminders. Each automation must be idempotent (unique event key) and log its outcome. Start with in-app notifications and email only after sender configuration and delivery testing. WhatsApp/SMS should be a later integration with consent and provider configuration.

---

## 6. Business analytics and reporting specification

### Sales analytics
- enquiries by day/week/month, source, campaign, service and location;
- stage conversion and time-in-stage;
- follow-up SLA and overdue rate;
- quotation value, acceptance rate and average response time;
- lost reasons and sales owner performance.

### Project analytics
- active/completed/late projects;
- milestone slippage;
- planned vs actual duration;
- approved budget vs actual cost, once cost data is implemented;
- handover completion.

### Service analytics
- visits due/completed/overdue;
- first-time resolution;
- defects by type/severity/site;
- mean time to acknowledge/resolve where timestamps exist;
- technician workload and service report completion;
- AMC renewal/retention.

### Inventory analytics
- stock on hand and below reorder point;
- stock issued by project/service;
- supplier lead time and purchase order status;
- slow-moving/expired stock when relevant.

### Website analytics
Continue consent-based visitor events. Join enquiries to attribution using visitor/session identifiers only when valid and consent rules permit. Never infer identity from browsing events or record keystrokes/form-field contents.

### Reporting rules
- Every metric must have a documented definition and date basis.
- Use server-side views/functions with appropriate security (e.g. security-invoker views where applicable) or permission-checked Edge Functions.
- Paginate large detail lists; aggregate on the database rather than downloading all records to the browser.
- Date filters must use a consistent business timezone, initially Asia/Kolkata.
- Export permissions must be separate from read permissions for sensitive data.
- Show “no data” when records are absent; never substitute sample figures in production.

---

## 7. Hidden Developer Super Admin control plane

The Developer Super Admin is deliberately **not part of the ordinary admin navigation**.

### Visibility requirements

- No super-admin label, icon, menu item, public link, sitemap entry or ordinary dashboard card.
- No visible “switch to super admin” action for regular admins.
- A separate unadvertised route may be used for the developer console, but route secrecy is only a UX choice.
- Do not leak its route or capabilities through ordinary API responses, navigation payloads or error messages.

### Authorization requirements

- Existing owner account remains the initial super-admin.
- Only a super-admin can access the developer route and its APIs.
- Re-check role and permission server-side on every privileged request.
- Require MFA for super-admin access before production use.
- Admin invitations must create ordinary Admin accounts only; never allow the invite payload to select a privileged role.
- Role grants/revocations require re-authentication, reason capture and immutable audit event.
- Protect against self-lockout and prevent removing/demoting the final active super-admin.
- Rotate the exposed secret key previously shared in chat; it must never be placed in frontend code or committed.

### Developer console capabilities

- invite/deactivate admin accounts;
- role and permission management;
- audit log search;
- system health and failed job view;
- integration configuration status (not secret values);
- data retention/export controls;
- security events and recent privileged operations.

Do not add arbitrary SQL execution, secret display, or unrestricted production data export to the UI.

---

## 8. Proposed database model

Use UUID primary keys for business entities, timestamptz for event times, numeric(12,2) or suitable fixed precision for money, explicit currency codes, and foreign keys with deliberate deletion behavior.

### Identity and authorization

| Table | Purpose |
|---|---|
| `employee_profiles` | Staff profile and optional Auth user link |
| `departments` | Department catalogue |
| `user_department_memberships` | User-to-department membership and manager |
| `roles` | Named role catalogue |
| `permissions` | Module/action/scope catalogue |
| `role_permissions` | Role-to-permission grants |
| `user_roles` | User-to-role assignments |
| `admin_users` | Keep as compatibility/owner allow-list during migration; consolidate only after a tested auth migration |

### CRM and customer records

| Table | Purpose |
|---|---|
| `customers` | Customer/company account |
| `customer_contacts` | Multiple customer/site contacts |
| `sites` | Physical premises |
| `lead_activities` | Append-only communication/follow-up timeline |
| `lead_conversions` | Explicit link from existing lead to customer/site/project |

Extend `leads` with nullable `customer_id`, `site_id`, `department_id`, `priority`, `lost_reason`, `next_follow_up_at`, `converted_at`, and UUID `assigned_user_id`. Keep current `assigned_to` during transition, then backfill and deprecate after frontend migration.

### Surveys and quality

| Table | Purpose |
|---|---|
| `survey_templates` | Versioned inspection template |
| `survey_template_items` | Versioned checklist definitions |
| `site_surveys` | Survey header and assignment |
| `survey_responses` | Snapshot responses to template items |
| `defects` | Findings, severity, owner, due date and resolution |
| `defect_updates` | Defect history and evidence |

### Quotations and projects

| Table | Purpose |
|---|---|
| `quotations` | Commercial proposal header |
| `quotation_versions` | Immutable issued revisions |
| `quotation_items` | Item snapshot, qty, unit, rates and tax |
| `quotation_approvals` | Approval decision history |
| `projects` | Accepted work execution |
| `project_tasks` | Project work packages |
| `project_milestones` | Milestone dates and state |
| `project_materials` | Planned/issued materials |
| `handover_records` | Completion and customer handover |

### Service, assets and inventory

| Table | Purpose |
|---|---|
| `amc_contracts` | Contract, scope, schedule and renewal |
| `amc_covered_assets` | Contract-to-asset coverage |
| `service_visits` | Scheduled and breakdown visits |
| `service_visit_responses` | Versioned checklist results |
| `service_reports` | Generated report metadata |
| `equipment_assets` | Installed individual equipment |
| `asset_history` | Asset lifecycle and maintenance events |
| `inventory_items` | Stock catalogue |
| `warehouses` | Storage locations |
| `stock_movements` | Append-only stock ledger |
| `suppliers` | Supplier master |
| `purchase_orders` | Procurement header |
| `purchase_order_items` | Procurement lines |
| `goods_receipts` | Receipt records |

### Compliance, work management and audit

| Table | Purpose |
|---|---|
| `compliance_documents` | Document metadata and expiry |
| `document_reviews` | Review/approval history |
| `tasks` | Assignable work |
| `notifications` | In-app notification inbox |
| `automation_runs` | Idempotent job execution log |
| `activity_logs` | Business-record activity timeline |
| `security_audit_logs` | Append-only sensitive action audit |

### Data modelling conventions

- All business tables should have `created_at`, `updated_at`, and actor columns where appropriate.
- Use `created_by` and `updated_by` UUIDs referencing Auth users or employee profiles, with deliberate deletion behavior.
- Avoid free-text employee assignment for new records; use UUID foreign keys.
- Use check constraints/enums or lookup tables for statuses and priorities.
- Add indexes for foreign keys, status, assigned user, department, due date, created_at and common customer/site lookups.
- Use unique constraints for business identifiers (lead number, customer code, site code, quotation number, project code, AMC number, asset tag).
- Use soft archive for business records; hard deletion only for controlled cleanup and legally permitted cases.
- Keep event/history tables append-only for normal application roles.
- Store files in private buckets by default; signed URLs or authenticated downloads for customer documents and reports. Keep public `site-media` only for intentionally public website assets.

---

## 9. Database migration and rollout plan

**Do not apply the following migrations to production until each phase has been tested against a restored copy or Supabase development branch.** The live database currently has schema changes applied directly; migration history must be reconciled first.

### Phase 0 — Production baseline and recovery

1. Freeze schema changes while baseline is captured.
2. Take/verify a Supabase backup and record recovery procedure.
3. Check current CLI version and read its help. Supabase CLI v3 changes database command defaults; always explicitly specify `--remote` for hosted operations.
4. Link the repository to the intended project using project ref, without putting DB passwords/API secrets in Git.
5. Pull the current remote schema into `supabase/migrations/` using the supported CLI baseline workflow.
6. Inspect remote migration history with `supabase migration list --remote`.
7. Compare the pulled schema with `supabase/schema.sql` and the live database; resolve drift manually.
8. Confirm the baseline migration does not attempt to recreate existing objects or rewrite data.
9. Run the baseline against a disposable local database/branch and verify schema equivalence.
10. Commit baseline and recovery notes before feature migrations.

**CLI v3 caution:** commands such as `db pull`, `db push` and `migration list` target local state by default in v3; explicitly pass `--remote` when the target is the hosted project. Do not assume a command targets production.

### Phase 1 — Identity, departments and permissions

Migration contents:
- create `departments`, `employee_profiles`, `roles`, `permissions`, `role_permissions`, `user_roles`, `user_department_memberships`;
- seed department and role catalogues;
- seed permission catalogue and least-privilege mappings;
- link existing `admin_users` users to employee/role records;
- preserve existing owner super-admin mapping;
- create private authorization helper functions with fixed search_path and narrow EXECUTE grants;
- add RLS to every new table;
- add indexes and audit triggers.

Backfill must be idempotent. Existing admin account must retain access throughout rollout.

### Phase 2 — Customers, sites and lead conversion

Migration contents:
- create `customers`, `customer_contacts`, `sites`, `lead_activities`, `lead_conversions`;
- add nullable relationship and assignment columns to `leads`;
- create indexes and foreign keys;
- preserve old `assigned_to` and `notes` until data is migrated to structured activities/UUID assignments;
- add RLS based on role + department + assigned/owned scope.

Backfill:
- do not automatically merge customers solely because names match;
- create duplicate candidates using normalized phone/email/GSTIN and require human confirmation;
- migrate legacy lead notes into an initial activity entry only after confirming no duplication;
- preserve original lead IDs and lead_number values.

### Phase 3 — Surveys, checklist templates and defects

Create versioned survey templates, survey headers, response snapshots, defects and defect updates. Add private storage bucket for survey evidence and enforce path/record access with RLS.

### Phase 4 — Quotations and BOQ

Create quotations, versions, items and approval records. Implement immutable issued quotation snapshots. Add server-side totals validation and PDF generation. Never trust browser-calculated totals as authoritative.

### Phase 5 — Projects and handover

Create projects, tasks, milestones, materials and handover records. Add conversion Edge Function/transaction that converts accepted quotation into project idempotently.

### Phase 6 — AMC, visits and service reports

Create AMC contracts, coverage links, service visits, checklist response snapshots and report metadata. Add scheduling/reminder infrastructure and private report storage. Prevent duplicate scheduled visits with a deterministic unique key.

### Phase 7 — Assets, inventory and procurement

Create asset registry, QR tokens, asset history, inventory, warehouses, stock ledger, suppliers, purchase orders and receipts. Enforce stock movement invariants in a transaction/RPC; do not let the browser update aggregate stock quantity directly.

### Phase 8 — Compliance, notifications and analytics

Create compliance documents/reviews, tasks, notifications, automation run log and activity/security audit logs. Add secured aggregate views or Edge Functions for dashboards. Use security-invoker views where supported and never expose an owner-privileged view to public roles.

### Phase 9 — Website and developer control plane

Add website content publication metadata and audit trail without breaking existing public rendering. Implement hidden developer route and privileged Edge Function endpoints. Require MFA and audit all super-admin operations.

### Migration file naming

Use `supabase migration new <descriptive_name>` to generate migration filenames; do not hand-invent timestamps. Suggested names, in order:

1. `identity_departments_permissions`
2. `customers_sites_lead_conversion`
3. `survey_templates_responses_defects`
4. `quotations_versions_approvals`
5. `projects_tasks_milestones_handover`
6. `amc_service_visits_reports`
7. `equipment_assets_inventory_procurement`
8. `compliance_notifications_audit_analytics`
9. `website_publication_and_hidden_developer_console`

Use separate migrations for any later data backfill that requires a long-running or resumable process.

### Per-migration acceptance gates

- migration applies to a clean local database;
- migration applies to a production-like restored copy;
- no unexpected row loss or table recreation;
- RLS enabled and policies tested as anon, each role and a non-member;
- foreign keys and unique constraints verified;
- query plans checked for common list/detail queries;
- rollback/forward-fix strategy documented;
- generated TypeScript/database types updated;
- frontend compatibility tested before removing legacy columns.

---

## 10. RLS and access-control matrix

| Data domain | Public visitor | Sales | Survey / Projects | Service | Stores | Compliance | Business Admin |
|---|---|---|---|---|---|---|---|
| Website published content | Read active | Manage if granted | Read | Read | Read | Read | Manage |
| Leads | Submit only | Own/team | Assigned read | Assigned read if linked | None | Limited if granted | Cross-department |
| Customers/sites | None | Own/team | Assigned sites | Assigned sites | Limited | Assigned | Cross-department |
| Surveys | None | Read summary | Assigned create/update | Read relevant | None | Review | Oversight |
| Quotations | None | Create/team | Read approved scope | None | Read required items | None | Approve if granted |
| Projects | None | Read sales state | Assigned create/update | Read service scope | Read material needs | Read evidence | Oversight |
| AMC/visits | None | Read contract status | Read assigned | Assigned create/update | Read material needs | Read records | Oversight |
| Assets | None | Read limited | Assigned sites | Assigned assets | Stock-related only | Read evidence | Oversight |
| Inventory | None | None | Request material | Request/consume | Manage | None | Oversight |
| Compliance docs | None | Limited customer docs | Upload project evidence | Upload visit evidence | None | Manage/review | Oversight |
| Admin/security | None | None | None | None | None | None | No developer controls |
| Developer control plane | None | None | None | None | None | None | Hidden super-admin only |

This is a starting policy matrix. Every module's final policy must specify row scope, field sensitivity and action scope before implementation.

---

## 11. Frontend and backend architecture

### Frontend

Keep GitHub Pages initially, but split the current large admin HTML into maintainable modules:
- app shell and router;
- auth/session and permission guard;
- shared data access layer;
- reusable table/filter/pagination components;
- form validation and dirty-state handling;
- module pages (leads, customers, sites, surveys, quotations, projects, AMC, inventory, compliance);
- upload/document viewer;
- notification center;
- report components.

Use a consistent route scheme, e.g. `/admin/#/enquiries`, `/admin/#/customers`, `/admin/#/service/contracts`. Avoid putting secrets or privileged data in static bundles.

### Edge Functions / trusted server operations

Use Edge Functions for:
- invite/deactivate admin and role changes;
- quotation totals, approval and immutable issue;
- lead-to-customer/project conversion;
- stock movement transaction;
- service schedule generation;
- PDF generation and private document delivery;
- notifications and scheduled reminders;
- audit event recording for privileged actions.

Every function must authenticate the caller, query the current database permission, validate inputs, enforce idempotency and return minimal data.

### File storage

- `site-media`: public website assets only.
- `customer-documents`: private.
- `survey-evidence`: private.
- `service-reports`: private.
- `quotation-pdfs`: private.
- `compliance-documents`: private.

Storage policies must check the linked business record's department/assignment permissions, not just whether the user is authenticated.

---

## 12. Testing and acceptance criteria

### Functional
- Create enquiry from website and admin.
- Assign/reassign lead and record follow-up.
- Convert lead without duplicate customer/site creation.
- Create and version survey template; save survey response snapshot.
- Generate quotation revision; verify issued PDF remains unchanged after catalogue price update.
- Accept quotation and create project exactly once.
- Record installation and handover.
- Create AMC contract and schedule visits without duplicates.
- Complete service visit with evidence and customer acknowledgement.
- Record defect and close it with resolution evidence.
- Issue/consume/return inventory with correct stock ledger.
- Upload, review and expire compliance document.
- Generate reminders and avoid duplicate notifications.
- Verify dashboard metrics against direct SQL aggregates.

### Security
- Anonymous user cannot read operational tables or private documents.
- Sales cannot read unrelated department's restricted leads.
- Technician cannot modify contract price or another technician's assigned visit.
- Store user cannot access customer financial details.
- Website editor cannot read leads.
- Admin cannot invite/promote another admin unless explicitly granted the dedicated permission (default: no).
- Regular admin cannot discover/use developer APIs even if they know the hidden URL.
- Non-super-admin calls to developer Edge Functions return 403.
- Super-admin operations require MFA and create audit entries.
- No secret key appears in repository, static JS, browser network responses or build artifacts.

### Operational
- Mobile survey/service workflow tested on a real phone.
- Large lists are paginated.
- Empty/error/offline states are clear.
- PDF files are downloadable only by authorized users.
- Backup and restore drill completed before production rollout.

---

## 13. Delivery sequence and definition of done

### Release 1 — Operations foundation (approved first priority)
1. Identity/department/permission model.
2. Customers and sites.
3. Lead assignment, activity timeline and conversion.
4. Operations dashboard and task queue.
5. Basic employee directory and assignments.

**Done when:** an enquiry can move into a customer/site record, be assigned to a team member, and be tracked with a complete activity history without changing existing lead IDs.

### Release 2 — Survey and sales execution
1. Survey templates, visits and evidence.
2. Defect register.
3. Quotations, BOQ, revisions and PDF.
4. Approval workflow.

**Done when:** a site survey produces a reviewed report and a quotation can be issued and accepted with a frozen version.

### Release 3 — Project delivery
1. Projects and milestones.
2. Project tasks and materials.
3. Installation evidence, testing and commissioning.
4. Handover.

### Release 4 — Recurring service operations
1. AMC contracts.
2. Service visit scheduling.
3. Technician mobile workflow.
4. Defect resolution and service reports.
5. Renewal reminders.

### Release 5 — Assets, inventory and compliance
1. Asset register and QR.
2. Inventory ledger and procurement.
3. Compliance document control.
4. Expiry alerts.

### Release 6 — Analytics and system governance
1. Business/operations analytics.
2. Notification automation.
3. Audit log and system health.
4. Hidden Developer Super Admin console with MFA.

### Release 7 — Public website and polish
1. Product/service/team publication workflow.
2. Project portfolio and testimonials.
3. Website analytics attribution.
4. Accessibility, mobile UX and performance.

---

## 14. Key implementation constraints and explicit non-goals

- Do not rewrite the public website framework as part of the first release.
- Do not replace the current `leads` table or drop its fields during early releases.
- Do not migrate production schema until a verified baseline and backup exist.
- Do not put service-role/secret keys in browser code, GitHub Actions artifacts or documentation.
- Do not claim statutory compliance automatically.
- Do not store only current stock quantities; use a ledger.
- Do not mutate issued quotations or historical checklist responses.
- Do not expose customer documents in the public `site-media` bucket.
- Do not build unrestricted SQL console or secret viewer into the hidden developer console.
- Do not build payroll, full accounting or HR attendance in the first operational releases; integrate later if needed.

---

## 15. Reference material

- Supabase database migrations: https://supabase.com/docs/guides/deployment/database-migrations
- Supabase CLI v3 migration guide: https://supabase.com/docs/guides/local-development/cli/migrating-to-v3
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase security guidance: https://supabase.com/docs/guides/security/product-security
- Monark Fire: https://www.monarkfire.com/
- EFSS AMC: https://efss.in/amc.dc.html
- Forbid Fire: https://www.forbidfire.com/
- FIRENET: https://www.firenet.co.in/

---

**Implementation status:** This document is the approved specification and migration plan only. It does not apply schema changes, deploy functions, or change the live admin UI. The next engineering task is Phase 0: capture and reconcile the live Supabase baseline before generating the first additive migration.
