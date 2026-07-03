import { writeFileSync, readFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const SAVED_FILE = "saved.json";

// Read a session's bookmark flag from its dir. Missing or unreadable means not saved.
export function readSaved(dir: string): boolean {
  const file = join(dir, SAVED_FILE);
  if (!existsSync(file)) return false;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as { saved?: unknown };
    return parsed.saved === true;
  } catch {
    return false;
  }
}

// Set or clear a session's bookmark. Clearing removes the file so an unsaved session
// leaves no trace on disk.
export function writeSaved(dir: string, saved: boolean): void {
  const file = join(dir, SAVED_FILE);
  if (!saved) {
    try { rmSync(file, { force: true }); } catch { /* ignore */ }
    return;
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, JSON.stringify({ saved: true }, null, 2));
}
