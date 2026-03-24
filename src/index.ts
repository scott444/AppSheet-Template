#!/usr/bin/env node
import { Command } from "commander";
import { initAppCommand } from "./commands/init-app.js";
import { generateSchemaCommand } from "./commands/generate-schema.js";
import { validateCommand } from "./commands/validate.js";
import { seedCommand } from "./commands/seed.js";
import { claspPushCommand } from "./commands/clasp-push.js";

const program = new Command();

program
  .name("appsheet")
  .description("AppSheet Template toolkit (via Google Drive + Apps Script)")
  .version("0.1.0");

program
  .command("init")
  .description("Scaffold a new app definition")
  .requiredOption("-n, --name <name>", "App name")
  .action(initAppCommand);

program
  .command("validate")
  .description("Validate an app definition for errors")
  .requiredOption("-d, --app-dir <path>", "Path to app directory")
  .action(validateCommand);

program
  .command("gen-schema")
  .description("Generate Google Sheets schema from app definition")
  .requiredOption("-d, --app-dir <path>", "Path to app directory")
  .option("-o, --output <path>", "Output file path (default: <app-dir>/sheet-schema.json)")
  .action(generateSchemaCommand);

program
  .command("seed")
  .description("Show seed data info for an app")
  .requiredOption("-d, --app-dir <path>", "Path to app directory")
  .action(seedCommand);

program
  .command("push-script")
  .description("Push Apps Script code to Google via clasp")
  .action(claspPushCommand);

program.parse();
