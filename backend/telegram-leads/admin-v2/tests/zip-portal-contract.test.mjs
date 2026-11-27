import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../../../../' + path, import.meta.url), 'utf8');

test('public website uses the ZIP reference, local assets and responsive mobile support', () => {
  const html = read('index.html');
  assert.match(html, /css\/zip-website\.css/);
  assert.match(html, /js\/supabase-config\.js/);
  assert.match(html, /js\/analytics\.js/);
  assert.match(html, /js\/zip-public-app\.js/);
  assert.match(html, /id="mobile-social-dock"/);
  assert.match(html, /id="site-map-frame"/);
  assert.match(html, /id="home-products-grid"/);
  assert.match(html, /id="home-services-grid"/);
  assert.doesNotMatch(html, /lh3\.googleusercontent\.com|PUBLIC_PROJECTS|Vikram Deshmukh|Rajeshwari Nair/);
  assert.doesNotMatch(html, /\+91 22 4018 9200|info@karmafireprotection\.com|Navi Mumbai, Maharashtra, India/);
});

test('public website content, enquiry and review forms are Supabase-backed', () => {
  const js = read('js/zip-public-app.js');
  for (const table of ['website_site_settings','services','team_members','public_portfolio_projects','public_testimonials','products','social_links','website_cms_published','leads']) {
    assert.match(js, new RegExp("from\\(['\"]" + table + "['\"]\\)"));
  }
  assert.match(js, /handleLeadSubmit=submitLead/);
  assert.match(js, /contact_method/);
  assert.match(js, /moderation_status:'pending'/);
  assert.match(js, /DEMO REVIEW/);
  assert.match(js, /DEMO CONTENT/);
  assert.match(js, /is_demo/);
  assert.match(js, /KarmaAnalytics/);
  assert.match(js, /tel:','mailto:/);
  assert.doesNotMatch(js, /PUBLIC_PROJECTS|PUBLIC_TEAM|PUBLIC_REVIEWS/);
});

test('admin portal uses the ZIP desktop layout and responsive mobile navigation', () => {
  const html = read('backend/telegram-leads/admin-v2/index.html');
  assert.match(html, /assets\/zip-portal\.css/);
  assert.match(html, /js\/zip-admin\.js/);
  assert.match(html, /mobile-portal-header/);
  assert.match(html, /mobile-drawer/);
  assert.match(html, /mobile-bottom-nav/);
  assert.match(html, /id="login-email"/);
  assert.match(html, /id="login-pass"/);
  assert.doesNotMatch(html, /value="admin@karmafireprotection\.com"|value="••••|data:image\/png;base64|lh3\.googleusercontent\.com|data-stitch-original-script/);
});

test('admin portal uses Supabase auth, database roles and real CRUD/CMS workflows', () => {
  const js = read('backend/telegram-leads/admin-v2/js/zip-admin.js');
  assert.match(js, /auth\.signInWithPassword/);
  assert.match(js, /rpc\('resolve_current_role'\)/);
  assert.match(js, /website_editor/);
  assert.match(js, /is_demo/);
  for (const table of ['leads','services','products','team_members','public_portfolio_projects','public_testimonials','social_links','website_site_settings','website_cms_drafts','website_cms_versions','analytics_events','website_audit_insights']) {
    assert.ok(js.includes(table), 'admin portal should use ' + table);
  }
  for (const rpc of ['cms_save_draft','cms_publish_page','cms_restore_version','generate_website_audit_insights']) {
    assert.ok(js.includes(rpc), 'admin portal should call ' + rpc);
  }
  assert.match(js, /requestQuery/);
  assert.match(js, /mobile-bottom-nav/);
});

test('Supabase migration creates secure editable website content and labelled demo records', () => {
  const sql = read('supabase/migrations/20261128120000_zip_website_admin_portal.sql');
  for (const token of ['website_site_settings','is_demo','moderation_status','admin_reply','can_manage_website_content','cms_save_draft','cms_publish_page','cms_restore_version','grant insert on public.leads to anon,authenticated','website_site_settings_public_read']) {
    assert.ok(sql.toLowerCase().includes(token.toLowerCase()), 'migration should include ' + token);
  }
  assert.match(sql, /Sample Fire Hydrant Landing Valve/);
  assert.match(sql, /Sample Operations Lead/);
  assert.match(sql, /Sample Commercial Fire Protection Project/);
  assert.match(sql, /5,true,true/);
  assert.match(sql, /DEMO REVIEW/);
  assert.doesNotMatch(sql, /truncate\s+table|delete\s+from\s+public\.leads|delete\s+from\s+public\.analytics_events|delete\s+from\s+public\.website_consent_records/i);
  const seedSection = sql.slice(sql.indexOf('insert into public.website_site_settings'));
  assert.doesNotMatch(seedSection, /do update set/i);
  assert.match(sql, /return v;/);
  assert.match(sql, /on conflict\\(slug\\) do update set content=excluded.content/i);
  assert.match(sql, /drop policy if exists .*Website roles manage team/i);
});

test('README contains GitHub Pages website, admin login and repository URLs', () => {
  const readme = read('README.md');
  assert.match(readme, /https:\/\/ns-matrix\.github\.io\/karma-fire-protection0\//);
  assert.match(readme, /https:\/\/ns-matrix\.github\.io\/karma-fire-protection0\/backend\/telegram-leads\/admin-v2\/index\.html/);
  assert.match(readme, /https:\/\/github\.com\/ns-matrix\/karma-fire-protection0/);
  assert.match(readme, /Vikhroli West/);
  assert.match(readme, /demo product records/);
});

test('old public and admin entry points route into the new ZIP applications', () => {
  for (const [path, route] of [['about.html','#about'],['services.html','#services'],['projects.html','#projects'],['contact.html','#contact'],['privacy-policy.html','#privacy-policy']]) {
    assert.ok(read(path).includes(route), path + ' should redirect into the new public app');
  }
  assert.match(read('backend/telegram-leads/admin/index.html'), /admin-v2\/index\.html/);
  assert.match(read('backend/telegram-leads/admin-v2/cms-editor.html'), /index\.html#cms/);
  assert.match(read('backend/telegram-leads/admin-v2/website-analytics.html'), /index\.html#analytics/);
});
