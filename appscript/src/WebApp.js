/**
 * WebApp — Optional web endpoint for the Apps Script project.
 *
 * Deploy as a web app to provide a simple API for your local CLI
 * to trigger sheet operations remotely without clasp run.
 *
 * Deploy: Apps Script editor > Deploy > New deployment > Web app
 * Set "Who has access" to "Only myself"
 */

/**
 * Include helper — used by index.html template to pull in styles.html and vue-app.html.
 * Usage inside HTML: <?!= include('styles') ?>
 * @param {string} filename - HTML filename without extension
 * @returns {string} Raw file content
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Serve the index.html UI when accessed as a web app.
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || null;

  // If no action param, serve the HTML UI (template mode for <?!= include() ?> tags)
  if (!action) {
    return HtmlService.createTemplateFromFile("index")
      .evaluate()
      .setTitle("AppSheet Template");
  }
  if (action === "status") {
    return jsonResponse_({ status: "ok", timestamp: new Date().toISOString() });
  }

  if (action === "export-schema") {
    var spreadsheetId = e.parameter.spreadsheetId;
    if (!spreadsheetId) {
      return jsonResponse_({ error: "Missing spreadsheetId parameter" }, 400);
    }
    var schema = exportSpreadsheetSchema(spreadsheetId);
    return jsonResponse_(schema);
  }

  if (action === "folder-status") {
    return jsonResponse_(getFolderSetupStatus());
  }

  return jsonResponse_({ error: "Unknown action: " + action }, 400);
}

/**
 * Handle POST requests — used for creating/updating sheets and data operations.
 */
function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var action = body.action;

  if (action === "create-spreadsheet") {
    var result = createSpreadsheetFromSchema(body.schema);
    return jsonResponse_(result);
  }

  if (action === "update-spreadsheet") {
    var result = updateSpreadsheetFromSchema(body.spreadsheetId, body.schema);
    return jsonResponse_(result);
  }

  if (action === "seed-table") {
    var result = seedTable(body.tableName, body.rows, body.clearFirst || false);
    return jsonResponse_(result);
  }

  if (action === "read-table") {
    var rows = readTableRows(body.tableName);
    return jsonResponse_({ rows: rows, count: rows.length });
  }

  if (action === "setup-folders") {
    if (!body.appName) {
      return jsonResponse_({ error: "Missing appName" }, 400);
    }
    var result = setupFolders(body.appName);
    return jsonResponse_(result);
  }

  return jsonResponse_({ error: "Unknown action: " + action }, 400);
}

/**
 * List spreadsheets accessible from the UI (called via google.script.run).
 * Scopes to app_data/ folder when Drive folders are configured;
 * falls back to full Drive search otherwise.
 * @returns {Object[]} array of { id, name, url }
 */
function listMySpreadsheets() {
  var ids = getFolderIds_();
  if (ids.appDataFolderId) {
    return listSheetsInFolder(ids.appDataFolderId);
  }
  // Fallback: search all of Drive (pre-folder-setup behavior)
  var files = DriveApp.getFilesByType(MimeType.GOOGLE_SHEETS);
  var sheets = [];
  while (files.hasNext() && sheets.length < 50) {
    var file = files.next();
    sheets.push({ id: file.getId(), name: file.getName(), url: file.getUrl() });
  }
  return sheets;
}

function jsonResponse_(data, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
