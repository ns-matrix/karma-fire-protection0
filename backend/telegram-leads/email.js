/* ============================================
   REUSABLE EMAIL NOTIFICATION SERVICE
   Nodemailer / SMTP integration with fail-safe error handling
   ============================================ */
'use strict';

const nodemailer = require('nodemailer');
const { escapeHtml } = require('./validate');

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT, 10) || 587;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Karma Fire Protection <noreply@karmafireprotection.com>';
const EMAIL_TO = process.env.EMAIL_TO || 'karmafireprotectionllp@gmail.com';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  });

  return transporter;
}

async function sendNewLeadEmail(lead) {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn('⚠️ SMTP not configured (SMTP_HOST, SMTP_USER, SMTP_PASS required). Lead saved but email not sent.');
    return { ok: false, reason: 'not_configured' };
  }

  const subject = `🚨 New Fire Protection Enquiry [${lead.id}] — ${lead.name}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 24px; color: #1f2937; }
        .card { background: #ffffff; border-radius: 8px; max-width: 620px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid #e5e7eb; }
        .header { background: #171717; color: #ffffff; padding: 24px 32px; border-bottom: 4px solid #d9232d; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
        .header p { margin: 6px 0 0; color: #9ca3af; font-size: 13px; }
        .content { padding: 32px; }
        .lead-badge { display: inline-block; background: #fee2e2; color: #b91c1c; font-weight: 700; font-size: 13px; padding: 4px 12px; border-radius: 4px; margin-bottom: 20px; }
        .field-group { margin-bottom: 16px; }
        .label { font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px; }
        .value { font-size: 15px; color: #111827; font-weight: 500; }
        .value a { color: #d9232d; text-decoration: none; font-weight: 600; }
        .table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        .table td { padding: 10px 0; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
        .table td:first-child { width: 38%; color: #6b7280; font-size: 13px; font-weight: 600; }
        .table td:last-child { width: 62%; font-size: 14px; color: #111827; }
        .message-box { background: #f9fafb; border-left: 4px solid #d9232d; padding: 14px 18px; border-radius: 4px; font-size: 14px; line-height: 1.5; color: #374151; margin-top: 16px; }
        .attribution-box { margin-top: 24px; padding: 14px 18px; background: #f3f4f6; border-radius: 6px; font-size: 12px; color: #4b5563; }
        .footer { padding: 20px 32px; background: #fafafa; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>🔥 Karma Fire Protection LLP — New Enquiry</h1>
          <p>Instant Website Enquiry Alert</p>
        </div>
        <div class="content">
          <div class="lead-badge">Lead ID: ${escapeHtml(lead.id)}</div>

          <table class="table">
            <tr>
              <td>Client Name:</td>
              <td><strong>${escapeHtml(lead.name)}</strong></td>
            </tr>
            <tr>
              <td>Phone Number:</td>
              <td><a href="tel:${escapeHtml(lead.phone)}">${escapeHtml(lead.phone)}</a></td>
            </tr>
            <tr>
              <td>Email Address:</td>
              <td><a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a></td>
            </tr>
            <tr>
              <td>Interested Service:</td>
              <td><strong>${escapeHtml(lead.service)}</strong></td>
            </tr>
            <tr>
              <td>Company / Organization:</td>
              <td>${escapeHtml(lead.company || '—')}</td>
            </tr>
            <tr>
              <td>Submitted At (UTC):</td>
              <td>${escapeHtml(lead.createdAt)}</td>
            </tr>
          </table>

          <div class="field-group" style="margin-top: 20px;">
            <div class="label">Requirements / Project Message:</div>
            <div class="message-box">${escapeHtml(lead.message || 'No additional message provided.')}</div>
          </div>

          <div class="attribution-box">
            <strong>Marketing & Traffic Attribution:</strong><br>
            • Traffic Source: ${escapeHtml(lead.source || 'Website')}<br>
            • UTM Medium: ${escapeHtml(lead.utmMedium || 'direct')}<br>
            • UTM Campaign: ${escapeHtml(lead.utmCampaign || 'none')}<br>
            • Referrer: ${escapeHtml(lead.referrer || 'direct')}
          </div>
        </div>
        <div class="footer">
          Karma Fire Protection LLP • Vikhroli West, Mumbai 400083 • Phone: +91 95949 67751<br>
          This is an automated notification from your website lead management system.
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
NEW WEBSITE LEAD [${lead.id}]
-----------------------------------------
Name: ${lead.name}
Phone: ${lead.phone}
Email: ${lead.email}
Company: ${lead.company || '—'}
Service: ${lead.service}
Preferred Contact: ${lead.contact_method || 'Phone Call'}
Requirements: ${lead.message || '—'}
Timestamp: ${lead.createdAt} (UTC)

Attribution:
Source: ${lead.source || 'Website'}
Medium: ${lead.utmMedium || 'direct'}
Campaign: ${lead.utmCampaign || 'none'}
Referrer: ${lead.referrer || 'direct'}

Karma Fire Protection LLP
  `.trim();

  try {
    const info = await mailer.sendMail({
      from: EMAIL_FROM,
      to: EMAIL_TO,
      subject,
      text: textContent,
      html: htmlContent
    });
    console.log(`✉️ Email notification sent: ${info.messageId}`);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error('Email send failed:', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { sendNewLeadEmail, getTransporter };