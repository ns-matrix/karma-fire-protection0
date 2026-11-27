import test from "node:test";
import assert from "node:assert/strict";
import { dashboardMetrics, dashboardRole, hasDashboardPermission, roleLabel } from "../js/dashboard-rules.js";

test("only the two privileged account types receive their elevated dashboard modes", () => {
  assert.equal(dashboardRole("super_admin"), "super_admin");
  assert.equal(dashboardRole("admin"), "admin");
  assert.equal(dashboardRole("sales_manager"), "team_member");
  assert.equal(dashboardRole("business_admin"), "team_member");
  assert.equal(roleLabel("sales_manager"), "Team Member");
});

test("Team Member metrics are limited to granted modules", () => {
  const grants = [
    { module: "tasks", action: "read", scope: "assigned" },
    { module: "service", action: "read", scope: "assigned" }, { module: "service", action: "update", scope: "assigned" }
  ];
  assert.deepEqual(dashboardMetrics("service_technician", grants).map((item) => item.key), ["tasks", "visits"]);
  assert.equal(hasDashboardPermission("service_technician", grants, "service", "read"), true);
  assert.equal(hasDashboardPermission("service_technician", grants, "service", "update"), true);
});

test("Admin receives operational metrics but no audit metric", () => {
  const keys = dashboardMetrics("admin").map((item) => item.key);
  assert.ok(keys.includes("leads"));
  assert.ok(keys.includes("customers"));
  assert.ok(!keys.includes("audit"));
});

test("Super Admin receives audit metric", () => {
  assert.ok(dashboardMetrics("super_admin").some((item) => item.key === "audit"));
});

test("unknown or employee role cannot acquire admin access from a permission-shaped payload", () => {
  const grants = [{ module: "employees", action: "*", scope: "all" }];
  assert.equal(hasDashboardPermission("employee", grants, "employees"), true);
  assert.equal(hasDashboardPermission("employee", [], "audit"), false);
});

test("Admin and Super Admin dashboards stay focused on four primary metrics", () => {
  const admin = dashboardMetrics("admin");
  const superAdmin = dashboardMetrics("super_admin");
  assert.equal(admin.length, 4);
  assert.deepEqual(admin.map((item) => item.key), ["leads", "customers", "projects", "visits"]);
  assert.equal(superAdmin.length, 4);
  assert.deepEqual(superAdmin.map((item) => item.key), ["leads", "projects", "visits", "audit"]);
});
