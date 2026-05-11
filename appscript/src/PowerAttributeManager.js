/**
 * PowerAttributeManager — Manages two types of versioned tables for the Power Table feature:
 *
 * 1. Mapping tables  — map EQL LIM+O → Equipment (Manufacturer+Model), with a Multiple quantity
 * 2. Equipment tables — physical/power specs keyed by Manufacturer+Model
 *
 * Storage layout:
 *   app_system/
 *     ├── power-mapping-index.json
 *     ├── power-equipment-index.json
 *     ├── power-mappings/
 *     │     └── {tableId}.json   — [{ LIM, O, Multiple, Description, Manufacturer, Model }]
 *     └── power-equipment/
 *           └── {tableId}.json   — [{ SubSys, Nomenclature, Description, Profile,
 *                                      Manufacturer, Model, PSU, AC volts min/max,
 *                                      AC amps max, DC volts, DC amps max, Watts max,
 *                                      VA max, BTU max, H/W/D (in), Weight (LBs),
 *                                      Operating/Storage Temp °F (min/max), RU, Spec Sheet }]
 *
 * Join key: EQL (LIM+O) → Mapping → Equipment (Manufacturer+Model)
 * Effective quantity per expanded row: Multiple × EQL QTY
 */

// ── Mapping table helpers ──────────────────────────────────────────────────

function getPowerMappingsFolderId_() {
  var systemFolderId = getSystemFolderId_();
  var systemFolder = DriveApp.getFolderById(systemFolderId);
  var folder = getOrCreateFolder_(systemFolder, 'power-mappings');
  return folder.getId();
}

function readPowerMappingIndex_() {
  var systemFolderId = getSystemFolderId_();
  return readJsonFile_(systemFolderId, 'power-mapping-index.json') || [];
}

function writePowerMappingIndex_(index) {
  var systemFolderId = getSystemFolderId_();
  writeJsonFile_(systemFolderId, 'power-mapping-index.json', index);
}

// ── Equipment table helpers ────────────────────────────────────────────────

function getPowerEquipmentFolderId_() {
  var systemFolderId = getSystemFolderId_();
  var systemFolder = DriveApp.getFolderById(systemFolderId);
  var folder = getOrCreateFolder_(systemFolder, 'power-equipment');
  return folder.getId();
}

function readPowerEquipmentIndex_() {
  var systemFolderId = getSystemFolderId_();
  return readJsonFile_(systemFolderId, 'power-equipment-index.json') || [];
}

function writePowerEquipmentIndex_(index) {
  var systemFolderId = getSystemFolderId_();
  writeJsonFile_(systemFolderId, 'power-equipment-index.json', index);
}

// ── Public API — Mapping tables ────────────────────────────────────────────

/**
 * List all mapping table versions.
 * @returns {Array} [{ id, name, version, createdAt, rowCount, columns }]
 */
function listPowerMappingTables() {
  return readPowerMappingIndex_();
}

/**
 * Get the rows for a specific mapping table version.
 * @param {string} tableId
 * @returns {Object[]} [{ LIM, O, Multiple, Description, Manufacturer, Model }]
 */
function getPowerMapping(tableId) {
  if (!tableId) throw new Error('tableId is required');
  var folderId = getPowerMappingsFolderId_();
  var data = readJsonFile_(folderId, tableId + '.json');
  if (!data) throw new Error('Power mapping table not found: ' + tableId);
  return data;
}

/**
 * Upload a new mapping table version.
 * CSV must contain LIM, O, Manufacturer, Model columns.
 *
 * @param {string} name
 * @param {string} version
 * @param {Object[]} rows
 * @returns {{ id: string, rowCount: number, columns: string[] }}
 */
function createPowerMappingTable(name, version, rows) {
  if (!name || !name.trim()) throw new Error('Table name is required');
  if (!version || !version.trim()) throw new Error('Table version is required');
  if (!rows || rows.length === 0) throw new Error('Mapping table has no rows');

  var columns = Object.keys(rows[0]);
  if (columns.indexOf('LIM') === -1) throw new Error('Mapping CSV must have a "LIM" column');
  if (columns.indexOf('O') === -1) throw new Error('Mapping CSV must have an "O" column');
  if (columns.indexOf('Manufacturer') === -1) throw new Error('Mapping CSV must have a "Manufacturer" column');
  if (columns.indexOf('Model') === -1) throw new Error('Mapping CSV must have a "Model" column');

  var tableId = generateUid_();
  var folderId = getPowerMappingsFolderId_();
  writeJsonFile_(folderId, tableId + '.json', rows);

  var index = readPowerMappingIndex_();
  index.push({
    id: tableId,
    name: name.trim(),
    version: version.trim(),
    createdAt: new Date().toISOString(),
    rowCount: rows.length,
    columns: columns
  });
  writePowerMappingIndex_(index);

  console.log('PowerAttributeManager: created mapping table "' + name + '" v' + version + ' (' + rows.length + ' rows)');
  return { id: tableId, rowCount: rows.length, columns: columns };
}

/**
 * Delete a mapping table version.
 * @param {string} tableId
 * @returns {{ deleted: boolean }}
 */
function deletePowerMappingTable(tableId) {
  if (!tableId) throw new Error('tableId is required');

  var folderId = getPowerMappingsFolderId_();
  var folder = DriveApp.getFolderById(folderId);
  var files = folder.getFilesByName(tableId + '.json');
  while (files.hasNext()) { files.next().setTrashed(true); }

  var index = readPowerMappingIndex_();
  writePowerMappingIndex_(index.filter(function(e) { return e.id !== tableId; }));

  console.log('PowerAttributeManager: deleted mapping table ' + tableId);
  return { deleted: true };
}

// ── Public API — Equipment tables ──────────────────────────────────────────

/**
 * List all equipment table versions.
 * @returns {Array} [{ id, name, version, createdAt, rowCount, columns }]
 */
function listPowerEquipmentTables() {
  return readPowerEquipmentIndex_();
}

/**
 * Get the rows for a specific equipment table version.
 * @param {string} tableId
 * @returns {Object[]} Equipment rows keyed by Manufacturer+Model
 */
function getPowerEquipment(tableId) {
  if (!tableId) throw new Error('tableId is required');
  var folderId = getPowerEquipmentFolderId_();
  var data = readJsonFile_(folderId, tableId + '.json');
  if (!data) throw new Error('Power equipment table not found: ' + tableId);
  return data;
}

/**
 * Upload a new equipment table version.
 * CSV must contain Manufacturer and Model columns (the join key from the Mapping table).
 *
 * @param {string} name
 * @param {string} version
 * @param {Object[]} rows
 * @returns {{ id: string, rowCount: number, columns: string[] }}
 */
function createPowerEquipmentTable(name, version, rows) {
  if (!name || !name.trim()) throw new Error('Table name is required');
  if (!version || !version.trim()) throw new Error('Table version is required');
  if (!rows || rows.length === 0) throw new Error('Equipment table has no rows');

  var columns = Object.keys(rows[0]);
  if (columns.indexOf('Manufacturer') === -1) throw new Error('Equipment CSV must have a "Manufacturer" column');
  if (columns.indexOf('Model') === -1) throw new Error('Equipment CSV must have a "Model" column');

  var tableId = generateUid_();
  var folderId = getPowerEquipmentFolderId_();
  writeJsonFile_(folderId, tableId + '.json', rows);

  var index = readPowerEquipmentIndex_();
  index.push({
    id: tableId,
    name: name.trim(),
    version: version.trim(),
    createdAt: new Date().toISOString(),
    rowCount: rows.length,
    columns: columns
  });
  writePowerEquipmentIndex_(index);

  console.log('PowerAttributeManager: created equipment table "' + name + '" v' + version + ' (' + rows.length + ' rows)');
  return { id: tableId, rowCount: rows.length, columns: columns };
}

/**
 * Delete an equipment table version.
 * @param {string} tableId
 * @returns {{ deleted: boolean }}
 */
function deletePowerEquipmentTable(tableId) {
  if (!tableId) throw new Error('tableId is required');

  var folderId = getPowerEquipmentFolderId_();
  var folder = DriveApp.getFolderById(folderId);
  var files = folder.getFilesByName(tableId + '.json');
  while (files.hasNext()) { files.next().setTrashed(true); }

  var index = readPowerEquipmentIndex_();
  writePowerEquipmentIndex_(index.filter(function(e) { return e.id !== tableId; }));

  console.log('PowerAttributeManager: deleted equipment table ' + tableId);
  return { deleted: true };
}
