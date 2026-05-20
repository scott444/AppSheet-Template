import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config as dotenvConfig } from "dotenv";

export interface ProjectConfig {
  /** Apps Script web app URL (optional — for remote operations) */
  webAppUrl?: string;
  /** AppSheet app ID (for reference in definitions) */
  appId?: string;
  /** AppSheet access key (for Data API via Apps Script) */
  accessKey?: string;
}

/** Load config from .env file */
export function loadConfig(): ProjectConfig {
  dotenvConfig();

  return {
    webAppUrl: process.env.WEBAPP_URL,
    appId: process.env.APPSHEET_APP_ID,
    accessKey: process.env.APPSHEET_ACCESS_KEY,
  };
}

/** Load a JSON file and parse it */
export async function loadJsonFile<T = Record<string, unknown>>(filePath: string): Promise<T> {
  const abs = resolve(filePath);
  let content: string;
  try {
    content = await readFile(abs, "utf-8");
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") throw new Error(`File not found: ${abs}`);
    throw e;
  }
  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error(`Invalid JSON in ${abs}`);
  }
}
