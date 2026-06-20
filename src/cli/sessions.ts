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
