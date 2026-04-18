# Full Apps Script Fix For Events

If the website says:

```text
Events could not be loaded. Check Apps Script deployment access and redeploy it as a new version.
```

replace the full Apps Script code with this safer version.

This version uses the first sheet automatically, so it does not break if your tab is not named `Sheet1`.

```javascript
const ADMIN_TOKEN = "admin@123_123";
const HEADERS = ["id", "title", "date", "details", "posterUrl", "link", "active", "createdAt"];

function sheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheets()[0];
  const firstRow = sh.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const hasHeaders = HEADERS.every((header, index) => firstRow[index] === header);

  if (!hasHeaders) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }

  return sh;
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonp(callback, data) {
  return ContentService
    .createTextOutput(callback + "(" + JSON.stringify(data) + ");")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function normalizeDate(value) {
  if (!value) return "";

  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, "Asia/Kolkata", "yyyy-MM-dd");
  }

  return String(value);
}

function normalizeActive(value) {
  return value === true || value === "TRUE" || value === "true";
}

function getEvents() {
  const sh = sheet();
  const rows = sh.getDataRange().getValues();
  rows.shift();

  return rows
    .filter(row => row[0])
    .map(row => ({
      id: String(row[0]),
      title: String(row[1] || ""),
      date: normalizeDate(row[2]),
      details: String(row[3] || ""),
      posterUrl: String(row[4] || ""),
      link: String(row[5] || ""),
      active: normalizeActive(row[6]),
      createdAt: String(row[7] || "")
    }));
}

function doGet(e) {
  const data = { events: getEvents() };
  const callback = e && e.parameter && e.parameter.callback;

  if (callback) {
    return jsonp(callback, data);
  }

  return json(data);
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents || "{}");

  if (body.token !== ADMIN_TOKEN) {
    return json({ ok: false, error: "Unauthorized" });
  }

  const sh = sheet();
  const events = getEvents();

  if (body.action === "create") {
    const event = body.event || {};
    sh.appendRow([
      event.id || String(Date.now()),
      event.title || "",
      event.date || "",
      event.details || "",
      event.posterUrl || "",
      event.link || "",
      event.active === true,
      event.createdAt || new Date().toISOString()
    ]);

    return json({ ok: true });
  }

  if (body.action === "toggle") {
    const index = events.findIndex(event => event.id === body.id);

    if (index >= 0) {
      const rowNumber = index + 2;
      const current = sh.getRange(rowNumber, 7).getValue();
      sh.getRange(rowNumber, 7).setValue(!normalizeActive(current));
    }

    return json({ ok: true });
  }

  if (body.action === "delete") {
    const index = events.findIndex(event => event.id === body.id);

    if (index >= 0) {
      sh.deleteRow(index + 2);
    }

    return json({ ok: true });
  }

  return json({ ok: false, error: "Unknown action" });
}
```

## After Pasting The Code

1. Click **Save** in Apps Script.
2. Click **Deploy**.
3. Click **Manage deployments**.
4. Click the pencil/edit icon.
5. Under **Version**, choose **New version**.
6. Keep **Execute as**:

```text
Me
```

7. Keep **Who has access**:

```text
Anyone
```

8. Click **Deploy**.

## Test URL

Open your Apps Script URL in a browser with:

```text
?callback=testCallback
```

It should show text starting with:

```text
testCallback({"events":
```

If it does, the website can load events.
