# AppSheet Template Toolkit

Develop Google AppSheet apps offline using your Google Drive and Apps Script. Define your app as structured JSON, validate it locally, generate Google Sheets schemas, and push Apps Script code — all with your personal Google account. No Google Cloud project required.

## Prerequisites

- Node.js 20+
- A Google account with access to Google Drive and Apps Script
- Enable the Apps Script API: https://script.google.com/home/usersettings

## Setup

```bash
npm install

# Sign in to clasp with your Google account (one-time)
npx clasp login

# Create an Apps Script project (one-time)
cd appscript && npx clasp create --type webapp && cd ..

# Push the Apps Script helper code
npx clasp push --cwd appscript
```

## Workflow

```
  Local (this repo)                          Google (your account)
  ──────────────────                         ────────────────────────
  definition.json  ──validate──>  OK
       │
       ├──gen-schema──> sheet-schema.json
       │                    │
       │              clasp run / paste      Google Sheets
       │              into Apps Script  ───> (data source for AppSheet)
       │                                          │
  appscript/src/     ──clasp push──>         Apps Script project
                                                  │
                                             AppSheet app
                                             (configure in editor,
                                              pointing at your Sheets)
```

### Local Commands

```bash
# Scaffold a new app definition
npm run dev -- init -n "My App"

# Validate your app definition
npm run dev -- validate -d apps/my_app

# Generate Google Sheets schema from definition
npm run dev -- gen-schema -d apps/my_app

# Push Apps Script code to Google
npm run dev -- push-script
```

### Configuring AppSheet

After creating your Google Sheets (via Apps Script or manually from the schema):

1. Go to [AppSheet](https://www.appsheet.com) and create a new app
2. Choose "Start with your own data" and select your Google Sheet
3. Use your local `definition.json` as a reference to configure tables, views, actions, and automations in the AppSheet editor

## Project Structure

```
├── apps/                       # App definitions (tracked in git)
│   ├── _example/               #   Example inventory app
│   │   └── definition.json     #   Full app definition
│   └── <your_app>/
│       ├── definition.json     #   App tables, views, actions, automations
│       ├── sheet-schema.json   #   Generated Sheets schema
│       └── seed-data.json      #   (optional) Test data to load
├── appscript/                  # Apps Script project (pushed via clasp)
│   ├── appsscript.json         #   Apps Script manifest
│   ├── .clasp.json.example     #   Example clasp config
│   └── src/
│       ├── SheetManager.js     #   Create/update Google Sheets from schemas
│       ├── AppSheetHelper.js   #   AppSheet Data API wrapper (CRUD on tables)
│       └── WebApp.js           #   Optional web endpoint for remote operations
├── data-sources/               # Sheets schema documentation
└── src/                        # Local CLI (TypeScript)
    ├── index.ts                #   CLI entry point (commander)
    ├── commands/               #   init, validate, generate-schema, seed, push-script
    ├── lib/                    #   config, schema-generator, validator
    └── types/                  #   TypeScript types for AppSheet definitions
```

## Apps Script Functions

These run in your Google account via `clasp run` or from the Apps Script editor:

| Function | Description |
| --- | --- |
| `createSpreadsheetFromSchema(schema)` | Create a new Google Sheet with headers, validation, formatting |
| `updateSpreadsheetFromSchema(id, schema)` | Add missing sheets/columns to existing Sheet |
| `exportSpreadsheetSchema(id)` | Export current Sheet structure as JSON |
| `readTableRows(tableName)` | Read rows from AppSheet table (Data API) |
| `addTableRows(tableName, rows)` | Add rows to AppSheet table |
| `seedTable(tableName, rows, clearFirst)` | Bulk-load test data |

## App Definition Format

The `definition.json` file defines your app's structure:

```json
{
  "appName": "My App",
  "tables": [
    {
      "name": "Products",
      "columns": [
        { "name": "ID", "type": "Text", "key": true, "required": true },
        { "name": "Name", "type": "Text", "required": true },
        { "name": "Category", "type": "Enum", "enumValues": ["A", "B", "C"] },
        { "name": "Price", "type": "Price" }
      ]
    }
  ],
  "views": [
    { "name": "Products_List", "type": "deck", "table": "Products" }
  ],
  "settings": {
    "startView": "Products_List",
    "offlineMode": true
  }
}
```

The validator checks for: missing keys, duplicate names, broken Ref targets, empty Enums, and invalid view/action references.
