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
 * Serve the index.html UI when accessed as a web app.
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || null;

  // If no action param, serve the HTML UI
  if (!action) {
    return HtmlService.createHtmlOutputFromFile("index")
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

  return jsonResponse_({ error: "Unknown action: " + action }, 400);
}

/**
 * List spreadsheets in the user's Drive (called from index.html via google.script.run).
 * @returns {Object[]} array of { id, name, url }
 */
function listMySpreadsheets() {
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
