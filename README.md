# Project_Manager

A Vue 3 SPA served by Google Apps Script for managing EQL projects, product catalogs, and power tables. All data is stored as JSON files in Google Drive — no database required.

## What it does

- **Projects** — Create from an XLSX equipment list; track baseline, modifications (adds/deletes), and a final merged view
- **Product Catalogs** — Upload versioned, immutable CSV catalogs linked to projects
- **Power Tables** — Manage mapping and equipment tables for rack power calculations
- **My Sheets** — Browse Google Sheets in the project's Drive folder

## Prerequisites

- Node.js 20+
- A Google account with Google Drive and Apps Script access
- Enable the Apps Script API: <https://script.google.com/home/usersettings>
- [clasp](https://github.com/google/clasp): included in devDependencies (`npm install`)

## Deploy

```bash
npm install

# One-time: sign in to clasp
npx clasp login

# One-time: create the Apps Script project (generates appscript/.clasp.json)
cd appscript && npx clasp create --type webapp --title "Project_Manager" && cd ..
# Copy the generated .clasp.json into appscript/ (it should already be there after the above)

# Build and push to Google
npm run clasp:push

# Open the Apps Script editor in your browser
npm run clasp:open
```

After the first push, open the deployed web app URL and navigate to **Drive Setup** to create the `Project_Manager/` folder tree in your Google Drive. This is required before any data can be saved.

## Workflow

```
  Your browser                          Google Drive
  ────────────                          ────────────
  Upload XLSX  ──createProject()──>  projects/{uid}/EQL.json
                                                     ADL.json
                                                     project.json

  Edit baseline/modifications/final  ──saveAdl()──>  projects/{uid}/ADL.json
  Upload catalog CSV  ──createCatalog()──>  catalogs/{id}.json
  Upload power CSVs   ──createPower*()──>   power-mappings/{id}.json
                                            power-equipment/{id}.json
```

Data is never stored in a Google Sheet — everything is JSON in Drive. Google Sheets can be provisioned separately via `SheetManager.js` if needed.

## Development

```bash
# Build Vue app → appscript/dist/ (does not push)
npm run clasp:build

# Build and push to Google Apps Script
npm run clasp:push

# Open the deployed script in the Apps Script editor
npm run clasp:open
```

## Architecture

See [CLAUDE.md](CLAUDE.md) for full architecture documentation. The short version:

- `appscript/src/*.js` — server-side Apps Script (flat global namespace, JSON-in-Drive data layer)
- `appscript/ui/` — Vue 3 SFCs, built by webpack (ES5 output mandatory for Caja compatibility)
- `appscript/dist/` — webpack output, ignored in git; `clasp push` deploys from here
- `apps/Project_Manager/` — local app definition (not used at runtime; reference only)

## Server-side API

All functions below are callable from the Vue frontend via `google.script.run`.

| File | Public functions |
| --- | --- |
| `DriveManager.js` | `setupFolders`, `getFolderSetupStatus` |
| `ProjectManager.js` | `createProject`, `listProjects`, `getProject`, `updateProject`, `getEqlRows`, `getAdl`, `saveAdl`, `saveAdlEntry`, `saveAdlEntries`, `removeAdlEntry`, `removeAdlEntries`, `getMetadata`, `saveMetadata`, `getPowerTableData`, `savePowerTableData`, `getColumnConfig` |
| `CatalogManager.js` | `listCatalogs`, `getCatalog`, `createCatalog`, `deleteCatalog` |
| `PowerAttributeManager.js` | `listPowerMappingTables`, `getPowerMapping`, `createPowerMappingTable`, `deletePowerMappingTable`, `listPowerEquipmentTables`, `getPowerEquipment`, `createPowerEquipmentTable`, `deletePowerEquipmentTable` |
| `SheetManager.js` | `createSpreadsheetFromSchema`, `updateSpreadsheetFromSchema`, `exportSpreadsheetSchema` |
| `WebApp.js` | `listMySpreadsheets`, `include` (template helper), `doGet` (serves the SPA) |

## Power Table CSV Formats

The Power Table tab joins EQL rows to physical equipment specs via two uploaded CSV tables.

### Mapping Table

Maps EQL line items (Nomenclature + Option) to one or more pieces of physical equipment.

Required columns: `LIM`, `O`, `Manufacturer`, `Model`

```csv
Nomenclature,Option,Nomenclature Description,Multiple,Power Description,Manufacturer,Model
ABC123,,1,Main Server,Dell,PowerEdge R760
ABC123,,1,Server UPS,APC,Smart-UPS 3000
ABC123,OPT1,2,GPU Accelerator,NVIDIA,H100
```

| Column | Description |
| --- | --- |
| `Nomenclature` | Line Item identifier (join key with EQL) |
| `Option` | Option code (blank for base items) |
| `Multiple` | How many of this equipment per EQL line item |
| `Manufacturer` | Equipment manufacturer (join key with Equipment table) |
| `Model` | Equipment model (join key with Equipment table) |

### Equipment Table

Physical and power specifications keyed by Manufacturer + Model.

Required columns: `Manufacturer`, `Model`

| Column | Description |
| --- | --- |
| `Manufacturer` | Equipment manufacturer (join key) |
| `Model` | Equipment model (join key) |
| `Watts max` | Maximum power draw (watts) |
| `AC amps max` | Maximum AC current draw |
| `VA max` | Maximum volt-amperes |
| `BTU max` | Maximum heat output |
| `Weight (LBs)` | Weight in pounds |
| `RU` | Rack units |

Rack totals are calculated for: PSU, Watts max, AC amps max, VA max, BTU max, Weight (LBs).

## Data model

```
Project_Manager/                 ← Google Drive root (created by Drive Setup)
├── app_data/
│   └── projects/{uid}/
│       ├── project.json         ← metadata (customer, name, description, lastModified)
│       ├── EQL.json             ← immutable baseline equipment list
│       ├── ADL.json             ← append-only add/delete change log
│       ├── Metadata.json        ← per-nomenclature metadata
│       └── PowerTable.json      ← rack assignments + active table IDs
└── app_system/
    ├── projects-index.json      ← lightweight project summaries
    ├── catalog-index.json
    ├── catalogs/{id}.json
    ├── power-mappings/{id}.json
    └── power-equipment/{id}.json
```
