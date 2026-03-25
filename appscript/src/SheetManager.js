/**
 * SheetManager — Creates and manages Google Sheets that serve as AppSheet data sources.
 *
 * Called from the local CLI via clasp run, or directly from the Apps Script editor.
 * Reads schema definitions (JSON) and provisions Sheets with headers, validation, and formatting.
 */

/**
 * Create a new spreadsheet from a schema definition.
 * @param {Object} schema - { spreadsheetName, sheets: [{ name, headers, columnTypes, sampleRows }] }
 * @returns {Object} { spreadsheetId, spreadsheetUrl, folderUrl }
 */
function createSpreadsheetFromSchema(schema) {
  const ss = SpreadsheetApp.create(schema.spreadsheetName);

  // Move to app_data/ folder if Drive folders are configured
  var appDataFolderId = null;
  try {
    var folderIds = getFolderIds_();
    if (folderIds.appDataFolderId) {
      appDataFolderId = folderIds.appDataFolderId;
      var folder = DriveApp.getFolderById(appDataFolderId);
      DriveApp.getFileById(ss.getId()).moveTo(folder);
    }
  } catch (e) {
    console.error('DriveManager: could not move spreadsheet to app_data folder:', e);
    // Non-fatal — spreadsheet remains in Drive root
    appDataFolderId = null;
  }

  // Remove default "Sheet1" after adding our sheets
  const defaultSheet = ss.getSheets()[0];

  schema.sheets.forEach(function (sheetDef, i) {
    var sheet;
    if (i === 0) {
      // Rename the default sheet
      defaultSheet.setName(sheetDef.name);
      sheet = defaultSheet;
    } else {
      sheet = ss.insertSheet(sheetDef.name);
    }

    // Write headers
    var headerRange = sheet.getRange(1, 1, 1, sheetDef.headers.length);
    headerRange.setValues([sheetDef.headers]);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#4285F4");
    headerRange.setFontColor("#FFFFFF");
    sheet.setFrozenRows(1);

    // Apply column types if provided
    if (sheetDef.columnTypes) {
      sheetDef.columnTypes.forEach(function (colType, colIndex) {
        if (colType.format) {
          sheet.getRange(2, colIndex + 1, 999).setNumberFormat(colType.format);
        }
        if (colType.validation === "dropdown" && colType.values) {
          var rule = SpreadsheetApp.newDataValidation()
            .requireValueInList(colType.values, true)
            .setAllowInvalid(false)
            .build();
          sheet.getRange(2, colIndex + 1, 999).setDataValidation(rule);
        }
        if (colType.validation === "checkbox") {
          sheet.getRange(2, colIndex + 1, 999).insertCheckboxes();
        }
      });
    }

    // Write sample rows if provided
    if (sheetDef.sampleRows && sheetDef.sampleRows.length > 0) {
      var dataRange = sheet.getRange(2, 1, sheetDef.sampleRows.length, sheetDef.headers.length);
      var values = sheetDef.sampleRows.map(function (row) {
        return sheetDef.headers.map(function (h) {
          return row[h] !== undefined ? row[h] : "";
        });
      });
      dataRange.setValues(values);
    }

    // Auto-resize columns
    sheetDef.headers.forEach(function (_, colIndex) {
      sheet.autoResizeColumn(colIndex + 1);
    });
  });

  return {
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    folderUrl: appDataFolderId
      ? 'https://drive.google.com/drive/folders/' + appDataFolderId
      : null,
  };
}

/**
 * Update an existing spreadsheet's structure from a schema.
 * Adds missing sheets/columns without destroying existing data.
 * @param {string} spreadsheetId
 * @param {Object} schema
 * @returns {Object} { updated: string[] }
 */
function updateSpreadsheetFromSchema(spreadsheetId, schema) {
  var ss = SpreadsheetApp.openById(spreadsheetId);
  var updated = [];

  schema.sheets.forEach(function (sheetDef) {
    var sheet = ss.getSheetByName(sheetDef.name);

    if (!sheet) {
      // Create missing sheet
      sheet = ss.insertSheet(sheetDef.name);
      var headerRange = sheet.getRange(1, 1, 1, sheetDef.headers.length);
      headerRange.setValues([sheetDef.headers]);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#4285F4");
      headerRange.setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
      updated.push("Created sheet: " + sheetDef.name);
    } else {
      // Check for missing columns
      var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var missingHeaders = sheetDef.headers.filter(function (h) {
        return existingHeaders.indexOf(h) === -1;
      });

      if (missingHeaders.length > 0) {
        var nextCol = existingHeaders.length + 1;
        missingHeaders.forEach(function (header) {
          sheet.getRange(1, nextCol).setValue(header).setFontWeight("bold").setBackground("#4285F4").setFontColor("#FFFFFF");
          nextCol++;
        });
        updated.push("Added columns to " + sheetDef.name + ": " + missingHeaders.join(", "));
      }
    }
  });

  return { updated: updated };
}

/**
 * Export the current schema of a spreadsheet as JSON.
 * Useful for pulling the remote state back to local definitions.
 * @param {string} spreadsheetId
 * @returns {Object} schema definition
 */
function exportSpreadsheetSchema(spreadsheetId) {
  var ss = SpreadsheetApp.openById(spreadsheetId);
  var sheets = ss.getSheets();

  var schema = {
    spreadsheetName: ss.getName(),
    spreadsheetId: ss.getId(),
    sheets: sheets.map(function (sheet) {
      var lastCol = sheet.getLastColumn();
      if (lastCol === 0) return { name: sheet.getName(), headers: [] };

      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var lastRow = sheet.getLastRow();

      var result = {
        name: sheet.getName(),
        headers: headers,
        rowCount: Math.max(0, lastRow - 1),
      };

      // Include first data row as sample
      if (lastRow > 1) {
        var sampleValues = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
        var sampleRow = {};
        headers.forEach(function (h, i) {
          sampleRow[h] = sampleValues[i];
        });
        result.sampleRow = sampleRow;
      }

      return result;
    }),
  };

  return schema;
}
