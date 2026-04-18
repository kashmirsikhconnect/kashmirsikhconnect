# Event Backend Setup

The current static website cannot permanently save public events by itself. To make events stay after refresh and show for every visitor, connect the site to a Google Sheet using Google Apps Script.

## 1. Create Google Sheet

1. Sign in as `kashmirsikhconnect@gmail.com`.
2. Create a new Google Sheet named:

```text
Kashmir Sikh Connect Events
```

3. Add these headers in row 1:

```text
id
title
date
details
posterUrl
link
active
createdAt
```

## 2. Create Apps Script

In the Google Sheet:

1. Open **Extensions**.
2. Click **Apps Script**.
3. Delete the default code.
4. Paste this code:

```javascript
const ADMIN_TOKEN = "admin@123_123";
const SHEET_NAME = "Sheet1";

function sheet() {
  return SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getEvents() {
  const rows = sheet().getDataRange().getValues();
  const headers = rows.shift();
  return rows
    .filter(row => row[0])
    .map(row => {
      const item = {};
      headers.forEach((header, index) => item[header] = row[index]);
      item.active = item.active === true || item.active === "TRUE" || item.active === "true";
      return item;
    });
}

function doGet() {
  return json({ events: getEvents() });
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  if (body.token !== ADMIN_TOKEN) {
    return json({ ok: false, error: "Unauthorized" });
  }

  const eventsSheet = sheet();
  const events = getEvents();

  if (body.action === "create") {
    const event = body.event;
    eventsSheet.appendRow([
      event.id,
      event.title,
      event.date,
      event.details,
      event.posterUrl || event.poster || "",
      event.link,
      event.active,
      event.createdAt
    ]);
    return json({ ok: true });
  }

  if (body.action === "toggle") {
    const index = events.findIndex(event => event.id === body.id);
    if (index >= 0) {
      const rowNumber = index + 2;
      const current = eventsSheet.getRange(rowNumber, 7).getValue();
      eventsSheet.getRange(rowNumber, 7).setValue(!(current === true || current === "TRUE" || current === "true"));
    }
    return json({ ok: true });
  }

  if (body.action === "delete") {
    const index = events.findIndex(event => event.id === body.id);
    if (index >= 0) {
      eventsSheet.deleteRow(index + 2);
    }
    return json({ ok: true });
  }

  return json({ ok: false, error: "Unknown action" });
}
```

## 3. Deploy Apps Script

1. Click **Deploy**.
2. Click **New deployment**.
3. Select **Web app**.
4. Set **Execute as** to:

```text
Me
```

5. Set **Who has access** to:

```text
Anyone
```

6. Click **Deploy**.
7. Copy the Web app URL.

## 4. Connect Website

Open `script.js` and replace:

```javascript
const EVENTS_API_URL = "";
```

with:

```javascript
const EVENTS_API_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL";
```

Then redeploy the website on Netlify.

## Poster Images

For live public events, use the **Poster image link** field.

Recommended flow:

1. Upload poster to Google Drive.
2. Make it viewable by anyone with the link.
3. Use a public image link in the admin form.

Large direct poster uploads are only for local preview and may not persist reliably.
