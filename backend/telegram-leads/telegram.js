/* ============================================
   TELEGRAM: notifications + admin bot CRM
   All secrets come from environment variables.
   Uses CSV storage (no SQLite)
   ============================================ */
'use strict';

const csvStore = require('./csv-store');
const { escapeHtml } = require('./validate');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const ADMIN_IDS = String(process.env.ADMIN_TELEGRAM_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const API = `https://api.telegram.org/bot${TOKEN}`;

const HELP_TEXT = `🔧 <b>Karma Fire Protection — Lead Bot CRM</b>

<b>Lead Management:</b>
/latest — Show 5 most recent leads
/today — Enquiries received today
/leads — Summary with status breakdown
/search <query> — Search by name, phone or Lead ID
/status <LeadID> <Status> — Update lead status
/export — Download all leads as CSV

<b>Website Intelligence & Analytics:</b>
/visitors — Visitor counts, sessions, and top pages
/sources — Traffic source & campaign attribution breakdown
/stats — Overall lead metrics and top requested services

<b>System:</b>
/settings — Bot configuration and status
/help — Show this help menu`;

const STATUSES = csvStore.VALID_STATUSES;

/* ---------- Low-level API ---------- */
async function tg(method, payload) {
  if (!TOKEN) return { ok: false, description: 'Token not configured' };
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000)
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) {
    console.warn(`Telegram ${method} failed:`, data.description || res.status);
  }
  return data;
}

async function sendMessage(chatId, text, extra = {}) {
  return tg('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...extra
  });
}

function isAdmin(userId) {
  return ADMIN_IDS.includes(String(userId));
}

/* ---------- New lead notification ---------- */
async function notifyNewLead(lead) {
  if (!TOKEN || !CHAT_ID) {
    console.warn('Telegram not configured — lead saved but not notified.');
    return { ok: false, reason: 'not_configured' };
  }

  const attributionLines = [];
  if (lead.source) attributionLines.push(`🌐 Source: <b>${escapeHtml(lead.source)}</b>`);
  if (lead.utmMedium) attributionLines.push(`📡 Medium: <b>${escapeHtml(lead.utmMedium)}</b>`);
  if (lead.utmCampaign) attributionLines.push(`🎯 Campaign: <b>${escapeHtml(lead.utmCampaign)}</b>`);
  if (lead.referrer) attributionLines.push(`📄 Referrer: <code>${escapeHtml(lead.referrer)}</code>`);

  const text = [
    '🚨 <b>NEW WEBSITE ENQUIRY</b>',
    '',
    `🆔 Lead ID: <b>${escapeHtml(lead.id)}</b>`,
    `👤 Name: <b>${escapeHtml(lead.name)}</b>`,
    `📱 Phone: <b><a href="tel:${escapeHtml(lead.phone)}">${escapeHtml(lead.phone)}</a></b>`,
    `📧 Email: <a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a>`,
    `🏢 Company: ${escapeHtml(lead.company || '—')}`,
    '',
    '🔥 <b>Service Requested:</b>',
    `<b>${escapeHtml(lead.service)}</b>`,
    '',
    `📝 Message: ${escapeHtml(lead.message || '—')}`,
    '',
    attributionLines.join('\n'),
    `🕒 Submitted: ${escapeHtml(lead.createdAt)} (UTC)`
  ].filter(Boolean).join('\n');

  const keyboard = {
    inline_keyboard: [
      [
        { text: '📞 Contacted', callback_data: `st:${lead.id}:Contacted` },
        { text: '⭐ Qualified', callback_data: `st:${lead.id}:Qualified` }
      ],
      [
        { text: '⚙️ In Progress', callback_data: `st:${lead.id}:In Progress` },
        { text: '🚀 Converted', callback_data: `st:${lead.id}:Converted` }
      ],
      [
        { text: '❌ Close Lead', callback_data: `st:${lead.id}:Closed` }
      ]
    ]
  };

  return sendMessage(CHAT_ID, text, { reply_markup: keyboard });
}

/* ---------- Lead formatting helpers ---------- */
function formatLeadRow(l) {
  return (
    `🆔 <b>${escapeHtml(l.id)}</b> — <b>${escapeHtml(l.name)}</b>\n` +
    `📱 <code>${escapeHtml(l.phone)}</code> | 📧 ${escapeHtml(l.email)}\n` +
    `🔥 ${escapeHtml(l.service)} | 📍 ${escapeHtml(l.company || '—')}\n` +
    `📌 Status: <b>${escapeHtml(l.status)}</b> | 🕒 ${escapeHtml(l.createdAt)}`
  );
}

function formatStats(stats) {
  const lines = [
    '📊 <b>LEAD STATISTICS & METRICS</b>',
    '',
    `Total Enquiries: <b>${stats.total}</b>`,
    `Today: <b>${stats.today}</b>`,
    '',
    '🔥 <b>By Service Interest:</b>'
  ];
  // Note: CSV doesn't track by service in stats, but we can compute
  const leads = csvStore.getLeads({ limit: 10000 }).items;
  const byService = {};
  for (const l of leads) {
    byService[l.service] = (byService[l.service] || 0) + 1;
  }
  for (const [svc, count] of Object.entries(byService).sort((a, b) => b[1] - a[1])) {
    lines.push(`   • ${escapeHtml(svc || 'Unknown')}: <b>${count}</b>`);
  }
  lines.push('', '📌 <b>By Lead Status:</b>');
  for (const [status, count] of Object.entries(stats.byStatus)) {
    lines.push(`   • ${escapeHtml(status)}: <b>${count}</b>`);
  }
  return lines.join('\n');
}

function toCsv(rows) {
  const cols = csvStore.LEAD_HEADERS;
  const esc = (v) => {
    const s = String(v == null ? '' : v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = cols.join(',');
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(',')).join('\n');
  return `${head}\n${body}`;
}

/* ---------- Callback query (inline buttons) ---------- */
async function handleCallbackQuery(query) {
  const userId = query.from && query.from.id;
  const chatId = query.message && query.message.chat.id;

  if (!isAdmin(userId)) {
    await tg('answerCallbackQuery', {
      callback_query_id: query.id,
      text: '⛔ You are not authorised.',
      show_alert: true
    });
    return;
  }

  const data = String(query.data || '');
  const [action, leadId, status] = data.split(':');

  if (action === 'st' && leadId && status) {
    const updated = csvStore.updateLead(leadId, { status, userId: 'telegram', ip: '' });
    await tg('answerCallbackQuery', {
      callback_query_id: query.id,
      text: updated ? `${leadId} updated to ${status}` : 'Lead not found',
      show_alert: !updated
    });
    if (updated && chatId) {
      await sendMessage(
        chatId,
        `✅ Lead <b>${escapeHtml(leadId)}</b> status updated to <b>${escapeHtml(status)}</b>\n👤 Client: ${escapeHtml(updated.name)}`
      );
    }
  } else {
    await tg('answerCallbackQuery', { callback_query_id: query.id, text: 'Unknown action.' });
  }
}

/* ---------- Command handler ---------- */
async function handleCommand(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from && msg.from.id;
  const text = String(msg.text || '').trim();
  const [cmd, ...rest] = text.split(/\s+/);
  const arg = rest.join(' ').trim();

  // Only respond in private chats
  if (msg.chat.type !== 'private') return;

  if (cmd === '/start' || cmd === '/help') {
    await sendMessage(
      chatId,
      `👋 <b>Welcome to Karma Fire Protection CRM Bot</b>\n\n` +
      `Instant lead notifications, visitor intelligence, and CRM controls.\n\n${HELP_TEXT}`
    );
    return;
  }

  // Authorisation check
  if (!isAdmin(userId)) {
    await sendMessage(
      chatId,
      '⛔ <b>Access Denied</b>\nYour Telegram User ID is not on the authorised administrator whitelist.'
    );
    return;
  }

  switch (cmd) {
    case '/latest': {
      const result = csvStore.getLeads({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' });
      const leads = result.items;
      if (!leads.length) return sendMessage(chatId, '📭 No leads found in the database.');
      await sendMessage(
        chatId,
        `🆕 <b>LATEST ${leads.length} LEADS</b>\n\n` + leads.map(formatLeadRow).join('\n\n—\n\n')
      );
      break;
    }

    case '/leads': {
      const stats = csvStore.getStats();
      const recent = csvStore.getLeads({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }).items;
      await sendMessage(
        chatId,
        `📋 <b>LEAD SUMMARY</b>\n\nTotal: <b>${stats.total}</b> | Today: <b>${stats.today}</b>\n\n` +
        '<b>Recent Enquiries:</b>\n' +
        (recent.length
          ? recent.map((l) => `• <b>${escapeHtml(l.id)}</b> — ${escapeHtml(l.name)} (<code>${escapeHtml(l.status)}</code>)`).join('\n')
          : 'No leads yet.')
      );
      break;
    }

    case '/stats': {
      await sendMessage(chatId, formatStats(csvStore.getStats()));
      break;
    }

    case '/today': {
      const today = new Date().toISOString().split('T')[0];
      const allLeads = csvStore.getLeads({ limit: 10000 }).items;
      const leads = allLeads.filter(l => l.createdAt.startsWith(today));
      if (!leads.length) return sendMessage(chatId, '📭 No enquiries received today so far.');
      await sendMessage(
        chatId,
        `📅 <b>TODAY'S ENQUIRIES (${leads.length})</b>\n\n` + leads.map(formatLeadRow).join('\n\n—\n\n')
      );
      break;
    }

    case '/visitors': {
      // CSV doesn't track detailed analytics, just log the activity
      const activity = csvStore.getActivity('', 100);
      const pageviews = activity.filter(a => a.action === 'pageview').length;
      await sendMessage(
        chatId,
        `👁 <b>WEBSITE VISITOR INTELLIGENCE</b>\n\n` +
        `• Activity Events (7 days): <b>${pageviews}</b>\n` +
        `• Note: Detailed analytics require separate tracking integration.\n\n` +
        `Use the admin dashboard at /admin for full visitor intelligence.`
      );
      break;
    }

    case '/sources': {
      const leads = csvStore.getLeads({ limit: 10000 }).items;
      const sources = {};
      for (const l of leads) {
        const src = l.source || 'direct';
        sources[src] = (sources[src] || 0) + 1;
      }
      const lines = ['🎯 <b>LEAD SOURCES (All Time)</b>', ''];
      if (Object.keys(sources).length) {
        for (const [src, count] of Object.entries(sources).sort((a, b) => b[1] - a[1])) {
          lines.push(`   • <b>${escapeHtml(src)}</b>: ${count} leads`);
        }
      } else {
        lines.push('   <i>No lead source data recorded yet.</i>');
      }
      await sendMessage(chatId, lines.join('\n'));
      break;
    }

    case '/search': {
      if (!arg) {
        return sendMessage(chatId, 'Usage: <code>/search <name | phone | LeadID | company></code>');
      }
      const result = csvStore.getLeads({ search: arg, limit: 20 });
      const leads = result.items;
      if (!leads.length) return sendMessage(chatId, `🔍 No matches found for: <i>${escapeHtml(arg)}</i>`);
      await sendMessage(
        chatId,
        `🔍 <b>SEARCH RESULTS (${leads.length})</b>\n\n` + leads.map(formatLeadRow).join('\n\n—\n\n')
      );
      break;
    }

    case '/status': {
      const [leadId, ...statusParts] = arg.split(/\s+/);
      const statusInput = statusParts.join(' ').trim();
      if (!leadId || !statusInput) {
        return sendMessage(
          chatId,
          `Usage: <code>/status <LeadID> <Status></code>\nValid statuses:\n• ${STATUSES.join('\n• ')}`
        );
      }
      const matchedStatus = STATUSES.find((s) => s.toLowerCase() === statusInput.toLowerCase());
      if (!matchedStatus) {
        return sendMessage(chatId, `⚠️ Invalid status.\nValid choices: ${STATUSES.join(', ')}`);
      }
      const updated = csvStore.updateLead(leadId.trim(), { status: matchedStatus, userId: 'telegram', ip: '' });
      if (!updated) return sendMessage(chatId, `⚠️ Lead ID <b>${escapeHtml(leadId)}</b> not found in the database.`);
      await sendMessage(
        chatId,
        `✅ <b>Status Updated</b>\n🆔 <b>${escapeHtml(updated.id)}</b> (${escapeHtml(updated.name)})\nStatus: <b>${matchedStatus}</b>`
      );
      break;
    }

    case '/export': {
      const allLeads = csvStore.getLeads({ limit: 10000 }).items;
      if (!allLeads.length) return sendMessage(chatId, '📭 No leads in database to export.');

      const csv = csvStore.exportCsv();
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('document', blob, `karma-leads-export-${new Date().toISOString().slice(0, 10)}.csv`);
      form.append('caption', `📊 Exported ${allLeads.length} total leads from Karma Fire Protection CRM`);

      const res = await fetch(`${API}/sendDocument`, { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) await sendMessage(chatId, '⚠️ Could not send document via Telegram API.');
      break;
    }

    case '/settings': {
      await sendMessage(
        chatId,
        [
          '⚙️ <b>SYSTEM CONFIGURATION & STATUS</b>',
          '',
          `Notification Chat: <b>${CHAT_ID ? 'Configured (' + CHAT_ID + ')' : 'Not configured'}</b>`,
          `Authorised Admins: <b>${ADMIN_IDS.length} user(s)</b>`,
          `CSV Storage: <b>Active (leads.csv, activity.csv)</b>`,
          `Bot Polling: <b>Active</b>`,
          '',
          '🔒 Security Note: API tokens and credentials are never displayed.'
        ].join('\n')
      );
      break;
    }

    default:
      await sendMessage(chatId, `❓ Unknown command.\n\n${HELP_TEXT}`);
  }
}

/* ---------- Long-polling loop ---------- */
let polling = false;
let offset = 0;

async function poll() {
  if (!TOKEN || polling) return;
  polling = true;

  while (polling) {
    try {
      const res = await fetch(`${API}/getUpdates?timeout=25&offset=${offset}`, {
        signal: AbortSignal.timeout(40000)
      });
      const data = await res.json();
      if (!data.ok) {
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }

      for (const update of data.result) {
        offset = update.update_id + 1;
        try {
          if (update.callback_query) {
            await handleCallbackQuery(update.callback_query);
          } else if (update.message && update.message.text) {
            await handleCommand(update.message);
          }
        } catch (err) {
          console.error('Update handling error:', err.message);
        }
      }
    } catch (err) {
      if (err.name !== 'TimeoutError') {
        console.error('Telegram polling error:', err.message);
      }
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

function startBot() {
  if (!TOKEN) {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN not set — notifications and bot CRM are disabled.');
    return;
  }
  if (!ADMIN_IDS.length) {
    console.warn('⚠️ ADMIN_TELEGRAM_IDS not set — bot commands will be denied for everyone.');
  }
  console.log('🤖 Telegram bot CRM polling started.');
  poll().catch((e) => console.error('Bot crashed:', e));
}

function stopBot() {
  polling = false;
}

module.exports = { notifyNewLead, startBot, stopBot, isAdmin, tg, toCsv };