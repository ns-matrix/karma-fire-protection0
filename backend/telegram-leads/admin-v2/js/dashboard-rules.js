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
  const mode = dashboardRole(role);
  if (mode === "admin") {
    return [
      { key: "leads", label: "Total enquiries", table: "leads", module: "leads" },
      { key: "customers", label: "Customers", table: "customers", module: "customers" },
      { key: "projects", label: "Projects", table: "projects", module: "projects" },
      { key: "visits", label: "Service visits", table: "service_visits", module: "service" }
    ];
  }
  if (mode === "super_admin") {
    return [
      { key: "leads", label: "Total enquiries", table: "leads", module: "leads" },
      { key: "projects", label: "Projects", table: "projects", module: "projects" },
      { key: "visits", label: "Service visits", table: "service_visits", module: "service" },
      { key: "audit", label: "Audit events", table: "audit_events", module: "audit" }
    ];
  }

  const available = [
    { key: "tasks", label: "Assigned tasks", table: "tasks", module: "tasks" },
    { key: "visits", label: "Service visits", table: "service_visits", module: "service" },
    { key: "projects", label: "Projects", table: "projects", module: "projects" },
    { key: "leads", label: "Enquiries", table: "leads", module: "leads" },
    { key: "surveys", label: "Surveys", table: "site_surveys", module: "surveys" }
  ];
  return available.filter((metric) => hasDashboardPermission(role, permissions, metric.module)).slice(0, 4);
}
