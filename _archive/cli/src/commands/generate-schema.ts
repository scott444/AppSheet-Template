import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import chalk from "chalk";
import { loadJsonFile } from "../lib/config.js";
import { generateSheetSchema } from "../lib/schema-generator.js";
import type { AppDefinition } from "../types/appsheet.js";

/** Generate a Google Sheets schema from an app definition */
export async function generateSchemaCommand(options: { appDir: string; output?: string }): Promise<void> {
  const defPath = resolve(options.appDir, "definition.json");
  const appDef = await loadJsonFile<AppDefinition>(defPath);

  console.log(chalk.blue(`Generating sheet schema for "${appDef.appName}"...`));
  const schema = generateSheetSchema(appDef);

  const outPath = options.output ?? resolve(options.appDir, "sheet-schema.json");
  await writeFile(outPath, JSON.stringify(schema, null, 2) + "\n", "utf-8");

  console.log(chalk.green(`Sheet schema written to ${outPath}`));
  console.log(chalk.dim(`\nSheets to create (${schema.sheets.length}):`));
  for (const sheet of schema.sheets) {
    console.log(chalk.dim(`  - ${sheet.name} (${sheet.headers.length} columns)`));
  }
  console.log(chalk.dim("\nNext: open Apps Script editor and run createSpreadsheetFromSchema():"));
  console.log(chalk.dim("  npm run clasp:open"));
}
