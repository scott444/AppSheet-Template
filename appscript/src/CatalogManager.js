/**
 * CatalogManager — Manages versioned Product Catalogs stored as JSON files in Google Drive.
 *
 * Storage layout:
 *   app_system/
 *     ├── catalog-index.json              — array of catalog version summaries
 *     └── catalogs/
 *         ├── {catalogId1}.json           — product rows for catalog version 1
 *         └── {catalogId2}.json           — product rows for catalog version 2
 *
 * Each catalog version is immutable once created. Projects reference a specific
 * catalog version by its ID for baseline and modification pricing.
 */

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Get or create the catalogs subfolder inside app_system.
 * @returns {string} The folder ID of app_system/catalogs/
 */
function getCatalogsFolderId_() {
  var systemFolderId = getSystemFolderId_();
  var systemFolder = DriveApp.getFolderById(systemFolderId);
  var folder = getOrCreateFolder_(systemFolder, 'catalogs');
  return folder.getId();
}

/**
 * Read the catalog index from app_system/catalog-index.json.
 * Returns an empty array if the file does not exist yet.
 * @returns {Array}
 */
function readCatalogIndex_() {
  var systemFolderId = getSystemFolderId_();
  var index = readJsonFile_(systemFolderId, 'catalog-index.json');
  return index || [];
}

/**
 * Write the catalog index back to app_system/catalog-index.json.
 * @param {Array} index
 */
function writeCatalogIndex_(index) {
  var systemFolderId = getSystemFolderId_();
  writeJsonFile_(systemFolderId, 'catalog-index.json', index);
}

// ── Public API (callable via google.script.run) ───────────────────────────

/**
 * List all catalog versions from the index.
 * @returns {Array} Array of catalog summaries: { id, name, version, createdAt, rowCount, columns }
 */
function listCatalogs() {
  return readCatalogIndex_();
}

/**
 * Get the full product rows array for a specific catalog version.
 * @param {string} catalogId
 * @returns {Object[]} Array of product row objects
 */
function getCatalog(catalogId) {
  if (!catalogId) throw new Error('catalogId is required');
  var catalogsFolderId = getCatalogsFolderId_();
  var data = readJsonFile_(catalogsFolderId, catalogId + '.json');
  if (!data) throw new Error('Catalog not found: ' + catalogId);
  return data;
}

/**
 * Create a new catalog version: saves product rows and updates the index.
 *
 * @param {string} name - Catalog name (e.g. "Standard Catalog")
 * @param {string} version - Version label (e.g. "2026-Q1")
 * @param {Object[]} rows - Array of product row objects (parsed from CSV client-side)
 * @returns {{ id: string, rowCount: number, columns: string[] }}
 */
function createCatalog(name, version, rows) {
  if (!name || !name.trim()) throw new Error('Catalog name is required');
  if (!version || !version.trim()) throw new Error('Catalog version is required');
  if (!rows || rows.length === 0) throw new Error('Catalog has no product rows');

  var catalogId = generateUid_();
  var catalogsFolderId = getCatalogsFolderId_();

  // Extract column names from the first row
  var columns = Object.keys(rows[0]);

  // Save catalog data file
  writeJsonFile_(catalogsFolderId, catalogId + '.json', rows);

  // Update catalog index
  var index = readCatalogIndex_();
  var entry = {
    id: catalogId,
    name: name.trim(),
    version: version.trim(),
    createdAt: new Date().toISOString(),
    rowCount: rows.length,
    columns: columns
  };
  index.push(entry);
  writeCatalogIndex_(index);

  console.log('CatalogManager: created catalog "' + name + '" v' + version + ' (id: ' + catalogId + ', ' + rows.length + ' rows)');

  return { id: catalogId, rowCount: rows.length, columns: columns };
}

/**
 * Delete a catalog version: removes the data file and index entry.
 * @param {string} catalogId
 * @returns {{ deleted: boolean }}
 */
function deleteCatalog(catalogId) {
  if (!catalogId) throw new Error('catalogId is required');

  // Remove data file
  var catalogsFolderId = getCatalogsFolderId_();
  var folder = DriveApp.getFolderById(catalogsFolderId);
  var files = folder.getFilesByName(catalogId + '.json');
  while (files.hasNext()) {
    files.next().setTrashed(true);
  }

  // Remove from index
  var index = readCatalogIndex_();
  var filtered = index.filter(function(e) { return e.id !== catalogId; });
  writeCatalogIndex_(filtered);

  console.log('CatalogManager: deleted catalog ' + catalogId);

  return { deleted: true };
}
