# Apps Script CORS Fix

The Netlify site cannot directly read normal JSON from Google Apps Script because the browser blocks it with CORS.

Use JSONP for reading events and `no-cors` POST for writing events.

## Replace `doGet` In Apps Script

Open the Apps Script attached to the event Google Sheet and replace your current `doGet` function with this:

```javascript
function doGet(e) {
  const data = { events: getEvents() };
  const callback = e && e.parameter && e.parameter.callback;

  if (callback) {
    return ContentService
      .createTextOutput(callback + "(" + JSON.stringify(data) + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return json(data);
}
```

## Redeploy Apps Script

After saving:

1. Click **Deploy**.
2. Click **Manage deployments**.
3. Click the pencil/edit icon.
4. Under **Version**, choose **New version**.
5. Keep **Who has access** as:

```text
Anyone
```

6. Click **Deploy**.

Then redeploy the Netlify site using the updated folder:

```text
C:\Users\hp\kashmir-sikh-connect
```
