import { resolve } from "node:path";
import chalk from "chalk";
import { loadJsonFile } from "../lib/config.js";
import { validateAppDefinition } from "../lib/validator.js";
import type { AppDefinition } from "../types/appsheet.js";

/** Validate an app definition for errors */
export async function validateCommand(options: { appDir: string }): Promise<void> {
  const defPath = resolve(options.appDir, "definition.json");
  const appDef = await loadJsonFile<AppDefinition>(defPath);

  console.log(chalk.blue(`Validating "${appDef.appName}"...`));
  const errors = validateAppDefinition(appDef);

  if (errors.length === 0) {
    console.log(chalk.green("No errors found."));
  } else {
    console.log(chalk.red(`Found ${errors.length} error(s):\n`));
    for (const err of errors) {
      console.log(chalk.red(`  ${err.path}: ${err.message}`));
    }
    process.exitCode = 1;
  }
}
