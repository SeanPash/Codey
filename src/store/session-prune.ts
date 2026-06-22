import { readdirSync, statSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

// Returns the newest mtime (ms) among all files directly in dir, or the dir mtime if empty.
function newestMtime(dir: string): number {
  let newest = statSync(dir).mtimeMs;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return newest;
  }
  for (const name of entries) {
    try {
      const ms = statSync(join(dir, name)).mtimeMs;
      if (ms > newest) newest = ms;
    } catch {
      // skip unreadable entries
    }
  }
  return newest;
}

// Removes subdirectories of root that have no events.jsonl and whose newest file is older
// than now - maxAgeMs. Keeps real session dirs (those with events.jsonl) regardless of age,
// and keeps fresh event-less dirs that may just be spinning up. Returns removed dir names.
export function pruneEventless(root: string, now: number, maxAgeMs: number): string[] {
  if (!existsSync(root)) return [];

  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return [];
  }

  const removed: string[] = [];
  for (const name of entries) {
    const dir = join(root, name);
    try {
      if (!statSync(dir).isDirectory()) continue;
      if (existsSync(join(dir, "events.jsonl"))) continue;
      const age = now - newestMtime(dir);
      if (age < maxAgeMs) continue;
      rmSync(dir, { recursive: true, force: true });
      removed.push(name);
    } catch {
      // locked or already gone, skip
    }
  }
  return removed;
}
