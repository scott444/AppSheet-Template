/**
 * DriveManager — Creates and manages the app's Google Drive folder structure.
 *
 * Folder layout:
 *   My Drive/
 *   └── <AppName>/                  ← APP_ROOT_FOLDER_ID
 *       ├── app_data/               ← APP_DATA_FOLDER_ID  (user spreadsheets)
 *       └── app_system/             ← APP_SYSTEM_FOLDER_ID (shared system data)
 *
 * Folder IDs are stored in Script Properties after first setup.
 * Set up via the web app UI: navigate to "Drive Setup" and enter your app name.
 */

/**
 * Get or create a named subfolder inside a parent folder.
 * Checks for an existing folder first to prevent duplicates.
 * @param {GoogleAppsScript.Drive.Folder} parentFolder
 * @param {string} name
 * @returns {GoogleAppsScript.Drive.Folder}
 */
function getOrCreateFolder_(parentFolder, name) {
  var existing = parentFolder.getFoldersByName(name);
  if (existing.hasNext()) {
    return existing.next();
  }
  return parentFolder.createFolder(name);
}

/**
 * Create the full folder tree for the app and persist IDs to Script Properties.
 * Idempotent — safe to call multiple times; existing folders are reused.
 *
 * @param {string} appName - Used as the root folder name (e.g. "MyApp")
 * @returns {{ appName: string, rootFolderId: string, appDataFolderId: string, appSystemFolderId: string }}
 */
function setupFolders(appName) {
  if (!appName || !appName.trim()) {
    throw new Error('appName is required to set up Drive folders');
  }

  var driveRoot = DriveApp.getRootFolder();

  // Create (or reuse) <AppName>/
  var rootFolder = getOrCreateFolder_(driveRoot, appName.trim());

  // Create (or reuse) <AppName>/app_data/
  var appDataFolder = getOrCreateFolder_(rootFolder, 'app_data');

  // Create (or reuse) <AppName>/app_system/
  var appSystemFolder = getOrCreateFolder_(rootFolder, 'app_system');

  // Persist all IDs to Script Properties
  PropertiesService.getScriptProperties().setProperties({
    APP_NAME: appName.trim(),
    APP_ROOT_FOLDER_ID: rootFolder.getId(),
    APP_DATA_FOLDER_ID: appDataFolder.getId(),
    APP_SYSTEM_FOLDER_ID: appSystemFolder.getId(),
  });

  console.log('DriveManager: folders configured for app "' + appName + '"');

  return {
    appName: appName.trim(),
    rootFolderId: rootFolder.getId(),
    appDataFolderId: appDataFolder.getId(),
    appSystemFolderId: appSystemFolder.getId(),
  };
}

/**
 * Read all folder IDs from Script Properties.
 * Returns nulls for any values not yet set (i.e. before setupFolders() is called).
 *
 * @returns {{ appName: string|null, rootFolderId: string|null, appDataFolderId: string|null, appSystemFolderId: string|null }}
 */
function getFolderIds_() {
  var props = PropertiesService.getScriptProperties();
  return {
    appName: props.getProperty('APP_NAME'),
    rootFolderId: props.getProperty('APP_ROOT_FOLDER_ID'),
    appDataFolderId: props.getProperty('APP_DATA_FOLDER_ID'),
    appSystemFolderId: props.getProperty('APP_SYSTEM_FOLDER_ID'),
  };
}

/**
 * Return the current folder configuration status.
 * Used by the web app UI to show setup state.
 *
 * @returns {{ configured: boolean, appName: string|null, rootUrl: string|null, appDataUrl: string|null, appSystemUrl: string|null }}
 */
function getFolderSetupStatus() {
  var ids = getFolderIds_();

  if (!ids.appDataFolderId || !ids.appSystemFolderId) {
    return {
      configured: false,
      appName: ids.appName,
      rootUrl: ids.rootFolderId ? 'https://drive.google.com/drive/folders/' + ids.rootFolderId : null,
      appDataUrl: null,
      appSystemUrl: null,
    };
  }

  return {
    configured: true,
    appName: ids.appName,
    rootUrl: 'https://drive.google.com/drive/folders/' + ids.rootFolderId,
    appDataUrl: 'https://drive.google.com/drive/folders/' + ids.appDataFolderId,
    appSystemUrl: 'https://drive.google.com/drive/folders/' + ids.appSystemFolderId,
  };
}

/**
 * List Google Sheets files in a specific Drive folder.
 *
 * @param {string} folderId - The Drive folder ID to list
 * @returns {{ id: string, name: string, url: string }[]}
 */
function listSheetsInFolder(folderId) {
  if (!folderId) {
    throw new Error('folderId is required');
  }

  var folder = DriveApp.getFolderById(folderId);
  var files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  var sheets = [];

  while (files.hasNext() && sheets.length < 50) {
    var file = files.next();
    sheets.push({
      id: file.getId(),
      name: file.getName(),
      url: file.getUrl(),
    });
  }

  return sheets;
}
