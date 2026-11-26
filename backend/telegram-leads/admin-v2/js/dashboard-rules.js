export const DASHBOARD_MODULES = Object.freeze({
  enquiries: "leads",
  customers: "customers",
  projects: "projects",
  surveys: "surveys",
  service: "service",
  tasks: "tasks",
  inventory: "inventory",
  compliance: "compliance",
  employees: "employees"
});

export function dashboardRole(role) {
  if (role === "super_admin") return "super_admin";
  if (role === "admin") return "admin";
  return "team_member";
}

export function roleLabel(role) {
  const mode = dashboardRole(role);
  return mode === "super_admin" ? "Super Admin" : mode === "admin" ? "Admin" : "Team Member";
}

export function hasDashboardPermission(role, permissions = [], module, action = "read") {
  const mode = dashboardRole(role);
  if (mode === "super_admin" || mode === "admin") return true;
  return Array.isArray(permissions) && permissions.some((grant) =>
    grant.module === module && (grant.action === action || grant.action === "*")
  );
}

export function dashboardMetrics(role, permissions = []) {
  if (dashboardRole(role) !== "team_member") {
    return [
      { key: "leads", label: "Total enquiries", table: "leads", module: "leads" },
      { key: "customers", label: "Customers", table: "customers", module: "customers" },
      { key: "projects", label: "Projects", table: "projects", module: "projects" },
      { key: "visits", label: "Service visits", table: "service_visits", module: "service" },
      { key: "employees", label: "Team members", table: "employee_profiles", module: "employees", filter: ["employment_status", "active"] },
      ...(role === "super_admin" ? [{ key: "audit", label: "Audit events", table: "audit_events", module: "audit" }] : [])
    ];
  }

  const available = [
    { key: "tasks", label: "Visible tasks", table: "tasks", module: "tasks" },
    { key: "visits", label: "Visible visits", table: "service_visits", module: "service" },
    { key: "surveys", label: "Visible surveys", table: "site_surveys", module: "surveys" },
    { key: "projects", label: "Visible projects", table: "projects", module: "projects" },
    { key: "leads", label: "Visible enquiries", table: "leads", module: "leads" }
  ];
  return available.filter((metric) => hasDashboardPermission(role, permissions, metric.module));
}
