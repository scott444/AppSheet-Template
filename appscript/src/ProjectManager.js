/**
 * ProjectManager — Manages EQL projects stored as JSON files in Google Drive.
 *
 * Folder layout per project:
 *   app_data/projects/{projectNumber}_{projectName}/
 *     ├── project.json    — project metadata (customer, projectName, date, etc.)
 *     ├── EQL.json        — immutable equipment list rows (parsed from XLSX client-side)
 *     ├── ADL.json        — append-only Add/Delete change log
 *     └── Metadata.json   — item metadata keyed by NOMENCLATURE value
 *
 * Folder names are human-readable "{projectNumber}_{projectName}" and kept unique
 * among sibling project folders. They are cosmetic only: the stable key is the
 * generated UID in `id`, and all lookups go through `id`/`folderId`, never the
 * folder name. updateProject renames the folder to keep it in sync.
 *
 * Project index:
 *   app_system/projects-index.json — array of lightweight project summaries for fast listing
 */

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Read a JSON file by name from a Drive folder.
 * Returns parsed object/array, or null if the file does not exist.
 * @param {string} folderId
 * @param {string} filename
 * @returns {Object|Array|null}
 */
function readJsonFile_(folderId, filename) {
  var folder = DriveApp.getFolderById(folderId);
  var files = folder.getFilesByName(filename);
  if (!files.hasNext()) return null;
  var file = files.next();
  return JSON.parse(file.getBlob().getDataAsString());
}

/**
 * Write (create or overwrite) a JSON file in a Drive folder.
 * If a file with the same name already exists it is trashed first.
 * @param {string} folderId
 * @param {string} filename
 * @param {Object|Array} data
 */
function writeJsonFile_(folderId, filename, data) {
  var folder = DriveApp.getFolderById(folderId);
  // Trash any existing file with this name to avoid duplicates
  var existing = folder.getFilesByName(filename);
  while (existing.hasNext()) {
    existing.next().setTrashed(true);
  }
  var content = JSON.stringify(data, null, 2);
  folder.createFile(filename, content, MimeType.PLAIN_TEXT);
}

/**
 * Generate a short unique ID (first 8 chars of a UUID, uppercase).
 * @returns {string}
 */
function generateUid_() {
  return Utilities.getUuid().replace(/-/g, '').substring(0, 8).toUpperCase();
}

/**
 * Get the app_system folder ID from Script Properties.
 * Throws if Drive folders have not been set up yet.
 * @returns {string}
 */
function getSystemFolderId_() {
  var id = PropertiesService.getScriptProperties().getProperty('APP_SYSTEM_FOLDER_ID');
  if (!id) throw new Error('Drive folders not configured. Run Drive Setup first.');
  return id;
}

/**
 * Get or create a named subfolder inside a parent Drive folder.
 * @param {Folder} parentFolder
 * @param {string} name
 * @returns {Folder}
 */
function getOrCreateFolder_(parentFolder, name) {
  var folders = parentFolder.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return parentFolder.createFolder(name);
}

/**
 * Normalize one part of a project folder name: collapse path separators and
 * whitespace runs to single spaces and trim. Keeps names readable in Drive
 * while avoiding characters that read as path boundaries.
 * @param {string} s
 * @returns {string}
 */
function sanitizeFolderPart_(s) {
  return String(s == null ? '' : s)
    .replace(/[\\/\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Build the desired display name for a project folder: "{projectNumber}_{projectName}".
 * Falls back to just the project name when no number is set, and to the stable
 * UID when both are empty (should never happen — projectName is required).
 * @param {string} projectNumber
 * @param {string} projectName
 * @param {string} fallbackId - stable project UID used only if both parts are empty
 * @returns {string}
 */
function buildProjectFolderBaseName_(projectNumber, projectName, fallbackId) {
  var num = sanitizeFolderPart_(projectNumber);
  var name = sanitizeFolderPart_(projectName);
  var base = num ? (num + '_' + name) : name;
  return base || fallbackId;
}

/**
 * Return a folder name that is unique among the direct children of
 * projectsFolder, appending " (2)", " (3)", … on collision. A folder whose
 * id matches excludeFolderId does not count as a collision (used on rename so
 * a folder never collides with itself).
 * @param {Folder} projectsFolder
 * @param {string} base
 * @param {string} [excludeFolderId]
 * @returns {string}
 */
function uniqueProjectFolderName_(projectsFolder, base, excludeFolderId) {
  var candidate = base;
  var n = 2;
  while (folderNameTaken_(projectsFolder, candidate, excludeFolderId)) {
    candidate = base + ' (' + n + ')';
    n++;
  }
  return candidate;
}

/**
 * True if any child folder of projectsFolder is named `name`, ignoring a
 * folder whose id equals excludeFolderId.
 * @param {Folder} projectsFolder
 * @param {string} name
 * @param {string} [excludeFolderId]
 * @returns {boolean}
 */
function folderNameTaken_(projectsFolder, name, excludeFolderId) {
  var it = projectsFolder.getFoldersByName(name);
  while (it.hasNext()) {
    var f = it.next();
    if (!excludeFolderId || f.getId() !== excludeFolderId) return true;
  }
  return false;
}

/**
 * Get the app_data folder ID from Script Properties.
 * Throws if Drive folders have not been set up yet.
 * @returns {string}
 */
function getDataFolderId_() {
  var id = PropertiesService.getScriptProperties().getProperty('APP_DATA_FOLDER_ID');
  if (!id) throw new Error('Drive folders not configured. Run Drive Setup first.');
  return id;
}

/**
 * Read the projects index from app_system/projects-index.json.
 * Returns an empty array if the file does not exist yet.
 * @returns {Array}
 */
function readProjectsIndex_() {
  var systemFolderId = getSystemFolderId_();
  var index = readJsonFile_(systemFolderId, 'projects-index.json');
  return index || [];
}

/**
 * Write the projects index back to app_system/projects-index.json.
 * @param {Array} index
 */
function writeProjectsIndex_(index) {
  var systemFolderId = getSystemFolderId_();
  writeJsonFile_(systemFolderId, 'projects-index.json', index);
}

/**
 * Stamp the current UTC time as `lastModified` on both the index entry and project.json.
 * Called by every public mutation function after its own writes succeed.
 * Silently no-ops if the project ID is not found.
 * @param {string} projectId
 */
function touchProject_(projectId) {
  var now = new Date().toISOString();
  var index = readProjectsIndex_();
  for (var i = 0; i < index.length; i++) {
    if (index[i].id === projectId) {
      index[i].lastModified = now;
      var meta = readJsonFile_(index[i].folderId, 'project.json');
      if (meta) {
        meta.lastModified = now;
        writeJsonFile_(index[i].folderId, 'project.json', meta);
      }
      writeProjectsIndex_(index);
      return;
    }
  }
}

/**
 * Find a project entry in the index by ID.
 * @param {string} projectId
 * @returns {{ id: string, folderId: string, customer: string, projectName: string, date: string, createdAt: string }}
 */
function findProjectInIndex_(projectId) {
  var index = readProjectsIndex_();
  for (var i = 0; i < index.length; i++) {
    if (index[i].id === projectId) return index[i];
  }
  throw new Error('Project not found: ' + projectId);
}

/**
 * Default column configuration — used when app_system/column-config.json does not exist.
 */
var DEFAULT_COLUMN_CONFIG_ = {
  keyColumns: ['OPT','COF','DS','CUST REF','ORGANIZER 1','ORGANIZER 2','SUB SYS ID','ORGANIZER 3','ORGANIZER 4','LIST ID','LIM','O','APC','QTY','NOMENCLATURE','DESCRIPTION','UNIT LIST','EXT LIST','TOTAL QTY','EXT EXCHANGE RATE','EXT STAGING','EXT FIELD','EXT DROPSHIP','CUSTOMER DISCOUNT (%)','UNIT CUSTOMER DISCOUNT','EXT CUSTOMER DISCOUNT','FAMILY GROUP','PRODUCT STATUS','PRODUCT STATUS REFRESH DATE','CFG','LOCATION','OPTIONAL','ORGANIZER 5','ORGANIZER 6','ORGANIZER 7','ORGANIZER 8','EID','PID','TERM','CURRENCY','DESIGN QUOTE','REPORT RUN DATE','SORT ORDER','COUNTRY OF ORIGIN','PARAMETRIC DATA'],
  hiddenColumns: ['_uid'],
  priceColumn: 'EXT LIST',
  mainLineItem: { limColumn: 'LIM', optColumn: 'O' }
};

// ── Public API (callable via google.script.run) ───────────────────────────

/**
 * Read column configuration from app_system/column-config.json.
 * Returns the stored config merged over defaults, or just defaults if the file is absent.
 * @returns {{ keyColumns: string[], hiddenColumns: string[], priceColumn: string, mainLineItem: { limColumn: string, optColumn: string } }}
 */
function getColumnConfig() {
  try {
    var systemFolderId = getSystemFolderId_();
    var config = readJsonFile_(systemFolderId, 'column-config.json');
    if (config && typeof config === 'object') {
      return {
        keyColumns:    Array.isArray(config.keyColumns)    ? config.keyColumns    : DEFAULT_COLUMN_CONFIG_.keyColumns,
        hiddenColumns: Array.isArray(config.hiddenColumns) ? config.hiddenColumns : DEFAULT_COLUMN_CONFIG_.hiddenColumns,
        priceColumn:   config.priceColumn || DEFAULT_COLUMN_CONFIG_.priceColumn,
        mainLineItem: {
          limColumn: (config.mainLineItem && config.mainLineItem.limColumn) || DEFAULT_COLUMN_CONFIG_.mainLineItem.limColumn,
          optColumn: (config.mainLineItem && config.mainLineItem.optColumn) || DEFAULT_COLUMN_CONFIG_.mainLineItem.optColumn
        }
      };
    }
  } catch (e) {
    console.log('getColumnConfig: error reading config, using defaults — ' + e.message);
  }
  return DEFAULT_COLUMN_CONFIG_;
}

/**
 * Create a new project: builds the folder tree, saves EQL.json (with UIDs),
 * project.json, and updates projects-index.json.
 *
 * @param {string} customer - Customer name (used as subfolder)
 * @param {string} projectName - Project name
 * @param {Object[]} eqlRows - Array of row objects parsed from XLSX (no UIDs yet)
 * @param {string} [projectNumber] - Customer-facing project number/ID (optional)
 * @param {string} [projectFolderUrl] - URL to the external project folder (optional)
 * @returns {{ id: string, folderId: string }} The new project ID and folder ID
 */
function createProject(customer, projectName, eqlRows, projectNumber, projectFolderUrl) {
  if (!customer || !customer.trim()) throw new Error('Customer name is required');
  if (!projectName || !projectName.trim()) throw new Error('Project name is required');
  if (!projectNumber || !String(projectNumber).trim()) throw new Error('Project number is required');
  if (!eqlRows || eqlRows.length === 0) throw new Error('Equipment list has no rows');

  var dataFolderId = getDataFolderId_();
  var dataFolder = DriveApp.getFolderById(dataFolderId);

  // Build folder tree: app_data/projects/{projectNumber}_{projectName}/
  // The folder name is human-readable; the stable key is the generated UID
  // stored as `id` in project.json and the index, so lookups never depend on
  // the folder name. The name is kept unique among sibling project folders.
  var date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var projectsFolder = getOrCreateFolder_(dataFolder, 'projects');

  // Generate the stable project ID (used as the key everywhere, not as the folder name)
  var projectId = generateUid_();
  var folderName = uniqueProjectFolderName_(
    projectsFolder,
    buildProjectFolderBaseName_(projectNumber, projectName, projectId)
  );
  var projectFolder = projectsFolder.createFolder(folderName);
  var projectFolderId = projectFolder.getId();

  // Assign UIDs to each EQL row
  var eqlWithUids = eqlRows.map(function(row) {
    var enriched = { _uid: generateUid_() };
    var keys = Object.keys(row);
    for (var i = 0; i < keys.length; i++) {
      enriched[keys[i]] = row[keys[i]];
    }
    return enriched;
  });

  // Save project.json
  var createdAt = new Date().toISOString();
  var projectMeta = {
    id: projectId,
    customer: customer.trim(),
    projectName: projectName.trim(),
    projectNumber: projectNumber ? String(projectNumber).trim() : '',
    projectFolderUrl: projectFolderUrl ? String(projectFolderUrl).trim() : '',
    description: '',
    date: date,
    folderId: projectFolderId,
    createdAt: createdAt,
    lastModified: createdAt,
    baselineCatalogId: null,
    modificationCatalogId: null
  };
  writeJsonFile_(projectFolderId, 'project.json', projectMeta);

  // Save EQL.json (immutable baseline)
  writeJsonFile_(projectFolderId, 'EQL.json', eqlWithUids);

  // Update projects index
  var index = readProjectsIndex_();
  index.push({
    id: projectId,
    customer: customer.trim(),
    projectName: projectName.trim(),
    projectNumber: projectMeta.projectNumber,
    projectFolderUrl: projectMeta.projectFolderUrl,
    date: date,
    folderId: projectFolderId,
    createdAt: createdAt,
    lastModified: createdAt
  });
  writeProjectsIndex_(index);

  console.log('ProjectManager: created project "' + projectName + '" for "' + customer + '" (id: ' + projectId + ')');

  return { id: projectId, folderId: projectFolderId };
}

/**
 * List all projects from the index.
 * @returns {Array} Array of project summaries
 */
function listProjects() {
  return readProjectsIndex_();
}

/**
 * Get a single project's metadata.
 * @param {string} projectId
 * @returns {Object} project.json contents
 */
function getProject(projectId) {
  var entry = findProjectInIndex_(projectId);
  return readJsonFile_(entry.folderId, 'project.json');
}

/**
 * Get the EQL rows for a project.
 * @param {string} projectId
 * @returns {Object[]} Array of EQL row objects with _uid
 */
function getEqlRows(projectId) {
  var entry = findProjectInIndex_(projectId);
  return readJsonFile_(entry.folderId, 'EQL.json') || [];
}

/**
 * Get the Add/Delete change log for a project.
 * Returns an empty array if no ADL entries exist yet.
 * @param {string} projectId
 * @returns {Object[]}
 */
function getAdl(projectId) {
  var entry = findProjectInIndex_(projectId);
  return readJsonFile_(entry.folderId, 'ADL.json') || [];
}

/**
 * Append a single entry to the ADL change log.
 * @param {string} projectId
 * @param {{ action: string, nomenclature: string, uid: string, notes: string }} entry
 * @returns {{ count: number }} Total number of ADL entries after append
 */
function saveAdlEntry(projectId, entry) {
  if (!entry || !entry.action) throw new Error('ADL entry must have an action (add|delete)');
  if (!entry.nomenclature) throw new Error('ADL entry must have a nomenclature');

  var projectEntry = findProjectInIndex_(projectId);
  var adl = readJsonFile_(projectEntry.folderId, 'ADL.json') || [];

  var newEntry = {
    uid: entry.uid || generateUid_(),
    action: entry.action,
    nomenclature: entry.nomenclature,
    notes: entry.notes || '',
    timestamp: new Date().toISOString()
  };
  if (entry.targetUid) newEntry.targetUid = entry.targetUid;
  adl.push(newEntry);

  writeJsonFile_(projectEntry.folderId, 'ADL.json', adl);
  touchProject_(projectId);
  return { count: adl.length };
}

/**
 * Append multiple entries to the ADL change log in a single write.
 * Used for cascading deletes (main line item + sub line items).
 * @param {string} projectId
 * @param {Object[]} entries - Array of entry objects (same shape as saveAdlEntry)
 * @returns {{ count: number }} Total number of ADL entries after append
 */
function saveAdlEntries(projectId, entries) {
  if (!entries || !entries.length) throw new Error('entries array must not be empty');
  var projectEntry = findProjectInIndex_(projectId);
  var adl = readJsonFile_(projectEntry.folderId, 'ADL.json') || [];

  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    if (!entry.action) throw new Error('Each ADL entry must have an action');
    if (!entry.nomenclature) throw new Error('Each ADL entry must have a nomenclature');
    var newEntry = {
      uid: entry.uid || generateUid_(),
      action: entry.action,
      nomenclature: entry.nomenclature,
      notes: entry.notes || '',
      timestamp: new Date().toISOString()
    };
    if (entry.targetUid) newEntry.targetUid = entry.targetUid;
    adl.push(newEntry);
  }

  writeJsonFile_(projectEntry.folderId, 'ADL.json', adl);
  touchProject_(projectId);
  return { count: adl.length };
}

/**
 * Remove multiple entries from the ADL change log by their uids in a single write.
 * Used for undoing cascading deletes (main line item + sub line items).
 * @param {string} projectId
 * @param {string[]} entryUids - Array of ADL entry uids to remove
 * @returns {{ count: number }} Number of remaining ADL entries
 */
function removeAdlEntries(projectId, entryUids) {
  if (!entryUids || !entryUids.length) throw new Error('entryUids array must not be empty');
  var projectEntry = findProjectInIndex_(projectId);
  var adl = readJsonFile_(projectEntry.folderId, 'ADL.json') || [];
  var uidSet = {};
  for (var i = 0; i < entryUids.length; i++) { uidSet[entryUids[i]] = true; }
  var filtered = adl.filter(function(e) { return !uidSet[e.uid]; });
  writeJsonFile_(projectEntry.folderId, 'ADL.json', filtered);
  touchProject_(projectId);
  return { count: filtered.length };
}

/**
 * Overwrite the entire ADL change log for a project in one Drive write.
 * Called by the frontend when the user explicitly saves their in-memory modifications.
 * @param {string} projectId
 * @param {Object[]} adl - The complete ADL array to persist
 * @returns {{ count: number }} Number of entries saved
 */
function saveAdl(projectId, adl) {
  if (!Array.isArray(adl)) throw new Error('adl must be an array');
  var entry = findProjectInIndex_(projectId);
  writeJsonFile_(entry.folderId, 'ADL.json', adl);
  touchProject_(projectId);
  return { count: adl.length };
}

/**
 * Remove a single entry from the ADL change log by its uid.
 * Silently succeeds if the entry is not found (idempotent undo).
 * @param {string} projectId
 * @param {string} entryUid - The uid of the ADL entry to remove
 * @returns {{ count: number }} Number of remaining ADL entries
 */
function removeAdlEntry(projectId, entryUid) {
  if (!entryUid) throw new Error('entryUid is required');
  var projectEntry = findProjectInIndex_(projectId);
  var adl = readJsonFile_(projectEntry.folderId, 'ADL.json') || [];
  var filtered = adl.filter(function(e) { return e.uid !== entryUid; });
  writeJsonFile_(projectEntry.folderId, 'ADL.json', filtered);
  touchProject_(projectId);
  return { count: filtered.length };
}

/**
 * Get metadata for all items in a project (keyed by NOMENCLATURE).
 * Returns an empty object if no metadata has been saved yet.
 * @param {string} projectId
 * @returns {Object} { "Nomenclature Value": { category, description, notes, status }, ... }
 */
function getMetadata(projectId) {
  var entry = findProjectInIndex_(projectId);
  return readJsonFile_(entry.folderId, 'Metadata.json') || {};
}

/**
 * Overwrite the full metadata object for a project.
 * @param {string} projectId
 * @param {Object} metadata - Keyed by NOMENCLATURE value
 * @returns {{ saved: boolean }}
 */
function saveMetadata(projectId, metadata) {
  if (!metadata || typeof metadata !== 'object') throw new Error('metadata must be an object');
  var entry = findProjectInIndex_(projectId);
  writeJsonFile_(entry.folderId, 'Metadata.json', metadata);
  touchProject_(projectId);
  return { saved: true };
}

/**
 * Update a project's customer name and/or project name.
 * Only updates metadata — the folder is identified by its stable folderId,
 * so no folder rename is needed regardless of what changed.
 *
 * @param {string} projectId
 * @param {{ customer: string, projectName: string }} updates
 * @returns {Object} The updated project metadata object
 */
function updateProject(projectId, updates) {
  if (!updates || !updates.customer || !updates.customer.trim()) throw new Error('Customer name is required');
  if (!updates.projectName || !updates.projectName.trim()) throw new Error('Project name is required');

  var customer    = updates.customer.trim();
  var projectName = updates.projectName.trim();

  // Update project.json inside the project folder
  var index = readProjectsIndex_();
  var entryIdx = -1;
  for (var i = 0; i < index.length; i++) {
    if (index[i].id === projectId) { entryIdx = i; break; }
  }
  if (entryIdx === -1) throw new Error('Project not found: ' + projectId);

  var entry = index[entryIdx];
  var projectMeta = readJsonFile_(entry.folderId, 'project.json');
  if (!projectMeta) throw new Error('project.json not found for project: ' + projectId);

  var description = updates.description != null ? updates.description.trim() : (projectMeta.description || '');
  var now = new Date().toISOString();
  projectMeta.customer      = customer;
  projectMeta.projectName   = projectName;
  projectMeta.description   = description;
  projectMeta.lastModified  = now;

  // Customer-facing fields — only update when explicitly provided.
  // Project number is required: reject a blank value when it's being set.
  if ('projectNumber' in updates) {
    var newProjectNumber = updates.projectNumber != null ? String(updates.projectNumber).trim() : '';
    if (!newProjectNumber) throw new Error('Project number is required');
    projectMeta.projectNumber = newProjectNumber;
  }
  if ('projectFolderUrl' in updates) {
    projectMeta.projectFolderUrl = updates.projectFolderUrl != null ? String(updates.projectFolderUrl).trim() : '';
  }

  // Catalog version linkage (optional fields — only update if explicitly provided)
  if ('baselineCatalogId' in updates) {
    projectMeta.baselineCatalogId = updates.baselineCatalogId || null;
  }
  if ('modificationCatalogId' in updates) {
    projectMeta.modificationCatalogId = updates.modificationCatalogId || null;
  }
  writeJsonFile_(entry.folderId, 'project.json', projectMeta);

  // Keep the Drive folder name in sync with "{projectNumber}_{projectName}".
  // Purely cosmetic — every lookup keys off `id`/`folderId`, so a failure here
  // must never fail the metadata update.
  try {
    var projectFolder = DriveApp.getFolderById(entry.folderId);
    var parents = projectFolder.getParents();
    var projectsFolder = parents.hasNext() ? parents.next() : null;
    if (projectsFolder) {
      var base = buildProjectFolderBaseName_(projectMeta.projectNumber, projectName, projectId);
      var desiredName = uniqueProjectFolderName_(projectsFolder, base, entry.folderId);
      if (desiredName !== projectFolder.getName()) {
        projectFolder.setName(desiredName);
      }
    }
  } catch (renameErr) {
    console.warn('ProjectManager: could not rename folder for project ' + projectId + ': ' + renameErr);
  }

  // Update the lightweight index entry (inline lastModified to avoid a double index read/write)
  index[entryIdx].customer     = customer;
  index[entryIdx].projectName  = projectName;
  index[entryIdx].projectNumber    = projectMeta.projectNumber || '';
  index[entryIdx].projectFolderUrl = projectMeta.projectFolderUrl || '';
  index[entryIdx].lastModified = now;
  writeProjectsIndex_(index);

  console.log('ProjectManager: updated project ' + projectId + ' → "' + projectName + '" / "' + customer + '"');

  return projectMeta;
}

/**
 * One-time maintenance: backfill projects that predate the projectNumber /
 * projectFolderUrl fields and the "{projectNumber}_{projectName}" folder naming.
 *
 * For every project in the index it (a) copies projectNumber/projectFolderUrl
 * from the authoritative project.json into the lightweight index entry, and
 * (b) renames the Drive folder to the current unique naming scheme. Both are
 * idempotent — running it repeatedly is a no-op once everything is in sync.
 * Folder-name lookups never depend on the name (keyed by id/folderId), so a
 * rename failure for one project is logged and skipped, not fatal.
 *
 * @returns {{ total: number, indexUpdated: number, foldersRenamed: number, errors: string[] }}
 */
function backfillProjectFields() {
  var index = readProjectsIndex_();
  var indexUpdated = 0;
  var foldersRenamed = 0;
  var errors = [];

  for (var i = 0; i < index.length; i++) {
    var entry = index[i];
    try {
      var meta = readJsonFile_(entry.folderId, 'project.json');
      if (!meta) {
        errors.push(entry.id + ': project.json not found');
        continue;
      }

      var number = meta.projectNumber || '';
      var folderUrl = meta.projectFolderUrl || '';

      // (a) Sync the lightweight index entry
      if (entry.projectNumber !== number || entry.projectFolderUrl !== folderUrl) {
        entry.projectNumber = number;
        entry.projectFolderUrl = folderUrl;
        indexUpdated++;
      }

      // (b) Rename the Drive folder to the current naming scheme
      var projectFolder = DriveApp.getFolderById(entry.folderId);
      var parents = projectFolder.getParents();
      var projectsFolder = parents.hasNext() ? parents.next() : null;
      if (projectsFolder) {
        var base = buildProjectFolderBaseName_(number, meta.projectName || entry.projectName, entry.id);
        var desiredName = uniqueProjectFolderName_(projectsFolder, base, entry.folderId);
        if (desiredName !== projectFolder.getName()) {
          projectFolder.setName(desiredName);
          foldersRenamed++;
        }
      }
    } catch (err) {
      errors.push((entry && entry.id ? entry.id : '?') + ': ' + (err && err.message ? err.message : String(err)));
    }
  }

  if (indexUpdated > 0) writeProjectsIndex_(index);

  console.log('ProjectManager: backfill complete — ' + index.length + ' projects, ' +
    indexUpdated + ' index entries updated, ' + foldersRenamed + ' folders renamed, ' +
    errors.length + ' errors');

  return { total: index.length, indexUpdated: indexUpdated, foldersRenamed: foldersRenamed, errors: errors };
}

/**
 * Get the per-project Power Table data (rack definitions, assignments, active mapping/equipment IDs).
 * Returns defaults if PowerTable.json does not exist or was saved by an older version.
 * @param {string} projectId
 * @returns {{ activeMappingTableId: string|null, activeEquipmentTableId: string|null, racks: string[], rackAssignments: Object }}
 */
function getPowerTableData(projectId) {
  var entry = findProjectInIndex_(projectId);
  var data = readJsonFile_(entry.folderId, 'PowerTable.json');
  if (!data) {
    return { activeMappingTableId: null, activeEquipmentTableId: null, racks: [], rackAssignments: {} };
  }
  // Backward compat: v1 stored activeTableId — ignore it, return new shape with defaults
  return {
    activeMappingTableId:   data.activeMappingTableId   || null,
    activeEquipmentTableId: data.activeEquipmentTableId || null,
    racks:                  Array.isArray(data.racks) ? data.racks : [],
    rackAssignments:        (data.rackAssignments && typeof data.rackAssignments === 'object') ? data.rackAssignments : {}
  };
}

/**
 * Save the per-project Power Table data.
 * @param {string} projectId
 * @param {{ activeMappingTableId: string|null, activeEquipmentTableId: string|null, racks: string[], rackAssignments: Object }} data
 * @returns {{ saved: boolean }}
 */
function savePowerTableData(projectId, data) {
  if (!data || typeof data !== 'object') throw new Error('data must be an object');
  var entry = findProjectInIndex_(projectId);
  writeJsonFile_(entry.folderId, 'PowerTable.json', {
    activeMappingTableId:   data.activeMappingTableId   || null,
    activeEquipmentTableId: data.activeEquipmentTableId || null,
    racks:                  Array.isArray(data.racks) ? data.racks : [],
    rackAssignments:        (data.rackAssignments && typeof data.rackAssignments === 'object') ? data.rackAssignments : {}
  });
  touchProject_(projectId);
  return { saved: true };
}
