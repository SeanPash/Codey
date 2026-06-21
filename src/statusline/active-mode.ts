import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import type { Mode } from "../types.js";

// The active narration mode is one global choice, not per session. Keeping it in a
// single file stops the toggle, the narrator, and the status line from disagreeing
// about which mode is on when several session folders sit side by side.
function modeFile(home: string): string {
  return join(home, ".codey", "mode");
}

export function writeActiveMode(mode: Mode, home: string = homedir()): void {
  const p = modeFile(home);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, mode);
}

export function clearActiveMode(home: string = homedir()): void {
  rmSync(modeFile(home), { force: true });
}

// Returns null when narration is off so the status line can stay blank by default.
export function readActiveMode(home: string = homedir()): Mode | null {
  const p = modeFile(home);
  if (!existsSync(p)) return null;
  const raw = readFileSync(p, "utf8").trim();
  return raw === "simple" || raw === "deep" || raw === "teach" ? raw : null;
}
