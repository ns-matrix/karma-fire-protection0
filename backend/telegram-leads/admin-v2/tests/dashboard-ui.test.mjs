import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../../../", import.meta.url);
const dashboard = await readFile(new URL("backend/telegram-leads/admin-v2/js/role-dashboard.js", root), "utf8");
const html = await readFile(new URL("backend/telegram-leads/admin-v2/index.html", root), "utf8");

test("dashboard contains no redundant tabs or shortcut tile wall", () => {
  assert.doesNotMatch(dashboard, /Quick actions|rd-quick|rd-actions|rd-action/);
  assert.doesNotMatch(dashboard, /data-tab|role="tablist"/);
  assert.match(dashboard, /Recent enquiries/);
  assert.match(dashboard, /Upcoming work/);
});

test("dashboard only renders security activity for Super Admin", () => {
  assert.match(dashboard, /mode === "super_admin"/);
  assert.match(dashboard, /renderAudit\(audit\)/);
  assert.match(dashboard, /dashboardRole\(current\.role\) !== "super_admin"/);
  assert.doesNotMatch(dashboard, /actor_user_id|privileged email/i);
});

test("dashboard markup has one clean root with no old duplicate panels", () => {
  const start = html.indexOf('<section id="view-dashboard"');
  const end = html.indexOf("</section>", start);
  const dashboardSection = html.slice(start, end + "</section>".length);
  assert.match(dashboardSection, /id="role-dashboard-root"/);
  assert.doesNotMatch(dashboardSection, /class="welcome"|kpi-grid|content-grid|module-grid|data-tab/);
});
