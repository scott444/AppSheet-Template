/**
 * AppSheetHelper — Interacts with AppSheet apps via the Data API.
 *
 * Uses the Application Access Key (not Google Cloud).
 * Set your keys in Script Properties: APPSHEET_APP_ID, APPSHEET_ACCESS_KEY
 */

var DATA_API_BASE = "https://api.appsheet.com/api/v2";

/**
 * Get config from Script Properties.
 * Set these in: Apps Script editor > Project Settings > Script Properties
 */
function getAppSheetConfig_() {
  var props = PropertiesService.getScriptProperties();
  return {
    appId: props.getProperty("APPSHEET_APP_ID"),
    accessKey: props.getProperty("APPSHEET_ACCESS_KEY"),
  };
}

/**
 * Read all rows from an AppSheet table.
 * @param {string} tableName
 * @returns {Object[]} array of row objects
 */
function readTableRows(tableName) {
  var config = getAppSheetConfig_();
  var url = DATA_API_BASE + "/apps/" + config.appId + "/tables/" + encodeURIComponent(tableName) + "/Action";

  var response = UrlFetchApp.fetch(url, {
    method: "POST",
    contentType: "application/json",
    headers: { ApplicationAccessKey: config.accessKey },
    payload: JSON.stringify({ Action: "Find", Properties: {}, Rows: [] }),
    muteHttpExceptions: true,
  });
  checkResponse_(response);

  return JSON.parse(response.getContentText());
}

/**
 * Add rows to an AppSheet table.
 * @param {string} tableName
 * @param {Object[]} rows
 * @returns {Object[]} added rows
 */
function addTableRows(tableName, rows) {
  var config = getAppSheetConfig_();
  var url = DATA_API_BASE + "/apps/" + config.appId + "/tables/" + encodeURIComponent(tableName) + "/Action";

  var response = UrlFetchApp.fetch(url, {
    method: "POST",
    contentType: "application/json",
    headers: { ApplicationAccessKey: config.accessKey },
    payload: JSON.stringify({ Action: "Add", Properties: {}, Rows: rows }),
    muteHttpExceptions: true,
  });
  checkResponse_(response);

  return JSON.parse(response.getContentText());
}

/**
 * Edit rows in an AppSheet table.
 * @param {string} tableName
 * @param {Object[]} rows - must include the key column
 * @returns {Object[]} updated rows
 */
function editTableRows(tableName, rows) {
  var config = getAppSheetConfig_();
  var url = DATA_API_BASE + "/apps/" + config.appId + "/tables/" + encodeURIComponent(tableName) + "/Action";

  var response = UrlFetchApp.fetch(url, {
    method: "POST",
    contentType: "application/json",
    headers: { ApplicationAccessKey: config.accessKey },
    payload: JSON.stringify({ Action: "Edit", Properties: {}, Rows: rows }),
    muteHttpExceptions: true,
  });
  checkResponse_(response);

  return JSON.parse(response.getContentText());
}

/**
 * Delete rows from an AppSheet table.
 * @param {string} tableName
 * @param {Object[]} rows - must include the key column
 */
function deleteTableRows(tableName, rows) {
  var config = getAppSheetConfig_();
  var url = DATA_API_BASE + "/apps/" + config.appId + "/tables/" + encodeURIComponent(tableName) + "/Action";

  var response = UrlFetchApp.fetch(url, {
    method: "POST",
    contentType: "application/json",
    headers: { ApplicationAccessKey: config.accessKey },
    payload: JSON.stringify({ Action: "Delete", Properties: {}, Rows: rows }),
    muteHttpExceptions: true,
  });
  checkResponse_(response);
}

/**
 * Seed an AppSheet table from local JSON data.
 * @param {string} tableName
 * @param {Object[]} rows
 * @param {boolean} clearFirst - if true, reads and deletes existing rows first
 * @returns {Object} { added: number, deleted: number }
 */
function seedTable(tableName, rows, clearFirst) {
  var deleted = 0;

  if (clearFirst) {
    var existing = readTableRows(tableName);
    if (existing.length > 0) {
      deleteTableRows(tableName, existing);
      deleted = existing.length;
    }
  }

  var added = addTableRows(tableName, rows);
  return { added: added.length, deleted: deleted };
}

/**
 * Check HTTP response and throw on error.
 * @param {GoogleAppsScript.URL_Fetch.HTTPResponse} response
 */
function checkResponse_(response) {
  var code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error("AppSheet API error " + code + ": " + response.getContentText());
  }
}
