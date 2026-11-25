# Google Sheets Sync — Setup Guide

Karma Fire Protection saves every lead to `leads.csv` first. It can also push
each new lead to your Google Sheet automatically.

**Your sheet:**
https://docs.google.com/spreadsheets/d/1s7bl4P5QSSL6NKptLF1gSldYzhQGUJg87fY04uy_kAo/edit?usp=sharing

This link is pre-configured as the *Sheet Link* in **Admin → Settings → Google
Sheets** and can be changed there at any time.

## Why a Sync URL is needed

A Google Sheet link is read-only for outsiders — nothing can write rows into it
without Google API credentials. The standard no-credential way to write is a
**Google Apps Script web app** bound to your sheet. You deploy it once (5
minutes, using the same Google account that owns the sheet), copy its `/exec`
URL into the admin panel, and from then on every lead is appended
automatically.

## One-time setup

1. Open your sheet → **Extensions → Apps Script**.
2. Delete any code in `Code.gs` and paste this:

```js
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var data = JSON.parse(e.postData.contents);

  if (data.headers && sheet.getLastRow() === 0) {
    sheet.appendRow(data.headers);
  }
  (data.rows || []).forEach(function (row) {
    sheet.appendRow(row);
  });

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, added: (data.rows || []).length }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Click **Deploy → New deployment**.
4. Click the gear icon → **Web app**.
5. Set:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
6. Click **Deploy**, authorize when prompted, then copy the **Web app URL**
   (`https://script.google.com/macros/s/.../exec`).
7. In the admin panel: **Settings → Google Sheets → Sync URL** → paste the URL
   → **Save**.
8. Click **Sync All Leads Now** to backfill existing leads, then **Open Sheet**
   to verify.

## What gets written

| Lead ID | Name | Phone | Email | Company | Service | Message | Source | Status | Created At |
|---------|------|-------|-------|---------|---------|---------|--------|--------|------------|

- New leads are pushed automatically right after they are saved to CSV.
- The push is fire-and-forget: if Google is unreachable, the lead is still
  saved in `leads.csv` and shown in the dashboard.
- Changing the *Sheet Link* only changes the dashboard shortcut — rows go to
  whatever sheet the Apps Script is bound to. To point at a different sheet,
  re-deploy the Apps Script from that sheet.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `No sync URL configured` | Paste the `/exec` URL in Settings and save. |
| `Could not reach the Google Sheets sync endpoint` | Re-deploy the script (Deploy → Manage deployments → Edit → New version). |
| Rows not appearing | Open the Apps Script editor → **Run** `doPost` once to check for errors, and confirm *Who has access* is **Anyone**. |
| Duplicate rows after re-sync | Clear the sheet's data rows first, or delete duplicates — sync appends, it does not deduplicate. |
