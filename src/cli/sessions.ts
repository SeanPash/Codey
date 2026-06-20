import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { defaultRoot } from "../store/session-store.js";

export function latestSessionId(root: string = defaultRoot()): string | null {
  if (!existsSync(root)) return null;
  const dirs = readdirSync(root)
    .map((name) => ({ name, mtime: statSync(join(root, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return dirs.length > 0 ? dirs[0].name : null;
}

export interface SessionListItem {
  id: string;
  mtime: number;
}

export function listSessions(root: string = defaultRoot()): SessionListItem[] {
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((name) => statSync(join(root, name)).isDirectory())
    .map((name) => ({ id: name, mtime: statSync(join(root, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
}
