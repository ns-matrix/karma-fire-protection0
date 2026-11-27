import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { dashboardMetrics, dashboardRole, hasDashboardPermission, roleLabel } from "./dashboard-rules.js";

const config = window.KARMA_SUPABASE || {};
const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.url || "") &&
  config.anonKey && !/YOUR_|PLACEHOLDER/i.test(config.anonKey);
const db = configured ? createClient(config.url, config.anonKey) : null;
const root = document.getElementById("role-dashboard-root");
const legacy = [...document.querySelectorAll("#view-dashboard > :not(#role-dashboard-root)")];
let current = null;

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

const formatDate = (value, options = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) =>
  value ? new Date(value).toLocaleString(undefined, options) : "Date not set";

function can(module, action = "read") {
  return current && hasDashboardPermission(current.role, current.permissions, module, action);
}

async function countRecords(metric) {
  let query = db.from(metric.table).select("*", { count: "exact", head: true });
  if (metric.filter) query = query.eq(metric.filter[0], metric.filter[1]);
  const { count, error } = await query;
  return error ? null : (count ?? 0);
}

async function loadTasks() {
  if (!can("tasks")) return [];
  const { data, error } = await db.from("tasks")
    .select("id,title,status,priority,due_at,task_type")
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(5);
  return error ? { error: error.message } : (data || []);
}

async function loadVisits() {
  if (!can("service")) return [];
  const { data, error } = await db.from("service_visits")
    .select("id,visit_number,visit_type,scheduled_start,status")
    .gte("scheduled_start", new Date().toISOString().slice(0, 10))
    .order("scheduled_start", { ascending: true })
    .limit(5);
  return error ? { error: error.message } : (data || []);
}

async function loadRecentEnquiries() {
  if (!can("leads")) return [];
  const { data, error } = await db.from("leads")
    .select("id,lead_number,name,service,status,created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  return error ? { error: error.message } : (data || []);
}

async function loadAudit() {
  if (dashboardRole(current.role) !== "super_admin") return [];
  const { data, error } = await db.from("audit_events")
    .select("id,action,module,outcome,created_at")
    .order("created_at", { ascending: false })
    .limit(4);
  return error ? { error: error.message } : (data || []);
}

function metricCard(metric, value) {
  const shown = value === null ? "—" : Number(value).toLocaleString();
  return `<article class="rd-kpi">
    <span class="rd-kpi-label">${escapeHtml(metric.label)}</span>
    <strong>${shown}</strong>
    <small>${value === null ? "Not available" : "Live records"}</small>
  </article>`;
}

function renderList(items, empty, row) {
  if (items?.error) return `<div class="rd-empty">Could not load: ${escapeHtml(items.error)}</div>`;
  if (!items?.length) return `<div class="rd-empty">${escapeHtml(empty)}</div>`;
  return items.map(row).join("");
}

function renderTasks(tasks) {
  return renderList(tasks, "No pending tasks.", (task) => `
    <div class="rd-row">
      <div class="rd-row-icon">✓</div>
      <div class="rd-row-copy"><strong>${escapeHtml(task.title)}</strong>
        <small>${escapeHtml(task.task_type || "Task")} · Due ${escapeHtml(formatDate(task.due_at, { day: "numeric", month: "short" }))}</small>
      </div>
      <span class="rd-status ${escapeHtml(task.priority || "normal")}">${escapeHtml(task.status || "Open")}</span>
    </div>`);
}

function renderVisits(visits) {
  return renderList(visits, "No upcoming service visits.", (visit) => `
    <div class="rd-row">
      <div class="rd-row-icon red">◷</div>
      <div class="rd-row-copy"><strong>${escapeHtml("Visit #" + (visit.visit_number || "—"))}</strong>
        <small>${escapeHtml(visit.visit_type || "Service")} · ${escapeHtml(formatDate(visit.scheduled_start))}</small>
      </div>
      <span class="rd-status">${escapeHtml(visit.status || "Scheduled")}</span>
    </div>`);
}

function renderEnquiries(enquiries) {
  return renderList(enquiries, "No recent enquiries.", (lead) => `
    <div class="rd-row">
      <div class="rd-row-icon">▤</div>
      <div class="rd-row-copy"><strong>${escapeHtml(lead.name || "New enquiry")}</strong>
        <small>${escapeHtml(lead.lead_number ? "KFP-" + lead.lead_number : "New request")} · ${escapeHtml(lead.service || "General enquiry")}</small>
      </div>
      <span class="rd-status">${escapeHtml(lead.status || "New")}</span>
    </div>`);
}

function renderAudit(audit) {
  return renderList(audit, "No recent security events.", (event) => `
    <div class="rd-row">
      <div class="rd-row-icon red">◆</div>
      <div class="rd-row-copy"><strong>${escapeHtml(event.action)}</strong>
        <small>${escapeHtml(event.module)} · ${escapeHtml(formatDate(event.created_at))}</small>
      </div>
      <span class="rd-status">${escapeHtml(event.outcome || "Recorded")}</span>
    </div>`);
}

function render(role, metrics, values, tasks, visits, enquiries, audit) {
  const mode = dashboardRole(role);
  const heading = mode === "super_admin" ? "System overview" : mode === "admin" ? "Business overview" : "My workspace";
  const description = mode === "super_admin"
    ? "A clear view of business operations and system health."
    : mode === "admin"
      ? "Your key customer, project and service activity."
      : "Your assigned work and upcoming activity.";
  const cards = metrics.map((metric) => metricCard(metric, values[metric.key])).join("");
  const panels = [];

  if (can("leads")) {
    panels.push(`<article class="rd-panel">
      <div class="rd-panel-head"><div><span class="rd-eyebrow">CUSTOMER PIPELINE</span><h3>Recent enquiries</h3></div>
        <button type="button" class="rd-link" data-open-view="enquiries">View all →</button>
      </div>
      <div class="rd-list">${renderEnquiries(enquiries)}</div>
    </article>`);
  }

  if (can("tasks") || can("service") || mode === "super_admin") {
    panels.push(`<article class="rd-panel">
      <div class="rd-panel-head"><div><span class="rd-eyebrow">OPERATIONS</span><h3>Upcoming work</h3></div></div>
      ${can("tasks") ? `<div class="rd-subsection"><div class="rd-subhead"><b>Tasks</b><span>${Array.isArray(tasks) ? tasks.length : "!"}</span></div><div class="rd-list">${renderTasks(tasks)}</div></div>` : ""}
      ${can("service") ? `<div class="rd-subsection"><div class="rd-subhead"><b>Service visits</b><span>${Array.isArray(visits) ? visits.length : "!"}</span></div><div class="rd-list">${renderVisits(visits)}</div></div>` : ""}
      ${mode === "super_admin" ? `<div class="rd-subsection"><div class="rd-subhead"><b>Recent security activity</b><button type="button" class="rd-link" data-open-view="control">View audit →</button></div><div class="rd-list">${renderAudit(audit)}</div></div>` : ""}
    </article>`);
  }

  root.innerHTML = `
    <section class="rd-welcome">
      <div><span class="rd-eyebrow">KARMA FIRE PROTECTION · ${escapeHtml(roleLabel(role).toUpperCase())}</span>
        <h2>${escapeHtml(heading)}</h2><p>${escapeHtml(description)}</p>
      </div>
      <div class="rd-date"><span>Today</span><strong>${escapeHtml(new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }))}</strong></div>
    </section>
    <section class="rd-kpis" aria-label="Dashboard metrics">
      ${cards || '<div class="rd-empty">No dashboard data is assigned to this account.</div>'}
    </section>
    <section class="rd-grid">${panels.join("") || '<article class="rd-panel"><div class="rd-empty">No work is assigned to your account yet.</div></article>'}</section>
    <p class="rd-footnote">Figures and lists are limited to records your account is permitted to access.</p>
  `;

  root.querySelectorAll("[data-open-view]").forEach((button) => button.addEventListener("click", () => {
    const target = document.querySelector(`[data-view="${CSS.escape(button.dataset.openView)}"]`);
    if (target && !target.classList.contains("hidden")) target.click();
  }));
}

async function loadDashboard() {
  if (!current || !root) return;
  root.classList.remove("hidden");
  legacy.forEach((element) => element.classList.add("hidden"));
  if (!db) {
    root.innerHTML = '<div class="rd-empty">Dashboard connection is unavailable. Check the Supabase configuration and refresh.</div>';
    return;
  }
  root.innerHTML = '<div class="rd-loading"><span></span> Loading dashboard…</div>';

  const metrics = dashboardMetrics(current.role, current.permissions);
  const [metricValues, tasks, visits, enquiries, audit] = await Promise.all([
    Promise.all(metrics.map(countRecords)),
    loadTasks(),
    loadVisits(),
    loadRecentEnquiries(),
    loadAudit()
  ]);
  const values = Object.fromEntries(metrics.map((metric, index) => [metric.key, metricValues[index]]));
  render(current.role, metrics, values, tasks, visits, enquiries, audit);
}

document.getElementById("refresh")?.addEventListener("click", () => loadDashboard());
document.querySelector('[data-view="dashboard"]')?.addEventListener("click", () => loadDashboard());

window.addEventListener("karma:authorized", (event) => {
  current = event.detail || null;
  loadDashboard().catch((error) => {
    console.error("Role dashboard failed", error);
    if (root) root.innerHTML = '<div class="rd-empty">Dashboard could not be loaded. Refresh and try again.</div>';
  });
});

