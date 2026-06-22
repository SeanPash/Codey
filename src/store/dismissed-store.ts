import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// Session ids the user has hidden from the Active Terminals grid. Non-destructive: the
// session's data is untouched, it just stops showing in the live grid until restored. Stored
// once per machine, alongside the sessions, so the choice survives a server restart.
const FILE = "dismissed.json";

function file(root: string): string {
  return join(root, FILE);
}

export function readDismissed(root: string): Set<string> {
  const p = file(root);
  if (!existsSync(p)) return new Set();
  try {
    const parsed = JSON.parse(readFileSync(p, "utf8")) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function write(root: string, ids: Set<string>): void {
  mkdirSync(root, { recursive: true });
  writeFileSync(file(root), JSON.stringify([...ids], null, 2));
}

export function dismiss(root: string, id: string): void {
  const ids = readDismissed(root);
  if (ids.has(id)) return;
  ids.add(id);
  write(root, ids);
}

export function restore(root: string, id: string): void {
  const ids = readDismissed(root);
  if (!ids.delete(id)) return;
  write(root, ids);
}
