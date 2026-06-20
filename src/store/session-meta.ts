import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { defaultRoot } from "./session-store.js";
import type { SessionMeta } from "../types.js";

function metaPath(sessionId: string, root: string): string {
  return join(root, sessionId, "meta.json");
}

// Write once per session. The first hook event wins; later events leave it untouched.
export function writeMetaIfAbsent(meta: SessionMeta, root: string = defaultRoot()): void {
  const file = metaPath(meta.sessionId, root);
  if (existsSync(file)) return;
  mkdirSync(join(root, meta.sessionId), { recursive: true });
  writeFileSync(file, JSON.stringify(meta, null, 2));
}

export function readMeta(sessionId: string, root: string = defaultRoot()): SessionMeta | null {
  const file = metaPath(sessionId, root);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as SessionMeta;
  } catch {
    return null;
  }
}
