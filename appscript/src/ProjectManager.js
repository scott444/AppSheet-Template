/**
 * ProjectManager — Manages EQL projects stored as JSON files in Google Drive.
 *
 * Folder layout per project:
 *   app_data/projects/{projectId}/
 *     ├── project.json    — project metadata (customer, projectName, date, etc.)
 *     ├── EQL.json        — immutable equipment list rows (parsed from XLSX client-side)
 *     ├── ADL.json        — append-only Add/Delete change log
 *     └── Metadata.json   — item metadata keyed by NOMENCLATURE value
 *
 * Folder names are based on the stable project ID — not customer/projectName —
 * so both fields can be edited freely without any folder rename.
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

// ── Public API (callable via google.script.run) ───────────────────────────

/**
 * Create a new project: builds the folder tree, saves EQL.json (with UIDs),
 * project.json, and updates projects-index.json.
 *
 * @param {string} customer - Customer name (used as subfolder)
 * @param {string} projectName - Project name
 * @param {Object[]} eqlRows - Array of row objects parsed from XLSX (no UIDs yet)
 * @returns {{ id: string, folderId: string }} The new project ID and folder ID
 */
function createProject(customer, projectName, eqlRows) {
  if (!customer || !customer.trim()) throw new Error('Customer name is required');
  if (!projectName || !projectName.trim()) throw new Error('Project name is required');
  if (!eqlRows || eqlRows.length === 0) throw new Error('Equipment list has no rows');

  var dataFolderId = getDataFolderId_();
  var dataFolder = DriveApp.getFolderById(dataFolderId);

  // Build folder tree: app_data/projects/{projectId}/
  // Folder name is the stable project ID — decoupled from customer/projectName
  // so both fields can be edited later without any folder rename.
  var date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var projectsFolder = getOrCreateFolder_(dataFolder, 'projects');

  // Generate project ID first so we can use it as the folder name
  var projectId = generateUid_();
  var projectFolder = projectsFolder.createFolder(projectId);
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
    description: '',
    date: date,
    folderId: projectFolderId,
    createdAt: createdAt,
    lastModified: createdAt
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
  writeJsonFile_(entry.folderId, 'project.json', projectMeta);

  // Update the lightweight index entry (inline lastModified to avoid a double index read/write)
  index[entryIdx].customer     = customer;
  index[entryIdx].projectName  = projectName;
  index[entryIdx].lastModified = now;
  writeProjectsIndex_(index);

  console.log('ProjectManager: updated project ' + projectId + ' → "' + projectName + '" / "' + customer + '"');

  return projectMeta;
}
