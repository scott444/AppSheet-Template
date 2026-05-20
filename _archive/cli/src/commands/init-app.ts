import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import chalk from "chalk";
import type { AppDefinition } from "../types/appsheet.js";

/** Scaffold a new app definition in apps/<name>/ */
export async function initAppCommand(options: { name: string }): Promise<void> {
  const appDir = resolve("apps", options.name);
  await mkdir(appDir, { recursive: true });

  const definition: AppDefinition = {
    appName: options.name,
    description: "",
    tables: [
      {
        name: "Items",
        columns: [
          { name: "ID", type: "Text", key: true, required: true },
          { name: "Name", type: "Text", required: true },
          { name: "Description", type: "LongText" },
          { name: "Status", type: "Enum", enumValues: ["Active", "Inactive"] },
          { name: "CreatedAt", type: "ChangeTimestamp" },
        ],
      },
    ],
    views: [
      { name: "Items_List", type: "deck", table: "Items", displayName: "Items", icon: "list" },
      { name: "Items_Detail", type: "detail", table: "Items" },
      { name: "Items_Form", type: "form", table: "Items" },
    ],
    settings: {
      appName: options.name,
      icon: "apps",
      primaryColor: "#1976D2",
      startView: "Items_List",
      offlineMode: true,
    },
    security: {
      requireSignIn: true,
      authProvider: "Google",
    },
  };

  const defPath = resolve(appDir, "definition.json");
  await writeFile(defPath, JSON.stringify(definition, null, 2) + "\n", "utf-8");

  console.log(chalk.green(`Created app definition at ${defPath}`));
  console.log(chalk.dim("Edit the definition, then run:"));
  console.log(chalk.dim(`  npm run dev -- validate -d apps/${options.name}`));
  console.log(chalk.dim(`  npm run dev -- gen-schema -d apps/${options.name}`));
}
