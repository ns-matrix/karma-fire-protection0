import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../../../', import.meta.url);
const analytics = await readFile(new URL('js/analytics.js', root), 'utf8');
const adminHtml = await readFile(new URL('backend/telegram-leads/admin-v2/index.html', root), 'utf8');
const adminJs = await readFile(new URL('backend/telegram-leads/admin-v2/js/admin.js', root), 'utf8');
const auditHtml = await readFile(new URL('backend/telegram-leads/admin-v2/visitor-audit.html', root), 'utf8');

test('accepted analytics consent stays quiet and does not expose a reopen control', () => {
  assert.match(analytics, /if\(consent\(\)==='granted'\|\|d\.getElementById\('karma-consent-banner'\)\)return/);
  assert.match(analytics, /localStorage\.setItem\(C,x\)/);
  assert.doesNotMatch(analytics, /karma-cookie-settings|Cookie settings/);
  assert.doesNotMatch(analytics, /cookie\(C,x,365\)/);
});

test('declining hides the banner temporarily and prompts again after five seconds', () => {
  assert.match(analytics, /consentRetry=setTimeout\(\(\)=>\{consentRetry=null;if\(consent\(\)!=='granted'\)banner\(\)\},5000\)/);
  assert.match(analytics, /id="kdecline" class="karma-consent-secondary">Decline/);
  assert.match(analytics, /id="kaccept" class="karma-consent-primary">Accept/);
});

test('admin navigation is grouped and role-gated', () => {
  assert.match(adminHtml, /<details class="nav-group"/);
  assert.match(adminHtml, /class="nav admin-only-nav"/);
  assert.match(adminHtml, /id="super-entry"/);
  assert.match(adminJs, /classList\.toggle\("hidden",!isAdmin\)/);
  assert.match(adminJs, /role!=="super_admin"/);
});

test('visitor audit sections use an accessible side tab rail', () => {
  assert.match(auditHtml, /class="audit-workspace"/);
  assert.match(auditHtml, /role="tablist"/);
  assert.match(auditHtml, /aria-selected="true"/);
});
