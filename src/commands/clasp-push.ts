import { execSync } from "node:child_process";
import chalk from "chalk";

/** Push Apps Script code to Google via clasp */
export async function claspPushCommand(): Promise<void> {
  console.log(chalk.blue("Pushing Apps Script code via clasp..."));

  try {
    const output = execSync("clasp push", {
      cwd: "appscript",
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    console.log(output);
    console.log(chalk.green("Apps Script code pushed successfully."));
  } catch (err: unknown) {
    const error = err as { stderr?: string; message?: string };
    console.error(chalk.red("clasp push failed:"));
    console.error(error.stderr || error.message);

    if (String(error.stderr || error.message).includes("not logged in")) {
      console.log(chalk.yellow("\nRun: clasp login"));
    }
    if (String(error.stderr || error.message).includes("No scriptId")) {
      console.log(chalk.yellow("\nRun: cd appscript && clasp create --type standalone"));
    }
    process.exitCode = 1;
  }
}
