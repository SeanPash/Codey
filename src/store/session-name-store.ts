import { writeFileSync, readFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const NAME_FILE = "name.json";

// Read a user-set custom name from a session dir. Returns null if the file is missing,
// unreadable, or contains only whitespace.
export function readCustomName(dir: string): string | null {
  const file = join(dir, NAME_FILE);
  if (!existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as { name?: unknown };
    const trimmed = String(parsed.name ?? "").trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

// Write a custom name to a session dir. Creates the dir if needed.
// Passing empty or whitespace-only clears the name (deletes the file).
export function writeCustomName(dir: string, name: string): void {
  const file = join(dir, NAME_FILE);
  const trimmed = name.trim();
  if (!trimmed) {
    // Clear: remove the file if it exists.
    try { rmSync(file, { force: true }); } catch { /* ignore */ }
    return;
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, JSON.stringify({ name: trimmed }, null, 2));
}
