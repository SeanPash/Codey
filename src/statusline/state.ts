import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Mode } from "../types.js";
import type { ActionLabel } from "./labels.js";

export interface StatusSnapshot {
  mode: Mode;
  action: ActionLabel | null;  // the terse "what", written by capture
  why: string | null;          // the AI "why", written by the narrator
  warning: string | null;      // a formatted warning line, or null
  promptAt?: number | null;    // when the user last submitted a prompt, for the thinking state
  updatedAt: number;
}

function file(dir: string): string {
  return join(dir, "statusline.json");
}

export function writeStatus(dir: string, snap: StatusSnapshot): void {
  writeFileSync(file(dir), JSON.stringify(snap));
}

// Merge a partial update so capture and the narrator can each touch their own field.
export function patchStatus(dir: string, patch: Partial<StatusSnapshot>): void {
  const current = readStatus(dir) ?? { mode: "simple", action: null, why: null, warning: null, updatedAt: 0 };
  writeStatus(dir, { ...current, ...patch, updatedAt: Date.now() });
}

export function readStatus(dir: string): StatusSnapshot | null {
  const p = file(dir);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as StatusSnapshot;
  } catch {
    return null;
  }
}
