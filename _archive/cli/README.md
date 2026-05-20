# Archived: Local CLI Toolkit

This directory contains a TypeScript CLI that was scaffolded at project init but never adopted into the active workflow. It is preserved here for reference.

## What it was

A `commander`-based tool for defining AppSheet app schemas locally in `definition.json` and generating Google Sheets column schemas from them. The intended workflow was:

1. `npm run dev -- init -n "MyApp"` — scaffold `apps/<name>/definition.json`
2. `npm run dev -- validate -d apps/MyApp` — check the definition
3. `npm run dev -- gen-schema -d apps/MyApp` — produce `sheet-schema.json`
4. Paste the schema into the Apps Script editor and call `createSpreadsheetFromSchema()`

## Why it was archived

The actual product evolved into a Vue 3 SPA (`appscript/`) that handles project creation via XLSX upload directly. The CLI was never used in production. The `push-script` command was a thin wrapper around `clasp push` which is now done via `npm run clasp:push`.

## Contents

- `src/` — TypeScript CLI source (commands, lib, types)
- `tsconfig.json` — TypeScript config for compiling `src/`
- `.env.example` — Documented env vars (`WEBAPP_URL`, `APPSHEET_APP_ID`, `APPSHEET_ACCESS_KEY`) that the CLI would have read but never did

## To run (if needed)

Install CLI-only deps first: `npm install commander chalk dotenv tsx typescript`

Then from repo root: `node --loader tsx _archive/cli/src/index.ts <command>`
