
-- Karma Fire Protection FP-OMS: additive operational modules + database-backed RBAC.
-- Existing CRM/content tables and records are preserved. No DROP/TRUNCATE/RESET operations.
create schema if not exists private;

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.employee_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  employee_code text unique,
  full_name text not null,
  work_email text,
  work_phone text,
  job_title text,
  department_id uuid references public.departments(id),
  manager_id uuid references public.employee_profiles(id),
  employment_status text not null default 'active' check (employment_status in ('active','inactive','on_leave','pending')),
  skills text[] not null default '{}',
  certifications jsonb not null default '[]'::jsonb,
  joined_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.app_permissions (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  action text not null,
  description text,
  unique(module, action)
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.app_roles(id) on delete cascade,
  permission_id uuid not null references public.app_permissions(id) on delete cascade,
  scope text not null default 'all' check (scope in ('own','assigned','department','all')),
  primary key(role_id, permission_id)
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.app_roles(id) on delete cascade,
  department_id uuid references public.departments(id),
  assigned_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key(user_id, role_id)
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  module text not null,
  target_type text,
  target_id uuid,
  outcome text not null default 'success' check (outcome in ('success','denied','failure')),
  ip_address inet,
  user_agent text,
  device_category text,
  session_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text unique,
  legal_name text not null,
  display_name text,
  customer_type text not null default 'business' check (customer_type in ('business','individual','government','institution')),
  gstin text,
  billing_address jsonb not null default '{}'::jsonb,
  primary_email text,
  primary_phone text,
  account_owner uuid references public.employee_profiles(id),
  status text not null default 'active' check (status in ('active','inactive','prospect','blocked')),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_sites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  site_code text unique,
  site_name text not null,
  premises_type text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text not null default 'India',
  latitude numeric(10,7),
  longitude numeric(10,7),
  floors integer,
  approximate_area_sqft numeric(14,2),
  site_contact_name text,
  site_contact_phone text,
  site_contact_email text,
  access_instructions text,
  operational_status text not null default 'active' check (operational_status in ('active','inactive','under_construction','closed')),
  risk_level text check (risk_level in ('low','medium','high','critical')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  site_id uuid references public.customer_sites(id) on delete cascade,
  full_name text not null,
  designation text,
  email text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.survey_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  survey_type text not null,
  version integer not null default 1 check(version > 0),
  checklist jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(name, version)
);

create table if not exists public.site_surveys (
  id uuid primary key default gen_random_uuid(),
  survey_number bigint generated by default as identity unique,
  customer_id uuid not null references public.customers(id),
  site_id uuid not null references public.customer_sites(id),
  template_id uuid references public.survey_templates(id),
  template_snapshot jsonb not null default '{}'::jsonb,
  survey_type text not null,
  assigned_to uuid references public.employee_profiles(id),
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  status text not null default 'draft' check(status in ('draft','scheduled','in_progress','submitted','under_review','approved','rejected','cancelled')),
  summary text,
  customer_acknowledgement jsonb not null default '{}'::jsonb,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.site_surveys(id) on delete cascade,
  checklist_item_key text not null,
  response text not null check(response in ('pass','fail','na','not_inspected','text','number')),
  value_text text,
  value_number numeric,
  observation text,
  severity text check(severity in ('low','medium','high','critical')),
  corrective_action text,
  created_at timestamptz not null default now(),
  unique(survey_id, checklist_item_key)
);

create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  quotation_number text not null unique,
  revision integer not null default 1 check(revision > 0),
  customer_id uuid not null references public.customers(id),
  site_id uuid references public.customer_sites(id),
  lead_id uuid references public.leads(id),
  status text not null default 'draft' check(status in ('draft','internal_review','approved','sent','accepted','rejected','expired','superseded')),
  currency text not null default 'INR',
  valid_until date,
  subtotal numeric(14,2) not null default 0,
  discount_total numeric(14,2) not null default 0,
  tax_total numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  terms text,
  snapshot jsonb not null default '{}'::jsonb,
  pdf_path text,
  prepared_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(quotation_number, revision)
);

create table if not exists public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  line_no integer not null,
  item_type text not null default 'product' check(item_type in ('product','service','labour','transport','other')),
  sku text,
  description text not null,
  unit text not null default 'Nos',
  quantity numeric(14,3) not null default 1 check(quantity > 0),
  unit_rate numeric(14,2) not null default 0 check(unit_rate >= 0),
  discount_amount numeric(14,2) not null default 0 check(discount_amount >= 0),
  tax_rate numeric(7,4) not null default 0 check(tax_rate >= 0),
  line_total numeric(14,2) not null default 0,
  item_snapshot jsonb not null default '{}'::jsonb,
  unique(quotation_id, line_no)
);

create table if not exists public.quotation_approvals (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  approver_id uuid references auth.users(id),
  decision text not null check(decision in ('approved','rejected','changes_requested')),
  comments text,
  decided_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  project_code text not null unique,
  project_name text not null,
  customer_id uuid not null references public.customers(id),
  site_id uuid not null references public.customer_sites(id),
  accepted_quotation_id uuid references public.quotations(id),
  project_manager uuid references public.employee_profiles(id),
  status text not null default 'planning' check(status in ('planning','procurement','site_ready','installation','testing','commissioning','handover','completed','on_hold','cancelled')),
  start_date date,
  target_end_date date,
  actual_end_date date,
  budget numeric(14,2),
  completion_percent numeric(5,2) not null default 0 check(completion_percent between 0 and 100),
  description text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  sequence_no integer not null default 0,
  planned_date date,
  completed_at timestamptz,
  status text not null default 'pending' check(status in ('pending','in_progress','completed','blocked','cancelled')),
  notes text,
  unique(project_id, sequence_no)
);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  milestone_id uuid references public.project_milestones(id) on delete set null,
  title text not null,
  description text,
  assignee_id uuid references public.employee_profiles(id),
  priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),
  status text not null default 'todo' check(status in ('todo','in_progress','blocked','done','cancelled')),
  start_date date,
  due_date date,
  completed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.amc_contracts (
  id uuid primary key default gen_random_uuid(),
  contract_number text not null unique,
  customer_id uuid not null references public.customers(id),
  site_id uuid not null references public.customer_sites(id),
  start_date date not null,
  end_date date not null,
  scope jsonb not null default '{}'::jsonb,
  contract_value numeric(14,2),
  visit_frequency text,
  planned_visits integer check(planned_visits is null or planned_visits >= 0),
  response_commitment text,
  service_manager uuid references public.employee_profiles(id),
  renewal_notice_days integer not null default 30,
  status text not null default 'draft' check(status in ('draft','active','on_hold','expiring','expired','renewed','cancelled')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(end_date >= start_date)
);

create table if not exists public.service_visits (
  id uuid primary key default gen_random_uuid(),
  visit_number bigint generated by default as identity unique,
  contract_id uuid references public.amc_contracts(id),
  customer_id uuid not null references public.customers(id),
  site_id uuid not null references public.customer_sites(id),
  assigned_technician uuid references public.employee_profiles(id),
  visit_type text not null default 'scheduled' check(visit_type in ('scheduled','breakdown','callout','inspection','installation')),
  scheduled_start timestamptz not null,
  scheduled_end timestamptz,
  arrived_at timestamptz,
  departed_at timestamptz,
  status text not null default 'scheduled' check(status in ('scheduled','in_progress','submitted','under_review','completed','cancelled','missed')),
  findings text,
  work_performed text,
  customer_acknowledgement jsonb not null default '{}'::jsonb,
  report_path text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.defects (
  id uuid primary key default gen_random_uuid(),
  defect_number bigint generated by default as identity unique,
  customer_id uuid not null references public.customers(id),
  site_id uuid not null references public.customer_sites(id),
  asset_id uuid,
  survey_id uuid references public.site_surveys(id),
  service_visit_id uuid references public.service_visits(id),
  title text not null,
  description text,
  severity text not null default 'medium' check(severity in ('low','medium','high','critical')),
  status text not null default 'open' check(status in ('open','assigned','in_progress','resolved','verified','closed','deferred')),
  assigned_to uuid references public.employee_profiles(id),
  resolution text,
  resolved_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  asset_tag text not null unique,
  qr_token uuid not null default gen_random_uuid() unique,
  product_id uuid references public.products(id),
  customer_id uuid not null references public.customers(id),
  site_id uuid not null references public.customer_sites(id),
  project_id uuid references public.projects(id),
  manufacturer text,
  model text,
  serial_number text,
  batch_number text,
  zone_location text,
  installed_on date,
  warranty_until date,
  condition text not null default 'good' check(condition in ('new','good','fair','poor','critical','retired')),
  last_inspected_at timestamptz,
  next_inspection_at timestamptz,
  amc_contract_id uuid references public.amc_contracts(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.defects drop constraint if exists defects_asset_id_fkey;
alter table public.defects add constraint defects_asset_id_fkey foreign key(asset_id) references public.assets(id) on delete set null;

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  supplier_code text unique,
  name text not null,
  gstin text,
  contact_name text,
  email text,
  phone text,
  address jsonb not null default '{}'::jsonb,
  status text not null default 'active' check(status in ('active','inactive','blocked')),
  created_at timestamptz not null default now()
);

create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  address jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  description text,
  unit text not null default 'Nos',
  category text,
  reorder_level numeric(14,3) not null default 0,
  is_serialized boolean not null default false,
  is_batch_tracked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id),
  warehouse_id uuid not null references public.warehouses(id),
  movement_type text not null check(movement_type in ('opening','receipt','issue','transfer_in','transfer_out','adjustment','return')),
  quantity numeric(14,3) not null check(quantity > 0),
  unit_cost numeric(14,2),
  source_type text,
  source_id uuid,
  batch_number text,
  serial_number text,
  notes text,
  performed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique,
  supplier_id uuid not null references public.suppliers(id),
  status text not null default 'draft' check(status in ('draft','approval','sent','partially_received','received','closed','cancelled')),
  order_date date not null default current_date,
  expected_date date,
  subtotal numeric(14,2) not null default 0,
  tax_total numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  notes text,
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id),
  quantity numeric(14,3) not null check(quantity > 0),
  received_quantity numeric(14,3) not null default 0 check(received_quantity >= 0),
  unit_cost numeric(14,2) not null default 0,
  tax_rate numeric(7,4) not null default 0
);

create table if not exists public.compliance_documents (
  id uuid primary key default gen_random_uuid(),
  document_number text,
  document_type text not null,
  title text not null,
  customer_id uuid references public.customers(id),
  site_id uuid references public.customer_sites(id),
  project_id uuid references public.projects(id),
  asset_id uuid references public.assets(id),
  contract_id uuid references public.amc_contracts(id),
  issuer text,
  issued_on date,
  expires_on date,
  review_due_on date,
  storage_path text not null,
  mime_type text,
  file_size_bytes bigint,
  checksum_sha256 text,
  status text not null default 'pending_review' check(status in ('draft','pending_review','approved','rejected','expired','archived')),
  uploaded_by uuid references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  task_type text not null default 'general',
  linked_type text,
  linked_id uuid,
  assignee_id uuid references public.employee_profiles(id),
  created_by uuid references auth.users(id),
  priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),
  status text not null default 'todo' check(status in ('todo','in_progress','blocked','done','cancelled')),
  start_at timestamptz,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid references auth.users(id),
  comment text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.record_attachments (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  record_id uuid not null,
  storage_bucket text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size_bytes bigint,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(storage_bucket, storage_path)
);

-- Indexes for foreign keys, common filters and dashboards.
create index if not exists idx_sites_customer on public.customer_sites(customer_id);
create index if not exists idx_surveys_site_status on public.site_surveys(site_id,status);
create index if not exists idx_quotes_customer_status on public.quotations(customer_id,status);
create index if not exists idx_projects_customer_status on public.projects(customer_id,status);
create index if not exists idx_amc_site_end_date on public.amc_contracts(site_id,end_date);
create index if not exists idx_visits_assignee_schedule on public.service_visits(assigned_technician,scheduled_start);
create index if not exists idx_assets_site on public.assets(site_id);
create index if not exists idx_stock_item_warehouse on public.stock_movements(inventory_item_id,warehouse_id);
create index if not exists idx_compliance_expiry on public.compliance_documents(expires_on,status);
create index if not exists idx_tasks_assignee_due on public.tasks(assignee_id,due_at,status);
create index if not exists idx_audit_created_at on public.audit_events(created_at desc);
create index if not exists idx_audit_actor on public.audit_events(actor_user_id,created_at desc);

insert into public.departments(code,name) values
('sales','Sales'),('survey','Survey & Audit'),('projects','Projects & Installation'),
('service','Service & AMC'),('stores','Stores & Procurement'),('compliance','Compliance & Quality'),
('finance','Accounts & Finance'),('website','Website & Marketing'),('management','Management')
on conflict(code) do nothing;

insert into public.app_roles(code,name,description,is_system) values
('business_admin','Business Admin','Operational administration excluding developer control plane',true),
('sales_manager','Sales Manager','Sales pipeline and team oversight',true),
('sales_executive','Sales Executive','Assigned leads and customer follow-up',true),
('survey_engineer','Survey Engineer','Assigned site surveys and audit records',true),
('project_manager','Project Manager','Project delivery and milestones',true),
('project_engineer','Project Engineer','Assigned installation and project tasks',true),
('service_manager','Service Manager','AMC and service team oversight',true),
('service_technician','Service Technician','Assigned service visits and asset inspections',true),
('inventory_manager','Inventory Manager','Suppliers, purchase orders and stock ledger',true),
('compliance_officer','Compliance Officer','Compliance documents and review queues',true),
('finance','Finance','Financially scoped quotation and purchase data',true),
('website_editor','Website Editor','Public website content only',true)
on conflict(code) do nothing;

insert into public.app_permissions(module,action,description)
select m,a,initcap(a)||' access to '||m
from (values
('customers'),('surveys'),('quotations'),('projects'),('service'),('assets'),('inventory'),('compliance'),('tasks'),('employees'),('website'),('leads'),('reports')
) as mods(module)
cross join (values ('read'),('create'),('update'),('delete'),('assign'),('approve'),('export'),('publish')) as acts(action)
on conflict(module,action) do nothing;

-- Business Admin is a normal operational role; it never grants developer/Super Admin controls.
insert into public.role_permissions(role_id,permission_id,scope)
select r.id,p.id,'all'
from public.app_roles r cross join public.app_permissions p
where r.code='business_admin'
on conflict do nothing;

-- Default role grants are least-privilege. Admins can manage these grants only through trusted admin tooling.
insert into public.role_permissions(role_id,permission_id,scope)
select r.id,p.id,
case when r.code in ('sales_executive','survey_engineer','project_engineer','service_technician') then 'assigned' else 'department' end
from public.app_roles r
join public.app_permissions p on
 (r.code in ('sales_manager','sales_executive') and p.module in ('leads','customers','quotations','reports','tasks') and p.action in ('read','create','update','assign','export'))
 or (r.code='survey_engineer' and p.module in ('customers','surveys','assets','tasks') and p.action in ('read','create','update'))
 or (r.code in ('project_manager','project_engineer') and p.module in ('customers','projects','assets','inventory','tasks') and p.action in ('read','create','update','assign'))
 or (r.code in ('service_manager','service_technician') and p.module in ('customers','service','assets','tasks') and p.action in ('read','create','update','assign'))
 or (r.code='inventory_manager' and p.module in ('inventory','assets','projects','tasks') and p.action in ('read','create','update','approve'))
 or (r.code='compliance_officer' and p.module in ('compliance','customers','sites','assets','projects','service','tasks') and p.action in ('read','create','update','approve','export'))
 or (r.code='finance' and p.module in ('quotations','inventory','reports','customers') and p.action in ('read','approve','export'))
 or (r.code='website_editor' and p.module='website' and p.action in ('read','create','update','publish'))
on conflict do nothing;

-- Security-definer helpers are isolated in a non-exposed schema and always bind to auth.uid().
create or replace function private.current_karma_role()
returns text language sql stable security definer set search_path=''
as $$
  select case
    when exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()) and a.role='super_admin') then 'super_admin'
    when exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()) and a.role='admin') then 'admin'
    else 'staff'
  end
$$;

create or replace function private.can_access_module(p_module text,p_action text)
returns boolean language sql stable security definer set search_path=''
as $$
  select private.can_access_record(p_module,p_action,null,null,null)
$$;


-- Common ownership/scope columns let RLS enforce own, assigned, department and all scopes.
do $
declare t text;
begin
  foreach t in array array[
    'customers','customer_sites','customer_contacts','site_surveys','survey_responses',
    'quotations','quotation_items','quotation_approvals','projects','project_milestones',
    'project_tasks','amc_contracts','service_visits','defects','assets','suppliers','warehouses',
    'inventory_items','stock_movements','purchase_orders','purchase_order_items',
    'compliance_documents','tasks','task_comments','record_attachments'
  ] loop
    execute format('alter table public.%I add column if not exists owner_user_id uuid references auth.users(id)',t);
    execute format('alter table public.%I add column if not exists assigned_user_id uuid references auth.users(id)',t);
    execute format('alter table public.%I add column if not exists department_id uuid references public.departments(id)',t);
  end loop;
end $;

create or replace function private.can_access_record(
  p_module text,p_action text,p_owner uuid,p_assignee uuid,p_department uuid
) returns boolean
language sql stable security definer set search_path=''
as $
  select
    exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()) and a.role in ('admin','super_admin'))
    or exists(
      select 1 from public.user_roles ur
      join public.role_permissions rp on rp.role_id=ur.role_id
      join public.app_permissions ap on ap.id=rp.permission_id
      where ur.user_id=(select auth.uid())
        and ap.module=p_module and ap.action=p_action
        and (
          rp.scope='all'
          or (rp.scope='own' and p_owner=(select auth.uid()))
          or (rp.scope='assigned' and p_assignee=(select auth.uid()))
          or (rp.scope='department' and ur.department_id is not null and ur.department_id=p_department)
        )
    )
$;
revoke all on function private.can_access_record(text,text,uuid,uuid,uuid) from public,anon;
grant execute on function private.can_access_record(text,text,uuid,uuid,uuid) to authenticated;

revoke all on function private.current_karma_role() from public, anon;
revoke all on function private.can_access_module(text,text) from public, anon;
revoke all on function private.can_access_record(text,text,uuid,uuid,uuid) from public, anon;
grant execute on function private.current_karma_role() to authenticated;
grant execute on function private.can_access_module(text,text) to authenticated;
grant execute on function private.can_access_record(text,text,uuid,uuid,uuid) to authenticated;

-- Employee/admin directory excludes all Super Admin identities, including from Super Admin listings.
create or replace view public.admin_directory
with (security_invoker=true) as
select user_id,email,display_name,created_at,created_by
from public.admin_users
where role='admin';

-- Enable RLS and apply module-specific CRUD gates to all operational tables.
do $$
declare r record; m text;
begin
  for r in select * from (values
    ('departments','employees'),('employee_profiles','employees'),('app_roles','employees'),
    ('app_permissions','employees'),('role_permissions','employees'),('user_roles','employees'),
    ('audit_events','audit'),('customers','customers'),('customer_sites','customers'),
    ('customer_contacts','customers'),('survey_templates','surveys'),('site_surveys','surveys'),
    ('survey_responses','surveys'),('quotations','quotations'),('quotation_items','quotations'),
    ('quotation_approvals','quotations'),('projects','projects'),('project_milestones','projects'),
    ('project_tasks','projects'),('amc_contracts','service'),('service_visits','service'),
    ('defects','service'),('assets','assets'),('suppliers','inventory'),('warehouses','inventory'),
    ('inventory_items','inventory'),('stock_movements','inventory'),('purchase_orders','inventory'),
    ('purchase_order_items','inventory'),('compliance_documents','compliance'),('tasks','tasks'),
    ('task_comments','tasks'),('record_attachments','attachments')
  ) as x(tbl,module)
  loop
    execute format('alter table public.%I enable row level security',r.tbl);
    if r.tbl='audit_events' then
      execute 'drop policy if exists audit_superadmin_read on public.audit_events';
      execute 'create policy audit_superadmin_read on public.audit_events for select to authenticated using ((select private.is_karma_super_admin()))';
      execute 'drop policy if exists audit_superadmin_insert on public.audit_events';
      execute 'create policy audit_superadmin_insert on public.audit_events for insert to authenticated with check (actor_user_id=(select auth.uid()) and (select private.can_access_module(''audit'',''read'')))';
    elsif r.tbl in ('app_roles','app_permissions','role_permissions','user_roles','departments') then
      execute format('drop policy if exists %I on public.%I',r.tbl||'_admin_manage',r.tbl);
      execute format('create policy %I on public.%I for all to authenticated using ((select private.can_access_module(''employees'',''update''))) with check ((select private.can_access_module(''employees'',''update'')))',r.tbl||'_admin_manage',r.tbl);
      execute format('drop policy if exists %I on public.%I',r.tbl||'_admin_read',r.tbl);
      execute format('create policy %I on public.%I for select to authenticated using ((select private.can_access_module(''employees'',''read'')))',r.tbl||'_admin_read',r.tbl);
    else
      m:=r.module;
      execute format('drop policy if exists %I on public.%I',r.tbl||'_select',r.tbl);
      execute format('create policy %I on public.%I for select to authenticated using ((select private.can_access_record(%L,''read'',owner_user_id,assigned_user_id,department_id)))',r.tbl||'_select',r.tbl,m);
      execute format('drop policy if exists %I on public.%I',r.tbl||'_insert',r.tbl);
      execute format('create policy %I on public.%I for insert to authenticated with check ((select private.can_access_record(%L,''create'',owner_user_id,assigned_user_id,department_id)))',r.tbl||'_insert',r.tbl,m);
      execute format('drop policy if exists %I on public.%I',r.tbl||'_update',r.tbl);
      execute format('create policy %I on public.%I for update to authenticated using ((select private.can_access_record(%L,''update'',owner_user_id,assigned_user_id,department_id))) with check ((select private.can_access_record(%L,''update'',owner_user_id,assigned_user_id,department_id)))',r.tbl||'_update',r.tbl,m,m);
      execute format('drop policy if exists %I on public.%I',r.tbl||'_delete',r.tbl);
      execute format('create policy %I on public.%I for delete to authenticated using ((select private.can_access_record(%L,''delete'',owner_user_id,assigned_user_id,department_id)))',r.tbl||'_delete',r.tbl,m);
    end if;
  end loop;
end $$;

-- Super Admin can enumerate standard admin accounts only; ordinary admins can read only their own auth mapping.
drop policy if exists "Admins can read admin list" on public.admin_users;
drop policy if exists "Admins can read own account or superadmin reads standard admins" on public.admin_users;
create policy "Users read own admin mapping and admins see standard admins"
on public.admin_users for select to authenticated
using (
  user_id=(select auth.uid())
  or (role='admin' and (select private.is_karma_admin()))
);
drop policy if exists "Admins update standard admin accounts" on public.admin_users;
create policy "Admins update standard admin accounts"
on public.admin_users for update to authenticated
using (role='admin' and (select private.is_karma_admin()))
with check (role='admin' and (select private.is_karma_admin()));
drop policy if exists "Admins insert standard admin accounts" on public.admin_users;
create policy "Admins insert standard admin accounts"
on public.admin_users for insert to authenticated
with check (role='admin' and (select private.is_karma_admin()));
drop policy if exists "Admins delete standard admin accounts" on public.admin_users;
create policy "Admins delete standard admin accounts"
on public.admin_users for delete to authenticated
using (role='admin' and (select private.is_karma_admin()));

-- Directory view is only a convenience projection; underlying RLS remains authoritative.
grant select on public.admin_directory to authenticated;
grant select,insert,update,delete on
 public.departments,public.employee_profiles,public.app_roles,public.app_permissions,public.role_permissions,public.user_roles,
 public.customers,public.customer_sites,public.customer_contacts,public.survey_templates,public.site_surveys,public.survey_responses,
 public.quotations,public.quotation_items,public.quotation_approvals,public.projects,public.project_milestones,public.project_tasks,
 public.amc_contracts,public.service_visits,public.defects,public.assets,public.suppliers,public.warehouses,public.inventory_items,
 public.stock_movements,public.purchase_orders,public.purchase_order_items,public.compliance_documents,public.tasks,public.task_comments,
 public.record_attachments to authenticated;
grant select,insert on public.audit_events to authenticated;

-- Append-only audit records: authenticated users cannot update/delete their audit history.
revoke update,delete on public.audit_events from authenticated;
