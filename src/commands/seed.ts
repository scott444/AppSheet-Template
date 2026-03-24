import { resolve } from "node:path";
import chalk from "chalk";
import { loadJsonFile } from "../lib/config.js";

interface SeedData {
  [tableName: string]: Record<string, unknown>[];
}

/** Generate seed data JSON from an app definition's sample data */
export async function seedCommand(options: { appDir: string }): Promise<void> {
  const seedPath = resolve(options.appDir, "seed-data.json");

  try {
    const seedData = await loadJsonFile<SeedData>(seedPath);
    const tables = Object.keys(seedData);

    console.log(chalk.blue("Seed data summary:"));
    for (const table of tables) {
      console.log(chalk.dim(`  ${table}: ${seedData[table].length} rows`));
    }
    console.log(chalk.dim("\nTo load this data via Apps Script, use:"));
    console.log(chalk.dim("  clasp run seedTable -- '{\"tableName\":\"...\",\"rows\":[...]}'"));
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException;
    if (e.message?.startsWith("File not found")) {
      console.log(chalk.yellow(`No seed-data.json found at ${seedPath}`));
      console.log(chalk.dim("Create one with the format:"));
      console.log(chalk.dim('  { "TableName": [{ "Col1": "val1", "Col2": "val2" }] }'));
    } else {
      console.error(chalk.red(`Error reading seed data: ${e.message}`));
      process.exitCode = 1;
    }
  }
}
