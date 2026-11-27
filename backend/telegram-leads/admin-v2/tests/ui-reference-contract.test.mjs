import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

test("all public pages load the shared reference theme without replacing page modules", () => {
  const theme = read("css/reference-theme.css");
  assert.match(theme, /--fire-red:\s*#E54826/);
  assert.match(theme, /#0F244A/);
  assert.match(theme, /@media\(max-width:768px\)/);
  for (const page of ["index.html", "about.html", "services.html", "projects.html", "contact.html", "privacy-policy.html"]) {
    const html = read(page);
    assert.match(html, /css\/reference-theme\.css/, page + " must load the theme");
    assert.match(html, /js\/navigation\.js/, page + " must keep navigation");
  }
});

test("public enquiry form preserves Supabase field names, validation hooks and honeypot", () => {
  const html = read("contact.html");
  for (const id of ["lead-form", "website", "name", "phone", "email"]) assert.match(html, new RegExp('id="' + id + '"'));
  for (const name of ["website", "name", "phone", "email", "company", "building_type", "service", "location", "message", "contact_method", "consent"]) {
    assert.match(html, new RegExp('name="' + name + '"'));
  }
  assert.match(html, /class="form-status"/);
  assert.match(read("js/forms.js"), /from\('leads'\)\.insert\(payload\)/);
  assert.match(read("js/validation.js"), /function validateForm/);
});

test("admin authentication selectors and role-aware modules remain present", () => {
  const html = read("backend/telegram-leads/admin-v2/index.html");
  for (const id of ["login-form", "email", "password", "login-error", "mobile-nav-toggle", "app"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html, /data-view="dashboard"/);
  assert.match(html, /data-view="enquiries"/);
  assert.match(html, /website-analytics\.html/);
  assert.match(html, /cms-editor\.html/);
});

test("responsive admin drawer is wired to the existing sidebar and keyboard controls", () => {
  const js = read("backend/telegram-leads/admin-v2/js/admin.js");
  const css = read("backend/telegram-leads/admin-v2/assets/admin.css");
  assert.match(js, /bindResponsiveAdminNavigation/);
  assert.match(js, /event\.key==="Escape"/);
  assert.match(js, /sidebar\.classList\.add\("open"\)/);
  assert.match(css, /#0F244A/);
  assert.match(css, /#F4F7FC/);
  assert.match(css, /@media\(max-width:1023px\)/);
});
