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

test("legacy dashboard cards are hidden when role-aware dashboard loads", () => {
  assert.match(dashboard, /legacy\.forEach/);
  assert.match(html, /id="role-dashboard-root"/);
});
