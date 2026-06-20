import { writeFileSync, readFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { defaultRoot } from "../store/session-store.js";
import type { InterventionFile } from "../types.js";

export function interventionPath(sessionId: string, root: string = defaultRoot()): string {
  return join(root, sessionId, "intervene.json");
}

// Latest click wins: overwrite any existing pending file.
export function writeInterventionFile(sessionId: string, file: InterventionFile, root: string = defaultRoot()): void {
  mkdirSync(join(root, sessionId), { recursive: true });
  writeFileSync(interventionPath(sessionId, root), JSON.stringify(file));
}

export function readInterventionFile(sessionId: string, root: string = defaultRoot()): InterventionFile | null {
  const file = interventionPath(sessionId, root);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as InterventionFile;
  } catch {
    return null;
  }
}

export function deleteInterventionFile(sessionId: string, root: string = defaultRoot()): void {
  try {
    rmSync(interventionPath(sessionId, root), { force: true });
  } catch {
    // already gone, or unreadable; nothing to do
  }
}
