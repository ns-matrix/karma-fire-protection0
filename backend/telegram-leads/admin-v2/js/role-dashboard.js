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
  if (!db) return null;
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
    .limit(6);
  if (error) return { error: error.message };
  return data || [];
}

async function loadVisits() {
  if (!can("service")) return [];
  const { data, error } = await db.from("service_visits")
    .select("id,visit_number,visit_type,scheduled_start,status")
    .gte("scheduled_start", new Date().toISOString().slice(0, 10))
    .order("scheduled_start", { ascending: true })
    .limit(6);
  if (error) return { error: error.message };
  return data || [];
}

async function loadRecentEnquiries() {
  if (!can("leads")) return [];
  const { data, error } = await db.from("leads")
    .select("id,lead_number,name,service,status,created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) return { error: error.message };
  return data || [];
}

async function loadAudit() {
  if (dashboardRole(current.role) !== "super_admin") return [];
  const { data, error } = await db.from("audit_events")
    .select("id,action,module,outcome,created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) return { error: error.message };
  return data || [];
}

function metricCard(metric, value) {
  const shown = value === null ? "—" : Number(value).toLocaleString();
  return `<article class="rd-kpi"><div class="rd-kpi-label">${escapeHtml(metric.label)}</div><strong>${shown}</strong><small>${value === null ? "Unavailable for this session" : "Live records visible to your account"}</small></article>`;
}

function renderList(items, empty, row) {
  if (items?.error) return `<div class="rd-empty">Could not load this section: ${escapeHtml(items.error)}</div>`;
  if (!items?.length) return `<div class="rd-empty">${escapeHtml(empty)}</div>`;
  return items.map(row).join("");
}

function actionButton(label, view, icon = "↗") {
  return `<button class="rd-action" type="button" data-open-view="${escapeHtml(view)}"><span>${icon}</span>${escapeHtml(label)}<b>→</b></button>`;
}

function render(role, metrics, values, tasks, visits, enquiries, audit) {
  const mode = dashboardRole(role);
  const heading = mode === "super_admin" ? "System overview" : mode === "admin" ? "Business overview" : "My workspace";
  const description = mode === "super_admin"
    ? "A secure, system-wide view of operations, team access and platform activity."
    : mode === "admin"
      ? "Keep customer work, delivery teams and service operations moving."
      : "Your permitted work, upcoming visits and next actions in one place.";
  const cards = metrics.map((metric) => metricCard(metric, values[metric.key])).join("");
  const quickActions = mode === "team_member"
    ? [
        can("tasks") && actionButton("Open tasks", "tasks", "✓"),
        can("service") && actionButton("Service visits", "service", "◷"),
        can("surveys") && actionButton("Surveys & audits", "surveys", "⌕"),
        can("projects") && actionButton("Projects", "projects", "◫"),
        can("leads") && actionButton("Enquiries", "enquiries", "▤")
      ].filter(Boolean).join("")
    : [
        actionButton("Manage enquiries", "enquiries", "▤"),
        actionButton("View projects", "projects", "◫"),
        actionButton("Team & admins", "team", "♙"),
        actionButton("Operational reports", "reports", "▥")
      ].join("");

  root.innerHTML = `
    <section class="rd-welcome">
      <div><div class="rd-eyebrow">KARMA FIRE PROTECTION · ${escapeHtml(roleLabel(role).toUpperCase())}</div>
      <h2>${escapeHtml(heading)}</h2><p>${escapeHtml(description)}</p></div>
      <div class="rd-date"><span>Today</span><strong>${escapeHtml(new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }))}</strong></div>
    </section>
    <section class="rd-kpis" aria-label="Dashboard metrics">${cards || '<div class="rd-empty">No dashboard modules have been assigned to this account yet.</div>'}</section>
    <section class="rd-grid">
      ${can("tasks") ? `<article class="rd-panel"><div class="rd-panel-head"><div><span class="rd-eyebrow">WORK QUEUE</span><h3>${mode === "team_member" ? "Your work queue" : "Upcoming tasks"}</h3></div><span class="rd-chip">${Array.isArray(tasks) ? tasks.length : "!"} items</span></div>
        <div class="rd-list">${renderList(tasks, "No tasks are currently visible for your account.", (task) => `<div class="rd-row"><div class="rd-row-icon">✓</div><div class="rd-row-copy"><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.task_type || "Task")} · Due ${escapeHtml(formatDate(task.due_at, { day: "numeric", month: "short" }))}</small></div><span class="rd-status ${escapeHtml(task.priority || "normal")}">${escapeHtml(task.status || "open")}</span></div>`)}</div>
      </article>` : ""}
      ${can("service") ? `<article class="rd-panel"><div class="rd-panel-head"><div><span class="rd-eyebrow">FIELD OPERATIONS</span><h3>Upcoming visits</h3></div><span class="rd-chip">${Array.isArray(visits) ? visits.length : "!"} scheduled</span></div>
        <div class="rd-list">${renderList(visits, "No upcoming visits are visible for your account.", (visit) => `<div class="rd-row"><div class="rd-row-icon red">◷</div><div class="rd-row-copy"><strong>${escapeHtml("Visit #" + visit.visit_number)}</strong><small>${escapeHtml(visit.visit_type || "Service")} · ${escapeHtml(formatDate(visit.scheduled_start))}</small></div><span class="rd-status">${escapeHtml(visit.status || "scheduled")}</span></div>`)}</div>
      </article>` : ""}
      ${can("leads") ? `<article class="rd-panel"><div class="rd-panel-head"><div><span class="rd-eyebrow">CUSTOMER PIPELINE</span><h3>Recent enquiries</h3></div><button type="button" class="rd-link" data-open-view="enquiries">View all →</button></div>
        <div class="rd-list">${renderList(enquiries, "No enquiries are visible for your account.", (lead) => `<div class="rd-row"><div class="rd-row-icon">▤</div><div class="rd-row-copy"><strong>${escapeHtml(lead.name || "New enquiry")}</strong><small>${escapeHtml("KFP-" + lead.lead_number)} · ${escapeHtml(lead.service || "General enquiry")}</small></div><span class="rd-status">${escapeHtml(lead.status || "New")}</span></div>`)}</div></article>` : ""}
      ${mode === "super_admin" ? `<article class="rd-panel"><div class="rd-panel-head"><div><span class="rd-eyebrow">GOVERNANCE</span><h3>Recent security activity</h3></div><button type="button" class="rd-link" data-open-view="control">Open system control →</button></div>
        <div class="rd-list">${renderList(audit, "No audit events are currently available.", (event) => `<div class="rd-row"><div class="rd-row-icon red">◆</div><div class="rd-row-copy"><strong>${escapeHtml(event.action)}</strong><small>${escapeHtml(event.module)} · ${escapeHtml(formatDate(event.created_at))}</small></div><span class="rd-status">${escapeHtml(event.outcome || "recorded")}</span></div>`)}</div></article>` : ""}
    </section>
    <section class="rd-panel rd-quick"><div class="rd-panel-head"><div><span class="rd-eyebrow">SHORTCUTS</span><h3>Quick actions</h3></div></div><div class="rd-actions">${quickActions || '<p class="rd-empty">No quick actions are available for your assigned permissions.</p>'}</div></section>
    <p class="rd-footnote">Dashboard totals reflect records returned by Supabase under your current account permissions. Restricted records are not fetched or counted.</p>
  `;
  root.querySelectorAll("[data-open-view]").forEach((button) => button.addEventListener("click", () => {
    const target = document.querySelector(`[data-view="${CSS.escape(button.dataset.openView)}"]`);
    if (target && !target.classList.contains("hidden")) target.click();
  }));
}

async function loadDashboard() {
  if (!current || !db || !root) return;
  root.classList.remove("hidden");
  legacy.forEach((element) => element.classList.add("hidden"));
  root.innerHTML = '<div class="rd-loading"><span></span> Loading your permission-scoped dashboard…</div>';

  const metrics = dashboardMetrics(current.role, current.permissions);
  const tasksPromise = loadTasks();
  const visitsPromise = loadVisits();
  const enquiriesPromise = loadRecentEnquiries();
  const auditPromise = loadAudit();
  const [metricValues, tasks, visits, enquiries, audit] = await Promise.all([
    Promise.all(metrics.map(countRecords)),
    tasksPromise, visitsPromise, enquiriesPromise, auditPromise
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

function closeMobileNav() {
  document.querySelector(".sidebar")?.classList.remove("open");
  document.getElementById("mobile-nav-toggle")?.setAttribute("aria-expanded", "false");
}
document.getElementById("mobile-nav-toggle")?.addEventListener("click", () => {
  const sidebar = document.querySelector(".sidebar");
  const isOpen = sidebar?.classList.toggle("open") || false;
  document.getElementById("mobile-nav-toggle")?.setAttribute("aria-expanded", String(isOpen));
});
document.querySelector(".sidebar")?.addEventListener("click", (event) => {
  if (event.target.closest("[data-view]")) closeMobileNav();
});
document.body.addEventListener("click", (event) => {
  const sidebar = document.querySelector(".sidebar");
  const toggle = document.getElementById("mobile-nav-toggle");
  if (sidebar?.classList.contains("open") && !sidebar.contains(event.target) && !toggle?.contains(event.target)) closeMobileNav();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMobileNav();
});
